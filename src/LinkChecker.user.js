// ==UserScript==
// @name         網頁連結檢查器
// @version      1.0.0
// @description  手動檢查目前網頁中所有可見的圖片、超連結、影片與音訊網址，可檢查全部或僅外部連結，並以不同顏色框線標示結果
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/LinkChecker.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/LinkChecker.user.js
// @author       Will Huang
// @match        *://*/*
// @run-at       document-idle
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @grant        GM_addStyle
// @connect      *
// @noframes
// ==/UserScript==

(function () {
    'use strict';

    const CONFIG = {
        timeout: 12000,
        concurrency: 8,

        // Fixed report size on desktop.
        reportWidth: 1220,
        reportHeight: 760,

        colors: {
            link: {
                valid: '#15803d',
                invalid: '#b91c1c',
                skipped: '#b45309',
                checking: '#1d4ed8'
            },

            image: {
                valid: '#22c55e',
                invalid: '#ef4444',
                skipped: '#f59e0b',
                checking: '#3b82f6'
            },

            video: {
                valid: '#4ade80',
                invalid: '#f87171',
                skipped: '#fbbf24',
                checking: '#60a5fa'
            },

            audio: {
                valid: '#166534',
                invalid: '#991b1b',
                skipped: '#92400e',
                checking: '#1e40af'
            }
        }
    };

    const ATTR_STATUS =
        'data-duotify-link-check-status';

    const ATTR_TYPE =
        'data-duotify-link-check-type';

    const REPORT_HOST_ID =
        'duotify-link-checker-report-host';

    /*
     * ============================================================
     * Element outlines
     * ============================================================
     *
     * Status:
     *
     *   Valid    = Green
     *   Invalid  = Red
     *   Skipped  = Amber
     *   Checking = Blue
     *
     * Resource type uses different shades.
     *
     * Link uses a larger outline offset so:
     *
     *   <a href="...">
     *       <img src="...">
     *   </a>
     *
     * can display two visible outlines.
     */

    GM_addStyle(`
        [${ATTR_TYPE}="link"] {
            --dlc-valid: ${CONFIG.colors.link.valid};
            --dlc-invalid: ${CONFIG.colors.link.invalid};
            --dlc-skipped: ${CONFIG.colors.link.skipped};
            --dlc-checking: ${CONFIG.colors.link.checking};
            --dlc-offset: 7px;
        }

        [${ATTR_TYPE}="image"] {
            --dlc-valid: ${CONFIG.colors.image.valid};
            --dlc-invalid: ${CONFIG.colors.image.invalid};
            --dlc-skipped: ${CONFIG.colors.image.skipped};
            --dlc-checking: ${CONFIG.colors.image.checking};
            --dlc-offset: 1px;
        }

        [${ATTR_TYPE}="video"] {
            --dlc-valid: ${CONFIG.colors.video.valid};
            --dlc-invalid: ${CONFIG.colors.video.invalid};
            --dlc-skipped: ${CONFIG.colors.video.skipped};
            --dlc-checking: ${CONFIG.colors.video.checking};
            --dlc-offset: 2px;
        }

        [${ATTR_TYPE}="audio"] {
            --dlc-valid: ${CONFIG.colors.audio.valid};
            --dlc-invalid: ${CONFIG.colors.audio.invalid};
            --dlc-skipped: ${CONFIG.colors.audio.skipped};
            --dlc-checking: ${CONFIG.colors.audio.checking};
            --dlc-offset: 2px;
        }

        [${ATTR_STATUS}="valid"] {
            outline: 3px solid var(--dlc-valid) !important;
            outline-offset: var(--dlc-offset) !important;
        }

        [${ATTR_STATUS}="invalid"] {
            outline: 3px solid var(--dlc-invalid) !important;
            outline-offset: var(--dlc-offset) !important;
        }

        [${ATTR_STATUS}="skipped"] {
            outline: 3px solid var(--dlc-skipped) !important;
            outline-offset: var(--dlc-offset) !important;
        }

        [${ATTR_STATUS}="checking"] {
            outline: 3px dashed var(--dlc-checking) !important;
            outline-offset: var(--dlc-offset) !important;
        }
    `);

    /*
     * ============================================================
     * DOM helpers
     * ============================================================
     */

    function el(tag, className, text) {
        const node =
            document.createElement(tag);

        if (className) {
            node.className =
                className;
        }

        if (text !== undefined) {
            node.textContent =
                text;
        }

        return node;
    }

    function isVisible(element) {
        if (
            !(element instanceof Element) ||
            !element.isConnected
        ) {
            return false;
        }

        if (
            typeof element.checkVisibility ===
            'function'
        ) {
            try {
                if (
                    !element.checkVisibility({
                        checkOpacity: true,
                        checkVisibilityCSS: true
                    })
                ) {
                    return false;
                }
            } catch {
                // Fall back to manual checks.
            }
        }

        const style =
            getComputedStyle(element);

        if (
            style.display === 'none' ||
            style.visibility === 'hidden' ||
            Number(style.opacity) === 0
        ) {
            return false;
        }

        return Array
            .from(
                element.getClientRects()
            )
            .some(
                rect =>
                    rect.width > 0 &&
                    rect.height > 0
            );
    }

    /*
     * ============================================================
     * URL helpers
     * ============================================================
     */

    function absoluteUrl(value) {
        if (!value) {
            return '';
        }

        try {
            return new URL(
                value,
                document.baseURI
            ).href;
        } catch {
            return value;
        }
    }

    function parseUrl(value) {
        try {
            return new URL(
                value,
                document.baseURI
            );
        } catch {
            return null;
        }
    }

    function isExternalUrl(url) {
        const parsed =
            parseUrl(url);

        if (!parsed) {
            return false;
        }

        if (
            parsed.protocol !== 'http:' &&
            parsed.protocol !== 'https:'
        ) {
            return false;
        }

        return (
            parsed.origin !==
            location.origin
        );
    }

    function getScope(url) {
        return isExternalUrl(url)
            ? 'external'
            : 'internal';
    }

    function shouldIncludeRecord(
        record,
        mode
    ) {
        if (mode === 'all') {
            return true;
        }

        if (mode === 'external') {
            return isExternalUrl(
                record.url
            );
        }

        return false;
    }

    /*
     * ============================================================
     * Collect visible resources
     * ============================================================
     */

    function collectVisibleResources(
        mode
    ) {
        const records = [];

        function add(record) {
            if (!record.url) {
                return;
            }

            if (
                shouldIncludeRecord(
                    record,
                    mode
                )
            ) {
                records.push(record);
            }
        }

        /*
         * Hyperlinks
         */
        document
            .querySelectorAll(
                'a[href]'
            )
            .forEach(element => {
                if (!isVisible(element)) {
                    return;
                }

                add({
                    element,

                    type:
                        'link',

                    typeLabel:
                        'Link',

                    url:
                        absoluteUrl(
                            element.getAttribute(
                                'href'
                            )
                        ),

                    source:
                        'href'
                });
            });

        /*
         * Images
         */
        document
            .querySelectorAll(
                'img'
            )
            .forEach(element => {
                if (!isVisible(element)) {
                    return;
                }

                const value =
                    element.currentSrc ||
                    element.src ||
                    element.getAttribute(
                        'src'
                    );

                if (!value) {
                    return;
                }

                add({
                    element,

                    type:
                        'image',

                    typeLabel:
                        'Image',

                    url:
                        absoluteUrl(value),

                    source:
                        'src/currentSrc'
                });
            });

        /*
         * Video
         */
        document
            .querySelectorAll(
                'video'
            )
            .forEach(element => {
                if (!isVisible(element)) {
                    return;
                }

                const value =
                    element.currentSrc ||
                    element.src ||
                    element.getAttribute(
                        'src'
                    );

                if (!value) {
                    return;
                }

                add({
                    element,

                    type:
                        'video',

                    typeLabel:
                        'Video',

                    url:
                        absoluteUrl(value),

                    source:
                        'src/currentSrc'
                });
            });

        /*
         * Audio
         */
        document
            .querySelectorAll(
                'audio'
            )
            .forEach(element => {
                if (!isVisible(element)) {
                    return;
                }

                const value =
                    element.currentSrc ||
                    element.src ||
                    element.getAttribute(
                        'src'
                    );

                if (!value) {
                    return;
                }

                add({
                    element,

                    type:
                        'audio',

                    typeLabel:
                        'Audio',

                    url:
                        absoluteUrl(value),

                    source:
                        'src/currentSrc'
                });
            });

        return records;
    }

    /*
     * ============================================================
     * Special URL validation
     * ============================================================
     */

    function classifySpecialUrl(
        record
    ) {
        const {
            url,
            element,
            type
        } = record;

        if (!url) {
            return {
                status:
                    'invalid',

                httpStatus:
                    '',

                note:
                    'Empty URL'
            };
        }

        const parsed =
            parseUrl(url);

        if (!parsed) {
            return {
                status:
                    'invalid',

                httpStatus:
                    '',

                note:
                    'Malformed URL'
            };
        }

        /*
         * data: / blob:
         */
        if (
            parsed.protocol ===
                'data:' ||
            parsed.protocol ===
                'blob:'
        ) {
            if (
                type ===
                'image'
            ) {
                const ok =
                    element.complete &&
                    element.naturalWidth > 0;

                return {
                    status:
                        ok
                            ? 'valid'
                            : 'invalid',

                    httpStatus:
                        '',

                    note:
                        `${parsed.protocol.slice(0, -1)} resource; ` +
                        'checked by DOM load state'
                };
            }

            if (
                type === 'video' ||
                type === 'audio'
            ) {
                const ok =
                    !element.error &&
                    element.readyState >
                        HTMLMediaElement
                            .HAVE_NOTHING;

                return {
                    status:
                        ok
                            ? 'valid'
                            : 'invalid',

                    httpStatus:
                        '',

                    note:
                        `${parsed.protocol.slice(0, -1)} resource; ` +
                        'checked by media state'
                };
            }

            return {
                status:
                    'skipped',

                httpStatus:
                    '',

                note:
                    `${parsed.protocol.slice(0, -1)} URL ` +
                    'is not an HTTP resource'
            };
        }

        if (
            parsed.protocol ===
            'javascript:'
        ) {
            return {
                status:
                    'skipped',

                httpStatus:
                    '',

                note:
                    'javascript: URL skipped'
            };
        }

        if (
            [
                'mailto:',
                'tel:',
                'sms:'
            ].includes(
                parsed.protocol
            )
        ) {
            return {
                status:
                    'skipped',

                httpStatus:
                    '',

                note:
                    `${parsed.protocol.slice(0, -1)} URL ` +
                    'cannot be validated using HTTP'
            };
        }

        if (
            ![
                'http:',
                'https:'
            ].includes(
                parsed.protocol
            )
        ) {
            return {
                status:
                    'skipped',

                httpStatus:
                    '',

                note:
                    `Unsupported protocol: ${parsed.protocol}`
            };
        }

        /*
         * In-page fragment
         */
        if (
            type === 'link' &&
            parsed.origin ===
                location.origin &&
            parsed.pathname ===
                location.pathname &&
            parsed.search ===
                location.search &&
            parsed.hash
        ) {
            let fragment;

            try {
                fragment =
                    decodeURIComponent(
                        parsed.hash.slice(1)
                    );
            } catch {
                fragment =
                    parsed.hash.slice(1);
            }

            if (!fragment) {
                return {
                    status:
                        'valid',

                    httpStatus:
                        '',

                    note:
                        'Page-top fragment'
                };
            }

            const target =
                document.getElementById(
                    fragment
                ) ||
                document.getElementsByName(
                    fragment
                )[0];

            return {
                status:
                    target
                        ? 'valid'
                        : 'invalid',

                httpStatus:
                    '',

                note:
                    target
                        ? 'In-page fragment target found'
                        : 'In-page fragment target not found'
            };
        }

        return null;
    }

    /*
     * ============================================================
     * Browser-like request headers
     * ============================================================
     */

    function buildAcceptLanguage() {
        const languages =
            (
                Array.isArray(
                    navigator.languages
                ) &&
                navigator.languages.length
            )
                ? navigator.languages
                : [
                    navigator.language
                ].filter(Boolean);

        if (!languages.length) {
            return (
                'en-US,en;q=0.9'
            );
        }

        return languages
            .slice(0, 6)
            .map(
                (
                    language,
                    index
                ) => {
                    if (
                        index === 0
                    ) {
                        return language;
                    }

                    const q =
                        Math.max(
                            0.5,
                            1 -
                            index * 0.1
                        ).toFixed(1);

                    return (
                        `${language};q=${q}`
                    );
                }
            )
            .join(',');
    }

    function getAcceptHeader(
        type
    ) {
        switch (type) {
            case 'image':
                return (
                    'image/avif,' +
                    'image/webp,' +
                    'image/apng,' +
                    'image/svg+xml,' +
                    'image/*,' +
                    '*/*;q=0.8'
                );

            case 'video':
                return (
                    'video/webm,' +
                    'video/ogg,' +
                    'video/*;q=0.9,' +
                    '*/*;q=0.8'
                );

            case 'audio':
                return (
                    'audio/ogg,' +
                    'audio/*;q=0.9,' +
                    '*/*;q=0.8'
                );

            default:
                return (
                    'text/html,' +
                    'application/xhtml+xml,' +
                    'application/xml;q=0.9,' +
                    'image/avif,' +
                    'image/webp,' +
                    'image/apng,' +
                    '*/*;q=0.8'
                );
        }
    }

    function getReferrerPolicy(
        record
    ) {
        if (
            record.type ===
                'link' &&
            record.element
                .relList
                ?.contains(
                    'noreferrer'
                )
        ) {
            return (
                'no-referrer'
            );
        }

        const elementPolicy =
            (
                typeof record.element
                    .referrerPolicy ===
                    'string'
            )
                ? record.element
                    .referrerPolicy
                    .trim()
                    .toLowerCase()
                : '';

        const attributePolicy =
            record.element
                .getAttribute?.(
                    'referrerpolicy'
                )
                ?.trim()
                ?.toLowerCase() ||
            '';

        const documentPolicy =
            (
                typeof document
                    .referrerPolicy ===
                    'string'
            )
                ? document
                    .referrerPolicy
                    .trim()
                    .toLowerCase()
                : '';

        const metaPolicy =
            document
                .querySelector(
                    'meta[name="referrer" i]'
                )
                ?.getAttribute(
                    'content'
                )
                ?.trim()
                ?.toLowerCase() ||
            '';

        return (
            elementPolicy ||
            attributePolicy ||
            documentPolicy ||
            metaPolicy ||
            'strict-origin-when-cross-origin'
        );
    }

    function getBrowserLikeReferer(
        record,
        targetUrl
    ) {
        const source =
            new URL(
                location.href
            );

        const target =
            new URL(
                targetUrl,
                document.baseURI
            );

        const policy =
            getReferrerPolicy(
                record
            );

        const sameOrigin =
            source.origin ===
            target.origin;

        const downgrade =
            source.protocol ===
                'https:' &&
            target.protocol ===
                'http:';

        const fullUrl =
            new URL(
                source.href
            );

        fullUrl.hash = '';
        fullUrl.username = '';
        fullUrl.password = '';

        const full =
            fullUrl.href;

        const origin =
            `${source.origin}/`;

        switch (policy) {
            case 'no-referrer':
                return '';

            case 'origin':
                return origin;

            case 'same-origin':
                return sameOrigin
                    ? full
                    : '';

            case 'origin-when-cross-origin':
                return sameOrigin
                    ? full
                    : origin;

            case 'strict-origin':
                return downgrade
                    ? ''
                    : origin;

            case 'unsafe-url':
                return full;

            case 'no-referrer-when-downgrade':
                return downgrade
                    ? ''
                    : full;

            case 'strict-origin-when-cross-origin':
            default:
                if (sameOrigin) {
                    return full;
                }

                return downgrade
                    ? ''
                    : origin;
        }
    }

    function buildRequestHeaders(
        record,
        requestUrl
    ) {
        const headers = {
            Accept:
                getAcceptHeader(
                    record.type
                ),

            'Accept-Language':
                buildAcceptLanguage(),

            'User-Agent':
                navigator.userAgent
        };

        const referer =
            getBrowserLikeReferer(
                record,
                requestUrl
            );

        if (referer) {
            headers.Referer =
                referer;
        }

        return headers;
    }

    /*
     * ============================================================
     * HEAD request
     * ============================================================
     */

    function httpHead(
        record,
        requestUrl
    ) {
        return new Promise(
            resolve => {
                GM_xmlhttpRequest({
                    method:
                        'HEAD',

                    url:
                        requestUrl,

                    headers:
                        buildRequestHeaders(
                            record,
                            requestUrl
                        ),

                    timeout:
                        CONFIG.timeout,

                    redirect:
                        'follow',

                    onload(response) {
                        resolve({
                            method:
                                'HEAD',

                            status:
                                response.status,

                            statusText:
                                response.statusText ||
                                '',

                            finalUrl:
                                response.finalUrl ||
                                requestUrl
                        });
                    },

                    ontimeout() {
                        resolve({
                            method:
                                'HEAD',

                            status:
                                0,

                            statusText:
                                'Timeout',

                            finalUrl:
                                requestUrl
                        });
                    },

                    onerror() {
                        resolve({
                            method:
                                'HEAD',

                            status:
                                0,

                            statusText:
                                'Network error',

                            finalUrl:
                                requestUrl
                        });
                    },

                    onabort() {
                        resolve({
                            method:
                                'HEAD',

                            status:
                                0,

                            statusText:
                                'Aborted',

                            finalUrl:
                                requestUrl
                        });
                    }
                });
            }
        );
    }

    /*
     * ============================================================
     * GET fallback
     * ============================================================
     *
     * Some services behave differently between HEAD and GET.
     *
     * Example:
     *
     *   HEAD → 404
     *   GET  → 200
     *
     * Therefore a failed HEAD is verified using GET.
     *
     * The GET request is aborted after response headers are
     * available whenever Tampermonkey provides that event.
     */

    function httpGetProbe(
        record,
        requestUrl
    ) {
        return new Promise(
            resolve => {
                let settled =
                    false;

                let request =
                    null;

                function finish(
                    response
                ) {
                    if (settled) {
                        return;
                    }

                    settled =
                        true;

                    resolve({
                        method:
                            'GET',

                        status:
                            response.status ||
                            0,

                        statusText:
                            response.statusText ||
                            '',

                        finalUrl:
                            response.finalUrl ||
                            requestUrl
                    });
                }

                request =
                    GM_xmlhttpRequest({
                        method:
                            'GET',

                        url:
                            requestUrl,

                        headers:
                            buildRequestHeaders(
                                record,
                                requestUrl
                            ),

                        timeout:
                            CONFIG.timeout,

                        redirect:
                            'follow',

                        onreadystatechange(
                            response
                        ) {
                            if (
                                settled ||
                                response.readyState < 2 ||
                                response.status <= 0
                            ) {
                                return;
                            }

                            finish(
                                response
                            );

                            try {
                                request?.abort();
                            } catch {
                                // Ignore expected abort errors.
                            }
                        },

                        onload(response) {
                            finish(
                                response
                            );
                        },

                        ontimeout() {
                            finish({
                                status:
                                    0,

                                statusText:
                                    'Timeout',

                                finalUrl:
                                    requestUrl
                            });
                        },

                        onerror() {
                            finish({
                                status:
                                    0,

                                statusText:
                                    'Network error',

                                finalUrl:
                                    requestUrl
                            });
                        },

                        onabort() {
                            if (!settled) {
                                finish({
                                    status:
                                        0,

                                    statusText:
                                        'Aborted',

                                    finalUrl:
                                        requestUrl
                                });
                            }
                        }
                    });
            }
        );
    }

    function describeCode(
        status
    ) {
        if (!status) {
            return 'failed';
        }

        return String(status);
    }

    /*
     * ============================================================
     * Record validation
     * ============================================================
     */

    async function validateRecord(
        record,
        cache
    ) {
        const special =
            classifySpecialUrl(
                record
            );

        if (special) {
            return special;
        }

        let requestUrl =
            record.url;

        try {
            const url =
                new URL(
                    record.url,
                    document.baseURI
                );

            url.hash = '';

            requestUrl =
                url.href;
        } catch {
            // Keep original URL.
        }

        const referer =
            getBrowserLikeReferer(
                record,
                requestUrl
            );

        /*
         * Different resource types use different Accept headers.
         * Referrer policy may also differ between elements.
         */
        const cacheKey = [
            record.type,
            requestUrl,
            referer
        ].join('\n');

        if (
            !cache.has(
                cacheKey
            )
        ) {
            cache.set(
                cacheKey,

                (
                    async () => {
                        /*
                         * Step 1: HEAD
                         */

                        const head =
                            await httpHead(
                                record,
                                requestUrl
                            );

                        /*
                         * HEAD succeeded.
                         */
                        if (
                            head.status >= 200 &&
                            head.status < 400
                        ) {
                            return {
                                finalStatus:
                                    'valid',

                                httpStatus:
                                    head.status,

                                note:
                                    `HEAD ${head.status}`,

                                finalUrl:
                                    head.finalUrl
                            };
                        }

                        /*
                         * Avoid immediately retrying a rate-limited
                         * request using GET.
                         */
                        if (
                            head.status === 429
                        ) {
                            return {
                                finalStatus:
                                    'skipped',

                                httpStatus:
                                    429,

                                note:
                                    'HEAD 429 — Too many requests',

                                finalUrl:
                                    head.finalUrl
                            };
                        }

                        /*
                         * Step 2: GET verification
                         */

                        const get =
                            await httpGetProbe(
                                record,
                                requestUrl
                            );

                        /*
                         * GET succeeded.
                         */
                        if (
                            get.status >= 200 &&
                            get.status < 400
                        ) {
                            return {
                                finalStatus:
                                    'valid',

                                httpStatus:
                                    get.status,

                                note:
                                    `HEAD ${describeCode(
                                        head.status
                                    )} → GET ${get.status}`,

                                finalUrl:
                                    get.finalUrl
                            };
                        }

                        /*
                         * Authentication / authorization errors do
                         * not prove that the resource is broken.
                         */
                        if (
                            get.status === 401 ||
                            get.status === 403
                        ) {
                            return {
                                finalStatus:
                                    'skipped',

                                httpStatus:
                                    get.status,

                                note:
                                    `HEAD ${describeCode(
                                        head.status
                                    )} → GET ${get.status} ` +
                                    '(access restricted)',

                                finalUrl:
                                    get.finalUrl
                            };
                        }

                        if (
                            get.status === 429
                        ) {
                            return {
                                finalStatus:
                                    'skipped',

                                httpStatus:
                                    429,

                                note:
                                    `HEAD ${describeCode(
                                        head.status
                                    )} → GET 429 ` +
                                    '(too many requests)',

                                finalUrl:
                                    get.finalUrl
                            };
                        }

                        /*
                         * Network errors and timeouts are uncertain,
                         * so do not classify them as broken links.
                         */
                        if (
                            get.status === 0
                        ) {
                            return {
                                finalStatus:
                                    'skipped',

                                httpStatus:
                                    '',

                                note:
                                    `HEAD ${
                                        head.status ||
                                        head.statusText ||
                                        'failed'
                                    } → GET ${
                                        get.statusText ||
                                        'failed'
                                    }`,

                                finalUrl:
                                    get.finalUrl
                            };
                        }

                        /*
                         * Actual HTTP error returned by GET.
                         */
                        return {
                            finalStatus:
                                'invalid',

                            httpStatus:
                                get.status,

                            note:
                                `HEAD ${describeCode(
                                    head.status
                                )} → GET ${get.status}`,

                            finalUrl:
                                get.finalUrl
                        };
                    }
                )()
            );
        }

        const result =
            await cache.get(
                cacheKey
            );

        let note =
            result.note;

        if (
            result.finalUrl &&
            result.finalUrl !==
                requestUrl
        ) {
            note +=
                ` → ${result.finalUrl}`;
        }

        return {
            status:
                result.finalStatus,

            httpStatus:
                result.httpStatus,

            note
        };
    }

    /*
     * ============================================================
     * Page highlighting
     * ============================================================
     */

    function applyElementStatus(
        record,
        status
    ) {
        record.element
            .setAttribute(
                ATTR_TYPE,
                record.type
            );

        record.element
            .setAttribute(
                ATTR_STATUS,
                status
            );
    }

    function clearPreviousMarks() {
        document
            .querySelectorAll(
                `[${ATTR_STATUS}],` +
                `[${ATTR_TYPE}]`
            )
            .forEach(element => {
                element
                    .removeAttribute(
                        ATTR_STATUS
                    );

                element
                    .removeAttribute(
                        ATTR_TYPE
                    );
            });
    }

    /*
     * ============================================================
     * Report UI
     * ============================================================
     *
     * Shadow DOM isolates the report from the host site's CSS.
     *
     * The report has a fixed desktop width and height.
     * Filtering changes only the table rows and will not change
     * the dialog dimensions or position.
     */

    function createReport(
        records,
        mode
    ) {
        document
            .getElementById(
                REPORT_HOST_ID
            )
            ?.remove();

        const host =
            document.createElement(
                'div'
            );

        host.id =
            REPORT_HOST_ID;

        host.style.cssText = [
            'all:initial!important',
            'position:fixed!important',
            'inset:0!important',
            'z-index:2147483647!important',
            'pointer-events:none!important'
        ].join(';');

        const shadow =
            host.attachShadow({
                mode:
                    'open'
            });

        const style =
            el('style');

        style.textContent = `
            *,
            *::before,
            *::after {
                box-sizing: border-box;
            }

            [hidden] {
                display: none !important;
            }

            .overlay {
                position: fixed;
                inset: 0;

                pointer-events: none;

                color-scheme: light;

                font-family:
                    -apple-system,
                    BlinkMacSystemFont,
                    "Segoe UI",
                    Roboto,
                    Helvetica,
                    Arial,
                    sans-serif;

                font-size: 14px;
                line-height: 1.5;

                color: #172033;
            }

            /*
             * Fixed visual size.
             *
             * On a desktop viewport this stays exactly:
             *
             *   ${CONFIG.reportWidth}px × ${CONFIG.reportHeight}px
             *
             * Only a smaller viewport can force it smaller.
             */
            .report {
                position: absolute;

                top: 50%;
                left: 50%;

                transform:
                    translate(-50%, -50%);

                width:
                    min(
                        ${CONFIG.reportWidth}px,
                        calc(100vw - 32px)
                    );

                height:
                    min(
                        ${CONFIG.reportHeight}px,
                        calc(100vh - 32px)
                    );

                min-width: 0;
                min-height: 0;

                display: flex;
                flex-direction: column;

                overflow: hidden;

                pointer-events: auto;

                background: #ffffff;
                color: #172033;

                border:
                    1px solid #cbd5e1;

                border-radius:
                    14px;

                box-shadow:
                    0 24px 80px
                    rgba(
                        15,
                        23,
                        42,
                        .32
                    );
            }

            .header {
                flex: 0 0 auto;

                position: relative;

                padding:
                    18px 58px
                    14px 20px;

                background:
                    #ffffff;

                border-bottom:
                    1px solid #e2e8f0;
            }

            .title {
                margin: 0;

                color:
                    #0f172a;

                font-size:
                    20px;

                font-weight:
                    750;

                letter-spacing:
                    -.01em;
            }

            .subtitle {
                margin-top:
                    4px;

                color:
                    #64748b;

                font-size:
                    12px;
            }

            .close {
                position: absolute;

                top: 12px;
                right: 14px;

                width: 36px;
                height: 36px;

                display: grid;
                place-items: center;

                padding: 0;

                border: 0;
                border-radius: 9px;

                background:
                    #f8fafc;

                color:
                    #334155;

                cursor: pointer;

                font: inherit;

                font-size:
                    26px;

                line-height: 1;
            }

            .close:hover {
                background:
                    #e2e8f0;

                color:
                    #0f172a;
            }

            .legend {
                flex: 0 0 auto;

                display: flex;
                flex-wrap: wrap;
                align-items: center;

                gap:
                    8px 18px;

                padding:
                    10px 20px;

                background:
                    #f8fafc;

                border-bottom:
                    1px solid #e2e8f0;

                color:
                    #475569;

                font-size:
                    12px;
            }

            .legend-item {
                display:
                    inline-flex;

                align-items:
                    center;

                gap:
                    7px;
            }

            .legend-line {
                display:
                    inline-block;

                width:
                    28px;

                border-top:
                    4px solid;
            }

            .legend-link {
                border-color:
                    ${CONFIG.colors.link.valid};
            }

            .legend-image {
                border-color:
                    ${CONFIG.colors.image.valid};
            }

            .legend-video {
                border-color:
                    ${CONFIG.colors.video.valid};
            }

            .legend-audio {
                border-color:
                    ${CONFIG.colors.audio.valid};
            }

            .legend-note {
                color:
                    #64748b;
            }

            .summary {
                flex: 0 0 auto;

                display: grid;

                grid-template-columns:
                    repeat(
                        5,
                        minmax(
                            120px,
                            1fr
                        )
                    );

                gap:
                    10px;

                padding:
                    14px 20px;

                background:
                    #ffffff;

                border-bottom:
                    1px solid #e2e8f0;
            }

            .card {
                appearance: none;

                min-width: 0;

                padding:
                    10px 12px;

                text-align:
                    left;

                background:
                    #ffffff;

                color:
                    #0f172a;

                border:
                    1px solid #dbe3ee;

                border-radius:
                    10px;

                cursor: pointer;

                font: inherit;

                transition:
                    border-color .12s,
                    box-shadow .12s,
                    background-color .12s;
            }

            .card:hover {
                border-color:
                    #94a3b8;

                box-shadow:
                    0 2px 8px
                    rgba(
                        15,
                        23,
                        42,
                        .08
                    );
            }

            .card[aria-pressed="true"] {
                border-color:
                    #2563eb;

                box-shadow:
                    0 0 0 2px
                    rgba(
                        37,
                        99,
                        235,
                        .18
                    );
            }

            .card[data-filter="valid"] {
                background:
                    #f0fdf4;
            }

            .card[data-filter="invalid"] {
                background:
                    #fef2f2;
            }

            .card[data-filter="skipped"] {
                background:
                    #fffbeb;
            }

            .card[data-filter="checked"] {
                background:
                    #eff6ff;
            }

            .card-label {
                color:
                    #64748b;

                font-size:
                    11px;

                font-weight:
                    650;

                text-transform:
                    uppercase;

                letter-spacing:
                    .04em;
            }

            .card-value {
                margin-top:
                    1px;

                color:
                    #0f172a;

                font-size:
                    21px;

                font-weight:
                    800;

                line-height:
                    1.25;
            }

            .progress-wrap {
                flex: 0 0 auto;

                padding:
                    0 20px 12px;

                background:
                    #ffffff;

                border-bottom:
                    1px solid #e2e8f0;
            }

            .progress-text {
                margin-bottom:
                    6px;

                color:
                    #475569;

                font-size:
                    12px;
            }

            .progress {
                height:
                    8px;

                overflow:
                    hidden;

                background:
                    #e2e8f0;

                border-radius:
                    999px;
            }

            .progress-bar {
                width:
                    0;

                height:
                    100%;

                background:
                    #2563eb;

                transition:
                    width .15s ease;
            }

            .table-toolbar {
                flex: 0 0 auto;

                display: flex;

                align-items:
                    center;

                justify-content:
                    space-between;

                gap:
                    12px;

                min-height:
                    38px;

                padding:
                    9px 14px;

                background:
                    #f8fafc;

                border-bottom:
                    1px solid #e2e8f0;

                color:
                    #475569;

                font-size:
                    12px;
            }

            .filter-label strong {
                color:
                    #0f172a;
            }

            /*
             * This is the only flexible region.
             *
             * It always consumes all remaining vertical space,
             * so filtering 60 rows down to 1 row does not shrink
             * the modal.
             */
            .table-wrap {
                position: relative;

                flex:
                    1 1 auto;

                min-height:
                    0;

                overflow:
                    auto;

                background:
                    #ffffff;

                color:
                    #334155;

                scrollbar-gutter:
                    stable;
            }

            table {
                width:
                    100%;

                border-collapse:
                    collapse;

                table-layout:
                    fixed;

                background:
                    #ffffff;

                color:
                    #334155;
            }

            th,
            td {
                padding:
                    9px 10px;

                text-align:
                    left;

                vertical-align:
                    top;

                border-bottom:
                    1px solid #e2e8f0;
            }

            th {
                position:
                    sticky;

                top:
                    0;

                z-index:
                    2;

                background:
                    #f1f5f9;

                color:
                    #334155;

                font-size:
                    12px;

                font-weight:
                    750;
            }

            tbody tr {
                background:
                    #ffffff;
            }

            tbody tr:nth-child(even) {
                background:
                    #f8fafc;
            }

            tbody tr[data-status="invalid"] {
                background:
                    #fff1f2;
            }

            tbody tr[data-status="skipped"] {
                background:
                    #fffbeb;
            }

            tbody tr:hover {
                background:
                    #eff6ff;
            }

            .col-type {
                width:
                    92px;
            }

            .col-status {
                width:
                    96px;
            }

            .col-http {
                width:
                    72px;
            }

            .col-scope {
                width:
                    82px;
            }

            .col-note {
                width:
                    265px;
            }

            .type-badge,
            .status-badge,
            .scope-badge {
                display:
                    inline-flex;

                align-items:
                    center;

                min-height:
                    24px;

                padding:
                    2px 8px;

                border-radius:
                    999px;

                font-size:
                    12px;

                font-weight:
                    750;

                white-space:
                    nowrap;
            }

            .type-link {
                color:
                    #166534;

                background:
                    #dcfce7;
            }

            .type-image {
                color:
                    #15803d;

                background:
                    #bbf7d0;
            }

            .type-video {
                color:
                    #166534;

                background:
                    #d1fae5;
            }

            .type-audio {
                color:
                    #14532d;

                background:
                    #ecfdf5;
            }

            .status-checking {
                color:
                    #1d4ed8;

                background:
                    #dbeafe;
            }

            .status-valid {
                color:
                    #166534;

                background:
                    #dcfce7;
            }

            .status-invalid {
                color:
                    #991b1b;

                background:
                    #fee2e2;
            }

            .status-skipped {
                color:
                    #92400e;

                background:
                    #fef3c7;
            }

            .scope-internal {
                color:
                    #475569;

                background:
                    #f1f5f9;
            }

            .scope-external {
                color:
                    #6d28d9;

                background:
                    #ede9fe;
            }

            .url {
                color:
                    #334155;

                word-break:
                    break-all;
            }

            .url a,
            .url a:link,
            .url a:visited {
                color:
                    #1d4ed8;

                text-decoration:
                    none;
            }

            .url a:hover {
                color:
                    #1e40af;

                text-decoration:
                    underline;
            }

            .note {
                color:
                    #64748b;

                word-break:
                    break-word;
            }

            /*
             * Empty filter state fills the remaining table area
             * instead of changing the dialog geometry.
             */
            .empty {
                position: absolute;

                inset:
                    42px 0 0;

                display: flex;
                align-items: center;
                justify-content: center;

                padding:
                    32px 18px;

                text-align:
                    center;

                color:
                    #64748b;

                background:
                    #ffffff;
            }

            .empty[hidden] {
                display:
                    none !important;
            }

            /*
             * On smaller screens the dimensions are still stable,
             * but constrained to the viewport.
             */
            @media (max-width: 820px) {
                .summary {
                    grid-template-columns:
                        repeat(
                            2,
                            minmax(
                                0,
                                1fr
                            )
                        );
                }

                .col-note {
                    width:
                        180px;
                }
            }
        `;

        const overlay =
            el(
                'div',
                'overlay'
            );

        const report =
            el(
                'section',
                'report'
            );

        report.setAttribute(
            'role',
            'dialog'
        );

        report.setAttribute(
            'aria-label',
            'Link Checker Report'
        );

        /*
         * ========================================================
         * Header
         * ========================================================
         */

        const header =
            el(
                'div',
                'header'
            );

        const title =
            el(
                'h2',
                'title',
                'Link Checker Report'
            );

        const modeLabel =
            mode === 'external'
                ? 'External resources only'
                : 'All visible resources';

        const subtitle =
            el(
                'div',
                'subtitle',
                `${modeLabel} — ` +
                `${location.hostname} — ` +
                `${new Date().toLocaleString()}`
            );

        const close =
            el(
                'button',
                'close',
                '×'
            );

        close.type =
            'button';

        close.setAttribute(
            'aria-label',
            'Close Link Checker report'
        );

        close.addEventListener(
            'click',
            () => host.remove()
        );

        header.append(
            title,
            subtitle,
            close
        );

        /*
         * ========================================================
         * Legend
         * ========================================================
         */

        const legend =
            el(
                'div',
                'legend'
            );

        [
            ['link', 'Link'],
            ['image', 'Image'],
            ['video', 'Video'],
            ['audio', 'Audio']
        ].forEach(
            (
                [type, label]
            ) => {
                const item =
                    el(
                        'span',
                        'legend-item'
                    );

                item.append(
                    el(
                        'span',
                        `legend-line legend-${type}`
                    ),

                    el(
                        'span',
                        '',
                        label
                    )
                );

                legend.append(
                    item
                );
            }
        );

        legend.append(
            el(
                'span',
                'legend-note',
                'Green = valid, Red = invalid, Amber = skipped, Blue = checking'
            )
        );

        /*
         * ========================================================
         * Summary cards
         * ========================================================
         */

        const summary =
            el(
                'div',
                'summary'
            );

        const cards = {};

        [
            ['total', 'Total'],
            ['valid', 'Valid'],
            ['invalid', 'Invalid'],
            ['skipped', 'Skipped'],
            ['checked', 'Checked']
        ].forEach(
            (
                [key, label]
            ) => {
                const card =
                    el(
                        'button',
                        'card'
                    );

                card.type =
                    'button';

                card.dataset.filter =
                    key;

                card.setAttribute(
                    'aria-pressed',
                    key === 'total'
                        ? 'true'
                        : 'false'
                );

                const cardLabel =
                    el(
                        'div',
                        'card-label',
                        label
                    );

                const value =
                    el(
                        'div',
                        'card-value',
                        key === 'total'
                            ? String(
                                records.length
                            )
                            : '0'
                    );

                card.append(
                    cardLabel,
                    value
                );

                summary.append(
                    card
                );

                cards[key] = {
                    card,
                    value,
                    label
                };
            }
        );

        /*
         * ========================================================
         * Progress
         * ========================================================
         */

        const progressWrap =
            el(
                'div',
                'progress-wrap'
            );

        const progressText =
            el(
                'div',
                'progress-text',
                `Checking 0 / ${records.length}`
            );

        const progress =
            el(
                'div',
                'progress'
            );

        const progressBar =
            el(
                'div',
                'progress-bar'
            );

        progress.append(
            progressBar
        );

        progressWrap.append(
            progressText,
            progress
        );

        /*
         * ========================================================
         * Table toolbar
         * ========================================================
         */

        const tableToolbar =
            el(
                'div',
                'table-toolbar'
            );

        const filterLabel =
            el(
                'div',
                'filter-label'
            );

        const resultCount =
            el(
                'div',
                'result-count'
            );

        tableToolbar.append(
            filterLabel,
            resultCount
        );

        /*
         * ========================================================
         * Table
         * ========================================================
         */

        const tableWrap =
            el(
                'div',
                'table-wrap'
            );

        const table =
            el(
                'table'
            );

        const thead =
            el(
                'thead'
            );

        const headerRow =
            el(
                'tr'
            );

        [
            ['Type', 'col-type'],
            ['Status', 'col-status'],
            ['HTTP', 'col-http'],
            ['Scope', 'col-scope'],
            ['URL', ''],
            ['Note', 'col-note']
        ].forEach(
            (
                [text, className]
            ) => {
                const th =
                    el(
                        'th',
                        className,
                        text
                    );

                headerRow.append(
                    th
                );
            }
        );

        thead.append(
            headerRow
        );

        const tbody =
            el(
                'tbody'
            );

        table.append(
            thead,
            tbody
        );

        tableWrap.append(
            table
        );

        const emptyState =
            el(
                'div',
                'empty',
                'No results match the selected filter.'
            );

        emptyState.hidden =
            true;

        tableWrap.append(
            emptyState
        );

        /*
         * ========================================================
         * Rows
         * ========================================================
         */

        const rows =
            records.map(
                record => {
                    const row =
                        el(
                            'tr'
                        );

                    row.dataset.status =
                        'checking';

                    /*
                     * Type
                     */
                    const typeCell =
                        el(
                            'td'
                        );

                    typeCell.append(
                        el(
                            'span',
                            `type-badge type-${record.type}`,
                            record.typeLabel
                        )
                    );

                    /*
                     * Status
                     */
                    const statusCell =
                        el(
                            'td'
                        );

                    const statusBadge =
                        el(
                            'span',
                            'status-badge status-checking',
                            'Checking'
                        );

                    statusCell.append(
                        statusBadge
                    );

                    /*
                     * HTTP
                     */
                    const httpCell =
                        el(
                            'td'
                        );

                    /*
                     * Scope
                     */
                    const scope =
                        getScope(
                            record.url
                        );

                    const scopeCell =
                        el(
                            'td'
                        );

                    scopeCell.append(
                        el(
                            'span',
                            `scope-badge scope-${scope}`,
                            scope === 'external'
                                ? 'External'
                                : 'Internal'
                        )
                    );

                    /*
                     * URL
                     */
                    const urlCell =
                        el(
                            'td',
                            'url'
                        );

                    const urlLink =
                        el(
                            'a',
                            '',
                            record.url
                        );

                    urlLink.href =
                        record.url;

                    urlLink.target =
                        '_blank';

                    urlLink.rel =
                        'noopener noreferrer';

                    urlCell.append(
                        urlLink
                    );

                    /*
                     * Note
                     */
                    const noteCell =
                        el(
                            'td',
                            'note',
                            record.source
                        );

                    row.append(
                        typeCell,
                        statusCell,
                        httpCell,
                        scopeCell,
                        urlCell,
                        noteCell
                    );

                    tbody.append(
                        row
                    );

                    return {
                        row,
                        statusBadge,
                        httpCell,
                        noteCell
                    };
                }
            );

        report.append(
            header,
            legend,
            summary,
            progressWrap,
            tableToolbar,
            tableWrap
        );

        overlay.append(
            report
        );

        shadow.append(
            style,
            overlay
        );

        document
            .documentElement
            .append(
                host
            );

        /*
         * ========================================================
         * Filtering
         * ========================================================
         */

        let activeFilter =
            'total';

        function rowMatchesFilter(
            rowInfo
        ) {
            const status =
                rowInfo
                    .row
                    .dataset
                    .status;

            if (
                activeFilter ===
                'total'
            ) {
                return true;
            }

            if (
                activeFilter ===
                'checked'
            ) {
                return (
                    status !==
                    'checking'
                );
            }

            return (
                status ===
                activeFilter
            );
        }

        function applyFilter() {
            let visibleCount =
                0;

            rows.forEach(
                rowInfo => {
                    const visible =
                        rowMatchesFilter(
                            rowInfo
                        );

                    rowInfo
                        .row
                        .hidden =
                        !visible;

                    if (visible) {
                        visibleCount +=
                            1;
                    }
                }
            );

            Object
                .entries(
                    cards
                )
                .forEach(
                    (
                        [key, info]
                    ) => {
                        info
                            .card
                            .setAttribute(
                                'aria-pressed',
                                key ===
                                    activeFilter
                                    ? 'true'
                                    : 'false'
                            );
                    }
                );

            const activeLabel =
                cards[
                    activeFilter
                ]?.label ||
                'Total';

            const strong =
                el(
                    'strong',
                    '',
                    activeLabel
                );

            filterLabel
                .replaceChildren(
                    document
                        .createTextNode(
                            'Filter: '
                        ),

                    strong
                );

            resultCount
                .textContent =
                `Showing ${visibleCount} ` +
                `of ${records.length}`;

            /*
             * Keep the table itself present so the table header
             * and table region do not change dimensions.
             */
            table.hidden =
                false;

            emptyState.hidden =
                visibleCount !== 0;
        }

        Object
            .entries(
                cards
            )
            .forEach(
                (
                    [key, info]
                ) => {
                    info
                        .card
                        .addEventListener(
                            'click',
                            () => {
                                activeFilter =
                                    key;

                                /*
                                 * Reset scrolling so every filter
                                 * starts at a predictable position.
                                 */
                                tableWrap.scrollTop =
                                    0;

                                applyFilter();
                            }
                        );
                }
            );

        applyFilter();

        /*
         * ========================================================
         * UI API
         * ========================================================
         */

        return {
            updateProgress(
                done,
                counts
            ) {
                cards
                    .valid
                    .value
                    .textContent =
                    String(
                        counts.valid
                    );

                cards
                    .invalid
                    .value
                    .textContent =
                    String(
                        counts.invalid
                    );

                cards
                    .skipped
                    .value
                    .textContent =
                    String(
                        counts.skipped
                    );

                cards
                    .checked
                    .value
                    .textContent =
                    String(
                        done
                    );

                progressText
                    .textContent =
                    done >=
                        records.length
                        ? `Completed ${done} / ${records.length}`
                        : `Checking ${done} / ${records.length}`;

                progressBar
                    .style
                    .width =
                    records.length
                        ? `${
                            Math.round(
                                (
                                    done /
                                    records.length
                                ) *
                                100
                            )
                        }%`
                        : '100%';

                applyFilter();
            },

            updateRow(
                index,
                result
            ) {
                const rowInfo =
                    rows[index];

                if (!rowInfo) {
                    return;
                }

                rowInfo
                    .row
                    .dataset
                    .status =
                    result.status;

                rowInfo
                    .statusBadge
                    .className =
                    `status-badge status-${result.status}`;

                rowInfo
                    .statusBadge
                    .textContent =
                    result.status
                        .charAt(0)
                        .toUpperCase() +
                    result.status
                        .slice(1);

                rowInfo
                    .httpCell
                    .textContent =
                    result.httpStatus
                        ? String(
                            result.httpStatus
                        )
                        : '';

                rowInfo
                    .noteCell
                    .textContent =
                    result.note ||
                    '';

                applyFilter();
            }
        };
    }

    /*
     * ============================================================
     * Concurrency pool
     * ============================================================
     */

    async function runPool(
        items,
        worker,
        concurrency
    ) {
        let cursor =
            0;

        async function runner() {
            while (true) {
                const index =
                    cursor++;

                if (
                    index >=
                    items.length
                ) {
                    return;
                }

                await worker(
                    items[index],
                    index
                );
            }
        }

        await Promise.all(
            Array.from(
                {
                    length:
                        Math.min(
                            concurrency,
                            Math.max(
                                items.length,
                                1
                            )
                        )
                },

                () =>
                    runner()
            )
        );
    }

    /*
     * ============================================================
     * Main checker
     * ============================================================
     */

    let running =
        false;

    async function checkVisibleLinks(
        mode
    ) {
        if (running) {
            return;
        }

        running =
            true;

        try {
            clearPreviousMarks();

            const records =
                collectVisibleResources(
                    mode
                );

            records.forEach(
                record => {
                    applyElementStatus(
                        record,
                        'checking'
                    );
                }
            );

            const ui =
                createReport(
                    records,
                    mode
                );

            const cache =
                new Map();

            const counts = {
                valid:
                    0,

                invalid:
                    0,

                skipped:
                    0
            };

            let done =
                0;

            if (
                !records.length
            ) {
                ui.updateProgress(
                    0,
                    counts
                );

                return;
            }

            await runPool(
                records,

                async (
                    record,
                    index
                ) => {
                    const result =
                        await validateRecord(
                            record,
                            cache
                        );

                    record.result =
                        result;

                    applyElementStatus(
                        record,
                        result.status
                    );

                    counts[
                        result.status
                    ] += 1;

                    done +=
                        1;

                    ui.updateRow(
                        index,
                        result
                    );

                    ui.updateProgress(
                        done,
                        counts
                    );
                },

                CONFIG.concurrency
            );
        } finally {
            running =
                false;
        }
    }

    /*
     * ============================================================
     * Tampermonkey menu
     * ============================================================
     *
     * Nothing runs automatically.
     */

    GM_registerMenuCommand(
        '檢查目前頁面的所有連結',
        () =>
            checkVisibleLinks(
                'all'
            )
    );

    GM_registerMenuCommand(
        '檢查目前頁面的外部連結 (不含本站連結)',
        () =>
            checkVisibleLinks(
                'external'
            )
    );

})();