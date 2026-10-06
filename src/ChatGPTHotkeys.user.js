// ==UserScript==
// @name         ChatGPT: 好用的鍵盤快速鍵集合
// @version      0.14.6
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
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // 除錯訊息開關：側邊欄切換有「內建快捷鍵 → data-testid → 第一顆按鈕 → aria-label」多層備援，
    // 平常每按一次 Ctrl+B 就印出好幾行 log 只會干擾 Console；需要追查是哪一層生效時再改成 true。
    // 「找不到元素」這類代表功能失效的訊息不受此開關影響，一律以 console.warn 輸出。
    const DEBUG = false;
    const LOG_PREFIX = '[ChatGPTHotkeys]';

    function debugLog(...args) {
        if (DEBUG) {
            console.log(LOG_PREFIX, ...args);
        }
    }

    function isMatchingKey(event, keyCheck) {
        if (typeof keyCheck !== 'string') {
            return keyCheck(event);
        }

        const key = (event.key || '').toLowerCase();
        const code = event.code || '';
        const expectedKey = keyCheck.toLowerCase();

        if (key === expectedKey) {
            return true;
        }

        if (keyCheck.length === 1 && code === `Key${keyCheck.toUpperCase()}`) {
            return true;
        }

        return code.toLowerCase() === expectedKey.toLowerCase();
    }

    function matchHotkey({ ctrl = false, alt = false }, keyCheck) {
        return e => (
            (ctrl ? (e.ctrlKey || e.metaKey) : (!e.ctrlKey && !e.metaKey)) &&
            e.altKey === alt &&
            isMatchingKey(e, keyCheck)
        );
    }

    const hotkeyHandlers = [
        { test: matchHotkey({ ctrl: true, alt: false }, 'Delete'), handler: handleCtrlDelete },
        { test: matchHotkey({ ctrl: true, alt: false }, 'b'), handler: handleCtrlToggleSidebar },
        { test: matchHotkey({ ctrl: false, alt: true }, 's'), handler: handleAltS },
        { test: matchHotkey({ ctrl: false, alt: true }, e => +e.key > 0), handler: handleAltNumber },
    ];
    let isSidebarToggleInProgress = false;
    let lastSidebarToggleAt = 0;

    async function handleCtrlDelete(event) {
        // 焦點在輸入區且已有內容時，Ctrl+Delete 很可能是想「刪除下一個字」，所以先確認再刪聊天記錄。
        // ChatGPT 的輸入框是 ProseMirror 的 contenteditable，內容在 textContent；但若退回成
        // <textarea>/<input>，textContent 只是初始內容、使用者輸入的文字在 value，
        // 只看 textContent 會誤判為空白而略過確認直接刪除，因此優先讀取字串型別的 value。
        const target = event.target;
        const currentText = typeof target.value === 'string' ? target.value : target.textContent;
        if (isInInputMode(target) && !!currentText && !confirm('是否要刪除本篇聊天記錄？')) {
            return;
        }

        // 確定要接手刪除聊天記錄後，必須在第一個 await 之前呼叫 preventDefault()：
        // 事件派送在第一個 await 就結束了，之後才呼叫已經來不及，輸入框會同時被刪掉一個字。
        event.preventDefault();

        const optionButtonFound = await simulateKeyPress(
            () => document.querySelector('button[data-testid="conversation-options-button"]'),
            'Enter'
        );
        if (!optionButtonFound) return;

        const matchingPopperContentWrapper = [...document.querySelectorAll('div[data-radix-popper-content-wrapper]')];
        if (matchingPopperContentWrapper.length === 0) {
            return;
        }

        const deleteItemFound = await simulateMouseClick(() => {
            for (const popperWrapper of matchingPopperContentWrapper) {
                const deleteItem = popperWrapper.querySelector('div[role="menuitem"][data-testid="delete-chat-menu-item"]');
                if (deleteItem) return deleteItem;
            }
            return null;
        });

        if (!deleteItemFound) return;

        await simulateMouseClick(() => document.querySelector('button[data-testid="delete-conversation-confirm-button"]'));
    }

    function readSidebarToggleState() {
        const closeButton = document.querySelector('button[data-testid="close-sidebar-button"]');
        const openButton = document.querySelector('button[data-testid="open-sidebar-button"]');
        const legacyButton = document.querySelector('button[data-testid="sidebar-button"]');

        if (closeButton) {
            return [
                'close-sidebar-button',
                closeButton.getAttribute('aria-expanded') || '',
                closeButton.closest('[data-state]')?.getAttribute('data-state') || ''
            ].join('|');
        }

        if (openButton) {
            return [
                'open-sidebar-button',
                openButton.getAttribute('aria-expanded') || '',
                openButton.closest('[data-state]')?.getAttribute('data-state') || ''
            ].join('|');
        }

        if (legacyButton) {
            return [
                'sidebar-button',
                legacyButton.getAttribute('aria-expanded') || '',
                legacyButton.closest('[data-state]')?.getAttribute('data-state') || ''
            ].join('|');
        }

        return 'none';
    }

    async function tryToggleBySelector(selector, beforeState) {
        // 這裡是在「探測」哪一顆側邊欄按鈕存在，不是在等待某個動作之後才會出現的元素。
        // simulateMouseClick() 預設會用 waitForElement() 最多等 3 秒，若直接交給它處理，
        // 每個不存在的 selector 都會白等 3 秒（清單最長有 13 個 selector，最壞情況要等數十秒），
        // 這段期間 isSidebarToggleInProgress 一直鎖住，使用者再按 Ctrl+B 都沒反應；
        // 更糟的是使用者在等待期間自己用滑鼠開關側邊欄，延遲出現的按鈕會被補點一下又切回去。
        // 因此先立即檢查一次，不存在就直接換下一個 selector（與 0.14.0 以前先判斷再點擊的行為一致）。
        if (!document.querySelector(selector)) {
            return false;
        }

        const clicked = await simulateMouseClick(() => document.querySelector(selector));
        if (!clicked) {
            return false;
        }

        // ChatGPT 的側邊欄切換有時會在下一個 render tick 才更新 aria/data-state，
        // 若太早判斷會誤以為切換失敗，進而嘗試下一個 selector 造成「打開後立刻又關閉」。
        const startTime = Date.now();
        const maxWait = 400;
        while (Date.now() - startTime < maxWait) {
            const afterState = readSidebarToggleState();
            if (afterState !== beforeState) {
                return true;
            }
            await delay(33);
        }

        return false;
    }

    function getCloseSidebarExpandedState() {
        return document.querySelector('button[data-testid="close-sidebar-button"]')?.getAttribute('aria-expanded') || '';
    }

    function dispatchKeyboardShortcut(target, eventInit) {
        const keydown = new KeyboardEvent('keydown', eventInit);
        const keyup = new KeyboardEvent('keyup', eventInit);
        target.dispatchEvent(keydown);
        target.dispatchEvent(keyup);
    }

    async function triggerBuiltInSidebarShortcut(event, beforeExpandedState) {
        const eventInit = {
            key: 'S',
            code: 'KeyS',
            ctrlKey: event.ctrlKey,
            metaKey: event.metaKey,
            shiftKey: true,
            bubbles: true,
            cancelable: true
        };

        const targets = [
            document.activeElement,
            document.body,
            document.documentElement,
            document,
            window
        ].filter(Boolean);

        for (const target of targets) {
            dispatchKeyboardShortcut(target, eventInit);
            await delay(50);
            if (getCloseSidebarExpandedState() !== beforeExpandedState) {
                debugLog('Built-in shortcut toggled sidebar');
                return true;
            }
        }

        return false;
    }

    async function handleCtrlToggleSidebar(event) {
        // 攔截瀏覽器與編輯器對 Cmd/Ctrl+B 的預設粗體行為，確保快捷鍵優先執行側邊欄切換。
        event.preventDefault();
        event.stopPropagation();
        const now = Date.now();

        // Cmd/Ctrl+B 在長按時會觸發 key repeat；若不過濾，單次操作可能連續切換多次。
        if (event.repeat) {
            return;
        }

        // 透過節流避免同一個實體按鍵被多個事件來源重入（例如焦點變化、頁面攔截再派送）。
        if (isSidebarToggleInProgress || now - lastSidebarToggleAt < 250) {
            return;
        }

        isSidebarToggleInProgress = true;
        lastSidebarToggleAt = now;

        try {
        const beforeState = readSidebarToggleState();
        const beforeExpandedState = getCloseSidebarExpandedState();

        // 優先嘗試內建 Cmd/Ctrl+Shift+S 切換，讓行為盡量與官方快捷鍵一致。
        // 若站台忽略非信任事件（isTrusted=false），下方會立即改走 DOM 切換備援。
        const builtinToggled = await triggerBuiltInSidebarShortcut(event, beforeExpandedState);
        if (builtinToggled) {
            return;
        }

        // 先嘗試最穩定的 data-testid 按鈕：新版 UI 常見 `close-sidebar-button` / `open-sidebar-button`。
        // 當 close-sidebar-button 的 aria-expanded=false 時，先點「開啟側邊欄」可避免無效點擊。
        const dataTestIdSelectors = beforeExpandedState === 'false'
            ? [
                'button[data-testid="open-sidebar-button"]',
                'button[aria-label="開啟側邊欄"]',
                'button[aria-label="Open sidebar"]',
                'button[data-testid="close-sidebar-button"]',
                'button[data-testid="sidebar-button"]'
            ]
            : [
                'button[data-testid="close-sidebar-button"]',
                'button[data-testid="open-sidebar-button"]',
                'button[data-testid="sidebar-button"]'
            ];
        for (const selector of dataTestIdSelectors) {
            const toggled = await tryToggleBySelector(selector, beforeState);
            if (toggled) {
                debugLog('Clicking sidebar button by data-testid selector', selector);
                return;
            }
        }

        // 某些新版 UI 會將切換狀態掛在父層 `data-state`，保留舊邏輯可避免按鈕 selector 存在但無法切換。
        const firstButton = document.querySelectorAll('button')[0];
        if (firstButton?.parentElement?.dataset['state'] === 'closed') {
            const clicked = await simulateMouseClick(() => document.querySelectorAll('button')[0]);
            if (clicked) {
                await delay(33);
                if (readSidebarToggleState() !== beforeState) {
                    debugLog('Clicking first button (state closed)');
                    return;
                }
            }
        }

        // 再嘗試 aria-label：補齊語系與新版按鈕命名差異，避免 selector 名稱更新後失效。
        const ariaLabelSelectors = [
            'button[aria-label="Open sidebar"]',
            'button[aria-label="Close sidebar"]',
            'button[aria-label="開啟側邊欄"]',
            'button[aria-label="關閉側邊欄"]',
            'button[aria-label="打开侧边栏"]',
            'button[aria-label="关闭侧边栏"]',
            'button[aria-label="サイドバーを開く"]',
            'button[aria-label="サイドバーを閉じる"]'
        ];
        for (const selector of ariaLabelSelectors) {
            const toggled = await tryToggleBySelector(selector, beforeState);
            if (toggled) {
                debugLog('Clicking sidebar button by aria-label selector', selector);
                return;
            }
        }

        // 最後保底再嘗試一次內建快捷鍵，覆蓋可能的暫時焦點問題。
        await triggerBuiltInSidebarShortcut(event, beforeExpandedState);
        } finally {
            // 稍微延後釋放鎖，避免切換動畫期間再收到下一個 keydown 導致重複切換。
            setTimeout(() => {
                isSidebarToggleInProgress = false;
            }, 120);
        }
    }

    async function handleAltS(event) {
        const searchButton = document.querySelector('button[data-testid="composer-button-search"]');
        const deepResearchButton = document.querySelector('button[data-testid="composer-button-deep-research"]');
        const createImageButton = document.querySelector('button[data-testid="composer-button-create-image"]');

        // 三顆模式按鈕必須同時存在才能判斷目前狀態。舊版直接讀 null.ariaPressed，
        // 只要 ChatGPT 改版少了任何一顆，每按一次 Alt+S 就丟一次 TypeError（未處理的 Promise rejection），
        // 而且在丟例外之前不會點到任何按鈕；這裡改為提早返回，行為相同但不再丟例外。
        if (!searchButton || !deepResearchButton || !createImageButton) {
            return;
        }

        // 確定會接手 Alt+S 才阻止預設行為：macOS 的 Option+S 會輸入「ß」，
        // 不阻止的話切換模式的同時還會在輸入框多打一個字元。
        // 找不到按鈕時不呼叫，讓使用者仍可正常用 Option+S 輸入 ß。
        event.preventDefault();

        // 先一次讀出三顆按鈕的狀態，再用 else-if 只做「一次」轉換：
        // 無 → 搜尋 → 深入研究 → 建立圖片 → 無。
        // 舊版四個 if 每次都重新讀取 ariaPressed，若 React 在 click() 後同步更新屬性，
        // 一次按鍵就會連鎖觸發多個分支而跳過中間的模式；先讀狀態可確保一次按鍵只前進一格。
        const searchPressed = searchButton.ariaPressed;
        const deepResearchPressed = deepResearchButton.ariaPressed;
        const createImagePressed = createImageButton.ariaPressed;

        if (searchPressed === 'false' && deepResearchPressed === 'false' && createImagePressed === 'false') {
            searchButton.click();
        } else if (searchPressed === 'true' && deepResearchPressed === 'false' && createImagePressed === 'false') {
            deepResearchButton.click();
        } else if (searchPressed === 'false' && deepResearchPressed === 'true' && createImagePressed === 'false') {
            createImageButton.click();
        } else if (searchPressed === 'false' && deepResearchPressed === 'false' && createImagePressed === 'true') {
            createImageButton.click();
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

    // 使用 capture 階段先攔截按鍵，避免站台自身快捷鍵先 stopPropagation 造成熱鍵失效。
    document.addEventListener("keydown", async (event) => {
        // 輸入法（注音、倉頡、日文 IME…）組字期間的按鍵屬於輸入法，不應觸發任何熱鍵。
        // isComposing 只在 compositionstart 之後才為 true，開始組字的第一個 keydown
        // 會以 keyCode 229（key 為 "Process"）送出；isMatchingKey() 會退而比對 event.code，
        // 這種事件仍可能被誤判為 KeyB/KeyS，所以兩個條件都要擋。
        if (event.isComposing || event.keyCode === 229) {
            return;
        }

        for (const { test, handler } of hotkeyHandlers) {
            if (test(event)) {
                // handler 都是 async；任何一個 selector 因改版失效而丟出例外時，
                // 統一在這裡接住並加上前綴，避免變成難以追查的 Uncaught (in promise)。
                try {
                    await handler(event);
                } catch (error) {
                    console.warn(LOG_PREFIX, 'Hotkey handler failed:', error);
                }
                break;
            }
        }
    }, true);

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

    async function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    async function waitForElement(getElement, retryInterval = 33, maxWait = 3000) {
        const startTime = Date.now();

        while (Date.now() - startTime < maxWait) {
            const element = typeof getElement === 'function' ? getElement() : getElement;
            if (element) {
                return element;
            }
            await delay(retryInterval);
        }

        return null;
    }

    async function simulateMouseClick(getElement, retryInterval = 33, maxWait = 3000) {
        const element = await waitForElement(getElement, retryInterval, maxWait);
        if (!element) {
            // 等滿 maxWait 仍找不到元素代表選擇器可能已因改版失效，屬於需要被看見的訊息。
            console.warn(LOG_PREFIX, 'simulateMouseClick: element not found after max wait time');
            return false;
        }

        const mouseEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true
        });

        debugLog('simulateMouseClick', element);
        element.dispatchEvent(mouseEvent);
        return true;
    }

    async function simulateKeyPress(getElement, key, retryInterval = 33, maxWait = 3000) {
        const element = await waitForElement(getElement, retryInterval, maxWait);
        if (!element) {
            console.warn(LOG_PREFIX, 'simulateKeyPress: element not found after max wait time');
            return false;
        }

        const keyEvent = new KeyboardEvent('keydown', {
            bubbles: true,
            cancelable: true,
            key: key
        });

        debugLog('simulateKeyPress', element);
        element.dispatchEvent(keyEvent);
        return true;
    }

})();
