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
 * Utility functions related to file paths.
 */
define(function (require, exports, module) {
    "use strict";

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
     * The Linguistics dictionary path name.
     * 
     * @const
     * @type {string}
     */
    var LINGUISTICS_DICTIONARY_PATH_NAME = "stillat.alice.linguistics-dictionary";
    
    /**
     * The Linguistics path name.
     * 
     * @const
     * @type {string}
     */
    var LINGUISTICS_PATH_NAME = "stillat.alice.linguistics";

    /**
     * Generates a path for the given name and extension.
     * 
     * @private
     * 
     * @param   {string} name      The name of the file.
     * @param   {string} extension The extension of the file, without a full stop separator.
     * @returns {string} The generated path name.
     */
    function _getPath(name, extension) {
        return require.toUrl("data/" + name + "." + extension);
    }

    /**
     * Gets an affix file path for the given localeName.
     * 
     * @param   {string} localeName The locale name. Defaults to "en_us".
     * @returns {string} The file path to the affix file.
     */
    function getAffixFile(localeName) {
        if (arguments.length === 0) {
            localeName = _defaultLocaleName;
        }

        return _getPath(localeName, EXTENSION_AFFIX);
    }

    /**
     * Gets a dictionary file path for the given localeName.
     * 
     * @param   {?string} localeName The locale name. Defaults to "en_us".
     * @returns {string}  The file path to the dictionary file.
     */
    function getDictionaryFile(localeName) {
        if (arguments.length === 0) {
            localeName = _defaultLocaleName;
        }

        return _getPath(localeName, EXTENSION_DICTIONARY);
    }
    
    /**
     * Gets the Brackets extension directory path.
     * 
     * @returns {string}
     */
    function getExtensionsDirectory() {
        return brackets.app.getApplicationSupportDirectory() + "/extensions";
    }
    
    /**
     * Gets a path relative to the Linguistics extension.
     * 
     * @param   {string} path The relative path. Optional.
     * @returns {string} The fully resolved path.
     */
    function getLinguisticsExtensionDirectory(path) {
        if (!path) {
            path = "";
        }
        
        return getExtensionsDirectory() + "/user/" + LINGUISTICS_PATH_NAME + "/" + path;
    }
    
    /**
     * Gets a path relative to the Linguistics dictionary extension.
     * 
     * @param   {string} path The relative path to get.
     * @returns {string} The fully resolved dictionary file path.
     */
    function getDictionaryPath(path) {
        if (!path) {
            path = "";
        }
        
        return getExtensionsDirectory() + "/user/" + LINGUISTICS_DICTIONARY_PATH_NAME + "/" + path;
    }
    
    exports.getAffixFile = getAffixFile;
    exports.getDictionaryFile = getDictionaryFile;
    exports.getLinguisticsExtensionDirectory = getLinguisticsExtensionDirectory;
    exports.getExtensionsDirectory = getExtensionsDirectory;
    exports.getDictionaryPath = getDictionaryPath;

});