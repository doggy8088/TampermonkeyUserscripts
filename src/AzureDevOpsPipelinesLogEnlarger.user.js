// ==UserScript==
// @name         Azure DevOps: 調整 Pipeline Log 的顯示寬度
// @version      1.0.1
// @description  在 Azure Pipelines 的 Logs 頁面中可透過鍵盤的 + 或 - 自動放大/縮小左欄寬度，可顯示更多內容
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/AzureDevOpsPipelinesLogEnlarger.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/AzureDevOpsPipelinesLogEnlarger.user.js
// @author       Will Huang
// @match        *://dev.azure.com/*
// @match        *://*.visualstudio.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // 每按一次 + 或 - 調整的寬度（px）
    const stepSize = 100;

    // 左欄尚未被調整過（沒有 inline width）時，視為 Azure Pipelines 預設的 320px
    const defaultWidth = 320;

    document.addEventListener('keydown', (ev) => {
        if (ev.key !== '+' && ev.key !== '-') return;

        // 同時按著 Ctrl/Meta/Alt 時不處理：Ctrl/Cmd 加上 + 或 - 是瀏覽器的縮放快速鍵，
        // 原本縮放頁面的同時也會改變左欄寬度。刻意不檢查 Shift，因為美式鍵盤要按 Shift+= 才能打出 +。
        if (ev.ctrlKey || ev.metaKey || ev.altKey) return;

        // 輸入情境不攔截：原本只排除 input/select/textarea/button，另外補上 contenteditable 編輯器
        // （例如工作項目的 HTML 欄位）與輸入法組字中的按鍵。
        if (ev.isComposing || /^(?:input|select|textarea|button)$/i.test(ev.target.nodeName) || ev.target.isContentEditable) return;

        adjustMasterPanelWidth(ev.key === '+' ? stepSize : -stepSize);
    });

    /**
     * 以 delta（px）調整 Pipeline Logs 左欄（.bolt-master-panel）的寬度。
     * 這支腳本套用在整個 Azure DevOps，在沒有左欄的頁面（Boards、Repos…）按下 + 或 -，
     * 原本會因存取 undefined 的 style 而在主控台丟出 TypeError；找不到左欄時直接略過。
     */
    function adjustMasterPanelWidth(delta) {
        const panel = document.getElementsByClassName('bolt-master-panel')[0];
        if (!panel) return;

        const currentWidth = parseInt(panel.style.width);
        const width = isNaN(currentWidth) ? defaultWidth : currentWidth;
        panel.style.width = (width + delta) + 'px';
    }

})();
