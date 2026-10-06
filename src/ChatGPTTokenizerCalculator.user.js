// ==UserScript==
// @name         ChatGPT: 自動統計網頁中選取的文字範圍的 Token 數量
// @version      1.0.3
// @description  自動統計網頁中選取的文字範圍的 Token 數量 (OpenAI GPT-3 的 Tokenizer 規則)
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ChatGPTTokenizerCalculator.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ChatGPTTokenizerCalculator.user.js
// @author       Will Huang
// @match        *://*/*
// @run-at       context-menu
// @icon         https://www.google.com/s2/favicons?sz=64&domain=openai.com
// @grant        none
// ==/UserScript==

/*

# Known Issues

1. 有些網站會有 CSP 的限制，無法載入 GPT-3 Encoder 的腳本，這時候就會出現錯誤訊息。
   （1.0.3 起會以 alert 告知載入失敗；舊版只會在 Console 留下 CSP 錯誤，按下選單後畫面上沒有任何反應。）

*/

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

        // 舊版在這裡把 text 正規化成 prompt 變數，但計算 Token 時用的一直是原始的 text，prompt 從未被使用；
        // 移除這段死碼，維持以「實際選取的原文」計算 Token 數量的行為。

        const showTokenCount = () => {
            var tokenCount = gpt3encoder.countTokens(text);

            var result = `選取內容共有 ${tokenCount} Tokens`;

            console.log(result);

            alert(result);
        };

        // 同一個頁面第二次以後使用時，編碼器已經載入過了，直接計算即可。
        // 舊版每次都再插入一個 <script>，重新下載（雖有快取）並重新執行整個含有 BPE 詞表的大型腳本。
        if (typeof gpt3encoder !== 'undefined') {
            showTokenCount();
            return;
        }

        var script = document.createElement('script');
        script.onload = showTokenCount;
        script.onerror = function () {
            // 網站以 CSP 禁止載入外部腳本、或網路連線失敗時會進到這裡；
            // 舊版沒有處理，使用者按下選單後畫面上不會有任何反應。
            alert('無法載入 GPT-3 Encoder，可能是此網站的 CSP（內容安全政策）禁止載入外部腳本，或網路連線失敗。');
            script.remove();
        };
        // Docs:   https://syonfox.github.io/GPT-3-Encoder/browser.html
        // NPM:    https://www.npmjs.com/package/@syonfox/gpt-3-encoder
        // GitHub: https://github.com/syonfox/GPT-3-Encoder
        // HTML Usage: https://github.com/syonfox/GPT-3-Encoder/blob/master/browser.html
        script.src = 'https://cdn.jsdelivr.net/npm/@syonfox/gpt-3-encoder/browser.js';
        // 少數文件（例如直接開啟的 SVG、XML）沒有 <head>，退回插入根元素，避免 null.appendChild 丟出例外。
        (document.head || document.documentElement).appendChild(script);
    }

})();
