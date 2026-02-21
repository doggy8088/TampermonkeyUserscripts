// ==UserScript==
// @name         GitHub: 佈景主題切換器
// @version      0.2.5
// @description  按下 alt+t 快速鍵就會自動切換目前網頁的 Dark/Light 主題，網頁右上角 Actions 按鈕列也會多一顆切換按鈕
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/GitHubDarkModeSwitcher.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/GitHubDarkModeSwitcher.user.js
// @author       Will Huang
// @match        https://github.com/*
// @run-at       document-idle
// @icon         https://www.google.com/s2/favicons?sz=64&domain=github.com
// ==/UserScript==

(function () {
    'use strict';

    const BUTTON_SELECTOR = '[data-tm-script="github-dark-mode-switcher"]';
    const HEADER_ACTIONS_SELECTOR = '[data-testid="top-bar-actions"], .AppHeader-actions';

    // 按下 alt+t 快速鍵就會自動切換目前網頁的 Dark/Light 主題
    document.addEventListener('keydown', async (ev) => {
        if (ev.altKey && ev.key === 'T' && !/^(?:input|select|textarea|button)$/i.test(ev.target.nodeName)) {
            alert('你是不是不小心按到了 CAPSLOCK 鍵？');
            return;
        }
        if (ev.altKey && ev.key === 't' && !/^(?:input|select|textarea|button)$/i.test(ev.target.nodeName)) {
            await run();
        }
    });

    // 網頁右上角 Actions 按鈕列會多一顆切換按鈕
    createIcon();

    function createGuid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    function createIcon() {
        // 設計意圖：GitHub Header 的 class 與結構近年變更頻繁，
        // 因此優先找新版的 data-testid，再回退舊版 .AppHeader-actions，
        // 並持續監看 DOM 變動，在 GitHub React 重繪把按鈕清掉時自動補回。
        // 這個行為是為了根治「按鈕出現一秒後又消失」的問題。
        let ensureScheduled = false;
        const scheduleEnsureButton = () => {
            if (ensureScheduled) return;
            ensureScheduled = true;
            requestAnimationFrame(() => {
                ensureScheduled = false;
                const container = getHeaderActionsContainer();
                if (!container) return;
                insertButton(container);
            });
        };

        // 先立即嘗試插入一次，讓首次載入可以直接看到按鈕。
        scheduleEnsureButton();

        const observer = new MutationObserver(() => {
            scheduleEnsureButton();
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    function getHeaderActionsContainer() {
        return document.querySelector(HEADER_ACTIONS_SELECTOR);
    }

    function insertButton(container) {
        if (container.querySelector(BUTTON_SELECTOR)) return;

        const guid = createGuid();
        const templateButton = container.querySelector('a[data-component="IconButton"], a.AppHeader-button');
        const a = templateButton ? templateButton.cloneNode(false) : document.createElement('a');

        a.href = '/settings/appearance';
        a.id = `icon-button-${guid}`;
        a.dataset.tmScript = 'github-dark-mode-switcher';
        a.setAttribute('aria-label', 'Toggle Dark/Light Mode');
        a.setAttribute('title', 'Toggle Dark/Light Mode');
        a.removeAttribute('aria-labelledby');
        a.removeAttribute('data-hotkey');
        a.addEventListener('click', async (ev) => {
            ev.preventDefault();
            await run();
        });

        // 建立 SVG 元素
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('height', '16');
        svg.setAttribute('viewBox', '0 -960 960 960');
        svg.setAttribute('width', '16');
        svg.setAttribute('aria-hidden', 'true');

        // 建立 path 元素
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('fill', 'currentColor');
        path.setAttribute('d', 'M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm40-83q119-15 199.5-104.5T800-480q0-123-80.5-212.5T520-797v634Z');

        // 清空既有子節點後放入新圖示，
        // 這樣即使 clone 到帶有多層 span 的按鈕，也能確保顯示一致且不殘留原圖示。
        a.textContent = '';
        svg.appendChild(path);
        a.appendChild(svg);

        container.appendChild(a);
    }

    async function run() {
        var htmlNode = document.querySelector('html');
        var currentMode = htmlNode.getAttribute('data-color-mode');
        var newMode = currentMode === 'dark' ? 'light' : 'dark';

        var html = await fetch('https://github.com/settings/appearance').then(response => response.text());

        // console.log(html);

        // 先取得變更顏色的那個表單 HTML
        const regexForm = /<form aria-labelledby="color-mode-heading"[\s\S]*?<\/form>/;
        const matchForm = html.match(regexForm);
        const formHTML = matchForm ? matchForm[0] : null;
        // console.log(formHTML);

        // 再取得該表單專用的 authenticity_token
        const regex = /<input type="hidden" name="authenticity_token" value="([^"]+)"/;
        const match = formHTML.match(regex);
        const authenticityToken = match ? match[1] : null;
        // console.log('authenticityToken', authenticityToken);

        // 使用 multipart/form-data 的方式送出表單
        var formData = new FormData();
        formData.append('_method', 'put');
        formData.append('authenticity_token', authenticityToken);
        formData.append('user_theme', newMode);

        return fetch('https://github.com/settings/appearance/color_mode', {
            method: 'POST',
            body: formData
        })
            .then(response => {
                if (response.ok) {
                    console.log('Color mode changed successfully');
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
