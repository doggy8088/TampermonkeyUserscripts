// ==UserScript==
// @name         PDF-XChange: 按下 Ctrl+V 自動貼上建立客戶的欄位
// @version      0.2.1
// @description  先複製客戶資料的 JSON 內容，按下 Ctrl+V 可自動貼上建立客戶的欄位
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/PDFXChangeNewClientAutoFill.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/PDFXChangeNewClientAutoFill.user.js
// @author       Will Huang
// @match        https://www.pdf-xchange.com/*
// @grant        none
// ==/UserScript==

(async function () {
    'use strict';

    // waitForElement() 有傳入選項、但沒有指定 timeout 時的等待上限（毫秒）
    // 設計意圖：舊版的預設值 { timeout: 3000 } 只在「完全沒傳第二個參數」時才生效；
    // 只要傳了 { titleFilter: ... } 之類的選項，timeout 就是 undefined，
    // Date.now() - startTime > undefined 永遠是 false，找不到元素時每 100ms 的輪詢會永遠持續，
    // 自動化流程也永遠卡在那一步。這些呼叫原本實際上是「無限等待」（例如等待搜尋結果、等待對話框），
    // 為了不讓較慢的網路環境因此失敗，這裡給一個寬鬆的 30 秒上限，而不是套用 3 秒。
    const WAIT_FOR_ELEMENT_DEFAULT_TIMEOUT = 30000;

    loadGetAriaRoleLibrary();

    autoRefreshPagePerMinute(5);

    if (location.pathname === '/products') {
        (await waitForElement("a", { titleFilter: "Please Select Client", timeout: 50 }))?.scrollIntoView();
    }

    // JavaScript
    document.addEventListener("paste", async function (event) {
        const targetTag = event.target.tagName;
        // 在輸入框、文字區域或可編輯區域（例如富文字編輯器）中貼上時，允許預設的貼上動作
        if (targetTag === 'INPUT' || targetTag === 'TEXTAREA' || event.target.isContentEditable) {
            // 允許預設的貼上動作
            return;
        }

        // 只有兩個自動化頁面才需要接手貼上
        // 設計意圖：舊版在 pdf-xchange.com 的「所有頁面」都會先 preventDefault()，
        // 其他頁面雖然什麼都不做，貼上卻也被擋掉了。現在只在需要自動化的頁面才取消預設動作。
        const isProductsPage = location.pathname === '/products';
        const isNewClientPage = location.pathname === '/myaccount/clients-list/new-client';
        if (!isProductsPage && !isNewClientPage) {
            return;
        }

        // 防止預設的貼上動作
        event.preventDefault();

        // 從剪貼簿讀取文字
        // 設計意圖：優先使用 paste 事件本身攜帶的 clipboardData（必須在第一個 await 之前同步讀取），
        // 它不需要額外的剪貼簿權限，也不會像 navigator.clipboard.readText() 那樣在部分瀏覽器跳出權限提示
        // 或「貼上」確認選單；拿不到時才退回 readText()。readText() 失敗（權限被拒等）時，
        // 舊版會留下未處理的 Promise rejection 並默默結束，現在改為視為空字串，讓後續流程顯示既有的提示。
        let clipboardText = '';
        try {
            clipboardText = event.clipboardData?.getData('text/plain') || '';
        } catch (e) {
            clipboardText = '';
        }
        if (!clipboardText) {
            try {
                clipboardText = await navigator.clipboard.readText();
            } catch (err) {
                console.warn('無法讀取剪貼簿內容:', err);
                clipboardText = '';
            }
        }

        if (location.pathname === '/products') {
            // 判斷剪貼簿文字為 Email 格式，檢查前先移除空白
            const email = clipboardText.trim();
            // Email 格式正規表達式
            const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
            // 如果剪貼簿文字符合 Email 格式，則導向建立新客戶的頁面
            if (emailRegex.test(email)) {
                // <a href="/reseller/select-client/set-to-session" class="more-options-link btn btn-link thin btn-extra-large"
                // data-toggle="modal" data-backdrop="static" data-keyboard="false" data-target="#select-client-dialog"
                // title="Please Select Client">
                // <i class="fas fa-user-plus"></i>
                // select another client
                // </a>
                const selectClientElement = await waitForElement("a", { titleFilter: "Please Select Client" });
                await simulateClicking(selectClientElement);

                console.log("等待「Client selection dialog」這個 modal dialog 出現");
                await waitForElement("h4", { textFilter: "Client selection dialog" });

                // <input type="text" id="ClientSelect_client" name="ClientSelect[client]" class="search-input large-input border-radius-6px m-0 company-name-input" placeholder="Search for client ..." data-client-type="specific" autocomplete="off">

                const clientSelectInput = await waitForElement("#ClientSelect_client");
                console.log("在 #ClientSelect_client 輸入 Email", clientSelectInput);
                await simulateTyping(clientSelectInput, email);

                const clientItem = await waitForElement("li.client-row a", { textFilter: email });
                await simulateClicking(clientItem);

                const btnProceed = await waitForElement("button", { textFilter: 'Proceed With Selected' });
                await simulateClicking(btnProceed);

                const btnClose = await waitForElement("button", { ariaLabelFilter: 'Close', timeout: 50 });
                await simulateClicking(btnClose);


            } else {
                alert("剪貼簿中找不到 Email 格式，結束自動化作業！");
                return;
            }
        }

        if (location.pathname === '/myaccount/clients-list/new-client') {
            try {
                // 從第一個 { 開始讀取 JSON 字串
                const startIndex = clipboardText.indexOf('{');
                // 從最後一個 } 結束讀取 JSON 字串
                const endIndex = clipboardText.lastIndexOf('}') + 1;

                // 找不到 JSON 資料，結束貼上表單內容
                if (startIndex === -1 || endIndex === 0) {
                    // console.error("找不到 JSON 資料，結束貼上表單內容");
                    return;
                }

                // 移除前後多餘的字元
                const sanitizedText = clipboardText.substring(startIndex, endIndex);

                // 解析消毒後的 JSON 資料
                const data = JSON.parse(sanitizedText);

                // 呼叫填入表單的函式
                // 必須 await：populateForm() 是 async 函式，不 await 的話它丟出的錯誤不會被這裡的 catch 接住，
                // 只會變成未處理的 Promise rejection
                await populateForm(data);

            } catch (error) {
                console.error("無法從剪貼簿取得或解析 JSON 資料:", error);
            }
        }
    });

    // 填入表單欄位的函式
    async function populateForm(data) {
        // 填入 First name
        await simulateTyping("client_contact_firstname", data["(英文) First name"]);

        // 填入 Last name
        await simulateTyping("client_contact_lastname", data["(英文) Last name"]);

        // 填入 Email
        await simulateTyping("client_contact_email", data["訂購人 E-mail"] || data.Email);

        // 填入 Country
        await simulateSelecting("client_address_country", data["(英文) Country"]);

        // 填入 State / Region / Province
        await simulateTyping("client_address_state_state_text", 'Taiwan');

        // 填入 Address
        await simulateTyping("client_address_address", data["(英文) Address"]);

        // 填入 Address 2
        await simulateTyping("client_address_address2", data["(英文) Address 2"]);

        // 填入 City
        await simulateTyping("client_address_city", data["(英文) City"]);

        // 填入 Postal/Zip Code
        await simulateTyping("client_address_zip", data["(英文) Postal/Zip Code"]);

        // 填入 Phone number
        await simulateTyping("client_address_phone", data["(英文) Phone number"]);
    }

    // 注意：完全沒有傳入選項時，等待上限沿用舊版的 3000ms；有傳選項但沒有指定 timeout 時，
    // 改用 WAIT_FOR_ELEMENT_DEFAULT_TIMEOUT（舊版這種情況會無限等待，原因見常數宣告處的說明）
    function waitForElement(selector, { ariaRoleFilter, titleFilter, textFilter, ariaLabelFilter, timeout = WAIT_FOR_ELEMENT_DEFAULT_TIMEOUT } = { timeout: 3000 }) {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();

            const interval = setInterval(() => {
                const elements = Array.from(document.querySelectorAll(selector));
                for (let element of elements) {
                    if (ariaRoleFilter !== undefined && getAriaRole(element) !== ariaRoleFilter) continue;
                    if (titleFilter !== undefined && element.title.indexOf(titleFilter) === -1) continue;
                    if (textFilter !== undefined && element.textContent.indexOf(textFilter) === -1) continue;
                    // 不符合 aria-label 條件的元素才要跳過。舊版寫成「===」條件相反：
                    // waitForElement("button", { ariaLabelFilter: 'Close' }) 會跳過真正的 Close 按鈕，
                    // 回傳頁面上第一個「不是」Close 的按鈕，接著被 simulateClicking() 點下去，可能誤觸其他功能。
                    // 改用 getAttribute('aria-label')，不依賴較新瀏覽器才支援的 ARIA 屬性反映（element.ariaLabel）。
                    if (ariaLabelFilter !== undefined && element.getAttribute('aria-label') !== ariaLabelFilter) continue;

                    clearInterval(interval);
                    resolve(element);
                    return;
                }

                if (Date.now() - startTime > timeout) {
                    clearInterval(interval);
                    resolve(undefined);
                    console.warn('Element not found', selector);
                    // reject(new Error('Element not found'));
                }
            }, 100); // Check every 100ms
        });
    }

    async function simulateClicking(fieldId) {
        let element;

        if (fieldId instanceof HTMLElement) {
            element = fieldId;
        } else {
            element = document.getElementById(fieldId);
        }

        if (!element) return;

        element.click();
    }

    // 模擬鍵盤輸入
    async function simulateTyping(fieldId, text) {
        let element;

        if (fieldId instanceof HTMLElement) {
            element = fieldId;
        } else {
            element = document.getElementById(fieldId);
        }

        if (!element) return;

        // 剪貼簿 JSON 缺少某個欄位（例如沒有 Address 2）時值是 undefined，舊版在 text.length 丟出 TypeError，
        // 之後的欄位全部不會填入；JSON 中的數字（例如郵遞區號 10491）沒有 length，舊版會默默略過不填。
        // 因此缺值時直接略過這個欄位，其他型別一律轉成字串再輸入。
        if (text === undefined || text === null) return;
        text = String(text);

        element.focus(); // 使字段獲得焦點

        for (let i = 0; i < text.length; i++) {
            const char = text[i];

            // 模擬按下鍵盤鍵
            const keyDownEvent = new KeyboardEvent('keydown', {
                key: char,
                code: char,
                keyCode: char.charCodeAt(0),
                which: char.charCodeAt(0),
                bubbles: true,
                cancelable: true
            });

            element.dispatchEvent(keyDownEvent); // 觸發 keydown 事件

            // 模擬按下鍵後的 keypress 事件
            const keyPressEvent = new KeyboardEvent('keypress', {
                key: char,
                code: char,
                keyCode: char.charCodeAt(0),
                which: char.charCodeAt(0),
                bubbles: true,
                cancelable: true
            });

            element.dispatchEvent(keyPressEvent); // 觸發 keypress 事件

            // 更新欄位的值
            element.value += char; // 這步是關鍵，手動更新欄位的值

            // 模擬鍵抬起事件
            const keyUpEvent = new KeyboardEvent('keyup', {
                key: char,
                code: char,
                keyCode: char.charCodeAt(0),
                which: char.charCodeAt(0),
                bubbles: true,
                cancelable: true
            });

            element.dispatchEvent(keyUpEvent); // 觸發 keyup 事件

            // 觸發 input 事件，確保欄位更新
            const inputEvent = new Event('input', {
                bubbles: true,
                cancelable: true
            });
            element.dispatchEvent(inputEvent); // 觸發 input 事件

            await delay(20); // 加入一點延遲來模擬真實打字過程
        }
    }

    // 模擬選擇下拉選單 (Country)
    async function simulateSelecting(fieldId, text) {
        let element;

        if (fieldId instanceof HTMLElement) {
            element = fieldId;
        } else {
            element = document.getElementById(fieldId);
        }

        if (!element) return;

        // 沒有提供值時略過這個欄位：舊版會把 undefined 當成文字輸入到搜尋框；
        // 空字串則會直接按下 Enter，選到清單中的第一個國家，兩者都不是使用者要的結果
        if (text === undefined || text === null || text === '') return;

        element.focus(); // 使下拉選單獲得焦點

        // 取得下拉選單的 DOM，點擊開啟選單
        // 找不到時（例如網站改版）略過這個欄位，避免丟出 TypeError 而中斷後續欄位的填寫
        const selectElement = document.querySelector(`[data-id="${fieldId}"]`);
        if (!selectElement) return;
        selectElement.click();

        await delay(50);

        // 直接模擬選擇並輸入文本
        document.execCommand("insertText", false, String(text));

        await delay(50);

        // 使用 KeyboardEvent 發送 Enter 鍵來確認選擇
        const enterEvent = new KeyboardEvent('keydown', {
            key: 'Enter',
            code: 'Enter',
            keyCode: 13,
            which: 13,
            bubbles: true,
            cancelable: true
        });

        // 將事件派發到當前具有焦點的元素
        document.activeElement.dispatchEvent(enterEvent);

        await delay(50);
    }

    // 延遲函式
    async function delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // W3C Role mappings:
    // https://www.w3.org/TR/html-aam-1.0/#html-element-role-mappings
    // https://www.w3.org/TR/html-aria/
    // Current as of May 19, 2023.
    //
    // https://www.npmjs.com/package/aria-query
    // https://github.com/search?q=repo%3Amicrosoft%2Fplaywright%20getFullAXTree&type=code
    //

    function loadGetAriaRoleLibrary() {
        const selectorsAndRoles = [
            { selector: "a", role: "generic", specificity: "001" },
            { selector: "a[href]", role: "link", specificity: "011" },
            { selector: "abbr", role: null, specificity: "001" },
            { selector: "address", role: "group", specificity: "001" },
            { selector: "area", role: "generic", specificity: "001" },
            { selector: "area[href]", role: "link", specificity: "011" },
            { selector: "article", role: "article", specificity: "001" },
            { selector: "aside", role: "complementary", specificity: "001" },
            { selector: "article aside", role: "generic", specificity: "002" },
            { selector: "aside aside", role: "generic", specificity: "002" },
            { selector: "nav aside", role: "generic", specificity: "002" },
            { selector: "section aside", role: "generic", specificity: "002" },
            { selector: "audio", role: null, specificity: "001" },
            { selector: "b", role: "generic", specificity: "001" },
            { selector: "base", role: null, specificity: "001" },
            { selector: "bdi", role: "generic", specificity: "001" },
            { selector: "bdo", role: "generic", specificity: "001" },
            { selector: "blockquote", role: "blockquote", specificity: "001" },
            { selector: "body", role: "generic", specificity: "001" },
            { selector: "br", role: null, specificity: "001" },
            { selector: "button", role: "button", specificity: "001" },
            { selector: "canvas", role: null, specificity: "001" },
            { selector: "caption", role: "caption", specificity: "001" },
            { selector: "cite", role: null, specificity: "001" },
            { selector: "code", role: "code", specificity: "001" },
            { selector: "col", role: null, specificity: "001" },
            { selector: "colgroup", role: null, specificity: "001" },
            { selector: "data", role: "genric", specificity: "001" },
            { selector: "datalist", role: "listbox", specificity: "001" },
            { selector: "dd", role: "definition", specificity: "001" },
            { selector: "del", role: "deletion", specificity: "001" },
            { selector: "details", role: "group", specificity: "001" },
            { selector: "dfn", role: "generic", specificity: "001" },
            { selector: "dialog", role: "dialog", specificity: "001" },
            { selector: "div", role: "generic", specificity: "001" },
            { selector: "dl", role: null, specificity: "001" },
            { selector: "dt", role: "term", specificity: "001" },
            { selector: "em", role: "emphasis", specificity: "001" },
            { selector: "embed", role: null, specificity: "001" },
            { selector: "fieldset", role: "group", specificity: "001" },
            { selector: "figcaption", role: null, specificity: "001" },
            { selector: "figure", role: "figure", specificity: "001" },
            { selector: "footer", role: "contentinfo", specificity: "001" },
            { selector: "main footer", role: "generic", specificity: "002" },
            { selector: "article footer", role: "generic", specificity: "002" },
            { selector: "aside footer", role: "generic", specificity: "002" },
            { selector: "nav footer", role: "generic", specificity: "002" },
            { selector: "section footer", role: "generic", specificity: "002" },
            { selector: "form", role: "form", specificity: "001" },
            { selector: "h1", role: "heading", specificity: "001" },
            { selector: "h2", role: "heading", specificity: "001" },
            { selector: "h3", role: "heading", specificity: "001" },
            { selector: "h4", role: "heading", specificity: "001" },
            { selector: "h5", role: "heading", specificity: "001" },
            { selector: "h6", role: "heading", specificity: "001" },
            { selector: "head", role: null, specificity: "001" },
            { selector: "header", role: "banner", specificity: "001" },
            { selector: "main header", role: "generic", specificity: "002" },
            { selector: "article header", role: "generic", specificity: "002" },
            { selector: "aside header", role: "generic", specificity: "002" },
            { selector: "nav header", role: "generic", specificity: "002" },
            { selector: "section header", role: "generic", specificity: "002" },
            { selector: "hgroup", role: "group", specificity: "001" },
            { selector: "hr", role: "separator", specificity: "001" },
            { selector: "html", role: "document", specificity: "001" },
            { selector: "i", role: "generic", specificity: "001" },
            { selector: "iframe", role: null, specificity: "001" },
            { selector: "img", role: "img", specificity: "001" },
            { selector: "img[alt='']", role: "presentation", specificity: "002" },
            { selector: "input", role: "textbox", specificity: "001" },
            { selector: "input[type='button']", role: "button", specificity: "011" },
            { selector: "input[type='checkbox']", role: "checkbox", specificity: "011" },
            { selector: "input[type='color']", role: null, specificity: "011" },
            { selector: "input[type='date']", role: null, specificity: "011" },
            { selector: "input[type='datetime-local']", role: null, specificity: "011" },
            { selector: "input[type='email']", role: "textbox", specificity: "011" },
            { selector: "input[type='file']", role: null, specificity: "011" },
            { selector: "input[type='hidden']", role: null, specificity: "011" },
            { selector: "input[type='image']", role: "button", specificity: "011" },
            { selector: "input[type='month']", role: null, specificity: "011" },
            { selector: "input[type='number']", role: "spinbutton", specificity: "011" },
            { selector: "input[type='password']", role: null, specificity: "011" },
            { selector: "input[type='radio']", role: "radio", specificity: "011" },
            { selector: "input[type='range']", role: "slider", specificity: "011" },
            { selector: "input[type='reset']", role: "button", specificity: "011" },
            { selector: "input[type='search']", role: "search", specificity: "011" },
            { selector: "input[type='submit']", role: "button", specificity: "011" },
            { selector: "input[type='tel']", role: "textbox", specificity: "011" },
            { selector: "input[type='text']", role: "textbox", specificity: "011" },
            { selector: "input[type='time']", role: null, specificity: "011" },
            { selector: "input[type='url']", role: "textbox", specificity: "011" },
            { selector: "input[type='week']", role: null, specificity: "011" },
            { selector: "ins", role: "insertion", specificity: "001" },
            { selector: "kbd", role: null, specificity: "001" },
            { selector: "label", role: null, specificity: "001" },
            { selector: "legend", role: null, specificity: "001" },
            { selector: "li", role: "listitem", specificity: "001" },
            { selector: "link", role: null, specificity: "001" },
            { selector: "main", role: "main", specificity: "001" },
            { selector: "map", role: null, specificity: "001" },
            { selector: "mark", role: "mark", specificity: "001" },
            { selector: "math", role: "math", specificity: "001" },
            { selector: "menu", role: "list", specificity: "001" },
            { selector: "meta", role: null, specificity: "001" },
            { selector: "meter", role: "meter", specificity: "001" },
            { selector: "nav", role: "navigation", specificity: "001" },
            { selector: "noscript", role: null, specificity: "001" },
            { selector: "object", role: null, specificity: "001" },
            { selector: "ol", role: "list", specificity: "001" },
            { selector: "optgroup", role: "group", specificity: "001" },
            { selector: "option", role: "option", specificity: "001" },
            { selector: "output", role: "status", specificity: "001" },
            { selector: "p", role: "paragraph", specificity: "001" },
            { selector: "param", role: null, specificity: "001" },
            { selector: "picture", role: null, specificity: "001" },
            { selector: "pre", role: "generic", specificity: "001" },
            { selector: "progress", role: "progressbar", specificity: "001" },
            { selector: "q", role: "generic", specificity: "001" },
            { selector: "rp", role: null, specificity: "001" },
            { selector: "rt", role: null, specificity: "001" },
            { selector: "ruby", role: null, specificity: "001" },
            { selector: "s", role: "deletion", specificity: "001" },
            { selector: "samp", role: "generic", specificity: "001" },
            { selector: "script", role: null, specificity: "001" },
            { selector: "search", role: "search", specificity: "001" },
            { selector: "section", role: "generic", specificity: "001" },
            { selector: "select", role: "combobox", specificity: "001" },
            { selector: "select[size]", role: "listbox", specificity: "011" },
            { selector: "select[size='0']", role: "combobox", specificity: "011" },
            { selector: "select[size='1']", role: "combobox", specificity: "011" },
            { selector: "select[multiple]", role: "listbox", specificity: "011" },
            { selector: "slot", role: null, specificity: "001" },
            { selector: "small", role: "generic", specificity: "001" },
            { selector: "source", role: null, specificity: "001" },
            { selector: "span", role: "generic", specificity: "001" },
            { selector: "strong", role: "strong", specificity: "001" },
            { selector: "style", role: null, specificity: "001" },
            { selector: "sub", role: "subscript", specificity: "001" },
            { selector: "summary", role: null, specificity: "001" },
            { selector: "sup", role: "superscript", specificity: "001" },
            { selector: "svg", role: null, specificity: "001" },
            { selector: "table", role: "table", specificity: "001" },
            { selector: "tbody", role: "rowgroup", specificity: "001" },
            { selector: "td", role: "cell", specificity: "001" },
            { selector: "table[role='grid'] td", role: "gridcell", specificity: "011" },
            { selector: "table[role='treegrid'] td", role: "gridcell", specificity: "011" },
            { selector: "template", role: null, specificity: "001" },
            { selector: "textarea", role: "textarea", specificity: "001" },
            { selector: "tfoot", role: "rowgroup", specificity: "001" },
            { selector: "th", role: "columnheader", specificity: "001" },
            { selector: "th[scope='row']", role: "rowheader", specificity: "011" },
            { selector: "th[scope='col']", role: "columnheader", specificity: "011" },
            { selector: "thead", role: "rowgroup", specificity: "001" },
            { selector: "time", role: "time", specificity: "001" },
            { selector: "title", role: null, specificity: "001" },
            { selector: "tr", role: "row", specificity: "001" },
            { selector: "track", role: null, specificity: "001" },
            { selector: "u", role: "generic", specificity: "001" },
            { selector: "ul", role: "list", specificity: "001" },
            { selector: "var", role: null, specificity: "001" },
            { selector: "video", role: null, specificity: "001" },
            { selector: "wbr", role: null, specificity: "001" }
        ];
        // Notes:
        //   * For items with the same specificity, we put ones we want most-specific last, as in CSS.
        //       - e.g., the order of the select element selectors above matters.
        //   * img with alt="" has "img" role (not "presentation") in Chrome's computedRole. W3C disagrees.
        //   * computedRole also gives null for default td role. INTERESTING.
        //   * Some elements can have different roles with accessible names: aside, section.
        //   * Do we want a field for permitted roles? e.g., select can sometimes have have "menu" role.
        //   * Select has different roles based on the number value of its size attribute.
        //   * How do we know if a th is rowheader or columnheader without scope?
        //       - Can first-child help us guess? or JS colspan and rowspan?
        //   * Do we need to account for th elements that are not headers but are in grid tables? Weird combo!

        // This function is for dev purposes, to show which selector is being used.
        window.getWinningSelector = function (element) {
            let matchedSelector;
            for (let selectorInfo of selectorsAndRoles) {
                if (
                    element.matches(selectorInfo.selector) &&
                    (matchedSelector === undefined || selectorInfo.specificity >= matchedSelector.specificity)
                ) {
                    matchedSelector = selectorInfo;
                }
            }

            if (matchedSelector) {
                return matchedSelector.selector;
            }

            return "Indeterminate selector";
        };

        window.getImplicitRole = function (element) {
            let matchedSelector;
            for (let selectorInfo of selectorsAndRoles) {
                // If this is the first match, use it!
                // If it's a subsequent match, use it if >= specificity.
                if (
                    element.matches(selectorInfo.selector) &&
                    (matchedSelector === undefined || selectorInfo.specificity >= matchedSelector.specificity)
                ) {
                    matchedSelector = selectorInfo;
                }
            }

            if (matchedSelector) {
                return matchedSelector.role;
            }

            return "generic";
        };
        // TODO: Account for custom elements (including form-associated) being "generic"?
        // Is generic the right default? Seems that's what Chromiums computedRole does.

        window.getExplicitRole = function (element) {
            const explicitRole = element.role || element.getAttribute("role") || undefined;
            return explicitRole;
        };
        // TODO: Flag disallowed roles for elements?

        window.getAriaRole = function (element) {
            const implicitRole = getImplicitRole(element);
            const explicitRole = getExplicitRole(element);
            let ariaRole = implicitRole;
            if (explicitRole) {
                ariaRole = explicitRole;
            }
            return ariaRole;
        };
    }

    function autoRefreshPagePerMinute(minutes = 5) {

        // 1. 記錄表單的初始狀態
        const formElements = Array.from(document.querySelectorAll('form input, form select, form textarea'));
        const initialFormState = formElements.map(el => el.value);

        // 2. 監控表單變動
        let formModified = false;
        formElements.forEach(el => {
            el.addEventListener('input', () => {
                formModified = true;
            });
        });

        // 3. 監控頁面事件，檢查是否有活動
        let lastActivityTime = Date.now();
        const activityTimeout = minutes * 60 * 1000; // 5分鐘

        const resetActivityTimer = () => {
            lastActivityTime = Date.now();
        };

        // 監控使用者活動
        document.addEventListener('mousemove', resetActivityTimer);
        document.addEventListener('keydown', resetActivityTimer);
        document.addEventListener('click', resetActivityTimer);

        // 4. 設置計時器，5分鐘內沒有活動或表單未修改，則自動刷新
        const checkForInactivity = () => {
            if (!formModified && Date.now() - lastActivityTime >= activityTimeout) {
                location.reload();
            }
        };

        // 5. 每秒檢查一次
        setInterval(checkForInactivity, 1000);

    }
})();
