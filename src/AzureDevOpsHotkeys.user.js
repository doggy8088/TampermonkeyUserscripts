// ==UserScript==
// @name         Azure DevOps: 優化快速鍵操作
// @version      1.0.2
// @description  讓 Azure DevOps Services 的快速鍵操作貼近 Visual Studio Code 與 Vim 操作
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/AzureDevOpsHotkeys.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/AzureDevOpsHotkeys.user.js
// @author       Will Huang
// @match        *://*.visualstudio.com/*
// @match        *://dev.azure.com/*
// @exclude      https://marketplace.visualstudio.com/*
// @run-at       document-idle
// @icon         https://www.google.com/s2/favicons?sz=64&domain=dev.azure.com
// @grant        none
// ==/UserScript==

// https://www.tampermonkey.net/documentation.php#_run_at

(function () {
    'use strict';

    // DEBUG
    var console = {
        log: function () {
            // window.console.log.apply(console, arguments);
        }
    };

    (function () {

        console.log('Current URL: ', window.location.href);

        var [orgBaseUrl, orgName, urlType] = getOrgInfo();
        console.log(`Organization Info: orgBaseUrl = ${orgBaseUrl}, orgName = ${orgName}, urlType = ${urlType}`);

        // 不屬於任何組織的頁面（例如 app.vssps.visualstudio.com、dev.azure.com 根目錄）本來就沒有
        // 可用的快速鍵。原本在這裡 throw Error，每次載入都會在主控台留下未捕捉的例外，改為安靜結束。
        if (!orgBaseUrl) {
            return;
        }

        var [projectUrl, projectName, isRepos, repoUrlBase] = getProjectInfo();
        console.log(`Project Info: projectUrl = ${projectUrl}, projectName = ${projectName}, isRepos = ${isRepos}, repoUrlBase = ${repoUrlBase}`);

        let keySequence = '';

        // 按鍵序列只需要保留最後幾個字元即可：目前最長的比對字尾是 'Enter'（5 個字元），
        // 其餘都是 2 個字元的 g? 序列。限制長度可避免整個工作階段中字串無止盡地累加。
        const MAX_KEY_SEQUENCE_LENGTH = 16;

        // 代表「按下了其他具名按鍵」的分隔字元，不會出現在任何快速鍵序列中。
        const KEY_SEQUENCE_BREAK = '\u0000';

        document.addEventListener('keydown', function (event) {

            // 輸入法（注音、倉頡等）組字中的按鍵一律不處理。組字時按下的 Enter/Escape 是用來確認或
            // 取消選字，原本會被下方「INPUT + Enter/Escape 就 blur()」的邏輯攔截，導致在搜尋框輸入中文時
            // 一確認選字焦點就跑掉。keyCode 229 是部分瀏覽器（例如 Safari）在組字結束那一下的標記。
            // 組字只會發生在輸入框內，因此比照一般打字的情況重設按鍵序列。
            if (event.isComposing || event.keyCode === 229) {
                resetKeySequence();
                return;
            }

            // contenteditable 編輯器（例如 New Boards Hub 工作項目的描述、討論欄位）與 select 下拉選單
            // 也是輸入情境。原本只檢查 INPUT/TEXTAREA，在這些地方打字時，"go"、"gs"（things）、
            // "gr"（great）這類常見的字母組合會直接導覽離開頁面，j/k 也會移動並點擊背後清單的項目，
            // Ctrl+B 則會在套用粗體的同時收合側邊欄。這些元素用不到 INPUT/TEXTAREA 專屬的
            // Esc/Enter/Alt+/ 處理，因此直接重設序列並結束。
            if (isEditableContext(event.target)) {
                resetKeySequence();
                return;
            }

            var isTyping = false;

            // 檢查焦點是否在文字輸入框中
            if (event.target.tagName === "INPUT" || event.target.tagName === "TEXTAREA") {
                isTyping = true;
                resetKeySequence();
            } else {
                isTyping = false;
            }

            // 按下 Ctrl+B 可以切換側邊欄 (只有 Wiki 頁面才有這個按鈕)
            if (!isTyping && event.ctrlKey && event.key === 'b') {
                console.log('按下 Ctrl+B 可以切換側邊欄');
                if (toggleSidePane()) {
                    // 確實切換了側邊欄才接手 Ctrl+B，並阻止瀏覽器的預設行為
                    // （例如 Firefox 的 Ctrl+B 會同時開啟書籤側邊欄）。找不到切換按鈕時維持原狀。
                    event.preventDefault();
                }
            }

            //  有任何一個修飾鍵被按下時，就不要處理事件
            if (!isTyping && (event.ctrlKey || event.altKey || event.metaKey || event.shiftKey)) {

                // 替首頁的 Tab List 加上 accesskey，讓我們可以透過 Alt+1 ~ Alt+9 快速切換 Tab
                var tabList = document.querySelector('div[role="tablist"]');
                if (tabList) {
                    tabList.querySelectorAll('[role="tab"]').forEach((tab) => {
                        if (!tab.getAttribute('accesskey') && !!tab.getAttribute('aria-posinset')) {
                            tab.setAttribute('accesskey', tab.getAttribute('aria-posinset'));
                        }
                    });
                }

                return;
            }

            // 在 Azure DevOps Services 首頁的時候沒有 Project Name 在網址列上
            if (isInHome()) {
                if (isTyping) {
                    if (event.key === 'Escape') {
                        document.activeElement.blur();
                    }
                } else {
                    switch (event.key) {
                        case 'f':
                            document.querySelector('input[role="searchbox"]')?.focus();
                            event.preventDefault();
                            break;

                        case '1':
                        case '2':
                        case '3':
                        case '4':
                            var idx = parseInt(event.key) - 1;
                            var projectCards = document.querySelectorAll('.project-card');
                            if (projectCards[idx]) {
                                projectCards[idx].querySelector('a')?.click();
                            }
                            event.preventDefault();
                            break;

                        case 'Escape':
                            var projectList = document.querySelector('.project-list');
                            var projectRows = projectList?.querySelectorAll('tr.project-row');
                            if (projectRows) {
                                var projectRowsArray = [...projectRows];
                                console.log(`目前共有 ${projectRowsArray.length} 個專案`);
                                var focusedIndex = projectRowsArray.findIndex((row) => row.classList.contains('focused'));
                                console.log(`目前焦點在第 ${focusedIndex} 個專案`)
                                if (projectRowsArray[focusedIndex]) {
                                    projectRowsArray[focusedIndex].querySelectorAll('a').forEach((link) => {
                                        link.blur();
                                        link.classList.remove('cursor-selected');
                                    });
                                    projectRowsArray[focusedIndex].blur();
                                    projectRowsArray[focusedIndex].classList.remove('focused');
                                }
                            }
                            console.log('按下 ESC 鍵，回到頁首並移除焦點')
                            var mainContent = document.getElementById('skip-to-main-content');
                            console.log('mainContent', mainContent)
                            // 頁面改版或尚未載入完成時可能沒有 #skip-to-main-content，避免 null 存取丟出例外。
                            var scrollbar = mainContent?.querySelector('.custom-scrollbar');
                            console.log('scrollbar', scrollbar)
                            if (scrollbar) {
                                scrollbar.scrollTo(0, 0);
                            }
                            break;

                        case 'Enter':
                            var projectList = document.querySelector('.project-list');
                            // 沒有專案清單（例如首頁顯示的是卡片檢視）時，原本會因 null 存取丟出 TypeError。
                            var projectRows = projectList?.querySelectorAll('tr.project-row');
                            if (projectRows) {
                                var projectRowsArray = [...projectRows];
                                console.log(`目前共有 ${projectRowsArray.length} 個專案`);
                                var focusedIndex = projectRowsArray.findIndex((row) => row.classList.contains('focused'));
                                console.log(`目前焦點在第 ${focusedIndex} 個專案`)
                                if (projectRowsArray[focusedIndex]) {
                                    projectRowsArray[focusedIndex].querySelector('a')?.click();
                                }
                            }
                            break;

                        case 'j':
                            var projectList = document.querySelector('.project-list');
                            if (projectList) {
                                var projectRows = projectList.querySelectorAll('tr.project-row');
                                // NodeList 永遠是 truthy，必須檢查長度；空清單時原本會存取 undefined 而丟出例外。
                                if (projectRows && projectRows.length > 0) {
                                    var projectRowsArray = [...projectRows];
                                    console.log(`目前共有 ${projectRowsArray.length} 個專案`);
                                    var focusedIndex = projectRowsArray.findIndex((row) => row.classList.contains('focused'));
                                    console.log(`目前焦點在第 ${focusedIndex} 個專案`)
                                    if (focusedIndex === -1) {
                                        focusedIndex = 0;
                                    } else {
                                        projectRowsArray[focusedIndex].classList.remove('focused');
                                        focusedIndex++;
                                        // 已在最後一列時繞回第一列，與 k 在第一列時繞到最後一列的行為對稱。
                                        // 原本會存取不存在的列而丟出 TypeError，焦點因此消失，要再按一次 j 才會回到第一列。
                                        if (focusedIndex >= projectRowsArray.length) {
                                            focusedIndex = 0;
                                        }
                                    }
                                    console.log(`移動焦點到第 ${focusedIndex} 個專案`)
                                    projectRowsArray[focusedIndex].focus();
                                    projectRowsArray[focusedIndex].classList.add('focused');
                                    projectRowsArray[focusedIndex].scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });

                                    event.preventDefault();
                                }
                            }
                            break;

                        case 'k':
                            var projectList = document.querySelector('.project-list');
                            if (projectList) {
                                var projectRows = projectList.querySelectorAll('tr.project-row');
                                // NodeList 永遠是 truthy，必須檢查長度；空清單時原本會存取 undefined 而丟出例外。
                                if (projectRows && projectRows.length > 0) {
                                    var projectRowsArray = [...projectRows];
                                    console.log(`目前共有 ${projectRowsArray.length} 個專案`);
                                    var focusedIndex = projectRowsArray.findIndex((row) => row.classList.contains('focused'));
                                    console.log(`目前焦點在第 ${focusedIndex} 個專案`)
                                    if (focusedIndex === -1) {
                                        focusedIndex = 0;
                                    } else if (focusedIndex === 0) {
                                        projectRowsArray[focusedIndex].classList.remove('focused');
                                        focusedIndex = projectRowsArray.length - 1;
                                    } else {
                                        projectRowsArray[focusedIndex].classList.remove('focused');
                                        focusedIndex--;
                                    }
                                    console.log(`移動焦點到第 ${focusedIndex} 個專案`)
                                    projectRowsArray[focusedIndex].focus();
                                    projectRowsArray[focusedIndex].classList.add('focused');
                                    projectRowsArray[focusedIndex].scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });

                                    event.preventDefault();
                                }
                            }
                            break;

                        case 'l':
                            var projectList = document.querySelector('.project-list');
                            if (projectList) {
                                var projectRows = projectList.querySelectorAll('tr.project-row');
                                if (projectRows) {
                                    var projectRowsArray = [...projectRows];
                                    var focusedElement = projectRowsArray.find((row) => row.classList.contains('focused'));
                                    if (focusedElement) {
                                        var links = Array.from(focusedElement.querySelectorAll('a'));

                                        var idx = links.findIndex((link) => { return link.classList.contains('cursor-selected'); });
                                        if (idx === -1) {
                                            idx = 0;
                                        } else {
                                            links[idx].classList.remove('cursor-selected');
                                            idx++;
                                            if (idx >= links.length) {
                                                idx = 0;
                                            }
                                        }
                                        if (links[idx]) {
                                            links[idx].focus();
                                            links[idx].classList.add('cursor-selected');
                                        }
                                    }
                                }
                            }

                            break;

                        case 'h':
                            var projectList = document.querySelector('.project-list');
                            if (projectList) {
                                var projectRows = projectList.querySelectorAll('tr.project-row');
                                if (projectRows) {
                                    var projectRowsArray = [...projectRows];
                                    var focusedElement = projectRowsArray.find((row) => row.classList.contains('focused'));
                                    if (focusedElement) {
                                        var links = Array.from(focusedElement.querySelectorAll('a'));

                                        var idx = links.findIndex((link) => { return link.classList.contains('cursor-selected'); });
                                        if (idx === -1) {
                                            idx = 0;
                                        } else if (idx === 0) {
                                            links[idx].classList.remove('cursor-selected');
                                            idx = links.length - 1;

                                        } else {
                                            links[idx].classList.remove('cursor-selected');
                                            idx--;
                                        }
                                        if (links[idx]) {
                                            links[idx].focus();
                                            links[idx].classList.add('cursor-selected');
                                        }
                                    }
                                }
                            }

                            break;

                        default:
                            break;
                    }
                }
            }

            // 在 Azure DevOps Services 的專案內
            if (isInProject()) {

                var [projectBaseUrl, projectName, isInRepos] = getProjectInfo();

                let contentArea = document.querySelector('div[data-renderedregion="content"]');

                if (isTyping) {
                    if (event.target.tagName === 'INPUT' && event.key === 'Escape') {
                        event.target.blur();
                    }
                    if (event.target.tagName === 'INPUT' && event.key === 'Enter') {
                        event.target.blur();
                    }

                    // 若使用者按下 alt+/ 鍵，就開啟 More options 選單
                    if (event.target.tagName === 'TEXTAREA' && event.altKey && event.key === '/') {
                        event.target.closest('div.wiki-editor')?.querySelector('button[aria-label="More options"]')?.click();
                        event.preventDefault();
                        return resetKeySequence();
                    }
                    return;
                }

                // 只把「單一字元」的按鍵與 Enter 原樣累加進序列。CapsLock、NumLock、ScrollLock 等具名按鍵
                // 的名稱剛好以 k 結尾，原本整串名稱被接進序列後會被 endsWith('k') 誤判成 k 快速鍵
                // （macOS 以 CapsLock 切換中英輸入法時尤其常見，一按就移動清單的游標）。其他具名按鍵
                // （方向鍵、Tab、Escape…）改以分隔字元代替，維持「中間按了其他鍵就會打斷 g? 序列」的原有語意。
                // Chrome 自動填入表單時送出的 keydown 可能沒有 key 屬性，因此以空字串防呆。
                const key = event.key || '';
                const keyToken = (key.length === 1 || key === 'Enter') ? key : KEY_SEQUENCE_BREAK;
                keySequence = (keySequence + keyToken).slice(-MAX_KEY_SEQUENCE_LENGTH);
                console.log(`keySequence: \"${keySequence}\"`);

                // 記錄一下內建的命令

                // 按下 gc 會進入 Repos > Files 頁面
                // 按下 gch 會進入 Repos > Commits (History) 頁面
                // 按下 gcb 會進入 Repos > Branches 頁面
                // 按下 gcq 會進入 Repos > Pull requests 頁面
                // 按下 r 可以選擇 Repository

                // 連續按下 gw 就會進入 Overview > Summary 頁面
                if (keySequence.endsWith("go")) {
                    console.log("連續按下 g 和 o 觸發事件");
                    window.location.href = `${projectBaseUrl}`;
                    return;
                }

                // 連續按下 gw 就會進入 Overview > Wiki 頁面
                if (keySequence.endsWith("gw")) {
                    console.log("連續按下 g 和 w 觸發事件");
                    window.location.href = `${projectBaseUrl}/_wiki`;
                    return;
                }

                // 連續按下 gd 就會進入 Overview > Dashboards 頁面
                if (keySequence.endsWith("gd")) {
                    console.log("連續按下 g 和 d 觸發事件");
                    window.location.href = `${projectBaseUrl}/_dashboards`;
                    return;
                }

                // 連續按下 gl 就會進入 Board > Backlogs 頁面
                if (keySequence.endsWith("gl")) {
                    console.log("連續按下 g 和 l 觸發事件");
                    window.location.href = `${projectBaseUrl}/_backlogs/backlog`;
                    return;
                }

                // 連續按下 gs 就會進入 Board > Sprints 頁面
                if (keySequence.endsWith("gs")) {
                    console.log("連續按下 g 和 s 觸發事件");
                    window.location.href = `${projectBaseUrl}/_sprints`;
                    return;
                }

                // 連續按下 gb 就會進入 Pipelines > Builds 頁面 (內建)
                // if (keySequence.endsWith("gb")) {
                //     console.log("連續按下 g 和 b 觸發事件");
                //     window.location.href = `${projectBaseUrl}/_build`;
                //     return;
                // }

                // 連續按下 gr 就會進入 Pipelines > Releases 頁面
                if (keySequence.endsWith("gr")) {
                    console.log("連續按下 g 和 r 觸發事件");
                    window.location.href = `${projectBaseUrl}/_release`;
                    return;
                }

                if (isInProjectWikis()) {
                    // 若使用者按下 j 鍵，就將文件選取的光棒往下移動一行
                    if (keySequence.endsWith('j')) {
                        moveWikiItemsCursor('down');
                        focusWikiViewContainer();
                        return resetKeySequence();
                    }

                    // 若使用者按下 k 鍵，就將文件選取的光棒往下移動一行
                    if (keySequence.endsWith('k')) {
                        moveWikiItemsCursor('up');
                        focusWikiViewContainer();
                        return resetKeySequence();
                    }

                    // 若使用者按下 Enter 鍵，就執行光棒的 click 事件
                    if (keySequence.endsWith('Enter')) {
                        // 尚未用 j/k 選取任何頁面時沒有游標，原本會因 null 存取丟出 TypeError。
                        get_current_leftpane_cursor()?.click();
                        focusWikiViewContainer();
                        return resetKeySequence();
                    }

                    // 若使用者按下 f 鍵，就將游標移至 Filter pages by title 欄位
                    if (keySequence.endsWith('f')) {
                        const splitterPane = get_splitter_pane();
                        // 左側頁面樹不存在時（例如已收合）避免 null 存取丟出例外。
                        splitterPane?.querySelector('input[role="searchbox"]')?.focus();
                        event.preventDefault();
                        return resetKeySequence();
                    }
                }

                if (isInProjectReposPullRequests()) {
                    // 判斷使用者是否按下 c 鍵，當有看到 Create a pull request 按鈕時，就自動點擊
                    if (keySequence.endsWith('c')) {
                        let link = contentArea?.querySelector('a[role="link"]');
                        if (link && link.innerText.includes('Create a pull request')) {
                            link.click();
                            return resetKeySequence();
                        }
                    }
                }

                // 全站所有的 Table 都可以用這個快速鍵導覽
                // moveGeneralTableItemsCursor() 移動成功時，原本會因為呼叫作用域外的 resetKeySequence()
                // 而丟出 ReferenceError，「意外地」跳過後面的 Grid/TreeGrid 導覽。現在改用回傳值明確表達
                // 「已處理」，保留只移動一種清單的實際行為：帶有 aria-label 的 treegrid 同時也符合
                // table[aria-label]，若兩者都執行，會在移動焦點的同時又點擊同一張表的儲存格。
                if (keySequence.endsWith('j')) {
                    if (!moveGeneralTableItemsCursor('down')) {
                        moveGeneralGridItemsCursor('down');
                        moveGeneralTreeGridItemsCursor('down');
                    }
                    return resetKeySequence();
                }
                if (keySequence.endsWith('k')) {
                    if (!moveGeneralTableItemsCursor('up')) {
                        moveGeneralGridItemsCursor('up');
                        moveGeneralTreeGridItemsCursor('up');
                    }
                    return resetKeySequence();
                }
            }

            function toggleSidePane() {
                const splitterPane = get_splitter_pane();
                const navigationPane = get_navigation_pane();

                if (splitterPane) {
                    const showLessInformationBtn = splitterPane.querySelector('[aria-label="Show less information"][role="button"]');
                    const showMoreInformationBtn = splitterPane.querySelector('[aria-label="Show more information"][role="button"]');
                    const theButton = showLessInformationBtn || showMoreInformationBtn;
                    if (theButton) {
                        console.log('切換 splitterPane 的按鈕已找到', theButton);
                        theButton.click();
                        return true;
                    }
                }

                if (navigationPane) {
                    const showLessInformationBtn = navigationPane.querySelector('[aria-label="Show less information"][role="button"]');
                    const showMoreInformationBtn = navigationPane.querySelector('[aria-label="Show more information"][role="button"]');
                    const theButton = showLessInformationBtn || showMoreInformationBtn;
                    if (theButton) {
                        console.log('切換 navigationPane 的按鈕已找到', theButton);
                        theButton.click();
                        return true;
                    }
                }

                // 回傳 false 表示這個頁面沒有可切換的側邊欄，呼叫端就不會攔截 Ctrl+B。
                return false;
            }
        });

        function resetKeySequence() {
            keySequence = '';
        }

        focusWikiViewContainer();

    })();

    /**
     * 判斷按鍵目標是否為 INPUT/TEXTAREA 以外的輸入情境：select 下拉選單與 contenteditable 編輯器。
     * isContentEditable 會沿用祖先的 contenteditable 設定，也能正確處理 contenteditable="false" 的區塊。
     */
    function isEditableContext(target) {
        if (!target || target.nodeType !== Node.ELEMENT_NODE) return false;
        if (target.tagName === 'SELECT') return true;
        return target.isContentEditable === true;
    }

    function getOrgInfo() {

        // Organization names
        // https://learn.microsoft.com/en-us/azure/devops/organizations/settings/naming-restrictions?view=azure-devops&WT.mc_id=DT-MVP-4015686#organization-names

        /*
            Currently, you can only use letters from the English alphabet in your organization name.
            Start organization names with a letter or number, followed by letters, numbers, or hyphens.
            Organization names must not contain more than 50 Unicode characters and must end with a letter or number.
        */

        let urlBase;
        let orgName;
        let urlType;

        // https://ORG-NAME.azure.com/PROJECT-NAME/*
        const orgNameRegex = '[a-z0-9][a-z0-9-]{1,49}';
        const regex1 = new RegExp(`^https://(${orgNameRegex})\\.visualstudio\\.com(/DefaultCollection)?`, 'i');
        const regex2 = new RegExp(`^https://dev\\.azure\\.com/(${orgNameRegex})`, 'i');

        const match1 = window.location.href.match(regex1);
        const match2 = window.location.href.match(regex2);

        // /^https:\/\/([\w-]+)\.visualstudio\.com/;
        if (match1) {
            urlBase = match1[0];
            orgName = match1[1];
            urlType = 1; // 第一代的網址格式
        }

        // https://dev.azure.com/ORG-NAME/PROJECT-NAME/*
        if (match2) {
            urlBase = match2[0];
            orgName = match2[1];
            urlType = 2; // 第二代的網址格式
        }

        return [urlBase, orgName, urlType];
    }

    /**
     * 檢查目前是否在專案內
     */
    function isInProject() {
        var [, prjName] = getProjectInfo();
        return prjName !== undefined;
    }

    function isInHome() {
        var [, prjName] = getProjectInfo();
        return prjName === undefined;
    }

    function isInProjectWikis() {
        var [baseUrl] = getProjectInfo();
        var baseUrlRegex = escapeRegExp(baseUrl);
        const regex = new RegExp(`^${baseUrlRegex}/_wiki`, 'i');
        var isInWiki = !!window.location.href.match(regex);
        console.log(`isInProjectWikis: ${isInWiki}, baseUrlRegex = ${baseUrlRegex}`);
        return isInWiki;
    }

    function isInProjectBoardsWorkItems() {
        var [baseUrl] = getProjectInfo();
        var baseUrlRegex = escapeRegExp(baseUrl);
        const regex = new RegExp(`^${baseUrlRegex}/_workitems`, 'i');
        return !!window.location.href.match(regex);
    }

    function isInProjectBoardsBoards() {
        var [baseUrl] = getProjectInfo();
        var baseUrlRegex = escapeRegExp(baseUrl);
        const regex = new RegExp(`^${baseUrlRegex}/_boards`, 'i');
        return !!window.location.href.match(regex);
    }

    function isInProjectBoardsBacklogs() {
        var [baseUrl] = getProjectInfo();
        var baseUrlRegex = escapeRegExp(baseUrl);
        const regex = new RegExp(`^${baseUrlRegex}/_backlogs`, 'i');
        return !!window.location.href.match(regex);
    }

    function isInProjectBoardsSprints() {
        var [baseUrl] = getProjectInfo();
        var baseUrlRegex = escapeRegExp(baseUrl);
        const regex = new RegExp(`^${baseUrlRegex}/_sprints`, 'i');
        return !!window.location.href.match(regex);
    }

    function isInProjectBoardsQueries() {
        var [baseUrl] = getProjectInfo();
        var baseUrlRegex = escapeRegExp(baseUrl);
        const regex = new RegExp(`^${baseUrlRegex}/_queries`, 'i');
        return !!window.location.href.match(regex);
    }

    function isInProjectBoardsDeliveryPlans() {
        var [baseUrl] = getProjectInfo();
        var baseUrlRegex = escapeRegExp(baseUrl);
        const regex = new RegExp(`^${baseUrlRegex}/_deliveryplans`, 'i');
        return !!window.location.href.match(regex);
    }

    function isInProjectBoardsAnalyticsViews() {
        var [baseUrl] = getProjectInfo();
        var baseUrlRegex = escapeRegExp(baseUrl);
        const regex = new RegExp(`^${baseUrlRegex}/_analytics`, 'i');
        return !!window.location.href.match(regex);
    }

    /** 取得當前網址 (不含 Query String 與 Hash 內容) */
    function getCurrentURL() {
        const url = new URL(window.location.href);
        url.search = '';
        url.hash = '';
        return url.toString();
    }

    function isInProjectReposFiles() {
        var [projectBaseUrl, projectName, isInRepos, repoUrlBase] = getProjectInfo();

        var baseUrlRegex = escapeRegExp(repoUrlBase);
        const regex = new RegExp(`^${baseUrlRegex}$`, 'i');
        var match = getCurrentURL().match(regex);
        return !!match;
    }

    function isInProjectReposCommits() {
        var [projectBaseUrl, projectName, isInRepos, repoUrlBase] = getProjectInfo();
        var baseUrlRegex = escapeRegExp(repoUrlBase);
        const regex = new RegExp(`^${baseUrlRegex}/commit(s)?`, 'i');
        var match = getCurrentURL().match(regex);
        return !!match;
    }

    function isInProjectReposPushes() {
        var [projectBaseUrl, projectName, isInRepos, repoUrlBase] = getProjectInfo();
        var baseUrlRegex = escapeRegExp(repoUrlBase);
        const regex = new RegExp(`^${baseUrlRegex}/pushes$`, 'i');
        var match = getCurrentURL().match(regex);
        return !!match;
    }

    function isInProjectReposBranches() {
        var [projectBaseUrl, projectName, isInRepos, repoUrlBase] = getProjectInfo();
        var baseUrlRegex = escapeRegExp(repoUrlBase);
        const regex = new RegExp(`^${baseUrlRegex}/branches$`, 'i');
        var match = getCurrentURL().match(regex);
        return !!match;
    }

    function isInProjectReposTags() {
        var [projectBaseUrl, projectName, isInRepos, repoUrlBase] = getProjectInfo();
        var baseUrlRegex = escapeRegExp(repoUrlBase);
        const regex = new RegExp(`^${baseUrlRegex}/tags$`, 'i');
        var match = getCurrentURL().match(regex);
        return !!match;
    }

    function isInProjectReposPullRequests() {
        var [projectBaseUrl, projectName, isInRepos, repoUrlBase] = getProjectInfo();
        var baseUrlRegex = escapeRegExp(repoUrlBase);
        const regex = new RegExp(`^${baseUrlRegex}/pullrequests$`, 'i');
        var match = getCurrentURL().match(regex);

        console.log(`isInProjectReposPullRequests: ${!!match}, repoUrlBase = ${repoUrlBase}, getCurrentURL() = ${getCurrentURL()}, regex = ${regex}`);

        return !!match;
    }

    function isInProjectReposPullRequestsCreate() {
        var [projectBaseUrl, projectName, isInRepos, repoUrlBase] = getProjectInfo();
        var baseUrlRegex = escapeRegExp(repoUrlBase);
        const regex = new RegExp(`^${baseUrlRegex}/pullrequestcreate$`, 'i');
        var match = getCurrentURL().match(regex);
        return !!match;
    }

    function isInProjectReposAdvancedSecurity() {
        var [projectBaseUrl, projectName, isInRepos, repoUrlBase] = getProjectInfo();
        var baseUrlRegex = escapeRegExp(repoUrlBase);
        const regex = new RegExp(`^${baseUrlRegex}/alerts$`, 'i');
        var match = getCurrentURL().match(regex);
        return !!match;
    }

    function isInProjectPipelinesBuilds() {
        var [baseUrl] = getProjectInfo();
        var baseUrlRegex = escapeRegExp(baseUrl);
        const regex = new RegExp(`^${baseUrlRegex}/_build$`, 'i');
        var matched = !!getCurrentURL().match(regex);
        console.log(`isInProjectPipelinesBuilds: ${matched}`);
        return matched;
    }

    function isInProjectPipelinesEnvironments() {
        var [baseUrl] = getProjectInfo();
        var baseUrlRegex = escapeRegExp(baseUrl);
        const regex = new RegExp(`^${baseUrlRegex}/_environments$`, 'i');
        return !!window.location.href.match(regex);
    }

    function isInProjectPipelinesReleases() {
        var [baseUrl] = getProjectInfo();
        var baseUrlRegex = escapeRegExp(baseUrl);
        const regex = new RegExp(`^${baseUrlRegex}/_release$`, 'i');
        return !!window.location.href.match(regex);
    }

    function isInProjectPipelinesLibrary() {
        var [baseUrl] = getProjectInfo();
        var baseUrlRegex = escapeRegExp(baseUrl);
        const regex = new RegExp(`^${baseUrlRegex}/_library$`, 'i');
        return !!window.location.href.match(regex);
    }

    function isInProjectPipelinesTaskGroups() {
        var [baseUrl] = getProjectInfo();
        var baseUrlRegex = escapeRegExp(baseUrl);
        const regex = new RegExp(`^${baseUrlRegex}/_taskgroups$`, 'i');
        return !!window.location.href.match(regex);
    }

    function isInProjectPipelinesDeploymentGroups() {
        var [baseUrl] = getProjectInfo();
        var baseUrlRegex = escapeRegExp(baseUrl);
        const regex = new RegExp(`^${baseUrlRegex}/_machinegroup$`, 'i');
        return !!window.location.href.match(regex);
    }

    function isInProjectPipelinesXAML() {
        var [baseUrl] = getProjectInfo();
        var baseUrlRegex = escapeRegExp(baseUrl);
        const regex = new RegExp(`^${baseUrlRegex}/xaml$`, 'i');
        return !!window.location.href.match(regex);
    }

    function isInProjectPipelinesArtifacts() {
        var [baseUrl] = getProjectInfo();
        var baseUrlRegex = escapeRegExp(baseUrl);
        const regex = new RegExp(`^${baseUrlRegex}/_artifacts`, 'i');
        return !!window.location.href.match(regex);
    }

    function getProjectInfo() {

        let urlBase;
        let projectUrlBase;
        let prjName;
        let isRepos;
        let repoName;
        let repoUrlBase;

        var [orgBaseUrl, , urlType] = getOrgInfo();
        var orgBaseUrlRegex = escapeRegExp(orgBaseUrl);

        /*
            Project names
            https://learn.microsoft.com/en-us/azure/devops/organizations/settings/naming-restrictions?view=azure-devops&WT.mc_id=DT-MVP-4015686#project-names

            Length: Must not contain more than 64 Unicode characters.

            Uniqueness: Must not be identical to any other name in the project collection, the SharePoint Web application that supports the collection, or the instance of SQL Server Reporting Services that supports the collection.

            Reserves names:
            - Must not be a system reserved name.
            - Must not be one of the hidden segments used for IIS request filtering like App_Browsers, App_code, App_Data, App_GlobalResources, App_LocalResources, App_Themes, App_WebResources, bin, or web.config.

            Special characters
            - Must not contain any Unicode control characters or surrogate characters.
            - Must not contain the following printable characters: \ / : * ? " < > | ; # $ * { } , + = [ ].
            - Must not start with an underscore _.
            - Must not start or end with a period ..
         */

        /*
         * Regex 解釋：https://javascript.info/regexp-lookahead-lookbehind
         * (?!   ) 是 Negative Lookbehind
         *      裡面的 [^/]{1,64} 代表不包含 / 的字元，{1,64} 代表長度 1 ~ 64 個字元
         *      裡面的 [\\:\\*\\?"<>|;#$*\\{\\},+=\\[\\]] 是會出現的特殊字元
         *      如果比對到，那就代表有特殊字元
         * [^._]  代表不能是 . 或 _ 開頭，僅包含 1 個字元
         * [^/]{1,63} 代表不能包含 / 的字元，長度 1 ~ 63 個字元
         */
        const projectNameRegex = '(?![^/]{1,64}[\\:\\*\\?"<>|;#$*\\{\\},+=\\[\\]])[^._][^/]{1,63}'

        /*
         * Repository Names
         * https://learn.microsoft.com/en-us/azure/devops/organizations/settings/naming-restrictions?view=azure-devops&WT.mc_id=DT-MVP-4015686#azure-repos-git
         */

        /*
            Length: Must not contain more than 64 Unicode characters.
            Uniqueness: Must not be identical to any other Git repo name in the project.
            Special characters:
            - Must not contain any Unicode control characters or surrogate characters.
            - Must not contain the following printable characters: \ / : * ? " < > | ; # $ * { } , + = [ ].
            - Must not start with an underscore _.
            - Must not start or end with a period ..
            - Must not be a system reserved name.
        */

        const forbiddenChars = '[\\:*?"<>|;#$*{},+=\\[\\]]';
        const UnicodeInvalid = '[\\x00-\\x1F\\x7F]';
        let repoNameRegex = `(?![_.])(?![^/]{1,64}${UnicodeInvalid})(?![^/]{1,64}${forbiddenChars})[^/]{1,64}`;

        // 網址的結構有以下幾種變形：
        // Type 1
        // 1. 當 Repo Name 跟 Project Name 一樣時
        //    https://miniasp.visualstudio.com/_git/FTPM-digital-nomad/pullrequests?_a=mine
        // 2. 當 Repo Name 跟 Project Name 不一樣時
        //    https://miniasp.visualstudio.com/FTPM-digital-nomad/_git/HTMLTemplate/pullrequests?_a=mine

        let regexUrl1 = new RegExp(`^${orgBaseUrlRegex}/_git/(${projectNameRegex})`, 'i');
        let matchUrl1 = window.location.href.match(regexUrl1);
        if (!!matchUrl1) {
            prjName = matchUrl1[1];
            urlBase = `${orgBaseUrl}/${prjName}`;
            repoName = prjName;
            isRepos = true;
            repoUrlBase = `${orgBaseUrl}/_git/${prjName}`;

            return [urlBase, prjName, isRepos, repoUrlBase];
        }

        let regexUrl2 = new RegExp(`^${orgBaseUrlRegex}/(${projectNameRegex})/_git/(${repoNameRegex})`, 'i');
        // console.log('regexUrl2', regexUrl2)
        let matchUrl2 = window.location.href.match(regexUrl2);
        if (!!matchUrl2) {
            prjName = matchUrl2[1];
            urlBase = `${orgBaseUrl}/${prjName}`;
            repoName = matchUrl2[2];
            isRepos = true;
            repoUrlBase = `${urlBase}/_git/${repoName}`;

            return [urlBase, prjName, isRepos, repoUrlBase];
        }

        let regexUrl3 = new RegExp(`^${orgBaseUrlRegex}/(${projectNameRegex})`, 'i');
        let matchUrl3 = window.location.href.match(regexUrl3);
        if (!!matchUrl3) {
            prjName = matchUrl3[1];
            urlBase = `${orgBaseUrl}/${prjName}`;
            repoName = '';
            isRepos = false;
            repoUrlBase = '';

            return [urlBase, prjName, isRepos, repoUrlBase];
        }

        return [, , ,];
    }

    // https://stackoverflow.com/a/23637821/910074
    // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions#escaping
    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
    }

    function get_navigation_pane() {
        return document.querySelector('[data-renderedregion="navigation"]');
    }

    function get_splitter_pane() {
        return document.querySelector('.vss-Splitter--pane-fixed');
    }

    function get_current_leftpane_cursor() {
        // 沒有左側頁面樹時回傳 null，交由呼叫端以 ?. 判斷，避免 null 存取丟出例外。
        return get_splitter_pane()?.querySelector('tr[aria-selected="true"]') ?? null;
    }

    function focusWikiViewContainer() {
        setTimeout(() => {
            let wikiViewContainer = document.querySelector('.wiki-view-container');
            if (wikiViewContainer) {
                // There are many scrollable area in a web page. When I use the mouse to click on a scrollable DIV on a web page, I can hit Space key to scroll down on that part of a HTML page. When focus lost, I can't hit Space key to scroll on that area. What if I want to get focus again to that area so that I can let user hit Space key to scroll. What can I do using JS?
                wikiViewContainer.setAttribute('tabindex', '-1');
                wikiViewContainer.focus();
            }
        }, 100);
    }

    function moveWikiItemsCursor(direction = 'down') {
        const splitterPane = get_splitter_pane();
        // 左側頁面樹不存在（已收合或尚未載入）或沒有任何頁面時直接結束；
        // 原本會在 null 或空清單上存取屬性而丟出 TypeError。
        if (!splitterPane) return;
        const allItems = splitterPane.querySelectorAll(`tr[data-row-index]`);
        if (!allItems.length) return;
        // get last index
        const lastIndex = parseInt(allItems[allItems.length - 1].getAttribute('data-row-index'));

        const currentItem = splitterPane.querySelector('tr[aria-selected="true"]');
        console.log("currentItem", currentItem)

        if (!currentItem) {
            const nextItem = splitterPane.querySelector(`tr[data-row-index="0"]`);
            if (!nextItem) return;
            nextItem.setAttribute('aria-selected', 'true');
            nextItem.classList.add('selected');
        } else {
            const currentIndex = currentItem.getAttribute('data-row-index');
            console.log("currentIndex", currentIndex)
            let nextIndex = parseInt(currentIndex);

            if (direction == 'down') {
                nextIndex = nextIndex + 1;
            } else {
                nextIndex = nextIndex - 1;
            }
            console.log("nextIndex", nextIndex)

            if (!splitterPane.querySelector(`tr[data-row-index="${nextIndex}"]`)) {
                if (direction == 'down') {
                    nextIndex = 0;
                } else {
                    nextIndex = lastIndex;
                }
            }
            console.log("nextIndex", nextIndex)

            const nextItem = splitterPane.querySelector(`tr[data-row-index="${nextIndex}"]`);
            console.log("nextItem", nextItem);

            // 頁面樹以虛擬捲動呈現時，目標列可能尚未產生；找不到就保留目前的選取，不要把游標弄丟。
            if (!nextItem) return;

            currentItem.removeAttribute('aria-selected');
            currentItem.classList.remove('selected');

            nextItem.setAttribute('aria-selected', 'true');
            nextItem.classList.add('selected');

            nextItem.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
        }
    }

    function moveGeneralTableItemsCursor(direction = 'down') {
        let contentArea = document.querySelector('div[data-renderedregion="content"]');
        let tableArea = contentArea?.querySelector(`table[aria-label]`);
        if (!!tableArea) {
            let label = tableArea.getAttribute('aria-label');
            console.log(`aria-label = ${label}`);
            let rows = tableArea?.querySelectorAll('[role="row"]:not([data-row-index="-1"])');
            console.log(`${label} > links`, rows);
            if (rows && Array.from(rows).length > 0) {
                rows = Array.from(rows);
                console.log(`${label} > links.length`, rows.length);
                let focusedIndex = rows.findIndex((link) => link.classList.contains('focused'));
                console.log(`${label} > links > focusedIndex:`, focusedIndex);
                if (focusedIndex === -1) {
                    focusedIndex = 0;
                } else {
                    rows[focusedIndex].classList.remove('focused');
                    if (direction == 'down') {
                        focusedIndex++;
                    } else {
                        focusedIndex--;
                    }
                    if (focusedIndex >= rows.length) {
                        focusedIndex = 0;
                    }
                    if (focusedIndex == -1) {
                        focusedIndex = rows.length - 1;
                    }
                }
                console.log(`${label} > links > focusedIndex > focused:`, focusedIndex);
                rows[focusedIndex].classList.add('focused');
                rows[focusedIndex].focus();
                // 原本在這裡 return resetKeySequence()，但 resetKeySequence 定義在內層 IIFE，
                // 從這裡呼叫會丟出 ReferenceError。按鍵序列已由呼叫端重設，這裡只需回報「已處理」。
                return true;
            }
        }
        return false;
    }

    function moveGeneralGridItemsCursor(direction = 'down') {
        let contentArea = document.querySelector('div[data-renderedregion="content"]');
        let gridArea = contentArea?.querySelector(`div[role="grid"]`);
        if (!!gridArea) {
            let label = gridArea.getAttribute('aria-label');
            console.log(`aria-label = ${label}`);
            let rows = gridArea?.querySelectorAll('[role="row"]:not([data-automationid="DetailsHeader"])');
            console.log(`${label} > links`, rows);
            if (rows && Array.from(rows).length > 0) {
                rows = Array.from(rows);
                console.log(`${label} > links.length`, rows.length);
                let selectedIndex = rows.findIndex((link) => link.classList.contains('is-selected'));
                console.log(`${label} > links > selectedIndex:`, selectedIndex);
                if (selectedIndex === -1) {
                    selectedIndex = 0;
                } else {
                    rows[selectedIndex].classList.remove('is-selected');
                    rows[selectedIndex].setAttribute('aria-selected', 'false');
                    if (direction == 'down') {
                        selectedIndex++;
                    } else {
                        selectedIndex--;
                    }
                    if (selectedIndex >= rows.length) {
                        selectedIndex = 0;
                    }
                    if (selectedIndex == -1) {
                        selectedIndex = rows.length - 1;
                    }
                }
                console.log(`${label} > links > selectedIndex > selected:`, selectedIndex);
                // rows[selectedIndex].classList.add('is-selected');
                let systemId = rows[selectedIndex].querySelector('div[data-automation-key="System.Id"]');
                if (systemId) {
                    systemId.click();
                }
                rows[selectedIndex].focus();
                rows[selectedIndex].scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
            }
        }
    }

    function moveGeneralTreeGridItemsCursor(direction = 'down') {
        let contentArea = document.querySelector('div[data-renderedregion="content"]');
        let gridArea = contentArea?.querySelector(`table[role="treegrid"]`);
        if (!!gridArea) {
            let label = 'treegrid';
            console.log(`treegrid found!`);
            let rows = gridArea?.querySelectorAll('[role="row"]:not([data-row-index="-1"])');
            console.log(`${label} > links`, rows);
            if (rows && Array.from(rows).length > 0) {
                rows = Array.from(rows);
                console.log(`${label} > links.length`, rows.length);
                let selectedIndex = rows.findIndex((link) => link.classList.contains('selected'));
                console.log(`${label} > links > selectedIndex:`, selectedIndex);
                if (selectedIndex === -1) {
                    selectedIndex = 0;
                } else {
                    rows[selectedIndex].classList.remove('selected');
                    rows[selectedIndex].setAttribute('aria-selected', 'false');
                    if (direction == 'down') {
                        selectedIndex++;
                    } else {
                        selectedIndex--;
                    }
                    if (selectedIndex >= rows.length) {
                        selectedIndex = 0;
                    }
                    if (selectedIndex == -1) {
                        selectedIndex = rows.length - 1;
                    }
                }
                console.log(`${label} > links > selectedIndex > selected:`, selectedIndex);
                rows[selectedIndex].classList.add('selected');
                rows[selectedIndex].setAttribute('aria-selected', 'true');
                let systemId = rows[selectedIndex].querySelector('td[data-column-index="1"]');
                if (systemId) {
                    systemId.click();
                }
                rows[selectedIndex].focus();
                rows[selectedIndex].scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
            }
        }
    }

})();
