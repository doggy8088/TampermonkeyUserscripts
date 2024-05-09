// ==UserScript==
// @name         Felo Search: 自動填入提示文字並自動送出
// @version      0.1.0
// @description  自動填入 Felo Search 提示文字並可設定自動送出提問
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/FeloSearchAutoFill.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/FeloSearchAutoFill.user.js
// @match        *://search.glarity.ai/
// @match        *://search.glarity.ai/*
// @author       Will Huang
// @run-at       document-end
// @icon         https://www.google.com/s2/favicons?sz=64&domain=search.glarity.ai
// ==/UserScript==

(function () {
    "use strict";

    /**
     * 等待 focus 到訊息輸入框就開始初始化功能
     */

    const start = (textarea) => {

        // 預設的送出按鈕
        const button = document.querySelector("button[type=submit]");

        // 解析 hash 中的查詢字串並取得所需的參數
        var hash = location.hash.substring(1);
        if (!hash) return;

        var params = new URLSearchParams(hash);

        // 解析參數
        let prompt = params.get('prompt')
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
            textarea.dispatchEvent(new Event('focus', { bubbles: true }));

            // 這行是關鍵，不這樣就無法變更 textarea 的值
            Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set.call(textarea, prompt);

            // 這行也是關鍵，必須要送出 input 事件才能讓 textarea 的值寫回 React 元件的狀態
            textarea.dispatchEvent(new Event('input', { bubbles: true }));

            textarea.focus();
            textarea.setSelectionRange(textarea.value.length, textarea.value.length); //將選擇範圍設定為文本的末尾
            textarea.scrollTop = textarea.scrollHeight; // 自動捲動到最下方

            if (autoSubmit) {
                //console.log(textarea, button);
                setTimeout(() => { button.click(); }, 200);
            }

            //history.replaceState({}, document.title, window.location.pathname + window.location.search);
        }
    }

    const it = setInterval(() => {
        let textarea = document.activeElement;
        if (textarea?.tagName === 'TEXTAREA') {
            start(textarea);
            clearInterval(it);
        };
    }, 60);

})();
