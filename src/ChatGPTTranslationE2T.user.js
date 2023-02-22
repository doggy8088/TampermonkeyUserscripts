// ==UserScript==
// @name         ChatGPT: 翻譯選取文字的內容 (英翻中)
// @version      1.0.0
// @description  自動將當前頁面的選取範圍送到 ChatGPT 進行翻譯 (英翻中)
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ChatGPTTranslationE2T.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ChatGPTTranslationE2T.user.js
// @match        *://*/*
// @author       Will Huang
// @run-at       context-menu
// @grant        GM_openInTab
// @icon         https://www.google.com/s2/favicons?sz=64&domain=openai.com
// ==/UserScript==

(function () {
    "use strict";

    let text = '';

    // 以選取的文字為主
    if (window.getSelection) {
        text = window.getSelection().toString();
    } else if (document.selection && document.selection.type != "Control") {
        text = document.selection.createRange().text;
    }

    if (text) {

        let prompt = text
            .replace(/\r/g, '')
            .replace(/\s+$/g, '')
            .replace(/\n{3,}/sg, '\n\n')
            .replace(/^\s+|\s+$/sg, '')

        prompt = `請將以下內容翻譯成流暢的繁體中文，並對罕用的英文單字進行個別解釋：\n\n${prompt}`;

        var url = `https://chat.openai.com/chat#autoSubmit=1&prompt=${encodeURIComponent(prompt)}`;

        GM_openInTab(url, false);
    }

})();
