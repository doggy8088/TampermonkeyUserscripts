// ==UserScript==
// @name         Google Apps Script 隱藏警告列
// @version      1.0
// @description  自動隱藏 Google Apps Script 執行頁面的警告提示列
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/GoogleAppsScriptHideWarningBar.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/GoogleAppsScriptHideWarningBar.user.js
// @author       Will Huang
// @match        https://script.google.com/macros/s/*/exec
// @run-at       document-idle
// @grant        none
// @icon         https://www.gstatic.com/script/favicon.ico
// ==/UserScript==

(function() {
    'use strict';

    function removeWarningBar() {
        const warningTable = document.getElementById('warning-bar-table');
        if (warningTable) {
            // 找到第一個 tr 標籤（包含警告訊息的行）
            const firstTr = warningTable.querySelector('tr');
            if (firstTr) {
                // 檢查是否包含警告內容
                const warningDiv = firstTr.querySelector('#warning');
                if (warningDiv) {
                    console.log('[Google Apps Script Hide Warning Bar] 隱藏警告提示列');
                    // 只能隱藏，如果刪除 DOM 整個網頁就無法顯示了
                    firstTr.style.display = 'none';
                    return true;
                }
            }
        }
        return false;
    }

    // 立即嘗試移除（適用於內容已載入的情況）
    if (document.readyState === 'loading') {
        console.log('[Google Apps Script Hide Warning Bar] 頁面尚未載入，等待 DOMContentLoaded 事件');
        document.addEventListener('DOMContentLoaded', removeWarningBar);
    } else {
        console.log('[Google Apps Script Hide Warning Bar] 頁面已載入，嘗試移除警告提示列');
        removeWarningBar();
    }

    // 使用 MutationObserver 監控 DOM 變化
    // 因為 GAS 頁面可能是動態載入的
    const observer = new MutationObserver(function(mutations) {
        for (let mutation of mutations) {
            if (mutation.type === 'childList') {
                for (let node of mutation.addedNodes) {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        // 檢查新增的節點是否包含警告表格
                        if (node.id === 'warning-bar-table' ||
                            node.querySelector('#warning-bar-table')) {
                            if (removeWarningBar()) {
                                console.log('[Google Apps Script Hide Warning Bar] 透過 Observer 隱藏警告提示列');
                            }
                        }
                    }
                }
            }
        }
    });

    // 開始觀察整個文檔的變化
    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });

    // 額外的安全機制：在頁面完全載入後再檢查一次
    window.addEventListener('load', function() {
        setTimeout(removeWarningBar, 100);
    });

    // 定期檢查（作為最後的保險）
    const checkInterval = setInterval(function() {
        if (removeWarningBar()) {
            clearInterval(checkInterval);
        }
    }, 500);

    // 5秒後停止定期檢查
    setTimeout(function() {
        clearInterval(checkInterval);
        observer.disconnect();
    }, 5000);

})();
