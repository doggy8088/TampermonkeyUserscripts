import {
    Readability,
    isProbablyReaderable
} from '@mozilla/readability';

// Centralize HTML -> Markdown conversion so we can unit-test the exact
// GitHub-rendered HTML round-trip and keep translation scripts in sync with
// the expected Markdown formatting style.
import html2markdown from './lib/html2markdown.cjs';

function getHTMLfromSelectorOrContent() {

    let selection = document.getSelection();
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
    var markdown = html2markdown(html);
    let prompt = 'Please translate the following text into Traditional Chinese, ensuring that the words and phrases are commonly used in Taiwan. No explanations and additional information of the translations are required. Ensure the translations\' completeness. Here is the text:\n```\n{input}\n```';
    let url = `https://gemini.google.com/app#autoSubmit=1&prompt=${encodeURIComponent(b64EncodeUnicode(prompt.replace('{input}', markdown)))}`;
    GM_openInTab(url, false);
}
