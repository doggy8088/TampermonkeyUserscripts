// ==UserScript==
// @name         GitHub: 佈景主題切換器
// @version      0.1.0
// @description  按下 alt+s 快速鍵就會自動切換目前網頁的 Dark/Light 模式
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/GitHubDarkModeSwitcher.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/GitHubDarkModeSwitcher.user.js
// @author       Will Huang
// @match        https://github.com/*
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
                } else {
                    console.error('Failed to change color mode');
                }
            })
            .catch(error => {
                console.error('An error occurred:', error);
            });
    }

})();
