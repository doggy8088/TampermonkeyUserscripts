// ==UserScript==
// @name         Facebook: 好用的鍵盤快速鍵集合
// @version      0.6.0
// @description  按下 Ctrl+B 快速切換側邊欄、Ctrl+I 檢舉留言、Ctrl+Delete 刪除留言、Alt+B 快速封鎖使用者
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

// TODO: 當使用者按下「檢舉留言」時，不用確認，直接幫我檢舉、封鎖、刪除
// TODO: 當使用者按下「刪除」時，不用確認，直接幫我刪除

(function () {
    'use strict';

    // 當頁面載入後，先執行一次 ctrl+b 操作
    window.addEventListener('load', toggleSidebar);

    document.addEventListener("keydown", async (event) => {

        if (!isInInputMode(event) && !event.ctrlKey && !event.altKey && event.key === "f") {
            // 只有粉絲團的 Sidebar 沒有找到才去隱藏其他的側邊欄
            // 因為只有粉絲團的 Sidebar 有切換顯示的按鈕
            toggleSidebar() || await toggleSidebarByNavigation();
            event.preventDefault();
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
        if (!event.ctrlKey && event.altKey && event.key === "b") {

            window.page.WAIT_TIMEOUT = 0;
            if (await window.page.getByRole('button', { name: '查看選項' }).isVisible()) {
                window.page.WAIT_TIMEOUT = 5000;

                await window.page.getByRole('button', { name: '查看選項' }).click();
                await delay(1000);
                await window.page.getByRole('menuitem', { name: '封鎖' }).click();

                // 封鎖趙清涵和對方可能建立的新個人檔案
                await delay(1000);
                var blockNew1 = await window.page.getByText('和對方可能建立的新個人檔案').all();
                document.querySelector(`[aria-labelledby="${blockNew1[0].id}"]`)?.click();

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

    // 延遲函式
    async function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

})();
