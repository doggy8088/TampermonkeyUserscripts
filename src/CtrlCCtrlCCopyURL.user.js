// ==UserScript==
// @name         按下多次 Ctrl-C 就會自動複製網址
// @version      0.14.0
// @description  按下多次 Ctrl-C 就會自動複製網址，為了方便自行實作複製網址的邏輯。
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/CtrlCCtrlCCopyURL.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/CtrlCCtrlCCopyURL.user.js
// @author       Will Huang
// @match        *://*/*
// @grant        GM_setClipboard
// ==/UserScript==

(async function () {
    'use strict';
    let lastCopy = 0;
    let numOfClicks = 0;
    let timeoutMs = 1000;
    document.addEventListener('copy', async (event) => {
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
        if (numOfClicks == 2) {
            let url = window.location.href;

            // https://dev.azure.com/willh/_git/chocolatey-codegpt
            if ((location.host === 'dev.azure.com' && location.pathname.match(/^\/[^\/]+\/_git/)) ||
                (location.host.endsWith('.visualstudio.com') && location.pathname.match(/^\/_git\/[^\/]+/)) ||
                (location.host.endsWith('.visualstudio.com') && location.pathname.match(/^\/[^\/]+\/_git/))) {
                // 建立一個 Promise 來處理 Azure DevOps 的複製 URL 邏輯
                const getAzureDevOpsUrl = async () => {
                    return new Promise(async (resolve) => {
                        let resultUrl = url; // 預設使用原始 url

                        // 點擊版控選單按鈕
                        document.querySelector('a.repos-file-explorer-header-repo-link')?.parentElement?.nextElementSibling?.firstElementChild?.click();
                        await delay(500);

                        // 尋找並點擊 Clone 選項
                        const submenu = document.getElementById('__bolt-header-submenu-callout');
                        if (submenu) {
                            const rows = submenu.querySelectorAll('tr');
                            for (const tr of rows) {
                                if (tr.textContent.trim() === 'Clone') {
                                    tr.click();
                                    await delay(700); // 等待複製對話框出現

                                    // 尋找包含 https:// 的輸入欄位
                                    const inputs = document.querySelectorAll('input');
                                    for (const input of inputs) {
                                        if (input.value && input.value.startsWith('https://')) {
                                            resultUrl = input.value;
                                            document.querySelector('button[aria-label="Close"]')?.click()
                                            break;
                                        }
                                    }
                                    break;
                                }
                            }
                        }

                        resolve(resultUrl);
                    });
                };
                // 取得 Azure DevOps 儲存庫的 URL
                url = await getAzureDevOpsUrl();

                // 組合成 git clone 指令
                url = `git clone ${url} && cd "${url.split('/').pop().replace('.git', '')}"`;

            }

            if (location.host === 'learn.microsoft.com') {
                url = sanitizeMicrosoftLearn(url);
            }

            if (location.host === 'github.com') {
                url = await sanitizeGitHubUrl(url);
            }



            // 使用 Tampermonkey 內建 剪貼簿 函式
            GM_setClipboard(url);
            console.log('URL 已複製到剪貼簿:', url);

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

    async function sanitizeGitHubUrl(url) {
        // 先移除所有 QueryString 與 Fragment，避免影響路徑解析與 git 指令
        try {
            const u = new URL(url, window.location.href);
            url = u.origin + u.pathname; // 移除 ?... 與 #...
        } catch (e) {
            // 非法 URL 的後援做法
            url = url.split('#')[0].split('?')[0];
        }

        // https://github.com/doggy8088/Software-Engineering-at-Google
        // https://github.com/doggy8088/Software-Engineering-at-Google/tree/zh-tw-20240725
        // https://github.com/doggy8088/Software-Engineering-at-Google/tree/zh-tw/assets/images
        // https://github.com/doggy8088/www-project-top-10-for-large-language-model-applications/tree/translations/zh-TW/2_0_vulns/translations/zh-TW
        // https://github.com/doggy8088/Software-Engineering-at-Google/commit/600c955ab0919648bd86953d9b61112a0c9010d3
        // https://github.com/doggy8088/Software-Engineering-at-Google/issues

        // get path info and separate to various meaningful parts
        const urlParts = url.split('/');
        console.log('urlParts', urlParts);
        const user = urlParts[3];
        const repo = urlParts[4];
        const type = urlParts[5];
        // 因為 branch 名稱可能有包含斜線符號，所以不能這樣抓
        // const branch = urlParts[6];
        const commit = urlParts[6];
        const issue = urlParts[6];
        const pull = urlParts[6];
        const tree = urlParts[6];
        const blob = urlParts[6];
        const path = urlParts.slice(7).join('/');

        if (!user) {
            return url;
        }

        if (!repo) {
            return url;
        }

        if (type === 'tree') {
            async function getBranchName(user, repo, parts) {
                let branch = '';
                for (let i = 0; i < parts.length; i++) {
                    branch += (i > 0 ? '/' : '') + parts[i];
                    console.log(`Checking branch: https://github.com/${user}/${repo}/tree/${branch}`);
                    const response = await fetch(`https://github.com/${user}/${repo}/tree/${branch}`);
                    if (response.status !== 404) {
                        return branch;
                    }
                }
                return branch;
            }
            let branchName = await getBranchName(user, repo, urlParts.slice(6));
            url = `git clone https://github.com/${user}/${repo}.git -b ${branchName}`;
            return url;
        }
        else if (type === 'commit') {
            url = `git clone https://github.com/${user}/${repo}.git --filter=blob:none --no-checkout --single-branch ${repo} && cd "${repo}" && git fetch --depth 1 origin ${commit} && git checkout ${commit}`;
            return url;
        }
        else if (type === 'pull') {
            url = `git clone https://github.com/${user}/${repo}.git ${repo}-pr-${pull} && cd "${repo}-pr-${pull}" && git fetch origin pull/${pull}/head:pr-${pull} && git checkout pr-${pull}`;
            return url;
        }
        else {
            url = `git clone https://github.com/${user}/${repo}.git && cd "${repo}"`;
        }

        return url;
    }

    // 延遲函式
    async function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

})();
