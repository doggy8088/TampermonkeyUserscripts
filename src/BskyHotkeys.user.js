// ==UserScript==
// @name         Bluesky: 好用的鍵盤快速鍵集合
// @version      0.2.0
// @description  在 bsky.app 按下 gh 優先點擊 Profile，找不到再開啟 doggy8088 的個人頁面
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/BskyHotkeys.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/BskyHotkeys.user.js
// @author       Will Huang
// @match        https://bsky.app/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=bsky.app
// ==/UserScript==

(function () {
    'use strict';

    const HOME_PROFILE_URL = 'https://bsky.app/profile/doggy8088.bsky.social';
    const SEQUENCE_RESET_MS = 1200;

    const sequenceBuffer = [];
    const hotkeys = [];
    let lastKeyTime = 0;
    let maxSequenceLength = 0;

    registerSequenceHotkey(['g', 'h'], () => goHome());

    document.addEventListener('keydown', (event) => {
        if (event.repeat) return;
        if (shouldIgnoreEvent(event)) {
            resetSequence();
            return;
        }

        const now = Date.now();
        if (now - lastKeyTime > SEQUENCE_RESET_MS) {
            resetSequence();
        }
        lastKeyTime = now;

        const key = normalizeKey(event);
        if (!key) {
            resetSequence();
            return;
        }

        sequenceBuffer.push(key);
        if (sequenceBuffer.length > maxSequenceLength) {
            sequenceBuffer.shift();
        }

        for (const hotkey of hotkeys) {
            if (matchesSequence(hotkey.sequence)) {
                event.preventDefault();
                hotkey.handler(event);
                resetSequence();
                break;
            }
        }
    });

    function registerSequenceHotkey(sequence, handler) {
        const normalizedSequence = sequence.map(key => key.toLowerCase());
        hotkeys.push({ sequence: normalizedSequence, handler });
        maxSequenceLength = Math.max(maxSequenceLength, normalizedSequence.length);
    }

    function matchesSequence(sequence) {
        if (sequence.length > sequenceBuffer.length) return false;
        for (let i = 0; i < sequence.length; i++) {
            if (sequenceBuffer[sequenceBuffer.length - sequence.length + i] !== sequence[i]) {
                return false;
            }
        }
        return true;
    }

    function normalizeKey(event) {
        if (event.ctrlKey || event.metaKey || event.altKey) return null;
        if (typeof event.key !== 'string' || event.key.length !== 1) return null;
        return event.key.toLowerCase();
    }

    function shouldIgnoreEvent(event) {
        const target = event.target;
        if (!target || typeof target.closest !== 'function') return false;
        if (target.closest('input, textarea, select, button')) return true;
        if (target.closest('[contenteditable="true"], [contenteditable="plaintext-only"], [role="textbox"]')) return true;
        if (target.isContentEditable) return true;
        return false;
    }

    function resetSequence() {
        sequenceBuffer.length = 0;
    }

    function goHome() {
        const profileLink = findProfileLink();
        if (profileLink) {
            profileLink.click();
            return;
        }
        navigateTo(HOME_PROFILE_URL);
    }

    function navigateTo(url) {
        window.location.href = url;
    }

    function findProfileLink() {
        return document.querySelector('a[aria-label="Profile"][role="link"]');
    }

})();
