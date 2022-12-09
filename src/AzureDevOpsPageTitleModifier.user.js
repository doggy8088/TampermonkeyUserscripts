// ==UserScript==
// @name         Azure DevOps: 調整工作項目頁面標題
// @version      1.0
// @description  讓 Azure Boards 的 Work Item 顯示的「頁面標題」更加具有意義
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
// ==/UserScript==

// https://www.tampermonkey.net/documentation.php#_run_at

(function () {
    'use strict';

    var intervalId;

    function executeActions() {

        // https://orgname.visualstudio.com/MyProject/_backlogs/backlog/MyProject%20Team/Backlog%20items/?workitem=30909
        var searchParams = new URLSearchParams(window.location.search);
        if (!searchParams.has('workitem')) {
            return;
        }

        // 30909
        var id = document.querySelector('span[aria-label="ID Field"]')?.innerText;
        id = searchParams.get('workitem');

        var caption = document.querySelector('[class="caption"]')?.innerText.replace('PRODUCT BACKLOG ITEM', 'PBI');
        var title = document.querySelector('input[aria-label="Title Field"]')?.value;

        // ["", "MyProject", "_backlogs", "backlog", "MyProject%20Team", "Backlog%20items", ""]
        var pathnameParts = window.location.pathname.split('/');
        // "MyProject"
        var projectName = pathnameParts[1];
        // "_backlogs"
        var projectTopPath = pathnameParts[2];
        // "backlog",
        var projectSubPath = pathnameParts[3];
        // "MyProject Team"
        var projectTeamName = unescape(pathnameParts[4]);
        // "Backlog items"
        var projectItemType = unescape(pathnameParts[5]);

        if (id && caption && title && document.title.indexOf(`${caption}: ${title}`) == -1) {
            document.title = `${caption}: ${title} - ${projectTeamName}`;
            // if (intervalId) {
            //     clearInterval(intervalId);
            // }
        }
    }

    (function () {
        'use strict';

        intervalId = setInterval(executeActions, 500);

    })();

})();
