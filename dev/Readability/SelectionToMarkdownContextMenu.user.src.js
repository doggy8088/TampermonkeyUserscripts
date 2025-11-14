import {
    Readability,
    isProbablyReaderable
} from '@mozilla/readability';

import TurndownService from './lib/turndown.browser.es.js';

function getHTMLfromSelectorOrContent() {

    let selection = window.getSelection();
    let html = '';

    let container = document.createElement('div');

    if (selection.rangeCount > 0) {
        let range = selection.getRangeAt(0);
        container.appendChild(range.cloneContents());
        if (!!container) {
            // 刪除 container 中的所有 script 標籤
            let scripts = container.querySelectorAll('script');
            scripts.forEach(function (script) {
                script.remove();
            });

            // 找出 container.innerHTML 的 HTML 中所有的圖片，如果網址是 / 開頭，就幫我轉成完整的網址
            let images = container.querySelectorAll('img');
            images.forEach(function (img) {
                var src = img.getAttribute('src');
                if (src && src.startsWith('/')) {
                    var fullUrl = window.location.origin + src;
                    img.setAttribute('src', fullUrl);
                }
            });

            // 找出 container.innerHTML 的 HTML 中所有的 Hyperlink，如果網址是 / 開頭，就幫我轉成完整的網址
            let links = container.querySelectorAll('a');
            links.forEach(function (a) {
                var href = a.getAttribute('href');
                if (href && href.startsWith('/')) {
                    var fullUrl = window.location.origin + href;
                    a.setAttribute('href', fullUrl);
                }
            });
        }
        html = container?.innerHTML;
    }

    if (!container.innerHTML) {
        if (!isProbablyReaderable(document)) {
            console.warn('目前的頁面無法使用 Readability 來處理，輸出結果可能不如預期。');
        }

        var documentClone = document.cloneNode(true);
        var article = new Readability(documentClone).parse();
        html = `<h1>${article.title}</h1>` + article.content;
        // container = document.querySelector('article');
    }

    return html;
}

function b64EncodeUnicode(str) {
    const bytes = new TextEncoder().encode(str);
    const base64 = window.btoa(String.fromCharCode(...new Uint8Array(bytes)));
    return base64;
}

function isBase64Unicode(str) {
    // Base64編碼後的字串僅包含 A-Z、a-z、0-9、+、/、= 這些字元
    const base64Regex = /^[\w\+\/=]+$/;
    if (!base64Regex.test(str)) return false;

    try {
        const decoded = window.atob(str);

        // 解碼後的字串應該是合法的 UTF-8 序列
        // 使用 TextDecoder 檢查是否可以成功解碼為 Unicode 字串
        const bytes = new Uint8Array(decoded.length);
        for (let i = 0; i < decoded.length; i++) {
            bytes[i] = decoded.charCodeAt(i);
        }
        const decoder = new TextDecoder('utf-8');
        decoder.decode(bytes);

        // 如果沒有拋出異常，則表示是合法的 Base64Unicode 編碼字串
        return true;
    } catch (e) {
        // 解碼失敗，則不是合法的 Base64Unicode 編碼字串
        return false;
    }
}

function b64DecodeUnicode(str) {
    const bytes = Uint8Array.from(window.atob(str), c => c.charCodeAt(0));
    const decoded = new TextDecoder().decode(bytes);
    return decoded;
}

let html = getHTMLfromSelectorOrContent();

if (!!html) {

    var turndownService = new TurndownService({
        headingStyle: 'atx',
        hr: '- - -',
        bulletListMarker: '-',
        codeBlockStyle: 'fenced',
        fence: '```',
        emDelimiter: '_',
        strongDelimiter: '**',
        linkStyle: 'inlined',
        linkReferenceStyle: 'full',
        br: '  ',
        preformattedCode: false,
      });

    var markdown = turndownService.turndown(html)

    if (!!markdown) {
        // 清除 H1~H6 標題列的文字開頭與結尾空白（包含換行）
        markdown = markdown.replace(/^(#{1,6}\s+)(\s*)(.*?)(\s*)$/gm, '$1$3');

        // 清除超連結文字的開頭與結尾空白（包含換行）
        markdown = markdown.replace(/\[(\s*)(.*?)(\s*)\]/g, '[$2]');

        // 清除項目清單的文字開頭與結尾空白（包含換行）
        markdown = markdown.replace(/^(\s*[-*+])[ \t]+/gm, '$1 ');
        markdown = markdown.replace(/^(\s*[-*+])\s*\n\s+/gm, '$1 ');
        markdown = markdown.replace(/^(\s*[-*+]\s+.*?)[ \t]+$/gm, '$1');

        GM_setClipboard(markdown, 'text');
    } else {
        alert('無法將選取範圍的 HTML 轉成 Markdown 格式');
    }

    // let prompt = 'Please translate the following text into Traditional Chinese, ensuring that the words and phrases are commonly used in Taiwan. No explanations and additional information of the translations are required. Ensure the translations\' completeness. Here is the text:\n```\n{input}\n```';
    // let url = `https://gemini.google.com/app#autoSubmit=1&prompt=${encodeURIComponent(b64EncodeUnicode(prompt.replace('{input}', markdown)))}`;
    // GM_openInTab(url, false);
}
