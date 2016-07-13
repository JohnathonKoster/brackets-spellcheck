/*
 * Copyright (c) 2016 - Johnathon Koster. All rights reserved.
 *
 * Permission is hereby granted, free of charge, to any person obtaining a
 * copy of this software and associated documentation files (the "Software"),
 * to deal in the Software without restriction, including without limitation
 * the rights to use, copy, modify, merge, publish, distribute, sublicense,
 * and/or sell copies of the Software, and to permit persons to whom the
 * Software is furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
 * FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
 * DEALINGS IN THE SOFTWARE.
 * 
 */

/*jslint vars: true, plusplus: true, devel: true, nomen: true, indent: 4, maxerr: 50 */
/*global define, $, window, brackets, Typo */

/**
 * The DictionaryManager is responsible for managing the various
 * dictionaries that may have been loaded by the spell checker.
 * 
 * Each dictionary contains its own instance of Typo, as well as any
 * data it needs (e.g. the affix and dictionary data).
 * 
 * This module dispatches a few events:
 * 
 * 
 *    - dictionaryLoaded -- When a new dictionary is loaded.
 *          (e, localeName::string)
 *    - dictionaryUnloaded -- When a single dictionary has been unloaded.
 *          (e, localeName::string)
 *    - dictionariesUnloaded -- When all dictionaries have been unloaded.
 *          (e, localeName::string)
 *    - dictionaryFailedToLoad -- When a dictionary has failed to load.
 *          (e, localeName::string)
 *    - languageListLoaded -- When the list of available languages has loaded.
 *          (e, availableLanguages::array)
 *          
 * To listen for events, do something like this: (see EventDispatcher for details on this pattern)
 *    `DictionaryManager.on("eventname", handler);
 */
