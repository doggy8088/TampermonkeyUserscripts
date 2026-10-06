// ==UserScript==
// @name         MVP: Microsoft Docs & Learn Champion Program
// @version      1.1.1
// @description  Add WT.mc_id=DT-MVP-4015686 to the matched urls
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/MVPDocsLearnChampionProgram.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/MVPDocsLearnChampionProgram.user.js
// @author       Will Huang
// @match        *://docs.microsoft.com/*
// @match        *://learn.microsoft.com/*
// @match        *://social.technet.microsoft.com/*
// @match        *://azure.microsoft.com/*
// @match        *://techcommunity.microsoft.com/*
// @match        *://social.msdn.microsoft.com/*
// @match        *://devblogs.microsoft.com/*
// @match        *://developer.microsoft.com/*
// @match        *://channel9.msdn.com/*
// @match        *://gallery.technet.microsoft.com/*
// @match        *://cloudblogs.microsoft.com/*
// @match        *://technet.microsoft.com/*
// @match        *://docs.azure.cn/*
// @match        *://www.azure.cn/*
// @match        *://msdn.microsoft.com/*
// @match        *://blogs.msdn.microsoft.com/*
// @match        *://blogs.microsoft.com/*
// @match        *://blogs.technet.microsoft.com/*
// @match        *://microsoft.com/handsonlabs/*
// @match        *://blogs.windows.com/*
// @match        *://dotnet.microsoft.com/*
// @match        *://info.microsoft.com/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    var s = MVPDocsLearnChampionProgram(location.href)
        .add('WT.mc_id', 'DT-MVP-4015686')
        .toString();

    if (s && location.href !== s) {
        // 只改網址、保留原本的 history.state。原本固定傳入 {}，在重新整理或上一頁/下一頁回到此頁時，
        // 會把網站 SPA 路由先前存放的狀態（捲動位置、路由資訊等）覆蓋成空物件。
        history.replaceState(history.state, '', s);
    }

    function MVPDocsLearnChampionProgram(url) {
        const parsedUrl = new URL(url);
        return {
            add(name, value) {
                // https://developer.mozilla.org/en-US/docs/Web/API/URL
                // https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams
                //
                // 先把所有鍵名複製成陣列再刪除：原本在走訪 searchParams 的同時呼叫 delete()，
                // URLSearchParams 的迭代器是「活的」，刪除後後面的項目會往前遞補而被跳過。
                // 例如 ?WT.mc_id=a&wt.mc_id=b 會只刪掉第一個，最後變成 wt.mc_id=b 與
                // WT.mc_id=DT-MVP-4015686 兩個追蹤參數並存。
                const keysToDelete = [...parsedUrl.searchParams.keys()]
                    .filter(key => key.toLowerCase() == name.toLowerCase());
                for (const key of new Set(keysToDelete)) {
                    parsedUrl.searchParams.delete(key);
                }
                parsedUrl.searchParams.set(name, value);
                return MVPDocsLearnChampionProgram(parsedUrl.toString());
            },
            toString() {
                return url;
            }
        }
    }
})();
