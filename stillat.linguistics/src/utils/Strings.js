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
 * Utility functions realted to file paths.
 */
define(function (require, exports, module) {
    "use strict";
    
    var StringUtils = brackets.getModule("utils/StringUtils");
    
    /**
     * The characters that separate words.
     *
     * @type {string}
     */
    var _wordSeparators = "!\"#$%&()*+,-./:;<=>?@[\\]^_`{|}~ ∎®";
    
    /**
     * Checks if a value is a string.
     * 
     * @param   {any}     data The value to check
     * @returns {boolean}
     */
    function isString(data) {
        // Bail out early if the value is actually null or undefined.
        if (data === null || typeof data === "undefined") {
            return false;
        }
        return typeof data === "string" || (typeof data === "object" && data.constructor === String);
    }
    
    /**
     * Determines if a given string (haystack) contains another string (needle).
     * 
     * @param   {string}  needle   The string to look for.
     * @param   {string}  haystack The string to look in.
     * @returns {boolean}
     */
    function contains(needle, haystack) {
        if (!isString(haystack) || !isString(needle)) {

            var _containsWord = false;

            if (haystack instanceof Array) {
                for (var i in haystack) {
                    if (contains(haystack[i], needle)) {
                        _containsWord = true;
                        break;
                    }
                }
            }

            return _containsWord;
        }
        
        return needle.toLowerCase().indexOf(haystack) !== -1;
    }
    
    /**
     * Determines if a character is a word separator.
     * 
     * @param   {string}  char The character to check.
     * @returns {boolean}
     */
    function isWordSeparator(char) {
        return contains(_wordSeparators, char);
    }
    
    function containsWordSeparator(string) {
        return /[\!\"\#\$\%\&\(\)\*\+\,\-\.\/\:\;\<\=\>\?\@\[\\\]\^\_\`\{\|\}\~\ ]/.test(string);
    }
    
    /**
     * Returns true if the given string ends with the given suffix.
     *
     * @param {string} str
     * @param {string} suffix
     */
    function endsWith(str, suffix) {
        return StringUtils.endsWith(str, suffix);
    }
    
    /**
     * Returns true if the given string starts with the given prefix.
     * @param   {String} str
     * @param   {String} prefix
     * @return {Boolean}
     */
    function startsWith(str, prefix) {
        return StringUtils.startsWith(str, prefix);
    }
    
    /**
     * Trims the specified character from the beginning and end of a string.
     * 
     * @param   {string} string The string to trim.
     * @param   {string} char   The character to trim.
     * @returns {string}
     */
    function trimChar(string, char) {
        if (!char) {
            char = " ";
        }
        char = char.replace("/([()[{*+.$^\\|?])/g", '\\$1'); //escape char parameter if needed for regex syntax.
        var regex_1 = new RegExp("^" + char + "+", "g");
        var regex_2 = new RegExp(char + "+$", "g");
        return string.replace(regex_1, '').replace(regex_2, '');
    }
    
    /**
     * Converts a string to camel case.
     * 
     * See http://stackoverflow.com/a/2970667 for the original source
     * of this handy little gem.
     * 
     * @author CMS http://stackoverflow.com/a/2970667
     * 
     * @param   {string}  string              The string to convert.
     * @returns {string}
     */
    function toCamelCase(string) {
        return string.replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, function (match, index) {
            if (+match === 0) {
                return "";
            }
            return index === 0 ? match.toLowerCase() : match.toUpperCase();
        });
    }
    
    /**
     * Counts the occurrences of substring in a string.
     * 
     * @author Vitim.us http://stackoverflow.com/questions/4009756/how-to-count-string-occurrence-in-string/7924240#7924240
     *             
     * @param {string}  string              Required. The string;
     * @param {string}  subString           Required. The string to search for;
     * @param {boolean} allowOverlapping    Optional. Default: false;
     * @return {number}
     */
    function occurrences(string, subString, allowOverlapping) {
        string += "";
        subString += "";
        if (subString.length <= 0) {
            return (string.length + 1);
        }

        var n = 0,
            pos = 0,
            step = allowOverlapping ? 1 : subString.length;

        while (true) {
            pos = string.indexOf(subString, pos);
            if (pos >= 0) {
                ++n;
                pos += step;
            } else {
                break;
            }
        }
        return n;
    }
    
    /**
     * Determines if a string is CamelCased.
     * 
     * @param   {string}  string The string to check.
     * @returns {boolean}
     */
    function isCamelCase(string) {
        var _parts = string.split("");
        var _tempString = "";
        
        _parts.forEach(function (element, index, array) {
            if (element.toUpperCase() === element) {
                _tempString += " " + element.toLowerCase();
            } else {
                _tempString += element;
            }
        });
        
        var _numberOfSpaces = occurrences(_tempString, " ", false);
        
        if (_numberOfSpaces === 0) {
            return false;
        }
        
        if (toCamelCase(_tempString) === string) {
            return true;
        }
        
        return false;
    }
    
    /**
     * Splits a string into an array, using uppercase letters as the boundaries.
     * 
     * @param   {string} string The string to split.
     * @returns {array}
     */
    function splitByUpperCase(string) {
        return string.split(/(?=[A-Z])/);
    }
    
    function chomp() {
        
    }
    
    exports.contains = contains;
    exports.isWordSeparator = isWordSeparator;
    exports.isString = isString;
    exports.occurrences = occurrences;
    exports.endsWith = endsWith;
    exports.startsWith = startsWith;
    exports.trimChar = trimChar;
    exports.isCamelCase = isCamelCase;
    exports.toCamelCase = toCamelCase;
    exports.splitByUpperCase = splitByUpperCase;
    exports.containsWordSeparator = containsWordSeparator;
    
});