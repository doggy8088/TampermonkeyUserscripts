// ==UserScript==
// @name         ChatGPT: 好用的鍵盤快速鍵集合
// @version      0.9.0
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

            if (isInInputMode(event.target) && !!event.target.textContent && !confirm('是否要刪除本篇聊天記錄？')) {
                return; // 如果在輸入模式，且有文字，就詢問要不要刪除本篇聊天記錄
            }

            const optionButton = document.querySelector('button[data-testid="conversation-options-button"]')
            if (!optionButton) return;
            simulateKeyPress(optionButton, 'Enter');

            await delay(50); // 等待 300ms 讓選單出現

            const matchingPopperContentWrapper = [...document.querySelectorAll('div[data-radix-popper-content-wrapper]')]
            if (matchingPopperContentWrapper.length === 0) {
                return;
            }

            let isDeleteButtonFound = false;
            for (let i = 0; i < matchingPopperContentWrapper.length; i++) {
                const popperWrapper = matchingPopperContentWrapper[i];
                const deleteItem = popperWrapper.querySelector('div[role="menuitem"][data-testid="delete-chat-menu-item"]');
                if (deleteItem) {
                    simulateMouseClick(deleteItem);
                    isDeleteButtonFound = true;
                    break;
                }
            }

            if (!isDeleteButtonFound) return;

            await delay(50); // 等待 300ms 讓選單出現

            simulateMouseClick(
                document.querySelector(`div[data-testid="modal-delete-conversation-confirmation"]`)
                ?.querySelector(`button[data-testid="delete-conversation-confirm-button"]`));
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

    function simulateMouseClick(element) {
        if (!element) return;

        const mouseEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true
        });

        console.log('simulateMouseClick', element);

        element.dispatchEvent(mouseEvent);
    }

    function simulateKeyPress(element, key) {
        if (!element) return;

        const keyEvent = new KeyboardEvent('keydown', {
            bubbles: true,
            cancelable: true,
            key: key
        });

        console.log('simulateKeyPress', element);

        element.dispatchEvent(keyEvent);
    }

})();
