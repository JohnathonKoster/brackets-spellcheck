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

/*jslint vars: true, plusplus: true, devel: true, nomen: true, regexp: true, indent: 4, maxerr: 50 */
/*global define, $, brackets, window */

/**
 * This file is the main entry point for the Linguistics extension.
 */
define(function (require, exports, module) {
    "use strict";

    var AppInit = brackets.getModule("utils/AppInit"),
        MainViewManager = brackets.getModule("view/MainViewManager"),
        LanguageManager = brackets.getModule("language/LanguageManager"),
        Preferences = require("src/preferences/PreferencesManager"),
        EditorManager = require("src/editor/EditorManager"),
        StyleManager = require("src/ui/StyleManager"),
        LocaleStatusBar = require("src/ui/LocaleStatusBar");
    
    /**
     * Helper function to call all the various methods required for
     * Linguistics to work correctly.
     */
    function _updateEnvironment() {
        Preferences.updatePreferences();
        StyleManager.updateVisualizations(Preferences.spellingVisualizationColor, Preferences.grammarVisualizationColor);
        EditorManager.setSpellCheckEnabled(Preferences.spellCheckEnabled);
        EditorManager.updateInterface();
    }
    
    // Get everything rolling.
    AppInit.appReady(function () {
        
        Preferences.getPreferencesSystem().on("change", _updateEnvironment);
        
        MainViewManager.on("currentFileChange", _updateEnvironment);
        
        LanguageManager.on("languageModified", _updateEnvironment);
        
        StyleManager.setup();
        // Set the initial locale.
        EditorManager.setLocale(Preferences.localeName);
        _updateEnvironment();
    });
    
});