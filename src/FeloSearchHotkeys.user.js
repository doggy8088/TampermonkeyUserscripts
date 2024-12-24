// ==UserScript==
// @name         Felo Search: 好用的鍵盤快速鍵集合
// @version      0.4.0
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
// ==/UserScript==

(async function () {
    'use strict';

    // 共用函式：根據按鈕文字內容點擊按鈕
    function clickButtonByText(buttonTexts) {
        const buttons = document.querySelectorAll('button');
        for (let i = 0; i < buttons.length; i++) {
            const button = buttons[i];
            if (buttonTexts.includes(button.textContent.trim())) {
                button.click();
                break;
            }
        }
    }

    document.addEventListener("keydown", async (event) => {

        // 從網址列取得 pathinfo
        const currentPath = window.location.pathname;

        if (event.key === "j") {
            // 如果是輸入欄位，就不要觸發。但是按下 alt+j 就可以觸發這個功能。
            if ((event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA" || event.target.isContentEditable) && !event.altKey) {
                return;
            }

            // 1. 從網址列取得 pathinfo
            const currentUrl = window.location.pathname;

            // 2. 找到和目前 pathinfo 一樣的超連結
            const matchingLink = document.querySelector(`a[href="${currentUrl}"]`);
            if (matchingLink) {
                // 找到下一個 link
                const nextLink = matchingLink?.closest('li')?.nextElementSibling?.querySelector('a')
                    ?? matchingLink?.closest('li')?.nextElementSibling?.nextElementSibling?.querySelector('a');
                if (nextLink) {
                    nextLink.parentElement.previousElementSibling.scrollIntoView();
                    nextLink.click();
                }
            } else {
                const firstLink = document.querySelector(`a[href*="/search/"]`);
                firstLink?.click();
            }
            event.preventDefault();
        }

        if (event.key === "k") {
            // 如果是輸入欄位，就不要觸發。但是按下 alt+k 就可以觸發這個功能。
            if ((event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA" || event.target.isContentEditable) && !event.altKey) {
                return;
            }

            // 1. 從網址列取得 pathinfo
            const currentUrl = window.location.pathname;

            // 2. 找到和目前 pathinfo 一樣的超連結
            const matchingLink = document.querySelector(`a[href="${currentUrl}"]`);
            const previousLink = matchingLink?.closest('li')?.previousElementSibling?.querySelector('a')
                ?? matchingLink?.closest('li')?.previousElementSibling?.previousElementSibling?.querySelector('a');
            if (previousLink) {
                previousLink.parentElement.previousElementSibling.scrollIntoView();
                previousLink.click();
            }
            event.preventDefault();
        }

        // 按下 Ctrl+Delete 快速刪除 Felo Search 聊天記錄
        if (event.ctrlKey && event.key === "Delete") {
            // 如果是輸入欄位，就不要觸發
            if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA" || event.target.isContentEditable) {
                return;
            }

            // 找到和目前 pathinfo 一樣的超連結
            const matchingLink = document.querySelector(`a[href="${currentPath}"]`);
            const nextLink = matchingLink?.closest('li').nextElementSibling.querySelector('a')
                ?? matchingLink?.closest('li').nextElementSibling.nextElementSibling.querySelector('a');

            // 找到超連結的下一個同層的 section 元素
            const nextSection = matchingLink?.nextElementSibling;
            // 找到下一層的 button 按鈕
            const button = nextSection.querySelector("button");
            button?.click();

            await delay(200); // 加入一點延遲來模擬真實打字過程

            // 找到一個按鈕其內容為「確認」，用迴圈去跑，找出 textContent 為「確認」的按鈕
            const confirmButton = document.querySelectorAll('button');
            confirmButton.forEach(async (button) => {
                if (button.textContent.trim() === "確認") {
                    button.click();

                    // 刪除後點擊到下一個連結
                    await delay(200);
                    nextLink?.click();
                }
            });
            event.preventDefault();
        }

        // 按下 Ctrl+B 快速切換側邊欄
        if (event.ctrlKey && event.key === "b") {
            // 找到 section 的 class 為「cursor-pointer」的元素
            const svg = document.querySelector('section.cursor-pointer svg');
            svg?.parentElement.click();
            event.preventDefault();
        }

        // 按下 Escape 就點擊 document.querySelector('img').click()
        if (event.key === "Escape") {
            // 如果是輸入欄位，就不要觸發
            if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA" || event.target.isContentEditable) {
                if (event.target.value === '' && currentPath.includes("/history")) {
                    // 只有在歷史紀錄頁面且搜尋欄位是空白時才會觸發
                    window.history.back();
                }
                if (event.target.value !== '') {
                    event.target.value = '';
                }
                return;
            }
            // 找到第一個 img 元素並點擊 (Felo Logo)
            document.querySelector('img')?.click();
            event.preventDefault();
        }

        // 按下 Alt+/ 就先找出所有 button 元素，比對元素內容，如果為「歷史紀錄」就點擊它
        if (event.altKey && event.key === "/") {
            clickButtonByText(["歷史記錄", "历史记录", "履歴記録", "History"]);
            event.preventDefault();
        }

        // 按下 Alt+t 就先找出所有 button 元素，比對元素內容，如果為「主題集」就點擊它
        if (event.altKey && event.key === "t") {
            clickButtonByText(["主題集", "主题集", "トピック集", "Topic Collections"]);
            event.preventDefault();
        }

        // 按下 Alt+s 就先找出所有 button 元素，比對元素內容，如果為「分享」就點擊它
        if (event.altKey && event.key === "s") {
            clickButtonByText(["分享", "分享", "共有する", "Share"]);
            event.preventDefault();
        }

    });

    // 延遲函式
    async function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

})();
