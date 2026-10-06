# 防止詞彙循環轉換 - 技術說明

## 問題描述

在 `termMapping` 詞庫中，存在以下情況：

```javascript
const termMapping = {
    '算法': '演算法',           // 規則 A
    '算法複雜度': '演算法複雜度', // 規則 B
    // ... 更多規則
};
```

### 潛在問題

1. **直接循環**：如果「演算法」又被某個規則轉換成其他詞，會造成循環
2. **間接影響**：規則 B 的目標值包含規則 A 的目標值「演算法」
3. **重複轉換**：當 DOM 更新時，已轉換的「演算法」可能被再次匹配

## 解決方案

> 本文件已依 1.1.0 版的實作更新。舊版使用的 `WeakSet convertedNodes`、`isConverting` 旗標與 `mayContainTerms()` 已被取代，原因見各節說明。

### 1. 在初始化時過濾無效規則

```javascript
function buildTermRegex() {
    // 過濾掉來源與目標相同的無效規則（例如 '索引': '索引'）
    const sourceTerms = Object.keys(termMapping).filter(source => termMapping[source] !== source);

    // 沒有可替換詞彙時不建立正規表達式（空的 RegExp 會匹配每個字元間隙）
    if (sourceTerms.length === 0) {
        return null;
    }

    // 由長到短排序，讓長詞優先匹配
    const pattern = sourceTerms
        .sort((a, b) => b.length - a.length)
        .map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('|');

    return new RegExp(pattern, 'g');
}
```

**關鍵點：**
- 過濾掉 `source === target` 的規則（如 `'索引': '索引'`）
- 只將有效的來源詞加入正規表達式，一次 `replace()` 處理所有詞彙
- 與 OpenCC 轉換器一起延遲建立（`ensureConverterReady()`），非白名單頁面不需要付出建立成本

### 2. 詞庫只套用在「確實由簡體轉換而來」的文字

```javascript
function convertText(text) {
    if (!converter || !text || !CJK_CHAR_REGEX.test(text)) return text;
    if (!isSimplifiedChinese(text)) return text;

    const convertedText = converter(text);

    // OpenCC 沒有改動任何字，代表其實沒有需要轉換的簡體字，詞庫也不套用
    if (convertedText === text) return text;

    // replace 只掃描一次，替換結果不會被同一次 replace 再匹配，不會產生連鎖替換
    return termRegex
        ? convertedText.replace(termRegex, match => termMapping[match])
        : convertedText;
}
```

**作用：**
- 已經是繁體的「演算法」不會通過簡體偵測，也不會被 OpenCC 改動，因此詞庫完全不會碰它
- 單次 `replace()` 保證每個位置最多替換一次

### 3. 以 WeakMap 記錄「處理後的值」

```javascript
const processedTextValues = new WeakMap();

function convertTextNode(node) {
    const text = node.nodeValue;
    // 內容和上次處理後的值相同：代表沒變過，或正是我們自己寫入的值
    if (processedTextValues.get(node) === text) return;
    if (!text || !CJK_CHAR_REGEX.test(text)) return;

    const convertedText = convertText(text);
    if (convertedText !== text) node.nodeValue = convertedText;
    processedTextValues.set(node, convertedText);
}
```

**為什麼取代 WeakSet：**
- 舊版 `WeakSet` 只要節點轉換過一次就永遠跳過；但 React、Vue 常「就地」更新同一個文字節點（例如「加载中」→「加载完成」），第二次出現的簡體字就不會被轉換
- 記錄「值」而不是「節點」：內容沒變就跳過（防止重複轉換），內容被網站改掉就重新轉換
- WeakMap 同樣會隨節點回收自動釋放，不會記憶體洩漏

### 4. 用 `takeRecords()` 丟棄自己造成的變動

```javascript
function flushPendingMutations() {
    // ... 轉換 pendingNodes 與 pendingAttributeElements

    // 丟棄「自己改寫 DOM」所產生、尚未送達的 mutation 紀錄
    observer.takeRecords();
}
```

