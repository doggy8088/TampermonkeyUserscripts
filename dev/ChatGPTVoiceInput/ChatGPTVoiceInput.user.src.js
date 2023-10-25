// ==UserScript==
// @name         ChatGPT: 語音輸入與語音合成功能 (支援中/英/日/韓語言)
// @version      2.5.0
// @description  讓你可以透過語音輸入要問 ChatGPT 的問題並支援語音合成功能 (支援中文、英文、日文、韓文)
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ChatGPTVoiceInput.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ChatGPTVoiceInput.user.js
// @match        *://chat.openai.com/
// @match        *://chat.openai.com/*
// @author       Will Huang
// @run-at       document-idle
// @icon         https://www.google.com/s2/favicons?sz=64&domain=openai.com
// ==/UserScript==

/*
本原始碼的建置步驟：

1. 初始化 package.json

    npm init -y

2. 安裝 rxjs 套件

    npm install rxjs --save

3. 執行 esbuild 打包程式碼

    npx esbuild ChatGPTVoiceInput.user.src.js --bundle --outfile=out.js --platform=browser

4. 將 out.js 的內容更新到 ChatGPTVoiceInput.user.js 裡面！

*/

/*
    States

    1. 語音識別 Not Started
    2. 語音識別 Started
    3. 語音合成 Not Started (speaking=false, pending=false)
    4. 語音合成 Progressing (speaking=true, pending=true)
    5. 語音合成 Pending (speaking=true/false, pending=true)

    Use Case

    1. 語音識別 speechRecognition 只要人按下麥克風按鈕或按下 alt+s 才會開始
    2. 語音識別 speechRecognition 只要「語音合成」就要提前停止
    3. 語音識別 speechRecognition 只要「按下 alt+s 快速鍵」就要提前停止
    4. 語音識別 speechRecognition 只要「按下麥克風按鈕」就要提前停止

    5. 語音合成 speechSynthesis 只要人按下喇叭按鈕或按下 alt+m 才會開始
    6. 語音合成 speechSynthesis 只要「語音識別」開始就要提前停止 ( speechSynthesis.cancel() )
    7. 語音合成 speechSynthesis 只要「按下 alt+m 快速鍵」就要提前停止
    8. 語音合成 speechSynthesis 只要「按下喇叭按鈕」就要提前停止

    9. 語音識別 speechRecognition 跟 語音合成 speechSynthesis 不能同時進行
    10. 語音識別 speechRecognition 跟 語音合成 speechSynthesis 預設都是關閉的

    Summary

    整個功能只有 4 個主要事件：

    1. 語音識別開始
    2. 語音識別停止
    3. 語音合成開始
    4. 語音合成停止

    語音識別
    speechRecognition

        speechRecognition.lang
        speechRecognition.start(); // 開始語音識別
        speechRecognition.stop();  // 停止語音識別
        speechRecognition.abort(); // 中斷語音識別

    語音合成
    speechSynthesis

        speechSynthesis.speaking // 是否正在說話
        speechSynthesis.cancel();
        speechSynthesis.pending // 還沒說完的
        speechSynthesis.speak();

        const voice = speechSynthesis.getVoices().filter(x => x.lang === 'zh-TW').pop(); // 取得多個中文語音的最後一個

    盤點鍵盤事件 - 取得 document 的所有 keydown 事件 (RxJS)
    const keydown$ = fromEvent(document, 'keydown');

    盤點滑鼠事件
    microphoneButtonElement.addEventListener('click', () => {})
    speakerButtonElement.addEventListener('click', () => {})

    盤點 UI 狀態
    microphoneButtonElement

        microphoneButtonElement.isOn()
        microphoneButtonElement.isOff()

    speakerButtonElement

        speakerButtonElement.IsOn()
        speakerButtonElement.IsOff()

*/


import {
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
    Subject,
    switchMap,
    take,
    tap,
    timer
} from 'rxjs';

