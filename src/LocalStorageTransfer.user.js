// ==UserScript==
// @name         偵錯工具: localStorage 複製/貼上
// @version      0.2.0
// @description  透過選單命令快速匯出/匯入目前網站的 localStorage（方便在不同電腦/網站之間交換，用於偵錯）
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/LocalStorageTransfer.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/LocalStorageTransfer.user.js
// @author       Will Huang
// @match        *://*/*
// @run-at       document-idle
// @grant        GM_registerMenuCommand
// @grant        GM_setClipboard
// @grant        GM_notification
// ==/UserScript==

(function () {
    'use strict';

    /*
     * Debug: localStorage 複製/貼上（LocalStorage Transfer）
     *
     * 主要目的
     * - 偵錯時，常需要在「不同電腦」或「不同網站」之間快速交換 localStorage 內容，
     *   例如重現某些狀態、問題、或比對設定差異。
     *
     * 設計決策（為什麼用選單命令）
     * - localStorage 的匯出/匯入通常涉及剪貼簿或文字貼上；使用 GM_registerMenuCommand
     *   可以避免綁快捷鍵造成衝突，也能讓操作更明確（使用者知道正在做「複製」或「貼上」）。
     *
     * 資料格式（Clipboard Payload）
     * - 為了可讀性與可攜性，匯出時會產生 JSON（含少量中繼資料），結構如下：
     *   {
     *     "schemaVersion": 1,
     *     "createdAt": "2026-01-09T00:00:00.000Z",
     *     "source": { "origin": "...", "href": "..." },
     *     "localStorage": { "key": "value", ... }
     *   }
     *
     * 安全提醒（非常重要）
     * - localStorage 可能包含登入 token、個資或敏感資訊；「複製」會把內容放到剪貼簿，
     *   「貼上」會把剪貼簿的資料寫入目前網站的 localStorage。
     * - 這份腳本定位為偵錯工具，請只在你信任的環境/網站使用，並在完成後清理剪貼簿與 localStorage。
     *
     * 行為摘要
     * - 「複製」：將目前網站（目前 origin）的 localStorage 全部匯出到剪貼簿（JSON）。
     * - 「貼上」：從剪貼簿讀取 JSON，詢問是否要先清空現有 localStorage，然後寫入目前網站。
     *
     * 相容性考量
     * - 「寫入剪貼簿」使用 GM_setClipboard（Tampermonkey 支援，且通常不受使用者手勢限制）。
     * - 「讀取剪貼簿」不使用已棄用的 Greasemonkey `GM_getClipboard`（多數環境已不支援）。
     *   改用瀏覽器的 Clipboard API（`navigator.clipboard.readText()`）並在失敗時回退到 prompt，
     *   以確保在權限受限/非安全來源/不允許讀取剪貼簿時仍然可用。
     */

    const PAYLOAD_SCHEMA_VERSION = 1;

    function safeGetLocalStorageEntries() {
        // 意圖：把 localStorage 轉成「純資料物件」以便 JSON 化；同時避免原型污染問題。
        const entries = Object.create(null);

        // localStorage 可能因瀏覽器設定（隱私模式/封鎖）而丟出例外，因此全程 try/catch。
        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key === null) continue;
                entries[key] = localStorage.getItem(key);
            }
        } catch (err) {
            // 偵錯工具不希望噪音太多；這裡用 alert 明確告知，且保留 console 供需要時追查。
            console.warn('[LocalStorageTransfer] Failed to read localStorage.', err);
            alert('無法讀取 localStorage（可能被瀏覽器/網站限制）。詳情請看 Console。');
        }

        return entries;
    }

    function buildPayloadJson() {
        // 意圖：在 payload 中加入來源資訊，讓使用者跨站貼上時能清楚知道「這份資料從哪來」。
        const payload = {
            schemaVersion: PAYLOAD_SCHEMA_VERSION,
            createdAt: new Date().toISOString(),
            source: {
                origin: location.origin,
                href: location.href,
            },
            localStorage: safeGetLocalStorageEntries(),
        };

        // JSON 格式化：偏好可讀性（偵錯工具），因此使用 2 spaces（不是程式碼縮排規則）。
        return JSON.stringify(payload, null, 2);
    }

    async function writeToClipboard(text) {
        // 意圖：優先使用 GM_setClipboard（不受使用者手勢限制），失敗再退回到 Web Clipboard API。
        // 相容性：不同 userscript 引擎 / Tampermonkey 版本的 GM_setClipboard 參數形式不完全一致，
        // 這裡採用「由簡到繁」的嘗試策略，避免因參數不符而整體失效。
        try {
            if (typeof GM_setClipboard === 'function') {
                // 1) 最常見：只傳文字
                GM_setClipboard(text);
                return true;
            }
        } catch (err) {
            console.warn('[LocalStorageTransfer] GM_setClipboard(text) failed.', err);
        }

        try {
            if (typeof GM_setClipboard === 'function') {
                // 2) 部分版本接受第二參數 type
                GM_setClipboard(text, 'text');
                return true;
            }
        } catch (err) {
            console.warn('[LocalStorageTransfer] GM_setClipboard(text, "text") failed.', err);
        }

        try {
            if (typeof GM_setClipboard === 'function') {
                // 3) 部分版本支援 info object（可指定 mimetype）
                GM_setClipboard(text, { type: 'text', mimetype: 'text/plain' });
                return true;
            }
        } catch (err) {
            console.warn('[LocalStorageTransfer] GM_setClipboard(text, { ... }) failed, fallback to navigator.clipboard.', err);
        }

        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
                return true;
            }
        } catch (err) {
            console.warn('[LocalStorageTransfer] navigator.clipboard.writeText failed.', err);
        }

        return false;
    }

    async function readFromClipboard() {
        // 意圖：讀取剪貼簿在 userscript 生態系沒有一致、可靠的 GM_* API（且 GM_getClipboard 已棄用），
        // 因此只嘗試使用瀏覽器 Clipboard API，並在失敗時由呼叫端回退到 prompt。
        //
        // 注意：
        // - `navigator.clipboard.readText()` 通常需要「安全來源」（HTTPS / localhost）與「使用者手勢」。
        // - Tampermonkey 的選單命令點擊通常會被視為使用者手勢，但仍可能被瀏覽器策略或權限阻擋。
        try {
            if (navigator.clipboard?.readText) {
                // 強制聚焦頁面，唯有此才能確保 Clipboard API 有權限運作。
                await GM.notification({ text: '正在讀取剪貼簿...', highlight: true, timeout: 1000 });
                const text = await navigator.clipboard.readText();
                if (typeof text === 'string' && text.trim().length > 0) return text;
            }
        } catch (err) {
            console.warn('[LocalStorageTransfer] navigator.clipboard.readText failed.', err);
        }

        return null;
    }

    function parsePayload(text) {
        // 意圖：支援兩種常見輸入：
        // 1) 本腳本「複製」產生的完整 payload（含 schemaVersion/localStorage）
        // 2) 使用者手動整理的純 key/value 物件（直接視為 localStorage entries）
        let parsed;
        try {
            parsed = JSON.parse(text);
        } catch (err) {
            return { ok: false, error: '剪貼簿內容不是有效的 JSON。' };
        }

        if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
            return { ok: false, error: 'JSON 必須是物件（Object）。' };
        }

        const entries = (parsed.localStorage && typeof parsed.localStorage === 'object' && !Array.isArray(parsed.localStorage))
            ? parsed.localStorage
            : parsed;

        if (entries === null || typeof entries !== 'object' || Array.isArray(entries)) {
            return { ok: false, error: '找不到可用的 localStorage 內容。' };
        }

        return { ok: true, entries, meta: parsed };
    }

    function applyEntriesToLocalStorage(entries, { clearFirst }) {
        // 意圖：將 entries 寫入 localStorage；如果 clearFirst 為 true，先清空再寫入。
        // 注意：寫入可能因 quota 限制或瀏覽器政策而失敗，因此每個 key 都包 try/catch。
        try {
            if (clearFirst) localStorage.clear();
        } catch (err) {
            console.warn('[LocalStorageTransfer] Failed to clear localStorage.', err);
            return { ok: false, error: '無法清空 localStorage（可能被瀏覽器/網站限制）。' };
        }

        let successCount = 0;
        let failCount = 0;

        const keys = Object.keys(entries);
        for (const key of keys) {
            try {
                // localStorage 僅接受字串；為了最大容錯，非字串會轉成字串。
                const value = entries[key];
                localStorage.setItem(key, typeof value === 'string' ? value : String(value));
                successCount++;
            } catch (err) {
                failCount++;
                console.warn(`[LocalStorageTransfer] Failed to set localStorage key: ${key}`, err);
            }
        }

        return { ok: true, successCount, failCount, totalCount: keys.length };
    }

    async function onCopy() {
        const json = buildPayloadJson();
        const ok = await writeToClipboard(json);
        if (!ok) {
            // 若無法寫入剪貼簿，仍提供可行替代方案：讓使用者自行複製（避免功能完全不可用）。
            prompt('無法自動寫入剪貼簿，請手動複製以下內容：', json);
            return;
        }

        // alert('已複製目前網站的 localStorage 到剪貼簿（JSON 格式）。');
    }

    async function onPaste() {
        const clipboardText = await readFromClipboard();
        const text = clipboardText ?? prompt('無法自動讀取剪貼簿，請在此貼上 localStorage JSON：', '');
        if (!text || typeof text !== 'string' || text.trim().length === 0) return;

        const parsed = parsePayload(text);
        if (!parsed.ok) {
            alert(parsed.error);
            return;
        }

        // UI/UX：貼上其實是一個「不可逆」的操作（尤其是覆蓋 token / 設定時），
        // 既然腳本定位為偵錯工具，就必須把「最後一刻的反悔機會」做出來。
        //
        // 為什麼不是把「是否清空」的 confirm 當成取消？
        // - `confirm()` 只有兩個按鈕；若把「取消」解讀為「整體取消貼上」，
        //   使用者就會失去「不清空但仍貼上」的選項（這在某些偵錯情境很常見）。
        // - 因此這裡拆成兩步：
        //   1) 先確認「是否真的要寫入」（可取消）
        //   2) 再確認「是否要先清空」（取消表示「不清空，仍繼續」）
        const entriesCount = Object.keys(parsed.entries).length;
        const sourceOrigin = parsed.meta?.source?.origin ? String(parsed.meta.source.origin) : null;
        const sourceHref = parsed.meta?.source?.href ? String(parsed.meta.source.href) : null;
        const createdAt = parsed.meta?.createdAt ? String(parsed.meta.createdAt) : null;
        const sourceHint = sourceOrigin
            ? `來源：${sourceOrigin}${sourceOrigin !== location.origin ? '（與目前網站不同）' : ''}`
            : '來源：未知（可能是手動整理的 JSON）';

        const previewLines = [
            '即將把資料寫入「目前網站」的 localStorage：',
            `- ${sourceHint}`,
            createdAt ? `- 產生時間：${createdAt}` : null,
            sourceHref ? `- 來源頁面：${sourceHref}` : null,
            `- Keys 數量：${entriesCount}`,
            '',
            '按「確定」繼續寫入；按「取消」放棄寫入！',
        ];

        if (!confirm(previewLines.join('\n'))) return;

        // UI/UX：第二步才詢問是否清空（取消代表「不清空」而不是「取消貼上」）。
        const clearFirst = confirm(
            '是否要先清空現有 localStorage 資料？\n\n💡 建議偵錯時清空，以避免舊資料干擾'
        );

        const result = applyEntriesToLocalStorage(parsed.entries, { clearFirst });
        if (!result.ok) {
            alert(result.error);
            return;
        }

        const summary =
            `已寫入 localStorage 成功！\n\n` +
            `- 成功：${result.successCount}\n` +
            `- 失敗：${result.failCount}\n` +
            `- 總數：${result.totalCount}\n\n` +
            `提示：部分網站需重新整理頁面才會讀到新狀態。`;

        if (confirm(`${summary}\n\n是否立即重新載入頁面？`)) {
            location.reload();
        } else {
            alert(summary);
        }
    }

    function onClearAll() {
        // 意圖：提供一個「清空目前網站 localStorage」的工具，執行前要求使用者確認。
        // 注意：localStorage 可能含敏感資訊（token 等），此操作不可復原。
        if (!confirm('警告：這會清除「目前網站」的所有 localStorage 資料，這個操作無法復原。是否繼續？')) return;

        try {
            localStorage.clear();
        } catch (err) {
            console.warn('[LocalStorageTransfer] Failed to clear localStorage.', err);
            alert('無法清空 localStorage（可能被瀏覽器/網站限制）。詳情請看 Console。');
            return;
        }

        try {
            if (typeof GM_notification === 'function') {
                GM_notification({ text: '已清空 localStorage（目前網站）', highlight: true, timeout: 2000 });
            } else {
                alert('已清空 localStorage（目前網站）。');
            }
        } catch (err) {
            console.warn('[LocalStorageTransfer] GM_notification failed.', err);
            alert('已清空 localStorage（目前網站）。');
        }

        if (confirm('已清空 localStorage。是否立即重新載入頁面以讓變更生效？')) {
            location.reload();
        }
    }

    function registerMenuCommands() {
        // 意圖：即使未來腳本在非 Tampermonkey 環境載入（例如直接貼到 Console），也能安全早退。
        if (typeof GM_registerMenuCommand !== 'function') return;

        GM_registerMenuCommand('複製', onCopy);
        GM_registerMenuCommand('貼上', onPaste);
        GM_registerMenuCommand('清除所有資料', onClearAll);
    }

    registerMenuCommands();
})();
