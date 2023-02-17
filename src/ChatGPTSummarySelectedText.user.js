// ==UserScript==
// @name         ChatGPT: 自動總結網頁中選取的文字範圍
// @version      1.0.0
// @description  自動將當前頁面中選取的文字範圍送到 ChatGPT 進行總結
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ChatGPTSummarySelectedText.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ChatGPTSummarySelectedText.user.js
// @match        *://*/*
// @author       Will Huang
// @run-at       context-menu
// @grant        GM_openInTab
// @icon         https://www.google.com/s2/favicons?sz=64&domain=openai.com
// ==/UserScript==

(function () {
    "use strict";

    let text = '';

    if (window.getSelection) {
        text = window.getSelection().toString();
    } else if (document.selection && document.selection.type != "Control") {
        text = document.selection.createRange().text;
    }

    if (text) {

        let prompt = text
            .replace(/\\r/g, '')
            .replace(/\\n/g, '\n')
            .replace(/\s+$/mg, '')
            .replace(/\n{3,}/g, '\n\n')
            .replace(/^\s+|\s+$/g, '')

        var url = `https://chat.openai.com/chat#autoSubmit=0&prompt=${encodeURIComponent(prompt)}`;

        GM_openInTab(url, false);
    }

})();
