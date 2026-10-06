// ==UserScript==
// @name         YouTube: 自動下載影片字幕 (alt+s)
// @version      0.3.2
// @description  按下 alt+s 就可以自動下載當前影片字幕，並在 downsub.com 自動點擊 RAW 按鈕。
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/YouTubeDownloadSubtitle.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/YouTubeDownloadSubtitle.user.js
// @author       Will Huang
// @match        https://www.youtube.com/*
// @match        https://m.youtube.com/*
// @match        https://downsub.com/*
// @grant        GM_openInTab
// @grant        window.focus
// ==/UserScript==

(function () {
    'use strict';

    const LOG_PREFIX = '[YouTubeDownloadSubtitle]';
    const SVG_NS = 'http://www.w3.org/2000/svg';
    const DOWNLOAD_BUTTON_CLASS = 'ytp-download-subtitles-button';

    // 「字幕」按鈕的選擇器：優先找主播放器 #movie_player（觀看頁與嵌入頁的主播放器都使用這個 id）。
    // 首頁或推薦清單的滑鼠懸停預覽也會建立一組播放器控制列，舊版只取文件中第一個符合的按鈕，
    // 下載按鈕可能被插到預覽播放器上，之後真正觀看影片的主播放器反而沒有。
    // 主播放器尚未出現時，仍沿用舊版的通用選擇器插入第一個找到的播放器，但會繼續等待主播放器。
    const MAIN_SUBTITLES_BUTTON_SELECTOR = '#movie_player div.ytp-right-controls button.ytp-subtitles-button';
    const ANY_SUBTITLES_BUTTON_SELECTOR = 'div.ytp-right-controls button.ytp-subtitles-button';

    // 每次頁面載入或 SPA 換頁後，最多以 100ms 間隔重試 15 秒等待播放器控制列出現。
    // 舊版以 66ms 的 setInterval 一直輪詢到找到為止：在首頁、搜尋頁或 m.youtube.com 這類
    // 沒有桌面版播放器控制列的頁面，計時器永遠不會停止。
    const INJECT_RETRY_INTERVAL_MS = 100;
    const INJECT_RETRY_LIMIT = 150;

    let injectTimer = 0;

    // 監聽鍵盤事件 (YouTube)
    if (isValidYouTubeUrl()) {
        scheduleDownloadButtonInjection();

        // YouTube 桌面版是 SPA，切換影片時會在 document 上派送 yt-navigate-finish。
        // 播放器若在換頁時被重建（例如從首頁第一次進入影片頁），就需要重新插入下載按鈕；
        // ensureDownloadButton() 會先檢查按鈕是否已存在，因此重複觸發也不會插入第二顆。
        document.addEventListener('yt-navigate-finish', scheduleDownloadButtonInjection);

        document.addEventListener('keydown', function (event) {
            if (!((event.metaKey && event.key === "s") || (event.altKey && event.key === "s"))) return;

            // 輸入法組字期間的按鍵屬於輸入法，不當成快速鍵處理。
            if (event.isComposing) return;

            // 即使是長按產生的重複事件也要 preventDefault()，避免瀏覽器跳出「另存網頁」對話框；
            // 但只在第一次按下時開啟分頁，避免長按 Cmd+S / Alt+S 一口氣開出一整排 downsub.com 分頁。
            event.preventDefault();
            if (event.repeat) return;

            openNewTab(window.location.href);
        });
    }

    // 自動點擊 Raw 按鈕與發送訊息 (downsub.com)
    if (isValidDownsubUrl()) {
        // Tampermonkey 預設在 document-idle 執行，頁面很快載入完成時，load 事件可能早在腳本執行前就已觸發，
        // 舊版只監聽 load 會因此永遠不會開始找 RAW 按鈕；已載入完成時就直接執行。
        if (document.readyState === 'complete') {
            clickRawButtonAndSendMessage();
        } else {
            window.addEventListener('load', clickRawButtonAndSendMessage, { once: true });
        }
    }

    function scheduleDownloadButtonInjection() {
        clearInterval(injectTimer);
        injectTimer = 0;

        if (ensureDownloadButton()) return;

        let attempts = 0;
        injectTimer = setInterval(() => {
            attempts++;
            if (ensureDownloadButton() || attempts >= INJECT_RETRY_LIMIT) {
                clearInterval(injectTimer);
                injectTimer = 0;
            }
        }, INJECT_RETRY_INTERVAL_MS);
    }

    /**
     * 確保下載字幕按鈕插在「字幕」按鈕前面（同一組控制列已經有按鈕時不重複插入）。
     */
    function insertDownloadButtonBefore(subtitlesButton) {
        if (subtitlesButton.parentElement?.querySelector(`.${DOWNLOAD_BUTTON_CLASS}`)) return;
        ensureLegacyDefaultTrustedTypesPolicy();
        subtitlesButton.before(createDownloadButton());
    }

    /**
     * 相容層：維持舊版「找到字幕按鈕時，若頁面尚無 default policy 就建立一個原樣放行的 default policy」的副作用。
     *
     * 設計意圖：
     * - 本腳本自己已改用 DOM API 建立按鈕，完全不需要任何 Trusted Types policy。
     * - 但 default policy 是「整個 YouTube 頁面」共用的：0.3.1 以前，只要本腳本插入過按鈕，
     *   其他在 YouTube 上執行、直接指派 innerHTML 的 userscript（包含不在本 repo 的第三方腳本）
     *   都會因為這個 policy 而「碰巧能動」。若直接移除，那些腳本會開始丟出 TrustedHTML 相關的例外，
     *   對使用者而言就是 Breaking Change，因此本次刻意保留。
     * - 這個 policy 會讓頁面的 Trusted Types 防護形同虛設，是已知的安全取捨；待確認沒有其他腳本
     *   依賴它之後，可以在後續版本中移除這個函式。
     * - 建立時機與舊版相同（第一次插入按鈕時），避免比 YouTube 自己的程式更早佔用 default 名稱。
     * - 以 try/catch 包住：不支援 trustedTypes 的瀏覽器，或 CSP 不允許建立 default policy 時，
     *   舊版會丟出例外並讓輪詢計時器每 66ms 重複丟錯；這裡改為安靜略過，不影響按鈕插入。
     */
    function ensureLegacyDefaultTrustedTypesPolicy() {
        try {
            if (typeof trustedTypes === 'undefined' || trustedTypes.defaultPolicy) return;
            trustedTypes.createPolicy('default', {
                createHTML: (input) => input,
            });
        } catch (e) {
            // CSP 不允許或 default policy 已被其他程式建立：維持現狀即可
        }
    }

    /**
     * @returns {boolean} 主播放器已有下載按鈕、可以停止等待時回傳 true。
     */
    function ensureDownloadButton() {
        const mainSubtitlesButton = document.querySelector(MAIN_SUBTITLES_BUTTON_SELECTOR);
        if (mainSubtitlesButton) {
            insertDownloadButtonBefore(mainSubtitlesButton);
            return true;
        }

        // 主播放器還沒出現（例如從首頁點進影片、播放器正在建立）：維持舊版行為先插到第一個找到的播放器，
        // 但回傳 false 讓重試計時器繼續等主播放器，避免像舊版一樣插到預覽播放器後就停止。
        const anySubtitlesButton = document.querySelector(ANY_SUBTITLES_BUTTON_SELECTOR);
        if (anySubtitlesButton) {
            insertDownloadButtonBefore(anySubtitlesButton);
        }
        return false;
    }

    /**
     * 以 DOM API 建立下載字幕按鈕，屬性與舊版 HTML 字串完全相同：
     * <button class="ytp-download-subtitles-button ytp-button" aria-keyshortcuts="d" data-priority="4"
     *         data-title-no-tooltip="下載字幕" aria-label="下載字幕鍵盤快速鍵d" title="下載字幕(d)">
     *     <svg viewBox="-7 -7 38 38" xmlns="http://www.w3.org/2000/svg" fill="none"><path d="..." fill="currentColor"></path></svg>
     * </button>
     *
     * 舊版為了在啟用 Trusted Types 的 YouTube 上使用 insertAdjacentHTML()，必須透過 default policy
     * 把 HTML 字串轉成 TrustedHTML；在不支援 trustedTypes 的瀏覽器上還會因為 ReferenceError
     * 讓輪詢計時器每 66ms 丟一次例外。改用 createElement / createElementNS 建立節點後，
     * 按鈕本身完全不需要任何 Trusted Types policy（為了相容其他腳本而保留的 default policy
     * 請見 ensureLegacyDefaultTrustedTypesPolicy()）。
     */
    function createDownloadButton() {
        const button = document.createElement('button');
        button.className = `${DOWNLOAD_BUTTON_CLASS} ytp-button`;
        button.setAttribute('aria-keyshortcuts', 'd');
        button.setAttribute('data-priority', '4');
        button.setAttribute('data-title-no-tooltip', '下載字幕');
        button.setAttribute('aria-label', '下載字幕鍵盤快速鍵d');
        button.setAttribute('title', '下載字幕(d)');

        const svg = document.createElementNS(SVG_NS, 'svg');
        svg.setAttribute('viewBox', '-7 -7 38 38');
        svg.setAttribute('fill', 'none');

        const path = document.createElementNS(SVG_NS, 'path');
        path.setAttribute('d', 'M4 4H2v16h20V4H4zm0 2h16v12H4V6zm2 2h12v2H6V8zm0 4h10v2H6v-2z');
        path.setAttribute('fill', 'currentColor');

        svg.appendChild(path);
        button.appendChild(svg);

        button.addEventListener('click', function () {
            openNewTab(window.location.href);
        });

        return button;
    }

    function openNewTab(url) {
        // const modifiedUrl = `https://subtitle.to/${currentUrl}`;
        // const newWindow = window.open(modifiedUrl, '_blank');

        const newTab = GM_openInTab(`https://downsub.com/?url=${encodeURIComponent(url)}&raw=1`, {
            active: false,
            setParent: true
        });

        if (!newTab) {
            console.error(`${LOG_PREFIX} 無法開啟新分頁，請檢查瀏覽器設定`);
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
                    console.log(`${LOG_PREFIX} RAW 按鈕已成功點擊！`);

                    // 清空頁面內容，只留下 RAW 字幕下載流程；replaceChildren() 與舊版 innerHTML = '' 效果相同，
                    // 但不經過 HTML 解析，即使網站日後啟用 Trusted Types 也不會丟出例外。
                    document.body.replaceChildren();
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
                console.log(`${LOG_PREFIX} 20秒內未找到 Raw 按鈕`);
            }
        }, 60);
    }

})();
