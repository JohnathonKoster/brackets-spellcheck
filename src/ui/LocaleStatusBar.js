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
/*global define, $, window, brackets, Mustache */

/**
 * Manages part of the status bar related to the current editor's language.
 */
define(function (require, exports, module) {
    "use strict";
    
    var _ = require("thirdparty/lodash"),
        AnimationUtils = brackets.getModule("utils/AnimationUtils"),
        AppInit = brackets.getModule("utils/AppInit"),
        DropdownButton = brackets.getModule("widgets/DropdownButton").DropdownButton,
        EditorManager = brackets.getModule("editor/EditorManager"),
        LinguisticsEditorManager = require("src/editor/EditorManager"),
        MainViewManager = brackets.getModule("view/MainViewManager"),
        Editor = brackets.getModule("editor/Editor"),
        KeyEvent = brackets.getModule("utils/KeyEvent"),
        StatusBar = brackets.getModule("widgets/StatusBar"),
        DictionaryManager = require("src/spelling/DictionaryManager"),
        Preferences = require("src/preferences/PreferencesManager"),
        Strings = brackets.getModule("strings");
    
    var languageSelect, // This is a DropdownButton instance.
        $statusLinguistics;
    
    var _defaultLocale = null;
    
    var _activeLocale = null;
    
    var _languagesLoaded = false;
    
    var BUTTON_TITLE = "Proofing Options";
    
    var _defaultLanguageName = BUTTON_TITLE;
    
    // Special list item for the 'Set as default' option in the language switcher dropdown.
    var LANGUAGE_SET_AS_DEFAULT = {};
    
    // Special list item to toggle the spell checker.
    var TOGGLE_SPELL_CHECKER = {};
    
    function _addIndicator() {
        StatusBar.addIndicator(
            "status-alice-language",
            document.createElement("div"),
            true,
            "",
            BUTTON_TITLE,
            "status-language"
        );
        $statusLinguistics = $("#status-alice-language");
    }
    
    function _updateLanguageInfo(editor, maintainUI) {
        
        if (typeof maintainUI === "undefined") {
            // The default behavior should be to always update the interface
            // unless instructed otherwise.
            maintainUI = false;
        }
        
        var languageName = _defaultLanguageName;
        var localeName   = _defaultLocale;
        
        if (typeof editor !== "undefined" && editor !== null && editor.hasOwnProperty("linguisticsLanguage")) {
            languageName = editor.linguisticsLanguage.name;
            localeName = editor.linguisticsLanguage.locale;
        }
        
        languageSelect.$button.css("width", "auto");
        languageSelect.$button.text(languageName);
        
        // Notify the spell checker something has changed.
        LinguisticsEditorManager.setLocale(localeName);

        if (!maintainUI) {
            LinguisticsEditorManager.updateInterface();
        }
    }
    
    function _populateLanguageDropdown() {
        var languages = _.values(DictionaryManager.getAvailableDictionaryProfiles());
        
        languages.sort(function (a, b) {
            // We will compare the names of the profiles and dictionaries when sorting.
            // This is the only piece of data that is reliably consistent between
            // the two without any type of coercion or temporary variables.
            return a.name.toLowerCase().localeCompare(b.name.toLowerCase());
        });
        
        languageSelect.items = languages;
        
        languageSelect.items.unshift("---");
        languageSelect.items.unshift(LANGUAGE_SET_AS_DEFAULT);
        languageSelect.items.unshift(TOGGLE_SPELL_CHECKER);
    }
    
    function _onActiveEditorChange(event, current, previous) {
        if (current) {
            _updateLanguageInfo(current);
        }
    }
    
    function _preferencesChanged() {
        _defaultLocale = Preferences.localeName;
        
        if (_languagesLoaded) {
            var languages = DictionaryManager.getAvailableDictionaries();
            var currentLanguage = languages[_defaultLocale];
            
            // Simple sanity check to make sure we actually have an object.
            if (typeof currentLanguage !== "undefined") {
                _defaultLanguageName = currentLanguage.name;
                _updateLanguageInfo(EditorManager.getActiveEditor());
            }
        }
    }
    
    function _dictionaryLoaded(event, localeName) {
        if (localeName !== _defaultLocale) {
            _preferencesChanged();
        }
        _updateLanguageInfo(EditorManager.getActiveEditor());
        AnimationUtils.animateUsingClass($statusLinguistics[0], "flash", 1500);
    }
    
    function _languageListLoaded() {
        _languagesLoaded = true;
        _populateLanguageDropdown();
        _preferencesChanged();
    }
    
    function _initialize() {
        // Add the actual indicator to the status bar.
        _addIndicator();
        languageSelect = new DropdownButton("", [], function (item, index) {
            
            var _currentLocale = EditorManager.getActiveEditor();
            
            if (typeof _currentLocale.linguisticsLanguage !== "undefined") {
                _currentLocale = _currentLocale.linguisticsLanguage.locale;
            } else {
                _currentLocale = _defaultLocale;
            }
            
            
            if (item === LANGUAGE_SET_AS_DEFAULT) {
                return { html: "Set as default language", enabled: _currentLocale !== Preferences.localeName };
            }
            
            if (item === TOGGLE_SPELL_CHECKER) {
                return { html: "Enable/disable the spell checker", enabled: true };
            }
            
            var html = _.escape(item.name);
            
            if (item.locale === _defaultLocale) {
                html += " <span class='default-language'>" + Strings.STATUSBAR_DEFAULT_LANG + "</span>";
            }
            
            if (_currentLocale === item.locale) {
                html = "<span class='checked-language'></span>" + html;
            }
            
            return html;
        });
        
        languageSelect.dropdownExtraClasses = "dropdown-status-bar";
        languageSelect.$button.addClass("btn-status-bar");
        languageSelect.$button.attr("title", BUTTON_TITLE);
        languageSelect.$button.text(BUTTON_TITLE);
        $("#status-alice-language").append(languageSelect.$button);
        
        languageSelect.on("select", function (event, lang) {
            
            if (lang === LANGUAGE_SET_AS_DEFAULT) {
                // Set the user's default language dictionary/profile.
                Preferences.set(Preferences.PREFERENCE_LOCALE_NAME, _activeLocale);
                _defaultLocale = _activeLocale;
                LinguisticsEditorManager.setLocale(_defaultLocale);
                _preferencesChanged();
            } else if (lang === TOGGLE_SPELL_CHECKER) {
                LinguisticsEditorManager.setSpellCheckEnabled(!LinguisticsEditorManager.isSpellCheckEnabled());
            } else {
                DictionaryManager.dictionaryExists(lang.locale, function (doesExist) {
                    if (doesExist) {
                        var _needsRefreshing = false;
                        
                        // Check if the editor needs to be refreshed.
                        if (typeof EditorManager.getActiveEditor().linguisticsLanguage === "undefined" ||
                                EditorManager.getActiveEditor().linguisticsLanguage.locale !== lang.locale) {
                            _needsRefreshing = true;
                        }
                        
                        _activeLocale = lang.locale;
                        EditorManager.getActiveEditor().linguisticsLanguage = lang;
                        EditorManager.getActiveEditor().linguisticsRequestingRefresh = _needsRefreshing;
                        _updateLanguageInfo(EditorManager.getActiveEditor());
                    }
                });
            }
        });
        
        _populateLanguageDropdown();
    }
    
    DictionaryManager.on("languageListLoaded", _languageListLoaded);
    DictionaryManager.on("dictionaryLoaded", _dictionaryLoaded);
    EditorManager.on("activeEditorChange", _onActiveEditorChange);
    Preferences.getPreferencesSystem().on("change", _preferencesChanged);
    
    AppInit.htmlReady(_initialize);
    AppInit.appReady(function () {
        _onActiveEditorChange(null, EditorManager.getActiveEditor(), null);
        _defaultLocale = _activeLocale = Preferences.localeName;
        _preferencesChanged();
    });
    
});