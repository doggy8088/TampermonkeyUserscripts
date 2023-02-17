// ==UserScript==
// @name         ChatGPT: 自動填入提示文字並自動送出
// @version      1.0.1
// @description  自動填入 ChatGPT 提示文字並可設定自動送出提問
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ChatGPTAutoFill.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ChatGPTAutoFill.user.js
// @match        *://chat.openai.com/chat
// @match        *://chat.openai.com/chat/*
// @author       Will Huang
// @run-at       document-idle
// @icon         https://www.google.com/s2/favicons?sz=64&domain=openai.com
// ==/UserScript==

/*

# 使用方法

1. 在網址列加上 `#prompt=你的提示文字&autoSubmit=1`，例如：

    https://chat.openai.com/chat#prompt=你好&autoSubmit=1

*/

(async function () {
    "use strict";

    const {
        filter,
        interval,
        map,
        take
    } = await import('https://cdn.jsdelivr.net/npm/@esm-bundle/rxjs/esm/es2015/rxjs.min.js');

    /**
     * 等待 focus 到訊息輸入框就開始初始化功能
     */
    interval(100).pipe(
        map(() => document.activeElement),
        filter((element) => element.tagName === 'TEXTAREA' && element.nextSibling.tagName === 'BUTTON'),
        take(1)
    )
        .subscribe((textarea) => {
            // 預設的送出按鈕
            const button = textarea.parentElement.querySelector("button:last-child");

            // 解析 hash 中的查詢字串並取得所需的參數
            var params = new URLSearchParams(location.hash.substring(1));

            // 解析參數
            let prompt = params.get('prompt')
                .replace(/\\r/g, '')
                .replace(/\\n/g, '\n')
                .replace(/\s+$/mg, '')
                .replace(/\n{3,}/g, '\n\n')
                .replace(/^\s+|\s+$/g, '')
            let submit = params.get("autoSubmit");

            let autoSubmit = false;
            if (submit == '1' || submit == 'true') {
                autoSubmit = true
            }

            if (prompt) {
                textarea.value = prompt;
                textarea.dispatchEvent(new Event("input", { bubbles: true }));

                if (autoSubmit) {
                    button.click();
                }

                history.replaceState({}, document.title, window.location.pathname + window.location.search);
            }

        });
})();
