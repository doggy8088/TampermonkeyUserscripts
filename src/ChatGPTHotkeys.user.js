// ==UserScript==
// @name         ChatGPT: 好用的鍵盤快速鍵集合
// @version      0.12.0
// @description  按下 Ctrl+Delete 快速刪除當下聊天記錄、按下 Ctrl+B 快速切換側邊欄
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ChatGPTHotkeys.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ChatGPTHotkeys.user.js
// @author       Will Huang
// @match        https://chatgpt.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=openai.com
// @require      https://cdn.jsdelivr.net/npm/d3@7
// @require      https://cdn.jsdelivr.net/npm/markmap-lib@0.18.11/dist/browser/index.iife.js
// @require      https://cdn.jsdelivr.net/npm/markmap-view@0.18.10/dist/browser/index.js
// ==/UserScript==

(function () {
    'use strict';

    function matchHotkey({ ctrl = false, alt = false }, keyCheck) {
        return e => (
            (ctrl ? (e.ctrlKey || e.metaKey) : (!e.ctrlKey && !e.metaKey)) &&
            e.altKey === alt &&
            (typeof keyCheck === 'string' ? e.key === keyCheck : keyCheck(e))
        );
    }

    const hotkeyHandlers = [
        { test: matchHotkey({ ctrl: true, alt: false }, 'Delete'), handler: handleCtrlDelete },
        { test: matchHotkey({ ctrl: true, alt: false }, 'b'), handler: handleCtrlToggleSidebar },
        { test: matchHotkey({ ctrl: false, alt: true }, 's'), handler: handleAltS },
        { test: matchHotkey({ ctrl: false, alt: true }, e => +e.key > 0), handler: handleAltNumber },
        // { test: matchHotkey({ ctrl: false, alt: true }, 'v'), handler: handleAltV },
    ];

    // 這個功能是用來在 ChatGPT 中顯示心智圖
    // 此功能已經合併至 ChatGPT 萬能工具箱！
    async function handleAltV(event) {
        console.debug('handleAltV triggered', event);

        const mdLabel = [...document.querySelectorAll('div')]
            .find(el => el.textContent.trim().toLowerCase() === 'markdown');
        console.debug('Markdown label found:', mdLabel);

        if (!mdLabel) return;

        const codeBlock = mdLabel.nextElementSibling?.nextElementSibling;
        console.debug('Code block found:', codeBlock);

        const codeEl = codeBlock?.querySelector('code');
        console.debug('Code element found:', codeEl);

        if (!codeEl) return;

        const btn = mdLabel.nextElementSibling?.querySelector('button');
        console.debug('Button found:', btn);

        const containerDiv = btn?.parentElement?.parentElement;
        console.debug('Container div found:', containerDiv);

        if (!containerDiv) return;

        console.debug('Wrapper div found:', containerDiv);

        const spanHtml = `<span class="" data-state="closed"><button class="flex gap-1 items-center select-none px-4 py-1" aria-label="Mindmap"><svg version="1.1" id="Layer_1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" x="0px" y="0px" width="12" viewBox="0 0 128 128" enable-background="new 0 0 128 128" xml:space="preserve"><path fill="none" stroke="#010100" stroke-width="2" opacity="1.000000" d="M76.688866,109.921104 C88.050018,115.331482 100.131790,117.192719 112.584740,117.125877 C117.595360,117.098984 120.788620,114.305405 121.104477,109.904366 C121.439659,105.234016 118.474678,101.801880 113.419678,101.228683 C111.275566,100.985550 109.030663,101.381645 106.940926,100.953491 C99.494377,99.427811 91.778465,98.498268 84.753601,95.805984 C74.877594,92.020988 69.684692,83.908684 68.234291,73.078300 C70.384644,73.078300 72.207634,73.078644 74.030617,73.078247 C86.858322,73.075493 99.686478,73.133377 112.513527,73.040070 C117.709305,73.002274 120.970772,69.862900 121.039032,65.258537 C121.107437,60.644268 117.884323,57.419498 112.785179,57.093300 C111.125771,56.987152 109.454391,57.064369 107.788483,57.064228 C94.648399,57.063137 81.508308,57.063622 68.322067,57.063622 C69.945129,45.040371 75.792297,36.744892 87.154800,33.278618 C95.306870,30.791729 104.059700,30.155739 112.593239,29.080770 C117.983620,28.401745 121.287643,25.539717 121.122673,20.684353 C120.966324,16.082565 117.653831,12.969757 112.453003,13.059167 C107.634552,13.142003 102.803261,13.490462 98.013023,14.033926 C71.598251,17.030745 56.428867,30.937811 51.926388,56.118473 C51.879574,56.380272 51.563141,56.593864 51.183678,57.063988 C40.724709,57.063988 30.076698,57.042259 19.428833,57.072033 C12.907690,57.090271 8.991345,60.245888 9.110775,65.284119 C9.227548,70.210205 12.886068,73.054855 19.251369,73.070534 C30.057989,73.097160 40.864723,73.077866 51.840267,73.077866 C53.987484,89.401680 61.400532,101.920280 76.688866,109.921104 z"/><path fill="#F5E41C" opacity="1.000000" stroke="none" d="M76.354416,109.751411 C61.400532,101.920280 53.987484,89.401680 51.840267,73.077866 C40.864723,73.077866 30.057989,73.097160 19.251369,73.070534 C12.886068,73.054855 9.227548,70.210205 9.110775,65.284119 C8.991345,60.245888 12.907690,57.090271 19.428833,57.072033 C30.076698,57.042259 40.724709,57.063988 51.183678,57.063988 C51.563141,56.593864 51.879574,56.380272 51.926388,56.118473 C56.428867,30.937811 71.598251,17.030745 98.013023,14.033926 C102.803261,13.490462 107.634552,13.142003 112.453003,13.059167 C117.653831,12.969757 120.966324,16.082565 121.122673,20.684353 C121.287643,25.539717 117.983620,28.401745 112.593239,29.080770 C104.059700,30.155739 95.306870,30.791729 87.154800,33.278618 C75.792297,36.744892 69.945129,45.040371 68.322067,57.063622 C81.508308,57.063622 94.648399,57.063137 107.788483,57.064228 C109.454391,57.064369 111.125771,56.987152 112.785179,57.093300 C117.884323,57.419498 121.107437,60.644268 121.039032,65.258537 C120.970772,69.862900 117.709305,73.002274 112.513527,73.040070 C99.686478,73.133377 86.858322,73.075493 74.030617,73.078247 C72.207634,73.078644 70.384644,73.078300 68.234291,73.078300 C69.684692,83.908684 74.877594,92.020988 84.753601,95.805984 C91.778465,98.498268 99.494377,99.427811 106.940926,100.953491 C109.030663,101.381645 111.275566,100.985550 113.419678,101.228683 C118.474678,101.801880 121.439659,105.234016 121.104477,109.904366 C120.788620,114.305405 117.595360,117.098984 112.584740,117.125877 C100.131790,117.192719 88.050018,115.331482 76.354416,109.751411 z"/></svg>心智圖</button></span>`;
        containerDiv.insertAdjacentHTML('afterbegin', spanHtml);
        console.debug('Inserted Mindmap button HTML into wrapperDiv:', containerDiv);

        const mindmapBtn = containerDiv.querySelector('button[aria-label="Mindmap"]');
        console.debug('Mindmap button found:', mindmapBtn);

        let isActive = false;
        mindmapBtn.addEventListener('click', () => {
            console.debug('Mindmap button clicked. Current active state:', isActive);

            mdLabel.scrollIntoView({ behavior: 'smooth', block: 'start' });

            if (!isActive) {
                console.debug('Creating mindmap...');

                const svgHeight = Math.min(document.documentElement.clientHeight * 3 / 5, codeBlock.clientHeight || document.documentElement.clientHeight);
                codeBlock.innerHTML = `<svg style="width: ${codeBlock.clientWidth}px; height: ${svgHeight}px"></svg>`;
                const svgEl = codeBlock.querySelector('svg');

                let mm;

                svgEl.addEventListener('dblclick', (e) => {
                    console.debug('SVG element double-clicked. Requesting fullscreen...');
                    if (svgEl.requestFullscreen) {
                        svgEl.requestFullscreen();
                    } else if (svgEl.webkitRequestFullscreen) { // Safari
                        svgEl.webkitRequestFullscreen();
                    } else if (svgEl.msRequestFullscreen) { // IE11
                        svgEl.msRequestFullscreen();
                    }
                });

                function handleFullscreenChange(e) {
                    setTimeout(() => {
                        mdLabel.scrollIntoView({ behavior: 'smooth', block: 'start' });
                        mm?.fit();
                    }, 60);
                }

                document.addEventListener('fullscreenchange', handleFullscreenChange);

                const transformer = new window.markmap.Transformer();
                const { root, features } = transformer.transform(codeEl.textContent);

                // const jsonOptions = { color: ['#1f77b4', '#ff7f0e', '#2ca02c'], colorFreezeLevel: 2 };
                const jsonOptions = {
                    autoFit: true,
                    duration: 300
                };
                const options = window.markmap.deriveOptions(jsonOptions);

                if (document.documentElement.classList.contains('dark')) {
                    document.documentElement.classList.add('markmap-dark');
                }

                mm = window.markmap.Markmap.create(svgEl, options, root);

                isActive = true;
            } else {
                console.debug('Resetting code block to original content...');
                codeBlock.innerHTML = `<code>${codeEl.textContent}</code>`;
                isActive = false;
            }
        });
    }

    async function handleCtrlDelete(event) {
        if (isInInputMode(event.target) && !!event.target.textContent && !confirm('是否要刪除本篇聊天記錄？')) {
            return;
        }

        const optionButton = document.querySelector('button[data-testid="conversation-options-button"]');
        if (!optionButton) return;
        simulateKeyPress(optionButton, 'Enter');

        await delay(50);

        const matchingPopperContentWrapper = [...document.querySelectorAll('div[data-radix-popper-content-wrapper]')];
        if (matchingPopperContentWrapper.length === 0) {
            return;
        }

        let isDeleteButtonFound = false;
        for (let i = 0; i < matchingPopperContentWrapper.length; i++) {
            const popperWrapper = matchingPopperContentWrapper[i];
            const deleteItem = popperWrapper.querySelector('div[role="menuitem"][data-testid="delete-chat-menu-item"]');
            if (deleteItem) {
                simulateMouseClick(deleteItem);
                isDeleteButtonFound = true;
                break;
            }
        }

        if (!isDeleteButtonFound) return;

        await delay(50);

        simulateMouseClick(
            document.querySelector(`div[data-testid="modal-delete-conversation-confirmation"]`)
                ?.querySelector(`button[data-testid="delete-conversation-confirm-button"]`));
    }

    function handleCtrlToggleSidebar(event) {
        let firstButton = document.querySelectorAll('button')[0];
        if (!firstButton) return;

        if (firstButton.parentElement.dataset['state'] === 'closed') {
            firstButton.click();
            return;
        }

        if (firstButton.dataset['testid'] === 'open-sidebar-button') {
            firstButton.click();
            return;
        }

        let sidebarButton = document.querySelector('button[data-testid="sidebar-button"]');
        if (sidebarButton) {
            sidebarButton.click();
            return;
        }
    }

    async function handleAltS(event) {
        const searchButton = document.querySelector('button[data-testid="composer-button-search"]');
        const deepResearchButton = document.querySelector('button[data-testid="composer-button-deep-research"]');
        const createImageButton = document.querySelector('button[data-testid="composer-button-create-image"]');
        if (searchButton.ariaPressed === 'false' && deepResearchButton.ariaPressed === 'false' && createImageButton.ariaPressed === 'false') {
            searchButton.click();
        }
        if (searchButton.ariaPressed === 'true' && deepResearchButton.ariaPressed === 'false' && createImageButton.ariaPressed === 'false') {
            deepResearchButton.click();
        }
        if (searchButton.ariaPressed === 'false' && deepResearchButton.ariaPressed === 'true' && createImageButton.ariaPressed === 'false') {
            createImageButton.click();
        }
        if (searchButton.ariaPressed === 'false' && deepResearchButton.ariaPressed === 'false' && createImageButton.ariaPressed === 'true') {
            createImageButton.click();
        }
    }

    function handleAltNumber(event) {
        const useToolButton =
            document.querySelector('button[aria-label="Use a tool"]')
            || document.querySelector('button[aria-label="使用工具"]')
            || document.querySelector('button[aria-label="ツールを使用する"]');

        const enterEvent = new KeyboardEvent("keydown", {
            key: "Enter",
            keyCode: 13,
            code: "Enter",
            which: 13,
            bubbles: true,
            cancelable: true
        });
        useToolButton?.dispatchEvent(enterEvent);

        setTimeout(() => {
            const popperWrappers = document.querySelectorAll('div[data-radix-popper-content-wrapper]');
            popperWrappers.forEach((popperWrapper) => {
                const menuItems = popperWrapper.querySelectorAll('div[role="menuitem"]');
                menuItems[+event.key - 1]?.click();
            });
        }, 300);
    }

    document.addEventListener("keydown", async (event) => {
        for (const { test, handler } of hotkeyHandlers) {
            if (test(event)) {
                await handler(event);
                break;
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
        if (element.shadowRoot instanceof ShadowRoot || (element.getRootNode && element.getRootNode() instanceof ShadowRoot)) {
            return true;
        }
        return false;
    }

    function isCtrlOrMetaKeyPressed(event) {
        return event.ctrlKey || event.metaKey;
    }

    async function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function simulateMouseClick(element) {
        if (!element) return;

        const mouseEvent = new MouseEvent('click', {
            bubbles: true,
            cancelable: true
        });

        console.log('simulateMouseClick', element);

        element.dispatchEvent(mouseEvent);
    }

    function simulateKeyPress(element, key) {
        if (!element) return;

        const keyEvent = new KeyboardEvent('keydown', {
            bubbles: true,
            cancelable: true,
            key: key
        });

        console.log('simulateKeyPress', element);

        element.dispatchEvent(keyEvent);
    }

})();
