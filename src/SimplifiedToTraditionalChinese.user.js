// ==UserScript==
// @name         多奇中文簡繁轉換大師
// @version      1.0.0
// @description  自動識別網頁中的簡體中文並轉換為繁體中文，同時將中國大陸常用詞彙轉換為台灣用語(包含頁面標題、元素屬性值)，支援 SPA 類型網站
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/SimplifiedToTraditionalChinese.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/SimplifiedToTraditionalChinese.user.js
// @author       Will Huang
// @match        *://*/*
// @run-at       document-idle
// @grant        GM_registerMenuCommand
// @require      https://cdn.jsdelivr.net/npm/@willh/opencc-js@1.1.0/dist/umd/full.js
// ==/UserScript==

(function () {
    'use strict';

    /* global OpenCC */

    // ===== 設定常數 =====

    /* eslint-disable no-multi-spaces */

    // 允許進行簡繁轉換的網址模式（支援正規表達式）
    // 若要全站啟用，可將此陣列留空或設為 [/^/] (匹配所有網址)
    // 預設值為常見的中文網站，可根據需要修改
    const ALLOWED_URL_PATTERNS = [
        /https:\/\/[^\/]*\.cn\//,         // 中國網域 (.cn)
        /https:\/\/[^\/]*\.qq\.com\//,    // 騰訊 (qq.com)
        /https:\/\/[^\/]*\.baidu\.com\//, // 百度 (baidu.com)
        /https:\/\/[^\/]*\.weibo\.com\//, // 微博 (weibo.com)
        // 增加更多網址模式...
    ];

    // OpenCC 函式庫載入檢查設定
    const OPENCC_LOAD_CHECK_INTERVAL = 100;  // OpenCC 函式庫載入檢查間隔（毫秒）
    const OPENCC_MAX_RETRY_COUNT = 20;       // OpenCC 函式庫載入最大重試次數

    // MutationObserver 防抖設定
    const MUTATION_DEBOUNCE_DELAY = 50;     // DOM 變化防抖延遲時間（毫秒），避免過於頻繁的轉換

    // SPA 路由變化延遲設定
    const SPA_ROUTE_CHANGE_DELAY = 300;      // SPA 路由變化後的轉換延遲時間（毫秒），等待新內容載入完成

    // 簡繁體檢測閾值
    const MIN_SIMPLIFIED_CHAR_COUNT = 1;     // 判定為簡體中文所需的最少簡體字數量

    /* eslint-enable no-multi-spaces */

    // 檢查當前頁面是否應該進行轉換
    function shouldConvertPage() {
        // 如果允許清單為空或包含匹配所有的正規表達式，則轉換所有頁面
        if (ALLOWED_URL_PATTERNS.length === 0) {
            return true;
        }

        const currentUrl = window.location.href;
        return ALLOWED_URL_PATTERNS.some(pattern => pattern.test(currentUrl));
    }

    // ===== 詞庫對照表 (中國大陸用語 => 台灣用語) =====
    const termMapping = {
        // 修正簡繁轉換的錯誤
        // TODO: 干 => 乾, 幹

    };

    // 不轉換的選擇器清單
    const excludedSelectors = [
        'div#gemini-qna-overlay'
    ];

    // 檢查元素是否應該被排除
    function isExcluded(elm) {
        if (!elm || !elm.tagName) return false;

        // 檢查是否匹配排除的選擇器
        if (elm.nodeType === Node.ELEMENT_NODE) {
            for (const selector of excludedSelectors) {
                try {
                    if (elm.matches(selector)) {
                        return true;
                    }
                } catch (e) {
                    // 忽略無效的選擇器
                    console.warn(`[簡轉繁] 無效的選擇器: ${selector}`, e);
                }
            }
        }

        const tagName = elm.tagName.toUpperCase();
        if (tagName === "STYLE") return true;
        if (tagName === "SCRIPT") return true;
        if (tagName === "NOSCRIPT") return true;
        if (tagName === "IFRAME") return true;
        if (tagName === "OBJECT") return true;
        if (tagName === "CODE" && elm.attributes.length > 0) return true;
        // if (tagName === "PRE") return true;
        if (tagName === "TEXTAREA") return true;
        if (tagName === "INPUT") return true;
        if (tagName === "SELECT") return true;
        return false;
    }

    // 檢測文本是否主要為簡體中文
    function isSimplifiedChinese(text) {
        // console.log('[簡轉繁] 檢測簡體中文: 輸入文字 =', text);

        // 只檢測明確的簡體字特徵字符（排除台灣常用的簡化字）
        // 這些字在繁體中文環境中幾乎不會使用
        const simplifiedChars = /[竞顶订阅圆译码并变东报边们么门马风发对动当点电带达单体题头条统来两乐难连个国过关观开会后还话经进间将机见几记结计旧紧气区强亲学现选许写这种着张长场车产处传时说实数书声师设术认让总资从样业应义养银为问无万于与员运爱儿办备标笔满妈飞费负丰复饭导读断队听图团态谈农脑论类离联领历罗泪该规够广课华欢号还护觉节较举级军极据际积济讲净请轻确线兴习响续系显转战质装专争只众制称创视书识树试双热则参虽岁议阳艺亚游医烟务湾温远约语园帮宝补邮卖妇待独担灯党弹讨铁龙练丽劳陆楼绿录兰礼脸乱构馆顾刚贵挂况块获换怀划剧尽绝继静简渐脚坚击仅惊权须乡戏协险终证织职钟针庄陈厂谁势适伤属顺术胜软责错采财词赛伞欧优叶营严压药亿维闻围网鱼云愿预扑朴]/g;

        // 一些常見的繁體字特徵字符
        const traditionalChars = /[競頂訂閱圓譯碼並變東報邊們麼門馬風發對動當點電帶達單體題頭條統來兩樂難連個國過關觀開會後還話經進間將機見幾記結計舊緊氣區強親學現選許寫這種著張長場車產處傳時說實數書聲師設術認讓總資從樣業應義養銀為問無萬於與員運愛兒辦備標筆滿媽飛費負豐復飯導讀斷隊聽圖團態談農腦論類離聯領歷羅淚該規夠廣課華歡號還護覺節較舉級軍極據際積濟講淨請輕確線興習響續係顯轉戰質裝專爭隻眾製稱創視書識樹試雙熱則參雖歲議陽藝亞遊醫煙務灣溫遠約語園幫寶補郵賣婦待獨擔燈黨彈討鐵龍練麗勞陸樓綠錄蘭禮臉亂構館顧剛貴掛況塊獲換懷劃劇盡絕繼靜簡漸腳堅擊僅驚權須鄉戲協險終證織職鐘針莊陳廠誰勢適傷屬順術勝軟責錯採財詞賽傘歐優葉營嚴壓藥億維聞圍網魚雲願預撲樸]/g;

        const simplifiedCount = (text.match(simplifiedChars) || []).length;
        const traditionalCount = (text.match(traditionalChars) || []).length;

        // console.log('[簡轉繁] 簡體字數量 =', simplifiedCount, ', 繁體字數量 =', traditionalCount);

        // 如果簡體字明顯多於繁體字，則判定為簡體中文
        // 設定閾值：簡體字數量要大於等於繁體字，且至少有設定的最小簡體字數量
        const result = simplifiedCount >= traditionalCount && simplifiedCount >= MIN_SIMPLIFIED_CHAR_COUNT;
        // console.log('[簡轉繁] 判定結果: 為簡體中文 =', result);

        return result;
    }

    // 建立 OpenCC 轉換器實例（只建立一次）
    let converter = null;

    // 建立正規表達式（只建立一次）
    let termRegex = null;
    // 用於快速檢查的首字集合
    let termFirstChars = null;

    // 使用 WeakSet 來追蹤已轉換的節點（避免重複轉換）
    const convertedNodes = new WeakSet();

    function initConverter() {
        if (typeof OpenCC !== 'undefined' && !converter) {
            converter = OpenCC.Converter({ from: 'cn', to: 'tw2' });
        }
    }

    function initTermRegex() {
        if (!termRegex) {
            // 收集所有目標值（轉換後的台灣用語），這些不應該被再次轉換
            const targetValues = new Set(Object.values(termMapping));

            // 只保留那些「來源值 !== 目標值」且「來源值不是其他規則的目標值」的規則
            const sourceTerms = Object.keys(termMapping).filter(source => {
                const target = termMapping[source];
                // 如果來源和目標相同，不需要轉換
                if (source === target) return false;
                // 如果這個來源詞也是某個規則的目標值，可能會造成循環，需要謹慎處理
                // 但為了保持功能完整，我們還是保留它
                return true;
            });

            // 按照詞語長度從長到短排序，避免短詞覆蓋長詞
            const sortedTerms = sourceTerms
                .sort((a, b) => b.length - a.length)
                .map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')); // 轉義特殊字元

            // 建立一個大的正規表達式，一次匹配所有詞彙
            termRegex = new RegExp(sortedTerms.join('|'), 'g');

            // 建立首字集合，用於快速檢查
            termFirstChars = new Set(sourceTerms.map(term => term[0]));
        }
    }

    // 快速檢查文字是否可能包含需要替換的詞彙
    function mayContainTerms(text) {
        if (!termFirstChars) return false;
        for (let i = 0; i < text.length; i++) {
            if (termFirstChars.has(text[i])) {
                return true;
            }
        }
        return false;
    }

    // 檢測文字是否包含中文字元
    function hasChinese(text) {
        return /[\u4e00-\u9fa5]/.test(text);
    }

    // 轉換文本:簡體轉繁體 + 詞彙替換
    function convertText(text) {
        if (!text || text.trim() === '') return text;

        // 如果文字中沒有中文字元，直接返回，避免不必要的轉換
        if (!hasChinese(text)) return text;

        // **關鍵改進：先檢測是否為簡體中文**
        // 如果不是簡體中文，直接返回原文，不做任何轉換
        if (!isSimplifiedChinese(text)) {
            return text;
        }

        // 使用 OpenCC 進行簡體到繁體的轉換
        let convertedText = text;
        if (converter) {
            convertedText = converter(text);
        }

        // 只對真正從簡體轉換過來的文字進行詞彙替換
        const hasSimplifiedChars = convertedText !== text;

        // 使用正規表達式進行詞彙替換
        if (termRegex && hasSimplifiedChars) {
            // 記錄已經完成的替換，避免對替換結果再次進行替換
            const replaced = new Set();

            convertedText = convertedText.replace(termRegex, (match, offset) => {
                const replacement = termMapping[match];
                // 只在替換值與原值不同時才替換
                if (replacement && replacement !== match) {
                    // 記錄這次替換的結果
                    replaced.add(replacement);
                    return replacement;
                }
                return match;
            });
        }

        return convertedText;
    }

    // 定義需要排除的屬性清單（核心屬性和 JS 常用屬性）
    const excludedAttributes = new Set([
        'id', 'class', 'style', 'href', 'src', 'action', 'method',
        'type', 'name', 'value', 'for', 'rel', 'charset', 'content',
        'http-equiv', 'property', 'itemtype', 'itemprop', 'itemscope',
        'xmlns', 'role', 'aria-label', 'aria-labelledby', 'aria-describedby',
        'tabindex', 'contenteditable', 'draggable', 'spellcheck',
        'autocomplete', 'autocorrect', 'autocapitalize',
        'inputmode', 'pattern', 'accept', 'accept-charset',
        'enctype', 'formaction', 'formenctype', 'formmethod',
        'target', 'download', 'ping', 'referrerpolicy',
        'crossorigin', 'integrity', 'async', 'defer',
        'loading', 'decoding', 'fetchpriority'
    ]);

    // 轉換元素的屬性值
    function convertAttributes(element) {
        if (!element.attributes) return;

        for (let i = 0; i < element.attributes.length; i++) {
            const attr = element.attributes[i];
            const attrName = attr.name.toLowerCase();

            // 排除核心屬性和 JS 常用屬性
            if (excludedAttributes.has(attrName)) continue;

            // 排除以特定前綴開頭的屬性（但保留 data-* 屬性）
            if (attrName.startsWith('on')) continue; // 事件處理器
            if (attrName.startsWith('v-')) continue; // Vue 指令
            if (attrName.startsWith(':')) continue; // Vue 簡寫
            if (attrName.startsWith('@')) continue; // Vue 事件簡寫
            if (attrName.startsWith('ng-')) continue; // Angular 指令
            if (attrName.startsWith('*ng')) continue; // Angular 結構指令
            if (attrName.startsWith('[')) continue; // Angular 屬性綁定
            if (attrName.startsWith('(')) continue; // Angular 事件綁定
            if (attrName.startsWith('bind')) continue; // 綁定相關
            if (attrName.startsWith('x-')) continue; // Alpine.js 指令

            // 轉換屬性值
            const originalValue = attr.value;
            if (originalValue && originalValue.trim() !== "") {
                const convertedValue = convertText(originalValue);
                if (convertedValue !== originalValue) {
                    element.setAttribute(attr.name, convertedValue);
                }
            }
        }
    }

    // 遍歷並轉換所有文字節點和屬性
    function traverse(elm) {
        // 處理文字節點
        if (elm.nodeType === Node.TEXT_NODE) {
            // 檢查此文字節點是否已經被轉換過
            if (convertedNodes.has(elm)) {
                return;
            }

            const originalText = elm.nodeValue;
            if (originalText && originalText.trim() !== "") {
                const convertedText = convertText(originalText);
                if (convertedText !== originalText) {
                    elm.nodeValue = convertedText;
                    // 標記此節點已被轉換
                    convertedNodes.add(elm);
                }
            }
            return;
        }

        // 處理元素節點和文件節點
        if (elm.nodeType === Node.ELEMENT_NODE || elm.nodeType === Node.DOCUMENT_NODE) {
            if (isExcluded(elm)) return;

            // 如果是元素節點，轉換其屬性
            if (elm.nodeType === Node.ELEMENT_NODE) {
                convertAttributes(elm);
            }

            // 遞迴處理所有子節點
            for (let i = 0; i < elm.childNodes.length; i++) {
                traverse(elm.childNodes[i]);
            }
        }
    }

    // 主執行函數
    function init() {
        // 檢查當前頁面是否應該進行轉換
        if (!shouldConvertPage()) {
            console.log('[簡轉繁] 此頁面不在轉換清單中，腳本已停用');
            return;
        }

        console.log('[簡轉繁] 腳本已啟動，開始監聽頁面變化...');

        // 初始化轉換器和正規表達式
        initConverter();
        initTermRegex();

        // 轉換頁面標題
        if (document.title) {
            const convertedTitle = convertText(document.title);
            if (convertedTitle !== document.title) {
                document.title = convertedTitle;
            }
        }

        // 轉換現有內容
        traverse(document.body);

        // 使用防抖技術減少 MutationObserver 的執行頻率
        let debounceTimer = null;
        const pendingNodes = new Set();

        // 用於追蹤正在轉換的節點，避免自己觸發的變化被重複處理
        let isConverting = false;

        const observer = new MutationObserver((mutations) => {
            // 如果正在轉換中，忽略這些變化（這些是我們自己造成的）
            if (isConverting) return;

            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        pendingNodes.add(node);
                    });
                } else if (mutation.type === 'characterData') {
                    if (mutation.target.nodeType === Node.TEXT_NODE) {
                        // 只有在內容真的改變時才處理
                        // 注意：不需要刪除 convertedNodes 中的標記，因為我們會檢查原始內容
                        pendingNodes.add(mutation.target);
                    }
                } else if (mutation.type === 'attributes') {
                    // 監聽屬性變化
                    const attrName = mutation.attributeName.toLowerCase();
                    if (!excludedAttributes.has(attrName) &&
                        !attrName.startsWith('on') &&
                        !attrName.startsWith('v-') &&
                        !attrName.startsWith(':') &&
                        !attrName.startsWith('@') &&
                        !attrName.startsWith('ng-') &&
                        !attrName.startsWith('*ng') &&
                        !attrName.startsWith('[') &&
                        !attrName.startsWith('(') &&
                        !attrName.startsWith('bind') &&
                        !attrName.startsWith('x-')) {
                        pendingNodes.add(mutation.target);
                    }
                }
            });

            // 防抖：延遲執行，避免頻繁觸發
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                // 設定轉換標記，避免自己觸發的變化被重複處理
                isConverting = true;

                pendingNodes.forEach((node) => {
                    if (node.nodeType === Node.TEXT_NODE) {
                        // 檢查此文字節點是否已經被轉換過
                        if (convertedNodes.has(node)) {
                            return;
                        }

                        const originalText = node.nodeValue;
                        if (originalText && originalText.trim() !== "") {
                            const convertedText = convertText(originalText);
                            if (convertedText !== originalText) {
                                node.nodeValue = convertedText;
                                // 標記此節點已被轉換
                                convertedNodes.add(node);
                            }
                        }
                    } else if (node.nodeType === Node.ELEMENT_NODE) {
                        // 如果是元素節點，也要轉換屬性
                        convertAttributes(node);
                        traverse(node);
                    } else {
                        traverse(node);
                    }
                });
                pendingNodes.clear();

                // 重置轉換標記
                isConverting = false;
            }, MUTATION_DEBOUNCE_DELAY);
        });

        // 設定監聽整個文件內容的變化（包含屬性變化）
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
            attributeOldValue: false
        });

        // ===== 支援 SPA 頁面 =====

        // 監聽 URL 變化 (用於 SPA 路由切換)
        let lastUrl = location.href;

        // 封裝轉換邏輯為函式,便於重複呼叫
        function convertPage() {
            // 轉換頁面標題
            if (document.title) {
                const convertedTitle = convertText(document.title);
                if (convertedTitle !== document.title) {
                    document.title = convertedTitle;
                }
            }

            // 轉換頁面內容
            traverse(document.body);
        }

        // 監聽 pushState 和 replaceState
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;

        history.pushState = function (...args) {
            originalPushState.apply(this, args);
            if (lastUrl !== location.href) {
                lastUrl = location.href;
                // 延遲轉換，等待新內容載入
                setTimeout(convertPage, SPA_ROUTE_CHANGE_DELAY);
            }
        };

        history.replaceState = function (...args) {
            originalReplaceState.apply(this, args);
            if (lastUrl !== location.href) {
                lastUrl = location.href;
                setTimeout(convertPage, SPA_ROUTE_CHANGE_DELAY);
            }
        };

        // 監聽 popstate 事件 (瀏覽器前進/後退按鈕)
        window.addEventListener('popstate', () => {
            if (lastUrl !== location.href) {
                lastUrl = location.href;
                setTimeout(convertPage, SPA_ROUTE_CHANGE_DELAY);
            }
        });

        // 監聽 hashchange 事件 (用於 hash 路由)
        window.addEventListener('hashchange', () => {
            setTimeout(convertPage, SPA_ROUTE_CHANGE_DELAY);
        });

        // 監聽標題變化
        const titleObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && document.title) {
                    const convertedTitle = convertText(document.title);
                    if (convertedTitle !== document.title) {
                        // 暫時停止監聽，避免無限循環
                        titleObserver.disconnect();
                        document.title = convertedTitle;
                        // 重新開始監聽
                        titleObserver.observe(document.querySelector('title'), {
                            childList: true,
                            characterData: true,
                            subtree: true
                        });
                    }
                }
            });
        });

        // 如果有 title 元素，監聽它的變化
        const titleElement = document.querySelector('title');
        if (titleElement) {
            titleObserver.observe(titleElement, {
                childList: true,
                characterData: true,
                subtree: true
            });
        }

        // 註冊菜單命令：手動觸發頁面轉換
        if (typeof GM_registerMenuCommand !== 'undefined') {
            GM_registerMenuCommand('🔄 重新轉換此頁面 (簡→繁)', () => {
                console.log('[簡轉繁] 使用者手動觸發轉換');
                convertPage();
                // alert('[簡轉繁] 頁面轉換完成！');
            });
        }
    }

    // 為不在清單中的頁面提供手動轉換選項
    function initMenuForOtherPages() {
        if (typeof GM_registerMenuCommand !== 'undefined') {
            GM_registerMenuCommand('🔄 轉換此頁面 (簡→繁)', () => {
                console.log('[簡轉繁] 使用者在非清單頁面手動觸發轉換');
                initConverter();
                initTermRegex();

                // 轉換頁面標題
                if (document.title) {
                    const convertedTitle = convertText(document.title);
                    if (convertedTitle !== document.title) {
                        document.title = convertedTitle;
                    }
                }

                // 轉換頁面內容
                traverse(document.body);
                // alert('[簡轉繁] 頁面轉換完成！');
            });
        }
    }

    // 等待 OpenCC 函式庫載入完成後再執行
    if (shouldConvertPage()) {
        // 檢查是否應該啟用完整功能
        if (typeof OpenCC !== 'undefined') {
            init();
        } else {
            // 如果 OpenCC 尚未載入，等待一下
            let retryCount = 0;
            const checkInterval = setInterval(() => {
                retryCount++;
                if (typeof OpenCC !== 'undefined') {
                    clearInterval(checkInterval);
                    init();
                } else if (retryCount >= OPENCC_MAX_RETRY_COUNT) {
                    clearInterval(checkInterval);
                    console.error('[簡轉繁] OpenCC 函式庫載入失敗');
                }
            }, OPENCC_LOAD_CHECK_INTERVAL);
        }
    } else {
        // 對於不在清單中的頁面，只提供手動轉換菜單
        initMenuForOtherPages();
    }

    // 加入 YouTube 字幕攔截和轉換功能
    (function () {
        'use strict';

        /**
         * 初始化攔截器
         * @param {Object} options
         *   - fetchInterceptor: async function({resource, init, responsePromise}) => Response | Promise<Response>
         *   - xhrInterceptor: function(xhrInstance, method, url, async, user, password) => void
         *   - xhrOnSend: function(xhrInstance, body) => void
         *   - xhrOnReadyStateChange: function(xhrInstance) => void
         */
        function initInterceptor(options = {}) {
            // --- Fetch 攔截 ---
            const originalFetch = window.fetch;
            window.fetch = async function (...args) {
                const [resource, init] = args;
                if (typeof options.fetchInterceptor === 'function') {
                    try {
                        const responsePromise = originalFetch.apply(this, args);
                        const newResponse = await options.fetchInterceptor({ resource, init, responsePromise });
                        return newResponse;
                    } catch (err) {
                        console.error('fetchInterceptor 錯誤', err);
                        return originalFetch.apply(this, args);
                    }
                } else {
                    return originalFetch.apply(this, args);
                }
            };

            // --- XHR 攔截 ---
            const originalOpen = XMLHttpRequest.prototype.open;
            const originalSend = XMLHttpRequest.prototype.send;

            XMLHttpRequest.prototype.open = function (method, url, async = true, user = null, password = null) {
                this._intercept_method = method;
                this._intercept_url = url;
                if (typeof options.xhrInterceptor === 'function') {
                    try {
                        options.xhrInterceptor(this, method, url, async, user, password);
                    } catch (err) {
                        console.error('xhrInterceptor 錯誤', err);
                    }
                }
                return originalOpen.apply(this, arguments);
            };

            XMLHttpRequest.prototype.send = function (body = null) {
                if (typeof options.xhrOnSend === 'function') {
                    try {
                        options.xhrOnSend(this, body);
                    } catch (err) {
                        console.error('xhrOnSend 錯誤', err);
                    }
                }

                this.addEventListener('readystatechange', () => {
                    if (typeof options.xhrOnReadyStateChange === 'function') {
                        try {
                            options.xhrOnReadyStateChange(this);
                        } catch (err) {
                            console.error('xhrOnReadyStateChange 錯誤', err);
                        }
                    }
                });

                return originalSend.apply(this, arguments);
            };
        }

        /**
         * 轉換字幕文字的函式
         * @param {string} text - 原始字幕文字
         * @returns {string} - 轉換後的字幕文字
         */
        function transformSubtitleText(text) {
            // 在這裡實作你的轉換邏輯
            // 例如：簡體轉繁體、大小寫轉換等
            return convertText(text); // 目前直接返回原文，請自行修改
        }

        /**
         * 處理 timedtext JSON 資料
         * @param {Object} data - timedtext JSON 物件
         * @returns {Object} - 處理後的 JSON 物件
         */
        function processTimedtextData(data) {
            if (data && Array.isArray(data.events)) {
                data.events.forEach(event => {
                    if (Array.isArray(event.segs)) {
                        event.segs.forEach(seg => {
                            if (seg.utf8) {
                                seg.utf8 = transformSubtitleText(seg.utf8);
                            }
                        });
                    }
                });
            }
            return data;
        }

        // 安裝攔截器：攔截 YouTube timedtext API
        initInterceptor({
            fetchInterceptor: async ({ resource, init, responsePromise }) => {
                const url = (typeof resource === 'string') ? resource : resource.url;
                if (url.includes('https://www.youtube.com/api/timedtext')) {
                    console.log('[Fetch 攔截] YouTube timedtext API:', url);
                    const resp = await responsePromise;
                    const cloned = resp.clone();
                    const text = await cloned.text();
                    console.log('[Fetch 回應] 原始內容:', text);

                    try {
                        const data = JSON.parse(text);
                        const modifiedData = processTimedtextData(data);
                        const modifiedText = JSON.stringify(modifiedData);
                        console.log('[Fetch 回應] 修改後內容:', modifiedText);

                        return new Response(modifiedText, {
                            status: resp.status,
                            statusText: resp.statusText,
                            headers: resp.headers
                        });
                    } catch (err) {
                        console.error('處理 JSON 錯誤，返回原始內容', err);
                        return new Response(text, {
                            status: resp.status,
                            statusText: resp.statusText,
                            headers: resp.headers
                        });
                    }
                }
                return responsePromise;
            },
            xhrOnReadyStateChange: (xhr) => {
                if (xhr.readyState === 4 && xhr._intercept_url && xhr._intercept_url.includes('https://www.youtube.com/api/timedtext')) {
                    console.log('[XHR 攔截] YouTube timedtext API:', xhr._intercept_url);
                    try {
                        const text = xhr.responseText;
                        console.log('[XHR 回應] 原始內容:', text);

                        const data = JSON.parse(text);
                        const modifiedData = processTimedtextData(data);
                        const modified = JSON.stringify(modifiedData);
                        console.log('[XHR 回應] 修改後內容:', modified);

                        Object.defineProperty(xhr, 'responseText', { value: modified, writable: false, configurable: true });
                        Object.defineProperty(xhr, 'response', { value: modified, writable: false, configurable: true });
                    } catch (err) {
                        console.error('修改 xhr 回應錯誤', err);
                    }
                }
            }
        });

    })();

})();
