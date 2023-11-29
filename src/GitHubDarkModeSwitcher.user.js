// ==UserScript==
// @name         GitHub: 佈景主題切換器
// @version      0.2.1
// @description  按下 alt+s 快速鍵就會自動切換目前網頁的 Dark/Light 模式，網頁右上角 Actions 按鈕列也會多一顆切換按鈕
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/GitHubDarkModeSwitcher.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/GitHubDarkModeSwitcher.user.js
// @author       Will Huang
// @match        https://github.com/*
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';
    document.addEventListener('keydown', async (ev) => {
        if (ev.altKey && ev.key === 'S' && !/^(?:input|select|textarea|button)$/i.test(ev.target.nodeName)) {
            alert('你是不是不小心按到了 CAPSLOCK 鍵？');
            return;
        }
        if (ev.altKey && ev.key === 's' && !/^(?:input|select|textarea|button)$/i.test(ev.target.nodeName)) {
            await run();
        }
    });

    createIcon();

    function createGuid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    function createIcon() {
        const guid = createGuid();

        const a = document.createElement('a');
        a.href = '/settings/appearance';
        a.id = `icon-button-${guid}`;
        a.setAttribute('aria-labelledby', `tooltip-${guid}`);
        a.dataset.viewComponent = 'true';
        a.className = 'Button Button--iconOnly Button--secondary Button--medium AppHeader-button color-fg-muted';
        a.addEventListener('click', async (ev) => {
            ev.preventDefault();
            await run();
        });

        // 建立 SVG 元素
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('height', '16');
        svg.setAttribute('viewBox', '0 -960 960 960');
        svg.setAttribute('width', '24');

        // 建立 path 元素
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('d', 'M480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm40-83q119-15 199.5-104.5T800-480q0-123-80.5-212.5T520-797v634Z');

        // 組合元素
        svg.appendChild(path);
        a.appendChild(svg);

        // 將 a 元素加入到 DOM 中
        document.querySelector('.AppHeader-actions')?.appendChild(a);

        // 建立 tool-tip 元素
        let toolTip = document.createElement('tool-tip');

        // 設定屬性
        toolTip.setAttribute('id', `tooltip-${guid}`);
        toolTip.setAttribute('for', `icon-button-${guid}`);
        toolTip.setAttribute('popover', 'manual');
        toolTip.setAttribute('data-direction', 's');
        toolTip.setAttribute('data-type', 'label');
        toolTip.setAttribute('data-view-component', 'true');
        toolTip.classList.add('position-absolute', 'sr-only');
        toolTip.setAttribute('aria-hidden', 'true');
        toolTip.setAttribute('role', 'tooltip');
        // toolTip.setAttribute('style', '--tool-tip-position-top: 58px; --tool-tip-position-left: 1496.9427871704102px;');

        // 設定內容
        toolTip.textContent = 'Toggle Dark/Light Mode';

        // 將 tool-tip 元素加入到 DOM 中
        document.querySelector('.AppHeader-actions')?.appendChild(toolTip);
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
