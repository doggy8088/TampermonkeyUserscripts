// ==UserScript==
// @name         Felo Search: 好用的鍵盤快速鍵集合
// @version      0.14.1
// @description  按下 Ctrl+Delete 快速刪除當下聊天記錄、按下 Ctrl+B 快速切換側邊欄、按下 j 與 k 快速切換搜尋結果頁面
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/FeloSearchHotkeys.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/FeloSearchHotkeys.user.js
// @author       Will Huang
// @match        https://felo.ai/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=felo.ai
// @require      https://doggy8088.github.io/playwright-js/src/playwright.js
// @grant        GM_log
// ==/UserScript==

(async function () {
    'use strict';

    document.addEventListener('keydown', async (event) => {

        // 輸入法（注音、倉頡、日文 IME…）組字期間的按鍵屬於輸入法，一律不處理。
        // 特別是 Esc：組字時按 Esc 是「取消組字」，舊版會把整個輸入框清空。
        // keyCode 229 是開始組字的第一個 keydown（此時 isComposing 仍為 false）。
        if (event.isComposing || event.keyCode === 229) {
            return;
        }

        if (!isInInputMode(event.target) && !isCtrlOrMetaKeyPressed(event) && !event.altKey && event.key === 'j') {
            const matchingLink = document.querySelector(`a[href='${window.location.pathname}']`);
            if (matchingLink) {
                const nextLink = matchingLink?.closest('li')?.nextElementSibling?.querySelector('a')
                    ?? matchingLink?.closest('li')?.nextElementSibling?.nextElementSibling?.querySelector('a');
                if (nextLink) {
                    nextLink?.parentElement?.previousElementSibling?.scrollIntoView();
                    nextLink?.click();
                }
            } else {
                const firstLink = document.querySelector(`a[href*='/search/']`);
                firstLink?.click();
            }
            event.preventDefault();
        }

        if (!isInInputMode(event.target) && !isCtrlOrMetaKeyPressed(event) && !event.altKey && event.key === 'k') {
            const matchingLink = document.querySelector(`a[href='${window.location.pathname}']`);
            const previousLink = matchingLink?.closest('li')?.previousElementSibling?.querySelector('a')
                ?? matchingLink?.closest('li')?.previousElementSibling?.previousElementSibling?.querySelector('a');
            if (previousLink) {
                // 與 j 一樣使用 optional chaining：清單第一個項目前面沒有兄弟元素時，
                // 舊版會在 scrollIntoView() 這行丟出 TypeError，導致 click() 沒有執行、無法切換到上一頁。
                previousLink.parentElement?.previousElementSibling?.scrollIntoView();
                previousLink.click();
            }
            event.preventDefault();
            return;
        }

        if (!isInInputMode(event.target) && !isCtrlOrMetaKeyPressed(event) && !event.altKey && event.key === 'h') {
            // preventDefault() 必須在第一個 await 之前呼叫：事件派送在 await 時就已結束，之後才呼叫不會有任何效果。
            event.preventDefault();
            if (!await clickButtonByText(['歷史記錄', '历史记录', '履歴記録', 'History'])) {
                location.href = '/history';
            }
            return;
        }

        if (!isInInputMode(event.target) && !isCtrlOrMetaKeyPressed(event) && !event.altKey && event.key === 'p') {
            document.querySelector('#pptGenerate')?.click();
            event.preventDefault();
            return;
        }

        // 按下 f 就隱藏所有不必要的元素
        if (!isInInputMode(event.target) && !isCtrlOrMetaKeyPressed(event) && !event.altKey && event.key === 'f') {
            // Toggle 頁首
            toggleDisplay(document.querySelector('header'));
            // Toggle 側邊欄
            toggleDisplay(document.querySelector('aside'));

            // Toggle 文章註腳
            document.querySelectorAll('span.footnote-ref').forEach((e) => {
                toggleDisplay(e);
            });

            // Toggle 資料來源
            document.querySelectorAll('div.thread-item').forEach((e) => {
                toggleDisplay(e.children[1]);
            });

            let main = document.querySelector('main');
            if (!main) return;

            // Toggle 追問區（main 的最後一個子元素，等同舊版的 Array.from(main.children).last()）
            toggleDisplay(main.lastElementChild?.children?.[1]);

            // 在 await 之前阻止預設行為，理由同 h。
            event.preventDefault();

            await toggle主要內容區();

            return;
        }

        // 按下 t 就先找出所有 button 元素，比對元素內容，如果為「主題集」就點擊它
        // （舊註解寫成 Alt+t，但條件一直是不含 Alt 的單鍵 t）
        if (!isInInputMode(event.target) && !isCtrlOrMetaKeyPressed(event) && !event.altKey && event.key === 't') {
            event.preventDefault();
            debugLog('Click on 主題集');
            if (!await clickButtonByText(['主題集', '主题集', 'トピック集', 'Topic Collections'])) {
                debugLog('Unable to click on 主題集, Redirecting to /topic');
                location.href = '/topic';
            }
            return;
        }

        // 按下 s（在輸入欄位中則為 Alt+s）就先找出所有 button 元素，比對元素內容，如果為「分享」就點擊它
        // macOS 的 Option+S 會輸入「ß」，event.key 不是 's'，所以按住 Alt 時改以實體按鍵 event.code 判斷，
        // 讓「在輸入框中按 Alt+s 分享」在 Mac 上也能使用。
        const isShareKey = event.key === 's' || (event.altKey && event.code === 'KeyS');
        if (!isCtrlOrMetaKeyPressed(event) && isShareKey) {
            // 如果是輸入欄位，就不要觸發。但是按下 alt+s 就可以觸發這個功能。
            // 改用 isInInputMode() 判斷：舊版只排除 INPUT/TEXTAREA，在 contenteditable 或 select 中打 s
            // 會觸發分享，而且這個字會被 preventDefault() 吃掉。
            if (isInInputMode(event.target) && !event.altKey) {
                return;
            }

            event.preventDefault();
            await clickButtonByText(['分享', '分享', '共有する', 'Share']);
            return;
        }

        // 按下 c 就點擊「建立主題」按鈕
        if (!isInInputMode(event.target) && !isCtrlOrMetaKeyPressed(event) && !event.altKey && event.key === 'c') {
            event.preventDefault();
            await clickButtonByText(['建立主題', '建立主题', 'トピックを作成', 'Create topic']);
            return;
        }

        // 按下 Ctrl+Delete 或 Command+Delete 快速刪除 Felo Search 聊天記錄
        if (isCtrlOrMetaKeyPressed(event) && !event.altKey && event.key === 'Delete') {
            // 焦點在有內容的輸入欄位時先確認，避免想「刪除下一個字」卻刪掉整個討論串。
            // Felo 的提問框是 <textarea>，使用者輸入的文字在 value，textContent 只是初始內容（通常為空），
            // 舊版只看 textContent，導致在提問框打字時按 Ctrl+Delete 會不經確認直接刪除討論串。
            const target = event.target;
            const currentText = typeof target.value === 'string' ? target.value : target.textContent;
            if (isInInputMode(target) && !!currentText && !confirm('是否要刪除本篇聊天記錄？')) {
                return;
            }

            // 在 await 之前阻止預設行為，避免輸入框同時被刪掉一個字。
            event.preventDefault();

            GM_log('正在刪除討論串: ' + window.location.pathname);

            // playwright.js 找不到元素時會在逾時後丟出例外；在這裡接住並加上前綴，
            // 避免變成難以追查的 Uncaught (in promise)。
            try {
                // 取得頁首最後一顆按鈕（討論串的「更多選項」）。playwright.js 的 locator 提供 last()；
                // 舊版另外在 Array.prototype 上加了 last()，若 locator 實際上是陣列，原本是靠它取值。
                // 移除原型擴充後，在沒有 last() 方法時自行取最後一個元素，兩種情況的結果都與舊版相同。
                const headerButtons = window.page.getByRole('button', undefined, document.querySelector('header'));
                const lastHeaderButton = typeof headerButtons.last === 'function'
                    ? await headerButtons.last()
                    : headerButtons[headerButtons.length - 1];
                await lastHeaderButton.press('Enter');
                await window.page.getByRole('menuitem', { name: ['刪除討論串', '删除帖子', '投稿を削除', 'Delete Thread'] }).click();
                await window.page.getByRole('button', { name: ['確認', '确认', '確認', 'Confirm'] }).click();
            } catch (error) {
                console.warn('[FeloSearchHotkeys] 刪除討論串失敗：', error);
            }

            return;
        }

        // 按下 Ctrl+B 或 Command+B 快速切換側邊欄
        if (isCtrlOrMetaKeyPressed(event) && event.key === 'b') {
            // 找到 section 的 class 為「cursor-pointer」的元素
            const svg = document.querySelector('section.cursor-pointer svg');
            svg?.parentElement.click();
            event.preventDefault();
            return;
        }

        // 按下 Escape 就點擊 document.querySelector('img').click()
        if (!isCtrlOrMetaKeyPressed(event) && event.key === 'Escape') {
            // 如果有 [role='dialog'] 就不要觸發
            if (document.querySelector('[role="dialog"]')) {
                return;
            }

            // 如果是輸入欄位，就不要觸發
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
                if (event.target.value === '' && window.location.pathname.includes('/history')) {
                    // 只有在歷史紀錄頁面且搜尋欄位是空白時才會觸發
                    window.history.back();
                }
                if (event.target.value !== '') {
                    clearInputValue(event.target);
                }
                return;
            }

            // 在 contenteditable 編輯區或下拉選單中按 Esc，交還給網站與瀏覽器處理（例如關閉選單、取消編輯），
            // 不要直接回首頁，讓使用者打到一半的內容消失。
            if (event.target.isContentEditable || event.target.tagName === 'SELECT') {
                return;
            }

            let backdropBlur = document.querySelector('div.backdrop-blur-md');
            if (!backdropBlur) {
                goHome(); // 回首頁
                event.preventDefault();
                return;
            } else {
                backdropBlur?.parentElement?.querySelector('button')?.click();
            }
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
        // 如果元素是輸入欄位、文字區域或下拉選單，則處於輸入模式
        // （select 取得焦點時打字母會跳到對應選項，不應被單鍵快速鍵攔截）
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

    function isCtrlOrMetaKeyPressed(event) {
        return event.ctrlKey || event.metaKey;
    }

    // 除錯訊息開關；需要追查按鈕比對流程時再改成 true。
    const DEBUG = false;

    function debugLog(...args) {
        if (DEBUG) {
            console.log('[FeloSearchHotkeys]', ...args);
        }
    }

    /**
     * 清空輸入框的內容，並讓 React 同步更新它的 state。
     * Felo 的輸入框是 React 受控元件：直接指派 element.value = '' 只改了 DOM，React 的 state 仍是舊字串，
     * 下一次重新渲染或按 Enter 送出時舊內容又會回來。改用原型上的原生 value setter 寫入，
     * 再送出冒泡的 input 事件，React 才會把它視為使用者的輸入並同步 state。
     */
    function clearInputValue(element) {
        const proto = element.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
        const valueSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
        if (valueSetter) {
            valueSetter.call(element, '');
        } else {
            element.value = '';
        }
        element.dispatchEvent(new Event('input', { bubbles: true }));
    }

    // 記錄元素第一次被隱藏前的 inline display 值，切換回來時還原。
    const originalDisplays = new WeakMap();

    /**
     * 在 display:none 與元素原本的 inline display 之間切換；元素不存在時直接略過。
     * 取代舊版掛在 HTMLElement.prototype 上的 toggle()/show()/hide() 與 Array.prototype.last()：
     * 修改內建原型會影響同一個執行環境中的所有程式碼（包括 @require 進來的 playwright.js），
     * Array.prototype.last 以指派方式新增還是「可列舉」屬性，會出現在任何陣列的 for...in 迴圈中。
     * 原本記在元素自有屬性 existingStyleDisplay 的值改記在 WeakMap，切換行為完全相同。
     */
    function toggleDisplay(element) {
        if (!element) {
            return;
        }
        if (!originalDisplays.has(element)) {
            originalDisplays.set(element, element.style.display);
        }
        element.style.display = element.style.display === 'none' ? originalDisplays.get(element) : 'none';
    }

    function goHome() {
        // 找到第一個 img 元素並點擊 (Felo Logo)
        document.querySelector('img')?.click();
    }

    // 延遲函式
    async function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }



    async function clickButtonByText(buttonTexts) {

        // 以 WAIT_TIMEOUT = 0 快速探測按鈕是否存在，結束後一律恢復為 5000。
        // 舊版只在「找不到」的路徑恢復，成功點到按鈕就提早 return，WAIT_TIMEOUT 會一直停在 0；
        // 之後按 Ctrl+Delete 刪除討論串時，playwright.js 不會等待選單出現，刪除流程因此失敗。
        window.page.WAIT_TIMEOUT = 0;

        try {
            let btnLocator = window.page.getByRole('button', { name: buttonTexts });
            if (await btnLocator.isVisible()) {
                await btnLocator.click();
                return true;
            }

            // 某些按鈕並不是 button 的型態，所以只能比對文字去找
            btnLocator = window.page.getByText(buttonTexts, { exact: false });
            if (await btnLocator.isVisible()) {
                await btnLocator.click();
                return true;
            }
        } finally {
            window.page.WAIT_TIMEOUT = 5000;
        }

        return false;
    }

    async function toggle主要內容區() {
        window.page.WAIT_TIMEOUT = 0;

        let h1 = document.querySelectorAll('h1');
        let elements = Array.from(h1);
        if (elements.length == 0) {
            // 提早結束前也要恢復 WAIT_TIMEOUT：舊版在頁面沒有 h1 時直接 return，
            // WAIT_TIMEOUT 會一直停在 0（理由同 clickButtonByText）。
            window.page.WAIT_TIMEOUT = 5000;
            return;
        }

        elements.forEach((e) => {
            let parentNode = e?.closest('div.mb-6')?.parentElement?.children;
            if (!parentNode) return;

            let contentElements = Array.from(parentNode);

            let blockHeader = contentElements[0];
            // console.log('blockHeader', blockHeader);

            let blockAnswerDone = contentElements[1];
            toggleDisplay(blockAnswerDone);
            // console.log('blockMetadata', blockMetadata);

            let blockRelated = contentElements[contentElements.length - 1];
            // 不一定有 Related 區塊，如果有，那一定是 DIV 標籤
            if (blockRelated.tagName !== 'DIV') {
                blockRelated = undefined;
            }
            // console.log('blockRelated', blockRelated);

            let blockRelatedShift = blockRelated ? 0 : 1;
            let blockToolbar = contentElements[contentElements.length - 2 + blockRelatedShift];
            // console.log('blockToolbar', blockToolbar);

            let blockContent = contentElements[contentElements.length - 3 + blockRelatedShift];
            // console.log('blockContent', blockContent);

            // 不一定有心智圖
            let blockMindMap = contentElements[contentElements.length - 4 + blockRelatedShift];
            // console.log('blockMindMap', blockMindMap);

            if (!blockHeader || !blockAnswerDone || !blockContent || !blockToolbar) return;

            toggleDisplay(blockRelated);
            toggleDisplay(blockToolbar);
            if (blockMindMap !== blockAnswerDone) {
                toggleDisplay(blockMindMap);
            }
        });

        window.page.WAIT_TIMEOUT = 5000;
    }

})();
