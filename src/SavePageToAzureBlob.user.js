// ==UserScript==
// @name         網頁狀態與任意內容發佈到 Infinitybin
// @version      0.6.3
// @description  透過 Tampermonkey 選單將目前網頁狀態或任意文字內容發佈到 Azure Blob Storage-backed Infinitybin，並設定正確檔名與 Content-Type；瀏覽容器內頁面時可在頁面底部直接刪除該頁面
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/SavePageToAzureBlob.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/SavePageToAzureBlob.user.js
// @author       Will Huang
// @match        *://*/*
// @run-at       document-idle
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_openInTab
// @grant        GM_xmlhttpRequest
// @connect      *
// ==/UserScript==

// ============================================================
// == 首次使用設定說明 ==
// ============================================================
//
// 本腳本需要預先設定 Azure Blob Storage 的 Container SAS URL，
// 腳本才能將網頁快照或任意文字內容上傳至您的 Azure Blob 容器。
//
// 【步驟一】建立 Azure Storage Account 與 Container
//   1. 登入 Azure Portal（https://portal.azure.com）
//   2. 建立或選擇已有的 Storage Account
//   3. 在 Storage Account 中建立一個 Blob Container（建議設為 Private）
//
// 【步驟二】產生 Container 層級的 SAS Token
//   方法 A：（建議）使用 Azure Portal UI
//     1. 進入 Storage Account > Data storage > Containers
//     2. 點擊目標 Container 右側的「...」> 選擇「Generate SAS」
//     3. 權限勾選：Create（c）、Write（w）；若要使用「刪除頁面」功能，另需勾選 Delete（d）
//     4. 設定適當的「Expiry」到期日
//     5. 點擊「Generate SAS token and URL」
//     6. 複製「Blob SAS URL」欄位（格式如下範例），勿複製「Blob SAS token」）
//
//   方法 B：使用 Azure CLI
//     az storage container generate-sas \
//       --account-name <ACCOUNT_NAME> \
//       --name <CONTAINER_NAME> \
//       --permissions cwd \
//       --expiry 2027-12-31T00:00:00Z \
//       --https-only \
//       --output tsv
//     （上述指令僅輸出 SAS token，請自行組合完整 URL；
//       c/w 供發佈使用，d 僅「刪除頁面」功能需要，不需要刪除可只給 cw）
//
// 【步驟三】SAS URL 格式說明
//   取得的 Container SAS URL 格式如下：
//   https://<帳號>.blob.core.windows.net/<容器名>?sv=2023-11-03&ss=b&srt=sco&sp=cwd&se=2027-01-01T00%3A00%3A00Z&sig=XXXXX
//
//   ※ 重要：本腳本需要的是「Container SAS URL」（路徑結尾是容器名，後接 ?sv=...），
//      而非單一 Blob 的 SAS URL（路徑包含檔案名稱）。
//
// 【步驟四】在 Tampermonkey 選單中設定 SAS URL
//   1. 在任意網頁點開瀏覽器工具列的 Tampermonkey 圖示
//   2. 選擇「⚙️ 設定 Azure Blob SAS URL」
//   3. 在彈出的對話框中貼上步驟二取得的 Container SAS URL
//   4. 點擊確定後，SAS URL 即儲存完成
//
// 【安全性說明】
//   SAS URL 透過 Tampermonkey 的 GM_setValue() 儲存，
//   資料保存在瀏覽器擴充套件的獨立儲存區，
//   網頁中的任何 JavaScript 均無法讀取此儲存區，
//   比存放在 localStorage 或 Cookie 中更為安全。
//   請勿將 SAS URL 分享給他人，並建議定期更換 SAS Token 以降低風險。
//
// 【使用方式】
//   在任意網頁點開 Tampermonkey 選單，選擇「📸 將目前網頁狀態發佈到 Infinitybin」，
//   腳本依「快照模式」執行，預設為重播模式：
//
//   【重播模式】（預設，可用「🧩 快照設定」切換）
//     1. 重新取得「尚未執行腳本」的原始 HTML，並比對內容量確認不是空殼頁
//     2. 內嵌外部腳本、CSS、字型、圖片、SVG 等資源
//     3. 保留頁面腳本，讓快照開啟時從空白容器自己渲染一次
//        → 畫面與互動都正常，且不會出現「同一組介面重複兩次」
//     4. 發佈到 Infinitybin，並在新頁籤開啟純淨的 Blob URL（不含 SAS Token）
//
//   【靜態快照】（重播不可用時自動退回，也可在「🧩 快照設定」手動選擇）
//     1. 擷取目前頁面的完整渲染後 DOM 狀態
//     2. 移除所有 <script> 並內嵌所有外部資源
//     3. 發佈到 Infinitybin，並在新頁籤開啟純淨的 Blob URL（不含 SAS Token）
//        → 畫面與發佈當下完全一致，但站內搜尋、頁籤切換等互動會失效
//
//   或選擇「📋 將任意內容發佈到 Infinitybin」：
//     1. 顯示頁面內文字對話框，等待使用者貼上任意文字
//     2. 貼上後自動依內容推測 HTML、Markdown、CSV、JSON、XML、純文字等格式
//     3. 使用推測後的副檔名與 Content-Type 發佈到 Infinitybin
//     4. 圖片與二進位內容不處理，也不顯示錯誤
//
//   當瀏覽「設定的 SAS URL 所在容器下的頁面」時（例如
//   https://<帳號>.blob.core.windows.net/<容器>/<檔名>），
//   頁面最下方會出現一整列的刪除工具列：
//     1. 點擊「🗑️ 刪除此頁面」並確認後，即以先前設定的 SAS Token 提供的權限刪除該頁面
//     2. 刪除成功後按鈕停用（避免重複刪除），重新整理該網址會看到 404 Not Found
//     3. 不想看到工具列可點擊右側「✕」隱藏（僅本次瀏覽）
//   同一個刪除功能也註冊在 Tampermonkey 選單中（只會在上述頁面出現），
//   供純文字、SVG 等無法顯示 DOM 工具列的內容類型使用。
//   ※ 刪除功能需要 SAS 具備 Delete（d）權限（sp=cwd），
//      若 SAS 缺少該權限，點擊刪除會得到 403 錯誤並附上補救說明。
//   ※ 刪除列是在頁面載入時判斷是否顯示；若是在已開啟的頁面上才完成 SAS 設定，
//      請重新整理頁面讓刪除列出現。
//
// 【注意事項】
//   - 若頁面資源非常多（如大量圖片），序列化過程可能需要數十秒，請耐心等待
//   - 發佈本機 HTML（file://）時，Chrome 即使能在原頁面顯示圖片，腳本仍需要權限
//     讀取原始 HTML、圖片和樣式表的檔案內容，才能把它們嵌入快照。請確認兩項設定：
//     1. Chrome → 擴充功能 → Tampermonkey → 詳細資料：開啟「允許存取檔案網址」。
//     2. Tampermonkey → 設定 → 將「設定模式」切換到「進階」，再將
//        「允許腳本存取本機檔案」設為「所有本機檔案（All local files）」。
//     本機資源讀取失敗時，腳本會在上傳前停止。完成設定後，請重新整理原頁面再發佈。
//   - Google Fonts 與常見公共 CDN 的資源會保留原始連結，開啟快照時由瀏覽器載入
//   - 超過 10MB 的單一資源將略過內嵌，改保留原始絕對 URL，避免 HTML 過大
//   - <script> 標籤的處理依模式而不同：
//     重播模式保留腳本（外部檔會抓回來內嵌），並移除 meta CSP，讓快照能自己渲染一次；
//     靜態模式則全部移除，因為那份 DOM 已經含有腳本動態產生的節點，
//     再執行一次會把同一組介面附加第二份（例如分類頁籤變成兩排）。
//   - 重播模式的限制：
//     1. 需要能重新取得原始 HTML；內容完全由前端 API 產生的頁面（SPA 空殼）
//        會被判定為空殼並自動降級為靜態快照，狀態提示條會說明原因
//     2. 快照裡的腳本若以相對網址自行抓取資料（fetch/XHR），仍會因跨來源而失敗
//     3. <script type="module"> 只保留絕對網址載入，不內嵌（相對 import 會失效）
//     4. 還原的是「原始頁面」的狀態，發佈當下的表單輸入、捲動位置、篩選結果
//        不會被凍結；需要完整保留當下狀態時請改用靜態快照
//   - 靜態模式的限制：站內搜尋、切換頁籤等依賴 JS 的互動在快照中失效
//   - <video> 和 <audio> 的媒體 src 不會被內嵌（通常體積過大），僅保留 poster 圖片
//   - 靜態模式會把 <canvas> 以 toDataURL() 轉為 <img>（跨來源受限時略過）；
//     重播模式則交由頁面腳本自己重畫（因此圖表類頁面在重播模式下是「活的」）
//   - 發佈功能的 Container 必須具備 Create + Write 兩項 SAS 權限，缺一不可；
//     刪除頁面功能另需 Delete（d）權限（不需要刪除可維持 sp=cw）
//
// ============================================================

