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
 *   這種無效網址，複製出來的 Markdown 與 HTML 中圖片與連結全部失效。
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
 * 「&copy 2024」）就會被當成 HTML 標籤或字元參照重新解析，造成標題被截斷、文字被吃掉。
 * 更嚴重的是，舊版接著會把這段 HTML 指派給「目前網頁文件中的 div」的 innerHTML 來取純文字，
 * 標題文字若是 `<img src=x onerror=...>`（例如網站已正確跳脫、使用者自訂的發文標題），
 * 就會在網頁中被建立成真正的元素並執行 onerror。先跳脫再組字串，確保標題永遠只是文字。
 * 這裡的結果只會放在元素內容中（不會放進屬性值），因此不需要處理引號。
 */
function escapeHtml(text) {
    return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
}

/**
 * 「沒有選取內容時以 Readability 擷取整頁文章」只在使用者剛以鍵盤按下複製時才啟用的時間窗（毫秒）。
 *
 * 鍵盤複製時，瀏覽器會在 keydown 處理完畢後立刻執行複製命令並觸發 copy 事件，兩者間隔通常只有
 * 數毫秒；取 1000ms 足以涵蓋頁面忙碌、主執行緒延遲的情況，又短到不會讓「按完 Ctrl+C 之後一段時間
 * 才由網站程式觸發的複製」被誤認為鍵盤複製。
 */
const KEYBOARD_COPY_WINDOW_MS = 1000;

// 最近一次「使用者以鍵盤按下 Ctrl+C／Cmd+C」的時間戳（performance.now()），0 代表目前沒有待處理的按鍵。
let lastKeyboardCopyAt = 0;

/**
 * 記錄使用者實際按下的複製快速鍵。
 *
 * 以捕獲階段監聽 keydown，在網站自己的處理函式之前就記下時間，即使網站在冒泡階段呼叫
 * stopPropagation() 也不影響。這裡只記錄、不呼叫 preventDefault()，完全不改變按鍵本身的行為。
 * - `event.isTrusted`：只承認真正由使用者產生的按鍵，網站以 dispatchEvent() 合成的事件不算。
 * - `ctrlKey || metaKey`：Windows／Linux 的 Ctrl+C 與 macOS 的 Cmd+C。
 * - `!altKey`：排除 Ctrl+Alt+C、Cmd+Option+C 這類其他用途的組合鍵（例如 Safari 的開發者工具）。
 * - `event.code === 'KeyC'`：以實體按鍵位置判斷，在注音、日文等輸入法或非 QWERTY 配置下
 *   `event.key` 可能不是 'c'；`event.key` 則作為 code 無法取得時的備援。
 */
function rememberKeyboardCopy(event) {
    if (!event.isTrusted || !(event.ctrlKey || event.metaKey) || event.altKey) {
        return;
    }
    if (event.code === 'KeyC' || (event.key || '').toLowerCase() === 'c') {
        lastKeyboardCopyAt = performance.now();
    }
}

/**
 * 判斷這次 copy 事件是否緊接在使用者的鍵盤複製之後，並「用掉」這次按鍵紀錄。
 *
 * 每次 copy 事件都會清除紀錄：一次按鍵只對應一次複製，避免使用者按下 Ctrl+C 後不到一秒內，
 * 網站又以程式觸發另一次複製時，被誤認為鍵盤複製而改寫成整頁文章。
 */
function consumeRecentKeyboardCopy() {
    const isRecent = lastKeyboardCopyAt > 0
        && performance.now() - lastKeyboardCopyAt <= KEYBOARD_COPY_WINDOW_MS;
    lastKeyboardCopyAt = 0;
    return isRecent;
}

