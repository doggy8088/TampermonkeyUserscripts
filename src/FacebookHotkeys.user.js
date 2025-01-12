// ==UserScript==
// @name         Facebook: 好用的鍵盤快速鍵集合
// @version      0.3.0
// @description  按下 Ctrl+B 快速切換側邊欄
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/FacebookHotkeys.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/FacebookHotkeys.user.js
// @author       Will Huang
// @match        https://www.facebook.com/*
// @match        https://facebook.com/*
// @run-at       document-end
// @icon         https://www.google.com/s2/favicons?sz=64&domain=facebook.com
// ==/UserScript==

(function () {
    'use strict';
    const page = {
        /**
         * 根據 ARIA role 查找元素，包含完整的隱含 role 判斷。
         * @param {string} role - ARIA role 名稱。
         * @param {object} [options] - 選項。
         * @param {string|RegExp} [options.name] - 可訪問的名稱。可以是字串或正則表達式。
         * @param {boolean} [options.exact] - 是否精確匹配名稱。
         * @param {HTMLElement} [parentElement=document] - 父元素，用於縮小查找範圍。
         * @returns {NodeListOf<HTMLElement>} - 匹配的元素列表。
         */
        getByRole: function (role, options = {}, parentElement = document) {
            const implicitRoles = {
                'a[href]': 'link',
                'a:not([href])': 'generic',
                'address': 'group',
                'area[href]': 'link',
                'area:not([href])': 'generic',
                'article': 'article',
                'aside': 'complementary',
                'button': 'button',
                'caption': 'caption',
                'code': 'code',
                'data': 'generic',
                'datalist': 'listbox',
                'del': 'deletion',
                'details': 'group',
                'dfn': 'term',
                'dialog': 'dialog',
                'div': 'generic',
                'em': 'emphasis',
                'fieldset': 'group',
                'figure': 'figure',
                'footer:not(article footer, aside footer, main footer, nav footer, section footer,[role="article"] footer,[role="complementary"] footer,[role="main"] footer,[role="navigation"] footer,[role="region"] footer)': 'contentinfo',
                'footer': 'generic',
                'form': 'form',
                'h1': 'heading',
                'h2': 'heading',
                'h3': 'heading',
                'h4': 'heading',
                'h5': 'heading',
                'h6': 'heading',
                'header:not(article header, aside header, main header, nav header, section header,[role="article"] header,[role="complementary"] header,[role="main"] header,[role="navigation"] header,[role="region"] header)': 'banner',
                'header': 'generic',
                'hgroup': 'group',
                'hr': 'separator',
                'html': 'document',
                'i': 'generic',
                'img[alt]': 'img',
                'img:not([alt])': 'img', // 需要進一步判斷是否有其他命名方法
                'input[type="button"]': 'button',
                'input[type="checkbox"]': 'checkbox',
                'input[type="email"]:not([list])': 'textbox',
                'input[type="image"]': 'button',
                'input[type="number"]': 'spinbutton',
                'input[type="radio"]': 'radio',
                'input[type="range"]': 'slider',
                'input[type="reset"]': 'button',
                'input[type="search"]:not([list])': 'searchbox',
                'input[type="submit"]': 'button',
                'input[type="tel"]:not([list])': 'textbox',
                'input[type="text"]:not([list])': 'textbox',
                'input[list]': 'combobox',
                'ins': 'insertion',
                'li:is(:scope > ul > *, :scope > ol > *, :scope > menu > *)': 'listitem',
                'li': 'generic',
                'main': 'main',
                'math': 'math',
                'menu': 'list',
                'meter': 'meter',
                'nav': 'navigation',
                'ol': 'list',
                'optgroup': 'group',
                'option': 'option',
                'output': 'status',
                'p': 'paragraph',
                'pre': 'generic',
                'progress': 'progressbar',
                'q': 'generic',
                's': 'deletion',
                'samp': 'generic',
                'search': 'search',
                'section[aria-label]': 'region',
                'section[aria-labelledby]': 'region',
                'section': 'generic',
                'select:not([multiple]):not([size])': 'combobox',
                'select[multiple], select[size]:not([size="1"])': 'listbox',
                'small': 'generic',
                'span': 'generic',
                'strong': 'strong',
                'sub': 'subscript',
                'summary': 'button', // 注意：並非所有 User Agent 都會暴露為 button
                'sup': 'superscript',
                'svg': 'graphics-document',
                'table': 'table',
                'tbody': 'rowgroup',
                'td': (element) => {
                    const table = element.closest('table');
                    if (table) {
                        const tableRole = table.getAttribute('role');
                        if (tableRole === 'grid' || tableRole === 'treegrid') {
                            return 'gridcell';
                        } else if (tableRole !== 'presentation' && tableRole !== 'none') {
                            return 'cell';
                        }
                    }
                    return null; // 沒有對應的 role
                },
                'textarea': 'textbox',
                'tfoot': 'rowgroup',
                'th': (element) => {
                    const table = element.closest('table');
                    if (table) {
                        const tableRole = table.getAttribute('role');
                        if (tableRole === 'grid' || tableRole === 'treegrid') {
                            return 'gridcell'; // 或 columnheader/rowheader，根據具體情況
                        } else if (tableRole !== 'presentation' && tableRole !== 'none') {
                            return 'columnheader'; // 或 rowheader/cell，根據具體情況
                        }
                    }
                    return null; // 沒有對應的 role
                },
                'thead': 'rowgroup',
                'time': 'time',
                'tr': 'row',
                'ul': 'list',
            };

            let filteredElements = Array.from(parentElement.querySelectorAll('*')).filter(element => {
                const explicitRole = element.getAttribute('role');
                if (explicitRole) {
                    return explicitRole === role;
                }

                for (const selector in implicitRoles) {
                    if (element.matches(selector)) {
                        const implicitRole = typeof implicitRoles[selector] === 'function'
                            ? implicitRoles[selector](element)
                            : implicitRoles[selector];
                        if (implicitRole === role) {
                            return true;
                        }
                    }
                }
                return false;
            });

            if (options.name) {
                filteredElements = filteredElements.filter(element => {
                    const accessibleName = element.getAttribute('aria-label') || element.textContent.trim();
                    if (options.exact) {
                        return accessibleName === options.name;
                    } else if (typeof options.name === 'string') {
                        return accessibleName.includes(options.name);
                    } else if (options.name instanceof RegExp) {
                        return options.name.test(accessibleName);
                    }
                    return false;
                });
            }

            return filteredElements;
        },

        /**
         * 根據文字內容查找最接近的元素。
         * @param {string|RegExp} text - 要查找的文字內容。可以是字串或正則表達式。
         * @param {object} [options] - 選項。
         * @param {boolean} [options.exact] - 是否精確匹配文字。
         * @param {HTMLElement} [parentElement=document] - 父元素，用於縮小查找範圍。
         * @returns {NodeListOf<HTMLElement>} - 匹配的元素列表。
         */
        getByText: function (text, options = {}, parentElement = document) {
            const allElements = parentElement.querySelectorAll('*');
            let closestElements = [];

            for (const element of allElements) {
                // 取得元素的直接子節點中的文字節點
                const textNodes = Array.from(element.childNodes).filter(node => node.nodeType === Node.TEXT_NODE);
                const elementDirectText = textNodes.map(node => node.textContent).join('').replace(/\s+/g, ' ').trim();

                const matches = options.exact
                    ? elementDirectText === text
                    : typeof text === 'string'
                        ? elementDirectText.includes(text)
                        : text instanceof RegExp
                            ? text.test(elementDirectText)
                            : false;

                if (matches) {
                    closestElements.push(element);
                }
            }

            return closestElements;
        },

        getByLabel: function (text, options = {}, parentElement = document) {
            const labels = parentElement.querySelectorAll('label');
            let filteredElements = Array.from(labels)
                .filter(label => {
                    const normalizedText = label.textContent.replace(/\s+/g, ' ').trim();
                    if (options.exact) {
                        return normalizedText === text;
                    } else if (typeof text === 'string') {
                        return normalizedText.includes(text);
                    } else if (text instanceof RegExp) {
                        return text.test(normalizedText);
                    }
                    return false;
                })
                .map(label => {
                    const forAttribute = label.getAttribute('for');
                    if (forAttribute) {
                        return parentElement.getElementById(forAttribute);
                    } else {
                        return label.querySelector('input, select, textarea, button');
                    }
                })
                .filter(element => element !== null);

            return filteredElements;
        },

        getByPlaceholder: function (text, options = {}, parentElement = document) {
            const inputs = parentElement.querySelectorAll('input[placeholder], textarea[placeholder]');
            let filteredElements = Array.from(inputs).filter(input => {
                const placeholderText = input.getAttribute('placeholder');
                if (options.exact) {
                    return placeholderText === text;
                } else if (typeof text === 'string') {
                    return placeholderText.includes(text);
                } else if (text instanceof RegExp) {
                    return text.test(placeholderText);
                }
                return false;
            });
            return filteredElements;
        },

        getByAltText: function (text, options = {}, parentElement = document) {
            const elements = parentElement.querySelectorAll('img[alt], area[alt]');
            let filteredElements = Array.from(elements).filter(element => {
                const altText = element.getAttribute('alt');
                if (options.exact) {
                    return altText === text;
                } else if (typeof text === 'string') {
                    return altText.includes(text);
                } else if (text instanceof RegExp) {
                    return text.test(altText);
                }
                return false;
            });
            return filteredElements;
        },

        getByTitle: function (text, options = {}, parentElement = document) {
            const elements = parentElement.querySelectorAll('[title]');
            let filteredElements = Array.from(elements).filter(element => {
                const titleText = element.getAttribute('title');
                if (options.exact) {
                    return titleText === text;
                } else if (typeof text === 'string') {
                    return titleText.includes(text);
                } else if (text instanceof RegExp) {
                    return text.test(titleText);
                }
                return false;
            });
            return filteredElements;
        },

        getByTestId: function (testId, options = {}, parentElement = document) {
            const elements = parentElement.querySelectorAll('[data-testid]');
            let filteredElements = Array.from(elements).filter(element => {
                const dataTestId = element.getAttribute('data-testid');
                if (options.exact) {
                    return dataTestId === testId;
                } else if (typeof testId === 'string') {
                    return dataTestId.includes(testId);
                } else if (testId instanceof RegExp) {
                    return testId.test(dataTestId);
                }
                return false;
            });
            return filteredElements;
        },
    };

    // 當頁面載入後，先執行一次 ctrl+b 操作
    window.addEventListener('load', toggleSidebar);

    document.addEventListener("keydown", (event) => {
        // 按下 Ctrl+B 快速切換側邊欄
        if (event.ctrlKey && !event.altKey && event.key === "b") {
            // 只有粉絲團的 Sidebar 沒有找到才去隱藏其他的側邊欄
            // 因為只有粉絲團的 Sidebar 有切換顯示的按鈕
            toggleSidebar() || toggleSidebarByNavigation();
        }
        // 按下 Alt+B 會封鎖目前使用者
        if (!event.ctrlKey && event.altKey && event.key === "b") {
            page.getByText('檢舉留言')[0]?.click();
            page.getByText('詐騙、詐欺或不實資訊')[0]?.click();
            page.getByText('垃圾訊息')[0]?.click();
            page.getByText('完成')[0]?.click();
        }
    });

    function toggleSidebar() {
        var dom = document.querySelector('div[aria-label="隱藏功能表"],div[aria-label="顯示功能表"]')
        dom?.click();
        return !!dom;
    }

    function toggleSidebarByNavigation() {
        // var dom = page.getByRole('navigation', { name: '捷徑' })[0];
        // dom = dom || page.getByRole('navigation', { name: '社團清單' })[0];
        // dom = dom || page.getByRole('navigation', { name: '社團導覽' })[0];
        var navigation = page.getByRole('navigation');
        var dom = navigation[navigation.length - 1];
        if (dom) {
            dom.style.display = dom.style.display === 'none' ? '' : 'none';
        }
        return !!dom;
    }

})();
