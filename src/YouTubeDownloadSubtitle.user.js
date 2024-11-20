// ==UserScript==
// @name         YouTube: 自動下載影片字幕
// @version      0.1.0
// @description  按下 alt+s 就可以自動下載當前影片字幕
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/YouTubeDownloadSubtitle.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/YouTubeDownloadSubtitle.user.js
// @author       Will Huang
// @match        https://www.youtube.com/*
// ==/UserScript==

(function () {
    'use strict';

    // 監聽鍵盤事件
    document.addEventListener('keydown', function(event) {
        if (event.altKey && event.key.toLowerCase() === 's') { // alt+s
            const currentUrl = window.location.href;
            const modifiedUrl = `https://subtitle.to/${currentUrl}`;
            window.open(modifiedUrl, '_blank'); // 在新分頁開啟
        }
    });

})();
