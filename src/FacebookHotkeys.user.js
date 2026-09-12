// ==UserScript==
// @name         Facebook: 好用的鍵盤快速鍵集合
// @version      0.8.5
// @description  按下 Ctrl+B 快速切換側邊欄、Ctrl+I 檢舉留言、Ctrl+Delete 刪除留言、Alt+B 快速封鎖使用者
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/FacebookHotkeys.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/FacebookHotkeys.user.js
// @author       Will Huang
// @match        https://www.facebook.com/*
// @match        https://facebook.com/*
// @run-at       document-start
// @icon         https://www.google.com/s2/favicons?sz=64&domain=facebook.com
// @require      https://doggy8088.github.io/playwright-js/src/playwright.js
// @grant        none
// ==/UserScript==

// TODO: 當使用者按下「檢舉留言」時，不用確認，直接幫我檢舉、封鎖、刪除
// TODO: 當使用者按下「刪除」時，不用確認，直接幫我刪除

(function () {
    'use strict';

    const hideMenuSelector = 'div[aria-label="隱藏功能表"]';
    const showMenuSelector = 'div[aria-label="顯示功能表"]';
    const pageNavigationSelector = '[role="navigation"][aria-label="粉絲專頁導覽"]';
    const cancelInitialSidebarHide = hideInitialSidebar();

    function hideInitialSidebar() {
        // 使用者希望管理側欄一出現就隱藏。Facebook 可能先產生 DOM，之後才綁定
        // 按鈕事件，因此先以精確的語意選擇器隱藏側欄，不等待 load 或點擊成功。
        // 側欄是主內容的 flex 同層元素；display:none 也會讓主內容取得騰出的寬度。
        const style = document.createElement('style');
        style.textContent = `${pageNavigationSelector} { display: none !important; }`;
        let stopped = false;
        let retryTimer;
        const initialUrl = window.location.href;

        function stop() {
            stopped = true;
            observer.disconnect();
            clearTimeout(retryTimer);
            style.remove();
        }

        function tryHide() {
            if (stopped) return;
            if (window.location.href !== initialUrl) {
                stop();
                return;
            }

            // document-start 時 head、甚至 html 都可能尚未建立；觀察 document
            // 可以在根節點出現後立即補上樣式，也能處理 Facebook 延後插入的側欄。
            if (!style.isConnected && document.documentElement) {
                (document.head || document.documentElement).appendChild(style);
            }

            // 只有「顯示功能表」出現才算真正收合完成。不能把 click() 已呼叫
            // 當作成功，也不能呼叫 toggleSidebar()，否則可能把已收合的側欄打開。
            if (document.querySelector(showMenuSelector)) {
                stop();
                return;
            }

            const button = document.querySelector(hideMenuSelector);
            if (!button || retryTimer !== undefined) return;

            // 事件綁定本身不一定造成 DOM mutation，因此仍需短間隔重試。
            // 先設定計時器以合併同一期間的 DOM 通知，避免密集重複點擊。
            retryTimer = setTimeout(() => {
                retryTimer = undefined;
                tryHide();
            }, 100);
            button.click();
        }

        const observer = new MutationObserver(tryHide);
        observer.observe(document, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['aria-label']
        });
        tryHide();

        // 手動切換優先於自動收合。暫時 CSS 隱藏時，第一次切換只需移除 CSS，
        // 露出原本仍展開的側欄；成功收合後則交還 Facebook 原生按鈕處理。
        return () => {
            const wasHiddenByStyle = !stopped && !!document.querySelector(pageNavigationSelector)
                && !document.querySelector(showMenuSelector);
            stop();
            return wasHiddenByStyle;
        };
    }

    document.addEventListener("keydown", async (event) => {

        if (!isInInputMode(event.target) && !event.ctrlKey && !event.metaKey && !event.altKey && event.key === "f") {
            // 只有粉絲團的 Sidebar 沒有找到才去隱藏其他的側邊欄
            // 因為只有粉絲團的 Sidebar 有切換顯示的按鈕
            toggleSidebar() || await toggleSidebarByNavigation();

            toggleReelsLayout();

            event.preventDefault();
            return;
        }

        // 按下 Ctrl+Delete 會刪除目前貼文
        if (event.ctrlKey && !event.altKey && event.key === "Delete") {
            window.page.WAIT_TIMEOUT = 0;
            if (await window.page.getByRole('menuitem', { name: '刪除' }).isVisible()) {
                window.page.WAIT_TIMEOUT = 5000;
                await window.page.getByRole('menuitem', { name: '刪除' }).click();
                console.log(await window.page.getByRole('button', { name: '刪除', exact: true }).all());
                await window.page.getByRole('button', { name: '刪除', exact: true }).click();
                return;
            }
        }

        // 按下 Ctrl+I 會檢舉留言
        if (event.ctrlKey && !event.altKey && event.key === "i") {
            window.page.WAIT_TIMEOUT = 0;
            if (await window.page.getByText('檢舉留言').isVisible()) {
                window.page.WAIT_TIMEOUT = 5000;
                await window.page.getByText('檢舉留言').click();
                await window.page.getByText('詐騙、詐欺或不實資訊').click();
                await window.page.getByText('垃圾訊息').click();
                await window.page.getByText('完成').click();
                return;
            }
        }

        // 按下 Alt+B 會封鎖目前使用者
        if (!event.ctrlKey && !event.metaKey && event.altKey && event.key === "b") {

            window.page.WAIT_TIMEOUT = 0;
            if (await window.page.getByRole('button', { name: '查看選項' }).isVisible()) {
                window.page.WAIT_TIMEOUT = 5000;

                await window.page.getByRole('button', { name: '查看選項' }).click();
                await delay(1000);
                await window.page.getByRole('menuitem', { name: '封鎖' }).click();

                // 封鎖趙清涵和對方可能建立的新個人檔案
                await delay(1000);
                var blockNew1 = await window.page.getByText('和對方可能建立的新個人檔案').all();
                document.querySelector(`[aria-labelledby="${blockNew1[0].id}"]`)?.click();

                await delay(1000);
                await window.page.getByRole('button', { name: '確認' }).click();
                await delay(1000);
                await window.page.getByRole('button', { name: '關閉' }).click();

                return;
            }

            window.page.WAIT_TIMEOUT = 0;
            if (await window.page.getByRole('menuitem', { name: '移除貼文並封鎖作者' }).isVisible()) {
                window.page.WAIT_TIMEOUT = 5000;

                await window.page.getByRole('menuitem', { name: '移除貼文並封鎖作者' }).click();

                await delay(500);
                await window.page.getByRole('checkbox', { name: '刪除最近的動態' }).click();
                await delay(500);
                await window.page.getByRole('checkbox', { name: '未來建立的帳號' }).click();

                await delay(1000);
                await window.page.getByRole('button', { name: '確認' }).click();

                return;
            }
        }
    });

    function toggleReelsLayout() {
        const elements = document.querySelectorAll(
            'div[aria-label="Video player"], div[role="complementary"]'
        );

        if (elements.length === 0) return;

        const shouldHide = elements[0].style.display !== 'none';

        elements.forEach(el => {
            el.style.display = shouldHide ? 'none' : '';
        });
    }

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

    function toggleSidebar() {
        if (cancelInitialSidebarHide()) return true;
        var dom = document.querySelector(`${hideMenuSelector},${showMenuSelector}`);
        dom?.click();
        return !!dom;
    }

    async function toggleSidebarByNavigation() {
        var navigation = await window.page.getByRole('navigation').all();
        var dom = navigation[navigation.length - 1];
        if (dom) {
            dom.style.display = dom.style.display === 'none' ? '' : 'none';
        }
        return !!dom;
    }

    // 延遲函式
    async function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    let checkForWatch = setInterval(() => {
        // 判斷當前網址路徑是否為 /watch/?v= 開頭
        if (window.location.pathname.startsWith('/watch/')) {
            // 找出網頁中所有的 div，並篩選符合條件的元素
            const divs = document.querySelectorAll('div'); // 選取所有的 div 元素
            const filteredDivs = Array.from(divs).filter(div =>
                div.getAttribute('tabindex') === '0' &&
                div.getAttribute('aria-pressed') === 'false' &&
                div.textContent.trim() === '留言'
            );

            // 如果有符合條件的元素，對第一個執行 .click()
            if (filteredDivs.length > 0) {
                filteredDivs[0].click();
                console.log('已對第一個符合條件的元素執行 .click()');
                clearInterval(checkForWatch); // 停止檢查
            } else {
                console.log('沒有符合條件的元素');
            }
        }
    }, 600);

})();
