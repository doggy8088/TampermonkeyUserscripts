// ==UserScript==
// @name         Azure Portal: 移除所有會出現 ... 的樣式
// @version      1.1
// @description  移除在 Azure Portal 之中所有會出現 ... 的樣式，尤其是看帳單的時候不要顯示有 ... 的數字
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/AzurePortalRemoveEllipsis.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/AzurePortalRemoveEllipsis.user.js
// @author       Will Huang
// @match        *://portal.azure.com/*
// @match        *://*.azure.net/*
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';
    var debug = false;
    setInterval(() => {
        var dom1 = document.querySelectorAll('.ellipsis');
        var dom2 = document.querySelectorAll('.msportalfx-text-ellipsis');
        var all = [...dom1, ...dom2];
        if (all.length > 0) {
            debug && console.log(`Found ${all.length} items. Remove all of the .ellipsis className`);
            all.forEach(elm => {
                debug && console.log(`  Removing `, elm);
                elm.classList.remove('ellipsis');
                elm.classList.remove('msportalfx-text-ellipsis');
            });
        }
    }, 1000);
})();
