// ==UserScript==
// @name         多奇中文簡繁轉換大師
// @version      0.5.3
// @description  自動識別網頁中的簡體中文並轉換為繁體中文，同時將中國大陸常用詞彙轉換為台灣用語(包含頁面標題、元素屬性值)，支援 SPA 類型網站
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
        '惰性加载': '延遲載入',
        '引用變數': '參考變數',
        '變量': '變數',
        'Web 平台庫': 'Web 平台函式庫',
        'for 循環': 'for 迴圈',
        'while 循環': 'while 迴圈',
        '「類」': '「類別」',
        '視頻': '影片',
        '音頻': '音訊',
        '一些庫': '一些函式庫',
        '一個庫': '一個函式庫',
        '一個類': '一個類別',
        '並發': '平行處理',
        '事務': '交易',
        '事務性': '交易式',
        '代碼': '程式碼',
        '代碼快': '程式碼區塊',
        '代碼段': '程式碼片段',
        '代碼生成': '程式碼產生器',
        '代碼審查': '程式碼審查',
        '代碼庫': '程式碼庫',
        '代碼重構': '程式碼重構',
        '任意類': '任意類別',
        '伸縮性': '延展性',
        '依賴包': '相依套件',
        '依賴注入': '相依性注入',
        '依賴項': '相依性',
        '保留關鍵字': '保留字',
        '信息': '訊息',
        '元數據': 'Metadata',
        '克隆': '複製',
        '內存': '記憶體',
        '內存洩漏': '記憶體洩漏',
        '內置': '內建',
        '全局': '全域',
        '全局變量': '全域變數',
        '全平台庫列表': '全平台函式庫列表',
        '具體類擴充': '具體類別擴充',
        '兼容性': '相容性',
        '冇有': '沒有',
        '函數': '函式',
        '函數式編程': '函數式程式設計',
        '到賬': '到帳',
        '刷新': '重新整理',
        '創建': '建立',
        '創建一個整型': '建立一個整數型別',
        '加載': '載入',
        '動圖': '動畫',
        '包定義': '套件定義',
        '包的依賴': '套件相依性',
        '包管理器': '套件管理器',
        '博客': '部落格',
        '原生平台庫': '原生平台函式庫',
        '原語': '原語(primitives)',
        '只讀': '唯讀',
        '可擴展性': '可擴充性',
        '可視化': '視覺化',
        '可視化思想': '視覺化的點子',
        '可訪問性': '可及性',
        '命令行': '命令列',
        '命令行工具': '命令列工具',
        '回調': 'callback',
        '回調函式': '回呼函式',
        '在線': '線上',
        '在線文檔': '線上文件',
        '均衡': '平衡',
        '塊級作用域': '區塊作用域',
        '多線程': '多執行緒',
        '子類': '子類別',
        '字段': '欄位',
        '字符': '字元',
        '字符串': '字串',
        '字符編碼': '字元編碼',
        '編碼': '寫程式',
        '字節': '位元組',
        '字節碼': '位元組碼',
        '字面量': '字面量（Literal）',
        '存儲': '儲存',
        '存儲過程': '預存程序',
        '定制': '客製化',
        '定製': '客製化',
        '實例化': '實體化',
        '對象': '物件',
        '對象導向': '物件導向',
        '導入': '匯入',
        '導出': '匯出',
        '導航': '導覽',
        '導航條': '導覽列',
        '就是類': '就是類別',
        '局部變量': '區域變數',
        '屏幕': '螢幕',
        '屏蔽': '遮罩',
        '嵌套': '巢狀 (Nesting)',
        '工具鏈': '工具鏈',
        '巨石': '單體',
        '布爾值': '布林值',
        '布爾型': '布林型別',
        '帶寬': '頻寬',
        '幹貨': '乾貨',
        '庫概覽': '函式庫概覽',
        '应用程序': '應用程式',
        '开发': '開發',
        '开发者': '開發者',
        '开发環境': '開發環境',
        '快捷鍵': '快速鍵',
        '快速起步': '快速入門',
        '性能': '效能',
        '性能優化': '效能最佳化',
        '性能測試': '效能測試',
        '惰性載入': '延遲載入',
        '應用程序': '應用程式',
        '應用程序接口': '應用程式介面',
        '懶加載': '延遲載入',
        '我們的程序': '我們的應用程式',
        '打包': '封裝',
        '打包工具': '封裝工具',
        '批處理': '批次處理',
        '技術棧': '技術堆疊',
        '抽象類': '抽象類別',
        '指針': '指標',
        '接口': '介面',
        '接口和抽象類': '介面和抽象類別',
        '控件': '控制項',
        '控制台': '主控台',
        '控制台打印': '輸出到 Console',
        '插件': '外掛',
        '插件開發': '外掛開發',
        '搜索': '搜尋',
        '搜索引擎': '搜尋引擎',
        '操作符': '運算子',
        '擴展': '擴充',
        '擴展類（繼承）': '類別繼承',
        '支持': '支援',
        '教程': '課程',
        '數字': '數位',
        '數字營銷': '數位行銷',
        '數據': '資料',
        '數據庫': '資料庫',
        '數據結構': '資料結構',
        '數據綁定': '資料繫結',
        '數據類型': '資料型別',
        '數組': '陣列',
        '文檔': '文件',
        '文檔注釋': '文件註解',
        '文件夾': '資料夾',
        '斷點': '中斷點',
        '斷言': '判斷提示',
        '日誌': '記錄',
        '時間戳': '時間戳記',
        '映射': '對應',
        '智能': '智慧',
        '最佳實踐': '最佳做法',
        '服務器': '伺服器',
        '服務器端': '伺服器端',
        '服務端': '伺服器端',
        '框架': '框架',
        '柵格': '網格',
        '柵格類': '網格類別',
        '核心庫': '核心函式庫',
        '根組件': '根元件',
        '棧追蹤': '堆疊追蹤（Stack Trace）',
        '極端要求': '嚴格要求',
        '構建': '建構',
        '構建工具': '建構工具',
        '構造函式': '建構函式',
        '構造塊': '構成要素',
        '標識符': '識別符號',
        '標籤': '標記',
        '模塊': '模組',
        '模塊化': '模組化',
        '模板': '樣板',
        '模板引擎': '樣板引擎',
        '模組庫': '模組函式庫',
        '模組的庫': '模組的函式庫',
        '樣例': '範例',
        '權限': '權限',
        '法學碩士': 'LLM',
        '派生物件': '衍生物件',
        '流程': '流程',
        '流程圖': '流程圖',
        '測試': '測試',
        '測試用例': '測試案例',
        '測試覆蓋率': '測試覆蓋率',
        '消息': '訊息',
        '消息隊列': '訊息佇列',
        '添加': '新增',
        '源代碼': '原始碼',
        '源碼': '原始碼',
        '演示': '示範',
        '演示程序': '展示程式',
        '激活': '啟動',
        '營銷': '行銷',
        '爆髮': '爆發',
        '版本控制': '版本控制',
        '生產率': '生產力',
        '生產環境': '正式環境',
        '用例': '使用案例',
        '用戶': '使用者',
        '用戶界面': '使用者介面',
        '異常': '例外',
        '異常處理': '例外處理',
        '異步': '非同步',
        '異步編程': '非同步程式設計',
        '的庫': '的函式庫',
        '的類都擁有': '的類別都擁有',
        '監聽': '監聽',
        '監聽器': '監聽器',
        '相依性插入': '相依性注入',
        '矢量': '向量',
        '矢量圖': '向量圖',
        '知識庫': '知識庫',
        '碼農': '程式設計師',
        '示例': '範例',
        '社區': '社群',
        '秘籍': '秘笈',
        '移動': '行動',
        '移動端': '行動裝置端',
        '移動應用': '行動應用程式',
        '程序': '程式',
        '程序員': '程式設計師',
        '算法': '演算法',
        '算法複雜度': '演算法複雜度',
        '類加載器': '類別載入器',
        '索引': '索引',
        '組件': '元件',
        '組件化': '元件化',
        '綁定': '繫結',
        '控制檯': '控制台',
        '網絡': '網路',
        '網絡請求': '網路請求',
        '編譯': '編譯',
        '編譯器': '編譯器',
        '編程': '程式設計',
        '編程語言': '程式語言',
        '緩存': '快取',
        '緩存策略': '快取策略',
        '聲明': '宣告',
        '聲明式': '宣告式',
        '脚本': '指令碼',
        '自定義': '自訂',
        '菜單': '選單',
        '虛擬化': '虛擬化',
        '虛擬機': '虛擬機器',
        '視口': '畫面',
        '視圖': '檢視',
        '視圖層': '檢視層',
        '規範': '規範',
        '觸發': '觸發',
        '解析': '解析',
        '解析器': '解析器',
        '計算機': '電腦',
        '計算屬性': '計算屬性',
        '訪問': '存取',
        '訪問修飾符': '存取修飾符',
        '訪問權限': '存取權限',
        '設置': '設定',
        '設計模式': '設計模式',
        '語句': '陳述式',
        '語法': '語法',
        '語法糖': '語法糖',
        '調用': '呼叫',
        '調用堆棧': '呼叫堆疊',
        '調用實現類': '呼叫實現類別',
        '調度': '排程',
        '調試': '偵錯',
        '調試器': '偵錯工具',
        '調試工具': '偵錯工具',
        '負載均衡': '負載平衡',
        '賬戶': '帳戶',
        '賬號': '帳號',
        '超鏈接': '超連結',
        '跟蹤': '追蹤',
        '跨域': '跨網域',
        '路由': '路由',
        '路由器': '路由器',
        '軟件': '軟體',
        '軟件包': '軟體套件',
        '軟件開發': '軟體開發',
        '軟件工程': '軟體工程',
        '輸入': '輸入',
        '輸出': '輸出',
        '運行': '執行',
        '運行時': '執行時期',
        '運行時環境': '執行環境',
        '運行時檢查': '執行時期檢查',
        '這些類擁有': '這些類別擁有',
        '進程': '處理序',
        '進程間通信': '處理序間通訊',
        '連接': '連線',
        '連接池': '連線集區',
        '遍歷': '遍歷',
        '適配器': '配接器',
        '配置': '組態',
        '配置文件': '組態檔',
        '重載': '多載',
        '鏈接': '連結',
        '鏈式調用': '鏈式呼叫',
        '隊列': '佇列',
        '隱式': '隱含',
        '隱式轉換': '隱含轉換',
        '集合': '集合',
        '集成': '整合',
        '集成開發環境': '整合開發環境',
        '集群': '叢集',
        '雲計算': '雲端運算',
        '雲端': '雲端',
        '靜態': '靜態',
        '靜態方法': '靜態方法',
        '面向對象': '物件導向',
        '面向對象編程': '物件導向程式設計',
        '響應': '回應',
        '響應式': '回應式',
        '響應式編程': '回應式程式設計',
        '響應頭': '回應標頭',
        '響應體': '回應內文',
        '頁標籤': '頁籤',
        '頁頭': '頁首',
        '項目': '專案',
        '項目文件夾': '專案資料夾',
        '項目的': '專案的',
        '項目目錄': '專案目錄',
        '項目管理': '專案管理',
        '項目設置': '專案設定',
        '預定義類': '預先定義類別',
        '類。': '類別。',
        '類加載': '類別載入',
        '類型': '型別',
        '類型推斷': '型別推斷',
        '類型檢查': '型別檢查',
        '類型系統': '型別系統',
        '類型轉換': '型別轉換',
        '類庫': '類別庫',
        '類的': '類別的',
        '類（ Class ）': '類別（ Class ）',
        '顯式': '明確',
        '顯式地': '明確地',
        '顯式聲明': '明確宣告',
        '高級': '進階',
        '高級用法': '進階用法',
        '高級的': '進階的',
        '高級特性': '進階特性',
        '默認': '預設',
        '默認值': '預設值',
        '默認參數': '預設參數',
        '鼠標': '滑鼠',
        '鼠標事件': '滑鼠事件'
    };

    // 不轉換的選擇器清單
    const excludedSelectors = [
        'div#gemini-qna-overlay'
    ];

    // 檢查元素是否應該被排除
    function isExcluded(elm) {
        if (!elm || !elm.tagName) return false;

        // 檢查是否匹配排除的選擇器
        if (elm.nodeType === Node.ELEMENT_NODE) {
            for (const selector of excludedSelectors) {
                try {
                    if (elm.matches(selector)) {
                        return true;
                    }
                } catch (e) {
                    // 忽略無效的選擇器
                    console.warn(`[簡轉繁] 無效的選擇器: ${selector}`, e);
                }
            }
        }

        const tagName = elm.tagName.toUpperCase();
        if (tagName === "STYLE") return true;
        if (tagName === "SCRIPT") return true;
        if (tagName === "NOSCRIPT") return true;
        if (tagName === "IFRAME") return true;
        if (tagName === "OBJECT") return true;
        if (tagName === "CODE") return true;
        // if (tagName === "PRE") return true;
        if (tagName === "TEXTAREA") return true;
        if (tagName === "INPUT") return true;
        if (tagName === "SELECT") return true;
        return false;
    }

    // // 檢測文本是否主要為簡體中文
    // function isSimplifiedChinese(text) {
    //     // 一些常見的簡體字特徵字符
    //     const simplifiedChars = /[码并变东报边们么门马风发对动当点电带达单体题头条统来两乐难连个国过关观开会后还话经进间将机见几记结计旧紧气区强亲学现选许写这种着张长场车产处传时说实数书声师设术认让总资从样业应义养银为问无万于与员运爱儿办备标笔满妈飞费负丰复饭导读断队听图团态谈农脑论类离联领历罗泪该规够广课华欢号还护觉节较举级军极据际积济讲净请轻确线兴习响续系显转战质装专争只众制称创视书识树试双热则参虽岁议阳艺亚游医烟务湾温远约语园帮宝补邮卖妇待独担灯党弹讨铁龙练丽劳陆楼绿录兰礼脸乱构馆干顾刚干贵挂况块获换怀划剧尽绝继静简渐脚坚击仅惊权须乡戏协险终证织职钟针庄陈厂谁势适伤属顺术胜软责错采财词赛伞欧优叶营严压药亿维闻围网鱼云愿预余扑朴]/g;
    //     // 一些常見的繁體字特徵字符
    //     const traditionalChars = /[碼並變東報邊們麼門馬風發對動當點電帶達單體題頭條統來兩樂難連個國過關觀開會後還話經進間將機見幾記結計舊緊氣區強親學現選許寫這種著張長場車產處傳時說實數書聲師設術認讓總資從樣業應義養銀為問無萬於與員運愛兒辦備標筆滿媽飛費負豐復飯導讀斷隊聽圖團態談農腦論類離聯領歷羅淚該規夠廣課華歡號還護覺節較舉級軍極據際積濟講淨請輕確線興習響續係顯轉戰質裝專爭隻眾製稱創視書識樹試雙熱則參雖歲議陽藝亞遊醫煙務灣溫遠約語園幫寶補郵賣婦待獨擔燈黨彈討鐵龍練麗勞陸樓綠錄蘭禮臉亂構館幹顧剛乾貴掛況塊獲換懷劃劇盡絕繼靜簡漸腳堅擊僅驚權須鄉戲協險終證織職鐘針莊陳廠誰勢適傷屬順術勝軟責錯採財詞賽傘歐優葉營嚴壓藥億維聞圍網魚雲願預餘撲樸]/g;

    //     const simplifiedCount = (text.match(simplifiedChars) || []).length;
    //     const traditionalCount = (text.match(traditionalChars) || []).length;

    //     // 如果簡體字明顯多於繁體字，則判定為簡體中文
    //     return simplifiedCount > traditionalCount && simplifiedCount > 0;
    // }

    // // 檢測整個頁面是否主要為簡體中文
    // function isPageSimplifiedChinese() {
    //     let sampleText = '';
    //     let sampleCount = 0;
    //     const maxSamples = 50; // 取樣50個文字節點

    //     function collectSamples(node) {
    //         if (sampleCount >= maxSamples) return;

    //         if (node.nodeType === Node.TEXT_NODE) {
    //             const text = node.nodeValue.trim();
    //             if (text.length > 10) {
    //                 sampleText += text + ' ';
    //                 sampleCount++;
    //             }
    //         } else if (node.nodeType === Node.ELEMENT_NODE && !isExcluded(node)) {
    //             for (let i = 0; i < node.childNodes.length && sampleCount < maxSamples; i++) {
    //                 collectSamples(node.childNodes[i]);
    //             }
    //         }
    //     }

    //     collectSamples(document.body);
    //     return isSimplifiedChinese(sampleText);
    // }

    // 建立 OpenCC 轉換器實例（只建立一次）
    let converter = null;

    // 建立正規表達式（只建立一次）
    let termRegex = null;
    // 用於快速檢查的首字集合
    let termFirstChars = null;

    // 使用 WeakSet 來追蹤已轉換的節點（避免重複轉換）
    const convertedNodes = new WeakSet();

    function initConverter() {
        if (typeof OpenCC !== 'undefined' && !converter) {
            converter = OpenCC.Converter({ from: 'cn', to: 'tw' });
        }
    }

    function initTermRegex() {
        if (!termRegex) {
            // 收集所有目標值（轉換後的台灣用語），這些不應該被再次轉換
            const targetValues = new Set(Object.values(termMapping));

            // 只保留那些「來源值 !== 目標值」且「來源值不是其他規則的目標值」的規則
            const sourceTerms = Object.keys(termMapping).filter(source => {
                const target = termMapping[source];
                // 如果來源和目標相同，不需要轉換
                if (source === target) return false;
                // 如果這個來源詞也是某個規則的目標值，可能會造成循環，需要謹慎處理
                // 但為了保持功能完整，我們還是保留它
                return true;
            });

            // 按照詞語長度從長到短排序，避免短詞覆蓋長詞
            const sortedTerms = sourceTerms
                .sort((a, b) => b.length - a.length)
                .map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')); // 轉義特殊字元

            // 建立一個大的正規表達式，一次匹配所有詞彙
            termRegex = new RegExp(sortedTerms.join('|'), 'g');

            // 建立首字集合，用於快速檢查
            termFirstChars = new Set(sourceTerms.map(term => term[0]));
        }
    }

    // 快速檢查文字是否可能包含需要替換的詞彙
    function mayContainTerms(text) {
        if (!termFirstChars) return false;
        for (let i = 0; i < text.length; i++) {
            if (termFirstChars.has(text[i])) {
                return true;
            }
        }
        return false;
    }

        // 檢測文字是否包含中文字元
    function hasChinese(text) {
        return /[\u4e00-\u9fa5]/.test(text);
    }

    // 轉換文本:簡體轉繁體 + 詞彙替換
    function convertText(text) {
        if (!text || text.trim() === '') return text;

        // 如果文字中沒有中文字元，直接返回，避免不必要的轉換
        if (!hasChinese(text)) return text;

        // 使用 OpenCC 進行簡體到繁體的轉換
        let convertedText = text;
        if (converter) {
            convertedText = converter(text);
        }

        // 即使簡繁轉換後文字相同，仍需檢查是否有詞彙需要替換
        // 但先用快速檢查避免不必要的正則表達式執行
        const needsTermReplacement = (convertedText === text) && mayContainTerms(text);
        const hasSimplifiedChars = convertedText !== text;

        // 如果既沒有簡體字，也不可能包含需要替換的詞彙，直接返回
        if (!hasSimplifiedChars && !needsTermReplacement) return text;

        // 使用正規表達式進行詞彙替換，只替換簡體->繁體轉換後的詞彙（避免重複替換）
        if (termRegex && (hasSimplifiedChars || needsTermReplacement)) {
            // 記錄已經完成的替換，避免對替換結果再次進行替換
            const replaced = new Set();

            convertedText = convertedText.replace(termRegex, (match, offset) => {
                const replacement = termMapping[match];
                // 只在替換值與原值不同時才替換
                if (replacement && replacement !== match) {
                    // 記錄這次替換的結果
                    replaced.add(replacement);
                    return replacement;
                }
                return match;
            });
        }

        return convertedText;
    }

    // 定義需要排除的屬性清單（核心屬性和 JS 常用屬性）
    const excludedAttributes = new Set([
        'id', 'class', 'style', 'href', 'src', 'action', 'method',
        'type', 'name', 'value', 'for', 'rel', 'charset', 'content',
        'http-equiv', 'property', 'itemtype', 'itemprop', 'itemscope',
        'xmlns', 'role', 'aria-label', 'aria-labelledby', 'aria-describedby',
        'tabindex', 'contenteditable', 'draggable', 'spellcheck',
        'autocomplete', 'autocorrect', 'autocapitalize',
        'inputmode', 'pattern', 'accept', 'accept-charset',
        'enctype', 'formaction', 'formenctype', 'formmethod',
        'target', 'download', 'ping', 'referrerpolicy',
        'crossorigin', 'integrity', 'async', 'defer',
        'loading', 'decoding', 'fetchpriority'
    ]);

    // 轉換元素的屬性值
    function convertAttributes(element) {
        if (!element.attributes) return;

        for (let i = 0; i < element.attributes.length; i++) {
            const attr = element.attributes[i];
            const attrName = attr.name.toLowerCase();

            // 排除核心屬性和 JS 常用屬性
            if (excludedAttributes.has(attrName)) continue;

            // 排除以特定前綴開頭的屬性（但保留 data-* 屬性）
            if (attrName.startsWith('on')) continue; // 事件處理器
            if (attrName.startsWith('v-')) continue; // Vue 指令
            if (attrName.startsWith(':')) continue; // Vue 簡寫
            if (attrName.startsWith('@')) continue; // Vue 事件簡寫
            if (attrName.startsWith('ng-')) continue; // Angular 指令
            if (attrName.startsWith('*ng')) continue; // Angular 結構指令
            if (attrName.startsWith('[')) continue; // Angular 屬性綁定
            if (attrName.startsWith('(')) continue; // Angular 事件綁定
            if (attrName.startsWith('bind')) continue; // 綁定相關
            if (attrName.startsWith('x-')) continue; // Alpine.js 指令

            // 轉換屬性值
            const originalValue = attr.value;
            if (originalValue && originalValue.trim() !== "") {
                const convertedValue = convertText(originalValue);
                if (convertedValue !== originalValue) {
                    element.setAttribute(attr.name, convertedValue);
                }
            }
        }
    }

    // 遍歷並轉換所有文字節點和屬性
    function traverse(elm) {
        // 處理文字節點
        if (elm.nodeType === Node.TEXT_NODE) {
            // 檢查此文字節點是否已經被轉換過
            if (convertedNodes.has(elm)) {
                return;
            }

            const originalText = elm.nodeValue;
            if (originalText && originalText.trim() !== "") {
                const convertedText = convertText(originalText);
                if (convertedText !== originalText) {
                    elm.nodeValue = convertedText;
                    // 標記此節點已被轉換
                    convertedNodes.add(elm);
                }
            }
            return;
        }

        // 處理元素節點和文件節點
        if (elm.nodeType === Node.ELEMENT_NODE || elm.nodeType === Node.DOCUMENT_NODE) {
            if (isExcluded(elm)) return;

            // 如果是元素節點，轉換其屬性
            if (elm.nodeType === Node.ELEMENT_NODE) {
                convertAttributes(elm);
            }

            // 遞迴處理所有子節點
            for (let i = 0; i < elm.childNodes.length; i++) {
                traverse(elm.childNodes[i]);
            }
        }
    }

    // 主執行函數
    function init() {
        console.log('[簡轉繁] 腳本已啟動，開始監聽頁面變化...');

        // 初始化轉換器和正規表達式
        initConverter();
        initTermRegex();

        // 轉換頁面標題
        if (document.title) {
            const convertedTitle = convertText(document.title);
            if (convertedTitle !== document.title) {
                document.title = convertedTitle;
            }
        }

        // 轉換現有內容
        traverse(document.body);

        // 使用防抖技術減少 MutationObserver 的執行頻率
        let debounceTimer = null;
        const pendingNodes = new Set();

        // 用於追蹤正在轉換的節點，避免自己觸發的變化被重複處理
        let isConverting = false;

        const observer = new MutationObserver((mutations) => {
            // 如果正在轉換中，忽略這些變化（這些是我們自己造成的）
            if (isConverting) return;

            mutations.forEach((mutation) => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach((node) => {
                        pendingNodes.add(node);
                    });
                } else if (mutation.type === 'characterData') {
                    if (mutation.target.nodeType === Node.TEXT_NODE) {
                        // 只有在內容真的改變時才處理
                        // 注意：不需要刪除 convertedNodes 中的標記，因為我們會檢查原始內容
                        pendingNodes.add(mutation.target);
                    }
                } else if (mutation.type === 'attributes') {
                    // 監聽屬性變化
                    const attrName = mutation.attributeName.toLowerCase();
                    if (!excludedAttributes.has(attrName) &&
                        !attrName.startsWith('on') &&
                        !attrName.startsWith('v-') &&
                        !attrName.startsWith(':') &&
                        !attrName.startsWith('@') &&
                        !attrName.startsWith('ng-') &&
                        !attrName.startsWith('*ng') &&
                        !attrName.startsWith('[') &&
                        !attrName.startsWith('(') &&
                        !attrName.startsWith('bind') &&
                        !attrName.startsWith('x-')) {
                        pendingNodes.add(mutation.target);
                    }
                }
            });

            // 防抖：延遲執行，避免頻繁觸發
            clearTimeout(debounceTimer);
            debounceTimer = setTimeout(() => {
                // 設定轉換標記，避免自己觸發的變化被重複處理
                isConverting = true;

                pendingNodes.forEach((node) => {
                    if (node.nodeType === Node.TEXT_NODE) {
                        // 檢查此文字節點是否已經被轉換過
                        if (convertedNodes.has(node)) {
                            return;
                        }

                        const originalText = node.nodeValue;
                        if (originalText && originalText.trim() !== "") {
                            const convertedText = convertText(originalText);
                            if (convertedText !== originalText) {
                                node.nodeValue = convertedText;
                                // 標記此節點已被轉換
                                convertedNodes.add(node);
                            }
                        }
                    } else if (node.nodeType === Node.ELEMENT_NODE) {
                        // 如果是元素節點，也要轉換屬性
                        convertAttributes(node);
                        traverse(node);
                    } else {
                        traverse(node);
                    }
                });
                pendingNodes.clear();

                // 重置轉換標記
                isConverting = false;
            }, 100); // 100ms 的防抖延遲
        });

        // 設定監聽整個文件內容的變化（包含屬性變化）
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true,
            attributes: true,
            attributeOldValue: false
        });

        // ===== 支援 SPA 頁面 =====

        // 監聽 URL 變化 (用於 SPA 路由切換)
        let lastUrl = location.href;

        // 封裝轉換邏輯為函式,便於重複呼叫
        function convertPage() {
            // 轉換頁面標題
            if (document.title) {
                const convertedTitle = convertText(document.title);
                if (convertedTitle !== document.title) {
                    document.title = convertedTitle;
                }
            }

            // 轉換頁面內容
            traverse(document.body);
        }        // 監聽 pushState 和 replaceState
        const originalPushState = history.pushState;
        const originalReplaceState = history.replaceState;

        history.pushState = function(...args) {
            originalPushState.apply(this, args);
            if (lastUrl !== location.href) {
                lastUrl = location.href;
                // 延遲轉換,等待新內容載入
                setTimeout(convertPage, 300);
            }
        };

        history.replaceState = function(...args) {
            originalReplaceState.apply(this, args);
            if (lastUrl !== location.href) {
                lastUrl = location.href;
                setTimeout(convertPage, 300);
            }
        };

        // 監聽 popstate 事件 (瀏覽器前進/後退按鈕)
        window.addEventListener('popstate', () => {
            if (lastUrl !== location.href) {
                lastUrl = location.href;
                setTimeout(convertPage, 300);
            }
        });

        // 監聽 hashchange 事件 (用於 hash 路由)
        window.addEventListener('hashchange', () => {
            setTimeout(convertPage, 300);
        });

        // 監聽標題變化
        const titleObserver = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'childList' && document.title) {
                    const convertedTitle = convertText(document.title);
                    if (convertedTitle !== document.title) {
                        // 暫時停止監聽，避免無限循環
                        titleObserver.disconnect();
                        document.title = convertedTitle;
                        // 重新開始監聽
                        titleObserver.observe(document.querySelector('title'), {
                            childList: true,
                            characterData: true,
                            subtree: true
                        });
                    }
                }
            });
        });

        // 如果有 title 元素，監聽它的變化
        const titleElement = document.querySelector('title');
        if (titleElement) {
            titleObserver.observe(titleElement, {
                childList: true,
                characterData: true,
                subtree: true
            });
        }
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
