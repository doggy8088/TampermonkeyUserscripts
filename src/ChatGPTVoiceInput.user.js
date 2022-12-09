// ==UserScript==
// @name         ChatGPT 語音輸入介面 (支援中/英/日/韓語言)
// @version      1.0
// @description  讓你可以透過語音輸入要問 ChatGPT 的問題 (支援中文、英文、日文、韓文)
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/ChatGPTVoiceInput.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/ChatGPTVoiceInput.user.js
// @match        *://chat.openai.com/chat
// @author       Will Huang
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    let sti = setInterval(() => {
        if (document.activeElement.tagName === 'TEXTAREA' && document.activeElement.nextSibling.tagName === 'BUTTON') {
            var vi = new VoiceInputHelper(document.activeElement, document.activeElement.nextSibling);
            vi.Start();

            document.addEventListener('keydown', (ev) => {
                if (ev.altKey && ev.key === 'S' && !/^(?:input|select|textarea|button)$/i.test(ev.target.nodeName)) {
                    alert('你是不是不小心按到了 CAPSLOCK 鍵？');
                    return;
                }
                if (ev.altKey && ev.key === 's' /* && !/^(?:input|select|textarea|button)$/i.test(ev.target.nodeName) */) {
                    if (!vi.IsStarted) {
                        vi.Restart = true;
                        vi.Start();
                    }
                }
                if (ev.altKey && ev.key === 't' /* && !/^(?:input|select|textarea|button)$/i.test(ev.target.nodeName) */) {
                    if (vi.IsStarted) {
                        vi.Restart = false;
                        vi.Stop();
                    }
                }
            });

            clearInterval(sti);
        }
    }, 100);

    class VoiceInputHelper {

        IsStarted = false;

        parts = [];

        Restart = true;

        Lang = 'cmn-Hant-TW';

        constructor(textarea, button, lang) {
            // console.log(textarea, button);

            // https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API
            const SpeechRecognition = window.SpeechRecognition || webkitSpeechRecognition;
            // const SpeechGrammarList = window.SpeechGrammarList || webkitSpeechGrammarList;
            // const SpeechRecognitionEvent = window.SpeechRecognitionEvent || webkitSpeechRecognitionEvent;
            this.recognition = new SpeechRecognition();

            this.recognition.continuous = false;
            this.recognition.interimResults = true;

            this.setLang();

            this.recognition.onstart = () => {
                console.log('開始進行 SpeechRecognition 語音辨識');
                this.IsStarted = true;
            };

            this.recognition.onend = () => {
                console.log('停止 SpeechRecognition 語音辨識!');
                this.IsStarted = false;
                setTimeout(() => {
                    if (this.Restart) {
                        this.recognition.start();
                    }
                }, 60);
            };

            this.recognition.onresult = (event) => {
                // console.log('語音事件: ', event);


                var i = event.resultIndex;
                let results = event.results[i];

                console.log('results.length', results.length);
                let transcript = results[0].transcript; // 理論上只會有一個結果

                console.log('語音輸入: ' + transcript, 'isFinal: ', results.isFinal);

                if (this.parts.length == 0) {
                    this.parts[0] = transcript;
                } else {
                    this.parts[this.parts.length - 1] = transcript;
                }

                textarea.value = this.parts.join('') + '...';
                textarea.dispatchEvent(new Event('input', {bubbles:true}));

                if (results.isFinal) {
                    console.log('Final Result: ', results);

                    switch (this.parts[this.parts.length - 1]) {
                        case '送出':
                        case '狂奔吧':
                        case '跑起來':
                        case '去吧':
                        case 'enter':
                        case 'Run':
                        case 'go':
                            this.parts.pop();
                            if (this.parts.length > 0) {
                                textarea.value = this.parts.join('');
                                textarea.dispatchEvent(new Event('input', {bubbles:true}));
                                button.click();
                                this.parts = [];
                            }
                            break;

                        case '清空':
                        case '淨空':
                        case 'clear':
                            this.parts = [];
                            break;

                        case '刪除':
                        case '刪除上一句':
                            this.parts.pop();
                            this.parts.pop();
                            break;

                        case '逗號':
                        case '逗點':
                        case '都好':
                            this.parts[this.parts.length - 1] = '，';
                            break;

                        case '句號':
                        case '句點':
                            this.parts[this.parts.length - 1] = '。';
                            break;

                        case '問號':
                            this.parts[this.parts.length - 1] = '？';
                            break;

                        case '斷行':
                            this.parts[this.parts.length - 1] = '\r\n';
                            break;

                        case '重置':
                        case 'リセット': // Risetto
                        case '초기화': // chogihwa
                        case 'reset':
                            this.setLang('cmn-Hant-TW');
                            this.parts = [];
                            break;

                        case '切換至中文模式':
                        case '切換至中文':
                        case 'switch to Chinese mode':
                            this.setLang('cmn-Hant-TW');
                            this.parts[this.parts.length - 1] = '';
                            break;

                        case '切換至英文模式':
                        case '切換至英文':
                            console.log('切換至英文模式');
                            this.setLang('en-US');
                            this.parts[this.parts.length - 1] = '';
                            break;

                        case '切換至日文模式':
                        case '切換至日文':
                            console.log('切換至日文模式');
                            this.setLang('ja-JP');
                            this.parts[this.parts.length - 1] = '';
                            break;

                        case '切換至韓文模式':
                        case '切換至韓文':
                            console.log('切換至韓文模式');
                            this.setLang('ko-KR');
                            this.parts[this.parts.length - 1] = '';
                            break;

                        case '關閉語音辨識':
                        case '關閉語音':
                            this.Stop();
                            break;

                        default:
                            this.parts[this.parts.length - 1] = this.parts[this.parts.length - 1].replace(/\.\.\.$/g, '');
                            if (this.parts[this.parts.length - 1].split('').pop() === '嗎') {
                                this.parts[this.parts.length - 1] += '？';
                            }
                            break;
                    }

                    this.parts = [...this.parts, ''];

                    textarea.value = this.parts.join('');
                    textarea.dispatchEvent(new Event('input', {bubbles:true}));
                }

            };

        }

        setLang(lang) {
            // https://stackoverflow.com/a/68742566/910074
            if (lang) {
                this.Lang = lang;
            }
            this.recognition.lang = this.Lang;
        }

        Start() {
            this.recognition.start();
        }

        Stop() {
            this.restart = false;
            this.recognition.stop();
        }

    }

})();
