// ==UserScript==
// @name         Gemini Nano: Chrome AI 翻譯機
// @version      0.1.0
// @description  按下 Ctrl+Click 可以翻譯整段，按下 Ctrl+Shift+Click 可以還原翻譯
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ChromeAiTranslator.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ChromeAiTranslator.user.js
// @author       Will Huang
// @match        *://*/*
// @run-at       document-start
// ==/UserScript==

(async () => {
    'use strict';

    const canCreate = await window.ai.canCreateTextSession()

    if (canCreate === "no") {
        console.error(" can't create text session", canCreate)
        return;
    }

    var session = await window.ai.createTextSession({
        topK: 3,
        temperature: 0.3
    });

    // session.destroy()

    if (window.ai) {

        async function visitAllTextNodes(element, callback) {

            if (element.nodeType === 3) { // Node.TEXT_NODE
                if (element.parentNode.nodeType === 1 && ['DIV', 'SPAN', 'P', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'LI', 'TH', 'TD', 'A', 'BUTTON', 'EM', 'STRONG', 'LABEL', 'OPTION', 'CAPTION', 'DT', 'DD', 'FIELDSET', 'LEGEND', 'HEADER', 'FOOTER', 'NAV', 'ASIDE', 'MAIN', 'ARTICLE', 'SECTION', 'DETAILS', 'SUMMARY', 'FIGCAPTION', 'TIME', 'AUDIO', 'VIDEO', 'CANVAS', 'WBR', 'DEL', 'INS', 'S', 'U', 'Q', 'CITE', 'BLOCKQUOTE', 'ADDRESS', 'B', 'I', 'SUP', 'SUB', 'SMALL', 'BIG', 'FONT', 'CENTER', 'DIR', 'MENU', 'PLAINTEXT', 'XMP', 'DATALIST', 'FIELDSET', 'OUTPUT', 'MARK', 'RUBY', 'RT', 'RP'].includes(element.parentNode.nodeName)) {
                    // console.log(`處理 ${element.parentNode.nodeName} 元素下的節點`, element);
                    await callback(element);
                }
                return;
            }

            //console.log(`遍瀝 ${element.nodeName} 元素`, element);

            var child = element.firstChild;
            while (child) {
                await visitAllTextNodes(child, callback);
                child = child.nextSibling;
            }
        }

        document.addEventListener('click', async (event) => {
            // console.log(event);
            if (!event.ctrlKey) return;

            var nodeCount = 0;

            console.log('開始翻譯');
            await visitAllTextNodes(event.target, async function (textNode) {

                // check if textNode has Own property nodeValueBackup
                if (event.shiftKey) {
                    if (textNode.hasOwnProperty('nodeValueBackup')) {
                        //console.log('目前的值', textNode.nodeValue);
                        //console.log('還原備份', textNode.nodeValueBackup);
                        textNode.nodeValue = textNode.nodeValueBackup;
                        delete textNode.nodeValueBackup;
                    }
                    return;
                }

                var checkText = textNode.nodeValue.replace(/\s+/g, '').replace(/[^\w]/g, '');
                console.log('checkText', checkText);
                if (checkText == '' || checkText.length < 5) {
                    return;
                }

                // console.log(nodeCount, '查看文字是否需要翻譯？', chunk);
                // let isText = await session.execute(`Does this context is a English? Answer me Y or N: {chunk}`);
                // console.log('isText', isText);

                let isText = 'Y';

                if (isText === 'Y') {
                    nodeCount++;

                    console.log(nodeCount, '準備翻譯：', typeof (textNode), textNode);
                    // console.log(nodeCount, 'text', chunk);

                    try {
                        let prompt = `將以下 '<source>' tag 中的文字翻譯為繁體中文。將翻譯結果放在一個 <translated> 標籤內。遇到 'Gemini Nano', 'Phi-3', 'Google', 'LLM' 一定要維持原文。待翻譯的文字：<source>${textNode.nodeValue}</source>`;
                        console.log(prompt);
                        let chunk = ''

                        for (let i=0; i < 20; i++) {
                            try {
                                chunk = await session.prompt(prompt)
                                console.log('chunk', chunk)
                            } catch (error) {
                                console.log(nodeCount, `翻譯錯誤，重試第 ${i+1} 次`, chunk);
                                session.destroy()
                                session = await window.ai.createTextSession({ topK: 3, temperature: 0.3 });
                                continue;
                            }

                            if (chunk.includes('<translated>') && chunk.includes('</translated>')) {
                                if (chunk.includes('語法錯誤疑似為') || chunk.includes('正確版本為') || chunk.includes('以下將標記中的文字翻譯成繁體中文')) {
                                    continue;
                                }
                                break;
                            } else {
                                console.warn(nodeCount, `錯誤的結果，重試第 ${i+1} 次: `, chunk);
                                continue;
                            }
                        }

                        if (!chunk.includes('<translated>') || !chunk.includes('</translated>')) {
                            return;
                        }

                        console.log(nodeCount, 'translated', chunk);

                        var backupValue = textNode.nodeValue;
                        textNode.nodeValue = chunk.replace(/<\/?(translated|translation|translate)>/g, '')
                            .replace('**翻譯結果**\n', '')
                            .replace(/<[^>]+>/g, '')
                            .replace(/```/g, '')
                            .replace(/&amp;/g, '&')
                            .replace(/&lt;/g, '<')
                            .replace(/&gt;/g, '>')
                            .replace(/&quot;/g, '"')
                            .replace(/&apos;/g, "'");

                        textNode.nodeValueBackup = backupValue;
                        // console.log(nodeCount, 'textNode.nodeValueBackup', textNode.nodeValueBackup);

                        console.log(nodeCount, 'textNode.nodeValue', textNode.nodeValue);

                    } catch (error) {
                        console.error('翻譯錯誤', error);
                    }

                }

                // textNode.nodeValue = textNode.nodeValue.substring(0, textNode.nodeValue.length - 1);

            });
            console.log('翻譯結束');
        });

    }

})();
