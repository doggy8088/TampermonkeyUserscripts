// ==UserScript==
// @name         中、英文網頁切換器
// @version      1.10.1
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
    document.addEventListener('keydown', (ev) => {
        const isCapsLockOn = ev.getModifierState('CapsLock');
        const isAltS = ev.altKey && ev.code === 'KeyS';
        const inExcludedTargets = /^(?:input|select|textarea|button)$/i.test(ev.target.nodeName);

        if (isAltS && !inExcludedTargets) {
            if (isCapsLockOn) {
              alert('你是不是不小心按到了 CAPSLOCK 鍵？');
              return;
            }

            (function () {
                var idx,
                    hn = location.hostname.toLowerCase(),
                    ln = location.href,
                    pn = location.pathname;

                function switchWikipediaLang(toLang) {
                    let link = document.querySelector("#p-lang")?.querySelector(`a[hreflang="${toLang}"]`);
                    if (link) { link.click(); return }

                    let chkbox = document.querySelector('#p-lang-btn-checkbox');
                    if (chkbox) {
                        chkbox.click();
                        let waitTimer = 0;
                        let si = setInterval(() => {
                            let langList = document.querySelector('.uls-language-list');
                            if (langList) {
                                clearInterval(si);
                                chkbox.click();
                                document.querySelector('.uls-language-list')?.querySelector(`a[hreflang="${toLang}"]`)?.click();
                            } else {
                                if (waitTimer++ > 100) { clearInterval(si); }
                            }
                        }, 50);
                        return;
                    }
                }

                if (location.hostname == 'zh.wikipedia.org') {
                    switchWikipediaLang('en');
                }

                if (location.hostname == 'en.wikipedia.org') {
                    switchWikipediaLang('zh');
                }

                if (ln.indexOf('//getbootstrap.com/docs/3.3/') >= 0) {
                    void (location.href = ln.replace(/getbootstrap\.com\/docs\/3\.3\//i, 'v3.bootcss.com/'));
                }
                if (ln.indexOf('//v3.bootcss.com/') >= 0) {
                    void (location.href = ln.replace(/v3\.bootcss\.com\//i, 'getbootstrap.com/docs/3.3/'));
                }

                if (ln === 'https://getbootstrap.com/') {
                    void (location.href = 'https://bootstrap5.hexschool.com');
                }
                if (ln.indexOf('//bootstrap.hexschool.com/') >= 0) {
                    void (location.href = ln.replace(/bootstrap\.hexschool\.com/i, 'getbootstrap.com'));
                }
                if (ln.indexOf('//bootstrap5.hexschool.com/') >= 0) {
                    void (location.href = ln.replace(/bootstrap5\.hexschool\.com/i, 'getbootstrap.com'));
                }
                if (ln.indexOf('//bootstrap5.hexschool.com/') >= 0) {
                    void (location.href = ln.replace(/bootstrap5\.hexschool\.com/i, 'getbootstrap.com'));
                }
                if (ln.indexOf('//getbootstrap.com/docs/4') >= 0) {
                    void (location.href = ln.replace(/http(s?)\:\/\/getbootstrap\.com\/docs\/4.\d/i, 'http://bootstrap.hexschool.com/docs/4.2'));
                }
                if (ln.indexOf('//getbootstrap.com/docs/5') >= 0) {
                    void (location.href = ln.replace(/http(s?)\:\/\/getbootstrap\.com\/docs\/5.\d/i, 'http://bootstrap5.hexschool.com/docs/5.1'));
                }
                if (ln.indexOf('//doc.rust-lang.org/stable/book/') >= 0) {
                    void (location.href = ln.replace(/\/\/doc\.rust\-lang\.org\/stable\/book\//i, '//rust-lang.tw/book-tw/'));
                }
                if (ln.indexOf('//rust-lang.tw/book-tw/') >= 0) {
                    void (location.href = ln.replace(/\/\/rust\-lang\.tw\/book\-tw\//i, '//doc.rust-lang.org/stable/book/'));
                }

                if (ln.indexOf('//www.autohotkey.com/docs/') >= 0) {
                    void (location.href = ln.replace(/\/\/www\.autohotkey\.com\/docs\//i, '//wyagd001.github.io/zh-cn/docs/'));
                }
                if (ln.indexOf('//wyagd001.github.io/zh-cn/docs/') >= 0) {
                    void (location.href = ln.replace(/\/\/wyagd001\.github\.io\/zh-cn\/docs\//i, '//www.autohotkey.com/docs/'));
                }

                if (ln.indexOf('//angular.io/') >= 0) {
                    void (location.href = ln.replace(/angular\.io/i, 'angular.tw'));
                }
                if (ln.indexOf('//angular.tw/') >= 0) {
                    void (location.href = ln.replace(/angular\.tw/i, 'angular.io'));
                }

                if (ln.indexOf('//material.angular.io/') >= 0) {
                    void (location.href = ln.replace(/material\.angular\.io/i, 'material.angular.tw'));
                }
                if (ln.indexOf('//material.angular.tw/') >= 0) {
                    void (location.href = ln.replace(/material\.angular\.tw/i, 'material.angular.io'));
                }

                if (ln.indexOf('//playwright.dev/') >= 0) {
                    void (location.href = ln.replace(/playwright\.dev/i, 'playwright.tw'));
                }
                if (ln.indexOf('//playwright.tw/') >= 0) {
                    void (location.href = ln.replace(/playwright\.tw/i, 'playwright.dev'));
                }

                if (ln.indexOf('//www.jquery123.com/') >= 0) {
                    void (location.href = ln.replace(/www\.jquery123\.com/i, 'api.jquery.com'));
                }
                if (ln.indexOf('//api.jquery.com/') >= 0) {
                    void (location.href = ln.replace(/http(s?)\:\/\/api\.jquery\.com/i, 'http://www.jquery123.com'));
                }

                if (ln.indexOf('//rxjs.dev/') >= 0) {
                    void (location.href = ln.replace(/rxjs\.dev/i, 'rxjs.angular.tw'));
                }
                if (ln.indexOf('//rxjs.angular.tw/') >= 0) {
                    void (location.href = ln.replace(/rxjs.angular\.tw/i, 'rxjs.dev'));
                }

                if (ln.indexOf('//reactivex.io/rxjs/') >= 0) {
                    void (location.href = ln.replace(/reactivex\.io\/rxjs/i, 'cn.rx.js.org'));
                }
                if (ln.indexOf('//cn.rx.js.org/') >= 0) {
                    if (ln == 'https://cn.rx.js.org/') {
                        location.href = 'http://reactivex.io/rxjs/manual/index.html';
                        return;
                    }
                    void (location.href = ln.replace(/https:\/\/cn\.rx\.js\.org/i, 'http://reactivex.io/rxjs'));
                }

                if (ln.indexOf('//vuejs.org/') >= 0) {
                    void (location.href = ln.replace(/vuejs\.org/i, 'cn.vuejs.org'));
                }
                if (ln.indexOf('//cn.vuejs.org/') >= 0) {
                    void (location.href = ln.replace(/cn\.vuejs\.org/i, 'vuejs.org'));
                }

                if (ln.indexOf('//dart.dev/') >= 0) {
                    // void (location.host = 'dart.cn');
                    void (location.host = 'dart.tw.gh.miniasp.com');
                }
                // if (ln.indexOf('//dart.cn/') >= 0) {
                if (ln.indexOf('//dart.cn/') >= 0 || ln.indexOf('//dart.tw.gh.miniasp.com/') >= 0) {
                    void (location.host = 'dart.dev');
                }

                if (ln.indexOf('//docs.flutter.dev/') >= 0) {
                    void (location.host = 'flutter.tw');
                }
                if (ln.indexOf('//flutter.tw/') >= 0) {
                    void (location.host = 'docs.flutter.dev');
                }
                if (ln.indexOf('//flutter.cn/') >= 0) {
                    void (location.host = 'flutter.dev');
                }

                if (ln.indexOf('//jhipster.gh.miniasp.com/') >= 0) {
                    void (location.host = 'www.jhipster.tech');
                }
                if (ln.indexOf('//www.jhipster.tech/') >= 0) {
                    void (location.host = 'jhipster.gh.miniasp.com');
                }

                if (hn.indexOf('google.com') >= 0 && hn.indexOf('mail.google.com') == -1) {
                    // https://developers.google.com/web/fundamentals/?hl=en-us
                    idx = location.search.indexOf('hl=');
                    if (idx == -1) {
                        if (location.search.indexOf('?') == 0) {
                            void (location.search += '&hl=en-us');
                        } else {
                            void (location.search += '?hl=en-us');
                        }
                    } else {
                        if (location.search.substr(idx + 3, 2) == 'en') {
                            void (location.search = location.search.replace(/hl=(\w\w)(-\w+)?/i, 'hl=zh-Hant'));
                        } else {
                            void (location.search = location.search.replace(/hl=(\w\w)(-\w+)?/i, 'hl=en-us'));
                        }
                    }
                }

                if (hn === 'mail.google.com') {
                    document.querySelectorAll('div').forEach(dom => {
                        if (dom.innerText == '翻譯郵件' || dom.innerText == '檢視原始郵件' || dom.innerText == '檢視經過翻譯的郵件') { dom.click(); return; }
                    });
                }

                if (hn.indexOf('mozilla.org') >= 0) {
                    if (pn.search(/^\/(en)(-\w\w)?(\/)?(.*)/i) >= 0) {
                        void (location.pathname = pn.replace(/^\/en(-\w\w)?\//i, '/zh-tw/'));
                    } else {
                        void (location.pathname = pn.replace(/^\/\w\w(-\w\w)?\//i, '/en-us/'));
                    }
                }

                if (hn.indexOf('.facebook.com') >= 0) {
                    if (location.search === '' || location.search === '?locale=zh_TW') {
                        void (location.search='?locale=en_US');
                    } else {
                        void (location.search='?locale=zh_TW');
                    }
                }

                if (hn.indexOf('kubernetes.io') >= 0) {
                    if (pn.search(/^\/zh-cn\//i) >= 0) {
                        void (location.pathname = pn.replace(/\/zh-cn\//i, '/'));
                    } else {
                        void (location.pathname = '/zh-cn' + pn);
                    }
                }

                if (hn.indexOf('microsoft.com') >= 0 || hn.indexOf('office.com') >= 0 || hn.indexOf('visualstudio.com') >= 0) {
                    // http://support.microsoft.com/kb/2951262
                    idx = pn.search(/^\/kb\/\d+/i);
                    if (hn.indexOf('support.microsoft.com') >= 0 && idx >= 0) {
                        // http://support.microsoft.com/kb/2951262/
                        if (pn.search(/^\/kb\/\d+\/?$/i) >= 0) {
                            void (location.pathname = pn.replace(/^(\/kb\/\d+)(\/)?(\w\w-\w\w)?$/i, '$1/en-us'));
                        } else {
                            // http://support.microsoft.com/kb/2951262/en-us
                            if (pn.search(/^\/kb\/\d+\/(\w\w)(-\w\w)?/i) >= 0) {
                                if (pn.search(/^(\/kb\/\d+\/)en(-\w\w)?$/i) >= 0) {
                                    // http://support.microsoft.com/kb/2951262/zh-tw
                                    void (location.pathname = pn.replace(/^(\/kb\/\d+\/)en(-\w\w)?$/i, '$1zh-tw'));
                                } else {
                                    // http://support.microsoft.com/kb/2951262/en-us
                                    void (location.pathname = pn.replace(/^(\/kb\/\d+\/)\w\w(-\w\w)?$/i, '$1en-us'));
                                }
                            } else {
                                void (location.pathname = pn.replace(/^(\/kb\/\d+)(\/\w\w-\w\w)?$/i, '$1/en-us'));
                            }
                        }
                    } else {
                        // http://msdn.microsoft.com/ja-jp/library/system.drawing.color.aspx
                        if (pn.search(/^\/(\w\w)(-\w\w)\/?/i) >= 0) {
                            if (pn.search(/^\/(en)(-\w\w)(\/)?(.*)/i) >= 0) {
                                void (location.pathname = pn.replace(/^\/(en)(-\w\w)(\/)?(.*)/i, '/zh-tw$3$4'));
                            } else {
                                void (location.pathname = pn.replace(/^\/(\w\w)(-\w\w)(\/)?(.*)/i, '/en-us$3$4'));
                            }
                        }
                    }
                }
            }());
        }
    });
})();
