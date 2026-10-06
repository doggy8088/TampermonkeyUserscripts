// ==UserScript==
// @name         Jina Reader: 將現有網頁轉成 Markdown 格式 (alt+r)
// @version      0.2.2
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
// @grant        none
// @noframes
// ==/UserScript==

(function () {
    'use strict';

    // 補充：metadata 加上 @noframes，讓腳本只在最上層頁面執行。
    // 設計意圖：舊版在每個 iframe 中也會註冊快捷鍵，焦點位於嵌入內容（例如 YouTube 播放器、CodePen、
    // 第三方留言框）時按下快捷鍵，被導向 r.jina.ai 的是那個 iframe 的網址，而且是在 iframe 裡面換頁，
    // 整個頁面並沒有轉成 Markdown，這不是使用者要的結果。只在最上層執行後，焦點在 iframe 中時
    // 按鍵就回歸瀏覽器的預設行為。

    document.addEventListener("keydown", (event) => {
        if ((event.metaKey && event.key === "r") || (event.altKey && event.key === "r")) {
            // 已經在 r.jina.ai 的結果頁面時不再套一層（舊版會變成 https://r.jina.ai/https://r.jina.ai/...），
            // 直接交給瀏覽器處理（例如 macOS 上的 Cmd+R 會正常重新整理）
            if (location.hostname === 'r.jina.ai') {
                return;
            }

            // 接手快捷鍵時一併取消預設行為：macOS 上 Cmd+R 的預設動作是重新整理，
            // 不取消的話，瀏覽器的重新整理可能和下面的換頁互相競爭，導致偶爾只是重新整理了原頁面
            event.preventDefault();

            // https://github.com/jina-ai/reader
            // https://jina.ai/reader
            location.href = 'https://r.jina.ai/' + location.href;
        }
    });

})();
