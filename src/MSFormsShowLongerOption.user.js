// ==UserScript==
// @name         Microsoft Forms: 調整回應頁面顯示較寬的選項內容
// @version      1.1
// @description  按下 + 號就可以調寬，按下 - 號就可以調窄。
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/MSFormsShowLongerOption.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/MSFormsShowLongerOption.user.js
// @author       Will Huang
// @match        https://forms.microsoft.com/Pages/DesignPage.aspx*
// @match        https://forms.microsoft.com/Pages/DesignPageV2.aspx*
// @match        https://forms.office.com/Pages/DesignPage.aspx*
// @match        https://forms.office.com/Pages/DesignPageV2.aspx*
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    var decodeEntities = (function () {
        // this prevents any overhead from creating the object each time
        var element = document.createElement('div');

        function decodeHTMLEntities(str) {
            if (str && typeof str === 'string') {
                // strip script/html tags
                str = str.replace(/<script[^>]*>([\S\s]*?)<\/script>/gmi, '');
                str = str.replace(/<\/?\w(?:[^"'>]|"[^"]*"|'[^']*')*>/gmi, '');
                element.innerHTML = str;
                str = element.textContent;
                element.textContent = '';
            }

            return str;
        }

        return decodeHTMLEntities;
    })();

    document.addEventListener('keydown', (ev) => {
        let stepSize = 100;
        if (ev.key === '+' && !/^(?:input|select|textarea|button)$/i.test(ev.target.nodeName)) {
            document.querySelectorAll('.chart-control-legend-label').forEach(o => {
                var currentWidth = parseInt(window.getComputedStyle(o).maxWidth);
                o.innerText = decodeEntities(o.innerText)
                o.style.maxWidth = (currentWidth + stepSize) + 'px';
            });
        }
        if (ev.key === '-' && !/^(?:input|select|textarea|button)$/i.test(ev.target.nodeName)) {
            document.querySelectorAll('.chart-control-legend-label').forEach(o => {
                var currentWidth = parseInt(window.getComputedStyle(o).maxWidth);
                o.innerText = decodeEntities(o.innerText)
                o.style.maxWidth = (currentWidth - stepSize) + 'px';
            });
        }
    });

})();
