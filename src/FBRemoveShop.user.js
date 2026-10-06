// ==UserScript==
// @name         Facebook: 移除「商店」按鈕
// @version      1.0.1
// @description  移除 FB 畫面上方的「商店」按鈕（上面全部都是色情廣告）
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/RemoveFBShopButton.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/RemoveFBShopButton.user.js
// @author       Will Huang
// @match        *://www.facebook.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // 頂部導覽列「商店」按鈕的超連結。完全沿用舊版以 aria-label 定位的條件，
    // 只是把屬性值加上引號，比對結果與舊版的 a[aria-label=Marketplace] 相同。
    const MARKETPLACE_LINK_SELECTOR = 'a[aria-label="Marketplace"]';

    // Facebook 每秒可能產生大量 DOM 變動，這裡刻意用「最多每 500ms 檢查一次」的節流方式，
    // 與舊版 setInterval(500) 的反應速度相同，但只有 DOM 真的有變動時才會檢查。
    const CHECK_THROTTLE_MS = 500;

    // 記住已經隱藏的元素，讓之後的檢查在 O(1) 內結束：
    // 只要它還在 DOM 中而且仍是隱藏狀態，就不需要再對整頁做 querySelector。
    let hiddenItem = null;
    let checkTimer = 0;

    function hideMarketplaceButton() {
        checkTimer = 0;

        if (hiddenItem?.isConnected && hiddenItem.style.visibility === 'hidden') return;

        const link = document.querySelector(MARKETPLACE_LINK_SELECTOR);
        if (!link) return;

        // 隱藏整個 <li> 才不會留下按鈕外框；若 Facebook 改版後按鈕不再包在 <li> 裡，
        // 退而隱藏超連結本身，避免像舊版一樣因 closest('li') 為 null 而每 500ms 丟一次 TypeError。
        // 使用 visibility 而不是 display:none，是為了保留原本的版面寬度，不讓頂部其他按鈕位移。
        const item = link.closest('li') || link;
        item.style.visibility = 'hidden';
        hiddenItem = item;
    }

    function scheduleCheck() {
        if (checkTimer) return;
        checkTimer = setTimeout(hideMarketplaceButton, CHECK_THROTTLE_MS);
    }

    hideMarketplaceButton();

    // 舊版以 setInterval 每 500ms 輪詢，找不到按鈕（例如帳號沒有 Marketplace、或 Facebook 改版）時會永遠輪詢下去；
    // 找到並隱藏一次後又立刻停止，Facebook 這個 SPA 之後若重繪頂部導覽列，按鈕就會再次出現。
    // 改用 MutationObserver：只在 DOM 有變動時才節流檢查，並在導覽列被重繪後重新隱藏。
    new MutationObserver(scheduleCheck).observe(document.body, { childList: true, subtree: true });

})();
