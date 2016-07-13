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
 * The UtilityManager 
 */
define(function (require, exports, module) {
    "use strict";
    
    var Dictionary = require("src/utils/Dictionary"),
        FileSystem = brackets.getModule("filesystem/FileSystem"),
        AppInit = brackets.getModule("utils/AppInit"),
        EditorManager = brackets.getModule("editor/EditorManager"),
        MainViewManager = brackets.getModule("view/MainViewManager");
    
    /**
     * Indicates if the UtilityManager has initialized.
     * 
     * @type {bool}
     */
    var _initialized = false;
    
    /**
     * Indicates if the UtilityManager is currently initializing.
     *
     * @type {bool}
     */
    var _isInitializing = false;
    
    var _currentModeName = "Mode.all";
    
    var _currentDocumentContents = null;
    
    var _hostEditor = null;
    
    var _alwaysIgnoreFiles = [];
    
    var _alwaysIgnoreCachedList = [
        "alice"
    ];
    
    var _ignoreOnlyWithCondition = [];
    
    function _getUtilityPaths(callback) {
        var utilityPath = FileSystem.getDirectoryForPath(Dictionary.getGenericUtilitiesDirectory());
        var files = [];
        utilityPath.getContents(function (err, contents, contentsStats, contentsStatsErrors) {
            if (!err) {
                contents.forEach(function (element, index, array) {
                    // Quick and dirty way to filter to only get the files.
                    if (!element.hasOwnProperty("_isDirectory") && element._isFile === true) {
                        files.push(element);
                    }
                });
            }
            callback(files);
        });
    }
 
    var _validConditionProperties = [
        "ignoreAfter",
        "ignoreMode",
        "ignoreWhenDocumentContains"
    ];
    
    function _containsCondition(data) {
        var i = 0;
        
        for (i; i < _validConditionProperties.length; i++) {
            var conditionName = _validConditionProperties[i];
            if (typeof data[conditionName] !== "undefined" && data[conditionName].length > 0) {
                return true;
            }
        }
        
        return false;
    }
    
    function _loadUtilityFile(err, data, stats) {
        if (!err) {
            var utilityData = JSON.parse(data);
            
            if (!_containsCondition(utilityData)) {
                _alwaysIgnoreFiles.push(utilityData);
                _alwaysIgnoreCachedList.concat(utilityData.ignore);
            } else {
                _ignoreOnlyWithCondition.push(utilityData);
            }
        }
    }
    
    function _loadUtilityFiles(files) {
        files.forEach(function (element, index, array) {
            element.read({encoding: "utf8"}, _loadUtilityFile);
        });
    }
    
    function _isValidMode(ignoreList) {
        if (
            (ignoreList.ignoreMode.indexOf("Mode.all") > -1) || 
            ignoreList.ignoreMode.indexOf(_currentModeName) > -1 || 
            (String(_currentModeName) === "null" && ignoreList.ignoreMode.indexOf("Mode.all") > -1)) {
            return true;
        }
        
        return false;
    }
    
    function _utilityMustBeLoadedManually(ignoreList) {
        if (ignoreList.hasOwnProperty("mustBeManuallyLoaded") && ignoreList.mustBeManuallyLoaded === true) {
            return true;
        }
        
        return false;
    }
    
    function _checkIgnoreAfter(ignoreList, beforeContext, word) {
        if (ignoreList.hasOwnProperty("ignoreAfter") && ignoreList.ignoreAfter.length > 0) {
            if (ignoreList.ignoreAfter === beforeContext && ignoreList.ignore.indexOf(word) > -1) {
                return true;
            }
        }
        
        return null;
    }
    
    function _shouldWordBeIgnoredBasedOnDocumentContents(ignoreList, word) {
        if (ignoreList.hasOwnProperty("ignoreWhenDocumentContains") && ignoreList.ignoreWhenDocumentContains.length > 0 && _currentDocumentContents !== null) {
            
            var i = 0;
            for (i; i < ignoreList.ignoreWhenDocumentContains.length; i++) {
                
            
                if (_currentDocumentContents.indexOf(ignoreList.ignoreWhenDocumentContains[i]) > -1) {
                    
                
                    if (ignoreList.ignore.indexOf(word) > -1) {
                        return true;
                    }
                }
            }
        }
        
        return null;
    }
    
    function _shouldWordBeIgnoredWithContext(word, beforeContext) {
        var i = 0;
        for (i; i < _ignoreOnlyWithCondition.length; i++) {
            var ignoreList = _ignoreOnlyWithCondition[i];
            // Check first to see if the current word should be ignored based
            // on the current context and the items in the ignore list.
            if (_checkIgnoreAfter(ignoreList, beforeContext, word) !== null) {
                return true;
            }
            
            if (ignoreList.hasOwnProperty("ignoreMode") && ignoreList.ignoreMode.length > 0) {
                if (_isValidMode(ignoreList) && !_utilityMustBeLoadedManually(ignoreList)) {
                    
                    if (_checkIgnoreAfter(ignoreList, beforeContext, word) !== null) {
                        return true;
                    }
                    
                    if (_shouldWordBeIgnoredBasedOnDocumentContents(ignoreList, word) !== null) {
                        return true;
                    } else {
                        // This handles cases where words should just be ignored
                        // only based on the current mode.
                        if (ignoreList.ignore.indexOf(word) > -1) {
                            return true;
                        }
                    }
                }
            }
        }
        
        return false;
    }
    
    /**
     * Determines if a word should be ignored.
     * 
     * @param {string} word          The word to check.
     * @param {string} beforeContext The string that came before the word.
     */
    function shouldIgnore(word, beforeContext) {
        // First check to see if the word is inside _alwaysIgnoreCachedList.
        if (_alwaysIgnoreCachedList.indexOf(word) > -1) {
            return true;
        }
        
        // Check to see there is a valid beforeContext.
        if (beforeContext === null || beforeContext.length === 0) {
            return false;
        }
        
        return _shouldWordBeIgnoredWithContext(word, beforeContext);
    }
    
    function setModeName(mode) {
        _currentModeName = mode;
    }
    
    function setDocumentContents(contents) {
        _currentDocumentContents = contents;
    }
    
    function _handleDocumentChange() {
        if (_hostEditor === null || _hostEditor.hasOwnProperty("_codeMirror") === false) {
            return;
        }
        
        _currentDocumentContents = _hostEditor._codeMirror.getValue();
    }
    
    function _handleCurrentFileChange() {
        // Release any existing references.
        if (_hostEditor !== null) {
            _hostEditor.document.releaseRef();
        }
        
        _hostEditor = EditorManager.getActiveEditor();
        _hostEditor.document.addRef();
        _hostEditor.document.on("change", _handleDocumentChange);
    }
    
    /**
     * Initializes the UtilityManager.
     */
    function _initialize() {
        // Do not attempt to initialize if the UtilityManager
        // is already doing its initialization logic.
        if (!_isInitializing && !_initialized) {
            _getUtilityPaths(_loadUtilityFiles);
        }
        
        MainViewManager.on("currentFileChange", _handleCurrentFileChange);
    }
    
    AppInit.appReady(_initialize);
    
    exports.shouldIgnore = shouldIgnore;
    exports.setModeName = setModeName;
    exports.setDocumentContents = setDocumentContents;
    
});