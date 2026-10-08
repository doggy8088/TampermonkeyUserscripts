// ==UserScript==
// @name         Azure DevOps: 完整預覽 Repos 中的 HTML 檔案
// @version      0.1.0
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
     * 從目前網址解析出 org / project / repo / path / version。
     * 網址格式：/{org}/{project}/_git/{repo}?path=/x.html&version=GBbranch
     * 只有 path 是 .html / .htm 時才回傳，其他檔案不顯示按鈕。
     */
    function parseLocation() {
        const m = location.pathname.match(/^\/([^/]+)\/([^/]+)\/_git\/([^/?#]+)/);
        if (!m) return null;
        const qs = new URLSearchParams(location.search);
        const path = qs.get('path');
        if (!path || !/\.html?$/i.test(path)) return null;
        const version = qs.get('version') || '';
        return { org: m[1], project: m[2], repo: decodeURIComponent(m[3]), path, version };
    }

    /**
     * 組出 Git Items REST API 的網址，以純文字取回原始檔內容。
     * version 參數前兩碼代表類型：GB=branch、GT=tag、GC=commit。
     */
    function rawUrl({ org, project, repo, path, version }) {
        const p = new URLSearchParams({
            path,
            includeContent: 'true',
            'api-version': '7.1',
            '$format': 'text',
        });
        if (version.length > 2) {
            const type = { GB: 'branch', GT: 'tag', GC: 'commit' }[version.slice(0, 2)];
            if (type) {
                p.set('versionDescriptor.version', version.slice(2));
                p.set('versionDescriptor.versionType', type);
            }
        }
        return `${location.origin}/${org}/${project}/_apis/git/repositories/${encodeURIComponent(repo)}/items?${p}`;
    }

    async function fetchHtml(info) {
        // 同源請求帶上 cookie 即可通過 Azure DevOps 的驗證，不需要 PAT
        const res = await fetch(rawUrl(info), { credentials: 'include' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.text();
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

        const tab = [...document.querySelectorAll('.bolt-tabbar [role="tab"]')]
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

        // 抓檔案與切換頁籤可同時進行
        const [html, old] = await Promise.all([fetchHtml(info), ensurePreviewFrame()]);

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
            const html = await fetchHtml(info);
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
