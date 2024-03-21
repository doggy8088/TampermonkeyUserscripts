import {
    Readability,
    isProbablyReaderable
} from '@mozilla/readability';

function getHTMLfromSelectorOrContent() {

    let selection = window.getSelection();
    let html = '';

    let container = document.createElement('div');

    if (selection.rangeCount > 0) {
        let range = selection.getRangeAt(0);
        container.appendChild(range.cloneContents());
        if (!!container) {
            // 刪除 container 中的所有 script 標籤
            let scripts = container.querySelectorAll('script');
            scripts.forEach(function (script) {
                script.remove();
            });

            // 找出 container.innerHTML 的 HTML 中所有的圖片，如果網址是 / 開頭，就幫我轉成完整的網址
            let images = container.querySelectorAll('img');
            images.forEach(function (img) {
                var src = img.getAttribute('src');
                if (src && src.startsWith('/')) {
                    var fullUrl = window.location.origin + src;
                    img.setAttribute('src', fullUrl);
                }
            });

            // 找出 container.innerHTML 的 HTML 中所有的 Hyperlink，如果網址是 / 開頭，就幫我轉成完整的網址
            let links = container.querySelectorAll('a');
            links.forEach(function (a) {
                var href = a.getAttribute('href');
                if (href && href.startsWith('/')) {
                    var fullUrl = window.location.origin + href;
                    a.setAttribute('href', fullUrl);
                }
            });
        }
        html = container?.innerHTML;
    }

    if (!container.innerHTML) {
        if (!isProbablyReaderable(document)) {
            console.warn('目前的頁面無法使用 Readability 來處理，輸出結果可能不如預期。');
        }

        var documentClone = document.cloneNode(true);
        var article = new Readability(documentClone).parse();
        html = `<h1>${article.title}</h1>` + article.content;
        // container = document.querySelector('article');
    }

    return html;
}

