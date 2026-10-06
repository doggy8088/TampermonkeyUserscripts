// ==UserScript==
// @name         防止避免意外關閉頁籤
// @version      2.0.1
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
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // 瀏覽器限制：Chrome、Edge 在一般分頁中把 Ctrl+W 視為保留快捷鍵，不會交給網頁處理，
    // 下面的 preventDefault() 只在網頁拿得到按鍵的情境（例如安裝成 PWA 的獨立視窗）才有效；
    // 一般分頁真正的防護是後面的 beforeunload 確認對話框，以及同目錄的 AvoidClosingTab.ahk。
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
