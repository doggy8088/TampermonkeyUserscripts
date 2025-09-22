// ==UserScript==
// @name         中、英文網頁切換器
// @version      1.14.0
// @description  按下 alt+s 快速鍵就會自動將目前網頁切換至中文版或英文版
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/LanguageSwitcher.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/LanguageSwitcher.user.js
// @author       Will Huang
// @match        *://*/*
// ==/UserScript==

(function () {
    'use strict';

    // 小工具：真偵測 Alt+S、避免在輸入元件觸發、執行第一個命中的規則
    const isExcludedTarget = (el) => /^(?:input|select|textarea|button)$/i.test(el?.nodeName || '');
    const isAltS = (ev) => ev.altKey && ev.code === 'KeyS';

    // 方便取用目前位址資訊
    const getLowercaseHostname = () => location.hostname.toLowerCase();
    const getCurrentPathname = () => location.pathname;
    const getCurrentUrl = () => location.href;

    const replaceHref = (regex, replacement) => {
        const url = getCurrentUrl();
        if (regex.test(url)) {
            location.href = url.replace(regex, replacement);
            return true;
        }
        return false;
    };

    const setHostIf = (cond, newHost) => {
        if (cond) {
            location.host = newHost;
            return true;
        }
        return false;
    };

    const toggleGoogleHl = () => {
        if (getLowercaseHostname().includes('google.com') && getLowercaseHostname() !== 'mail.google.com') {
            const url = new URL(getCurrentUrl());
            const current = url.searchParams.get('hl');
            if (!current) {
                url.searchParams.set('hl', 'en-us');
            } else if (/^en(\b|[-_])/i.test(current)) {
                url.searchParams.set('hl', 'zh-Hant');
            } else {
                url.searchParams.set('hl', 'en-us');
            }
            location.href = url.toString();
            return true;
        }
        return false;
    };

    const gmailToggleTranslate = () => {
        if (getLowercaseHostname() === 'mail.google.com') {
            const divs = document.querySelectorAll('div');
            for (let i = 0; i < divs.length; i++) {
                const dom = divs[i];
                if (dom.innerText === '翻譯郵件' || dom.innerText === '檢視原始郵件' || dom.innerText === '檢視經過翻譯的郵件') {
                    dom.click();
                    break;
                }
            }
            return true;
        }
        return false;
    };

    // Wikipedia 語言切換（優先）
    function switchWikipediaLang(toLang) {
        const panel = document.querySelector('#p-lang');
        const link = panel?.querySelector(`a[hreflang="${toLang}"]`);
        if (link) { link.click(); return true; }

        const chkbox = document.querySelector('#p-lang-btn-checkbox');
        if (chkbox) {
            chkbox.click();
            let waitTimer = 0;
            const si = setInterval(() => {
                const langList = document.querySelector('.uls-language-list');
                if (langList) {
                    clearInterval(si);
                    chkbox.click();
                    document.querySelector('.uls-language-list')?.querySelector(`a[hreflang="${toLang}"]`)?.click();
                } else if (waitTimer++ > 100) {
                    clearInterval(si);
                }
            }, 50);
            return true;
        }
        return false;
    }

    const wikipediaRule = () => {
        if (location.hostname === 'zh.wikipedia.org') return switchWikipediaLang('en');
        if (location.hostname === 'en.wikipedia.org') return switchWikipediaLang('zh');
        return false;
    };

    // Mozilla、Facebook、Kubernetes、Microsoft、Fallback 等規則
    const mozillaRule = () => {
        if (getLowercaseHostname().includes('mozilla.org')) {
            const path = getCurrentPathname();
            if (/^\/(en)(-\w\w)?(\/)?(.*)/i.test(path)) {
                location.pathname = path.replace(/^\/en(-\w\w)?\//i, '/zh-tw/');
            } else {
                location.pathname = path.replace(/^\/\w\w(-\w\w)?\//i, '/en-us/');
            }
            return true;
        }
        return false;
    };

    const facebookRule = () => {
        if (getLowercaseHostname().includes('.facebook.com')) {
            if (location.search === '' || location.search === '?locale=zh_TW') {
                location.search = '?locale=en_US';
            } else {
                location.search = '?locale=zh_TW';
            }
            return true;
        }
        return false;
    };

    const kubernetesRule = () => {
        if (getLowercaseHostname().includes('kubernetes.io')) {
            const path = getCurrentPathname();
            if (/^\/zh-cn\//i.test(path)) {
                location.pathname = path.replace(/\/zh-cn\//i, '/');
            } else {
                location.pathname = '/zh-cn' + path;
            }
            return true;
        }
        return false;
    };

    const microsoftRule = () => {
        const host = getLowercaseHostname();
        if (host.includes('microsoft.com') || host.includes('office.com') || host.includes('visualstudio.com')) {
            const path = getCurrentPathname();
            const isSupportKB = host.includes('support.microsoft.com') && /^\/kb\/\d+/i.test(path);
            if (isSupportKB) {
                if (/^\/kb\/\d+\/?$/i.test(path)) {
                    location.pathname = path.replace(/^(\/kb\/\d+)(\/)?(\w\w-\w\w)?$/i, '$1/en-us');
                } else if (/^\/kb\/\d+\/(\w\w)(-\w\w)?/i.test(path)) {
                    if (/^(\/kb\/\d+\/)en(-\w\w)?$/i.test(path)) {
                        location.pathname = path.replace(/^(\/kb\/\d+\/)en(-\w\w)?$/i, '$1zh-tw');
                    } else {
                        location.pathname = path.replace(/^(\/kb\/\d+\/)\w\w(-\w\w)?$/i, '$1en-us');
                    }
                } else {
                    location.pathname = path.replace(/^(\/kb\/\d+)(\/\w\w-\w\w)?$/i, '$1/en-us');
                }
                return true;
            }

            // 其他 /xx-XX/ 前綴
            if (/^\/(\w\w)(-\w\w)\/?/i.test(path)) {
                if (/^\/(en)(-\w\w)(\/)?(.*)/i.test(path)) {
                    location.pathname = path.replace(/^\/(en)(-\w\w)(\/)?(.*)/i, '/zh-tw$3$4');
                } else {
                    location.pathname = path.replace(/^\/(\w\w)(-\w\w)(\/)?(.*)/i, '/en-us$3$4');
                }
                return true;
            }
        }
        return false;
    };

    const fallbackChinesePathRule = () => {
        const path = getCurrentPathname();
        if (/^\/zh-(tw|cn)(\/|$)/i.test(path)) {
            location.pathname = path.replace(/^\/zh-(tw|cn)(\/)?/i, '/en$2');
            return true;
        }
        return false;
    };

    // 網站映射規則（雙向）
    const mappingRules = [
        // Bootstrap
        () => replaceHref(/\/\/getbootstrap\.com\/docs\/3\.3\//i, 'v3.bootcss.com/'),
        () => replaceHref(/\/\/v3\.bootcss\.com\//i, 'getbootstrap.com/docs/3.3/'),
        () => getCurrentUrl() === 'https://getbootstrap.com/' ? (location.href = 'https://bootstrap5.hexschool.com', true) : false,
        () => replaceHref(/bootstrap\.hexschool\.com/i, 'getbootstrap.com'),
        () => replaceHref(/bootstrap5\.hexschool\.com/i, 'getbootstrap.com'),
        () => replaceHref(/http(s?)\:\/\/getbootstrap\.com\/docs\/4\.\d/i, 'http://bootstrap.hexschool.com/docs/4.2'),
        () => replaceHref(/http(s?)\:\/\/getbootstrap\.com\/docs\/5\.\d/i, 'http://bootstrap5.hexschool.com/docs/5.1'),

        // Rust Book
        () => replaceHref(/\/\/doc\.rust\-lang\.org\/stable\/book\//i, '//rust-lang.tw/book-tw/'),
        () => replaceHref(/\/\/rust\-lang\.tw\/book\-tw\//i, '//doc.rust-lang.org/stable/book/'),

        // AutoHotkey
        () => replaceHref(/\/\/www\.autohotkey\.com\/docs\//i, '//wyagd001.github.io/zh-cn/docs/'),
        () => replaceHref(/\/\/wyagd001\.github\.io\/zh-cn\/docs\//i, '//www.autohotkey.com/docs/'),

        // Angular
        // angular.io <-> angular.tw
        () => replaceHref(/^(https?:)\/\/(angular\.io)(\/|$)/i, '$1//dev.angular.tw$3'),
        () => replaceHref(/^(https?:)\/\/(angular\.tw)(\/|$)/i, '$1//angular.io$3'),
        // angular.dev <-> dev.angular.tw
        () => replaceHref(/^(https?:)\/\/(angular\.dev)(\/|$)/i, '$1//dev.angular.tw$3'),
        () => replaceHref(/^(https?:)\/\/(dev\.angular\.tw)(\/|$)/i, '$1//angular.dev$3'),

        // Angular Material
        () => replaceHref(/material\.angular\.io/i, 'material.angular.tw'),
        () => replaceHref(/material\.angular\.tw/i, 'material.angular.io'),

        // Playwright
        () => replaceHref(/playwright\.dev/i, 'playwright.tw'),
        () => replaceHref(/playwright\.tw/i, 'playwright.dev'),

        // jQuery API
        () => replaceHref(/www\.jquery123\.com/i, 'api.jquery.com'),
        () => replaceHref(/http(s?)\:\/\/api\.jquery\.com/i, 'http://www.jquery123.com'),

        // RxJS
        () => replaceHref(/rxjs\.dev/i, 'rxjs.angular.tw'),
        () => replaceHref(/rxjs\.angular\.tw/i, 'rxjs.dev'),

        // ReactiveX RxJS (特例：根目錄導向手冊)
        () => replaceHref(/reactivex\.io\/rxjs/i, 'cn.rx.js.org'),
        () => {
            const url = getCurrentUrl();
            if (url.indexOf('//cn.rx.js.org/') >= 0) {
                if (url === 'https://cn.rx.js.org/') {
                    location.href = 'http://reactivex.io/rxjs/manual/index.html';
                    return true;
                }
                location.href = url.replace(/https:\/\/cn\.rx\.js\.org/i, 'http://reactivex.io/rxjs');
                return true;
            }
            return false;
        },

        // Vue.js
        () => replaceHref(/vuejs\.org/i, 'cn.vuejs.org'),
        () => replaceHref(/cn\.vuejs\.org/i, 'vuejs.org'),

        // Dart
        () => setHostIf(getCurrentUrl().indexOf('//dart.dev/') >= 0, 'dart.tw.gh.miniasp.com'),
        () => setHostIf(getCurrentUrl().indexOf('//dart.cn/') >= 0 || getCurrentUrl().indexOf('//dart.tw.gh.miniasp.com/') >= 0, 'dart.dev'),

        // Flutter
        () => setHostIf(getCurrentUrl().indexOf('//docs.flutter.dev/') >= 0, 'flutter.tw'),
        () => setHostIf(getCurrentUrl().indexOf('//flutter.tw/') >= 0, 'docs.flutter.dev'),
        () => setHostIf(getCurrentUrl().indexOf('//flutter.cn/') >= 0, 'flutter.dev'),

        // JHipster
        () => setHostIf(getCurrentUrl().indexOf('//jhipster.gh.miniasp.com/') >= 0, 'www.jhipster.tech'),
        () => setHostIf(getCurrentUrl().indexOf('//www.jhipster.tech/') >= 0, 'jhipster.gh.miniasp.com'),

        // VS Code
        () => setHostIf(getCurrentUrl().indexOf('//code.visualstudio.com/') >= 0, 'vscode.dev.org.tw'),
        () => setHostIf(getCurrentUrl().indexOf('//vscode.dev.org.tw/') >= 0, 'code.visualstudio.com'),
    ];

    function applyFirstMatch() {
        // 1) Wikipedia 語言切換（若命中直接返回）
        if (wikipediaRule()) return true;

        // 2) 網站映射（成對規則）
        for (const rule of mappingRules) {
            if (rule()) return true;
        }

        // 3) Google hl 參數切換（排除 Gmail）
        if (toggleGoogleHl()) return true;

        // 4) Gmail「翻譯郵件」切換
        if (gmailToggleTranslate()) return true;

        // 5) 其他站點規則
        if (mozillaRule()) return true;
        if (facebookRule()) return true;
        if (kubernetesRule()) return true;
        if (microsoftRule()) return true;

        // 6) Fallback：/zh-(tw|cn)/ -> /en
        if (fallbackChinesePathRule()) return true;

        return false;
    }

    document.addEventListener('keydown', (ev) => {
        if (!isAltS(ev) || isExcludedTarget(ev.target)) return;

        const isCapsLockOn = ev.getModifierState('CapsLock');
        if (isCapsLockOn) {
            alert('你是不是不小心按到了 CAPSLOCK 鍵？');
            return;
        }

        applyFirstMatch();
    });
})();
