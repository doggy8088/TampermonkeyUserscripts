// ==UserScript==
// @name         博客來: 刪除首頁的蓋版廣告
// @version      1.0
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
// ==/UserScript==

(function () {
    'use strict';

    var css = `
    div.flash_pic { display: none !important; }
    div.flash_pic_pop { display: none !important; }
`;

    var style = document.createElement("style");
    style.innerHTML = css
    document.head.appendChild(style);

})();
