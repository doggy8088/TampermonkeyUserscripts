// ==UserScript==
// @name         GitHub: Top Bar Actions（Alt+T / Alt+P）
// @version      0.1.0
// @description  在 GitHub 頂部工具列加入主題切換與 PAT 快速建立按鈕，並支援 Alt+T、Alt+P 快捷鍵
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
            id: 'github-pat-quick-create',
            label: '建立 Fine-grained Personal Access Token',
            href: PAT_URL,
            hotkey: 'p',
            onClick: openPATPage,
            createIconPath: createPATIconPath,
            viewBox: '0 0 24 24'
        }
    ];

    initialize();

    function initialize() {
        registerHotkeys(ACTIONS);
        startTopBarButtonSync(ACTIONS);
    }

    function registerHotkeys(actions) {
        document.addEventListener('keydown', async (ev) => {
            if (!ev.altKey || shouldIgnoreEventTarget(ev.target)) return;

            const matchedAction = actions.find(action => ev.key.toLowerCase() === action.hotkey);
            if (!matchedAction) return;

            if (ev.key === matchedAction.hotkey.toUpperCase()) {
                alert('你是不是不小心按到了 CAPSLOCK 鍵？');
                return;
            }

            await matchedAction.onClick();
        });
    }

    function shouldIgnoreEventTarget(target) {
        return /^(?:input|select|textarea|button)$/i.test(target?.nodeName || '');
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

        observer.observe(document.body, { childList: true, subtree: true });
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

    async function toggleColorMode() {
        var htmlNode = document.querySelector('html');
        var currentMode = htmlNode.getAttribute('data-color-mode');
        var newMode = currentMode === 'dark' ? 'light' : 'dark';

        var html = await fetch(THEME_SETTINGS_URL).then(response => response.text());

        // 先取得變更顏色的那個表單 HTML
        const regexForm = /<form aria-labelledby="color-mode-heading"[\s\S]*?<\/form>/;
        const matchForm = html.match(regexForm);
        const formHTML = matchForm ? matchForm[0] : null;

        // 再取得該表單專用的 authenticity_token
        const regex = /<input type="hidden" name="authenticity_token" value="([^"]+)"/;
        const match = formHTML ? formHTML.match(regex) : null;
        const authenticityToken = match ? match[1] : null;

        // 使用 multipart/form-data 的方式送出表單
        var formData = new FormData();
        formData.append('_method', 'put');
        formData.append('authenticity_token', authenticityToken);
        formData.append('user_theme', newMode);

        return fetch(COLOR_MODE_SUBMIT_URL, {
            method: 'POST',
            body: formData
        })
            .then(response => {
                if (response.ok) {
                    htmlNode.setAttribute('data-color-mode', newMode);
                    location.reload();
                } else {
                    console.error('Failed to change color mode');
                }
            })
            .catch(error => {
                console.error('An error occurred:', error);
            });
    }

})();
