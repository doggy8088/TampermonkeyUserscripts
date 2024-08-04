// ==UserScript==
// @name         Coze: 快速鍵增強
// @version      0.2.0
// @description  Coze: 提供額外的快速鍵方便使用
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/CozeShortcuts.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/CozeShortcuts.user.js
// @author       Will Huang
// @match        *://www.coze.com/*
// ==/UserScript==

(function () {
    'use strict';

    document.addEventListener('keyup', function (event) {
        // remove all span tag with data-badge attribute
        document.querySelectorAll('span[data-badge]').forEach(function (elm) {
            elm.remove();
        });
    });

    document.addEventListener('keydown', function (event) {

        // 如果使用者停留在網址列或是輸入框中，就不要觸發快速鍵的功能
        if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || event.target.isContentEditable) {
            return;
        }

        var elm = findTestId('bot.tab');
        if (event.altKey && !!elm) {
            [...elm.parentElement.children].filter(x => x.tagName === 'A').forEach((tabElement, index) => {
                const badge = document.createElement('span');
                badge.setAttribute('data-badge', '');
                badge.textContent = index + 1;
                badge.style.cssText = `
                    position: absolute;
                    top: -8px;
                    right: -8px;
                    background-color: #e2e8f0;
                    color: #4a5568;
                    border-radius: 9999px;
                    padding: 2px 6px;
                    font-size: 0.75rem;
                    font-weight: bold;
                    `;
                tabElement.style.position = 'relative';
                tabElement.appendChild(badge);
            });
        }

        // 檢查是否按下了 Alt 鍵和 S 鍵
        if (!event.altKey && (event.key === 's' || event.key === 'S')) {
            performActions_UserSubMenu('Manage Subscription');
        }
        if (!event.altKey && (event.key === 'p' || event.key === 'P')) {
            performActions('Personal');
        }
        if (!event.altKey && (event.key === 'h' || event.key === 'H')) {
            performActions('Home');
        }
        if (!event.altKey && (event.key === 't' || event.key === 'T')) {
            findAndToggleTeams();
        }

        if (event.altKey && (event.key === 'p' || event.key === 'P')) {
            console.log('Alt + P')
            performActions_UserSubMenu('My profile');
        }
        if (event.altKey && (parseInt(event.key) >= 1 && parseInt(event.key) <= 5)) {
            var elm = findTestId('bot.tab');
            if (elm) {
                console.log('Alt + ' + event.key, [...elm.parentElement.children].filter(x => x.tagName === 'A'));
                [...elm.parentElement.children].filter(x => x.tagName === 'A')?.[parseInt(event.key) - 1]?.click();
            }
        }
    });

    function findAndTriggerMouseDown(text) {
        const elements = document.evaluate(
            `//*[contains(text(), '${text}')]`,
            document,
            null,
            XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
            null
        );

        for (let i = 0; i < elements.snapshotLength; i++) {
            const element = elements.snapshotItem(i);
            if (element) {
                const mousedownEvent = new MouseEvent('mousedown', {
                    bubbles: true,
                    cancelable: true,
                });
                element.dispatchEvent(mousedownEvent);
                console.log(`Triggered mousedown on element containing "${text}"`);
                return true;
            }
        }

        console.log(`No element found containing "${text}"`);
        return false;
    }

    function findParentTabindexAndClickElement(text) {
        const elements = document.evaluate(
            `//*[contains(text(), '${text}')]`,
            document,
            null,
            XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
            null
        );

        for (let i = 0; i < elements.snapshotLength; i++) {
            let element = elements.snapshotItem(i);
            if (element) {
                // 向上遍歷DOM樹，查找帶有tabindex屬性的節點
                while (element && !element.hasAttribute('tabindex')) {
                    element = element.parentElement;
                }

                if (element) {
                    element.click();
                    console.log(`Clicked element containing "${text}"`);

                    return true;
                } else {
                    console.log(`Found text "${text}", but no parent element with tabindex`);
                }
            }
        }

        console.log(`No element found containing "${text}"`);
        return false;
    }

    function findParentTabindexAndNexItemAndClickElement(text) {
        const elements = document.evaluate(
            `//*[contains(text(), '${text}')]`,
            document,
            null,
            XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
            null
        );

        for (let i = 0; i < elements.snapshotLength; i++) {
            let element = elements.snapshotItem(i);
            if (element) {
                // 向上遍歷DOM樹，查找帶有tabindex屬性的節點
                while (element && !element.hasAttribute('tabindex')) {
                    element = element.parentElement;
                }

                if (element) {
                    console.log(element)
                    element?.parentElement?.parentElement?.nextSibling?.click();
                    console.log(`Clicked element containing "${text}" and get it's next sibling`);

                    return true;
                } else {
                    console.log(`Found text "${text}", but no parent element with tabindex`);
                }
            }
        }

        console.log(`No element found containing "${text}"`);
        return false;
    }

    function findTestId(text = 'bot.tab') {
        const elements = document.evaluate(
            `//*[contains(@data-testid, '${text}')]`,
            document,
            null,
            XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
            null
        );

        for (let i = 0; i < elements.snapshotLength; i++) {
            let element = elements.snapshotItem(i);
            if (element) {
                return element;
            }
        }

        console.log(`No element found with data-testid containing "${text}"`);
        return false;
    }

    function findAndToggleTeams(text = 'Teams') {
        const elements = document.evaluate(
            `//*[contains(text(), '${text}')]`,
            document,
            null,
            XPathResult.UNORDERED_NODE_SNAPSHOT_TYPE,
            null
        );

        if (elements.snapshotLength === 0) {
            console.log(`No element found containing "${text}"`);
            return;
        }

        for (let i = 0; i < elements.snapshotLength; i++) {
            let element = elements.snapshotItem(i);
            if (element) {
                var parent = element.parentElement;
                var sibiling = parent.nextElementSibling;
                var children = [...sibiling.children].filter(x => x.tagName === 'LI');

                for (let j = 0; j < children.length; j++) {
                    let idx = children[j].getAttribute('currentIndex');
                    if (idx === null) {
                        children[j].setAttribute('currentIndex', j === 0 ? '1' : '0');
                    }
                }

                for (let j = 0; j < children.length; j++) {
                    let idx = children[j].getAttribute('currentIndex');
                    if (idx === '1') {
                        children[j].focus();

                        children[j].setAttribute('currentIndex', '0');
                        if (j === children.length - 1) {
                            children[0].setAttribute('currentIndex', '1');
                        } else {
                            children[j + 1].setAttribute('currentIndex', '1');
                        }
                        break;
                    }
                }
            }
        }

        return false;
    }

    async function performActions(clickstr) {
        findParentTabindexAndClickElement(clickstr);
    }

    async function performActions_UserSubMenu(clickstr) {
        findParentTabindexAndNexItemAndClickElement('Coze token');
        await new Promise(resolve => setTimeout(resolve, 100));
        findAndTriggerMouseDown(clickstr);
        findParentTabindexAndNexItemAndClickElement('Coze token');
    }

})();
