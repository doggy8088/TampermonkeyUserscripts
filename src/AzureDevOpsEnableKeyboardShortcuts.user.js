// ==UserScript==
// @name         Azure DevOps: 啟用鍵盤快速鍵
// @version      1.0.1
// @description  讓 Azure DevOps Service 的鍵盤快速鍵一直都可以使用
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/AzureDevOpsEnableKeyboardShortcuts.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/AzureDevOpsEnableKeyboardShortcuts.user.js
// @author       Will Huang
// @match        *://*.visualstudio.com/*
// @match        *://dev.azure.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

// https://www.tampermonkey.net/documentation.php#_run_at

(function () {
    'use strict';

    // Azure DevOps 會把「停用鍵盤快速鍵」的偏好記錄在 localStorage 的 KeyboardShortcutsDisabled。
    // 刪除這個鍵，讓快速鍵永遠保持啟用。
    //
    // 改在 document-start 執行：localStorage 只與網址的 origin 有關，在頁面任何程式執行前就能存取；
    // 若等到 document-idle 才刪除，Azure DevOps 的前端程式可能早已在初始化時讀到「已停用」的值，
    // 本次載入的頁面仍然沒有快速鍵，要到下一次重新整理才會生效。提早刪除可讓當下這次載入就生效。
    //
    // 以 try/catch 包住：在未允許 same-origin 的 sandbox iframe 或封鎖網站資料的情況下，
    // 存取 localStorage 會丟出 SecurityError；此時沒有可清除的設定，安靜略過即可。
    try {
        localStorage.removeItem('KeyboardShortcutsDisabled');
    } catch (e) {
    }

})();
