// ==UserScript==
// @name         NYTimes: 移除 New York Times 閱讀新聞時的付款提示畫面
// @version      1.0
// @description  移除看 New York Times 新聞時的付款提示畫面
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/BypassNewYorkTimesPaywall.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/BypassNewYorkTimesPaywall.user.js
// @author       Will Huang
// @match        https://www.nytimes.com/*
// @run-at       document-body
// ==/UserScript==

(function() {

    var style = document.createElement("style");

    style.innerHTML = `
#bottom-wrapper, #gateway-content, #top-wrapper, .ad, #dfp-ad-top {
    display: none !important;
}
`;
    document.head.appendChild(style);

})();
