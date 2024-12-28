// ==UserScript==
// @name         Azure DevOps: 調整頁面標題
// @version      2.0
// @description  讓 Azure DevOps Service 的「頁面標題」更加具有意義
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/AzureDevOpsPageTitleModifier.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/AzureDevOpsPageTitleModifier.user.js
// @match        *://*.visualstudio.com/*
// @match        *://dev.azure.com/*
// @author       Will Huang
// @run-at       document-idle
// @icon         https://www.google.com/s2/favicons?sz=64&domain=dev.azure.com
// ==/UserScript==

// https://www.tampermonkey.net/documentation.php#_run_at

(function () {
    'use strict';

    var intervalId;

    function executeActions() {

        let pathname = location.pathname;
        var searchParams = new URLSearchParams(location.search);

        // https://dev.azure.com/org-name/project-name/_workitems/edit/2895
        // https://dev.azure.com/org-name/project-name/_workitems/edit/2895/
        // 如果 window.location 有包含 _workitems/edit/ 的字串，表示是 Work Item 的編輯頁面
        if (location.pathname.includes('_workitems/edit/')) {
            if (pathname.endsWith('/')) { // 刪除最後一個斜線符號 (/)
                pathname = pathname.substring(0, pathname.length - 1);
            }
            // 取得網址列 pathname 的最後一個字串，例如 2895
            let id = pathname.substring(pathname.lastIndexOf('/') + 1);
            updateTitleForWorkItemPage(id);
        }

        // 開啟 Work Item 的 Modal dialog 頁面時，網址列上會有 workitem 參數
        // https://org-name.visualstudio.com/MyProject/_backlogs/backlog/MyProject%20Team/Backlog%20items/?workitem=30909
        if (searchParams.has('workitem')) {
            let id = searchParams.get('workitem');
            updateTitleForWorkItemPage(id);
        }

        // 如果 window.location 有包含 /_wiki/ 的字串，表示是 Wiki 頁面
        // https://miniasp.visualstudio.com/coolrare-training-portal/_wiki/wikis/coolrare-training-portal.wiki/5330/%E5%B0%88%E6%A1%88%E6%91%98%E8%A6%81%E8%B3%87%E8%A8%8A
        if (pathname.includes('/_wiki/')) {
            updateTitleForWikiPage();
        }

    }

    function updateTitleForWikiPage() {
        let headingDiv = document.querySelector('div[role="heading"]');
        let titleField = document.querySelector('input[aria-label="Page title"]');
        let title = '';
        if (!!headingDiv) title = headingDiv?.textContent;
        if (!!titleField) title = `Editing ${titleField?.value}`;
        if (!!title) {
            document.title = `${title} - Wiki - Overview`;
        }
    }

    function updateTitleForWorkItemPage(id) {
        let titleField = document.querySelector('input[aria-label="Title field"]');
        let title = titleField?.value;
        let typeSpan = titleField?.parentElement?.parentElement?.parentElement?.parentElement?.previousElementSibling?.querySelector('span[aria-label]')
        let workItemType = typeSpan?.attributes['aria-label']?.value;

        if (workItemType === 'Product Backlog Item') {
            workItemType = 'PBI';
        }

        // let showTeamProfileBtn = document.querySelector('button[aria-label="Show Team Profile"]');
        // let teamName = showTeamProfileBtn?.parentElement?.previousElementSibling?.textContent;

        // 每個變數都有才更新
        if (id && title && workItemType) {
            document.title = `${workItemType} ${id}: ${title}`;
        }
    }

    (function () {
        'use strict';
        intervalId = setInterval(executeActions, 500);
    })();

})();
