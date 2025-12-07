// ==UserScript==
// @name         Gemini Nano: Chrome AI 翻譯機 V2
// @version      0.1.0
// @description  滑鼠移到哪裡就翻譯哪裡 (有點 Buggy 的版本)
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ChromeAiTranslatorV2.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ChromeAiTranslatorV2.user.js
// @author       Will Huang
// @match        *://*/*
// @run-at       document-start
// ==/UserScript==

(async () => {
    'use strict';

    if (window.ai) {

        async function visitAllTextNodes(element, callback) {

            if (element.nodeType === 3) { // Node.TEXT_NODE
                if (element.parentNode.nodeType === 1 && ['DIV', 'SPAN', 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'TH', 'TD', 'A', 'BUTTON', 'EM', 'STRONG', 'LABEL', 'OPTION', 'CAPTION', 'DT', 'DD', 'FIELDSET', 'LEGEND', 'HEADER', 'FOOTER', 'NAV', 'ASIDE', 'MAIN', 'ARTICLE', 'SECTION', 'DETAILS', 'SUMMARY', 'FIGCAPTION', 'TIME', 'AUDIO', 'VIDEO', 'CANVAS', 'WBR', 'DEL', 'INS', 'S', 'U', 'Q', 'CITE', 'BLOCKQUOTE', 'ADDRESS', 'B', 'I', 'SUP', 'SUB', 'SMALL', 'BIG', 'FONT', 'CENTER', 'DIR', 'MENU', 'PLAINTEXT', 'XMP', 'DATALIST', 'FIELDSET', 'OUTPUT', 'MARK', 'RUBY', 'RT', 'RP'].includes(element.parentNode.nodeName)) {
                    // console.log(`處理 ${element.parentNode.nodeName} 元素下的節點`, element);
                    await callback(element);
                }
                return;
            }

            // console.log(`遍瀝 ${element.nodeName} 元素`, element);

            if (element.firstChild.nodeType === 3) {
                await visitAllTextNodes(element.firstChild, callback);
            }
        }

        document.addEventListener('mouseover', async (event) => {

            const canCreate = await window.ai.canCreateGenericSession()

            if (canCreate === "no") {
                isRunning = false;
                console.error(" can't create generic session", canCreate)
                return;
            }

            // event.target.nodeType 一定是 1，表示是個 DOM 元素
            // console.log(event.target.nodeType);

            var nodeCount = 0;

            let isTranslated = event.target.firstChild?.nodeType == 3 && !event.target.firstChild.hasOwnProperty('nodeValueBackup');
            if (isTranslated) console.log('開始翻譯');

            await visitAllTextNodes(event.target, async function (textNode) {

                // check if textNode has Own property nodeValueBackup
                if (event.shiftKey && textNode.hasOwnProperty('nodeValueBackup')) {
                    textNode.nodeValue = textNode.nodeValueBackup;
                    delete textNode.nodeValueBackup;
                    return;
                }

                var checkText = textNode.nodeValue.replace(/\s+/g, '').replace(/[^\w]/g, '');
                console.log('checkText', checkText);
                if (checkText == '' || checkText.length < 10 || textNode.hasOwnProperty('nodeValueBackup')) {
                    return;
                }

                textNode.nodeValueBackup = textNode.nodeValue;
                // console.log(nodeCount, 'textNode.nodeValueBackup', textNode.nodeValueBackup);

                // console.log(nodeCount, '查看文字是否需要翻譯？', chunk);
                // let isText = await session.execute(`Does this context is a English? Answer me Y or N: {chunk}`);
                // console.log('isText', isText);

                let isText = 'Y';

                if (isText === 'Y') {
                    nodeCount++;

                    console.log(nodeCount, '準備翻譯：', typeof (textNode), textNode);
                    // console.log(nodeCount, 'text', chunk);

                    try {
                        let prompt = `將以下 '<source>' tag 中的文字翻譯為正體中文，將翻譯結果放在一個 <translated> 標籤內，不要翻譯 Phi-3, Gemini, Google, LLM, Nano 專有名詞:\n<source>${textNode.nodeValue}</source>`;
                        var session = await window.ai.createTextSession();
                        let chunk = await session.execute(prompt)

                        if (!chunk.includes('<translated>') || !chunk.includes('</translated>')) {
                            console.warn(nodeCount, '錯誤的結果，重試第 1 次: ', chunk);
                            chunk = await session.execute(prompt)
                        }

                        if (!chunk.includes('<translated>') || !chunk.includes('</translated>')) {
                            console.warn(nodeCount, '錯誤的結果，重試第 2 次: ', chunk);
                            chunk = await session.execute(prompt)
                        }

                        if (!chunk.includes('<translated>') || !chunk.includes('</translated>')) {
                            console.warn(nodeCount, '錯誤的結果，重試第 3 次: ', chunk);
                            chunk = await session.execute(prompt)
                        }

                        if (!chunk.includes('<translated>') || !chunk.includes('</translated>')) {
                            session.destroy()
                            return;
                        }

                        session.destroy()
                        console.log(nodeCount, 'translated', chunk);

                        textNode.nodeValue = chunk.replace(/<\/?(translated|translation|translate)>/g, '')
                            .replace(/<[^>]+>/g, '')
                            .replace(/```/g, '')
                            .replace(/&amp;/g, '&')
                            .replace(/&lt;/g, '<')
                            .replace(/&gt;/g, '>')
                            .replace(/&quot;/g, '"')
                            .replace(/&apos;/g, "'");
                        console.log(nodeCount, 'textNode.nodeValue', textNode.nodeValue);

                    } catch (error) {
                        console.error('翻譯錯誤', error);
                    }

                }

                // textNode.nodeValue = textNode.nodeValue.substring(0, textNode.nodeValue.length - 1);

            });

            if (isTranslated) console.log('翻譯結束');

            isRunning = false;

        });

    }

})();
