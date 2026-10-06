// ==UserScript==
// @name         為什麼你們就是不能加個空格呢？
// @version      0.2.1
// @description  如果你跟我一樣，每次看到網頁上的中文字和英文、數字、符號擠在一塊，就會坐立難安，忍不住想在它們之間加個空格。
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/AddSpaceBetweenChineseAndEnglish.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/AddSpaceBetweenChineseAndEnglish.user.js
// @author       Will Huang
// @match        *://*/*
// @run-at       context-menu
// @grant        none
// ==/UserScript==

(async function () {
    'use strict';

    // CJK is an acronym for Chinese, Japanese, and Korean.
    //
    // CJK includes the following Unicode blocks:
    // \u2e80-\u2eff CJK Radicals Supplement
    // \u2f00-\u2fdf Kangxi Radicals
    // \u3040-\u309f Hiragana
    // \u30a0-\u30ff Katakana
    // \u3100-\u312f Bopomofo
    // \u3200-\u32ff Enclosed CJK Letters and Months
    // \u3400-\u4dbf CJK Unified Ideographs Extension A
    // \u4e00-\u9fff CJK Unified Ideographs
    // \uf900-\ufaff CJK Compatibility Ideographs
    //
    // For more information about Unicode blocks, see
    // http://unicode-table.com/en/
    // https://github.com/vinta/pangu
    //
    // all J below does not include \u30fb
    const CJK = '\u2e80-\u2eff\u2f00-\u2fdf\u3040-\u309f\u30a0-\u30fa\u30fc-\u30ff\u3100-\u312f\u3200-\u32ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff';
    // ANS is short for Alphabets, Numbers, and Symbols.
    //
    // A includes A-Za-z\u0370-\u03ff
    // N includes 0-9
    // S includes `~!@#$%^&*()-_=+[]{}\|;:'",<.>/?
    //
    // some S below does not include all symbols
    const ANY_CJK = new RegExp(`[${CJK}]`);
    // the symbol part only includes ~ ! ; : , . ? but . only matches one character
    const CONVERT_TO_FULLWIDTH_CJK_SYMBOLS_CJK = new RegExp(`([${CJK}])[ ]*([\\:]+|\\.)[ ]*([${CJK}])`, 'g');
    const CONVERT_TO_FULLWIDTH_CJK_SYMBOLS = new RegExp(`([${CJK}])[ ]*([~\\!;,\\?]+)[ ]*`, 'g');
    const DOTS_CJK = new RegExp(`([\\.]{2,}|\u2026)([${CJK}])`, 'g');
    const FIX_CJK_COLON_ANS = new RegExp(`([${CJK}])\\:([A-Z0-9\\(\\)])`, 'g');
    // the symbol part does not include '
    const CJK_QUOTE = new RegExp(`([${CJK}])([\`"\u05f4])`, 'g');
    const QUOTE_CJK = new RegExp(`([\`"\u05f4])([${CJK}])`, 'g');
    const FIX_QUOTE_ANY_QUOTE = /([`"\u05f4]+)[ ]*(.+?)[ ]*([`"\u05f4]+)/g;
    const CJK_SINGLE_QUOTE_BUT_POSSESSIVE = new RegExp(`([${CJK}])('[^s])`, 'g');
    const SINGLE_QUOTE_CJK = new RegExp(`(')([${CJK}])`, 'g');
    const FIX_POSSESSIVE_SINGLE_QUOTE = new RegExp(`([A-Za-z0-9${CJK}])( )('s)`, 'g');
    const HASH_ANS_CJK_HASH = new RegExp(`([${CJK}])(#)([${CJK}]+)(#)([${CJK}])`, 'g');
    const CJK_HASH = new RegExp(`([${CJK}])(#([^ ]))`, 'g');
    const HASH_CJK = new RegExp(`(([^ ])#)([${CJK}])`, 'g');
    // the symbol part only includes + - * / = & | < >
    const CJK_OPERATOR_ANS = new RegExp(`([${CJK}])([\\+\\-\\*\\/=&\\|<>])([A-Za-z0-9])`, 'g');
    const ANS_OPERATOR_CJK = new RegExp(`([A-Za-z0-9])([\\+\\-\\*\\/=&\\|<>])([${CJK}])`, 'g');
    const FIX_SLASH_AS = /([/]) ([a-z\-_\./]+)/g;
    const FIX_SLASH_AS_SLASH = /([/\.])([A-Za-z\-_\./]+) ([/])/g;
    // the bracket part only includes ( ) [ ] { } < > “ ”
    const CJK_LEFT_BRACKET = new RegExp(`([${CJK}])([\\(\\[\\{<>\u201c])`, 'g');
    const RIGHT_BRACKET_CJK = new RegExp(`([\\)\\]\\}<>\u201d])([${CJK}])`, 'g');
    const FIX_LEFT_BRACKET_ANY_RIGHT_BRACKET = /([\(\[\{<\u201c]+)[ ]*(.+?)[ ]*([\)\]\}>\u201d]+)/;
    const ANS_CJK_LEFT_BRACKET_ANY_RIGHT_BRACKET = new RegExp(`([A-Za-z0-9${CJK}])[ ]*([\u201c])([A-Za-z0-9${CJK}\\-_ ]+)([\u201d])`, 'g');
    const LEFT_BRACKET_ANY_RIGHT_BRACKET_ANS_CJK = new RegExp(`([\u201c])([A-Za-z0-9${CJK}\\-_ ]+)([\u201d])[ ]*([A-Za-z0-9${CJK}])`, 'g');
    const AN_LEFT_BRACKET = /([A-Za-z0-9])([\(\[\{])/g;
    const RIGHT_BRACKET_AN = /([\)\]\}])([A-Za-z0-9])/g;
    const CJK_ANS = new RegExp(`([${CJK}])([A-Za-z\u0370-\u03ff0-9@\\$%\\^&\\*\\-\\+\\\\=\\|/\u00a1-\u00ff\u2150-\u218f\u2700—\u27bf])`, 'g');
    const ANS_CJK = new RegExp(`([A-Za-z\u0370-\u03ff0-9~\\$%\\^&\\*\\-\\+\\\\=\\|/!;:,\\.\\?\u00a1-\u00ff\u2150-\u218f\u2700—\u27bf])([${CJK}])`, 'g');
    const S_A = /(%)([A-Za-z])/g;
    const MIDDLE_DOT = /([ ]*)([\u00b7\u2022\u2027])([ ]*)/g;
    // Pattern source: https://uibakery.io/regex-library/url
    const URL = /https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/=\u2e80-\u2eff\u2f00-\u2fdf\u3040-\u309f\u30a0-\u30fa\u30fc-\u30ff\u3100-\u312f\u3200-\u32ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff]*)/ig;
    // \u7db2\u5740\u4f54\u4f4d\u7b26\u7684\u8fa8\u8b58\u5b57\u5143\u8207\u9084\u539f\u7528\u7684\u6b63\u898f\u8868\u793a\u5f0f\uff08\u7528\u9014\u8207\u8a2d\u8a08\u7406\u7531\u898b spacing() \u4e2d\u7684\u8a3b\u89e3\uff09
    // U+E000 \u662f Unicode \u79c1\u6709\u4f7f\u7528\u5340\uff08Private Use Area\uff09\u7684\u7b2c\u4e00\u500b\u5b57\u5143\uff0c\u6b63\u5e38\u7db2\u9801\u6587\u5b57\u4e0d\u6703\u4f7f\u7528
    const URL_PLACEHOLDER_MARK = '\ue000';
    const URL_PLACEHOLDER_REGEX = /\{\ue000(\d+)\}/g;
    class Pangu {
        constructor() {
            this.version = '4.0.7';
        }
        convertToFullwidth(symbols) {
            return symbols
                .replace(/~/g, '～')
                .replace(/!/g, '！')
                .replace(/;/g, '；')
                .replace(/:/g, '：')
                .replace(/,/g, '，')
                .replace(/\./g, '。')
                .replace(/\?/g, '？');
        }
        spacing(text) {
            if (typeof text !== 'string') {
                console.warn(`spacing(text) only accepts string but got ${typeof text}`); // eslint-disable-line no-console
                return text;
            }
            // 如果沒有任何中文，就不處理了
            if (text.length <= 1 || !ANY_CJK.test(text)) {
                return text;
            }
            const self = this;
            // DEBUG
            // String.prototype.rawReplace = String.prototype.replace;
            // String.prototype.replace = function(regexp, newSubstr) {
            //   const oldText = this;
            //   const newText = this.rawReplace(regexp, newSubstr);
            //   if (oldText !== newText) {
            //     console.log(`regexp: ${regexp}`);
            //     console.log(`oldText: ${oldText}`);
            //     console.log(`newText: ${newText}`);
            //   }
            //   return newText;
            // };
            let newText = text;
            // 將特定符號轉換為全形
            // https://stackoverflow.com/questions/4285472/multiple-regex-replace
            // newText = newText.replace(
            //   CONVERT_TO_FULLWIDTH_CJK_SYMBOLS_CJK,
            //   (match, leftCjk, symbols, rightCjk) => {
            //     const fullwidthSymbols = self.convertToFullwidth(symbols);
            //     return `${leftCjk}${fullwidthSymbols}${rightCjk}`;
            //   }
            // );
            // newText = newText.replace(
            //   CONVERT_TO_FULLWIDTH_CJK_SYMBOLS,
            //   (match, cjk, symbols) => {
            //     const fullwidthSymbols = self.convertToFullwidth(symbols);
            //     return `${cjk}${fullwidthSymbols}`;
            //   }
            // );
            // 為了避免「網址」被加入了盤古之白，所以要從轉換名單中剔除
            // 設計意圖：網址先換成佔位符，所有規則跑完後再換回來。
            // 佔位符刻意保留前後的大括號：CJK_LEFT_BRACKET、RIGHT_BRACKET_CJK、AN_LEFT_BRACKET、
            // RIGHT_BRACKET_AN 這幾條規則會在「{」「}」與中英文之間補空白，網址前後因此也會被加上空白，
            // 這是原本就有的效果，必須維持。
            // 但舊版的佔位符是單純的 {0}、{1}，與網頁原文中的 {0}、{1}（例如程式文件、樣板字串的說明）
            // 長得一模一樣，還原時會把原文的 {0} 換成網址；頁面上沒有任何網址時更會換成字串 "undefined"。
            // 因此在大括號內加上一個私有區字元 URL_PLACEHOLDER_MARK（U+E000，一般文字不會出現），
            // 讓佔位符與原文可以區分；這個字元不屬於任何一條規則的字元類別，所以不影響任何空白判斷。
            let index = 0;
            const matchUrls = []; // 存储原始网址
            newText = newText.replace(URL, (match) => {
                matchUrls.push(match); // 将匹配的网址存入数组
                return `{${URL_PLACEHOLDER_MARK}${index++}}`;
            });
            newText = newText.replace(DOTS_CJK, '$1 $2');
            newText = newText.replace(FIX_CJK_COLON_ANS, '$1：$2');
            newText = newText.replace(CJK_QUOTE, '$1 $2');
            newText = newText.replace(QUOTE_CJK, '$1 $2');
            newText = newText.replace(FIX_QUOTE_ANY_QUOTE, '$1$2$3');
            newText = newText.replace(CJK_SINGLE_QUOTE_BUT_POSSESSIVE, '$1 $2');
            newText = newText.replace(SINGLE_QUOTE_CJK, '$1 $2');
            newText = newText.replace(FIX_POSSESSIVE_SINGLE_QUOTE, "$1's"); // eslint-disable-line quotes
            newText = newText.replace(HASH_ANS_CJK_HASH, '$1 $2$3$4 $5');
            newText = newText.replace(CJK_HASH, '$1 $2');
            newText = newText.replace(HASH_CJK, '$1 $3');
            newText = newText.replace(CJK_OPERATOR_ANS, '$1 $2 $3');
            newText = newText.replace(ANS_OPERATOR_CJK, '$1 $2 $3');
            newText = newText.replace(FIX_SLASH_AS, '$1$2');
            newText = newText.replace(FIX_SLASH_AS_SLASH, '$1$2$3');
            newText = newText.replace(CJK_LEFT_BRACKET, '$1 $2');
            newText = newText.replace(RIGHT_BRACKET_CJK, '$1 $2');
            newText = newText.replace(FIX_LEFT_BRACKET_ANY_RIGHT_BRACKET, '$1$2$3');
            newText = newText.replace(ANS_CJK_LEFT_BRACKET_ANY_RIGHT_BRACKET, '$1 $2$3$4');
            newText = newText.replace(LEFT_BRACKET_ANY_RIGHT_BRACKET_ANS_CJK, '$1$2$3 $4');
            newText = newText.replace(AN_LEFT_BRACKET, '$1 $2');
            newText = newText.replace(RIGHT_BRACKET_AN, '$1 $2');
            newText = newText.replace(CJK_ANS, '$1 $2');
            newText = newText.replace(ANS_CJK, '$1 $2');
            // 完全看不懂這行在幹嘛
            // newText = newText.replace(S_A, '$1 $2');
            newText = newText.replace(MIDDLE_DOT, '・');
            // 還原網址：只還原帶有 URL_PLACEHOLDER_MARK 的佔位符，原文中的 {0} 之類文字維持原樣。
            // 萬一找不到對應的網址（理論上不會發生），就保留佔位符原文，絕不輸出 "undefined"。
            newText = newText.replace(URL_PLACEHOLDER_REGEX, (match, number) => {
                const url = matchUrls[Number(number)];
                return url === undefined ? match : url;
            });
            // DEBUG
            // String.prototype.replace = String.prototype.rawReplace;
            return newText;
        }
        spacingText(text, callback) {
            let newText;
            try {
                newText = this.spacing(text);
            }
            catch (err) {
                if (callback) {
                    callback(err);
                }
                else {
                    console.error(err);
                }
                return;
            }
            if (callback) {
                callback(null, newText);
            }
            else {
                return newText;
            }
        }
    }

    const pangu = new Pangu();

    // 不處理的元素（連同整個子樹）：script、style、pre、code、textarea
    // 設計意圖：與舊版完全相同的排除清單，只是改用 CSS 選擇器表示，
    // 這樣同一份規則可以同時用在 element.matches()（判斷元素本身）與 element.closest()（判斷祖先）。
    // 型別選擇器在 HTML 文件中不分大小寫，效果等同舊版的 nodeName.toLowerCase() 比對。
    const EXCLUDED_SELECTOR = 'script, style, pre, code, textarea';

    // 處理單一文字節點：只有內容真的改變時才寫回，避免產生不必要的 DOM 變動
    function processTextNode(node) {
        const originalText = node.nodeValue;
        if (originalText && originalText.trim() !== '') {
            const spacedText = pangu.spacing(originalText);
            if (originalText !== spacedText) {
                node.nodeValue = spacedText;
            }
        }
    }

    // TreeWalker 過濾器：
    // - 被排除的元素回傳 FILTER_REJECT，瀏覽器會連同整個子樹一起跳過（等同舊版不遞迴進去）。
    // - 其他元素回傳 FILTER_SKIP：元素本身不回傳給呼叫端，但會繼續走訪它的子節點。
    // - 文字節點回傳 FILTER_ACCEPT，所以 walker.nextNode() 只會拿到需要處理的文字節點。
    const walkerFilter = {
        acceptNode(node) {
            if (node.nodeType === Node.ELEMENT_NODE) {
                return node.matches(EXCLUDED_SELECTOR) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_SKIP;
            }
            return NodeFilter.FILTER_ACCEPT;
        }
    };

    // 遍歷 DOM 尋找所有文字節點
    // 設計意圖：舊版以遞迴 + childNodes 走訪，大型頁面上函式呼叫次數多、也受遞迴深度限制；
    // 改用原生 TreeWalker 走訪，走訪範圍與排除規則和舊版完全一致，但速度更快。
    function traverseNode(node) {
        // 如果是文字節點，處理文字
        if (node.nodeType === Node.TEXT_NODE) {
            processTextNode(node);
            return;
        }

        // 只有元素才會有需要走訪的子節點（註解等其他節點沒有子節點，舊版也等於什麼都不做）
        if (node.nodeType !== Node.ELEMENT_NODE || node.matches(EXCLUDED_SELECTOR)) {
            return;
        }

        const walker = document.createTreeWalker(node, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, walkerFilter);
        let textNode;
        while ((textNode = walker.nextNode())) {
            processTextNode(textNode);
        }
    }

    // 檢查節點是否位於排除區域「內部」（從父元素開始往上找）
    // 設計意圖：舊版只檢查新增節點「本身」是不是 pre、code 等元素，
    // 但 MutationObserver 回報的新增節點常常是排除區域裡面的子孫節點，例如：
    // - Prism.js、highlight.js 等語法高亮套件在 <code> 裡面插入大量 <span>；
    // - SPA 動態把程式碼文字節點塞進既有的 <pre>。
    // 這些節點的祖先是 code/pre，卻因為本身是 span 或文字節點而被加上空白，造成程式碼內容被改壞。
    function isInsideExcludedRegion(node) {
        const parent = node.parentElement;
        return parent !== null && parent.closest(EXCLUDED_SELECTOR) !== null;
    }

    // 初始處理
    function processDocument() {
        traverseNode(document.body);
    }

    // context-menu 腳本在 document.body 不存在的特殊文件（例如直接開啟的 SVG、XML）中沒有東西可處理
    if (!document.body) {
        return;
    }

    // 初始執行（每次從右鍵選單觸發，都會重新整理一次整頁）
    processDocument();

    // 避免重複註冊 MutationObserver
    // 設計意圖：@run-at context-menu 的腳本在使用者「每次」點選右鍵選單時都會重新執行一次，
    // 舊版每點一次就多註冊一個觀察器，點三次之後每個新增節點都會被處理三次，白白浪費效能。
    // 這裡把觀察器記在 document 上（使用 Symbol.for 產生的鍵，不會和網頁自己的屬性名稱衝突），
    // 已經有觀察器時就只重新整理整頁，不再註冊新的觀察器。
    const OBSERVER_KEY = Symbol.for('AddSpaceBetweenChineseAndEnglish.observer');
    if (document[OBSERVER_KEY]) {
        return;
    }

    // 監聽 DOM 變化，處理新增的內容
    // 補充：本腳本只改寫 nodeValue（產生的是 characterData 變動），而觀察器只監聽 childList，
    // 所以自己寫回的文字不會再觸發觀察器，不會形成無窮迴圈。
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    // 新增後又馬上被網站移除的節點不需要處理；位於排除區域內的節點也不處理
                    if (!node.isConnected || isInsideExcludedRegion(node)) {
                        return;
                    }
                    traverseNode(node);
                });
            }
        });
    });

    // 設定監聽整個文件內容的變化
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    document[OBSERVER_KEY] = observer;

})();
