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
 * The SpellChecker contains the logic for marking spelling errors in the document.
 */
define(function (require, exports, module) {
    "use strict";

    var DictionaryManager = require("src/spelling/DictionaryManager"),
        StringUtils = require("src/utils/Strings"),
        UtilityManager = require("src/spelling/UtilityManager");
    
    /**
     * The locale name.
     * 
     * @type {string}
     */
    var _localeName = null;
    
    /**
     * Indicates if the user has enabled the spell checker.
     *
     * @type {bool}
     */
    var _spellCheckEnabled = false;
    
    /**
     * Indicates if the Linguistics spell checker should ignore upper case words.
     * 
     * @type {boolean}
     */
    var _spellingIgnoreUppercase = true;
    
    /**
     * Indicates if the spell checker is ready.
     * 
     * @type {boolean}
     */
    var _initialized = false;
    
    /**
     * A list of very common programming keywords. It is safe to assume that a lot
     * of Linguistics users are also programmers; they shouldn't have to add
     * these common terms to their dictionaries.
     *
     * @type {array}
     */
    var _commonProgrammingKeywords = [
        "foreach", "json", "aff", "dic", "url", "src"
    ];
    
    /**
     * Simply a way to internally toggle experimental features.
     *
     * @type {object}
     */
    var _experimentalFeatures = {
        attemptIntelligentQuoteDetection: true,
        automaticallyDetectCamelCaseWords: true
    };
    
    var _currentMode = "Mode.all";
    
    /**
     * Indicates if both the dictionary and affix files have loaded.
     *
     * @private
     * @return {boolean}
     */
    function _isInitialized() {
        return _initialized;
    }
    
    /**
     * Determines if the spell checker should ignore uppercase words.
     * 
     * @param {boolean} shouldIgnore Whether or not to ignore uppercase words.
     */
    function shouldSpellingIgnoreUppercaseWords(shouldIgnore) {
        _spellingIgnoreUppercase = shouldIgnore;
    }
    
    /**
     * Determines if a word is in the list of common programming keywords.
     * @private
     * 
     * @param   {string}  word The word to check.
     * @returns {boolean}
     */
    function _isCommonTerm(word) {
        return (_commonProgrammingKeywords.indexOf(word) > -1);
    }
    
    /**
     * Checks the spelling of camel-cased words.
     * 
     * @private
     * 
     * This function returns a boolean value. The meaning of this return value
     * may seem a little ambiguous. A return value of "false" means that the
     * function has determined the word is spelled incorrectly, and that no
     * further processing should be required. A return value of "true" means
     * that the function has determined the word may be spelled correctly, but
     * further processing might be required.
     * 
     * @param  {string} word The word to check.
     * @return {boolean}
     */
    function _checkSpellingOfCamelCaseWord(word) {
        var _wordParts = StringUtils.splitByUpperCase(word);
        var _i = 0;
        
        for (_i; _i < _wordParts.length; _i++) {
            // Return as soon as we can.
            if (!DictionaryManager.check(_wordParts[_i])) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Checks the spelling of a word surrounded by a certain character.
     * 
     * This function returns a boolean value. The meaning of this return value
     * may seem a little ambiguous. A return value of "false" means that the
     * function has determined the word is spelled incorrectly, and that no
     * further processing should be required. A return value of "true" means
     * that the function has determined the word may be spelled correctly,
     * but further processing might be required.
     * 
     * This function may return a literal numeric value of "-1". When this value
     * is returned it is indicating that the function has determined that the
     * word checked is actually correct and no further processing should
     * be required.
     * 
     * @param   {string}  word      The word to check.
     * @param   {string}  character The character that surrounds the word.
     * @returns {boolean|integer}
     */
    function _checkSpellingBetweenCharacter(word, character) {
        var _baseWord = null;
        var _seemsCorrect = null;
        
        if (StringUtils.startsWith(word, character) && StringUtils.endsWith(word, character)) {
            _baseWord = StringUtils.trimChar(word, character);
            if (StringUtils.isCamelCase(_baseWord)) {
                _seemsCorrect = _checkSpellingOfCamelCaseWord(_baseWord);
            } else {
                _seemsCorrect = DictionaryManager.check(_baseWord);
            }
        } else if (StringUtils.endsWith(word, character)) {
            _baseWord = word.substr(0, word.length - 1);
            _seemsCorrect = DictionaryManager.check(_baseWord);
        } else if (StringUtils.startsWith(word, character)) {
            _baseWord = word.substr(1, word.length - 1);
            _seemsCorrect = DictionaryManager.check(_baseWord);
        }
        
        if (_seemsCorrect !== null && !_seemsCorrect) {
            return false;
        }
        
        if (_seemsCorrect) {
            return -1;
        }
        
        return true;
    }
    
    /**
     * Determines if a word is spelled "incorrectly".
     * @private
     * 
     * @param {string} word The word to check.
     * @return {boolean}
     */
    function _hasCorrectSpelling(word) {
        // The idea here is we don't want to make a call to _typo.check() unless
        // we absolutely need to. We also want to eliminate as many false
        // positives as possible.
        
        // Check if a word is "correct" by default.
        if (_isCommonTerm(word)) {
            return true;
        }
        
        // If the word we are checking is a valid number, let's not flag
        // it as a misspelling.
        if (!isNaN(parseFloat(word))) {
            return true;
        }
        
        if (_spellingIgnoreUppercase) {
            var _baseWord = null;
            // If a word is all capitalized we will assume it is an acronym
            // of some sort.
            if (word === word.toUpperCase()) {
                return true;
            }
            
            // This handles uppercase words that might have a plural ending
            // that is not necessarily uppercased.
            if (StringUtils.endsWith(word, "'s")) {
                _baseWord = word.substr(0, word.length - 2);
                if (_baseWord === _baseWord.toUpperCase()) {
                    return true;
                }
            }
            
            // This will handle cases like "Joneses'".
            if (StringUtils.endsWith(word, "'") && !StringUtils.startsWith(word, "'")) {
                _baseWord = word.substr(0, word.length - 1);
                var _firstCharacter = word.substr(0, 1);
                
                if (_firstCharacter === _firstCharacter.toUpperCase()) {
                    return DictionaryManager.check(_baseWord);
                }
            }
        }
        
        if (_experimentalFeatures.attemptIntelligentQuoteDetection) {
            var _quotesSeemCorrect = true;
            var _doubleQuotesSeemCorrect = true;
            
            if (StringUtils.startsWith(word, "'") || StringUtils.endsWith(word, "'")) {
                _quotesSeemCorrect = _checkSpellingBetweenCharacter(word, "'");
            }
            
            if (StringUtils.startsWith(word, '"') || StringUtils.endsWith(word, '"')) {
                _doubleQuotesSeemCorrect = _checkSpellingBetweenCharacter(word, '"');
            }
            
            // The quoted word appears correct, so let's indicate that
            // to the CodeMirror mode.
            if (_quotesSeemCorrect === -1 || _doubleQuotesSeemCorrect === -1) {
                return true;
            }
            
            // The quoted word appears to be incorrect, so let's tell
            // that to the CodeMirror mode.
            if (_quotesSeemCorrect === false || _doubleQuotesSeemCorrect === false) {
                return false;
            }
            
        }
        
        if (_experimentalFeatures.automaticallyDetectCamelCaseWords) {
            if (StringUtils.isCamelCase(word)) {
                return _checkSpellingOfCamelCaseWord(word);
            }
        }
        
        // At this point, we can make a call to _typo.check() to see what
        // it has to say about a particular word case.
        return DictionaryManager.check(word);
    }
    
    var _lastWordSeparatorDirty = true;
    var _lastWordSeparator = "";

    /**
     * Gets a spell checker overlay that can be used by a CodeMirror instance.
     * 
     * @returns {object|string} The spell checker overlay.
     */
    function getOverlay() {
        return {
            spellCheckOverlay: true,
            token: function (stream, state) {
                
                if (_lastWordSeparatorDirty) {
                    _lastWordSeparator = "";
                    _lastWordSeparatorDirty = false;
                }
                
                if (!_isInitialized()) {
                    stream.skipToEnd();
                    return null;
                }
                
                var _character = stream.peek();
                var _word = "";
                
                if (StringUtils.isWordSeparator(_character)) {
                    stream.next();
                    _lastWordSeparator += _character;
                    return null;
                }
                
                while (StringUtils.isString(_character = stream.peek()) && !StringUtils.isWordSeparator(_character)) {
                    _word += _character;
                    stream.next();
                }
                
                // Typically we would just make a call to _typo.check, but we want a
                // little more control over what is considered a "mispelled" word.
                if (!_hasCorrectSpelling(_word) && !UtilityManager.shouldIgnore(_word, _lastWordSeparator)) {
                    _lastWordSeparatorDirty = true;
                    return "alice-error-visualization alice-spelling-visualization";
                }
                
                _lastWordSeparatorDirty = true;
                return null;
            }
        };
    }

    /**
     * Sets whether or not the spell checker is enabled.
     * 
     * @param {boolean} isEnabled
     */
    function setSpellCheckEnabled(isEnabled) {
        _spellCheckEnabled = isEnabled;
    }
    
    /**
     * Sets the locale name used by the spell checker.
     * 
     * @param {string} localeName The locale name.
     */
    function setLocaleName(localeName) {
        _localeName = localeName;
        DictionaryManager.setDefaultLocale(localeName);
        
        // The dictionary manager will not load the same dictionary twice, so we
        // can safely abuse this function.
        DictionaryManager.loadDictionary(localeName);
    }
    
    function suggest(word) {
        return DictionaryManager.suggest(word);
    }
    
    function setModeName(mode) {
        _currentMode = mode;
        UtilityManager.setModeName(mode);
    }
    
    // These events will provide enough information to accurately determine
    // if the spell checker is in an "initialized" state.
    DictionaryManager.on("dictionariesUnloaded", function (e, localeName) {
        _initialized = false;
    });
    
    DictionaryManager.on("dictionaryUnloaded", function (e, localeName) {
        _initialized = DictionaryManager.hasDictionariesLoaded();
    });
    
    DictionaryManager.on("dictionaryLoaded", function (e, localeName) {
        _initialized = true;
    });
    
    exports.setLocaleName = setLocaleName;
    exports.setSpellCheckEnabled = setSpellCheckEnabled;
    exports.getOverlay = getOverlay;
    exports.shouldIgnoreUppercaseWords = shouldSpellingIgnoreUppercaseWords;
    exports.suggest = suggest;
    exports.setModeName = setModeName;

});