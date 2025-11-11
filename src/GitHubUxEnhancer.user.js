// ==UserScript==
// @name         GitHub: 提升使用者體驗的小工具集合
// @version      0.1.1
// @description  主要用來改善 GitHub 網站的使用者體驗；包含自動聚焦儲存庫篩選輸入框等功能
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/GitHubUxEnhancer.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/GitHubUxEnhancer.user.js
// @author       Will Huang
// @match        https://github.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=github.com
// @grant        none
// @run-at       document-end
// ==/UserScript==

(() => {
    'use strict';

    const DEFAULT_DEBOUNCE_MS = 100;

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

    // 嘗試聚焦儲存庫篩選輸入框
    const focusRepositoriesFilter = () => {
        try {
            if (!isRepositoriesTab(location.search)) return;
            const el = getRepositoriesFilterElement();
            if (!el) return;
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

    // 防抖工具函式
    const debounce = (fn, ms = DEFAULT_DEBOUNCE_MS) => {
        let t;
        return (...args) => {
            clearTimeout(t);
            t = setTimeout(() => fn(...args), ms);
        };
    };

    // 初始執行（當 DOM 完成時）
    if (document.readyState === 'loading') {
        window.addEventListener('DOMContentLoaded', focusRepositoriesFilter, { once: true });
    }
    else {
        focusRepositoriesFilter();
    }

    // 偵測 SPA 導航或 DOM 變更（單頁應用導覽）並防抖處理
    let lastUrl = location.href;
    const debouncedFocus = debounce(focusRepositoriesFilter, DEFAULT_DEBOUNCE_MS);
    const observer = new MutationObserver(() => {
        const url = location.href;
        if (url !== lastUrl) {
            lastUrl = url;
            debouncedFocus();
        }
    });
    observer.observe(document, { subtree: true, childList: true });

})();
