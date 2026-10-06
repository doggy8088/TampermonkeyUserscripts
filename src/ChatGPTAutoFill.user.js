// ==UserScript==
// @name         ChatGPT: 自動填入提示文字並自動送出
// @version      1.2.2
// @description  自動填入 ChatGPT 提示文字並可設定自動送出提問
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ChatGPTAutoFill.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ChatGPTAutoFill.user.js
// @author       Will Huang
// @match        *://chat.openai.com/chat
// @match        *://chat.openai.com/chat/*
// @run-at       document-end
// @icon         https://www.google.com/s2/favicons?sz=64&domain=openai.com
// @grant        none
// ==/UserScript==

/*

# Credit

- 此腳本源自於 Mike Huang 的想法與實作，並在不斷的互動之中不斷精鍊，特此感謝他的想法。

# 使用方法

1. 在網址列加上 `#prompt=你的提示文字&autoSubmit=1`，例如：

    https://chat.openai.com/chat#prompt=你好&autoSubmit=1

2. 設定為 Chrome / Edge 內建搜尋引擎，例如：

    https://chat.openai.com/chat#prompt=%s&autoSubmit=1

    只要在網址列輸入 gpt 再按 Tab 鍵，就會自動開啟 ChatGPT 並自動填入提示文字。

*/

(function () {
    "use strict";

    /**
     * 等待 focus 到訊息輸入框就開始初始化功能
     */

    const start = (textarea) => {

        // 預設的送出按鈕
        const button = textarea.parentElement?.querySelector("button:last-child");

        // 解析 hash 中的查詢字串並取得所需的參數
        var hash = location.hash.substring(1);
        if (!hash) return;

        var params = new URLSearchParams(hash);

        // 解析參數
        // hash 中沒有 prompt 參數時 get() 會回傳 null，舊版直接呼叫 null.replace() 會丟出 TypeError。
        let prompt = (params.get('prompt') || '')
            .replace(/\r/g, '')
            .replace(/\s+$/g, '')
            .replace(/\n{3,}/sg, '\n\n')
            .replace(/^\s+|\s+$/sg, '')
        let submit = params.get("autoSubmit");

        let autoSubmit = false;
        if (submit == '1' || submit == 'true') {
            autoSubmit = true
        }

        if (prompt) {
            textarea.value = prompt;
            textarea.dispatchEvent(new Event("input", { bubbles: true }));
            textarea.focus();
            textarea.setSelectionRange(textarea.value.length, textarea.value.length); //將選擇範圍設定為文本的末尾
            textarea.scrollTop = textarea.scrollHeight; // 自動捲動到最下方

            if (autoSubmit) {
                button?.click();
            }

            history.replaceState({}, document.title, window.location.pathname + window.location.search);
        }
    }

    // 網址的 hash 沒有 prompt 參數時沒有任何事要做，直接結束。
    // 舊版不論有沒有參數都會每 60ms 輪詢一次 document.activeElement，直到輸入框取得焦點為止，
    // 在一般瀏覽 ChatGPT 時是純粹的浪費：沒有 hash 時 start() 只會直接返回，
    // 有 hash 卻沒有 prompt（例如只有 #autoSubmit=1）時還會在 start() 中丟出例外。
    if (!new URLSearchParams(location.hash.substring(1)).get('prompt')) {
        return;
    }

    const it = setInterval(() => {
        let textarea = document.activeElement;
        // 以 optional chaining 防禦：activeElement 可能為 null，textarea 也可能沒有下一個兄弟節點，
        // 舊版在這兩種情況下每 60ms 就丟一次 TypeError。
        if (textarea?.tagName === 'TEXTAREA' && textarea.nextSibling?.tagName === 'BUTTON') {
            // 先停止輪詢再執行：舊版在 start() 之後才 clearInterval，start() 一旦丟出例外，
            // 輪詢就永遠不會停止，每 60ms 重複填入並丟出同樣的錯誤。
            clearInterval(it);
            start(textarea);
        }
    }, 60);

})();
