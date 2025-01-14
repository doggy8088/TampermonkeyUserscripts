// ==UserScript==
// @name         OpenAI Platform: 好用的鍵盤快速鍵集合
// @version      0.1.0
// @description  按下 Ctrl+B 快速切換側邊欄
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/OpenAIHotkeys.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/OpenAIHotkeys.user.js
// @author       Will Huang
// @match        https://platform.openai.com/*
// @run-at       document-end
// @icon         https://www.google.com/s2/favicons?sz=64&domain=platform.openai.com
// @require      https://doggy8088.github.io/playwright-js/src/playwright.js
// ==/UserScript==

(function () {
    'use strict';

    document.addEventListener("keydown", async (event) => {
        // 按下 Ctrl+B 快速切換側邊欄
        if ((event.ctrlKey && !event.altKey && event.key === "b") || (!event.ctrlKey && !event.altKey && event.key === "f")) {
            await toggleSidebarByNavigation();
        }
    });

    async function toggleSidebarByNavigation() {
        var main = document.querySelector('main');
        if (!main) return;

        if (main.attributes['data-sidebar']) {
            main.attributes['data-sidebar'].value = main.attributes['data-sidebar'].value === 'expanded' ? 'collapsed' : 'expanded';
        }

        main.previousElementSibling.style.display = main.previousElementSibling.style.display === 'none' ? '' : 'none';
        main.nextElementSibling.style.display = main.previousElementSibling.style.display === 'none' ? '' : 'none';

        var foo = document.querySelector('div[class="docs-footer"]');
        if (foo) foo.style.display = foo.style.display === 'none' ? '' : 'none';

        var dom = document.querySelector('aside');
        if (dom) dom.style.display = dom.style.display === 'none' ? '' : 'none';

        var nav = document.querySelectorAll('nav');
        for (let i = 0; i < nav.length; i++) {
            nav[i].style.display = nav[i].style.display === 'none' ? '' : 'none';
        }

        var btns = await page.getByRole('button', { name: 'Copy page' }).all();
        for (let i = 0; i < btns.length; i++) {
            btns[i].style.display = btns[i].style.display === 'none' ? '' : 'none';
        }
    }

})();
