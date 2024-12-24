// ==UserScript==
// @name         Facebook: 好用的鍵盤快速鍵集合
// @version      0.2.0
// @description  按下 Ctrl+B 快速切換側邊欄
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/FacebookHotkeys.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/FacebookHotkeys.user.js
// @author       Will Huang
// @match        https://www.facebook.com/*
// @match        https://facebook.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=facebook.com
// ==/UserScript==

(function () {
    'use strict';

    function toggleSidebar() {
        document.querySelector('div[aria-label="隱藏功能表"],div[aria-label="顯示功能表"]')?.click();
    }

    // 當頁面載入後，先執行一次 ctrl+b 操作
    window.addEventListener('load', toggleSidebar);

    document.addEventListener("keydown", (event) => {
        // 按下 Ctrl+B 快速切換側邊欄
        if (event.ctrlKey && event.key === "b") {
            toggleSidebar();
        }
    });

})();
