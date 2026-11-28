// ==UserScript==
// @name         網頁快照上傳至 Azure Blob Storage（靜態快照・右鍵快速執行）
// @version      0.1.0
// @description  在 Tampermonkey 右鍵 context-menu 直接以「靜態快照」觸發網頁快照（凍結當下畫面、移除腳本），實際快照與上傳邏輯由主腳本 SavePageToAzureBlob.user.js 負責
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/SavePageToAzureBlobStaticContextMenu.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/SavePageToAzureBlobStaticContextMenu.user.js
// @author       Will Huang
// @match        *://*/*
// @run-at       context-menu
// @grant        none
// ==/UserScript==

/*
 * 這是「靜態快照」的右鍵入口。
 *
 * 為什麼需要拆成兩個檔案：
 *   - 一支 @run-at context-menu 的腳本在 Tampermonkey 右鍵選單裡只能佔用一個項目，
 *     無法在同一支腳本中產生兩個選項。
 *   - 因此「重播」與「靜態」各自是一個獨立檔案（另一支是
 *     SavePageToAzureBlobReplayContextMenu.user.js），
 *     兩者送出同一個事件名稱，只用 detail.mode 區分模式。
 *   - 本檔刻意不包含任何快照邏輯：真正的實作只有一份，在主腳本裡。
 *     這樣才不會出現兩份實作各自漂移、修了一邊忘了另一邊的情況。
 *
 * 什麼時候該用靜態快照而不是重播：
 *   - 頁面內容是執行後才從前端 API 抓回來（SPA 空殼），重播只會得到空白頁。
 *   - 你就是要「發佈當下看到的畫面」，包含表單輸入值、篩選結果、展開中的面板。
 *   - 不希望快照帶著原站腳本一起跑（例如腳本會打自家 API 或讀 cookie）。
 *
 * 代價：快照中的站內搜尋、頁籤切換等依賴 JS 的互動會失效，
 * 因為靜態快照依定義會移除所有 <script>（那份 DOM 已經含有腳本產生的節點，
 * 再執行一次會把同一組介面重複附加一份）。
 *
 * 這個入口對應主腳本的「🖼️ 發佈到 Infinitybin（靜態快照）」選單命令，
 * 兩者行為完全相同（同一個函式、同一個模式）。
 */

(function () {
    'use strict';

    // 與主腳本共享的事件名稱：
    // 1) 由本 context-menu 腳本發出 trigger 事件
    // 2) 主腳本收到後回送 ack 事件，代表它已接手後續工作
    const CONTEXT_MENU_TRIGGER_EVENT = 'save-page-to-azure-blob:trigger';
    const CONTEXT_MENU_ACK_EVENT = 'save-page-to-azure-blob:ack';

    // 本入口固定要求「靜態快照」：凍結目前已渲染的 DOM 並移除所有腳本，
    // 畫面保證與發佈當下一模一樣，但互動會失效。
    const SNAPSHOT_MODE_STATIC = 'static';

    // 透過 ACK 機制避免「點了右鍵選單卻沒有任何反應」的模糊體驗：
    // 若主腳本尚未安裝、被停用、或因例外未成功初始化，
    // 這裡會在短時間內彈出明確提示，協助使用者快速定位問題。
    let isAcknowledgedByMainScript = false;

    const onAcknowledged = () => {
        isAcknowledgedByMainScript = true;
    };

    document.addEventListener(CONTEXT_MENU_ACK_EVENT, onAcknowledged, { once: true });

    // 發送觸發事件，請主腳本直接執行既有的 savePageToAzureBlob(mode) 主流程。
    // 這種拆分方式能確保核心邏輯只有一份，避免雙份維護。
    document.dispatchEvent(new CustomEvent(CONTEXT_MENU_TRIGGER_EVENT, {
        detail: {
            source: 'tampermonkey-context-menu',
            feature: 'save-page-to-azure-blob',
            // 模式由入口決定，主腳本不再讀取任何「記住的」設定值，
            // 所以點哪一個項目就一定是跑哪一種模式。
            mode: SNAPSHOT_MODE_STATIC,
            timestamp: Date.now()
        }
    }));

    setTimeout(() => {
        // 每次點選右鍵選單都會重新注入本腳本；主腳本不存在時 once 監聽器永遠等不到 ACK，
        // 會一直留在 document 上，每點一次選單就多累積一個（影響雖小但屬於洩漏）。
        // 逾時判斷完成後主動移除（已觸發過的 once 監聽器再移除一次也不會出錯）。
        document.removeEventListener(CONTEXT_MENU_ACK_EVENT, onAcknowledged);

        if (isAcknowledgedByMainScript) {
            return;
        }

        // 主腳本的 @name 已更名為「網頁狀態與任意內容發佈到 Infinitybin」；
        // 提示文字同步使用新名稱，使用者才能在 Tampermonkey 管理頁找到要啟用的腳本。
        alert(
            '找不到主腳本「網頁狀態與任意內容發佈到 Infinitybin」或主腳本尚未啟用。\n\n' +
            '請確認以下項目：\n' +
            '1. SavePageToAzureBlob.user.js 已安裝且啟用\n' +
            '2. 目前網站符合主腳本 @match 規則\n' +
            '3. 重新整理頁面後再試一次右鍵選單'
        );
    }, 150);
})();
