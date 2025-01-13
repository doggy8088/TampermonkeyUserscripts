// ==UserScript==
// @name         Facebook: 好用的鍵盤快速鍵集合
// @version      0.4.0
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
// @run-at       document-end
// @icon         https://www.google.com/s2/favicons?sz=64&domain=facebook.com
// @require      https://doggy8088.github.io/playwright-js/src/playwright.js
// ==/UserScript==

(function () {
    'use strict';

    // 當頁面載入後，先執行一次 ctrl+b 操作
    window.addEventListener('load', toggleSidebar);

    document.addEventListener("keydown", async (event) => {
        // 按下 Ctrl+B 快速切換側邊欄
        if (event.ctrlKey && !event.altKey && event.key === "b") {
            // 只有粉絲團的 Sidebar 沒有找到才去隱藏其他的側邊欄
            // 因為只有粉絲團的 Sidebar 有切換顯示的按鈕
            toggleSidebar() || await toggleSidebarByNavigation();
        }
        // 按下 Alt+B 會封鎖目前使用者
        if (!event.ctrlKey && event.altKey && event.key === "b") {
            await window.page.getByText('檢舉留言').click();
            await window.page.getByText('詐騙、詐欺或不實資訊').click();
            await window.page.getByText('垃圾訊息').click();
            await window.page.getByText('完成').click();
        }
    });

    function toggleSidebar() {
        var dom = document.querySelector('div[aria-label="隱藏功能表"],div[aria-label="顯示功能表"]')
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

})();
