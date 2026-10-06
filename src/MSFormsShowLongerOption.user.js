// ==UserScript==
// @name         Microsoft Forms: 調整回應頁面顯示較寬的選項內容
// @version      1.1.1
// @description  按下 + 號就可以調寬，按下 - 號就可以調窄。
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/MSFormsShowLongerOption.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/MSFormsShowLongerOption.user.js
// @author       Will Huang
// @match        https://forms.microsoft.com/Pages/DesignPage.aspx*
// @match        https://forms.microsoft.com/Pages/DesignPageV2.aspx*
// @match        https://forms.office.com/Pages/DesignPage.aspx*
// @match        https://forms.office.com/Pages/DesignPageV2.aspx*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    var decodeEntities = (function () {
        // this prevents any overhead from creating the object each time
        //
        // 解碼用的元素改由「惰性文件（inert document）」建立，而不是目前頁面的 document。
        // 圖例文字是表單的內容，不一定由自己撰寫（例如共用表單的其他作者），應視為不受信任的資料；
        // 在目前頁面建立的元素即使沒有掛進 DOM，設定 innerHTML 時 <img onerror> 之類的標籤仍會
        // 載入並執行事件處理器。
        // 下方的正規表示式雖然會先移除標籤，但以正規表示式過濾 HTML 很難保證沒有繞過的寫法。
        // createHTMLDocument() 建立的文件沒有瀏覽環境（browsing context），不會載入資源也不會執行腳本，
        // 即使有漏網的標籤也無法執行；解碼 HTML 實體的結果則與原本完全相同。
        var element = document.implementation.createHTMLDocument('').createElement('div');

        function decodeHTMLEntities(str) {
            if (str && typeof str === 'string') {
                // strip script/html tags
                str = str.replace(/<script[^>]*>([\S\s]*?)<\/script>/gmi, '');
                str = str.replace(/<\/?\w(?:[^"'>]|"[^"]*"|'[^']*')*>/gmi, '');
                element.innerHTML = str;
                str = element.textContent;
                element.textContent = '';
            }

            return str;
        }

        return decodeHTMLEntities;
    })();

    document.addEventListener('keydown', (ev) => {
        if (ev.key !== '+' && ev.key !== '-') return;

        // 同時按著 Ctrl/Meta/Alt 時不處理：Ctrl/Cmd 加上 + 或 - 是瀏覽器的縮放快速鍵，
        // 原本縮放頁面的同時也會改變圖例寬度。刻意不檢查 Shift，因為美式鍵盤要按 Shift+= 才能打出 +。
        if (ev.ctrlKey || ev.metaKey || ev.altKey) return;

        // 輸入情境不攔截：原本只排除 input/select/textarea/button，另外補上 contenteditable
        // （例如 Forms 設計頁面中的格式化文字編輯區）與輸入法組字中的按鍵。
        if (ev.isComposing || /^(?:input|select|textarea|button)$/i.test(ev.target.nodeName) || ev.target.isContentEditable) return;

        let stepSize = 100;
        adjustLegendLabelWidth(ev.key === '+' ? stepSize : -stepSize);
    });

    // 調整所有圖例標籤的最大寬度，並順便把被重複編碼的 HTML 實體解碼成正常文字。
    // 原本 + 與 - 各有一份相同的迴圈，合併成同一個函式。
    function adjustLegendLabelWidth(delta) {
        document.querySelectorAll('.chart-control-legend-label').forEach(o => {
            var currentWidth = parseInt(window.getComputedStyle(o).maxWidth);
            o.innerText = decodeEntities(o.innerText);
            o.style.maxWidth = (currentWidth + delta) + 'px';
        });
    }

})();
