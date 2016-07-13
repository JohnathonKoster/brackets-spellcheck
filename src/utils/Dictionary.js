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
/*global define, $, window, brackets */

/**
 * The Dictionary is responsible for resolving paths to Linguistics various dictionaries
 * and files. The dictionaries are maintained as a separate extension to make updating
 * and maintenance easier
 * 
 * Some code may look similar to the "Paths" code, but works
 * on a separate extension altogether.
 */
define(function (require, exports, module) {
    "use strict";
    
    var Paths = require("src/utils/Paths");
    
    /**
     * The default locale name.
     * @private
     * @type {string}
     */
    var _defaultLocaleName = "en_US";
        
    /**
     * The expected dictionary file extension.
     * 
     * @const
     * @type {string}
     */
    var EXTENSION_DICTIONARY = "dic";
    
    /**
     * The expected affix file extension.
     * 
     * @const
     * @type {string}
     */
    var EXTENSION_AFFIX = "aff";
    
    /**
     * The natural languages dictionary directory.
     * 
     * @const
     * @type {string}
     */
    var DIRECTORY_NATURAL_LANGUAGES = "natural-languages";
    
    /**
     * The user profiles directory.
     * 
     * @const
     * @type {string}
     */
    var DIRECTORY_USER_PROFILES = "user-profiles";
    
    /**
     * The programming languages dictionary directory.
     * 
     * @const
     * @type {string}
     */
    var DIRECTORY_PROGRAMMING_LANGUAGES = "programming-languages";
    
    /**
     * The generic utilities dictionary directory.
     * 
     * @const
     * @type {string}
     */
    var DIRECTORY_GENERIC_UTILITIES = "generic-utilities";
    
    /**
     * Gets the natural language directory.
     * 
     * @returns {string}
     */
    function getNaturalLanguageDirectory() {
        return Paths.getDictionaryPath(DIRECTORY_NATURAL_LANGUAGES);
    }
    
    /**
     * Gets the user profiles directory.
     * 
     * @returns {string}
     */
    function getUserProfilesDirectory() {
        return Paths.getDictionaryPath(DIRECTORY_USER_PROFILES);
    }
    
    /**
     * Gets the programming languages directory.
     * 
     * @returns {string}
     */
    function getProgrammingLanguagesDirectory() {
        return Paths.getDictionaryPath(DIRECTORY_PROGRAMMING_LANGUAGES);
    }
    
    /**
     * Gets the generic utilities directory.
     * 
     * @returns {string}
     */
    function getGenericUtilitiesDirectory() {
        return Paths.getDictionaryPath(DIRECTORY_GENERIC_UTILITIES);
    }
    
    /**
     * Generates a path relative to the natural languages directory.
     * @private
     * 
     * @param   {string} name      The name of the file.
     * @param   {string} extension The extension of the file, without a full stop separator.
     * @returns {string} The generated path name.
     */
    function _getDictionaryFilePath(name, extension) {
        return getNaturalLanguageDirectory() + "/" + name + "/" + name + "." + extension;
    }
    
    /**
     * Gets an affix file path for the given localeName.
     * 
     * The returned path is relative to the Linguistics dictionary extension.
     * 
     * @param   {string}   localeName The locale name. Defaults to "en_US".
     * @returns {[[Type]]}
     */
    function getAffixFile(localeName) {
        if (arguments.length === 0) {
            localeName = _defaultLocaleName;
        }
        
        return _getDictionaryFilePath(localeName, EXTENSION_AFFIX);
    }
    
    /**
     * Gets a dictionary file path for the given localeName.
     * 
     * The returned path is relative to the Linguistics dictionary extension.
     * 
     * @param   {string} localeName The locale name. Defaults to "en_US".
     * @returns {string}
     */
    function getDictionaryFile(localeName) {
        if (arguments.length === 0) {
            localeName = _defaultLocaleName;
        }
        
        return _getDictionaryFilePath(localeName, EXTENSION_DICTIONARY);
    }
    
    /**
     * Gets an arbitrary path relative to the dictionary path.
     * 
     * @param   {string} fileName The file name.
     * @returns {string} The fully qualified path name.
     */
    function getRelativeDictionaryFile(fileName) {
        return getNaturalLanguageDirectory() + "/" + fileName;
    }
    
    exports.getNaturalLanguageDirectory = getNaturalLanguageDirectory;
    exports.getProgrammingLanguagesDirectory = getProgrammingLanguagesDirectory;
    exports.getGenericUtilitiesDirectory = getGenericUtilitiesDirectory;
    exports.getAffixFile = getAffixFile;
    exports.getDictionaryFile = getDictionaryFile;
    exports.getRelativeDictionaryFile = getRelativeDictionaryFile;
    exports.getUserProfilesDirectory = getUserProfilesDirectory;
    
});