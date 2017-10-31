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
 * StyleManager is responsible for adding and removing the various styles
 * required for Linguistics from the environment.
 * 
 * We technically could use the extension utilities ("utils/ExtensionUtils"), but
 * it makes things easier if we control creating the DOM elements ourselves so
 * that we can easily remove our custom style elements.
 * 
 */
define(function (require, exports, module) {
    "use strict";
    
    var ExtensionUtils = brackets.getModule("utils/ExtensionUtils");
  
    /**
     * Indicates if the base styles have been created.
     *
     * @type {boolean}
     */
    var _baseStylesCreated = false;
    
    /**
     * The base visualization style element.
     * 
     * @type {!HTMLStyleElement}
     */
    var _baseVisualization = null;
    
    /**
     * The spelling visualization style element.
     * 
     * @type {!HTMLStyleElement}
     */
    var _spellingVisualization = null;
    
    /**
     * The grammar visualization style element.
     * 
     * @type {!HTMLStyleElement}
     */
    var _grammarVisualization = null;
    
    /**
     * The spelling visualization color.
     * 
     * @type {string}
     */
    var _lastSpellingVisualizationColor = null;
    
    /**
     * The grammar visualization color.
     * 
     * @type {string}
     */
    var _lastGrammarVisualizationColor = null;
    
    /**
     * The base CSS string.
     * 
     * @type {string}
     */
    var _visualizationBaseCSS = ".cm-alice-error-visualization:not(.cm-url):not(.cm-tag):not(.cm-word){border-bottom:2px dotted;display:inline-block;position:relative}.cm-alice-error-visualization:not(.cm-url):not(.cm-tag):not(.cm-word):after{content:'';height:5px;width:100%;border-bottom:2px dotted;position:absolute;bottom:-3px;left:-2px}";
    
    /**
     * The Mustache template for visualization CSS.
     * 
     * @type {string}
     */
    var _visualizationCSS = ".cm-{{ className }}:not(.cm-url):not(.cm-tag):not(.cm-word) {border-bottom-color: {{ color }};}.cm-{{ className }}:not(.cm-url):not(.cm-tag):not(.cm-word):after {border-bottom-color: {{ color }};}";
    
    /**
     * Creates the base CSS style elements and adds them to the DOM.
     * @private
     */
    function _createBaseStyles() {
        _baseVisualization = $("<style />", {
            id: "alice-base-visualization",
            type: "text/css",
            html: _visualizationBaseCSS
        });
        _baseVisualization.appendTo("head");
        _baseStylesCreated = true;
    }
    
    /**
     * Creates a CSS string with the visualization name and color.
     * @private
     * 
     * @param   {string} className          The visualization name.
     * @param   {string} visualizationColor The CSS color.
     * @returns {string} The complete CSS string.
     */
    function _getVisualization(className, visualizationColor) {
        return Mustache.render(_visualizationCSS, {
            className: className,
            color: visualizationColor
        });
    }
    
    /**
     * Adds the visualization styles to the editing environment.
     * 
     * @param {string} spellingVisualizationColor The spelling underline color.
     * @param {string} grammarVisualizationColor  The grammar underline color.
     */
    function addVisualizations(spellingVisualizationColor, grammarVisualizationColor) {
        
        if (_lastSpellingVisualizationColor !== spellingVisualizationColor) {
            _spellingVisualization = $("<style />", {
                id: "alice-spelling-visualization",
                type: "text/css",
                html: _getVisualization('alice-spelling-visualization', spellingVisualizationColor)
            });
            _spellingVisualization.appendTo("head");
            _lastSpellingVisualizationColor = spellingVisualizationColor;
        }
        
        if (_lastGrammarVisualizationColor !== grammarVisualizationColor) {
            _grammarVisualization = $("<style />", {
                id: "alice-grammar-visualization",
                type: "text/css",
                html: _getVisualization('alice-grammar-visualization', grammarVisualizationColor)
            });
            _grammarVisualization.appendTo("head");
            _lastGrammarVisualizationColor = grammarVisualizationColor;
        }
        
    }

    /**
     * Removes the spelling visualization.
     * @private
     */
    function _removeSpellingVisualization() {
        if (_spellingVisualization !== null) {
            _spellingVisualization.remove();
        }
    }
    
    /**
     * Removes the grammar visualization.
     * @private
     */
    function _removeGrammarVisualization() {
        if (_grammarVisualization !== null) {
            _grammarVisualization.remove();
        }
    }
    
    /**
     * Removes the visualization styles from the editing environment.
     * 
     * This function does not do any optimization checks.
     */
    function removeVisualizations() {
        _removeSpellingVisualization();
        _removeGrammarVisualization();
    }
    
    /**
     * Attempts to intelligently remove the visualizations. Will not perform unnecessary
     * DOM manipulations.
     * 
     * @param {string} spellingVisualizationColor The spelling error color.
     * @param {string} grammarVisualizationColor The grammar error color.
     */
    function _removeVisualizationsSmartly(spellingVisualizationColor, grammarVisualizationColor) {
        if (_lastSpellingVisualizationColor !== spellingVisualizationColor) {
            _removeSpellingVisualization();
        }
        
        if (_lastGrammarVisualizationColor !== grammarVisualizationColor) {
            _removeGrammarVisualization();
        }
    }
    
    /**
     * Creates the required base CSS styles necessary for Linguistics.
     */
    function setup() {
        if (!_baseStylesCreated) {
            ExtensionUtils.loadStyleSheet(module, "../styles/linguistics.less");
            _createBaseStyles();
        }
    }
    
    /**
     * Helper function to update visualization styles in the editing environment.
     * 
     * @param {string} spellingVisualizationColor The spelling underline color.
     * @param {string} grammarVisualizationColor  The grammar underline color.
     */
    function updateVisualizations(spellingVisualizationColor, grammarVisualizationColor) {
        _removeVisualizationsSmartly(spellingVisualizationColor, grammarVisualizationColor);
        addVisualizations(spellingVisualizationColor, grammarVisualizationColor);
    }
    
    exports.addVisualizations = addVisualizations;
    exports.removeVisualizations = removeVisualizations;
    exports.updateVisualizations = updateVisualizations;
    exports.setup = setup;
    
});