// ==UserScript==
// @name         YouTube: 自動下載影片字幕 (alt+s)
// @version      0.3.0
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
// @grant        window.focus
// ==/UserScript==

(function () {
    'use strict';

    // 監聽鍵盤事件 (YouTube)
    if (isValidYouTubeUrl()) {
        // 找到 div.ytp-right-controls 底下的所有 button.ytp-button.ytp-subtitles-button
        // 然後在這個 button 前面插入以下 button 的 HTML 內容
        // <button class="ytp-subtitles-button ytp-button" aria-keyshortcuts="c" data-priority="4" data-title-no-tooltip="字幕" aria-label="字幕鍵盤快速鍵c"><svg viewBox="-7 -7 38 38" xmlns="http://www.w3.org/2000/svg" fill="none"><path d="M4 4H2v16h20V4H4zm0 2h16v12H4V6zm2 2h12v2H6V8zm0 4h10v2H6v-2z" fill="currentColor"></path></svg></button>
        const checkSubtitlesButton = setInterval(() => {
            const subtitlesButton = document.querySelector('div.ytp-right-controls button.ytp-subtitles-button');
            if (subtitlesButton) {
                const newButtonHtml = `
                    <button class="ytp-download-subtitles-button ytp-button" aria-keyshortcuts="d" data-priority="4" data-title-no-tooltip="下載字幕" aria-label="下載字幕鍵盤快速鍵d" title="下載字幕(d)">
                        <svg viewBox="-7 -7 38 38" xmlns="http://www.w3.org/2000/svg" fill="none"><path d="M4 4H2v16h20V4H4zm0 2h16v12H4V6zm2 2h12v2H6V8zm0 4h10v2H6v-2z" fill="currentColor"></path></svg>
                    </button>
                `;
                const policy = trustedTypes.defaultPolicy || trustedTypes.createPolicy("default", {
                    createHTML: (input) => input, // Identity function (modify if necessary)
                });

                // Use policy to generate safe HTML
                const safeHTML = policy.createHTML(newButtonHtml);

                // Insert into DOM safely
                subtitlesButton.insertAdjacentHTML("beforebegin", safeHTML);

                const myButton = document.querySelector('div.ytp-right-controls button.ytp-download-subtitles-button');
                myButton.addEventListener('click', function () {
                    openNewTab(window.location.href);
                });

                clearInterval(checkSubtitlesButton);
            }
        }, 66);


        document.addEventListener('keydown', function (event) {
            if ((event.metaKey && event.key === "s") || (event.altKey && event.key === "s")) {
                event.preventDefault();
                openNewTab(window.location.href);
            }
        });
    }

    // 自動點擊 Raw 按鈕與發送訊息 (downsub.com)
    if (isValidDownsubUrl()) {
        window.addEventListener('load', clickRawButtonAndSendMessage);
    }

    function openNewTab(url) {
        // const modifiedUrl = `https://subtitle.to/${currentUrl}`;
        // const newWindow = window.open(modifiedUrl, '_blank');

        const newTab = GM_openInTab(`https://downsub.com/?url=${encodeURIComponent(url)}&raw=1`, {
            active: false,
            setParent: true
        });

        if (!newTab) {
            console.error('無法開啟新分頁，請檢查瀏覽器設定');
        }
    }

    function isValidYouTubeUrl() {
        return window.location.hostname.includes('youtube.com');
    }

    function isValidDownsubUrl() {
        return window.location.hostname.includes('downsub.com')
            && window.location.search.includes('raw=1');
    }

    function clickRawButtonAndSendMessage() {
        let attempts = 0;
        const maxAttempts = 20000 / 60; // 20 秒 / 60 毫秒
        const intervalId = setInterval(function () {
            const buttons = document.querySelectorAll('button');
            for (let i = 0; i < buttons.length; i++) {
                if (buttons[i].textContent.toUpperCase().includes('RAW')) { // 找到第一個 RAW 按鈕
                    clearInterval(intervalId);

                    buttons[i].click();
                    console.log('RAW 按鈕已成功點擊！');

                    document.body.innerHTML = '';
                    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                        document.body.style.backgroundColor = '#000';
                    }

                    window.focus();

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

})();
