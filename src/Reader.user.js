// ==UserScript==
// @name         Reader: 將現有網頁轉成 Markdown 格式
// @version      0.1
// @description  將現有網頁轉成 Markdown 格式
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/Reader.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/Reader.user.js
// @author       Will Huang
// @match        *://*/*
// @run-at       context-menu
// ==/UserScript==

(function() {
    'use strict';

    // https://github.com/jina-ai/reader
    location.href = 'https://r.jina.ai/' + location.href;

})();
