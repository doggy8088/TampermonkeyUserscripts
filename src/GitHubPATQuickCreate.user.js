// ==UserScript==
// @name         GitHub: 快速進入 Personal Access Token 的按鈕 (快捷鍵: Alt+P)
// @version      0.1.0
// @description  在 GitHub 頂部工具列加入按鈕，快速開啟建立 Fine-grained Personal Access Tokens 的頁面（Alt+P 快捷鍵）
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/GitHubPATQuickCreate.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/GitHubPATQuickCreate.user.js
// @author       Will Huang
// @match        https://github.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=github.com
// @run-at       document-idle
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // 目標頁面（使用者可以在需求確認後改成直接到 /new）
    const PAT_URL = 'https://github.com/settings/personal-access-tokens';

    // 快捷鍵：Alt+P（與現有風格一致：若不小心按到大寫，顯示提示）
    document.addEventListener('keydown', (ev) => {
        if (ev.altKey && ev.key === 'P' && !/^(?:input|select|textarea|button)$/i.test(ev.target.nodeName)) {
            alert('你是不是不小心按到了 CAPSLOCK 鍵？');
            return;
        }
        if (ev.altKey && ev.key === 'p' && !/^(?:input|select|textarea|button)$/i.test(ev.target.nodeName)) {
            window.open(PAT_URL, '_blank');
        }
    });

    // 嘗試在目前頁面右上方工具列加入按鈕（若 header 還沒載入，會用 MutationObserver 等待）
    createIcon();

    function createGuid() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    function createIcon() {
        const guid = createGuid();

        if (document.querySelector('.AppHeader-actions')) {
            insertButton(guid);
            return;
        }

        // 若 header 尚未建立，監聽 DOM 變動以便插入按鈕
        const observer = new MutationObserver((mutations, obs) => {
            if (document.querySelector('.AppHeader-actions')) {
                insertButton(guid);
                obs.disconnect();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    function insertButton(guid) {
        // 避免重複插入
        if (document.getElementById(`pat-icon-${guid}`)) return;

        const a = document.createElement('a');
        a.href = PAT_URL;
        a.id = `pat-icon-${guid}`;
        a.setAttribute('aria-labelledby', `tooltip-pat-${guid}`);
        a.dataset.viewComponent = 'true';
        a.className = 'Button Button--iconOnly Button--secondary Button--medium AppHeader-button color-fg-muted';
        a.addEventListener('click', (ev) => {
            ev.preventDefault();
            window.open(PAT_URL, '_blank');
        });

        // SVG: 重新設計的「金鑰」圖示（使用 currentColor，會跟隨按鈕顏色）
        // 設計意圖：
        // - 這支腳本的核心概念是「Personal Access Token」，視覺上希望讓使用者一眼聯想到「金鑰／存取權限」。
        // - 圖示需在 GitHub header 的小尺寸（16px 高）仍可辨識，因此採用「大圓頭 + 中孔 + 短鑰匙柄 + 兩個齒」的簡化輪廓。
        // - 以單一路徑搭配 evenodd 產生「孔洞」效果，避免多個 path 在不同縮放/顏色/抗鋸齒下產生邊緣縫隙。
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('height', '16');
        svg.setAttribute('width', '24');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.setAttribute('aria-hidden', 'true');

        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('fill', 'currentColor');
        path.setAttribute('fill-rule', 'evenodd');
        path.setAttribute('clip-rule', 'evenodd');
        // 鑰匙形狀路徑（24x24 viewBox）：
        // - 圓頭：中心 (7,12)、半徑 5
        // - 孔洞：中心 (7,12)、半徑 2（透過 evenodd 挖空）
        // - 鑰匙柄：從 x=12 開始，主體高度 2（y=11~13），下方兩個齒延伸至 y=17
        path.setAttribute('d', 'M7 7a5 5 0 1 0 0 10a5 5 0 0 0 0-10zM7 10a2 2 0 1 1 0 4a2 2 0 0 1 0-4zM12 11H22V13H20V15H18V17H16V15H12Z');

        svg.appendChild(path);
        a.appendChild(svg);

        const container = document.querySelector('.AppHeader-actions');
        container?.appendChild(a);

        // 建立隱藏的 tooltip（與 GitHub 內部樣式一致）
        let toolTip = document.createElement('tool-tip');
        toolTip.setAttribute('id', `tooltip-pat-${guid}`);
        toolTip.setAttribute('for', `pat-icon-${guid}`);
        toolTip.setAttribute('popover', 'manual');
        toolTip.setAttribute('data-direction', 's');
        toolTip.setAttribute('data-type', 'label');
        toolTip.setAttribute('data-view-component', 'true');
        toolTip.classList.add('position-absolute', 'sr-only');
        toolTip.setAttribute('aria-hidden', 'true');
        toolTip.setAttribute('role', 'tooltip');
        toolTip.textContent = '建立 Fine-grained Personal Access Token';

        container?.appendChild(toolTip);
    }

})();
