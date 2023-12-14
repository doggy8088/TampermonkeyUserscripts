// ==UserScript==
// @name         Google AI Studio Light Theme
// @version      1.0
// @description  強迫讓 Google AI Studio 使用淺色主題，方便簡報時使用
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/GoogleAiStudioLightTheme.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/GoogleAiStudioLightTheme.user.js
// @author       Will Huang
// @match        https://makersuite.google.com/*
// @run-at       document-idle
// @icon         https://www.google.com/s2/favicons?sz=64&domain=makersuite.google.com
// ==/UserScript==

(function () {
    'use strict';

    // Get the element with the .layout-navbar class
    const navbar = document.querySelectorAll('.layout-navbar');

    // Remove the backgroundColor style from each navbar element
    navbar.forEach(element => {
        element.style.backgroundColor = '#fff';
    });

    // Get the body element
    const body = document.querySelector('body');

    // Replace all occurrences of .dark-theme with .light-theme
    body.classList.replace('dark-theme', 'light-theme');

})();
