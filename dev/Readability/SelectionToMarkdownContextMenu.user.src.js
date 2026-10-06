import {
    Readability,
    isProbablyReaderable
} from '@mozilla/readability';

import TurndownService from './lib/turndown.browser.es.js';

/**
 * 將以 `/` 開頭的網址補成完整網址（呼叫端只會傳入 `/` 開頭的網址，其餘網址維持原樣）。
 *
 * - `/path`（根目錄相對路徑）：補上目前頁面的 origin，例如 `https://example.com/path`。
 * - `//host/path`（協定相對網址）：只缺少協定，因此只補上目前頁面的 `location.protocol`。
 *   原本一律串接 `window.location.origin`，會把 Wikipedia 這類大量使用協定相對網址的圖片
 *   （`//upload.wikimedia.org/...`）拼成 `https://zh.wikipedia.org//upload.wikimedia.org/...`
 *   這種無效網址，複製出來的 Markdown 中圖片與連結全部失效。
 *
 * 刻意不改用 `new URL(url, location.href)` 解析所有相對網址：那樣會連帶改寫 `foo.png`、
 * `#anchor`、`?q=1` 這些原本保持原樣的網址，屬於輸出格式的變更，因此維持只處理 `/` 開頭網址的範圍。
 */
function toAbsoluteUrl(url) {
    if (url.startsWith('//')) {
        return window.location.protocol + url;
    }
    return window.location.origin + url;
}

/**
 * 把純文字跳脫成可以安全嵌入 HTML 字串的形式。
 *
 * Readability 回傳的 `article.title` 是「純文字」（取自 <title>、og:title 等），原本直接用樣板字串
 * 塞進 `<h1>${article.title}</h1>`，標題若含有 `<`、`>`、`&`（例如「認識 <template> 標籤」、
 * 「&copy 2024」）就會被當成 HTML 標籤或字元參照重新解析，造成標題被截斷、文字被吃掉，
 * 甚至把標題文字變成真正的 <img> 等元素。先跳脫再組字串，確保標題永遠只是文字。
 * 這裡的結果只會放在元素內容中（不會放進屬性值），因此不需要處理引號。
 */
function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

function getHTMLfromSelectorOrContent() {

    let selection = window.getSelection();
    let html = '';

    let container = document.createElement('div');

    // window.getSelection() 在沒有瀏覽環境的文件（例如 Firefox 中 display:none 的 iframe）會回傳 null，
    // 先確認物件存在再讀取 rangeCount，避免右鍵選單一執行就丟出 TypeError。
    if (selection && selection.rangeCount > 0) {
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
                    var fullUrl = toAbsoluteUrl(src);
                    img.setAttribute('src', fullUrl);
                }
            });

            // 找出 container.innerHTML 的 HTML 中所有的 Hyperlink，如果網址是 / 開頭，就幫我轉成完整的網址
            let links = container.querySelectorAll('a');
            links.forEach(function (a) {
                var href = a.getAttribute('href');
                if (href && href.startsWith('/')) {
                    var fullUrl = toAbsoluteUrl(href);
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

        // Readability 找不到可辨識的文章主體時（例如登入頁、Web App 介面、幾乎沒有文字的頁面），
        // parse() 會回傳 null。原本直接讀取 article.title 會丟出 TypeError，使用者按下選單後什麼事
        // 都不會發生，只在 Console 留下難以理解的例外；這裡改為輸出明確的警告並回傳空字串，
        // 讓呼叫端既有的 `if (!!html)` 判斷自然結束流程（一樣不會寫入剪貼簿，只是不再拋出例外）。
        if (!article || !article.content) {
            console.warn('Readability 無法從目前的頁面擷取出文章內容，請先選取要處理的文字範圍後再執行。');
            return '';
        }

        // article.title 是純文字，必須先跳脫再嵌入 HTML，原因請見 escapeHtml() 的說明。
        html = `<h1>${escapeHtml(article.title || '')}</h1>` + article.content;
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
