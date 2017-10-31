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
 * PreferencesManager manages the preferences for the Linguistics extension.
 */
define(function (require, exports, module) {
    "use strict";
    
    /**
     * The Brackets preferences manager.
     * 
     * @type {PreferencesManager}
     */
    var PreferencesManager = brackets.getModule("preferences/PreferencesManager");
    
    // The extension preferences container.
    var _prefs = PreferencesManager.getExtensionPrefs("alice-linguistics");
    
    
    /**
     * The preference name that determines if spell checking is enabled.
     * 
     * @const
     * @type {string}
     */
    var PREFERENCE_SPELL_CHECK_ENABLED = "spellCheckEnabled";
    
    /**
     * The preference name that determines if grammar checking is enabled.
     * 
     * @const
     * @type {string}
     */
    var PREFERENCE_GRAMMAR_CHECK_ENABLED = "grammarCheckEnabled";
    
    /**
     * The preference name that determines the spelling error visualization color.
     * 
     * @const
     * @type {string}
     */
    var PREFERENCE_SPELLING_VISUALIZATION_COLOR = "spellingVisualizationColor";
    
    /**
     * The preference name that determines the grammar error visualization color.
     * 
     * @const
     * @type {string}
     */
    var PREFERENCE_GRAMMAR_VISUALIZATION_COLOR = "grammarVisualizationColor";
    
    /**
     * The preference name that determines if uppercase words are ignored by the spell checker.
     * 
     * @const
     * @type {string}
     */
    var PREFERENCE_SPELLING_IGNORE_UPPERCASE = "spellingIgnoreUppercase";
    
    /**
     * The preference name that represents a list of words that should always be ignored.
     * 
     * @const
     * @type {string}
     */
    var PREFERENCE_GLOBAL_USER_IGNORE_LIST = "globalIgnoreList";
    
    /**
     * The preference name that determines the preferred locale name.
     * 
     * @const
     * @type {string}
     */
    var PREFERENCE_LOCALE_NAME = "localeName";
    
    /**
     * The preference name that determines if Linguistics should attempt to use Brackets' language setting.
     * 
     * @const
     * @type {string}
     */
    var PREFERENCE_USE_DEFAULT_LANGUAGE = "useDefaultLanguage";
    
    // Extension preferences.
    var _spellCheckEnabled = true,
        _grammarCheckEnabled = true,
        _spellingVisualizationColor = "#e74c3c",
        _grammarVisualizationColor = "#2ecc71",
        _localeName = "en_US",
        _useDefaultLanguage = true,
        _ignoreUppercaseSpelling = true;
    
    /**
     * Defines a new boolean preference with the preferences manager.
     * 
     * @param {string} preferenceName The preference name.
     * @param {any}    defaultValue   The preference default value.
     * @param {string} description    The preference description.
     */
    function _defineBoolean(preferenceName, defaultValue, description) {
        _prefs.definePreference(preferenceName, "boolean", defaultValue, {
            description: description
        });
    }
    
    /**
     * Defines a new string preference with the preferences manager.
     * 
     * @param {string} preferenceName The preference name.
     * @param {any}    defaultValue   The preference default value.
     * @param {string} description    The preference description.
     */
    function _defineString(preferenceName, defaultValue, description) {
        _prefs.definePreference(preferenceName, "string", defaultValue, {
            description: description
        });
    }
    
    _defineBoolean(PREFERENCE_SPELL_CHECK_ENABLED, _spellCheckEnabled, "Determines if spell checking is enabled.");
    _defineBoolean(PREFERENCE_GRAMMAR_CHECK_ENABLED, _grammarCheckEnabled, "Determines if grammar checking is enabled.");
    _defineBoolean(PREFERENCE_USE_DEFAULT_LANGUAGE, _useDefaultLanguage, "Determines if Linguistics should attempt to use Brackets' configured language.");
    _defineBoolean(PREFERENCE_SPELLING_IGNORE_UPPERCASE, _ignoreUppercaseSpelling, "Determines if the Linguistics spell checker should ignore uppercase words.");
    _defineString(PREFERENCE_LOCALE_NAME, _localeName, "Determines the language name that Linguistics should use.");
    _defineString(PREFERENCE_SPELLING_VISUALIZATION_COLOR, _spellingVisualizationColor, "Determines the spelling error visualization color.");
    _defineString(PREFERENCE_GRAMMAR_VISUALIZATION_COLOR, _grammarVisualizationColor, "Determines the grammar error visualization color.");
    
    /**
     * Gets the Linguistic preferences.
     * 
     * @returns {PrefixedPreferencesSystem}
     */
    function getPreferencesSystem() {
        return _prefs;
    }
    
    /**
     * Updates the exported preference variables.
     * @private
     */
    function _updatePreferenceExports() {
        exports.spellCheckEnabled = _spellCheckEnabled;
        exports.grammarCheckEnabled = _grammarCheckEnabled;
        exports.usingDefaultLanguage = _useDefaultLanguage;
        exports.localeName = _localeName;
        exports.spellingVisualizationColor = _spellingVisualizationColor;
        exports.grammarVisualizationColor = _grammarVisualizationColor;
        exports.spellingIgnoreUppercase = _ignoreUppercaseSpelling;
    }
    
    /**
     * Updates the preferences with current values.
     */
    function updatePreferences() {
        _spellCheckEnabled = _prefs.get(PREFERENCE_SPELL_CHECK_ENABLED);
        _grammarCheckEnabled = _prefs.get(PREFERENCE_GRAMMAR_CHECK_ENABLED);
        _spellingVisualizationColor = _prefs.get(PREFERENCE_SPELLING_VISUALIZATION_COLOR);
        _grammarVisualizationColor = _prefs.get(PREFERENCE_GRAMMAR_VISUALIZATION_COLOR);
        _localeName = _prefs.get(PREFERENCE_LOCALE_NAME);
        _useDefaultLanguage = _prefs.get(PREFERENCE_USE_DEFAULT_LANGUAGE);
        _ignoreUppercaseSpelling = _prefs.get(PREFERENCE_SPELLING_IGNORE_UPPERCASE);
        
        _updatePreferenceExports();
    }
    
    /**
     * Persists a preference value.
     * 
     * @param {string} preferenceKey   The preference key.
     * @param {string} preferenceValue The preference value.
     */
    function set(preferenceKey, preferenceValue) {
        _prefs.set(preferenceKey, preferenceValue);
    }
    
    exports.updatePreferences = updatePreferences;
    exports.getPreferencesSystem = getPreferencesSystem;
    exports.set = set;
    
    exports.PREFERENCE_SPELL_CHECK_ENABLED = PREFERENCE_SPELL_CHECK_ENABLED;
    exports.PREFERENCE_GRAMMAR_CHECK_ENABLED = PREFERENCE_GRAMMAR_CHECK_ENABLED;
    exports.PREFERENCE_SPELLING_VISUALIZATION_COLOR = PREFERENCE_SPELLING_VISUALIZATION_COLOR;
    exports.PREFERENCE_GRAMMAR_VISUALIZATION_COLOR = PREFERENCE_GRAMMAR_VISUALIZATION_COLOR;
    exports.PREFERENCE_SPELLING_IGNORE_UPPERCASE = PREFERENCE_SPELLING_IGNORE_UPPERCASE;
    exports.PREFERENCE_LOCALE_NAME = PREFERENCE_LOCALE_NAME;
    exports.PREFERENCE_USE_DEFAULT_LANGUAGE = PREFERENCE_USE_DEFAULT_LANGUAGE;
    
    _updatePreferenceExports();
});