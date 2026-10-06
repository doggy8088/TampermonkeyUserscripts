// ==UserScript==
// @name         Azure DevOps: 調整 Wiki 文件的 TOC 標題寬度
// @version      1.0.1
// @description  讓 Azure Wikis 的 TOC 標題可以完整顯示
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/AzureDevOpsWikiTocFullDisplay.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/AzureDevOpsWikiTocFullDisplay.user.js
// @author       Will Huang
// @match        *://*.visualstudio.com/*
// @match        *://dev.azure.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

// https://www.tampermonkey.net/documentation.php#_run_at

(function () {
    'use strict';

    // Azure Wikis 的 [[_TOC_]] 目錄會限制每個連結的 max-width，較長的標題會被截斷成「...」。
    // 注入一條全域樣式把 max-width 改回繼承父層，讓標題完整顯示。
    // 樣式是全域生效的，SPA 換頁後新產生的 TOC 也會自動套用，因此只需要在載入時注入一次。
    // 刻意不用 GM_addStyle，維持 @grant none 在頁面環境執行的單純設定。
    function executeActions() {
        var styleTag = document.createElement("style");
        var cssRules = document.createTextNode(".toc-container a { max-width: inherit; }");
        styleTag.appendChild(cssRules);
        // document-idle 時 document.head 理應存在；保險起見在沒有 <head> 的特殊文件中改掛到根元素。
        (document.head || document.documentElement).appendChild(styleTag);
    }

    // 原本包在巢狀 IIFE 中以 setTimeout(executeActions, 0) 延後執行；在 document-idle 時
    // DOM 早已就緒，延後一個 task 沒有作用，直接執行即可。
    executeActions();

})();
