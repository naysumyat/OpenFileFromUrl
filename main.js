/*
 * Copyright (c) 2012 Adobe Systems Incorporated. All rights reserved.
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
/*global define, brackets, $ */

define(function (require, exports, module) {
    "use strict";
    
    // Brackets modules
    var EditorManager       = brackets.getModule("editor/EditorManager"),
        ProjectManager      = brackets.getModule("project/ProjectManager"),
        FileViewController  = brackets.getModule("project/FileViewController"),
        Dialogs             = brackets.getModule("widgets/Dialogs");
    
    
    /**
     * Return the token string that is at the specified position.
     *
     * @param hostEditor {!Editor} editor
     * @param {!{line:Number, ch:Number}} pos
     * @return {String} token string at the specified position
     */
    function _getStringAtPos(hostEditor, pos) {
        var token = hostEditor._codeMirror.getTokenAt(pos);
        
        // If the pos is at the beginning of a name, token will be the 
        // preceding whitespace or dot. In that case, try the next pos.
        if (token.string.trim().length === 0 || token.string === ".") {
            token = hostEditor._codeMirror.getTokenAt({line: pos.line, ch: pos.ch + 1});
        }
        
        if (token.className === "string") {
            var string = token.string;
            
            // Strip quotes
            var char = string[0];
            if (char === "\"" || char === "'") {
                string = string.substr(1);
            }
            char = string[string.length - 1];
            if (char === "\"" || char === "'") {
                string = string.substr(0, string.length - 1);
            }
            
            return string;
        } else {
            
            // Check for url(...);
            var line = hostEditor._codeMirror.getLine(pos.line);
            var match = /url\s*\(([^)]*)\)/.exec(line);
            
            if (match && match[1]) {
                // URLs are relative to the doc
                var docPath = hostEditor.document.file.fullPath;
                
                docPath = docPath.substr(0, docPath.lastIndexOf("/"));
                
                return docPath + "/" + match[1];
            }
        }
        
        return "";
    }
    
    function showMessage(pMessage) {
        // TODO find a better way to handle dialogs
        // Having to use an existing dialog ID since no better choice seems available
        Dialogs.showModalDialog(Dialogs.DIALOG_ID_ERROR, "OpenFileFromUrl", pMessage);
    }
    
    
    /**
     * This function is registered with EditManager as an inline editor provider. It creates an inline editor
     * when cursor is on a JavaScript function name, find all functions that match the name
     * and show (one/all of them) in an inline editor.
     *
     * @param {!Editor} editor
     * @param {!{line:Number, ch:Number}} pos
     * @return {$.Promise} a promise that will be resolved with an InlineWidget
     *      or null if we're not going to provide anything.
     */
    function inlineOpenFile(hostEditor, pos) {
        
        // Only provide image viewer if the selection is within a single line
        var sel = hostEditor.getSelection(false);
        if (sel.start.line !== sel.end.line) {
            return null;
        }
        
        // Always use the selection start for determining the image file name. The pos
        // parameter is usually the selection end.        
        var fileName = _getStringAtPos(hostEditor, hostEditor.getSelection(false).start);
        if (fileName === "") {
            return null;
        }
        
        
        if (!/(.css|.html|.js|.less|.sass)$/i.test(fileName)) {
            return null;
        }
        

        var projectPath = ProjectManager.getProjectRoot().fullPath;
        
        if (fileName.indexOf(projectPath) !== 0) {
            fileName = projectPath + fileName;
        }
    
        var promise = null;
        ProjectManager.getProjectRoot().getFile(fileName, {},
            function success(entry) {
                FileViewController.addToWorkingSetAndSelect(fileName);
            },
            function error(er) {
//                ProjectManager.createNewItem(fileName.substr(0, fileName.lastIndexOf("/")), fileName.substr(fileName.lastIndexOf("/") + 1), true)
//                    .done(function (data) {
//                        FileViewController.addToWorkingSetAndSelect(data.fullPath);
//                    });
                showMessage("That file does not exist.");
                
            });
        
        
        
        return promise;
    }

    EditorManager.registerInlineEditProvider(inlineOpenFile);
});
