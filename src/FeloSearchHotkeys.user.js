// ==UserScript==
// @name         Felo Search: 好用的鍵盤快速鍵集合
// @version      0.1.0
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

    document.addEventListener("keydown", async (event) => {

        if (event.key === "j") {
            // 如果是輸入欄位，就不要觸發
            if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA") {
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
                    nextLink.scrollIntoView();
                    nextLink.click();
                }
            } else {
                const firstLink = document.querySelector(`a[href^="/search/"]`);
                firstLink?.click();
            }
        }

        if (event.key === "k") {
            // 如果是輸入欄位，就不要觸發
            if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA") {
                return;
            }

            // 1. 從網址列取得 pathinfo
            const currentUrl = window.location.pathname;

            // 2. 找到和目前 pathinfo 一樣的超連結
            const matchingLink = document.querySelector(`a[href="${currentUrl}"]`);
            if (matchingLink) {
                // 找到下一個 link
                const previousLink = matchingLink?.closest('li')?.previousElementSibling?.querySelector('a')
                    ?? matchingLink?.closest('li')?.previousElementSibling?.previousElementSibling?.querySelector('a');
                if (previousLink) {
                    previousLink.scrollIntoView();
                    previousLink.click();
                }
            }
        }

        // 按下 Ctrl+Delete 快速刪除 Felo Search 聊天記錄
        if (event.ctrlKey && event.key === "Delete") {
            console.log("Ctrl + Delete detected. Starting delete process...");

            // 1. 從網址列取得 pathinfo
            const currentUrl = window.location.pathname;

            // 2. 找到和目前 pathinfo 一樣的超連結
            const matchingLink = document.querySelector(`a[href="${currentUrl}"]`);
            if (matchingLink) {

                // 找到下一個 link
                const nextLink = matchingLink.closest('li').nextElementSibling.querySelector('a')
                    ?? matchingLink.closest('li').nextElementSibling.nextElementSibling.querySelector('a');

                // 找到超連結的下一個同層的 section 元素
                const nextSection = matchingLink.nextElementSibling;
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

            } else {
                console.error("找不到符合條件的超連結");
            }
        }

        // 按下 Ctrl+B 快速切換側邊欄
        if (event.ctrlKey && event.key === "b") {
            console.log("Ctrl + B detected. Clicking close sidebar button...");

            // 找到 section 的 class 為「cursor-pointer」的元素
            const svg = document.querySelector('section.cursor-pointer svg');
            if (svg) {
                svg.parentElement.click();
            } else {
                console.error("找不到切換側邊欄的按鈕");
            }
        }
    });

    // 延遲函式
    async function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

})();
