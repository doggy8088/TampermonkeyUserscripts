// ==UserScript==
// @name         Claude: 自動校正 Claude AI 聊天介面上的標點符號
// @version      0.2.0
// @description  自動校正 Claude AI 聊天介面上的標點符號，還有替中英文之間加上空格，讓閱讀更順暢。
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ClaudeFixChinesePunctuationMarks.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ClaudeFixChinesePunctuationMarks.user.js
// @author       Will Huang
// @match        https://claude.ai/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // Claude 的每一則 AI 回覆都包在 div[data-is-streaming] 裡（串流中為 "true"、完成後為 "false"），
    // 使用者自己輸入的訊息與輸入框都不在這個容器內，所以只校正這個容器裡的文字。
    const CONTAINER_SELECTOR = 'div[data-is-streaming]';

    // 不處理這些元素（含其子孫）內的文字：程式碼區塊、表單控制項、多媒體與非內容元素。
    // 以 localName（小寫）比對：舊版用 nodeName === 'SVG' 判斷，但 SVG 元素的 nodeName 是小寫 "svg"，
    // 那個條件永遠不成立；改用 localName 之後 HTML 與 SVG 元素都能正確比對。
    const SKIP_TAGS = new Set([
        'pre', 'code', 'script', 'style', 'textarea', 'input', 'select', 'option', 'button',
        'object', 'embed', 'audio', 'video', 'canvas', 'img', 'svg', 'iframe', 'frame', 'frameset',
        'noframes', 'noscript', 'template', 'applet', 'area', 'map', 'base', 'meta', 'link'
    ]);

    // 記錄每個文字節點「最後一次校正後」的值。
    // - nodeValue 仍等於這個值，代表網站沒有改寫過，直接略過，不必再跑一次十多道 regex。
    // - 自己寫回 nodeValue 也會觸發 characterData 變動；有了這份紀錄，下一輪會立即略過，不會無限循環。
    // 使用 WeakMap，文字節點被 React 移除後紀錄會自動回收。
    const fixedValues = new WeakMap();

    // 等待下一個畫面更新前要校正的回覆容器。用 Set 合併同一個 frame 內的多次變動。
    const pendingContainers = new Set();
    let flushScheduled = false;

    /**
     * 校正單一段文字。規則與順序與 0.1.0 完全相同，只修正最後兩條的先後順序：
     * 舊版先把「創建」換成「建立」，導致後面的「創建對象 → 建立物件」永遠比對不到，
     * 結果只會得到「建立對象」；現在先處理較長的詞，才符合原本的意圖。
     */
    function fixText(text) {
        return text

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

            .replace(/創建對象/g, '建立物件')
            .replace(/創建/g, '建立');
    }

    function fixTextNode(textNode) {
        const value = textNode.nodeValue;
        if (fixedValues.get(textNode) === value) {
            return;
        }

        const fixed = fixText(value);

        // 只有內容真的改變才寫回：舊版每 60ms 就把所有文字節點重新指派一次 nodeValue（即使沒變），
        // 每次都會產生 DOM 變動、讓瀏覽器重新排版，並打斷使用者正在進行的文字選取。
        if (fixed !== value) {
            textNode.nodeValue = fixed;
        }
        fixedValues.set(textNode, fixed);
    }

    function visitAllTextNodes(element, callback) {
        if (element.nodeType === Node.TEXT_NODE) {
            callback(element);
            return;
        }

        if (element.nodeType !== Node.ELEMENT_NODE || SKIP_TAGS.has(element.localName)) {
            return;
        }

        var child = element.firstChild;
        while (child) {
            visitAllTextNodes(child, callback);
            child = child.nextSibling;
        }
    }

    function fixContainer(container) {
        visitAllTextNodes(container, fixTextNode);
    }

    function fixAll() {
        document.querySelectorAll(CONTAINER_SELECTOR).forEach(fixContainer);
    }

    /**
     * 變動發生在回覆容器內（串流追加文字、React 重新渲染段落、data-is-streaming 改變）時，
     * 用 closest() 往上找到容器並排入待處理清單。只往上找，不往下搜尋：
     * mutation.target 可能是 body 這類大型父節點，對它做 querySelectorAll() 等於每次都掃整頁。
     */
    function collectFromTarget(node) {
        const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
        const container = element?.closest(CONTAINER_SELECTOR);
        if (container) {
            pendingContainers.add(container);
            return true;
        }
        return false;
    }

    /**
     * 新加入的節點本身就是容器，或「包含」容器（例如切換對話時整個訊息列表一次插入）時，
     * 往下找出其中的回覆容器。只對新加入的子樹搜尋，範圍有限。
     */
    function collectFromAddedNode(node) {
        if (node.nodeType !== Node.ELEMENT_NODE) {
            return;
        }
        if (node.matches(CONTAINER_SELECTOR)) {
            pendingContainers.add(node);
            return;
        }
        node.querySelectorAll(CONTAINER_SELECTOR).forEach((c) => pendingContainers.add(c));
    }

    function flush() {
        flushScheduled = false;

        for (const container of pendingContainers) {
            // 排程期間容器可能已被 React 移除（例如切換對話），不必再處理。
            if (container.isConnected) {
                fixContainer(container);
            }
        }
        pendingContainers.clear();

        // 丟棄自己剛才寫回 nodeValue 所產生的變動紀錄。
        // flush 在獨立的 task（requestAnimationFrame）中同步執行，這段期間只有本腳本會改動 DOM，
        // 因此 takeRecords() 取走的只會是自己造成的紀錄，不會吃掉網站的變動。
        observer.takeRecords();
    }

    function scheduleFlush() {
        if (flushScheduled || pendingContainers.size === 0) {
            return;
        }
        flushScheduled = true;

        // 在下一次繪製畫面前校正：串流的新文字不會先以未校正的樣子閃一下，
        // 同一個 frame 內的大量變動也只會處理一次。背景分頁暫停 rAF，切回分頁時才會補做，不浪費資源。
        requestAnimationFrame(flush);
    }

    // 以 MutationObserver 取代舊版的 setInterval(60ms) 輪詢：
    // - 舊版每 60ms 對整頁做 querySelectorAll，串流期間更是每 60ms 把「所有」歷史回覆的文字節點
    //   全部重跑一次 regex 並重設 nodeValue，對話越長越卡。
    // - 舊版靠 isReady 旗標只在「網址改變後第一次看到容器」時校正一次。SPA 切換對話時，只要舊對話的
    //   DOM 還沒被移除、或新對話的訊息分批載入，60ms 後就會被當成已處理完畢，之後才出現的內容永遠不會被校正。
    // 改為只處理實際有變動的回覆容器，不論串流、切換對話或重新渲染都能即時涵蓋。
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            // 父節點已在容器內時，新加入的子節點必然也在同一個容器內，不必再逐一往下搜尋。
            if (collectFromTarget(mutation.target)) {
                continue;
            }

            // 只有 childList 會帶來新節點。characterData（串流時 React 直接改寫既有文字節點）與
            // attributes（data-is-streaming 由 "true" 變為 "false"，對應舊版「串流結束後再校正一次」）
            // 都已由上面的 collectFromTarget() 處理。
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(collectFromAddedNode);
            }
        }
        scheduleFlush();
    });

    observer.observe(document.body, {
        childList: true,
        characterData: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['data-is-streaming']
    });

    // 腳本啟動時頁面上若已經有回覆（例如直接開啟某個對話網址），先全部校正一次。
    fixAll();
    observer.takeRecords();

})();
