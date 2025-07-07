// ==UserScript==
// @name         AskPage 頁問 (Ctrl+I)
// @version      0.1.1
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
    let apiKey = GM_getValue(API_KEY_STORAGE, '');

    /* --------------------------------------------------
        API Key 設定選單
    -------------------------------------------------- */
    GM_registerMenuCommand('設定 Gemini API Key', () => {
        /* ---------- 建立遮罩 ---------- */
        const overlay = document.createElement('div');
        overlay.style.cssText =
            'position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;z-index:2147483647;';

        /* ---------- 建立對話框 ---------- */
        const panel = document.createElement('div');
        panel.style.cssText =
            'background:#fff;padding:20px 24px;border-radius:10px;min-width:260px;box-shadow:0 4px 12px rgba(0,0,0,.2);display:flex;flex-direction:column;gap:12px;';

        const label = document.createElement('label');
        label.textContent = '請輸入 Gemini API Key';

        const input = document.createElement('input');
        input.type = 'password';               // ← 以密碼模式顯示，隱藏內容
        input.value = apiKey || '';
        input.style.cssText =
            'padding:8px 10px;font-size:14px;border:1px solid #ccc;border-radius:6px;';

        /* ---------- 按鈕 ---------- */
        const btnBar = document.createElement('div');
        btnBar.style.cssText = 'display:flex;justify-content:flex-end;gap:8px;';

        const btnCancel = document.createElement('button');
        btnCancel.textContent = '取消';

        const btnSave = document.createElement('button');
        btnSave.textContent = '儲存';
        btnSave.style.cssText = 'background:#1a73e8;color:#fff;border:none;padding:6px 14px;border-radius:6px;cursor:pointer;';

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
            alert('已儲存 API Key');
            close();
        });
    });

    /* --------------------------------------------------
        UI 樣式
    -------------------------------------------------- */
    GM_addStyle(`
    #gemini-qna-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 2147483647;
    }
    #gemini-qna-dialog {
      width: min(700px, 92%);
      max-height: 85vh;
      background: #fff;
      border-radius: 12px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      font-family: system-ui, -apple-system, Roboto, "Segoe UI", Helvetica, Arial, sans-serif, Apple Color Emoji, Segoe UI Emoji;
    }
    #gemini-qna-messages {
      flex: 1 1 auto;
      padding: 16px;
      overflow-y: auto;
      color: #202124;
      line-height: 1.55;
    }
    .gemini-msg-user {
      font-weight: 600;
      margin-bottom: 4px;
      color: #1a73e8;
      white-space: pre-wrap;
    }
    .gemini-msg-assistant {
      margin-bottom: 12px;
      color: #202124;
      white-space: normal; /* 允許 HTML mark-up 自然排版 */
    }
    /* 讓程式碼區塊更好讀 */
    .gemini-msg-assistant pre {
      background: #f1f3f4;
      padding: 8px 12px;
      border-radius: 6px;
      overflow: auto;
    }
    .gemini-msg-assistant code {
      background: #f1f3f4;
      padding: 2px 4px;
      border-radius: 4px;
      font-family: monospace;
    }
    #gemini-qna-input-area {
      display: flex;
      align-items: center;
      padding: 12px;
      border-top: 1px solid #ddd;
      gap: 8px;
    }
    #gemini-qna-input {
      flex: 1 1 auto;
      padding: 8px 12px;
      font-size: 14px;
      border: 1px solid #ccc;
      border-radius: 8px;
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
        async function handleAsk() {
            const question = input.value.trim();
            if (!question) return;
            appendMessage('user', question);
            input.value = '';
            await askGemini(question);
        }

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleAsk();
            }
        });
        btn.addEventListener('click', handleAsk);

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

            appendMessage('assistant', '...thinking...');

            // 抓取 <main> 文字，若不存在則用 body（最多 15,000 字元）
            const container = document.querySelector('main') || document.body;
            const pageText = container.innerText.slice(0, 15000);

            let response;
            try {
                response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite-preview-06-17:generateContent?key=${apiKey}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
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
                    },
                );

                if (!response.ok) {
                    throw new Error(`${response.status} ${response.statusText}`);
                }
                response = await response.json();
            } catch (err) {
                messagesEl.removeChild(messagesEl.lastChild); // 移除 thinking 訊息
                appendMessage('assistant', `錯誤: ${err}`);
                return;
            }

            messagesEl.removeChild(messagesEl.lastChild); // 移除 thinking 訊息

            const answer =
                response.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') ||
                '未取得回應';
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
            e.preventDefault();
            createDialog();
        }
    });
})();
