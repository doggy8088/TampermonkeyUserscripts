// ==UserScript==
// @name         OpenAI Platform: 好用的鍵盤快速鍵集合
// @version      0.1.2
// @description  按下 Ctrl+B 快速切換側邊欄
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/OpenAIHotkeys.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/OpenAIHotkeys.user.js
// @author       Will Huang
// @match        https://platform.openai.com/*
// @run-at       document-end
// @icon         https://www.google.com/s2/favicons?sz=64&domain=platform.openai.com
// @require      https://doggy8088.github.io/playwright-js/src/playwright.js
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    document.addEventListener("keydown", async (event) => {
        // 輸入法組字中的按鍵（含開始組字時 keyCode 為 229 的第一個 keydown）屬於輸入法，一律不處理。
        if (event.isComposing || event.keyCode === 229) {
            return;
        }

        // 按下 Ctrl+B 快速切換側邊欄
        // Ctrl+B 帶有修飾鍵，不會在打字時誤觸，因此維持原本「在輸入框中也能使用」的行為。
        const isCtrlB = event.ctrlKey && !event.altKey && event.key === "b";

        // 按下 f 快速切換側邊欄（全螢幕閱讀）
        // f 是單一字母，必須排除打字情境：舊版沒有判斷，在 Playground 的提示輸入框
        // 或文件搜尋框打出任何含 f 的字（例如 "file"、"fine-tune"）都會讓整個版面被隱藏。
        const isF = !event.ctrlKey && !event.metaKey && !event.altKey && event.key === "f" && !isTypingContext(event.target);

        if (isCtrlB || isF) {
            // 確定接手快速鍵後才阻止預設行為：Ctrl+B 在 Firefox 會開啟書籤側邊欄、
            // 在 contenteditable 中會切換粗體，都不是使用者按這組熱鍵時想要的結果。
            event.preventDefault();
            await toggleSidebarByNavigation();
        }
    });

    /**
     * 判斷按鍵事件是否發生在打字情境中（輸入框、文字區域、下拉選單、可編輯區域）。
     * isContentEditable 會沿祖先鏈繼承，可涵蓋 contenteditable 內部子元素成為 event.target 的情況；
     * 按鍵事件發生頻率低，讀取它所需的樣式計算成本可以忽略。
     */
    function isTypingContext(target) {
        if (!(target instanceof Element)) {
            return false;
        }
        return target.isContentEditable || !!target.closest('input, textarea, select');
    }

    /**
     * 在 display:none 與原本的 inline display 之間切換單一元素。
     * 元素不存在時直接略過：platform.openai.com 不同頁面（文件、Playground、設定）的版面不同，
     * main 不一定有前後兄弟元素，舊版直接存取 null.style 會丟出 TypeError，
     * 讓後面的頁尾、aside、nav、Copy page 按鈕都不會被切換。
     */
    function toggleDisplay(element) {
        if (!element) return;
        element.style.display = element.style.display === 'none' ? '' : 'none';
    }

    async function toggleSidebarByNavigation() {
        var main = document.querySelector('main');
        if (!main) return;

        if (main.attributes['data-sidebar']) {
            main.attributes['data-sidebar'].value = main.attributes['data-sidebar'].value === 'expanded' ? 'collapsed' : 'expanded';
        }

        // main 前後的兄弟元素各自依「自己」目前的狀態切換。
        // 舊版第二行誤用 previousElementSibling 的狀態（在第一行已被切換過）來決定 nextElementSibling，
        // 造成兩者永遠互為相反：按第一次時 main 後方的區塊仍然顯示，再按一次「還原」時它反而被隱藏，
        // 頁面永遠回不到原本的版面，只能重新整理。
        toggleDisplay(main.previousElementSibling);
        toggleDisplay(main.nextElementSibling);

        var foo = document.querySelector('div[class="docs-footer"]');
        if (foo) foo.style.display = foo.style.display === 'none' ? '' : 'none';

        var dom = document.querySelector('aside');
        if (dom) dom.style.display = dom.style.display === 'none' ? '' : 'none';

        var nav = document.querySelectorAll('nav');
        for (let i = 0; i < nav.length; i++) {
            nav[i].style.display = nav[i].style.display === 'none' ? '' : 'none';
        }

        // page 由 @require 的 playwright.js 提供；若該檔因網路問題沒有載入，
        // 前面的版面切換已完成，這裡安靜略過即可，不要丟出 ReferenceError。
        if (typeof page === 'undefined') return;

        var btns = await page.getByRole('button', { name: 'Copy page' }).all();
        for (let i = 0; i < btns.length; i++) {
            btns[i].style.display = btns[i].style.display === 'none' ? '' : 'none';
        }
    }

})();
