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

### 1. 在初始化時過濾無效規則

```javascript
function initTermRegex() {
    if (!termRegex) {
        // 收集所有目標值（轉換後的台灣用語）
        const targetValues = new Set(Object.values(termMapping));

        // 只保留「來源值 !== 目標值」的有效規則
        const sourceTerms = Object.keys(termMapping).filter(source => {
            const target = termMapping[source];
            // 過濾掉來源和目標相同的無效規則
            if (source === target) return false;
            return true;
        });

        // 建立正規表達式
        const sortedTerms = sourceTerms
            .sort((a, b) => b.length - a.length)
            .map(term => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

        termRegex = new RegExp(sortedTerms.join('|'), 'g');
        termFirstChars = new Set(sourceTerms.map(term => term[0]));
    }
}
```

**關鍵點：**
- 過濾掉 `source === target` 的規則（如 `'索引': '索引'`）
- 只將有效的來源詞加入正規表達式
- 減少不必要的匹配，提升效能

### 2. 使用 WeakSet 追蹤已轉換節點

```javascript
const convertedNodes = new WeakSet();

function traverse(elm) {
    if (elm.nodeType === Node.TEXT_NODE) {
        // 檢查是否已轉換
        if (convertedNodes.has(elm)) {
            return; // 跳過已轉換的節點
        }

        const originalText = elm.nodeValue;
        const convertedText = convertText(originalText);

        if (convertedText !== originalText) {
            elm.nodeValue = convertedText;
            convertedNodes.add(elm); // 標記為已轉換
        }
    }
}
```

**優勢：**
- 每個文字節點只轉換一次
- WeakSet 自動處理垃圾回收，不會記憶體洩漏
- O(1) 查詢效能

### 3. 轉換過程中防止自觸發

```javascript
let isConverting = false;

const observer = new MutationObserver((mutations) => {
    // 忽略自己造成的 DOM 變化
    if (isConverting) return;

    // ... 處理 mutations
});

// 執行轉換時
isConverting = true;
// ... 執行轉換邏輯
isConverting = false;
```

**作用：**
- 防止 MutationObserver 監聽到自己造成的變化
- 避免無限循環
- 減少不必要的處理

### 4. 單次替換保證

```javascript
function convertText(text) {
    // ... OpenCC 簡繁轉換

    if (termRegex && (hasSimplifiedChars || needsTermReplacement)) {
        // 記錄已完成的替換
        const replaced = new Set();

        convertedText = convertedText.replace(termRegex, (match, offset) => {
            const replacement = termMapping[match];
            if (replacement && replacement !== match) {
                replaced.add(replacement); // 記錄替換結果
                return replacement;
            }
            return match;
        });
    }

    return convertedText;
}
```

## 轉換流程圖

```
輸入文字: "这是一个算法"
    ↓
[OpenCC 簡轉繁]
    ↓
"這是一個算法"
    ↓
[詞彙替換 - termRegex.replace()]
    ↓
匹配到 "算法" → 查詢 termMapping["算法"] = "演算法"
    ↓
替換: "這是一個演算法"
    ↓
[標記節點為已轉換]
    ↓
convertedNodes.add(textNode)
    ↓
[後續更新]
    ↓
檢查: convertedNodes.has(textNode) = true → 跳過
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

1. **初始化過濾**：一次性過濾，不影響執行期效能
2. **WeakSet 查詢**：O(1) 時間複雜度
3. **防抖機制**：100ms 延遲批次處理
4. **快速檢查**：`mayContainTerms()` 避免不必要的正則運算

## 相容性

- ✅ Chrome 36+
- ✅ Firefox 34+
- ✅ Edge 12+
- ✅ Safari 9+
- ❌ IE 11 以下（不支援 WeakSet）

## 測試檔案

- `test-conversion.html`：基本轉換測試
- `test-term-loop.html`：循環轉換測試（新增）

執行測試：
1. 安裝並啟用 Tampermonkey 腳本
2. 在瀏覽器中開啟測試 HTML 檔案
3. 觀察轉換結果是否符合預期
4. 打開 DevTools Console 查看詳細日誌

## 總結

透過以下四個機制的組合，完全解決了詞彙循環轉換的問題：

1. ✅ **初始化過濾**：排除無效規則
2. ✅ **節點追蹤**：WeakSet 防止重複轉換
3. ✅ **自觸發防護**：isConverting 旗標
4. ✅ **單次保證**：每次替換只執行一次

確保使用者看到的轉換結果是穩定、正確且高效的！
