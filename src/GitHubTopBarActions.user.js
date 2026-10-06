// ==UserScript==
// @name         GitHub: Top Bar Actions（Alt+T / Alt+P）
// @version      0.1.2
// @description  在 GitHub 頂部工具列加入主題切換、PRU 用量查看與 PAT 快速建立按鈕，並支援 Alt+T、Alt+P 快捷鍵
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/GitHubTopBarActions.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/GitHubTopBarActions.user.js
// @author       Will Huang
// @match        https://github.com/*
// @run-at       document-idle
// @icon         https://www.google.com/s2/favicons?sz=64&domain=github.com
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    const HEADER_ACTIONS_SELECTOR = '[data-testid="top-bar-actions"], .AppHeader-actions';
    const BUTTON_SELECTOR_PREFIX = 'data-tm-script';
    const THEME_SETTINGS_URL = 'https://github.com/settings/appearance';
    const COLOR_MODE_SUBMIT_URL = 'https://github.com/settings/appearance/color_mode';
    const PRU_USAGE_URL = 'https://github.com/settings/billing/premium_requests_usage';
    const PAT_URL = 'https://github.com/settings/personal-access-tokens';

    // 統一所有 Top Bar 動作設定，
    // 讓快捷鍵、按鈕屬性、點擊行為都在同一處定義，
    // 以降低未來新增動作時的維護成本。
    const ACTIONS = [
        {
            id: 'github-dark-mode-switcher',
            label: 'Toggle Dark/Light Mode',
            href: '/settings/appearance',
            hotkey: 't',
            onClick: toggleColorMode,
            createIconPath: createThemeIconPath,
            viewBox: '0 -960 960 960'
        },
        {
            id: 'github-pru-usage',
            label: '查看當月 PRU 用量',
            href: PRU_USAGE_URL,
            // 設計意圖：此按鈕是快速導頁用途，
            // 目前先不綁定快捷鍵，避免與其他腳本熱鍵衝突。
            onClick: openPRUUsagePage,
            createIconPath: createPRUUsageIconPath,
            viewBox: '0 0 24 24'
        },
        {
            id: 'github-pat-quick-create',
            label: '建立 Fine-grained Personal Access Token',
            href: PAT_URL,
            hotkey: 'p',
            onClick: openPATPage,
            createIconPath: createPATIconPath,
            viewBox: '0 0 24 24'
        }
    ];

    // 避免連續點擊按鈕或同時按下快速鍵時重複送出切換請求；
    // 每次請求都是以「當下的」data-color-mode 計算目標主題，重複送出只會多一次網路往返與重新整理。
    // 宣告在 initialize() 之前，確保任何事件處理器執行時都不會碰到 let 的暫時性死區（TDZ）。
    let isTogglingColorMode = false;

    initialize();

    function initialize() {
        registerHotkeys(ACTIONS);
        startTopBarButtonSync(ACTIONS);
    }

    function registerHotkeys(actions) {
        document.addEventListener('keydown', async (ev) => {
            if (!ev.altKey || shouldIgnoreEventTarget(ev.target)) return;

            // 輸入法組字期間的按鍵屬於輸入法，不當成快速鍵；
            // Chrome 自動填入表單時也會派送沒有 key 的 keydown，直接呼叫 toLowerCase() 會丟出 TypeError。
            if (ev.isComposing || typeof ev.key !== 'string') return;

            const matchedAction = actions.find(action => ev.key.toLowerCase() === action.hotkey);
            if (!matchedAction) return;

            if (ev.key === matchedAction.hotkey.toUpperCase()) {
                alert('你是不是不小心按到了 CAPSLOCK 鍵？');
                return;
            }

            // 確定要接手這個快速鍵後才 preventDefault()，避免 Windows 版 Firefox 等瀏覽器
            // 把 Alt+T / Alt+P 當成開啟功能表列的按鍵。必須在 await 之前呼叫，否則事件早已派送完畢。
            ev.preventDefault();

            // 長按 Alt+T / Alt+P 會產生大量重複的 keydown：Alt+P 會一口氣開出好幾個分頁，
            // Alt+T 則會連續送出多次切換主題的 POST 請求，因此只處理第一次按下。
            if (ev.repeat) return;

            await matchedAction.onClick();
        });
    }

    function shouldIgnoreEventTarget(target) {
        if (/^(?:input|select|textarea|button)$/i.test(target?.nodeName || '')) return true;

        // GitHub 線上編輯檔案（CodeMirror）、部分留言與 Copilot 輸入框是 contenteditable 元素。
        // 舊版沒有排除它們，在編輯器內按 Alt+T 會切換主題並重新整理頁面，尚未儲存的內容可能因此遺失。
        return Boolean(target?.isContentEditable);
    }

    function startTopBarButtonSync(actions) {
        // 設計意圖：GitHub 的 header 會被 React 重繪，
        // 若只插入一次，自訂按鈕會被覆蓋；
        // 因此使用單一 observer + requestAnimationFrame 節流，持續確保所有按鈕存在。
        let ensureScheduled = false;
        const scheduleEnsureButtons = () => {
            if (ensureScheduled) return;
            ensureScheduled = true;

            requestAnimationFrame(() => {
                ensureScheduled = false;
                const container = getHeaderActionsContainer();
                if (!container) return;

                actions.forEach((action) => {
                    ensureActionButton(container, action);
                });
            });
        };

        scheduleEnsureButtons();

        const observer = new MutationObserver(() => {
            scheduleEnsureButtons();
        });

        // 觀察 document.documentElement 而不是 document.body：GitHub 的 Turbo 換頁若以新的 <body>
        // 取代舊的，掛在舊 body 上的觀察器就收不到任何通知，按鈕被覆蓋後便不會再補回來。
        observer.observe(document.documentElement, { childList: true, subtree: true });
    }

    function getHeaderActionsContainer() {
        return document.querySelector(HEADER_ACTIONS_SELECTOR);
    }

    function ensureActionButton(container, action) {
        const selector = `[${BUTTON_SELECTOR_PREFIX}="${action.id}"]`;
        if (container.querySelector(selector)) return;

        const button = createTopBarButton(container, action);
        container.appendChild(button);
    }

    function createTopBarButton(container, action) {
        const templateButton = container.querySelector('a[data-component="IconButton"], a.AppHeader-button');
        const button = templateButton ? templateButton.cloneNode(false) : document.createElement('a');

        button.href = action.href;
        button.id = `top-bar-action-${action.id}-${createGuid()}`;
        button.dataset.tmScript = action.id;
        button.setAttribute('aria-label', action.label);
        button.setAttribute('title', action.label);
        button.removeAttribute('aria-labelledby');
        button.removeAttribute('data-hotkey');
        button.addEventListener('click', async (ev) => {
            ev.preventDefault();
            await action.onClick();
        });

        // 這裡用程式化方式建立 icon，
        // 避免複製大量 SVG 字串造成閱讀困難，
        // 同時保留各動作獨立 icon 的可擴充性。
        button.textContent = '';
        button.appendChild(createIconElement(action));

        return button;
    }

    function createIconElement(action) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('height', '16');
        svg.setAttribute('width', '16');
        svg.setAttribute('viewBox', action.viewBox);
        svg.setAttribute('aria-hidden', 'true');

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('fill', 'currentColor');
        action.createIconPath(path);

        svg.appendChild(path);
        return svg;
    }

    function createThemeIconPath(path) {
        path.setAttribute('d', 'M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm40-83q119-15 199.5-104.5T800-480q0-123-80.5-212.5T520-797v634Z');
    }

    function createPATIconPath(path) {
        path.setAttribute('fill-rule', 'evenodd');
        path.setAttribute('clip-rule', 'evenodd');
        path.setAttribute('d', 'M7 7a5 5 0 1 0 0 10a5 5 0 0 0 0-10zM7 10a2 2 0 1 1 0 4a2 2 0 0 1 0-4zM12 11H22V13H20V15H18V17H16V15H12Z');
    }

    function createPRUUsageIconPath(path) {
        path.setAttribute('fill-rule', 'evenodd');
        path.setAttribute('clip-rule', 'evenodd');
        path.setAttribute('d', 'M3 4a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V4zm3 12h2V9H6v7zm5 0h2V6h-2v10zm5 0h2v-4h-2v4z');
    }

    function createGuid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var random = Math.random() * 16 | 0;
            var value = c === 'x' ? random : (random & 0x3 | 0x8);
            return value.toString(16);
        });
    }

    async function openPATPage() {
        window.open(PAT_URL, '_blank');
    }

    async function openPRUUsagePage() {
        window.open(PRU_USAGE_URL, '_blank');
    }

    async function toggleColorMode() {
        if (isTogglingColorMode) return;
        isTogglingColorMode = true;

        try {
            var htmlNode = document.querySelector('html');
            var currentMode = htmlNode.getAttribute('data-color-mode');
            var newMode = currentMode === 'dark' ? 'light' : 'dark';

            var settingsResponse = await fetch(THEME_SETTINGS_URL);
            if (!settingsResponse.ok) {
                console.error(`Failed to load appearance settings: HTTP ${settingsResponse.status}`);
                return;
            }
            var html = await settingsResponse.text();

            // 先取得變更顏色的那個表單 HTML
            const regexForm = /<form aria-labelledby="color-mode-heading"[\s\S]*?<\/form>/;
            const matchForm = html.match(regexForm);
            const formHTML = matchForm ? matchForm[0] : null;

            // 再取得該表單專用的 authenticity_token
            const regex = /<input type="hidden" name="authenticity_token" value="([^"]+)"/;
            const match = formHTML ? formHTML.match(regex) : null;
            const authenticityToken = match ? match[1] : null;

            // 找不到 token（例如未登入、或 GitHub 改版了設定頁的表單結構）時，
            // 舊版仍會把字串 "null" 當成 authenticity_token 送出，必定被 GitHub 以 422 拒絕；
            // 這裡直接停止並說明原因，比較容易判斷是哪一步失效。
            if (!authenticityToken) {
                console.error('Failed to change color mode: authenticity_token not found in appearance settings page');
                return;
            }

            // 使用 multipart/form-data 的方式送出表單
            var formData = new FormData();
            formData.append('_method', 'put');
            formData.append('authenticity_token', authenticityToken);
            formData.append('user_theme', newMode);

            var response = await fetch(COLOR_MODE_SUBMIT_URL, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                htmlNode.setAttribute('data-color-mode', newMode);
                location.reload();
            } else {
                console.error('Failed to change color mode');
            }
        } catch (error) {
            // 舊版只有第二個 fetch 有 catch；讀取設定頁失敗時會變成 Unhandled Promise Rejection。
            // 現在整個流程的網路錯誤都在這裡統一記錄。
            console.error('An error occurred:', error);
        } finally {
            isTogglingColorMode = false;
        }
    }

})();
