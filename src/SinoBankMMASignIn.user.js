// ==UserScript==
// @name         SinoBank: 永豐銀行 MMA 登入啟用密碼管理器機制
// @version      1.0.3
// @description  讓永豐銀行 MMA 登入時可以讓現有的密碼管理器正常運作，如 LastPass, 1Password, Dashlane, Bitwarden, etc.
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/SinoBankMMASignIn.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/SinoBankMMASignIn.user.js
// @match        https://mma.sinopac.com/MemberPortal/Member/NextWebLogin.aspx
// @author       Will Huang
// @run-at       document-idle
// @icon         https://www.google.com/s2/favicons?sz=64&domain=sinopac.com
// ==/UserScript==

(function() {
    'use strict';

    let sid = document.querySelector('[placeholder="身分證字號(統一編號)"]');
    if (sid) sid.id = 'sid'

    let userid = document.querySelector('[placeholder="使用者代碼"]');
    if (userid) userid.id = 'userid'

    let userpw = document.querySelector('[placeholder="網路密碼"]');
    if (userpw) userpw.id = 'userpw'

})();
