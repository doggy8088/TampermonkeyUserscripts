// ==UserScript==
// @name         Azure DevOps: 調整 Wiki 文件的 TOC 標題寬度
// @version      1.0
// @description  讓 Azure Wikis 的 TOC 標題可以完整顯示
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/AzureDevOpsWikiTocFullDisplay.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/AzureDevOpsWikiTocFullDisplay.user.js
// @match        *://*.visualstudio.com/*
// @match        *://dev.azure.com/*
// @author       Will Huang
// @run-at       document-idle
// ==/UserScript==

// https://www.tampermonkey.net/documentation.php#_run_at

(function () {
    'use strict';

    function executeActions() {
        var styleTag = document.createElement("style");
        var cssRules = document.createTextNode(".toc-container a { max-width: inherit; }");
        styleTag.appendChild(cssRules);
        document.head.appendChild(styleTag);
    }

    (function () {
        'use strict';

        setTimeout(executeActions, 0);

    })();

})();
