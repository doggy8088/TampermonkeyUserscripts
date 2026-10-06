// ==UserScript==
// @name         Azure Portal: 將所有敏感資料進行隱碼處理
// @version      0.3.0
// @description  移除在 Azure Portal 之中所有敏感資訊
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/AzurePortalMask.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/AzurePortalMask.user.js
// @author       Will Huang
// @match        *://*.portal.azure.com/*
// @match        *://*.portal.azure.net/*
// @match        *://portal.azure.com/*
// @match        *://functions.azure.com/*
// @match        *://portal.azure.us/*
// @match        *://*.qnamaker.ai/*
// @match        *://adf.azure.com/*
// @match        *://ms-adf.azure.com/*
// @match        *://portal.azure.cn/*
// @run-at       document-idle
// @icon         https://www.google.com/s2/favicons?sz=64&domain=portal.azure.com
// @grant        GM_addStyle
// ==/UserScript==

/*
div#mectrl_currentAccount_primary,
div#mectrl_currentAccount_secondary,
div#mectrl_rememberedAccount_0_secondary,
div#mectrl_rememberedAccount_1_secondary,
div#mectrl_rememberedAccount_2_secondary,
div#mectrl_rememberedAccount_3_secondary,
div#mectrl_rememberedAccount_4_secondary,
div#mectrl_rememberedAccount_5_secondary,
div#mectrl_rememberedAccount_6_secondary,
div#mectrl_rememberedAccount_7_secondary,
div#mectrl_rememberedAccount_8_secondary,
div#mectrl_rememberedAccount_9_secondary,
div.fxs-avatarmenu-username,
div.fxs-avatarmenu-tenant {
  filter: blur(10px);
}
*/
(function () {
    'use strict';
    const isMaskedKeyName = 'isMasked';
    const maskEnabledClassName = 'az-mask-enabled';
    const sensitiveDataRegex = /^([a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12})$/;
    /* ** Original regex prior to 2019-04-18 **
     * const sensitiveDataRegex = /^\s*([a-z0-9]{8}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{4}-[a-z0-9]{12})|((([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,})))\s*$/;
     *
     */
    const sensitiveDataClassName = 'azdev-sensitive';
    const blurCss = 'filter: blur(10px); pointer-events: none;';
    const tagNamesToMatch = ['DIV']; // uppercase

    // add CSS style to blur
    GM_addStyle(
            `.${maskEnabledClassName} .${sensitiveDataClassName} { ${blurCss} }\n` +
            `.${maskEnabledClassName} .fxs-avatarmenu-username { display: none }\n` +
            `.${maskEnabledClassName} input.azc-bg-light { ${blurCss} }\n` +
            `.${maskEnabledClassName} a.fxs-topbar-reportbug { display:none; }\n` +
            `.${maskEnabledClassName} div.fxs-topbar-internal { display:none; }\n` +
            `.${maskEnabledClassName} .fxs-mecontrol-flyout { ${blurCss} }\n` +
            `.${maskEnabledClassName} #mectrl_currentAccount_secondary { ${blurCss} }\n` +
            `.${maskEnabledClassName} .fxs-avatarmenu-tenant-container { ${blurCss} }\n` +
            `.${maskEnabledClassName} .fxs-avatarmenu-tenant-image { display:none; }\n` +
            `.${maskEnabledClassName} .fxs-avatarmenu-tenant-image-container::after {
                                          content: "";
                                          display: inline-block;
                                          background: url(https://portal.azure.com/Content/static/MsPortalImpl/AvatarMenu/AvatarMenu_defaultAvatarSmall.png) no-repeat;
                                          width: 28px;
                                          height: 28px;
                                          border-radius: 28px;
                                      }\n` +
            `.${maskEnabledClassName} textarea.bg-white { ${blurCss} }\n` +
            `.${maskEnabledClassName} span.qna-cs-user-id { display: none }\n` +
            `.${maskEnabledClassName} div.directory-list-element-id { ${blurCss} }\n` +
            `.${maskEnabledClassName} .userEmail { display:none; }\n` +
            `.${maskEnabledClassName} .user-email { ${blurCss} }\n`
    );

    document.body.classList.add(maskEnabledClassName);

    // GUID 的固定長度。元素的文字（去除頭尾空白）一旦超過這個長度，就不可能「剛好是 GUID」。
    const guidLength = 36;
    const tagSelector = tagNamesToMatch.join();

    function isTargetTag(el) {
        return tagNamesToMatch.includes(el.tagName);
    }

    /**
     * 取得元素去除頭尾空白後的文字，但只在長度不超過 GUID 時才回傳，否則回傳 null。
     * 結果等同 el.textContent.trim()：以 TreeWalker 依文件順序累加文字節點（textContent 的定義），
     * 一旦去除空白後超過 GUID 長度就提早結束（再往後累加只會更長，不可能剛好是 GUID）。
     * 這樣判斷大型容器時只需讀取開頭少量文字，不必像 textContent 一樣串接整棵子樹；
     * 原本對每個 DIV 都計算完整的 textContent，巢狀的大型區塊會變成 O(元素數 × 深度) 的成本。
     */
    function getShortTrimmedText(el) {
        const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
        let text = '';
        while (walker.nextNode()) {
            text += walker.currentNode.data;
            if (text.trim().length > guidLength) return null;
        }
        return text.trim();
    }

    /**
     * 判斷元素是否為敏感資料（沿用原本的兩條規則）：
     * 1. 整個元素的文字去除頭尾空白後剛好是 GUID；
     * 2. 第一個子節點的值剛好是 GUID（例如 <div>GUID<button>複製</button></div>，整體文字較長）。
     * text 參數可傳入呼叫端已取得的 getShortTrimmedText() 結果（null 代表文字過長），避免重複計算。
     * 原本初次掃描沒有 trim()、觀察器有 trim()，兩邊判斷不一致；現在統一使用同一個函式。
     */
    function isSensitiveElement(el, text = getShortTrimmedText(el)) {
        if (text !== null && sensitiveDataRegex.test(text)) return true;
        const firstValue = el.firstChild?.nodeValue;
        return !!firstValue && sensitiveDataRegex.test(firstValue);
    }

    function markIfSensitive(el, text) {
        if (el.classList.contains(sensitiveDataClassName)) return;
        if (isSensitiveElement(el, text)) {
            // console.log('Sensitive data found:', el);
            el.classList.add(sensitiveDataClassName);
        }
    }

    // add class to elements already on the screen
    document.querySelectorAll(tagSelector).forEach(el => markIfSensitive(el));

    /**
     * add class to elements that are added to DOM later
     *
     * 原本的觀察器有幾個問題：
     * - 只處理「target 是 DIV」的 childList 變動，並且只掃描 target 的子孫、不檢查 target 自己。
     *   因此以下情況中，文字剛好是 GUID 的 DIV 都不會被隱碼，敏感資料直接外露：
     *   1) DIV 的文字被就地更新成 GUID（Knockout 等框架常直接改文字節點）；
     *   2) GUID 被插入 DIV 底下的 <span>、<td>、<li> 等非 DIV 子元素：變動的 target 不是 DIV，
     *      整筆 mutation 被略過，外層那個文字剛好是 GUID 的 DIV 也就沒有被重新檢查。
     * - characterData 變動時取 m.target.parentNode，若文字節點已被移除就是 null，
     *   呼叫 querySelectorAll 會丟出 TypeError，中斷整批 mutation 的處理，後面的資料也跟著漏掉。
     * - 每次變動都對 target 整棵子樹 querySelectorAll('DIV')，並逐一計算每個 DIV 的 textContent；
     *   大型容器的一次小變動就要重掃上千個元素，在變動頻繁的 Azure Portal 上非常耗 CPU。
     *
     * 改為只檢查「真正可能改變」的元素：
     * - 新增的元素：掃描該元素本身與其 DIV 子孫（新內容一定要檢查）。
     * - 子節點或文字被改動的元素：檢查它自己與祖先。祖先的文字一定包含子孫的文字，往上走到
     *   某一層的文字超過 GUID 長度時，更上層也不可能剛好是 GUID，就可以停止，只需檢查少數幾層。
     * 每批次以 Set 去除重複，同一個元素只檢查一次；處理仍在觀察器回呼中同步完成
     * （在瀏覽器繪製前），不會先閃現未隱碼的內容。
     *
     * 涵蓋範圍：會被加上隱碼 class 的仍然只有 tagNamesToMatch 所列的元素（目前只有 DIV），
     * 與初次掃描的範圍一致；上面的往上檢查只是為了找到「文字剛好是 GUID 的 DIV 祖先」。
     * 若 GUID 所在的元素沒有這樣的 DIV 祖先（例如直接放在表格儲存格 <td> 中、外層 DIV 還有其他文字），
     * 依舊不會被隱碼。這是沿用原本設定的涵蓋範圍，刻意不在本次擴大，避免改變隱碼的對象；
     * 若需要涵蓋，請在 tagNamesToMatch 加入對應的標籤名稱（大寫），初次掃描與觀察器會一併生效。
     */
    const observer = new MutationObserver(mutations => {
        // tested / walked 只在「這一次回呼」中共用，讓同一批次內重複出現的元素只檢查一次。
        // 這不會讓元素停在「某一筆 record 當下的舊狀態」：MutationObserver 的回呼是在整批變動
        // 都已完成之後才以 microtask 執行，回呼內讀取的 textContent／firstChild 一律是「最終的 DOM」，
        // 同一個元素不論在批次中被改了幾次，第一次檢查時看到的就已經是最後的結果。
        // 若同一個元素在之後的 task 又被改動，下一次回呼會建立新的 Set，重新檢查。
        // 注意：與原本的設計相同，隱碼 class 一旦加上就不會移除（內容之後若改成非 GUID 仍維持模糊）。
        const tested = new Set();
        const walked = new Set();

        const test = (el, text) => {
            if (tested.has(el)) return;
            tested.add(el);
            markIfSensitive(el, text);
        };

        const checkSelfAndAncestors = (start) => {
            for (let node = start; node; node = node.parentElement) {
                // 本批次已經從這個節點往上檢查過（或在這裡停下），上層不必再走一次。
                if (walked.has(node)) return;
                walked.add(node);

                const text = getShortTrimmedText(node);
                if (isTargetTag(node)) test(node, text);
                if (text === null) return;
            }
        };

        const scanSubtree = (root) => {
            if (isTargetTag(root)) test(root);
            root.querySelectorAll(tagSelector).forEach(el => test(el));
        };

        for (const m of mutations) {
            if (m.type === 'characterData') {
                // 文字節點可能已在同一批次中被移除，此時 parentElement 為 null，直接略過。
                const parent = m.target.parentElement;
                if (parent && parent.isConnected) checkSelfAndAncestors(parent);
                continue;
            }

            // childList：target 的子節點變了，它自己的文字也跟著改變。
            if (m.target.nodeType === Node.ELEMENT_NODE && m.target.isConnected) {
                checkSelfAndAncestors(m.target);
            }

            m.addedNodes.forEach(node => {
                // 只掃描仍在文件中的新元素；文字節點的變化已由上面的 target 檢查涵蓋。
                if (node.nodeType === Node.ELEMENT_NODE && node.isConnected) scanSubtree(node);
            });
        }
    });

    const config = {
        attributes: false,
        characterData: true,
        childList: true,
        subtree: true
    };
    observer.observe(document.body, config);

})();
