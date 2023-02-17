// ==UserScript==
// @name         ChatGPT: 自動統計網頁中選取的文字範圍的 Token 數量
// @version      1.0.0
// @description  自動統計網頁中選取的文字範圍的 Token 數量 (OpenAI GPT-3 的 Tokenizer 規則)
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ChatGPTTokenizerCalculator.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ChatGPTTokenizerCalculator.user.js
// @match        *://*/*
// @author       Will Huang
// @run-at       context-menu
// @grant        GM_openInTab
// @icon         https://www.google.com/s2/favicons?sz=64&domain=openai.com
// ==/UserScript==

(async function () {
    "use strict";

    let text = '';

    if (window.getSelection) {
        text = window.getSelection().toString();
    } else if (document.selection && document.selection.type != "Control") {
        text = document.selection.createRange().text;
    }

    if (!text) {
        // 取得頁面中的第一個 article 標籤
        text = document.querySelector("article")?.innerText;
    }

    if (text) {

        let prompt = text
            .replace(/\\r/g, '')
            .replace(/\\n/g, '\n')
            .replace(/\s+$/mg, '')
            .replace(/\n{3,}/g, '\n\n')
            .replace(/^\s+|\s+$/g, '')

        var script = document.createElement('script');
        script.onload = function () {

            var tokenCount = gpt3encoder.countTokens(text);

            var result = `選取內容共有 ${tokenCount} Tokens`;

            console.log(result);

            alert(result);

        };
        script.src = 'https://cdn.jsdelivr.net/npm/@syonfox/gpt-3-encoder/browser.js';
        document.head.appendChild(script);
    }

})();
