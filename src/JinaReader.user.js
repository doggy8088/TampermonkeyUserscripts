// ==UserScript==
// @name         Jina Reader: 將現有網頁轉成 Markdown 格式 (alt+r)
// @version      0.2.0
// @description  將現有網頁轉成 Markdown 格式
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/JinaReader.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/JinaReader.user.js
// @author       Will Huang
// @match        *://*/*
// @run-at       document-start
// ==/UserScript==

(function () {
    'use strict';

    // 為整個文檔添加按鍵監聽器
    document.addEventListener("keydown", (event) => {
        // 判斷是否按下 Ctrl + Delete
        if ((event.metaKey && event.key === "r")
         || (event.altKey && event.key === "r")) {

            // https://github.com/jina-ai/reader
            // https://jina.ai/reader
            location.href = 'https://r.jina.ai/' + location.href;
        }
    });

})();