var html2markdown = function (html) {
    let toMarkdown = function (e, n) { return e() }(function () { return (function e(n, t, r) { function o(a, c) { if (!t[a]) { if (!n[a]) { var l = "function" == typeof require && require; if (!c && l) return l(a, !0); if (i) return i(a, !0); var u = Error("Cannot find module '" + a + "'"); throw u.code = "MODULE_NOT_FOUND", u } var f = t[a] = { exports: {} }; n[a][0].call(f.exports, function (e) { var t; return o(n[a][1][e] || e) }, f, f.exports, e, n, t, r) } return t[a].exports } for (var i = "function" == typeof require && require, a = 0; a < r.length; a++)o(r[a]); return o })({ 1: [function (e, n, t) { "use strict"; var r, o, i = e("./lib/md-converters"), a = e("./lib/gfm-converters"), c = e("./lib/html-parser"), l = e("collapse-whitespace"), u = ["address", "article", "aside", "audio", "blockquote", "body", "canvas", "center", "dd", "dir", "div", "dl", "dt", "fieldset", "figcaption", "figure", "footer", "form", "frameset", "h1", "h2", "h3", "h4", "h5", "h6", "header", "hgroup", "hr", "html", "isindex", "li", "main", "menu", "nav", "noframes", "noscript", "ol", "output", "p", "pre", "section", "table", "tbody", "td", "tfoot", "th", "thead", "tr", "ul"]; function f(e) { return -1 !== u.indexOf(e.nodeName.toLowerCase()) } var s = ["area", "base", "br", "col", "command", "embed", "hr", "img", "input", "keygen", "link", "meta", "param", "source", "track", "wbr"]; function d(e) { return -1 !== s.indexOf(e.nodeName.toLowerCase()) } function p(e) { for (var n = "", t = 0; t < e.childNodes.length; t++)if (1 === e.childNodes[t].nodeType) n += e.childNodes[t]._replacement; else { if (3 !== e.childNodes[t].nodeType) continue; n += e.childNodes[t].data } return n } function m(e, n) { if ("string" == typeof n) return n === e.nodeName.toLowerCase(); if (Array.isArray(n)) return -1 !== n.indexOf(e.nodeName.toLowerCase()); if ("function" == typeof n) return n.call(r, e); throw TypeError("`filter` needs to be a string, array, or function") } function h(e, n) { var t, r, o; return "left" === e ? (t = n.previousSibling, r = / $/) : (t = n.nextSibling, r = /^ /), t && (3 === t.nodeType ? o = r.test(t.nodeValue) : 1 !== t.nodeType || f(t) || (o = r.test(t.textContent))), o } function g(e) { var n = "", t = ""; if (!f(e)) { var r = /^[ \r\n\t]/.test(e.innerHTML), o = /[ \r\n\t]$/.test(e.innerHTML); r && !h("left", e) && (n = " "), o && !h("right", e) && (t = " ") } return { leading: n, trailing: t } } function v(e) { var n, t = p(e); if (!d(e) && !/A|TH|TD/.test(e.nodeName) && /^\s*$/i.test(t)) { e._replacement = ""; return } for (var i = 0; i < o.length; i++) { var a = o[i]; if (m(e, a.filter)) { if ("function" != typeof a.replacement) throw TypeError("`replacement` needs to be a function that returns a string"); var c = g(e); (c.leading || c.trailing) && (t = t.trim()), n = c.leading + a.replacement.call(r, t, e) + c.trailing; break } } e._replacement = n } (r = function (e, n) { if (n = n || {}, "string" != typeof e) throw TypeError(e + " is not a string"); var t, r, u, s = (t = e = e.replace(/(>[\r\n\s]*)(\d+)\.(&nbsp;| )/g, "$1$2\\.$3"), r = new c().parseFromString(t, "text/html"), l(r.documentElement, f), r).body, d = function e(n) { for (var t, r, o, i = [n], a = []; i.length > 0;)for (a.push(t = i.shift()), r = t.childNodes, o = 0; o < r.length; o++)1 === r[o].nodeType && i.push(r[o]); return a.shift(), a }(s); o = i.slice(0), n.gfm && (o = a.concat(o)), n.converters && (o = n.converters.concat(o)); for (var m = d.length - 1; m >= 0; m--)v(d[m]); return (u = p(s)).replace(/^[\t\r\n]+|[\t\r\n\s]+$/g, "").replace(/\n\s+\n/g, "\n\n").replace(/\n{3,}/g, "\n\n") }).isBlock = f, r.isVoid = d, r.outer = function e(n, t) { return n.cloneNode(!1).outerHTML.replace("><", ">" + t + "<") }, n.exports = r }, { "./lib/gfm-converters": 2, "./lib/html-parser": 3, "./lib/md-converters": 4, "collapse-whitespace": 7 }], 2: [function (e, n, t) { "use strict"; function r(e, n) { var t = Array.prototype.indexOf.call(n.parentNode.childNodes, n), r = " "; return 0 === t && (r = "| "), r + e + " |" } var o = /highlight highlight-(\S+)/; n.exports = [{ filter: "br", replacement: function () { return "\n" } }, { filter: ["del", "s", "strike"], replacement: function (e) { return "~~" + e + "~~" } }, { filter: function (e) { return "checkbox" === e.type && "LI" === e.parentNode.nodeName }, replacement: function (e, n) { return (n.checked ? "[x]" : "[ ]") + " " } }, { filter: ["th", "td"], replacement: function (e, n) { return r(e, n) } }, { filter: "tr", replacement: function (e, n) { var t = "", o = { left: ":--", right: "--:", center: ":-:" }; if ("THEAD" === n.parentNode.nodeName) for (var i = 0; i < n.childNodes.length; i++) { var a = n.childNodes[i].attributes.align, c = "---"; a && (c = o[a.value] || c), t += r(c, n.childNodes[i]) } return "\n" + e + (t ? "\n" + t : "") } }, { filter: "table", replacement: function (e) { return "\n\n" + e + "\n\n" } }, { filter: ["thead", "tbody", "tfoot"], replacement: function (e) { return e } }, { filter: function (e) { return "PRE" === e.nodeName && e.firstChild && "CODE" === e.firstChild.nodeName }, replacement: function (e, n) { return "\n\n```\n" + n.firstChild.textContent.trim() + "\n```\n\n" } }, { filter: function (e) { return "PRE" === e.nodeName && "DIV" === e.parentNode.nodeName && o.test(e.parentNode.className) }, replacement: function (e, n) { return "\n\n```" + n.parentNode.className.match(o)[1] + "\n" + n.textContent + "\n```\n\n" } }, { filter: function (e) { return "DIV" === e.nodeName && o.test(e.className) }, replacement: function (e) { return "\n\n" + e + "\n\n" } }] }, {}], 3: [function (e, n, t) { var r = "undefined" != typeof window ? window : this; n.exports = !function e() { var n = r.DOMParser, t = !1; try { new n().parseFromString("", "text/html") && (t = !0) } catch (o) { } return t }() ? function n() { var t = function () { }; if ("undefined" == typeof document) { var r = e("jsdom"); t.prototype.parseFromString = function (e) { return r.jsdom(e, { features: { FetchExternalResources: [], ProcessExternalResources: !1 } }) } } else !function e() { var n = !1; try { document.implementation.createHTMLDocument("").open() } catch (t) { window.ActiveXObject && (n = !0) } return n }() ? t.prototype.parseFromString = function (e) { var n = document.implementation.createHTMLDocument(""); return n.open(), n.write(e), n.close(), n } : t.prototype.parseFromString = function (e) { var n = new window.ActiveXObject("htmlfile"); return n.designMode = "on", n.open(), n.write(e), n.close(), n }; return t }() : r.DOMParser }, { jsdom: 6 }], 4: [function (e, n, t) { "use strict"; n.exports = [{ filter: "p", replacement: function (e) { return "\n\n" + e + "\n\n" } }, { filter: "br", replacement: function () { return "  \n" } }, { filter: ["h1", "h2", "h3", "h4", "h5", "h6"], replacement: function (e, n) { for (var t = n.nodeName.charAt(1), r = "", o = 0; o < t; o++)r += "#"; return "\n\n" + r + " " + e + "\n\n" } }, { filter: "hr", replacement: function () { return "\n\n* * *\n\n" } }, { filter: ["em", "i"], replacement: function (e) { return "_" + e + "_" } }, { filter: ["strong", "b"], replacement: function (e) { return "**" + e + "**" } }, { filter: function (e) { var n = e.previousSibling || e.nextSibling, t = "PRE" === e.parentNode.nodeName && !n; return "CODE" === e.nodeName && !t }, replacement: function (e) { return "`" + e + "`" } }, { filter: function (e) { return "A" === e.nodeName && e.getAttribute("href") }, replacement: function (e, n) { var t = n.title ? ' "' + n.title + '"' : ""; return "[" + e + "](" + n.getAttribute("href") + t + ")" } }, { filter: "img", replacement: function (e, n) { var t = n.alt || "image", r = n.getAttribute("src") || "", o = n.title || ""; return r ? "![" + t + "](" + r + (o ? ' "' + o + '"' : "") + ")" : "" } }, { filter: function (e) { return "PRE" === e.nodeName && "CODE" === e.firstChild.nodeName }, replacement: function (e, n) { return "\n\n    " + n.firstChild.textContent.replace(/\n/g, "\n    ") + "\n\n" } }, { filter: "blockquote", replacement: function (e) { return "\n\n" + (e = (e = (e = e.trim()).replace(/\n{3,}/g, "\n\n")).replace(/^/gm, "> ")) + "\n\n" } }, { filter: "li", replacement: function (e, n) { e = e.replace(/^\s+/, "").replace(/\n/gm, "\n    "); var t = "*   ", r = n.parentNode, o = Array.prototype.indexOf.call(r.children, n) + 1; return (t = /ol/i.test(r.nodeName) ? o + ".  " : "*   ") + e } }, { filter: ["ul", "ol"], replacement: function (e, n) { for (var t = [], r = 0; r < n.childNodes.length; r++)t.push(n.childNodes[r]._replacement); return /li/i.test(n.parentNode.nodeName) ? "\n" + t.join("\n") : "\n\n" + t.join("\n") + "\n\n" } }, { filter: function (e) { return this.isBlock(e) }, replacement: function (e, n) { return "\n\n" + e + "\n\n" } }, { filter: function () { return !0 }, replacement: function (e, n) { return e } }] }, {}], 5: [function (e, n, t) { n.exports = ["address", "article", "aside", "audio", "blockquote", "canvas", "dd", "div", "dl", "fieldset", "figcaption", "figure", "footer", "form", "h1", "h2", "h3", "h4", "h5", "h6", "header", "hgroup", "hr", "main", "nav", "noscript", "ol", "output", "p", "pre", "section", "table", "tfoot", "ul", "video"] }, {}], 6: [function (e, n, t) { }, {}], 7: [function (e, n, t) { "use strict"; var r = e("void-elements"); Object.keys(r).forEach(function (e) { r[e.toUpperCase()] = 1 }); var o = {}; function i(e) { return !!(e && o[e.nodeName]) } function a(e) { return !!(e && r[e.nodeName]) } function c(e) { var n = e.nextSibling || e.parentNode; return e.parentNode.removeChild(e), n } function l(e, n) { return e && e.parentNode === n || "PRE" === n.nodeName ? n.nextSibling || n.parentNode : n.firstChild || n.nextSibling || n.parentNode } e("block-elements").forEach(function (e) { o[e.toUpperCase()] = 1 }), n.exports = function e(n, t) { if (n.firstChild && "PRE" !== n.nodeName) { "function" != typeof t && (t = i); for (var r = null, o = !1, u = null, f = l(u, n); f !== n;) { if (3 === f.nodeType) { var s = f.data.replace(/[ \r\n\t]+/g, " "); if ((!r || / $/.test(r.data)) && !o && " " === s[0] && (s = s.substr(1)), !s) { f = c(f); continue } f.data = s, r = f } else if (1 === f.nodeType) t(f) || "BR" === f.nodeName ? (r && (r.data = r.data.replace(/ $/, "")), r = null, o = !1) : a(f) && (r = null, o = !0); else { f = c(f); continue } var d = l(u, f); u = f, f = d } r && (r.data = r.data.replace(/ $/, ""), r.data || c(r)) } } }, { "block-elements": 5, "void-elements": 8 }], 8: [function (e, n, t) { n.exports = { area: !0, base: !0, br: !0, col: !0, embed: !0, hr: !0, img: !0, input: !0, keygen: !0, link: !0, menuitem: !0, meta: !0, param: !0, source: !0, track: !0, wbr: !0 } }, {}] }, {}, [1])(1) });

    let isHTML = function (str) {
        var doc = new DOMParser().parseFromString(str, "text/html");
        return Array.from(doc.body.childNodes).some(node => node.nodeType === 1);
    }

    // http://pandoc.org/README.html#smart-punctuation
    let escape = function (str) {
        return str.replace(/[\u2018\u2019\u00b4]/g, "'")
            .replace(/[\u201c\u201d\u2033]/g, '"')
            .replace(/[\u2212\u2022\u00b7\u25aa]/g, '-')
            .replace(/[\u2013\u2015]/g, '--')
            .replace(/\u2014/g, '---')
            .replace(/\u2026/g, '...')
            .replace(/[ ]+\n/g, '\n')
            .replace(/\s*\\\n/g, '\\\n')
            .replace(/\s*\\\n\s*\\\n/g, '\n\n')
            .replace(/\s*\\\n\n/g, '\n\n')
            .replace(/\n-\n/g, '\n')
            .replace(/\n\n\s*\\\n/g, '\n\n')
            .replace(/\n\n\n*/g, '\n\n')
            .replace(/[ ]+$/gm, '')
            .replace(/^\s+|[\s\\]+$/g, '')
            .replace(/[\u00A0\u1680\u2000-\u200A\u202F\u205F\u3000]/g, ' ')
            // ZERO WIDTH SPACE: https://jkorpela.fi/chars/spaces.html
            .replace(/[\u200B\uFEFF]/g, '');
    };

    // http://pandoc.org/README.html#pandocs-markdown
    let pandoc = [
        {
            filter: 'h1',
            replacement: function (content, node) {
                return '# ' + content + '\n\n';
            }
        },

        {
            filter: 'h2',
            replacement: function (content, node) {
                return '## ' + content + '\n\n';
            }
        },

        {
            filter: 'sup',
            replacement: function (content) {
                return '^' + content + '^';
            }
        },

        {
            filter: 'sub',
            replacement: function (content) {
                return '~' + content + '~';
            }
        },

        {
            filter: 'br',
            replacement: function () {
                return '\\\n';
            }
        },

        {
            filter: 'hr',
            replacement: function () {
                return '\n\n***\n\n';
            }
        },

        {
            filter: ['em', 'i', 'cite', 'var'],
            replacement: function (content) {
                return '*' + content + '*';
            }
        },

        {
            filter: function (node) {
                var hasSiblings = node.previousSibling || node.nextSibling;
                var isCodeBlock = node.parentNode.nodeName === 'PRE' && !hasSiblings;
                var isCodeElem = node.nodeName === 'CODE' ||
                    node.nodeName === 'KBD' ||
                    node.nodeName === 'SAMP' ||
                    node.nodeName === 'TT';

                return isCodeElem && !isCodeBlock;
            },
            replacement: function (content) {
                return '`' + content + '`';
            }
        },

        {
            filter: function (node) {
                return node.nodeName === 'A' && node.getAttribute('href');
            },
            replacement: function (content, node) {
                var url = node.getAttribute('href');
                var titlePart = node.title ? ' "' + node.title + '"' : '';
                if (content === '') {
                    return '';
                } else if (content === url) {
                    return '<' + url + '>';
                } else if (url === ('mailto:' + content)) {
                    return '<' + content + '>';
                } else {
                    return '[' + content + '](' + url + titlePart + ')';
                }
            }
        },
        {
            filter: 'li',
            replacement: function (content, node) {
                content = content.replace(/^\s+/, '').replace(/\n/gm, '\n  ');
                var prefix = '- ';
                var parent = node.parentNode;
                var parentParent = parent.parentNode;
                var index = Array.prototype.indexOf.call(parent.children, node) + 1;

                prefix = /ol/i.test(parent.nodeName) ? index + '.  ' : '- '

                return prefix + content;
            }
        }
    ];

    let markdown = html;

    if (isHTML(html)) {
        markdown = toMarkdown(html, { converters: pandoc, gfm: true });
    }

    return escape(markdown);
}

