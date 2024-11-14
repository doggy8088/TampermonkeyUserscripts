// ==UserScript==
// @name         Gemini: 自動切換語音輸入模式 (alt+t)
// @version      0.2.0
// @description  使用快速鍵 alt+t 來快速切換 Gemini 上面的語音輸入功能
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/GeminiToggleAudioInput.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/GeminiToggleAudioInput.user.js
// @match        https://gemini.google.com/*
// @author       Will Huang
// @run-at       document-idle
// @icon         https://www.google.com/s2/favicons?sz=64&domain=gemini.google.com
// ==/UserScript==
// ==/UserScript==

(function () {
    'use strict';

    document.addEventListener('keydown', (event) => {
        // 檢查是否按下了 Alt+T
        if (event.altKey && event.key.toLowerCase() === 't') {
            // 檢查事件目標是否是輸入框或文字區域
            const target = event.target;
            const isInputField = false; //target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

            if (!isInputField) {
                // 阻止預設行為（如有必要）
                event.preventDefault();

                // 執行您需要的操作
                const micButton = document.querySelector('[aria-label="麥克風"]')
                    || document.querySelector('[aria-label="Microphone"]');
                if (micButton) {
                    micButton.click();
                } else {
                    console.warn('找不到麥克風按鈕');
                }
            }
        }
    });

})();
