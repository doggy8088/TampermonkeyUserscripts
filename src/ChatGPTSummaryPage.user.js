// ==UserScript==
// @name         ChatGPT: 自動總結網頁中的選取範圍或文章內容 (<article>)
// @version      1.2.1
// @description  自動將當前頁面的選取範圍或預設文章內容送到 ChatGPT 進行總結 (頁面中第一個 <article> 標籤)
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ChatGPTSummaryPage.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ChatGPTSummaryPage.user.js
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

    // 找不到內容才取頁面中的第一個 article 標籤內容
    if (!text) {
        text = document.querySelector("article")?.innerText;
    }

    if (text) {

        let prompt = text
            .replace(/\r/g, '')
            .replace(/\s+$/g, '')
            .replace(/\n{3,}/sg, '\n\n')
            .replace(/^\s+|\s+$/sg, '')

        prompt = `請使用流利的繁體中文分析以下文章，以條列的方式幫我總結文章重點：\n\n${prompt}`;

        var url = `https://chat.openai.com/chat#autoSubmit=0&prompt=${encodeURIComponent(prompt)}`;

        GM_openInTab(url, false);
    }

})();
