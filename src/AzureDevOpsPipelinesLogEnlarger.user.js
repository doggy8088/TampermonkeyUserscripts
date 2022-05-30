// ==UserScript==
// @name         Azure DevOps: 調整 Pipeline Log 的顯示寬度
// @version      1.0
// @description  在 Azure Pipelines 的 Logs 頁面中可透過鍵盤的 + 或 - 自動放大/縮小左欄寬度，可顯示更多內容
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/AzureDevOpsPipelinesLogEnlarger.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/AzureDevOpsPipelinesLogEnlarger.user.js
// @author       Will Huang
// @match        *://dev.azure.com/*
// @match        *://*.visualstudio.com/*
// ==/UserScript==

(function () {
    'use strict';
    document.addEventListener('keydown', (ev) => {
        var width;
        let stepSize = 100;
        if (ev.key === '+' && !/^(?:input|select|textarea|button)$/i.test(ev.target.nodeName)) {
            width = isNaN(parseInt(document.getElementsByClassName('bolt-master-panel')[0].style.width))
                ? 320
                : parseInt(document.getElementsByClassName('bolt-master-panel')[0].style.width);
            document.getElementsByClassName('bolt-master-panel')[0].style.width = (width + stepSize) + 'px'
        }
        if (ev.key === '-' && !/^(?:input|select|textarea|button)$/i.test(ev.target.nodeName)) {
            width = isNaN(parseInt(document.getElementsByClassName('bolt-master-panel')[0].style.width))
                ? 320
                : parseInt(document.getElementsByClassName('bolt-master-panel')[0].style.width);
            document.getElementsByClassName('bolt-master-panel')[0].style.width = (width - stepSize) + 'px'
        }
    });

})();