/**
 * 判斷這次 copy 事件是否應該完全交還給瀏覽器（或網站自己的複製邏輯）處理。
 *
 * 這支腳本以全站萬用的 @match 套用在所有網站，以「捕獲階段」監聽 document 的 copy 事件，並且會
 * 呼叫 preventDefault() 改寫剪貼簿內容；沒有選取內容時還會以 Readability 擷取整頁文章寫入剪貼簿。
 * 因此必須先排除「不是使用者想讓本腳本處理」的複製，否則會把使用者真正要複製的東西蓋掉：
 *
 * 1. 在 <input>、<textarea> 中複製（一律略過）：文字輸入框內的選取範圍不會以 DOM Range 的形式出現在
 *    document 的 Selection 中（Chrome 只會回報輸入框本身所在的位置，Firefox 則是完全獨立的選取），
 *    原本的程式因此取不到使用者真正選取的文字，誤判為「沒有選取」而改用 Readability 擷取整頁文章，
 *    結果使用者在輸入框複製的一小段文字被換成整篇文章。網站「複製」按鈕常見的實作（例如
 *    clipboard.js）也是先選取一個隱藏的 <textarea> 再執行 document.execCommand('copy')，同樣會被蓋掉。
 * 2. 頁面上沒有任何實際的選取範圍（rangeCount 為 0，或選取範圍已收合成游標）：
 *    - 如果使用者剛剛（KEYBOARD_COPY_WINDOW_MS 內）親手按下 Ctrl+C／Cmd+C，代表使用者主動要求複製，
 *      保留原本「沒有選取就把整頁文章轉成 Markdown 複製」的既有行為，讓習慣這個用法的使用者不受影響。
 *    - 否則幾乎都是網站以 `document.addEventListener('copy', ...)` 搭配 `document.execCommand('copy')`
 *      實作的「一鍵複製」按鈕，或其他由程式觸發的複製。本腳本的捕獲階段監聽器比網站的監聽器更早執行，
 *      原本會搶先把整頁文章寫進 text/html、text/markdown，再用 GM_setClipboard() 寫入整頁純文字，
 *      導致網站要複製的內容消失；這類複製一律略過。
 *
 * 需要略過時直接 return，不呼叫 preventDefault()，讓瀏覽器與網站原本的複製行為完全不受影響。
 * 腳本說明中「在網頁選取文字範圍後，按下 Ctrl+C」的正常使用流程則完全不變。
 */
function shouldSkipCopyEvent(event, selection) {
    // 不論結果如何都先取出並清除鍵盤複製紀錄，確保一次按鍵只會對應到一次 copy 事件。
    const isKeyboardCopy = consumeRecentKeyboardCopy();

    // copy 事件的 target 是實際被複製內容所在的元素；在文字輸入框中複製時，瀏覽器會把輸入框內部的
    // 選取位置對應回輸入框本身，所以 target 就是該 <input>/<textarea>。
    // 刻意只看 event.target、不看 document.activeElement：target 已經反映實際被複製的位置，
    // 額外檢查焦點只會在「焦點還停在某個輸入框」的邊緣情況下，誤擋使用者對頁面內文的正常選取。
    // 以「是否有 closest() 方法」判斷 target 是不是元素（文字節點、document 都沒有這個方法），
    // 刻意不引用全域的 Node / Element：打包進來的 turndown 在同一個作用域內宣告了名為 Node 的函式，
    // 直接比對 Node.ELEMENT_NODE 很容易在日後調整程式時被同名識別字遮蔽而失效。
    const target = event.target;
    if (target && typeof target.closest === 'function' && target.closest('input, textarea')) {
        return true;
    }

    const hasSelection = !!selection && selection.rangeCount > 0 && !selection.isCollapsed;
    if (!hasSelection && !isKeyboardCopy) {
        return true;
    }

    return false;
}

function getHTMLfromSelectorOrContent() {

    let selection = window.getSelection();
    let html = '';

    let container = document.createElement('div');

    // window.getSelection() 在沒有瀏覽環境的文件（例如 Firefox 中 display:none 的 iframe）會回傳 null，
    // 先確認物件存在再讀取 rangeCount，避免 copy 事件處理函式直接丟出 TypeError。
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

    // 沒有選取內容時，以 Readability 擷取整頁文章（保留原本的功能）。
    // 經過 shouldSkipCopyEvent() 的篩選，只有「使用者剛以鍵盤按下 Ctrl+C／Cmd+C」時才會走到這裡，
    // 網站的一鍵複製與輸入框內的複製都不會觸發。
    if (!container.innerHTML) {
        if (!isProbablyReaderable(document)) {
            console.warn('目前的頁面無法使用 Readability 來處理，輸出結果可能不如預期。');
        }

        var documentClone = document.cloneNode(true);
        var article = new Readability(documentClone).parse();

        // Readability 找不到可辨識的文章主體時（例如登入頁、Web App 介面、幾乎沒有文字的頁面），
        // parse() 會回傳 null。原本直接讀取 article.title 會在 copy 事件處理函式中丟出 TypeError；
        // 這裡改為回傳空字串，呼叫端既有的 `if (!!html)` 判斷就會直接結束，不呼叫 preventDefault()、
        // 不改寫剪貼簿，瀏覽器照常完成原本的複製。
        if (!article || !article.content) {
            console.warn('Readability 無法從目前的頁面擷取出文章內容，維持瀏覽器原本的複製行為。');
            return '';
        }

        // article.title 是純文字，必須先跳脫再嵌入 HTML，原因請見 escapeHtml() 的說明。
        html = `<h1>${escapeHtml(article.title || '')}</h1>` + article.content;
        // container = document.querySelector('article');
    }

    return html;
}

