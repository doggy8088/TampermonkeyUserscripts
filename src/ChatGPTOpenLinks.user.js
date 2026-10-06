// ==UserScript==
// @name         ChatGPT: 開啟常用參考連結
// @version      1.0.1
// @description  開啟常用的 ChatGPT 參考連結
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ChatGPTOpenLinks.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ChatGPTOpenLinks.user.js
// @author       Will Huang
// @match        *://*/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=openai.com
// @grant        GM_openInTab
// @grant        GM.registerMenuCommand
// @noframes
// ==/UserScript==

(function () {
    "use strict";

    // 補充：metadata 加上 @noframes，讓腳本只在最上層頁面執行。
    // 這支腳本唯一的工作是註冊 Tampermonkey 選單命令，而選單是以「分頁」為單位顯示的；
    // @match 是 *://*/*，沒有 @noframes 時，頁面中的每個 iframe（廣告、嵌入影片、留言框）都會各自
    // 執行一次並重複註冊同樣的三個命令，選單中可能出現重複項目，也白白在每個 iframe 載入一次腳本。

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
