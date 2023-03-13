// ==UserScript==
// @name         SinoBank: 永豐銀行 MMA 登入啟用密碼管理器機制
// @version      1.0.0
// @description  永豐銀行 MMA 登入啟用密碼管理器機制
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/SinoBankMMASignIn.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/SinoBankMMASignIn.user.js
// @match        https://mma.sinopac.com/*
// @author       Will Huang
// @run-at       document-idle
// @icon         https://www.google.com/s2/favicons?sz=64&domain=sinopac.com
// ==/UserScript==
(function() {
    'use strict';

    document.querySelector('[placeholder="身分證字號(統一編號)"]').id = 'sid'
    document.querySelector('[placeholder="使用者代碼"]').id = 'userid'
    document.querySelector('[placeholder="網路密碼"]').id = 'userpw'

})();
