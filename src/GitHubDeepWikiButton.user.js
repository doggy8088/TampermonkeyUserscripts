// ==UserScript==
// @name         GitHub: 新增 DeepWiki 按鈕
// @version      0.1.1
// @description  在 GitHub Repo 頁面新增 DeepWiki 按鈕，快速跳轉到對應的 AI 文件網站
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/GitHubDeepWikiButton.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/GitHubDeepWikiButton.user.js
// @author       Will Huang
// @match        https://github.com/*/*
// @match        https://github.com/*/*/*
// @run-at       document-idle
// @icon         https://www.google.com/s2/favicons?sz=64&domain=github.com
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    // 從網址路徑取出 owner/repo，例如 /doggy8088/TampermonkeyUserscripts/tree/main → doggy8088、TampermonkeyUserscripts。
    const REPO_PATH_PATTERN = /^\/([^\/]+)\/([^\/]+)(?:\/|$)/;
    const BUTTON_CLASS = 'deepwiki-button';
    const ACTIONS_CONTAINER_SELECTOR = '#repository-details-container .pagehead-actions';

    function getDeepWikiUrl() {
        const pathMatch = window.location.pathname.match(REPO_PATH_PATTERN);
        if (!pathMatch) return null;

        const owner = pathMatch[1];
        const repo = pathMatch[2];
        return `https://deepwiki.com/${owner}/${repo}`;
    }

    function createDeepWikiButton() {
        // 從當前 URL 提取 owner/repo 資訊
        const deepwikiUrl = getDeepWikiUrl();
        if (!deepwikiUrl) return null;

        // 建立按鈕容器
        const li = document.createElement('li');

        // 建立按鈕元素
        const button = document.createElement('a');
        button.href = deepwikiUrl;
        button.target = '_blank';
        button.rel = 'noopener noreferrer';
        button.className = 'btn-sm btn';
        button.title = 'View in DeepWiki';
        button.setAttribute('aria-label', 'View in DeepWiki');
        button.setAttribute('data-hydro-click', JSON.stringify({
            event_type: 'repository.click',
            payload: { target: 'DEEPWIKI_BUTTON' }
        }));

        // 建立圖標
        const icon = document.createElement('img');
        icon.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjExMCAxMTAgNDYwIDUwMCI+CjxwYXRoIHN0eWxlPSJmaWxsOiMyMWMxOWEiIGQ9Ik00MTguNzMsMzMyLjM3YzkuODQtNS42OCwyMi4wNy01LjY4LDMxLjkxLDBsMjUuNDksMTQuNzFjLjgyLjQ4LDEuNjkuOCwyLjU4LDEuMDYuMTkuMDYuMzcuMTEuNTUuMTYuODcuMjEsMS43Ni4zNCwyLjY1LjM1LjA0LDAsLjA4LjAyLjEzLjAyLjEsMCwuMTktLjAzLjI5LS4wNC44My0uMDIsMS42NC0uMTMsMi40NS0uMzIuMTQtLjAzLjI4LS4wNS40Mi0uMDkuODctLjI0LDEuNy0uNTksMi41LTEuMDMuMDgtLjA0LjE3LS4wNi4yNS0uMWw1MC45Ny0yOS40M2MzLjY1LTIuMTEsNS45LTYuMDEsNS45LTEwLjIydi01OC44NmMwLTQuMjItMi4yNS04LjExLTUuOS0xMC4yMmwtNTAuOTctMjkuNDNjLTMuNjUtMi4xMS04LjE1LTIuMTEtMTEuODEsMGwtNTAuOTcsMjkuNDNjLS4wOC4wNC0uMTMuMTEtLjIuMTYtLjc4LjQ4LTEuNTEsMS4wMi0yLjE1LDEuNjYtLjEuMS0uMTguMjEtLjI4LjMxLS41Ny42LTEuMDgsMS4yNi0xLjUxLDEuOTctLjA3LjEyLS4xNS4yMi0uMjIuMzQtLjQ0Ljc3LS43NywxLjYtMS4wMywyLjQ3LS4wNS4xOS0uMS4zNy0uMTQuNTYtLjIyLjg5LS4zNywxLjgxLS4zNywyLjc2djI5LjQzYzAsMTEuMzYtNi4xMSwyMS45NS0xNS45NSwyNy42My05Ljg0LDUuNjgtMjIuMDYsNS42OC0zMS45MSwwbC0yNS40OS0xNC43MWMtLjgyLS40OC0xLjY5LS44LTIuNTctMS4wNi0uMTktLjA2LS4zNy0uMTEtLjU2LS4xNi0uODgtLjIxLTEuNzYtLjM0LTIuNjUtLjM0LS4xMywwLS4yNi4wMi0uNC4wMi0uODQuMDItMS42Ni4xMy0yLjQ3LjMyLS4xMy4wMy0uMjcuMDUtLjQuMDktLjg3LjI0LTEuNzEuNi0yLjUxLDEuMDQtLjA4LjA0LS4xNi4wNi0uMjQuMWwtNTAuOTcsMjkuNDNjLTMuNjUsMi4xMS01LjksNi4wMS01LjksMTAuMjJ2NTguODZjMCw0LjIyLDIuMjUsOC4xMSw1LjksMTAuMjJsNTAuOTcsMjkuNDNjLjA4LjA0LjE3LjA2LjI0LjEuOC40NCwxLjY0Ljc5LDIuNSwxLjAzLjE0LjA0LjI4LjA2LjQyLjA5LjgxLjE5LDEuNjIuMywyLjQ1LjMyLjEsMCwuMTkuMDQuMjkuMDQuMDQsMCwuMDgtLjAyLjEzLS4wMi44OSwwLDEuNzctLjEzLDIuNjUtLjM1LjE5LS4wNC4zNy0uMS41Ni0uMTYuODgtLjI2LDEuNzUtLjU5LDIuNTgtMS4wNmwyNS40OS0xNC43MWM5Ljg0LTUuNjgsMjIuMDYtNS42OCwzMS45MSwwLDkuODQsNS42OCwxNS45NSwxNi4yNywxNS45NSwyNy42M3YyOS40M2MwLC45NS4xNSwxLjg3LjM3LDIuNzYuMDUuMTkuMDkuMzcuMTQuNTYuMjUuODYuNTksMS42OSwxLjAzLDIuNDcuMDcuMTIuMTUuMjIuMjIuMzQuNDMuNzEuOTQsMS4zNywxLjUxLDEuOTcuMS4xLjE4LjIxLjI4LjMxLjY1LjYzLDEuMzcsMS4xOCwyLjE1LDEuNjYuMDcuMDQuMTMuMTEuMi4xNmw1MC45NywyOS40M2MxLjgzLDEuMDUsMy44NiwxLjU4LDUuOSwxLjU4czQuMDgtLjUzLDUuOS0xLjU4bDUwLjk3LTI5LjQzYzMuNjUtMi4xMSw1LjktNi4wMSw1LjktMTAuMjJ2LTU4Ljg2YzAtNC4yMi0yLjI1LTguMTEtNS45LTEwLjIybC01MC45Ny0yOS40M2MtLjA4LS4wNC0uMTYtLjA2LS4yNC0uMS0uOC0uNDQtMS42NC0uOC0yLjUxLTEuMDQtLjEzLS4wNC0uMjYtLjA1LS4zOS0uMDktLjgyLS4yLTEuNjUtLjMxLTIuNDktLjMzLS4xMywwLS4yNS0uMDItLjM4LS4wMi0uODksMC0xLjc4LjEzLTIuNjYuMzUtLjE4LjA0LS4zNi4xLS41NC4xNS0uODguMjYtMS43NS41OS0yLjU4LDEuMDdsLTI1LjQ5LDE0LjcyYy05Ljg0LDUuNjgtMjIuMDcsNS42OC0zMS45LDAtOS44NC01LjY4LTE1Ljk1LTE2LjI3LTE1Ljk1LTI3LjYzczYuMTEtMjEuOTUsMTUuOTUtMjcuNjNaIi8+CjxwYXRoIHN0eWxlPSJmaWxsOiMzOTY5Y2EiIGQ9Ik0xNDEuMDksMzE3LjY1bDUwLjk3LDI5LjQzYzEuODMsMS4wNSwzLjg2LDEuNTgsNS45LDEuNTNzNC4wOC0uNTMsNS45LTEuNThsNTAuOTctMjkuNDNjLjA4LS4wNC4xMy0uMTEuMi0uMTYuNzgtLjQ4LDEuNTEtMS4wMiwyLjE1LTEuNjYuMS0uMS4xOC0uMjEuMjgtLjMxLjU3LS42LDEuMDgtMS4yNiwxLjUxLTEuOTcuMDctLjEyLjE1LS4yMi4yMi0uMzQuNDQtLjc3Ljc3LTEuNiwxLjAzLTIuNDcuMDUtLjE5LjEtLjM3LjE0LS41Ni4yMi0uODkuMzctMS44MS4zNy0yLjc2di0yOS40M2MwLTExLjM2LDYuMTEtMjEuOTUsMTUuOTYtMjcuNjNzMjIuMDYtNS42OCwzMS45MSwwbDI1LjQ5LDE0LjcxYy44Mi40OCwxLjY5LjgsMi41NywxLjA2LjE5LjA2LjM3LjExLjU2LjE2Ljg3LjIxLDEuNzYuMzQsMi42NC4zNS4wNCwwLC4wOS4wMi4xMy4wMi4xLDAsLjE5LS4wNC4yOS0uMDQuODMtLjAyLDEuNjUtLjEzLDIuNDUtLjMyLjE0LS4wMy4yOC0uMDUuNDEtLjA5Ljg3LS4yNCwxLjcxLS42LDIuNTEtMS4wNC4wOC0uMDQuMTYtLjA2LjI0LS4xbDUwLjk3LTI5LjQzYzMuNjUtMi4xMSw1LjktNi4wMSw1LjktMTAuMjJ2LTU4Ljg2YzAtNC4yMi0yLjI1LTguMTEtNS45LTEwLjIybC01MC45Ny0yOS40M2MtMy42NS0yLjExLTguMTUtMi4xMS0xMS44MSwwbC01MC45NywyOS40M2MtLjA4LjA0LS4xMy4xMS0uMi4xNi0uNzguNDgtMS41MSwxLjAyLTIuMTUsMS42Ni0uMS4xLS4xOC4yMS0uMjguMzEtLjU3LjYtMS4wOCwxLjI2LTEuNTEsMS45Ny0uMDcuMTItLjE1LjIyLS4yMi4zNC0uNDQuNzctLjc3LDEuNi0xLjAzLDIuNDctLjA1LjE5LS4xLjM3LS4xNC41Ni0uMjIuODktLjM3LDEuODEtLjM3LDIuNzZ2MjkuNDNjMCwxMS4zNi02LjExLDIxLjk1LTE1Ljk1LDI3LjYzLTkuODQsNS42OC0yMi4wNyw1LjY4LTMxLjkxLDBsLTI1LjQ5LTE0LjcxYy0uODItLjQ4LTEuNjktLjgtMi41OC0xLjA2LS4xOS0uMDYtLjM3LS4xMS0uNTUtLjE2LS44OC0uMjEtMS43Ni0uMzQtMi42NS0uMzUtLjEzLDAtLjI2LjAyLS40LjAyLS44My4wMi0xLjY2LjEzLTIuNDcuMzItLjEzLjAzLS4yNy4wNS0uNC4wOS0uODcuMjQtMS43MS42LTIuNTEsMS4wNC0uMDguMDQtLjE2LjA2LS4yNC4xbC01MC45NywyOS40M2MtMy42NSwyLjExLTUuOSw2LjAxLTUuOSwxMC4yMnY1OC44NmMwLDQuMjIsMi4yNSw4LjExLDUuOSwxMC4yMloiLz4KPHBhdGggc3R5bGU9ImZpbGw6IzAyOTRkZSIgZD0iTTM5Ni44OCw0ODQuMzVsLTUwLjk3LTI5LjQzYy0uMDgtLjA0LS4xNy0uMDYtLjI0LS4xLS44LS40NC0xLjY0LS43OS0yLjUxLTEuMDMtLjE0LS4wNC0uMjctLjA2LS40MS0uMDktLjgxLS4xOS0xLjY0LS4zLTIuNDctLjMyLS4xMywwLS4yNi0uMDItLjM5LS4wMi0uODksMC0xLjc4LjEzLTIuNjYuMzUtLjE4LjA0LS4zNi4xLS41NC4xNS0uODguMjYtMS43Ni41OS0yLjU4LDEuMDdsLTI1LjQ5LDE0LjcyYy05Ljg0LDUuNjgtMjIuMDYsNS42OC0zMS45LDAtOS44NC01LjY4LTE1Ljk2LTE2LjI3LTE1Ljk2LTI3LjYzdi0yOS40M2MwLS45NS0uMTUtMS44Ny0uMzctMi43Ni0uMDUtLjE5LS4wOS0uMzctLjE0LS41Ni0uMjUtLjg2LS41OS0xLjY5LTEuMDMtMi40Ny0uMDctLjEyLS4xNS0uMjItLjIyLS4zNC0uNDMtLjcxLS45NC0xLjM3LTEuNTEtMS45Ny0uMS0uMS0uMTgtLjIxLS4yOC0uMzEtLjY1LS42My0xLjM3LTEuMTgtMi4xNS0xLjY2LS4wNy0uMDQtLjEzLS4xMS0uMi0uMTZsLTUwLjk3LTI5LjQzYy0zLjY1LTIuMTEtOC4xNS0yLjExLTExLjgxLDBsLTUwLjk3LDI5LjQzYy0zLjY1LDIuMTEtNS45LDYuMDEtNS45LDEwLjIydjU4Ljg2YzAsNC4yMiwyLjI1LDguMTEsNS45LDEwLjIybDUwLjk3LDI5LjQzYy4wOC4wNC4xNy4wNi4yNS4xLjguNDQsMS42My43OSwyLjUsMS4wMy4xNC4wNC4yOS4wNi40My4wOS44LjE5LDEuNjEuMywyLjQzLjMyLjEsMCwuMi4wNC4zLjA0LjA0LDAsLjA5LS4wMi4xMy0uMDIuODgsMCwxLjc3LS4xMywyLjY0LS4zNC4xOS0uMDQuMzctLjEuNTYtLjE2Ljg4LS4yNiwxLjc1LS41OSwyLjU3LTEuMDZsMjUuNDktMTQuNzFjOS44NC01LjY4LDIyLjA2LTUuNjgsMzEuOTEsMCw5Ljg0LDUuNjgsMTUuOTUsMTYuMjcsMTUuOTUsMjcuNjN2MjkuNDNjMCwuOTUuMTUsMS44Ny4zNywyLjc2LjA1LjE5LjA5LjM3LjE0LjU2LjI1Ljg2LjU5LDEuNjksMS4wMywyLjQ3LjA3LjEyLjE1LjIyLjIyLjM0LjQzLjcxLjk0LDEuMzcsMS41MSwxLjk3LjEuMS4xOC4yMS4yOC4zMS42NS42MywxLjM3LDEuMTgsMi4xNSwxLjY2LjA3LjA0LjEzLjExLjIuMTZsNTAuOTcsMjkuNDNjMS44MywxLjA1LDMuODYsMS41OCw1LjksMS41OHM0LjA4LS41Myw1LjktMS41OGw1MC45Ny0yOS40M2MzLjY1LTIuMTEsNS45LTYuMDEsNS45LTEwLjIydi01OC44NmMwLTQuMjItMi4yNS04LjExLTUuOS0xMC4yMloiLz4KPC9zdmc+';
        icon.alt = 'DeepWiki';
        icon.style.width = '16px';
        icon.style.height = '16px';
        icon.style.marginRight = '4px';
        icon.style.verticalAlign = 'text-bottom';

        // 建立文字標籤
        const textSpan = document.createElement('span');
        textSpan.textContent = 'DeepWiki';

        // 組裝按鈕
        button.appendChild(icon);
        button.appendChild(textSpan);
        li.appendChild(button);

        return li;
    }

    function addDeepWikiButton() {
        if (shouldIgnorePage()) return;

        // 尋找按鈕插入位置
        const actionsContainer = document.querySelector(ACTIONS_CONTAINER_SELECTOR);
        if (!actionsContainer) return;

        // 檢查是否已經添加過按鈕
        const existingButton = actionsContainer.querySelector(`.${BUTTON_CLASS}`);
        if (existingButton) {
            // GitHub 換頁時若沿用同一個 pagehead（沒有整塊重繪），舊按鈕會留在畫面上；
            // 此時同步更新連結，避免從 repo A 換到 repo B 後按鈕仍然指向 A 的 DeepWiki 頁面。
            const link = existingButton.querySelector('a');
            const deepwikiUrl = getDeepWikiUrl();
            if (link && deepwikiUrl && link.href !== deepwikiUrl) {
                link.href = deepwikiUrl;
            }
            return;
        }

        // 建立按鈕
        const deepwikiButton = createDeepWikiButton();
        if (!deepwikiButton) return;

        // 為按鈕添加識別類別
        deepwikiButton.classList.add(BUTTON_CLASS);

        // 在 Watch 按鈕前插入
        actionsContainer.insertBefore(deepwikiButton, actionsContainer.firstChild);
    }

    function shouldIgnorePage() {
        // 忽略非Repo
        const path = window.location.pathname;

        // 排除用戶首頁、搜索頁面等
        if (path === '/' ||
            path.startsWith('/search') ||
            path.startsWith('/settings') ||
            path.startsWith('/notifications') ||
            path.startsWith('/login') ||
            path.startsWith('/signup')) {
            return true;
        }

        // 確保是Repo （包含 owner/repo 格式）
        return !REPO_PATH_PATTERN.test(path);
    }

    // DOM 變動時以 requestAnimationFrame 節流，同一個畫面更新週期內最多檢查一次。
    // 檢查本身只有兩次 querySelector（容器以 id 開頭，瀏覽器可快速定位），成本極低。
    let checkScheduled = false;
    function scheduleAddDeepWikiButton() {
        if (checkScheduled) return;
        checkScheduled = true;
        requestAnimationFrame(() => {
            checkScheduled = false;
            addDeepWikiButton();
        });
    }

    function init() {
        // 初始添加按鈕
        addDeepWikiButton();

        // 監聽頁面變化（GitHub 使用 Turbo 進行頁面導航）
        // 舊版在初始化與每次 turbo:load 都會呼叫 init()，每次都 new 一個新的 MutationObserver 且從不 disconnect：
        // 每換一頁就多一個觀察器（初始載入的 turbo:load 若在腳本執行後才觸發，一開始就有兩個），
        // 同一筆 DOM 變動會被重複處理 N 次。現在整個頁面生命週期只建立一個觀察器。
        // 觀察 document.documentElement 而不是 document.body：Turbo 若以新的 <body> 取代舊的，
        // 掛在舊 body 上的觀察器就再也收不到通知，觀察根節點則不受影響。
        // 不再只等待 #repository-container-header 被插入：只要有任何 DOM 變動就節流檢查一次，
        // 能涵蓋 GitHub 以 React 局部重繪 pagehead、按鈕被移除後需要補回的情況。
        const observer = new MutationObserver(scheduleAddDeepWikiButton);
        observer.observe(document.documentElement, {
            childList: true,
            subtree: true
        });

        // 監聽 Turbo 導航事件
        // 保留舊版延遲 100ms 的時機，讓 GitHub 有時間把新頁面的 pagehead 繪製完成。
        document.addEventListener('turbo:load', () => {
            setTimeout(addDeepWikiButton, 100);
        });
    }

    // 等待頁面準備完成
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }

    // 添加自定義樣式
    const style = document.createElement('style');
    style.textContent = `
        .deepwiki-button {
            margin-right: 8px;
        }

        .deepwiki-button a {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            text-decoration: none;
            color: var(--color-btn-text);
            background-color: var(--color-btn-bg);
            border: 1px solid var(--color-btn-border);
            border-radius: 6px;
            padding: 5px 12px;
            font-size: 12px;
            font-weight: 500;
            line-height: 20px;
            white-space: nowrap;
            vertical-align: middle;
            cursor: pointer;
            user-select: none;
            appearance: none;
            transition: color 0.15s ease-in-out, background-color 0.15s ease-in-out, border-color 0.15s ease-in-out;
        }

        .deepwiki-button a:hover {
            background-color: var(--color-btn-hover-bg);
            border-color: var(--color-btn-hover-border);
            text-decoration: none;
            color: var(--color-btn-hover-text);
        }

        .deepwiki-button a:focus {
            outline: 2px solid var(--color-accent-fg);
            outline-offset: -2px;
            box-shadow: none;
        }

        .deepwiki-button a:active {
            background-color: var(--color-btn-active-bg);
            border-color: var(--color-btn-active-border);
        }

        .deepwiki-button img {
            opacity: 0.8;
        }

        .deepwiki-button a:hover img {
            opacity: 1;
        }

        [data-color-mode="dark"] .deepwiki-button img {
            filter: invert(1) brightness(1.2);
        }
    `;
    document.head.appendChild(style);
})();
