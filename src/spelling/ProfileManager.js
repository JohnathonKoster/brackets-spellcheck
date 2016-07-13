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
 * The ProfileManager is responsible for loading dictionary profiles. A dictionary profile
 * is essentially just a list of known dictionaries, and doesn't contribute anything to
 * the logic/processing of determining if words are incorrect, or their suggestions.
 * 
 * The ProfileManager module should be considered a "private module" and should not be called
 * directly. It is used internally by the DictionaryManager to "merge" the loaded dictionaries
 * and the custom user profiles. Each natural language will have it's own profile by profile
 * entry by default (this is because the new spell checking system now only considers profiles
 * as valid "dictionaries"). See the "check" and "suggest" methods in DictionaryManager for
 * more implementation details.
 * 
 * Most of the functions exposed by this module are considered "safe" in that they will ensure
 * that the ProfileManager has been properly initialized before doing any checks or data
 * retrieval.
 * 
 * For example, someone could create their own Australian English dictionary that loads
 * both an "en_AU" dictionary as well as a medical terminology dictionary. This might
 * look like this:
 * 
 * "my_en": [
 *    { type: "dictionary", "en_AU" },
 *    { type: "dictionary", "medical_terms" }
 * ]
 * 
 * Both "en_UA" and "medical_terms" would be expected to be a valid dictionaries that have
 * been installed in the "natural-languages" directory within the Linguistics dictionary
 * extension (note that the "type" property must have a value of "dictionary" to be able
 * to load dictionaries from the natural languages directory).
 * 
 * Special note on the user dictionary: The user dictionary will be loaded regardless of the
 * profile that is loaded.
 * 
 * Profile entry "type":
 * 
 *     - "dictionary"
 *           Loads a dictionary from the "natural-languages" directory.
 *     - "utility"
 *           Loads an ignore file from the "generic-utilities" directory.
 *     - "programming"
 *           Foreceully loads an ignore file from the "programming-languages" directory. Linguistics
 *           attempts to automatically load these files based on the current editor's context.
 * 
 * This module dispatches a few events:
 * 
 * 
 *    - userProfilesLoaded -- When the list of user profiles had loaded.
 *          (e, availableProfiles::array)
 */
define(function (require, exports, module) {
    "use strict";
    
    // Load required modules.
    var FileSystem = brackets.getModule("filesystem/FileSystem"),
        Dictionary = require("src/utils/Dictionary"),
        FileUtils =  brackets.getModule("file/FileUtils"),
        Async = brackets.getModule("utils/Async"),
        AppInit = brackets.getModule("utils/AppInit"),
        EventDispatcher = brackets.getModule("utils/EventDispatcher");
    
    /**
     * The available user profiles.
     * 
     * @type {array}
     */
    var _availableProfiles = [];
    
    /**
     * Determines if the `_findUserProfiles` function has executed at least once.
     * 
     * @type {bool}
     */
    var _initialized = false;
    
    function _findUserProfiles() {
        var userProfiles = Object.create(null),
            profilePaths = [],
            jsonFiles = [],
            deferred = new $.Deferred();
        
        FileSystem.getDirectoryForPath(Dictionary.getUserProfilesDirectory()).getContents(function (err, contents) {
            if (!err) {
                // Make sure the files we load are just JSON files, no nested directories here.
                profilePaths = contents.filter(function (fileName) {
                    return (fileName.isFile && FileUtils.getFileExtension(fileName.fullPath) === "json");
                });
                
                Async.doInParallel_aggregateErrors(profilePaths, function (profilePath) {
                    var _profile = new $.Deferred();
                    
                    profilePath.read({encoding: "utf8"}, function (err, data, status) {
                        if (err === null) {
                            var _profileData = JSON.parse(data);
                            _profileData.isProfile = true;
                            
                            // Kind of a bridge to make the API between profiles and
                            // dictionaries a little easier to work with.
                            _profileData.locale = _profileData.profile;
                            
                            // If the profile has no items, we are just going to ignore it.
                            if (typeof _profileData.items === undefined || _profileData.items.length === 0) {
                                _profile.reject();
                                return;
                            }
                            
                            var _i = 0;
                            
                            // Set the default item type.
                            for (_i; _i < _profileData.items.length; _i++) {
                                if (typeof _profileData.items[_i].type === "undefined") {
                                    _profileData.items[_i].type = "dictionary";
                                }
                            }
                            
                            userProfiles[_profileData.profile] = _profileData;
                            jsonFiles.push(profilePath);
                            _profile.resolve();
                        } else {
                            _profile.reject();
                            return;
                        }
                    });
                    
                    return _profile.promise();
                }).fail(function (errorArray) {
                    // Nothing here yet.
                }).always(function () {
                    deferred.resolve({
                        userProfiles: userProfiles,
                        profilePaths: profilePaths,
                        jsonFiles: jsonFiles
                    });
                });
            }
        });
        
        return deferred.promise();
    }
    
    function _initialize() {
        _findUserProfiles().done(function (result) {
            _availableProfiles = result.userProfiles;
            _initialized = true;
            exports.trigger("userProfilesLoaded", _availableProfiles);
        });
    }
    
    /**
     * Gets the available user profiles.
     * 
     * @returns {array}
     */
    function getUserProfiles() {
        return _availableProfiles;
    }
    
    /**
     * Safely checks if the given profile exists.
     * 
     * @param   {string}  profileName The profile name to look for.
     * @returns {boolean}
     */
    function hasProfile(profileName) {
        if (typeof _availableProfiles[profileName] === "undefined") {
            return false;
        }
        
        return true;
    }
    
    /**
     * Safely gets the items for a given profile by name.
     * 
     * This function will internally call `hasProfile` to determine if the profile exists. If
     * the profile does not exist, this function will return a literal `null`.
     * 
     * Additionally, this function will check to see if the ProfileManager has been properly
     * initialized. If not, it will return a literal `null` value.
     * 
     * @param   {string}     profileName The name of the profile to get the items for.
     * @returns {array|null}
     */
    function getProfileItems(profileName) {
        if (_initialized && hasProfile(profileName)) {
            return _availableProfiles[profileName].items;
        }
        
        return null;
    }
    
    AppInit.appReady(_initialize);
    
    EventDispatcher.makeEventDispatcher(exports);

    exports.getUserProfiles = getUserProfiles;
    exports.hasProfile = hasProfile;
    exports.getProfileItems = getProfileItems;
});