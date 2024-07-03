// ==UserScript==
// @name         Azure DevOps: 佈景主題切換器
// @version      0.1.0
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
// ==/UserScript==

(function () {
    'use strict';
    document.addEventListener('keydown', async (ev) => {
        if (ev.altKey && ev.key === 'S' && !/^(?:input|select|textarea|button)$/i.test(ev.target.nodeName)) {
            alert('你是不是不小心按到了 CAPSLOCK 鍵？');
            return;
        }
        if (ev.altKey && ev.key === 's' && !/^(?:input|select|textarea|button)$/i.test(ev.target.nodeName)) {
            await run();
        }
    });

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
            return JSON.parse(document.getElementById('dataProviders').innerText).data['ms.vss-web.theme-data']['requestedThemeId'];
        } catch (e) {
            return '';
        }
    }

    async function run() {
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
            console.error('Failed to get account name. Unable to switch theme.');
            return;
        }

        fetch(`${baseUrl}/_apis/Settings/Entries/globalme`, {
            "headers": {
                "accept": "application/json;api-version=4.1-preview.1;excludeUrls=true;enumsAsNumbers=true;msDateFormat=true;noArrayWrap=true",
                "accept-language": "zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7,zh-CN;q=0.6,ja;q=0.5,ru;q=0.4",
                "authorization": `Bearer ${accessToken}`,
                "cache-control": "no-cache",
                "content-type": "application/json",
                "pragma": "no-cache",
            },
            "referrer": location.href,
            "referrerPolicy": "strict-origin-when-cross-origin",
            "body": "{\"WebPlatform/Theme\":\"" + themeId + "\"}",
            "method": "PATCH",
            "mode": "cors",
            "credentials": "include"
        }).then(response => {
            if (response.ok) {
                console.log(`Switched themeId to '${themeId}' successfully`);
                location.reload();
            } else {
                console.error('Failed to change themeId');
            }
        }).catch(error => {
            console.error('An error occurred:', error);
        });
    }

})();
