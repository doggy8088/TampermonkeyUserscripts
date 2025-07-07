// ==UserScript==
// @name         AskPage 頁問 (Ctrl+I)
// @version      0.3.1
// @description  (Ctrl+I) 使用 Gemini API 詢問關於目前頁面的問題
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

    /* --------------------------------------------------
        設定 / 變數
    -------------------------------------------------- */
    const API_KEY_STORAGE = 'GEMINI_API_KEY';
    const PROMPT_HISTORY_STORAGE = 'ASKPAGE_PROMPT_HISTORY';
    let apiKey = GM_getValue(API_KEY_STORAGE, '');

    /* --------------------------------------------------
        API Key 設定選單
    -------------------------------------------------- */
    GM_registerMenuCommand('設定 Gemini API Key', () => {
        if (document.getElementById('gemini-settings-overlay')) return;
        /* ---------- 建立遮罩 ---------- */
        const overlay = document.createElement('div');
        overlay.id = 'gemini-settings-overlay';

        /* ---------- 建立對話框 ---------- */
        const panel = document.createElement('div');
        panel.id = 'gemini-settings-panel';

        const label = document.createElement('label');
        label.textContent = '請輸入 Gemini API Key';

        const input = document.createElement('input');
        input.type = 'password';
        input.value = apiKey || '';

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

        panel.appendChild(label);
        panel.appendChild(input);
        panel.appendChild(btnBar);
        overlay.appendChild(panel);
        document.body.appendChild(overlay);
        input.focus();

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
            apiKey = input.value.trim();
            GM_setValue(API_KEY_STORAGE, apiKey);
            console.log('[AskPage] API Key 已儲存');
            alert('已儲存 API Key');
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
        input.placeholder = '輸入問題後按 Enter 或點 Ask';

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

        /* ---------- 關閉事件 ---------- */
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
        window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') overlay.remove();
        });

        /* ---------- 提問處理 ---------- */
        const promptHistory = JSON.parse(GM_getValue(PROMPT_HISTORY_STORAGE, '[]'));
        let historyIndex = promptHistory.length;

        async function handleAsk() {
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
            await askGemini(question);
        }""

        input.addEventListener('keydown', (e) => {
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
        });
        btn.addEventListener('click', handleAsk);""

        /* ---------- 顯示訊息 ---------- */
        function appendMessage(role, text) {
            const div = document.createElement('div');
            div.className = role === 'user' ? 'gemini-msg-user' : 'gemini-msg-assistant';
            if (role === 'assistant') {
                div.innerHTML = renderMarkdown(text);
            } else {
                div.textContent = (role === 'user' ? '你: ' : 'Gemini: ') + text;
            }
            messagesEl.appendChild(div);
            messagesEl.scrollTop = messagesEl.scrollHeight;
        }

        /* ---------- 呼叫 Gemini ---------- */
        async function askGemini(question) {
            if (!apiKey) {
                appendMessage('assistant', '請先在 Tampermonkey 選單設定 API Key。');
                return;
            }

            console.log('[AskPage] 開始處理問題:', question);
            appendMessage('assistant', '...thinking...');

            // 抓取 <main> 文字，若不存在則用 body（最多 15,000 字元）
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
            const pageText = container.innerText.slice(0, 15000);
            console.log('[AskPage] 擷取頁面文字長度:', pageText.length);

            let responseData;
            try {
                console.log('[AskPage] 準備呼叫 Gemini API');
                // 使用 GM_xmlhttpRequest 而非 fetch 來避免 CSP 問題
                responseData = await new Promise((resolve, reject) => {
                    GM_xmlhttpRequest({
                        method: 'POST',
                        url: `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite-preview-06-17:generateContent?key=${apiKey}`,
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        data: JSON.stringify({
                            contents: [
                                {
                                    role: 'user',
                                    parts: [
                                        {
                                            text:
                                                'You are a helpful assistant that answers questions about the provided web page. Please format your answer using Markdown when appropriate. Answer only in zh-tw.',
                                        },
                                        { text: `Page content (truncated):\n${pageText}` },
                                        { text: question },
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
