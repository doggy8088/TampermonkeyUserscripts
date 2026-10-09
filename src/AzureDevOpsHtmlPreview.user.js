// ==UserScript==
// @name         Azure DevOps: 完整預覽 Repos 中的 HTML 檔案
// @version      0.1.1
// @description  在 Azure DevOps Repos 的檔案頁籤列右側加上「完整預覽 (內嵌)」與「完整預覽 (全螢幕)」按鈕，於隔離的 sandbox iframe 中以啟用 JavaScript 的方式預覽 HTML 檔，不再只能看到被拿掉腳本的靜態畫面
// @license      MIT
// @homepage     https://github.com/doggy8088/TampermonkeyUserscripts
// @homepageURL  https://github.com/doggy8088/TampermonkeyUserscripts
// @website      https://github.com/doggy8088
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/AzureDevOpsHtmlPreview.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/AzureDevOpsHtmlPreview.user.js
// @author       Will Huang
// @match        https://dev.azure.com/*
// @run-at       document-idle
// @icon         https://raw.githubusercontent.com/doggy8088/TampermonkeyUserscripts/main/images/AzureDevOpsHtmlPreview.png
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    /*
     * Azure DevOps HTML Preview
     *
     * 背景：Azure DevOps Repos 的 Preview 頁籤會把 HTML 檔放進 srcdoc iframe，
     *       但 dev.azure.com 的 CSP（script-src 'nonce-…' 'strict-dynamic'）會擋掉檔案內所有 <script>，
     *       所以只看得到沒有互動、沒有動態內容的靜態畫面。
     *
     * 做法：自己透過 Git Items REST API 抓原始檔，替每個 <script> 補上頁面現有的 nonce，
     *       再放進 sandbox="allow-scripts"（刻意不含 allow-same-origin）的 iframe 重新渲染。
     *       因為 iframe 的 origin 是 null，檔案內的腳本碰不到 Azure DevOps 的 cookie / session。
     *       渲染前會把同 repo 的相對路徑 <script src>、<link rel=stylesheet>、<img src> 抓回來內嵌，
     *       讓多檔案組成的網頁也能正常顯示（見 inlineRelativeAssets）。
     *
     * 網址：支援 /{org}/{project}/_git/{repo} 與省略專案段的 /{org}/_git/{repo}；
     *       網址沒有 version= 時，以版本選擇器上顯示的分支為準（見 currentBranchVersion）。
     *
     * 提供兩種模式：
     *   1. 完整預覽 (內嵌)：直接取代目前 Preview 頁籤內的預覽 iframe，高度填滿頁籤列以下的視窗。
     *   2. 完整預覽 (全螢幕)：用 window.open 開一個 popup 視窗，寫入只含全尺寸 sandbox iframe 的殼頁，
     *      讓使用者能看到完整的網頁內容（Userscript 沒有 chrome.windows 可用，故以 popup 取代獨立視窗）。
     *
     * 此腳本與 Chrome 擴充功能「Duotify Azure DevOps HTML Preview」功能相同。
     */

    const WRAP_ID = '__ado_js_preview_wrap';          // 按鈕容器的 id，用來避免重複插入
    const FRAME_ATTR = 'data-ado-js-preview';          // 標記我們建立的 iframe，與 ADO 原生的區分
    const LABEL_INLINE = '完整預覽 (內嵌)';
    const LABEL_WINDOW = '完整預覽 (全螢幕)';
    // 刻意不加 allow-same-origin：讓檔案內的腳本跑在 null origin，無法存取 Azure DevOps 的 cookie / session
    // allow-popups-to-escape-sandbox：讓預覽內的連結能在不受 sandbox 限制的新分頁開啟 Azure DevOps 檔案
    const SANDBOX = 'allow-scripts allow-popups allow-popups-to-escape-sandbox allow-forms allow-modals';

    const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    /**
     * 注入到預覽 HTML 尾端的連結修正腳本。
     * 問題：在 srcdoc iframe 裡點 <a href="#x"> 會被解析成「父頁面網址#x」，整個 iframe 會被導去載入 Azure DevOps 頁面，
     *       看起來就像預覽壞掉、JS 沒在跑（console 會出現一堆 ms.vss-*.min.js 的錯誤）。
     * 做法：攔截所有連結點擊——
     *   - #錨點：改用 location.hash，可正常觸發 hashchange（實測 srcdoc 內不會重載）
     *   - 相對路徑（../docs/x.md）：換算成 repo 內路徑，在新分頁開啟對應的 Azure DevOps 檔案
     *   - 絕對網址：在新分頁開啟
     *   新分頁需要 sandbox 的 allow-popups-to-escape-sandbox 才不會被 sandbox 限制。
     */
    function linkFixScript(info, nonce) {
        const cfg = JSON.stringify({
            repoUrl: `${location.origin}/${info.org}/${info.project}/_git/${encodeURIComponent(info.repo)}`,
            dir: info.path.replace(/[^/]*$/, ''),
            version: info.version,
        });
        return `<script nonce="${nonce}">(function(){
var cfg=${cfg};
document.addEventListener('click',function(e){
  if(e.defaultPrevented||e.button!==0||e.metaKey||e.ctrlKey||e.shiftKey||e.altKey)return;
  var a=e.target&&e.target.closest?e.target.closest('a[href]'):null;if(!a)return;
  var href=a.getAttribute('href')||'';
  if(href.charAt(0)==='#'){e.preventDefault();location.hash=href;return;}
  if(/^(javascript|mailto|tel|data|blob):/i.test(href))return;
  e.preventDefault();
  var target=href;
  if(!/^[a-z][a-z0-9+.-]*:/i.test(href)&&href.indexOf('//')!==0){
    var parts=href.split('#');
    var path=decodeURIComponent(new URL(parts[0],'https://repo.invalid'+cfg.dir).pathname);
    var q=new URLSearchParams({path:path});
    if(cfg.version)q.set('version',cfg.version);
    if(/\\.html?$/i.test(path))q.set('_a','preview');
    target=cfg.repoUrl+'?'+q.toString()+(parts[1]?'#'+parts[1]:'');
  }
  window.open(target,'_blank','noopener');
},true);
})();<\/script>`;
    }

    function injectBeforeBodyEnd(html, snippet) {
        return /<\/body>/i.test(html) ? html.replace(/<\/body>/i, snippet + '</body>') : html + snippet;
    }

    /** 預覽用的完整 HTML：補 nonce 再注入連結修正腳本 */
    function buildPreviewHtml(html, info, nonce) {
        return injectBeforeBodyEnd(withNonce(html, nonce), linkFixScript(info, nonce));
    }

    /**
     * 取得版本選擇器上目前顯示的分支，回傳 GB<分支名>；找不到時回傳空字串。
     *
     * 問題：從檔案樹或分享連結開啟檔案時，網址通常只有 ?path=…&_a=preview，沒有 version=。
     *       這時 Azure DevOps 顯示的是使用者「上次瀏覽的分支」，不一定是 repo 的預設分支；
     *       但 Git Items API 不帶 versionDescriptor 時會用預設分支，
     *       檔案只存在於其他分支就會回 HTTP 404，兩顆按鈕都失敗。
     * 做法：讀取版本選擇器按鈕上的分支名稱，讓預覽內容與畫面上看到的一致。
     *       分支圖示是 .artifact-dropdown-icon.ms-Icon--OpenSource（repo 選擇器用的是 ms-Icon--GitLogo，不會誤抓）。
     *       使用者選 tag / commit 時 ADO 一定會把 GT / GC 寫進網址，所以這裡只需要處理分支。
     */
    function currentBranchVersion() {
        const icon = document.querySelector('.artifact-dropdown-icon.ms-Icon--OpenSource');
        const name = icon?.closest('button')?.textContent.trim();
        return name ? `GB${name}` : '';
    }

    /**
     * 從目前網址解析出 org / project / repo / path / version。
     * 網址有兩種格式：
     *   /{org}/{project}/_git/{repo}?path=/x.html&version=GBbranch
     *   /{org}/_git/{repo}?path=/x.html   ← 專案名稱與 repo 同名時，Azure DevOps 會省略專案段
     * 後者的 REST API 仍需要專案段（org 層級不帶專案會回 400），
     * 實測用 repo 名當專案名即可正常取得檔案，所以 project 缺省時以 repo 名代入。
     * project / repo 一律存成解碼後的名稱，組 API 網址時再各自 encodeURIComponent，
     * 避免含空白或中文的專案名稱被重複編碼或漏編碼。
     * 只有 path 是 .html / .htm 時才回傳，其他檔案不顯示按鈕。
     */
    function parseLocation() {
        const m = location.pathname.match(/^\/([^/]+)(?:\/([^/]+))?\/_git\/([^/?#]+)/);
        if (!m) return null;
        const qs = new URLSearchParams(location.search);
        const path = qs.get('path');
        if (!path || !/\.html?$/i.test(path)) return null;
        // 網址有 version= 時以網址為準；沒有時改用版本選擇器上顯示的分支（見 currentBranchVersion）
        const version = qs.get('version') || currentBranchVersion();
        const repo = decodeURIComponent(m[3]);
        const project = m[2] ? decodeURIComponent(m[2]) : repo;
        return { org: m[1], project, repo, path, version };
    }

    /**
     * 組出 Git Items REST API 的網址，取回 repo 內某個檔案的原始內容。
     * version 參數前兩碼代表類型：GB=branch、GT=tag、GC=commit。
     *
     * format：主 HTML 用 text；內嵌的其他資源一律用 octetStream——
     *         text 會把二進位檔（png / jpg）當成文字轉碼，內容會損毀、圖片顯示不出來。
     */
    function rawUrl({ org, project, repo, path, version }, format = 'text') {
        const p = new URLSearchParams({
            path,
            includeContent: 'true',
            // 與 ADO 自己抓檔的請求一致：檔案若由 Git LFS 管理，回傳實際內容而不是 LFS 指標檔
            // （version https://git-lfs.github.com/spec/v1 …）；一般檔案的結果逐位元組相同，不受影響
            resolveLfs: 'true',
            'api-version': '7.1',
            '$format': format,
        });
        if (version.length > 2) {
            const type = { GB: 'branch', GT: 'tag', GC: 'commit' }[version.slice(0, 2)];
            if (type) {
                p.set('versionDescriptor.version', version.slice(2));
                p.set('versionDescriptor.versionType', type);
            }
        }
        return `${location.origin}/${org}/${encodeURIComponent(project)}/_apis/git/repositories/${encodeURIComponent(repo)}/items?${p}`;
    }

    async function fetchHtml(info) {
        // 同源請求帶上 cookie 即可通過 Azure DevOps 的驗證，不需要 PAT
        const res = await fetch(rawUrl(info), { credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
    }

    // ---------- 相對路徑資源內嵌 ----------
    /*
     * 問題：預覽的 HTML 放在 srcdoc iframe 裡，相對網址會解析到 Azure DevOps 頁面網址（about:srcdoc 的 base），
     *       而不是 repo 裡的檔案，所以 <script src="viewer.js">、<link rel="stylesheet" href="x.css">、
     *       <img src="a.png"> 這類多檔案網頁的資源全部載不到，畫面沒有樣式、腳本沒有執行、圖片破圖。
     * 做法：渲染前用同一個 Git Items API（同一個分支 / tag / commit）把這些同 repo 的相對資源抓回來，
     *       直接改寫成內嵌的 <script>…</script>、<style>…</style> 與 data: URL。
     *       內嵌後的 <script> 之後會由 withNonce 一起補上 nonce，所以能通過 dev.azure.com 的 CSP；
     *       data: 圖片符合 CSP 的 img-src（http: https: blob: data:）。
     * 限制：只處理靜態標籤；CSS 內的 url()、腳本在執行期才 fetch 的檔案（例如 PDF.js 的 worker 與 .pdf）
     *       仍然取不到。這與 Chrome 擴充功能版本的行為一致。
     */
    const ASSET_LIMIT = 60;                     // 每頁最多內嵌幾個資源，避免巨大的網頁發出過多 API 請求
    const ASSET_MAX_BYTES = 8 * 1024 * 1024;    // 單一資源上限 8 MB，超過就保留原樣不內嵌

    /**
     * 判斷是否為「同 repo 的相對路徑」：
     * 排除有 scheme 的絕對網址（https:、data: 等）、protocol-relative（//cdn…）與純錨點（#x）。
     * 以 / 開頭的根目錄路徑視為 repo 根目錄下的檔案，一樣會內嵌。
     */
    function isRelativeRef(ref) {
        return !!ref
            && !/^[a-z][a-z0-9+.-]*:/i.test(ref)
            && !ref.startsWith('//')
            && !ref.startsWith('#');
    }

    /**
     * 把相對路徑換算成 repo 內的絕對路徑：以目前 HTML 檔所在目錄為基準，處理 ../ 與 ./，
     * 並去掉 ?query 與 #hash（Git Items API 只認檔案路徑）。
     * 借用 URL 物件做路徑正規化，host 用不存在的 repo.invalid 只是佔位；最後解碼回 repo 內的真實檔名（例如中文檔名）。
     */
    function resolveRepoPath(ref, info) {
        const dir = info.path.replace(/[^/]*$/, '');
        const clean = ref.split('#')[0].split('?')[0];
        return decodeURIComponent(new URL(clean, 'https://repo.invalid' + dir).pathname);
    }

    // API 回傳的 content-type 不一定準確（octetStream 一律是 application/octet-stream），依副檔名決定圖片 MIME
    const MIME = {
        png: 'image/png',
        jpg: 'image/jpeg',
        jpeg: 'image/jpeg',
        gif: 'image/gif',
        svg: 'image/svg+xml',
        webp: 'image/webp',
        ico: 'image/x-icon',
        bmp: 'image/bmp',
    };

    /**
     * 以 octetStream 格式抓回 repo 內的單一資源。
     * asText=true 時回傳文字（JS / CSS），否則回傳 base64 的 data: URL（圖片）。
     * 轉 base64 時分段 0x8000 位元組呼叫 String.fromCharCode，避免大檔案超過函式參數上限而丟出 RangeError。
     */
    async function fetchAsset(info, repoPath, asText) {
        const res = await fetch(rawUrl({ ...info, path: repoPath }, 'octetStream'), { credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const blob = await res.blob();
        if (blob.size > ASSET_MAX_BYTES) throw new Error('too large');
        if (asText) return blob.text();
        // 回應的 content-type 形如 image/png; api-version=7.1，只取主型別當備援
        const ext = (repoPath.split('.').pop() || '').toLowerCase();
        const mime = MIME[ext] || (res.headers.get('content-type') || 'application/octet-stream').split(';')[0].trim();
        const bytes = new Uint8Array(await blob.arrayBuffer());
        let bin = '';
        for (let i = 0; i < bytes.length; i += 0x8000) {
            bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
        }
        return `data:${mime};base64,${btoa(bin)}`;
    }

    /**
     * 把 HTML 內同 repo 的相對路徑 <script src>、<link rel=stylesheet>、<img src> 改寫成內嵌內容。
     * 沒有任何相對資源時直接回傳原始 HTML，不做任何序列化，避免無謂地改動檔案內容。
     * 每個資源各自 try/catch：抓不到的保留原樣並標上 data-inline-failed（方便在 DevTools 查原因），
     * 不影響其他資源與整體預覽。
     */
    async function inlineRelativeAssets(html, info) {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        // 作者自己指定了 <base href>，代表他有自己的資源解析規則，尊重它、不做內嵌
        if (doc.querySelector('base[href]')) return html;

        const jobs = [];
        const take = (el) => {
            if (jobs.length >= ASSET_LIMIT) return false;
            jobs.push(el);
            return true;
        };
        for (const el of doc.querySelectorAll('script[src]')) {
            if (isRelativeRef(el.getAttribute('src'))) take(el);
        }
        for (const el of doc.querySelectorAll('link[rel~="stylesheet"][href]')) {
            if (isRelativeRef(el.getAttribute('href'))) take(el);
        }
        for (const el of doc.querySelectorAll('img[src]')) {
            if (isRelativeRef(el.getAttribute('src'))) take(el);
        }
        if (!jobs.length) return html;

        // 所有資源平行抓取；替換節點時各自 replaceWith，所以完成順序不影響最終的 DOM 順序
        await Promise.all(jobs.map(async (el) => {
            const tag = el.tagName.toLowerCase();
            const ref = el.getAttribute(tag === 'link' ? 'href' : 'src');
            let repoPath;
            try {
                repoPath = resolveRepoPath(ref, info);
            } catch {
                return;
            }
            try {
                if (tag === 'script') {
                    const code = await fetchAsset(info, repoPath, true);
                    const inline = doc.createElement('script');
                    // 保留 type="module"、defer 等其餘屬性，只拿掉 src
                    for (const a of el.attributes) {
                        if (a.name !== 'src') inline.setAttribute(a.name, a.value);
                    }
                    inline.setAttribute('data-inlined-from', ref);
                    // JS 原始碼裡若含 </script 會提前結束標籤，改寫成 <\/script（在字串與正規式中語意不變）
                    inline.textContent = code.replace(/<\/script/gi, '<\\/script');
                    el.replaceWith(inline);
                } else if (tag === 'link') {
                    const css = await fetchAsset(info, repoPath, true);
                    const style = doc.createElement('style');
                    style.setAttribute('data-inlined-from', ref);
                    // 保留 media 屬性，讓 print / 響應式樣式表維持原本的套用條件
                    if (el.media) style.setAttribute('media', el.media);
                    style.textContent = css.replace(/<\/style/gi, '<\\/style');
                    el.replaceWith(style);
                } else {
                    el.setAttribute('src', await fetchAsset(info, repoPath, false));
                }
            } catch (e) {
                // 抓不到就保留原樣，不影響其他資源
                el.setAttribute('data-inline-failed', String((e && e.message) || e));
            }
        }));

        // DOMParser 會丟掉 doctype 字串本身，補回去以免網頁掉進 quirks mode 造成版面差異
        const doctype = doc.doctype ? `<!DOCTYPE ${doc.doctype.name}>` : '<!DOCTYPE html>';
        return doctype + '\n' + doc.documentElement.outerHTML;
    }

    /**
     * 取得頁面 CSP 使用的 nonce。
     * nonce 屬性在 DOM 中會被瀏覽器隱藏（getAttribute 讀不到），但 .nonce property 仍可讀。
     */
    function getNonce() {
        for (const s of document.querySelectorAll('script')) {
            if (s.nonce) return s.nonce;
        }
        return '';
    }

    /**
     * srcdoc iframe 會繼承 dev.azure.com 的 CSP，
     * 所以每個 <script> 都要帶上同一個 nonce 才會被允許執行（含外部 src 的 script）。
     */
    function withNonce(html, nonce) {
        return nonce ? html.replace(/<script\b/gi, `<script nonce="${nonce}"`) : html;
    }

    /**
     * 確保目前在 Preview 頁籤並回傳 ADO 的預覽 iframe。
     * 若使用者在 Contents / History 等頁籤按下內嵌按鈕，先替他點 Preview 頁籤，
     * 再等待 SPA 把預覽 iframe 渲染出來（最多等 4 秒）。
     */
    async function ensurePreviewFrame() {
        const find = () => document.querySelector('iframe[srcdoc]');
        let frame = find();
        if (frame) return frame;

        // 頁籤文字會隨 ADO 顯示語言改變（例如中文介面不是「Preview」），只比對文字會找不到頁籤。
        // 先用 id 找：__bolt-tab-preview 對應網址的 _a=preview，是內部識別碼，不隨語言變動；
        // 文字比對保留當備援，以防 ADO 日後改掉 id 的命名。
        const tab = document.querySelector('.bolt-tabbar #__bolt-tab-preview')
            || [...document.querySelectorAll('.bolt-tabbar [role="tab"]')]
                .find((t) => /^preview$/i.test(t.textContent.trim()));
        if (!tab) throw new Error('找不到 Preview 頁籤');
        tab.click();

        for (let i = 0; i < 40 && !(frame = find()); i++) await sleep(100);
        if (!frame) throw new Error('Preview 區塊尚未出現，請再試一次');
        return frame;
    }

    // ---------- 1. 完整預覽 (內嵌) ----------

    async function renderInline() {
        const info = parseLocation();
        if (!info) return;

        // 抓檔案與切換頁籤可同時進行；拿到原始檔後再把相對路徑的 JS / CSS / 圖片內嵌進去
        const [rawHtml, old] = await Promise.all([fetchHtml(info), ensurePreviewFrame()]);
        const html = await inlineRelativeAssets(rawHtml, info);

        const f = document.createElement('iframe');
        f.className = old.className;
        f.setAttribute(FRAME_ATTR, '1');
        f.style.cssText = 'width:100%;height:80vh;border:0;background:#fff;display:block';
        f.setAttribute('sandbox', SANDBOX);
        f.srcdoc = buildPreviewHtml(html, info, getNonce());
        old.replaceWith(f);
        fitFrame();
    }

    /**
     * 讓內嵌 iframe 填滿頁籤列以下的視窗高度，網頁在 iframe 內自行捲動。
     * 不採用「依內容高度撐開」：使用 vh 單位的版面會跟著 iframe 一起長，形成無限增長的迴圈。
     */
    function fitFrame() {
        const f = document.querySelector(`iframe[${FRAME_ATTR}]`);
        if (!f) return;
        const top = f.getBoundingClientRect().top;
        f.style.height = `${Math.max(400, Math.floor(window.innerHeight - top - 16))}px`;
    }
    window.addEventListener('resize', fitFrame);

    // ---------- 2. 完整預覽 (全螢幕) ----------

    async function openWindow() {
        const info = parseLocation();
        if (!info) return;

        // window.open 必須在使用者手勢的同步階段呼叫，否則會被彈出視窗攔截器擋掉；
        // 因此先開空白視窗，等檔案抓回來再把內容寫進去。
        const w = window.open(
            '',
            '_blank',
            `popup=1,left=0,top=0,width=${screen.availWidth},height=${screen.availHeight}`,
        );
        if (!w) throw new Error('瀏覽器攔截了彈出視窗，請允許 dev.azure.com 的彈出式視窗');
        // 斷開 opener：sandbox 內的腳本雖然跨域，仍可讀到 top.opener，避免它導向原本的 Azure DevOps 分頁
        w.opener = null;

        try {
            // 與內嵌模式相同：先抓原始檔，再把相對路徑資源內嵌（視窗已在上面同步開好，這裡的 await 不會被攔截）
            const html = await inlineRelativeAssets(await fetchHtml(info), info);
            const title = `${info.path.split('/').pop()} – 完整預覽`;
            // 殼頁是 about:blank（與 dev.azure.com 同源、繼承其 CSP，inline style 已確認可用），
            // 真正的網頁放在 null origin 的 sandbox iframe 內，和內嵌模式一樣隔離。
            const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
            const nonce = getNonce();
            w.document.open();
            w.document.write(
                `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${esc(title)}</title>` +
                `<style>html,body{margin:0;height:100%;overflow:hidden;background:#fff}` +
                `iframe{display:block;width:100%;height:100%;border:0}</style></head><body>` +
                `<iframe sandbox="${SANDBOX}" srcdoc="${esc(buildPreviewHtml(html, info, nonce))}"></iframe>` +
                `</body></html>`,
            );
            w.document.close();
            w.focus();
        } catch (e) {
            // 抓檔失敗就不要留下一個空白視窗
            w.close();
            throw e;
        }
    }

    // ---------- 按鈕 ----------

    function makeButton(label, title, action) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.title = title;
        btn.textContent = label;
        btn.style.cssText =
            'padding:5px 12px;border-radius:4px;border:1px solid #0078d4;background:#0078d4;' +
            'color:#fff;cursor:pointer;font-size:13px;line-height:1.4;white-space:nowrap';
        btn.addEventListener('click', async () => {
            btn.disabled = true;
            btn.textContent = '載入中…';
            try {
                await action();
                btn.textContent = label;
            } catch (e) {
                // 把錯誤直接顯示在按鈕上，不用開 console 也看得到原因
                btn.textContent = `失敗：${e.message}（再試一次）`;
            } finally {
                btn.disabled = false;
            }
        });
        return btn;
    }

    /**
     * 把兩顆按鈕插進頁籤列（.bolt-tabbar）的最右側。
     * 頁籤列是 flex-row，裡面只有一個 flex-grow 的 tablist，所以 margin-left:auto 就能靠右對齊。
     */
    function ensureButtons() {
        const info = parseLocation();
        const tabbar = document.querySelector('.bolt-tabbar');
        const existing = document.getElementById(WRAP_ID);
        if (!info || !tabbar) {
            existing?.remove();
            return;
        }
        if (existing && existing.parentElement === tabbar) return;
        existing?.remove();

        const wrap = document.createElement('div');
        wrap.id = WRAP_ID;
        wrap.style.cssText = 'margin-left:auto;align-self:center;flex-shrink:0;display:flex;gap:8px';
        wrap.append(
            makeButton(LABEL_INLINE, '在目前的預覽區塊以啟用 JavaScript 的方式顯示完整網頁', renderInline),
            makeButton(LABEL_WINDOW, '在新視窗以啟用 JavaScript 的方式全螢幕預覽此 HTML', openWindow),
        );
        tabbar.appendChild(wrap);
    }

    // Azure DevOps 是 SPA，切換檔案 / 頁籤時 DOM 會重建，所以持續觀察並補回按鈕
    new MutationObserver(ensureButtons).observe(document.body, { childList: true, subtree: true });
    ensureButtons();
})();
