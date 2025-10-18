// ==UserScript==
// @name         簡體中文自動轉繁體中文
// @version      0.1.0
// @description  自動識別網頁中的簡體中文並轉換為繁體中文，同時將中國大陸常用詞彙轉換為台灣用語
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/SimplifiedToTraditionalChinese.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/SimplifiedToTraditionalChinese.user.js
// @author       Will Huang
// @match        *://*/*
// @run-at       document-idle
// @grant        none
// @require      https://cdn.jsdelivr.net/npm/opencc-js@1.0.5/dist/umd/full.js
// ==/UserScript==

(function () {
    'use strict';

    // 詞庫對照表 (中國大陸用語 => 台灣用語)
    const termMapping = {
        'Web 平台庫': 'Web 平台函式庫',
        'for 循環': 'for 迴圈',
        '「類」': '「類別」',
        '一些庫': '一些函式庫',
        '一個庫': '一個函式庫',
        '一個類': '一個類別',
        '並發': '平行處理',
        '事務': '交易',
        '事務性': '交易式',
        '代碼': '程式碼',
        '代碼快': '程式碼區塊',
        '代碼生成': '程式碼產生器',
        '任意類': '任意類別',
        '伸縮性': '延展性',
        '依賴包': '相依套件',
        '依賴注入': '相依性注入',
        '保留關鍵字': '保留字',
        '信息': '訊息',
        '元數據': 'Metadata',
        '克隆': '複製',
        '內存': '記憶體',
        '內置': '內建',
        '全局': '全域',
        '全平台庫列表': '全平台函式庫列表',
        '具體類擴充': '具體類別擴充',
        '兼容性': '相容性',
        '冇有': '沒有',
        '函數': '函式',
        '到賬': '到帳',
        '刷新': '重新整理',
        '創建': '建立',
        '創建一個整型': '建立一個整數型別',
        '加載': '載入',
        '動圖': '動畫',
        '包定義': '套件定義',
        '包的依賴': '套件相依性',
        '博客': '部落格',
        '原生平台庫': '原生平台函式庫',
        '原語': '原語(primitives)',
        '只讀': '唯讀',
        '可視化思想': '視覺化的點子',
        '可訪問性': '可及性',
        '命令行': '命令列',
        '回調': 'callback',
        '回調函式': '回呼函式',
        '在線': '線上',
        '均衡': '平衡',
        '塊級作用域': '區塊作用域',
        '子類': '子類別',
        '字段': '欄位',
        '字符': '字元',
        '字符串': '字串',
        '字節': '位元組',
        '字面量': '字面量（Literal）',
        '存儲': '儲存',
        '定制': '客製化',
        '定製': '客製化',
        '對象': '物件',
        '導入': '匯入',
        '導出': '匯出',
        '導航條': '導覽列',
        '就是類': '就是類別',
        '局部變量': '區域變數',
        '屏幕': '螢幕',
        '嵌套': '巢狀 (Nesting)',
        '巨石': '單體',
        '布爾值': '布林值',
        '帶寬': '頻寬',
        '幹貨': '乾貨',
        '庫概覽': '函式庫概覽',
        '开发': '開發',
        '快速起步': '快速入門',
        '惰性載入': '延遲載入',
        '應用程序': '應用程式',
        '懶加載': '延遲載入',
        '我們的程序': '我們的應用程式',
        '抽象類': '抽象類別',
        '指針': '指標',
        '接口': '介面',
        '接口和抽象類': '介面和抽象類別',
        '控件': '控制項',
        '控制台打印': '輸出到 Console',
        '插件': '外掛',
        '搜索': '搜尋',
        '操作符': '運算子',
        '擴展': '擴充',
        '擴展類（繼承）': '類別繼承',
        '支持': '支援',
        '教程': '課程',
        '數字營銷': '數位行銷',
        '數據': '資料',
        '數據結構': '資料結構',
        '數據綁定': '資料繫結',
        '數組': '陣列',
        '文檔': '文件',
        '服務器': '伺服器',
        '服務端': '伺服器端',
        '柵格': '網格',
        '柵格類': '網格類別',
        '核心庫': '核心函式庫',
        '根組件': '根元件',
        '棧追蹤': '堆疊追蹤（Stack Trace）',
        '極端要求': '嚴格要求',
        '構建': '建構',
        '構造函式': '建構函式',
        '構造塊': '構成要素',
        '標識符': '識別符號',
        '模塊': '模組',
        '模板': '樣板',
        '模組庫': '模組函式庫',
        '模組的庫': '模組的函式庫',
        '樣例': '範例',
        '法學碩士': 'LLM',
        '派生物件': '衍生物件',
        '消息': '訊息',
        '添加': '新增',
        '源碼': '原始碼',
        '演示': '示範',
        '營銷': '行銷',
        '爆髮': '爆發',
        '生產率': '生產力',
        '用例': '使用案例',
        '異常': '例外',
        '異步': '非同步',
        '的庫': '的函式庫',
        '的類都擁有': '的類別都擁有',
        '相依性插入': '相依性注入',
        '矢量': '向量',
        '示例': '範例',
        '社區': '社群',
        '秘籍': '秘笈',
        '移動': '行動',
        '組件': '元件',
        '綁定': '繫結',
        '線程': '執行緒',
        '編程': '程式設計',
        '緩存': '快取',
        '聲明': '宣告',
        '菜單': '選單',
        '視口': '畫面',
        '視圖': '檢視',
        '訪問': '存取',
        '設置': '設定',
        '語句': '陳述式',
        '調用': '呼叫',
        '調用實現類': '呼叫實現類別',
        '調試': '偵錯',
        '變量': '變數',
        '質量': '品質',
        '賬戶': '帳戶',
        '賬號': '帳號',
        '跟蹤': '追蹤',
        '軟件': '軟體',
        '這些類擁有': '這些類別擁有',
        '進程': '處理序',
        '運營': '營運',
        '運算符': '運算子',
        '運行時檢查': '執行時期檢查',
        '錄入': '輸入',
        '隊列': '佇列',
        '隱式': '隱含',
        '集成': '整合',
        '集群': '叢集',
        '面向對象': '物件導向',
        '響應頭': '回應標頭',
        '響應體': '回應內文',
        '頁標籤': '頁籤',
        '頁頭': '頁首',
        '項目': '專案',
        '項目文件夾': '專案資料夾',
        '項目的': '專案的',
        '項目目錄': '專案目錄',
        '項目設置': '專案設定',
        '預定義類': '預先定義類別',
        '類。': '類別。',
        '類型': '型別',
        '類型推斷': '型別推斷',
        '類庫': '類別庫',
        '類的': '類別的',
        '類（ Class ）': '類別（ Class ）',
        '類，函式': '類別，函式',
        '顯式地': '明確地',
        '高級用法': '進階用法',
        '高級的': '進階的',
        '默認': '預設',
        '鼠標': '滑鼠'
    };

    // 檢查元素是否應該被排除
    function isExcluded(elm) {
        if (!elm || !elm.tagName) return false;
        const tagName = elm.tagName.toUpperCase();
        if (tagName === "STYLE") return true;
        if (tagName === "SCRIPT") return true;
        if (tagName === "NOSCRIPT") return true;
        if (tagName === "IFRAME") return true;
        if (tagName === "OBJECT") return true;
        if (tagName === "CODE") return true;
        if (tagName === "PRE") return true;
        if (tagName === "TEXTAREA") return true;
        if (tagName === "INPUT") return true;
        if (tagName === "SELECT") return true;
        return false;
    }

    // 檢測文本是否主要為簡體中文
    function isSimplifiedChinese(text) {
        // 一些常見的簡體字特徵字符
        const simplifiedChars = /[国际发经现实应图书馆学无东业产]/ ;
        // 一些常見的繁體字特徵字符
        const traditionalChars = /[國際發經現實應圖書館學無東業產]/;
        
        const simplifiedCount = (text.match(simplifiedChars) || []).length;
        const traditionalCount = (text.match(traditionalChars) || []).length;
        
        // 如果簡體字明顯多於繁體字，則判定為簡體中文
        return simplifiedCount > traditionalCount && simplifiedCount > 0;
    }

    // 檢測整個頁面是否主要為簡體中文
    function isPageSimplifiedChinese() {
        let sampleText = '';
        let sampleCount = 0;
        const maxSamples = 50; // 取樣50個文字節點
        
        function collectSamples(node) {
            if (sampleCount >= maxSamples) return;
            
            if (node.nodeType === Node.TEXT_NODE) {
                const text = node.nodeValue.trim();
                if (text.length > 10) {
                    sampleText += text + ' ';
                    sampleCount++;
                }
            } else if (node.nodeType === Node.ELEMENT_NODE && !isExcluded(node)) {
                for (let i = 0; i < node.childNodes.length && sampleCount < maxSamples; i++) {
                    collectSamples(node.childNodes[i]);
                }
            }
        }
        
        collectSamples(document.body);
        return isSimplifiedChinese(sampleText);
    }

    // 轉換文本：簡體轉繁體 + 詞彙替換
    function convertText(text) {
        if (!text || text.trim() === '') return text;
        
        // 使用 OpenCC 進行簡體到繁體的轉換
        let convertedText = text;
        if (typeof OpenCC !== 'undefined') {
            const converter = OpenCC.Converter({ from: 'cn', to: 'tw' });
            convertedText = converter(text);
        }
        
        // 應用詞庫對照表進行替換
        // 按照詞語長度從長到短排序，避免短詞覆蓋長詞
        const sortedTerms = Object.keys(termMapping).sort((a, b) => b.length - a.length);
        
        for (const term of sortedTerms) {
            const replacement = termMapping[term];
            // 使用全局替換
            convertedText = convertedText.split(term).join(replacement);
        }
        
        return convertedText;
    }

    // 遍歷並轉換所有文字節點
    function traverse(elm) {
        if (elm.nodeType === Node.ELEMENT_NODE || elm.nodeType === Node.DOCUMENT_NODE) {
            if (isExcluded(elm)) return;
            for (let i = 0; i < elm.childNodes.length; i++) {
                traverse(elm.childNodes[i]);
            }
        }
        if (elm.nodeType === Node.TEXT_NODE) {
            const originalText = elm.nodeValue;
            if (originalText && originalText.trim() !== "") {
                const convertedText = convertText(originalText);
                if (convertedText !== originalText) {
                    elm.nodeValue = convertedText;
                }
            }
        }
    }

    // 主執行函數
    function init() {
        // 檢測頁面是否為簡體中文
        if (!isPageSimplifiedChinese()) {
            console.log('[簡轉繁] 此頁面不是簡體中文，跳過轉換');
            return;
        }
        
        console.log('[簡轉繁] 偵測到簡體中文，開始轉換...');
        
        // 轉換現有內容
        traverse(document.body);
        
        console.log('[簡轉繁] 轉換完成');
        
        // 監聽 DOM 變化，處理動態載入的內容
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        traverse(node);
                    });
                } else if (mutation.type === 'characterData') {
                    if (mutation.target.nodeType === Node.TEXT_NODE) {
                        const originalText = mutation.target.nodeValue;
                        if (originalText && originalText.trim() !== "") {
                            const convertedText = convertText(originalText);
                            if (convertedText !== originalText) {
                                mutation.target.nodeValue = convertedText;
                            }
                        }
                    }
                }
            });
        });
        
        // 設定監聽整個文件內容的變化
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });
    }

    // 等待 OpenCC 庫載入完成後再執行
    if (typeof OpenCC !== 'undefined') {
        init();
    } else {
        // 如果 OpenCC 尚未載入，等待一下
        let retryCount = 0;
        const maxRetries = 20;
        const checkInterval = setInterval(() => {
            retryCount++;
            if (typeof OpenCC !== 'undefined') {
                clearInterval(checkInterval);
                init();
            } else if (retryCount >= maxRetries) {
                clearInterval(checkInterval);
                console.error('[簡轉繁] OpenCC 庫載入失敗');
            }
        }, 100);
    }

})();
