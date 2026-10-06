// ==UserScript==
// @name         SinoBank: 永豐銀行 MMA 登入啟用密碼管理器機制
// @version      1.1.1
// @description  讓永豐銀行 MMA 登入時可以讓現有的密碼管理器正常運作，如 LastPass, 1Password, Dashlane, Bitwarden, etc.
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/SinoBankMMASignIn.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/SinoBankMMASignIn.user.js
// @author       Will Huang
// @match        https://mma.sinopac.com/*
// @run-at       document-idle
// @icon         https://www.google.com/s2/favicons?sz=64&domain=sinopac.com
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    function setInputId(displayText, newIdAttributeValue) {
        const thElements = document.querySelectorAll('div.th');
        let thElement;
        for (let i = 0; i < thElements.length; i++) {
            if (thElements[i].textContent.trim() === displayText) {
                thElement = thElements[i];
                break;
            }
        }

        if (thElement) {
            // Select the sibling div.td element and find its input child element
            // 防禦式查詢：版面改版後 div.th 旁邊可能沒有 div.td 或 input，舊版會在這裡丟出 TypeError，
            // 連帶讓後面的欄位與 removeEvent() 全部不會執行
            const inputElement = thElement.nextElementSibling?.querySelector('input');

            // Change the value of the input element's "id" attribute
            inputElement?.setAttribute('id', newIdAttributeValue);
        }
    }


    let sid = document.querySelector('[placeholder="身分證字號(統一編號)"]');
    if (sid) sid.id = 'sid'
    else {
        setInputId('身分證字號(統一編號)', 'sid');
    }

    let userid = document.querySelector('[placeholder="使用者代碼"]');
    if (userid) userid.id = 'userid'
    else {
        setInputId('使用者代碼', 'userid');
    }

    let userpw = document.querySelector('[placeholder="網路密碼"]');
    if (userpw) userpw.id = 'userpw'
    else {
        setInputId('網路密碼', 'userpw');
    }

    function removeEvent(w) {
        var arr = ['contextmenu', 'copy', 'cut', 'paste', 'mousedown', 'mouseup', 'beforeunload', 'beforeprint', 'selectstart', 'dragstart'];
        for (var i = 0, x; x = arr[i]; i++) {
            if (w['on' + x]) w['on' + x] = null;
            w.addEventListener(x, function (e) {
                e.stopPropagation()
            }, true);
        };
        // 遞迴處理子 frame
        // 設計意圖：舊版寫成 arguments.callee(f)，但整支腳本在 'use strict' 之下，
        // 嚴格模式存取 arguments.callee 會直接丟出 TypeError，又被下面的 catch 吞掉，
        // 所以子 frame 其實從來沒有被處理過。改為直接以函式名稱遞迴呼叫，恢復原本的意圖。
        // 跨網域的 frame 存取屬性時仍會丟出 SecurityError，照舊由 catch 略過。
        for (var j = 0, f; f = w.frames[j]; j++) {
            try {
                removeEvent(f);
            } catch (e) { }
        }
    }

    removeEvent(window);

})();
