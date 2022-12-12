// ==UserScript==
// @name         ChatGPT 語音輸入介面 (支援中/英/日/韓語言)
// @version      1.5.2
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

(async function () {
    'use strict';

    const {
        Observable,
        catchError,
        defer,
        filter,
        fromEvent,
        interval,
        map,
        of,
        retry,
        shareReplay,
        switchMap,
        take,
        tap,
        timer
    } = await import('https://cdn.jsdelivr.net/npm/@esm-bundle/rxjs/esm/es2015/rxjs.min.js');

    const svgMicOn = '<svg stroke="currentColor" fill="currentColor" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="16px" height="16px" viewBox="0 0 16 16" version="1.1"><path d="M 8 8.949219 C 7.523438 8.949219 7.121094 8.777344 6.800781 8.433594 C 6.476562 8.089844 6.316406 7.671875 6.316406 7.183594 L 6.316406 3 C 6.316406 2.535156 6.480469 2.140625 6.808594 1.816406 C 7.136719 1.496094 7.535156 1.332031 8 1.332031 C 8.464844 1.332031 8.863281 1.496094 9.191406 1.816406 C 9.519531 2.140625 9.683594 2.535156 9.683594 3 L 9.683594 7.183594 C 9.683594 7.671875 9.523438 8.089844 9.199219 8.433594 C 8.878906 8.777344 8.476562 8.949219 8 8.949219 Z M 8 5.148438 Z M 7.5 14 L 7.5 11.734375 C 6.320312 11.609375 5.332031 11.117188 4.535156 10.25 C 3.734375 9.382812 3.332031 8.359375 3.332031 7.183594 L 4.332031 7.183594 C 4.332031 8.195312 4.691406 9.042969 5.410156 9.734375 C 6.125 10.421875 6.988281 10.765625 8 10.765625 C 9.011719 10.765625 9.875 10.421875 10.589844 9.734375 C 11.308594 9.042969 11.667969 8.195312 11.667969 7.183594 L 12.667969 7.183594 C 12.667969 8.359375 12.265625 9.382812 11.464844 10.25 C 10.667969 11.117188 9.679688 11.609375 8.5 11.734375 L 8.5 14 Z M 8 7.949219 C 8.199219 7.949219 8.363281 7.875 8.492188 7.726562 C 8.621094 7.574219 8.683594 7.394531 8.683594 7.183594 L 8.683594 3 C 8.683594 2.8125 8.617188 2.652344 8.484375 2.523438 C 8.351562 2.398438 8.1875 2.332031 8 2.332031 C 7.8125 2.332031 7.648438 2.398438 7.515625 2.523438 C 7.382812 2.652344 7.316406 2.8125 7.316406 3 L 7.316406 7.183594 C 7.316406 7.394531 7.378906 7.574219 7.507812 7.726562 C 7.636719 7.875 7.800781 7.949219 8 7.949219 Z M 8 7.949219 "/></svg>';
    const svgMicOff = '<svg stroke="currentColor" fill="currentColor" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="16px" height="16px" viewBox="0 0 16 16" version="1.1"><path d="M 11.433594 9.984375 L 10.714844 9.265625 C 10.949219 8.976562 11.121094 8.652344 11.234375 8.292969 C 11.34375 7.929688 11.398438 7.5625 11.398438 7.183594 L 12.398438 7.183594 C 12.398438 7.695312 12.316406 8.1875 12.148438 8.667969 C 11.984375 9.144531 11.746094 9.582031 11.433594 9.984375 Z M 7.683594 6.234375 Z M 9.300781 7.851562 L 8.417969 6.984375 L 8.417969 3.015625 C 8.417969 2.828125 8.351562 2.667969 8.214844 2.535156 C 8.082031 2.398438 7.921875 2.332031 7.734375 2.332031 C 7.542969 2.332031 7.382812 2.398438 7.25 2.535156 C 7.117188 2.667969 7.050781 2.828125 7.050781 3.015625 L 7.050781 5.601562 L 6.050781 4.601562 L 6.050781 3.015625 C 6.050781 2.550781 6.214844 2.152344 6.542969 1.824219 C 6.871094 1.496094 7.265625 1.332031 7.734375 1.332031 C 8.199219 1.332031 8.597656 1.496094 8.925781 1.824219 C 9.253906 2.152344 9.417969 2.550781 9.417969 3.015625 L 9.417969 7.183594 C 9.417969 7.273438 9.410156 7.382812 9.390625 7.515625 C 9.375 7.648438 9.34375 7.761719 9.300781 7.851562 Z M 7.234375 14 L 7.234375 11.734375 C 6.054688 11.609375 5.066406 11.117188 4.265625 10.25 C 3.464844 9.382812 3.066406 8.359375 3.066406 7.183594 L 4.066406 7.183594 C 4.066406 8.195312 4.425781 9.042969 5.140625 9.734375 C 5.859375 10.421875 6.722656 10.765625 7.734375 10.765625 C 8.15625 10.765625 8.5625 10.695312 8.949219 10.558594 C 9.339844 10.417969 9.695312 10.226562 10.015625 9.984375 L 10.734375 10.699219 C 10.390625 10.988281 10.003906 11.21875 9.582031 11.390625 C 9.160156 11.5625 8.710938 11.679688 8.234375 11.734375 L 8.234375 14 Z M 13.851562 15.082031 L 0.601562 1.832031 L 1.234375 1.199219 L 14.484375 14.449219 Z M 13.851562 15.082031 "/></svg>';
    const microphoneButtonElement = document.createElement('button');
    microphoneButtonElement.type = 'button';
    microphoneButtonElement.classList = 'absolute p-1 rounded-md text-gray-500 bottom-1.5 right-1 md:bottom-2.5 md:right-2 hover:bg-gray-100 dark:hover:text-gray-400 dark:hover:bg-gray-900 disabled:hover:bg-transparent dark:disabled:hover:bg-transparent';
    microphoneButtonElement.style.right = '2.5rem';
    microphoneButtonElement.title = '開啟語音辨識功能';
    microphoneButtonElement.innerHTML = svgMicOff;

    var logLevel = 2; // 0: None, 1: Information, 2: Debug

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

        messageTextarea;
        sendButton;
        microphoneButton;


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

        constructor(lang, microphoneButton) {
            if (lang) { this.defaultLang = lang; }
        }

        getCommandByTranscript(str) {
            str = str.trim();
            if (navigator.userAgent.indexOf('Edg/') >= 0 && str.substr(str.length - 1, 1) == '。') {
                str = str.slice(0, -1);
            }

            for (const commandId in this._commands) {
                if (Object.hasOwnProperty.call(this._commands, commandId)) {
                    const cmd = this._commands[commandId];
                    for (const term of cmd.terms) {
                        let regex = new RegExp('^' + term + '$', "i");
                        if (cmd.match === 'prefix') { regex = new RegExp('^' + term, "i"); }
                        if (cmd.match === 'postfix') { regex = new RegExp(term + '$', "i"); }

                        (logLevel >= 2) && console.log('term = ', term, ', str = ', str, ', match = ', cmd.match, ', UA = ', navigator.userAgent);
                        if (str.search(regex) !== -1) {
                            return commandId;
                        }
                    }
                }
            }
            return ''
        }

        Init(textarea, button, microphoneButton) {
            this.messageTextarea = textarea;
            this.sendButton = button;
            this.microphoneButton = microphoneButton;
        }

        createSpeechRecognitionListener(recognition) {
            // 如果目前瀏覽器頁籤抓不到麥克風資源 (例如有兩個 Tab 都想要麥克風)，那麼就會一直不斷的停止語音辨識！
            return new Observable(subscriber => {
                recognition.onstart = (event) => {
                    (logLevel >= 1) && console.log('開始進行 SpeechRecognition 語音辨識');
                    subscriber.next({ type: 'start', event });
                };
                recognition.onerror = (event) => {
                    (logLevel >= 1) && console.log('SpeechRecognition 語音辨識錯誤!', event);
                    subscriber.error(event);
                }
                recognition.onend = (event) => {
                    (logLevel >= 1) && console.log('停止 SpeechRecognition 語音辨識!', event);
                    subscriber.next({ type: 'end', event });
                };
                recognition.onresult = (event) => {
                    subscriber.next({ type: 'result', event });
                };
            });
        }

        async processSpeechRecognitionResult(event, textarea, button) {
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

                            this.Reset();
                            if (this.IsStarted) {
                                this.Stop();
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
        }

        StartSpeechRecognition() {
            this.recognition = new SpeechRecognition();
            this.recognition.continuous = true;
            this.recognition.interimResults = true;

            this.setLang();

            var retry_backoff = [0, 1, 2, 4, 8, 16, 32];

            const speechRecognitionListener$ = defer(() => this.createSpeechRecognitionListener(this.recognition))
                .pipe(
                    catchError((error) => {
                        this.IsStarted = false;
                        throw error;
                    }),
                    retry({
                        count: retry_backoff.length,
                        delay: (_, retryCount) => {
                            (logLevel >= 2) && console.log(`啟動 SpeechRecognition 語音辨識 - 失敗；進行重試，第 ${retryCount + 1} 次`);
                            // 延遲指定時間後啟動語音辨識
                            return timer(retry_backoff[retryCount] * 1000).pipe(tap(() => this.recognition.start()));
                        }
                    }),
                    shareReplay(1)
                );

            speechRecognitionListener$
                .pipe(filter(result => result.type === 'start'))
                .subscribe(() => {
                    this.IsStarted = true;
                });
            speechRecognitionListener$
                .pipe(filter(result => result.type === 'end'))
                .subscribe(() => {
                    this.IsStarted = false;
                });
            speechRecognitionListener$
                .pipe(
                    filter(result => result.type === 'result'),
                    map(result => result.event)
                )
                .subscribe(async (event) => {
                    await this.processSpeechRecognitionResult(event, this.messageTextarea, this.sendButton);
                });
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
            if (!this.IsStarted) {
                this.recognition.start();
            }

            microphoneButtonElement.innerHTML = svgMicOn;
        }

        Stop() {
            this.Restart = false;
            if (this.IsStarted) {
                this.recognition.stop();
            }

            microphoneButtonElement.innerHTML = svgMicOff;
        }

        Abort() {
            this.Restart = false;
            if (this.IsStarted) {
                this.recognition.abort();
            }
        }

    }

    /**
     * 取得要說的內容
     *
     * @returns {Observable}
     */
    const createUtteranceTextListener = () => {
        return new Observable(subscriber => {
            var lastParagraphElement;

            // 監測器
            var observer = new MutationObserver((mutations) => {

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
                            subscriber.next(lastParagraphElement.textContent);
                        }
                        lastParagraphElement = mutation.target.parentNode;
                    }
                    if (mutation.type === 'childList' && mutation.target.tagName === 'BUTTON' && mutation.target.type !== 'button' && mutation.addedNodes.length === 1 && mutation.addedNodes[0].nodeName === 'svg' && mutation.addedNodes[0].textContent === '') {
                        (logLevel >= 2) && console.log('!!加入語音佇列!!', lastParagraphElement);

                        // 通常文字打完了，最後一句可能都還沒開始唸，所以要等一下才能視為結束。
                        setTimeout(() => {
                            ChatGPTRunningStatus = false;
                        }, 1000);

                        subscriber.next(lastParagraphElement.textContent);
                        lastParagraphElement = undefined;
                    }
                });
            });

            // 監測對象
            var target = document.getElementsByTagName('main')[0]

            // 監測設定
            var config = {
                attributes: false, // 監測屬性變更
                childList: true,   // 監測子節點的變更
                subtree: true,     // 監測所有從 target 開始的子節點
                characterData: true
            };

            // 啟動監測
            observer.observe(target, config);
        });
    }

    /**
     * 開始進行語音合成
     *
     */
    const listenUtteranceTextAndSpeak = (videoInputHelper) => {
        defer(() => createUtteranceTextListener()).pipe(
            filter(text => !!text),
            switchMap(text => SpeakText(videoInputHelper, text)),
            retry(),
        ).subscribe({
            error: err => logLevel >= 1 && console.error('監聽並進行語音合成錯誤', err),
            complete: () => logLevel >= 1 && console.log('監聽並進行語音合成結束')
        });
    }

    /**
     * 說出文字
     *
     * @param text
     * @returns
     */
    const SpeakText = (videoInputHelper, text) => {
        return new Observable(subscriber => {
            var origRestart = videoInputHelper.Restart;
            videoInputHelper.Abort();

            (logLevel >= 1) && console.log(`準備合成閱讀文章語音: ${text}`);
            let utterance = new SpeechSynthesisUtterance(text);

            const voice = speechSynthesis.getVoices().filter(x => x.lang === 'zh-TW').pop();
            (logLevel >= 2) && console.log('你選用的發音來源是', voice);
            utterance.voice = voice;

            // 語速
            utterance.rate = 1.3; // 0.1 ~ 10, default: 1

            utterance.onstart = (evt) => {
                (logLevel >= 2) && console.log('開始發音', evt);
                if (videoInputHelper.IsStarted) {
                    videoInputHelper.Abort();
                }
                subscriber.next(evt);
            }

            utterance.onend = (evt) => {
                (logLevel >= 2) && console.log('結束發音', evt, origRestart);
                if (!ChatGPTRunningStatus && !speechSynthesis.pending) {
                    videoInputHelper.Start();
                }
                subscriber.complete();
            }

            utterance.onerror = (evt) => {
                (logLevel >= 2) && console.log('發音過程失敗', evt);
                subscriber.error(evt);
            }

            speechSynthesis.speak(utterance);
        });
    }

    /**
     * 檢查麥克風是否有效
     */
    const checkAudio = () => {
        (logLevel >= 2) && console.log('Checking Audio availability!');
        return new Observable(subscriber => {
            navigator.getUserMedia({ audio: true },
                function (stream) {
                    subscriber.next(stream);
                    subscriber.complete();
                },
                function (error) {
                    subscriber.error(error);
                }
            );
        });
    }

    /**
     * 註冊麥克風按鈕點擊事件，用來切換自動語音辨識功能
     *
     * @param {VideoInputHelper} videoInputHelper
     */
    const registerMicrophoneButtonClick = (videoInputHelper) => {
        let audioStream = null;
        microphoneButtonElement.addEventListener('click', () => {
            if(audioStream !== null) {
                (logLevel >= 1) && console.log("停止語音辨識功能");
                videoInputHelper.Stop();
                audioStream.getTracks().forEach(function(track) {
                    track.stop();
                });
                audioStream = null;
            } else {
                checkAudio().subscribe({
                    next: (stream) => {
                        audioStream = stream;
                        // Microphone is usable.
                        (logLevel >= 2) && console.log("Microphone is usable.");
                        (logLevel >= 1) && console.log("啟動語音辨識功能");
                        videoInputHelper.StartSpeechRecognition();
                        videoInputHelper.Start();
                    },
                    error: (error) => {
                        // Microphone is not usable.
                        (logLevel >= 2) && console.log("Microphone is not usable: " + error);
                    }
                });
            }
        });
    }

    const toDocumentSelectedText = () => (observable) => observable.pipe(
        map(() => window.getSelection()),
        filter(selection => selection.rangeCount > 0 && !selection.isCollapsed),
        map(selection => selection.getRangeAt(0).toString()),
    );

    /**
     * 選取文字轉成語音
     */
    const selectionTextToSpeech = (videoInputHelper) => {
        fromEvent(document, 'selectionchange').pipe(
            toDocumentSelectedText(),
            tap((selectedText) => (logLevel >= 2) && console.log('Get the selected text: ', selectedText)),
            tap(() => {
                if (speechSynthesis.speaking) {
                    (logLevel >= 2) && console.log('正在播放合成語音中，取消本次播放！');
                    speechSynthesis.cancel();
                }
            }),
            switchMap((selectedText) => timer(1000).pipe(switchMap(() => SpeakText(videoInputHelper, selectedText)))),
            catchError(err => of(err))
        ).subscribe();
    };


    /**
     * 設定一些快速鍵
     */
    const registerHotKeys = (videoInputHelper, textareaElement) => {
        // win 使用 alt, mac 使用 cmd + option
        const altOrCommandOption = (event) => {
            const isMac = navigator.userAgentData.platform.toUpperCase().includes('MAC');
            return event.altKey && (isMac ? event.metaKey : true);
        }

        const keydown$ = fromEvent(document, 'keydown');
        const keydownEscape$ = keydown$.pipe(filter((ev) => ev.key === 'Escape'));
        const keydownEnter$ = keydown$.pipe(filter((ev) => ev.key === 'Enter' && /^(?:textarea)$/i.test(ev.target.nodeName)));
        const keydownAltS$ = keydown$.pipe(filter((ev) => altOrCommandOption(ev) && (ev.code === 'KeyS')));
        const keydownAltT$ = keydown$.pipe(filter((ev) => altOrCommandOption(ev) && (ev.code === 'KeyT')));
        const keydownAltR$ = keydown$.pipe(filter((ev) => altOrCommandOption(ev) && (ev.code === 'KeyR')));

        keydownEscape$.subscribe((ev) => {
            if (speechSynthesis.speaking) { speechSynthesis.cancel(); }
            videoInputHelper.Reset();
            if (!videoInputHelper.IsStarted) {
                videoInputHelper.Start();
            }
            textareaElement.value = ''
            textareaElement.dispatchEvent(new Event('input', { bubbles: true }));
            textareaElement.focus();
        });

        keydownEnter$.subscribe((ev) => {
            if (speechSynthesis.speaking) { speechSynthesis.cancel(); }
            videoInputHelper.Reset();
            if (videoInputHelper.IsStarted) {
                videoInputHelper.Stop();
            }
            ev.target.value = ''
            ev.target.dispatchEvent(new Event('input', { bubbles: true }));
        });

        keydownAltS$.subscribe((ev) => {
            if (speechSynthesis.speaking) { speechSynthesis.cancel(); }
            microphoneButtonElement.dispatchEvent(new Event('click', { bubbles: true }));
        });

        keydownAltT$.subscribe((ev) => {
            if (speechSynthesis.speaking) { speechSynthesis.cancel(); }
            videoInputHelper.Restart = false;
            if (videoInputHelper.IsStarted) {
                videoInputHelper.Stop();
            }
        });

        keydownAltR$.subscribe((ev) => {
            if (speechSynthesis.speaking) { speechSynthesis.cancel(); }
            videoInputHelper.Reset()
            textareaElement.value = videoInputHelper.Parts.join('');
            textareaElement.dispatchEvent(new Event('input', { bubbles: true }));
        });
    }

    /**
     * 等待 focus 到訊息輸入框
     */
    const waitFocusToMessageInput$ = interval(100).pipe(
        map(() => document.activeElement),
        filter((element) => element.tagName === 'TEXTAREA' && element.nextSibling.tagName === 'BUTTON'),
        take(1)
    );

    waitFocusToMessageInput$.subscribe((textAreaElement) => {
        var buttonElement = textAreaElement.nextSibling;
        // 加入麥克風按鈕
        textAreaElement.parentElement.insertBefore(microphoneButtonElement, buttonElement);

        var vi = new VoiceInputHelper();

        if (EnableSpeechSynthesis) {
            listenUtteranceTextAndSpeak(vi);
        }

        vi.Init(textAreaElement, buttonElement, microphoneButtonElement);

        registerMicrophoneButtonClick(vi);
        selectionTextToSpeech(vi);
        registerHotKeys(vi, textAreaElement);
    });
})();
