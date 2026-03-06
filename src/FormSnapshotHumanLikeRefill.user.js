// ==UserScript==
// @name         表單快照與人類模擬回填
// @version      0.2.0
// @description  透過選單命令儲存目前頁面表單快照，可人類化回填，並支援匯出/匯入全部快照資料以跨電腦移轉
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/FormSnapshotHumanLikeRefill.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/FormSnapshotHumanLikeRefill.user.js
// @author       Will Huang
// @match        *://*/*
// @run-at       document-idle
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_listValues
// ==/UserScript==

(function () {
    'use strict';

    const SCRIPT_SCOPE = 'FormSnapshotHumanLikeRefill';
    const SNAPSHOT_SCHEMA_VERSION = 1;
    const EXPORT_SCHEMA_VERSION = 1;
    const EXPORT_PAYLOAD_TYPE = `${SCRIPT_SCOPE}:all-settings`;
    const SCRIPT_STORAGE_KEY_PREFIX = `${SCRIPT_SCOPE}:`;
    const STORAGE_KEY_PREFIX = `${SCRIPT_SCOPE}:snapshot`;
    const SNAPSHOT_STORAGE_KEY_PREFIX = `${STORAGE_KEY_PREFIX}:`;
    const SNAPSHOT_INDEX_STORAGE_KEY = `${SCRIPT_SCOPE}:snapshot-index`;

    const STYLE_ID = 'tm-form-snapshot-style';
    const HIGHLIGHT_CLASS = 'tm-form-snapshot-highlight';
    const TOAST_ID = 'tm-form-snapshot-toast';

    const BASE_FORM_FIELD_SELECTOR = 'input, textarea, select, [contenteditable]:not([contenteditable="false"])';
    const CUSTOM_SELECT_FIELD_SELECTOR = '[role="combobox"], [aria-haspopup="listbox"], [role="listbox"]';
    const FORM_FIELD_SELECTOR = `${BASE_FORM_FIELD_SELECTOR}, ${CUSTOM_SELECT_FIELD_SELECTOR}`;

    const CUSTOM_SELECT_LISTBOX_SELECTOR = [
        '[role="listbox"]',
        '.mat-mdc-select-panel',
        '.mat-select-panel',
        '.ng-dropdown-panel',
        '.ant-select-dropdown',
        '[id*="listbox"]'
    ].join(', ');

    const CUSTOM_SELECT_OPTION_SELECTOR = [
        '[role="option"]',
        '.mat-mdc-option',
        '.mat-option',
        '.ng-option',
        '.ant-select-item-option',
        '[data-value]'
    ].join(', ');

    const INPUT_TYPES_TO_SKIP = new Set(['hidden', 'submit', 'reset', 'button', 'image', 'file']);
    const TEXT_LIKE_INPUT_TYPES = new Set([
        'text', 'search', 'url', 'tel', 'email', 'password',
        'number', 'date', 'datetime-local', 'month', 'time', 'week'
    ]);

    const FIELD_TYPING_DELAY = { min: 18, max: 56 };
    const FIELD_GAP_DELAY = { min: 350, max: 900 };
    const FIELD_GAP_DELAY_FAST = { min: 150, max: 400 };
    const FIELD_FINALIZE_DELAY = { min: 160, max: 420 };
    const FIELD_FINALIZE_DELAY_FAST = { min: 80, max: 220 };
    const APPLY_POST_CHECK_TOAST_DURATION_MS = 60000;

    const CUSTOM_SELECT_OPEN_TIMEOUT_MS = 4000;
    const CUSTOM_SELECT_OPTION_TIMEOUT_MS = 6000;

    const APPLY_ABORT_ERROR_NAME = 'FormSnapshotApplyAbortedError';
    const APPLY_ABORT_ERROR_MESSAGE = '[FormSnapshot] 回填已由使用者中止';
    const APPLY_ABORT_KEY = 'Escape';

    let isApplyingSnapshot = false;
    let applyAbortRequested = false;
    let detachApplyAbortListener = null;

    injectStyles();
    registerMenuCommands();

    function registerMenuCommands() {
        if (typeof GM_registerMenuCommand !== 'function') {
            console.warn('[FormSnapshot] GM_registerMenuCommand 不可用，已略過選單註冊。');
            return;
        }

        GM_registerMenuCommand('📸 將目前表單欄位進行快照（依網址）', handleCreateSnapshot);
        GM_registerMenuCommand('🧩 將先前快照表單欄位回填（模擬輸入）', () => {
            void handleApplySnapshot();
        });
        GM_registerMenuCommand('📤 匯出所有網站快照設定（JSON）', () => {
            void handleExportAllSettings();
        });
        GM_registerMenuCommand('📥 匯入所有網站快照設定（JSON）', () => {
            void handleImportAllSettings();
        });
    }

    function handleCreateSnapshot() {
        const fields = getFormFields();

        if (fields.length === 0) {
            showToast('⚠️ 目前頁面找不到可快照的表單欄位。', { duration: 3000, closable: true });
            return;
        }

        const snapshot = {
            schemaVersion: SNAPSHOT_SCHEMA_VERSION,
            createdAt: new Date().toISOString(),
            url: location.href,
            fields: fields
                .map((field, globalIndex) => createFieldSnapshot(field, globalIndex))
                .filter(Boolean),
        };

        const saveOk = saveSnapshotForCurrentUrl(snapshot);
        if (!saveOk) {
            showToast('❌ 快照儲存失敗，請檢查 Console 訊息。', { duration: 3500, closable: true });
            return;
        }

        showToast(`✅ 已儲存 ${snapshot.fields.length} 個欄位快照（僅此網址）。`, {
            duration: 3000,
            closable: true,
        });
    }

    async function handleApplySnapshot() {
        if (isApplyingSnapshot) {
            showToast('⏳ 目前正在回填中，請稍候。', { duration: 2200, closable: true });
            return;
        }

        const snapshot = loadSnapshotForCurrentUrl();
        if (!snapshot || !Array.isArray(snapshot.fields) || snapshot.fields.length === 0) {
            showToast('⚠️ 找不到此網址的快照，請先執行「快照」命令。', { duration: 3200, closable: true });
            return;
        }

        isApplyingSnapshot = true;
        beginApplyAbortMonitoring();

        const stats = {
            total: snapshot.fields.length,
            applied: 0,
            skipped: 0,
            ignoredErrors: 0,
            retried: 0,
            readonlySynced: 0,
        };

        const FIRST_PASS_FIELD_WAIT_MS = 7000;
        const RETRY_PASS_FIELD_WAIT_MS = 15000;
        const RETRY_PASS_START_DELAY_MS = 220;

        const retryQueue = [];

        const applySingleField = async (fieldSnapshot, waitTimeoutMs) => {
            const element = await waitForTruthy(() => {
                const candidate = findElementByLocator(fieldSnapshot.locator);
                return candidate && canFillElement(candidate) ? candidate : null;
            }, { timeoutMs: waitTimeoutMs, intervalMs: 120 });

            if (!element) {
                return { status: 'not-found' };
            }

            if (isFieldAlreadyMatchingSnapshot(element, fieldSnapshot)) {
                return { status: 'already-matched' };
            }

            const applied = await applyFieldSnapshot(element, fieldSnapshot);
            return { status: applied ? 'applied' : 'not-applied' };
        };

        try {
            for (const [fieldIndex, fieldSnapshot] of snapshot.fields.entries()) {
                throwIfApplyAbortRequested();

                try {
                    if (!fieldSnapshot || typeof fieldSnapshot !== 'object') {
                        stats.skipped++;
                        continue;
                    }

                    if (fieldSnapshot.kind === 'radio' && !fieldSnapshot.checked) {
                        continue;
                    }

                    const firstPass = await applySingleField(fieldSnapshot, FIRST_PASS_FIELD_WAIT_MS);
                    if (firstPass.status === 'not-found' || firstPass.status === 'not-applied') {
                        retryQueue.push({ fieldIndex, fieldSnapshot });
                        continue;
                    }

                    if (firstPass.status === 'already-matched') {
                        continue;
                    }

                    if (firstPass.status === 'applied') {
                        stats.applied++;
                        const gapDelay = getGapDelayRangeByFieldKind(fieldSnapshot.kind);
                        await sleep(randomInt(gapDelay.min, gapDelay.max));
                        throwIfApplyAbortRequested();
                    }
                } catch (error) {
                    if (isApplyAbortError(error)) {
                        throw error;
                    }

                    stats.skipped++;
                    stats.ignoredErrors++;
                    console.warn(`[FormSnapshot] 第 ${fieldIndex + 1} 欄回填失敗，已自動略過。`, error, fieldSnapshot);
                }
            }

            const shouldRunReadonlySync = hasReadonlySyncProbeTargets(snapshot.fields);

            if (retryQueue.length > 0 || shouldRunReadonlySync) {
                showApplyCheckingToast({
                    retryCount: retryQueue.length,
                    willRunReadonlySync: shouldRunReadonlySync,
                });
            }

            if (retryQueue.length > 0) {
                stats.retried = retryQueue.length;
                await sleep(RETRY_PASS_START_DELAY_MS);
            }

            for (const { fieldIndex, fieldSnapshot } of retryQueue) {
                throwIfApplyAbortRequested();

                try {
                    if (!fieldSnapshot || typeof fieldSnapshot !== 'object') {
                        stats.skipped++;
                        continue;
                    }

                    const retryPass = await applySingleField(fieldSnapshot, RETRY_PASS_FIELD_WAIT_MS);
                    if (retryPass.status === 'applied') {
                        stats.applied++;
                        const gapDelay = getGapDelayRangeByFieldKind(fieldSnapshot.kind);
                        await sleep(randomInt(gapDelay.min, gapDelay.max));
                        throwIfApplyAbortRequested();
                        continue;
                    }

                    if (retryPass.status === 'already-matched') {
                        continue;
                    }

                    stats.skipped++;
                } catch (error) {
                    if (isApplyAbortError(error)) {
                        throw error;
                    }

                    stats.skipped++;
                    stats.ignoredErrors++;
                    console.warn(`[FormSnapshot] 第 ${fieldIndex + 1} 欄重試回填失敗，已自動略過。`, error, fieldSnapshot);
                }
            }

            const readonlySynced = shouldRunReadonlySync
                ? await syncReadonlySnapshotFields(snapshot.fields)
                : 0;
            if (readonlySynced > 0) {
                stats.readonlySynced = readonlySynced;
                stats.applied += readonlySynced;
                stats.skipped = Math.max(0, stats.skipped - readonlySynced);
            }

            const ignoredErrorHint = stats.ignoredErrors > 0
                ? `（容錯略過 ${stats.ignoredErrors} 次錯誤）`
                : '';

            const retryHint = stats.retried > 0
                ? `（重試 ${stats.retried} 欄）`
                : '';

            const readonlyHint = stats.readonlySynced > 0
                ? `（readonly 後補 ${stats.readonlySynced} 欄）`
                : '';

            showToast(`🎉 回填完成：成功 ${stats.applied} 欄，略過 ${stats.skipped} 欄${retryHint}${readonlyHint}${ignoredErrorHint}。`, {
                duration: 3000,
                closable: true,
            });
        } catch (error) {
            if (isApplyAbortError(error)) {
                showToast('⏹️ 已停止回填（Esc）。', { duration: 2200, closable: true });
            } else {
                console.error('[FormSnapshot] 回填過程發生錯誤：', error);
                showToast('❌ 回填過程發生錯誤，請查看 Console。', { duration: 3500, closable: true });
            }
        } finally {
            endApplyAbortMonitoring();
            isApplyingSnapshot = false;
        }
    }

    function beginApplyAbortMonitoring() {
        applyAbortRequested = false;

        if (typeof detachApplyAbortListener === 'function') {
            detachApplyAbortListener();
        }

        const onKeyDown = (event) => {
            if (!isApplyingSnapshot) return;
            if (event.key !== APPLY_ABORT_KEY) return;
            if (applyAbortRequested) return;

            applyAbortRequested = true;
            showToast('⏹️ 偵測到 Esc，正在停止回填...', { duration: 1200, closable: true });
        };

        window.addEventListener('keydown', onKeyDown, true);
        detachApplyAbortListener = () => {
            window.removeEventListener('keydown', onKeyDown, true);
        };
    }

    function endApplyAbortMonitoring() {
        if (typeof detachApplyAbortListener === 'function') {
            detachApplyAbortListener();
        }

        detachApplyAbortListener = null;
        applyAbortRequested = false;
    }

    function createApplyAbortError() {
        const error = new Error(APPLY_ABORT_ERROR_MESSAGE);
        error.name = APPLY_ABORT_ERROR_NAME;
        return error;
    }

    function throwIfApplyAbortRequested() {
        if (applyAbortRequested) {
            throw createApplyAbortError();
        }
    }

    function isApplyAbortError(error) {
        return !!error && error.name === APPLY_ABORT_ERROR_NAME;
    }

    async function handleExportAllSettings() {
        const payload = buildAllSettingsExportPayload();
        if (!payload) {
            showToast('⚠️ 目前沒有可匯出的快照資料。', { duration: 3000, closable: true });
            return;
        }

        const jsonText = JSON.stringify(payload, null, 2);
        const fileName = `${SCRIPT_SCOPE}-settings-${formatExportTimestamp(new Date())}.json`;

        const downloaded = downloadTextFile(fileName, jsonText);
        const copied = await tryWriteTextToClipboard(jsonText);

        if (downloaded && copied) {
            showToast(`✅ 已匯出 ${payload.totalEntries} 筆設定，並下載檔案與複製到剪貼簿。`, {
                duration: 3200,
                closable: true,
            });
            return;
        }

        if (downloaded) {
            showToast(`✅ 已匯出 ${payload.totalEntries} 筆設定並下載 JSON 檔案。`, {
                duration: 3200,
                closable: true,
            });
            return;
        }

        if (copied) {
            showToast(`✅ 已匯出 ${payload.totalEntries} 筆設定並複製到剪貼簿。`, {
                duration: 3200,
                closable: true,
            });
            return;
        }

        prompt('無法自動下載/複製，請手動複製以下 JSON：', jsonText);
        showToast('⚠️ 已提供手動複製視窗，請自行保存 JSON。', { duration: 3200, closable: true });
    }

    async function handleImportAllSettings() {
        const useFilePicker = confirm('按「確定」選擇 JSON 檔匯入；按「取消」改為直接貼上 JSON 文字。');

        let jsonText = '';
        if (useFilePicker) {
            try {
                jsonText = await pickJsonFileText();
            } catch (error) {
                console.error('[FormSnapshot] 讀取匯入檔案失敗：', error);
                showToast('❌ 讀取匯入檔案失敗，請查看 Console。', { duration: 3500, closable: true });
                return;
            }

            if (!jsonText) {
                showToast('ℹ️ 已取消匯入。', { duration: 1800, closable: true });
                return;
            }
        } else {
            const pasted = prompt('請貼上匯出 JSON 內容：', '');
            if (!pasted || !pasted.trim()) {
                showToast('ℹ️ 已取消匯入。', { duration: 1800, closable: true });
                return;
            }

            jsonText = pasted;
        }

        let payload;
        try {
            payload = JSON.parse(jsonText);
        } catch (error) {
            showToast('❌ 匯入內容不是有效的 JSON 格式。', { duration: 3200, closable: true });
            return;
        }

        const entries = extractImportEntries(payload);
        if (entries.length === 0) {
            showToast('⚠️ 找不到可匯入的快照設定內容。', { duration: 3200, closable: true });
            return;
        }

        if (!confirm(`即將匯入 ${entries.length} 筆設定，既有同鍵資料會被覆蓋，是否繼續？`)) {
            showToast('ℹ️ 已取消匯入。', { duration: 1800, closable: true });
            return;
        }

        let successCount = 0;
        let failedCount = 0;

        for (const entry of entries) {
            const ok = saveStorageValueByKey(entry.key, entry.value, { silent: true });
            if (ok) {
                successCount++;
            } else {
                failedCount++;
            }
        }

        refreshSnapshotIndexFromStorage();

        showToast(`✅ 匯入完成：成功 ${successCount} 筆，失敗 ${failedCount} 筆。`, {
            duration: 3500,
            closable: true,
        });
    }

    function createFieldSnapshot(element, globalIndex) {
        const kind = getFieldKind(element);
        if (!kind) return null;

        const locator = buildLocator(element, globalIndex);
        const base = {
            kind,
            locator,
            tagName: element.tagName.toLowerCase(),
        };

        if (kind === 'custom-select-one') {
            const value = getCustomSelectCurrentValue(element);
            const displayText = getCustomSelectCurrentDisplayText(element);
            base.role = element.getAttribute('role') || '';
            base.value = value;
            base.displayText = displayText;
            base.searchText = displayText || value;
            return base;
        }

        if (element instanceof HTMLInputElement) {
            const inputType = (element.type || 'text').toLowerCase();
            base.inputType = inputType;

            if (inputType === 'radio') {
                if (!element.checked) return null;
                base.checked = true;
                base.value = element.value || '';
                return base;
            }

            if (inputType === 'checkbox') {
                base.checked = !!element.checked;
                base.value = element.value || '';
                return base;
            }

            base.value = element.value ?? '';
            return base;
        }

        if (element instanceof HTMLTextAreaElement) {
            base.value = element.value ?? '';
            return base;
        }

        if (element instanceof HTMLSelectElement) {
            if (element.multiple) {
                base.selectedValues = Array.from(element.selectedOptions).map((option) => option.value);
            } else {
                base.value = element.value ?? '';
            }
            return base;
        }

        base.value = element.textContent ?? '';
        return base;
    }

    function buildLocator(element, globalIndex) {
        const tagName = element.tagName.toLowerCase();
        const name = element.getAttribute('name') || '';

        return {
            id: element.id || '',
            name,
            tagName,
            globalIndex,
            sameNameIndex: name ? getSameNameIndex(element, tagName, name) : -1,
            cssPath: buildCssPath(element),
            placeholder: element.getAttribute('placeholder') || '',
            ariaLabel: element.getAttribute('aria-label') || '',
            role: (element.getAttribute('role') || '').toLowerCase(),
            dataTestId: element.getAttribute('data-testid') || element.getAttribute('data-test-id') || '',
        };
    }

    function getSameNameIndex(target, tagName, name) {
        const sameNameElements = queryElementsByTagName(tagName)
            .filter((node) => node.getAttribute('name') === name)
            .filter((node) => isElementInVisibleTree(node));
        return sameNameElements.indexOf(target);
    }

    function normalizeLocator(locator) {
        if (!locator || typeof locator !== 'object') return null;

        return {
            id: normalizeLocatorString(locator.id, 512),
            name: normalizeLocatorString(locator.name, 512),
            tagName: normalizeTagName(locator.tagName),
            globalIndex: normalizeNonNegativeInteger(locator.globalIndex, -1),
            sameNameIndex: normalizeNonNegativeInteger(locator.sameNameIndex, -1),
            cssPath: normalizeLocatorString(locator.cssPath, 4096),
            role: normalizeLocatorString(locator.role, 128).toLowerCase(),
            ariaLabel: normalizeLocatorString(locator.ariaLabel, 512),
            dataTestId: normalizeLocatorString(locator.dataTestId, 512),
        };
    }

    function normalizeLocatorString(value, maxLength = 1024) {
        if (typeof value !== 'string') return '';

        const trimmed = value.trim();
        if (!trimmed) return '';

        return trimmed.slice(0, maxLength);
    }

    function normalizeTagName(tagName) {
        const normalized = normalizeLocatorString(tagName, 64).toLowerCase();
        if (!normalized) return '';

        if (!/^[a-z][a-z0-9-]*$/.test(normalized)) {
            return '';
        }

        return normalized;
    }

    function normalizeNonNegativeInteger(value, fallback = -1) {
        const numeric = Number(value);
        if (!Number.isInteger(numeric) || numeric < 0) {
            return fallback;
        }

        return numeric;
    }

    function queryElementsByTagName(tagName) {
        const normalizedTagName = normalizeTagName(tagName);
        if (!normalizedTagName) return [];

        try {
            return Array.from(document.getElementsByTagName(normalizedTagName))
                .filter((node) => node instanceof HTMLElement);
        } catch (error) {
            return [];
        }
    }

    function queryElementsByAttribute(attribute, value) {
        const safeAttribute = normalizeLocatorString(attribute, 128);
        const safeValue = normalizeLocatorString(value, 512);
        if (!safeAttribute || !safeValue) return [];

        try {
            const selector = `[${safeAttribute}="${safeCssEscape(safeValue)}"]`;
            return Array.from(document.querySelectorAll(selector))
                .filter((node) => node instanceof HTMLElement);
        } catch (error) {
            return [];
        }
    }

    function findElementByLocator(locator) {
        const normalizedLocator = normalizeLocator(locator);
        if (!normalizedLocator) return null;

        if (normalizedLocator.id) {
            const byId = document.getElementById(normalizedLocator.id);
            if (isLocatorMatchedElement(byId, normalizedLocator)) return byId;
        }

        if (normalizedLocator.name && normalizedLocator.tagName) {
            const byName = queryElementsByTagName(normalizedLocator.tagName)
                .filter((node) => node.getAttribute('name') === normalizedLocator.name)
                .filter((node) => isElementInVisibleTree(node));

            if (normalizedLocator.sameNameIndex >= 0 && normalizedLocator.sameNameIndex < byName.length) {
                const exact = byName[normalizedLocator.sameNameIndex];
                if (isLocatorMatchedElement(exact, normalizedLocator)) return exact;
            }

            if (byName.length > 0) {
                const first = byName[0];
                if (isLocatorMatchedElement(first, normalizedLocator, true)) return first;
            }
        }

        const roleAriaCandidate = findElementByRoleAriaLocator(normalizedLocator);
        if (roleAriaCandidate) return roleAriaCandidate;

        if (normalizedLocator.cssPath) {
            try {
                const byPath = document.querySelector(normalizedLocator.cssPath);
                if (isLocatorMatchedElement(byPath, normalizedLocator, true)) return byPath;
            } catch (error) {
                // ignore
            }
        }

        const fields = getFormFields();
        if (normalizedLocator.globalIndex >= 0 && normalizedLocator.globalIndex < fields.length) {
            return fields[normalizedLocator.globalIndex];
        }

        return null;
    }

    function findElementByRoleAriaLocator(locator) {
        if (!locator || typeof locator !== 'object') return null;
        if (!locator.role && !locator.ariaLabel && !locator.dataTestId) return null;

        const candidates = [];
        const seen = new Set();
        const append = (items) => {
            items.forEach((item) => {
                if (!(item instanceof HTMLElement)) return;
                if (seen.has(item)) return;
                seen.add(item);
                candidates.push(item);
            });
        };

        if (locator.dataTestId) {
            append(queryElementsByAttribute('data-testid', locator.dataTestId));
            append(queryElementsByAttribute('data-test-id', locator.dataTestId));
        }

        if (locator.role) {
            append(queryElementsByAttribute('role', locator.role));
        }

        if (locator.ariaLabel) {
            append(queryElementsByAttribute('aria-label', locator.ariaLabel));
        }

        for (const candidate of candidates) {
            if (isLocatorMatchedElement(candidate, locator, true) && isElementInVisibleTree(candidate)) {
                return candidate;
            }
        }

        for (const candidate of candidates) {
            if (isLocatorMatchedElement(candidate, locator, true)) {
                return candidate;
            }
        }

        return null;
    }

    function isLocatorMatchedElement(element, locator, loose = false) {
        if (!(element instanceof HTMLElement)) return false;

        const tagMatches = !locator.tagName || element.tagName.toLowerCase() === locator.tagName;
        if (!tagMatches) return false;

        const elementName = element.getAttribute('name') || '';
        const elementRole = (element.getAttribute('role') || '').toLowerCase();
        const elementAriaLabel = element.getAttribute('aria-label') || '';
        const elementDataTestId = element.getAttribute('data-testid') || element.getAttribute('data-test-id') || '';

        if (locator.id && element.id && locator.id !== element.id) return false;

        if (!loose && locator.name && elementName !== locator.name) return false;

        if (locator.role) {
            if (!elementRole) {
                if (!loose) return false;
            } else if (elementRole !== locator.role) {
                return false;
            }
        }

        if (locator.ariaLabel) {
            if (!elementAriaLabel) {
                if (!loose) return false;
            } else if (elementAriaLabel !== locator.ariaLabel) {
                return false;
            }
        }

        if (locator.dataTestId) {
            if (!elementDataTestId) {
                if (!loose) return false;
            } else if (elementDataTestId !== locator.dataTestId) {
                return false;
            }
        }

        return true;
    }

    function getFormFields() {
        const all = Array.from(document.querySelectorAll(FORM_FIELD_SELECTOR));
        const unique = [];
        const seen = new Set();

        all.forEach((node) => {
            if (!(node instanceof HTMLElement)) return;
            const candidate = normalizeFieldCandidate(node);
            if (!(candidate instanceof HTMLElement)) return;
            if (seen.has(candidate)) return;
            if (!isSupportedField(candidate)) return;
            seen.add(candidate);
            unique.push(candidate);
        });

        return unique;
    }

    function normalizeFieldCandidate(element) {
        if (!(element instanceof HTMLElement)) return null;

        const customTrigger = resolveCustomSelectTrigger(element);
        if (customTrigger) return customTrigger;

        return element;
    }

    function resolveCustomSelectTrigger(element) {
        if (!(element instanceof HTMLElement)) return null;

        const direct = isCustomSelectElement(element) ? element : null;
        if (direct) {
            const parentCombobox = element.closest('[role="combobox"]');
            if (parentCombobox instanceof HTMLElement && isCustomSelectElement(parentCombobox)) {
                return parentCombobox;
            }
            return direct;
        }

        const closestCombobox = element.closest('[role="combobox"]');
        if (closestCombobox instanceof HTMLElement && isCustomSelectElement(closestCombobox)) {
            return closestCombobox;
        }

        const closestListboxTrigger = element.closest('[aria-haspopup="listbox"]');
        if (closestListboxTrigger instanceof HTMLElement && isCustomSelectElement(closestListboxTrigger)) {
            return closestListboxTrigger;
        }

        return null;
    }

    function isSupportedField(element) {
        if (!(element instanceof HTMLElement)) return false;

        if (element.id === TOAST_ID || element.closest(`#${TOAST_ID}`)) return false;
        if (!isElementInVisibleTree(element)) return false;

        if (element instanceof HTMLInputElement) {
            const type = (element.type || 'text').toLowerCase();
            if (INPUT_TYPES_TO_SKIP.has(type)) return false;
        }

        if (element.isContentEditable) {
            const parentEditable = element.parentElement?.closest('[contenteditable]:not([contenteditable="false"])');
            if (parentEditable && parentEditable !== element) return false;
        }

        return !!getFieldKind(element);
    }

    function canFillElement(element) {
        if (!isSupportedField(element)) return false;
        if (!element.isConnected) return false;
        if (!isElementInVisibleTree(element)) return false;

        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) {
            if (element.disabled) return false;
        }

        if (isCustomSelectElement(element)) {
            if (element.getAttribute('aria-disabled') === 'true') return false;
            if (element.matches('[disabled], .disabled, .is-disabled')) return false;
            if (element.getAttribute('aria-hidden') === 'true') return false;
        }

        if ((element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) && element.readOnly) {
            if (isProgrammaticallyFillableReadonlyField(element)) {
                return true;
            }

            const type = element instanceof HTMLInputElement ? (element.type || 'text').toLowerCase() : 'textarea';
            if (type !== 'checkbox' && type !== 'radio') {
                return false;
            }
        }

        return true;
    }

    function isProgrammaticallyFillableReadonlyField(element) {
        if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) return false;
        if (!element.readOnly) return false;

        if (element instanceof HTMLInputElement) {
            const type = (element.type || 'text').toLowerCase();
            if (type === 'date' || type === 'datetime-local' || type === 'month' || type === 'week' || type === 'time') {
                return true;
            }
        }

        if (element.hasAttribute('data-mat-calendar')) return true;
        if ((element.getAttribute('aria-haspopup') || '').toLowerCase() === 'dialog') return true;
        if (element.classList.contains('mat-datepicker-input')) return true;

        return false;
    }

    function getFieldKind(element) {
        if (element instanceof HTMLInputElement) {
            const type = (element.type || 'text').toLowerCase();
            if (type === 'checkbox') return 'checkbox';
            if (type === 'radio') return 'radio';
            return 'input';
        }

        if (element instanceof HTMLTextAreaElement) return 'textarea';
        if (element instanceof HTMLSelectElement) return element.multiple ? 'select-multiple' : 'select-one';
        if (isCustomSelectElement(element)) return 'custom-select-one';
        if (element.isContentEditable) return 'contenteditable';

        return null;
    }

    function isCustomSelectElement(element) {
        if (!(element instanceof HTMLElement)) return false;
        if (element instanceof HTMLSelectElement) return false;

        const role = (element.getAttribute('role') || '').toLowerCase();
        const hasListboxPopup = (element.getAttribute('aria-haspopup') || '').toLowerCase() === 'listbox';

        if (role === 'combobox') return true;
        if (role === 'listbox') {
            return isLikelyCustomSelectTriggerListbox(element);
        }
        if (!hasListboxPopup) return false;

        if (role === 'option') return false;
        if (element.closest('[role="option"]')) return false;

        return true;
    }

    function isLikelyCustomSelectTriggerListbox(element) {
        if (!(element instanceof HTMLElement)) return false;
        if ((element.getAttribute('role') || '').toLowerCase() !== 'listbox') return false;
        if (element.closest('[role="option"]')) return false;
        if (element.matches(CUSTOM_SELECT_OPTION_SELECTOR)) return false;
        if (isInsideCustomSelectOverlay(element)) return false;

        const hasFocusable = element.hasAttribute('tabindex') || element.tabIndex >= 0;
        const hasTriggerAria = (
            element.hasAttribute('aria-haspopup') ||
            element.hasAttribute('aria-expanded') ||
            element.hasAttribute('aria-controls') ||
            element.hasAttribute('aria-owns')
        );
        if (hasFocusable || hasTriggerAria) return true;

        // 某些網站的 trigger 會是 listbox，且只渲染「目前選項」一個 option。
        const optionCount = element.querySelectorAll('[role="option"]').length;
        return optionCount <= 1;
    }

    function isInsideCustomSelectOverlay(element) {
        if (!(element instanceof HTMLElement)) return false;

        return !!element.closest([
            '.mat-mdc-select-panel',
            '.mat-select-panel',
            '.ng-dropdown-panel',
            '.ant-select-dropdown',
            '[data-popper-placement]',
            '.cdk-overlay-pane'
        ].join(', '));
    }

    async function applyFieldSnapshot(element, fieldSnapshot) {
        if (!(element instanceof HTMLElement) || !element.isConnected) {
            return false;
        }

        const stopHighlight = highlightElement(element);

        try {
            throwIfApplyAbortRequested();
            safeScrollIntoView(element);
            await sleep(randomInt(60, 130));
            throwIfApplyAbortRequested();

            if (!element.isConnected) {
                return false;
            }

            switch (fieldSnapshot.kind) {
                case 'checkbox':
                    return await applyCheckboxValue(element, !!fieldSnapshot.checked);

                case 'radio':
                    if (!fieldSnapshot.checked) return true;
                    return await applyRadioValue(element, true);

                case 'select-one':
                case 'select-multiple':
                    return await applySelectValue(element, fieldSnapshot);

                case 'custom-select-one':
                    return await applyCustomSelectOneValue(element, fieldSnapshot);

                case 'contenteditable':
                    return await applyContentEditableValue(element, String(fieldSnapshot.value ?? ''));

                case 'textarea':
                case 'input':
                default:
                    return await applyTextLikeValue(element, String(fieldSnapshot.value ?? ''));
            }
        } finally {
            const finalizeDelay = getFinalizeDelayRangeByFieldKind(fieldSnapshot.kind);
            await sleep(randomInt(finalizeDelay.min, finalizeDelay.max));
            stopHighlight();
        }
    }

    async function applyTextLikeValue(element, targetValue) {
        if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) || !element.isConnected) {
            return false;
        }

        throwIfApplyAbortRequested();

        const inputType = element instanceof HTMLInputElement ? (element.type || 'text').toLowerCase() : 'textarea';
        const shouldTypeCharByChar = !element.readOnly && (
            element instanceof HTMLTextAreaElement || TEXT_LIKE_INPUT_TYPES.has(inputType)
        );

        simulatePointerHoverSequence(element);
        simulatePointerClickSequence(element, { invokeNativeClick: false });
        safeFocusElement(element);
        dispatchSimpleEvent(element, 'focusin');

        if (shouldTypeCharByChar) {
            await clearTextLikeValue(element);
            throwIfApplyAbortRequested();

            await typeTextLikeCharacters(element, targetValue);
        } else {
            setTextLikeValue(element, targetValue);
            dispatchInputEvent(element, null, 'insertReplacementText');
        }

        dispatchSimpleEvent(element, 'change');
        dispatchSimpleEvent(element, 'blur');
        safeBlurElement(element);

        return true;
    }

    async function typeTextLikeCharacters(element, targetValue) {
        for (const char of targetValue) {
            throwIfApplyAbortRequested();
            dispatchKeyboardEvent(element, 'keydown', char);
            dispatchKeyboardEvent(element, 'keypress', char);
            dispatchBeforeInputEvent(element, char, 'insertText');

            const nextValue = `${getTextLikeValue(element)}${char}`;
            setTextLikeValue(element, nextValue);

            dispatchInputEvent(element, char, 'insertText');
            dispatchKeyboardEvent(element, 'keyup', char);

            await sleep(randomInt(FIELD_TYPING_DELAY.min, FIELD_TYPING_DELAY.max));
            throwIfApplyAbortRequested();
        }
    }

    async function clearTextLikeValue(element) {
        if (!element.isConnected) return;

        throwIfApplyAbortRequested();
        const current = getTextLikeValue(element);
        if (!current) return;

        dispatchKeyboardEvent(element, 'keydown', 'a', { ctrlKey: true });
        dispatchKeyboardEvent(element, 'keyup', 'a', { ctrlKey: true });
        dispatchKeyboardEvent(element, 'keydown', 'Delete');
        dispatchBeforeInputEvent(element, null, 'deleteContentBackward');

        setTextLikeValue(element, '');
        dispatchInputEvent(element, null, 'deleteContentBackward');
        dispatchKeyboardEvent(element, 'keyup', 'Delete');

        await sleep(randomInt(30, 70));
        throwIfApplyAbortRequested();
    }

    async function applyContentEditableValue(element, targetValue) {
        if (!(element instanceof HTMLElement) || !element.isContentEditable || !element.isConnected) return false;

        throwIfApplyAbortRequested();

        simulatePointerHoverSequence(element);
        simulatePointerClickSequence(element, { invokeNativeClick: false });
        safeFocusElement(element);
        dispatchSimpleEvent(element, 'focusin');

        const current = element.textContent ?? '';
        if (current.length > 0) {
            dispatchKeyboardEvent(element, 'keydown', 'Delete');
            dispatchBeforeInputEvent(element, null, 'deleteContentBackward');
            element.textContent = '';
            dispatchInputEvent(element, null, 'deleteContentBackward');
            dispatchKeyboardEvent(element, 'keyup', 'Delete');
            await sleep(randomInt(30, 70));
            throwIfApplyAbortRequested();
        }

        for (const char of targetValue) {
            throwIfApplyAbortRequested();
            dispatchKeyboardEvent(element, 'keydown', char);
            dispatchKeyboardEvent(element, 'keypress', char);
            dispatchBeforeInputEvent(element, char, 'insertText');

            element.textContent = `${element.textContent ?? ''}${char}`;

            dispatchInputEvent(element, char, 'insertText');
            dispatchKeyboardEvent(element, 'keyup', char);

            await sleep(randomInt(FIELD_TYPING_DELAY.min, FIELD_TYPING_DELAY.max));
            throwIfApplyAbortRequested();
        }

        dispatchSimpleEvent(element, 'change');
        dispatchSimpleEvent(element, 'blur');
        safeBlurElement(element);
        return true;
    }

    async function applyCheckboxValue(element, targetChecked) {
        if (!(element instanceof HTMLInputElement) || element.type.toLowerCase() !== 'checkbox' || !element.isConnected) return false;

        throwIfApplyAbortRequested();

        simulatePointerHoverSequence(element);
        safeFocusElement(element);
        dispatchSimpleEvent(element, 'focusin');

        if (element.checked !== targetChecked) {
            simulatePointerClickSequence(element);

            if (element.checked !== targetChecked) {
                setNativeChecked(element, targetChecked);
                dispatchInputEvent(element, null, 'insertReplacementText');
                dispatchSimpleEvent(element, 'change');
            }
        }

        dispatchSimpleEvent(element, 'blur');
        safeBlurElement(element);
        await sleep(randomInt(30, 70));
        throwIfApplyAbortRequested();
        return true;
    }

    async function applyRadioValue(element, targetChecked) {
        if (!(element instanceof HTMLInputElement) || element.type.toLowerCase() !== 'radio' || !element.isConnected) return false;
        if (!targetChecked) return true;

        throwIfApplyAbortRequested();

        simulatePointerHoverSequence(element);
        safeFocusElement(element);
        dispatchSimpleEvent(element, 'focusin');

        if (!element.checked) {
            simulatePointerClickSequence(element);

            if (!element.checked) {
                setNativeChecked(element, true);
                dispatchInputEvent(element, null, 'insertReplacementText');
                dispatchSimpleEvent(element, 'change');
            }
        }

        dispatchSimpleEvent(element, 'blur');
        safeBlurElement(element);
        await sleep(randomInt(30, 70));
        throwIfApplyAbortRequested();
        return true;
    }

    async function applySelectValue(element, fieldSnapshot) {
        if (!(element instanceof HTMLSelectElement) || !element.isConnected) return false;

        throwIfApplyAbortRequested();

        if (isFieldAlreadyMatchingSnapshot(element, fieldSnapshot)) {
            return true;
        }

        simulatePointerHoverSequence(element);
        simulatePointerClickSequence(element, { invokeNativeClick: false });
        safeFocusElement(element);
        dispatchSimpleEvent(element, 'focusin');

        if (fieldSnapshot.kind === 'select-multiple') {
            const selected = new Set(Array.isArray(fieldSnapshot.selectedValues) ? fieldSnapshot.selectedValues : []);
            Array.from(element.options).forEach((option) => {
                option.selected = selected.has(option.value);
            });
        } else {
            const targetValue = String(fieldSnapshot.value ?? '');
            setNativeSelectValue(element, targetValue);
        }

        dispatchInputEvent(element, null, 'insertReplacementText');
        dispatchSimpleEvent(element, 'change');
        dispatchSimpleEvent(element, 'blur');
        safeBlurElement(element);

        await sleep(randomInt(30, 70));
        throwIfApplyAbortRequested();
        return true;
    }

    async function applyCustomSelectOneValue(element, fieldSnapshot) {
        if (!(element instanceof HTMLElement) || !isCustomSelectElement(element) || !element.isConnected) {
            return false;
        }

        throwIfApplyAbortRequested();

        const targetValue = normalizeComparableText(String(fieldSnapshot.value ?? ''));
        const targetDisplayText = normalizeComparableText(
            String(fieldSnapshot.displayText ?? fieldSnapshot.searchText ?? fieldSnapshot.value ?? '')
        );

        if (!targetValue && !targetDisplayText) {
            return true;
        }

        simulatePointerHoverSequence(element);
        simulatePointerClickSequence(element, { invokeNativeClick: true });
        safeFocusElement(element);
        dispatchSimpleEvent(element, 'focusin');

        const opened = await openCustomSelectPanel(element);
        if (!opened) {
            dispatchSimpleEvent(element, 'blur');
            safeBlurElement(element);
            return false;
        }

        const targetSearchText = normalizeComparableText(String(fieldSnapshot.searchText ?? targetDisplayText));
        if (targetSearchText) {
            const searchInput = findCustomSelectSearchInput(element);
            if (searchInput instanceof HTMLInputElement || searchInput instanceof HTMLTextAreaElement) {
                await clearTextLikeValue(searchInput);
                await typeTextLikeCharacters(searchInput, targetSearchText);
            }
        }

        const matchingOption = await waitForTruthy(
            () => pickMatchingCustomSelectOption(getVisibleCustomSelectOptions(element), fieldSnapshot),
            { timeoutMs: CUSTOM_SELECT_OPTION_TIMEOUT_MS, intervalMs: 80 }
        );

        if (!(matchingOption instanceof HTMLElement)) {
            dispatchKeyboardEvent(element, 'keydown', 'Escape');
            dispatchKeyboardEvent(element, 'keyup', 'Escape');
            dispatchSimpleEvent(element, 'blur');
            safeBlurElement(element);
            return false;
        }

        simulatePointerHoverSequence(matchingOption);
        simulatePointerClickSequence(matchingOption, { invokeNativeClick: true });

        await sleep(randomInt(50, 120));
        throwIfApplyAbortRequested();

        dispatchInputEvent(element, null, 'insertReplacementText');
        dispatchSimpleEvent(element, 'change');
        dispatchSimpleEvent(element, 'blur');
        safeBlurElement(element);

        const matched = await waitForTruthy(
            () => isCustomSelectElementMatchingSnapshot(element, fieldSnapshot),
            { timeoutMs: 900, intervalMs: 70 }
        );

        return !!matched;
    }

    async function openCustomSelectPanel(element) {
        const baselineOptionKeys = getCustomSelectOptionKeys(getVisibleCustomSelectOptions(element));
        const baselineListboxCount = getVisibleCustomSelectListboxes(element).length;
        const hasOpened = () => {
            if (!element.isConnected) return false;
            if (isCustomSelectExpanded(element)) return true;

            const currentListboxCount = getVisibleCustomSelectListboxes(element).length;
            if (currentListboxCount > baselineListboxCount) return true;

            const currentOptionKeys = getCustomSelectOptionKeys(getVisibleCustomSelectOptions(element));
            if (currentOptionKeys.length === 0) return false;
            if (currentOptionKeys.length !== baselineOptionKeys.length) return true;

            const baselineKeySet = new Set(baselineOptionKeys);
            for (const key of currentOptionKeys) {
                if (!baselineKeySet.has(key)) {
                    return true;
                }
            }

            return false;
        };

        const openedQuickly = await waitForTruthy(hasOpened, { timeoutMs: 220, intervalMs: 40 });
        if (openedQuickly) return true;

        simulatePointerClickSequence(element, { invokeNativeClick: true });
        const openedByClick = await waitForTruthy(hasOpened, { timeoutMs: CUSTOM_SELECT_OPEN_TIMEOUT_MS, intervalMs: 60 });
        if (openedByClick) return true;

        safeFocusElement(element);
        dispatchKeyboardEvent(element, 'keydown', 'ArrowDown');
        dispatchKeyboardEvent(element, 'keyup', 'ArrowDown');

        const keyboardOpened = await waitForTruthy(
            hasOpened,
            { timeoutMs: Math.max(900, Math.floor(CUSTOM_SELECT_OPEN_TIMEOUT_MS / 2)), intervalMs: 60 }
        );
        return !!keyboardOpened;
    }

    function isCustomSelectExpanded(element) {
        if (!(element instanceof HTMLElement)) return false;
        const ariaExpanded = (element.getAttribute('aria-expanded') || '').toLowerCase();
        return ariaExpanded === 'true';
    }

    function findCustomSelectSearchInput(element) {
        if (!(element instanceof HTMLElement)) return null;

        const active = document.activeElement;
        if ((active instanceof HTMLInputElement || active instanceof HTMLTextAreaElement) && isElementVisible(active)) {
            return active;
        }

        const listboxes = getVisibleCustomSelectListboxes(element);
        for (const listbox of listboxes) {
            const inside = listbox.querySelector('input[type="search"], input, textarea, [role="searchbox"]');
            if ((inside instanceof HTMLInputElement || inside instanceof HTMLTextAreaElement) && isElementVisible(inside)) {
                return inside;
            }
        }

        const globalSearch = document.querySelector('input[type="search"]');
        if ((globalSearch instanceof HTMLInputElement) && isElementVisible(globalSearch)) {
            return globalSearch;
        }

        return null;
    }

    function getVisibleCustomSelectListboxes(triggerElement) {
        const candidates = new Set();

        const appendNode = (node) => {
            if (!(node instanceof HTMLElement)) return;
            if (!isElementVisible(node)) return;
            candidates.add(node);
        };

        const bySelector = Array.from(document.querySelectorAll(CUSTOM_SELECT_LISTBOX_SELECTOR));
        bySelector.forEach(appendNode);

        if (triggerElement instanceof HTMLElement) {
            const controlledIds = `${triggerElement.getAttribute('aria-controls') || ''} ${triggerElement.getAttribute('aria-owns') || ''}`
                .trim()
                .split(/\s+/)
                .filter(Boolean);
            controlledIds.forEach((id) => {
                const node = document.getElementById(id);
                if (node) appendNode(node);
            });
        }

        return Array.from(candidates);
    }

    function getVisibleCustomSelectOptions(triggerElement) {
        const options = [];
        const seen = new Set();

        const appendOption = (node) => {
            if (!(node instanceof HTMLElement)) return;
            if (seen.has(node)) return;
            if (!isElementVisible(node)) return;
            if (!isLikelyCustomSelectOption(node)) return;
            if (node.matches('[aria-disabled="true"], .disabled, .is-disabled, [disabled]')) return;
            const text = normalizeComparableText(getElementPrimaryText(node));
            if (!text) return;

            seen.add(node);
            options.push(node);
        };

        const listboxes = getVisibleCustomSelectListboxes(triggerElement);
        listboxes.forEach((listbox) => {
            const found = Array.from(listbox.querySelectorAll(CUSTOM_SELECT_OPTION_SELECTOR));
            found.forEach(appendOption);
        });

        if (options.length === 0) {
            const globalOptions = Array.from(document.querySelectorAll(CUSTOM_SELECT_OPTION_SELECTOR));
            globalOptions.forEach(appendOption);
        }

        return options;
    }

    function getCustomSelectOptionKeys(options) {
        if (!Array.isArray(options)) return [];

        const keys = new Set();
        options.forEach((option) => {
            if (!(option instanceof HTMLElement)) return;

            const key = normalizeComparableText(
                `${getCustomSelectOptionValue(option)}|${getElementPrimaryText(option)}`
            );
            if (key) {
                keys.add(key);
            }
        });

        return Array.from(keys).sort();
    }

    function isLikelyCustomSelectOption(element) {
        if (!(element instanceof HTMLElement)) return false;

        const role = (element.getAttribute('role') || '').toLowerCase();
        if (role === 'option') return true;

        if (
            element.classList.contains('mat-mdc-option') ||
            element.classList.contains('mat-option') ||
            element.classList.contains('ng-option') ||
            element.classList.contains('ant-select-item-option')
        ) {
            return true;
        }

        if (element.hasAttribute('data-value')) {
            return true;
        }

        return false;
    }

    function pickMatchingCustomSelectOption(options, fieldSnapshot) {
        if (!Array.isArray(options) || options.length === 0 || !fieldSnapshot || typeof fieldSnapshot !== 'object') {
            return null;
        }

        const targetValue = normalizeComparableText(String(fieldSnapshot.value ?? ''));
        const targetTextExact = normalizeComparableText(String(fieldSnapshot.displayText ?? fieldSnapshot.searchText ?? fieldSnapshot.value ?? ''));

        if (targetValue) {
            const byValue = options.find((option) => {
                const optionValue = normalizeComparableText(getCustomSelectOptionValue(option));
                return optionValue && optionValue === targetValue;
            });
            if (byValue) return byValue;
        }

        if (targetTextExact) {
            const byTextExact = options.find((option) => normalizeComparableText(getElementPrimaryText(option)) === targetTextExact);
            if (byTextExact) return byTextExact;

            const byTextContains = options.find((option) => normalizeComparableText(getElementPrimaryText(option)).includes(targetTextExact));
            if (byTextContains) return byTextContains;
        }

        return null;
    }

    function isCustomSelectElementMatchingSnapshot(element, fieldSnapshot) {
        if (!(element instanceof HTMLElement) || !isCustomSelectElement(element)) return false;
        if (!fieldSnapshot || typeof fieldSnapshot !== 'object') return false;

        const targetValue = normalizeComparableText(String(fieldSnapshot.value ?? ''));
        const currentValue = normalizeComparableText(getCustomSelectCurrentValue(element));
        if (targetValue && currentValue && targetValue === currentValue) {
            return true;
        }

        const targetText = normalizeComparableText(String(fieldSnapshot.displayText ?? fieldSnapshot.searchText ?? fieldSnapshot.value ?? ''));
        const currentText = normalizeComparableText(getCustomSelectCurrentDisplayText(element));
        if (targetText && currentText && targetText === currentText) {
            return true;
        }

        if (!targetValue && !targetText) {
            return !currentValue && !currentText;
        }

        return false;
    }

    function getCustomSelectCurrentValue(element) {
        if (!(element instanceof HTMLElement)) return '';

        const directValue = element.getAttribute('value') || element.getAttribute('data-value') || element.getAttribute('aria-valuenow') || '';
        if (normalizeComparableText(directValue)) {
            return String(directValue);
        }

        const hiddenInput = element.querySelector('input[type="hidden"], input[hidden], input[aria-hidden="true"]');
        if (hiddenInput instanceof HTMLInputElement && normalizeComparableText(hiddenInput.value)) {
            return hiddenInput.value;
        }

        const activeDescendant = getCustomSelectActiveDescendant(element);
        if (activeDescendant) {
            const activeValue = getCustomSelectOptionValue(activeDescendant);
            if (normalizeComparableText(activeValue)) {
                return String(activeValue);
            }
        }

        return '';
    }

    function getCustomSelectCurrentDisplayText(element) {
        if (!(element instanceof HTMLElement)) return '';

        const ariaValueText = element.getAttribute('aria-valuetext') || '';
        if (normalizeComparableText(ariaValueText)) {
            return ariaValueText;
        }

        const input = element.querySelector('input:not([type="hidden"]), textarea');
        if ((input instanceof HTMLInputElement || input instanceof HTMLTextAreaElement) && normalizeComparableText(input.value)) {
            return input.value;
        }

        const activeDescendant = getCustomSelectActiveDescendant(element);
        if (activeDescendant) {
            const activeText = getElementPrimaryText(activeDescendant);
            if (normalizeComparableText(activeText)) {
                return activeText;
            }
        }

        return getElementPrimaryText(element);
    }

    function getCustomSelectActiveDescendant(element) {
        if (!(element instanceof HTMLElement)) return null;
        const id = element.getAttribute('aria-activedescendant');
        if (!id) return null;
        const node = document.getElementById(id);
        return node instanceof HTMLElement ? node : null;
    }

    function getCustomSelectOptionValue(optionElement) {
        if (!(optionElement instanceof HTMLElement)) return '';

        return String(
            optionElement.getAttribute('value') ||
            optionElement.getAttribute('data-value') ||
            optionElement.getAttribute('data-id') ||
            optionElement.getAttribute('aria-label') ||
            getElementPrimaryText(optionElement)
        );
    }

    function getElementPrimaryText(element) {
        if (!(element instanceof HTMLElement)) return '';

        const visibleText = normalizeComparableText(element.textContent ?? '');
        if (visibleText) {
            return visibleText;
        }

        return normalizeComparableText(element.getAttribute('aria-label') || '');
    }

    function isElementVisible(element) {
        if (!(element instanceof HTMLElement)) return false;

        const style = window.getComputedStyle(element);
        if (style.display === 'none' || style.visibility === 'hidden' || Number(style.opacity) === 0) {
            return false;
        }

        const rect = element.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0) {
            return false;
        }

        return true;
    }

    function isElementInVisibleTree(element) {
        if (!(element instanceof HTMLElement)) return false;
        if (!element.isConnected) return false;

        let current = element;
        while (current && current instanceof HTMLElement) {
            if (current.hidden) return false;
            if (current.getAttribute('aria-hidden') === 'true') return false;

            const style = window.getComputedStyle(current);
            if (style.display === 'none' || style.visibility === 'hidden') {
                return false;
            }

            current = current.parentElement;
        }

        return true;
    }

    function safeFocusElement(element) {
        if (!(element instanceof HTMLElement) || !element.isConnected) return false;

        try {
            element.focus({ preventScroll: true });
            return true;
        } catch (error) {
            try {
                element.focus();
                return true;
            } catch (ignored) {
                return false;
            }
        }
    }

    function safeBlurElement(element) {
        if (!(element instanceof HTMLElement)) return false;

        try {
            element.blur();
            return true;
        } catch (error) {
            return false;
        }
    }

    function isTextLikeFieldKind(kind) {
        return kind === 'input' || kind === 'textarea' || kind === 'contenteditable';
    }

    function getGapDelayRangeByFieldKind(kind) {
        return isTextLikeFieldKind(kind) ? FIELD_GAP_DELAY : FIELD_GAP_DELAY_FAST;
    }

    function getFinalizeDelayRangeByFieldKind(kind) {
        return isTextLikeFieldKind(kind) ? FIELD_FINALIZE_DELAY : FIELD_FINALIZE_DELAY_FAST;
    }

    function isFieldAlreadyMatchingSnapshot(element, fieldSnapshot) {
        if (!fieldSnapshot || typeof fieldSnapshot !== 'object') return false;

        switch (fieldSnapshot.kind) {
            case 'checkbox':
            case 'radio': {
                if (!(element instanceof HTMLInputElement)) return false;
                return element.checked === !!fieldSnapshot.checked;
            }

            case 'select-one': {
                if (!(element instanceof HTMLSelectElement)) return false;
                return element.value === String(fieldSnapshot.value ?? '');
            }

            case 'select-multiple': {
                if (!(element instanceof HTMLSelectElement)) return false;

                const targetValues = new Set(
                    (Array.isArray(fieldSnapshot.selectedValues) ? fieldSnapshot.selectedValues : [])
                        .map((value) => String(value))
                );
                const currentValues = new Set(
                    Array.from(element.selectedOptions).map((option) => option.value)
                );

                if (targetValues.size !== currentValues.size) return false;
                for (const value of targetValues) {
                    if (!currentValues.has(value)) return false;
                }
                return true;
            }

            case 'custom-select-one': {
                return isCustomSelectElementMatchingSnapshot(element, fieldSnapshot);
            }

            case 'contenteditable': {
                if (!(element instanceof HTMLElement) || !element.isContentEditable) return false;
                return (element.textContent ?? '') === String(fieldSnapshot.value ?? '');
            }

            case 'textarea':
            case 'input':
            default: {
                if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) return false;
                return element.value === String(fieldSnapshot.value ?? '');
            }
        }
    }

    function setTextLikeValue(element, value) {
        if (element instanceof HTMLInputElement) {
            const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value');
            if (descriptor && typeof descriptor.set === 'function') {
                descriptor.set.call(element, value);
                return;
            }
        }

        if (element instanceof HTMLTextAreaElement) {
            const descriptor = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value');
            if (descriptor && typeof descriptor.set === 'function') {
                descriptor.set.call(element, value);
                return;
            }
        }

        element.value = value;
    }

    function getTextLikeValue(element) {
        return element.value ?? '';
    }

    function setNativeChecked(element, checked) {
        const descriptor = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'checked');
        if (descriptor && typeof descriptor.set === 'function') {
            descriptor.set.call(element, checked);
        } else {
            element.checked = checked;
        }
    }

    function setNativeSelectValue(element, value) {
        const descriptor = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
        if (descriptor && typeof descriptor.set === 'function') {
            descriptor.set.call(element, value);
        } else {
            element.value = value;
        }
    }

    function simulatePointerHoverSequence(target) {
        dispatchPointerEvent(target, 'pointerover');
        dispatchPointerEvent(target, 'pointerenter');
        dispatchMouseEvent(target, 'mouseover');
        dispatchMouseEvent(target, 'mouseenter');
    }

    function simulatePointerClickSequence(target, { invokeNativeClick = true } = {}) {
        dispatchPointerEvent(target, 'pointerdown');
        dispatchMouseEvent(target, 'mousedown');
        dispatchPointerEvent(target, 'pointerup');
        dispatchMouseEvent(target, 'mouseup');

        if (invokeNativeClick && typeof target.click === 'function') {
            target.click();
        } else {
            dispatchMouseEvent(target, 'click');
        }
    }

    function dispatchPointerEvent(target, type) {
        try {
            const event = new PointerEvent(type, {
                bubbles: true,
                cancelable: true,
                pointerId: 1,
                pointerType: 'mouse',
                isPrimary: true,
            });
            target.dispatchEvent(event);
        } catch (error) {
            dispatchSimpleEvent(target, type);
        }
    }

    function dispatchMouseEvent(target, type) {
        try {
            const event = new MouseEvent(type, {
                bubbles: true,
                cancelable: true,
                view: window,
            });
            target.dispatchEvent(event);
        } catch (error) {
            dispatchSimpleEvent(target, type);
        }
    }

    function dispatchKeyboardEvent(target, type, key, extra = {}) {
        const keyInfo = inferKeyMeta(key);

        try {
            const event = new KeyboardEvent(type, {
                key: keyInfo.key,
                code: keyInfo.code,
                keyCode: keyInfo.keyCode,
                which: keyInfo.keyCode,
                bubbles: true,
                cancelable: true,
                ...extra,
            });
            target.dispatchEvent(event);
        } catch (error) {
            dispatchSimpleEvent(target, type);
        }
    }

    function dispatchBeforeInputEvent(target, data, inputType) {
        try {
            const event = new InputEvent('beforeinput', {
                bubbles: true,
                cancelable: true,
                data,
                inputType,
            });
            target.dispatchEvent(event);
        } catch (error) {
            dispatchSimpleEvent(target, 'beforeinput');
        }
    }

    function dispatchInputEvent(target, data, inputType) {
        try {
            const event = new InputEvent('input', {
                bubbles: true,
                cancelable: true,
                data,
                inputType,
            });
            target.dispatchEvent(event);
        } catch (error) {
            dispatchSimpleEvent(target, 'input');
        }
    }

    function dispatchSimpleEvent(target, type) {
        target.dispatchEvent(new Event(type, { bubbles: true, cancelable: true }));
    }

    function inferKeyMeta(key) {
        if (key === 'Delete') {
            return { key: 'Delete', code: 'Delete', keyCode: 46 };
        }

        if (key === 'Enter') {
            return { key: 'Enter', code: 'Enter', keyCode: 13 };
        }

        if (key === 'Escape') {
            return { key: 'Escape', code: 'Escape', keyCode: 27 };
        }

        if (key === 'ArrowDown') {
            return { key: 'ArrowDown', code: 'ArrowDown', keyCode: 40 };
        }

        if (key === 'ArrowUp') {
            return { key: 'ArrowUp', code: 'ArrowUp', keyCode: 38 };
        }

        if (typeof key === 'string' && key.length === 1) {
            const isLetter = /^[a-z]$/i.test(key);
            const keyCode = isLetter ? key.toUpperCase().charCodeAt(0) : key.charCodeAt(0);
            return {
                key,
                code: isLetter ? `Key${key.toUpperCase()}` : 'Unidentified',
                keyCode,
            };
        }

        return { key: String(key || ''), code: 'Unidentified', keyCode: 0 };
    }

    function highlightElement(element) {
        element.classList.add(HIGHLIGHT_CLASS);
        return () => {
            element.classList.remove(HIGHLIGHT_CLASS);
        };
    }

    function safeScrollIntoView(element) {
        try {
            element.scrollIntoView({ block: 'center', inline: 'nearest', behavior: 'smooth' });
        } catch (error) {
            try {
                element.scrollIntoView(true);
            } catch (ignored) {
                // ignore
            }
        }
    }

    function showToast(message, { duration = 3000, closable = true } = {}) {
        injectStyles();

        const existing = document.getElementById(TOAST_ID);
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.id = TOAST_ID;
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');

        const text = document.createElement('div');
        text.className = 'tm-form-snapshot-toast-text';
        text.textContent = message;
        toast.appendChild(text);

        let timer = null;

        const close = () => {
            if (timer) {
                clearTimeout(timer);
                timer = null;
            }
            toast.classList.remove('show');
            window.setTimeout(() => {
                if (toast.isConnected) toast.remove();
            }, 180);
        };

        if (closable) {
            const closeButton = document.createElement('button');
            closeButton.className = 'tm-form-snapshot-toast-close';
            closeButton.type = 'button';
            closeButton.textContent = '✕';
            closeButton.setAttribute('aria-label', '關閉通知');
            closeButton.addEventListener('click', close);
            toast.appendChild(closeButton);
        }

        document.body.appendChild(toast);
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        timer = window.setTimeout(close, duration);
    }

    function showApplyCheckingToast({ retryCount = 0, willRunReadonlySync = false } = {}) {
        let detail = '';

        if (retryCount > 0 && willRunReadonlySync) {
            detail = `（第 2 輪 ${retryCount} 欄 + readonly 後補）`;
        } else if (retryCount > 0) {
            detail = `（第 2 輪 ${retryCount} 欄）`;
        } else if (willRunReadonlySync) {
            detail = '（readonly 後補）';
        }

        showToast(`🔎 主要欄位已填完，正在進行後續檢查${detail}，請稍候...`, {
            duration: APPLY_POST_CHECK_TOAST_DURATION_MS,
            closable: false,
        });
    }

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) return;

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            .${HIGHLIGHT_CLASS} {
                outline: 2px solid #ffb020 !important;
                outline-offset: 1px !important;
                border-radius: 4px !important;
                animation: tmFormSnapshotBlink 0.5s ease-in-out infinite;
                box-shadow: 0 0 0 0 rgba(255, 176, 32, 0.45);
            }

            @keyframes tmFormSnapshotBlink {
                0% {
                    box-shadow: 0 0 0 0 rgba(255, 176, 32, 0.55);
                    filter: brightness(1.03);
                }
                50% {
                    box-shadow: 0 0 0 8px rgba(255, 176, 32, 0);
                    filter: brightness(1.16);
                }
                100% {
                    box-shadow: 0 0 0 0 rgba(255, 176, 32, 0);
                    filter: brightness(1.03);
                }
            }

            #${TOAST_ID} {
                position: fixed;
                right: 16px;
                bottom: 16px;
                z-index: 2147483647;
                max-width: min(480px, calc(100vw - 24px));
                padding: 12px 12px 12px 14px;
                border-radius: 10px;
                background: rgba(18, 18, 24, 0.95);
                color: #ffffff;
                box-shadow: 0 10px 24px rgba(0, 0, 0, 0.35);
                display: flex;
                align-items: flex-start;
                gap: 10px;
                transform: translateY(12px);
                opacity: 0;
                transition: opacity 0.18s ease, transform 0.18s ease;
                font-size: 14px;
                line-height: 1.5;
            }

            #${TOAST_ID}.show {
                opacity: 1;
                transform: translateY(0);
            }

            #${TOAST_ID} .tm-form-snapshot-toast-text {
                flex: 1 1 auto;
                word-break: break-word;
            }

            #${TOAST_ID} .tm-form-snapshot-toast-close {
                border: 0;
                background: rgba(255, 255, 255, 0.16);
                color: #ffffff;
                width: 24px;
                height: 24px;
                border-radius: 6px;
                cursor: pointer;
                line-height: 1;
                font-size: 14px;
                flex: 0 0 auto;
            }

            #${TOAST_ID} .tm-form-snapshot-toast-close:hover {
                background: rgba(255, 255, 255, 0.28);
            }
        `;

        (document.head || document.documentElement).appendChild(style);
    }

    function getSnapshotStorageKey() {
        return getSnapshotStorageKeyByUrl(location.href);
    }

    function getSnapshotStorageKeyByUrl(url) {
        if (!url || typeof url !== 'string') {
            return `${SNAPSHOT_STORAGE_KEY_PREFIX}${encodeURIComponent(location.href)}`;
        }

        return `${SNAPSHOT_STORAGE_KEY_PREFIX}${encodeURIComponent(url)}`;
    }

    function saveSnapshotForCurrentUrl(snapshot) {
        const key = getSnapshotStorageKey();

        const saved = saveStorageValueByKey(key, snapshot);
        if (saved) {
            rememberSnapshotStorageKey(key);
        }

        return saved;
    }

    function loadSnapshotForCurrentUrl() {
        const key = getSnapshotStorageKey();

        const raw = loadStorageValueByKey(key, null);
        if (!raw) return null;

        if (typeof raw === 'string') {
            try {
                return JSON.parse(raw);
            } catch (error) {
                console.warn('[FormSnapshot] 快照內容不是有效 JSON，已忽略該筆資料。');
                return null;
            }
        }

        return raw;
    }

    function buildAllSettingsExportPayload() {
        refreshSnapshotIndexFromStorage();

        const keys = listScriptStorageKeys();
        if (keys.length === 0) {
            return null;
        }

        const storage = Object.create(null);
        keys.forEach((key) => {
            const value = loadStorageValueByKey(key, undefined, { silent: true });
            if (typeof value !== 'undefined') {
                storage[key] = value;
            }
        });

        const totalEntries = Object.keys(storage).length;
        if (totalEntries === 0) {
            return null;
        }

        return {
            schemaVersion: EXPORT_SCHEMA_VERSION,
            payloadType: EXPORT_PAYLOAD_TYPE,
            exportedAt: new Date().toISOString(),
            source: {
                href: location.href,
                origin: location.origin,
            },
            totalEntries,
            storage,
        };
    }

    function extractImportEntries(payload) {
        if (!payload || typeof payload !== 'object') {
            return [];
        }

        const entries = [];

        if (payload.storage && typeof payload.storage === 'object' && !Array.isArray(payload.storage)) {
            Object.entries(payload.storage).forEach(([key, value]) => {
                if (!isScriptStorageKey(key)) return;
                entries.push({ key, value });
            });
        }

        if (Array.isArray(payload.snapshots)) {
            payload.snapshots.forEach((item) => {
                if (!item || typeof item !== 'object') return;

                const url = typeof item.url === 'string'
                    ? item.url
                    : (item.snapshot && typeof item.snapshot.url === 'string' ? item.snapshot.url : '');
                if (!url) return;

                const snapshotValue = item.snapshot && typeof item.snapshot === 'object'
                    ? item.snapshot
                    : item;
                const snapshot = {
                    ...snapshotValue,
                    url,
                };

                if (!Array.isArray(snapshot.fields)) return;

                entries.push({
                    key: getSnapshotStorageKeyByUrl(url),
                    value: snapshot,
                });
            });
        }

        const deduped = new Map();
        entries.forEach((entry) => {
            deduped.set(entry.key, entry.value);
        });

        return Array.from(deduped.entries()).map(([key, value]) => ({ key, value }));
    }

    function listScriptStorageKeys() {
        const keySet = new Set();

        listBackendStorageKeys().forEach((key) => {
            if (isScriptStorageKey(key)) {
                keySet.add(key);
            }
        });

        getSnapshotStorageIndex().forEach((key) => {
            if (isSnapshotStorageKey(key)) {
                keySet.add(key);
            }
        });

        if (keySet.size > 0 || hasStoredValue(SNAPSHOT_INDEX_STORAGE_KEY)) {
            keySet.add(SNAPSHOT_INDEX_STORAGE_KEY);
        }

        return Array.from(keySet);
    }

    function listBackendStorageKeys() {
        if (typeof GM_listValues === 'function') {
            try {
                const keys = GM_listValues();
                if (Array.isArray(keys)) {
                    return keys.filter((key) => typeof key === 'string');
                }
            } catch (error) {
                console.warn('[FormSnapshot] GM_listValues 失敗，改用 localStorage 掃描。', error);
            }
        }

        try {
            const keys = [];
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (typeof key === 'string') {
                    keys.push(key);
                }
            }
            return keys;
        } catch (error) {
            console.warn('[FormSnapshot] localStorage 掃描失敗。', error);
            return [];
        }
    }

    function isScriptStorageKey(key) {
        return typeof key === 'string' && key.startsWith(SCRIPT_STORAGE_KEY_PREFIX);
    }

    function isSnapshotStorageKey(key) {
        return typeof key === 'string' && key.startsWith(SNAPSHOT_STORAGE_KEY_PREFIX);
    }

    function getSnapshotStorageIndex() {
        const index = loadStorageValueByKey(SNAPSHOT_INDEX_STORAGE_KEY, [], { silent: true });
        if (!Array.isArray(index)) return [];

        return index.filter(isSnapshotStorageKey);
    }

    function rememberSnapshotStorageKey(key) {
        if (!isSnapshotStorageKey(key)) return;

        const current = new Set(getSnapshotStorageIndex());
        if (current.has(key)) return;

        current.add(key);
        saveStorageValueByKey(SNAPSHOT_INDEX_STORAGE_KEY, Array.from(current), { silent: true });
    }

    function refreshSnapshotIndexFromStorage() {
        const merged = new Set(getSnapshotStorageIndex());

        listBackendStorageKeys().forEach((key) => {
            if (isSnapshotStorageKey(key)) {
                merged.add(key);
            }
        });

        saveStorageValueByKey(SNAPSHOT_INDEX_STORAGE_KEY, Array.from(merged), { silent: true });
    }

    function hasStoredValue(key) {
        try {
            if (typeof GM_getValue === 'function') {
                return typeof GM_getValue(key, undefined) !== 'undefined';
            }

            return localStorage.getItem(key) !== null;
        } catch (error) {
            return false;
        }
    }

    function saveStorageValueByKey(key, value, { silent = false } = {}) {
        try {
            if (typeof GM_setValue === 'function') {
                GM_setValue(key, value);
            } else {
                localStorage.setItem(key, JSON.stringify(value));
            }
            return true;
        } catch (error) {
            if (!silent) {
                console.error(`[FormSnapshot] 儲存資料失敗（key: ${key}）：`, error);
            }
            return false;
        }
    }

    function loadStorageValueByKey(key, defaultValue = null, { silent = false } = {}) {
        try {
            if (typeof GM_getValue === 'function') {
                return GM_getValue(key, defaultValue);
            }

            const raw = localStorage.getItem(key);
            if (raw === null) return defaultValue;

            try {
                return JSON.parse(raw);
            } catch (error) {
                return raw;
            }
        } catch (error) {
            if (!silent) {
                console.error(`[FormSnapshot] 讀取資料失敗（key: ${key}）：`, error);
            }
            return defaultValue;
        }
    }

    function formatExportTimestamp(date) {
        const pad = (num) => String(num).padStart(2, '0');
        return `${date.getFullYear()}${pad(date.getMonth() + 1)}${pad(date.getDate())}-${pad(date.getHours())}${pad(date.getMinutes())}${pad(date.getSeconds())}`;
    }

    function downloadTextFile(fileName, content) {
        try {
            const blob = new Blob([content], { type: 'application/json;charset=utf-8' });
            const blobUrl = URL.createObjectURL(blob);

            const anchor = document.createElement('a');
            anchor.href = blobUrl;
            anchor.download = fileName;
            anchor.style.display = 'none';

            document.body.appendChild(anchor);
            anchor.click();
            anchor.remove();

            setTimeout(() => {
                URL.revokeObjectURL(blobUrl);
            }, 1000);

            return true;
        } catch (error) {
            console.error('[FormSnapshot] 下載匯出檔失敗：', error);
            return false;
        }
    }

    async function tryWriteTextToClipboard(text) {
        try {
            if (navigator.clipboard?.writeText) {
                await navigator.clipboard.writeText(text);
                return true;
            }
        } catch (error) {
            console.warn('[FormSnapshot] 複製到剪貼簿失敗：', error);
        }

        return false;
    }

    async function pickJsonFileText() {
        return await new Promise((resolve, reject) => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = '.json,application/json,text/json';
            input.style.display = 'none';

            const cleanup = () => {
                if (input.isConnected) {
                    input.remove();
                }
            };

            input.addEventListener('change', async () => {
                try {
                    const file = input.files?.[0];
                    if (!file) {
                        cleanup();
                        resolve('');
                        return;
                    }

                    const text = await file.text();
                    cleanup();
                    resolve(text);
                } catch (error) {
                    cleanup();
                    reject(error);
                }
            }, { once: true });

            document.body.appendChild(input);
            input.click();
        });
    }

    function buildCssPath(element) {
        const segments = [];
        let current = element;

        while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.documentElement) {
            let segment = current.tagName.toLowerCase();

            if (current.id) {
                segment += `#${safeCssEscape(current.id)}`;
                segments.unshift(segment);
                break;
            }

            const parent = current.parentElement;
            if (parent) {
                const siblings = Array.from(parent.children)
                    .filter((node) => node.tagName === current.tagName);
                if (siblings.length > 1) {
                    const nth = siblings.indexOf(current) + 1;
                    segment += `:nth-of-type(${nth})`;
                }
            }

            segments.unshift(segment);
            current = parent;
        }

        return segments.join(' > ');
    }

    function safeCssEscape(value) {
        if (window.CSS && typeof CSS.escape === 'function') {
            return CSS.escape(value);
        }

        return String(value).replace(/([ !"#$%&'()*+,./:;<=>?@[\\\]^`{|}~])/g, '\\$1');
    }

    function normalizeComparableText(value) {
        return String(value ?? '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    async function waitForTruthy(factory, { timeoutMs = 1000, intervalMs = 60 } = {}) {
        const startedAt = Date.now();

        while (Date.now() - startedAt <= timeoutMs) {
            throwIfApplyAbortRequested();

            let result = null;
            try {
                result = factory();
            } catch (error) {
                result = null;
            }

            if (result) return result;
            await sleep(intervalMs);
        }

        return null;
    }

    function hasReadonlySyncProbeTargets(fieldSnapshots) {
        if (!Array.isArray(fieldSnapshots) || fieldSnapshots.length === 0) return false;

        return fieldSnapshots.some((fieldSnapshot) => {
            if (!fieldSnapshot || typeof fieldSnapshot !== 'object') return false;
            if (fieldSnapshot.kind !== 'input' && fieldSnapshot.kind !== 'textarea') return false;
            return String(fieldSnapshot.value ?? '') !== '';
        });
    }

    async function syncReadonlySnapshotFields(fieldSnapshots) {
        if (!Array.isArray(fieldSnapshots) || fieldSnapshots.length === 0) return 0;

        let syncedCount = 0;

        for (const fieldSnapshot of fieldSnapshots) {
            throwIfApplyAbortRequested();

            if (!fieldSnapshot || typeof fieldSnapshot !== 'object') continue;
            if (fieldSnapshot.kind !== 'input' && fieldSnapshot.kind !== 'textarea') continue;

            const targetValue = String(fieldSnapshot.value ?? '');
            if (!targetValue) continue;

            const synced = await syncSingleReadonlyFieldSnapshot(fieldSnapshot, targetValue);
            if (synced) {
                syncedCount++;
            }
        }

        return syncedCount;
    }

    async function syncSingleReadonlyFieldSnapshot(fieldSnapshot, targetValue) {
        const MAX_ATTEMPTS = 3;

        for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
            throwIfApplyAbortRequested();

            let element = null;
            const immediateCandidate = findElementByLocator(fieldSnapshot.locator);

            if (immediateCandidate instanceof HTMLInputElement || immediateCandidate instanceof HTMLTextAreaElement) {
                if (!canFillElement(immediateCandidate)) {
                    return false;
                }

                if (!immediateCandidate.readOnly || !isProgrammaticallyFillableReadonlyField(immediateCandidate)) {
                    return false;
                }

                element = immediateCandidate;
            } else {
                element = await waitForTruthy(() => {
                    const candidate = findElementByLocator(fieldSnapshot.locator);
                    if (!(candidate instanceof HTMLInputElement || candidate instanceof HTMLTextAreaElement)) return null;
                    if (!canFillElement(candidate)) return null;
                    if (!candidate.readOnly) return null;
                    if (!isProgrammaticallyFillableReadonlyField(candidate)) return null;
                    return candidate;
                }, { timeoutMs: 2200, intervalMs: 100 });
            }

            if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) {
                return false;
            }

            if (getTextLikeValue(element) === targetValue) {
                return true;
            }

            setTextLikeValue(element, targetValue);
            dispatchSimpleEvent(element, 'input');
            dispatchSimpleEvent(element, 'change');

            await sleep(120);
            throwIfApplyAbortRequested();

            if (getTextLikeValue(element) === targetValue) {
                return true;
            }
        }

        return false;
    }

    function randomInt(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function sleep(ms) {
        const targetMs = Number(ms) || 0;
        if (targetMs <= 0) {
            return Promise.resolve();
        }

        const SLEEP_SLICE_MS = 20;
        return new Promise((resolve) => {
            let elapsed = 0;

            const tick = () => {
                if (applyAbortRequested || elapsed >= targetMs) {
                    resolve();
                    return;
                }

                const waitMs = Math.min(SLEEP_SLICE_MS, targetMs - elapsed);
                elapsed += waitMs;
                setTimeout(tick, waitMs);
            };

            tick();
        });
    }
})();
