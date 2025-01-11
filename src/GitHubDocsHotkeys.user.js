// ==UserScript==
// @name         GitHub Docs: 好用的鍵盤快速鍵集合
// @version      0.1.0
// @description  按下 f 可以快速隱藏 GitHub 網站中所有非主要內容的區塊
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/GitHubDocsHotkeys.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/GitHubDocsHotkeys.user.js
// @author       Will Huang
// @match        https://docs.github.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=github.com
// ==/UserScript==

(async function () {
    'use strict';

    document.addEventListener('keydown', async (event) => {

        // 從網址列取得 pathinfo
        const currentPath = window.location.pathname;

        if (!event.ctrlKey && event.key === 'f') {
            // 如果是輸入欄位，就不要觸發。但是按下 alt+j 就可以觸發這個功能。
            if ((event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') && !event.altKey) {
                return;
            }

            const selectors = [
                '[data-container="header"]',
                '[data-container="nav"]',
                '[data-container="toc"]',
                '[data-container="footer"]'
            ];

            selectors.forEach((selector) => {
                document.querySelectorAll(selector).forEach((element) => {
                    element.toggleAttribute('hidden');
                });
            });
            event.preventDefault();
        }
    });

    // 延遲函式
    async function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

})();