(function () {
    'use strict';

    // ===== 腳本常數設定 =====

    // Tampermonkey 儲存鍵名，用於安全保存 SAS URL
    const SAS_URL_STORAGE_KEY = 'azureContainerSasUrl';

    // 快照模式的儲存鍵名與可選值。
    // 0.5.x 的「snapshotKeepInlineScripts」布林設定已被模式選擇取代：
    // 「保留 inline script 但仍凍結已渲染 DOM」正是頁籤重複的成因，因此不再提供。
    const SNAPSHOT_MODE_STORAGE_KEY = 'snapshotMode';

    // 重播：抓原始 HTML、保留腳本，讓頁面自己渲染一次（互動可用、不重複）。
    const SNAPSHOT_MODE_REPLAY = 'replay';

    // 靜態：凍結目前 DOM 並移除所有腳本（畫面完全一致，但沒有互動）。
    const SNAPSHOT_MODE_STATIC = 'static';

    // 由「右鍵 context-menu 觸發腳本」送出的事件名稱。
    // 透過 DOM CustomEvent 做跨 userscript 溝通，可避免複製整份快照邏輯。
    const CONTEXT_MENU_TRIGGER_EVENT = 'save-page-to-azure-blob:trigger';

    // 主腳本收到觸發事件後，會立即回送 ACK，
    // 讓 context-menu 腳本可判斷主腳本是否存在且可正常接手執行。
    const CONTEXT_MENU_ACK_EVENT = 'save-page-to-azure-blob:ack';

    // 底部刪除列的元素 id。
    // 與狀態提示條一樣，製作快照時必須從 clone 中移除（見 serializePage()），
    // 否則工具列會被永久寫進快照內容；同時也用於避免重複掛載。
    const DELETE_BAR_ELEMENT_ID = '__save_azure_delete_bar__';

    // XHTML 命名空間。
    // 非 text/html 的 XML 系文件（例如 .xhtml）必須以 createElementNS 建立
    // XHTML 元素，瀏覽器才會把工具列放進 HTML 呈現樹中渲染；
    // 在 text/html 文件中使用 createElementNS 等同於 createElement，行為一致。
    const XHTML_NAMESPACE_URI = 'http://www.w3.org/1999/xhtml';

    // 單一資源超過此大小（位元組）時略過內嵌，改保留原始 URL，預設 10MB
    const MAX_INLINE_SIZE_BYTES = 10 * 1024 * 1024;

    // 常見公共 CDN 由瀏覽器直接載入，避免把共用的樣式、字型、圖片複製到每份快照。
    // Google Fonts 的樣式與字型檔分屬不同主機，兩者都必須排除。比對解析後的完整
    // hostname，避免把恰好含有「cdn」字樣的網站或自訂 CDN 一併略過。
    const EXTERNAL_CDN_HOSTNAMES = new Set([
        'fonts.googleapis.com',
        'fonts.gstatic.com',
        'ajax.googleapis.com',
        'cdn.jsdelivr.net',
        'cdnjs.cloudflare.com',
        'unpkg.com',
        'code.jquery.com',
        'stackpath.bootstrapcdn.com',
        'maxcdn.bootstrapcdn.com'
    ]);

    // GM_xmlhttpRequest 請求逾時（毫秒），預設 30 秒
    const REQUEST_TIMEOUT_MS = 30000;

    // 文字格式的副檔名對應表，集中維護可避免「副檔名推測」與
    // 「Azure Blob Content-Type」兩套邏輯日後彼此漂移。
    const TEXT_EXTENSION_TO_CONTENT_TYPE = {
        txt:  'text/plain; charset=utf-8',
        html: 'text/html; charset=utf-8',
        md:   'text/markdown; charset=utf-8',
        csv:  'text/csv; charset=utf-8',
        tsv:  'text/tab-separated-values; charset=utf-8',
        json: 'application/json; charset=utf-8',
        xml:  'application/xml; charset=utf-8',
        yaml: 'application/yaml; charset=utf-8',
        css:  'text/css; charset=utf-8',
        js:   'text/javascript; charset=utf-8',
        sql:  'application/sql; charset=utf-8',
        svg:  'image/svg+xml; charset=utf-8'
    };

    // 來源 MIME type 比純內容猜測更可靠；此表只處理常見文字型別。
    // 未列出的 text/* 仍會回退為 .txt。
    const TEXT_MIME_TYPE_TO_EXTENSION = {
        'text/plain':                   'txt',
        'text/html':                    'html',
        'text/markdown':                'md',
        'text/x-markdown':              'md',
        'text/csv':                     'csv',
        'text/tab-separated-values':    'tsv',
        'application/json':             'json',
        'text/json':                    'json',
        'application/xml':              'xml',
        'text/xml':                     'xml',
        'application/yaml':             'yaml',
        'application/x-yaml':           'yaml',
        'text/yaml':                    'yaml',
        'text/x-yaml':                  'yaml',
        'text/css':                     'css',
        'text/javascript':              'js',
        'application/javascript':       'js',
        'application/x-javascript':     'js',
        'application/sql':              'sql',
        'text/x-sql':                   'sql',
        'image/svg+xml':                'svg'
    };

    // 圖片 MIME type 對應表保留給通用副檔名推斷使用。
    const IMAGE_MIME_TYPE_TO_EXTENSION = {
        'image/png':     'png',
        'image/jpeg':    'jpg',
        'image/jpg':     'jpg',
        'image/webp':    'webp',
        'image/gif':     'gif',
        'image/bmp':     'bmp',
        'image/svg+xml': 'svg',
        'image/tiff':    'tiff',
        'image/avif':    'avif',
        'image/x-icon':  'ico'
    };

    // 防止同一頁面上的多個觸發來源在短時間內同時執行發佈流程。
    // 這個腳本同時支援 Tampermonkey 選單與 context-menu 橋接事件，
    // 若瀏覽器或擴充套件在某些頁面上重複派發觸發，就可能造成多次上傳、
    // 多個成功訊息，以及多個新頁籤被連續開啟。
    // 透過「單一進行中作業鎖」可確保整個頁面在任一時間只會有一份發佈作業。
    let activeSaveOperation = null;
    let activeStatusBar = null;

    // ===== 工具：遮蔽 SAS 簽章 =====

    /**
     * 將文字中所有 SAS 查詢參數 sig= 的值替換為 REDACTED。
     *
     * 設計意圖：
     *   - 上傳用的 PUT 網址帶有完整 SAS Token；原本請求失敗時，錯誤訊息直接內含該網址，
     *     接著被寫進頁面右下角的狀態提示條與 console.error()。狀態提示條是一般 DOM 節點，
     *     目前網頁的任何 JavaScript（包含第三方廣告或追蹤腳本）都能讀到它的文字，
     *     等於把可寫入 Container 的憑證交給當前網站。
     *   - SAS 中真正構成授權的是 HMAC 簽章 sig；sv、sp、se 等參數不具機密性，
     *     保留下來反而有助於判斷權限不足或 Token 過期，因此只遮蔽 sig 的值。
     *   - 以字串取代而不經 URL 解析，可同時處理一般訊息、JSON.stringify 的輸出，
     *     以及無法被 URL() 解析的片段，也不會改變其餘參數的編碼形式。
     *
     * @param {string} text - 可能含有 SAS URL 的文字
     * @returns {string} 已遮蔽簽章的文字
     */
    function redactSasSignature(text) {
        return String(text ?? '').replace(/([?&]sig=)[^&#\s"']*/gi, '$1REDACTED');
    }

    /**
     * 取得可安全顯示或記錄的錯誤訊息（已遮蔽 SAS 簽章）。
     *
     * 設計意圖：gmFetch() 產生的錯誤雖已先行遮蔽，但發佈流程中還有其他來源的例外，
     * 例如 Firefox 的 new URL() 會把無法解析的原始輸入（可能就是 SAS URL）放進錯誤訊息。
     * 凡是要寫進頁面狀態提示條、alert() 或 console 的錯誤，一律經過這裡，
     * 不必逐一判斷例外的來源是否安全。
     *
     * @param {unknown} err - 任意例外物件或值
     * @returns {string} 已遮蔽 sig 的錯誤訊息
     */
    function describeError(err) {
        return redactSasSignature(err?.message ?? String(err));
    }

    /**
     * 取得可安全寫入 console 的錯誤詳細資訊（含 stack，已遮蔽 SAS 簽章）。
     *
     * 原本直接把例外物件交給 console.error()，DevTools 會原樣展開 message 與 stack；
     * 改為輸出遮蔽後的字串，保留排查需要的呼叫堆疊，同時避免 sig 出現在 console。
     *
     * @param {unknown} err - 任意例外物件或值
     * @returns {string} 已遮蔽 sig 的 stack（沒有 stack 時退回訊息）
     */
    function describeErrorForLog(err) {
        return redactSasSignature(err?.stack || describeError(err));
    }

    /**
     * 從 GM_xmlhttpRequest 的 responseHeaders 字串中取出指定標頭的值。
     *
     * @param {string} headers - HTTP response headers 的原始字串
     * @param {string} name - 標頭名稱（不分大小寫）
     * @returns {string} 標頭值；不存在時回傳空字串
     */
    function getResponseHeaderValue(headers, name) {
        const prefix = `${name.toLowerCase()}:`;
        const line = (headers || '').split(/\r?\n/).find(h => h.toLowerCase().startsWith(prefix));
        return line ? line.slice(prefix.length).trim() : '';
    }

    // ===== 工具：把抓回來的位元組用正確的編碼解成文字 =====

    /*
     * 為什麼不用 responseType: 'text'？
     *
     * GM_xmlhttpRequest 的 text 模式由 Tampermonkey／瀏覽器依回應的 Content-Type 解碼；
     * 但 file:// 讀回來的本機檔案沒有任何標頭，於是退成 Latin-1（Windows-1252）解碼，
     * 一份 UTF-8 的中文頁面就會變成「Gemini æ² g」這種亂碼，而且亂碼會被原封不動
     * 寫進快照（重播模式的實際踩雷記錄）。
     *
     * 因此文字型資源一律抓 arraybuffer，再用下列規則自行解碼：
     *   BOM > HTTP 標頭 charset > CSS @charset > HTML meta charset > 目前文件實測編碼 > UTF-8
     */

    /**
     * 從 Content-Type 標頭取出 charset（例如 "text/html; charset=Big5" → "big5"）。
     *
     * @param {string} headers - HTTP response headers 原始字串
     * @returns {string} 小寫的 charset；未宣告時回傳空字串
     */
    function getCharsetFromHeaders(headers) {
        const contentType = getResponseHeaderValue(headers, 'content-type');
        const match = /charset\s*=\s*"?([^";\s]+)"?/i.exec(contentType);
        return match ? match[1].trim().toLowerCase() : '';
    }

    /**
     * 依 BOM 判斷編碼。BOM 是檔案自己說的話，優先於任何宣告。
     *
     * @param {Uint8Array} bytes - 檔案開頭的位元組
     * @returns {string} 對應的 charset；沒有 BOM 時回傳空字串
     */
    function detectBomCharset(bytes) {
        if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) return 'utf-8';
        if (bytes.length >= 2 && bytes[0] === 0xFF && bytes[1] === 0xFE) return 'utf-16le';
        if (bytes.length >= 2 && bytes[0] === 0xFE && bytes[1] === 0xFF) return 'utf-16be';
        return '';
    }

    /**
     * 從 HTML 開頭 1024 位元組中找出 <meta charset> 宣告。
     *
     * 設計意圖：
     *   - HTML 規範要求編碼宣告必須出現在文件最前面，因此只看開頭即可，
     *     不必解碼整份文件（也就避開「用錯編碼去讀」的雞生蛋問題）。
     *   - 這裡刻意用 latin1 解碼：它是「1 byte = 1 char」的無損映射，
     *     足以取出 ASCII 的屬性值，不會因為用錯編碼而丟掉資訊。
     *
     * @param {Uint8Array} bytes - 檔案位元組
     * @returns {string} 小寫的 charset；找不到時回傳空字串
     */
    function sniffHtmlCharset(bytes) {
        const head = new TextDecoder('latin1').decode(bytes.subarray(0, 1024));
        const metaCharset = /<meta[^>]+charset\s*=\s*["']?\s*([\w-]+)/i.exec(head);
        return metaCharset ? metaCharset[1].toLowerCase() : '';
    }

    /**
     * 從 CSS 開頭的 @charset 規則找出編碼宣告。
     *
     * @param {Uint8Array} bytes - 檔案位元組
     * @returns {string} 小寫的 charset；找不到時回傳空字串
     */
    function sniffCssCharset(bytes) {
        const head = new TextDecoder('latin1').decode(bytes.subarray(0, 128));
        const atCharset = /@charset\s+["']([\w-]+)["']/i.exec(head);
        return atCharset ? atCharset[1].toLowerCase() : '';
    }

    /**
     * 用指定編碼解碼；瀏覽器不支援該編碼時退回 UTF-8，最後才用預設解碼器。
     *
     * 使用 non-fatal 模式：寧可讓個別字元變成替換字元，也不要在發佈流程中直接爆掉。
     *
     * @param {Uint8Array} bytes - 檔案位元組
     * @param {string} charset - 候選編碼
     * @returns {string} 解碼後文字
     */
    function decodeBytes(bytes, charset) {
        for (const candidate of [charset, 'utf-8']) {
            if (!candidate) continue;
            try {
                return new TextDecoder(candidate).decode(bytes);
            } catch {
                // 瀏覽器不認得這個編碼名稱，換下一個候選
            }
        }
        return new TextDecoder().decode(bytes);
    }

    /**
     * 把任意 ArrayBuffer / TypedArray 回應統一成 Uint8Array。
     *
     * @param {ArrayBuffer|ArrayBufferView|null} value - GM_xmlhttpRequest 的 response
     * @returns {Uint8Array} 位元組檢視（空回應時為長度 0）
     */
    function toByteArray(value) {
        if (value instanceof ArrayBuffer) return new Uint8Array(value);
        if (ArrayBuffer.isView(value)) return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
        return new Uint8Array(0);
    }

    /**
     * 依「BOM → 標頭 → 內容宣告 → 目前文件編碼 → UTF-8」的順序決定編碼並解碼。
     *
     * @param {Uint8Array} bytes - 資源位元組
     * @param {string} headers - HTTP response headers
     * @param {'html'|'css'|'js'} kind - 資源類型，決定要不要看內容裡的編碼宣告
     * @returns {string} 解碼後文字
     */
    function decodeTextBytes(bytes, headers, kind) {
        let charset = detectBomCharset(bytes) || getCharsetFromHeaders(headers);

        if (!charset && kind === 'html') charset = sniffHtmlCharset(bytes);
        if (!charset && kind === 'css') charset = sniffCssCharset(bytes);

        // 走到這裡代表檔案沒有自我宣告：同一份文件在本頁已被瀏覽器正確解碼過，
        // document.characterSet 就是最可靠的情報（例如 file:// 或缺少 charset 的伺服器）。
        if (!charset && kind === 'html') charset = document.characterSet || '';

        return decodeBytes(bytes, charset);
    }

    /**
     * 建立「字元 → 位元組」的反向對照表，用來還原 Tampermonkey 以單一位元組編碼解碼後的字串。
     *
     * 為什麼不能只檢查「字元碼 ≤ 0xFF」：
     *   瀏覽器的 `latin1` 標籤實際上是 **windows-1252**，不是 ISO-8859-1。
     *   兩者在 0x80–0x9F 這段不一致：位元組 0x80 解出來是 `€`（U+20AC），
     *   0x99 解出來是 `™`（U+2122），全都超過 0xFF。
     *   若用「有沒有超過 0xFF」當作判斷依據，一份含 `€` 的檔案就會被誤判成
     *   「已經被正確解碼」，於是整份文件帶著亂碼進到快照（實測踩到的雷）。
     *   因此改為向瀏覽器要一份真正的 256 筆對照表，逐一反查。
     *
     * 對照表只建立一次並快取，正常（UTF-8）路徑完全不會用到它。
     *
     * @returns {Map<string, number>} 字元 → 位元組
     */
    let singleByteReverseMap = null;
    function getSingleByteReverseMap() {
        if (singleByteReverseMap) return singleByteReverseMap;

        const decoder = new TextDecoder('windows-1252');
        const map = new Map();
        for (let byte = 0; byte < 256; byte += 1) {
            const char = decoder.decode(new Uint8Array([byte]));
            // windows-1252 對 0x81、0x8D、0x8F、0x90、0x9D 沒有定義，解碼結果是 U+FFFD。
            // U+FFFD 是「解碼失敗」的通用符號，若納入對照表會把真正的失敗誤還原成
            // 某個隨機位元組，因此刻意排除；含 U+FFFD 的字串會走「無法還原」的分支。
            if (char.length === 1 && char !== '\uFFFD' && !map.has(char)) map.set(char, byte);
        }

        singleByteReverseMap = map;
        return map;
    }

    /**
     * 把「單一位元組編碼解碼後」的字串還原成原始位元組。
     *
     * 用途：Tampermonkey 有時只交回 responseText，且是用單一位元組編碼解碼的結果。
     * 這種解碼對每個位元組是一對一映射，因此可以完全無損地反推回原始位元組，
     * 再用檔案自己宣告的編碼（例如 UTF-8）重新解碼一次。
     *
     * 必須同時涵蓋兩種解碼器（實測兩者都會出現，只處理一種就會殘留亂碼）：
     *   1. 真 Latin-1（ISO-8859-1）：位元組 → 相同碼位的字元，0x80–0x9F 會變成
     *      U+0080–U+009F 的控制字元。畫面上會看到「æ² 後面接一段空白」，
     *      因為那顆控制字元不佔寬度（Tampermonkey 的 file:// 實測行為）。
     *   2. windows-1252：0x80–0x9F 換成 `€`、`™`、`›` 等可見字元（Tampermonkey
     *      標示為 latin1 時的實際解碼器）。
     *
     * 因此策略是：碼位 ≤ 0xFF 直接視為同位元組（涵蓋第 1 種全部與第 2 種的
     * ASCII 部分），超過 0xFF 才查 windows-1252 反向表（涵蓋 `€`、`™` 這些
     * 「碼位大於 0xFF 但實際只佔一個位元組」的字元）。
     *
     * @param {string} text - 可能是單一位元組編碼解碼結果的字串
     * @returns {Uint8Array|null} 還原後的位元組；若含無法反查的字元則回傳 null
     */
    function singleByteTextToBytes(text) {
        const map = getSingleByteReverseMap();
        const bytes = new Uint8Array(text.length);
        for (let i = 0; i < text.length; i += 1) {
            const code = text.charCodeAt(i);

            if (code <= 0xFF) {
                // 真 Latin-1 的身分映射，同時涵蓋所有 ASCII 與 C1 控制字元
                bytes[i] = code;
                continue;
            }

            const byte = map.get(text[i]);
            // 反查不到代表這個字元不是單一位元組解碼的產物（例如已經是正確的 Unicode），
            // 無法還原，交給呼叫端直接沿用原字串。
            if (byte === undefined) return null;
            bytes[i] = byte;
        }
        return bytes;
    }

    /**
     * 抓回文字型資源並以正確編碼解碼（HTML / CSS / JS 共用）。
     *
     * 設計意圖（為什麼需要兩段式抓取）：
     *   - 主路徑用 arraybuffer，才能自行決定編碼，避免 file:// 沒有 Content-Type 時
     *     被 Tampermonkey 以 Latin-1 解碼而產生亂碼（見 decodeTextBytes 的說明）。
     *   - 但實測發現 Tampermonkey 在 file:// 上不一定會把 ArrayBuffer 交回來：
     *     回應被判定為成功、位元組卻是 0，於是重播模式拿到空字串並降級成靜態快照
     *     （0.6.1 的實際回報：狀態列顯示「重播不可用：原始文件內容為空」）。
     *   - 因此位元組為空時退回 responseText 再抓一次；拿回來的若是 Latin-1 解碼結果，
     *     就用 latin1TextToBytes 還原位元組、重新以正確編碼解碼，才不會把亂碼帶回快照。
     *   - 這條補救只在「arraybuffer 失敗」時才會多發一次請求，正常路徑沒有任何額外成本。
     *
     * @param {string} url - 絕對網址
     * @param {'html'|'css'|'js'} kind - 資源類型
     * @returns {Promise<{text: string, headers: string}>} 解碼後文字與原始標頭
     */
    async function fetchTextResource(url, kind) {
        const response = await gmFetch({ method: 'GET', url, responseType: 'arraybuffer' });
        const bytes = toByteArray(response.response);
        if (bytes.length > 0) {
            return {
                text: decodeTextBytes(bytes, response.responseHeaders, kind),
                headers: response.responseHeaders || ''
            };
        }

        // ── 補救路徑：arraybuffer 沒有內容 ──
        const textResponse = await gmFetch({ method: 'GET', url, responseType: 'text' });
        const rawText = typeof textResponse.responseText === 'string'
            ? textResponse.responseText
            : (typeof textResponse.response === 'string' ? textResponse.response : '');
        const headers = textResponse.responseHeaders || response.responseHeaders || '';

        // 先把單一位元組編碼的位元組映射還原，才能用檔案自己宣告的編碼重新解碼；
        // 若還原不了（字串已含無法反查的字元），代表 Tampermonkey 這次解對了，直接沿用。
        const recoveredBytes = singleByteTextToBytes(rawText);
        const text = recoveredBytes
            ? decodeTextBytes(recoveredBytes, headers, kind)
            : rawText;

        return { text, headers };
    }

    // ===== 工具：Promise 化 GM_xmlhttpRequest =====

    class LocalSnapshotResourceError extends Error {
        constructor(safeUrl, cause) {
            super(
                `無法讀取快照所需的本機檔案：${safeUrl}\n` +
                '請確認檔案存在，在 Chrome 擴充功能詳細資料開啟「允許存取檔案網址」，' +
                '並在 Tampermonkey 進階設定將「允許腳本存取本機檔案」設為「所有本機檔案（All local files）」。',
                { cause }
            );
        }
    }

    /**
     * 將 GM_xmlhttpRequest 包裝成 Promise，
     * 統一處理 onload / onerror / ontimeout / onabort 回呼，
     * 讓後續程式碼可使用 async/await 語法。
     *
     * 錯誤訊息中的網址一律先經 redactSasSignature() 遮蔽，
     * 呼叫端可放心把 err.message 顯示在頁面上或寫入 console。
     *
     * @param {object} options - 傳入 GM_xmlhttpRequest 的選項物件
     * @returns {Promise<object>} 解析後的 GM_xmlhttpRequest response 物件
     */
    async function gmFetch(options) {
        const safeUrl = redactSasSignature(options.url);
        const readsLocalFile = options.method === 'GET' && options.url.startsWith('file:');
        // 只有發佈本機頁面時才允許讀本機資源，避免遠端網頁透過快照取得本機檔案。
        if (readsLocalFile && location.protocol !== 'file:') {
            throw new Error('只有本機頁面可以讀取本機快照資源。');
        }

        return new Promise((resolve, reject) => {
            const rejectRequest = error => reject(readsLocalFile ? new LocalSnapshotResourceError(safeUrl, error) : error);
            GM_xmlhttpRequest({
                timeout: REQUEST_TIMEOUT_MS,
                ...options,
                onload(response) {
                    // Tampermonkey 用 status 0 回報成功的 file: 讀取。只接受帶有實際資料的本機 GET，
                    // 避免把 HTTP 網路錯誤或空的本機回應當成成功，也不影響 Azure 的 PUT/DELETE 判斷。
                    const hasLocalResponse = readsLocalFile && response.status === 0 && (
                        options.responseType === 'arraybuffer'
                            ? Number.isFinite(response.response?.byteLength)
                            : typeof response.responseText === 'string'
                    );
                    if (hasLocalResponse || (response.status >= 200 && response.status < 400)) {
                        resolve(response);
                    } else {
                        // Azure Storage 會以 x-ms-error-code 標頭說明失敗原因
                        // （例如 AuthorizationPermissionMismatch 代表 SAS 缺少 c/w 權限、
                        // AuthenticationFailed 多半是 Token 過期或簽章錯誤），附在訊息中方便排查；
                        // 一般網站資源沒有這個標頭時維持原本格式。
                        const azureErrorCode = getResponseHeaderValue(response.responseHeaders, 'x-ms-error-code');
                        const codeSuffix = azureErrorCode ? ` (${azureErrorCode})` : '';
                        rejectRequest(new Error(`HTTP ${response.status}${codeSuffix}: ${safeUrl}`));
                    }
                },
                onerror(err) {
                    // 錯誤物件的 finalUrl 等欄位同樣含有完整 SAS URL，序列化後也要遮蔽。
                    let detail = '';
                    try {
                        detail = JSON.stringify(err);
                    } catch {
                        detail = String(err);
                    }
                    rejectRequest(new Error(`Network error: ${safeUrl} — ${redactSasSignature(detail)}`));
                },
                ontimeout()   { rejectRequest(new Error(`Timeout: ${safeUrl}`)); },
                onabort()     { rejectRequest(new Error(`Aborted: ${safeUrl}`)); }
            });
        });
    }

    /**
     * 簡單的 Promise 延遲工具。
     *
     * 設計意圖：
     *   - 讓原本以 setTimeout() 實作的「延後開新頁籤」可被 await，
     *     使主流程的生命週期更完整、也更容易被防重入鎖正確涵蓋。
     *   - 只有當延遲結束且開頁邏輯完成後，才釋放 activeSaveOperation，
     *     避免短時間內再次觸發時又啟動第二輪上傳。
     *
     * @param {number} ms - 要等待的毫秒數
     * @returns {Promise<void>} 延遲完成後 resolve
     */
    function delay(ms) {
        return new Promise(resolve => {
            window.setTimeout(resolve, ms);
        });
    }

    // ===== 工具：從 responseHeaders 字串解析 Content-Type =====

    /**
     * 從 GM_xmlhttpRequest 的 responseHeaders 字串中抽取 MIME type，
     * 剝除 charset 等參數，只回傳純粹的 MIME type 字串，例如 "image/png"。
     *
     * @param {string} headers - HTTP response headers 的原始字串
     * @returns {string} 解析到的 MIME type，或空字串（解析失敗時）
     */
    function parseMimeType(headers) {
        const line = (headers || '').split('\n').find(h => h.toLowerCase().startsWith('content-type:'));
        if (!line) return '';
        const value = line.split(':').slice(1).join(':').trim();
        return value.split(';')[0].trim();
    }

    /**
     * 將 MIME type 正規化為不含 charset 等參數的小寫字串。
     *
     * @param {string} mimeType - 原始 MIME type
     * @returns {string} 正規化後的 MIME type
     */
    function normalizeMimeType(mimeType) {
        return (mimeType || '').split(';')[0].trim().toLowerCase();
    }

    // ===== 工具：依副檔名猜測 MIME type（作為 Content-Type 解析失敗時的後備）=====

    /**
     * 當 HTTP 回應標頭缺少 Content-Type 時，
     * 根據 URL 副檔名推測資源的 MIME type，以確保 Data URI 格式正確。
     *
     * @param {string} url - 資源的 URL 字串
     * @returns {string} 推測的 MIME type，預設為 "application/octet-stream"
     */
    function guessMimeType(url) {
        const ext = url.split('?')[0].split('#')[0].split('.').pop().toLowerCase();
        const map = {
            // 圖片
            png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg',
            gif: 'image/gif', webp: 'image/webp', avif: 'image/avif',
            svg: 'image/svg+xml', ico: 'image/x-icon', bmp: 'image/bmp',
            // 字型
            woff: 'font/woff', woff2: 'font/woff2',
            ttf: 'font/ttf', otf: 'font/otf', eot: 'application/vnd.ms-fontobject',
            // 樣式與文件
            css: 'text/css', js: 'application/javascript',
            json: 'application/json', html: 'text/html', htm: 'text/html',
            xml: 'text/xml', md: 'text/markdown', markdown: 'text/markdown',
            csv: 'text/csv', tsv: 'text/tab-separated-values',
            txt: 'text/plain', yaml: 'application/yaml', yml: 'application/yaml',
            sql: 'application/sql',
            // 其他
            pdf: 'application/pdf', mp4: 'video/mp4', webm: 'video/webm'
        };
        return map[ext] || 'application/octet-stream';
    }

    /**
     * 建立可排序、可讀、且檔名安全的時間戳記。
     *
     * @returns {string} YYYYMMDD-HHmmss 格式時間戳
     */
    function createTimestamp() {
        const now = new Date();
        return now.getFullYear().toString() +
            String(now.getMonth() + 1).padStart(2, '0') +
            String(now.getDate()).padStart(2, '0') + '-' +
            String(now.getHours()).padStart(2, '0') +
            String(now.getMinutes()).padStart(2, '0') +
            String(now.getSeconds()).padStart(2, '0');
    }

    /**
     * 將檔名片段限制在 Azure Blob URL 友善的字元集合。
     *
     * @param {string} value - 原始檔名片段
     * @param {string} fallback - 清理後為空時使用的後備值
     * @returns {string} 清理後檔名片段
     */
    function sanitizeBlobNamePart(value, fallback) {
        const sanitized = String(value || '')
            .trim()
            .replace(/[^a-zA-Z0-9.-]+/g, '_')
            .replace(/^_+|_+$/g, '');
        return sanitized || fallback;
    }

    /**
     * 標準化副檔名，確保後續組 Blob name 時不會出現雙點或特殊字元。
     *
     * @param {string} extension - 原始副檔名，可含或不含開頭的 "."
     * @returns {string} 不含 "." 的安全副檔名
     */
    function normalizeExtension(extension) {
        const normalized = String(extension || '')
            .trim()
            .replace(/^\.+/, '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '');
        return normalized || 'bin';
    }

    /**
     * 依照固定命名規則產生 Blob 檔名。
     *
     * @param {string} prefix - 檔名前綴，例如 snapshot 或 content
     * @param {string} extension - 副檔名
     * @returns {string} Blob 檔名
     */
    function buildBlobName(prefix, extension) {
        const safePrefix = sanitizeBlobNamePart(prefix, 'upload');
        const hostname = sanitizeBlobNamePart(location.hostname, 'unknown');
        return `${safePrefix}-${hostname}-${createTimestamp()}.${normalizeExtension(extension)}`;
    }

    /**
     * 將文字副檔名轉換成 Azure Blob 應設定的 Content-Type。
     *
     * @param {string} extension - 不含 "." 的副檔名
     * @returns {string} Content-Type 標頭值
     */
    function getTextContentType(extension) {
        return TEXT_EXTENSION_TO_CONTENT_TYPE[normalizeExtension(extension)] || TEXT_EXTENSION_TO_CONTENT_TYPE.txt;
    }

    /**
     * 從已知 MIME type 推出副檔名。
     *
     * @param {string} mimeType - 原始 MIME type
     * @returns {string} 副檔名；未知時回傳空字串
     */
    function getExtensionFromMimeType(mimeType) {
        const normalized = normalizeMimeType(mimeType);

        if (TEXT_MIME_TYPE_TO_EXTENSION[normalized]) {
            return TEXT_MIME_TYPE_TO_EXTENSION[normalized];
        }

        if (IMAGE_MIME_TYPE_TO_EXTENSION[normalized]) {
            return IMAGE_MIME_TYPE_TO_EXTENSION[normalized];
        }

        if (normalized.startsWith('image/')) {
            return normalizeExtension(normalized.replace(/^image\//, '')) || 'img';
        }

        return '';
    }

    /**
     * 判斷文字是否像 HTML 文件或 HTML 片段。
     *
     * @param {string} text - 已 trim 的文字
     * @returns {boolean} 是否像 HTML
     */
    function looksLikeHtml(text) {
        return /^<!doctype\s+html/i.test(text) ||
            /^<html[\s>]/i.test(text) ||
            /<\/(?:html|head|body|main|article|section|div|p|span|table|ul|ol|li|h[1-6])>/i.test(text) ||
            /<(?:html|head|body|main|article|section|div|p|span|table|ul|ol|li|h[1-6]|br|img|a)\b[^>]*>/i.test(text);
    }

    /**
     * 判斷文字是否像 SVG；SVG 是文字格式，但正確 Content-Type 應屬 image/svg+xml。
     *
     * @param {string} text - 已 trim 的文字
     * @returns {boolean} 是否像 SVG
     */
    function looksLikeSvg(text) {
        return /^<svg[\s>]/i.test(text) || /^<\?xml[\s\S]*<svg[\s>]/i.test(text);
    }

    /**
     * 判斷文字是否為可解析的 JSON。
     *
     * @param {string} text - 已 trim 的文字
     * @returns {boolean} 是否像 JSON
     */
    function looksLikeJson(text) {
        if (!/^[{[]/.test(text)) return false;

        try {
            JSON.parse(text);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * 判斷文字是否像 XML 文件。
     *
     * @param {string} text - 已 trim 的文字
     * @returns {boolean} 是否像 XML
     */
    function looksLikeXml(text) {
        return /^<\?xml\b/i.test(text) ||
            /^<(?:rss|feed|urlset|sitemapindex|configuration|project)\b[\s\S]*<\/(?:rss|feed|urlset|sitemapindex|configuration|project)>$/i.test(text);
    }

    /**
     * 依指定分隔符計算一行中大致的欄位數，簡單支援 CSV 雙引號跳脫。
     *
     * @param {string} line - 單行文字
     * @param {string} delimiter - 分隔符
     * @returns {number} 欄位數
     */
    function countDelimitedFields(line, delimiter) {
        let count = 1;
        let inQuotes = false;

        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (!inQuotes && char === delimiter) {
                count++;
            }
        }

        return count;
    }

    /**
     * 偵測逗號、分號或 tab 分隔文字；tab 會輸出 .tsv，其餘輸出 .csv。
     *
     * @param {string} text - 原始文字
     * @returns {{extension: string}|null} 偵測結果
     */
    function detectDelimitedText(text) {
        const lines = text
            .replace(/\r\n?/g, '\n')
            .split('\n')
            .map(line => line.trim())
            .filter(Boolean)
            .slice(0, 20);

        if (lines.length < 2) return null;

        for (const delimiter of [',', '\t', ';']) {
            const counts = lines.map(line => countDelimitedFields(line, delimiter));
            const usefulCounts = counts.filter(count => count >= 2);

            if (usefulCounts.length < Math.min(2, lines.length)) {
                continue;
            }

            const firstCount = usefulCounts[0];
            const matchingCount = usefulCounts.filter(count => count === firstCount).length;

            if (matchingCount / usefulCounts.length >= 0.8) {
                return { extension: delimiter === '\t' ? 'tsv' : 'csv' };
            }
        }

        return null;
    }

    /**
     * 判斷文字是否像 Markdown。
     *
     * @param {string} text - 原始文字
     * @returns {boolean} 是否像 Markdown
     */
    function looksLikeMarkdown(text) {
        return /^#{1,6}\s+\S/m.test(text) ||
            /^```[\s\S]*```/m.test(text) ||
            /^~~~[\s\S]*~~~/m.test(text) ||
            /^\s{0,3}>\s+\S/m.test(text) ||
            /^\s{0,3}(?:[-*+]|\d+\.)\s+\S/m.test(text) ||
            /\[[^\]\n]+\]\([^)]+\)/.test(text) ||
            /^\|?.+\|.+\n\|?\s*:?-{3,}:?\s*\|/m.test(text);
    }

    /**
     * 判斷文字是否像 YAML。
     *
     * @param {string} text - 原始文字
     * @returns {boolean} 是否像 YAML
     */
    function looksLikeYaml(text) {
        const lines = text
            .replace(/\r\n?/g, '\n')
            .split('\n')
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('#'))
            .slice(0, 20);

        if (!lines.length) return false;
        if (lines[0] === '---') return true;

        const keyValueLines = lines.filter(line => /^[a-zA-Z0-9_.-]+:\s+.+$/.test(line));
        return keyValueLines.length >= 2 && keyValueLines.length / lines.length >= 0.5;
    }

    /**
     * 判斷文字是否像 CSS。
     *
     * @param {string} text - 已 trim 的文字
     * @returns {boolean} 是否像 CSS
     */
    function looksLikeCss(text) {
        return /^[^{]+\{[\s\S]*:[\s\S]*\}/.test(text);
    }

    /**
     * 判斷文字是否像 JavaScript。
     *
     * @param {string} text - 已 trim 的文字
     * @returns {boolean} 是否像 JavaScript
     */
    function looksLikeJavaScript(text) {
        return /^(?:import|export)\s/m.test(text) ||
            (/\b(?:const|let|var|function|class)\s+[a-zA-Z_$][\w$]*/.test(text) && /[;{}]/.test(text));
    }

    /**
     * 判斷文字是否像 SQL。
     *
     * @param {string} text - 已 trim 的文字
     * @returns {boolean} 是否像 SQL
     */
    function looksLikeSql(text) {
        return /^(?:select|with|insert|update|delete|create|alter|drop)\b/i.test(text) &&
            /\b(?:from|into|table|set|where|values|as)\b/i.test(text);
    }

    /**
     * 依文字內容與來源 MIME type 推斷發佈格式。
     *
     * @param {string} text - 待發佈文字
     * @param {string} sourceMimeType - 來源 MIME type
     * @returns {{extension: string, contentType: string, label: string}} 格式描述
     */
    function inferTextFormat(text, sourceMimeType) {
        const normalizedSourceMimeType = normalizeMimeType(sourceMimeType);

        if (normalizedSourceMimeType && normalizedSourceMimeType !== 'text/plain') {
            const extensionFromMime = getExtensionFromMimeType(normalizedSourceMimeType);
            if (extensionFromMime) {
                return {
                    extension: extensionFromMime,
                    contentType: getTextContentType(extensionFromMime),
                    label: normalizedSourceMimeType
                };
            }
        }

        const trimmed = text.trim();

        if (looksLikeSvg(trimmed)) {
            return { extension: 'svg', contentType: getTextContentType('svg'), label: 'SVG' };
        }

        if (looksLikeHtml(trimmed)) {
            return { extension: 'html', contentType: getTextContentType('html'), label: 'HTML' };
        }

        if (looksLikeJson(trimmed)) {
            return { extension: 'json', contentType: getTextContentType('json'), label: 'JSON' };
        }

        if (looksLikeXml(trimmed)) {
            return { extension: 'xml', contentType: getTextContentType('xml'), label: 'XML' };
        }

        const delimitedText = detectDelimitedText(text);
        if (delimitedText) {
            return {
                extension: delimitedText.extension,
                contentType: getTextContentType(delimitedText.extension),
                label: delimitedText.extension.toUpperCase()
            };
        }

        if (looksLikeMarkdown(text)) {
            return { extension: 'md', contentType: getTextContentType('md'), label: 'Markdown' };
        }

        if (looksLikeYaml(text)) {
            return { extension: 'yaml', contentType: getTextContentType('yaml'), label: 'YAML' };
        }

        if (looksLikeCss(trimmed)) {
            return { extension: 'css', contentType: getTextContentType('css'), label: 'CSS' };
        }

        if (looksLikeJavaScript(trimmed)) {
            return { extension: 'js', contentType: getTextContentType('js'), label: 'JavaScript' };
        }

        if (looksLikeSql(trimmed)) {
            return { extension: 'sql', contentType: getTextContentType('sql'), label: 'SQL' };
        }

        return { extension: 'txt', contentType: getTextContentType('txt'), label: '純文字' };
    }

    // ===== 核心：將外部 URL 資源轉換為 base64 Data URI =====

    /**
     * 透過 GM_xmlhttpRequest（繞過 CORS 限制）抓取指定 URL 的資源，
     * 將其轉換為 base64 Data URI 格式，使資源可完整內嵌於 HTML 文件中。
     *
     * 若資源由公共 CDN 提供、超過 MAX_INLINE_SIZE_BYTES（預設 10MB），
     * 或抓取失敗（網路錯誤、逾時、HTTP 錯誤等），
     * 將直接回傳原始絕對 URL，確保頁面仍可正常顯示。
     *
     * 傳入 resourceCache 時，同一次快照中相同的絕對網址只會下載一次：
     * 同一張背景圖常被數十個 style 屬性或多條 CSS 規則重複引用，
     * 原本每次出現都重新下載與 base64 編碼；連不上的主機更會每次都等滿
     * REQUEST_TIMEOUT_MS（30 秒）才放棄，被引用 N 次就多等 N 倍時間。
     * 快取存放的是 Promise，並行或先後請求同一網址時都會共用同一個結果
     * （成功的 Data URI 或失敗後的原始絕對 URL）。
     *
     * @param {string} url      - 欲轉換的資源 URL（可為相對路徑）
     * @param {string} baseUrl  - 解析相對 URL 時使用的基準 URL，預設為 location.href
     * @param {Map<string, Promise<string>>} [resourceCache] - 單次快照專用的下載結果快取
     * @returns {Promise<string>} Data URI 字串，或保留外連時的絕對 URL
     */
    async function toDataUri(url, baseUrl, resourceCache) {
        if (!url) return url;

        // 已是 Data URI，直接回傳
        if (url.startsWith('data:')) return url;

        // 解析為絕對 URL，若格式錯誤則略過
        let absoluteUrl;
        try {
            const resolvedUrl = new URL(url, baseUrl || location.href);
            absoluteUrl = resolvedUrl.href;
            if (EXTERNAL_CDN_HOSTNAMES.has(resolvedUrl.hostname)) return absoluteUrl;
        } catch {
            return url;
        }

        // blob: URL 屬於另一個 origin，GM_xmlhttpRequest 無法跨域取得，直接略過
        if (absoluteUrl.startsWith('blob:')) return absoluteUrl;

        if (!resourceCache) {
            return fetchAsDataUri(absoluteUrl);
        }

        if (!resourceCache.has(absoluteUrl)) {
            resourceCache.set(absoluteUrl, fetchAsDataUri(absoluteUrl));
        }
        return resourceCache.get(absoluteUrl);
    }

    /**
     * 下載單一絕對網址並轉成 Data URI。網路資源失敗時保留絕對 URL，本機檔案讀取失敗時中止快照。
     *
     * @param {string} absoluteUrl - 已解析的絕對網址
     * @returns {Promise<string>} Data URI 字串，或原始絕對 URL（轉換失敗時）
     */
    async function fetchAsDataUri(absoluteUrl) {
        try {
            const response = await gmFetch({
                method: 'GET',
                url: absoluteUrl,
                responseType: 'arraybuffer'
            });

            // 確認資源大小在可接受範圍
            if (response.response.byteLength > MAX_INLINE_SIZE_BYTES) {
                console.warn(`[SavePageToAzureBlob] 資源超過大小上限，略過內嵌：${redactSasSignature(absoluteUrl)}`);
                return absoluteUrl;
            }

            const mimeType = parseMimeType(response.responseHeaders) || guessMimeType(absoluteUrl);
            const bytes = new Uint8Array(response.response);

            // 使用分塊方式轉換，避免超大陣列展開時發生 call stack overflow
            let binary = '';
            const chunkSize = 8192;
            for (let i = 0; i < bytes.length; i += chunkSize) {
                binary += String.fromCharCode(...bytes.subarray(i, Math.min(i + chunkSize, bytes.length)));
            }

            return `data:${mimeType};base64,${btoa(binary)}`;
        } catch (err) {
            // 發佈後瀏覽器無法讀取來源電腦的 file: URL。本機資源失敗時透過發佈狀態列提示，
            // 讓使用者能排除問題再重試；網路資源仍可保留外連。
            if (err instanceof LocalSnapshotResourceError) throw err;
            // 頁面資源本身也可能是帶 SAS 的網址（例如在 Infinitybin 或 Azure Storage 頁面上製作快照），
            // 寫入 console 前一律遮蔽 sig。
            console.warn(`[SavePageToAzureBlob] 無法轉換資源（${describeError(err)}）：${redactSasSignature(absoluteUrl)}`);
            return absoluteUrl;
        }
    }

    /**
     * 依照 matchAll() 的結果，一次組出替換後的新字串。
     *
     * 設計意圖：
     *   - 原本對每個比對結果呼叫 cssText.replace(match[0], replacement)，有兩個問題：
     *     1) replacement 為字串時，其中的 $$、$&、$`、$' 會被當成特殊替換樣式，
     *        引入的 CSS 只要含有 content: "$$" 之類的文字就會被改寫或插入多餘內容；
     *     2) 每次 replace 都會複製整段越來越長的 CSS（Data URI 動輒數十 KB），
     *        數百個 url() 時是 O(n²) 的字串複製，實測 1000 個 30KB 圖片約需 3.7 秒。
     *   - 改為依比對位置由前往後切片拼接：只掃描一次、不解析 $ 樣式，
     *     且每個替換精準對應到自己的位置，不會誤改到前面同字串的其他出現處。
     *
     * @param {string} text - 原始文字
     * @param {Array<RegExpMatchArray>} matches - 依出現順序排列的比對結果（需含 index）
     * @param {Array<string|null>} replacements - 與 matches 對應的替換文字；null 代表保留原文
     * @returns {string} 替換後的文字
     */
    function replaceMatchesInOrder(text, matches, replacements) {
        let result = '';
        let lastIndex = 0;

        matches.forEach((match, index) => {
            const replacement = replacements[index];
            result += text.slice(lastIndex, match.index) + (replacement ?? match[0]);
            lastIndex = match.index + match[0].length;
        });

        return result + text.slice(lastIndex);
    }

    // ===== 核心：遞迴內嵌 CSS 資源，保留公共 CDN 連結 =====

    /**
     * 分析 CSS 文字中的所有 @import 規則與 url() 函式，
     * 將可內嵌的資源轉成 Data URI 或 CSS 文字，公共 CDN 則保留為絕對網址。
     *
     * 處理順序：先遞迴處理 @import，再處理 url()，
     * 讓各層樣式表都能用自己的網址解析相對路徑。
     *
     * @param {string} cssText - 待處理的 CSS 文字內容
     * @param {string} baseUrl - 解析 CSS 中相對路徑所使用的基準 URL
     * @param {Map<string, Promise<string>>} [resourceCache] - 單次快照專用的下載結果快取
     * @param {Set<string>} [importChain] - 目前遞迴路徑上已展開的樣式表絕對網址，用來偵測循環 @import
     * @returns {Promise<string>} 可內嵌資源已處理的 CSS 文字
     */
    async function inlineCssResources(cssText, baseUrl, resourceCache, importChain = new Set()) {
        // ── 第一步：展開 @import 規則（遞迴處理） ──
        // 比對兩種語法：@import url("...") 與 @import "..."
        const importRegex = /@import\s+(?:url\(\s*(['"]?)([^'")]+)\1\s*\)|(['"])([^'"]+)\3)\s*([^;]*);/gi;
        const importMatches = [...cssText.matchAll(importRegex)];
        const importReplacements = new Array(importMatches.length);
        let hasLaterImport = false;

        // 從後往前處理，才能判定較早的匯入是否可以展開。若後方仍有 @import，
        // 直接插入一般樣式規則會使瀏覽器忽略後方的匯入（例如 Google Fonts）。
        for (let index = importMatches.length - 1; index >= 0; index--) {
            const match = importMatches[index];
            // 取出 import 的 URL（url() 語法存在 match[2]，引號語法存在 match[4]）
            const importedUrl = match[2] || match[4];
            const mediaQuery = match[5] ? match[5].trim() : '';
            const importConditions = mediaQuery ? ` ${mediaQuery}` : '';
            let replacement = null;

            try {
                const resolvedUrl = new URL(importedUrl, baseUrl);
                const absUrl = resolvedUrl.href;

                // 在下載前判斷是否保留外連。改用絕對網址，讓被展開的樣式表不再依賴原本的路徑。
                if (EXTERNAL_CDN_HOSTNAMES.has(resolvedUrl.hostname)) {
                    replacement = `@import "${absUrl}"${importConditions};`;
                    hasLaterImport = true;
                } else if (importChain.has(absUrl)) {
                    console.warn(`[SavePageToAzureBlob] 偵測到循環 @import，略過展開：${redactSasSignature(absUrl)}`);
                } else {
                    // 一樣走 arraybuffer + 自行解碼：巢狀 @import 的 CSS 也可能是本機檔案，
                    // 用 text 模式會重演 Latin-1 亂碼（見 decodeTextBytes 的說明）。
                    const { text: importedCssText } = await fetchTextResource(absUrl, 'css');
                    // 遞迴處理引入的 CSS，並以其絕對 URL 作為新的 baseUrl
                    const importedCss = await inlineCssResources(
                        importedCssText,
                        absUrl,
                        resourceCache,
                        new Set(importChain).add(absUrl)
                    );

                    if (hasLaterImport || importedCss.search(importRegex) !== -1) {
                        // 用內嵌的樣式表維持匯入順序，並保留巢狀匯入自己的頂層位置。
                        // 額外編碼左括號與單引號，避免後續的 url() 與 @import 掃描誤讀資料內容。
                        const encodedCss = encodeURIComponent(importedCss).replace(/\(/g, '%28').replace(/'/g, '%27');
                        replacement = `@import "data:text/css;charset=utf-8,${encodedCss}"${importConditions};`;
                        hasLaterImport = true;
                    } else {
                        replacement = mediaQuery ? `@media ${mediaQuery} {\n${importedCss}\n}` : importedCss;
                    }
                }
            } catch (err) {
                if (err instanceof LocalSnapshotResourceError) throw err;
                // @import 展開失敗時保留原始宣告，不中斷整體處理
                console.warn(`[SavePageToAzureBlob] @import 展開失敗（${describeError(err)}）：${redactSasSignature(importedUrl)}`);
            }

            if (replacement === null) hasLaterImport = true;
            importReplacements[index] = replacement;
        }

        if (importMatches.length > 0) {
            cssText = replaceMatchesInOrder(cssText, importMatches, importReplacements);
        }

        // ── 第二步：處理 url() 資源，將保留的外連轉成絕對網址 ──
        // 比對 url('...') 與 url("...") 與 url(...) 三種語法
        const urlRegex = /url\(\s*(['"]?)([^'")]+)\1\s*\)/gi;
        const urlMatches = [...cssText.matchAll(urlRegex)];
        const urlReplacements = [];

        for (const match of urlMatches) {
            const resourceUrl = match[2].trim();
            let replacement = null;

            // 已是 Data URI，跳過。
            // url(#id) 是指向同一份文件內 SVG 元素（漸層、clipPath、mask、filter）的片段參照，
            // 不是外部資源；原本會被解析成「目前網頁網址#id」而下載整份 HTML，
            // 再以 data:text/html 取代，反而破壞 SVG 的填色與遮罩，並讓快照暴增。
            if (!resourceUrl.startsWith('data:') && !resourceUrl.startsWith('#')) {
                const resolvedResource = await toDataUri(resourceUrl, baseUrl, resourceCache);
                // 相對 CDN 路徑（包括 // 開頭的網址）必須改成絕對路徑，才能在快照中載入。
                if (resolvedResource !== resourceUrl && /^(?:data:|https?:\/\/)/.test(resolvedResource)) {
                    replacement = `url("${resolvedResource}")`;
                }
            }

            urlReplacements.push(replacement);
        }

        if (urlMatches.length === 0) {
            return cssText;
        }

        return replaceMatchesInOrder(cssText, urlMatches, urlReplacements);
    }

    // ===== 核心：取得要被序列化的根節點（重播 / 靜態） =====

    /**
     * 重播模式判定「原始文件只是空殼」的門檻（可見文字字元數）。
     *
     * 設計意圖（這裡踩過一次坑）：
     *   - 一開始想用「原始文件文字量 / 目前頁面文字量」的比例判斷，結果正常頁面也被誤殺：
     *     像規格表這種「表格由 inline 腳本依內嵌資料產生」的頁面，原始 HTML 只有骨架，
     *     文字量可能只有目前頁面的 2 成，但重播完全正常（腳本會把表格重建出來）。
     *   - 真正該擋的是 SPA 空殼：原始文件幾乎沒有文字（<div id="root"></div> ＋ 一大包 JS），
     *     重播只會得到空白頁。這種情況用「絕對文字量」判斷就夠了。
     */
    const REPLAY_SHELL_MAX_TEXT_LENGTH = 200;

    /**
     * 低於這個內容比例時，仍允許重播，只在狀態提示條提醒「可能需要改用靜態快照」。
     *
     * 保留這種「軟警告」而不是直接降級，是因為比例低不代表重播會失敗
     * （前端重建型頁面比例天生就低），真正的判斷留給使用者眼睛。
     */
    const REPLAY_CONTENT_WARNING_RATIO = 0.2;

    /**
     * 估算節點中「使用者看得到的文字量」，用於判斷原始文件是否已含頁面內容。
     *
     * 設計意圖：
     *   - 必須先排除 <script> / <style> 等非內容文字，否則 SPA 空殼頁會因為內嵌的
     *     大段 JS 字串（路由表、模板）被誤判成「內容充足」，讓重播產出空白頁。
     *   - 一律去除空白後再計數，避免縮排與換行造成比例失真。
     *
     * @param {Element} root - 文件根節點（可以是 clone，不會被修改）
     * @returns {number} 可見文字的字元數（已去除所有空白）
     */
    function estimateContentTextLength(root) {
        const probe = root.cloneNode(true);
        probe.querySelectorAll('script, style, noscript, template').forEach(el => el.remove());
        // 本腳本自己注入的工具列不是頁面內容，比對前先排除。
        probe.querySelector('#__save_azure_status_bar__')?.remove();
        probe.querySelector(`#${DELETE_BAR_ELEMENT_ID}`)?.remove();
        return (probe.textContent || '').replace(/\s+/g, '').length;
    }

    /**
     * 重播模式：重新取得「尚未執行腳本」的原始 HTML，作為快照的根節點。
     *
     * 設計意圖：
     *   - 靜態快照是「把已渲染的 DOM 凍結起來」，因此不能保留腳本；重播模式反過來，
     *     從原始文件重新開始，讓頁面自己的 JavaScript 只執行一次，互動與畫面都正常。
     *   - 原始文件只當成「結構來源」，後續仍會走同一套資源內嵌流程（CSS／圖片／字型），
     *     所以快照依然是單一檔案、脫離原站可讀。
     *   - 失敗一律以例外回報，由呼叫端決定退回靜態快照；這裡不自行降級，
     *     才能讓狀態提示條說明「為什麼沒能用重播」。
     *
     * @param {string} pageUrl - 目前頁面網址（同時是重新取得原始文件的網址）
     * @param {function} progress - 進度回呼
     * @returns {Promise<{root: Element, contentRatio: number}>}
     *   原始文件的根節點，以及它的可讀文字量相對目前頁面的比例
     * @throws {Error} 無法重抓、不是 HTML、或研判為空白空殼時
     */
    async function createReplaySnapshotRoot(pageUrl, progress) {
        // blob:、data:、about: 之類的網址沒有「原始文件」可抓，直接判定不可重播。
        if (!/^(https?|file):$/.test(location.protocol)) {
            throw new Error(`此頁面協定（${location.protocol}）無法重新取得原始文件`);
        }

        progress('取得原始 HTML 文件');
        // 一律以 arraybuffer 抓回並自行解碼：file:// 沒有 Content-Type，
        // 交給 Tampermonkey 以 text 模式解碼會變成 Latin-1 亂碼（見 decodeTextBytes 的說明）。
        const { text: source, headers } = await fetchTextResource(pageUrl, 'html');
        if (!source.trim()) {
            throw new Error('原始文件內容為空');
        }

        // 伺服器可能回傳 JSON／圖片等非 HTML 內容（例如直接把 API 網址開在瀏覽器裡）。
        const contentType = getResponseHeaderValue(headers, 'content-type');
        if (contentType && !/html/i.test(contentType)) {
            throw new Error(`原始文件不是 HTML（${contentType}）`);
        }

        // 用 DOMParser 解析：解析出來的節點不屬於目前文件，不會觸發任何腳本或資源載入，
        // 因此可以安全地當成「預備要被序列化的 DOM」。
        const parsed = new DOMParser().parseFromString(source, 'text/html');
        const root = parsed.documentElement;
        if (!root) {
            throw new Error('無法解析原始文件');
        }

        // 空殼判斷：目前頁面明明有內容，原始文件卻幾乎沒有可讀文字，代表內容是
        // 執行後才從 API 抓回來的，重播只會得到空白頁，因此改走靜態快照。
        // 目前頁面本身也很空（例如空白頁、純圖片頁）時不做判斷，避免誤殺。
        const liveLength = estimateContentTextLength(document.documentElement);
        const sourceLength = estimateContentTextLength(root);
        if (liveLength >= 1000 && sourceLength <= REPLAY_SHELL_MAX_TEXT_LENGTH) {
            throw new Error(`原始文件幾乎沒有可讀內容（${sourceLength} 字），研判為前端動態產生的頁面`);
        }

        return {
            root,
            contentRatio: liveLength > 0 ? sourceLength / liveLength : 1
        };
    }

    /**
     * 重播模式：把外部 <script src> 的程式碼抓回來內嵌，讓快照不依賴原站也能執行。
     *
     * 設計意圖：
     *   - 重播模式的重點就是「腳本要能跑」，若沿用靜態模式「清空 src」的做法，
     *     頁面會停在半殘狀態（DOM 有了但沒有事件監聽與後續渲染）。
     *   - 因此逐一把外部腳本內容抓回來；抓不到時退回「絕對網址載入」，
     *     寧可讓快照需要連線，也不要留下一個永遠不會執行的頁面。
     *   - module 腳本例外：它的 import 以「檔案網址」為基準解析，內嵌後基準會變成
     *     快照的 Blob 網址，相對匯入全部失效，所以只把 src 改成絕對網址。
     *
     * @param {Element} root - 快照根節點（會被就地修改）
     * @param {string} resourceBaseUrl - 解析相對網址的基準（原頁面網址）
     * @param {function} progress - 進度回呼
     */
    async function inlineExternalScriptsIntoRoot(root, resourceBaseUrl, progress) {
        for (const el of [...root.querySelectorAll('script[src]')]) {
            const src = el.getAttribute('src');
            if (!src) continue;

            let absoluteSrc = src;
            try {
                absoluteSrc = new URL(src, resourceBaseUrl).href;
            } catch {
                // 無法解析的網址維持原樣，交給瀏覽器自己判斷
            }

            const type = (el.getAttribute('type') || '').trim().toLowerCase();
            const label = absoluteSrc.split('/').pop()?.substring(0, 40) || 'script';

            if (type === 'module') {
                el.setAttribute('src', absoluteSrc);
                progress(`保留外部模組：${label}`);
                continue;
            }

            try {
                // 同樣以 arraybuffer＋自行解碼處理，避免非 UTF-8 的 JS 在快照中變成亂碼
                const { text: code } = await fetchTextResource(absoluteSrc, 'js');
                if (!code) throw new Error('腳本內容為空');
                // 以字元數近似位元組數：JS 幾乎是單一位元組字元，用來擋超大檔已足夠
                if (code.length > MAX_INLINE_SIZE_BYTES) throw new Error('腳本超過內嵌大小上限');

                el.removeAttribute('src');
                // 內容已改寫（也少了原本的 charset 處理），integrity 驗證必然失敗，必須移除
                el.removeAttribute('integrity');
                el.removeAttribute('crossorigin');
                el.textContent = code;
                progress(`內嵌腳本：${label}`);
            } catch (err) {
                if (err instanceof LocalSnapshotResourceError) throw err;
                // 抓不到就退回外部載入：快照仍可正常運作（只是需要連線）
                el.setAttribute('src', absoluteSrc);
                console.warn(`[SavePageToAzureBlob] 腳本內嵌失敗（${describeError(err)}）：${redactSasSignature(absoluteSrc)}`);
                progress(`保留外部腳本：${label}`);
            }
        }
    }

    /**
     * 建立靜態快照的根節點：直接 clone 目前的 DOM，
     * 把 JavaScript 執行完畢後的狀態（表單值、canvas 畫面、動態節點）整份凍結下來。
     *
     * 設計意圖：
     *   - 這是重播模式不可用時的唯一退路，必須完全不依賴網路就能還原畫面。
     *   - 所有修改都在 clone 上進行，不動到使用者正在看的頁面。
     *
     * @returns {Element} <html> 根節點
     */
    function createStaticSnapshotRoot() {
        // ── 預處理：將 <canvas> 元素轉為 <img>（需在 clone 之前，在原始 DOM 上操作）──
        // cloneNode 無法複製 canvas 的像素資料，因此需要先將 canvas 繪製內容轉為 Data URI，
        // 再建立對應的 <img> 元素供後續序列化使用。
        const canvasMap = new Map();
        document.querySelectorAll('canvas').forEach((canvas, index) => {
            try {
                // toDataURL() 在跨域 canvas（tainted canvas）上會拋出 SecurityError
                const dataUri = canvas.toDataURL('image/png');
                canvasMap.set(index, dataUri);
            } catch {
                // 略過跨域受污染的 canvas
            }
        });

        /**
         * 把原始頁面表單欄位的「目前值」寫進 clone 中對應節點的屬性。
         *
         * 設計意圖：
         *   - outerHTML 只序列化 DOM 屬性，不含 JS property（.value / .checked / .selected），
         *     因此必須把目前值寫回屬性，快照才會保留使用者的輸入內容。
         *   - 原本是在 clone 之前直接改寫「原始頁面」的屬性：會改掉欄位的 defaultValue
         *     （之後網站呼叫 form.reset() 會重設成快照當下的值而非原始預設值）、
         *     讓網站自己的 MutationObserver 收到大量屬性變動，也違反「所有修改都在
         *     clone 上進行，不影響原始頁面」的原則。改為只寫入 clone。
         *   - 密碼欄位一律不保留值（連既有的 value 屬性也移除）：快照會發佈到可公開
         *     讀取的 Blob URL，若把已輸入的密碼寫進 HTML，等於把密碼公開在網路上。
         *   - 檔案欄位的 value 只是 "C:\fakepath\檔名"，寫進屬性也無法還原選取的檔案，
         *     反而洩漏本機檔名，因此略過。
         *
         * @param {Element} liveField - 原始頁面中的 input / textarea / select
         * @param {Element} clonedField - clone 中位於相同位置的對應元素
         */
        function syncFormFieldStateToClone(liveField, clonedField) {
            const tagName = liveField.localName;

            if (tagName === 'input') {
                const type = (liveField.type || '').toLowerCase();
                if (type === 'checkbox' || type === 'radio') {
                    liveField.checked ? clonedField.setAttribute('checked', '') : clonedField.removeAttribute('checked');
                } else if (type === 'password') {
                    clonedField.removeAttribute('value');
                } else if (type !== 'file') {
                    clonedField.setAttribute('value', liveField.value);
                }
            } else if (tagName === 'textarea') {
                clonedField.textContent = liveField.value;
            } else if (tagName === 'select') {
                // 為每個 <option> 同步 selected 屬性；clone 的 options 與原始頁面一一對應
                Array.from(liveField.options).forEach((opt, optionIndex) => {
                    const clonedOption = clonedField.options?.[optionIndex];
                    if (!clonedOption) return;
                    opt.selected ? clonedOption.setAttribute('selected', '') : clonedOption.removeAttribute('selected');
                });
            }
        }

        // 先記下原始頁面的表單欄位，clone 後依文件順序配對。
        const FORM_FIELD_SELECTOR = 'input, textarea, select';
        const liveFormFields = [...document.querySelectorAll(FORM_FIELD_SELECTOR)];

        // ── 深度克隆整個 <html> 節點，後續所有修改都在 clone 上進行，不影響原始頁面 ──
        const staticRoot = document.documentElement.cloneNode(true);

        // ── 將當前表單值寫入 clone 的屬性（必須緊接在 clone 之後、移除任何節點之前）──
        // cloneNode(true) 完整保留樹狀結構，querySelectorAll 的文件順序與數量必然一致，
        // 因此可用索引一對一配對；數量不符時（理論上不會發生）寧可略過也不錯置欄位值。
        const clonedFormFields = staticRoot.querySelectorAll(FORM_FIELD_SELECTOR);
        if (clonedFormFields.length === liveFormFields.length) {
            clonedFormFields.forEach((clonedField, index) => {
                syncFormFieldStateToClone(liveFormFields[index], clonedField);
            });
        }

        // ── 在 clone 中替換 canvas → img ──
        staticRoot.querySelectorAll('canvas').forEach((canvas, index) => {
            const dataUri = canvasMap.get(index);
            if (!dataUri) return;
            const img = document.createElement('img');
            img.src = dataUri;
            img.width  = canvas.width;
            img.height = canvas.height;
            img.style.cssText = canvas.style.cssText || '';
            canvas.parentNode?.replaceChild(img, canvas);
        });

        return staticRoot;
    }

    // ===== 核心：序列化當前頁面為 HTML 快照 =====

    /**
     * 對當前頁面執行完整的 DOM 序列化，
     * 內嵌可下載的資源（樣式表、圖片、字型、SVG 背景等），
     * 並保留公共 CDN 連結，讓瀏覽器在開啟快照時載入。
     *
     * 兩種根節點來源（見 getSnapshotMode()）：
     *   - 重播模式（預設）：重新取得尚未執行腳本的原始 HTML，保留腳本，
     *     讓快照開啟時自己渲染一次 → 互動可用且不會出現重複內容。
     *   - 靜態快照（重播不可用時自動退回）：clone 目前 DOM 並移除所有腳本
     *     → 畫面與發佈當下完全一致，但沒有互動。
     *
     * 處理項目（兩種模式共用）：
     *   - <link rel="stylesheet"> → 公共 CDN 保留連結，其餘抓取並內嵌為 <style>
     *   - <style> 塊內的 url() → 轉換為 Data URI 或絕對 URL
     *   - <img src> / <img srcset> → 處理 src 並清除 srcset，讓瀏覽器使用快照指定的 URL
     *   - <video poster> / <audio> → poster 圖轉 Data URI，src 保留原始絕對 URL（媒體體積過大）
     *   - <canvas> → 靜態模式以 toDataURL() 轉為 <img>（跨域受限時略過）
     *   - <input>/<textarea>/<select> → 靜態模式將當前表單值寫回 value/checked 屬性
     *   - <link rel="icon"> 系列 → href 轉 Data URI
     *   - <link rel="preload"> / <link rel="prefetch"> → 移除原頁面的預載提示
     *   - <script> → 重播模式保留並內嵌外部檔案；靜態模式全部移除
     *   - <base href> → 移除（已全部使用絕對 URL，不需要 base 標籤）
     *   - meta CSP / refresh → 移除（會阻止內嵌腳本執行或讓快照自動跳轉）
     *   - style 屬性中的 url() → 轉換為 Data URI
     *
     * @param {function} onProgress - 進度回呼，接受 (current, total, message) 三個參數
     * @returns {Promise<{html: string, mode: string, fallbackReason: string}>}
     *   完整 HTML（含 <!DOCTYPE html>）、實際採用的模式、以及重播失敗的原因
     */
    async function serializePage(onProgress) {
        const pageUrl = location.href;
        // 原站可能以 <base href> 指向 CDN。移除 clone 的 <base> 前先取得實際資源基準網址。
        const resourceBaseUrl = document.baseURI;

        // 本次快照專用的資源下載快取（絕對網址 → Data URI 或失敗時的原始網址）。
        // 生命週期只到這個函式結束，不跨快照保留，避免佔用記憶體或沿用過期的資源內容。
        const resourceCache = new Map();

        // 進度訊息會顯示在頁面上的狀態提示條（一般 DOM 節點，目前網頁的 JavaScript 讀得到），
        // 其中「處理樣式表：xxx」等訊息取自資源網址的最後一段，可能帶著含 sig 的查詢字串，
        // 因此統一在這裡遮蔽，不必在每個呼叫點各自處理。
        // 待處理總量要等根節點選定、元素蒐集完成才算得出來，所以 total 先給 0，
        // 讓「取得原始 HTML 文件」這類前置步驟的訊息也能先送上狀態提示條。
        let total = 0;
        let current = 0;
        const progress = (msg) => {
            current++;
            onProgress?.(current, total, redactSasSignature(msg));
        };

        /**
         * 將相對 URL 轉為基於原始頁面的絕對 URL，必要時保留「#」書籤連結。
         *
         * 設計意圖：
         *   - 快照頁面已脫離原站點，若保留相對網址會導致連結失效或導向錯誤。
         *   - 透過 URL(base) 正確處理 ./、../、?query、//host 等邊界情境。
         *   - 對於 <a href="#hash"> 這類頁內書籤連結，必須保留為相對形式，
         *     否則會被解析為原站點 URL，造成跳離快照頁面。
         *
         * @param {string|null} rawUrl - 原始屬性值（href 或 action）
         * @param {string} baseUrl - 解析相對路徑的基準 URL（原始頁面 URL）
         * @param {boolean} preserveHashOnly - 是否保留純 #hash 連結為原樣
         * @returns {string|null} 轉換後的 URL 或原始值
         */
        function toAbsoluteUrlIfRelative(rawUrl, baseUrl, preserveHashOnly) {
            if (rawUrl === null || rawUrl === undefined) return rawUrl;

            const trimmed = rawUrl.trim();
            if (!trimmed) return rawUrl;

            if (preserveHashOnly && trimmed.startsWith('#')) {
                return trimmed;
            }

            // 若已有協定（http:、https:、mailto:、javascript:、data:...），視為絕對 URL，維持原樣。
            if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
                return rawUrl;
            }

            try {
                return new URL(trimmed, baseUrl).href;
            } catch {
                // 解析失敗時維持原狀，避免破壞未知格式
                return rawUrl;
            }
        }

        // ── 選定序列化的根節點：重播模式優先，不可用時回退靜態快照 ──
        // 設計意圖（0.6.0 的關鍵改動）：
        //   - 靜態快照凍結「已渲染的 DOM」，因此必須移除所有腳本（否則腳本重跑會把
        //     動態節點再附加一份），代價是站內搜尋、頁籤切換等互動在發佈後失效。
        //   - 重播模式改抓「尚未執行腳本」的原始 HTML 並保留腳本，讓快照開啟時從空容器
        //     自己渲染一次：互動可用，畫面也不會重複。
        //   - 重播需要重新取得原始文件（需要連線、需要能讀到同一個回應）；SPA 空殼、
        //     登入轉址、特殊協定等情況會失敗，此時自動退回靜態快照，確保仍能發佈。
        let snapshotMode = getSnapshotMode();
        let root = null;
        // 重播失敗的原因（成功時為空字串），會回報給呼叫端顯示在狀態提示條，
        // 讓使用者知道「這次沒有互動」是被降級成靜態快照，而不是腳本壞掉。
        let replayFallbackReason = '';
        // 重播成功但原始文件內容偏少的提醒（例如內容主要來自前端 API），
        // 不阻擋發佈，只在使用者回報「畫面不完整」時提供第一條線索。
        let replayWarning = '';

        if (snapshotMode === SNAPSHOT_MODE_REPLAY) {
            try {
                const replay = await createReplaySnapshotRoot(pageUrl, progress);
                root = replay.root;
                if (replay.contentRatio < REPLAY_CONTENT_WARNING_RATIO) {
                    const percent = Math.round(replay.contentRatio * 100);
                    replayWarning = `原始文件的可讀內容只有目前頁面的 ${percent}%，若快照顯示不完整請改用靜態快照`;
                }
            } catch (err) {
                // 重播只是「比較好」的方案，失敗時不中斷流程，改用靜態快照並記下原因，
                // 讓狀態提示條能說明「為什麼這次沒有互動」，而不是讓使用者一頭霧水。
                snapshotMode = SNAPSHOT_MODE_STATIC;
                replayFallbackReason = describeError(err);
                console.warn(`[SavePageToAzureBlob] 重播模式不可用，改用靜態快照：${redactSasSignature(replayFallbackReason)}`);
            }
        }

        if (!root) {
            root = createStaticSnapshotRoot();
        }

        // 重播模式必須保留腳本；靜態模式則一律移除（理由見下方「腳本處理」）。
        const keepScripts = snapshotMode === SNAPSHOT_MODE_REPLAY;

        // ── 移除快照工具自身注入的工具列（只可能出現在靜態 clone 中）──
        // 狀態提示條與底部刪除列都掛在 document.body，cloneNode(true) 會一併複製，
        // 需主動移除，避免工具的 UI 被寫進快照內容。
        root.querySelector('#__save_azure_status_bar__')?.remove();
        root.querySelector(`#${DELETE_BAR_ELEMENT_ID}`)?.remove();

        // ── 移除原始 <base href>（避免相對連結解析到不正確的基準）──
        // 設計意圖：
        //   1) 原始頁面可能有 <base> 指到子路徑或 CDN，快照中會造成相對連結失效。
        //   2) 我們稍後會「明確改寫」<a href> 與 <form action> 的相對網址成絕對網址，
        //      這樣就不需要依賴 <base>，也能避免 #hash 書籤連結被導向回原網站。
        root.querySelectorAll('base').forEach(el => el.remove());

        // ── 移除會讓快照無法獨立運作的 meta 指令 ──
        // 1) Content-Security-Policy：重播模式必須靠 inline script 才畫得出內容，
        //    原始網站以 meta 宣告的 script-src 會把所有內嵌腳本擋掉（等於白做一次重播）；
        //    快照是自帶資源的單一檔案，原站的 CSP 對它已無保護意義。
        // 2) refresh：會讓快照一開啟就跳轉回原站或逾時頁，與「保存當下狀態」的目的衝突。
        root.querySelectorAll('meta[http-equiv]').forEach(meta => {
            const directive = (meta.getAttribute('http-equiv') || '').trim().toLowerCase();
            if (directive === 'content-security-policy' || directive === 'refresh') {
                meta.remove();
            }
        });

        // ── 移除 <link rel="preload"> / <link rel="prefetch">（快照不需要預載資源）──
        root.querySelectorAll('link[rel="preload"], link[rel="prefetch"]').forEach(el => el.remove());

        // ── 蒐集後續要處理的元素（陣列順序即處理順序）──
        const styleLinks = [...root.querySelectorAll('link[rel="stylesheet"][href]')];
        const styleElements = [...root.querySelectorAll('style')];
        const imgElements    = [...root.querySelectorAll('img[src]')];
        const videoPosterEls = [...root.querySelectorAll('video[poster]')];
        const iconLinks      = [...root.querySelectorAll('link[rel*="icon"][href]')];
        const elementsWithStyleAttr = [...root.querySelectorAll('[style]')];
        // 只有重播模式需要內嵌頁面腳本；靜態模式會整批移除，不必列入進度計算。
        const scriptElements = keepScripts ? [...root.querySelectorAll('script[src]')] : [];

        // ── 計算進度總量（用於顯示進度通知）──
        total = styleLinks.length + styleElements.length + imgElements.length +
                videoPosterEls.length + iconLinks.length + scriptElements.length;

        // ── 腳本處理：重播模式保留並內嵌，靜態模式一律移除 ──
        // 設計意圖：
        //   - 靜態根節點是「腳本已執行完畢」的 DOM，其中早已含腳本動態產生的節點
        //     （分類頁籤、快取階層列…）；若把 <script> 一起帶走，開檔時會再執行一次
        //     並在既有節點後「再附加一份」，同一組介面就出現兩遍。
        //   - 重播根節點來自「尚未執行腳本」的原始 HTML，容器都還是空的，
        //     腳本跑一次剛好補齊內容，因此必須保留，否則快照只剩空殼。
        //   - 移除元素不需要產生 HTML 字串，也因此不會觸發 Trusted Types 限制。
        if (keepScripts) {
            await inlineExternalScriptsIntoRoot(root, resourceBaseUrl, progress);
        } else {
            root.querySelectorAll('script').forEach(el => el.remove());
        }

        // ── 處理 <link rel="stylesheet"> → 抓取並展開為 <style> ──
        for (const link of styleLinks) {
            const href = link.getAttribute('href');
            if (!href) continue;
            try {
                const resolvedUrl = new URL(href, resourceBaseUrl);
                const absHref = resolvedUrl.href;
                if (EXTERNAL_CDN_HOSTNAMES.has(resolvedUrl.hostname)) {
                    // 保留原本的 link，連同 media、integrity、crossorigin 等載入條件一併保留。
                    link.href = absHref;
                    progress(`保留 CDN 樣式表：${href.split('/').pop()}`);
                    continue;
                }
                // 樣式表同樣自行解碼（CSS 可能是 Big5 等非 UTF-8 編碼，內嵌時必須先轉對）
                const { text: cssText } = await fetchTextResource(absHref, 'css');
                const inlinedCss = await inlineCssResources(cssText, absHref, resourceCache, new Set([absHref]));
                const styleEl = document.createElement('style');
                styleEl.textContent = inlinedCss;
                // 保留 media 屬性（如 media="print"）
                if (link.media) styleEl.setAttribute('media', link.media);
                link.parentNode?.replaceChild(styleEl, link);
            } catch (err) {
                if (err instanceof LocalSnapshotResourceError) throw err;
                // 抓取失敗時將 href 改為絕對 URL，確保即使無法內嵌仍能連線載入
                try {
                    link.href = new URL(href, resourceBaseUrl).href;
                } catch { /* 無效 URL，保留原樣 */ }
                console.warn(`[SavePageToAzureBlob] 樣式表內嵌失敗（${describeError(err)}）：${redactSasSignature(href)}`);
            }
            progress(`處理樣式表：${href.split('/').pop()}`);
        }

        // ── 處理 <style> 塊中的 url() ──
        for (const styleEl of styleElements) {
            try {
                styleEl.textContent = await inlineCssResources(styleEl.textContent, resourceBaseUrl, resourceCache);
            } catch (err) {
                if (err instanceof LocalSnapshotResourceError) throw err;
                console.warn(`[SavePageToAzureBlob] <style> 處理失敗：${describeError(err)}`);
            }
            progress('處理內嵌樣式');
        }

        // ── 處理 <img src> 與 srcset ──
        for (const img of imgElements) {
            const src = img.getAttribute('src');
            if (src) {
                img.setAttribute('src', await toDataUri(src, resourceBaseUrl, resourceCache));
            }
            // 清除 srcset 候選網址，讓瀏覽器使用快照指定的 src（Data URI 或絕對 URL）。
            img.removeAttribute('srcset');
            // <picture> 中的 <source> 也一並清除
            img.closest('picture')?.querySelectorAll('source').forEach(s => {
                s.removeAttribute('srcset');
                s.removeAttribute('src');
            });
            progress(`處理圖片：${src?.split('/').pop()?.substring(0, 30)}`);
        }

        // ── 處理 <video poster> ──
        for (const video of videoPosterEls) {
            const poster = video.getAttribute('poster');
            if (poster) {
                video.setAttribute('poster', await toDataUri(poster, resourceBaseUrl, resourceCache));
            }
            // video / audio 的 src 不內嵌（媒體體積通常過大），改為絕對 URL 保留連結
            const mediaSrc = video.getAttribute('src');
            if (mediaSrc) {
                try { video.setAttribute('src', new URL(mediaSrc, pageUrl).href); } catch { /* 略過 */ }
            }
            progress(`處理影片封面：${poster?.split('/').pop()}`);
        }

        // ── 處理 <link rel="icon"> 系列圖示 ──
        for (const link of iconLinks) {
            const href = link.getAttribute('href');
            if (href) {
                link.setAttribute('href', await toDataUri(href, resourceBaseUrl, resourceCache));
            }
            progress(`處理網站圖示：${href?.split('/').pop()}`);
        }

        // ── 處理 style 屬性中的 url()（例如 background-image: url(...)）──
        for (const el of elementsWithStyleAttr) {
            const styleValue = el.getAttribute('style');
            if (styleValue && /url\(/i.test(styleValue)) {
                el.setAttribute('style', await inlineCssResources(styleValue, resourceBaseUrl, resourceCache));
            }
        }

        // ── 修正 <a>/<area> 與 <form> 的相對網址為原頁面絕對網址 ──
        // 設計意圖：
        //   - 避免快照頁面脫離原站點後，相對連結失效。
        //   - 特別保留 "#hash" 這種頁內書籤連結，確保仍能在快照內跳轉。
        const anchorLikeElements = [...root.querySelectorAll('a[href], area[href]')];
        for (const el of anchorLikeElements) {
            const href = el.getAttribute('href');
            const absoluteHref = toAbsoluteUrlIfRelative(href, pageUrl, true);
            if (absoluteHref && absoluteHref !== href) {
                el.setAttribute('href', absoluteHref);
            }
        }

        const formElements = [...root.querySelectorAll('form[action]')];
        for (const form of formElements) {
            const action = form.getAttribute('action');
            const absoluteAction = toAbsoluteUrlIfRelative(action, pageUrl, false);
            if (absoluteAction && absoluteAction !== action) {
                form.setAttribute('action', absoluteAction);
            }
        }

        // ── 在快照頁面左下角加入「原始頁面」連結（僅影響快照，不影響原頁）──
        // 設計意圖與取捨說明：
        //   - 讓快照頁面永遠保留一條回到來源頁的低干擾入口，避免使用者無法追溯原始內容。
        //   - 使用 fixed 定位與高 z-index，確保無論捲動或頁面佈局如何都固定在左下角可點擊。
        //   - 以單一「🔗」字元 + 低透明度呈現，視覺存在感低，不影響閱讀主體。
        //   - 透過 inline style + !important 降低被站點 CSS 覆寫的機率，確保「無底線」與「指標手勢」一致。
        const body = root.querySelector('body');
        if (body) {
            const sourceLink = document.createElement('a');
            sourceLink.id = '__snapshot_source_link__';
            sourceLink.textContent = '🔗';
            sourceLink.setAttribute('href', pageUrl);
            sourceLink.setAttribute('target', '_blank');
            sourceLink.setAttribute('rel', 'noopener noreferrer');
            sourceLink.setAttribute('title', pageUrl);
            sourceLink.setAttribute('style', [
                'position: fixed',
                'left: 8px',
                'bottom: 8px',
                'z-index: 2147483647',
                'font-size: 14px',
                'line-height: 1',
                'opacity: 0.25',
                'text-decoration: none !important',
                'cursor: pointer',
                'user-select: none'
            ].join('; '));
            body.appendChild(sourceLink);
        }

        // ── 組合最終 HTML 字串，並補充 <!DOCTYPE html> / <meta charset> ──

        const head = root.querySelector('head');

        if (head) {
            // 確保 <head> 中有 charset 宣告，避免儲存後開啟出現亂碼
            // 同時將 meta charset 移到最前方，保證解碼指示在文件一開始就被解析。
            let metaCharset = head.querySelector('meta[charset]');
            if (!metaCharset) {
                metaCharset = document.createElement('meta');
                metaCharset.setAttribute('charset', 'utf-8');
            }
            if (head.firstChild !== metaCharset) {
                head.insertBefore(metaCharset, head.firstChild);
            }
        }

        // 加入標示此頁面為快照的 meta 標籤，方便識別；同時記下這次用的模式，
        // 日後排查「這份快照為什麼沒有互動」時不必再猜。
        if (head) {
            const metaSnapshot = document.createElement('meta');
            metaSnapshot.setAttribute('name', 'snapshot-source');
            metaSnapshot.setAttribute('content', pageUrl);
            metaSnapshot.setAttribute('data-snapshot-time', new Date().toISOString());
            metaSnapshot.setAttribute('data-snapshot-mode', snapshotMode);
            head.appendChild(metaSnapshot);
        }

        // 回傳模式資訊，讓呼叫端可以在狀態提示條說明這次是重播還是降級的靜態快照。
        return {
            html: `<!DOCTYPE html>\n${root.outerHTML}`,
            mode: snapshotMode,
            fallbackReason: replayFallbackReason,
            warning: replayWarning
        };
    }

    // ===== 核心：將任意內容上傳至 Azure Blob Storage =====

    /**
     * 將字串、Blob、ArrayBuffer 或 TypedArray 轉成可精確計算 Content-Length 的 ArrayBuffer。
     *
     * 設計意圖：
     *   - 文字內容統一以 UTF-8 送出，對應 Content-Type 會由呼叫端帶上 charset。
     *   - 圖片 Blob 不做任何轉碼，避免破壞原始格式或造成副檔名與實際內容不一致。
     *   - TypedArray 可能只是較大 ArrayBuffer 的視窗，因此要 slice 出精確範圍。
     *
     * @param {string|Blob|ArrayBuffer|ArrayBufferView} content - 待上傳內容
     * @returns {Promise<ArrayBuffer>} 可直接交給 GM_xmlhttpRequest 的 ArrayBuffer
     */
    async function toUploadArrayBuffer(content) {
        if (typeof content === 'string') {
            return new TextEncoder().encode(content).buffer;
        }

        if (typeof Blob !== 'undefined' && content instanceof Blob) {
            return content.arrayBuffer();
        }

        if (content instanceof ArrayBuffer) {
            return content;
        }

        if (ArrayBuffer.isView(content)) {
            // 檢視範圍剛好涵蓋整個 buffer 時（例如 TextEncoder.encode() 的結果）直接沿用，
            // 不必為了數十 MB 的快照再複製一份。
            if (content.byteOffset === 0 && content.byteLength === content.buffer.byteLength) {
                return content.buffer;
            }
            return content.buffer.slice(content.byteOffset, content.byteOffset + content.byteLength);
        }

        throw new Error('不支援的上傳內容型別。');
    }

    /**
     * 使用 Azure Blob Storage REST API（PUT Blob）將內容上傳至指定容器，
     * 並回傳上傳後的純淨 Blob URL（不含 SAS Token 參數）。
     *
     * 上傳流程：
     *   1. 解析 Container SAS URL，分離出基礎 URL 與 SAS Token 查詢字串
     *   2. 依呼叫端指定的 prefix / extension 產生唯一 Blob 檔案名稱
     *   3. 組合完整的 Blob PUT URL（含 SAS Token）
     *   4. 透過 GM_xmlhttpRequest 以 PUT 方式上傳內容並設定 Content-Type
     *   5. 回傳不含 SAS Token 的純淨 Blob URL
     *
     * @param {string|Blob|ArrayBuffer|ArrayBufferView} content - 待上傳內容
     * @param {string} sasUrl - Container 層級的 Azure Blob SAS URL
     * @param {{blobNamePrefix: string, extension: string, contentType: string}} options - 上傳描述
     * @returns {Promise<string>} 純淨的 Blob URL（不含 SAS Token 查詢參數）
     */
    async function uploadToAzureBlob(content, sasUrl, options) {
        // 解析 SAS URL，分離 origin+pathname（容器路徑）與 search（SAS Token 參數）
        let parsedSasUrl;
        try {
            parsedSasUrl = new URL(sasUrl);
        } catch {
            throw new Error('SAS URL 格式無效，請重新設定。');
        }

        // 去除 pathname 尾端的斜線
        const containerPath = parsedSasUrl.origin + parsedSasUrl.pathname.replace(/\/+$/, '');
        const sasQueryString = parsedSasUrl.search; // 包含 ? 的查詢字串，例如 ?sv=...&sig=...

        const blobName = buildBlobName(options?.blobNamePrefix, options?.extension);
        const contentType = options?.contentType || 'application/octet-stream';

        // 組合上傳用 URL（含 SAS Token）與純淨 URL（不含 SAS Token）
        const uploadUrl = `${containerPath}/${blobName}${sasQueryString}`;
        const cleanUrl  = `${containerPath}/${blobName}`;

        const uploadBytes = await toUploadArrayBuffer(content);

        // 使用 Azure Blob Storage REST API PUT Blob
        // 必要 Header：
        //   x-ms-blob-type: BlockBlob  → 指定 Blob 類型（必需）
        //   Content-Type               → 讓瀏覽器與 Azure Blob 屬性正確識別內容
        //   x-ms-date                  → RFC1123 格式的請求時間（部分 SAS 設定需要）
        await gmFetch({
            method: 'PUT',
            url: uploadUrl,
            responseType: 'text',
            headers: {
                'x-ms-blob-type': 'BlockBlob',
                'Content-Type':   contentType,
                'x-ms-version':   '2020-08-04',
                'x-ms-date':      new Date().toUTCString(),
                'Content-Length': String(uploadBytes.byteLength)
            },
            // GM_xmlhttpRequest 傳送 ArrayBuffer，以同一條路徑支援 UTF-8 文字與圖片二進位內容。
            data: uploadBytes
        });

        return cleanUrl;
    }

    // ===== 核心：接收任意文字並轉換為可發佈內容 =====

    /**
     * 將文字與推斷出的格式轉成發佈描述。
     *
     * @param {string} text - 使用者貼上的文字
     * @param {string} sourceMimeType - 文字 MIME type
     * @returns {{content: string, extension: string, contentType: string, label: string, byteLength: number}} 發佈描述
     */
    function createTextUpload(text, sourceMimeType) {
        if (!text) {
            throw new Error('沒有可發佈的文字內容。');
        }

        const format = inferTextFormat(text, sourceMimeType);
        return {
            content: text,
            extension: format.extension,
            contentType: format.contentType,
            label: format.label,
            byteLength: new TextEncoder().encode(text).byteLength
        };
    }

    /**
     * 在頁面上建立一個臨時文字對話框，等待使用者貼上內容。
     *
     * 設計意圖：
     *   - 不直接讀取剪貼簿，避免 Tampermonkey 與瀏覽器 Clipboard API 的相容性問題。
     *   - 使用者貼上時，瀏覽器會透過 paste 事件提供文字；腳本只取 text/plain，
     *     避免 rich-copy 內容被當成 HTML 包裝後發佈。
     *   - 貼上成功即 resolve，呼叫端可立即接續發佈。
     *
     * @returns {Promise<string|null>} 使用者貼上的純文字；取消時回傳 null
     */
    function waitForPastedText() {
        return new Promise((resolve) => {
            const overlay = document.createElement('div');
            const panel = document.createElement('div');
            const title = document.createElement('div');
            const message = document.createElement('div');
            const target = document.createElement('textarea');
            const hint = document.createElement('div');
            const cancelButton = document.createElement('button');
            let isSettled = false;

            overlay.id = '__save_azure_content_paste_overlay__';
            Object.assign(overlay.style, {
                position: 'fixed',
                inset: '0',
                zIndex: '2147483647',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0, 0, 0, 0.48)',
                fontFamily: 'system-ui, sans-serif'
            });

            Object.assign(panel.style, {
                width: 'min(560px, calc(100vw - 32px))',
                padding: '18px',
                borderRadius: '8px',
                background: '#fff',
                color: '#1f2937',
                boxShadow: '0 18px 48px rgba(0, 0, 0, 0.34)',
                boxSizing: 'border-box'
            });

            title.textContent = '貼上要發佈的內容';
            Object.assign(title.style, {
                fontSize: '18px',
                fontWeight: '700',
                marginBottom: '8px'
            });

            message.textContent = '請在下方文字框貼上任意文字，貼上後會自動發佈到 Infinitybin。';
            Object.assign(message.style, {
                fontSize: '14px',
                lineHeight: '1.6',
                marginBottom: '12px'
            });

            target.setAttribute('aria-label', '貼上要發佈的文字內容');
            target.placeholder = '按 Ctrl+V 貼上文字';
            Object.assign(target.style, {
                minHeight: '128px',
                width: '100%',
                padding: '18px',
                border: '2px dashed #64748b',
                borderRadius: '8px',
                background: '#f8fafc',
                color: '#334155',
                fontSize: '16px',
                lineHeight: '1.5',
                outline: 'none',
                textAlign: 'left',
                wordBreak: 'break-word',
                boxSizing: 'border-box',
                resize: 'vertical'
            });

            hint.textContent = '';
            Object.assign(hint.style, {
                marginTop: '10px',
                minHeight: '18px',
                fontSize: '12px',
                lineHeight: '1.5',
                color: '#64748b',
                wordBreak: 'break-word'
            });

            cancelButton.type = 'button';
            cancelButton.textContent = '取消';
            Object.assign(cancelButton.style, {
                marginTop: '14px',
                padding: '8px 12px',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                background: '#fff',
                color: '#1f2937',
                cursor: 'pointer',
                fontSize: '14px'
            });

            function cleanup() {
                target.removeEventListener('paste', onPaste);
                document.removeEventListener('keydown', onKeyDown, true);
                cancelButton.removeEventListener('click', onCancel);
                overlay.remove();
            }

            function settle(text) {
                if (isSettled) return;
                isSettled = true;
                cleanup();
                resolve(text);
            }

            function onPaste(event) {
                // 必須同步阻止預設行為，避免 textarea 先插入或轉換內容。
                event.preventDefault();

                const text = event.clipboardData?.getData('text/plain') || '';
                if (!text) {
                    target.value = '';
                    target.placeholder = '沒有偵測到文字內容，請貼上文字。';
                    hint.textContent = '圖片與二進位內容不會被發佈。';
                    target.focus();
                    return;
                }

                settle(text);
            }

            function onKeyDown(event) {
                if (event.key === 'Escape') {
                    event.preventDefault();
                    settle(null);
                }
            }

            function onCancel() {
                settle(null);
            }

            panel.append(title, message, target, hint, cancelButton);
            overlay.appendChild(panel);
            // 檢視 XML/SVG 等沒有 <body> 的文件時退回 documentElement，避免直接丟出 TypeError。
            (document.body || document.documentElement).appendChild(overlay);

            target.addEventListener('paste', onPaste);
            document.addEventListener('keydown', onKeyDown, true);
            cancelButton.addEventListener('click', onCancel);

            window.setTimeout(() => {
                target.focus();
            }, 0);
        });
    }

    // ===== UI：顯示浮動狀態提示條 =====

    /**
     * 在畫面右下角顯示一個半透明的狀態提示條，
     * 用於在快照擷取與上傳過程中提供即時的進度回饋。
     * 回傳一個物件，包含 update() 更新訊息與 remove() 移除提示條兩個方法。
     *
     * @param {string} initialMessage - 初始顯示的訊息
     * @returns {{ update: function(string): void, remove: function(): void }}
     */
    function createStatusBar(initialMessage) {
        const bar = document.createElement('div');
        bar.id = '__save_azure_status_bar__';

        // 使用高 z-index 確保提示條顯示在所有頁面元素之上
        Object.assign(bar.style, {
            position:     'fixed',
            bottom:       '20px',
            right:        '20px',
            zIndex:       '2147483647',
            padding:      '10px 16px',
            background:   'rgba(0, 0, 0, 0.82)',
            color:        '#fff',
            fontSize:     '13px',
            lineHeight:   '1.5',
            borderRadius: '6px',
            boxShadow:    '0 4px 12px rgba(0,0,0,0.4)',
            maxWidth:     '380px',
            wordBreak:    'break-all',
            fontFamily:   'system-ui, sans-serif',
            pointerEvents:'none'
        });

        bar.textContent = initialMessage;
        // 沒有 <body> 的文件（XML、SVG）退回 documentElement；原本會在建立提示條時丟出
        // TypeError，而且發生在防重入鎖設定之前，使用者完全看不到任何回饋。
        (document.body || document.documentElement).appendChild(bar);

        return {
            update: (msg) => { bar.textContent = msg; },
            remove: () => { bar.remove(); }
        };
    }

    // ===== UI：Infinitybin 頁面底部刪除列 =====

    /**
     * 建立一個屬於 XHTML 命名空間的元素，供跨文件型別的工具列 DOM 使用。
     *
     * 設計意圖：
     *   - text/html 文件用 createElement() 即可，但 .xhtml 等 XML 系文件必須
     *     以 createElementNS() 建立元素，瀏覽器才會把它放進 HTML 呈現樹渲染。
     *   - 在 text/html 文件中 createElementNS(XHTML) 與 createElement 完全等價，
     *     因此統一走這條路徑，不必依文件型別分支。
     *
     * @param {string} tagName - 標籤名稱（div、span、button 等）
     * @returns {Element} XHTML 命名空間的元素
     */
    function createHtmlElement(tagName) {
        return document.createElementNS(XHTML_NAMESPACE_URI, tagName);
    }

    /**
     * 判斷目前文件能否可靠地把 DOM 工具列疊加在頁面上。
     *
     * 設計意圖：
     *   - text/html 與 application/xhtml+xml（根元素在 XHTML 命名空間）都能渲染
     *     一般 HTML 元素，可以掛載固定定位的底部工具列。
     *   - SVG 文件中的 HTML 元素需要 foreignObject 包裝才會顯示，
     *     XML tree view 與純文字檢視更是沒有可掛載的呈現樹；
     *     這些類型一律不掛載工具列，改由 Tampermonkey 選單命令作為替代入口，
     *     避免為了少數文件型別引入脆弱的 DOM 包裝技巧。
     *
     * @returns {boolean} 是否可掛載 DOM 工具列
     */
    function canMountDomOverlay() {
        const rootNamespace = document.documentElement?.namespaceURI || '';
        return rootNamespace === XHTML_NAMESPACE_URI && !!document.body;
    }

    /**
     * 判斷目前瀏覽的頁面是否為「已設定 SAS URL 所在容器下的 Blob」，
     * 並組出刪除時需要的網址與顯示資訊。
     *
     * 設計意圖（刪除是破壞性操作，觸發入口必須嚴格限縮範圍）：
     *   - 刪除 UI 只允許出現在同時符合以下條件的頁面：
     *       1) 與設定的 SAS URL 同 origin（同帳戶、同 Blob endpoint）；
     *       2) 路徑位於該容器之下（容器路徑 + "/" 為前綴）；
     *       3) 確實指向一個 Blob（容器之下還有剩餘路徑，且不是資料夾樣式結尾）。
     *     其他任何網站、同帳戶的其他容器、甚至容器根目錄本身都不會出現刪除 UI，
     *     避免誤刪或在不相干的頁面上顯示破壞性按鈕。
     *   - 刪除請求直接複用「目前頁面的 origin + pathname」作為 Blob 位址：
     *     pathname 已是瀏覽器百分比編碼後的形式，可直接用於 REST API；
     *     若再編碼一次反而可能把已編碼的 % 轉義成 %25 導致找不到 Blob。
     *   - SAS Token 與頁面自身的查詢字串分開處理：刪除一律使用「設定中的
     *     Container SAS」查詢字串，頁面 URL 上若有其他參數則直接忽略。
     *   - 權限驗證交由 Azure 端處理：SAS 缺少 Delete（d）權限時會回 403，
     *     由 describeDeleteError() 依錯誤碼提供補救說明。
     *
     * @param {string} sasUrl - 已設定的 Container SAS URL
     * @returns {{blobName: string, cleanBlobUrl: string, deleteUrl: string}|null}
     *          可刪除的頁面描述；不符合條件時回傳 null
     */
    function resolveDeletablePageContext(sasUrl) {
        if (!sasUrl) return null;

        let parsedSasUrl;
        try {
            parsedSasUrl = new URL(sasUrl);
        } catch {
            // 設定值損壞或格式錯誤時不顯示任何刪除 UI；
            // 發佈流程另有自己的驗證與提示，這裡靜靜略過即可。
            return null;
        }

        // 同源判斷：URL 解析後的 origin 已是小寫，可直接做字串比對。
        if (location.origin !== parsedSasUrl.origin) return null;

        // 容器路徑（去掉尾端斜線），例如 /pagelet
        const containerPath = parsedSasUrl.pathname.replace(/\/+$/, '');
        if (!containerPath) return null;

        // 目前頁面必須位於容器之下，且還要有 Blob 名稱部分（容器本身沒有可刪除的頁面）。
        if (!location.pathname.startsWith(`${containerPath}/`)) return null;

        const encodedBlobName = location.pathname.slice(containerPath.length + 1);

        // Blob 名稱不得為空，也不能是虛擬目錄樣式的結尾（資料夾沒有對應 Blob）。
        if (!encodedBlobName || encodedBlobName.endsWith('/')) return null;

        let blobName = encodedBlobName;
        try {
            // 顯示與確認對話框用的名稱做一次解碼，較為人眼可讀；
            // 刪除請求仍使用原始 pathname，見 deleteBlob()。
            blobName = decodeURIComponent(encodedBlobName);
        } catch {
            // 解碼失敗（畸形百分比編碼）時退回原始字串，僅影響顯示。
        }

        return {
            blobName,
            cleanBlobUrl: `${location.origin}${location.pathname}`,
            deleteUrl: `${location.origin}${location.pathname}${parsedSasUrl.search}`
        };
    }

    /**
     * 以 Azure Blob Storage REST API（Delete Blob）刪除指定 Blob。
     *
     * 請求格式：
     *   DELETE https://<帳號>.blob.core.windows.net/<容器>/<Blob>?<SAS Token>
     * 需要 SAS 的 Delete（d）權限；成功時 Azure 回傳 202 Accepted。
     * 失敗時（403 權限不足、404 已不存在、SAS 過期等）由 gmFetch() 拋出例外，
     * 錯誤訊息中的 SAS 簽章已遮蔽，可安全顯示於頁面上。
     *
     * @param {{blobName: string, cleanBlobUrl: string, deleteUrl: string}} context -
     *        resolveDeletablePageContext() 回傳的頁面描述
     * @returns {Promise<void>} 刪除完成（HTTP 2xx）時 resolve
     */
    async function deleteBlob(context) {
        await gmFetch({
            method: 'DELETE',
            url: context.deleteUrl,
            responseType: 'text',
            headers: {
                'x-ms-version': '2020-08-04',
                'x-ms-date': new Date().toUTCString()
            }
        });
    }

    /**
     * 產生刪除失敗時的說明文字，並在已知錯誤上附帶補救建議。
     *
     * 設計意圖：
     *   - 最常見的失敗是「SAS 沒有勾 Delete（d）權限」（403 AuthorizationPermissionMismatch），
     *     這種情況光看 HTTP 狀態碼使用者無法知道要改什麼，
     *     因此直接把「重新產生 sp=cwd 的 SAS URL」的步驟寫進訊息。
     *   - 其他錯誤（過期、網路問題、Blob 已不存在）只回報原本訊息，不再額外猜測。
     *
     * @param {unknown} err - deleteBlob() 拋出的例外
     * @returns {string} 已遮蔽 sig、可安全顯示的錯誤說明
     */
    function describeDeleteError(err) {
        const message = describeError(err);

        if (/AuthorizationPermissionMismatch|AuthorizationFailure|AuthenticationFailed|HTTP 40[13]/i.test(message)) {
            return message +
                '\n可能原因：SAS Token 缺少 Delete（d）權限或已過期。' +
                '請重新產生包含 d 權限的 Container SAS URL（sp=cwd），' +
                '並在 Tampermonkey 選單「⚙️ 設定 Azure Blob SAS URL」中更新後重試。';
        }

        return message;
    }

    /**
     * 執行完整的刪除流程：二次確認 → 送出刪除 → 回報結果。
     *
     * 設計意圖：
     *   - 刪除無法復原，一律先以 confirm() 要求二次確認，並在對話框中
     *     顯示完整 Blob 名稱，讓使用者確定刪的就是眼前這個頁面。
     *   - 流程與 UI 分離：透過 statusApi.update() 回報進度與結果，
     *     底部刪除列與 Tampermonkey 選單兩種入口共用這一份邏輯，
     *     不必各自維護一套確認與錯誤處理。
     *   - 回傳明確的結果狀態而非布林值，讓呼叫端能分辨「取消」與「失敗」
     *     （兩者都要允許重試，但只有取消不需要顯示錯誤）。
     *
     * @param {{blobName: string, cleanBlobUrl: string, deleteUrl: string}} context -
     *        resolveDeletablePageContext() 回傳的頁面描述
     * @param {{update: function(string): void}} statusApi - 狀態回報介面（與 createStatusBar() 相容）
     * @returns {Promise<'cancelled'|'deleted'|'failed'>} 刪除流程的結果
     */
    async function runDeleteFlow(context, statusApi) {
        const confirmed = window.confirm(
            '確定要刪除這個 Infinitybin 頁面嗎？\n\n' +
            `Blob：${context.blobName}\n\n` +
            '刪除後無法復原。'
        );

        if (!confirmed) {
            return 'cancelled';
        }

        statusApi.update(`🗑️ 正在刪除 ${context.blobName} ...`);

        try {
            await deleteBlob(context);
            statusApi.update(`✅ 已刪除：${context.blobName}\n（重新整理後會看到 404 Not Found）`);
            return 'deleted';
        } catch (err) {
            // 錯誤訊息會顯示在頁面上（底部刪除列或狀態提示條，都是可被頁面 JS 讀到的 DOM），
            // 必須先遮蔽 SAS 簽章（見 describeDeleteError() / describeError()）。
            statusApi.update(`❌ 刪除失敗：${describeDeleteError(err)}`);
            console.error('[SavePageToAzureBlob] 刪除失敗：', describeErrorForLog(err));
            return 'failed';
        }
    }

    /**
     * 在頁面底部掛載「一整列」的刪除工具列。
     *
     * 設計意圖：
     *   - 依需求做成整列（full-width）固定在視窗底部：不佔用閱讀版面，
     *     但在任何捲動位置都能看到並操作刪除按鈕。
     *   - 左側顯示目前頁面的 Blob 名稱（滑入可看完整網址），讓使用者在按下
     *     破壞性按鈕前能先確認目標；刪除過程與結果也顯示在同一個位置。
     *   - 右側「✕」可隱藏工具列：快照頁面主要是拿來閱讀的，
     *     留一個低摩擦的退出方式，避免工具列造成閱讀干擾。
     *   - 刪除成功後按鈕維持停用：Blob 已不存在，再次點擊只會得到 404，
     *     不如直接擋下重複請求；失敗或取消則恢復按鈕允許重試。
     *   - 全部使用 inline style 並提高 z-index，降低被站點 CSS 覆寫或遮住的機率。
     *
     * @param {{blobName: string, cleanBlobUrl: string, deleteUrl: string}} context -
     *        resolveDeletablePageContext() 回傳的頁面描述
     */
    function mountDeleteBar(context) {
        if (document.getElementById(DELETE_BAR_ELEMENT_ID)) return;

        const bar = createHtmlElement('div');
        bar.id = DELETE_BAR_ELEMENT_ID;
        Object.assign(bar.style, {
            position:     'fixed',
            left:         '0',
            right:        '0',
            bottom:       '0',
            zIndex:       '2147483646',
            display:      'flex',
            alignItems:   'center',
            gap:          '12px',
            padding:      '8px 14px',
            boxSizing:    'border-box',
            background:   'rgba(15, 23, 42, 0.88)',
            color:        '#f8fafc',
            fontFamily:   'system-ui, sans-serif',
            fontSize:     '13px',
            lineHeight:   '1.5',
            boxShadow:    '0 -2px 10px rgba(0, 0, 0, 0.35)'
        });

        const message = createHtmlElement('span');
        message.textContent = `🗑️ Infinitybin 頁面：${context.blobName}`;
        message.title = context.cleanBlobUrl;
        Object.assign(message.style, {
            flex:        '1',
            overflow:    'hidden',
            textOverflow:'ellipsis',
            whiteSpace:  'nowrap'
        });

        const deleteButton = createHtmlElement('button');
        deleteButton.type = 'button';
        deleteButton.textContent = '🗑️ 刪除此頁面';
        Object.assign(deleteButton.style, {
            padding:    '6px 14px',
            border:     'none',
            borderRadius:'6px',
            background: '#dc2626',
            color:      '#fff',
            fontSize:   '13px',
            fontWeight: '700',
            cursor:     'pointer'
        });

        const hideButton = createHtmlElement('button');
        hideButton.type = 'button';
        hideButton.textContent = '✕';
        hideButton.title = '隱藏刪除列（本次瀏覽不再顯示）';
        Object.assign(hideButton.style, {
            padding:    '4px 8px',
            border:     'none',
            borderRadius:'6px',
            background: 'transparent',
            color:      '#cbd5e1',
            fontSize:   '14px',
            cursor:     'pointer'
        });

        // 狀態訊息就顯示在列上的說明文字：runDeleteFlow() 只需要 update() 介面，
        // 以極小的 adapter 對接，兩種入口不必各自重寫一套流程。
        const barStatusApi = { update: (msg) => { message.textContent = msg; } };

        // 同一把按鈕的防重入旗標：避免連點送出多次 DELETE。
        let isDeleting = false;

        deleteButton.addEventListener('click', () => {
            if (isDeleting) return;
            isDeleting = true;
            deleteButton.disabled = true;
            deleteButton.style.opacity = '0.6';
            deleteButton.style.cursor = 'default';

            void runDeleteFlow(context, barStatusApi).then((outcome) => {
                isDeleting = false;
                if (outcome !== 'deleted') {
                    // 取消或失敗都允許再次嘗試；
                    // 刪除成功後按鈕維持停用，避免對已不存在的 Blob 重複送出請求。
                    deleteButton.disabled = false;
                    deleteButton.style.opacity = '';
                    deleteButton.style.cursor = 'pointer';
                }
            });
        });

        hideButton.addEventListener('click', () => {
            // 只是隱藏本次瀏覽的工具列，不影響任何設定；重新整理後會再次出現。
            bar.remove();
        });

        bar.append(message, deleteButton, hideButton);
        // canMountDomOverlay() 已保證有 <body>；退回 documentElement 只是防禦性寫法，
        // 與 createStatusBar() 相同，避免未來調整判斷條件時直接丟出 TypeError。
        (document.body || document.documentElement).appendChild(bar);
    }

    /**
     * 啟動刪除功能：偵測目前頁面是否可刪除，並掛載對應的觸發入口。
     *
     * 設計意圖：
     *   - 兩個入口都受同一個範圍判定（resolveDeletablePageContext()）把關，
     *     維持「功能只在設定的 SAS URL 所在容器的頁面出現」的原則。
     *   - 主要入口是頁面底部的整列刪除工具列；Tampermonkey 選單命令是補充入口，
     *     覆蓋純文字、SVG 等無法顯示 DOM 工具列的內容類型
     *     （content-*.txt / *.svg / *.xml ... 同樣需要可刪除的入口）。
     *   - 設定值在啟動時讀取一次：刪除列是「載入時決定要不要掛載」的 UI，
     *     無法事後得知設定已變更；若使用者在已開啟的頁面上才完成 SAS 設定，
     *     必須重新整理該頁面刪除列才會出現（文件開頭已說明）。
     */
    function initDeleteFeature() {
        const sasUrl = GM_getValue(SAS_URL_STORAGE_KEY, '');
        const context = resolveDeletablePageContext(sasUrl);
        if (!context) return;

        if (canMountDomOverlay()) {
            mountDeleteBar(context);
        }

        GM_registerMenuCommand('🗑️ 刪除此頁面（Infinitybin）', () => {
            const statusBar = createStatusBar(`🗑️ 準備刪除：${context.blobName}`);

            void runDeleteFlow(context, statusBar).then((outcome) => {
                if (outcome === 'cancelled') {
                    // 使用者取消時不做任何事，直接回收提示條，避免殘留空白訊息。
                    statusBar.remove();
                    return;
                }
                // 成功或失敗訊息多留幾秒讓使用者看清楚，再回收狀態提示條。
                void delay(5000).then(() => statusBar.remove());
            });
        });
    }

    /**
     * 在上傳成功後才開啟發佈結果頁籤，確保使用者停留在原頁面等待進度，
     * 並避免因為「先開 about:blank 佔位」導致瀏覽器立即切換分頁。
     *
     * 設計取捨說明：
     *   - 若使用 window.open() 在非同步流程中開新頁籤，多數瀏覽器會直接封鎖。
     *   - Tampermonkey 的 GM_openInTab() 屬於特權 API，可在非同步流程中穩定開分頁，
     *     且能設定 active: true 以便在「上傳成功」時才切換過去。
     *   - 若 GM_openInTab 不可用（例如在非 Tampermonkey 環境），
     *     退回 window.open()，並以 best-effort 方式 focus 新分頁。
     *
     * @param {string} url - 上傳後的乾淨 URL（不含 SAS Token）
     * @returns {object|null} GM_openInTab 的 tab 物件或 window 物件（可能為 null）
     */
    function openPublishedTab(url) {
        if (typeof GM_openInTab === 'function') {
            return GM_openInTab(url, {
                active: true,
                insert: true,
                setParent: true
            });
        }

        const newTab = window.open(url, '_blank');
        if (newTab) {
            try {
                newTab.focus();
            } catch {
                // focus 失敗時不影響主流程，讓使用者手動切換
            }
        }
        return newTab;
    }

    /**
     * 讀取已設定的 Azure Blob Container SAS URL，並在缺少設定時提示使用者。
     *
     * @returns {string} SAS URL；尚未設定時回傳空字串
     */
    function getConfiguredSasUrl() {
        const sasUrl = GM_getValue(SAS_URL_STORAGE_KEY, '');
        if (!sasUrl) {
            alert('尚未設定 Azure Blob SAS URL。\n請先點選 Tampermonkey 選單中的「⚙️ 設定 Azure Blob SAS URL」。');
            return '';
        }

        return sasUrl;
    }

    // ===== 主流程：「📸 將目前網頁狀態發佈到 Infinitybin」選單功能 =====

    /**
     * 主要執行流程，依序完成以下工作：
     *   1. 讀取已儲存的 SAS URL，如果尚未設定則提示使用者先設定
     *   2. 顯示進度提示條
     *   3. 序列化當前頁面（轉換所有外部資源為 Data URI）
     *   4. 以 HTML Content-Type 發佈到 Infinitybin
     *   5. 在新頁籤開啟純淨的 Blob URL
     */
    async function savePageToAzureBlob() {
        if (activeSaveOperation) {
            // 直接重用既有作業，而不是再啟動第二份發佈流程。
            // 這可避免同一頁面因重複事件或連點而開出多個空白分頁。
            activeStatusBar?.update('⏳ 已有進行中的發佈作業，忽略重複觸發...');
            console.warn('[SavePageToAzureBlob] 偵測到重複觸發，已忽略新的發佈要求。');
            return activeSaveOperation;
        }

        const sasUrl = getConfiguredSasUrl();
        if (!sasUrl) return;

        const statusBar = createStatusBar('🔄 正在擷取目前網頁狀態，請稍候...');
        activeStatusBar = statusBar;

        activeSaveOperation = (async () => {
            try {
                // ── 序列化頁面（取得根節點＋資源內嵌）──
                // 回傳物件同時帶回「實際採用的模式」與「重播降級原因」，
                // 讓最後的成功訊息能誠實說明這份快照是重播還是靜態凍結。
                const snapshot = await serializePage((current, total, msg) => {
                    // 前置階段（例如重抓原始文件）還沒有總量，只顯示訊息本身，
                    // 避免出現「0%（1/0）」這種看起來像錯誤的進度。
                    if (total <= 0) {
                        statusBar.update(`🔄 ${msg}`);
                        return;
                    }
                    const pct = Math.round((current / total) * 100);
                    statusBar.update(`🔄 處理中 ${pct}%（${current}/${total}）\n${msg}`);
                });
                const htmlContent = snapshot.html;

                // 只做一次 UTF-8 編碼：同一份位元組既用來顯示大小，也直接交給上傳。
                // 原本先編碼一次算大小後丟棄，uploadToAzureBlob() 內又再編碼一次；
                // 內嵌大量圖片的快照常達數十 MB，等於多做一次大型配置與複製。
                const htmlBytes = new TextEncoder().encode(htmlContent);
                const sizeKb = Math.round(htmlBytes.byteLength / 1024);
                statusBar.update(`📤 正在發佈到 Infinitybin（${sizeKb.toLocaleString()} KB），請稍候...`);

                // ── 發佈到 Infinitybin（Azure Blob）──
                const cleanUrl = await uploadToAzureBlob(htmlBytes, sasUrl, {
                    blobNamePrefix: 'snapshot',
                    extension: 'html',
                    contentType: getTextContentType('html')
                });

                // 成功訊息要標明模式：重播＝互動可用；靜態＝畫面凍結，
                // 若是因為重播失敗而降級，就把原因一起說出來，避免使用者以為發佈壞掉。
                const modeNote = snapshot.mode === SNAPSHOT_MODE_REPLAY
                    ? '重播模式'
                    : (snapshot.fallbackReason ? `靜態快照，重播不可用：${snapshot.fallbackReason}` : '靜態快照');
                const warningLine = snapshot.warning ? `⚠️ ${snapshot.warning}\n` : '';
                statusBar.update(`${warningLine}✅ 發佈成功（${modeNote}）！即將切換至 Infinitybin 頁籤...\n${cleanUrl}`);

                // 稍作延遲讓使用者看到成功訊息後，再開啟結果頁籤並切換過去，
                // 符合「保留在原頁等待發佈完成」的使用體驗。
                await delay(2000);

                const openedTab = openPublishedTab(cleanUrl);
                if (!openedTab) {
                    statusBar.update(`✅ 發佈成功，但新頁籤被瀏覽器封鎖。\n請允許彈出式視窗或手動開啟：\n${cleanUrl}`);
                    await delay(6000);
                    return;
                }
            } catch (err) {
                // 擷取或發佈失敗時顯示錯誤，並提供複製建議
                // 錯誤訊息會寫進頁面上的狀態提示條，必須先遮蔽 SAS 簽章（見 describeError()）。
                statusBar.update(`❌ 操作失敗：${describeError(err)}`);
                console.error('[SavePageToAzureBlob] 操作失敗：', describeErrorForLog(err));
                await delay(6000);
            } finally {
                statusBar.remove();
            }
        })().finally(() => {
            activeSaveOperation = null;
            activeStatusBar = null;
        });

        return activeSaveOperation;
    }

    // ===== 主流程：「📋 將任意內容發佈到 Infinitybin」選單功能 =====

    /**
     * 接收使用者貼上的任意文字並發佈到 Infinitybin。
     *
     * 主要執行流程：
     *   1. 讀取已儲存的 SAS URL，如果尚未設定則提示使用者先設定
     *   2. 顯示文字對話框並等待使用者貼上內容
     *   3. 貼上後依文字內容推斷副檔名與 Content-Type
     *   4. 發佈到 Infinitybin
     *   5. 在新頁籤開啟純淨的 Blob URL
     */
    async function publishArbitraryContentToInfinitybin() {
        if (activeSaveOperation) {
            // 任意內容與網頁狀態共用同一把鎖，避免使用者連點不同選單時
            // 產生多個並行 PUT Blob 請求，造成重複內容或難以理解的頁籤切換。
            activeStatusBar?.update('⏳ 已有進行中的發佈作業，忽略重複觸發...');
            console.warn('[SavePageToAzureBlob] 偵測到重複觸發，已忽略新的任意內容發佈要求。');
            return activeSaveOperation;
        }

        const sasUrl = getConfiguredSasUrl();
        if (!sasUrl) return;

        let statusBar = null;

        activeSaveOperation = (async () => {
            try {
                const pastedText = await waitForPastedText();
                if (pastedText === null) return;

                const contentUpload = createTextUpload(pastedText, 'text/plain');
                const sizeKb = Math.max(1, Math.round(contentUpload.byteLength / 1024));
                const extension = normalizeExtension(contentUpload.extension);

                statusBar = createStatusBar('📋 正在準備發佈內容...');
                activeStatusBar = statusBar;

                statusBar.update(
                    `📤 正在發佈內容到 Infinitybin（.${extension}, ${contentUpload.contentType}, ${sizeKb.toLocaleString()} KB），請稍候...`
                );

                const cleanUrl = await uploadToAzureBlob(contentUpload.content, sasUrl, {
                    blobNamePrefix: 'content',
                    extension,
                    contentType: contentUpload.contentType
                });

                statusBar.update(`✅ 內容已發佈為 ${contentUpload.label}！即將切換至 Infinitybin 頁籤...\n${cleanUrl}`);
                await delay(2000);

                const openedTab = openPublishedTab(cleanUrl);
                if (!openedTab) {
                    statusBar.update(`✅ 發佈成功，但新頁籤被瀏覽器封鎖。\n請允許彈出式視窗或手動開啟：\n${cleanUrl}`);
                    await delay(6000);
                    return;
                }
            } catch (err) {
                if (!statusBar) {
                    statusBar = createStatusBar('');
                    activeStatusBar = statusBar;
                }
                // 錯誤訊息會寫進頁面上的狀態提示條，必須先遮蔽 SAS 簽章（見 describeError()）。
                statusBar.update(`❌ 內容發佈失敗：${describeError(err)}`);
                console.error('[SavePageToAzureBlob] 內容發佈失敗：', describeErrorForLog(err));
                await delay(6000);
            } finally {
                statusBar?.remove();
            }
        })().finally(() => {
            activeSaveOperation = null;
            activeStatusBar = null;
        });

        return activeSaveOperation;
    }

    // ===== 設定流程：「⚙️ 設定 Azure Blob SAS URL」選單功能 =====


    /**
     * 讓使用者透過 prompt() 對話框輸入或更新 Azure Container SAS URL，
     * 並進行基本格式驗證後，使用 GM_setValue 安全地儲存到擴充套件的儲存空間。
     *
     * SAS URL 的安全性說明：
     *   儲存於 GM_setValue 的資料位於 Tampermonkey 擴充套件的 IndexedDB/storage 空間，
     *   頁面腳本（網站的 JS）無法讀取，比 localStorage 更安全。
     *   但 SAS URL 本身具有時效性，建議定期更換並設定最短必要期限。
     */
    function configureSasUrl() {
        // 讀取現有 SAS URL 作為預設值，方便使用者確認或修改
        const current = GM_getValue(SAS_URL_STORAGE_KEY, '');

        const input = prompt(
            '請貼入 Azure Blob Container SAS URL：\n\n' +
            '格式範例：\n' +
            'https://<帳號>.blob.core.windows.net/<容器>?sv=...&sp=cw&sig=...\n\n' +
            '※ 需包含 Create（c）與 Write（w）權限\n' +
            '※ 若要使用「刪除頁面」功能，另需 Delete（d）權限（sp=cwd）\n' +
            '※ 請使用 Container 層級 SAS URL（路徑結尾為容器名稱，後接 ?）\n' +
            '※ 如要清除設定請輸入空白後確定',
            current
        );

        // 使用者點擊「取消」時 prompt() 回傳 null，不做任何動作
        if (input === null) return;

        const trimmed = input.trim();

        if (!trimmed) {
            // 使用者清空輸入 → 清除設定
            GM_setValue(SAS_URL_STORAGE_KEY, '');
            alert('Azure Blob SAS URL 已清除。');
            return;
        }

        // 進行基本格式驗證：必須是有效的 HTTPS URL 且 hostname 包含 blob.core.windows.net
        try {
            const parsed = new URL(trimmed);
            if (parsed.protocol !== 'https:') {
                throw new Error('SAS URL 必須使用 HTTPS 協定。');
            }
            if (!parsed.hostname.endsWith('.blob.core.windows.net')) {
                throw new Error('SAS URL 的 hostname 必須以 .blob.core.windows.net 結尾。');
            }
            if (!parsed.search || !parsed.search.includes('sig=')) {
                throw new Error('SAS URL 似乎缺少 sig 參數，請確認複製的是完整的 SAS URL。');
            }
        } catch (err) {
            // Firefox 的 new URL() 會把無法解析的原始輸入放進錯誤訊息，同樣先遮蔽 sig 再顯示。
            alert(`SAS URL 驗證失敗：\n${describeError(err)}\n\n請重新設定。`);
            return;
        }

        // 驗證通過，使用 GM_setValue 安全儲存
        GM_setValue(SAS_URL_STORAGE_KEY, trimmed);
        alert('✅ Azure Blob SAS URL 已儲存成功！\n現在可以使用「📸 將目前網頁狀態發佈到 Infinitybin」或「📋 將任意內容發佈到 Infinitybin」功能了。');
    }

    // ===== 設定流程：「🧩 快照設定」選單功能 =====

    /**
     * 讀取目前採用的快照模式。
     *
     * 設計意圖：
     *   - 預設「重播」：它同時滿足「畫面正確」與「互動可用」，是多數頁面的最佳解。
     *   - 只有明確存成 static 才走靜態，其餘（未設定、舊版殘留值、手動改壞的值）
     *     一律視為預設值，避免設定異常時行為靜默改變。
     *
     * @returns {string} SNAPSHOT_MODE_REPLAY 或 SNAPSHOT_MODE_STATIC
     */
    function getSnapshotMode() {
        return GM_getValue(SNAPSHOT_MODE_STORAGE_KEY, SNAPSHOT_MODE_REPLAY) === SNAPSHOT_MODE_STATIC
            ? SNAPSHOT_MODE_STATIC
            : SNAPSHOT_MODE_REPLAY;
    }

    /**
     * 切換快照模式，並把兩種模式的差異講清楚。
     *
     * 設計意圖：
     *   - 用單一選單命令 + confirm() 切換，避免選單被兩個互斥的模式指令撐長。
     *   - 說明文字必須提到「重播為什麼可能失敗」與「靜態的代價」，
     *     否則使用者遇到自動降級時會誤以為腳本壞掉（0.5.x 的實際回饋）。
     *   - 設定寫入 GM_setValue，只影響之後的發佈；已發佈的快照不會被改寫。
     */
    function configureSnapshotOptions() {
        const mode = getSnapshotMode();
        const isReplay = mode === SNAPSHOT_MODE_REPLAY;
        const nextLabel = isReplay ? '靜態快照' : '重播模式';

        const confirmed = confirm(
            '快照模式\n\n' +
            `目前設定：${isReplay ? '重播模式（建議）' : '靜態快照'}\n\n` +
            '・重播模式：重新取得原始 HTML 並保留頁面腳本，快照會自己渲染一次，' +
            '站內搜尋、頁籤切換都能用，畫面也不會重複。\n' +
            '　限制：需要連線重抓、內容由前端 API 產生的頁面（SPA 空殼）會自動降級，' +
            '腳本自己發出的相對網址請求仍可能失敗。\n' +
            '・靜態快照：凍結目前看到的畫面並移除所有腳本，畫面保證與發佈當下一模一樣，' +
            '但搜尋、切換頁籤等互動會失效。\n\n' +
            `要切換為「${nextLabel}」嗎？（下次發佈時生效）`
        );
        if (!confirmed) return;

        GM_setValue(SNAPSHOT_MODE_STORAGE_KEY, isReplay ? SNAPSHOT_MODE_STATIC : SNAPSHOT_MODE_REPLAY);
        alert(`✅ 已設定為「${nextLabel}」，下次發佈時生效。`);
    }

    /**
     * 註冊「context-menu 觸發橋接器」。
     *
     * 設計意圖：
     *   - 讓本腳本維持 document-idle 常駐能力（可保留既有選單與狀態提示邏輯）。
     *   - 同時提供另一個 @run-at context-menu 的輕量腳本作為觸發入口。
     *   - 主邏輯只保留一份在本檔案，避免雙份實作造成版本漂移與維護成本上升。
     */
    function registerContextMenuBridge() {
        document.addEventListener(CONTEXT_MENU_TRIGGER_EVENT, (event) => {
            const detail = event?.detail || {};

            // 僅接受本功能對應的事件，避免未來擴充時彼此誤觸。
            if (detail.feature !== 'save-page-to-azure-blob') {
                return;
            }

            // 先回 ACK，讓觸發端可快速得知主腳本已接手。
            document.dispatchEvent(new CustomEvent(CONTEXT_MENU_ACK_EVENT, {
                detail: {
                    handledBy: 'SavePageToAzureBlob.user.js',
                    timestamp: Date.now()
                }
            }));

            // 實際執行快照儲存流程。
            void savePageToAzureBlob();
        });
    }

    // ===== 向 Tampermonkey 選單註冊三個指令 =====

    // 主要功能：擷取目前頁面狀態並發佈到 Infinitybin
    GM_registerMenuCommand('📸 將目前網頁狀態發佈到 Infinitybin', savePageToAzureBlob);

    // 任意內容功能：接收使用者貼上的文字並依內容推斷副檔名與 Content-Type 後發佈
    GM_registerMenuCommand('📋 將任意內容發佈到 Infinitybin', publishArbitraryContentToInfinitybin);

    // 快照選項：切換「重播模式」與「靜態快照」（預設重播，見 getSnapshotMode()）
    GM_registerMenuCommand('🧩 快照設定：重播模式／靜態快照', configureSnapshotOptions);

    // 設定項目放在最後，讓日常使用時最常用的發佈動作優先顯示。
    GM_registerMenuCommand('⚙️ 設定 Azure Blob SAS URL', configureSasUrl);

    // 支援由 Tampermonkey context-menu 腳本直接觸發同一套主流程。
    registerContextMenuBridge();

    // 刪除功能：只在「設定的 SAS URL 所在容器下的頁面」掛載底部刪除列與選單命令，
    // 其他頁面完全不受影響（見 initDeleteFeature()）。
    initDeleteFeature();

})();
