// ==UserScript==
// @name         NotebookLM: 好用的鍵盤快速鍵集合
// @version      0.1.0
// @description  按下 Ctrl+Alt+A 可以展開心智圖所有節點
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/NotebookLMHotkeys.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/NotebookLMHotkeys.user.js
// @author       Will Huang
// @match        https://notebooklm.google.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=notebooklm.google.com
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
        { test: matchHotkey({ ctrl: true, alt: true }, 'a'), handler: handleCtrlAltA },
    ];

    let clonedButton = null;
    async function OpenAllButton() {
        const result = await InsertOpenAllButton();
        if (result.success) {
            const zoomActionsDiv = document.querySelector('div.zoom-actions');
            if (zoomActionsDiv) {
                clonedButton = zoomActionsDiv.querySelector('button[data-open-all-btn]')?.closest('button');
            }
        }
    }

    setInterval(async () => {
        const svg = findMindMapSvg();
        if (svg) {
            if (!clonedButton || !document.body.contains(clonedButton)) {
                await OpenAllButton();
            }
        }
    }, 1000);

    async function InsertOpenAllButton() {
        const zoomActionsDiv = document.querySelector('div.zoom-actions');
        if (zoomActionsDiv) {
            const buttons = zoomActionsDiv.querySelectorAll('button');
            if (buttons.length >= 2) {
                const firstButton = buttons[0];
                const secondButton = buttons[1];
                const clonedButton = firstButton.cloneNode(true); // 複製含子元素

                // 設定 data- 屬性標記這個複製的按鈕
                clonedButton.setAttribute('data-open-all-btn', 'true');

                // 修改複製按鈕內的 icon
                const iconElement = clonedButton.querySelector('mat-icon, i');
                if (iconElement) {
                    iconElement.textContent = 'open_with';
                } else {
                    if (clonedButton.firstElementChild) {
                        clonedButton.firstElementChild.textContent = 'open_with';
                    }
                }

                // 綁定 click 事件
                clonedButton.addEventListener('click', handleCtrlAltA);

                // 插入複製按鈕到第一、二個按鈕之間
                secondButton.parentNode.insertBefore(clonedButton, secondButton);

                const data = {
                    success: true,
                    message: '按鈕複製並插入成功。',
                    clonedButtonHTML: clonedButton.outerHTML
                };
                return data;
            } else {
                const data = {
                    success: false,
                    message: `在 .zoom-actions 內找到 ${buttons.length} 個按鈕，預期至少 2 個。`
                };
                return data;
            }
        } else {
            const data = {
                success: false,
                message: '找不到 class 為 "zoom-actions" 的 div。'
            };
            return data;
        }
    }

    function findMindMapSvg(event) {
        const svgs = document.querySelectorAll('svg');
        const matchingSvgs = [];

        svgs.forEach(svg => {
            const width = svg.getAttribute('width');
            const height = svg.getAttribute('height');
            if (width === '100%' && height === '100%') {
                matchingSvgs.push(svg);
            }
        });

        if (matchingSvgs.length === 1) {
            return matchingSvgs[0];
        }
    }

    async function handleCtrlAltA() {
        const svgElement = findMindMapSvg();
        if (!svgElement) return;

        let found;
        do {
            found = false;
            const gNodes = svgElement.querySelectorAll('g.node');
            gNodes.forEach(gNode => {
                const textNode = gNode.querySelector('text');
                if (textNode && textNode.textContent === '>') {
                    const circleNode = gNode.querySelector('circle');
                    if (circleNode) {
                        circleNode.dispatchEvent(new MouseEvent('click', {
                            bubbles: true,
                            cancelable: true
                        }));
                        found = true;
                    }
                }
            });
            // 等待 DOM 更新
            if (found) await delay(100);
        } while (found);
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
