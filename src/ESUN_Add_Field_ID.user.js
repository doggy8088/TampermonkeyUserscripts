// ==UserScript==
// @name         玉山銀行: 添加遺失的表單欄位 id 屬性
// @version      1.1.1
// @description  修復玉山銀行玉山全球智匯網登入頁面無法使用密碼管理器的問題
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ESUN_Add_Field_ID.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ESUN_Add_Field_ID.user.js
// @author       Will Huang
// @match        https://gib.esunbank.com/*
// @run-at       document-start
// @icon         https://www.google.com/s2/favicons?sz=64&domain=https://gib.esunbank.com
// @grant        none
// ==/UserScript==

(async function () {
    "use strict";

    // 登入頁「顧客ID/代號」輸入框（依介面語言分為繁體、簡體、英文三種 placeholder）
    const CUSTOMER_ID_SELECTOR = 'input[placeholder="顧客ID/代號"],input[placeholder="顾客ID/代号"],input[placeholder="Customer ID/No"]';

    // DOM 變動時最快多久檢查一次（毫秒），與舊版 60ms 輪詢的反應速度相當
    const CHECK_THROTTLE_MS = 50;

    // 找到輸入框就補上 id，回傳是否已完成
    // 本腳本只設定 id 屬性讓密碼管理器能辨識欄位，不讀取、不記錄、也不傳送任何輸入內容
    function tryApply() {
        const elm = document.querySelector(CUSTOMER_ID_SELECTOR);
        if (!elm) {
            return false;
        }

        // 自動從 FRAME 中跳出來變成主角
        // 設計意圖：外層若是「不同網域」的頁面，讀取 top.location.href 會丟出 SecurityError。
        // 舊版的例外發生在 clearInterval() 之前，計時器因此永遠不會停止、每 60ms 丟一次錯誤，
        // 而且 id 也永遠不會被設定。這裡改為捕捉例外：跨網域時維持舊版「不跳出」的實際結果，
        // 但照常補上 id 並結束檢查。
        try {
            if (location.href != top.location.href) top.location.href = location.href;
        } catch (e) {
            // 跨網域 frame：無法讀取或導向最上層頁面，留在原 frame 中即可
        }

        elm.id = 'inputCustomerId';
        return true;
    }

    // 頁面一開始（document-start）通常還沒有輸入框，但仍先檢查一次
    if (tryApply()) {
        return;
    }

    // 以 MutationObserver 取代舊版「每 60ms 輪詢一次、找到才停止」的 setInterval
    // 設計意圖：
    // 1. 舊版只要頁面上沒有登入輸入框（例如登入後的所有頁面、每個 frame），輪詢就會永遠持續下去。
    //    改為只在 DOM 真的有變動時才檢查，頁面靜止時完全不耗用 CPU。
    // 2. 觀察 placeholder 屬性變動：前端框架常先建立 <input>、之後才設定 placeholder（例如多語系），
    //    只觀察 childList 會錯過這種情況。
    // 3. DOM 變動非常頻繁的頁面上，以 CHECK_THROTTLE_MS 合併檢查，避免每次變動都掃描整份文件。
    // 4. 和舊版一樣，找到並設定一次之後就停止觀察。
    let checkTimer = null;
    const observer = new MutationObserver(() => {
        if (checkTimer !== null) {
            return;
        }
        checkTimer = setTimeout(() => {
            checkTimer = null;
            if (tryApply()) {
                observer.disconnect();
            }
        }, CHECK_THROTTLE_MS);
    });

    // document-start 時 <html> 可能尚未建立，所以觀察 document 本身
    observer.observe(document, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['placeholder'],
    });
})();
