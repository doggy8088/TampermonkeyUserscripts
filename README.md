# TampermonkeyUserscripts

這裡整理了 [Will 保哥](https://www.facebook.com/will.fans/) 多年來撰寫的 [Tampermonkey](https://www.tampermonkey.net/) 使用者腳本 (Userscript)，我只要覺得常用的網站做的有點難用，就會自己寫寫小工具來改善特定網站的 UI/UX 問題，提升平時的工作效率。

> 本頁短網址: [tm.miniasp.com](https://tm.miniasp.com)

## 使用方式

1. 先依據不同瀏覽器安裝好 Tampermonkey 擴充套件！

    <table border="0">
    <tr>
      <td>
        <a href="https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo"><img src="https://user-images.githubusercontent.com/88981/220149382-8ffa83d5-8561-4dc9-929f-96cde2f6ed43.png" alt="Chrome"></a>
      </td>
      <td>
        <a href="https://microsoftedge.microsoft.com/addons/detail/tampermonkey/iikmkjmpaadaobahmlepeloendndfphd?hl=zh-TW"><img src="https://user-images.githubusercontent.com/88981/220149387-9e173b2c-b5f1-40bf-bdaf-c2f0d2bb5a6d.png" alt="Edge"></a>
      </td>
    </tr>
    <tr>
      <td align="center">
        Google Chrome
      </td>
      <td align="center">
        Microsoft Edge
      </td>
    </tr>
    <tr>
      <td>
        <a href="https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/"><img src="https://user-images.githubusercontent.com/88981/220149390-50010c13-e3c8-4dc9-a120-e267fbcc1e73.png" alt="Firefox"></a>
      </td>
      <td>
        <a href="https://apps.apple.com/us/app/tampermonkey/id1482490089"><img src="https://user-images.githubusercontent.com/88981/220149393-374714eb-0d9e-4fe3-88d0-8195382cfe42.png" alt="Safari"></a>
      </td>
    </tr>
    <tr>
      <td align="center">
        Mozilla Firefox
      </td>
      <td align="center">
        Apple Safari
      </td>
    </tr>
    </table>

2. 點擊以下 **使用者腳本 (Userscript)** 的**安裝圖示**即可啟動 Tampermonkey 擴充套件頁面，按下 **Install** 即可自動安裝完畢！

    ![Tampermonkey Userscript installation](https://user-images.githubusercontent.com/88981/125022420-3baca180-e0af-11eb-9d37-7abad8bf96fa.jpg)

## 使用者腳本 (Userscript)

<table>
  <thead>
    <tr>
      <th nowrap>安裝</th>
      <th width="420">腳本名稱</th>
      <th nowrap>用途簡介</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>
        <a href="https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/CozeShortcuts.user.js"><img src="https://user-images.githubusercontent.com/88981/169986095-a54f32bd-55a6-4de8-bad6-aa3b1874ce07.png" width="32"/></a>
      </td>
      <td><a href="https://www.coze.com/">Coze</a>: 提供額外的快速鍵方便使用</td>
      <td>
        目前提供以下快速鍵：<br>
        <ol>
          <li>按下 <code>h</code> 可開啟 Home 頁面</li>
          <li>按下 <code>p</code> 可開啟 Personal 頁面</li>
          <li>按下 <code>s</code> 可開啟 Manage Subscription 頁面</li>
          <li>按下 <code>t</code> 可切換不同的 Teams 項目，按下 Enter 就可以進入頁面</li>
          <li>按下 <code>alt+p</code> 可開啟 My profile 頁面</li>
          <li>按下 <code>alt+1</code> 可在 Space 頁面切換上面的頁籤: Bots</li>
          <li>按下 <code>alt+2</code> 可在 Space 頁面切換上面的頁籤: Plugins</li>
          <li>按下 <code>alt+3</code> 可在 Space 頁面切換上面的頁籤: Workflows</li>
          <li>按下 <code>alt+4</code> 可在 Space 頁面切換上面的頁籤: Knowledge</li>
          <li>按下 <code>alt+5</code> 可在 Space 頁面切換上面的頁籤: Cards</li>
        </ol>
      </td>
    </tr>
    <tr>
      <td>
        <a href="https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/FeloSearchAutoFill.user.js"><img src="https://user-images.githubusercontent.com/88981/169986095-a54f32bd-55a6-4de8-bad6-aa3b1874ce07.png" width="32"/></a>
      </td>
      <td><a href="https://felo.ai/">Felo Search</a>: 自動填入提示文字並自動送出</td>
      <td>
        自動填入 Felo Search 提示文字並可設定自動送出提問
      </td>
    </tr>
    <tr>
      <td>
        <a href="https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ClaudeFixChinesePunctuationMarks.user.js"><img src="https://user-images.githubusercontent.com/88981/169986095-a54f32bd-55a6-4de8-bad6-aa3b1874ce07.png" width="32"/></a>
      </td>
      <td><a href="https://claude.ai/">Claude</a>: 自動校正 Claude AI 聊天介面上的標點符號</td>
      <td>
        自動校正 Claude AI 聊天介面上的標點符號，還有替中英文之間加上空格，讓閱讀更順暢。
      </td>
    </tr>
    <tr>
      <td>
        <a href="https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/CtrlCCtrlCCopyURL.user.js"><img src="https://user-images.githubusercontent.com/88981/169986095-a54f32bd-55a6-4de8-bad6-aa3b1874ce07.png" width="32"/></a>
      </td>
      <td>按下多次 Ctrl-C 就會自動複製網址</td>
      <td>
        目前支援兩個網站：<br>
        <ol>
          <li><code>learn.microsoft.com</code>: 按下 <code>Ctrl-C</code> 兩次以上就會自動將查詢字串中的 <code>view</code> 參數移除，確保複製的網址可以連到最新版。</li>
          <li><code>github.com</code>: 按下兩次 <code>Ctrl-C</code> 會自動複製當前 Repo 網址，按下三次 <code>Ctrl-C</code> 會複製包含 <code>git clone REPO_URL</code> 命令。如果在 <code>特定分支</code> 頁面中按三次，會自動取出該分支的內容。如果在 <code>pull requests</code> 頁面中按三次，會自動取出該 PR 回來。</li>
        </ol>
      </td>
    </tr>
    <tr>
      <td>
        <a href="https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/GeminiTranslationT2EContextMenu.user.js"><img src="https://user-images.githubusercontent.com/88981/169986095-a54f32bd-55a6-4de8-bad6-aa3b1874ce07.png" width="32"/></a>
      </td>
      <td><a href="https://gemini.google.com/">Gemini</a>: 翻譯選取文字的內容 (中翻英)</td>
      <td>
        自動將當前頁面的選取範圍送到 Gemini 進行翻譯 (中翻英)
      </td>
    </tr>
    <tr>
      <td>
        <a href="https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/GeminiTranslationE2TContextMenu.user.js"><img src="https://user-images.githubusercontent.com/88981/169986095-a54f32bd-55a6-4de8-bad6-aa3b1874ce07.png" width="32"/></a>
      </td>
      <td><a href="https://gemini.google.com/">Gemini</a>: 翻譯選取文字的內容 (英翻中)</td>
      <td>
        自動將當前頁面的選取範圍送到 Gemini 進行翻譯 (英翻中)
      </td>
    </tr>
    <tr>
      <td>
        <a href="https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/GeminiSummarizeSelectionContextMenu.user.js"><img src="https://user-images.githubusercontent.com/88981/169986095-a54f32bd-55a6-4de8-bad6-aa3b1874ce07.png" width="32"/></a>
      </td>
      <td><a href="https://gemini.google.com/">Gemini</a>: 總結選取文字的內容</td>
      <td>
        自動將當前頁面的選取範圍送到 Gemini 進行總結
      </td>
    </tr>
    <tr>
      <td>
        <a href="https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/SelectionToMarkdownContextMenu.user.js"><img src="https://user-images.githubusercontent.com/88981/169986095-a54f32bd-55a6-4de8-bad6-aa3b1874ce07.png" width="32"/></a>
      </td>
      <td>將網頁內容轉成 Markdown 格式並寫入剪貼簿</td>
      <td>
        在網頁選取文字範圍後，使用者按下滑鼠右鍵，就可以將選取範圍的 HTML 轉成 Markdown 格式並寫入剪貼簿
      </td>
    </tr>
    <tr>
      <td>
        <a href="https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/GoogleAiStudioLightTheme.user.js"><img src="https://user-images.githubusercontent.com/88981/169986095-a54f32bd-55a6-4de8-bad6-aa3b1874ce07.png" width="32"/></a>
      </td>
      <td><a href="https://aistudio.google.com/">Google AI Studio</a>: Light Theme</td>
      <td>
        強迫讓 Google AI Studio 使用淺色主題，方便簡報時使用
      </td>
    </tr>
    <tr>
      <td>
        <a href="https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/GitHubDarkModeSwitcher.user.js"><img src="https://user-images.githubusercontent.com/88981/169986095-a54f32bd-55a6-4de8-bad6-aa3b1874ce07.png" width="32"/></a>
      </td>
      <td><a href="https://github.com/">GitHub</a>: 佈景主題切換器</td>
      <td>
        按下 alt+s 快速鍵就會自動切換目前網頁的 Dark/Light 模式，網頁右上角 Actions 按鈕列也會多一顆切換按鈕
      </td>
    </tr>
    <tr>
      <td>
        <a href="https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/SinoBankMMASignIn.user.js"><img src="https://user-images.githubusercontent.com/88981/169986095-a54f32bd-55a6-4de8-bad6-aa3b1874ce07.png" width="32"/></a>
      </td>
      <td><a href="https://mma.sinopac.com" target="_blank">SinoBank</a>: 永豐銀行 MMA 登入啟用密碼管理器機制</td>
      <td>
        讓<a href="https://mma.sinopac.com/MemberPortal/Member/NextWebLogin.aspx">永豐銀行 MMA 金融交易網</a>登入時可以讓現有的密碼管理器正常運作，如 LastPass, 1Password, Dashlane, Bitwarden, etc.
      </td>
    </tr>
    <tr>
      <td>
        <a href="https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ChatGPTDoubleClickEdit.user.js"><img src="https://user-images.githubusercontent.com/88981/169986095-a54f32bd-55a6-4de8-bad6-aa3b1874ce07.png" width="32"/></a>
      </td>
      <td><a href="https://chatgpt.com/" target="_blank">ChatGPT</a>: 滑鼠雙擊編輯提示文字</td>
      <td>
        滑鼠雙擊先前已經輸入的提示就可直接編輯
      </td>
    </tr>
    <tr>
      <td>
        <a href="https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ChatGPTOpenLinks.user.js"><img src="https://user-images.githubusercontent.com/88981/169986095-a54f32bd-55a6-4de8-bad6-aa3b1874ce07.png" width="32"/></a>
      </td>
      <td><a href="https://chatgpt.com/" target="_blank">ChatGPT</a>: 開啟常用參考連結</td>
      <td>
        開啟常用的 ChatGPT 參考連結
      </td>
    </tr>
    <tr>
      <td>
        <a href="https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ChatGPTTranslationT2E.user.js"><img src="https://user-images.githubusercontent.com/88981/169986095-a54f32bd-55a6-4de8-bad6-aa3b1874ce07.png" width="32"/></a>
      </td>
      <td><a href="https://chatgpt.com/" target="_blank">ChatGPT</a>: 翻譯選取文字的內容 (中翻英)</td>
      <td>
        自動將當前頁面的選取範圍送到 ChatGPT 進行翻譯 (中翻英)
      </td>
    </tr>
    <tr>
      <td>
        <a href="https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ChatGPTTranslationE2T.user.js"><img src="https://user-images.githubusercontent.com/88981/169986095-a54f32bd-55a6-4de8-bad6-aa3b1874ce07.png" width="32"/></a>
      </td>
      <td><a href="https://chatgpt.com/" target="_blank">ChatGPT</a>: 翻譯選取文字的內容 (英翻中)</td>
      <td>
        自動將當前頁面的選取範圍送到 ChatGPT 進行翻譯 (英翻中)
      </td>
    </tr>
    <tr>
      <td>
        <a href="https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ChatGPTCommonPrompts.user.js"><img src="https://user-images.githubusercontent.com/88981/169986095-a54f32bd-55a6-4de8-bad6-aa3b1874ce07.png" width="32"/></a>
      </td>
      <td><a href="https://chatgpt.com/" target="_blank">ChatGPT</a>: 在回應結果的地方加入常見提示回應按鈕</td>
      <td>
        點擊按鈕就會自動填入 ChatGPT 提示文字輸入框並自動送出提問
      </td>
    </tr>
    <tr>
      <td>
        <a href="https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ChatGPTTokenizerCalculator.user.js"><img src="https://user-images.githubusercontent.com/88981/169986095-a54f32bd-55a6-4de8-bad6-aa3b1874ce07.png" width="32"/></a>
      </td>
      <td><a href="https://chatgpt.com/" target="_blank">ChatGPT</a>: 自動統計網頁中選取的文字範圍的 Token 數量</td>
      <td>
        自動統計網頁中選取的文字範圍的 Token 數量 使用 (OpenAI GPT-3 的 <a href="https://platform.openai.com/tokenizer">Tokenizer</a> 規則)
      </td>
    </tr>
    <tr>
      <td>
        <a href="https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ChatGPTSummaryPage.user.js"><img src="https://user-images.githubusercontent.com/88981/169986095-a54f32bd-55a6-4de8-bad6-aa3b1874ce07.png" width="32"/></a>
      </td>
      <td><a href="https://chatgpt.com/" target="_blank">ChatGPT</a>: 自動總結網頁中的文章內容 (&lt;article&gt;)</td>
      <td>
        自動將當前頁面的選取範圍或預設文章內容送到 <a href="https://chat.openai.com/chat">ChatGPT</a> 進行總結 (頁面中第一個 &lt;article&gt; 標籤)
      </td>
    </tr>
    <tr>
      <td>
        <a href="https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ChatGPTAutoFill.user.js"><img src="https://user-images.githubusercontent.com/88981/169986095-a54f32bd-55a6-4de8-bad6-aa3b1874ce07.png" width="32"/></a>
      </td>
      <td><a href="https://chatgpt.com/" target="_blank">ChatGPT</a>: 自動填入提示文字並自動送出</td>
      <td>
        自動填入 <a href="https://chat.openai.com/chat">ChatGPT</a> 提示文字並可設定自動送出提問
      </td>
    </tr>
    <tr>
      <td>
        <a href="https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ChatGPTVoiceInput.user.js"><img src="https://user-images.githubusercontent.com/88981/169986095-a54f32bd-55a6-4de8-bad6-aa3b1874ce07.png" width="32"/></a>
      </td>
      <td><a href="https://chatgpt.com/" target="_blank">ChatGPT</a>: 語音輸入與語音合成功能 (支援中/英/日/韓語言)</td>
      <td>
        讓你可以透過語音輸入要問 <a href="https://chat.openai.com/chat">ChatGPT</a> 的問題並支援語音合成功能 (支援中文、英文、日文、韓文)
      </td>
    </tr>
    <tr>
      <td>
      </td>
      <td colspan="2">
        支援功能:
        <ol>
          <li>支援語音識別輸入功能並在輸入框右邊增加麥克風圖示<br>
              可以在麥克風圖示上按<strong>滑鼠右鍵</strong>選擇不同地區的語言進行語音辨識(中/英/日/韓)
          </li>
          <li>支援語音合成朗讀功能並在輸入框右邊增加喇叭圖示<br>
              可以在喇叭圖示上按<strong>滑鼠右鍵</strong>選擇不同國家的聲音來源<br>
              可以將 ChatGPT 的回應自動透過瀏覽器播放成語音輸出<br>
              當每一個段落完成回應時，就會開始朗讀文字內容，支援中文與英文
          </li>
          <li>按下 <code>alt+s</code> 可啟動/停止語音辨識 (Mac: <code>command+option+s</code>)</li>
          <li>按下 <code>alt+m</code> 可啟動/停止朗讀功能 (Mac: <code>command+option+m</code>)</li>
          <li>按下 <code>alt+t</code> 可立即停止語音辨識與語音合成功能 (Mac: <code>command+option+t</code>)</li>
          <li>按下 <code>alt+r</code> 可重設語音辨識狀態 (Mac: <code>command+option+r</code>)</li>
          <li>按下 <code>Escape</code> 可重設語音辨識狀態</li>
          <li>影片教學: <a href="https://www.youtube.com/watch?v=DgFwtRj4jkU">Part 1</a> (Outdated), <a href="https://www.youtube.com/watch?v=bMsh_Vw9SNc">Part 2</a> (Outdated)</li>
          <li>支援多種語音命令：
            <ol>
              <li>送出: 可自動送出查詢</li>
              <li>清除: 可清除輸入框中的文字</li>
              <li>刪除: 可刪除最近一次的語音輸入</li>
              <li>換行: 可插入換行字元</li>
              <li>重置: 可重置語言狀態、語音輸入內容等</li>
              <li>貼上: 可自動貼上「剪貼簿」內容到提問輸入框</li>
              <li>解釋以下程式碼: 可自動貼上「剪貼簿」內容到提問輸入框</li>
              <li>重新整理: 可重新整理網頁</li>
              <li>切換至英文模式: 可切換至使用英文進行語音辨識</li>
              <li>切換至日文模式: 可切換至使用日文進行語音辨識</li>
              <li>切換至韓文模式: 可切換至使用韓文進行語音辨識</li>
              <li>切換至中文模式: 可按下 Escape 或 Alt+R 回覆預設中文模式</li>
              <li>關閉語音辨識: 可關閉語音辨識功能</li>
            </ol>
          </li>
        </ol>
      </td>
    </tr>
    <tr>
      <td>
        <a href="https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/TrackingTokenStripper.user.js"><img src="https://user-images.githubusercontent.com/88981/169986095-a54f32bd-55a6-4de8-bad6-aa3b1874ce07.png" width="32"/></a>
      </td>
      <td>網站追蹤碼移除工具</td>
      <td>移除大多數網站附加在超連結上的 Query String 追蹤碼</td>
    </tr>
    <tr>
      <td>
        <a href="https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/LanguageSwitcher.user.js"><img src="https://user-images.githubusercontent.com/88981/169986095-a54f32bd-55a6-4de8-bad6-aa3b1874ce07.png" width="32"/></a>
      </td>
      <td>中、英文網頁切換器</td>
      <td>
        按下
        <code>alt+s</code>
        快速鍵就會自動將目前網頁切換至<strong>中文版</strong>或<strong
          >英文版</strong
        >
      </td>
    </tr>
    <tr>
      <td>
        <a href="https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/AvoidClosingTab.user.js"><img src="https://user-images.githubusercontent.com/88981/169986095-a54f32bd-55a6-4de8-bad6-aa3b1874ce07.png" width="32"/></a>
      </td>
      <td>防止避免意外關閉頁籤</td>
      <td>避免特定網站會被意外使用 <code>ctrl-w</code> 關閉頁籤</td>
    </tr>
    <tr>
      <td>
        <a href="https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/AzureDevOpsDarkModeSwitcher.user.js"><img src="https://user-images.githubusercontent.com/88981/169986095-a54f32bd-55a6-4de8-bad6-aa3b1874ce07.png" width="32"/></a>
      </td>
      <td><a href="https://dev.azure.com/" target="_blank">Azure DevOps</a>: 佈景主題切換器</td>
      <td>按下 <code>alt+s</code> 快速鍵就會自動切換目前網頁的 Dark/Light 模式</td>
    </tr>
    <tr>
      <td>
        <a href="https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/AzureDevOpsWikiTocFullDisplay.user.js"><img src="https://user-images.githubusercontent.com/88981/169986095-a54f32bd-55a6-4de8-bad6-aa3b1874ce07.png" width="32"/></a>
      </td>
      <td><a href="https://dev.azure.com/" target="_blank">Azure DevOps</a>: 調整 Wiki 文件的 TOC 標題寬度</td>
      <td>讓 Azure Wikis 的 TOC 標題可以完整顯示</td>
    </tr>
    <tr>
      <td>
        <a href="https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/AzurePortalRemoveEllipsis.user.js"><img src="https://user-images.githubusercontent.com/88981/169986095-a54f32bd-55a6-4de8-bad6-aa3b1874ce07.png" width="32"/></a>
      </td>
      <td><a href="https://portal.azure.com/" target="_blank">Azure Portal</a>: 移除所有會出現 ... 的樣式</td>
      <td>移除在 Azure Portal 之中所有會出現 ... 的樣式，尤其是看帳單的時候不要顯示有 ... 的數字</td>
    </tr>
    <tr>
      <td>
        <a href="https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/AzureDevOpsHotkeys.user.js"><img src="https://user-images.githubusercontent.com/88981/169986095-a54f32bd-55a6-4de8-bad6-aa3b1874ce07.png" width="32"/></a>
      </td>
      <td><a href="https://dev.azure.com/" target="_blank">Azure DevOps</a>: 優化快速鍵操作</td>
      <td>讓 Azure DevOps Services 的快速鍵操作貼近 Visual Studio Code 與 Vim 操作</td>
    </tr>
    <tr>
      <td>
      </td>
      <td colspan="2">
        <p>特色</p>
        <ul>
          <li>可快速切換側邊欄顯示或隱藏</li>
          <li>在 Wikis 頁面增加 vim 風格的光棒移動，可用 <code>j</code>, <code>k</code> 移動左側光棒並按下 Enter 開啟頁面</li>
        </ul>
        <p>全站快速鍵</p>
        <ol>
          <li><code>Alt+1~3</code>: 切換頁籤</li>
          <li><code>j</code>: 任何列表項目向下移動選取項目 (按下 Enter 可進入)</li>
          <li><code>k</code>: 任何列表項目向上移動選取項目 (按下 Enter 可進入)</li>
        </ol>
        <p>首頁快速鍵</p>
        <ol>
          <li><code>1 ~ 4</code>: 快速進入首頁的前三張卡片</li>
          <li><code>j</code>: 向下移動專案清單項目 (按下 Enter 可進入)</li>
          <li><code>k</code>: 向上移動專案清單項目 (按下 Enter 可進入)</li>
          <li><code>h</code>: 向左移動選取專案清單的左右連結 (按下 Enter 可進入)</li>
          <li><code>l</code>: 向右左移動選取專案清單的左右連結 (按下 Enter 可進入)</li>
          <li><code>f</code>: 移動游標至 Filter projects (按下 Escape 可離開)</li>
          <li><code>s</code>: 移動游標至 Search (搜尋整個組織) (按下 Escape 可離開)</li>
        </ol>
        <p>專案所有頁面快速鍵</p>
        <ol>
          <li><code>Ctrl+B</code>: 切換側邊欄顯示/隱藏</li>
          <li><code>go</code>: 快速跳轉到 Overview &gt; Summary 頁面</li>
          <li><code>gw</code>: 快速跳轉到 Overview &gt; Wiki 頁面</li>
          <li><code>gd</code>: 快速跳轉到 Overview &gt; Dashboards 頁面</li>
          <li><code>gl</code>: 快速跳轉到 Boards &gt; Backlogs 頁面</li>
          <li><code>gs</code>: 快速跳轉到 Boards &gt; Sprints 頁面</li>
          <li><code>gb</code>: 快速跳轉到 Pipelines &gt; Builds 頁面</li>
          <li><code>gr</code>: 快速跳轉到 Pipelines &gt; Releases 頁面</li>
        </ol>
        <p>Overview &gt; Wiki 快速鍵</p>
        <ol>
          <li><code>j</code>: 向下移動左側選取項目 (按下 Enter 可進入)</li>
          <li><code>k</code>: 向上移動左側選取項目 (按下 Enter 可進入)</li>
          <li><code>f</code>: 移動游標至 Filter pages by title 欄位 (按下 Enter 可回到 j, k 移動模式) (按下 Escape 可離開)</li>
          <li><code>Space</code>: 向下捲動 Wiki 文章</li>
          <li><code>Shift+Space</code>: 向上捲動 Wiki 文章</li>
        </ol>
        <p>Repos &gt; Pull requests 快速鍵</p>
        <ol>
          <li><code>c</code>: 當有出現 Create a pull request 按鈕時，按下 c 就會自動點擊該按鈕</li>
        </ol>
      </td>
    </tr>
    <tr>
      <td>
        <a href="https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/AzureDevOpsEnableKeyboardShortcuts.user.js"><img src="https://user-images.githubusercontent.com/88981/169986095-a54f32bd-55a6-4de8-bad6-aa3b1874ce07.png" width="32"/></a>
      </td>
      <td><a href="https://dev.azure.com/" target="_blank">Azure DevOps</a>: 啟用鍵盤快速鍵</td>
      <td>讓 Azure DevOps Service 的鍵盤快速鍵一直都可以使用</td>
    </tr>
    <tr>
      <td>
        <a href="https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/AzureDevOpsPageTitleModifier.user.js"><img src="https://user-images.githubusercontent.com/88981/169986095-a54f32bd-55a6-4de8-bad6-aa3b1874ce07.png" width="32"/></a>
      </td>
      <td><a href="https://dev.azure.com/" target="_blank">Azure DevOps</a>: 調整工作項目頁面標題</td>
      <td>讓 Azure Boards 的 Work Item 顯示的「頁面標題」更加具有意義</td>
    </tr>
    <tr>
      <td>
        <a href="https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/AzureDevOpsPipelinesLogEnlarger.user.js"><img src="https://user-images.githubusercontent.com/88981/169986095-a54f32bd-55a6-4de8-bad6-aa3b1874ce07.png" width="32"/></a>
      </td>
      <td><a href="https://dev.azure.com/" target="_blank">Azure DevOps</a>: 調整 Pipeline Log 的顯示寬度</td>
      <td>
        在 Azure Pipelines 的 Logs
        可透過鍵盤(<code>+</code>/<code>-</code>)放大/縮小左欄寬度
      </td>
    </tr>
    <tr>
      <td>
        <a href="https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/AzureDevOpsPipelinesScreenRecordingPlayer.user.js"><img src="https://user-images.githubusercontent.com/88981/169986095-a54f32bd-55a6-4de8-bad6-aa3b1874ce07.png" width="32"/></a>
      </td>
      <td><a href="https://dev.azure.com/" target="_blank">Azure DevOps</a>: 調整工作項目直接播放螢幕錄影影片</td>
      <td>
        將 Azure Boards 的 Work Item 可直接播放
        <code>Screen recording</code> 影片
      </td>
    </tr>
    <tr>
      <td>
        <a href="https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/FBFixWarnLink.user.js"><img src="https://user-images.githubusercontent.com/88981/169986095-a54f32bd-55a6-4de8-bad6-aa3b1874ce07.png" width="32"/></a>
      </td>
      <td>Facebook: FixWarnLink</td>
      <td>讓 Facebook 點擊「外部連結」時可以不用去點擊確認按鈕</td>
    </tr>
    <tr>
      <td>
        <a href="https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/FBPunycodeConverter.user.js"><img src="https://user-images.githubusercontent.com/88981/169986095-a54f32bd-55a6-4de8-bad6-aa3b1874ce07.png" width="32"/></a>
      </td>
      <td>Facebook: PunycodeConverter</td>
      <td>
        將 Facebook 貼文上所有 <a href="https://en.wikipedia.org/wiki/Punycode">Punycode</a> 轉為正常的 Unicode 文字
      </td>
    </tr>
    <tr>
      <td>
        <a href="https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/FBRemoveShop.user.js"><img src="https://user-images.githubusercontent.com/88981/169986095-a54f32bd-55a6-4de8-bad6-aa3b1874ce07.png" width="32"/></a>
      </td>
      <td>Facebook: 移除「商店」按鈕</td>
      <td>
        移除 FB 畫面上方的「商店」頁籤（上面全部都是色情廣告）
      </td>
    </tr>
    <tr>
      <td>
        <a href="https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/MSFormsShowLongerOption.user.js"><img src="https://user-images.githubusercontent.com/88981/169986095-a54f32bd-55a6-4de8-bad6-aa3b1874ce07.png" width="32"/></a>
      </td>
      <td>Microsoft Forms: 調整回應頁面顯示較寬的選項內容</td>
      <td>按下 + 號就可以調寬，按下 - 號就可以調窄。</td>
    </tr>
    <tr>
      <td>
        <a href="https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/MSPowerAutomateNameWidth.user.js"><img src="https://user-images.githubusercontent.com/88981/169986095-a54f32bd-55a6-4de8-bad6-aa3b1874ce07.png" width="32"/></a>
      </td>
      <td>Power Automate: 調整顯示名稱的欄位寬度</td>
      <td>將 Flows 的 Name 欄位調整到 750px 寬度，讓標題可以完整顯示在畫面上</td>
    </tr>
    <tr>
      <td>
        <a href="https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/MVPDocsLearnChampionProgram.user.js"><img src="https://user-images.githubusercontent.com/88981/169986095-a54f32bd-55a6-4de8-bad6-aa3b1874ce07.png" width="32"/></a>
      </td>
      <td>MVP: Microsoft Docs & Learn Champion Program</td>
      <td>Add <code>WT.mc_id=DT-MVP-4015686</code> tracking code to the matched urls</td>
    </tr>
    <tr>
      <td>
        <a href="https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/BypassNewYorkTimesPaywall.user.js"><img src="https://user-images.githubusercontent.com/88981/169986095-a54f32bd-55a6-4de8-bad6-aa3b1874ce07.png" width="32"/></a>
      </td>
      <td>NYTimes: 移除 New York Times 閱讀新聞時的付款提示畫面</td>
      <td>移除看 New York Times 新聞時的付款提示畫面</td>
    </tr>
    <tr>
      <td>
        <a href="https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/AccupassADRemover.user.js"><img src="https://user-images.githubusercontent.com/88981/169986095-a54f32bd-55a6-4de8-bad6-aa3b1874ce07.png" width="32"/></a>
      </td>
      <td>Accupass: 刪除活動頁面的漂浮廣告</td>
      <td>刪除 Accupass 前台活動頁的漂浮廣告</td>
    </tr>
    <tr>
      <td>
        <a href="https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/BooksADRemover.user.js"><img src="https://user-images.githubusercontent.com/88981/169986095-a54f32bd-55a6-4de8-bad6-aa3b1874ce07.png" width="32"/></a>
      </td>
      <td>博客來: 刪除首頁的蓋版廣告</td>
      <td>刪除博客來首頁的蓋版廣告</td>
    </tr>
    <tr>
      <td>
        <a href="https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ESUN_Add_Field_ID.user.js"><img src="https://user-images.githubusercontent.com/88981/169986095-a54f32bd-55a6-4de8-bad6-aa3b1874ce07.png" width="32"/></a>
      </td>
      <td>玉山銀行: 添加遺失的表單欄位 id 屬性</td>
      <td>
        修復玉山銀行<a href="https://gib.esunbank.com/">玉山全球智匯網</a>登入頁面無法使用密碼管理器的問題
      </td>
    </tr>
  </tbody>
</table>

## 相關連結

- [Tampermonkey • Documentation](https://www.tampermonkey.net/documentation.php)
  - [@run-at](https://www.tampermonkey.net/documentation.php#_run_at)
