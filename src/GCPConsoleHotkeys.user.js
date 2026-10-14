// ==UserScript==
// @name         GCP Console: 好用的鍵盤快速鍵集合
// @version      0.1.0
// @description  GCP Console 快速鍵優化（全站生效）。數字鍵 1~9 在 Billing 清單頁開啟帳單帳戶；g 開頭的組合鍵快速跳頁：gb = Billing 清單、gh = Console 首頁、gp = Manage resources、gc = Credits（在 Billing 帳戶頁）/ Credentials（其他頁面）。
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/GCPConsoleHotkeys.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/GCPConsoleHotkeys.user.js
// @author       Will Huang
// @match        https://console.cloud.google.com/*
// @run-at       document-start
// @icon         https://www.google.com/s2/favicons?sz=64&domain=console.cloud.google.com
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // ---------- 取得「最上層」視窗 ----------
    // 設計意圖：GCP Console 部分功能區塊（例如面板或特定子服務）會嵌在同源 iframe 裡。
    // 當使用者點擊 iframe 內部使焦點停留在 iframe 時，鍵盤事件不會自動冒泡到最上層視窗。
    // 因此讓腳本在每個同源 frame 都載入執行，但所有網址狀態判斷與頁面導覽都統一對齊最上層視窗 (window.top)，
    // 若遇到跨來源 iframe 存取 window.top.location 拋出安全性例外，則安全降級回當前 window。
    const TOP = (() => {
        try {
            void window.top.location.pathname; // 跨來源會丟例外
            return window.top;
        } catch (_) {
            return window;
        }
    })();

    if (window === window.top) console.debug('[GCP Hotkeys] v0.6.0 loaded');

    // ---------- 共用工具 ----------

    // 帳單帳戶格式固定為三組 6 碼英數（如 /billing/01ABCD-23EFGH-45IJKL），
    // ACCOUNT_PATH_RE 用於精準匹配帳單帳戶首頁連結，避免誤抓子路徑連結；
    // BILLING_ID_RE 則用於從任何帳單子頁面網址中擷取出目前所在的帳單帳戶 ID。
    const ACCOUNT_PATH_RE = /^\/billing\/[0-9A-Z]{6}-[0-9A-Z]{6}-[0-9A-Z]{6}\/?$/i;
    const BILLING_ID_RE = /^\/billing\/([0-9A-Z]{6}-[0-9A-Z]{6}-[0-9A-Z]{6})(?:\/|$)/i;

    const trimSlash = (p) => p.replace(/\/+$/, '');

    /**
     * 檢查目前焦點是否位於可輸入文字的表單控制項或編輯區內。
     * 設計意圖：GCP Console 大量使用 Angular Material 與 Web Components (Shadow DOM)，
     * 若只看 e.target 可能會拿到外層的 custom element 而漏判內部的 input；
     * 因此優先取 e.composedPath()[0] 穿透 Shadow DOM 取得真實觸發事件的元素，避免在輸入文字或搜尋時誤觸快速鍵。
     */
    function isTyping(e) {
        // composedPath()[0] 才是真正的來源元素（可穿透 Shadow DOM）
        const t = (e.composedPath && e.composedPath()[0]) || e.target;
        if (!t || !t.tagName) return false;
        const tag = t.tagName.toLowerCase();
        return (
            tag === 'input' ||
            tag === 'textarea' ||
            tag === 'select' ||
            t.isContentEditable ||
            (t.getAttribute && t.getAttribute('role') === 'textbox')
        );
    }

    /**
     * 排除帶有 Ctrl / Cmd / Alt / Shift 等修飾鍵的組合鍵，
     * 避免干擾瀏覽器原生快捷鍵（如 Cmd+R 重新整理、Ctrl+C 複製）或 GCP Console 內建的複合快捷鍵。
     */
    function hasModifier(e) {
        return e.ctrlKey || e.metaKey || e.altKey || e.shiftKey;
    }

    /**
     * 以實體按鍵 (e.code) 判斷，不受輸入法影響。
     * 中文輸入法開啟時 e.key 會變成 "Process"，但 e.code 仍是 "KeyG"、"Digit1"。
     * 回傳小寫字母（a~z）或數字（0~9），其他鍵回傳 ''。
     */
    function keyOf(e) {
        const m = /^(?:Key([A-Z])|Digit([0-9])|Numpad([0-9]))$/.exec(e.code || '');
        if (m) return (m[1] || m[2] || m[3]).toLowerCase();
        return /^[a-z0-9]$/i.test(e.key || '') ? e.key.toLowerCase() : '';
    }

    /**
     * SPA 導覽：最上層頁面若已有指向 targetPath 的連結就直接點它（不重載），
     * 否則用 location.assign 換網址。keepSearch 為 true 時保留 ?project=... 等參數。
     */
    function navigateTo(targetPath, keepSearch) {
        if (trimSlash(TOP.location.pathname) === trimSlash(targetPath)) return; // 已在該頁

        const link = [...TOP.document.querySelectorAll('a[href]')].find((a) => {
            try {
                return trimSlash(new URL(a.href, TOP.location.origin).pathname) === trimSlash(targetPath);
            } catch (_) {
                return false;
            }
        });

        if (link) {
            link.click();
        } else {
            TOP.location.assign(targetPath + (keepSearch ? TOP.location.search : ''));
        }
    }

    /**
     * 導向乾淨網址（不帶 Query String）。不走「點現成連結」，
     * 因為頁面上的連結可能自帶 ?project=... 等參數。
     * 已經在該頁且沒有 Query String 時不動作。
     */
    function goClean(path) {
        const already = trimSlash(TOP.location.pathname) === trimSlash(path) && !TOP.location.search;
        if (!already) TOP.location.assign(path);
    }

    // ---------- 功能 1：Billing 清單頁，按 1~9 開啟第 N 個帳單帳戶 ----------

    function isBillingListPage() {
        // GCP Console 是 SPA，每次按鍵時即時判斷目前網址
        return /^\/billing\/?$/.test(TOP.location.pathname);
    }

    /**
     * 從 Billing 清單頁的表格列 (tr) 中找出所有帳單帳戶的連結。
     * 限定在 tr 內搜尋可避免抓到側邊欄或選單中同樣指向帳單帳戶的重複連結，確保數字鍵 1~9 與表格列順序一致。
     */
    function getAccountLinks() {
        return [...TOP.document.querySelectorAll('tr a[href]')].filter((a) => {
            try {
                return ACCOUNT_PATH_RE.test(new URL(a.href, TOP.location.origin).pathname);
            } catch (_) {
                return false;
            }
        });
    }

    function handleOpenAccount(e, key) {
        if (!isBillingListPage()) return false;
        if (!/^[1-9]$/.test(key)) return false;

        const link = getAccountLinks()[Number(key) - 1];
        if (!link) return false;

        e.preventDefault();
        e.stopPropagation();
        link.click(); // 走 Angular router，不會整頁重載
        return true;
    }

    // ---------- 功能 2：g 開頭的組合鍵（g 之後 1 秒內按第二個鍵） ----------

    /**
     * 每個指令回傳 true 代表有處理（會 preventDefault）。
     * 新增快速鍵只要在這裡加一行。
     */
    const GO_COMMANDS = {
        // gb：Billing 帳戶清單頁
        b() {
            goClean('/billing');
            return true;
        },

        // gh：Console 首頁
        h() {
            goClean('/');
            return true;
        },

        // gp：Manage resources（專案/資源管理）
        p() {
            goClean('/cloud-resource-manager');
            return true;
        },

        // gc：情境感知跳轉——
        //     1. 若目前位於某個帳單帳戶 (/billing/<帳戶ID>/...) 底下且尚未在 Credits 頁，優先跳往該帳戶的 Credits 頁；
        //     2. 若已經在該帳戶的 Credits 頁（再按一次 gc），或位於其他任何頁面，則跳往 APIs & Services > Credentials 頁。
        c() {
            const path = trimSlash(TOP.location.pathname);
            const m = path.match(BILLING_ID_RE);
            const creditsPath = m && `/billing/${m[1]}/credits/all`;
            const onCredits = m && (path === creditsPath || path.startsWith(`/billing/${m[1]}/credits/`));

            const target = m && !onCredits ? creditsPath : '/apis/credentials';
            console.debug('[GCP Hotkeys] gc ->', target, '(from', path + ')');
            navigateTo(target, true);
            return true;
        },
    };

    const SEQ_TIMEOUT_MS = 1000;
    let pendingG = false;
    let pendingTimer = null;

    function clearPending() {
        pendingG = false;
        clearTimeout(pendingTimer);
        pendingTimer = null;
    }

    function handleGoSequence(e, key) {
        if (pendingG) {
            clearPending();
            const cmd = Object.prototype.hasOwnProperty.call(GO_COMMANDS, key) && GO_COMMANDS[key];
            if (cmd && cmd()) {
                e.preventDefault();
                e.stopPropagation();
                return true;
            }
            // 不是已定義的第二個鍵：落到下面，看這個鍵是不是新的 g
        }

        if (key === 'g') {
            pendingG = true;
            pendingTimer = setTimeout(clearPending, SEQ_TIMEOUT_MS);
        }
        return false;
    }

    // ---------- 統一的 keydown 入口 ----------

    window.addEventListener(
        'keydown',
        (e) => {
            if (hasModifier(e) || e.repeat) return;
            if (isTyping(e)) {
                clearPending();
                return;
            }
            const key = keyOf(e);
            if (!key) {
                clearPending();
                return;
            }
            if (handleOpenAccount(e, key)) return;
            handleGoSequence(e, key);
        },
        true // capture 階段，避免被頁面本身的快速鍵攔截
    );
})();