function b64EncodeUnicode(str) {
    const bytes = new TextEncoder().encode(str);
    const base64 = window.btoa(String.fromCharCode(...new Uint8Array(bytes)));
    return base64;
}

function isBase64Unicode(str) {
    // Base64編碼後的字串僅包含 A-Z、a-z、0-9、+、/、= 這些字元
    const base64Regex = /^[\w\+\/=]+$/;
    if (!base64Regex.test(str)) return false;

    try {
        const decoded = window.atob(str);

        // 解碼後的字串應該是合法的 UTF-8 序列
        // 使用 TextDecoder 檢查是否可以成功解碼為 Unicode 字串
        const bytes = new Uint8Array(decoded.length);
        for (let i = 0; i < decoded.length; i++) {
            bytes[i] = decoded.charCodeAt(i);
        }
        const decoder = new TextDecoder('utf-8');
        decoder.decode(bytes);

        // 如果沒有拋出異常，則表示是合法的 Base64Unicode 編碼字串
        return true;
    } catch (e) {
        // 解碼失敗，則不是合法的 Base64Unicode 編碼字串
        return false;
    }
}

function b64DecodeUnicode(str) {
    const bytes = Uint8Array.from(window.atob(str), c => c.charCodeAt(0));
    const decoded = new TextDecoder().decode(bytes);
    return decoded;
}

let html = getHTMLfromSelectorOrContent();

if (!!html) {
    var markdown = html2markdown(html);
    let prompt = 'Please help me summarize the following text and list the key points. Then translate all the content into Traditional Chinese. No explanations and additional information of the translations are required. Do not add pronunciation annotations. Here is the text: Here is the text:\n```\n{input}\n```';
    let url = `https://gemini.google.com/app#autoSubmit=1&prompt=${encodeURIComponent(b64EncodeUnicode(prompt.replace('{input}', markdown)))}`;
    GM_openInTab(url, false);
}
