// ==UserScript==
// @name         ChatGPT: 好用的鍵盤快速鍵集合
// @version      0.11.0
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

    function matchHotkey({ctrl = false, alt = false}, keyCheck) {
        return e => (
            (ctrl ? (e.ctrlKey || e.metaKey) : (!e.ctrlKey && !e.metaKey)) &&
            e.altKey === alt &&
            (typeof keyCheck === 'string' ? e.key === keyCheck : keyCheck(e))
        );
    }

    const hotkeyHandlers = [
        { test: matchHotkey({ ctrl: true, alt: false }, 'Delete'), handler: handleCtrlDelete },
        { test: matchHotkey({ ctrl: true, alt: false }, 'b'), handler: handleCtrlToggleSidebar },
        { test: matchHotkey({ ctrl: false, alt: true }, 's'), handler: handleAltS },
        { test: matchHotkey({ ctrl: false, alt: true }, e => +e.key > 0), handler: handleAltNumber },
    ];

    async function handleCtrlDelete(event) {
        if (isInInputMode(event.target) && !!event.target.textContent && !confirm('是否要刪除本篇聊天記錄？')) {
            return;
        }

        const optionButton = document.querySelector('button[data-testid="conversation-options-button"]');
        if (!optionButton) return;
        simulateKeyPress(optionButton, 'Enter');

        await delay(50);

        const matchingPopperContentWrapper = [...document.querySelectorAll('div[data-radix-popper-content-wrapper]')];
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

        await delay(50);

        simulateMouseClick(
            document.querySelector(`div[data-testid="modal-delete-conversation-confirmation"]`)
            ?.querySelector(`button[data-testid="delete-conversation-confirm-button"]`));
    }

    function handleCtrlToggleSidebar(event) {
        let firstButton = document.querySelectorAll('button')[0];
        if (!firstButton) return;

        if (firstButton.parentElement.dataset['state'] === 'closed') {
            firstButton.click();
            return;
        }

        if (firstButton.dataset['testid'] === 'open-sidebar-button') {
            firstButton.click();
            return;
        }

        let sidebarButton = document.querySelector('button[data-testid="sidebar-button"]');
        if (sidebarButton) {
            sidebarButton.click();
            return;
        }
    }

    async function handleAltS(event) {
        const searchButton = document.querySelector('button[data-testid="composer-button-search"]');
        const deepResearchButton = document.querySelector('button[data-testid="composer-button-deep-research"]');
        if (searchButton.ariaPressed === 'false' && deepResearchButton.ariaPressed === 'false') {
            searchButton.click();
        }
        if (searchButton.ariaPressed === 'true' && deepResearchButton.ariaPressed === 'false') {
            deepResearchButton.click();
        }
        if (searchButton.ariaPressed === 'false' && deepResearchButton.ariaPressed === 'true') {
            deepResearchButton.click();
        }
    }

    function handleAltNumber(event) {
        const useToolButton =
            document.querySelector('button[aria-label="Use a tool"]')
            || document.querySelector('button[aria-label="使用工具"]')
            || document.querySelector('button[aria-label="ツールを使用する"]');

        const enterEvent = new KeyboardEvent("keydown", {
            key: "Enter",
            keyCode: 13,
            code: "Enter",
            which: 13,
            bubbles: true,
            cancelable: true
        });
        useToolButton?.dispatchEvent(enterEvent);

        setTimeout(() => {
            const popperWrappers = document.querySelectorAll('div[data-radix-popper-content-wrapper]');
            popperWrappers.forEach((popperWrapper) => {
                const menuItems = popperWrapper.querySelectorAll('div[role="menuitem"]');
                menuItems[+event.key - 1]?.click();
            });
        }, 300);
    }

    document.addEventListener("keydown", async (event) => {
        for (const { test, handler } of hotkeyHandlers) {
            if (test(event)) {
                await handler(event);
                break;
            }
        }
    });

    function isInInputMode(element) {
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
            return true;
        }
        if (element.isContentEditable) {
            return true;
        }
        if (element.shadowRoot instanceof ShadowRoot || (element.getRootNode && element.getRootNode() instanceof ShadowRoot)) {
            return true;
        }
        return false;
    }

    function isCtrlOrMetaKeyPressed(event) {
        return event.ctrlKey || event.metaKey;
    }

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
