// ==UserScript==
// @name         ChatGPT: 開啟常用參考連結
// @version      1.0.0
// @description  開啟常用的 ChatGPT 參考連結
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ChatGPTOpenLinks.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ChatGPTOpenLinks.user.js
// @match        *://*/*
// @author       Will Huang
// @grant        GM_openInTab
// @grant        GM.registerMenuCommand
// @icon         https://www.google.com/s2/favicons?sz=64&domain=openai.com
// ==/UserScript==

(function () {
    "use strict";

    GM.registerMenuCommand(
        "ChatGPT 指令大全",
        () => { GM_openInTab('https://www.explainthis.io/zh-hant/chatgpt', false); },
        "c"
    );

    GM.registerMenuCommand(
        "Awesome ChatGPT Prompts",
        () => { GM_openInTab('https://prompts.chat', false); },
        "p"
    );

    GM.registerMenuCommand(
        "The Ultimate Collection of ChatGPT Products and Prompts",
        () => { GM_openInTab('https://chatgpt.getlaunchlist.com', false); },
        "a"
    );

})();
