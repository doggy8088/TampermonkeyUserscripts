// ==UserScript==
// @name         GitHub Docs: 好用的鍵盤快速鍵集合
// @version      0.1.2
// @description  按下 f 可以快速隱藏 GitHub 網站中所有非主要內容的區塊
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/GitHubDocsHotkeys.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/GitHubDocsHotkeys.user.js
// @author       Will Huang
// @match        https://docs.github.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=github.com
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // docs.github.com 版面中「非主要內容」的區塊：頁首、左側導覽、右側目錄與頁尾。
    const SECONDARY_SECTION_SELECTORS = [
        '[data-container="header"]',
        '[data-container="nav"]',
        '[data-container="toc"]',
        '[data-container="footer"]'
    ].join(', ');

    /**
     * 判斷按鍵是否發生在需要保留給使用者打字的情境。
     * 舊版只檢查 INPUT 與 TEXTAREA；這裡補上 SELECT 與 contenteditable 編輯區，
     * 避免在這些元素裡按 f 時版面被切換、字元也被 preventDefault() 吃掉。
     */
    function isTypingContext(target) {
        if (!(target instanceof Element)) return false;
        if (target.isContentEditable) return true;
        return /^(?:INPUT|TEXTAREA|SELECT)$/.test(target.tagName);
    }

    document.addEventListener('keydown', (event) => {
        if (event.ctrlKey || event.metaKey || event.key !== 'f') return;

        // 中文、日文等輸入法正在組字時，按鍵是送給輸入法選字用的，不能當成快速鍵。
        // keyCode 229 是部分瀏覽器在組字期間回報的值，isComposing 尚未設定時也能攔下來。
        if (event.isComposing || event.keyCode === 229) return;

        // 如果是輸入欄位，就不要觸發。但是按下 alt+f 就可以觸發這個功能。
        if (isTypingContext(event.target) && !event.altKey) return;

        // docs.github.com 是 Next.js SPA，換頁時部分區塊會被重新繪製成「沒有 hidden」的新元素。
        // 舊版對每個元素各自 toggleAttribute('hidden')，此時會變成「舊的被顯示、新的被隱藏」的錯亂狀態。
        // 改為先決定一個共同的目標狀態：只要有任何區塊仍然可見就全部隱藏，否則全部顯示。
        // 在所有區塊狀態一致的一般情況下，結果與舊版的逐一切換完全相同。
        const sections = Array.from(document.querySelectorAll(SECONDARY_SECTION_SELECTORS));
        const shouldHide = sections.some((element) => !element.hidden);
        sections.forEach((element) => {
            element.toggleAttribute('hidden', shouldHide);
        });

        event.preventDefault();
    });

})();
