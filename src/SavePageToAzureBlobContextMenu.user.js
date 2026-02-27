// ==UserScript==
// @name         網頁快照上傳至 Azure Blob Storage（右鍵快速執行）
// @version      0.1.0
// @description  在 Tampermonkey 右鍵 context-menu 中直接觸發「儲存網頁快照」流程，實際快照與上傳邏輯由主腳本 SavePageToAzureBlob.user.js 負責
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/SavePageToAzureBlobContextMenu.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/SavePageToAzureBlobContextMenu.user.js
// @author       Will Huang
// @match        *://*/*
// @run-at       context-menu
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // 與主腳本共享的事件名稱：
    // 1) 由本 context-menu 腳本發出 trigger 事件
    // 2) 主腳本收到後回送 ack 事件，代表它已接手後續工作
    const CONTEXT_MENU_TRIGGER_EVENT = 'save-page-to-azure-blob:trigger';
    const CONTEXT_MENU_ACK_EVENT = 'save-page-to-azure-blob:ack';

    // 透過 ACK 機制避免「點了右鍵選單卻沒有任何反應」的模糊體驗：
    // 若主腳本尚未安裝、被停用、或因例外未成功初始化，
    // 這裡會在短時間內彈出明確提示，協助使用者快速定位問題。
    let isAcknowledgedByMainScript = false;

    document.addEventListener(CONTEXT_MENU_ACK_EVENT, () => {
        isAcknowledgedByMainScript = true;
    }, { once: true });

    // 發送觸發事件，請主腳本直接執行既有的 savePageToAzureBlob() 主流程。
    // 這種拆分方式能確保核心邏輯只有一份，避免雙份維護。
    document.dispatchEvent(new CustomEvent(CONTEXT_MENU_TRIGGER_EVENT, {
        detail: {
            source: 'tampermonkey-context-menu',
            feature: 'save-page-to-azure-blob',
            timestamp: Date.now()
        }
    }));

    setTimeout(() => {
        if (isAcknowledgedByMainScript) {
            return;
        }

        alert(
            '找不到主腳本「網頁快照上傳至 Azure Blob Storage」或主腳本尚未啟用。\n\n' +
            '請確認以下項目：\n' +
            '1. SavePageToAzureBlob.user.js 已安裝且啟用\n' +
            '2. 目前網站符合主腳本 @match 規則\n' +
            '3. 重新整理頁面後再試一次右鍵選單'
        );
    }, 150);
})();
