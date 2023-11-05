// ==UserScript==
// @name         Azure DevOps: 優化快速鍵操作
// @version      0.2
// @description  讓 Azure DevOps Services 的快速鍵操作貼近 Visual Studio Code 與 Vim 操作
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

    (function () {
        'use strict';

        // 按下 Ctrl+B 可以切換側邊欄 (只有 Wiki 頁面才有這個按鈕)
        document.addEventListener('keydown', function (event) {
            if (event.ctrlKey && event.key === 'b') {
                console.log('按下 Ctrl+B 可以切換側邊欄');
                const splitterPane = get_splitter_pane();
                const showLessInformationBtn = splitterPane.querySelector('[aria-label="Show less information"][role="button"]')
                const showMoreInformationBtn = splitterPane.querySelector('[aria-label="Show more information"][role="button"]')
                const theButton = showLessInformationBtn || showMoreInformationBtn;
                if (theButton) {
                    console.log('切換側邊欄的按鈕已找到', theButton);
                    theButton.click();
                } else {
                    const navigationPane = get_navigation_pane();
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

        let keySequence = '';
        document.addEventListener("keydown", (event) => {
            const key = event.key;
            var isTyping = false;

            // 檢查焦點是否在文字輸入框中
            if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA") {
                isTyping = true;
                resetKeySequence();
            } else {
                isTyping = false;
            }

            if (!isTyping) {
                if (keySequence.length > 2) {
                    resetKeySequence();
                }

                keySequence += key;

                console.log("keySequence", keySequence);

                // 若使用者按下 j 鍵，就將文件選取的光棒往下移動一行
                if (keySequence.endsWith('j')) {
                    move_leftpane_cursor('down');
                    focus_wiki_content_header();
                    resetKeySequence();
                }

                // 若使用者按下 k 鍵，就將文件選取的光棒往下移動一行
                if (keySequence.endsWith('k')) {
                    move_leftpane_cursor('up');
                    focus_wiki_content_header();
                    resetKeySequence();
                }

                // 若使用者按下 Enter 鍵，就執行光棒的 click 事件
                if (keySequence.endsWith('Enter')) {
                    get_current_leftpane_cursor().click();
                    focus_wiki_content_header();
                    resetKeySequence();
                }

                // 連續按下 gw 就會進入 Overview > Wiki 頁面
                if (keySequence.endsWith("gw")) {
                    // console.log("連續按下 g 和 w 觸發事件");
                    window.location.href = `${get_devops_url_base()}/_wiki`;
                }

                // 連續按下 gb 就會進入 Board > Backlogs 頁面
                if (keySequence.endsWith("gb")) {
                    // console.log("連續按下 g 和 b 觸發事件");
                    window.location.href = `${get_devops_url_base()}/_backlogs/backlog`;
                }
            }
        });

        function get_devops_url_base() {
            let orgName;
            let project;

            // https://ORG-NAME.azure.com/PROJECT-NAME/*
            const regex1 = /https:\/\/([\w.-]+)\.visualstudio\.com\/([\w.-]+)\/.*/;
            const match1 = window.location.href.match(regex1);
            if (match1) {
                orgName = match1[1];
                project = match1[2];
                if (orgName && project) {
                    return `https://${orgName}.visualstudio.com/${project}`;
                }
            }

            // https://dev.azure.com/ORG-NAME/PROJECT-NAME/*
            const regex2 = /https:\/\/dev\.azure\.com\/([^\/]+)\/([^\/]+)\/.*/;
            const match2 = window.location.href.match(regex1);
            if (match2) {
                orgName = match2[1];
                project = match2[2];
                if (orgName && project) {
                    return `https://dev.azure.com/${orgName}/${project}`;
                }
            }

            return undefined;
        }

        function resetKeySequence() {
            keySequence = '';
        }

    })();

    function get_navigation_pane() {
        return document.querySelector('[data-renderedregion="navigation"]');
    }

    function get_splitter_pane() {
        return document.querySelector('.vss-Splitter--pane-fixed');
    }

    function get_current_leftpane_cursor() {
        return get_splitter_pane().querySelector('tr[aria-selected="true"]');
    }

    function focus_wiki_content_header() {
        setTimeout(() => {
            let header = document.querySelector('div[class="wiki-content-header"]')
            header = header.querySelector('[class="wiki-header-title"]');
            console.log("wiki-content-header", header)
            header?.focus();
        }, 100);
    }

    function move_leftpane_cursor(direction = 'down') {
        const splitterPane = get_splitter_pane();
        const allItems = splitterPane.querySelectorAll(`tr[data-row-index]`);
        // get last index
        const lastIndex = parseInt(allItems[allItems.length - 1].getAttribute('data-row-index'));

        const currentItem = splitterPane.querySelector('tr[aria-selected="true"]');
        // console.log("currentItem", currentItem)

        const currentIndex = currentItem.getAttribute('data-row-index');
        // console.log("currentIndex", currentIndex)
        let nextIndex = parseInt(currentIndex);

        if (direction == 'down') {
            nextIndex = nextIndex + 1;
        } else {
            nextIndex = nextIndex - 1;
        }
        // console.log("nextIndex", nextIndex)

        if (!splitterPane.querySelector(`tr[data-row-index="${nextIndex}"]`)) {
            if (direction == 'down') {
                nextIndex = 0;
            } else {
                nextIndex = lastIndex;
            }
        }
        // console.log("nextIndex", nextIndex)

        const nextItem = splitterPane.querySelector(`tr[data-row-index="${nextIndex}"]`);
        // console.log("nextItem", nextItem)

        currentItem.removeAttribute('aria-selected');
        currentItem.classList.remove('selected');

        nextItem.setAttribute('aria-selected', 'true');
        nextItem.classList.add('selected');
    }

})();
