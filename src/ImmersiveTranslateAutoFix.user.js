// ==UserScript==
// @name         沉浸式翻譯: 修正翻譯後樣式跑掉的問題
// @version      0.2.0
// @description  修正沉浸式翻譯（Immersive Translate）譯文中殘留的 Markdown 粗體（**）與行內程式碼（`）標記，轉換為正確的 HTML 樣式
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ImmersiveTranslateAutoFix.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ImmersiveTranslateAutoFix.user.js
// @author       Will Huang
// @match        https://*/*
// @match        file:///*/*
// @run-at       document-idle
// @icon         https://www.google.com/s2/favicons?sz=64&domain=immersivetranslate.com
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // 要處理的翻譯區塊：沉浸式翻譯把每一段譯文包在同時具有這兩個 class 的元素中。
    const WRAPPER_SELECTOR = '.notranslate.immersive-translate-target-wrapper';
    const LOG_PREFIX = '[沉浸式翻譯修正]';

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

    // Trusted Types 支援。
    // Google 系列、YouTube 等網站以 CSP 強制 Trusted Types，直接把字串指派給 innerHTML 會丟出 TypeError。
    // 舊版沒有處理，例外會一路往外拋，讓同一批之後的所有翻譯區塊都不會被處理，還會不斷在 Console 報錯。
    // 這裡在第一次真的需要改寫 innerHTML 時才建立 policy（lazy），沒有翻譯的頁面完全不會碰到 Trusted Types。
    // createHTML 原樣傳回字串：要指派的 HTML 是由翻譯區塊「既有 DOM 的序列化結果」加上 <strong> 標籤組成，
    // 文字內容在序列化時已被跳脫（< 會變成 &lt;），不會引入原本 DOM 中沒有的標籤或屬性。
    // 這個 policy 只存在於本腳本的閉包中，不會暴露給網頁使用。
    // 若網站以 trusted-types 指令限制可用的 policy 名稱，createPolicy 會失敗，此時退回字串，
    // 由 setInnerHTML() 的 try/catch 接住並略過該元素的跨標籤修正（文字節點層級的修正不受影響）。
    let trustedHTMLPolicy;
    let hasWarnedInnerHTMLBlocked = false;

    function toTrustedHTML(html) {
        if (!window.trustedTypes?.createPolicy) {
            return html;
        }
        if (trustedHTMLPolicy === undefined) {
            try {
                trustedHTMLPolicy = window.trustedTypes.createPolicy('immersive-translate-auto-fix', {
                    createHTML: (input) => input
                });
            } catch (error) {
                trustedHTMLPolicy = null;
            }
        }
        return trustedHTMLPolicy ? trustedHTMLPolicy.createHTML(html) : html;
    }

    function setInnerHTML(element, html) {
        try {
            element.innerHTML = toTrustedHTML(html);
            return true;
        } catch (error) {
            // 同一頁只提示一次，避免每個翻譯區塊都洗一次 Console。
            if (!hasWarnedInnerHTMLBlocked) {
                hasWarnedInnerHTMLBlocked = true;
                console.warn(`${LOG_PREFIX} 此網站限制改寫 innerHTML（Trusted Types），略過跨 HTML 標籤的格式修正：`, error);
            }
            return false;
        }
    }

    /**
     * 處理文字節點，將 **text** 轉換為 <strong>text</strong>
     * 有轉換時回傳替換進 DOM 的新節點陣列（原文字節點已被移除），沒有轉換時回傳 null。
     */
    function processTextNodeBold(textNode) {
        const text = textNode.textContent;
        // 匹配同一行中 ** 開頭和結尾的文字（不包含換行，使用非貪婪匹配避免跨區塊）
        const regex = /\*\*([^\n]+?)\*\*/g;

        if (regex.test(text)) {
            const parent = textNode.parentNode;
            if (!parent) {
                return null;
            }
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

            // 插入後 fragment 會被清空，所以先記下有哪些新節點
            const insertedNodes = Array.from(fragment.childNodes);

            // 替換原文字節點
            parent.replaceChild(fragment, textNode);
            return insertedNodes;
        }

        return null;
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
            if (!parent) {
                return false;
            }
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
     * 依序對文字節點套用粗體與行內程式碼轉換。
     * 舊版先呼叫 processTextNodeBold(node) 再呼叫 processTextNodeCode(node)；但粗體轉換一旦成功，
     * 原文字節點已被替換出 DOM，parentNode 為 null，同一段文字只要同時含有 ** 與 `
     * （例如「執行 **重要** 的 `npm install`」）就會丟出 TypeError，整批翻譯區塊的處理就此中斷，
     * 反引號也不會被轉換。改為對粗體轉換後的新節點（含 <strong> 內的文字）繼續處理行內程式碼，
     * 結果與舊版「下一輪重新掃描時才補轉換」的最終狀態相同。
     */
    function processTextNode(textNode) {
        const insertedNodes = processTextNodeBold(textNode);
        if (!insertedNodes) {
            processTextNodeCode(textNode);
            return;
        }

        for (const node of insertedNodes) {
            if (node.nodeType === Node.TEXT_NODE) {
                processTextNodeCode(node);
            } else if (node.firstChild?.nodeType === Node.TEXT_NODE) {
                processTextNodeCode(node.firstChild);
            }
        }
    }

    /**
     * 遞迴處理元素及其子節點
     */
    function processElement(element) {
        if (shouldSkipElement(element)) {
            return;
        }

        // 所有轉換規則都需要 ** 或 ` 才可能成立；兩者都沒有就不必序列化 innerHTML、也不必走訪子節點。
        // 絕大多數譯文不含 Markdown 殘留，這個檢查讓處理成本降到只剩一次 textContent 讀取。
        // （只出現在屬性值裡的 ** 會被略過，那種情況舊版的 regex 反而可能把 <strong> 插進屬性值中。）
        const textContent = element.textContent;
        if (!textContent.includes('**') && !textContent.includes('`')) {
            return;
        }

        // 先處理 innerHTML，處理跨越 HTML 標籤的格式標記
        // 這必須在處理文字節點之前執行，因為文字節點無法存取 HTML 標籤
        if (element.innerHTML) {
            let html = element.innerHTML;
            let modified = false;

            // 移除緊接著 <code> 標籤的反引號
            const cleanedHTML = html.replace(/`(<code>[^<]+<\/code>)`/g, '$1');
            if (html !== cleanedHTML) {
                html = cleanedHTML;
                modified = true;
            }

            // 處理 **<標籤>...</標籤>** 格式，轉換為 <strong><標籤>...</標籤></strong>
            const boldHTML = html.replace(/\*\*(<[^>]+>.*?<\/[^>]+>)\*\*/g, '<strong>$1</strong>');
            if (html !== boldHTML) {
                html = boldHTML;
                modified = true;
            }

            // 處理 **文字（<code>...</code>）** 格式，轉換為 <strong>文字（<code>...</code>）</strong>
            // 針對包含全形括號且結尾為 ）** 的情況
            const boldWithFullWidthParens = html.replace(/\*\*([^\*]+?（.*?）)\*\*/g, '<strong>$1</strong>');
            if (html !== boldWithFullWidthParens) {
                html = boldWithFullWidthParens;
                modified = true;
            }

            if (modified) {
                setInnerHTML(element, html);
            }
        }

        const childNodes = Array.from(element.childNodes);

        for (const node of childNodes) {
            if (node.nodeType === Node.TEXT_NODE) {
                processTextNode(node);
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                processElement(node);
            }
        }
    }

    /**
     * 處理一批翻譯區塊。每個區塊各自 try/catch，單一區塊出錯不會中斷整批處理。
     */
    function processWrappers(wrappers) {
        let count = 0;

        for (const wrapper of wrappers) {
            // 排程等待期間區塊可能已被移除（例如使用者切換回原文）
            if (!wrapper.isConnected) {
                continue;
            }
            try {
                processElement(wrapper);
            } catch (error) {
                console.warn(`${LOG_PREFIX} 處理翻譯區塊時發生錯誤：`, error);
            }
            count++;
        }

        if (count > 0) {
            console.log(`${LOG_PREFIX} 已處理 ${count} 個翻譯區塊`);
        }
    }

    /**
     * 修正所有翻譯目標包裝器中的格式（只在初始化時對整頁執行一次）
     */
    function fixTranslationFormat() {
        // 選取所有沉浸式翻譯的目標包裝器
        processWrappers(document.querySelectorAll(WRAPPER_SELECTOR));
    }

    // 等待處理的翻譯區塊；用 Set 合併同一段時間內的多次變動
    const pendingWrappers = new Set();
    let flushTimer = null;

    /**
     * 變動發生在翻譯區塊內（沉浸式翻譯稍後才填入或改寫譯文）時，用 closest() 往上找到所屬區塊。
     * 只往上找、不往下搜尋：mutation.target 可能是 body 這類大型節點，對它 querySelectorAll() 等於掃整頁。
     */
    function collectFromTarget(node) {
        const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
        const wrapper = element?.closest(WRAPPER_SELECTOR);
        if (wrapper) {
            pendingWrappers.add(wrapper);
            return true;
        }
        return false;
    }

    /**
     * 新加入的節點本身是翻譯區塊，或包含翻譯區塊時，只在這個新子樹內往下搜尋。
     */
    function collectFromAddedNode(node) {
        if (node.nodeType !== Node.ELEMENT_NODE) {
            return;
        }
        if (node.matches(WRAPPER_SELECTOR)) {
            pendingWrappers.add(node);
            return;
        }
        node.querySelectorAll(WRAPPER_SELECTOR).forEach((wrapper) => pendingWrappers.add(wrapper));
    }

    function flush() {
        flushTimer = null;
        const wrappers = Array.from(pendingWrappers);
        pendingWrappers.clear();

        processWrappers(wrappers);

        // 丟棄自己改寫 DOM 所產生的變動紀錄，避免剛處理完的區塊又被排入下一輪。
        // flush 在獨立的 setTimeout task 中同步執行，這段期間只有本腳本會改動 DOM，
        // 因此 takeRecords() 取走的只會是自己造成的紀錄。
        observer.takeRecords();
    }

    function scheduleFlush() {
        if (flushTimer !== null || pendingWrappers.size === 0) {
            return;
        }
        // 與舊版相同延遲 100ms，讓沉浸式翻譯有時間把譯文完整填入。
        // 已排程時不重設計時器（節流而非防抖），持續有新譯文進來時仍保證每 100ms 處理一批。
        flushTimer = setTimeout(flush, 100);
    }

    /**
     * 使用 MutationObserver 監控 DOM 變化
     *
     * 舊版只要偵測到任何新的翻譯區塊，就每次各自排一個 setTimeout，對「整頁所有」翻譯區塊重新處理，
     * 而且每一層元素都重新序列化 innerHTML。沉浸式翻譯是隨捲動逐段翻譯的，長文章會隨段落數呈平方成長。
     * 現在只處理實際新增或內容有變動的區塊，並把同一段時間內的變動合併成一批。
     */
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            // 父節點已在翻譯區塊內時，新加入的子節點必然也在同一個區塊內
            if (collectFromTarget(mutation.target)) {
                continue;
            }
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(collectFromAddedNode);
            }
        }
        scheduleFlush();
    });

    function observeTranslations() {
        // XML、SVG 等文件沒有 body（@match 也涵蓋 file:// 與這類網址），退回觀察根元素，避免 observe(null) 丟出例外。
        const root = document.body || document.documentElement;
        if (!root) {
            return;
        }

        // characterData：沉浸式翻譯就地改寫既有文字節點時也要重新處理；舊版是靠下一次「整頁重掃」才順便補上。
        observer.observe(root, {
            childList: true,
            subtree: true,
            characterData: true
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
