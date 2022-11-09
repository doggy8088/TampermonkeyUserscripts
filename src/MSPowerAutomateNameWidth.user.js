// ==UserScript==
// @name         Power Automate: 調整顯示名稱的欄位寬度
// @version      1.0
// @description  將 Flows 的 Name 欄位調整到 750px 寬度，讓標題可以完整顯示在畫面上
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/MSPowerAutomateNameWidth.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/MSPowerAutomateNameWidth.user.js
// @author       Will Huang
// @match        https://make.powerautomate.com/*
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    const fixedWidth = '750px';

    // https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver
    const observer = new MutationObserver(() => {
        var key1 = document.querySelectorAll('[data-automation-key="displayName"]');
        var key2 = document.querySelectorAll('[data-item-key="displayName"]');
        if (key1.length > 0 && key2.length > 0) {
            key1.forEach(elm => { elm.style.width=fixedWidth; });
            key2.forEach(elm => { elm.style.width=fixedWidth; });
        }
    });

    observer.observe(document.querySelector('#root'), { childList: true, subtree: true });

})();
