// ==UserScript==
// @name         YouTube: Gemini 即時字幕翻譯助手
// @version      0.1.3
// @description  攔截 YouTube 英文字幕並使用 Gemini 即時翻譯為繁體中文，翻譯時自動帶入影片標題、描述與前 20 句字幕上下文
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/YouTubeSubtitleGeminiTranslator.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/YouTubeSubtitleGeminiTranslator.user.js
// @author       Will Huang
// @match        https://www.youtube.com/*
// @match        https://m.youtube.com/*
// @run-at       document-start
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @connect      generativelanguage.googleapis.com
// ==/UserScript==

(function () {
    'use strict';

    // 避免同一頁面因為 SPA 導頁或重複注入而安裝多次攔截器。
    // 這個旗標的設計意圖非常單純：只允許目前頁面生命週期內存在一組 fetch 攔截器，
    // 否則多層包裝後會導致同一份字幕被重複翻譯、重複送 API，最後不只浪費 quota，還會讓字幕變成疊疊樂。
    const INSTALL_FLAG = '__YT_GEMINI_SUBTITLE_TRANSLATOR_INSTALLED__';
    if (window[INSTALL_FLAG]) {
        return;
    }
    window[INSTALL_FLAG] = true;

    const API_KEY_STORAGE = 'YT_GEMINI_SUBTITLE_TRANSLATOR_API_KEY';
    const MODEL_STORAGE = 'YT_GEMINI_SUBTITLE_TRANSLATOR_MODEL';
    const ENABLED_STORAGE = 'YT_GEMINI_SUBTITLE_TRANSLATOR_ENABLED';
    const LOG_LEVEL_STORAGE = 'YT_GEMINI_SUBTITLE_TRANSLATOR_LOG_LEVEL';
    const SUBTITLE_CACHE_STORAGE = 'YT_GEMINI_SUBTITLE_TRANSLATOR_SUBTITLE_CACHE_V1';

    const DEFAULT_MODEL = 'gemini-3.1-flash-lite-preview';
    const DEFAULT_LOG_LEVEL = 'info';
    const GEMINI_API_ROOT = 'https://generativelanguage.googleapis.com/v1beta/models';
    const GEMINI_REQUEST_TIMEOUT = 25000;

    const TARGET_LANGUAGE = '繁體中文（台灣用語）';
    const EARLY_PHASE_DURATION_MS = 10 * 1000;
    const EARLY_PHASE_CONTEXT_LINES = 2;
    const MAX_CONTEXT_LINES = 20;
    const MAX_DESCRIPTION_LENGTH = 3000;
    const MAX_PROMPT_DESCRIPTION_LENGTH = 800;
    const MAX_BATCH_SHARED_CONTEXT_LINES = 6;
    const MAX_STORED_HISTORY_LINES = 200;
    const MAX_ITEMS_PER_TRANSLATION_CALL = 18;
    const MAX_REQUEST_CACHE_SIZE = 80;
    const MAX_PERSISTED_SUBTITLE_CACHE_ENTRIES = 1500;
    const DOM_CAPTION_TRANSLATION_DEBOUNCE_MS = 120;
    const DOM_CAPTION_TEXT_SELECTOR = '.ytp-caption-segment, .captions-text';
    const DOM_CAPTION_RELATED_SELECTOR = '.captions-text, .ytp-caption-segment, .caption-window, .ytp-caption-window-container';
    const DOM_PENDING_CAPTION_CLASS = 'yt-gemini-caption-pending';
    const DOM_PENDING_CAPTION_STYLE_ID = 'yt-gemini-caption-pending-style';
    const DOM_RENDERED_TEXT_DATASET_KEY = 'ytGeminiRenderedText';
    const DOM_NATIVE_CAPTION_HIDDEN_ROOT_CLASS = 'yt-gemini-native-caption-hidden';
    const DOM_TRANSLATION_OVERLAY_ID = 'yt-gemini-translation-overlay';
    const DOM_TRANSLATION_OVERLAY_HIDDEN_CLASS = 'yt-gemini-translation-overlay-hidden';
    // timedtext 相關視窗刻意拆成「眼前要立刻看到的字幕」與「背景先暖起來的字幕」兩段。
    // 新策略不是等 DOM 出現後才翻，而是在影片 metadata 一可用時就主動抓字幕軌，先把未來一大段預翻進快取。
    const TIMEDTEXT_INLINE_TRANSLATION_LOOKBACK_MS = 2 * 1000;
    const TIMEDTEXT_INLINE_TRANSLATION_WINDOW_MS = 12 * 1000;
    const TIMEDTEXT_URGENT_PREFETCH_WINDOW_MS = 20 * 1000;
    const TIMEDTEXT_PREFETCH_WINDOW_MS = 120 * 1000;
    const TIMEDTEXT_PREFETCH_INTERVAL_MS = 1000;
    const TIMEDTEXT_PREFETCH_MIN_AHEAD_MS = 60 * 1000;
    const VIDEO_BOOTSTRAP_INTERVAL_MS = 1000;
    const MAX_TIMEDTEXT_SOURCE_CACHE_SIZE = 6;
    const MAX_TIMEDTEXT_PREFETCH_STATE_CACHE_SIZE = 6;
    const MAX_TIMEDTEXT_SOURCE_FETCH_TASK_CACHE_SIZE = 6;

    const LOG_LEVELS = Object.freeze({
        silent: 0,
        error: 1,
        warn: 2,
        info: 3,
        debug: 4,
    });

    const LOG_PREFIX = '[YouTube Gemini 字幕翻譯]';
    const nativeFetch = typeof window.fetch === 'function' ? window.fetch.bind(window) : null;

    let apiKey = getStoredValue(API_KEY_STORAGE, '');
    let selectedModel = getStoredValue(MODEL_STORAGE, DEFAULT_MODEL) || DEFAULT_MODEL;
    let translationEnabled = getStoredValue(ENABLED_STORAGE, true);
    let logLevel = normalizeLogLevel(getStoredValue(LOG_LEVEL_STORAGE, DEFAULT_LOG_LEVEL));
    let warnedMissingApiKey = false;

    // requestCache：避免同一個 timedtext URL 在短時間內被重複翻譯。
    // resolvedRequestCache：保留已完成結果，讓相同字幕重播、拖曳時間軸或切回原段落時可以直接命中。
    const requestCache = new Map();
    const resolvedRequestCache = new Map();

    // 每支影片都維護自己的字幕歷史，這樣不同影片的上下文不會互相污染。
    const subtitleHistoryByVideoId = new Map();
    const videoContextCache = new Map();
    const timedtextSourceByVideoId = new Map();
    const timedtextPrefetchStateByVideoId = new Map();
    const timedtextSourceFetchTaskByVideoId = new Map();

    // 這個持久字幕快取會存進 Tampermonkey 的儲存空間，因此在「重新整理頁面」之後仍然存在。
    // 設計意圖是讓同一支影片、同一段英文字幕在第二次看到時可以直接命中，
    // 優先回傳已翻過的結果，而不是每次都重新去敲 Gemini，避免前幾秒字幕再次空窗。
    const persistedSubtitleCache = loadPersistedSubtitleCache();

    // Gemini usageMetadata 只會出現在真正命中 API 的情況，
    // 因此這份統計刻意不把快取命中算進去，避免誤導你以為快取也消耗了模型 Tokens。
    const usageStats = {
        requests: 0,
        totalTokens: 0,
        promptTokens: 0,
        candidateTokens: 0,
    };

    // 這裡保留兩條明確分工的 Gemini 隊列：
    // 1. translationQueue：處理近端、會直接影響目前畫面體感的字幕工作。
    // 2. prefetchQueue：處理背景暖機，讓 DOM 後備翻譯之後盡量只吃快取。
    // 兩條隊列分開的意圖不是追求最大吞吐，而是避免背景預翻把眼前字幕完全堵住。
    let translationQueue = Promise.resolve();
    let prefetchQueue = Promise.resolve();
    let domCaptionObserver = null;
    let domCaptionDebounceTimer = 0;
    let domCaptionProcessingTask = Promise.resolve();
    let timedtextPrefetchTimer = 0;
    let videoBootstrapTimer = 0;
    let lastBootstrappedVideoId = '';

    registerMenuCommands();
    installCaptionPendingStyle();
    updateCaptionPresentationMode();
    installTimedtextFetchInterceptor();
    installTimedtextXhrObserver();
    installTimedtextPrefetchScheduler();
    installVideoBootstrapScheduler();
    installDomCaptionFallbackObserver();
    log('debug', `腳本已初始化，LogLevel=${logLevel.toUpperCase()}，持久字幕快取筆數=${persistedSubtitleCache.size}。`);

    function normalizeLogLevel(level) {
        const normalized = String(level || '').trim().toLowerCase();
        return Object.prototype.hasOwnProperty.call(LOG_LEVELS, normalized) ? normalized : DEFAULT_LOG_LEVEL;
    }

    function shouldLog(level) {
        const normalizedLevel = normalizeLogLevel(level);
        return LOG_LEVELS[normalizedLevel] <= LOG_LEVELS[logLevel];
    }

    function log(level, ...args) {
        if (!shouldLog(level)) {
            return;
        }

        const method = level === 'error'
            ? 'error'
            : level === 'warn'
                ? 'warn'
                : level === 'debug'
                    ? 'debug'
                    : 'log';

        console[method](LOG_PREFIX, ...args);
    }

    function getStoredValue(key, defaultValue) {
        if (typeof GM_getValue === 'function') {
            return GM_getValue(key, defaultValue);
        }

        return defaultValue;
    }

    function setStoredValue(key, value) {
        if (typeof GM_setValue === 'function') {
            GM_setValue(key, value);
        }
    }

    function registerMenuCommands() {
        if (typeof GM_registerMenuCommand !== 'function') {
            return;
        }

        GM_registerMenuCommand('⚙️ 設定 Gemini API Key', configureApiKey);
        GM_registerMenuCommand('🤖 設定 Gemini 模型', configureModel);
        GM_registerMenuCommand(`🪵 設定 LogLevel（目前：${logLevel.toUpperCase()}）`, configureLogLevel);
        GM_registerMenuCommand(translationEnabled ? '🛑 停用 YouTube 字幕即時翻譯' : '▶️ 啟用 YouTube 字幕即時翻譯', toggleTranslationEnabled);
        GM_registerMenuCommand('🧹 清除字幕翻譯快取', clearTranslationState);
    }

    function configureApiKey() {
        const currentValue = apiKey || '';
        const input = window.prompt('請輸入 Gemini API Key。\n\n此金鑰會安全地儲存在 Tampermonkey 的腳本儲存空間中。', currentValue);
        if (input === null) {
            return;
        }

        apiKey = input.trim();
        setStoredValue(API_KEY_STORAGE, apiKey);
        warnedMissingApiKey = false;
        clearTranslationState(false);

        window.alert(apiKey ? 'Gemini API Key 已儲存。' : '已清空 Gemini API Key。');
    }

    function configureModel() {
        const input = window.prompt('請輸入要使用的 Gemini 模型名稱。', selectedModel || DEFAULT_MODEL);
        if (input === null) {
            return;
        }

        const nextModel = input.trim() || DEFAULT_MODEL;
        selectedModel = nextModel;
        setStoredValue(MODEL_STORAGE, selectedModel);
        clearTranslationState(false);

        window.alert(`目前模型已設定為：${selectedModel}`);
    }

    function configureLogLevel() {
        const input = window.prompt('請輸入 LogLevel：silent / error / warn / info / debug', logLevel);
        if (input === null) {
            return;
        }

        const nextLogLevel = normalizeLogLevel(input);
        logLevel = nextLogLevel;
        setStoredValue(LOG_LEVEL_STORAGE, logLevel);

        window.alert(`目前 LogLevel 已設定為：${logLevel.toUpperCase()}`);
        log('debug', `已更新 LogLevel 為 ${logLevel.toUpperCase()}。`);
    }

    function toggleTranslationEnabled() {
        translationEnabled = !translationEnabled;
        setStoredValue(ENABLED_STORAGE, translationEnabled);
        clearTranslationState(false);

        window.alert(translationEnabled ? '已啟用 YouTube 字幕即時翻譯。\n後續新的字幕請求會自動套用翻譯。' : '已停用 YouTube 字幕即時翻譯。');
    }

    function clearTranslationState(showAlert = true) {
        requestCache.clear();
        resolvedRequestCache.clear();
        subtitleHistoryByVideoId.clear();
        videoContextCache.clear();
        timedtextSourceByVideoId.clear();
        timedtextPrefetchStateByVideoId.clear();
        timedtextSourceFetchTaskByVideoId.clear();
        persistedSubtitleCache.clear();
        persistSubtitleCache();
        resetUsageStats();
        lastBootstrappedVideoId = '';

        if (translationEnabled && apiKey) {
            updateCaptionPresentationMode();
            hideVisibleEnglishCaptionTargets();
            queueDomCaptionProcessing();
        } else {
            resetCaptionDisplayState();
            updateCaptionPresentationMode();
        }

        if (showAlert) {
            window.alert('已清除字幕翻譯快取與上下文狀態。');
        }
    }

    function resetUsageStats() {
        usageStats.requests = 0;
        usageStats.totalTokens = 0;
        usageStats.promptTokens = 0;
        usageStats.candidateTokens = 0;
    }

    function loadPersistedSubtitleCache() {
        const rawValue = getStoredValue(SUBTITLE_CACHE_STORAGE, '[]');

        try {
            const parsed = JSON.parse(rawValue);
            if (!Array.isArray(parsed)) {
                return new Map();
            }

            const cacheEntries = parsed.filter((entry) => {
                return Array.isArray(entry)
                    && typeof entry[0] === 'string'
                    && entry[1]
                    && typeof entry[1].translatedText === 'string';
            });

            return new Map(cacheEntries);
        } catch (error) {
            log('warn', '讀取持久字幕快取失敗，已改用空快取。', error);
            return new Map();
        }
    }

    function persistSubtitleCache() {
        setStoredValue(SUBTITLE_CACHE_STORAGE, JSON.stringify(Array.from(persistedSubtitleCache.entries())));
    }

    function trimPersistedSubtitleCache() {
        while (persistedSubtitleCache.size > MAX_PERSISTED_SUBTITLE_CACHE_ENTRIES) {
            const firstKey = persistedSubtitleCache.keys().next().value;
            persistedSubtitleCache.delete(firstKey);
        }
    }

    function buildSubtitleCacheKey(videoId, originalText) {
        const normalizedText = normalizeSubtitleText(originalText).replace(/\s+/g, ' ');
        return `${videoId}::${normalizedText}`;
    }

    function getCachedSubtitleTranslation(videoId, originalText) {
        const cacheKey = buildSubtitleCacheKey(videoId, originalText);
        const cachedEntry = persistedSubtitleCache.get(cacheKey);
        if (!cachedEntry || typeof cachedEntry.translatedText !== 'string') {
            return '';
        }

        // 命中時把項目移到 Map 末端，讓後續 trim 時更傾向淘汰久未使用的舊資料。
        persistedSubtitleCache.delete(cacheKey);
        persistedSubtitleCache.set(cacheKey, cachedEntry);
        return cachedEntry.translatedText;
    }

    function storeTranslationsInPersistentCache(videoId, batchEntries, translations) {
        let didChange = false;

        batchEntries.forEach((entry, index) => {
            const translatedText = translations[index];
            if (!translatedText) {
                return;
            }

            const cacheKey = entry.cacheKey || buildSubtitleCacheKey(videoId, entry.originalText);
            persistedSubtitleCache.delete(cacheKey);
            persistedSubtitleCache.set(cacheKey, {
                translatedText,
                updatedAt: Date.now(),
            });
            didChange = true;
        });

        if (!didChange) {
            return;
        }

        trimPersistedSubtitleCache();
        persistSubtitleCache();
    }

    function recordUsageStats(usageMetadata) {
        usageStats.requests += 1;
        usageStats.totalTokens += Number(usageMetadata?.totalTokenCount) || 0;
        usageStats.promptTokens += Number(usageMetadata?.promptTokenCount) || 0;
        usageStats.candidateTokens += Number(usageMetadata?.candidatesTokenCount) || 0;

        // info 層級故意只保留最精簡的營運指標，避免一般使用時把 Console 變成字幕內容瀑布。
        // 若要追更細的 token 拆分、usageMetadata 原始欄位或除錯上下文，請切到 debug。
        log('info', `Gemini 累積用量：Requests=${usageStats.requests}，Tokens=${usageStats.totalTokens}`);

        if (usageMetadata) {
            log('debug', `Gemini 累積明細：Prompt Tokens=${usageStats.promptTokens}，Candidate Tokens=${usageStats.candidateTokens}`);
            log('debug', '本次 usageMetadata：', usageMetadata);
        }
    }

    function installTimedtextFetchInterceptor() {
        if (typeof nativeFetch !== 'function') {
            log('warn', '目前環境沒有 window.fetch，無法安裝攔截器。');
            return;
        }

        window.fetch = async function (...args) {
            const response = await nativeFetch(...args);
            const requestUrl = extractRequestUrl(args[0]);

            if (!shouldInterceptTimedtextRequest(requestUrl)) {
                return response;
            }

            if (!apiKey) {
                if (!warnedMissingApiKey) {
                    warnedMissingApiKey = true;
                    log('warn', '尚未設定 Gemini API Key，已略過字幕翻譯。');
                }
                return response;
            }

            try {
                const translatedText = await getOrCreateTranslatedTimedtext(requestUrl, async () => {
                    const originalText = await response.clone().text();
                    return translateTimedtextPayload(requestUrl, originalText);
                });

                return createTranslatedResponse(response, translatedText);
            } catch (error) {
                log('error', '攔截 timedtext 後翻譯失敗，將回退原始字幕。', error);
                return response;
            }
        };
    }

    function installVideoBootstrapScheduler() {
        if (videoBootstrapTimer) {
            return;
        }

        videoBootstrapTimer = window.setInterval(() => {
            try {
                maybeBootstrapCurrentVideo('timer');
            } catch (error) {
                log('error', '影片字幕 bootstrap 排程失敗。', error);
            }
        }, VIDEO_BOOTSTRAP_INTERVAL_MS);

        maybeBootstrapCurrentVideo('init');
    }

    function maybeBootstrapCurrentVideo(reason = 'timer') {
        if (!translationEnabled || !apiKey) {
            return;
        }

        const videoId = getCurrentVideoId();
        if (!videoId) {
            return;
        }

        if (lastBootstrappedVideoId !== videoId) {
            lastBootstrappedVideoId = videoId;
            resetCaptionDisplayState();
            log('debug', `偵測到新影片，videoId=${videoId}，開始主動抓取字幕軌。`);
        }

        ensureTimedtextSourceForVideo(videoId, reason);
        maybeScheduleTimedtextPrefetch(`bootstrap-${reason}`, false, videoId);
    }

    function ensureTimedtextSourceForVideo(videoId, reason = 'bootstrap') {
        if (!videoId) {
            return Promise.resolve(null);
        }

        if (timedtextSourceByVideoId.has(videoId)) {
            return Promise.resolve(timedtextSourceByVideoId.get(videoId));
        }

        if (timedtextSourceFetchTaskByVideoId.has(videoId)) {
            return timedtextSourceFetchTaskByVideoId.get(videoId);
        }

        const captionTrack = selectEnglishCaptionTrack(videoId);
        if (!captionTrack?.baseUrl) {
            return Promise.resolve(null);
        }

        const requestUrl = buildBootstrapTimedtextRequestUrl(captionTrack.baseUrl);
        if (!requestUrl) {
            return Promise.resolve(null);
        }

        const task = fetchTimedtextSourceText(requestUrl, videoId, reason)
            .then((rawText) => {
                handleObservedTimedtextPayload(requestUrl, rawText, 'bootstrap');
                return timedtextSourceByVideoId.get(videoId) || null;
            })
            .catch((error) => {
                log('debug', `主動抓取 timedtext 失敗，videoId=${videoId}，reason=${reason}。`, error);
                return null;
            })
            .finally(() => {
                timedtextSourceFetchTaskByVideoId.delete(videoId);
            });

        timedtextSourceFetchTaskByVideoId.set(videoId, task);
        trimMapToSize(timedtextSourceFetchTaskByVideoId, MAX_TIMEDTEXT_SOURCE_FETCH_TASK_CACHE_SIZE);
        return task;
    }

    function selectEnglishCaptionTrack(videoId = '') {
        const playerResponse = window.ytInitialPlayerResponse;
        const responseVideoId = playerResponse?.videoDetails?.videoId || '';
        if (videoId && responseVideoId && responseVideoId !== videoId) {
            return null;
        }

        const captionTracks = playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
        if (!Array.isArray(captionTracks) || captionTracks.length === 0) {
            return null;
        }

        const englishTracks = captionTracks.filter((track) => {
            return Boolean(track?.baseUrl) && isEnglishLanguageCode(track?.languageCode || '');
        });

        if (englishTracks.length === 0) {
            return null;
        }

        // 先偏好非 ASR 的人工字幕；如果沒有，再退回英文 ASR。
        return englishTracks.find((track) => String(track?.kind || '').toLowerCase() !== 'asr') || englishTracks[0];
    }

    function buildBootstrapTimedtextRequestUrl(baseUrl) {
        try {
            const url = new URL(baseUrl, window.location.origin);
            url.searchParams.set('fmt', 'json3');
            url.searchParams.delete('tlang');
            return url.toString();
        } catch (error) {
            return '';
        }
    }

    async function fetchTimedtextSourceText(requestUrl, videoId, reason) {
        if (typeof nativeFetch !== 'function') {
            throw new Error('window.fetch not available');
        }

        const response = await nativeFetch(requestUrl, {
            credentials: 'same-origin',
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status} ${response.statusText}`);
        }

        const rawText = await response.text();
        if (!rawText) {
            throw new Error('timedtext response is empty');
        }

        log('debug', `已主動抓取 timedtext 原文，videoId=${videoId}，reason=${reason}。`);
        return rawText;
    }

    function installCaptionPendingStyle() {
        const injectStyle = () => {
            if (document.getElementById(DOM_PENDING_CAPTION_STYLE_ID)) {
                return;
            }

            const style = document.createElement('style');
            style.id = DOM_PENDING_CAPTION_STYLE_ID;
            style.textContent = `
                .${DOM_PENDING_CAPTION_CLASS} {
                    visibility: hidden !important;
                }

                .${DOM_NATIVE_CAPTION_HIDDEN_ROOT_CLASS} .captions-text,
                .${DOM_NATIVE_CAPTION_HIDDEN_ROOT_CLASS} .ytp-caption-segment,
                .${DOM_NATIVE_CAPTION_HIDDEN_ROOT_CLASS} .caption-window,
                .${DOM_NATIVE_CAPTION_HIDDEN_ROOT_CLASS} .ytp-caption-window-container {
                    color: transparent !important;
                    -webkit-text-fill-color: transparent !important;
                    text-shadow: none !important;
                    background: transparent !important;
                    border-color: transparent !important;
                    box-shadow: none !important;
                }

                #${DOM_TRANSLATION_OVERLAY_ID} {
                    position: fixed;
                    left: 50%;
                    bottom: 10vh;
                    transform: translateX(-50%);
                    z-index: 2147483647;
                    pointer-events: none;
                    max-width: min(80vw, 1100px);
                    width: fit-content;
                    text-align: center;
                    white-space: pre-wrap;
                    color: #ffffff;
                    font-size: clamp(22px, 2.1vw, 36px);
                    line-height: 1.35;
                    font-family: "YouTube Noto", Roboto, Arial, Helvetica, Verdana, "PT Sans Caption", sans-serif;
                    text-shadow: 0 2px 10px rgba(0, 0, 0, 0.85);
                }

                #${DOM_TRANSLATION_OVERLAY_ID}.${DOM_TRANSLATION_OVERLAY_HIDDEN_CLASS} {
                    display: none !important;
                }

                #${DOM_TRANSLATION_OVERLAY_ID} .yt-gemini-translation-line {
                    display: block;
                    margin-top: 0.18em;
                    padding: 0.06em 0.38em;
                    border-radius: 0.24em;
                    background: rgba(8, 8, 8, 0.75);
                }
            `;

            const parent = document.head || document.documentElement;
            if (!parent) {
                return;
            }

            parent.appendChild(style);
        };

        if (document.head || document.documentElement) {
            injectStyle();
            return;
        }

        document.addEventListener('DOMContentLoaded', injectStyle, { once: true });
    }

    function updateCaptionPresentationMode() {
        const root = document.documentElement;
        if (!root) {
            return;
        }

        if (translationEnabled && apiKey) {
            root.classList.add(DOM_NATIVE_CAPTION_HIDDEN_ROOT_CLASS);
            ensureTranslationOverlay();
            return;
        }

        root.classList.remove(DOM_NATIVE_CAPTION_HIDDEN_ROOT_CLASS);
        renderTranslationOverlay([]);
    }

    function ensureTranslationOverlay() {
        let overlay = document.getElementById(DOM_TRANSLATION_OVERLAY_ID);
        if (overlay) {
            return overlay;
        }

        overlay = document.createElement('div');
        overlay.id = DOM_TRANSLATION_OVERLAY_ID;
        overlay.className = DOM_TRANSLATION_OVERLAY_HIDDEN_CLASS;
        overlay.setAttribute('aria-live', 'polite');
        overlay.setAttribute('aria-atomic', 'true');

        const parent = document.body || document.documentElement;
        if (!parent) {
            return null;
        }

        parent.appendChild(overlay);
        return overlay;
    }

    function renderTranslationOverlay(lines) {
        const overlay = ensureTranslationOverlay();
        if (!overlay) {
            return;
        }

        const normalizedLines = Array.from(new Set((lines || [])
            .map((line) => normalizeSubtitleText(line))
            .filter(Boolean)));

        if (normalizedLines.length === 0) {
            overlay.innerHTML = '';
            overlay.classList.add(DOM_TRANSLATION_OVERLAY_HIDDEN_CLASS);
            return;
        }

        overlay.innerHTML = normalizedLines
            .map((line) => `<span class="yt-gemini-translation-line">${escapeHtml(line)}</span>`)
            .join('');
        overlay.classList.remove(DOM_TRANSLATION_OVERLAY_HIDDEN_CLASS);
    }

    function escapeHtml(text) {
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function installTimedtextXhrObserver() {
        const xhrPrototype = window.XMLHttpRequest?.prototype;
        if (!xhrPrototype) {
            log('warn', '目前環境沒有 XMLHttpRequest，無法觀察 timedtext XHR。');
            return;
        }

        const originalOpen = xhrPrototype.open;
        const originalSend = xhrPrototype.send;
        if (typeof originalOpen !== 'function' || typeof originalSend !== 'function') {
            log('warn', 'XMLHttpRequest 介面不完整，無法觀察 timedtext XHR。');
            return;
        }

        if (originalSend.__YT_GEMINI_TIMEDTEXT_XHR_OBSERVER__) {
            return;
        }

        xhrPrototype.open = function (method, url, ...rest) {
            this.__ytGeminiTimedtextRequestUrl = extractRequestUrl(url);
            this.__ytGeminiTimedtextObserved = false;
            return originalOpen.call(this, method, url, ...rest);
        };

        xhrPrototype.send = function (...args) {
            const requestUrl = this.__ytGeminiTimedtextRequestUrl || '';
            if (shouldInterceptTimedtextRequest(requestUrl) && !this.__ytGeminiTimedtextObserved) {
                this.__ytGeminiTimedtextObserved = true;
                this.addEventListener('loadend', () => {
                    observeTimedtextXhrResponse(this, requestUrl);
                }, { once: true });
            }

            return originalSend.apply(this, args);
        };

        xhrPrototype.send.__YT_GEMINI_TIMEDTEXT_XHR_OBSERVER__ = true;
        log('debug', '已安裝 timedtext XHR 觀察器。');
    }

    function observeTimedtextXhrResponse(xhr, requestUrl) {
        if (!shouldInterceptTimedtextRequest(requestUrl)) {
            return;
        }

        if (xhr.readyState !== XMLHttpRequest.DONE) {
            return;
        }

        if (xhr.status < 200 || xhr.status >= 300) {
            log('debug', `timedtext XHR 回應狀態非 2xx，status=${xhr.status}，略過預翻。`);
            return;
        }

        if (xhr.responseType && xhr.responseType !== '' && xhr.responseType !== 'text') {
            log('debug', `timedtext XHR responseType=${xhr.responseType}，略過預翻。`);
            return;
        }

        const rawText = typeof xhr.responseText === 'string' ? xhr.responseText : '';
        if (!rawText) {
            log('debug', 'timedtext XHR 回應為空字串，略過預翻。');
            return;
        }

        handleObservedTimedtextPayload(requestUrl, rawText, 'xhr');
    }

    function installTimedtextPrefetchScheduler() {
        if (timedtextPrefetchTimer) {
            return;
        }

        timedtextPrefetchTimer = window.setInterval(() => {
            try {
                maybeScheduleTimedtextPrefetch('timer');
            } catch (error) {
                log('error', 'timedtext 預翻排程失敗。', error);
            }
        }, TIMEDTEXT_PREFETCH_INTERVAL_MS);
    }

    function handleObservedTimedtextPayload(requestUrl, rawText, source) {
        const data = parseTimedtextPayload(rawText, false);
        if (!data || !Array.isArray(data.events) || data.events.length === 0) {
            return;
        }

        const videoId = getCurrentVideoId() || getVideoIdFromTimedtextUrl(requestUrl) || 'unknown-video';
        timedtextSourceByVideoId.set(videoId, {
            requestUrl,
            events: data.events,
            observedAt: Date.now(),
            source,
        });
        trimMapToSize(timedtextSourceByVideoId, MAX_TIMEDTEXT_SOURCE_CACHE_SIZE);

        // 這裡只把來源字幕軌當成「可信的原文資料」，後續再用它暖快取；
        // 我們刻意不去偽造 XHR 回應物件，避免碰觸 YouTube 播放器自己的傳輸邏輯。
        log('debug', `已觀察到 ${source.toUpperCase()} timedtext，videoId=${videoId}，events=${data.events.length}。`);
        maybeScheduleTimedtextPrefetch(`${source}-observed`, true, videoId);
    }

    function maybeScheduleTimedtextPrefetch(reason = 'timer', force = false, explicitVideoId = '') {
        if (!translationEnabled || !apiKey) {
            return;
        }

        const videoId = explicitVideoId || getCurrentVideoId();
        if (!videoId) {
            return;
        }

        const source = timedtextSourceByVideoId.get(videoId);
        if (!source || !Array.isArray(source.events) || source.events.length === 0) {
            return;
        }

        const state = getOrCreateTimedtextPrefetchState(videoId);
        if (state.inFlight) {
            return;
        }

        const currentPlaybackMs = getCurrentPlaybackMs();
        const bufferedAheadMs = Math.max(0, state.prefetchedUntilMs - currentPlaybackMs);
        if (!force && bufferedAheadMs >= TIMEDTEXT_PREFETCH_MIN_AHEAD_MS) {
            return;
        }

        const baselineStartMs = force
            ? Math.max(0, currentPlaybackMs - TIMEDTEXT_INLINE_TRANSLATION_LOOKBACK_MS)
            : currentPlaybackMs + TIMEDTEXT_INLINE_TRANSLATION_WINDOW_MS;
        const rangeStartMs = Math.max(state.prefetchedUntilMs, baselineStartMs);
        const rangeEndMs = currentPlaybackMs + (force ? TIMEDTEXT_URGENT_PREFETCH_WINDOW_MS : TIMEDTEXT_PREFETCH_WINDOW_MS);
        if (rangeEndMs <= rangeStartMs) {
            return;
        }

        state.inFlight = true;
        log('debug', `安排 timedtext 預翻，videoId=${videoId}，reason=${reason}，window=${rangeStartMs}-${rangeEndMs}。`);

        enqueuePrefetchTask(async () => {
            const videoContext = getVideoContext(videoId);
            const history = getOrCreateSubtitleHistory(videoId);
            const translationEntries = buildTimedtextTranslationEntriesInRange(source.events, history, videoId, {
                minStartMs: rangeStartMs,
                maxStartMs: rangeEndMs,
            });

            if (translationEntries.length === 0) {
                state.prefetchedUntilMs = Math.max(state.prefetchedUntilMs, rangeEndMs);
                log('debug', `timedtext 預翻視窗內無需翻譯的字幕，videoId=${videoId}。`);
                return;
            }

            await translateEntriesForVideo(videoId, videoContext, history, translationEntries, {
                appendHistory: false,
            });

            state.prefetchedUntilMs = Math.max(state.prefetchedUntilMs, rangeEndMs);
            log('debug', `timedtext 預翻完成，videoId=${videoId}，entries=${translationEntries.length}，prefetchedUntilMs=${state.prefetchedUntilMs}。`);
        }).catch((error) => {
            log('error', `timedtext 預翻失敗，videoId=${videoId}。`, error);
        }).finally(() => {
            state.inFlight = false;

            if (getCurrentVideoId() === videoId) {
                queueDomCaptionProcessing();
            }
        });
    }

    function getOrCreateTimedtextPrefetchState(videoId) {
        if (!timedtextPrefetchStateByVideoId.has(videoId)) {
            timedtextPrefetchStateByVideoId.set(videoId, {
                prefetchedUntilMs: 0,
                inFlight: false,
            });
            trimMapToSize(timedtextPrefetchStateByVideoId, MAX_TIMEDTEXT_PREFETCH_STATE_CACHE_SIZE);
        }

        return timedtextPrefetchStateByVideoId.get(videoId);
    }

    function installDomCaptionFallbackObserver() {
        if (typeof MutationObserver !== 'function') {
            log('warn', '目前環境沒有 MutationObserver，無法安裝字幕 DOM 後備翻譯。');
            return;
        }

        const startObserving = () => {
            if (domCaptionObserver) {
                return;
            }

            const rootNode = document.documentElement || document.body;
            if (!rootNode) {
                window.setTimeout(startObserving, 50);
                return;
            }

            // 有些 YouTube 環境的字幕不是走 fetch timedtext，而是先進播放器內部資料流再渲染到 DOM。
            // 因此這裡額外監看字幕節點，當畫面上真的出現英文字幕時，就把同一套 Gemini 翻譯流程套上去。
            // 這個後備機制的設計意圖不是取代 timedtext 攔截，而是補齊「某些環境攔不到網路層」的缺口。
            domCaptionObserver = new MutationObserver((mutations) => {
                if (!translationEnabled) {
                    return;
                }

                if (!containsCaptionMutation(mutations)) {
                    return;
                }

                hideVisibleEnglishCaptionTargets();
                queueDomCaptionProcessing();
            });

            domCaptionObserver.observe(rootNode, {
                childList: true,
                subtree: true,
                characterData: true,
            });

            hideVisibleEnglishCaptionTargets();
            queueDomCaptionProcessing();
            log('debug', '已安裝字幕 DOM 後備翻譯觀察器。');
        };

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', startObserving, { once: true });
        }

        startObserving();
    }

    function containsCaptionMutation(mutations) {
        return mutations.some((mutation) => {
            if (isCaptionRelatedNode(mutation.target)) {
                return true;
            }

            return Array.from(mutation.addedNodes || []).some((node) => isCaptionRelatedNode(node));
        });
    }

    function isCaptionRelatedNode(node) {
        if (!node) {
            return false;
        }

        const element = node.nodeType === Node.TEXT_NODE ? node.parentElement : node;
        if (!(element instanceof Element)) {
            return false;
        }

        return Boolean(element.closest(DOM_CAPTION_RELATED_SELECTOR));
    }

    function queueDomCaptionProcessing() {
        window.clearTimeout(domCaptionDebounceTimer);
        domCaptionDebounceTimer = window.setTimeout(() => {
            domCaptionProcessingTask = domCaptionProcessingTask
                .then(processVisibleCaptionNodes, processVisibleCaptionNodes)
                .catch((error) => {
                    log('error', '字幕 DOM 後備翻譯失敗。', error);
                });
        }, DOM_CAPTION_TRANSLATION_DEBOUNCE_MS);
    }

    async function processVisibleCaptionNodes() {
        if (!translationEnabled) {
            updateCaptionPresentationMode();
            renderTranslationOverlay([]);
            return;
        }

        if (!apiKey) {
            if (!warnedMissingApiKey) {
                warnedMissingApiKey = true;
                log('warn', '尚未設定 Gemini API Key，已略過字幕翻譯。');
            }
            updateCaptionPresentationMode();
            renderTranslationOverlay([]);
            return;
        }

        updateCaptionPresentationMode();
        const captionTargets = collectVisibleCaptionTargets();
        if (captionTargets.length === 0) {
            renderTranslationOverlay([]);
            return;
        }

        markCaptionTargetsPending(captionTargets);

        const videoId = getCurrentVideoId() || 'unknown-video';
        const videoContext = getVideoContext(videoId);
        const history = getOrCreateSubtitleHistory(videoId);
        const translationEntries = buildDomTranslationEntries(captionTargets, history, videoId);

        if (translationEntries.length === 0) {
            renderTranslationOverlay([]);
            return;
        }

        if (timedtextSourceByVideoId.has(videoId)) {
            // 一旦已掌握 timedtext 原文來源，DOM 層就退化成「只讀目前顯示的是哪幾行」。
            // 這樣可避免 DOM fallback 與背景預翻同時重複敲 Gemini，造成速度慢與請求暴增。
            const cachedTranslations = translationEntries
                .map((entry) => entry.cachedTranslation || '')
                .filter(Boolean);
            renderTranslationOverlay(cachedTranslations);

            if (cachedTranslations.length < translationEntries.length) {
                maybeScheduleTimedtextPrefetch('dom-cache-miss', true, videoId);
            }

            return;
        }

        const translations = await translateEntriesForVideo(videoId, videoContext, history, translationEntries);
        applyTranslationsToDomTargets(translationEntries, translations);
    }

    function collectVisibleCaptionTargets() {
        return Array.from(document.querySelectorAll(DOM_CAPTION_TEXT_SELECTOR))
            .filter((element) => element instanceof HTMLElement)
            .filter((element) => isCaptionElementVisible(element))
            .filter((element) => {
                // YouTube 新版播放器常把即時字幕拆成多個 `.ytp-caption-segment` 葉節點，
                // 外層 `.captions-text` 則只是容器。若直接覆寫容器文字，YouTube 下一次追加 segment 時
                // 會把新的英文節點疊在舊的中文文字節點後面，形成「中英混雜」的殘影。
                // 因此只要容器內已經有 segment，就只翻譯葉節點；只有舊版結構沒有 segment 時才退回容器。
                if (element.matches('.captions-text') && element.querySelector('.ytp-caption-segment')) {
                    return false;
                }

                return true;
            })
            .map((element) => ({
                element,
                originalText: normalizeSubtitleText(element.textContent || ''),
            }))
            .filter((target) => Boolean(target.originalText));
    }

    function isCaptionElementVisible(element) {
        if (!(element instanceof HTMLElement) || !element.isConnected) {
            return false;
        }

        // pending 狀態的字幕是被我們主動藏起來的，並不代表它不該被後續翻譯流程拾取。
        // 若把這類節點視為「不可見」直接略過，就會出現字幕被藏起來後永遠沒人翻、也永遠不會再顯示的死結。
        if (element.classList.contains(DOM_PENDING_CAPTION_CLASS)) {
            return true;
        }

        const style = window.getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
            return false;
        }

        return true;
    }

    function extractRequestUrl(resource) {
        if (typeof resource === 'string') {
            return resource;
        }

        if (resource && typeof resource.url === 'string') {
            return resource.url;
        }

        return '';
    }

    function shouldInterceptTimedtextRequest(rawUrl) {
        if (!translationEnabled || !rawUrl) {
            return false;
        }

        let url;
        try {
            url = new URL(rawUrl, window.location.origin);
        } catch (error) {
            return false;
        }

        if (!/youtube\.com$/i.test(url.hostname) && !/youtube\.com$/i.test(window.location.hostname)) {
            return false;
        }

        if (url.pathname !== '/api/timedtext') {
            return false;
        }

        const fmt = (url.searchParams.get('fmt') || 'json3').toLowerCase();
        if (fmt !== 'json3') {
            return false;
        }

        // 若 YouTube 自己已經要求進行目標語系翻譯，這裡就不要再二次加工，
        // 否則很容易出現「英文 -> 系統自動中譯 -> Gemini 再翻一次」的雙重轉譯現象。
        if (url.searchParams.has('tlang')) {
            return false;
        }

        const languageCode = (url.searchParams.get('lang') || '').trim();
        if (!isEnglishLanguageCode(languageCode)) {
            return false;
        }

        return true;
    }

    function isEnglishLanguageCode(languageCode) {
        return /^en(?:[-_].+)?$/i.test(languageCode);
    }

    function getOrCreateTranslatedTimedtext(requestUrl, producer) {
        if (resolvedRequestCache.has(requestUrl)) {
            return Promise.resolve(resolvedRequestCache.get(requestUrl));
        }

        if (requestCache.has(requestUrl)) {
            return requestCache.get(requestUrl);
        }

        const task = producer()
            .then((translatedText) => {
                requestCache.delete(requestUrl);
                resolvedRequestCache.set(requestUrl, translatedText);
                trimMapToSize(resolvedRequestCache, MAX_REQUEST_CACHE_SIZE);
                return translatedText;
            })
            .catch((error) => {
                requestCache.delete(requestUrl);
                throw error;
            });

        requestCache.set(requestUrl, task);
        trimMapToSize(requestCache, MAX_REQUEST_CACHE_SIZE);
        return task;
    }

    function trimMapToSize(map, maxSize) {
        while (map.size > maxSize) {
            const firstKey = map.keys().next().value;
            map.delete(firstKey);
        }
    }

    function createTranslatedResponse(originalResponse, translatedText) {
        const headers = new Headers(originalResponse.headers);
        if (!headers.has('content-type')) {
            headers.set('content-type', 'application/json; charset=utf-8');
        }

        return new Response(translatedText, {
            status: originalResponse.status,
            statusText: originalResponse.statusText,
            headers
        });
    }

    function enqueueTranslationTask(task) {
        const queuedTask = translationQueue.then(task, task);
        translationQueue = queuedTask.catch(() => undefined);
        return queuedTask;
    }

    function enqueuePrefetchTask(task) {
        const queuedTask = prefetchQueue.then(task, task);
        prefetchQueue = queuedTask.catch(() => undefined);
        return queuedTask;
    }

    async function translateTimedtextPayload(requestUrl, rawText) {
        return enqueueTranslationTask(async () => {
            const data = parseTimedtextPayload(rawText, false);
            if (!data) {
                log('warn', 'timedtext 並非 JSON3，已回退原始內容。');
                return rawText;
            }

            if (!Array.isArray(data.events)) {
                return rawText;
            }

            const videoId = getCurrentVideoId() || getVideoIdFromTimedtextUrl(requestUrl) || 'unknown-video';
            timedtextSourceByVideoId.set(videoId, {
                requestUrl,
                events: data.events,
                observedAt: Date.now(),
                source: 'fetch',
            });
            trimMapToSize(timedtextSourceByVideoId, MAX_TIMEDTEXT_SOURCE_CACHE_SIZE);

            const videoContext = getVideoContext(videoId);
            const history = getOrCreateSubtitleHistory(videoId);
            const currentPlaybackMs = getCurrentPlaybackMs();
            const inlineWindowEndMs = currentPlaybackMs + TIMEDTEXT_INLINE_TRANSLATION_WINDOW_MS;
            const translationEntries = buildTimedtextTranslationEntriesInRange(data.events, history, videoId, {
                minStartMs: Math.max(0, currentPlaybackMs - TIMEDTEXT_INLINE_TRANSLATION_LOOKBACK_MS),
                maxStartMs: inlineWindowEndMs,
            });

            if (translationEntries.length === 0) {
                maybeScheduleTimedtextPrefetch('fetch-inline-empty', true, videoId);
                return rawText;
            }

            log('debug', `fetch timedtext 近端同步翻譯視窗命中 ${translationEntries.length} 句，videoId=${videoId}。`);
            const translations = await translateEntriesForVideo(videoId, videoContext, history, translationEntries, {
                appendHistory: false,
            });
            applyTranslationsToEvents(translationEntries, translations);

            const prefetchState = getOrCreateTimedtextPrefetchState(videoId);
            prefetchState.prefetchedUntilMs = Math.max(prefetchState.prefetchedUntilMs, inlineWindowEndMs);
            maybeScheduleTimedtextPrefetch('fetch-inline', true, videoId);
            return JSON.stringify(data);
        });
    }

    async function translateEntriesForVideo(videoId, videoContext, history, translationEntries, options = {}) {
        const appendHistory = options.appendHistory !== false;
        const uncachedEntries = [];

        translationEntries.forEach((entry) => {
            if (entry.cachedTranslation) {
                entry.translatedText = entry.cachedTranslation;
                return;
            }

            uncachedEntries.push(entry);
        });

        const cacheHitCount = translationEntries.length - uncachedEntries.length;
        if (cacheHitCount > 0) {
            log('debug', `字幕快取命中 ${cacheHitCount}/${translationEntries.length} 句，videoId=${videoId}。`);
        }

        for (let index = 0; index < uncachedEntries.length; index += MAX_ITEMS_PER_TRANSLATION_CALL) {
            const batchEntries = uncachedEntries.slice(index, index + MAX_ITEMS_PER_TRANSLATION_CALL);
            const translations = await requestGeminiTranslations(videoContext, batchEntries);

            batchEntries.forEach((entry, translationIndex) => {
                entry.translatedText = translations[translationIndex];
            });

            storeTranslationsInPersistentCache(videoId, batchEntries, translations);
        }

        if (appendHistory) {
            appendHistoryLines(history, translationEntries.map((entry) => entry.originalText));
        }

        return translationEntries.map((entry) => entry.translatedText || entry.cachedTranslation || entry.originalText);
    }

    function getCurrentVideoId() {
        try {
            const url = new URL(window.location.href);
            const watchVideoId = url.searchParams.get('v');
            if (watchVideoId) {
                return watchVideoId;
            }

            const shortsMatch = url.pathname.match(/^\/shorts\/([^/?#]+)/i);
            if (shortsMatch) {
                return shortsMatch[1];
            }
        } catch (error) {
            // ignore
        }

        return '';
    }

    function getVideoIdFromTimedtextUrl(rawUrl) {
        try {
            const url = new URL(rawUrl, window.location.origin);
            return url.searchParams.get('v') || '';
        } catch (error) {
            return '';
        }
    }

    function getOrCreateSubtitleHistory(videoId) {
        if (!subtitleHistoryByVideoId.has(videoId)) {
            subtitleHistoryByVideoId.set(videoId, []);
        }

        return subtitleHistoryByVideoId.get(videoId);
    }

    function appendHistoryLines(history, lines) {
        history.push(...lines);

        if (history.length > MAX_STORED_HISTORY_LINES) {
            history.splice(0, history.length - MAX_STORED_HISTORY_LINES);
        }
    }

    function buildTranslationEntries(events, history, videoId) {
        const rollingHistory = history.slice(-MAX_CONTEXT_LINES);
        const entries = [];

        events.forEach((event) => {
            const originalText = getEventText(event);
            if (!originalText) {
                return;
            }

            if (!looksLikeEnglishSubtitle(originalText)) {
                return;
            }

            const startMs = getEventStartMs(event);
            const isEarlyPhase = startMs < EARLY_PHASE_DURATION_MS;
            const recentLines = rollingHistory.slice(-(isEarlyPhase ? EARLY_PHASE_CONTEXT_LINES : MAX_CONTEXT_LINES));
            const cachedTranslation = getCachedSubtitleTranslation(videoId, originalText);
            rollingHistory.push(originalText);

            entries.push({
                event,
                originalText,
                recentLines,
                startMs,
                isEarlyPhase,
                cachedTranslation,
                cacheKey: buildSubtitleCacheKey(videoId, originalText),
            });
        });

        return entries;
    }

    function buildTimedtextTranslationEntriesInRange(events, history, videoId, range = {}) {
        const rollingHistory = history.slice(-MAX_CONTEXT_LINES);
        const entries = [];
        const minStartMs = Number.isFinite(range.minStartMs) ? range.minStartMs : 0;
        const maxStartMs = Number.isFinite(range.maxStartMs) ? range.maxStartMs : Number.POSITIVE_INFINITY;

        events.forEach((event) => {
            const originalText = getEventText(event);
            if (!originalText) {
                return;
            }

            if (!looksLikeEnglishSubtitle(originalText)) {
                return;
            }

            const startMs = getEventStartMs(event);
            const isEarlyPhase = startMs < EARLY_PHASE_DURATION_MS;
            const recentLines = rollingHistory.slice(-(isEarlyPhase ? EARLY_PHASE_CONTEXT_LINES : MAX_CONTEXT_LINES));
            const cachedTranslation = getCachedSubtitleTranslation(videoId, originalText);
            rollingHistory.push(originalText);

            if (startMs < minStartMs || startMs > maxStartMs) {
                return;
            }

            entries.push({
                event,
                originalText,
                recentLines,
                startMs,
                isEarlyPhase,
                cachedTranslation,
                cacheKey: buildSubtitleCacheKey(videoId, originalText),
            });
        });

        return entries;
    }

    function buildDomTranslationEntries(captionTargets, history, videoId) {
        const rollingHistory = history.slice(-MAX_CONTEXT_LINES);
        const entries = [];
        const startMs = getCurrentPlaybackMs();

        captionTargets.forEach((target) => {
            const originalText = normalizeSubtitleText(target.originalText);
            if (!originalText) {
                return;
            }

            if (!looksLikeEnglishSubtitle(originalText)) {
                return;
            }

            const isEarlyPhase = startMs < EARLY_PHASE_DURATION_MS;
            const recentLines = rollingHistory.slice(-(isEarlyPhase ? EARLY_PHASE_CONTEXT_LINES : MAX_CONTEXT_LINES));
            const cachedTranslation = getCachedSubtitleTranslation(videoId, originalText);
            rollingHistory.push(originalText);

            entries.push({
                target,
                originalText,
                recentLines,
                startMs,
                isEarlyPhase,
                cachedTranslation,
                cacheKey: buildSubtitleCacheKey(videoId, originalText),
            });
        });

        return entries;
    }

    function getCurrentPlaybackMs() {
        const currentTime = Number(document.querySelector('video')?.currentTime ?? 0);
        if (!Number.isFinite(currentTime) || currentTime <= 0) {
            return 0;
        }

        return Math.round(currentTime * 1000);
    }

    function getEventStartMs(event) {
        const startMs = Number(event?.tStartMs ?? 0);
        return Number.isFinite(startMs) ? startMs : 0;
    }

    function getEventText(event) {
        if (!event || !Array.isArray(event.segs)) {
            return '';
        }

        const text = event.segs
            .map((segment) => typeof segment?.utf8 === 'string' ? segment.utf8 : '')
            .join('');

        return normalizeSubtitleText(text);
    }

    function normalizeSubtitleText(text) {
        return text
            .replace(/\r/g, '')
            .replace(/\u200b/g, '')
            .replace(/\u2060/g, '')
            .trim();
    }

    function looksLikeEnglishSubtitle(text) {
        if (!text) {
            return false;
        }

        if (/[\u3400-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(text)) {
            return false;
        }

        const letterCount = (text.match(/[A-Za-z]/g) || []).length;
        return letterCount >= 1;
    }

    function getVideoContext(videoId) {
        const cached = videoContextCache.get(videoId);
        const latestContext = {
            videoId,
            title: readVideoTitle(),
            description: truncateText(readVideoDescription(), MAX_DESCRIPTION_LENGTH)
        };

        if (cached && cached.title === latestContext.title && cached.description === latestContext.description) {
            return cached;
        }

        videoContextCache.set(videoId, latestContext);
        trimMapToSize(videoContextCache, 20);
        return latestContext;
    }

    function readVideoTitle() {
        const playerResponse = window.ytInitialPlayerResponse;
        const titleFromPlayer = playerResponse?.videoDetails?.title;
        if (titleFromPlayer) {
            return titleFromPlayer.trim();
        }

        const titleFromMeta = document.querySelector('meta[name="title"]')?.getAttribute('content')
            || document.querySelector('meta[property="og:title"]')?.getAttribute('content');
        if (titleFromMeta) {
            return titleFromMeta.trim();
        }

        const titleFromDom = document.querySelector('ytd-watch-metadata h1 yt-formatted-string')?.textContent;
        if (titleFromDom) {
            return titleFromDom.trim();
        }

        return document.title.replace(/\s*-\s*YouTube$/i, '').trim();
    }

    function readVideoDescription() {
        const playerResponse = window.ytInitialPlayerResponse;
        const descriptionRuns = playerResponse?.microformat?.playerMicroformatRenderer?.description?.runs;
        const descriptionFromPlayer = playerResponse?.videoDetails?.shortDescription
            || playerResponse?.microformat?.playerMicroformatRenderer?.description?.simpleText
            || descriptionRuns?.map((run) => run.text)?.join('');
        if (descriptionFromPlayer) {
            return descriptionFromPlayer.trim();
        }

        const descriptionFromDom = document.querySelector('#description-inline-expander')?.textContent
            || document.querySelector('yt-attributed-string#description-text')?.textContent;
        if (descriptionFromDom) {
            return descriptionFromDom.trim();
        }

        const descriptionFromMeta = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
        return descriptionFromMeta.trim();
    }

    function truncateText(text, maxLength) {
        if (!text) {
            return '';
        }

        if (text.length <= maxLength) {
            return text;
        }

        return `${text.slice(0, maxLength)}…`;
    }

    function parseTimedtextPayload(rawText, warnOnFailure = true) {
        try {
            return JSON.parse(rawText);
        } catch (error) {
            if (warnOnFailure) {
                log('warn', 'timedtext 並非 JSON3，已回退原始內容。', error);
            }

            return null;
        }
    }

    async function requestGeminiTranslations(videoContext, batchEntries) {
        const prompt = buildTranslationPrompt(videoContext, batchEntries);
        const isEarlyPhaseBatch = batchEntries.every((entry) => entry.isEarlyPhase);
        log('debug', `送出 Gemini 翻譯請求，批次句數=${batchEntries.length}，模式=${isEarlyPhaseBatch ? 'fast-start' : 'normal'}。`);

        const responseData = await gmXmlHttpJson({
            method: 'POST',
            url: `${GEMINI_API_ROOT}/${selectedModel}:generateContent?key=${encodeURIComponent(apiKey)}`,
            headers: {
                'Content-Type': 'application/json'
            },
            data: JSON.stringify({
                contents: [
                    {
                        role: 'user',
                        parts: [
                            { text: prompt }
                        ]
                    }
                ],
                generationConfig: {
                    temperature: isEarlyPhaseBatch ? 0.1 : 0.2,
                    topP: 0.9,
                    maxOutputTokens: 4096,
                    responseMimeType: 'application/json'
                }
            }),
            timeout: GEMINI_REQUEST_TIMEOUT
        });

        recordUsageStats(responseData?.usageMetadata);

        const rawAnswer = responseData?.candidates?.[0]?.content?.parts?.map((part) => part.text || '').join('').trim() || '';
        const parsedTranslations = parseGeminiTranslationOutput(rawAnswer);

        if (parsedTranslations.length !== batchEntries.length) {
            throw new Error(`Gemini 回傳的翻譯數量 (${parsedTranslations.length}) 與字幕數量 (${batchEntries.length}) 不一致。`);
        }

        return parsedTranslations;
    }

    function buildTranslationPrompt(videoContext, batchEntries) {
        const isEarlyPhaseBatch = batchEntries.every((entry) => entry.isEarlyPhase);
        const contextLineLimit = isEarlyPhaseBatch ? EARLY_PHASE_CONTEXT_LINES : MAX_BATCH_SHARED_CONTEXT_LINES;
        const sharedRecentContext = (batchEntries[0]?.recentLines || []).slice(-contextLineLimit);
        const items = batchEntries.map((entry, index) => ({
            index,
            subtitle: entry.originalText
        }));

        // 先前 token 偏高的真正主因，不是把整份 timedtext JSON 丟給 Gemini，
        // 而是「每個 item 都重複攜帶一份 recentContext」，導致同一批字幕裡的前文被複製很多次。
        // 這裡改成 batch-level shared context：只給整批字幕共用的一小段前文，再把 items 以緊湊 JSON 傳入。
        return [
            `請將下列 YouTube 英文字幕翻譯成 ${TARGET_LANGUAGE}。`,
            isEarlyPhaseBatch
                ? '這是影片前 10 秒字幕，優先追求速度、自然與可讀性。'
                : '請保持口語自然，並盡量維持術語與語氣一致。',
            '只輸出 JSON，格式必須是 {"translations":["..."]}，順序必須與 items 完全一致。',
            '請保留專有名詞、產品名稱、網址、程式碼、型號與人名辨識度；不要額外補充說明。',
            `影片標題：${videoContext.title || '（尚未取得）'}`,
            ...(!isEarlyPhaseBatch && videoContext.description
                ? [`影片描述摘要：${truncateText(videoContext.description, MAX_PROMPT_DESCRIPTION_LENGTH)}`]
                : []),
            ...(sharedRecentContext.length > 0
                ? [`批次前文（共享上下文）：${JSON.stringify(sharedRecentContext)}`]
                : []),
            `items（依時間順序）：${JSON.stringify(items)}`
        ].join('\n');
    }

    function parseGeminiTranslationOutput(rawAnswer) {
        if (!rawAnswer) {
            return [];
        }

        const candidates = [rawAnswer];
        const fencedMatch = rawAnswer.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
        if (fencedMatch?.[1]) {
            candidates.push(fencedMatch[1]);
        }

        for (const candidate of candidates) {
            try {
                const parsed = JSON.parse(candidate);
                if (Array.isArray(parsed)) {
                    return parsed.map((item) => String(item ?? ''));
                }

                if (Array.isArray(parsed?.translations)) {
                    return parsed.translations.map((item) => String(item ?? ''));
                }
            } catch (error) {
                // 繼續嘗試下一個候選字串
            }
        }

        throw new Error('Gemini 回傳內容不是可解析的 JSON。');
    }

    function applyTranslationsToEvents(batchEntries, translations) {
        batchEntries.forEach((entry, index) => {
            setEventText(entry.event, translations[index]);
        });
    }

    function applyTranslationsToDomTargets(batchEntries, translations) {
        const overlayLines = [];

        batchEntries.forEach((entry, index) => {
            const translatedText = normalizeSubtitleText(translations[index] || '');
            if (!translatedText) {
                return;
            }

            markCaptionTargetTranslated(entry.target?.element, translatedText);
            overlayLines.push(translatedText);
        });

        renderTranslationOverlay(overlayLines);
    }

    function setEventText(event, translatedText) {
        if (!event || !Array.isArray(event.segs) || event.segs.length === 0) {
            return;
        }

        const baseSegment = event.segs.find((segment) => typeof segment?.utf8 === 'string') || event.segs[0];
        event.segs = [
            {
                ...baseSegment,
                utf8: translatedText
            }
        ];
    }

    function setDomCaptionText(element, translatedText, originalText) {
        if (!(element instanceof HTMLElement) || !translatedText) {
            return;
        }

        const currentText = normalizeSubtitleText(element.textContent || '');
        if (!currentText) {
            return;
        }

        const normalizedTranslatedText = normalizeSubtitleText(translatedText);
        if (currentText === normalizedTranslatedText) {
            markCaptionTargetTranslated(element, normalizedTranslatedText);
            return;
        }

        // 只有當目前畫面上的文字仍是同一句英文時才覆寫，避免晚到的非同步翻譯蓋掉更新後的新字幕。
        // 若 YouTube 已經把字幕切到下一句，這裡寧可放棄本次套用，也不要把畫面倒帶成上一句的中文。
        if (currentText !== originalText) {
            return;
        }

        markCaptionTargetTranslated(element, normalizedTranslatedText);
    }

    function hideVisibleEnglishCaptionTargets() {
        if (!translationEnabled || !apiKey) {
            return;
        }

        markCaptionTargetsPending(collectVisibleCaptionTargets());
    }

    function markCaptionTargetsPending(captionTargets) {
        captionTargets.forEach((target) => {
            markCaptionTargetPending(target.element, target.originalText);
        });
    }

    function markCaptionTargetPending(element, originalText) {
        if (!(element instanceof HTMLElement)) {
            return;
        }

        const currentText = normalizeSubtitleText(element.textContent || '');
        if (!currentText || currentText !== originalText) {
            return;
        }

        if (!looksLikeEnglishSubtitle(currentText)) {
            if (element.dataset[DOM_RENDERED_TEXT_DATASET_KEY] === currentText) {
                markCaptionTargetTranslated(element, currentText);
            }
            return;
        }

        // 若目前畫面上的文字已經是本腳本最後一次確認完成的輸出，就不要再次藏起來；
        // 只有「新進來但尚未完成翻譯」的內容才需要進入 pending hidden 狀態。
        if (element.dataset[DOM_RENDERED_TEXT_DATASET_KEY] === currentText) {
            element.classList.remove(DOM_PENDING_CAPTION_CLASS);
            return;
        }

        element.classList.add(DOM_PENDING_CAPTION_CLASS);
    }

    function markCaptionTargetTranslated(element, translatedText) {
        if (!(element instanceof HTMLElement)) {
            return;
        }

        if (!translatedText) {
            return;
        }

        element.dataset[DOM_RENDERED_TEXT_DATASET_KEY] = translatedText;
        element.classList.remove(DOM_PENDING_CAPTION_CLASS);
    }

    function resetCaptionDisplayState() {
        Array.from(document.querySelectorAll(DOM_CAPTION_TEXT_SELECTOR))
            .filter((element) => element instanceof HTMLElement)
            .forEach((element) => {
                element.classList.remove(DOM_PENDING_CAPTION_CLASS);
                delete element.dataset[DOM_RENDERED_TEXT_DATASET_KEY];
            });
        renderTranslationOverlay([]);
    }

    function gmXmlHttpJson(options) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                ...options,
                onload: (response) => {
                    if (response.status < 200 || response.status >= 300) {
                        reject(new Error(`HTTP ${response.status} ${response.statusText}`));
                        return;
                    }

                    try {
                        resolve(JSON.parse(response.responseText));
                    } catch (error) {
                        reject(new Error(`JSON 解析失敗：${error.message}`));
                    }
                },
                onerror: (error) => {
                    reject(new Error(`網路錯誤：${error?.error || 'unknown error'}`));
                },
                ontimeout: () => {
                    reject(new Error('請求逾時'));
                }
            });
        });
    }
})();
