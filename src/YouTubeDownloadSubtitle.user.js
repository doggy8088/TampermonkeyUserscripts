// ==UserScript==
// @name         YouTube: 自動下載影片字幕 (alt+s)
// @version      0.2.0
// @description  按下 alt+s 就可以自動下載當前影片字幕，並在 downsub.com 自動點擊 RAW 按鈕。
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/YouTubeDownloadSubtitle.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/YouTubeDownloadSubtitle.user.js
// @author       Will Huang
// @match        https://www.youtube.com/*
// @match        https://downsub.com/*
// @grant        GM_openInTab
// ==/UserScript==

(function () {
    'use strict';

    // 監聽鍵盤事件 (YouTube)
    if (isValidYouTubeUrl()) {
        document.addEventListener('keydown', function (event) {
            if ((event.metaKey && event.key === "s")
             || (event.altKey && event.key === "s")) {
                const currentUrl = window.location.href;
                // const modifiedUrl = `https://subtitle.to/${currentUrl}`;
                // const newWindow = window.open(modifiedUrl, '_blank');

                const encodedUrl = encodeURIComponent(currentUrl);
                const newTab = GM_openInTab(`https://downsub.com/?url=${encodedUrl}&raw=1`, {
                    active: true,
                    setParent: true
                });

                if (newTab) {
                    console.log('已開啟新分頁');

                    console.dir(newTab);
                    setTimeout(() => { newTab.focus(); }, 2000);

                } else {
                    console.error('無法開啟新分頁，請檢查瀏覽器設定');
                }
            }
        });
    }

    // 自動點擊 Raw 按鈕與發送訊息 (downsub.com)
    if (isValidDownsubUrl()) {
        function clickRawButtonAndSendMessage() {
            let attempts = 0;
            const maxAttempts = 20000 / 60; // 20 秒 / 60 毫秒
            const intervalId = setInterval(function () {
                const buttons = document.querySelectorAll('button');
                for (let i = 0; i < buttons.length; i++) {
                    if (buttons[i].textContent.toUpperCase().includes('RAW')) { // 找到第一個 RAW 按鈕
                        clearInterval(intervalId);

                        buttons[i].click();_
                        console.log('RAW 按鈕已成功點擊！');

                        return;
                    }
                }
                attempts++;
                if (attempts >= maxAttempts) {
                    clearInterval(intervalId);
                    console.log('20秒內未找到 Raw 按鈕');
                }
            }, 60);
        }

        // 等待頁面加載完成後執行
        if (document.readyState === 'complete') {
            clickRawButtonAndSendMessage();
        } else {
            window.addEventListener('load', clickRawButtonAndSendMessage);
        }
    }

    function isValidYouTubeUrl() {
        return window.location.hostname.includes('youtube.com');
    }

    function isValidDownsubUrl() {
        return window.location.hostname.includes('downsub.com')
            && window.location.search.includes('raw=1');
    }
})();
