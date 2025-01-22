// ==UserScript==
// @name         Felo Search: 好用的鍵盤快速鍵集合
// @version      0.9.0
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

            clickButtonByText(['歷史記錄', '历史记录', '履歴記録', 'History']);
            event.preventDefault();
        }

        // 按下 f 就隱藏所有不必要的元素
        if (!event.ctrlKey && !event.altKey && event.key === 'f') {
            if ((event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA')) {
                return;
            }

            await toggle追問區();
            await toggle標題下的Metadata();
            // await toggle回答完成();
            await toggle資料來源();
            await toggle相關提問();

            event.preventDefault();
        }

        // 按下 Alt+t 就先找出所有 button 元素，比對元素內容，如果為「主題集」就點擊它
        if (!event.ctrlKey && event.key === 't') {
            // 如果是輸入欄位，就不要觸發。但是按下 alt+t 就可以觸發這個功能。
            if ((event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') && !event.altKey) {
                return;
            }

            clickButtonByText(['主題集', '主题集', 'トピック集', 'Topic Collections']);
            event.preventDefault();
        }

        // 按下 Alt+s 就先找出所有 button 元素，比對元素內容，如果為「分享」就點擊它
        if (!event.ctrlKey && event.key === 's') {
            // 如果是輸入欄位，就不要觸發。但是按下 alt+s 就可以觸發這個功能。
            if ((event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') && !event.altKey) {
                return;
            }

            clickButtonByText(['分享', '分享', '共有する', 'Share']);
            event.preventDefault();
        }

        // 按下 Alt+c 就先找出所有包含 [tabindex] 屬性的元素，比對元素內容，如果為「建立主題」就點擊它
        if (!event.ctrlKey && event.key === 'c') {
            // 如果是輸入欄位，就不要觸發。但是按下 alt+c 就可以觸發這個功能。
            if ((event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') && !event.altKey) {
                return;
            }

            clickButtonByText(['建立主題', '建立主题', 'トピックを作成', 'Create topic']);
            event.preventDefault();
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
        }

        // 按下 Ctrl+B 快速切換側邊欄
        if (event.ctrlKey && event.key === 'b') {
            // 找到 section 的 class 為「cursor-pointer」的元素
            const svg = document.querySelector('section.cursor-pointer svg');
            svg?.parentElement.click();
            event.preventDefault();
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
            } else {
                backdropBlur?.parentElement?.querySelector('button')?.click();
            }
        }
    });

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
        }

        btnLocator = window.page.getByText(buttonTexts, { exact: false });
        if (await btnLocator.isVisible()) {
            await btnLocator.click();
        }

        window.page.WAIT_TIMEOUT = 5000;
    }


    async function toggle標題下的Metadata() {
        window.page.WAIT_TIMEOUT = 0;

        let h1 = document.querySelectorAll('h1');
        let elements = Array.from(h1);

        elements.forEach((e) => {
            // 標題下的Metadata
            let sectionStyle = e.parentElement.nextElementSibling.style;
            if (!sectionStyle) return;

            if (sectionStyle.display === 'none') {
                sectionStyle.display = 'block';
            } else {
                sectionStyle.display = 'none';
            }

            // 回答完成
            sectionStyle = e.parentElement.parentElement.nextElementSibling.style;
            if (!sectionStyle) return;

            if (sectionStyle.display === 'none') {
                sectionStyle.display = 'block';
            } else {
                sectionStyle.display = 'none';
            }
        });

        window.page.WAIT_TIMEOUT = 5000;
    }

    async function toggle回答完成() {
        window.page.WAIT_TIMEOUT = 0;

        let answerDone = window.page.getByText('回答完成', { exact: true });

        let elements = await answerDone.all()

        elements.forEach((e) => {
            let sectionStyle = e.closest('div.mb-6').style;
            if (!sectionStyle) return;

            if (sectionStyle.display === 'none') {
                sectionStyle.display = 'block';
            } else {
                sectionStyle.display = 'none';
            }
        });

        window.page.WAIT_TIMEOUT = 5000;
    }

    async function toggle資料來源() {
        window.page.WAIT_TIMEOUT = 0;

        let elmDataSource = window.page.getByRole('generic', { name: '資料來源', exact: true });
        let elements = await elmDataSource.all()

        elements.forEach((e) => {
            let sectionStyle = e.parentElement.parentElement.style;
            if (!sectionStyle) return;

            if (sectionStyle.display === 'none') {
                sectionStyle.display = 'block';
            } else {
                sectionStyle.display = 'none';
            }
        });

        window.page.WAIT_TIMEOUT = 5000;
    }

    async function toggle追問區() {
        let sectionStyle = document.querySelector('main header')?.nextElementSibling?.children[1]?.style;
        if (!sectionStyle) return;

        if (sectionStyle.display === 'none') {
            sectionStyle.display = 'block';
        } else {
            sectionStyle.display = 'none';
        }
    }

    async function toggle相關提問() {
        window.page.WAIT_TIMEOUT = 0;

        let btnRewrite = window.page.getByRole('button', { name: '重寫', exact: true });
        let elements = await btnRewrite.all()

        elements.forEach((e) => {
            let sectionStyle = e.parentElement.parentElement.nextElementSibling.style;
            if (!sectionStyle) return;

            if (sectionStyle.display === 'none') {
                sectionStyle.display = 'block';
            } else {
                sectionStyle.display = 'none';
            }

            sectionStyle = e.parentElement.parentElement.style;
            if (!sectionStyle) return;

            if (sectionStyle.display === 'none') {
                sectionStyle.display = 'block';
            } else {
                sectionStyle.display = 'none';
            }
        });

        window.page.WAIT_TIMEOUT = 5000;
    }

})();
