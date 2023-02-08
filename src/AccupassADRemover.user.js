// ==UserScript==
// @name         Accupass: 刪除活動頁面的漂浮廣告
// @version      1.0
// @description  刪除 Accupass 前台活動頁的漂浮廣告
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/AccupassADRemover.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/AccupassADRemover.user.js
// @author       Will Huang
// @match        https://www.accupass.com/event/*
// @run-at       document-body
// ==/UserScript==

(function() {
    'use strict';

    var timer = 3 * 1000; // seconds

    var checker = setInterval(() => {
        var elm = document.querySelector('div[class*="close-button"]');
        if (elm) {
            elm.parentElement.parentElement.remove();
            clearInterval(checker);
        }
    }, 500);

    setTimeout(() => {
        clearInterval(checker);
    }, timer);

})();
