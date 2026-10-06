// ==UserScript==
// @name         Power Automate: 調整顯示名稱的欄位寬度
// @version      1.0.1
// @description  將 Flows 的 Name 欄位調整到 750px 寬度，讓標題可以完整顯示在畫面上
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/MSPowerAutomateNameWidth.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/MSPowerAutomateNameWidth.user.js
// @author       Will Huang
// @match        https://make.powerautomate.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    const fixedWidth = '750px';

    // 本影格是否已排定要調整欄寬
    let isScheduled = false;

    function applyFixedWidth() {
        isScheduled = false;
        // [data-automation-key] 是清單中每一列的 Name 儲存格，[data-item-key] 是欄位標題；
        // 兩者都出現（清單已渲染完成）才調整，避免只改到其中一邊造成標題與內容錯位。
        var key1 = document.querySelectorAll('[data-automation-key="displayName"]');
        var key2 = document.querySelectorAll('[data-item-key="displayName"]');
        if (key1.length > 0 && key2.length > 0) {
            // 已經是目標寬度的元素不再重設，避免每次都改寫 style 屬性、觸發不必要的樣式重算。
            key1.forEach(elm => { if (elm.style.width !== fixedWidth) elm.style.width = fixedWidth; });
            key2.forEach(elm => { if (elm.style.width !== fixedWidth) elm.style.width = fixedWidth; });
        }
    }

    // https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver
    // Power Automate 是 React SPA，一次渲染就會產生大量 mutation 批次。原本每個批次都對整份文件
    // 查詢兩次並改寫所有儲存格的寬度；改為以 requestAnimationFrame 合併，同一個影格最多只處理一次。
    // rAF 回呼會在瀏覽器繪製下一個畫面之前執行，因此新渲染的列仍會在顯示前就套用寬度，不會閃爍。
    const observer = new MutationObserver(() => {
        if (isScheduled) return;
        isScheduled = true;
        requestAnimationFrame(applyFixedWidth);
    });

    // document-idle 時 #root 理應已存在；萬一頁面結構改變找不到 #root，原本 observe(null) 會丟出
    // TypeError 讓整支腳本失效，改為退而觀察 document.body。
    observer.observe(document.querySelector('#root') || document.body, { childList: true, subtree: true });

})();
