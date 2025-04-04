// ==UserScript==
// @name         ChatGPT: 好用的鍵盤快速鍵集合
// @version      0.8.2
// @description  按下 Ctrl+Delete 快速刪除當下聊天記錄、按下 Ctrl+B 快速切換側邊欄
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ChatGPTHotkeys.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ChatGPTHotkeys.user.js
// @author       Will Huang
// @match        https://chatgpt.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=openai.com
// ==/UserScript==

(function () {
    'use strict';

    document.addEventListener("keydown", async (event) => {

        // 從網址列取得 pathinfo
        const currentPath = window.location.pathname;

        // 按下 Ctrl+Delete 快速刪除 ChatGPT 聊天記錄
        if (isCtrlOrMetaKeyPressed(event) && !event.altKey && event.key === 'Delete') {

            if (isInInputMode(event.target) && !!event.target.textContent) {
                return; // 如果在輸入模式，且有文字，就不要刪除本篇聊天記錄
            }

            // 找到和目前 pathinfo 一樣的超連結
            const matchingLink = document.querySelector(`a[href="${currentPath}"]`);

            // 找到超連結的下一個鄰近的 div，並在裡面找到一個 button
            const parentDiv = matchingLink?.closest("div"); // 取得包住 <a> 的 div

            // 模擬 MouseOver 事件，讓超連結顯示出 ... 選單 Icon
            const mouseOverEvent = new MouseEvent("mouseover", {
                view: unsafeWindow,
                bubbles: true,
                cancelable: true
            });
            parentDiv?.dispatchEvent(mouseOverEvent);

            await delay(50);

            const button = parentDiv?.querySelector("button");

            if (!button) return; // 找不到 button 就不繼續了

            // 模擬鍵盤事件，送出 Enter 鍵。不知為何直接 button.click() 不會觸發事件！
            const enterEvent = new KeyboardEvent("keydown", {
                key: "Enter",
                keyCode: 13,
                code: "Enter",
                which: 13,
                bubbles: true,
                cancelable: true
            });

            button.dispatchEvent(enterEvent); // 觸發 Enter 鍵事件

            // 等待 menu 彈出後，搜尋 div[data-radix-popper-content-wrapper]
            setTimeout(() => {
                const popperWrappers = document.querySelectorAll('div[data-radix-popper-content-wrapper]');
                let validPopperWrapper = null;

                const deleteTexts = ["Delete", "刪除", "删除", "削除する"];
                popperWrappers.forEach((popperWrapper) => {
                    if (deleteTexts.some(text => popperWrapper.textContent.includes(text))) {
                        validPopperWrapper = popperWrapper;
                    }
                });

                console.log("validPopperWrapper", validPopperWrapper);

                if (validPopperWrapper) {
                    const menuItems = validPopperWrapper.querySelectorAll('div[role="menuitem"]');
                    menuItems.forEach((menuItem) => {
                        if (deleteTexts.includes(menuItem.textContent.trim())) {
                            // 點擊該「刪除」選項
                            menuItem.click();

                            // 6. 等待刪除確認按鈕出現，並點擊它
                            setTimeout(() => {
                                const confirmButton = document.querySelector('[data-testid="delete-conversation-confirm-button"]');

                                if (confirmButton) {
                                    // 直接點擊確認刪除按鈕
                                    confirmButton.click();
                                    console.log("刪除確認按鈕已點擊");
                                } else {
                                    console.error("找不到確認刪除按鈕");
                                }
                            }, 300); // 給予確認按鈕的時間，依實際情況可調整
                        }
                    });
                } else {
                    console.error("找不到有效的 div[data-radix-popper-content-wrapper]");
                }
            }, 300); // 給予彈出 menu 的時間，依實際情況可調整
        }

        // 按下 Ctrl+B 快速切換側邊欄
        if (isCtrlOrMetaKeyPressed(event) && !event.altKey && event.key === 'b') {
            document.querySelector('[data-testid="close-sidebar-button"]')?.click();
        }

        // 按下 Alt + S 快速切換搜尋功能
        if (!isCtrlOrMetaKeyPressed(event) && event.altKey && event.key === 's') {
            const searchButton =
                document.querySelector('button[aria-label="Search"]')
                || document.querySelector('button[aria-label="搜尋"]')
                || document.querySelector('button[aria-label="検索"]')
            searchButton?.click();
        }

        // 按下 Alt + 1 ~ 4 快速切換檢視工具
        if (event.altKey && +event.key > 0) {
            // console.log(`Key pressed: ${event.key}`);
            const useToolButton =
                document.querySelector('button[aria-label="Use a tool"]')
                || document.querySelector('button[aria-label="使用工具"]')
                || document.querySelector('button[aria-label="ツールを使用する"]')

            // trigger a keyborad event (Enter) to open the tool menu on useToolButton
            const enterEvent = new KeyboardEvent("keydown", {
                key: "Enter",
                keyCode: 13,
                code: "Enter",
                which: 13,
                bubbles: true,
                cancelable: true
            });
            useToolButton?.dispatchEvent(enterEvent);


            // find div[data-radix-popper-content-wrapper]
            setTimeout(() => {
                const popperWrappers = document.querySelectorAll('div[data-radix-popper-content-wrapper]');
                popperWrappers.forEach((popperWrapper) => {
                    const menuItems = popperWrapper.querySelectorAll('div[role="menuitem"]');
                    menuItems[+event.key - 1]?.click();
                });
            }, 300);
        }
    });

    /**
     * 檢查給定的元素是否處於輸入模式。
     * 如果元素是輸入欄位、文字區域、可編輯內容的元素，或是屬於 shadow DOM 的一部分，
     * 則認為該元素處於輸入模式。
     *
     * @param {HTMLElement} element - 要檢查的元素。
     * @returns {boolean} - 如果元素處於輸入模式則返回 true，否則返回 false。
     */
    function isInInputMode(element) {
        // 如果元素是輸入欄位或文字區域，則處於輸入模式
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
            return true;
        }
        // 如果元素是可編輯內容，則處於輸入模式
        if (element.isContentEditable) {
            return true;
        }
        // 如果元素屬於 shadow DOM 的一部分，則視為處於輸入模式 (也意味著不打算處理事件)
        if (element.shadowRoot instanceof ShadowRoot || (element.getRootNode && element.getRootNode() instanceof ShadowRoot)) {
            return true;
        }
        return false;
    }

    function isCtrlOrMetaKeyPressed(event) {
        return event.ctrlKey || event.metaKey;
    }

    // 延遲函式
    async function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

})();
