// ==UserScript==
// @name         防止避免意外關閉頁籤
// @version      2.0
// @description  避免特定網站會被意外使用 ctrl-w 關閉頁籤
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/AvoidClosingTab.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/AvoidClosingTab.user.js
// @author       Will Huang
// @match        https://*.github.dev/*
// @match        https://*.scm.azurewebsites.net/dev/*
// @match        https://meet.google.com/*
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    window.addEventListener('keydown', function (e) {
        if ((e.ctrlKey || e.metaKey) && (e.key === 'w' || e.key === 'W')) {
            e.preventDefault();
            e.stopPropagation();
            // alert('已停用 Ctrl+W 快捷鍵，避免意外關閉頁籤。');
        }
    });

    window.addEventListener('beforeunload', function (e) {
        // Cancel the event
        e.preventDefault(); // If you prevent default behavior in Mozilla Firefox prompt will always be shown
        // Chrome requires returnValue to be set
        e.returnValue = '';
    });
})();
