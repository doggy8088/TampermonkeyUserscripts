// ==UserScript==
// @name         按下兩次 Ctrl+C 就會自動複製網址
// @version      0.1.0
// @description  按下兩次 Ctrl+C 就會自動複製網址，為了方便自行實作複製網址的邏輯，因此這份腳本不會變更版號，請自行檢查是否有新版。
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/CtrlCCtrlCCopyURL.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/CtrlCCtrlCCopyURL.user.js
// @author       Will Huang
// @match        *://*/*
// ==/UserScript==

(function () {
    'use strict';
    let lastCopy = 0;
    document.addEventListener('copy', function(event) {
        let now = new Date().getTime();

        // 只要在 1 秒內連續按兩次 Ctrl+C，就會自動複製網址
        if (now - lastCopy < 1000) {
            let url = window.location.href;

            // 過濾掉 learn.microsoft.com 網站上的 view=aspnetcore- 參數，確保拿到的網址一定是最新版
            url = url.replace(/view=aspnetcore-\d.\d&/g, '');

            navigator.clipboard.writeText(url)
                .then(() => {
                    console.log('URL copied to clipboard:', url);
                })
                .catch((error) => {
                    console.error('Failed to copy URL to clipboard:', error);
                });

            event.preventDefault();
        }

        lastCopy = now;
    });

})();
