// ==UserScript==
// @name         Coze: 快速鍵增強
// @version      0.3.0
// @description  Coze: 提供額外的快速鍵方便使用
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/CozeShortcuts.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/CozeShortcuts.user.js
// @author       Will Huang
// @match        *://www.coze.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // 除錯訊息開關：找不到元素、成功點擊等追蹤訊息預設不輸出，需要追查選擇器時再改成 true。
    const DEBUG = false;

    function debugLog(...args) {
        if (DEBUG) {
            console.log('[CozeShortcuts]', ...args);
        }
    }

    // 本腳本建立的分頁編號徽章。
    // 放開按鍵時只移除這些徽章：舊版對整頁 querySelectorAll('span[data-badge]') 後全部移除，
    // 每放開一個鍵（包括在輸入框打字時）都會掃描整份文件，而且會誤刪網站自己帶有 data-badge 屬性的元素。
    let badges = [];

    function removeBadges() {
        badges.forEach((badge) => badge.remove());
        badges = [];
    }

    function showTabBadges(tabList) {
        // 長按 Alt 時的 repeat 事件、以及按 Alt+數字時的第二個 keydown 都會再進來，
        // 舊版每次都再加一組徽章，同一個分頁會疊上好幾個；已經顯示時就不再重建。
        if (badges.some((badge) => badge.isConnected)) {
            return;
        }
        removeBadges();

        [...tabList.parentElement.children].filter(x => x.tagName === 'A').forEach((tabElement, index) => {
            const badge = document.createElement('span');
            badge.setAttribute('data-badge', '');
            badge.textContent = index + 1;
            badge.style.cssText = `
                position: absolute;
                top: -8px;
                right: -8px;
                background-color: #e2e8f0;
                color: #4a5568;
                border-radius: 9999px;
                padding: 2px 6px;
                font-size: 0.75rem;
                font-weight: bold;
                `;
            tabElement.style.position = 'relative';
            tabElement.appendChild(badge);
            badges.push(badge);
        });
    }

    document.addEventListener('keyup', function (event) {
        // 放開按鍵時移除分頁編號徽章
        if (badges.length > 0) {
            removeBadges();
        }
    });

    // 在 Windows 上按 Alt+Tab 切換視窗時，頁面收不到 Alt 的 keyup，徽章會一直留在畫面上；
    // 視窗失去焦點時一併移除。
    window.addEventListener('blur', removeBadges);

    document.addEventListener('keydown', function (event) {

        // 輸入法組字中的按鍵屬於輸入法，不處理（keyCode 229 是開始組字的第一個 keydown）。
        if (event.isComposing || event.keyCode === 229) {
            return;
        }

        // 如果使用者停留在網址列或是輸入框中，就不要觸發快速鍵的功能
        // （select 取得焦點時打字母會跳到對應選項，同樣屬於輸入情境）
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.tagName === 'SELECT' || event.target.isContentEditable) {
            return;
        }

        // 單鍵快速鍵必須排除 Ctrl 與 Meta：舊版只檢查 Alt，按下 Ctrl/Cmd+S（存檔）、Ctrl/Cmd+P（列印）、
        // Ctrl+H（歷史記錄）時，也會同時觸發「管理訂閱」、「Personal」、「Home」。
        const hasCtrlOrMeta = event.ctrlKey || event.metaKey;

        // macOS 的 Option+P 會輸入「π」、Option+數字會輸入「¡」等符號，event.key 不再是 p 或數字，
        // 舊版的 Alt 快速鍵因此在 Mac 上全部無法使用。按住 Alt（且沒有 Ctrl/Meta）時改以實體按鍵
        // event.code 作為備援；Windows/Linux 原本以 event.key 判斷的條件完全保留。
        const isAltCode = (code) => event.altKey && !hasCtrlOrMeta && event.code === code;

        // 只有按著 Alt 時才需要找分頁列（顯示編號徽章與 Alt+數字切換分頁都會用到）。
        // 舊版每一個按鍵都會先以 XPath 掃描整份文件，不在 Bot 頁面時還會每按一個鍵就印出一行「找不到」的 log。
        if (event.altKey) {
            var elm = findTestId('bot.tab');
            if (elm) {
                showTabBadges(elm);
            }
        }

        // 檢查是否按下了 S 鍵（不含 Alt、Ctrl、Meta）
        if (!event.altKey && !hasCtrlOrMeta && (event.key === 's' || event.key === 'S')) {
            performActions_UserSubMenu('Manage Subscription');
        }
        if (!event.altKey && !hasCtrlOrMeta && (event.key === 'p' || event.key === 'P')) {
            performActions('Personal');
        }
        if (!event.altKey && !hasCtrlOrMeta && (event.key === 'h' || event.key === 'H')) {
            performActions('Home');
        }
        if (!event.altKey && !hasCtrlOrMeta && (event.key === 't' || event.key === 'T')) {
            findAndToggleTeams();
        }

        if (event.altKey && (event.key === 'p' || event.key === 'P' || isAltCode('KeyP'))) {
            debugLog('Alt + P');
            performActions_UserSubMenu('My profile');
        }

        // Alt+1 ~ Alt+5 切換 Bot 分頁；event.key 不是數字時（macOS），以 Digit1 ~ Digit5 的實體按鍵判斷。
        let tabNumber = parseInt(event.key);
        if (!(tabNumber >= 1 && tabNumber <= 5)) {
            const digitMatch = event.altKey && !hasCtrlOrMeta ? /^Digit([1-5])$/.exec(event.code || '') : null;
            tabNumber = digitMatch ? Number(digitMatch[1]) : NaN;
        }
        if (event.altKey && tabNumber >= 1 && tabNumber <= 5) {
            var elm = findTestId('bot.tab');
            if (elm) {
                const tabs = [...elm.parentElement.children].filter(x => x.tagName === 'A');
                debugLog('Alt + ' + tabNumber, tabs);
                tabs[tabNumber - 1]?.click();
            }
        }
    });

    function findAndTriggerMouseDown(text) {
        const elements = document.evaluate(
            `//*[contains(text(), '${text}')]`,
            document,
            null,
            XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
            null
        );

        for (let i = 0; i < elements.snapshotLength; i++) {
            const element = elements.snapshotItem(i);
            if (element) {
                const mousedownEvent = new MouseEvent('mousedown', {
                    bubbles: true,
                    cancelable: true,
                });
                element.dispatchEvent(mousedownEvent);
                debugLog(`Triggered mousedown on element containing "${text}"`);
                return true;
            }
        }

        debugLog(`No element found containing "${text}"`);
        return false;
    }

    function findParentTabindexAndClickElement(text) {
        const elements = document.evaluate(
            `//*[contains(text(), '${text}')]`,
            document,
            null,
            XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
            null
        );

        for (let i = 0; i < elements.snapshotLength; i++) {
            let element = elements.snapshotItem(i);
            if (element) {
                // 向上遍歷DOM樹，查找帶有tabindex屬性的節點
                while (element && !element.hasAttribute('tabindex')) {
                    element = element.parentElement;
                }

                if (element) {
                    element.click();
                    debugLog(`Clicked element containing "${text}"`);

                    return true;
                } else {
                    debugLog(`Found text "${text}", but no parent element with tabindex`);
                }
            }
        }

        debugLog(`No element found containing "${text}"`);
        return false;
    }

    function findParentTabindexAndNexItemAndClickElement(text) {
        const elements = document.evaluate(
            `//*[contains(text(), '${text}')]`,
            document,
            null,
            XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
            null
        );

        for (let i = 0; i < elements.snapshotLength; i++) {
            let element = elements.snapshotItem(i);
            if (element) {
                // 向上遍歷DOM樹，查找帶有tabindex屬性的節點
                while (element && !element.hasAttribute('tabindex')) {
                    element = element.parentElement;
                }

                if (element) {
                    debugLog(element);
                    element?.parentElement?.parentElement?.nextSibling?.click();
                    debugLog(`Clicked element containing "${text}" and get it's next sibling`);

                    return true;
                } else {
                    debugLog(`Found text "${text}", but no parent element with tabindex`);
                }
            }
        }

        debugLog(`No element found containing "${text}"`);
        return false;
    }

    function findTestId(text = 'bot.tab') {
        const elements = document.evaluate(
            `//*[contains(@data-testid, '${text}')]`,
            document,
            null,
            XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
            null
        );

        for (let i = 0; i < elements.snapshotLength; i++) {
            let element = elements.snapshotItem(i);
            if (element) {
                return element;
            }
        }

        debugLog(`No element found with data-testid containing "${text}"`);
        return false;
    }

    function findAndToggleTeams(text = 'Teams') {
        const elements = document.evaluate(
            `//*[contains(text(), '${text}')]`,
            document,
            null,
            XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
            null
        );

        if (elements.snapshotLength === 0) {
            debugLog(`No element found containing "${text}"`);
            return;
        }

        for (let i = 0; i < elements.snapshotLength; i++) {
            let element = elements.snapshotItem(i);
            if (element) {
                var parent = element.parentElement;
                var sibiling = parent?.nextElementSibling;
                // 頁面上任何含有「Teams」字樣的元素都會被 XPath 找到，不一定後面就接著團隊清單；
                // 舊版直接展開 null.children 會丟出 TypeError，連後面真正的團隊清單都處理不到。
                if (!sibiling) {
                    continue;
                }
                var children = [...sibiling.children].filter(x => x.tagName === 'LI');

                for (let j = 0; j < children.length; j++) {
                    let idx = children[j].getAttribute('currentIndex');
                    if (idx === null) {
                        children[j].setAttribute('currentIndex', j === 0 ? '1' : '0');
                    }
                }

                for (let j = 0; j < children.length; j++) {
                    let idx = children[j].getAttribute('currentIndex');
                    if (idx === '1') {
                        children[j].focus();

                        children[j].setAttribute('currentIndex', '0');
                        if (j === children.length - 1) {
                            children[0].setAttribute('currentIndex', '1');
                        } else {
                            children[j + 1].setAttribute('currentIndex', '1');
                        }
                        break;
                    }
                }
            }
        }

        return false;
    }

    async function performActions(clickstr) {
        findParentTabindexAndClickElement(clickstr);
    }

    async function performActions_UserSubMenu(clickstr) {
        findParentTabindexAndNexItemAndClickElement('Coze token');
        await new Promise(resolve => setTimeout(resolve, 100));
        findAndTriggerMouseDown(clickstr);
        findParentTabindexAndNexItemAndClickElement('Coze token');
    }

})();
