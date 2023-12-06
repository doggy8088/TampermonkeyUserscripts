// ==UserScript==
// @name         Accupass: 刪除活動頁面的漂浮廣告
// @version      1.2
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
// ==/UserScript==

(function() {
    'use strict';

    var css = `div[class*="download-app-container"] { display: none; }`;

    var style = document.createElement("style");
    style.innerHTML = css
    document.head.appendChild(style);

})();
