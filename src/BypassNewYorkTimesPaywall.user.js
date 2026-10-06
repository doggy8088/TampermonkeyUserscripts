// ==UserScript==
// @name         NYTimes: 移除 New York Times 閱讀新聞時的付款提示畫面
// @version      1.0.1
// @description  移除看 New York Times 新聞時的付款提示畫面
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/BypassNewYorkTimesPaywall.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/BypassNewYorkTimesPaywall.user.js
// @author       Will Huang
// @match        https://www.nytimes.com/*
// @run-at       document-body
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    var css = `
    #bottom-wrapper, #gateway-content, #top-wrapper, .ad, #dfp-ad-top {
        display: none !important;
    }
`;

    var style = document.createElement("style");
    // 以 textContent 寫入純文字 CSS：不需要經過 HTML 解析，也不會被啟用 Trusted Types 的頁面視為
    // 危險的 innerHTML 指派而丟出例外；產生的樣式內容與舊版 innerHTML 完全相同。
    style.textContent = css;
    // document-body 時機理論上 head 已存在，但若網站以腳本重建文件或 head 尚未建立，
    // 退回掛在 <html> 上，避免 document.head 為 null 時丟出 TypeError 導致樣式完全沒有套用。
    (document.head || document.documentElement).appendChild(style);

})();
