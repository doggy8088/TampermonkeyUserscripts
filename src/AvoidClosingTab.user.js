// ==UserScript==
// @name         防止避免意外關閉頁籤
// @version      1.0
// @description  避免特定網站會被意外使用 ctrl-w 關閉頁籤
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/AvoidClosingTab.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/AvoidClosingTab.user.js
// @author       Will Huang
// @match        https://*.github.dev/*
// @match        https://*.scm.azurewebsites.net/dev/*
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';
    window.addEventListener('beforeunload', function (e) {
        // Cancel the event
        e.preventDefault(); // If you prevent default behavior in Mozilla Firefox prompt will always be shown
        // Chrome requires returnValue to be set
        e.returnValue = '';
    });
})();