define(function (require, exports, module) {
    "use strict";
    
    // Load required modules.
    var _ = require("thirdparty/lodash"),
        TypoLib = require("thirdparty/typo"),
        FileSystem = brackets.getModule("filesystem/FileSystem"),
        EventDispatcher = brackets.getModule("utils/EventDispatcher"),
        FileUtils = brackets.getModule("file/FileUtils"),
        StatusBar = brackets.getModule("widgets/StatusBar"),
        Dictionary = require("src/utils/Dictionary"),
        Async = brackets.getModule("utils/Async"),
        AppInit = brackets.getModule("utils/AppInit"),
        FileSystemImpl = brackets.getModule("fileSystemImpl"),
        ProfileManager = require("src/spelling/ProfileManager");
    
    /**
     * The default locale.
     * 
     * @type {string}
     */
    var _defaultLocale = "en_US";
    
    /**
     * The dictionaries that the spell checker has loaded.
     *
     * @type {object}
     */
    var _dictionaries = Object.create(null);
    
    var _availableDictionaries = [];
    
    /**
     * A list of dictionaries that are currently being loaded.
     * 
     * This is used to make sure we don't attempt to load the same
     * dictionary multiple times at once.
     *
     * @type {object}
     */
    var _dictionariesBeingLoaded = Object.create(null);
    
    var _languagePathNameFile = "";
    
    /**
     * Determines if the manager will allow affix file failures.
     *
     * If this is set to true, the manager will simply set the affix data
     * to an empty string instead of failing completely.
     * 
     * Not currently implemented within the manager's code base.
     * 
     * @type {bool}
     */
    var _allowAffixFailures = true;
    
    /**
     * Gets a dictionary object for the given locale name.
     * @param   {string}     localeName The locale name.
     * @returns {object}
     */
    function getDictionary(localeName) {
        
        if (_dictionaries[localeName].initialized === false) {
            return null;
        }
        
        return _dictionaries[localeName];
    }
    
    /**
     * Unloads a dictionary with the given locale name.
     * 
     * @param {string} localeName The locale name to unload.
     */
    function unloadDictionary(localeName) {
        delete _dictionaries[localeName];
        exports.trigger("dictionaryUnloaded", localeName);
    }
    
    /**
     * Initializes a dictionaries Typo instance.
     * 
     * @private
     * 
     * This function will only initialize a Typo instance if both the dictionary and affix
     * data is available.
     * 
     * @param {string} localeName The locale name.
     */
    function _performTypoInitializationOnLocale(localeName) {
        if (_dictionaries[localeName].affixLoaded === true && _dictionaries[localeName].dictionaryLoaded === true) {
            // The dictionary and affix data has been loaded, so we can
            // go ahead and create the Typo instance for the dictionary.
            _dictionaries[localeName].typo = new Typo(localeName, _dictionaries[localeName].affixData, _dictionaries[localeName].dictionaryData);
            // Indicate that the dictionary is ready to be used.
            _dictionaries[localeName].initialized = true;
            // Hide the busy indicator at this point.
            StatusBar.hideBusyIndicator();
            
            // Indicate that the dictionary is already being loaded. The dictionary
            // will be present in the dictionaries list, so we can safely remove
            // it from this list as the dictionary loader consults that list
            // before attempting to load a dictionary.
            delete _dictionariesBeingLoaded[localeName];
            console.info("Linguistics: Dictionary has been loaded successfully for  " + localeName);
            exports.trigger("dictionaryLoaded", localeName);
        }
    }
    
    /**
     * Checks to see if a dictionary needs to be removed due to loading failures.
     * 
     * @private
     * 
     * @param {string} localeName The locale name.
     */
    function _checkDictionaryForCleanUp(localeName) {
        if (_dictionaries[localeName].affixLoaded === null && _dictionaries[localeName].dictionaryLoaded === null) {
            unloadDictionary(localeName);
            
            // Indicate that the dictionary is no longer being loaded.
            delete _dictionariesBeingLoaded[localeName];
            
            // Hide the busy indicator so it doesn't continuously run.
            StatusBar.hideBusyIndicator();
            exports.trigger("dictionaryFailedToLoad", localeName);
        }
    }
    
    /**
     * Initializes a dictionaries affix and dictionary data.
     * 
     * This function will load both the affix and dictionary data asynchronously.
     * To be notified when a dictionary has been loaded, listen for the appropriate
     * event.
     * 
     * @param {string} localeName     The locale name.
     * @param {File}   affixFile      The affix file.
     * @param {File}   dictionaryFile The dictionary file.
     */
    function _initializeDictionaryData(localeName, affixFile, dictionaryFile) {
        affixFile.read({ encoding: "utf8" }, function (err, data, stats) {
            if (err === null) {
                _dictionaries[localeName].affixData = data;
                _dictionaries[localeName].affixLoaded = true;
                _performTypoInitializationOnLocale(localeName);
            } else {
                console.error("Can't load the affix data for " + localeName, err);
                // Set it to null to indicate not loaded due to an error.
                _dictionaries[localeName].affixLoaded = null;
                _checkDictionaryForCleanUp(localeName);
            }
        });
        
        dictionaryFile.read({ encoding: "utf8" }, function (err, data, stats) {
            if (err === null) {
                _dictionaries[localeName].dictionaryData = data;
                _dictionaries[localeName].dictionaryLoaded = true;
                _performTypoInitializationOnLocale(localeName);
            } else {
                console.error("Can't load the dictionary data for " + localeName, err);
                // Set it to null to indicate not loaded due to an error.
                _dictionaries[localeName].dictionaryLoaded = null;
                _checkDictionaryForCleanUp(localeName);
            }
        });
    }
    
    /**
     * Checks if a given dictionary has already been loaded.
     * 
     * @param   {string}  localeName The locale name.
     * @param   {string}  safeMode   Whether or not to check if the dictionary has been initialized.
     * @returns {boolean}
     */
    function hasDictionary(localeName, safeMode) {
        if (typeof _dictionaries[localeName] === "undefined") {
            return false;
        }
        
        if (!safeMode) {
            return true;
        }
        
        return _dictionaries[localeName].initialized;
    }
    
    /**
     * Loads the dictionary files for the given locale.
     * 
     * @param {string} localeName The locale name to load.
     */
    function _loadDictionaryFilesForLocale(localeName) {
        
        var _affixPath = Dictionary.getAffixFile(localeName);
        var _dictionaryPath = Dictionary.getDictionaryFile(localeName);
        
        var _affixFile = FileSystem.getFileForPath(_affixPath);
        var _dictionaryFile = FileSystem.getFileForPath(_dictionaryPath);
        
        _dictionaries[localeName] = {
            initialized: false,
            dictionaryLoaded: false,
            affixLoaded: false,
            affixData: null,
            dictionaryData: null,
            typo: null,
            locale: localeName
        };
        
        if (_affixFile && _dictionaryFile) {
            // Start showing the busy indicator.
            StatusBar.showBusyIndicator();
            
            // Indicate that we are currently loading the dictionary.
            _dictionariesBeingLoaded[localeName] = localeName;
            
            // console.info("Linguistics: Loading dictionary " + localeName);
            // console.info("Linguistics: Affix file path " + _affixPath);
            // console.info("Linguistics: Dictionary file path " + _dictionaryPath);
            _initializeDictionaryData(localeName, _affixFile, _dictionaryFile);
        } else {
            // console.error("Linguistics: Failed to initialze files for affix or dictionary files.", _affixPath, _dictionaryPath);
            // Unload the dictionary from the list.
            unloadDictionary(localeName);
        }
    }
    
    /**
     * Loads a dictionary with the given locale name.
     * 
     * @param {string} localeName The locale name.
     */
    function loadDictionary(localeName) {
        // If the dictionary is already being loaded we don't want to start
        // the whole process over again, so we will just bail out early.
        if (typeof _dictionariesBeingLoaded[localeName] !== "undefined") {
            return;
        }
        
        // Bail out early if the dictionary has already been loaded or
        // if the input doesn't make a lot of sense.
        if (localeName === null || ProfileManager.hasProfile(localeName) || hasDictionary(localeName)) {
            console.log("Bailing out early on load dictionary check for " + localeName);
            return;
        }
        
        _loadDictionaryFilesForLocale(localeName);
    }
    
    /**
     * Unloads all the dictionaries that have been loaded.
     */
    function unloadAllDictionaries() {
        _dictionaries = Object.create(null);
        exports.trigger("dictionariesUnloaded");
    }
    
    /**
     * Gets the default locale.
     * 
     * @returns {string}
     */
    function getDefaultLocale() {
        return _defaultLocale;
    }
    
    /**
     * Sets the default locale.
     * 
     * @param {string} defaultLocale The locale to use as default.
     */
    function setDefaultLocale(defaultLocale) {
        _defaultLocale = defaultLocale;
    }
    
    /**
     * Checks if a word is spelled incorrectly.
     * 
     * This function will check to see if the locale name matches the name of a dictionary
     * profile. If a profile match is found, the ProfileManager will be used to resolve all
     * of dictionaries used by the profile. This function will then check if a word is
     * considered to be misspelled by any of the dictionaries included in the profile.
     * 
     * @param   {string}  word       The word to check.
     * @param   {string}  localeName The locale to use when checking. Optional.
     * @returns {boolean|null}
     */
    function check(word, localeName) {
        if (typeof localeName === "undefined") {
            localeName = _defaultLocale;
        }
        
        if (ProfileManager.hasProfile(localeName)) {
            var _profileItems = ProfileManager.getProfileItems(localeName);
            
            // If the _profileItems hasn't been properly initialized yet we will just
            // default to checking as if the profile didn't exist yet. This is done
            // to prevent every word from being flagged as incorrect while the
            // profile and dictionaries are being loaded.
            if (_profileItems !== null) {
                var _i = 0;
                for (_i; _i < _profileItems.length; _i++) {
                    var _profileName = _profileItems[_i].name;

                    // Check if the DictionaryManager has the dictionary specified in the profile.
                    if (hasDictionary(_profileName, true)) {
                        // console.info("Profile name check");
                        // console.info(_profileName, _dictionaries[_profileName]);
                        if (_dictionaries[_profileName].typo.check(word)) {
                            return true;
                        }
                    } else {
                        // This will start the loading process of the dictionary. We can get
                        // away with this because of the way CodeMirror's mode system works.
                        // The timing difference between the loading of the dictionary and
                        // the styling of the word if it is incorrect is usually small
                        // enough where it doesn't matter all that much.
                        loadDictionary(_profileName);
                        // console.info("Attempting to load something from the dictionary..." + _profileName);
                    }
                }

                // Assume that the word is spelled incorrectly.
                return false;
            }
            
        }
        
        if (hasDictionary(localeName, true)) {
            return _dictionaries[localeName].typo.check(word);
        }
        
        return null;
    }
    
    /**
     * Returns a list of suggestions for a misspelled word.
     * 
     * @param   {string}     word       The word to check.
     * @param   {string}     localeName The locale to use when checking. Optional.
     * @returns {array|null}
     */
    function suggest(word, localeName) {
        if (!localeName) {
            localeName = _defaultLocale;
        }
        
        if (hasDictionary(localeName)) {
            return _dictionaries[localeName].typo.suggest(word);
        }
        
        return null;
    }
    
    /**
     * Indicates if the manager has any dictionaries loaded.
     * 
     * @returns {boolean}
     */
    function hasDictionariesLoaded() {
        return (Object.keys(_dictionaries).length > 0);
    }
    
    /**
     * Gets a list of the available languages.
     * 
     * @returns {array}
     */
    function getAvailableDictionaries() {
        return _availableDictionaries;
    }
    
    /**
     * Gets a list of the available dictionary profiles.
     * 
     * @returns {array}
     */
    function getAvailableDictionaryProfiles() {
        var _userProfiles = ProfileManager.getUserProfiles();
        return _.merge(_availableDictionaries, _userProfiles);
    }
    
    /**
     * Determines whether or not a dictionary exists based on whether or not
     * an affix and dictionary file exist with the given locale name. This
     * function accepts a callback with only a single boolean parameter,
     * which will indicate if the dictionary exists.
     * 
     * This function is asynchronous.
     * 
     * This function will also check to see if the ProfileManager has
     * a matching profile (the localeName must match a profile name).
     * 
     * @param {string}            localeName The locale name.
     * @param {function(boolean)} callback   callback.
     */
    function dictionaryExists(localeName, callback) {
        // If the profile manager has a matching profile, we will
        // consider that "good enough" and execute the callback.
        if (ProfileManager.hasProfile(localeName)) {
            callback(true);
            return;
        }
        
        var _affixPath = Dictionary.getAffixFile(localeName);
        var _dictionaryPath = Dictionary.getDictionaryFile(localeName);
        
        // Chain 'em up.
        FileSystemImpl.stat(_affixPath, function (affixError) {
            if (affixError) {
                callback(false);
            } else {
                FileSystemImpl.stat(_dictionaryPath, function (dictionaryError) {
                    if (dictionaryError) {
                        callback(false);
                    } else {
                        callback(true);
                    }
                });
            }
        });
        
    }
    
    function _findLanguageFiles() {
        var languageJsonFiles = Object.create(null),
            languagePaths = [],
            jsonFiles = [],
            deferred = new $.Deferred();
        
        FileSystem.getDirectoryForPath(Dictionary.getNaturalLanguageDirectory()).getContents(function (err, contents) {
            if (!err) {
                languagePaths = contents.filter(function (directoryName) {
                    return (directoryName.isDirectory);
                });
            }
            
            Async.doInParallel_aggregateErrors(languagePaths, function (directory) {
                var _langaugeFileDetected = new $.Deferred();
                // The path to the langauge file we are looking for.
                var _potentialLanguageJsonPath = directory._path + "language.json";
                var _potentialLanguageFile = FileSystem.getFileForPath(_potentialLanguageJsonPath);
                
                _potentialLanguageFile.read({encoding: "utf8"}, function (err, data, status) {
                    if (err === null) {
                        var _tempLanguageData = JSON.parse(data);
                        
                        // Quick way to quickly distinguish between default languages
                        // and user defined dictionary profiles.
                        _tempLanguageData.isProfile = false;
                        languageJsonFiles[_tempLanguageData.locale] = _tempLanguageData;
                        jsonFiles.push(_potentialLanguageJsonPath);
                        _langaugeFileDetected.resolve();
                    } else {
                        _langaugeFileDetected.reject();
                        return;
                    }
                });
                
                return _langaugeFileDetected.promise();
            }).fail(function (errorArray) {
                errorArray.forEach(function (errorObj) {
                    console.error("Linguistics error loading the language JSON files", errorObj);
                });
            }).always(function () {
                deferred.resolve({
                    languagePaths: languagePaths,
                    languageJsonFiles: languageJsonFiles,
                    jsonFiles: jsonFiles
                });
            });
            
        });
            
        return deferred.promise();
    }
    
    /**
     * Initializes data that is required by other parts of the system.
     */
    function _initialize() {
        // Load the available dictionaries.
        /**
        _languagePathNameFile = Dictionary.getRelativeDictionaryFile("languages.json");
        var _file = FileSystem.getFileForPath(_languagePathNameFile);
        _file.read({encoding: "utf8"}, function (err, data, status) {
            if (err === null) {
                
                _availableDictionaries = JSON.parse(data);
                
                exports.trigger("languageListLoaded", _availableDictionaries);
            }
        });
        */
        
        _findLanguageFiles().done(function (result) {
            _availableDictionaries = result.languageJsonFiles;
            exports.trigger("languageListLoaded", getAvailableDictionaryProfiles());
        });
        
        // Trigger the `languageListLoaded` event when the profile manager signals
        // it has the user's profiles ready.
        ProfileManager.on("userProfilesLoaded", function (event, availableProfiles) {
            exports.trigger("languageListLoaded", getAvailableDictionaryProfiles());
        });
    }
    
    AppInit.appReady(_initialize);
    
    EventDispatcher.makeEventDispatcher(exports);
    
    exports.hasDictionariesLoaded = hasDictionariesLoaded;
    exports.getDictionary = getDictionary;
    exports.unloadDictionary = unloadDictionary;
    exports.hasDictionary = hasDictionary;
    exports.loadDictionary = loadDictionary;
    exports.unloadAllDictionaries = unloadAllDictionaries;
    exports.getDefaultLocale = getDefaultLocale;
    exports.setDefaultLocale = setDefaultLocale;
    exports.check = check;
    exports.suggest = suggest;
    exports.getAvailableDictionaries = getAvailableDictionaries;
    exports.getAvailableDictionaryProfiles = getAvailableDictionaryProfiles;
    exports.dictionaryExists = dictionaryExists;
    
});