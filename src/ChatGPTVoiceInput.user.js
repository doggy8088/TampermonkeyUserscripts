// ==UserScript==
// @name         ChatGPT 語音輸入介面 (支援中/英/日/韓語言)
// @version      1.2
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

    let sti = setInterval(() => {
        let element = document.activeElement;
        if (element.tagName === 'TEXTAREA' && element.nextSibling.tagName === 'BUTTON') {
            var vi = new VoiceInputHelper(element, element.nextSibling);

            // This is auto-start by default.
            // Comment it if you want to activate SpeechRecognition by alt-s hotkey.
            vi.Start();

            document.addEventListener('keydown', (ev) => {
                if (ev.altKey && ev.key === 'S' && !/^(?:input|select|textarea|button)$/i.test(ev.target.nodeName)) {
                    alert('你是不是不小心按到了 CAPSLOCK 鍵？');
                    return;
                }
                if (ev.key === 'Escape' && /^(?:textarea)$/i.test(ev.target.nodeName)) {
                    vi.Reset()
                    ev.target.value = ''
                    ev.target.dispatchEvent(new Event('input', {bubbles:true}));
                    return;
                }
                if (ev.altKey && ev.key === 's' /* && !/^(?:input|select|textarea|button)$/i.test(ev.target.nodeName) */) {
                    if (!vi.IsStarted) {
                        vi.Restart = true;
                        vi.Start();
                    } else {
                        vi.Restart = false;
                        vi.Stop();
                    }
                }
                if (ev.altKey && ev.key === 't' /* && !/^(?:input|select|textarea|button)$/i.test(ev.target.nodeName) */) {
                    if (vi.IsStarted) {
                        vi.Restart = false;
                        vi.Stop();
                    }
                }
                if (ev.altKey && ev.key === 'r' /* && !/^(?:input|select|textarea|button)$/i.test(ev.target.nodeName) */) {
                    vi.Reset()
                    element.value = vi.Parts.join('');
                    element.dispatchEvent(new Event('input', {bubbles:true}));
                }
            });

            clearInterval(sti);
        }
    }, 100);

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
                    '狂奔吧',
                    '跑起來',
                    'Run',
                    'go'
                ],
                match: 'exact' // prefix, exact, postfix
            },
            clear: {
                terms: [
                    'clear',
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

        getCommandByTranscript(str) {
            let cmdId = '';
            for (const commandId in this._commands) {
                if (Object.hasOwnProperty.call(this._commands, commandId)) {
                    const cmd = this._commands[commandId];
                    for (const term of cmd.terms) {
                        let regex = new RegExp(term, "i");
                        if (cmd.match === 'prefix') { regex = new RegExp('^' + term, "i"); }
                        if (cmd.match === 'postfix')  { regex = new RegExp(term + '$', "i"); }
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

            this.recognition.onresult = async (event) => {
                // console.log('語音識別事件: ', event);

                let results = event.results[event.resultIndex];

                console.log('results.length', results.length);
                let transcript = results[0].transcript; // 理論上只會有一個結果

                console.log('語音輸入: ' + transcript, 'isFinal: ', results.isFinal);

                if (this.Parts.length == 0) {
                    this.Parts[0] = transcript;
                } else {
                    this.Parts[this.Parts.length - 1] = transcript;
                }

                textarea.value = this.Parts.join('') + '...';
                textarea.dispatchEvent(new Event('input', {bubbles:true}));

                if (results.isFinal) {
                    console.log('Final Result: ', results);

                    let id = this.getCommandByTranscript(this.Parts[this.Parts.length - 1]);
                    console.log('id = ', id);
                    switch (id) {
                        case 'enter':
                            this.Parts.pop();
                            if (this.Parts.length > 0) {
                                textarea.value = this.Parts.join('');
                                textarea.dispatchEvent(new Event('input', {bubbles:true}));
                                button.click();
                                this.Parts = [];
                            }
                            break;

                        case 'clear':
                            this.Parts = [];
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
                            this.setLang('cmn-Hant-TW');
                            this.Parts[this.Parts.length - 1] = '';
                            break;

                        case '切換至英文模式':
                            console.log('切換至英文模式');
                            this.setLang('en-US');
                            this.Parts[this.Parts.length - 1] = '';
                            break;

                        case '切換至日文模式':
                        case '切換至日文':
                            console.log('切換至日文模式');
                            this.setLang('ja-JP');
                            this.Parts[this.Parts.length - 1] = '';
                            break;

                        case '切換至韓文模式':
                            console.log('切換至韓文模式');
                            this.setLang('ko-KR');
                            this.Parts[this.Parts.length - 1] = '';
                            break;

                        case '關閉語音辨識':
                            console.log('關閉語音辨識');
                            this.Stop();
                            break;

                        case 'paste':
                            this.Parts[this.Parts.length - 1] = this.Parts[this.Parts.length - 1].replace(/\.\.\.$/g, '');
                            console.log('貼上剪貼簿');

                            this.Parts = [...this.Parts, '\r\n\r\n'];
                            var code = await window.navigator.clipboard.readText();
                            this.Parts = [...this.Parts, code];
                            this.Parts = [...this.Parts, '\r\n\r\n'];
                            break;

                        case 'explain_code':
                            this.Parts[this.Parts.length - 1] = this.Parts[this.Parts.length - 1].replace(/\.\.\.$/g, '');
                            console.log('確認輸入 (說明程式碼)');

                            this.Parts = [...this.Parts, '\r\n\r\n'];
                            var code = await window.navigator.clipboard.readText();
                            this.Parts = [...this.Parts, code];
                            this.Parts = [...this.Parts, '\r\n\r\n'];
                            break;

                        default:
                            this.Parts[this.Parts.length - 1] = this.Parts[this.Parts.length - 1].replace(/\.\.\.$/g, '');
                            console.log('確認輸入');

                            let firstPart = this.Parts[0];
                            let lastChar = this.Parts[this.Parts.length - 1].split('').pop();
                            if (firstPart.indexOf('什麼') == 0 || firstPart.indexOf('甚麼') == 0 || lastChar === '嗎' || lastChar === '呢') {
                                this.Parts[this.Parts.length - 1] += '？';
                            }
                            break;
                    }

                    this.Parts = [...this.Parts, ''];

                    textarea.value = this.Parts.join('');
                    textarea.dispatchEvent(new Event('input', {bubbles:true}));
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
            this.Restart = true;
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

    }

})();
