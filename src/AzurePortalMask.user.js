// ==UserScript==
// @name         Azure Portal: 將所有敏感資料進行隱碼處理
// @version      0.2.0
// @description  移除在 Azure Portal 之中所有敏感資訊
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/AzurePortalMask.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/AzurePortalMask.user.js
// @author       Will Huang
// @match        *://*.portal.azure.com/*
// @match        *://*.portal.azure.net/*
// @match        *://portal.azure.com/*
// @match        *://functions.azure.com/*
// @match        *://portal.azure.us/*
// @match        *://*.qnamaker.ai/*
// @match        *://adf.azure.com/*
// @match        *://ms-adf.azure.com/*
// @match        *://portal.azure.cn/*
// @run-at       document-idle
// @grant        GM_addStyle
// @icon         https://www.google.com/s2/favicons?sz=64&domain=portal.azure.com
// ==/UserScript==

/*
div#mectrl_currentAccount_primary,
div#mectrl_currentAccount_secondary,
div#mectrl_rememberedAccount_0_secondary,
div#mectrl_rememberedAccount_1_secondary,
div#mectrl_rememberedAccount_2_secondary,
div#mectrl_rememberedAccount_3_secondary,
div#mectrl_rememberedAccount_4_secondary,
div#mectrl_rememberedAccount_5_secondary,
div#mectrl_rememberedAccount_6_secondary,
div#mectrl_rememberedAccount_7_secondary,
div#mectrl_rememberedAccount_8_secondary,
div#mectrl_rememberedAccount_9_secondary,
div.fxs-avatarmenu-username,
div.fxs-avatarmenu-tenant {
  filter: blur(10px);
}
*/
(function () {
    'use strict';
    const isMaskedKeyName = 'isMasked';
    const maskEnabledClassName = 'az-mask-enabled';
    const sensitiveDataRegex = /^([a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12})$/;
    /* ** Original regex prior to 2019-04-18 **
     * const sensitiveDataRegex = /^\s*([a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12})|((([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,})))\s*$/;
     *
     */
    const sensitiveDataClassName = 'azdev-sensitive';
    const blurCss = 'filter: blur(10px); pointer-events: none;';
    const tagNamesToMatch = ['DIV']; // uppercase

    // add CSS style to blur
    GM_addStyle(
            `.${maskEnabledClassName} .${sensitiveDataClassName} { ${blurCss} }\n` +
            `.${maskEnabledClassName} .fxs-avatarmenu-username { display: none }\n` +
            `.${maskEnabledClassName} input.azc-bg-light { ${blurCss} }\n` +
            `.${maskEnabledClassName} a.fxs-topbar-reportbug { display:none; }\n` +
            `.${maskEnabledClassName} div.fxs-topbar-internal { display:none; }\n` +
            `.${maskEnabledClassName} .fxs-mecontrol-flyout { ${blurCss} }\n` +
            `.${maskEnabledClassName} #mectrl_currentAccount_secondary { ${blurCss} }\n` +
            `.${maskEnabledClassName} .fxs-avatarmenu-tenant-container { ${blurCss} }\n` +
            `.${maskEnabledClassName} .fxs-avatarmenu-tenant-image { display:none; }\n` +
            `.${maskEnabledClassName} .fxs-avatarmenu-tenant-image-container::after {
                                          content: "";
                                          display: inline-block;
                                          background: url(https://portal.azure.com/Content/static/MsPortalImpl/AvatarMenu/AvatarMenu_defaultAvatarSmall.png) no-repeat;
                                          width: 28px;
                                          height: 28px;
                                          border-radius: 28px;
                                      }\n` +
            `.${maskEnabledClassName} textarea.bg-white { ${blurCss} }\n` +
            `.${maskEnabledClassName} span.qna-cs-user-id { display: none }\n` +
            `.${maskEnabledClassName} div.directory-list-element-id { ${blurCss} }\n` +
            `.${maskEnabledClassName} .userEmail { display:none; }\n` +
            `.${maskEnabledClassName} .user-email { ${blurCss} }\n`
    );

    document.body.classList.add(maskEnabledClassName);

    // add class to elements already on the screen
    Array.from(document.querySelectorAll(tagNamesToMatch.join()))
        .filter(e => shouldCheckContent(e) && (sensitiveDataRegex.test(e.textContent) || sensitiveDataRegex.test(e.childNodes[0]?.nodeValue)))
        .forEach(e => e.classList.add(sensitiveDataClassName));

    // add class to elements that are added to DOM later
    const observer = new MutationObserver(mutations => {
        mutations
            .filter(m => shouldCheckContent(m.target, m.type))
            .forEach(m => {
                const node = m.type === 'characterData' ? m.target.parentNode : m.target;

                Array.from(node.querySelectorAll(tagNamesToMatch.join()))
                    .filter(n => n.classList && sensitiveDataRegex.test(n.textContent.trim()) || sensitiveDataRegex.test(n.childNodes[0]?.nodeValue))
                    .forEach(e => {
                        // console.log('Sensitive data found:', e);
                        e.classList.add(sensitiveDataClassName);
                    });
            });
    });

    const config = {
        attributes: false,
        characterData: true,
        childList: true,
        subtree: true
    };
    observer.observe(document.body, config);

    function shouldCheckContent(target, mutationType) {
        // console.log('target', target, 'mutationType', mutationType)
        let isDIV = (target && tagNamesToMatch.some(tn => tn === target.tagName))
        let result = (mutationType === 'characterData' || isDIV);
        // console.log('shouldCheckContent', result);
        return result;
    }

})();
