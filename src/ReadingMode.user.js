// ==UserScript==
// @name         ReadingMode: 讓網頁更容易閱讀與翻譯的工具
// @version      0.2.2
// @description  按下 f 鍵可讓網頁僅顯示 main 元素的內容，再按一次 f 或按下 Esc 恢復原狀
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ReadingMode.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ReadingMode.user.js
// @author       Will Huang
// @match        https://*/*
// @exclude      https://felo.ai/*
// @exclude      https://docs.github.com/*
// @exclude      https://platform.openai.com/*
// @exclude      https://learn.microsoft.com/*
// @exclude      https://facebook.com/*
// @exclude      https://www.facebook.com/*
// @exclude      https://www.youtube.com/*
// @exclude      https://studio.youtube.com/*
// ==/UserScript==

(function () {
    let isReading = false;
    let container = null;

    document.addEventListener('keydown', e => {
        if (isInInputMode(e.target) || e.altKey || e.metaKey || e.ctrlKey || e.shiftKey) return;

        if (e.key === 'f' || e.key === 'F' || (isReading && e.key === 'Escape')) {
            // console.log('isReading: ', isReading)
            if (!isReading) {
                // 第一次按下快速鍵時才建立暫存容器
                if (!container) {
                    container = document.createElement('div');
                    container.style.display = 'none';
                    document.body.parentNode.appendChild(container);
                }
                let main = document.querySelector('main');

                // 如果沒有 main 元素，就找 article 元素 (必須只有一個)
                if (!main && document.querySelectorAll('article').length === 1) {
                    main = document.querySelector('article');
                }

                // 如果沒有 main 或 article 元素，就找第一個 div 元素
                if (!main && location.hostname === 'marketplace.visualstudio.com') {
                    main = document.querySelector('div.main-content');
                }

                // console.log(main)
                if (main) {
                    // 保存所有子元素到暫存容器
                    while (document.body.firstChild) {
                        container.appendChild(document.body.firstChild);
                    }
                    // 只顯示 main 元素
                    const mainClone = main.cloneNode(true);
                    document.body.appendChild(mainClone);

                    isReading = !isReading;
                }
            } else {
                if (container) {
                    // 清空 body
                    document.body.replaceChildren();
                    // 還原所有子元素
                    while (container.firstChild) {
                        document.body.appendChild(container.firstChild);
                    }
                    // 移除暫存容器
                    container.remove();
                    container = null;

                    isReading = !isReading;
                }
            }
        }
    });

    function isInInputMode(element) {
        if (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA') {
            return true;
        }
        if (element.isContentEditable) {
            return true;
        }
        return false;
    }

})();
