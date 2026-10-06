// ==UserScript==
// @name         Azure DevOps: 調整工作項目直接播放螢幕錄影影片
// @version      1.2.1
// @description  將 Azure Boards 的 Work Item 內容中出現的 Screen recording 連結都改成可以直接播放影片
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/AzureDevOpsPipelinesScreenRecordingPlayer.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/AzureDevOpsPipelinesScreenRecordingPlayer.user.js
// @author       Will Huang
// @match        *://*.visualstudio.com/*
// @match        *://dev.azure.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // 已處理過的連結會加上這個 class，重複按下快速鍵時就不會再插入一次影片。
    const processedClassName = 'x-show';

    function replaceVideos() {
        // <a href="https://xxxxx.visualstudio.com//TestManagement/v1.0/AttachmentDownload.ashx?run=0&amp;res=0&amp;id=1407" style="margin-left:30px">Screen recording - 1</a>
        let allAnchors = document.querySelectorAll('a[href*="TestManagement/v1.0/AttachmentDownload.ashx"]')
        allAnchors.forEach(a => {
            if (!a.classList.contains(processedClassName) && a.innerText.indexOf('Screen recording') >= 0) {
                a.classList.add(processedClassName);

                // 原本以 a.outerHTML = a.outerHTML + '<video src="${a.href}" ...>' 插入影片，有兩個問題：
                // 1. 會把原本的 <a> 整個換成重新解析出來的複本，Azure DevOps 綁在連結上的事件與
                //    前端框架持有的節點參照都會失效；
                // 2. 把網址直接拼進 HTML 字串，要靠瀏覽器的網址編碼才不會跳脫屬性。
                // 改以 DOM API 建立 <video> 並插在連結後面，原本的連結節點完全不動，網址也只會被當成屬性值。
                const video = document.createElement('video');
                video.src = a.href;
                video.controls = true;
                // 沿用原本的 width="100%" 屬性寫法，讓影片寬度與原版一致。
                video.setAttribute('width', '100%');
                a.insertAdjacentElement('afterend', video);
            }
        })
    }

    document.addEventListener('keyup', function (e) {
        if (e.ctrlKey && e.altKey && e.shiftKey && e.key == 'P') {
            replaceVideos();
        }
    });

})();
