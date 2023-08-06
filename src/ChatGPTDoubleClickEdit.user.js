// ==UserScript==
// @name         ChatGPT: 滑鼠雙擊編輯提示文字
// @version      1.0.0
// @description  滑鼠雙擊先前已經輸入的提示就可直接編輯
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ChatGPTDoubleClickEdit.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ChatGPTDoubleClickEdit.user.js
// @match        *://chat.openai.com/*
// @author       Will Huang
// @run-at       document-idle
// @icon         https://www.google.com/s2/favicons?sz=64&domain=openai.com
// ==/UserScript==


(async function () {
    'use strict';

    let checkForMainElement = setInterval(() => {
        if (document.getElementsByTagName('main').length > 0) {
            document.getElementsByTagName('main')[0].addEventListener('dblclick', (event) => {
                if (event.target.className == 'empty:hidden') {
                    // 由於 ChatGPT 網站上的 DOM 都沒有定位點，所以只能靠 SVG 的線條來決定是哪一個按鈕
                    // 底下這個線條是編輯按鈕的「鉛筆」圖示
                    document.querySelector('path[d*=\'M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z\']').parentElement.parentElement.click()
                }
            });
            console.log('ChatGPT: 滑鼠雙擊編輯提示文字 Initialized');
            clearInterval(checkForMainElement);
        }
    }, 500);

})();
