// ==UserScript==
// @name         MVP: Microsoft Docs & Learn Champion Program
// @version      1.1
// @description  Add WT.mc_id=DT-MVP-4015686 to the matched urls
// @author       Will Huang
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/MVPDocsLearnChampionProgram.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/MVPDocsLearnChampionProgram.user.js
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
// ==/UserScript==

(function () {

    var s = MVPDocsLearnChampionProgram(location.href)
        .add('WT.mc_id', 'DT-MVP-4015686')
        .toString();

    if (s && location.href !== s) {
        history.replaceState({}, '', s)
    }

    function MVPDocsLearnChampionProgram(url) {
        const parsedUrl = new URL(url);
        return {
            add(name, value) {
                // https://developer.mozilla.org/en-US/docs/Web/API/URL
                // https://developer.mozilla.org/en-US/docs/Web/API/URLSearchParams
                for (const [key, val] of parsedUrl.searchParams.entries()) {
                    if (key.toLowerCase() == name.toLowerCase()) {
                        parsedUrl.searchParams.delete(key);
                    }
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
