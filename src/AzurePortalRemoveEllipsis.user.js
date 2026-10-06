// ==UserScript==
// @name         Azure Portal: 移除所有會出現 ... 的樣式
// @version      1.2.1
// @description  移除在 Azure Portal 之中所有會出現 ... 的樣式，尤其是看帳單的時候不要顯示有 ... 的數字
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/AzurePortalRemoveEllipsis.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/AzurePortalRemoveEllipsis.user.js
// @author       Will Huang
// @match        *://portal.azure.com/*
// @match        *://*.azure.net/*
// @run-at       document-idle
// @icon         https://www.google.com/s2/favicons?sz=64&domain=portal.azure.com
// @grant        none
// ==/UserScript==

(function () {
    'use strict';
    var debug = false;

    // 會讓文字被截斷成「...」的 class 名稱
    var ellipsisClassNames = ['ellipsis', 'msportalfx-text-ellipsis'];

    // 合併成單一選擇器，一次查詢就能找出兩種 class，不必分兩次掃描整份文件再串接陣列。
    var ellipsisSelector = ellipsisClassNames.map(function (name) { return '.' + name; }).join(', ');

    function removeEllipsis() {
        var all = document.querySelectorAll(ellipsisSelector);
        if (all.length > 0) {
            debug && console.log(`Found ${all.length} items. Remove all of the .ellipsis className`);
            all.forEach(elm => {
                debug && console.log(`  Removing `, elm);
                elm.classList.remove(...ellipsisClassNames);
            });
        }
    }

    // 刻意維持每秒輪詢，而不改用 MutationObserver：Azure Portal 的畫面會不斷重新渲染，class 可能
    // 隨時被框架加回去；若以觀察器即時移除，容易和框架的綁定互相觸發。輪詢簡單可靠，單次查詢成本也很低。
    //
    // 但這支腳本會在 Azure Portal 本身與所有 *.azure.net 的擴充功能 iframe 中各跑一份，
    // 分頁在背景時沒有人看得到畫面，因此背景時跳過掃描以節省 CPU。
    //
    // 載入時先立即處理一次，不必等第一個一秒的輪詢間隔。
    removeEllipsis();
    setInterval(() => {
        if (document.hidden) return;
        removeEllipsis();
    }, 1000);

    // 分頁切回前景時立即處理一次，不必等下一次輪詢，避免切回來的瞬間看到被截斷的數字。
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) removeEllipsis();
    });
})();
