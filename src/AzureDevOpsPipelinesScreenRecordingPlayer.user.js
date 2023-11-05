// ==UserScript==
// @name         Azure DevOps: 調整工作項目直接播放螢幕錄影影片
// @version      1.2
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
// ==/UserScript==

(function () {
    'use strict';

    function replaceVideos() {
        // <a href="https://xxxxx.visualstudio.com//TestManagement/v1.0/AttachmentDownload.ashx?run=0&amp;res=0&amp;id=1407" style="margin-left:30px">Screen recording - 1</a>
        let allAnchors = document.querySelectorAll('a[href*="TestManagement/v1.0/AttachmentDownload.ashx"]')
        allAnchors.forEach(a => {
            if (a.className != 'x-show' && a.innerText.indexOf('Screen recording') >= 0) {
                a.className = "x-show";
                a.outerHTML = a.outerHTML + `<video src="${a.href}" controls width="100%"></video>`;
            }
        })
    }

    (function () {
        'use strict';

        document.addEventListener('keyup', function (e) {
            if (e.ctrlKey && e.altKey && e.shiftKey && e.key == 'P') {
                replaceVideos();
            }
        });

    })();

})();
