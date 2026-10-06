// ==UserScript==
// @name         博客來: 刪除首頁的蓋版廣告
// @version      1.0.1
// @description  刪除博客來首頁的蓋版廣告
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/BooksADRemover.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/BooksADRemover.user.js
// @author       Will Huang
// @match        https://www.books.com.tw/*
// @run-at       document-body
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    var css = `
    div.flash_pic { display: none !important; }
    div.flash_pic_pop { display: none !important; }
`;

    // 用 textContent 寫入 CSS：內容是純文字，不需要經過 HTML 解析器，
    // 也不會在啟用 Trusted Types 的頁面上因為指派 innerHTML 而丟出例外
    var style = document.createElement("style");
    style.textContent = css;
    // @run-at document-body 時 <head> 通常已存在；保險起見在缺少 <head> 時改掛到 <html> 底下，避免 null 存取錯誤
    (document.head || document.documentElement).appendChild(style);

})();
