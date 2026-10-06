// ==UserScript==
// @name         Microsoft Learn: 好用的鍵盤快速鍵集合
// @version      0.3.1
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
        // event.isComposing：輸入法（注音、倉頡等）組字中的按鍵屬於輸入行為，不當成快速鍵。
        if (!event.isComposing && !isInInputMode(event.target) && !isCtrlOrMetaKeyPressed(event) && !event.altKey && event.key === 'f') {

            toggleElement(document.querySelector('#ms--site-header'));
            toggleElement(document.querySelector('#article-header'));

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
            if (!!contributors) {
                toggleElement(contributors);
                if (contributors.parentElement?.lastElementChild == contributors) {
                    // 因為 "contributors" 停留在最後一個元素，就會有多餘的 "•" 顯示，所以要移動到「不是最後一個」位置即可
                    contributors?.previousElementSibling?.insertAdjacentElement('beforebegin', contributors);
                } else {
                    contributors?.nextElementSibling?.insertAdjacentElement('afterend', contributors);
                }
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

            document.querySelectorAll('.buttons.buttons-right').forEach(e => toggleElement(e));

            // 原本這行沒有使用 ?.，在沒有「顯示更多」按鈕的頁面（例如部分非文章頁、改版後的頁面）會丟出
            // TypeError，導致後面的展開區塊、左側目錄、頁尾等都沒有切換，也沒有呼叫 preventDefault()，
            // 畫面只切換了一半。toggleElement() 會自動略過不存在的元素。
            toggleElement(document.querySelector('[data-show-more]'));
            document.querySelectorAll('.expandable').forEach(e => e.classList.toggle('is-expanded'));

            toggleElement(document.querySelector('#ms--additional-resources'));
            toggleElement(document.querySelector('#left-container'));
            toggleElement(document.querySelector('#user-feedback'));
            toggleElement(document.querySelector('#site-user-feedback-footer'));
            toggleElement(document.querySelector('#footer'));
            toggleElement(document.querySelector('section[data-open-source-feedback-section]'));

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
        // 如果元素是輸入欄位、文字區域或下拉選單，則處於輸入模式
        // （在聚焦的 select 上按字母鍵是瀏覽器內建的「跳到該字母開頭的選項」，不應被攔截）
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA' || element.tagName === 'SELECT') {
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

    /**
     * 切換元素的顯示狀態（第一次切換時記住原本的 inline display/visibility，之後在原值與隱藏之間切換）。
     *
     * 原本以 HTMLElement.prototype.toggle 與 Array.prototype.last 擴充內建原型。因為 @grant none
     * 會讓腳本在網頁本身的環境執行，直接指派的原型方法是可列舉的：網頁或第三方程式只要用
     * for...in 走訪陣列，就會多出一個 last 項目；未來標準若新增同名方法，也會被這裡蓋掉。
     * 改為腳本內部的函式，不再修改內建原型；傳入 null 時直接略過，取代原本各處的 ?. 判斷。
     */
    function toggleElement(element) {
        if (!element) return;

        // 判斷 element.existingStyleDisplay 屬性是否存在，如果不存在就設定為 element.style.display
        if (!element.hasOwnProperty('existingStyleDisplay')) {
            element.existingStyleDisplay = element.style.display;
        }

        // 判斷 element.existingStyleVisibility 屬性是否存在，如果不存在就設定為 element.style.visibility
        if (!element.hasOwnProperty('existingStyleVisibility')) {
            element.existingStyleVisibility = element.style.visibility;
        }

        // 設定 element.style.display 要跟 element.existingStyleDisplay 與 none 之間做切換
        element.style.display = element.style.display === 'none' ? element.existingStyleDisplay : 'none';

        // 設定 element.style.visibility 要跟 element.existingStyleVisibility 與 hidden 之間做切換
        element.style.visibility = element.style.visibility === 'hidden' ? element.existingStyleVisibility : 'hidden';
    }

})();
