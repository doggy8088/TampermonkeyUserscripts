// ==UserScript==
// @name         Facebook: FixWarnLink
// @version      1.1.1
// @description  讓 Facebook 點擊「外部連結」時可以不用去點擊確認按鈕
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/FBFixWarnLink.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/FBFixWarnLink.user.js
// @author       Will Huang
// @match        *://www.facebook.com/flx/warn/?u=*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // 只允許導向這兩種協定。u 參數完全由「產生這個警告頁連結的人」控制，
    // 任何人都能在站外貼出 https://www.facebook.com/flx/warn/?u=javascript:... 這種網址；
    // 若不檢查就直接 location.replace()，javascript: 網址會在 facebook.com 的頁面環境中執行，
    // 等同讓攻擊者取得使用者 Facebook 登入狀態下的任意 JS 執行權（XSS）。
    // data:、blob:、file: 等協定同樣沒有自動導頁的正當理由，一律交還給 Facebook 原本的警告頁處理。
    const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);

    /**
     * 從警告頁網址取出 u 參數，並驗證它是可以安全自動導向的網址。
     * 範例：https://www.facebook.com/flx/warn/?u=https%3A%2F%2Fdevblogs.microsoft.com%2F
     *
     * - URLSearchParams 會自動做 percent-decoding，取得原始目標網址。
     * - 以目前頁面網址作為 base 解析，讓 u 是相對路徑時仍與舊版 location.replace() 的解析結果一致。
     * - 缺少 u、網址無法解析或協定不在白名單時回傳 null，維持停留在警告頁，
     *   而不是像舊版一樣導向 "null" 這種不存在的相對路徑。
     *
     * @returns {string|null} 可安全導向的完整網址；無法安全導向時回傳 null。
     */
    function getSafeTargetUrl() {
        const rawTarget = new URLSearchParams(location.search).get('u');
        if (!rawTarget) return null;

        try {
            const targetUrl = new URL(rawTarget, location.href);
            return ALLOWED_PROTOCOLS.has(targetUrl.protocol) ? targetUrl.href : null;
        } catch {
            return null;
        }
    }

    const targetUrl = getSafeTargetUrl();
    if (!targetUrl) return;

    // 使用 replace() 而不是指定 location.href，讓警告頁不留在瀏覽紀錄中，
    // 使用者按「上一頁」時會直接回到原本的 Facebook 頁面，而不是又回到這個會自動跳轉的警告頁。
    location.replace(targetUrl);

})();
