import {
    Readability,
    isProbablyReaderable
} from '@mozilla/readability';

// Centralize HTML -> Markdown conversion so we can unit-test the exact
// GitHub-rendered HTML round-trip and keep translation scripts in sync with
// the expected Markdown formatting style.
import html2markdown from './lib/html2markdown.cjs';

/**
 * 將以 `/` 開頭的網址補成完整網址（呼叫端只會傳入 `/` 開頭的網址，其餘網址維持原樣）。
 *
 * - `/path`（根目錄相對路徑）：補上目前頁面的 origin，例如 `https://example.com/path`。
 * - `//host/path`（協定相對網址）：只缺少協定，因此只補上目前頁面的 `location.protocol`。
 *   原本一律串接 `window.location.origin`，會把 Wikipedia 這類大量使用協定相對網址的圖片
 *   （`//upload.wikimedia.org/...`）拼成 `https://zh.wikipedia.org//upload.wikimedia.org/...`
 *   這種無效網址，送給 Gemini 的 Markdown 中圖片與連結全部失效。
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

    let selection = document.getSelection();
    let html = '';

    let container = document.createElement('div');

    // document.getSelection() 在沒有瀏覽環境的文件（例如 Firefox 中 display:none 的 iframe）會回傳 null，
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
        // 讓呼叫端既有的 `if (!!html)` 判斷自然結束流程（一樣不會開啟 Gemini，只是不再拋出例外）。
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

    // 原本用 `String.fromCharCode(...bytes)` 一次把所有位元組展開成函式引數，但 JavaScript 引擎對
    // 單次呼叫的引數數量有上限（V8 實測約 12 萬～18 萬個之間就會失敗，實際值依堆疊大小而定）。
    // 選取長篇文章、或沒有選取時由 Readability 擷取整頁內容，且內容含大量中文（UTF-8 每字 3 bytes）時，
    // 很容易超過上限而丟出「RangeError: Maximum call stack size exceeded」，導致 Gemini 分頁打不開。
    // 改為每 0x8000（32768）個位元組分批轉成「binary string」再串接，產生的 Base64 與原本逐位元組
    // 完全相同，只是不再受引數數量上限影響。
    const CHUNK_SIZE = 0x8000;
    let binary = '';
    for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
        binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK_SIZE));
    }

    const base64 = window.btoa(binary);
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
    // 以「函式」當作 replace 的替換值：String.prototype.replace 的「字串」替換值會解讀 `$$`、`$&`、
    // `` $` ``、`$'` 等特殊樣式，選取內容若含有 LaTeX 的 `$$x$$`、shell 的 `echo $$`、正規表示式的 `$&`
    // 等文字，原本會被改寫成 `$x$`、`echo $`，或被插入 prompt 的前後文；函式的回傳值則會原封不動插入。
    let url = `https://gemini.google.com/app#autoSubmit=1&prompt=${encodeURIComponent(b64EncodeUnicode(prompt.replace('{input}', () => markdown)))}`;
    GM_openInTab(url, false);
}
