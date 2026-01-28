// ==UserScript==
// @name         Blur Keywords
// @version      0.1.0
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

    // ============ 工具函數 ============

    /**
     * 檢查是否應該處理此節點
     */
    function shouldProcessNode(node) {
        // 忽略指令碼、樣式和元素
        if (node.tagName && ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(node.tagName)) {
            return false;
        }

        // 忽略已經處理過的節點
        if (node.classList && node.classList.contains(BLUR_CLASS)) {
            return false;
        }

        return true;
    }

    /**
     * 在文字節點中查找並模糊關鍵字
     */
    function processTextNode(node) {
        const text = node.textContent;
        if (!text || text.trim().length === 0) {
            return;
        }

        let hasMatches = false;
        let html = text;

        // 遍歷所有關鍵字
        BLUR_KEYWORDS.forEach(keyword => {
            if (!keyword || keyword.trim().length === 0) {
                return;
            }

            const flags = CASE_SENSITIVE ? 'g' : 'gi';
            const regex = new RegExp(`(${escapeRegExp(keyword)})`, flags);

            if (regex.test(html)) {
                hasMatches = true;
                html = html.replace(regex, (match) => {
                    return `<span class="${BLUR_CLASS}" title="此內容已模糊">${match}</span>`;
                });
            }
        });

        // 如果有匹配，替換節點內容
        if (hasMatches) {
            const span = document.createElement('span');
            span.innerHTML = html;
            node.parentNode.replaceChild(span, node);
        }
    }

    /**
     * 檢查圖片 URL 是否應該被模糊
     */
    function shouldBlurImage(imageUrl) {
        if (!imageUrl || imageUrl.trim().length === 0) {
            return false;
        }

        return BLUR_IMAGE_URLS.some(blurUrl => {
            const flags = CASE_SENSITIVE ? '' : 'i';
            const regex = new RegExp(escapeRegExp(blurUrl), flags);
            return regex.test(imageUrl);
        });
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
     * 處理圖片節點並應用模糊效果
     */
    function blurMatchedImages(element) {
        const images = element.querySelectorAll ? element.querySelectorAll('img') : [];
        images.forEach(img => {
            const imageUrls = getImageUrls(img);
            // 如果任何一個 URL 匹配，就應用模糊效果
            const shouldBlur = imageUrls.some(url => shouldBlurImage(url));
            if (shouldBlur) {
                img.classList.add(BLUR_CLASS);
                img.title = img.title || '此圖片已模糊';
            }
        });
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
        if (!shouldProcessNode(element)) {
            return;
        }

        // 處理子節點
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
     * 初始化腳本
     */
    function init() {
        if (BLUR_KEYWORDS.length === 0 && BLUR_IMAGE_URLS.length === 0) {
            console.warn('BlurKeywords: 未設定任何關鍵字或圖片，腳本已停用');
            return;
        }

        // 首次掃描整個文檔
        blurKeywordsInElement(document.body);
        blurMatchedImages(document.body);

        // 設置 MutationObserver 監視 DOM 變化
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.addedNodes.length > 0) {
                    mutation.addedNodes.forEach((node) => {
                        if (node.nodeType === Node.ELEMENT_NODE || node.nodeType === Node.TEXT_NODE) {
                            if (node.nodeType === Node.TEXT_NODE) {
                                processTextNode(node);
                            } else {
                                blurKeywordsInElement(node);
                                blurMatchedImages(node);
                            }
                        }
                    });
                }
            });
        });

        // 配置觀察器選項
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: false,
        });

        // 針對 SPA 頁面：定期掃描新增的圖片（解決動態加載和 srcset 更新問題）
        setInterval(() => {
            const images = document.querySelectorAll('img');
            images.forEach(img => {
                // 只處理尚未標記的圖片
                if (!img.classList.contains(BLUR_CLASS)) {
                    const imageUrls = getImageUrls(img);
                    const shouldBlur = imageUrls.some(url => shouldBlurImage(url));
                    if (shouldBlur) {
                        img.classList.add(BLUR_CLASS);
                        img.title = img.title || '此圖片已模糊';
                    }
                }
            });
        }, 1000);

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

        // 監聽圖片加載完成事件
        document.addEventListener('load', (event) => {
            if (event.target.tagName === 'IMG') {
                const img = event.target;
                const imageUrls = getImageUrls(img);
                const shouldBlur = imageUrls.some(url => shouldBlurImage(url));
                if (shouldBlur && !img.classList.contains(BLUR_CLASS)) {
                    img.classList.add(BLUR_CLASS);
                    img.title = img.title || '此圖片已模糊';
                }
            }
        }, true);

        console.log(`BlurKeywords: 已啟動，監視 ${BLUR_KEYWORDS.length} 個關鍵字，${BLUR_IMAGE_URLS.length} 個圖片 URL`);
    }

    // ============ 頁面加載後初始化 ============
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
