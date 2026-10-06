// ==UserScript==
// @name         按下多次 Ctrl-C 就會自動複製網址
// @version      0.14.1
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
        let isUserSelectingText = hasSelectedText();
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
            // 必須在第一個 await 之前「同步」呼叫 preventDefault()
            // 設計意圖：事件處理函式一遇到 await 就會先返回，瀏覽器接著執行預設的複製動作，
            // 之後才呼叫的 preventDefault() 完全無效。舊版把它放在最後，GitHub（tree 頁面要 fetch 判斷分支）
            // 與 Azure DevOps（要等待對話框）這兩條非同步流程就攔不住預設動作。
            event.preventDefault();

            let url = window.location.href;

            try {
                // https://dev.azure.com/willh/_git/chocolatey-codegpt
                if ((location.host === 'dev.azure.com' && location.pathname.match(/^\/[^\/]+\/_git/)) ||
                    (location.host.endsWith('.visualstudio.com') && location.pathname.match(/^\/_git\/[^\/]+/)) ||
                    (location.host.endsWith('.visualstudio.com') && location.pathname.match(/^\/[^\/]+\/_git/))) {
                    // 取得 Azure DevOps 儲存庫的 URL
                    url = await getAzureDevOpsUrl(url);

                    // 組合成 git clone 指令
                    url = `git clone ${url} && cd "${url.split('/').pop().replace('.git', '')}"`;

                }

                if (location.host === 'learn.microsoft.com') {
                    url = sanitizeMicrosoftLearn(url);
                }

                if (location.host === 'github.com') {
                    url = await sanitizeGitHubUrl(url);
                }
            } catch (err) {
                // 非同步流程失敗（例如 GitHub 判斷分支時網路中斷）時，舊版會留下未處理的 Promise rejection，
                // 剪貼簿完全沒有被寫入；改為退回複製目前頁面的網址，至少完成「複製網址」這個基本功能
                console.warn('[CtrlCCtrlCCopyURL] 處理網址時發生錯誤，改為複製目前頁面網址:', err);
                url = window.location.href;
            }

            // 使用 Tampermonkey 內建 剪貼簿 函式
            GM_setClipboard(url);
            console.log('URL 已複製到剪貼簿:', url);
        }

    });

    /**
     * 判斷使用者目前是否有選取文字
     * 設計意圖：
     * 1. 一般網頁內容的選取，可從 window.getSelection() 取得（Firefox 在 display:none 的 iframe 中
     *    可能回傳 null，所以用 optional chaining 保護）。
     * 2. 但 <input>、<textarea> 內的選取「不會」反映在 window.getSelection() 上（Chrome 與 Firefox
     *    都回傳空字串）。舊版因此會在使用者於輸入框選取文字、1 秒內按兩次 Ctrl-C 時，攔下第二次複製
     *    並改成複製網址，使用者選取的文字反而沒被複製。網站「複製程式碼」按鈕常用隱藏的 textarea 搭配
     *    execCommand('copy')，連點兩次也會被誤判。
     * 3. 焦點位於 Shadow DOM 內時，document.activeElement 只會是宿主元素，所以要往 shadowRoot 裡追。
     */
    function hasSelectedText() {
        if ((window.getSelection()?.toString().length ?? 0) > 0) {
            return true;
        }

        let el = document.activeElement;
        while (el && el.shadowRoot && el.shadowRoot.activeElement) {
            el = el.shadowRoot.activeElement;
        }
        if (!el || (el.localName !== 'input' && el.localName !== 'textarea')) {
            return false;
        }

        // 部分 input 類型（email、number 等）不支援選取範圍，讀取 selectionStart 會得到 null 或丟出例外
        try {
            const start = el.selectionStart;
            const end = el.selectionEnd;
            return typeof start === 'number' && typeof end === 'number' && end > start;
        } catch (e) {
            return false;
        }
    }

    // 取得 Azure DevOps 儲存庫的 Clone URL（找不到時回傳傳入的原始 url）
    // 設計意圖：舊版寫成 new Promise(async (resolve) => {...}) 的反模式，執行過程中只要任何一行丟出例外，
    // Promise 就永遠不會 resolve，整個複製流程會卡住；改為一般的 async 函式，例外會正常往外拋，
    // 交給呼叫端的 try/catch 處理。點選順序與等待時間完全沿用舊版。
    async function getAzureDevOpsUrl(url) {
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
                            document.querySelector('button[aria-label="Close"]')?.click();
                            break;
                        }
                    }
                    break;
                }
            }
        }

        return resultUrl;
    }

    function sanitizeMicrosoftLearn(url) {
        // 過濾掉 learn.microsoft.com 網站上的 view=* 與 viewFallbackFrom=* 參數，確保拿到的網址一定是最新版
        // https://learn.microsoft.com/en-us/powershell/module/az.resources/get-azadappcredential?view=azps-12.1.0&viewFallbackFrom=azps-11.3.0&WT.mc_id=DT-MVP-4015686
        // https://learn.microsoft.com/en-us/powershell/module/az.resources/get-azadappcredential?view=azps-12.1.0&WT.mc_id=DT-MVP-4015686#outputs
        // 設計意圖：改用 URL 物件處理，修正舊版字串拼接的兩個問題：
        // 1. 刪除後沒有剩下任何參數（或原本就沒有查詢字串）時，網址結尾會多出一個「?」。
        // 2. 網址有 #hash 但沒有查詢字串時，url.split('?')[0] 已經包含 #hash，後面又再接一次 location.hash，
        //    變成「...#outputs?#outputs」。
        // 其餘參數的編碼方式與舊版相同（都是 URLSearchParams 的序列化結果），#hash 也照舊保留。
        try {
            const u = new URL(url);
            u.searchParams.delete('view');
            u.searchParams.delete('viewFallbackFrom');
            return u.toString();
        } catch (e) {
            return url;
        }
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
