// ==UserScript==
// @name         GitHub: 提升使用者體驗的小工具集合
// @version      0.1.2
// @description  主要用來改善 GitHub 網站的使用者體驗；包含自動聚焦儲存庫篩選輸入框等功能
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/GitHubUxEnhancer.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/GitHubUxEnhancer.user.js
// @author       Will Huang
// @match        https://github.com/*
// @run-at       document-end
// @icon         https://www.google.com/s2/favicons?sz=64&domain=github.com
// @grant        none
// ==/UserScript==

(() => {
    'use strict';

    const DEFAULT_DEBOUNCE_MS = 100;

    // 進入儲存庫 Tab 後，最多等待 5 秒讓篩選輸入框出現。
    // GitHub 的 Turbo 換頁會「先改網址、再抓新頁面」，網址變更當下新內容通常還沒到；
    // 舊版只在網址變更後 100ms 嘗試一次，網路稍慢時輸入框尚未出現，之後就再也不會聚焦。
    const FOCUS_WAIT_MS = 5000;

    // 是否為儲存庫 Tab（判斷 URL 查詢字串）
    const isRepositoriesTab = (search) => {
        try {
            const params = new URLSearchParams(search);
            return params.has('tab') && params.get('tab') === 'repositories';
        }
        catch (e) {
            // 若解析失敗，視為非 repository tab
            return false;
        }
    };

    // 取得儲存庫篩選輸入框
    const getRepositoriesFilterElement = () => document.getElementById('your-repos-filter');

    // 使用者已經在其他輸入框打字時，不要把焦點搶走。
    // 只有焦點落在一般元素（例如剛點擊的「Repositories」分頁連結）或頁面本身時才自動聚焦，
    // 頁面初次載入時焦點就在 body，因此與舊版行為相同。
    const isUserTypingElsewhere = (filterElement) => {
        const active = document.activeElement;
        if (!active || active === filterElement || active === document.body || active === document.documentElement) {
            return false;
        }
        return active.isContentEditable || /^(?:INPUT|TEXTAREA|SELECT)$/.test(active.tagName);
    };

    // 0 代表目前沒有等待中的聚焦工作；否則為「放棄等待」的時間點。
    let focusDeadline = 0;

    // 嘗試聚焦儲存庫篩選輸入框
    const focusRepositoriesFilter = () => {
        try {
            if (!focusDeadline) return;
            if (Date.now() > focusDeadline || !isRepositoriesTab(location.search)) {
                focusDeadline = 0;
                return;
            }

            // Turbo 會先顯示快取的頁面預覽（<html data-turbo-preview>），稍後再以伺服器回應取代。
            // 在預覽上聚焦的輸入框會被整個替換掉，因此等真正的頁面繪製完成後再處理。
            if (document.documentElement.hasAttribute('data-turbo-preview')) return;

            const el = getRepositoriesFilterElement();
            if (!el) return;

            // 不論是否真的聚焦，這次換頁的工作都算完成，避免在 5 秒內反覆搶焦點。
            focusDeadline = 0;
            if (isUserTypingElsewhere(el)) return;

            // 確保可以聚焦
            if (typeof el.focus === 'function') {
                el.focus();
            }
        }
        catch (err) {
            // 忽略錯誤，在開發時可視需求打開以下註解
            // console.debug('GitHubUxEnhancer focusRepositoriesFilter error', err);
        }
    };

    // 節流工具函式：已排定時不再重設計時器。
    // 舊版的防抖（每次呼叫都 clearTimeout 重新計時）在 GitHub 載入頁面、DOM 持續變動時
    // 可能一直被往後延，直到頁面完全安靜下來才執行，因此改為固定間隔內最多執行一次。
    const throttle = (fn, ms = DEFAULT_DEBOUNCE_MS) => {
        let t = 0;
        return (...args) => {
            if (t) return;
            t = setTimeout(() => {
                t = 0;
                fn(...args);
            }, ms);
        };
    };

    // 開始一次新的「等待並聚焦」工作（頁面初次載入或網址變更時呼叫）。
    const startFocusRepositoriesFilter = () => {
        focusDeadline = Date.now() + FOCUS_WAIT_MS;
        focusRepositoriesFilter();
    };

    // 初始執行（當 DOM 完成時）
    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', startFocusRepositoriesFilter, { once: true });
    }
    else {
        startFocusRepositoriesFilter();
    }

    // 偵測 SPA 導航或 DOM 變更（單頁應用導覽）並節流處理
    let lastUrl = location.href;
    const throttledFocus = throttle(focusRepositoriesFilter, DEFAULT_DEBOUNCE_MS);
    const observer = new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            focusDeadline = Date.now() + FOCUS_WAIT_MS;
        }

        // 只有在等待輸入框出現的期間才需要處理 DOM 變動；其餘時間僅比對網址，負擔與舊版相同。
        if (focusDeadline) {
            throttledFocus();
        }
    });
    observer.observe(document, { subtree: true, childList: true });

})();
