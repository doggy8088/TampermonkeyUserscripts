// ==UserScript==
// @name         ChatGPT: 好用的鍵盤快速鍵集合
// @version      0.2.0
// @description  按下 Ctrl+Delete 快速刪除當下聊天記錄、按下 Ctrl+B 快速切換側邊欄
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ChatGPTHotkeys.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/ChatGPTHotkeys.user.js
// @author       Will Huang
// @match        https://chatgpt.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=openai.com
// ==/UserScript==

(function () {
    'use strict';

    document.addEventListener("keydown", (event) => {

        // 按下 Ctrl+Delete 快速刪除 ChatGPT 聊天記錄
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

        // 按下 Ctrl+B 快速切換側邊欄
        if (event.ctrlKey && event.key === "b") {
            console.log("Ctrl + B detected. Clicking close sidebar button...");

            // 找到具有 data-testid="close-sidebar-button" 的按鈕
            const closeButton = document.querySelector('[data-testid="close-sidebar-button"]');

            if (closeButton) {
                closeButton.click();
                console.log("Close sidebar button clicked.");
            } else {
                console.error("找不到關閉側邊欄的按鈕");
            }
        }

        // 按下 Alt + S 快速切換搜尋功能
        if (event.altKey && event.key.toLowerCase() === 's') {
            // 找到切換搜尋功能的按鈕
            const searchButton =
                document.querySelector('button[aria-label="Search the web"]')
                || document.querySelector('button[aria-label="搜尋網頁"]')
                || document.querySelector('button[aria-label="ウェブを検索"]')

            searchButton?.click();
        }
    });

})();
