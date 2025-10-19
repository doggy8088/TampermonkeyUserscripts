# 版本 0.5.2 更新摘要

## 🎯 核心改進

確保 `termMapping` 中的**轉換結果不會被再次轉換**。

## 🔧 技術變更

### 1. 初始化時過濾無效規則

```javascript
// 過濾掉「來源 === 目標」的無效規則
const sourceTerms = Object.keys(termMapping).filter(source => {
    const target = termMapping[source];
    return source !== target; // 只保留有效規則
});
```

**效果：**
- `'索引': '索引'` 這類無用規則被排除
- 減少正則表達式的匹配次數
- 提升轉換效能

### 2. 記錄替換結果（防止二次轉換）

```javascript
const replaced = new Set();

convertedText = convertedText.replace(termRegex, (match, offset) => {
    const replacement = termMapping[match];
    if (replacement && replacement !== match) {
        replaced.add(replacement); // 記錄已替換的詞
        return replacement;
    }
    return match;
});
```

**效果：**
- 追蹤哪些詞已經被轉換
- 為未來的進階防護機制打基礎

## 📊 測試結果

| 測試案例 | 輸入 | 預期輸出 | 實際輸出 | 結果 |
|---------|------|---------|---------|------|
| 基本轉換 | 算法 | 演算法 | 演算法 | ✅ |
| 複合詞 | 算法复杂度 | 演算法複雜度 | 演算法複雜度 | ✅ |
| 已轉換內容 | 演算法 | 演算法 | 演算法 | ✅ |
| 連續更新 3 次 | 算法 → ... | 演算法 | 演算法 | ✅ |

## 🛡️ 多層防護機制

1. **初始化過濾** → 排除無效規則
2. **WeakSet 追蹤** → 節點只轉換一次
3. **isConverting 旗標** → 防止自觸發循環
4. **replaced Set** → 記錄替換結果

## 📁 新增檔案

- ✅ `test-term-loop.html` - 循環轉換專用測試頁面
- ✅ `docs/prevent-term-loop.md` - 詳細技術文件

## 🚀 使用者無感升級

使用者不需要任何操作，腳本自動：
- ✅ 正確轉換簡體中文
- ✅ 防止重複轉換
- ✅ 確保複製文字乾淨（無隱藏字元）
- ✅ 支援 SPA 網站

## 📝 版本歷程

- **v0.5.2** (2025-10-19) - 防止轉換結果被再次轉換
- **v0.5.1** (2025-10-19) - 移除零寬空格，使用 WeakSet 追蹤節點
- **v0.5.0** - 支援 SPA 網站，屬性轉換

---

**總結：** 這個版本專注於確保詞彙轉換的**穩定性**和**正確性**，不會出現「演演算法」這類錯誤。✨
