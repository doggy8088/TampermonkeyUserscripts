// ==UserScript==
// @name         Claude: 自動校正 Claude AI 聊天介面上的標點符號
// @version      0.1.0
// @description  自動校正 Claude AI 聊天介面上的標點符號，還有替中英文之間加上空格，讓閱讀更順暢。
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ClaudeFixChinesePunctuationMarks.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ClaudeFixChinesePunctuationMarks.user.js
// @author       Will Huang
// @match        https://claude.ai/*
// ==/UserScript==

(function () {
    'use strict';

    let lastLocation = location.href;

    let isReady = false;
    setInterval(() => {
        if (lastLocation != location.href) {
            isReady = false;
            lastLocation = location.href;
            return;
        }

        var streamingDivs = document.querySelectorAll('div[data-is-streaming]');

        let isStreaming = false;
        for (let i = 0; i < streamingDivs.length; i++) {
            const streamingDiv = streamingDivs[i];
            // check if streamingDiv's attribute data-is-streaming is true
            if (streamingDiv.getAttribute('data-is-streaming') == 'true') {
                isStreaming = true;
                isReady = false;
                fixAll();
                break;
            }
        }

        if (streamingDivs.length > 0 && isReady == false && isStreaming == false) {
            isReady = true;
            fixAll();
        }

    }, 60);

    // document.addEventListener('dblclick', function(event) {
    //     if (event.ctrlKey) {
    //         fixAll();
    //     }
    // });

    function fixAll() {
        var streamingDivs = document.querySelectorAll('div[data-is-streaming]');
        streamingDivs.forEach(function(streamingDiv) {
            visitAllTextNodes(streamingDiv, function(textNode) {
                textNode.nodeValue = textNode.nodeValue

                    // 右邊是中文，左邊是標點符號
                    .replace(/,(?=[\u4e00-\u9fff])/g, '，')
                    .replace(/\?(?=[\u4e00-\u9fff])/g, '？')
                    .replace(/!(?=[\u4e00-\u9fff])/g, '！')
                    .replace(/:(?=[\u4e00-\u9fff])/g, '：')

                    // 左邊是中文，右邊是標點符號
                    .replace(/(?<=[\u4e00-\u9fff]),/g, '，')
                    .replace(/(?<=[\u4e00-\u9fff])\?/g, '？')
                    .replace(/(?<=[\u4e00-\u9fff])!/g, '！')
                    .replace(/(?<=[\u4e00-\u9fff]):/g, '：')

                    // 兩邊都是中文
                    .replace(/(?<=[\u4e00-\u9fff])([a-zA-Z0-9\/]+)(?=[\u4e00-\u9fff])/g, (match) => ' ' + match + ' ')

                    // 左邊是中文
                    .replace(/(?<=[\u4e00-\u9fff])([\x21-\x26\x2A-\x2Ea-zA-Z0-9@\(]+)/g, (match) => ' ' + match)

                    // 右邊是中文
                    .replace(/([\x21-\x26\x2A-\x2Ea-zA-Z0-9@\)]+)(?=[\u4e00-\u9fff])/g, (match) => match + ' ')

                    .replace(/創建/g, '建立')
                    .replace(/創建對象/g, '建立物件');
            });
        });
    }

    function visitAllTextNodes(element, callback) {
        if (element.nodeType === 3) { // Node.TEXT_NODE
            callback(element);
        }

        if (element.nodeName === 'PRE'
         || element.nodeName === 'CODE'
         || element.nodeName === 'SCRIPT'
         || element.nodeName === 'STYLE'
         || element.nodeName === 'TEXTAREA'
         || element.nodeName === 'INPUT'
         || element.nodeName === 'SELECT'
         || element.nodeName === 'OPTION'
         || element.nodeName === 'BUTTON'
         || element.nodeName === 'OBJECT'
         || element.nodeName === 'EMBED'
         || element.nodeName === 'AUDIO'
         || element.nodeName === 'VIDEO'
         || element.nodeName === 'CANVAS'
         || element.nodeName === 'IMG'
         || element.nodeName === 'SVG'
         || element.nodeName === 'IFRAME'
         || element.nodeName === 'FRAME'
         || element.nodeName === 'FRAMESET'
         || element.nodeName === 'NOFRAMES'
         || element.nodeName === 'NOSCRIPT'
         || element.nodeName === 'TEMPLATE'
         || element.nodeName === 'APPLET'
         || element.nodeName === 'AREA'
         || element.nodeName === 'MAP'
         || element.nodeName === 'BASE'
         || element.nodeName === 'META'
         || element.nodeName === 'LINK'
        ) {
            return;
        }

        // console.log(element.nodeName, element.nodeType, element.nodeValue)

        var child = element.firstChild;
        while (child) {
            visitAllTextNodes(child, callback);
            child = child.nextSibling;
        }
    }

})();
