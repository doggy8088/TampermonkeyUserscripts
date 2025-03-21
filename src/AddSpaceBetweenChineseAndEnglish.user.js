// ==UserScript==
// @name         為什麼你們就是不能加個空格呢？
// @version      0.2.0
// @description  如果你跟我一樣，每次看到網頁上的中文字和英文、數字、符號擠在一塊，就會坐立難安，忍不住想在它們之間加個空格。
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/AddSpaceBetweenChineseAndEnglish.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/AddSpaceBetweenChineseAndEnglish.user.js
// @author       Will Huang
// @run-at       context-menu
// @match        *://*/*
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
            let index = 0;
            const matchUrls = []; // 存储原始网址
            newText = newText.replace(URL, (match) => {
                matchUrls.push(match); // 将匹配的网址存入数组
                return `{${index++}}`;
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
            // 還原網址
            newText = newText.replace(/{\d+}/g, (match) => {
                const number = parseInt(match.match(/\d+/)[0]);
                return matchUrls[number];
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

    // 遍歷 DOM 尋找所有文字節點
    function traverseNode(node) {
        // 如果是文字節點，處理文字
        if (node.nodeType === Node.TEXT_NODE) {
            const originalText = node.nodeValue;
            if (originalText && originalText.trim() !== '') {
                const spacedText = pangu.spacing(originalText);
                if (originalText !== spacedText) {
                    node.nodeValue = spacedText;
                }
            }
        } else {
            // 對於非文字節點，遍歷其子節點
            // 排除不應處理的元素，如 script、style、pre、code 等
            const nodeName = node.nodeName.toLowerCase();
            if (nodeName !== 'script' && nodeName !== 'style' && nodeName !== 'pre' &&
                nodeName !== 'code' && nodeName !== 'textarea') {
                for (let i = 0; i < node.childNodes.length; i++) {
                    traverseNode(node.childNodes[i]);
                }
            }
        }
    }

    // 初始處理
    function processDocument() {
        traverseNode(document.body);
    }

    // 初始執行
    processDocument();

    // 監聽 DOM 變化，處理新增的內容
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
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

})();
