// ==UserScript==
// @name         Gemini: 自動切換語音輸入模式 (alt+t)
// @version      0.3.0
// @description  使用快速鍵 alt+t 來快速切換 Gemini 上面的語音輸入功能
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/GeminiToggleAudioInput.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/GeminiToggleAudioInput.user.js
// @author       Will Huang
// @match        https://gemini.google.com/*
// @run-at       document-idle
// @icon         https://www.google.com/s2/favicons?sz=64&domain=gemini.google.com
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // 麥克風按鈕的候選選擇器，依序嘗試，找到第一個就停止。
    // 前兩個是 0.2.0 起使用的 aria-label（中文、英文介面），維持最高優先順序，原本能用的環境行為不變；
    // 後面三個是 Gemini 改版調整按鈕文字時的備援：「使用麥克風」/「Use microphone」這類命名，
    // 以及語音輸入按鈕外層的 <speech-dictation-mic-button> 元件。備援選擇器比對不到時不會有任何副作用。
    const MIC_BUTTON_SELECTORS = [
        '[aria-label="麥克風"]',
        '[aria-label="Microphone"]',
        '[aria-label="使用麥克風"]',
        '[aria-label="Use microphone"]',
        'speech-dictation-mic-button button'
    ];

    /**
     * 判斷是否按下 Alt+T。
     * - Windows/Linux 的 Alt+T 會得到 event.key === 't'。
     * - macOS 的 Option+T 會輸入「†」，event.key 不是 't'，舊版因此在 Mac 上完全無法使用；
     *   改以實體按鍵 event.code === 'KeyT' 作為備援。
     * - 排除 Ctrl 與 Meta：Windows 的 AltGr 會同時送出 ctrlKey + altKey，部分鍵盤配置用 AltGr+T 輸入字元，
     *   加上 event.code 備援後若不排除就會吃掉這些字元；Cmd+Option+T 也不是這組熱鍵。
     */
    function isAltT(event) {
        if (!event.altKey || event.ctrlKey || event.metaKey) {
            return false;
        }
        return (event.key || '').toLowerCase() === 't' || event.code === 'KeyT';
    }

    document.addEventListener('keydown', (event) => {
        // 輸入法組字中的按鍵屬於輸入法，不處理（keyCode 229 是開始組字的第一個 keydown）。
        if (event.isComposing || event.keyCode === 229) {
            return;
        }

        // 檢查是否按下了 Alt+T
        if (!isAltT(event)) {
            return;
        }

        // 刻意不排除輸入框：這組熱鍵就是要在 Gemini 的提示輸入框中直接切換語音輸入，
        // 而且帶有 Alt 修飾鍵，不會在一般打字時誤觸。
        event.preventDefault();

        // 長按 Alt+T 時瀏覽器會連續送出 repeat 事件，若不忽略，麥克風會被快速地開了又關。
        if (event.repeat) {
            return;
        }

        let micButton = null;
        for (const selector of MIC_BUTTON_SELECTORS) {
            micButton = document.querySelector(selector);
            if (micButton) break;
        }

        if (micButton) {
            micButton.click();
        } else {
            console.warn('[GeminiToggleAudioInput] 找不到麥克風按鈕');
        }
    });

})();
