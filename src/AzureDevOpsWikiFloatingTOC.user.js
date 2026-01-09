// ==UserScript==
// @name         Azure DevOps: 強化 Wiki 的 TOC 目錄為浮動側邊資訊卡
// @version      0.1.0
// @description  將 Visual Studio Wiki 中使用 [[_TOC_]] 的目錄，改為深色/淺色浮動側邊資訊卡的樣式；新增參數可控制預設是否隱藏 TOC、可儲存主題偏好並由 TOC 內按鈕切換
// @license      MIT
// @homepage     https://github.com/doggy8088/TampermonkeyUserscripts
// @homepageURL  https://github.com/doggy8088/TampermonkeyUserscripts
// @website      https://github.com/doggy8088
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/AzureDevOpsWikiFloatingTOC.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/AzureDevOpsWikiFloatingTOC.user.js
// @author       Will Huang
// @match        https://*.visualstudio.com/*/_wiki/*
// @run-at       document-idle
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function () {
    'use strict';

    /*
     * Azure DevOps Wiki Floating TOC
     * 目的：將使用 [[_TOC_]] 的頁面目錄，轉為右側的深色浮動資訊卡，
     *       以提升在深色主題或長文件中的導覽便利性。
     * 使用說明：
     *  - 依靠 CSS 覆寫頁面現有 TOC 樣式（大量使用 !important 以確保效果）。
     *  - 若想改變預設行為，可修改下面的常數 `HIDE_TOC_BY_DEFAULT` 與 `EXPAND_FLOATING_BY_DEFAULT`。
     * 未來改善建議：可儲存使用者偏好（localStorage / GM_*），或新增鍵盤/頁面開關。
     */

    // Config：浮動 TOC 是否預設展開
    // 若設為 true，浮動 TOC 直接顯示完整資訊卡；若設為 false（預設），
    // 則只顯示膠囊圖示，滑鼠 hover 才展開，離開自動收合。
    // 設計決策：把「浮動是否展開」與「原始 TOC 是否顯示」拆開，避免互相影響。
    const EXPAND_FLOATING_BY_DEFAULT = false;

    // 原始 TOC 是否預設隱藏（false 表示保留原始 TOC 顯示）
    // 設計決策：保留原始 TOC 能讓使用者在原位置閱讀目錄，浮動只是輔助。
    const HIDE_TOC_BY_DEFAULT = false;

    // 只負責注入樣式（僅支援 md 檔內是使用 [[_TOC_]] 的目錄）
    const STYLE_ID = 'vs-wiki-floating-toc-style';
    if (document.getElementById(STYLE_ID)) return;

    // 預設主題（false = 深色，true = 淺色）。實際啟用會以已儲存的偏好為主。
    const DEFAULT_USE_LIGHT_MODE = false;
    // 使用專屬 class 來標記浮動 TOC，避免 Azure DevOps 原生 class（例如 toc-container）
    // 被套用到我們的浮動 CSS，導致原始 TOC 被收合或隱藏。
    const FLOATING_TOC_CLASS = 'azdo-floating-toc';
    // 以 data-* 標記浮動 TOC，方便在 MutationObserver 中快速忽略自己插入的 DOM。
    const FLOATING_TOC_ATTR = 'data-azdo-floating-toc';
    // TOC 根容器的 selector（避免抓到內層清單造成重複 clone）
    const TOC_ROOT_SELECTOR = [
        'div#toc',
        'div.toc',
        'nav.toc',
        '.wiki-toc',
        '.toc-container',
        '.toc-wrapper',
        '.tocContainer'
    ].join(', ');
    // 內層清單 selector（僅作為 fallback 用，避免抓不到 TOC）
    const TOC_LIST_SELECTOR = '.tocList, .toc-list';

    // 將文字內容轉為可比較的標準格式（移除多餘空白並 trim）
    // 設計目標：在找不到完全相同 href 時，仍可用標題文字進行保守比對。
    function normalizeTextContent(text) {
        return (text || '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    // 安全解碼 URI 片段：避免遇到非法編碼時拋錯導致流程中斷
    function safeDecodeURIComponent(value) {
        try {
            return decodeURIComponent(value);
        } catch (e) {
            return value;
        }
    }

    // 從 href 取得可比對的 anchor 候選（支援 #hash 與 ?anchor= 兩種形態）
    // 設計目標：支援 Azure DevOps SPA 的 anchor 參數，並且兼容舊式 #hash。
    function getAnchorCandidatesFromHref(href) {
        if (!href) return [];
        const candidates = new Set();

        const pushCandidate = (value) => {
            if (!value) return;
            const trimmed = value.trim();
            if (trimmed) candidates.add(trimmed);
        };

        // #hash 直接解析
        if (href.startsWith('#')) {
            const raw = href.slice(1);
            pushCandidate(raw);
            pushCandidate(safeDecodeURIComponent(raw));
            return Array.from(candidates);
        }

        // 完整 URL 或相對 URL 的解析
        try {
            const url = new URL(href, window.location.href);
            if (url.hash && url.hash.length > 1) {
                const hash = url.hash.slice(1);
                pushCandidate(hash);
                pushCandidate(safeDecodeURIComponent(hash));
            }
            const anchorParam = url.searchParams.get('anchor');
            if (anchorParam) {
                pushCandidate(anchorParam);
                pushCandidate(safeDecodeURIComponent(anchorParam));
            }
        } catch (e) {
            // 非標準 href（或特殊格式）時，以簡單 regex 嘗試擷取 anchor 參數
            const match = href.match(/[?&]anchor=([^&#]+)/i);
            if (match && match[1]) {
                pushCandidate(match[1]);
                pushCandidate(safeDecodeURIComponent(match[1]));
            }
        }

        return Array.from(candidates);
    }

    // 嘗試在原始 TOC 中找到對應連結
    // 優先以 href 的 anchor 候選比對，找不到再以文字內容比對。
    function findMatchingOriginalLink(floatingLink, originalToc) {
        if (!floatingLink || !originalToc) return null;

        const floatingHref = floatingLink.getAttribute('href') || '';
        const floatingCandidates = getAnchorCandidatesFromHref(floatingHref);
        const floatingText = normalizeTextContent(floatingLink.textContent);

        const originalLinks = originalToc.querySelectorAll('a[href]');
        if (!originalLinks.length) return null;

        if (floatingCandidates.length) {
            for (const orig of originalLinks) {
                const origHref = orig.getAttribute('href') || '';
                const origCandidates = getAnchorCandidatesFromHref(origHref);
                for (const candidate of origCandidates) {
                    if (floatingCandidates.includes(candidate)) return orig;
                }
            }
        }

        if (floatingText) {
            for (const orig of originalLinks) {
                const origText = normalizeTextContent(orig.textContent);
                if (origText && origText === floatingText) return orig;
            }
        }

        return null;
    }

    // 模擬使用者點擊，讓原生 SPA 的事件處理器接管導覽流程
    // 設計目標：避免直接改 hash 或 location，讓 Azure DevOps 自己處理 anchor 跳轉。
    function simulateNativeClick(target) {
        if (!target || !target.isConnected) return;
        try {
            const event = new MouseEvent('click', {
                bubbles: true,
                cancelable: true,
                view: window
            });
            target.dispatchEvent(event);
            // 若 SPA 沒有在 click handler 攔截，仍可用原生 click 作為保險
            if (typeof target.click === 'function') target.click();
        } catch (e) {
            // 發生例外時，仍嘗試用原生 click 降低失敗機率
            if (typeof target.click === 'function') target.click();
        }
    }

    // 將浮動 TOC 的連結點擊代理到原始 TOC
    // 設計目標：讓浮動 TOC 的點擊流程與原始 TOC 完全一致（特別是 SPA 的 anchor= 行為）。
    function attachFloatingLinkProxy(floating, originalToc) {
        if (!floating || floating._linkProxyAttached) return;
        floating._linkProxyAttached = true;

        floating.addEventListener('click', (ev) => {
            const link = ev.target && ev.target.closest ? ev.target.closest('a') : null;
            if (!link || !floating.contains(link)) return;

            const original = (floating._original || originalToc);
            const originalLink = findMatchingOriginalLink(link, original);
            if (!originalLink) return;

            // 阻止浮動 TOC 的預設行為，避免直接改 hash 或導致不一致的 SPA 導覽
            ev.preventDefault();
            ev.stopPropagation();

            simulateNativeClick(originalLink);
        }, true);
    }

    /*
     * 動態主題支援：
     * - 使用 getThemeVars(isLight) 取得在淺/深主題下所需的樣式變數。
     * - 使用 buildCss(themeVars) 以這些變數產生最終要注入的 CSS 字串。
     * 這樣設計可以在切換主題時只重新產生並替換 style.textContent 即可。
     */
    function getThemeVars(useLight) {
        return useLight ? {
            containerBg: '#ffffff',
            capsuleGradient: 'radial-gradient(circle at 0 0, #3a7bff, #ffffff)',
            textColor: '#0f172a',
            capsuleColor: '#0f172a',
            cardGradient: 'linear-gradient(#ffffff, #f8fafc)',
            boxShadow: '0 6px 24px rgba(2,6,23,0.08)',
            headerColor: '#0f172a',
            linkColor: '#1f2937',
            linkHoverBg: 'rgba(100,116,139,0.08)',
            linkHoverTextColor: '#0f172a',
            bulletColor: '#2563eb',
            bulletShadow: '0 0 0 3px rgba(37,99,235,0.08)',
            childBulletColor: '#0ea5a4',
            childBulletShadow: '0 0 0 2px rgba(14,165,164,0.08)',
            focusOutline: '#4f46e5',
            toggleBg: 'rgba(0,0,0,0.04)',
            toggleBorder: 'rgba(0,0,0,0.06)',
            toggleTextColor: '#0f172a',
            toggleHover: 'rgba(0,0,0,0.06)'
        } : {
            containerBg: '#11141c',
            capsuleGradient: 'radial-gradient(circle at 0 0, #3a7bff, #11141c)',
            textColor: '#e3e3f0',
            capsuleColor: '#f5f5ff',
            cardGradient: 'radial-gradient(circle at top left, #232737 0, #11141c 40%, #05060a 100%)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.85)',
            headerColor: '#f4f4ff',
            linkColor: '#e0e3ff',
            linkHoverBg: 'rgba(74,110,255,0.22)',
            linkHoverTextColor: '#ffffff',
            bulletColor: '#3a7bff',
            bulletShadow: '0 0 0 3px rgba(58,123,255,0.25)',
            childBulletColor: '#6bdcff',
            childBulletShadow: '0 0 0 2px rgba(107,220,255,0.25)',
            focusOutline: '#9ad1ff',
            toggleBg: 'rgba(255,255,255,0.04)',
            toggleBorder: 'rgba(255,255,255,0.06)',
            toggleTextColor: '#dfe7ff',
            toggleHover: 'rgba(255,255,255,0.06)'
        };
    }

    function buildCss(themeVars) {
        return `
/*
	只支援 md 檔內是使用 [[_TOC_]] 的目錄！
*/

/* ==== TOC 浮動目錄（深色/淺色資訊卡版） ==== */

/* 固定在視窗右側：預設縮成一顆小膠囊 */
/*
  UI 說明：
  - 預設收合時以小膠囊顯示，避免遮擋主要內容。
  - 滑鼠 hover 時展開為側邊資訊卡，適合快速查看標題導覽。
  - 採用固定位置與高 z-index，確保在長文件與 SPA 中可見。
  - 使用 !important 以覆蓋原站台樣式；若未來要移除，可改用更具體 selector 或加入配置選項。
*/
.${FLOATING_TOC_CLASS} {
  position: fixed !important;
  top: 120px !important;
  right: 24px !important;
  width: 46px !important;
  min-width: 46px !important;
  height: 46px !important;
  background: ${themeVars.containerBg} !important;              /* 比內容底色再深一階 */
  border-radius: 999px !important;
  cursor: pointer !important;
  overflow: hidden !important;
  z-index: 999999 !important;
  /* 取消所有動畫，避免 hover 時尺寸變化造成抖動 */
  transition: none !important;
  padding: 0 !important;
  box-shadow:
    0 0 0 1px rgba(120,120,140,0.65),
    ${themeVars.boxShadow} !important;   /* 與內容區拉開層級 */
  color: ${themeVars.textColor} !important;
}

/* 收合狀態：隱藏內容本體 */
.${FLOATING_TOC_CLASS} > * {
  display: none !important;
}

/* 收合時的 icon 膠囊 */
.${FLOATING_TOC_CLASS}::before {
  content: "📑" !important;
  font-size: 18px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 100% !important;
  height: 100% !important;
  background: ${themeVars.capsuleGradient} !important;
  color: ${themeVars.capsuleColor} !important;
}

/* 展開狀態：變成一張側邊資訊卡 */
.${FLOATING_TOC_CLASS}:hover {
  width: 260px !important;
  min-width: 260px !important;
  height: 80vh !important;
  max-height: 80vh !important;
  border-radius: 14px !important;
  padding: 14px 18px 14px 16px !important;
  background: ${themeVars.cardGradient} !important;
  box-shadow:
    0 0 0 1px rgba(100,110,150,0.85),
    ${themeVars.boxShadow} !important;
  overflow-y: auto !important;
}

/* 當不預設收合（no-collapse），直接顯示為側邊資訊卡 */
/*
  用途：當 EXPAND_FLOATING_BY_DEFAULT 設為 true 時，標記為 no-collapse，
  會直接以展開樣式呈現，並同時顯示內容與隱藏膠囊 icon。
  這樣的做法讓使用者在長文件中能快速存取目錄，
  同時保留 hover 收合的行為，便於在不同情境切換。
*/
.${FLOATING_TOC_CLASS}.no-collapse {
  width: 260px !important;
  min-width: 260px !important;
  height: 80vh !important;
  max-height: 80vh !important;
  border-radius: 14px !important;
  padding: 14px 18px 14px 16px !important;
  background: ${themeVars.cardGradient} !important;
  box-shadow:
    0 0 0 1px rgba(100,110,150,0.85),
    ${themeVars.boxShadow} !important;
  overflow-y: auto !important;
}

/* 顯示內容與隱藏膠囊 icon */
.${FLOATING_TOC_CLASS}.no-collapse > * {
  display: block !important;
}
.${FLOATING_TOC_CLASS}.no-collapse::before {
  display: none !important;
}

/* 展開時顯示內容 */
.${FLOATING_TOC_CLASS}:hover > * {
  display: block !important;
}

/* 展開時隱藏膠囊 icon */
.${FLOATING_TOC_CLASS}:hover::before {
  display: none !important;
}

/* ==== TOC 內部排版樣式 ==== */

/* 標題區塊 */
.${FLOATING_TOC_CLASS} h1,
.${FLOATING_TOC_CLASS} h2,
.${FLOATING_TOC_CLASS} h3 {
  margin: 0 0 8px 0 !important;
  font-size: 13px !important;
  font-weight: 600 !important;
  color: ${themeVars.headerColor} !important;
}

/* "Contents" 標題下劃線 */
.${FLOATING_TOC_CLASS} h1:first-child,
.${FLOATING_TOC_CLASS} h2:first-child,
.${FLOATING_TOC_CLASS} h3:first-child {
  padding-bottom: 6px !important;
  border-bottom: 1px solid rgba(130,140,180,0.45) !important;
  margin-bottom: 10px !important;
}

/* 列表本體 */
.${FLOATING_TOC_CLASS} ul {
  list-style: none !important;
  padding-left: 0 !important;
  margin: 0 !important;
}

/* 每一列 item */
.${FLOATING_TOC_CLASS} li {
  margin: 3px 0 !important;
  line-height: 1.4 !important;
  position: relative !important;
  padding-left: 12px !important;
}

/* 自訂 bullet */
.${FLOATING_TOC_CLASS} li::before {
  content: "" !important;
  position: absolute !important;
  left: 0 !important;
  top: 0.7em !important;
  width: 6px !important;
  height: 6px !important;
  border-radius: 999px !important;
  background: ${themeVars.bulletColor} !important;
  box-shadow: ${themeVars.bulletShadow} !important;
}

/* 子層級縮排 */
.${FLOATING_TOC_CLASS} ul ul li {
  padding-left: 18px !important;
  font-size: 12px !important;
  opacity: 0.9 !important;
}
.${FLOATING_TOC_CLASS} ul ul li::before {
  left: 4px !important;
  background: ${themeVars.childBulletColor} !important;
  box-shadow: ${themeVars.childBulletShadow} !important;
}

/* 連結樣式 */
.${FLOATING_TOC_CLASS} a {
  color: ${themeVars.linkColor} !important;
  text-decoration: none !important;
  display: inline-block !important;
  padding: 2px 4px 2px 0 !important;
  border-radius: 4px !important;
  max-width: 100% !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

/* hover / active */
.${FLOATING_TOC_CLASS} a:hover {
  color: ${themeVars.linkHoverTextColor} !important;
  background: ${themeVars.linkHoverBg} !important;
}

/* 鍵盤 focus */
.${FLOATING_TOC_CLASS} a:focus-visible {
  outline: 1px solid ${themeVars.focusOutline} !important;
  outline-offset: 1px !important;
}

/* 按鈕：切換是否顯示原本 inline 的 TOC（會記住偏好） */
.toc-toggle-original {
  position: absolute !important;
  top: 8px !important;
  right: 8px !important;
  width: 28px !important;
  height: 28px !important;
  border-radius: 6px !important;
  background: ${themeVars.toggleBg} !important;
  border: 1px solid ${themeVars.toggleBorder} !important;
  color: ${themeVars.toggleTextColor} !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-size: 12px !important;
  cursor: pointer !important;
}
.toc-toggle-original:hover {
  background: ${themeVars.toggleHover} !important;
}

/* 主題切換按鈕（放在 .toc-toggle-original 的左側） */
.toc-theme-toggle {
  position: absolute !important;
  top: 8px !important;
  right: 40px !important;
  width: 28px !important;
  height: 28px !important;
  border-radius: 6px !important;
  background: ${themeVars.toggleBg} !important;
  border: 1px solid ${themeVars.toggleBorder} !important;
  color: ${themeVars.toggleTextColor} !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-size: 12px !important;
  cursor: pointer !important;
}
.toc-theme-toggle:hover {
  background: ${themeVars.toggleHover} !important;
}

/* 隱藏浮動版（當使用 inline clone 時會用到） */
.floating-hidden {
  display: none !important;
}

/* 原始 TOC 隱藏 class（當使用者選擇隱藏原始 TOC） */
.azdo-original-hidden {
  display: none !important;
}

/* inline clone 的基本樣式（移除浮動樣式並稍微調整 margin） */
.azdo-clone-inline-toc {
  position: static !important;
  width: auto !important;
  min-width: 0 !important;
  height: auto !important;
  border-radius: 6px !important;
  background: transparent !important;
  box-shadow: none !important;
  color: inherit !important;
  margin-bottom: 12px !important;
}
        `;
    }
    const style = document.createElement('style');
    style.id = STYLE_ID;
    // 初始套用預設主題（之後會用儲存偏好覆蓋）
    style.textContent = buildCss(getThemeVars(DEFAULT_USE_LIGHT_MODE));
    (document.head || document.documentElement).appendChild(style);

    // 設定儲存鍵（用於 GM_getValue / GM_setValue）
    // `azdo_toc_show_original`：是否顯示原本的 TOC（預設 true）
    const STORAGE_KEY_SHOW_ORIGINAL = 'azdo_toc_show_original';
    // 舊的 key（相容舊使用者設定）
    const STORAGE_KEY_SHOW_INLINE = 'azdo_toc_show_inline';

    // 儲存主題偏好：true 表示使用淺色主題
    const STORAGE_KEY_USE_LIGHT_THEME = 'azdo_toc_use_light_theme';

    // 隱藏原始 TOC 的 class（用於 CSS）
    const ORIGINAL_HIDDEN_CLASS = 'azdo-original-hidden';
    // 標記原始 TOC 用的 class（非必要，但方便 debug）
    const ORIGINAL_MARK_CLASS = 'azdo-original-toc';

    // 目前主題狀態（預設讀取 DEFAULT_USE_LIGHT_MODE，初始化時會透過 applyStoredThemeSetting 來覆蓋）
    let IS_LIGHT_THEME = DEFAULT_USE_LIGHT_MODE;

    // 切換主題（並立即套用）
    function applyTheme(useLight) {
        IS_LIGHT_THEME = !!useLight;
        // 重新產生 css 並套用
        style.textContent = buildCss(getThemeVars(IS_LIGHT_THEME));
        // 更新所有現有的主題按鈕顯示
        document.querySelectorAll('.toc-theme-toggle').forEach(b => {
            b.textContent = IS_LIGHT_THEME ? '☀' : '🌙';
            b.setAttribute('title', IS_LIGHT_THEME ? '目前為淺色，點此切換為深色' : '目前為深色，點此切換為淺色');
        });
    }

    // 初始化：讀取儲存的主題偏好並套用
    function applyStoredThemeSetting() {
        const stored = getSetting(STORAGE_KEY_USE_LIGHT_THEME, DEFAULT_USE_LIGHT_MODE);
        applyTheme(stored);
    }

    // 切換並儲存主題偏好
    function toggleThemePreference(el) {
        const current = !!getSetting(STORAGE_KEY_USE_LIGHT_THEME, DEFAULT_USE_LIGHT_MODE);
        const next = !current;
        setSetting(STORAGE_KEY_USE_LIGHT_THEME, next);
        applyTheme(next);
    }
    // 跨環境安全的 getter / setter：在沒有 GM_*（例如直接在某些環境）時會回退到 localStorage
    function getSetting(key, defaultValue) {
        try {
            if (typeof GM_getValue === 'function') return GM_getValue(key, defaultValue);
            const v = localStorage.getItem(key);
            return v === null ? defaultValue : JSON.parse(v);
        } catch (e) {
            return defaultValue;
        }
    }
    function setSetting(key, value) {
        try {
            if (typeof GM_setValue === 'function') {
                GM_setValue(key, value);
            } else {
                localStorage.setItem(key, JSON.stringify(value));
            }
        } catch (e) {
            // 忽略儲存失敗，避免影響主要功能
        }
    }

    // 註冊 Tampermonkey 選單命令（僅在 GM_registerMenuCommand 可用時）
    function registerMenuCommands() {
        try {
            if (typeof GM_registerMenuCommand !== 'function') return;

            // 切換原始 TOC 顯示狀態
            GM_registerMenuCommand(
                getSetting(STORAGE_KEY_SHOW_ORIGINAL, getSetting(STORAGE_KEY_SHOW_INLINE, !HIDE_TOC_BY_DEFAULT)) ?
                '隱藏原始 TOC 目錄內容' : '顯示原始 TOC 目錄內容',
                () => { toggleOriginalPreference(); }
            );

            // 切換主題（淺色 / 深色）
            GM_registerMenuCommand(
                getSetting(STORAGE_KEY_USE_LIGHT_THEME, DEFAULT_USE_LIGHT_MODE) ?
                '切換為深色主題' : '切換為淺色主題',
                () => {
                    const next = !getSetting(STORAGE_KEY_USE_LIGHT_THEME, DEFAULT_USE_LIGHT_MODE);
                    setSetting(STORAGE_KEY_USE_LIGHT_THEME, next);
                    applyTheme(next);
                }
            );

            // 重置偏好（回復預設）
            GM_registerMenuCommand('重置偏好設定', () => {
                setSetting(STORAGE_KEY_SHOW_ORIGINAL, !HIDE_TOC_BY_DEFAULT);
                setSetting(STORAGE_KEY_USE_LIGHT_THEME, DEFAULT_USE_LIGHT_MODE);
                applyStoredOriginalSetting();
                applyStoredThemeSetting();
            });
        } catch (e) {
            // 若註冊失敗就跳過
        }
    }

    // 顯示原始 TOC（移除隱藏 class）
    function showOriginal(el) {
        if (!el) return;
        el.classList.remove(ORIGINAL_HIDDEN_CLASS);
    }

    // 隱藏原始 TOC（加上隱藏 class）
    function hideOriginal(el) {
        if (!el) return;
        el.classList.add(ORIGINAL_HIDDEN_CLASS);
    }

    // 切換並儲存「是否顯示原始 TOC」偏好
    function toggleOriginalPreference() {
        // 支援舊 key 的相容性：讀新 key，若不存在就讀舊 key
        const current = !!getSetting(STORAGE_KEY_SHOW_ORIGINAL,
            getSetting(STORAGE_KEY_SHOW_INLINE, true));
        const next = !current;
        setSetting(STORAGE_KEY_SHOW_ORIGINAL, next);
        // 更新所有原始 TOC
        document.querySelectorAll('.' + ORIGINAL_MARK_CLASS).forEach(orig => {
            if (next) showOriginal(orig); else hideOriginal(orig);
        });
        // 同步浮動 TOC 上的按鈕文字
        document.querySelectorAll('.' + FLOATING_TOC_CLASS).forEach(tc => {
            const b = tc.querySelector('.toc-toggle-original');
            if (b) b.textContent = next ? '隱' : '顯';
        });
    }

    // 初始化：根據儲存的偏好值，決定是否顯示原始 TOC
    function applyStoredOriginalSetting() {
        const shouldShowOriginal = !!getSetting(STORAGE_KEY_SHOW_ORIGINAL,
            getSetting(STORAGE_KEY_SHOW_INLINE, !HIDE_TOC_BY_DEFAULT));
        document.querySelectorAll('.' + ORIGINAL_MARK_CLASS).forEach(orig => {
            if (shouldShowOriginal) showOriginal(orig); else hideOriginal(orig);
        });
        // 更新浮動上按鈕文字
        document.querySelectorAll('.' + FLOATING_TOC_CLASS).forEach(tc => {
            const b = tc.querySelector('.toc-toggle-original');
            if (b) b.textContent = shouldShowOriginal ? '隱' : '顯';
        });
    }

    // 嘗試為 TOC 元素建立浮動複本，讓樣式能套用
    function markTOC(el) {
        // 防禦式檢查：確保傳入節點有效，且不會重覆處理已經處理過的元素。
        // 額外避免處理已經是浮動 TOC 的節點，避免 clone 被再度掃描造成重複生成。
        if (!el || el._floating || (el.classList && el.classList.contains(FLOATING_TOC_CLASS))) return;

        // 建立浮動複本（clone）並把按鈕加入到浮動複本上（不要改動原始 TOC DOM）
        // 重要：原始 TOC 保持原樣，只有浮動複本才套用浮動樣式
        if (!el._floating) {
            const floating = el.cloneNode(true);
            // 移除可能存在的舊按鈕，避免重複
            const oldBtn = floating.querySelector('.toc-toggle-original');
            if (oldBtn) oldBtn.remove();
            const oldThemeBtn = floating.querySelector('.toc-theme-toggle');
            if (oldThemeBtn) oldThemeBtn.remove();

            // 樣式為浮動容器
            // 注意：Azure DevOps 原始 TOC 容器可能使用 toc-container 作為基礎 class。
            // 為了避免浮動 clone 在再次掃描時被誤認為「原始 TOC」而產生遞迴複製，
            // 這裡先移除 toc-container，改由專屬的 FLOATING_TOC_CLASS 來標記與套用樣式。
            floating.classList.remove('toc-container');
            // 使用專屬 class，避免套用到 Azure DevOps 既有的 toc-container 結構。
            floating.classList.add(FLOATING_TOC_CLASS);
            floating.setAttribute(FLOATING_TOC_ATTR, '1');
            if (EXPAND_FLOATING_BY_DEFAULT) floating.classList.add('no-collapse');

            // 加入「顯示/隱藏原始 TOC」按鈕
            const btn = document.createElement('button');
            btn.className = 'toc-toggle-original';
            const shouldShowOrig = !!getSetting(STORAGE_KEY_SHOW_ORIGINAL, getSetting(STORAGE_KEY_SHOW_INLINE, !HIDE_TOC_BY_DEFAULT));
            btn.textContent = shouldShowOrig ? '隱' : '顯';
            btn.setAttribute('title', '切換是否顯示原始 TOC（會記住偏好）');
            btn.addEventListener('click', (ev) => {
                ev.stopPropagation();
                toggleOriginalPreference();
            }, { passive: true });
            floating.appendChild(btn);

            // 加入主題切換按鈕（僅建立一次，與 inline 顯示按鈕並排）
            const themeBtn = document.createElement('button');
            themeBtn.className = 'toc-theme-toggle';
            const currentIsLight = !!getSetting(STORAGE_KEY_USE_LIGHT_THEME, DEFAULT_USE_LIGHT_MODE);
            themeBtn.textContent = currentIsLight ? '☀' : '🌙';
            themeBtn.setAttribute('title', currentIsLight ? '目前為淺色，點此切換為深色' : '目前為深色，點此切換為淺色');
            themeBtn.addEventListener('click', (ev) => {
                ev.stopPropagation();
                toggleThemePreference();
            }, { passive: true });
            floating.appendChild(themeBtn);

            // 把浮動 Clone 放到 body（靠右固定）
            document.body.appendChild(floating);

            // 記錄引用並標記原始（原始TOC只加標記class，不加浮動樣式）
            el._floating = floating;
            floating._original = el;
            el.classList.add(ORIGINAL_MARK_CLASS);

            // 將浮動 TOC 的點擊代理到原始 TOC，確保 SPA 的 anchor 行為一致
            attachFloatingLinkProxy(floating, el);
        }

        // 可延伸功能想法：
        // - 若頁面同時有多個 TOC，可以加入切換按鈕或只顯示第一個；
        // - 若希望在展開時保持 focus，可在這裡加入 keyboard handlers。
    }

    function scanAndMark() {
        // 為了兼容不同站版與可能的 class/id 命名，列出多個常見的 selector。
        // 這些 selector 會盡量覆蓋 Azure DevOps 與其他 Markdown 轉換出來的 TOC 結構。
        // 特別加入 .toc-container 是因為 Azure DevOps 的 TOC 常見使用此 class，
        // 若未納入會導致找不到原始 TOC 而無法建立浮動 clone。
        const nodes = Array.from(document.querySelectorAll(TOC_ROOT_SELECTOR));
        // 若找不到根容器，才嘗試從內層清單回推（避免誤抓到浮動 clone 內部的清單）
        if (!nodes.length) {
            document.querySelectorAll(TOC_LIST_SELECTOR).forEach(list => {
                if (list.closest && list.closest('[' + FLOATING_TOC_ATTR + ']')) return;
                const root = list.closest(TOC_ROOT_SELECTOR) || list.parentElement;
                if (root) nodes.push(root);
            });
        }
        // 防止 MutationObserver 進入無窮迴圈：
        // 1) 排除浮動 TOC 容器及其子孫節點（避免 clone 內部被再度掃描）。
        // 2) 排除位於其他 TOC 容器內的巢狀節點（只處理最外層容器），
        //    避免把內層清單 (.toc-list 等) 誤當成一個新的 TOC 來源。
        const filtered = nodes.filter(node => {
            if (!node || (node.closest && node.closest('[' + FLOATING_TOC_ATTR + ']'))) return false;
            const parentMatch = node.parentElement && node.parentElement.closest(TOC_ROOT_SELECTOR);
            return !parentMatch;
        });
        // 將所有符合的節點都標記，避免遺漏或僅抓到第一個
        filtered.forEach(markTOC);
    }

    // 初次掃描一次，若頁面已經載入 TOC，會立即生效
    scanAndMark();

    // 根據儲存偏好初始化：原始 TOC 可見性、主題偏好
    // 這裡放在初次掃描之後，確保原始與浮動容器都已建立
    applyStoredOriginalSetting();
    applyStoredThemeSetting();

    // 註冊 Tampermonkey 選單（若可用）
    registerMenuCommands();

    // 若頁面為 SPA，TOC 可能會在稍後插入，因此註冊 MutationObserver
    // 為了避免無窮迴圈或高頻掃描，採用「只在偵測到可能的 TOC 節點」時才觸發掃描，
    // 並以簡單 debounce 限制掃描頻率。
    let scanTimer = 0;
    const requestScan = () => {
        if (scanTimer) return;
        scanTimer = window.setTimeout(() => {
            scanTimer = 0;
            scanAndMark();
            // 新插入的容器若要遵循偏好，立即套用
            applyStoredOriginalSetting();
            // 同步主題偏好（若新容器需要依偏好顯示淺色/深色）
            applyStoredThemeSetting();
        }, 120);
    };

    const isRelevantNode = (node) => {
        if (!node || node.nodeType !== 1) return false;
        const el = node;
        if (el.closest && el.closest('[' + FLOATING_TOC_ATTR + ']')) return false;
        if (el.matches && (el.matches(TOC_ROOT_SELECTOR) || el.matches(TOC_LIST_SELECTOR))) return true;
        return !!(el.querySelector && (el.querySelector(TOC_ROOT_SELECTOR) || el.querySelector(TOC_LIST_SELECTOR)));
    };

    const observer = new MutationObserver((mutations) => {
        // 只有在新增節點中出現「可能是 TOC 的容器」時才觸發掃描，
        // 避免因為頁面大量 DOM 更新而造成高負載或無窮迴圈。
        for (const mutation of mutations) {
            if (!mutation.addedNodes || !mutation.addedNodes.length) continue;
            for (const node of mutation.addedNodes) {
                if (isRelevantNode(node)) {
                    requestScan();
                    return;
                }
            }
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
})();
