// ==UserScript==
// @name         ChatGPT 語音輸入介面 (支援中/英/日/韓語言)
// @version      1.5
// @description  讓你可以透過語音輸入要問 ChatGPT 的問題 (支援中文、英文、日文、韓文)
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ChatGPTVoiceInput.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ChatGPTVoiceInput.user.js
// @match        *://chat.openai.com/chat
// @author       Will Huang
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    var logLevel = 1; // 0: None, 1: Information, 2: Debug

    var IsAutoStart = true;

    var EnableSpeechSynthesis = true;

    var ChatGPTRunningStatus = false;

    // https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API
    const SpeechRecognition = window.SpeechRecognition || webkitSpeechRecognition;
    // const SpeechGrammarList = window.SpeechGrammarList || webkitSpeechGrammarList;
    // const SpeechRecognitionEvent = window.SpeechRecognitionEvent || webkitSpeechRecognitionEvent;

    class VoiceInputHelper {

        IsStarted = false;

        Parts = [];

        Restart = true;

        Lang;

        defaultLang = 'cmn-Hant-TW';

        _commands = {
            enter: {
                terms: [
                    'enter',
                    '送出',
                    '去吧',
                    '開始',
                    '狂奔吧',
                    '跑起來',
                    'Run',
                    'go'
                ],
                match: 'exact' // prefix, exact, postfix
            },
            reload: {
                terms: [
                    'reload',
                    '重新整理',
                    '重載頁面',
                ],
                match: 'exact' // prefix, exact, postfix
            },
            clear: {
                terms: [
                    'clear',
                    '重新輸入',
                    '清除',
                    '清空',
                    '淨空'
                ],
                match: 'exact' // prefix, exact, postfix
            },
            delete: {
                terms: [
                    'delete',
                    '刪除',
                    '刪除上一句'
                ],
                match: 'exact' // prefix, exact, postfix
            },
            paste: {
                terms: [
                    'paste',
                    '貼上',
                    '貼上剪貼簿'
                ],
                match: 'exact' // prefix, exact, postfix
            },
            explain_code: {
                terms: [
                    '請說明以下程式碼',
                    '請說明一下程式碼',
                    '說明一下程式碼',
                    '說明以下程式碼'
                ],
                match: 'exact' // prefix, exact, postfix
            },
            逗點: {
                terms: [
                    'comma',
                    '逗號',
                    '逗點'
                ],
                match: 'exact' // prefix, exact, postfix
            },
            句點: {
                terms: [
                    'period',
                    '句號',
                    '句點'
                ],
                match: 'exact' // prefix, exact, postfix
            },
            問號: {
                terms: [
                    'questionmark',
                    '問號'
                ],
                match: 'exact' // prefix, exact, postfix
            },
            換行: {
                terms: [
                    'newline',
                    '換行',
                    '斷行'
                ],
                match: 'exact' // prefix, exact, postfix
            },
            重置: {
                terms: [
                    'reset',
                    '重置',
                    '重新開始',
                    'リセット', // Risetto
                    '초기화' // chogihwa
                ],
                match: 'exact' // prefix, exact, postfix
            },
            切換至中文模式: {
                terms: [
                    '切換至中文模式',
                    '切換到中文模式',
                    '切換至中文',
                    '切換到中文',
                    '切換至中語模式',
                    '切換到中語模式',
                    '切換至中語',
                    '切換到中語',
                    'switch to Chinese mode'
                ],
                match: 'exact' // prefix, exact, postfix
            },
            切換至英文模式: {
                terms: [
                    '切換至英文模式',
                    '切換到英文模式',
                    '切換至英文',
                    '切換到英文',
                    '切換至英語模式',
                    '切換到英語模式',
                    '切換至英語',
                    '切換到英語',
                    'switch to English mode'
                ],
                match: 'exact' // prefix, exact, postfix
            },
            切換至日文模式: {
                terms: [
                    '切換至日文模式',
                    '切換到日文模式',
                    '切換至日文',
                    '切換到日文',
                    '切換至日語模式',
                    '切換到日語模式',
                    '切換至日語',
                    '切換到日語',
                    'switch to Japanese mode'
                ],
                match: 'exact' // prefix, exact, postfix
            },
            切換至韓文模式: {
                terms: [
                    '切換至韓文模式',
                    '切換到韓文模式',
                    '切換至韓文',
                    '切換到韓文',
                    '切換至韓語模式',
                    '切換到韓語模式',
                    '切換至韓語',
                    '切換到韓語',
                    'switch to Korea mode'
                ],
                match: 'exact' // prefix, exact, postfix
            },
            關閉語音辨識: {
                terms: [
                    '關閉語音辨識',
                    '關閉語音'
                ],
                match: 'exact' // prefix, exact, postfix
            },
        };

        constructor(lang) {
            if (lang) { this.defaultLang = lang; }
        }

        getCommandByTranscript(str) {
            let cmdId = '';
            for (const commandId in this._commands) {
                if (Object.hasOwnProperty.call(this._commands, commandId)) {
                    const cmd = this._commands[commandId];
                    for (const term of cmd.terms) {
                        let regex = new RegExp(term, "i");
                        if (cmd.match === 'prefix') { regex = new RegExp('^' + term, "i"); }
                        if (cmd.match === 'postfix') { regex = new RegExp(term + '$', "i"); }
                        if (navigator.userAgent.indexOf('Edg/') >= 0 && str.substring(str.length - 1, 1) == '。') {
                            str = str.slice(0, -1);
                        }
                        if (str.search(regex) !== -1) {
                            return commandId;
                        }
                    }
                }
            }
            return ''
        }

        Init(textarea, button) {
            // console.log(textarea, button);

            this.recognition = new SpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = true;

            this.setLang();

            // 如果目前瀏覽器頁籤抓不到麥克風資源 (例如有兩個 Tab 都想要麥克風)，那麼就會一直不斷的停止語音辨識！
            var retry_backoff = [0, 1, 2, 4, 8, 16, 32];
            var retry_count = 0;
            var retry_timer;

            this.recognition.onstart = () => {
                (logLevel >= 1) && console.log('開始進行 SpeechRecognition 語音辨識');
                retry_timer = setTimeout(() => {
                    (logLevel >= 2) && console.log('啟動 SpeechRecognition 語音辨識 - 成功');
                    retry_count = 0;
                    retry_timer = undefined;
                }, 2000);
                this.IsStarted = true;
            };

            this.recognition.onend = () => {
                (logLevel >= 1) && console.log('停止 SpeechRecognition 語音辨識!');
                this.IsStarted = false;
                if (retry_timer) {
                    (logLevel >= 1) && console.warn('啟動 SpeechRecognition 語音辨識 - 失敗 (可能有其他頁籤在搶用麥克風)');
                    clearTimeout(retry_timer);
                }
                if (retry_count < retry_backoff.length) {
                    setTimeout(() => {
                        if (this.Restart) {
                            this.recognition.start();
                        }
                    }, retry_backoff[retry_count++] * 1000);
                }
            };

            this.recognition.onresult = async (event) => {
                (logLevel >= 2) && console.log('語音識別事件: ', event);

                let results = event.results[event.resultIndex];

                (logLevel >= 2) && console.log('results.length', results.length);
                let transcript = results[0].transcript; // 理論上只會有一個結果

                (logLevel >= 2) && console.log('語音輸入: ' + transcript, 'isFinal: ', results.isFinal);

                if (this.Parts.length == 0) {
                    this.Parts[0] = transcript;
                } else {
                    this.Parts[this.Parts.length - 1] = transcript;
                }

                textarea.value = this.Parts.join('') + '...';
                textarea.dispatchEvent(new Event('input', { bubbles: true }));

                if (results.isFinal) {
                    (logLevel >= 2) && console.log('Final Result: ', results);

                    let id = this.getCommandByTranscript(this.Parts[this.Parts.length - 1]);
                    (logLevel >= 2) && console.log('id = ', id);
                    switch (id) {
                        case 'enter':
                            this.Parts.pop();
                            if (this.Parts.length > 0) {
                                textarea.value = this.Parts.join('');
                                textarea.dispatchEvent(new Event('input', { bubbles: true }));
                                button.click();
                                this.Parts = [];

                                vi.Reset();
                                if (vi.IsStarted) {
                                    vi.Stop();
                                }
                            }
                            break;

                        case 'clear':
                            this.Parts = [];
                            break;

                        case 'reload':
                            location.reload();
                            break;

                        case 'delete':
                            this.Parts.pop();
                            this.Parts.pop();
                            break;

                        case '逗點':
                            if (navigator.userAgent.indexOf('Edg/') == -1) {
                                this.Parts[this.Parts.length - 1] = '，';
                            }
                            break;

                        case '句點':
                            if (navigator.userAgent.indexOf('Edg/') == -1) {
                                this.Parts[this.Parts.length - 1] = '。';
                            }
                            break;

                        case '問號':
                            if (navigator.userAgent.indexOf('Edg/') == -1) {
                                this.Parts[this.Parts.length - 1] = '？';
                            }
                            break;

                        case '換行':
                            this.Parts[this.Parts.length - 1] = '\r\n';
                            break;

                        case '重置':
                            this.Reset();
                            break;

                        case '切換至中文模式':
                            (logLevel >= 2) && console.log('切換至中文模式');
                            this.setLang('cmn-Hant-TW');
                            this.Parts[this.Parts.length - 1] = '';
                            break;

                        case '切換至英文模式':
                            (logLevel >= 2) && console.log('切換至英文模式');
                            this.setLang('en-US');
                            this.Parts[this.Parts.length - 1] = '';
                            break;

                        case '切換至日文模式':
                        case '切換至日文':
                            (logLevel >= 2) && console.log('切換至日文模式');
                            this.setLang('ja-JP');
                            this.Parts[this.Parts.length - 1] = '';
                            break;

                        case '切換至韓文模式':
                            (logLevel >= 2) && console.log('切換至韓文模式');
                            this.setLang('ko-KR');
                            this.Parts[this.Parts.length - 1] = '';
                            break;

                        case '關閉語音辨識':
                            (logLevel >= 2) && console.log('關閉語音辨識');
                            this.Stop();
                            break;

                        case 'paste':
                            this.Parts.pop();
                            (logLevel >= 2) && console.log('貼上剪貼簿');

                            this.Parts = [...this.Parts, '\r\n\r\n'];
                            var code = await window.navigator.clipboard.readText();
                            this.Parts = [...this.Parts, code];
                            this.Parts = [...this.Parts, '\r\n\r\n'];
                            break;

                        case 'explain_code':
                            this.Parts[this.Parts.length - 1] = this.Parts[this.Parts.length - 1].replace(/\.\.\.$/g, '');
                            (logLevel >= 2) && console.log('確認輸入 (說明程式碼)');

                            this.Parts = [...this.Parts, '\r\n\r\n'];
                            var code = await window.navigator.clipboard.readText();
                            this.Parts = [...this.Parts, code];
                            this.Parts = [...this.Parts, '\r\n\r\n'];
                            break;

                        default:
                            this.Parts[this.Parts.length - 1] = this.Parts[this.Parts.length - 1].replace(/\.\.\.$/g, '');
                            (logLevel >= 2) && console.log('確認輸入');

                            let firstPart = this.Parts[0];
                            let lastChar = this.Parts[this.Parts.length - 1].split('').pop();
                            if (firstPart.indexOf('什麼') == 0 || firstPart.indexOf('甚麼') == 0 || lastChar === '嗎' || lastChar === '呢') {
                                this.Parts[this.Parts.length - 1] += '？';
                            }
                            break;
                    }

                    this.Parts = [...this.Parts, ''];

                    textarea.value = this.Parts.join('');
                    textarea.dispatchEvent(new Event('input', { bubbles: true }));
                }

            };

        }

        setLang(lang) {
            // https://stackoverflow.com/a/68742566/910074
            if (lang) {
                this.Lang = lang;
            }

            this.recognition.lang = this.Lang || this.defaultLang;
        }

        Reset() {
            this.Parts = [];
            this.setLang(this.defaultLang);
        }

        Start() {
            this.Restart = true;
            if (!this.recognition.IsStarted) {
                this.recognition.start();
            }
        }

        Stop() {
            this.Restart = false;
            if (this.recognition.IsStarted) {
                this.recognition.stop();
            }
        }

        Abort() {
            this.Restart = false;
            if (this.recognition.IsStarted) {
                this.recognition.abort();
            }
        }

    }

    var vi = new VoiceInputHelper();

    let sti = setInterval(() => {
        let element = document.activeElement;
        if (element.tagName === 'TEXTAREA' && element.nextSibling.tagName === 'BUTTON') {

            var textarea = element;
            var button = textarea.nextSibling.tagName;

            if (EnableSpeechSynthesis) {
                RunSpeechSynthesis();
            }

            vi.Init(textarea, textarea.nextSibling);

            // 檢查麥克風是否有效
            (logLevel >= 2) && console.log('Checking Audio availability!');
            navigator.getUserMedia({ audio: true },
                function (stream) {
                    // Microphone is usable.
                    (logLevel >= 2) && console.log("Microphone is usable.");
                    if (IsAutoStart) {
                        (logLevel >= 1) && console.log("自動啟動語音辨識功能");
                        vi.Start();
                    }
                },
                function (error) {
                    // Microphone is not usable.
                    (logLevel >= 2) && console.log("Microphone is not usable: " + error);
                }
            );

            // 選取文字會透過 SpeechSynthesis 播放合成語音
            var speak_timeout = 0;
            document.addEventListener('selectionchange', function () {
                if (speak_timeout > 0) {
                    clearTimeout(speak_timeout);
                }

                // Get the current selection on the page
                var selection = window.getSelection();

                // Check if there is a selection
                if (selection.rangeCount > 0 && !selection.isCollapsed) {
                    // Get the first range of the selection (usually the only one)
                    var range = selection.getRangeAt(0);

                    // Get the selected text
                    var selectedText = range.toString();
                    (logLevel >= 2) && console.log('Get the selected text: ', selectedText);

                    if (speechSynthesis.speaking) {
                        (logLevel >= 2) && console.log('正在播放合成語音中，取消本次播放！');
                        speechSynthesis.cancel();
                    }

                    speak_timeout = setTimeout(() => {
                        // debugger;
                        speak(selectedText);
                    }, 1000);
                }
            });

            // 設定一些快速鍵
            document.addEventListener('keydown', (ev) => {
                if (ev.key === 'Escape') {
                    if (speechSynthesis.speaking) { speechSynthesis.cancel(); }
                    vi.Reset();
                    if (!vi.IsStarted) {
                        vi.Start();
                    }
                    var elm = document.querySelector('textarea');
                    elm.value = ''
                    elm.dispatchEvent(new Event('input', { bubbles: true }));
                    elm.focus();
                    return;
                }
                if (ev.key === 'Enter' && /^(?:textarea)$/i.test(ev.target.nodeName)) {
                    if (speechSynthesis.speaking) { speechSynthesis.cancel(); }
                    vi.Reset();
                    if (vi.IsStarted) {
                        vi.Stop();
                    }
                    ev.target.value = ''
                    ev.target.dispatchEvent(new Event('input', { bubbles: true }));
                    return;
                }
                if (ev.altKey && (ev.key === 's' || ev.key === 'S')) {
                    if (speechSynthesis.speaking) { speechSynthesis.cancel(); }
                    if (vi.IsStarted) {
                        vi.Restart = false;
                        vi.Stop();
                    } else {
                        vi.Restart = true;
                        vi.Start();
                    }
                }
                if (ev.altKey && ev.key === 't' /* && !/^(?:input|select|textarea|button)$/i.test(ev.target.nodeName) */) {
                    if (speechSynthesis.speaking) { speechSynthesis.cancel(); }
                    vi.Restart = false;
                    if (vi.IsStarted) {
                        vi.Stop();
                    }
                }
                if (ev.altKey && ev.key === 'r' /* && !/^(?:input|select|textarea|button)$/i.test(ev.target.nodeName) */) {
                    if (speechSynthesis.speaking) { speechSynthesis.cancel(); }
                    vi.Reset()
                    textarea.value = vi.Parts.join('');
                    textarea.dispatchEvent(new Event('input', { bubbles: true }));
                }
            });

            clearInterval(sti);
        }
    }, 100);

    // Utilities

    function RunSpeechSynthesis() {

        // 停止監測
        // if (observer) {
        //     observer.disconnect();
        // }

        // 給我一個一行的笑話
        var utterance_queue = [];

        setInterval(() => {
            if (utterance_queue.length > 0) {
                (logLevel >= 2) && console.log('發現 utterance_queue', utterance_queue.length);
                speak(utterance_queue.shift());
            }
        }, 60);

        // 監測對象
        var target = document.getElementsByTagName('main')[0]

        // 監測設定
        var config = {
            attributes: false, // 監測屬性變更
            childList: true,   // 監測子節點的變更
            subtree: true,     // 監測所有從 target 開始的子節點
            characterData: true
        };

        var lastParagraphElement;

        // 監測器
        var observer = new MutationObserver(function (mutations) {

            // 顯示通知
            (logLevel >= 2) && console.log(`監測到 ${mutations.length} 個變更`, mutations);

            mutations.forEach(mutation => {
                (logLevel >= 2) && console.log(`TYPE: ${mutation.type}, 新增 ${mutation.addedNodes.length} 個節點，刪除 ${mutation.removedNodes.length} 個節點`);
                if (mutation.type === 'characterData' && (mutation.target.parentNode.tagName === 'P' || mutation.target.parentNode.tagName === 'LI')) {
                    (logLevel >= 2) && console.log(mutation.target);
                    (logLevel >= 2) && console.log(lastParagraphElement);
                    (logLevel >= 2) && console.log(mutation.target.parentNode);

                    ChatGPTRunningStatus = true; // 只要有字元在異動，就代表正在跑！

                    // debugger;
                    if (lastParagraphElement && lastParagraphElement != mutation.target.parentNode) {
                        (logLevel >= 2) && console.log('lastParagraphElement = ', lastParagraphElement);
                        utterance_queue.push(lastParagraphElement.textContent)
                    }
                    lastParagraphElement = mutation.target.parentNode;
                }

                if (mutation.type === 'childList' && mutation.target.tagName === 'BUTTON' && mutation.addedNodes.length === 1 && mutation.addedNodes[0].nodeName === 'svg' && mutation.addedNodes[0].textContent === '') {
                    (logLevel >= 2) && console.log('!!加入語音佇列!!', lastParagraphElement);

                    // 通常文字打完了，最後一句可能都還沒開始唸，所以要等一下才能視為結束。
                    setTimeout(() => {
                        ChatGPTRunningStatus = false;
                    }, 1000);

                    utterance_queue.push(lastParagraphElement.textContent)
                    lastParagraphElement = undefined;
                }
            })
        });

        // 啟動監測
        observer.observe(target, config);

    }

    function speak(text) {
        var origRestart = vi.Restart;
        vi.Abort();

        (logLevel >= 1) && console.log(`準備合成閱讀文章語音: ${text}`);
        let utterance = new SpeechSynthesisUtterance(text);

        const voice = speechSynthesis.getVoices().filter(x => x.lang === 'zh-TW').pop();
        (logLevel >= 2) && console.log('你選用的發音來源是', voice);
        utterance.voice = voice;

        // 語速
        utterance.rate = 1.3; // 0.1 ~ 10, default: 1

        utterance.onstart = (evt) => {
            (logLevel >= 2) && console.log('開始發音', evt);
            if (vi.IsStarted) {
                vi.Abort();
            }
        }

        utterance.onend = (evt) => {
            (logLevel >= 2) && console.log('結束發音', evt, origRestart);
            if (!ChatGPTRunningStatus && !speechSynthesis.pending) {
                vi.Start();
            }
        }

        utterance.onerror = (evt) => {
            (logLevel >= 2) && console.log('發音過程失敗', evt);
        }

        speechSynthesis.speak(utterance);
    }
})();
