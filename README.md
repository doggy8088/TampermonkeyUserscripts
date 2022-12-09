# TampermonkeyUserscripts

這裡整理了 [Will 保哥](https://www.facebook.com/will.fans/) 多年來撰寫的 [Tampermonkey](https://www.tampermonkey.net/) 使用者腳本 (Userscript)，我只要覺得常用的網站做的有點難用，就會自己寫寫小工具來改善 UX 問題，提升平時的工作效率。

## 使用方式

1. 安裝 [Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo) 擴充套件 (Chrome/Edge)

2. 點擊下表的**安裝圖示**即可啟動 Tampermonkey 擴充套件頁面，按下 **Install** 即可自動安裝完畢！

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
        <a href="https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ChatGPTVoiceInput.user.js"><img src="https://user-images.githubusercontent.com/88981/169986095-a54f32bd-55a6-4de8-bad6-aa3b1874ce07.png" width="32"/></a>
      </td>
      <td>ChatGPT 語音輸入介面 (支援中/英/日/韓語言)</td>
      <td>
        直接在 <a href="https://chat.openai.com/chat">ChatGPT</a> 加入語音輸入功能 (<a href="https://www.youtube.com/watch?v=DgFwtRj4jkU" target="_blank">影片教學</a>)<br>
        (按下 <code>alt+s</code> 可啟動語音辨識、按下 <code>alt+t</code> 可停止語音辨識)
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
        <a href="https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/AzureDevOpsPageTitleModifier.user.js"><img src="https://user-images.githubusercontent.com/88981/169986095-a54f32bd-55a6-4de8-bad6-aa3b1874ce07.png" width="32"/></a>
      </td>
      <td>Azure DevOps: 調整工作項目頁面標題</td>
      <td>讓 Azure Boards 的 Work Item 顯示的「頁面標題」更加具有意義</td>
    </tr>
    <tr>
      <td>
        <a href="https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/AzureDevOpsPipelinesLogEnlarger.user.js"><img src="https://user-images.githubusercontent.com/88981/169986095-a54f32bd-55a6-4de8-bad6-aa3b1874ce07.png" width="32"/></a>
      </td>
      <td>Azure DevOps: 調整 Pipeline Log 的顯示寬度</td>
      <td>
        在 Azure Pipelines 的 Logs
        可透過鍵盤(<code>+</code>/<code>-</code>)放大/縮小左欄寬度
      </td>
    </tr>
    <tr>
      <td>
        <a href="https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/AzureDevOpsPipelinesScreenRecordingPlayer.user.js"><img src="https://user-images.githubusercontent.com/88981/169986095-a54f32bd-55a6-4de8-bad6-aa3b1874ce07.png" width="32"/></a>
      </td>
      <td>Azure DevOps: 調整工作項目直接播放螢幕錄影影片</td>
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
  </tbody>
</table>

## 相關連結

- [Tampermonkey • Documentation](https://www.tampermonkey.net/documentation.php)
  - [@run-at](https://www.tampermonkey.net/documentation.php#_run_at)
