// ==UserScript==
// @name         沉浸式翻譯: 修正翻譯後樣式跑掉的問題
// @version      0.1.1
// @description
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ImmersiveTranslateAutoFix.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ImmersiveTranslateAutoFix.user.js
// @author       Will Huang
// @match        https://*/*
// @run-at       document-idle
// @icon         https://www.google.com/s2/favicons?sz=64&domain=immersivetranslate.com
// ==/UserScript==

(function () {
    'use strict';

    /**
     * 檢查元素是否應該被跳過
     */
    function shouldSkipElement(elm) {
        const tagName = elm.tagName.toUpperCase();
        if (tagName === "STYLE") return true;
        if (tagName === "SCRIPT") return true;
        if (tagName === "NOSCRIPT") return true;
        if (tagName === "IFRAME") return true;
        if (tagName === "OBJECT") return true;
        if (tagName === "CODE" && elm.attributes.length > 0) return true;
        if (tagName === "TEXTAREA") return true;
        if (tagName === "INPUT") return true;
        if (tagName === "SELECT") return true;
        return false;
    }

    /**
     * 處理文字節點，將 **text** 轉換為 <strong>text</strong>
     */
    function processTextNodeBold(textNode) {
        const text = textNode.textContent;
        // 匹配同一行中 ** 開頭和結尾的文字
        const regex = /\*\*([^*\n]+?)\*\*/g;

        if (regex.test(text)) {
            const parent = textNode.parentNode;
            const fragment = document.createDocumentFragment();
            let lastIndex = 0;

            // 重置 regex
            regex.lastIndex = 0;
            let match;

            while ((match = regex.exec(text)) !== null) {
                // 添加匹配前的文字
                if (match.index > lastIndex) {
                    fragment.appendChild(
                        document.createTextNode(text.slice(lastIndex, match.index))
                    );
                }

                // 創建 strong 元素
                const strong = document.createElement('strong');
                strong.textContent = match[1];
                fragment.appendChild(strong);

                lastIndex = regex.lastIndex;
            }

            // 添加剩餘文字
            if (lastIndex < text.length) {
                fragment.appendChild(
                    document.createTextNode(text.slice(lastIndex))
                );
            }

            // 替換原文字節點
            parent.replaceChild(fragment, textNode);
            return true;
        }

        return false;
    }

    /**
     * 處理文字節點,將 `text` 轉換為 <code>text</code>
     */
    function processTextNodeCode(textNode) {
        const text = textNode.textContent;
        // 匹配同一行中 ` 開頭和結尾的文字
        const regex = /`([^`\n]+?)`/g;

        if (regex.test(text)) {
            const parent = textNode.parentNode;
            const fragment = document.createDocumentFragment();
            let lastIndex = 0;

            // 重置 regex
            regex.lastIndex = 0;
            let match;

            while ((match = regex.exec(text)) !== null) {
                // 添加匹配前的文字
                if (match.index > lastIndex) {
                    fragment.appendChild(
                        document.createTextNode(text.slice(lastIndex, match.index))
                    );
                }

                // 創建 code 元素
                const code = document.createElement('code');
                code.textContent = match[1];
                fragment.appendChild(code);

                lastIndex = regex.lastIndex;
            }

            // 添加剩餘文字
            if (lastIndex < text.length) {
                fragment.appendChild(
                    document.createTextNode(text.slice(lastIndex))
                );
            }

            // 替換原文字節點
            parent.replaceChild(fragment, textNode);
            return true;
        }

        return false;
    }

    /**
     * 遞迴處理元素及其子節點
     */
    function processElement(element) {
        if (shouldSkipElement(element)) {
            return;
        }

        // 先處理 innerHTML，移除緊接著 <code> 標籤的反引號
        // 這必須在處理文字節點之前執行，因為文字節點無法存取 HTML 標籤
        if (element.innerHTML) {
            const originalHTML = element.innerHTML;
            const cleanedHTML = originalHTML.replace(/`(<code>[^<]+<\/code>)`/g, '$1');
            if (originalHTML !== cleanedHTML) {
                element.innerHTML = cleanedHTML;
            }
        }

        const childNodes = Array.from(element.childNodes);

        for (const node of childNodes) {
            if (node.nodeType === Node.TEXT_NODE) {
                processTextNodeBold(node);
                processTextNodeCode(node);
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                processElement(node);
            }
        }
    }

    /**
     * 修正所有翻譯目標包裝器中的格式
     */
    function fixTranslationFormat() {
        // 選取所有沉浸式翻譯的目標包裝器
        const wrappers = document.querySelectorAll('.notranslate.immersive-translate-target-wrapper');

        wrappers.forEach(wrapper => {
            processElement(wrapper);
        });

        if (wrappers.length > 0) {
            console.log(`[沉浸式翻譯修正] 已處理 ${wrappers.length} 個翻譯區塊`);
        }
    }

    /**
     * 使用 MutationObserver 監控 DOM 變化
     */
    function observeTranslations() {
        const observer = new MutationObserver((mutations) => {
            let hasNewTranslations = false;

            for (const mutation of mutations) {
                if (mutation.addedNodes.length > 0) {
                    for (const node of mutation.addedNodes) {
                        if (node.nodeType === Node.ELEMENT_NODE) {
                            if (node.classList?.contains('immersive-translate-target-wrapper')) {
                                hasNewTranslations = true;
                                break;
                            }
                            if (node.querySelector?.('.immersive-translate-target-wrapper')) {
                                hasNewTranslations = true;
                                break;
                            }
                        }
                    }
                }
                if (hasNewTranslations) break;
            }

            if (hasNewTranslations) {
                setTimeout(fixTranslationFormat, 100);
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    // 初始化
    function init() {
        // 處理現有的翻譯
        fixTranslationFormat();

        // 監控新的翻譯
        observeTranslations();
    }

    // 等待 DOM 完全載入
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