const turndownService = new TurndownService({
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

function normalizeSpacesToAscii(text) {
    // Replace common non-ASCII spaces with regular spaces to avoid NBSP showing in code blocks
    //
    // 原本的字元範圍寫成 `\u2000-\u200b`，多涵蓋到 U+200B ZERO WIDTH SPACE。零寬空白在畫面上
    // 完全看不到（網站常拿它來讓長網址、長識別字可以斷行，泰文等語言也用它標示詞界），
    // 把它換成一般空白會憑空在網址、程式碼與文字中間插入看得見的空格（例如 `foo\u200bbar` 變成 `foo bar`），
    // 貼上的程式碼因此無法執行。真正的空白字元只到 U+200A，所以範圍修正為 `\u2000-\u200a`；
    // 零寬空白與 U+FEFF（零寬不換行空白／BOM）則直接移除，與 lib/html2markdown.cjs 的處理方式一致，
    // 讓複製出來的文字與畫面上看到的內容相同。
    return text
        .replace(/[\u00a0\u1680\u2000-\u200a\u202f\u205f\u3000]/g, ' ')
        .replace(/[\u200b\ufeff]/g, '');
}

function getPlainTextFromHTML(html) {
    // 原本是建立 `document.createElement('div')` 再指派 innerHTML 來取得純文字。這個 div 屬於目前的
    // 網頁文件，即使沒有插入畫面，瀏覽器仍會立刻處理其中的元素：選取範圍內的每張 <img> 都會重新
    // 發出請求、`onload`/`onerror` 等行內事件處理器會在網頁中再執行一次；而且在啟用指令碼的文件中，
    // <noscript> 的內容會被當成原始字串，讓 `<img src="...">` 這類標記文字混進複製出來的純文字。
    // 改用 DOMParser 解析成獨立的惰性文件（inert document）：不會載入任何資源、不會執行任何事件處理器，
    // <noscript> 也會依「停用指令碼」的規則解析成一般元素，只留下真正的文字內容。
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const text = doc.body ? doc.body.textContent : '';
    return normalizeSpacesToAscii(text || '').trim();
}

// 以捕獲階段記錄使用者的鍵盤複製快速鍵，供 copy 事件判斷是否啟用整頁後備邏輯（詳見 shouldSkipCopyEvent()）。
document.addEventListener('keydown', rememberKeyboardCopy, true);

document.addEventListener('copy', function (event) {

    // 只在「使用者在網頁上選取了內容」或「使用者剛以鍵盤按下複製」時才接手，其餘情境完全交還給瀏覽器與網站處理。
    if (shouldSkipCopyEvent(event, window.getSelection())) {
        return;
    }

    let html = getHTMLfromSelectorOrContent();
    if (!!html) {
        let markdown = turndownService.turndown(html)
        if (!!markdown) {
            // 清除 H1~H6 標題列的文字開頭與結尾空白（包含換行）
            markdown = markdown.replace(/^(#{1,6}\s+)(\s*)(.*?)(\s*)$/gm, '$1$3');

            // 清除超連結文字的開頭與結尾空白（包含換行）
            markdown = markdown.replace(/\[(\s*)(.*?)(\s*)\]/g, '[$2]');

            // 清除項目清單的文字開頭與結尾空白（包含換行）
            markdown = markdown.replace(/^(\s*[-*+])[ \t]+/gm, '$1 ');
            markdown = markdown.replace(/^(\s*[-*+])\s*\n\s+/gm, '$1 ');
            markdown = markdown.replace(/^(\s*[-*+]\s+.*?)[ \t]+$/gm, '$1');

            markdown = normalizeSpacesToAscii(markdown);

            const plainText = getPlainTextFromHTML(html);

            if (!!event && !!event.clipboardData) {
                event.preventDefault();
                event.clipboardData.setData('text/plain', plainText);
                event.clipboardData.setData('text/markdown', markdown);
                event.clipboardData.setData('text/html', html);
            }

            GM_setClipboard(plainText, {
                type: 'text',
                mimetype: 'text/plain'
            });
        } else {
            alert('無法將選取範圍的 HTML 轉成 Markdown 格式');
        }
    }
}, true);
