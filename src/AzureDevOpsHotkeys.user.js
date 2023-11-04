// ==UserScript==
// @name         Azure DevOps: 優化快速鍵操作
// @version      0.1
// @description  讓 Azure DevOps Services 的快速鍵操作貼近 Visual Studio Code 操作
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/AzureDevOpsHotkeys.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/AzureDevOpsHotkeys.user.js
// @match        *://*.visualstudio.com/*
// @match        *://dev.azure.com/*
// @author       Will Huang
// @run-at       document-idle
// ==/UserScript==

// https://www.tampermonkey.net/documentation.php#_run_at

(function () {
    'use strict';

    function executeActions() {

    }

    (function () {
        'use strict';

        // 按下 Ctrl+B 可以切換側邊欄 (只有 Wiki 頁面才有這個按鈕)
        document.addEventListener('keydown', function(event) {
            if (event.ctrlKey && event.key === 'b') {
                console.log('按下 Ctrl+B 可以切換側邊欄');
                const splitterPane = document.querySelector('.vss-Splitter--pane-fixed');
                const showLessInformationBtn = splitterPane.querySelector('[aria-label="Show less information"][role="button"]')
                const showMoreInformationBtn = splitterPane.querySelector('[aria-label="Show more information"][role="button"]')
                const theButton = showLessInformationBtn || showMoreInformationBtn;
                if (theButton) {
                    console.log('切換側邊欄的按鈕已找到', theButton);
                    theButton.click();
                } else {
                    const navigationPane = document.querySelector('[data-renderedregion="navigation"]');
                    const showLessInformationBtn = navigationPane.querySelector('[aria-label="Show less information"][role="button"]')
                    const showMoreInformationBtn = navigationPane.querySelector('[aria-label="Show more information"][role="button"]')
                    const theButton = showLessInformationBtn || showMoreInformationBtn;
                    if (theButton) {
                        console.log('導覽列的按鈕已找到', theButton);
                        theButton.click();
                    }
                }
            }
        });


        // 連續按下 gw 就會 Go to Wiki 頁面
        let keySequence = "";
        document.addEventListener("keydown", (event) => {
            const key = event.key;
            var isTyping = false;

            // 檢查焦點是否在文字輸入框中
            if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA") {
                isTyping = true;
                keySequence = "";
            } else {
                isTyping = false;
            }

            if (!isTyping) {
                keySequence += key;
                console.log("keySequence", keySequence);
                if (keySequence.includes("gw")) {
                    console.log("連續按下 g 和 w 觸發事件");

                    // https://ORG-NAME.azure.com/PROJECT-NAME/*
                    const regex1 = /https:\/\/([\w.-]+)\.visualstudio\.com\/([\w.-]+)\/.*/;
                    const match1 = window.location.href.match(regex1);
                    if (match1) {
                        const orgName = match1[1];
                        const project = match1[2];
                        if (orgName && project) {
                            window.location.href = `https://${orgName}.visualstudio.com/${project}/_wiki`;
                            event.preventDefault();
                            return;
                        }
                    }

                    // https://dev.azure.com/ORG-NAME/PROJECT-NAME/*
                    const regex2 = /https:\/\/dev\.azure\.com\/([^\/]+)\/([^\/]+)\/.*/;
                    const match2 = window.location.href.match(regex1);
                    if (match2) {
                        const orgName = match2[1];
                        const project = match2[2];
                        if (orgName && project) {
                            window.location.href = `https://dev.azure.com/${orgName}/${project}/_wiki`;
                            event.preventDefault();
                            return;
                        }
                    }
                }
            }
        });

        setTimeout(executeActions, 0);

    })();

})();
