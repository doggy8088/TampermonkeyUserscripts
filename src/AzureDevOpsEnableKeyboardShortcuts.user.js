// ==UserScript==
// @name         Azure DevOps: 啟用鍵盤快速鍵
// @version      1.0
// @description  讓 Azure DevOps Service 的鍵盤快速鍵一直都可以使用
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/AzureDevOpsEnableKeyboardShortcuts.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/AzureDevOpsEnableKeyboardShortcuts.user.js
// @match        *://*.visualstudio.com/*
// @match        *://dev.azure.com/*
// @author       Will Huang
// @run-at       document-idle
// ==/UserScript==

// https://www.tampermonkey.net/documentation.php#_run_at

(function () {
    'use strict';

    localStorage.removeItem('KeyboardShortcutsDisabled')

})();
