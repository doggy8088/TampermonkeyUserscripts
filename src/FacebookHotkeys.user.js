// ==UserScript==
// @name         Facebook: 好用的鍵盤快速鍵集合
// @version      0.8.6
// @description  按下 f 快速切換側邊欄、Ctrl+I 檢舉留言、Ctrl+Delete 刪除留言、Alt+B 快速封鎖使用者
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
        let giveUpTimer;
        const initialUrl = window.location.href;

        // 動態消息、社團、個人檔案等非粉絲專頁永遠不會出現管理側欄與「隱藏功能表」按鈕，
        // 但原本的流程只會在「收合成功」或「網址改變」時停止；使用者若一直停留在動態消息往下捲，
        // 觀察器就會持續存在，每一批 DOM 變動都對整份文件執行兩次 querySelector，
        // 在 Facebook 這種變動極為頻繁的頁面上會持續消耗主執行緒。
        // 因此開始後 15 秒若仍找不到側欄也找不到收合按鈕，就判定不是粉絲專頁並結束初始化流程。
        // 此時頁面上沒有側欄，移除暫時樣式不會有任何可見的變化。
        const NON_PAGE_GIVE_UP_MS = 15000;

        function stop() {
            stopped = true;
            observer.disconnect();
            clearTimeout(retryTimer);
            clearTimeout(giveUpTimer);
            style.remove();
        }

        function scheduleGiveUpCheck() {
            giveUpTimer = setTimeout(() => {
                if (stopped) return;

                // 在背景分頁開啟時，Facebook 可能延後繪製內容；等分頁回到前景後再判斷，
                // 避免粉絲專頁在背景載入較慢時被誤判為非粉絲專頁，導致側欄沒有被自動隱藏。
                if (document.hidden) {
                    scheduleGiveUpCheck();
                    return;
                }

                // 已經出現側欄或收合按鈕，代表確實是粉絲專頁，交由原本的成功判斷與網址判斷來結束流程。
                if (document.querySelector(pageNavigationSelector) || document.querySelector(hideMenuSelector)) return;

                stop();
            }, NON_PAGE_GIVE_UP_MS);
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
        scheduleGiveUpCheck();
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

        // 中文、日文等輸入法組字期間的按鍵屬於輸入法，不能當成 f 快速鍵處理。
        if (!event.isComposing && !isInInputMode(event.target) && !event.ctrlKey && !event.metaKey && !event.altKey && event.key === "f") {
            // preventDefault() 必須在第一個 await 之前呼叫。舊版放在最後：當 toggleSidebar() 回傳 false、
            // 改走 await toggleSidebarByNavigation() 時，事件早已派送完畢，preventDefault() 已經沒有作用。
            event.preventDefault();

            // 只有粉絲團的 Sidebar 沒有找到才去隱藏其他的側邊欄
            // 因為只有粉絲團的 Sidebar 有切換顯示的按鈕
            toggleSidebar() || await toggleSidebarByNavigation();

            toggleReelsLayout();
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
                // 封鎖對話框不一定會出現這個選項（例如封鎖粉絲專頁時），此時 .all() 會回傳空陣列；
                // 舊版直接讀取 blockNew1[0].id 會丟出 TypeError，流程停在對話框中，後面的「確認」永遠不會被按下。
                const blockNewLabelId = blockNew1[0]?.id;
                if (blockNewLabelId) {
                    document.querySelector(`[aria-labelledby="${blockNewLabelId}"]`)?.click();
                }

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
        // 如果元素是輸入欄位、文字區域或下拉選單，則處於輸入模式
        // （SELECT 取得焦點時按字母鍵會跳到對應選項，不應被 f 快速鍵攔截）
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT') {
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
            // 舊版每 600ms 取出整頁「所有」div（Facebook 動輒上萬個），複製成陣列後在 JS 中逐一呼叫 getAttribute() 篩選，
            // 在影片頁停留越久、DOM 越大，每次輪詢的成本就越高。
            // 改由瀏覽器原生的屬性選擇器直接篩出 tabindex="0" 且 aria-pressed="false" 的 div（通常只有少數切換按鈕），
            // 再比對文字；條件與舊版的 getAttribute() 判斷完全相同，querySelectorAll 也依文件順序回傳，
            // 選中的仍是舊版的「第一個符合條件的元素」。
            const candidates = document.querySelectorAll('div[tabindex="0"][aria-pressed="false"]');
            const commentButton = Array.from(candidates).find(div => div.textContent.trim() === '留言');

            // 如果有符合條件的元素，對第一個執行 .click()
            if (commentButton) {
                commentButton.click();
                console.log('[FacebookHotkeys] 已自動點擊「留言」按鈕');
                clearInterval(checkForWatch); // 停止檢查
            }
            // 舊版找不到時每 600ms 都會印出「沒有符合條件的元素」，在影片頁停留越久 Console 就越洗版，因此移除。
        }
    }, 600);

})();
