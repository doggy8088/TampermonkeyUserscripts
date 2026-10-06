// ==UserScript==
// @name         Azure DevOps: 佈景主題切換器
// @version      0.1.1
// @description  按下 alt+s 快速鍵就會自動切換目前網頁的 Dark/Light 模式
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/AzureDevOpsDarkModeSwitcher.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/AzureDevOpsDarkModeSwitcher.user.js
// @author       Will Huang
// @match        https://*.visualstudio.com/*
// @match        https://dev.azure.com/*
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // 切換主題的 PATCH 請求送出後、頁面重新載入前的這段期間，使用者若連按 Alt+S，
    // 會重複送出多個相同的請求。以旗標鎖住，確保同一時間只會有一個切換請求在進行。
    let isSwitching = false;

    document.addEventListener('keydown', async (ev) => {
        // 只接手 Alt+S（以及 Alt+Shift+S 的 CapsLock 提示）。同時按著 Ctrl 或 Meta 時
        // （例如 Windows 的 AltGr 等同 Ctrl+Alt、或其他工具的組合鍵）一律不處理，避免修飾鍵衝突。
        if (!ev.altKey || ev.ctrlKey || ev.metaKey) return;

        // 輸入法（注音、倉頡等）組字中的按鍵屬於輸入行為，不應被當成快速鍵。
        if (ev.isComposing || shouldIgnoreTarget(ev.target)) return;

        const keyCase = getKeySCase(ev);
        if (!keyCase) return;

        // 已確定要接手這個快速鍵，阻止瀏覽器的預設行為
        // （例如 Windows 版 Firefox 按下 Alt+S 會開啟功能表列的「歷史」選單）。
        ev.preventDefault();

        // 按住不放時 keydown 會自動重複觸發，只在第一次按下時動作。
        if (ev.repeat) return;

        if (keyCase === 'upper') {
            alert('你是不是不小心按到了 CAPSLOCK 鍵？');
            return;
        }

        await run();
    });

    /**
     * 判斷這次按鍵是否為 S 鍵，並區分大小寫。
     * 回傳 'lower'（一般的 Alt+S）、'upper'（CapsLock 開啟或按著 Shift）或 null（不是 S 鍵）。
     */
    function getKeySCase(ev) {
        if (ev.key === 's') return 'lower';
        if (ev.key === 'S') return 'upper';

        // macOS 的 Option（Alt）鍵會改變輸出的字元：Option+S 的 ev.key 是「ß」、
        // Option+Shift+S 則是「Í」，單看 ev.key 永遠比對不到，導致快速鍵在 Mac 上完全無效。
        // 因此只在 ev.key「不是英文字母」（代表字元已被 Option 轉換）時，才退而以實體按鍵位置
        // ev.code 判斷；ev.key 仍是英文字母時維持原本的比對方式，不影響 Windows/Linux 與
        // Dvorak 等非 QWERTY 鍵盤配置的既有行為。
        if (ev.code === 'KeyS' && !/^[a-z]$/i.test(ev.key)) {
            const isUpper = ev.shiftKey || (typeof ev.getModifierState === 'function' && ev.getModifierState('CapsLock'));
            return isUpper ? 'upper' : 'lower';
        }

        return null;
    }

    /**
     * 判斷按鍵事件的目標是否為輸入情境，是的話就不攔截快速鍵。
     * 原本只排除 input/select/textarea/button；但 Azure Boards（New Boards Hub）的描述、
     * 討論等 HTML 欄位是 contenteditable 編輯器，在裡面按下 Alt+S 會切換主題並重新載入頁面，
     * 造成尚未儲存的內容遺失，因此一併排除可編輯區域。
     */
    function shouldIgnoreTarget(target) {
        if (!target || target.nodeType !== Node.ELEMENT_NODE) return false;
        if (/^(?:input|select|textarea|button)$/i.test(target.nodeName)) return true;
        return target.isContentEditable === true;
    }

    function getAccessToken() {
        const now = Date.now() / 1000;
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            try {
                const item = JSON.parse(localStorage.getItem(key));
                if (item.expiresOn && item.expiresOn > now && item.tokenType == 'Bearer') {
                    return item.secret;
                }
            } catch (e) {
            }
        }
    }

    function getThemeId() {
        try {
            // #dataProviders 是 <script type="application/json">，改用 textContent 讀取：
            // 結果與 innerText 相同（未渲染的元素 innerText 會退回 textContent），但不會觸發版面計算。
            return JSON.parse(document.getElementById('dataProviders').textContent).data['ms.vss-web.theme-data']['requestedThemeId'];
        } catch (e) {
            return '';
        }
    }

    async function run() {
        if (isSwitching) return;
        isSwitching = true;
        try {
            await switchTheme();
        } finally {
            isSwitching = false;
        }
    }

    async function switchTheme() {
        var accessToken = getAccessToken();
        var themeId = getThemeId();

        if (themeId == 'ms.vss-web.vsts-theme-dark') {
            themeId = 'ms.vss-web.vsts-theme';
        } else {
            themeId = 'ms.vss-web.vsts-theme-dark';
        }

        const match = location.href.match(/^https?:\/\/([^\.]+)\.visualstudio\.com/);
        let accountName = match ? match[1] : null;
        let baseUrl = `https://${accountName}.visualstudio.com`;

        if (!accountName && location.origin == 'https://dev.azure.com') {
            accountName = location.href.split('/')?.[3];
            baseUrl = `https://dev.azure.com/${accountName}`;
        }

        if (!accountName) {
            console.error('[AzureDevOpsDarkModeSwitcher] Failed to get account name. Unable to switch theme.');
            return;
        }

        const headers = {
            "accept": "application/json;api-version=4.1-preview.1;excludeUrls=true;enumsAsNumbers=true;msDateFormat=true;noArrayWrap=true",
            "accept-language": "zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7,zh-CN;q=0.6,ja;q=0.5,ru;q=0.4",
            "cache-control": "no-cache",
            "content-type": "application/json",
            "pragma": "no-cache",
        };

        // 在 localStorage 找不到有效的 Bearer token 時，原本會送出「Bearer undefined」，
        // 伺服器必定以 401 拒絕。改為省略 authorization 標頭，讓請求改由
        // credentials: 'include' 帶上的登入 Cookie 進行驗證，多一次成功的機會。
        if (accessToken) {
            headers.authorization = `Bearer ${accessToken}`;
        }

        // 原本 fetch 沒有被 await，run() 會在請求完成前就結束；改為 await，
        // 讓 isSwitching 旗標能涵蓋整個請求期間，例外也統一在這裡處理。
        try {
            const response = await fetch(`${baseUrl}/_apis/Settings/Entries/globalme`, {
                "headers": headers,
                "referrer": location.href,
                "referrerPolicy": "strict-origin-when-cross-origin",
                // 以 JSON.stringify 產生與原本字串拼接完全相同的內容：{"WebPlatform/Theme":"<themeId>"}
                "body": JSON.stringify({ 'WebPlatform/Theme': themeId }),
                "method": "PATCH",
                "mode": "cors",
                "credentials": "include"
            });

            if (response.ok) {
                console.log(`[AzureDevOpsDarkModeSwitcher] Switched themeId to '${themeId}' successfully`);
                location.reload();
            } else {
                console.error(`[AzureDevOpsDarkModeSwitcher] Failed to change themeId (HTTP ${response.status})`);
            }
        } catch (error) {
            console.error('[AzureDevOpsDarkModeSwitcher] An error occurred:', error);
        }
    }

})();
