// ==UserScript==
// @name         AskPage 頁問 (Ctrl+I)
// @version      0.6.1
// @description  (Ctrl+I) 使用 Gemini API 詢問關於目前頁面的問題，支援多模型選擇
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/AskPage.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/AskPage.user.js
// @author       Will Huang
// @match        *://*/*
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @connect      generativelanguage.googleapis.com
// @require      https://cdn.jsdelivr.net/npm/marked/marked.min.js
// @require      https://cdn.jsdelivr.net/npm/dompurify@3.0.2/dist/purify.min.js
// @license      MIT
// ==/UserScript==

(function () {
    'use strict';

    ////////////////////////////////////////////////////////////////////////////
    // 本工具已經上架到 Chrome 線上應用程式商店
    // https://chromewebstore.google.com/detail/lehmnfefdojedijepclonkbajnjonnji
    ////////////////////////////////////////////////////////////////////////////

    /* --------------------------------------------------
        設定 / 變數
    -------------------------------------------------- */
    const API_KEY_STORAGE = 'GEMINI_API_KEY';
    const MODEL_STORAGE = 'GEMINI_MODEL';
    const PROMPT_HISTORY_STORAGE = 'ASKPAGE_PROMPT_HISTORY';
    const AVAILABLE_MODELS = [
        { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (最佳品質)' },
        { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (平衡速度與品質)' },
        { value: 'gemini-2.5-flash-lite-preview-06-17', label: 'Gemini 2.5 Flash Lite (最快速度)' }
    ];
    function encodeApiKey(rawKey) {
        try {
            return rawKey ? btoa(encodeURIComponent(rawKey)) : '';
        } catch (error) {
            console.error('無法編碼 API Key', error);
            return '';
        }
    }

    function decodeApiKey(storedKey) {
        try {
            return storedKey ? decodeURIComponent(atob(storedKey)) : '';
        } catch (error) {
            console.error('無法解碼 API Key', error);
            return '';
        }
    }

    let apiKey = decodeApiKey(GM_getValue(API_KEY_STORAGE, ''));
    let selectedModel = GM_getValue(MODEL_STORAGE, 'gemini-2.5-flash-lite-preview-06-17');

    /* --------------------------------------------------
        API Key 設定選單
    -------------------------------------------------- */
    GM_registerMenuCommand('設定 Gemini API', () => {
        if (document.getElementById('gemini-settings-overlay')) return;
        /* ---------- 建立遮罩 ---------- */
        const overlay = document.createElement('div');
        overlay.id = 'gemini-settings-overlay';

        /* ---------- 建立對話框 ---------- */
        const panel = document.createElement('div');
        panel.id = 'gemini-settings-panel';

        const keyLabel = document.createElement('label');
        keyLabel.textContent = '請輸入 Gemini API Key';

        const keyInput = document.createElement('input');
        keyInput.type = 'password';
        keyInput.value = apiKey || '';

        const modelLabel = document.createElement('label');
        modelLabel.textContent = '選擇 Gemini 模型';
        modelLabel.style.marginTop = '16px';

        const modelSelect = document.createElement('select');
        modelSelect.id = 'gemini-model-select';
        AVAILABLE_MODELS.forEach(model => {
            const option = document.createElement('option');
            option.value = model.value;
            option.textContent = model.label;
            if (model.value === selectedModel) {
                option.selected = true;
            }
            modelSelect.appendChild(option);
        });

        /* ---------- 按鈕 ---------- */
        const btnBar = document.createElement('div');
        btnBar.id = 'gemini-settings-btn-bar';

        const btnCancel = document.createElement('button');
        btnCancel.textContent = '取消';
        btnCancel.className = 'btn-cancel';

        const btnSave = document.createElement('button');
        btnSave.textContent = '儲存';
        btnSave.className = 'btn-save';

        btnBar.appendChild(btnCancel);
        btnBar.appendChild(btnSave);

        panel.appendChild(keyLabel);
        panel.appendChild(keyInput);
        panel.appendChild(modelLabel);
        panel.appendChild(modelSelect);
        panel.appendChild(btnBar);
        overlay.appendChild(panel);
        document.body.appendChild(overlay);
        keyInput.focus();

        /* ---------- 關閉 ---------- */
        function close() {
            overlay.remove();
        }
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close();
        });
        btnCancel.addEventListener('click', close);
        window.addEventListener(
            'keydown',
            (e) => {
                if (e.key === 'Escape') close();
            },
            { once: true },
        );

        /* ---------- 儲存 ---------- */
        btnSave.addEventListener('click', () => {
            apiKey = keyInput.value.trim();
            selectedModel = modelSelect.value;
            GM_setValue(API_KEY_STORAGE, encodeApiKey(apiKey));
            GM_setValue(MODEL_STORAGE, selectedModel);
            console.log('[AskPage] API Key 和模型已儲存');
            alert('已儲存 API Key 和模型設定');
            close();
        });
    });

    /* --------------------------------------------------
        UI 樣式
    -------------------------------------------------- */
    GM_addStyle(`
    /* --------------------------------------------------
        API Key 設定對話框樣式
    -------------------------------------------------- */
    #gemini-settings-overlay {
        position: fixed;
        inset: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2147483647;
        font-family: system-ui, -apple-system, Roboto, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji";
    }
    #gemini-settings-panel {
        background: #ffffff;
        padding: 24px 28px;
        border-radius: 12px;
        min-width: 300px;
        max-width: 400px;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
        display: flex;
        flex-direction: column;
        gap: 16px;
        border: 1px solid #e0e0e0;
        color: #000000;
    }
    #gemini-settings-panel label {
        font-size: 16px;
        font-weight: 600;
        margin-bottom: 4px;
    }
    #gemini-settings-panel input {
        padding: 10px 12px;
        font-size: 14px;
        border: 2px solid #cccccc;
        border-radius: 8px;
        background: #ffffff;
        color: #000000;
        outline: none;
        transition: border-color 0.2s;
    }
    #gemini-settings-panel input:focus {
        border-color: #1a73e8;
    }
    #gemini-settings-panel select {
        padding: 10px 12px;
        font-size: 14px;
        border: 2px solid #cccccc;
        border-radius: 8px;
        background: #ffffff;
        color: #000000;
        outline: none;
        transition: border-color 0.2s;
        cursor: pointer;
    }
    #gemini-settings-panel select:focus {
        border-color: #1a73e8;
    }
    #gemini-settings-btn-bar {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
        margin-top: 8px;
    }
    #gemini-settings-panel button {
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 14px;
        transition: background-color 0.2s;
    }
    #gemini-settings-panel .btn-cancel {
        background: #f5f5f5;
        color: #000000;
        border: 1px solid #e0e0e0;
    }
    #gemini-settings-panel .btn-cancel:hover {
        background: #e8e8e8;
    }
    #gemini-settings-panel .btn-save {
        background: #1a73e8;
        color: #ffffff;
        border: none;
        font-weight: 500;
    }
    #gemini-settings-panel .btn-save:hover {
        background: #1565c0;
    }

    /* Dark theme for settings */
    @media (prefers-color-scheme: dark) {
        #gemini-settings-panel {
            background: #2a2a2a;
            border: 1px solid #404040;
            color: #ffffff;
        }
        #gemini-settings-panel input {
            border: 2px solid #555555;
            background: #1f1f1f;
            color: #ffffff;
        }
        #gemini-settings-panel select {
            border: 2px solid #555555;
            background: #1f1f1f;
            color: #ffffff;
        }
        #gemini-settings-panel .btn-cancel {
            background: #404040;
            color: #ffffff;
            border-color: #404040;
        }
        #gemini-settings-panel .btn-cancel:hover {
            background: #505050;
        }
    }

    /* --------------------------------------------------
        Q&A 對話框樣式
    -------------------------------------------------- */
    #gemini-qna-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2147483647;
    }

    /* 明亮主題作為預設 (Light Theme as Default) */
    #gemini-qna-dialog {
      width: min(700px, 92%);
      max-height: 85vh;
      background: #ffffff;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      font-family: system-ui, -apple-system, Roboto, "Segoe UI", Helvetica, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji;
    }
    #gemini-qna-messages {
      flex: 1 1 auto;
      padding: 20px;
      overflow-y: auto;
      background: #f5f5f5;
      color: #000000;
      line-height: 1.6;
      font-size: 15px;
      font-weight: 500;
    }
    .gemini-msg-user {
      font-weight: 600;
      margin-bottom: 8px;
      padding: 8px 12px;
      background: #1565c0;
      border-radius: 8px;
      color: #ffffff;
      white-space: pre-wrap;
      border-left: 3px solid #0d47a1;
    }
    .gemini-msg-assistant {
      margin-bottom: 16px;
      padding: 12px 16px;
      background: #ffffff;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      color: #000000;
      border-left: 3px solid #4caf50;
      white-space: normal;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
      font-weight: 500;
      position: relative;
    }
    .gemini-msg-assistant ul,
    .gemini-msg-assistant ol {
      margin: 8px 0;
      padding-left: 20px;
    }
    .gemini-msg-assistant li {
      margin-bottom: 4px;
      line-height: 1.5;
      color: #000000;
      font-weight: 500;
    }
    .gemini-msg-assistant h1,
    .gemini-msg-assistant h2,
    .gemini-msg-assistant h3,
    .gemini-msg-assistant h4,
    .gemini-msg-assistant h5,
    .gemini-msg-assistant h6 {
      margin: 12px 0 8px 0;
      color: #1565c0;
      font-weight: 700;
    }
    .gemini-msg-assistant p {
      margin: 8px 0;
      color: #000000;
      font-weight: 500;
    }
    .gemini-msg-assistant pre {
      background: #1e1e1e;
      color: #ffffff;
      padding: 12px 16px;
      border-radius: 8px;
      overflow: auto;
      margin: 12px 0;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 13px;
      line-height: 1.4;
      border: 1px solid #333333;
      font-weight: 500;
    }
    .gemini-msg-assistant code {
      background: #f0f0f0;
      color: #d32f2f;
      padding: 2px 6px;
      border-radius: 4px;
      font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
      font-size: 13px;
      font-weight: 600;
      border: 1px solid #cccccc;
    }
    .gemini-msg-assistant pre code {
      background: transparent;
      color: inherit;
      padding: 0;
      border: none;
    }
    .gemini-msg-assistant strong,
    .gemini-msg-assistant b {
      color: #000000;
      font-weight: 700;
    }

    /* 複製按鈕樣式 */
    .gemini-copy-btn {
      position: absolute;
      top: 8px;
      right: 8px;
      width: 24px;
      height: 24px;
      background: rgba(255, 255, 255, 0.9);
      border: 1px solid #ddd;
      border-radius: 4px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.7;
      transition: all 0.2s ease;
      font-size: 12px;
      z-index: 1;
    }
    .gemini-copy-btn:hover {
      opacity: 1;
      background: rgba(255, 255, 255, 1);
      border-color: #bbb;
      transform: scale(1.05);
    }
    .gemini-copy-btn svg {
      width: 14px;
      height: 14px;
      fill: #666;
    }
    .gemini-copy-btn:hover svg {
      fill: #333;
    }
    .gemini-copy-btn.copied {
      background: #4caf50;
      border-color: #4caf50;
    }
    .gemini-copy-btn.copied svg {
      fill: white;
    }
    #gemini-qna-input-area {
      display: flex;
      align-items: center;
      padding: 12px;
      border-top: 1px solid #ddd;
      gap: 8px;
      background: #ffffff;
    }
    #gemini-qna-input {
      flex: 1 1 auto;
      padding: 8px 12px;
      font-size: 14px;
      border: 1px solid #ccc;
      border-radius: 8px;
      background: #ffffff;
      color: #000000;
    }
    #gemini-qna-input::placeholder {
      color: #666666;
    }
    #gemini-qna-btn {
      padding: 8px 14px;
      font-size: 14px;
      border: none;
      background: #1a73e8;
      color: #fff;
      border-radius: 8px;
      cursor: pointer;
    }

    /* 只有在暗色主題偏好時才覆蓋樣式 (Dark Theme Override Only) */
    @media (prefers-color-scheme: dark) {
      #gemini-qna-dialog {
        background: #1f1f1f;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
      }
      #gemini-qna-messages {
        background: #141414;
        color: #ffffff;
      }
      .gemini-msg-user {
        background: #2196f3;
        border-left: 3px solid #1976d2;
        color: #ffffff;
      }
      .gemini-msg-assistant {
        background: #2a2a2a;
        border: 1px solid #404040;
        color: #ffffff;
        border-left: 3px solid #4caf50;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      }
      .gemini-msg-assistant li {
        color: #ffffff;
      }
      .gemini-msg-assistant h1,
      .gemini-msg-assistant h2,
      .gemini-msg-assistant h3,
      .gemini-msg-assistant h4,
      .gemini-msg-assistant h5,
      .gemini-msg-assistant h6 {
        color: #64b5f6;
      }
      .gemini-msg-assistant p {
        color: #ffffff;
      }
      .gemini-msg-assistant pre {
        background: #0d1117;
        color: #f0f6fc;
        border: 1px solid #30363d;
      }
      .gemini-msg-assistant code {
        background: #21262d;
        color: #ff6b6b;
        border: 1px solid #30363d;
      }
      .gemini-msg-assistant strong,
      .gemini-msg-assistant b {
        color: #ffffff;
      }

      /* 暗色主題複製按鈕 */
      .gemini-copy-btn {
        background: rgba(42, 42, 42, 0.9);
        border-color: #555;
      }
      .gemini-copy-btn:hover {
        background: rgba(42, 42, 42, 1);
        border-color: #777;
      }
      .gemini-copy-btn svg {
        fill: #ccc;
      }
      .gemini-copy-btn:hover svg {
        fill: #fff;
      }
      #gemini-qna-input-area {
        background: #1f1f1f;
        border-top: 1px solid #404040;
      }
      #gemini-qna-input {
        background: #2a2a2a;
        border: 1px solid #404040;
        color: #ffffff;
      }
      #gemini-qna-input::placeholder {
        color: #888888;
      }
    }
  `);

    /* --------------------------------------------------
        工具函式
    -------------------------------------------------- */
    function renderMarkdown(md) {
        try {
            const rawHtml = window.marked.parse(md);
            // 安全起見過濾 XSS
            return window.DOMPurify ? window.DOMPurify.sanitize(rawHtml) : rawHtml;
        } catch (err) {
            // 若 marked 未載入成功，退化為純文字換行
            return md.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
        }
    }

    /* --------------------------------------------------
        建立對話框
    -------------------------------------------------- */
    function createDialog() {
        // 在對話框建立之前先捕獲選取文字，避免因為焦點變更而失去選取狀態
        const initialSelection = window.getSelection();
        const capturedSelectedText = initialSelection.toString().trim();

        const overlay = document.createElement('div');
        overlay.id = 'gemini-qna-overlay';

        const dialog = document.createElement('div');
        dialog.id = 'gemini-qna-dialog';

        const messagesEl = document.createElement('div');
        messagesEl.id = 'gemini-qna-messages';

        const inputArea = document.createElement('div');
        inputArea.id = 'gemini-qna-input-area';

        const input = document.createElement('input');
        input.id = 'gemini-qna-input';
        input.type = 'text';
        input.placeholder = '輸入問題後按 Enter 或點擊 Ask 按鈕 (可先選取文字範圍)';

        // ---------- intellisense 指令清單與 UI ----------
        const intelliCommands = [
            { cmd: '/clear', desc: '清除提問歷史紀錄' },
            { cmd: '/summary', desc: '總結本頁內容' },
        ];
        const intelliBox = document.createElement('div');
        intelliBox.id = 'gemini-qna-intellisense';
        intelliBox.style.display = 'none';
        intelliBox.style.position = 'fixed';
        intelliBox.style.left = '0';
        intelliBox.style.top = '0';
        intelliBox.style.zIndex = '2147483648';
        intelliBox.style.background = '#fff';
        intelliBox.style.border = '1px solid #ccc';
        intelliBox.style.borderRadius = '8px';
        intelliBox.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
        intelliBox.style.minWidth = '180px';
        intelliBox.style.fontSize = '14px';
        intelliBox.style.maxHeight = '180px';
        intelliBox.style.overflowY = 'auto';
        intelliBox.style.padding = '4px 0';
        intelliBox.style.color = '#222';
        intelliBox.style.fontFamily = 'inherit';
        intelliBox.style.cursor = 'pointer';
        intelliBox.style.userSelect = 'none';
        intelliBox.style.background = 'var(--gemini-intellisense-bg, #fff)';
        intelliBox.style.color = 'var(--gemini-intellisense-color, #222)';
        intelliBox.style.display = 'none';
        intelliBox.tabIndex = -1;
        inputArea.appendChild(intelliBox);

        const btn = document.createElement('button');
        btn.id = 'gemini-qna-btn';
        btn.textContent = 'Ask';

        inputArea.appendChild(input);
        inputArea.appendChild(btn);

        dialog.appendChild(messagesEl);
        dialog.appendChild(inputArea);
        overlay.appendChild(dialog);

        document.body.appendChild(overlay);
        input.focus();

        // 顯示歡迎訊息和使用說明
        if (capturedSelectedText && capturedSelectedText.length > 0) {
            appendMessage('assistant', `🎯 **已偵測到選取文字** (${capturedSelectedText.length} 字元)\n\n您可以直接提問，系統將以選取的文字作為分析對象。\n\n💡 **可用指令:**\n- \`/clear\` - 清除歷史紀錄\n- \`/summary\` - 總結整個頁面`);
        } else {
            appendMessage('assistant', `💡 **使用提示:**\n\n您可以直接提問關於此頁面的問題，或先選取頁面上的文字範圍後再提問。\n\n**可用指令:**\n- \`/clear\` - 清除歷史紀錄\n- \`/summary\` - 總結整個頁面`);
        }

        /* ---------- 關閉事件 ---------- */
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) {
                hideIntelliBox();
                overlay.remove();
            } else if (!intelliBox.contains(e.target) && !input.contains(e.target)) {
                hideIntelliBox();
            }
        });
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                hideIntelliBox();
                overlay.remove();
            }
        });

        /* ---------- 提問處理 ---------- */
        const promptHistory = JSON.parse(GM_getValue(PROMPT_HISTORY_STORAGE, '[]'));
        let historyIndex = promptHistory.length;

        async function handleAsk() {
            hideIntelliBox(); // 確保浮動提示視窗關閉
            let question = input.value.trim();
            if (!question) return;

            if (question === '/clear') {
                promptHistory.length = 0;
                historyIndex = 0;
                GM_setValue(PROMPT_HISTORY_STORAGE, '[]');
                messagesEl.innerHTML = ''; // 清空畫面對話
                appendMessage('assistant', '已清除您的提問歷史紀錄。');
                input.value = '';
                return;
            }

            if (question === '/summary') {
                question = '請幫我總結這篇文章，並以 Markdown 格式輸出，內容包含「標題」、「重點摘要」、「總結」';
            }

            promptHistory.push(question);
            if (promptHistory.length > 100) {
                promptHistory.shift(); // 限制歷史紀錄最多100筆
            }
            historyIndex = promptHistory.length;
            GM_setValue(PROMPT_HISTORY_STORAGE, JSON.stringify(promptHistory));

            console.log('[AskPage] 使用者提問:', question);
            appendMessage('user', question);
            input.value = '';
            await askGemini(question, capturedSelectedText);
        }

        // ---------- intellisense 功能 ----------
        let intelliActive = false;
        let intelliIndex = 0;
        function showIntelliBox(filtered) {
            if (!filtered.length) {
                intelliBox.style.display = 'none';
                intelliActive = false;
                return;
            }
            intelliBox.innerHTML = '';
            filtered.forEach((item, idx) => {
                const el = document.createElement('div');
                el.className = 'gemini-intelli-item' + (idx === intelliIndex ? ' active' : '');
                el.textContent = `${item.cmd} － ${item.desc}`;
                el.dataset.cmd = item.cmd;
                el.style.padding = '6px 16px';
                el.style.background = idx === intelliIndex ? '#e3f2fd' : '';
                el.style.fontWeight = idx === intelliIndex ? 'bold' : '';
                // 加入點擊事件
                el.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    input.value = item.cmd;
                    hideIntelliBox();
                    handleAsk(); // 直接執行指令
                });
                intelliBox.appendChild(el);
            });
            // 定位在 input 下方
            const rect = input.getBoundingClientRect();
            intelliBox.style.left = rect.left + 'px';
            intelliBox.style.top = rect.bottom + 2 + 'px';
            intelliBox.style.display = 'block';
            intelliActive = true;
        }
        function hideIntelliBox() {
            intelliBox.style.display = 'none';
            intelliActive = false;
            intelliIndex = 0; // 重設選擇索引
        }
        function filterIntelli(val) {
            return intelliCommands.filter(c => c.cmd.startsWith(val));
        }
        input.addEventListener('input', (e) => {
            const val = input.value;
            if (val.startsWith('/')) {
                const filtered = filterIntelli(val);
                intelliIndex = 0;
                showIntelliBox(filtered);
            } else {
                hideIntelliBox();
            }
        });

        input.addEventListener('keydown', (e) => {
            if (intelliActive) {
                const val = input.value;
                const filtered = filterIntelli(val);
                if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    intelliIndex = (intelliIndex + 1) % filtered.length;
                    showIntelliBox(filtered);
                } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    intelliIndex = (intelliIndex - 1 + filtered.length) % filtered.length;
                    showIntelliBox(filtered);
                } else if (e.key === 'Enter' || e.key === 'Tab') {
                    if (filtered.length) {
                        e.preventDefault();
                        input.value = filtered[intelliIndex].cmd;
                        hideIntelliBox();
                        intelliActive = false; // 確保標記為非活動狀態
                        handleAsk(); // 直接執行指令
                    }
                } else if (e.key === 'Escape') {
                    hideIntelliBox();
                }
                return; // 防止 intellisense 狀態下觸發下方歷史紀錄邏輯
            }
            if (e.key === 'Enter') {
                e.preventDefault();
                handleAsk();
            } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                if (historyIndex > 0) {
                    historyIndex--;
                    input.value = promptHistory[historyIndex];
                }
            } else if (e.key === 'ArrowDown') {
                e.preventDefault();
                if (historyIndex < promptHistory.length - 1) {
                    historyIndex++;
                    input.value = promptHistory[historyIndex];
                } else {
                    historyIndex = promptHistory.length;
                    input.value = '';
                }
            }
        }, true);
        btn.addEventListener('click', handleAsk);

        /* ---------- 顯示訊息 ---------- */
        function appendMessage(role, text) {
            const div = document.createElement('div');
            div.className = role === 'user' ? 'gemini-msg-user' : 'gemini-msg-assistant';

            if (role === 'assistant') {
                div.innerHTML = renderMarkdown(text);

                // 為助手訊息加入複製按鈕
                const copyBtn = document.createElement('button');
                copyBtn.className = 'gemini-copy-btn';
                copyBtn.title = '複製 Markdown 內容';
                copyBtn.innerHTML = `
                    <svg viewBox="0 0 24 24">
                        <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                    </svg>
                `;

                // 複製功能
                copyBtn.addEventListener('click', async (e) => {
                    e.preventDefault();
                    e.stopPropagation();

                    try {
                        await navigator.clipboard.writeText(text);

                        // 視覺回饋
                        copyBtn.classList.add('copied');
                        copyBtn.innerHTML = `
                            <svg viewBox="0 0 24 24">
                                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                            </svg>
                        `;
                        copyBtn.title = '已複製！';

                        setTimeout(() => {
                            copyBtn.classList.remove('copied');
                            copyBtn.innerHTML = `
                                <svg viewBox="0 0 24 24">
                                    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                                </svg>
                            `;
                            copyBtn.title = '複製 Markdown 內容';
                        }, 1500);

                    } catch (err) {
                        console.error('[AskPage] 複製失敗:', err);

                        // 失敗回饋
                        copyBtn.style.background = '#f44336';
                        copyBtn.style.borderColor = '#f44336';
                        copyBtn.innerHTML = `
                            <svg viewBox="0 0 24 24">
                                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                            </svg>
                        `;
                        copyBtn.title = '複製失敗';

                        setTimeout(() => {
                            copyBtn.style.background = '';
                            copyBtn.style.borderColor = '';
                            copyBtn.innerHTML = `
                                <svg viewBox="0 0 24 24">
                                    <path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/>
                                </svg>
                            `;
                            copyBtn.title = '複製 Markdown 內容';
                        }, 1500);
                    }
                });

                div.appendChild(copyBtn);
            } else {
                div.textContent = (role === 'user' ? '你: ' : 'Gemini: ') + text;
            }

            messagesEl.appendChild(div);
            messagesEl.scrollTop = messagesEl.scrollHeight;
        }

        /* ---------- 呼叫 Gemini ---------- */
        async function askGemini(question, capturedSelectedText = '') {
            if (!apiKey) {
                appendMessage('assistant', '請先在 Tampermonkey 選單設定 API Key。');
                return;
            }

            console.log('[AskPage] 開始處理問題:', question);
            appendMessage('assistant', '...thinking...');

            // 取得整個頁面的內容作為基礎 context
            let container;
            if (document.querySelector('main')) {
                container = document.querySelector('main');
            } else {
                const articles = document.querySelectorAll('article');
                if (articles.length === 1) {
                    container = articles[0];
                } else {
                    container = document.body;
                }
            }
            const fullPageText = container.innerText.slice(0, 15000);

            // 取得當前時間與時區資訊
            const now = new Date();
            const timeString = now.toLocaleString('zh-TW', {
                timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                year: 'numeric',
                month: '2-digit',
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                weekday: 'long'
            });
            const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
            const currentTimeInfo = `Current time: ${timeString} (${timeZone})`;

            // 根據是否有選取文字來構建不同的 context 和提示
            let contextParts = [];
            let contentSource;
            let systemPrompt;

            if (capturedSelectedText && capturedSelectedText.length > 0) {
                // 有選取文字：提供完整頁面 + 重點選取文字
                contentSource = '選取文字（含完整頁面背景）';
                systemPrompt = `You are a helpful assistant that answers questions about web page content. The user has selected specific text that they want to focus on, but you also have the full page context for background understanding. Please focus primarily on the selected text while using the full page context to provide comprehensive answers. Answer only in zh-tw.

${currentTimeInfo}`;

                contextParts.push(
                    { text: `Full page content for context:\n${fullPageText}` },
                    { text: `Selected text (main focus):\n${capturedSelectedText.slice(0, 5000)}` },
                    { text: question }
                );

                console.log('[AskPage] 使用選取文字 + 完整頁面背景，選取文字長度:', capturedSelectedText.length, '，完整頁面長度:', fullPageText.length);
            } else {
                // 沒有選取文字：只使用完整頁面
                contentSource = '整個頁面';
                systemPrompt = `You are a helpful assistant that answers questions about the provided web page content. Please format your answer using Markdown when appropriate. Answer only in zh-tw.

${currentTimeInfo}`;

                contextParts.push(
                    { text: `Page content:\n${fullPageText}` },
                    { text: question }
                );

                console.log('[AskPage] 使用整個頁面內容，長度:', fullPageText.length);
            }

            let responseData;
            try {
                console.log('[AskPage] 準備呼叫 Gemini API，使用模型:', selectedModel);
                // 使用 GM_xmlhttpRequest 而非 fetch 來避免 CSP 問題
                responseData = await new Promise((resolve, reject) => {
                    GM_xmlhttpRequest({
                        method: 'POST',
                        url: `https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        data: JSON.stringify({
                            contents: [
                                {
                                    role: 'user',
                                    parts: [
                                        { text: systemPrompt },
                                        ...contextParts
                                    ],
                                },
                            ],
                            generationConfig: {
                                temperature: 0.7,
                                topP: 0.95,
                                maxOutputTokens: 1024,
                            },
                        }),
                        onload: (response) => {
                            console.log('[AskPage] API 回應狀態:', response.status);
                            if (response.status >= 200 && response.status < 300) {
                                try {
                                    const parsedResponse = JSON.parse(response.responseText);
                                    console.log('[AskPage] API 回應解析成功');
                                    resolve(parsedResponse);
                                } catch (parseError) {
                                    console.error('[AskPage] JSON 解析錯誤:', parseError);
                                    reject(new Error(`JSON 解析錯誤: ${parseError.message}`));
                                }
                            } else {
                                console.error('[AskPage] API 錯誤回應:', response.status, response.statusText);
                                reject(new Error(`${response.status} ${response.statusText}`));
                            }
                        },
                        onerror: (error) => {
                            console.error('[AskPage] 網路錯誤:', error);
                            reject(new Error(`網路錯誤: ${error.error || 'Unknown error'}`));
                        },
                        ontimeout: () => {
                            console.error('[AskPage] 請求逾時');
                            reject(new Error('請求逾時'));
                        },
                        timeout: 30000, // 30 秒逾時
                    });
                });

                console.log('[AskPage] API 呼叫成功');
            } catch (err) {
                console.error('[AskPage] API 呼叫失敗:', err);
                messagesEl.removeChild(messagesEl.lastChild); // 移除 thinking 訊息
                appendMessage('assistant', `錯誤: ${err}`);
                return;
            }

            messagesEl.removeChild(messagesEl.lastChild); // 移除 thinking 訊息

            const answer =
                responseData.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ||
                '未取得回應';
            console.log('[AskPage] 準備顯示回應，長度:', answer.length);
            appendMessage('assistant', answer);
        }
    }

    /* --------------------------------------------------
        快捷鍵 Ctrl+I
    -------------------------------------------------- */
    window.addEventListener('keydown', (e) => {
        if (
            e.ctrlKey &&
            e.key.toLowerCase() === 'i' &&
            !document.getElementById('gemini-qna-overlay')
        ) {
            console.log('[AskPage] 偵測到 Ctrl+I 快捷鍵，建立對話框');
            e.preventDefault();
            createDialog();
        }
    });
})();
