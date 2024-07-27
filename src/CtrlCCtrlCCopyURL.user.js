// ==UserScript==
// @name         按下多次 Ctrl-C 就會自動複製網址
// @version      0.8.0
// @description  按下多次 Ctrl-C 就會自動複製網址，為了方便自行實作複製網址的邏輯。
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/CtrlCCtrlCCopyURL.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/CtrlCCtrlCCopyURL.user.js
// @author       Will Huang
// @match        *://*/*
// ==/UserScript==

(function () {
    'use strict';
    let lastCopy = 0;
    let numOfClicks = 0;
    let timeoutMs = 1000;
    document.addEventListener('copy', function (event) {
        // 如果使用者正在選取文字，就不要觸發 Ctrl-C 複製網址的功能
        let isUserSelectingText = window.getSelection().toString().length > 0;
        if (isUserSelectingText) {
            return;
        }

        // 判斷使用者在 1 秒內按了幾次 Ctrl-C
        let now = new Date().getTime();
        numOfClicks++;
        if (now - lastCopy > timeoutMs) { numOfClicks = 1; }
        lastCopy = now;

        // 只要在 1 秒內連續按兩次 Ctrl-C，就會自動複製網址
        if (numOfClicks >= 2) {
            let url = window.location.href;

            if (location.host === 'learn.microsoft.com') {
                url = sanitizeMicrosoftLearn(url);
            }

            if (location.host === 'github.com') {
                url = sanitizeGitHubUrl(url);
            }

            navigator.clipboard.writeText(url)
                .then(() => {
                    console.log('URL copied to clipboard:', url);
                })
                .catch((error) => {
                    console.error('Failed to copy URL to clipboard:', error);
                });

            event.preventDefault();
        }

    });

    function sanitizeMicrosoftLearn(url) {
        // 過濾掉 learn.microsoft.com 網站上的 view=* 與 viewFallbackFrom=* 參數，確保拿到的網址一定是最新版
        // https://learn.microsoft.com/en-us/powershell/module/az.resources/get-azadappcredential?view=azps-12.1.0&viewFallbackFrom=azps-11.3.0&WT.mc_id=DT-MVP-4015686
        // https://learn.microsoft.com/en-us/powershell/module/az.resources/get-azadappcredential?view=azps-12.1.0&WT.mc_id=DT-MVP-4015686#outputs
        const urlParams = new URLSearchParams(window.location.search);
        urlParams.delete('view');
        urlParams.delete('viewFallbackFrom');
        url = `${url.split('?')[0]}?${urlParams.toString()}`;
        if (location.hash) {
            url += location.hash;
        }

        return url;
    }

    function sanitizeGitHubUrl(url) {
        // https://github.com/doggy8088/Software-Engineering-at-Google
        // https://github.com/doggy8088/Software-Engineering-at-Google/tree/zh-tw-20240725
        // https://github.com/doggy8088/Software-Engineering-at-Google/tree/zh-tw/assets/images
        // https://github.com/doggy8088/Software-Engineering-at-Google/commit/600c955ab0919648bd86953d9b61112a0c9010d3
        // https://github.com/doggy8088/Software-Engineering-at-Google/issues
        const parts = url.split('/');
        const owner = parts?.[3];
        const repo = parts?.[4].split('?')[0];
        const type = parts?.[5];
        const branch = parts?.[6];
        if (owner && repo) {
            url = `https://github.com/${owner}/${repo}.git`;

            if (numOfClicks >= 3) {
                // https://github.com/doggy8088/espanso/
                url = `git clone https://github.com/${owner}/${repo}.git`;

                // https://github.com/doggy8088/espanso/tree/add-taskbar-links
                if ((type === 'tree' || type === 'commits') && branch) {
                    url = `git clone https://github.com/${owner}/${repo}.git -b ${branch}`;
                }

                // https://github.com/espanso/espanso/pull/1982
                if (type === 'pull' && branch) {
                    url = `${url} && cd ${repo} && git fetch origin pull/${branch}/head:pr-${branch} && git switch pr-${branch}`;
                }
            }
        }

        return url;
    }

})();
