# Copilot 協作指引

- 輸出中文字時，請用全形的「逗號」。
- 提交訊息請遵循 `<type>(<scope>): <說明>` 格式。

## 提交訊息格式

1. `type` 採用語意化前綴，例如 `feat`、`fix`、`new`，全部使用小寫。
2. `scope` 以實際受影響的模組或腳本名稱命名，例如 `GitHubCodingAgentFirewallSwitch`。
3. `說明` 使用一句中文敘述，必要時包含版本號更新內容，並保持與 `scope` 之間以半形冒號分隔。
4. 整體訊息維持單行長度，避免額外段落，若需補充細節請改寫成精簡敘述。

## 最近五筆提交紀錄

- f15b76a feat(GitHubCodingAgentFirewallSwitch): 防火牆圖示導向設定頁，更新版本至 0.1.3
- c8ff89a fix(GitHubCodingAgentFirewallSwitch): 修正防火牆快取使用 localStorage 為 GM_* 方法，更新版本至 0.1.2
- 1c29903 feat(GitHubCodingAgentFirewallSwitch): 新增 GitHub 防火牆狀態快取機制，更新版本至 0.1.1
- 9331c96 new(GitHubCodingAgentFirewallSwitch): 新增 GitHub Copilot 防火牆切換控制元件
- 0970d97 fix(SimplifiedToTraditionalChinese): 修正簡繁轉換中的錯誤並更新版本號至 0.6.7
