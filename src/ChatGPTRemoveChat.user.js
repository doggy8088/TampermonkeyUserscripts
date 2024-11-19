// ==UserScript==
// @name         ChatGPT: 按下 Ctrl+Delete 快速刪除當下聊天記錄
// @version      0.1.0
// @description  按下 Ctrl+Delete 快速刪除 ChatGPT 聊天記錄
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ChatGPTRemoveChat.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ChatGPTRemoveChat.user.js
// @author       Will Huang
// @match        https://chatgpt.com/c/*
// @match        https://chatgpt.com/g/*/c/*
// ==/UserScript==

(function () {
    'use strict';

    // 為整個文檔添加按鍵監聽器
    document.addEventListener("keydown", (event) => {
        // 判斷是否按下 Ctrl + Delete
        if (event.ctrlKey && event.key === "Delete") {
            console.log("Ctrl + Delete detected. Starting delete process...");

            // 1. 從網址列取得 pathinfo
            const currentUrl = window.location.pathname;

            // 2. 找到和目前 pathinfo 一樣的超連結
            const matchingLink = document.querySelector(`a[href="${currentUrl}"]`);

            if (matchingLink) {
                // 3. 找到超連結的下一個鄰近的 div，並在裡面找到一個 button
                const parentDiv = matchingLink.closest("div"); // 取得包住 <a> 的 div
                const button = parentDiv.querySelector("button");

                if (button) {
                    // 模擬鍵盤事件，送出 Enter 鍵
                    const enterEvent = new KeyboardEvent("keydown", {
                        key: "Enter",
                        keyCode: 13,
                        code: "Enter",
                        which: 13,
                        bubbles: true,
                        cancelable: true
                    });

                    button.dispatchEvent(enterEvent); // 觸發 Enter 鍵事件

                    // 4. 等待 menu 彈出後，搜尋 div[data-radix-popper-content-wrapper]
                    setTimeout(() => {
                        const popperWrapper = document.querySelector('div[data-radix-popper-content-wrapper]');

                        if (popperWrapper) {
                            // 5. 找到所有包含 div[role="menuitem"] 的節點
                            const menuItems = popperWrapper.querySelectorAll('div[role="menuitem"]');

                            menuItems.forEach((menuItem) => {
                                if (menuItem.textContent.trim() === "刪除") {
                                    // 點擊該「刪除」選項
                                    menuItem.click();

                                    // 6. 等待刪除確認按鈕出現，並點擊它
                                    setTimeout(() => {
                                        const confirmButton = document.querySelector('[data-testid="delete-conversation-confirm-button"]');

                                        if (confirmButton) {
                                            // 直接點擊確認刪除按鈕
                                            confirmButton.click();
                                            console.log("刪除確認按鈕已點擊");
                                        } else {
                                            console.error("找不到確認刪除按鈕");
                                        }
                                    }, 300); // 給予確認按鈕的時間，依實際情況可調整
                                }
                            });
                        } else {
                            console.error("找不到 div[data-radix-popper-content-wrapper]");
                        }
                    }, 300); // 給予彈出 menu 的時間，依實際情況可調整
                } else {
                    console.error("找不到對應的按鈕");
                }
            } else {
                console.error("找不到符合條件的超連結");
            }
        }
    });

})();
