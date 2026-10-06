// ==UserScript==
// @name         104: 自動隱藏智能客服浮動選單
// @version      0.1.0
// @description  自動偵測並移除 104 VIP 站的浮動智能客服選單（支援 SPA 網頁結構）
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/104HideSidebar.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/104HideSidebar.user.js
// @author       Will Huang
// @match        https://vip.104.com.tw/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=104.com.tw
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 定義移除函式
    function removeSidebar() {
        const sidebar = document.querySelector('div.sidebar');
        if (sidebar) {
            sidebar.remove();
            console.log('Tampermonkey: 已移除 div.sidebar');
        }
    }

    // 初始執行一次
    removeSidebar();

    // 使用 MutationObserver 偵測 SPA 內容變化
    const observer = new MutationObserver(() => removeSidebar());

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

})();
