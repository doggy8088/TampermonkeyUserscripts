// ==UserScript==
// @name         Blur Keywords
// @version      0.1.1
// @description  模糊處理網頁中的敏感關鍵字
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/BlurKeywords.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/BlurKeywords.user.js
// @author       Will Huang
// @match        *://*/*
// @run-at       document-idle
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // ============ 配置區域 ============
    // 設定不應該出現在網頁上的文字清單
    const BLUR_KEYWORDS = [
        // 在這裡添加你想要模糊的關鍵字，例如：
        // '敏感詞',
        // '機密內容',
        // '私密資訊',
    ];

    // 設定應該模糊的圖片 URL（支援部分匹配）
    const BLUR_IMAGE_URLS = [
        // 在這裡添加你想要模糊的圖片 URL，例如：
        // 'example.com/sensitive-image',
        // '/private/',
    ];

    // 模糊效果的強度（0-20，數值越高模糊越明顯）
    const BLUR_STRENGTH = 5;

    // 是否對大小寫敏感
    const CASE_SENSITIVE = false;

    // ============ 前置檢查與預先編譯 ============

    // 沒有設定任何關鍵字或圖片時直接停用
    // 設計意圖：本腳本 @match 為 *://*/*，會在每個網頁（包含每個 iframe）執行。
    // 舊版是先注入 CSS、等到 init() 才發現沒有設定，等於在所有網頁都多插入一個 <style>；
    // 現在提前到最前面判斷，未設定時完全不碰頁面。
    // 關鍵字沿用舊版規則：空字串或純空白的關鍵字一律忽略。
    // 圖片 URL 則維持舊版行為「不過濾空字串」（舊版的空字串規則會比對到所有圖片），只排除非字串的設定值，
    // 避免 escapeRegExp() 對非字串呼叫 replace() 而讓整支腳本丟出例外。
    const ACTIVE_KEYWORDS = BLUR_KEYWORDS.filter(keyword => typeof keyword === 'string' && keyword.trim().length > 0);
    const ACTIVE_IMAGE_URLS = BLUR_IMAGE_URLS.filter(url => typeof url === 'string');

    if (ACTIVE_KEYWORDS.length === 0 && ACTIVE_IMAGE_URLS.length === 0) {
        console.warn('BlurKeywords: 未設定任何關鍵字或圖片，腳本已停用');
        return;
    }

    // 所有關鍵字合併成「一個」正規表示式，只在啟動時編譯一次
    // 設計意圖：
    // 1. 舊版每處理一個文字節點，就替每個關鍵字各 new RegExp() 一次，頁面越大、關鍵字越多就越慢。
    // 2. 舊版是在「已經插入 <span> 標記的 HTML 字串」上，依序替換下一個關鍵字；
    //    如果某個關鍵字剛好出現在標記裡（例如 blur、span、class、此內容），就會把標記本身改壞。
    //    合併成單一正規表示式後，每段文字只掃描一次，不會再碰到自己插入的標記。
    // 3. 依長度由長到短排序：「機密」與「機密內容」同時存在時，優先完整模糊較長的「機密內容」，
    //    不會只模糊前兩個字而把「內容」露出來。
    const KEYWORD_REGEX = ACTIVE_KEYWORDS.length > 0
        ? new RegExp(
            ACTIVE_KEYWORDS
                .slice()
                .sort((a, b) => b.length - a.length)
                .map(keyword => escapeRegExp(keyword))
                .join('|'),
            CASE_SENSITIVE ? 'g' : 'gi'
        )
        : null;

    // 圖片 URL 比對規則同樣只編譯一次（舊版每張圖片、每個 URL 每秒都重新 new RegExp()）
    // 刻意不加 g 旗標：test() 不會受 lastIndex 狀態影響
    const IMAGE_URL_REGEXES = ACTIVE_IMAGE_URLS.map(blurUrl => new RegExp(escapeRegExp(blurUrl), CASE_SENSITIVE ? '' : 'i'));

    // ============ CSS 樣式注入 ============
    // 創建唯一的類名以避免衝突
    const BLUR_CLASS = 'blur-keyword-' + Date.now();

    GM_addStyle(`
        .${BLUR_CLASS} {
            filter: blur(${BLUR_STRENGTH}px);
            display: inline-block;
            transition: filter 0.3s ease;
        }

        .${BLUR_CLASS}:hover {
            filter: blur(0px);
        }
    `);

    // 不處理的區域（連同整個子樹）
    // - script、style、noscript：不是顯示給人看的文字（與舊版相同）。
    // - textarea：新增。它的子文字節點就是表單的預設值，舊版把它換成 <span> 後，
    //   textarea 的內容會整個消失，送出表單時資料也跟著不見；而且 textarea 裡的 HTML 本來就不會被渲染，
    //   模糊效果根本不會出現。
    // - 已模糊的元素（與舊版相同）。
    const EXCLUDED_SELECTOR = `script, style, noscript, textarea, .${BLUR_CLASS}`;

    // ============ 工具函數 ============

    /**
     * 檢查是否應該處理此節點
     */
    function shouldProcessNode(node) {
        // 忽略指令碼、樣式、textarea 與已經處理過的節點
        // 使用 matches() 而不是比對 tagName：SVG 裡的 <style> 的 tagName 是小寫，舊版的大寫比對會漏掉
        if (node.nodeType === Node.ELEMENT_NODE && node.matches(EXCLUDED_SELECTOR)) {
            return false;
        }

        return true;
    }

    /**
     * 檢查節點是否位於不處理的區域「內部」（從父元素開始往上找）
     * 設計意圖：MutationObserver 回報的新增節點，常常是排除區域裡面的子孫節點，
     * 例如 CSS-in-JS 套件持續把文字節點塞進 <style>。舊版只檢查節點本身，這些內容仍會被處理。
     */
    function isInsideExcludedRegion(node) {
        const parent = node.parentElement;
        return parent !== null && parent.closest(EXCLUDED_SELECTOR) !== null;
    }

    /**
     * 在文字節點中查找並模糊關鍵字
     * 設計意圖（安全性修正）：
     * 舊版把文字節點的內容「原封不動」當成 HTML 字串，再指派給 innerHTML。
     * 如果頁面文字本身就含有 < 或 &（例如留言裡的「<img src=x onerror=alert(1)>」、程式教學文章），
     * 這些文字會被重新解析成真正的 HTML 元素並執行（XSS），或是 &amp; 這類字樣被解碼而改變內容；
     * 在 Trusted Types 網站上指派 innerHTML 更會直接丟出例外。
     * 現在改用 DOM API 逐段建立「文字節點 + 模糊 <span>」，原文永遠只會被當成純文字。
     * 產生的結構與舊版相同：外層一個沒有 class 的 <span> 包住整段文字，關鍵字各自包在帶有
     * BLUR_CLASS 與 title="此內容已模糊" 的 <span> 中。
     */
    function processTextNode(node) {
        if (!KEYWORD_REGEX) {
            return;
        }

        const text = node.nodeValue;
        if (!text || text.trim().length === 0) {
            return;
        }

        // MutationObserver 回報的新增節點可能已經被網站移除，沒有父節點時無法替換（舊版會丟出 TypeError，
        // 並中斷同一批 mutation 中其餘節點的處理）
        const parent = node.parentNode;
        if (!parent) {
            return;
        }

        let wrapper = null;
        let lastIndex = 0;
        let match;
        KEYWORD_REGEX.lastIndex = 0;
        while ((match = KEYWORD_REGEX.exec(text)) !== null) {
            // 第一次比對成功時才建立外層容器，沒有比對到關鍵字的文字節點完全不動
            if (!wrapper) {
                wrapper = document.createElement('span');
            }
            if (match.index > lastIndex) {
                wrapper.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
            }
            const blurSpan = document.createElement('span');
            blurSpan.className = BLUR_CLASS;
            blurSpan.title = '此內容已模糊';
            blurSpan.textContent = match[0];
            wrapper.appendChild(blurSpan);
            lastIndex = match.index + match[0].length;
        }

        // 如果有匹配，替換節點內容
        if (wrapper) {
            if (lastIndex < text.length) {
                wrapper.appendChild(document.createTextNode(text.slice(lastIndex)));
            }
            parent.replaceChild(wrapper, node);
        }
    }

    /**
     * 檢查圖片 URL 是否應該被模糊
     */
    function shouldBlurImage(imageUrl) {
        if (!imageUrl || imageUrl.trim().length === 0) {
            return false;
        }

        return IMAGE_URL_REGEXES.some(regex => regex.test(imageUrl));
    }

    /**
     * 從圖片元素中提取所有可能的 URL 來源
     */
    function getImageUrls(img) {
        const urls = [];

        // 1. 標準 src 屬性
        if (img.src) urls.push(img.src);

        // 2. srcset 屬性（提取 URL 部分）
        if (img.srcset) {
            const srcsetUrls = img.srcset.split(',').map(src => src.split(/\s+/)[0].trim());
            urls.push(...srcsetUrls);
        }

        // 3. data-src 和其他 data-* 屬性（lazy loading）
        Object.keys(img.dataset).forEach(key => {
            if (key.toLowerCase().includes('src') || key.toLowerCase().includes('image')) {
                const value = img.dataset[key];
                if (value) urls.push(value);
            }
        });

        // 4. picture 元素中的 source
        const picture = img.closest('picture');
        if (picture) {
            const sources = picture.querySelectorAll('source');
            sources.forEach(source => {
                if (source.srcset) {
                    const srcsetUrls = source.srcset.split(',').map(src => src.split(/\s+/)[0].trim());
                    urls.push(...srcsetUrls);
                }
            });
        }

        // 5. style 中的 background-image
        const computedStyle = window.getComputedStyle(img);
        const bgImage = computedStyle.backgroundImage;
        if (bgImage && bgImage !== 'none') {
            const match = bgImage.match(/url\(['"]?([^'")]+)['"]?\)/);
            if (match) urls.push(match[1]);
        }

        // 6. 其他常見的自訂屬性
        const customAttrs = ['data-original', 'data-original-src', 'data-image', 'data-poster', 'data-thumb'];
        customAttrs.forEach(attr => {
            const value = img.getAttribute(attr);
            if (value) urls.push(value);
        });

        return urls.filter((url, index, arr) => url && arr.indexOf(url) === index);
    }

    /**
     * 檢查單張圖片，符合條件就套用模糊效果
     * 設計意圖：舊版在「新增節點處理、定期掃描、圖片 load 事件」三個地方各寫了一份相同的判斷，
     * 這裡收斂成單一函式；已模糊的圖片直接略過，不必再計算 getComputedStyle 等較昂貴的資訊。
     */
    function blurImageIfMatched(img) {
        if (img.classList.contains(BLUR_CLASS)) {
            return;
        }
        const imageUrls = getImageUrls(img);
        // 如果任何一個 URL 匹配，就應用模糊效果
        if (imageUrls.some(url => shouldBlurImage(url))) {
            img.classList.add(BLUR_CLASS);
            img.title = img.title || '此圖片已模糊';
        }
    }

    /**
     * 處理圖片節點並應用模糊效果
     */
    function blurMatchedImages(element) {
        if (IMAGE_URL_REGEXES.length === 0 || !element.querySelectorAll) {
            return;
        }
        // 新增的節點本身就是 <img> 時（lazy loading 套件常直接插入 <img>），
        // querySelectorAll 只會找子孫元素而漏掉它自己，所以要另外檢查
        if (element.localName === 'img') {
            blurImageIfMatched(element);
        }
        element.querySelectorAll('img').forEach(blurImageIfMatched);
    }

    /**
     * 轉義正則表達式中的特殊字符
     */
    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /**
     * 遞迴處理節點樹中的所有文字
     */
    function blurKeywordsInElement(element) {
        // 只設定了圖片 URL 時，完全不需要走訪文字
        if (!KEYWORD_REGEX || !shouldProcessNode(element)) {
            return;
        }

        // 處理子節點（先複製成陣列：處理過程中文字節點會被替換，不能直接走訪活的 childNodes）
        const childNodes = Array.from(element.childNodes);
        childNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) {
                // 文字節點
                processTextNode(node);
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                // 元素節點，遞迴處理
                blurKeywordsInElement(node);
            }
        });
    }

    /**
     * 掃描整頁圖片（定期掃描與分頁切回前景時使用）
     */
    function scanAllImages() {
        document.querySelectorAll('img').forEach(blurImageIfMatched);
    }

    /**
     * 初始化腳本
     */
    function init() {
        // 在 XML、SVG 等沒有 <body> 的文件中無事可做（舊版會在 shouldProcessNode(null) 丟出 TypeError）
        if (!document.body) {
            return;
        }

        // 首次掃描整個文檔
        blurKeywordsInElement(document.body);
        blurMatchedImages(document.body);

        // 設置 MutationObserver 監視 DOM 變化
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType !== Node.ELEMENT_NODE && node.nodeType !== Node.TEXT_NODE) {
                        return;
                    }
                    // 位於 script、style、textarea 或已模糊區域內的新增節點不處理
                    if (isInsideExcludedRegion(node)) {
                        return;
                    }
                    if (node.nodeType === Node.TEXT_NODE) {
                        processTextNode(node);
                    } else {
                        blurKeywordsInElement(node);
                        blurMatchedImages(node);
                    }
                });
            });
        });

        // 配置觀察器選項
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: false,
        });

        // 以下三項都只跟圖片有關，沒有設定圖片 URL 時不需要註冊
        if (IMAGE_URL_REGEXES.length > 0) {
            // 針對 SPA 頁面：定期掃描新增的圖片（解決動態加載和 srcset 更新問題）
            // 設計意圖：分頁在背景（document.hidden）時畫面不會被看到，跳過掃描以節省 CPU；
            // 本腳本在所有網站與 iframe 中執行，開著大量分頁時每秒的整頁掃描累積起來相當可觀。
            setInterval(() => {
                if (document.hidden) {
                    return;
                }
                scanAllImages();
            }, 1000);

            // 分頁切回前景時立刻補掃一次，不必等下一次定期掃描，避免敏感圖片短暫露出
            document.addEventListener('visibilitychange', () => {
                if (!document.hidden) {
                    scanAllImages();
                }
            });

            // 監聽圖片加載完成事件（load 事件不會冒泡，所以要用 capture 階段在 document 上統一接收）
            // 沿用舊版的 tagName 比對，不改用 instanceof：userscript 沙箱（隔離環境）中的建構式
            // 與網頁的不同，instanceof 在部分瀏覽器／管理器組合下可能判斷失準
            document.addEventListener('load', (event) => {
                if (event.target.tagName === 'IMG') {
                    blurImageIfMatched(event.target);
                }
            }, true);
        }

        // 監聽 URL 變化（針對 SPA 路由變化）
        let lastUrl = location.href;
        setInterval(() => {
            if (location.href !== lastUrl) {
                lastUrl = location.href;
                // 路由變化時，延遲後重新掃描（等待新內容加載）
                setTimeout(() => {
                    blurKeywordsInElement(document.body);
                    blurMatchedImages(document.body);
                }, 500);
            }
        }, 500);

        console.log(`BlurKeywords: 已啟動，監視 ${ACTIVE_KEYWORDS.length} 個關鍵字，${ACTIVE_IMAGE_URLS.length} 個圖片 URL`);
    }

    // ============ 頁面加載後初始化 ============
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