(async function () {
    'use strict';

    const logLevel = 0; // 0: None, 1: Information, 2: Debug

    const defaultLang = 'cmn-Hant-TW'; // 可設定值清單 ▶ https://stackoverflow.com/a/68742566/910074

    let currentVoice = undefined;
    window.speechSynthesis.onvoiceschanged = function() {
        currentVoice = speechSynthesis.getVoices().filter(x => x.lang === 'zh-TW').pop();
    };

    // 中文
    // cmn-Hant-TW => 中文 (台灣)
    // cmn-Hans-CN => 普通话 (中国大陆)
    // cmn-Hans-HK => 普通话 (香港)
    // yue-Hant-HK => 粵語 (香港)
    //
    // English
    // en-US => United States
    // en-AU => Australia
    // en-CA => Canada
    // en-IN => India
    // en-KE => Kenya
    // en-TZ => Tanzania
    // en-GH => Ghana
    // en-NZ => New Zealand
    // en-NG => Nigeria
    // en-ZA => South Africa
    // en-PH => Philippines
    // en-GB => United Kingdom
    //
    // Japan
    // ja-JP => 日本語 (日本)

    /**
     * 檢查作業系統是否為 Mac
     *
     */
    const isMac = () => navigator.userAgentData.platform.toUpperCase().includes('MAC');

    // 主要的文字輸入框
    let textAreaElement = undefined;

    // 用來記憶文字輸入框的語音輸入過程中的暫存文字
    let Parts = [];

    // 主要的送出按鈕
    let submitButtonElement = undefined;

    // 麥克風輸入按鈕 (預設關閉)
    const svgMicOn = '<svg stroke="currentColor" fill="currentColor" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="16px" height="16px" viewBox="0 0 16 16" version="1.1"><path d="M 8 8.949219 C 7.523438 8.949219 7.121094 8.777344 6.800781 8.433594 C 6.476562 8.089844 6.316406 7.671875 6.316406 7.183594 L 6.316406 3 C 6.316406 2.535156 6.480469 2.140625 6.808594 1.816406 C 7.136719 1.496094 7.535156 1.332031 8 1.332031 C 8.464844 1.332031 8.863281 1.496094 9.191406 1.816406 C 9.519531 2.140625 9.683594 2.535156 9.683594 3 L 9.683594 7.183594 C 9.683594 7.671875 9.523438 8.089844 9.199219 8.433594 C 8.878906 8.777344 8.476562 8.949219 8 8.949219 Z M 8 5.148438 Z M 7.5 14 L 7.5 11.734375 C 6.320312 11.609375 5.332031 11.117188 4.535156 10.25 C 3.734375 9.382812 3.332031 8.359375 3.332031 7.183594 L 4.332031 7.183594 C 4.332031 8.195312 4.691406 9.042969 5.410156 9.734375 C 6.125 10.421875 6.988281 10.765625 8 10.765625 C 9.011719 10.765625 9.875 10.421875 10.589844 9.734375 C 11.308594 9.042969 11.667969 8.195312 11.667969 7.183594 L 12.667969 7.183594 C 12.667969 8.359375 12.265625 9.382812 11.464844 10.25 C 10.667969 11.117188 9.679688 11.609375 8.5 11.734375 L 8.5 14 Z M 8 7.949219 C 8.199219 7.949219 8.363281 7.875 8.492188 7.726562 C 8.621094 7.574219 8.683594 7.394531 8.683594 7.183594 L 8.683594 3 C 8.683594 2.8125 8.617188 2.652344 8.484375 2.523438 C 8.351562 2.398438 8.1875 2.332031 8 2.332031 C 7.8125 2.332031 7.648438 2.398438 7.515625 2.523438 C 7.382812 2.652344 7.316406 2.8125 7.316406 3 L 7.316406 7.183594 C 7.316406 7.394531 7.378906 7.574219 7.507812 7.726562 C 7.636719 7.875 7.800781 7.949219 8 7.949219 Z M 8 7.949219 "></path></svg>';
    const svgMicOff = '<svg stroke="currentColor" fill="currentColor" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="16px" height="16px" viewBox="0 0 16 16" version="1.1"><path d="M 11.433594 9.984375 L 10.714844 9.265625 C 10.949219 8.976562 11.121094 8.652344 11.234375 8.292969 C 11.34375 7.929688 11.398438 7.5625 11.398438 7.183594 L 12.398438 7.183594 C 12.398438 7.695312 12.316406 8.1875 12.148438 8.667969 C 11.984375 9.144531 11.746094 9.582031 11.433594 9.984375 Z M 7.683594 6.234375 Z M 9.300781 7.851562 L 8.417969 6.984375 L 8.417969 3.015625 C 8.417969 2.828125 8.351562 2.667969 8.214844 2.535156 C 8.082031 2.398438 7.921875 2.332031 7.734375 2.332031 C 7.542969 2.332031 7.382812 2.398438 7.25 2.535156 C 7.117188 2.667969 7.050781 2.828125 7.050781 3.015625 L 7.050781 5.601562 L 6.050781 4.601562 L 6.050781 3.015625 C 6.050781 2.550781 6.214844 2.152344 6.542969 1.824219 C 6.871094 1.496094 7.265625 1.332031 7.734375 1.332031 C 8.199219 1.332031 8.597656 1.496094 8.925781 1.824219 C 9.253906 2.152344 9.417969 2.550781 9.417969 3.015625 L 9.417969 7.183594 C 9.417969 7.273438 9.410156 7.382812 9.390625 7.515625 C 9.375 7.648438 9.34375 7.761719 9.300781 7.851562 Z M 7.234375 14 L 7.234375 11.734375 C 6.054688 11.609375 5.066406 11.117188 4.265625 10.25 C 3.464844 9.382812 3.066406 8.359375 3.066406 7.183594 L 4.066406 7.183594 C 4.066406 8.195312 4.425781 9.042969 5.140625 9.734375 C 5.859375 10.421875 6.722656 10.765625 7.734375 10.765625 C 8.15625 10.765625 8.5625 10.695312 8.949219 10.558594 C 9.339844 10.417969 9.695312 10.226562 10.015625 9.984375 L 10.734375 10.699219 C 10.390625 10.988281 10.003906 11.21875 9.582031 11.390625 C 9.160156 11.5625 8.710938 11.679688 8.234375 11.734375 L 8.234375 14 Z M 13.851562 15.082031 L 0.601562 1.832031 L 1.234375 1.199219 L 14.484375 14.449219 Z M 13.851562 15.082031 "></path></svg>';
    const microphoneButtonElement = document.createElement('button');
    microphoneButtonElement.id = 'btn-microphone';
    microphoneButtonElement.type = 'button';
    microphoneButtonElement.classList = 'absolute p-1 rounded-md text-gray-500 bottom-1.5 right-1 md:bottom-3.5 md:right-2 hover:bg-gray-100 dark:hover:text-gray-400 dark:hover:bg-gray-900 disabled:hover:bg-transparent dark:disabled:hover:bg-transparent';
    microphoneButtonElement.style.right = '3rem';
    microphoneButtonElement.title = `開啟語音辨識功能 (${isMac() ? 'command+option+s' : 'alt+s'})`;
    microphoneButtonElement.innerHTML = svgMicOff;
    microphoneButtonElement.addEventListener('click', () => {
        if (isSpeechRecognitionEnabled()) {
            speechRecognitionStop$.next();
        } else {
            speechRecognitionStart$.next();
        }
    });

    microphoneButtonElement.changeLanguage = function (language) {
        if (language) {
            console.log('切換語言到', language);
            speechRecognitionStop$.next();
            speechRecognition.lang = language;
            setTimeout(() => {
                speechRecognitionStart$.next();
            }, 1000);
        }
    };

    microphoneButtonElement.addEventListener("contextmenu", function (event) {
        event.preventDefault();

        var contextMenu = document.createElement("div");
        contextMenu.close = function () {
            this.remove();
        };
        contextMenu.setDefault = function (select) {
            console.log('set default to ' + speechRecognition.lang);
            select.value = speechRecognition.lang;
        };
        contextMenu.id = "microphoneButtonElementContextMenu";
        contextMenu.style.position = "absolute";
        contextMenu.style.backgroundColor = "white";
        contextMenu.style.border = "1px solid black";
        contextMenu.style.padding = "10px";

        const styleElement = document.createElement('style');
        styleElement.textContent = `
        /* Light Theme */
        select {
            color: black;
            background-color: white;
            border: 1px solid black;
        }
        /* Dark Theme */
        @media (prefers-color-scheme: dark) {
            select {
                color: white;
                background-color: black;
                border: 1px solid white;
            }
        }`;
        contextMenu.appendChild(styleElement);

        const selectElement = document.createElement('select');
        selectElement.addEventListener('change', function (event) {
            microphoneButtonElement.changeLanguage(this.value);
            contextMenu.close()
        });

        const option1 = document.createElement('option');
        option1.value = '';
        option1.text = '請選擇語音辨識的慣用語言';
        selectElement.add(option1);

        // 可設定值清單 ▶ https://www.google.com/intl/en/chrome/demos/speech.html
        var options = [
            { value: "cmn-Hant-TW", text: "中文 (台灣)" },
            { value: "cmn-Hans-CN", text: "普通话 (中国大陆)" },
            { value: "en-US", text: "English (United States)" },
            { value: "en-GB", text: "English (United Kingdom)" },
            { value: "en-AU", text: "English (Australia)" },
            { value: "en-CA", text: "English (Canada)" },
            { value: "en-IN", text: "English (India)" },
            { value: "ja-JP", text: "日本語" },
            { value: "ko-KR", text: "한국어" },
        ]

        options.forEach(function (item) {
            const option = document.createElement('option');
            option.value = item.value;
            option.text = item.text;
            option.selected = (item.value == speechRecognition.lang);
            selectElement.add(option);
        });

        contextMenu.appendChild(selectElement);

        // 設置右鍵內容選單位置
        contextMenu.style.left = event.clientX + "px";
        contextMenu.style.top = event.clientY + "px";

        // 添加右鍵內容選單到頁面上
        document.body.appendChild(contextMenu);

        document.addEventListener("click", function(ev) {
            if (!contextMenu.contains(ev.target)) {
                contextMenu.remove();
            }
        });
    });


    // 語音合成輸出按鈕 (預設關閉)
    const svgSpeakerOn = '<svg stroke="currentColor" fill="currentColor" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="16px" height="16px" viewBox="0 0 16 16" version="1.1"><path d="M 9.332031 13.816406 L 9.332031 12.785156 C 10.410156 12.472656 11.292969 11.875 11.976562 10.992188 C 12.660156 10.109375 13 9.105469 13 7.984375 C 13 6.859375 12.660156 5.855469 11.984375 4.964844 C 11.304688 4.078125 10.421875 3.484375 9.332031 3.183594 L 9.332031 2.148438 C 10.710938 2.460938 11.832031 3.160156 12.699219 4.242188 C 13.566406 5.324219 14 6.570312 14 7.984375 C 14 9.394531 13.566406 10.640625 12.699219 11.726562 C 11.832031 12.808594 10.710938 13.503906 9.332031 13.816406 Z M 2 10 L 2 6 L 4.667969 6 L 8 2.667969 L 8 13.332031 L 4.667969 10 Z M 9 10.800781 L 9 5.183594 C 9.609375 5.371094 10.097656 5.726562 10.457031 6.25 C 10.820312 6.773438 11 7.355469 11 8 C 11 8.632812 10.816406 9.210938 10.449219 9.734375 C 10.082031 10.253906 9.601562 10.609375 9 10.800781 Z M 7 5.199219 L 5.117188 7 L 3 7 L 3 9 L 5.117188 9 L 7 10.816406 Z M 5.433594 8 Z M 5.433594 8 "></path></svg>';
    const svgSpeakerOff = '<svg stroke="currentColor" fill="currentColor" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="16px" height="16px" viewBox="0 0 16 16" version="1.1"><path d="M 13.550781 15.066406 L 11.351562 12.867188 C 11.039062 13.089844 10.703125 13.28125 10.339844 13.441406 C 9.980469 13.601562 9.605469 13.726562 9.214844 13.816406 L 9.214844 12.785156 C 9.472656 12.707031 9.71875 12.621094 9.957031 12.523438 C 10.195312 12.429688 10.421875 12.304688 10.632812 12.148438 L 7.882812 9.382812 L 7.882812 13.332031 L 4.550781 10 L 1.882812 10 L 1.882812 6 L 4.484375 6 L 0.816406 2.332031 L 1.535156 1.617188 L 14.265625 14.332031 Z M 12.949219 11.199219 L 12.234375 10.484375 C 12.457031 10.105469 12.621094 9.707031 12.726562 9.285156 C 12.832031 8.859375 12.882812 8.429688 12.882812 7.984375 C 12.882812 6.839844 12.550781 5.8125 11.882812 4.910156 C 11.214844 4.003906 10.328125 3.429688 9.214844 3.183594 L 9.214844 2.148438 C 10.59375 2.460938 11.714844 3.160156 12.582031 4.242188 C 13.449219 5.324219 13.882812 6.570312 13.882812 7.984375 C 13.882812 8.550781 13.804688 9.105469 13.648438 9.648438 C 13.496094 10.195312 13.261719 10.710938 12.949219 11.199219 Z M 10.714844 8.964844 L 9.214844 7.464844 L 9.214844 5.300781 C 9.738281 5.542969 10.148438 5.910156 10.441406 6.398438 C 10.734375 6.890625 10.882812 7.421875 10.882812 8 C 10.882812 8.167969 10.871094 8.332031 10.839844 8.492188 C 10.8125 8.652344 10.773438 8.8125 10.714844 8.964844 Z M 7.882812 6.132812 L 6.148438 4.398438 L 7.882812 2.667969 Z M 6.882812 10.898438 L 6.882812 8.398438 L 5.484375 7 L 2.882812 7 L 2.882812 9 L 4.984375 9 Z M 6.183594 7.699219 Z M 6.183594 7.699219 "></path></svg>';
    const speakerButtonElement = document.createElement('button');
    speakerButtonElement.id = 'btn-speaker';
    speakerButtonElement.type = 'button';
    speakerButtonElement.classList = 'absolute p-1 rounded-md text-gray-500 bottom-1.5 right-1 md:bottom-3.5 md:right-2 hover:bg-gray-100 dark:hover:text-gray-400 dark:hover:bg-gray-900 disabled:hover:bg-transparent dark:disabled:hover:bg-transparent';
    speakerButtonElement.style.right = '5rem';
    speakerButtonElement.innerHTML = svgSpeakerOff;
    speakerButtonElement.title = `開啟語音合成功能 (${isMac() ? 'command+option+m' : 'alt+m'})`;
    speakerButtonElement.addEventListener('click', () => {
        const enabled = isSpeechSynthesisEnabled();
        if (enabled) {
            speechSynthesisStop$.next();
        } else {
            speechSynthesisStart$.next();
        }
    });


    speakerButtonElement.addEventListener("contextmenu", function (event) {
        event.preventDefault();

        var contextMenu = document.createElement("div");
        contextMenu.close = function () {
            this.remove();
        };
        contextMenu.id = "speakerButtonElementContextMenu";
        contextMenu.style.position = "absolute";
        contextMenu.style.backgroundColor = "white";
        contextMenu.style.border = "1px solid black";
        contextMenu.style.padding = "10px";

        const styleElement = document.createElement('style');
        styleElement.textContent = `
        /* Light Theme */
        select {
            color: black;
            background-color: white;
            border: 1px solid black;
        }
        /* Dark Theme */
        @media (prefers-color-scheme: dark) {
            select {
                color: white;
                background-color: black;
                border: 1px solid white;
            }
        }`;
        contextMenu.appendChild(styleElement);

        const selectElement = document.createElement('select');
        selectElement.addEventListener('change', function (event) {
            currentVoice = speechSynthesis.getVoices().filter(x => x.voiceURI === this.value).pop();
            console.log('你目前選中的語音合成聲音是: ', currentVoice);
            speechSynthesisStart$.next();
            contextMenu.close()
        });

        const option1 = document.createElement('option');
        option1.value = '';
        option1.text = '請選擇語音合成的慣用聲音';
        selectElement.add(option1);

        speechSynthesis.getVoices().forEach(function (item) {
            const option = document.createElement('option');
            option.value = item.voiceURI;
            option.text = item.name;
            option.selected = (item == currentVoice);
            selectElement.add(option);
        });

        contextMenu.appendChild(selectElement);

        // 設置右鍵內容選單位置
        contextMenu.style.left = event.clientX + "px";
        contextMenu.style.top = event.clientY + "px";

        // 添加右鍵內容選單到頁面上
        document.body.appendChild(contextMenu);

        document.addEventListener("click", function(ev) {
            if (!contextMenu.contains(ev.target)) {
                contextMenu.remove();
            }
        });
    });

    // 判斷是否要開始執行語音合成
    function isSpeechSynthesisEnabled() {
        // TODO: 這個寫法有點不太可靠，因為 Browser 會正規化 SVG 的 HTML 結構，有可能會長不一樣！
        return (speakerButtonElement.innerHTML === svgSpeakerOn);
    };

    // 判斷是否要開始執行語音辨識
    function isSpeechRecognitionEnabled() {
        // TODO: 這個寫法有點不太可靠，因為 Browser 會正規化 SVG 的 HTML 結構，有可能會長不一樣！
        return (microphoneButtonElement.innerHTML === svgMicOn);
    };

    // 判斷 ChatGPT 是否正在回應訊息
    var ChatGPTRunningStatus = false;

    // 取得 SpeechRecognition 物件
    // https://developer.mozilla.org/en-US/docs/Web/API/Web_Speech_API/Using_the_Web_Speech_API
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    // const SpeechGrammarList = window.SpeechGrammarList || webkitSpeechGrammarList;
    // const SpeechRecognitionEvent = window.SpeechRecognitionEvent || webkitSpeechRecognitionEvent;

    // 建立語音辨識物件
    const speechRecognition = new SpeechRecognition();
    speechRecognition.continuous = true;
    speechRecognition.interimResults = true;
    speechRecognition.lang = defaultLang; // 可設定值清單 ▶ https://stackoverflow.com/a/68742566/910074

    speechRecognition.onstart = (event) => {
        (logLevel >= 1) && console.log('開始進行 SpeechRecognition 語音辨識');
    };
    speechRecognition.onerror = (event) => {
        (logLevel >= 1) && console.log('SpeechRecognition 語音辨識錯誤(error)或中斷(abort)!', event);
    }
    speechRecognition.onend = (event) => {
        // 如果目前瀏覽器頁籤抓不到麥克風資源 (例如有兩個 Tab 都想要麥克風)，那麼就會一直不斷的停止語音辨識！
        (logLevel >= 1) && console.log('停止 SpeechRecognition 語音辨識!', event);
        speechRecognitionStop$.next();
    };
    speechRecognition.onresult = async (event) => {
        await processSpeechRecognitionResult(event);
    };

    async function processSpeechRecognitionResult(event) {
        (logLevel >= 2) && console.log('語音識別事件: ', event);

        let results = event.results[event.resultIndex];

        (logLevel >= 2) && console.log('results.length', results.length);
        let transcript = results[0].transcript; // 理論上只會有一個結果

        (logLevel >= 1) && console.log('語音輸入: ' + transcript, 'isFinal: ', results.isFinal);

        if (Parts.length == 0) {
            Parts[0] = transcript;
        } else {
            Parts[Parts.length - 1] = transcript;
        }

        textAreaElement.value = Parts.join('') + '…';
        textAreaElement.dispatchEvent(new Event('input', { bubbles: true }));
        textAreaElement.focus();
        textAreaElement.setSelectionRange(textAreaElement.value.length, textAreaElement.value.length);
        textAreaElement.scrollTop = textAreaElement.scrollHeight; // 自動捲動到最下方

        if (results.isFinal) {
            (logLevel >= 2) && console.log('Final Result: ', results);

            let id = getVoiceCommandByTranscript(Parts[Parts.length - 1]);
            (logLevel >= 2) && console.log('id = ', id);
            switch (id) {
                case 'enter':
                    Parts.pop();
                    if (Parts.length > 0) {
                        textAreaElement.value = Parts.join('');
                        textAreaElement.dispatchEvent(new Event('input', { bubbles: true }));
                        textAreaElement.focus();
                        textAreaElement.setSelectionRange(textAreaElement.value.length, textAreaElement.value.length);
                        textAreaElement.scrollTop = textAreaElement.scrollHeight; // 自動捲動到最下方
                        submitButtonElement.click();
                        Parts = [];

                        speechRecognitionStop$.next();
                    }
                    break;

                case 'clear':
                    Parts = [];
                    break;

                case 'reload':
                    location.reload();
                    break;

                case 'delete':
                    Parts.pop();
                    Parts.pop();
                    break;

                case '換行':
                    Parts[Parts.length - 1] = '\r\n';
                    break;

                case '重置':
                    reset();
                    break;

                case '切換至中文模式':
                    (logLevel >= 2) && console.log('切換至中文模式');
                    microphoneButtonElement.changeLanguage('cmn-Hant-TW');
                    Parts[Parts.length - 1] = '';
                    break;

                case '切換至英文模式':
                    (logLevel >= 2) && console.log('切換至英文模式');
                    microphoneButtonElement.changeLanguage('en-US');
                    Parts[Parts.length - 1] = '';
                    break;

                case '切換至日文模式':
                case '切換至日文':
                    (logLevel >= 2) && console.log('切換至日文模式');
                    microphoneButtonElement.changeLanguage('ja-JP');
                    Parts[Parts.length - 1] = '';
                    break;

                case '切換至韓文模式':
                    (logLevel >= 2) && console.log('切換至韓文模式');
                    microphoneButtonElement.changeLanguage('ko-KR');
                    Parts[Parts.length - 1] = '';
                    break;

                case '關閉語音辨識':
                    (logLevel >= 2) && console.log('關閉語音辨識');
                    speechRecognitionStop$.next();
                    break;

                case 'paste':
                    Parts.pop();
                    (logLevel >= 2) && console.log('貼上剪貼簿');

                    Parts = [...Parts, '\r\n\r\n'];
                    Parts = [...Parts, await window.navigator.clipboard.readText()];
                    Parts = [...Parts, '\r\n\r\n'];
                    break;

                case 'explain_code':
                    Parts[Parts.length - 1] = Parts[Parts.length - 1].replace(/…$/g, '');
                    (logLevel >= 2) && console.log('確認輸入 (說明程式碼)');

                    Parts = [...Parts, '\r\n\r\n'];
                    Parts = [...Parts, await window.navigator.clipboard.readText()];
                    Parts = [...Parts, '\r\n\r\n'];
                    break;

                default:
                    Parts[Parts.length - 1] = Parts[Parts.length - 1].replace(/…$/g, '');
                    (logLevel >= 2) && console.log('確認輸入', Parts);
                    break;
            }

            Parts = [...Parts, ''];

            textAreaElement.value = Parts.join('');
            textAreaElement.dispatchEvent(new Event('input', { bubbles: true }));
            textAreaElement.focus();
            textAreaElement.setSelectionRange(textAreaElement.value.length, textAreaElement.value.length);
            textAreaElement.scrollTop = textAreaElement.scrollHeight; // 自動捲動到最下方
        }
    }

    // 整支程式主要只有 4 個主要事件：

    // 1. 語音識別開始 speechRecognitionStart$
    const speechRecognitionStart$ = new Subject();
    speechRecognitionStart$.subscribe(() => {
        (logLevel >= 1) && console.log('speechRecognitionStart$');

        // 語音識別 speechRecognition 跟 語音合成 speechSynthesis 不能同時進行
        speechSynthesisStop$.next();

        // 更新 UI 狀態
        microphoneButtonElement.innerHTML = svgMicOn;
        microphoneButtonElement.title = `關閉語音辨識功能 (${isMac() ? 'command+option+s' : 'alt+s'})`;

        if (textAreaElement.value) {
            Parts = [textAreaElement.value, ''];
        } else {
            Parts = [];
        }

        // 啟動語音辨識
        speechRecognition.start();
        (logLevel >= 1) && console.log('speechRecognitionStart$ Started', Parts, textAreaElement.value);

    });

    // 2. 語音識別停止 speechRecognitionStop$
    const speechRecognitionStop$ = new Subject();
    speechRecognitionStop$.subscribe(() => {
        (logLevel >= 1) && console.log('speechRecognitionStop$');

        // 更新 UI 狀態
        microphoneButtonElement.innerHTML = svgMicOff;
        microphoneButtonElement.title = `開啟語音辨識功能 (${isMac() ? 'command+option+s' : 'alt+s'})`;

        if (Parts.length > 0) {
            textAreaElement.value = textAreaElement.value.replace(/…$/, '');
            textAreaElement.dispatchEvent(new Event('input', { bubbles: true }));
            textAreaElement.focus();
            textAreaElement.setSelectionRange(textAreaElement.value.length, textAreaElement.value.length);
            textAreaElement.scrollTop = textAreaElement.scrollHeight; // 自動捲動到最下方
            Parts = [];
        }

        // 如果用 speechRecognition.stop() 會導致 speechRecognition.onresult 事件被觸發，這會影響 textarea 的值!(Buggy)
        speechRecognition.abort();
    });

    // 3. 語音合成開始 speechSynthesisStart$
    const speechSynthesisStart$ = new Subject();
    speechSynthesisStart$.subscribe(() => {
        (logLevel >= 1) && console.log('speechSynthesisStart$');

        // 語音識別 speechRecognition 跟 語音合成 speechSynthesis 不能同時進行
        speechRecognitionStop$.next();

        // 更新 UI 狀態
        speakerButtonElement.innerHTML = svgSpeakerOn;
        speakerButtonElement.title = `關閉語音合成功能 (${isMac() ? 'command+option+m' : 'alt+m'})`;
    });

    // 4. 語音合成停止 speechSynthesisStop$
    const speechSynthesisStop$ = new Subject();
    speechSynthesisStop$.subscribe(() => {
        (logLevel >= 1) && console.log('speechSynthesisStop$');

        // 更新 UI 狀態
        speakerButtonElement.innerHTML = svgSpeakerOff;
        speakerButtonElement.title = `開啟語音合成功能 (${isMac() ? 'command+option+m' : 'alt+m'})`;

        checkAudio().subscribe({
            next: (audioStream) => {
                // Microphone is usable.
                audioStream.getTracks().forEach(function (track) {
                    track.stop();
                });
            },
            error: (error) => {
                // Microphone is not usable.
                (logLevel >= 2) && console.error("Microphone is not usable: " + error);
            }
        });

        if (speechSynthesis.speaking) {
            (logLevel >= 2) && console.log('正在播放合成語音中，取消本次播放！');
            speechSynthesis.cancel();
        }
    });

    function getVoiceCommandByTranscript(str) {

        const voice_commands = {
            enter: {
                terms: [
                    'enter',
                    'Run',
                    'go',
                    // 繁體字
                    '送出',
                    '去吧',
                    '開始',
                    '狂奔吧',
                    '跑起來',
                    // 簡體字
                    '回车'
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
                    // 繁體字
                    '刪除',
                    '刪除上一句',
                    // 簡體字
                    '删除'
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

        str = str.trim();
        if (navigator.userAgent.indexOf('Edg/') >= 0 && str.substr(str.length - 1, 1) == '。') {
            str = str.slice(0, -1);
        }

        for (const commandId in voice_commands) {
            if (Object.hasOwnProperty.call(voice_commands, commandId)) {
                const cmd = voice_commands[commandId];
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

    // #region 語音合成

    /**
     * 取得要說的內容
     *
     * @returns {Observable}
     */
    const createUtteranceTextListener = () => {
        return new Observable(subscriber => {
            // 最後一段 ChatGPT 已經完成的文字
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

                        if (!!lastParagraphElement.textContent) {
                            subscriber.next(lastParagraphElement.textContent);
                        }

                        lastParagraphElement = undefined;
                    }
                });
            });

            // 監測對象
            var target = document.getElementsByTagName('main')[0]

            // 監測設定
            var config = {
                attributes: false, // 監測屬性變更
                childList: true, // 監測子節點的變更
                subtree: true, // 監測所有從 target 開始的子節點
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
    const listenUtteranceTextAndSpeak = () => {
        defer(() => createUtteranceTextListener()).pipe(
            switchMap(lastParagraphTextFromChatGPT => SpeakText(lastParagraphTextFromChatGPT)),
            retry(),
        ).subscribe({
            error: err => logLevel >= 1 && console.error('監聽並進行語音合成錯誤', err),
            complete: () => (logLevel >= 1) && console.log('監聽並進行語音合成結束')
        });
    }

    /**
     * 說出文字
     *
     * @param text
     * @returns
     */
    const SpeakText = (text) => {
        return new Observable(subscriber => {
            if (!isSpeechSynthesisEnabled()) { return; }

            (logLevel >= 1) && console.log(`準備合成閱讀文章語音: ${text}`, currentVoice);

            let utterance = new SpeechSynthesisUtterance(text);
            utterance.voice = currentVoice;

            // 語速
            if (currentVoice.lang === 'zh-TW') {
                utterance.rate = 1.3; // 0.1 ~ 10, default: 1
            } else {
                utterance.rate = 1.0; // 0.1 ~ 10, default: 1
            }

            utterance.onstart = (evt) => {
                (logLevel >= 2) && console.log('開始發音', evt);
                subscriber.next(evt);
            }

            utterance.onend = (evt) => {
                (logLevel >= 2) && console.log('結束發音', evt);
                subscriber.complete();
            }

            utterance.onerror = (evt) => {
                (logLevel >= 2) && console.log('發音過程失敗', evt);
                subscriber.error(evt);
            }

            speechSynthesis.speak(utterance);
        });
    }

    // #endregion

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

    // 選取文字就立刻開始發音
    const selectTextToSpeak = () => {

        const toDocumentSelectedText = () => (observable) => observable.pipe(
            map(() => window.getSelection()),
            filter(selection => selection.rangeCount > 0 && !selection.isCollapsed),
            map(selection => selection.getRangeAt(0).toString()),
        );
        fromEvent(document, 'selectionchange').pipe(
            toDocumentSelectedText(),
            tap((selectedText) => {
                (logLevel >= 2) && console.log('Get the selected text: ', selectedText);
            }),
            tap(() => {
                speechSynthesis.cancel(); // 如果還有正在播放的語音，就先停止
            }),
            switchMap((selectedText) => timer(1000).pipe(switchMap(() => SpeakText(selectedText)))),
            catchError(err => of(err))
        ).subscribe();

    };

    // 取得 document 的所有 keydown 事件 (RxJS)
    const keydown$ = fromEvent(document, 'keydown');

    /**
     * 設定一些快速鍵
     */
    const registerHotKeys = () => {
        // win 使用 alt, mac 使用 cmd + option
        const altOrCommandOption = (event) => {
            return event.altKey && (isMac() ? event.metaKey : true);
        }

        const keydownEscape$ = keydown$.pipe(filter((ev) => ev.key === 'Escape' && !(ev.altKey || ev.ctrlKey || ev.metaKey || ev.shiftKey)));
        const keydownEnter$ = keydown$.pipe(filter((ev) => ev.key === 'Enter' && ev.target.nodeName === 'TEXTAREA' && !(ev.altKey || ev.ctrlKey || ev.metaKey || ev.shiftKey)));
        const keydownAltS$ = keydown$.pipe(filter((ev) => altOrCommandOption(ev) && (ev.code === 'KeyS')));
        const keydownAltT$ = keydown$.pipe(filter((ev) => altOrCommandOption(ev) && (ev.code === 'KeyT')));
        const keydownAltR$ = keydown$.pipe(filter((ev) => altOrCommandOption(ev) && (ev.code === 'KeyR')));
        const keydownAltM$ = keydown$.pipe(filter((ev) => altOrCommandOption(ev) && (ev.code === 'KeyM')));

        // Terminate immediately
        keydownAltT$.subscribe((ev) => {
            speechSynthesisStop$.next();
            speechRecognitionStop$.next();
        });

        // Toggle microphone button
        keydownAltS$.subscribe((ev) => {
            microphoneButtonElement.dispatchEvent(new Event('click', { bubbles: true }));
        });

        // Toggle speaker button
        keydownAltM$.subscribe((ev) => {
            speakerButtonElement.dispatchEvent(new Event('click', { bubbles: true }));
        });

        // Submit then reset()
        // keydownEnter$.subscribe((ev) => {
        //     reset();
        // });

        // Alt + R to reset()
        keydownAltR$.subscribe((ev) => {
            reset();
        });

        // Escape to reset()
        keydownEscape$.subscribe((ev) => {
            reset();
        });

    }

    function initializeTextboxInputEvent() {
        // 只要是在語音識別的狀態下，有人在 textarea 輸入文字，就要取消原本在 Parts 中的所有暫存輸入資料，以人工輸入為主
        textAreaElement.addEventListener('input', (ev) => {
            if (isSpeechRecognitionEnabled()) {
                (logLevel >= 1) && console.log('initializeTextboxInputEvent', ev);
                // 只要在語音識別的狀態下，有人在 textarea 輸入文字，就要停用語音識別，否則兩邊同時輸入很容易有 Bug
                if (!!ev.inputType) {
                    speechRecognitionStop$.next();
                }
            }
        });
    }

    function addButtons() {
        // 預設的送出按鈕
        submitButtonElement = textAreaElement.nextSibling;

        submitButtonElement.addEventListener('click', (ev) => {
            this.submit();

            setTimeout(() => {
                reset();
            }, 500);
        });

        // 加入麥克風按鈕
        textAreaElement.parentElement.insertBefore(microphoneButtonElement, submitButtonElement);
        // 加入聲音輸出按鈕
        textAreaElement.parentElement.insertBefore(speakerButtonElement, microphoneButtonElement);
        // 調整輸入框的寬度，避免文字輸入框跟按鈕重疊
        textAreaElement.style.paddingRight = '90px';
    }

    function reset() {
        Parts = [];
        speechSynthesisStop$.next();
        speechRecognitionStop$.next();

        // speechRecognition.continuous = true;
        // speechRecognition.interimResults = true;
        //speechRecognition.lang = defaultLang; // 可設定值清單 ▶ https://stackoverflow.com/a/68742566/910074

        textAreaElement.value = ''
        textAreaElement.dispatchEvent(new Event('input', { bubbles: true }));
        textAreaElement.focus();
        textAreaElement.setSelectionRange(textAreaElement.value.length, textAreaElement.value.length);
        textAreaElement.scrollTop = textAreaElement.scrollHeight; // 自動捲動到最下方

        if (document.querySelector('#microphoneButtonElementContextMenu')) {
            document.querySelector('#microphoneButtonElementContextMenu').close();
        }

        if (document.querySelector('#speakerButtonElementContextMenu')) {
            document.querySelector('#speakerButtonElementContextMenu').close();
        }

        speakerButtonElement.innerHTML = svgSpeakerOff;
        microphoneButtonElement.innerHTML = svgMicOff;
    }

    // 偵測換頁必須 5 秒後才開始，因為第一次載入時可能會透過 ChatGPTAutoFill.user.js 加入預設表單內容
    setTimeout(() => {

        setInterval(() => {
            if (document.querySelector('#btn-speaker') === null) {
                (logLevel >= 1) && console.log('偵測到換頁事件');

                reset();

                setTimeout(() => {
                    textAreaElement = document.activeElement;
                    addButtons();      // 新增兩個 Buttons
                    initializeTextboxInputEvent(); // 初始化輸入框事件
                }, 300);

            }
        }, 300);

    }, 5000);

    /**
     * 等待 focus 到訊息輸入框就開始初始化功能
     */
    interval(100).pipe(
        map(() => document.activeElement),
        filter((element) => element.tagName === 'TEXTAREA' && element.nextSibling.tagName === 'BUTTON'),
        take(1)
    )
        .subscribe((textarea) => {
            // 整個 Scope 共用的變數
            textAreaElement = textarea;

            setTimeout(() => {
                addButtons();      // 新增兩個 Buttons
                registerHotKeys(); // 註冊全域鍵盤熱鍵事件

                // 語音合成
                listenUtteranceTextAndSpeak();
                selectTextToSpeak();

                // 語音辨識
                initializeTextboxInputEvent();

            }, 300);

        });
})();
