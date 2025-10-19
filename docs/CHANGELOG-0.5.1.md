# 版本 0.5.2 更新說明

## 修正問題

### 1. 防止轉換結果被再次轉換
- 修正詞彙重複轉換的問題，例如「算法」→「演算法」→「演演算法」
- 確保 `termMapping` 中的目標值（轉換後的台灣用語）不會被當作來源值再次轉換

### 2. 改進詞彙過濾機制
- 在初始化時過濾掉「來源值 === 目標值」的無效規則
- 防止循環轉換的發生

---

# 版本 0.5.1 更新說明

## 修正問題

修正詞彙重複轉換的問題，例如「算法」→「演算法」→「演演算法」

## 技術改進

### 1. 使用 WeakSet 追蹤已轉換節點

- 新增 `convertedNodes` WeakSet 來追蹤已經轉換過的文字節點
- 避免同一個節點被重複轉換
- WeakSet 的特性確保不會造成記憶體洩漏

### 2. 移除零寬空格佔位符機制

**舊方法的問題：**
```javascript
// 舊的做法使用零寬空格 (\u200B) 作為佔位符
const PLACEHOLDER_PREFIX = '\u200B';
const placeholder = `${PLACEHOLDER_PREFIX}${index}${PLACEHOLDER_PREFIX}`;
```

這會導致使用者複製文字時，複製到不可見的零寬空格字元。

**新方法：**
```javascript
// 直接進行詞彙替換，不使用佔位符
convertedText = convertedText.replace(termRegex, (match) => {
    const replacement = termMapping[match];
    return (replacement && replacement !== match) ? replacement : match;
});
```

簡化了替換邏輯，確保使用者複製的文字是乾淨的。

### 3. 改進 MutationObserver 邏輯

新增 `isConverting` 旗標：
- 在轉換過程中設定為 `true`
- 避免自己觸發的 DOM 變化被重複處理
- 轉換完成後重置為 `false`

### 4. 智慧型節點追蹤

- 文字節點首次轉換時加入 `convertedNodes`
- 再次遇到相同節點時跳過轉換
- 當 `characterData` 變化時（表示外部更新），不刪除標記，而是在處理時檢查

## 測試方法

已建立測試檔案 `test-conversion.html`，包含以下測試案例：

1. **單次更新測試**：驗證「算法」正確轉換為「演算法」
2. **多次更新測試**：連續更新 3 次，確保不會變成「演演算法」
3. **動態內容測試**：新增的內容也能正確轉換

## 使用方式

使用者無需進行任何操作，腳本會自動：
- 偵測並轉換頁面中的簡體中文
- 將「算法」等詞彙轉換為「演算法」
- 即使頁面動態更新，也不會重複轉換
- 確保複製的文字是乾淨的，不含不可見字元

## 效能最佳化

- 使用 WeakSet 進行 O(1) 查詢，效能優異
- 防抖機制避免頻繁觸發
- `isConverting` 旗標減少不必要的處理
- 快速檢查機制 (`mayContainTerms`) 避免不必要的正則運算

## 相容性

- 支援所有現代瀏覽器（Chrome、Firefox、Edge、Safari）
- 支援 SPA 類型網站（Vue、React、Angular）
- 使用 WeakSet，IE 不支援（但 Tampermonkey 主要在現代瀏覽器使用）
