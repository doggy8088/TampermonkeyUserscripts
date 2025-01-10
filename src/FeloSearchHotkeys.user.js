// ==UserScript==
// @name         Felo Search: 好用的鍵盤快速鍵集合
// @version      0.7.0
// @description  按下 Ctrl+Delete 快速刪除當下聊天記錄、按下 Ctrl+B 快速切換側邊欄、按下 j 與 k 快速切換搜尋結果頁面
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/FeloSearchHotkeys.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/FeloSearchHotkeys.user.js
// @author       Will Huang
// @match        https://felo.ai/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=felo.ai
// ==/UserScript==

(async function () {
    'use strict';

    document.addEventListener('keydown', async (event) => {

        // 從網址列取得 pathinfo
        const currentPath = window.location.pathname;

        if (!event.ctrlKey && event.key === 'j') {
            // 如果是輸入欄位，就不要觸發。但是按下 alt+j 就可以觸發這個功能。
            if ((event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') && !event.altKey) {
                return;
            }

            // 1. 從網址列取得 pathinfo
            const currentUrl = window.location.pathname;

            // 2. 找到和目前 pathinfo 一樣的超連結
            const matchingLink = document.querySelector(`a[href='${currentUrl}']`);
            if (matchingLink) {
                // 找到下一個 link
                const nextLink = matchingLink?.closest('li')?.nextElementSibling?.querySelector('a')
                    ?? matchingLink?.closest('li')?.nextElementSibling?.nextElementSibling?.querySelector('a');
                if (nextLink) {
                    nextLink?.parentElement?.previousElementSibling?.scrollIntoView();
                    nextLink?.click();
                }
            } else {
                const firstLink = document.querySelector(`a[href*='/search/']`);
                firstLink?.click();
            }
            event.preventDefault();
        }

        if (!event.ctrlKey && event.key === 'k') {
            // 如果是輸入欄位，就不要觸發。但是按下 alt+k 就可以觸發這個功能。
            if ((event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') && !event.altKey) {
                return;
            }

            // 1. 從網址列取得 pathinfo
            const currentUrl = window.location.pathname;

            // 2. 找到和目前 pathinfo 一樣的超連結
            const matchingLink = document.querySelector(`a[href='${currentUrl}']`);
            const previousLink = matchingLink?.closest('li')?.previousElementSibling?.querySelector('a')
                ?? matchingLink?.closest('li')?.previousElementSibling?.previousElementSibling?.querySelector('a');
            if (previousLink) {
                previousLink.parentElement.previousElementSibling.scrollIntoView();
                previousLink.click();
            }
            event.preventDefault();
        }

        // 按下 Alt+/ 就先找出所有 button 元素，比對元素內容，如果為「歷史紀錄」就點擊它
        if (!event.ctrlKey && event.key === '/') {
            // 如果是輸入欄位，就不要觸發。但是按下 alt+/ 就可以觸發這個功能。
            if ((event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') && !event.altKey) {
                return;
            }

            clickButtonByText(['歷史記錄', '历史记录', '履歴記録', 'History']);
            event.preventDefault();
        }

        // 按下 Alt+t 就先找出所有 button 元素，比對元素內容，如果為「主題集」就點擊它
        if (!event.ctrlKey && event.key === 't') {
            // 如果是輸入欄位，就不要觸發。但是按下 alt+t 就可以觸發這個功能。
            if ((event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') && !event.altKey) {
                return;
            }

            clickButtonByText(['主題集', '主题集', 'トピック集', 'Topic Collections']);
            event.preventDefault();
        }

        // 按下 Alt+s 就先找出所有 button 元素，比對元素內容，如果為「分享」就點擊它
        if (!event.ctrlKey && event.key === 's') {
            // 如果是輸入欄位，就不要觸發。但是按下 alt+s 就可以觸發這個功能。
            if ((event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') && !event.altKey) {
                return;
            }

            clickButtonByText(['分享', '分享', '共有する', 'Share']);
            event.preventDefault();
        }

        // 按下 Alt+c 就先找出所有包含 [tabindex] 屬性的元素，比對元素內容，如果為「建立主題」就點擊它
        if (!event.ctrlKey && event.key === 'c') {
            // 如果是輸入欄位，就不要觸發。但是按下 alt+c 就可以觸發這個功能。
            if ((event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') && !event.altKey) {
                return;
            }

            clickButtonByText(['建立主題', '建立主题', 'トピックを作成', 'Create topic']);
            event.preventDefault();
        }

        // 按下 Ctrl+Delete 快速刪除 Felo Search 聊天記錄
        if (event.ctrlKey && event.key === 'Delete') {
            // 如果是輸入欄位，就不要觸發
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
                return;
            }

            // 找到和目前 pathinfo 一樣的超連結
            const matchingLink = document.querySelector(`a[href='${currentPath}']`);
            const nextLink = matchingLink?.closest('li')?.nextElementSibling?.querySelector('a')
                ?? matchingLink?.closest('li')?.nextElementSibling?.nextElementSibling?.querySelector('a');

            // 找到超連結的下一個同層的 section 元素
            const nextSection = matchingLink?.nextElementSibling;
            // 找到下一層的 button 按鈕
            const button = nextSection?.querySelector('button');
            button?.click();

            await delay(200); // 加入一點延遲來模擬真實打字過程
            clickButtonByText(['確認', '确认', '確認', 'Confirm']);

            await delay(200);

            if (!!nextLink) {
                nextLink?.click();
            } else {
                goHome(); // 回首頁
            }

            event.preventDefault();
        }

        // 按下 Ctrl+B 快速切換側邊欄
        if (event.ctrlKey && event.key === 'b') {
            // 找到 section 的 class 為「cursor-pointer」的元素
            const svg = document.querySelector('section.cursor-pointer svg');
            svg?.parentElement.click();
            event.preventDefault();
        }

        // 按下 Escape 就點擊 document.querySelector('img').click()
        if (!event.ctrlKey && event.key === 'Escape') {
            // 如果有 [role='dialog'] 就不要觸發
            if (document.querySelector('[role="dialog"]')) {
                return;
            }

            // 如果是輸入欄位，就不要觸發
            if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
                if (event.target.value === '' && currentPath.includes('/history')) {
                    // 只有在歷史紀錄頁面且搜尋欄位是空白時才會觸發
                    window.history.back();
                }
                if (event.target.value !== '') {
                    event.target.value = '';
                }
                return;
            }

            let backdropBlur = document.querySelector('div.backdrop-blur-md');
            if (!backdropBlur) {
                goHome(); // 回首頁
                event.preventDefault();
            } else {
                backdropBlur?.parentElement?.querySelector('button')?.click();
            }
        }
    });

    function goHome() {
        // 找到第一個 img 元素並點擊 (Felo Logo)
        document.querySelector('img')?.click();
    }

    // 延遲函式
    async function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function clickButtonByText(buttonTexts) {
        let buttons = document.querySelectorAll('button');

        // 請把所有包含 [tabindex] 屬性都當成 buttons 來處理，並加入到 buttons 之中
        let tabindexElements = document.querySelectorAll('[tabindex]');

        for (let i = 0; i < tabindexElements.length; i++) {
            const tabindexElement = tabindexElements[i];
            if (tabindexElement.tagName !== 'BUTTON' && tabindexElement.tabIndex != -1) {
                buttons = [...buttons, tabindexElement];
            }
        }

        for (let i = 0; i < buttons.length; i++) {
            const button = buttons[i];
            // 將 buttonText 所有的 Unicode 空白字元都換成一個空白字元
            let buttonText = button.textContent.trim().replace(/\s/g, ' ');
            if (buttonTexts.includes(buttonText)) {
                button.click();
                break;
            }
        }
    }

    function display_hotkey_hints() {

        longPressAltKey();

        function showHotkeyHintForButtonByText(buttonTexts, hint) {
            const buttons = document.querySelectorAll('button');
            for (let i = 0; i < buttons.length; i++) {
                const button = buttons[i];
                let buttonText = button.textContent.trim().replace(/\s/g, ' ');
                if (buttonTexts.includes(buttonText)) {
                    addBadge(button, hint);
                    break;
                }
            }
        }

        function addBadge(element, text) {
            const badge = document.createElement('span');
            badge.className = 'badge';
            badge.textContent = text;
            badge.style.backgroundColor = '#007bff'; // 改为蓝色
            badge.style.color = '#fff';
            badge.style.padding = '0.2em 0.4em';
            badge.style.borderRadius = '0.25em';
            badge.style.position = 'absolute';
            badge.style.marginLeft = '0.5em';
            badge.style.zIndex = '9999';

            // 设定 badge 的位置
            const rect = element.getBoundingClientRect();
            badge.style.left = `${rect.right + window.scrollX + 8}px`;
            badge.style.top = `${rect.top + window.scrollY}px`;

            // 将 badge 插入到 body 中
            document.body.appendChild(badge);
        }

        function longPressAltKey() {
            let altKeyTimeout;
            let altKeyIsOn = false;
            document.addEventListener('keydown', (event) => {
                if (event.key === 'Alt' && altKeyIsOn == false) {
                    altKeyIsOn = true;
                    altKeyTimeout = setTimeout(() => {
                        showHotkeyHintForButtonByText(['主題集', '主题集', 'トピック集', 'Topic Collections'], 'Alt+T');
                        showHotkeyHintForButtonByText(['歷史記錄', '历史记录', '履歴記録', 'History'], 'Alt+/');
                        showHotkeyHintForButtonByText(['分享', '分享', '共有する', 'Share'], 'Alt+S');
                    }, 1000); // 1 秒
                }
            });
            document.addEventListener('keyup', (event) => {
                altKeyIsOn = false;
                if (event.key === 'Alt') {
                    // 删除所有 span.badge
                    document.querySelectorAll('span.badge').forEach((el) => el.remove());
                    altKeyTimeout = clearTimeout(altKeyTimeout);
                }
            });
        }
    }

})();
