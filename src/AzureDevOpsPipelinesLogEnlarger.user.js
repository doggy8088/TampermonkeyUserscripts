// ==UserScript==
// @name         Azure DevOps: 調整 Pipeline Log 的顯示寬度
// @version      1.1.0
// @description  在 Azure Pipelines 的 Logs 頁面中可透過鍵盤的 + 或 - 放大/縮小左欄寬度，也可以用滑鼠直接拖曳左欄右側的分隔線調整寬度
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/AzureDevOpsPipelinesLogEnlarger.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/AzureDevOpsPipelinesLogEnlarger.user.js
// @author       Will Huang
// @match        *://dev.azure.com/*
// @match        *://*.visualstudio.com/*
// @grant        none
// ==/UserScript==

(function () {
    'use strict';

    // 每按一次 + 或 - 調整的寬度（px）
    const stepSize = 100;

    // 左欄的最小寬度（px）：避免按太多次 - 或拖曳過頭，讓左欄縮到看不見、再也抓不到分隔線。
    const minWidth = 120;

    // 右側 Log 區至少保留的寬度（px）：拖曳時不讓左欄把右邊的 Log 整個擠掉。
    const minLogWidth = 200;

    // Pipeline Logs 頁面的左欄。只鎖定 .run-logs-view 底下的左欄，
    // 因為其他頁面也可能用到 .bolt-master-panel，而且有些頁面本身已經有自己的分隔線，不該再疊一條。
    const panelSelector = '.run-logs-view > .bolt-master-panel';

    // 我們自己插入的拖曳把手 class 名稱（加上腳本專屬前綴，避免和 Azure DevOps 原生 class 撞名）
    const handleClass = 'tm-pipeline-log-splitter';

    // 拖曳期間掛在 <html> 上的 class：讓整頁游標維持 col-resize，並暫停文字選取，
    // 否則滑鼠一離開細細的把手，游標就會變回文字游標，還會把沿途的 Log 文字反白。
    const draggingClass = 'tm-pipeline-log-splitter-dragging';

    injectStyle();

    // ---------- 鍵盤：+ / - 調整寬度 ----------

    document.addEventListener('keydown', (ev) => {
        if (ev.key !== '+' && ev.key !== '-') return;

        // 同時按著 Ctrl/Meta/Alt 時不處理：Ctrl/Cmd 加上 + 或 - 是瀏覽器的縮放快速鍵，
        // 原本縮放頁面的同時也會改變左欄寬度。刻意不檢查 Shift，因為美式鍵盤要按 Shift+= 才能打出 +。
        if (ev.ctrlKey || ev.metaKey || ev.altKey) return;

        // 輸入情境不攔截：原本只排除 input/select/textarea/button，另外補上 contenteditable 編輯器
        // （例如工作項目的 HTML 欄位）與輸入法組字中的按鍵。
        if (ev.isComposing || /^(?:input|select|textarea|button)$/i.test(ev.target.nodeName) || ev.target.isContentEditable) return;

        adjustMasterPanelWidth(ev.key === '+' ? stepSize : -stepSize);
    });

    /**
     * 以 delta（px）調整 Pipeline Logs 左欄（.bolt-master-panel）的寬度。
     * 這支腳本套用在整個 Azure DevOps，在沒有左欄的頁面（Boards、Repos…）按下 + 或 -，
     * 原本會因存取 undefined 的 style 而在主控台丟出 TypeError；找不到左欄時直接略過。
     */
    function adjustMasterPanelWidth(delta) {
        const panel = document.getElementsByClassName('bolt-master-panel')[0];
        if (!panel) return;

        // 以實際渲染出來的寬度為基準，而不是寫死的預設值：
        // 原本假設左欄預設 320px，但實測 Logs 頁面的左欄預設是 280px（寬度由 CSS 決定、沒有 inline width），
        // 導致第一次按 + 會多跳 40px。拖曳過後也一樣以畫面上的實際寬度繼續加減。
        const currentWidth = panel.getBoundingClientRect().width;
        setPanelWidth(panel, currentWidth + delta);
    }

    /**
     * 設定左欄寬度，並限制在 [minWidth, 容器寬度 - minLogWidth] 之間。
     * 左欄是 flex-noshrink，直接寫 inline width 就會生效；右側 Log 區會自動吃掉剩下的空間。
     */
    function setPanelWidth(panel, width) {
        const containerWidth = panel.parentElement?.getBoundingClientRect().width || Infinity;
        const maxWidth = Math.max(minWidth, containerWidth - minLogWidth);
        const clamped = Math.min(Math.max(Math.round(width), minWidth), maxWidth);
        panel.style.width = clamped + 'px';
    }

    // ---------- 滑鼠：拖曳分隔線調整寬度 ----------

    /**
     * Azure DevOps 的 Logs 頁面左右兩欄之間只有一條邊框，沒有可拖曳的 splitter 元素，
     * 所以自己在左欄後面插入一個寬度 0 的 flex 子元素當作把手；真正可以抓的熱區是它的 ::before，
     * 以分隔線為中心往左右各延伸幾個 px，不會影響原本的版面寬度。
     */
    function ensureSplitter() {
        const panel = document.querySelector(panelSelector);
        if (!panel) return;

        // 已經插過就不重插。React 重新渲染右側 Log 區時通常不會動到左欄，但若左欄被整個換掉，
        // 舊把手會跟著舊的父元素一起消失，這裡會在新的左欄旁邊補上新把手。
        if (panel.nextElementSibling?.classList.contains(handleClass)) return;

        const handle = document.createElement('div');
        handle.className = handleClass;
        handle.title = '拖曳以調整左欄寬度';
        handle.addEventListener('pointerdown', (ev) => startDrag(ev, panel, handle));
        panel.after(handle);
    }

    /**
     * 開始拖曳：記下按下時的滑鼠 X 座標與左欄寬度，之後每次移動都用「起始寬度 + 位移量」計算，
     * 不累加每次 move 的差值，避免寬度被夾住（clamp）時游標和分隔線慢慢錯位。
     * 用 setPointerCapture 讓滑鼠移出把手、甚至移到 iframe 或視窗外時仍能持續收到事件。
     */
    function startDrag(ev, panel, handle) {
        // 只處理滑鼠左鍵（觸控與觸控筆的 button 也是 0）
        if (ev.button !== 0) return;
        ev.preventDefault();

        const startX = ev.clientX;
        const startWidth = panel.getBoundingClientRect().width;

        handle.setPointerCapture(ev.pointerId);
        document.documentElement.classList.add(draggingClass);

        const onMove = (moveEv) => {
            setPanelWidth(panel, startWidth + (moveEv.clientX - startX));
        };

        const onEnd = () => {
            handle.removeEventListener('pointermove', onMove);
            handle.removeEventListener('pointerup', onEnd);
            handle.removeEventListener('pointercancel', onEnd);
            document.documentElement.classList.remove(draggingClass);
        };

        handle.addEventListener('pointermove', onMove);
        handle.addEventListener('pointerup', onEnd);
        handle.addEventListener('pointercancel', onEnd);
    }

    /**
     * Azure DevOps 是 SPA：從 Pipelines 清單點進某次執行、切換 Summary / Logs 分頁都不會重新載入頁面，
     * 左欄是之後才動態出現的。用 MutationObserver 監看 DOM 變化，再以 requestAnimationFrame 合併
     * 同一畫格內的大量變動（Log 串流輸出時變動非常頻繁），每個畫格最多只檢查一次。
     */
    let scheduled = false;
    const observer = new MutationObserver(() => {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(() => {
            scheduled = false;
            ensureSplitter();
        });
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    ensureSplitter();

    /**
     * 注入把手的樣式。腳本使用 @grant none，所以不用 GM_addStyle，直接插入 <style>。
     * - 把手本身寬度 0、不縮放，不改變原本左右兩欄的寬度分配。
     * - ::before 是實際可抓取的熱區（寬 8px，以分隔線為中心），z-index 讓它蓋在右側 Log 區的左緣上方。
     * - 滑鼠移上去或拖曳中時顯示一條藍色細線，讓使用者知道這裡可以拖。
     */
    function injectStyle() {
        const style = document.createElement('style');
        style.textContent = `
            .${handleClass} {
                position: relative;
                flex: 0 0 0;
                width: 0;
                align-self: stretch;
            }
            .${handleClass}::before {
                content: '';
                position: absolute;
                top: 0;
                bottom: 0;
                left: -4px;
                width: 8px;
                cursor: col-resize;
                z-index: 10;
                touch-action: none;
            }
            .${handleClass}:hover::before,
            .${draggingClass} .${handleClass}::before {
                background: linear-gradient(to right, transparent 3px, #0078d4 3px, #0078d4 5px, transparent 5px);
            }
            .${draggingClass},
            .${draggingClass} * {
                cursor: col-resize !important;
                user-select: none !important;
            }
        `;
        (document.head || document.documentElement).appendChild(style);
    }

})();
