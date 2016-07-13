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
 * Manages the editor's context menu to add spelling suggestions to the menu.
 */
define(function (require, exports, module) {
    "use strict";
    
    var Menus = brackets.getModule("command/Menus"),
        EditorContextMenu = Menus.getContextMenu(Menus.ContextMenuIds.EDITOR_MENU),
        AppInit = brackets.getModule("utils/AppInit"),
        EditorManager = brackets.getModule("editor/EditorManager"),
        StringUtils = require("src/utils/Strings");
    
    AppInit.appReady(function () {
       
        EditorContextMenu.on("beforeContextMenuOpen", function () {
            var editor = EditorManager.getActiveEditor(),
                cm = editor ? editor._codeMirror : null;
            
            if (cm) {
                var selection = editor.getSelection();
                if (selection.start.line === selection.end.line) {
                    var selectedText = editor.document.getRange(selection.start, selection.end);
                    if (StringUtils.containsWordSeparator(selectedText) === false) {
                    }
                }
            }
            
        });
        
    });
    
    
});