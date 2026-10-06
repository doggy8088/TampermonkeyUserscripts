// ==UserScript==
// @name         Accupass: 刪除活動頁面的漂浮廣告
// @version      1.2.1
// @description  刪除 Accupass 前台活動頁的漂浮廣告
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/AccupassADRemover.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/AccupassADRemover.user.js
// @author       Will Huang
// @match        https://www.accupass.com/*
// @run-at       document-body
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    var css = `div[class*="download-app-container"] { display: none; }`;

    // 用 textContent 寫入 CSS：內容是純文字，不需要經過 HTML 解析器，
    // 也不會在啟用 Trusted Types 的頁面上因為指派 innerHTML 而丟出例外
    var style = document.createElement("style");
    style.textContent = css;
    // @run-at document-body 時 <head> 通常已存在；保險起見在缺少 <head> 時改掛到 <html> 底下，避免 null 存取錯誤
    (document.head || document.documentElement).appendChild(style);

})();
