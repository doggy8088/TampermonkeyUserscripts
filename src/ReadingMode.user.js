// ==UserScript==
// @name         ReadingMode: 讓網頁更容易閱讀與翻譯的工具
// @version      0.1.0
// @description  按下 f 鍵可讓網頁僅顯示 main 元素的內容，再按一次 f 或按下 Esc 恢復原狀
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ReadingMode.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ReadingMode.user.js
// @author       Will Huang
// @match        https://*/*
// @exclude      https://felo.ai/*
// @exclude      https://docs.github.com/*
// @exclude      https://platform.openai.com/*
// @exclude      https://learn.microsoft.com/*
// @exclude      https://facebook.com/*
// @exclude      https://www.facebook.com/*
// @exclude      https:///*
// ==/UserScript==

(function () {
    let isMainOnly = false;
    let originalContent = null;

    document.addEventListener('keydown', e => {
        if (isInInputMode(e.target) || e.altKey || e.metaKey || e.ctrlKey || e.shiftKey) return;

        if (e.key === 'f' || e.key === 'F' || (isMainOnly && e.key === 'Escape')) {
            isMainOnly = !isMainOnly;
            if (isMainOnly) {
                // 第一次按下快速鍵時才取得內容
                if (!originalContent) {
                    originalContent = document.body.innerHTML;
                }
                const main = document.querySelector('main');
                if (main) {
                    document.body.innerHTML = '';
                    document.body.appendChild(main);
                }
            } else {
                // TODO: 還原原始內容可能會導致頁面中元素的事件遺失
                document.body.innerHTML = originalContent;
                // 還原後清空 originalContent
                originalContent = null;
            }
        }
    });

    function isInInputMode(element) {
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
            return true;
        }
        if (element.isContentEditable) {
            return true;
        }
        return false;
    }

})();
