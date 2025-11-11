// ==UserScript==
// @name         GitHub: 提升使用者體驗的小工具集合
// @version      0.1.0
// @description  主要用來改善 GitHub 網站的使用者體驗
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/GitHubUxEnhancer.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/GitHubUxEnhancer.user.js
// @author       Will Huang
// @match        https://github.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=github.com
// ==/UserScript==

(async function () {
    'use strict';

    // 自動聚焦到儲存庫篩選輸入框
    function focusRepositoriesFilter() {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.has('tab') && urlParams.get('tab') === 'repositories') {
            const filterInput = document.getElementById('your-repos-filter');
            if (filterInput) {
                filterInput.focus();
            }
        }
    }

    // 初始執行
    focusRepositoriesFilter();

    // 偵測網址變更
    let lastUrl = location.href;
    new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            // 延遲執行以確保 DOM 已更新
            setTimeout(focusRepositoriesFilter, 100);
        }
    }).observe(document, { subtree: true, childList: true });

})();
