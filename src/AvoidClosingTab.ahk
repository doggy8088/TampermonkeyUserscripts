; AutoHotkey v2
#Requires AutoHotkey v2.0+

; ==============================================================
; 擋掉 Ctrl+W / Ctrl+F4（僅限標題含 Codespaces 的 Chrome 瀏覽器）
; ==============================================================


; 只在 Chrome 視窗類別 Chrome_WidgetWin_1 時啟用以下熱鍵
#HotIf WinActive("ahk_class Chrome_WidgetWin_1")

; ---------- Ctrl+W ----------
^w::{
    title := WinGetTitle("A")
    ; https://github.dev/*
    ; https://*.github.dev/*
    if InStr(title, "Codespaces") || InStr(title, " Visual Studio Code - GitHub")   ; 標題含 Codespaces 或 Visual Studio Code - GitHub 就取消
    {
        SoundBeep  ; 發出提示音
        return
    }
    Send("^w")                                 ; 其他狀況照常送出
}

; ---------- Ctrl+F4 ----------
^F4::{
    title := WinGetTitle("A")
    ; https://github.dev/*
    ; https://*.github.dev/*
    if InStr(title, "Codespaces") || InStr(title, " Visual Studio Code - GitHub")
    {
        SoundBeep  ; 發出提示音
        return
    }
    Send("^F4")
}

#HotIf   ; 關閉條件區塊
