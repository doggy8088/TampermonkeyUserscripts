// ==UserScript==
// @name         玉山銀行: 添加遺失的表單欄位 id 屬性
// @version      1.1.0
// @description  修復玉山銀行玉山全球智匯網登入頁面無法使用密碼管理器的問題
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ESUN_Add_Field_ID.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ESUN_Add_Field_ID.user.js
// @match        https://gib.esunbank.com/*
// @author       Will Huang
// @run-at       document-start
// @icon         https://www.google.com/s2/favicons?sz=64&domain=https://gib.esunbank.com
// ==/UserScript==

(async function () {
    "use strict";
    let it = setInterval(() => {
        let elm = document.querySelector('input[placeholder="顧客ID/代號"],input[placeholder="顾客ID/代号"],input[placeholder="Customer ID/No"]');
        if (elm) {

            // 自動從 FRAME 中跳出來變成主角
            if (location.href != top.location.href) top.location.href = location.href;

            elm.id = 'inputCustomerId';
            clearInterval(it);

        }
    }, 60);
})();
