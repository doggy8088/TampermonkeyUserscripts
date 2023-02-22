// ==UserScript==
// @name         ChatGPT: 在回應結果的地方加入常見提示回應按鈕
// @version      1.0.0
// @description  點擊按鈕就會自動填入 ChatGPT 提示文字輸入框並自動送出提問
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ChatGPTCommonPrompts.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ChatGPTCommonPrompts.user.js
// @match        *://chat.openai.com/chat
// @match        *://chat.openai.com/chat/*
// @author       Will Huang
// @run-at       document-idle
// @icon         https://www.google.com/s2/favicons?sz=64&domain=openai.com
// ==/UserScript==

/*

# Credit

- 此腳本源自於 Mike Huang 的想法與實作，並在不斷的互動之中不斷精鍊，特此感謝他的想法。

# 使用方法

1. 先進行提問
2. 提問結果會出現幾個好用的「常見回應」按鈕，按下按鈕就會自動幫你進行提問

*/

(function () {
    "use strict";

    const defaultManualSubmitText = [
        // continue
        { text: "繼續", value: "繼續" },
        // exemplify
        { text: "舉例說明", value: "請舉例說明" },
        // expand
        { text: "提供細節", value: "請提供更多細節說明" },
        // explain
        // { text: "解釋清楚", value: "請用更清楚的方式解釋" },
        // rewrite
        // { text: "重寫內容", value: "請重寫上述內容" },
        // short
        // { text: "簡化內容", value: "請用簡短的方式說明上述內容" },
        // translate to TC
        { text: "翻譯成繁中", value: "請將上述內容翻譯成流暢的繁體中文" },
        // translate to EN
        { text: "翻譯成英文", value: "請將上述內容翻譯成流暢的英文" },
    ];

    let globalButtons = [];
    let buttonsArea = null;

    const main = document.querySelector("body");

    let counter = 0;

    let mutationObserverTimer = undefined;
    const obs = new MutationObserver(() => {

        clearTimeout(mutationObserverTimer);
        mutationObserverTimer = setTimeout(() => {

            // 先停止觀察，避免自訂畫面變更被觀察到
            stop();

            // 先將原來動態加入的內容移除並重新建立
            rebuild_buttons();

            counter++;
            console.log(`MutationObserver: ${counter}`);

            // 重新開始觀察
            start();

        }, 600);

        function rebuild_buttons() {

            // 尋找聊天記錄的最後一筆，用來插入按鈕
            const talkBlocks = document.querySelectorAll(
                ".text-base.gap-4.md\\:gap-6.m-auto.md\\:max-w-2xl.lg\\:max-w-2xl.xl\\:max-w-3xl.p-4.md\\:py-6.flex.lg\\:px-0:not(.custom-buttons-area)"
            );
            if (!talkBlocks || !talkBlocks.length) {
                return;
            }

            // 要被插入按鈕的區塊
            const talkBlockToInsertButtons = talkBlocks[talkBlocks.length - 1];

            // remove custom buttons
            globalButtons = [];

            // 重新將按鈕區和按鈕移除
            if (buttonsArea) { buttonsArea.remove(); }

            // create a new buttons area
            buttonsArea = document.createElement("div");
            buttonsArea.classList = "custom-buttons-area text-base m-auto md:max-w-2xl lg:max-w-2xl xl:max-w-3xl p-4 md:py-6 flex lg:px-0";
            buttonsArea.style.overflowY = "auto";
            buttonsArea.style.display = "flex";
            buttonsArea.style.flexWrap = "wrap";
            buttonsArea.style.paddingTop = 0;
            buttonsArea.style.paddingLeft = "calc(30px + 0.75rem)";
            talkBlockToInsertButtons.after(buttonsArea);

            // add buttons
            defaultManualSubmitText.forEach((item) => {

                let lastText = talkBlockToInsertButtons.innerText;

                const isPunctuation = (str) => {
                    const punctuationRegex = /^(?![，,：:])[\p{P}\p{S}]$/u;
                    return punctuationRegex.test(str);
                }

                // 最後一個字元如果是標點符號，就不要顯示「繼續」
                if (isPunctuation(lastText.charAt(lastText.length - 1)) && item.text == '繼續') {
                    return;
                }

                const button = document.createElement("button");
                button.style.border = "1px solid #d1d5db";
                button.style.borderRadius = "5px";
                button.style.padding = "0.5rem 1rem";
                button.style.margin = "0.5rem";

                button.innerText = item.text;
                button.addEventListener("click", () => {

                    // 填入 prompt
                    const textarea = document.querySelector("textarea");
                    textarea.value = item.value;
                    textarea.dispatchEvent(new Event("input", { bubbles: true }));
                    textarea.focus();
                    textarea.setSelectionRange(textarea.value.length, textarea.value.length); //將選擇範圍設定為文本的末尾
                    textarea.scrollTop = textarea.scrollHeight; // 自動捲動到最下方

                    // 預設的送出按鈕
                    const button = textarea.parentElement.querySelector("button:last-child");
                    button.click();

                });

                buttonsArea.append(button);
                globalButtons.push(button);
            });
        }

    });

    const start = () => {
        obs.observe(main.parentElement, {
            childList: true,
            attributes: true,
            subtree: true,
        });
    };

    const stop = () => {
        obs.disconnect();
    };

    /**
     * 等待 focus 到訊息輸入框就開始初始化功能
     */
    const it = setInterval(() => {
        const textarea = document.activeElement;
        if (textarea.tagName === "TEXTAREA" && textarea.nextSibling.tagName === "BUTTON") {
            start();
            clearInterval(it);
        }
    }, 60);
})();
