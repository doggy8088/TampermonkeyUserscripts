// ==UserScript==
// @name         Microsoft Learn: 好用的鍵盤快速鍵集合
// @version      0.2.1
// @description  按下 f 可以顯示全螢幕顯示文章
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/MSLearnHotkeys.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/MSLearnHotkeys.user.js
// @author       Will Huang
// @match        https://learn.microsoft.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=learn.microsoft.com
// @require      https://doggy8088.github.io/playwright-js/src/playwright.js
// @grant        none
// ==/UserScript==

(async function () {
    'use strict';

    function isCtrlOrMetaKeyPressed(event) {
        return event.ctrlKey || event.metaKey;
    }

    document.addEventListener('keydown', async (event) => {

        // 從網址列取得 pathinfo
        const currentPath = window.location.pathname;

        // 按下 f 就隱藏所有不必要的元素
        if (!isInInputMode(event) && !isCtrlOrMetaKeyPressed(event) && !event.altKey && event.key === 'f') {

            document.querySelector('#ms--site-header')?.toggle();
            document.querySelector('#article-header')?.toggle();

            let main = document.querySelector('div#main-column');
            if (main) {
                if (!main.hasOwnProperty('existingStyleWidth')) {
                    main.existingStyleWidth = main.style.width;
                    main.existingStyleFlex = main.style.flex;
                }
                main.style.width = main.style.width === '100%' ? main.existingStyleWidth : '100%';
                main.style.flex = main.style.flex === 'none' ? main.existingStyleFlex : 'none';
            }

            let contributors = document.querySelector('.contributors-holder');
            contributors?.toggle();

            if (Array.from(contributors.parentElement.children).last() == contributors) {
                // 因為 "contributors" 停留在最後一個元素，就會有多餘的 "•" 顯示，所以要移動到「不是最後一個」位置即可
                contributors?.previousElementSibling?.insertAdjacentElement('beforebegin', contributors);
            } else {
                contributors?.nextElementSibling?.insertAdjacentElement('afterend', contributors);
            }

            // 調整 peudo element 的 CSS 只能這樣寫，也可以拿來修改目前網頁上任意 CSS 樣式規則
            // const sheets = document.styleSheets;
            // for (let i = 0; i < sheets.length; i++) {
            //   const rules = sheets[i].cssRules || sheets[i].rules;
            //   for (let j = 0; j < rules.length; j++) {
            //     if (rules[j].selectorText === '.metadata.page-metadata > li:not(:last-of-type):not(:only-of-type)::after') {
            //         // 修改屬性，例如改變 content 屬性
            //         if (rules[j].style.content.length == 0) {
            //             rules[j].style.setProperty('content', '"•"');
            //         } else {
            //             rules[j].style.setProperty('content', '""');
            //         }
            //     }
            //   }
            // }

            document.querySelectorAll('.buttons.buttons-right').forEach(e => e.toggle());

            document.querySelector('[data-show-more]').toggle();
            document.querySelectorAll('.expandable').forEach(e => e.classList.toggle('is-expanded'));

            document.querySelector('#ms--additional-resources')?.toggle();
            document.querySelector('#left-container')?.toggle();
            document.querySelector('#user-feedback')?.toggle();
            document.querySelector('#site-user-feedback-footer')?.toggle();
            document.querySelector('#footer')?.toggle();

            // force repaint
            window.dispatchEvent(new Event('resize'));

            event.preventDefault();
            return;
        }

    });

    /**
     * 檢查給定的元素是否處於輸入模式。
     * 如果元素是輸入欄位、文字區域、可編輯內容的元素，或是屬於 shadow DOM 的一部分，
     * 則認為該元素處於輸入模式。
     *
     * @param {HTMLElement} element - 要檢查的元素。
     * @returns {boolean} - 如果元素處於輸入模式則返回 true，否則返回 false。
     */
    function isInInputMode(element) {
        // 如果元素是輸入欄位或文字區域，則處於輸入模式
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
            return true;
        }
        // 如果元素是可編輯內容，則處於輸入模式
        if (element.isContentEditable) {
            return true;
        }
        // 如果元素屬於 shadow DOM 的一部分，則視為處於輸入模式 (也意味著不打算處理事件)
        if (element.shadowRoot instanceof ShadowRoot || (element.getRootNode && element.getRootNode() instanceof ShadowRoot)) {
            return true;
        }
        return false;
    }

    window.HTMLElement.prototype.toggle = function () {
        // 判斷 this.existingStyleDisplay 屬性是否存在，如果不存在就設定為 this.style.display
        if (!this.hasOwnProperty('existingStyleDisplay')) {
            this.existingStyleDisplay = this.style.display;
        }

        // 判斷 this.existingStyleVisibility 屬性是否存在，如果不存在就設定為 this.style.display
        if (!this.hasOwnProperty('existingStyleVisibility')) {
            this.existingStyleVisibility = this.style.visibility;
        }

        // 設定 this.style.display 要跟 this.existingStyleDisplay 與 none 之間做切換
        this.style.display = this.style.display === 'none' ? this.existingStyleDisplay : 'none';

        // 設定 this.style.visibility 要跟 this.existingStyleVisibility 與 hidden 之間做切換
        this.style.visibility = this.style.visibility === 'hidden' ? this.existingStyleVisibility : 'hidden';
    }

    window.Array.prototype.last = function () {
        return this[this.length - 1];
    }

})();
