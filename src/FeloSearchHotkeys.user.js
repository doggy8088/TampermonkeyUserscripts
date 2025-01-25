// ==UserScript==
// @name         Felo Search: 好用的鍵盤快速鍵集合
// @version      0.10.0
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
// @grant        none
// ==/UserScript==

(async function () {
    'use strict';

    document.addEventListener('keydown', async (event) => {

        // 從網址列取得 pathinfo
        const currentPath = window.location.pathname;

        if (!event.ctrlKey && event.key === 'j') {
            // 如果是輸入欄位，就不要觸發。但是按下 alt+j 就可以觸發這個功能。
            if ((event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') && !event.altKey) {
                return;
            }

            // 1. 從網址列取得 pathinfo
            const currentUrl = window.location.pathname;

            // 2. 找到和目前 pathinfo 一樣的超連結
            const matchingLink = document.querySelector(`a[href='${currentUrl}']`);
            if (matchingLink) {
                // 找到下一個 link
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

        if (!event.ctrlKey && event.key === 'k') {
            // 如果是輸入欄位，就不要觸發。但是按下 alt+k 就可以觸發這個功能。
            if ((event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') && !event.altKey) {
                return;
            }

            // 1. 從網址列取得 pathinfo
            const currentUrl = window.location.pathname;

            // 2. 找到和目前 pathinfo 一樣的超連結
            const matchingLink = document.querySelector(`a[href='${currentUrl}']`);
            const previousLink = matchingLink?.closest('li')?.previousElementSibling?.querySelector('a')
                ?? matchingLink?.closest('li')?.previousElementSibling?.previousElementSibling?.querySelector('a');
            if (previousLink) {
                previousLink.parentElement.previousElementSibling.scrollIntoView();
                previousLink.click();
            }
            event.preventDefault();
        }

        // 按下 Alt+/ 就先找出所有 button 元素，比對元素內容，如果為「歷史紀錄」就點擊它
        if (!event.ctrlKey && event.key === '/') {
            // 如果是輸入欄位，就不要觸發。但是按下 alt+/ 就可以觸發這個功能。
            if ((event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') && !event.altKey) {
                return;
            }

            if (!await clickButtonByText(['歷史記錄', '历史记录', '履歴記録', 'History'])) {
                location.href = '/history';
            }
            event.preventDefault();
        }

        // 按下 f 就隱藏所有不必要的元素
        if (!isInInputMode(event) && !event.ctrlKey && !event.altKey && event.key === 'f') {
            // Toggle 頁首
            document.querySelector('header')?.toggle();
            // Toggle 側邊欄
            document.querySelector('aside')?.toggle();

            // Toggle 文章註腳
            Array.from(document.querySelectorAll('span.footnote-ref')).forEach((e) => {
                e.toggle();
            });

            let main = document.querySelector('main');
            if (!main) return;

            // Toggle 追問區
            Array.from(main.children).last()?.children?.[1]?.toggle();

            // Toggle 資料來源
            main.children[1]?.children[0]?.children[0]?.children[1]?.toggle();

            await toggle主要內容區();

            event.preventDefault();
        }

        // 按下 Alt+t 就先找出所有 button 元素，比對元素內容，如果為「主題集」就點擊它
        if (!isInInputMode(event) && !event.ctrlKey && !event.altKey && event.key === 't') {
            console.log('Click on 主題集');
            if (!await clickButtonByText(['主題集', '主题集', 'トピック集', 'Topic Collections'])) {
                console.log('Unable to click on 主題集, Redirecting to /topic');
                location.href = '/topic';
            }
            event.preventDefault();
            return;
        }

        // 按下 Alt+s 就先找出所有 button 元素，比對元素內容，如果為「分享」就點擊它
        if (!event.ctrlKey && event.key === 's') {
            // 如果是輸入欄位，就不要觸發。但是按下 alt+s 就可以觸發這個功能。
            if ((event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') && !event.altKey) {
                return;
            }

            await clickButtonByText(['分享', '分享', '共有する', 'Share']);
            event.preventDefault();
            return;
        }

        // 按下 c 就點擊「建立主題」按鈕
        if (!isInInputMode(event) && !event.ctrlKey && !event.altKey && event.key === 'c') {
            await clickButtonByText(['建立主題', '建立主题', 'トピックを作成', 'Create topic']);
            event.preventDefault();
            return;
        }

        // 按下 Ctrl+Delete 快速刪除 Felo Search 聊天記錄
        if (event.ctrlKey && event.key === 'Delete') {
            // 如果是輸入欄位，就不要觸發
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
                return;
            }

            await (await window.page.getByRole('button', undefined, document.querySelector('header')).last()).press('Enter');
            await window.page.getByRole('menuitem', { name: ['刪除討論串', '删除帖子', '投稿を削除', 'Delete Thread'] }).click();
            await window.page.getByRole('button', { name: ['確認', '确认', '確認', 'Confirm'] }).click()

            event.preventDefault();
            return;
        }

        // 按下 Ctrl+B 快速切換側邊欄
        if (event.ctrlKey && event.key === 'b') {
            // 找到 section 的 class 為「cursor-pointer」的元素
            const svg = document.querySelector('section.cursor-pointer svg');
            svg?.parentElement.click();
            event.preventDefault();
            return;
        }

        // 按下 Escape 就點擊 document.querySelector('img').click()
        if (!event.ctrlKey && event.key === 'Escape') {
            // 如果有 [role='dialog'] 就不要觸發
            if (document.querySelector('[role="dialog"]')) {
                return;
            }

            // 如果是輸入欄位，就不要觸發
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
                if (event.target.value === '' && currentPath.includes('/history')) {
                    // 只有在歷史紀錄頁面且搜尋欄位是空白時才會觸發
                    window.history.back();
                }
                if (event.target.value !== '') {
                    event.target.value = '';
                }
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

    function isInInputMode(event) {
        var element = event.target;
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
            return true;
        }
        if (element.isContentEditable) {
            return true;
        }
        return false;
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

        window.page.WAIT_TIMEOUT = 0;

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

        window.page.WAIT_TIMEOUT = 5000;

        return false;
    }

    window.HTMLElement.prototype.show = function () {
        this.style.display = 'block';
    }

    window.HTMLElement.prototype.hide = function () {
        this.style.display = 'none';
    }

    window.HTMLElement.prototype.toggle = function () {
        // 判斷 this.existingStyleDisplay 屬性是否存在，如果不存在就設定為 this.style.display
        if (!this.hasOwnProperty('existingStyleDisplay')) {
            this.existingStyleDisplay = this.style.display;
        }

        // 設定 this.style.display 要跟 this.existingStyleDisplay 與 none 之間做切換
        this.style.display = this.style.display === 'none' ? this.existingStyleDisplay : 'none';
    }

    window.Array.prototype.last = function () {
        return this[this.length - 1];
    }

    async function toggle主要內容區() {
        window.page.WAIT_TIMEOUT = 0;

        let h1 = document.querySelectorAll('h1');
        let elements = Array.from(h1);
        if (elements.length == 0) return;

        elements.forEach((e) => {
            let parentNode = e?.closest('div.mb-6')?.parentElement.children;
            if (!parentNode) return;

            let contentElements = Array.from(parentNode);

            let blockHeader = contentElements[0];
            // console.log('blockHeader', blockHeader);
            let blockMetadata = contentElements[1];
            // console.log('blockMetadata', blockMetadata);

            // 不一定有心智圖
            let blockMindMap = contentElements[contentElements.length - 4];
            // console.log('blockMindMap', blockMindMap);
            if (blockMindMap !== blockMetadata) {
                blockMindMap?.toggle();
            }

            let blockContent = contentElements[contentElements.length - 3];
            // console.log('blockContent', blockContent);
            let blockToolbar = contentElements[contentElements.length - 2];
            // console.log('blockToolbar', blockToolbar);
            if (!blockHeader || !blockMetadata || !blockContent || !blockToolbar) return;
            let blockRelated = contentElements[contentElements.length - 1];
            // console.log('blockRelated', blockRelated);


            blockMetadata.toggle();
            blockToolbar.toggle();

            blockRelated?.toggle();
        });

        window.page.WAIT_TIMEOUT = 5000;
    }

})();