**為什麼取代 isConverting 旗標：**
- MutationObserver 的回呼是非同步（microtask）送達的。舊版在同步轉換結束時就把 `isConverting` 設回 `false`，等自己造成的紀錄送到時旗標早已失效，每次轉換後都會再白跑一輪
- `takeRecords()` 直接清空佇列中尚未送達的紀錄；轉換過程是同步執行的，期間網頁程式碼沒有機會改動 DOM，所以清掉的只會是自己造成的紀錄

## 轉換流程圖

```
輸入文字: "这是一个算法"
    ↓
[簡體偵測 isSimplifiedChinese] → 是簡體
    ↓
[OpenCC 簡轉繁]
    ↓
"這是一個演算法"（與原文不同 → 繼續套用詞庫）
    ↓
[詞彙替換 - termRegex.replace()，單次掃描]
    ↓
寫回節點，並記錄 processedTextValues.set(textNode, "這是一個演算法")
    ↓
[自己造成的 mutation] → observer.takeRecords() 丟棄
    ↓
[之後再次走訪]
    ↓
檢查: nodeValue === 記錄值 → 跳過
    ↓
[網站把內容改成新的簡體字]
    ↓
檢查: nodeValue !== 記錄值 → 重新轉換
```

## 測試案例

### 測試 1：基本轉換
```
輸入: "算法"
預期: "演算法"
結果: ✅ 通過
```

### 測試 2：複合詞轉換
```
輸入: "算法复杂度"
預期: "演算法複雜度"
結果: ✅ 通過
```

### 測試 3：已轉換內容不變
```
輸入: "演算法" （已是轉換結果）
預期: "演算法" （不變）
結果: ✅ 通過
```

### 測試 4：連續更新不重複轉換
```
第1次: "算法" → "演算法"
第2次: "演算法" → "演算法" （不變）
第3次: "演算法" → "演算法" （不變）
結果: ✅ 通過（不會變成「演演算法」）
```

## 效能考量

1. **延遲初始化**：OpenCC 轉換器與詞庫正規表達式在第一次需要轉換時才建立
2. **WeakMap 查詢**：O(1)，內容未變的節點直接跳過
3. **同步處理新內容**：在 MutationObserver 回呼內（畫面繪製前）就完成轉換，不會先看到簡體再閃成繁體；同一個 task 內同步處理超過 20 次就改為 50ms 延後批次，避免與網頁的觀察器互相觸發而卡死
4. **attributeFilter**：只觀察白名單屬性，class、style 等高頻變動在瀏覽器端就被濾掉
5. **TreeWalker**：以原生 TreeWalker 走訪，排除區域用 `FILTER_REJECT` 整棵子樹跳過

## 相容性

腳本使用的最新 API 為 `Node.isConnected`，因此最低需求為：

- ✅ Chrome 54+
- ✅ Firefox 49+
- ✅ Edge 79+（Chromium 版）
- ✅ Safari 10+
- ❌ IE 11（不支援腳本使用的 ES2015+ 語法，例如箭頭函式與展開運算子）

Navigation API（`window.navigation`）只用於 GitHub 路由偵測的輔助，不支援的瀏覽器會自動略過。

## 測試檔案

- `test-conversion.html`：基本轉換測試
- `test-term-loop.html`：循環轉換測試（新增）

執行測試：
1. 安裝並啟用 Tampermonkey 腳本
2. 在瀏覽器中開啟測試 HTML 檔案
3. 觀察轉換結果是否符合預期
4. 打開 DevTools Console 查看詳細日誌

## 總結

透過以下四個機制的組合，解決詞彙循環轉換與重複轉換的問題：

1. ✅ **初始化過濾**：排除無效規則
2. ✅ **只對簡體來源套用詞庫**：已是繁體的內容不會被詞庫改動
3. ✅ **值追蹤**：WeakMap 記錄處理後的值，既防止重複轉換，也不會漏掉網站後續更新的內容
4. ✅ **自觸發防護**：`takeRecords()` 丟棄自己造成的 mutation 紀錄

確保使用者看到的轉換結果是穩定、正確且高效的！
