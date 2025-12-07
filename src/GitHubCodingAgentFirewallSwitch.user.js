// ==UserScript==
// @name         GitHub: 快速切換 GitHub Copilot Coding Agent 防火牆開關
// @version      0.1.5
// @description  在網頁上加入一個切換按鈕，可以快速切換 GitHub Copilot Coding Agent 防火牆的開啟與關閉狀態
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/GitHubCodingAgentFirewallSwitch.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/src/GitHubCodingAgentFirewallSwitch.user.js
// @author       Will Huang
// @match        https://github.com/doggy8088/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_deleteValue
// @run-at       document-idle
// @icon         https://www.google.com/s2/favicons?sz=64&domain=github.com
// ==/UserScript==

(function () {
    'use strict';

    ////////////////////////////////////////////////////////////////////////////
    // 本工具已經上架到 Chrome 線上應用程式商店
    // https://chromewebstore.google.com/detail/jcfkckanbmpokgaibgafjombggbdkiml
    ////////////////////////////////////////////////////////////////////////////

    const verboseLoggingEnabled = true;
    const GITHUB_ORIGIN = "https://github.com";
    const FIREWALL_SETTINGS_PATH = "/settings/copilot/coding_agent";
    const FIREWALL_API_PATH = FIREWALL_SETTINGS_PATH + "/firewall";
    const FIREWALL_CACHE_KEY_PREFIX = "sweagentd-firewall-cache:";
    const FIREWALL_CACHE_TTL_MS = 60 * 60 * 1000; // 1 小時
    const APP_HEADER_NAV_SELECTOR = "header div.AppHeader-localBar nav ul";
    const FIREWALL_EMOJI = "🔥";
    const FIREWALL_TOOLTIP_TEXT = "切換防火牆";

    initialize();

    async function initialize() {
        verboseLog("初始化流程開始，準備取得防火牆狀態");

        let currentFirewallEnabled = false;

        try {
            currentFirewallEnabled = await retrieveCurrentFirewallSetting();
            verboseLog("取得遠端防火牆狀態成功", { currentFirewallEnabled });
        } catch (error) {
            verboseLog("取得防火牆狀態時發生錯誤，將使用預設值 false", error);
        }

        addFirewallToggleButton(currentFirewallEnabled);
    }

    function verboseLog(...args) {
        if (!verboseLoggingEnabled) {
            return;
        }

        console.log("[GitHub Firewall Switch]", ...args);
    }

    function getRepoSlug() {
        return window.location.pathname.split("/").slice(1, 3).join("/");
    }

    function buildRepoUrl(repo, path = "") {
        return `${GITHUB_ORIGIN}/${repo}${path}`;
    }

    function getCacheStorageKey(repo) {
        return `${FIREWALL_CACHE_KEY_PREFIX}${repo}`;
    }

    function readFirewallCache(repo) {
        if (!repo) {
            return null;
        }

        const storageKey = getCacheStorageKey(repo);

        try {
            const raw = GM_getValue(storageKey, null);

            if (!raw) {
                verboseLog("防火牆快取不存在", { repo });
                return null;
            }

            const parsed = JSON.parse(raw);

            if (!parsed || typeof parsed !== "object") {
                verboseLog("防火牆快取資料格式不正確，將移除", { repo, raw });
                GM_deleteValue(storageKey);
                return null;
            }

            const { value, timestamp } = parsed;

            if (typeof timestamp !== "number" || Number.isNaN(timestamp)) {
                verboseLog("防火牆快取缺少有效時間戳記，將移除", { repo, parsed });
                GM_deleteValue(storageKey);
                return null;
            }

            const age = Date.now() - timestamp;

            if (age > FIREWALL_CACHE_TTL_MS) {
                verboseLog("防火牆快取逾期，將移除", { repo, age });
                GM_deleteValue(storageKey);
                return null;
            }

            verboseLog("命中防火牆狀態快取", { repo, value, age });
            return value;
        } catch (error) {
            verboseLog("讀取防火牆快取時發生例外，將清除", { repo, error });

            try {
                GM_deleteValue(storageKey);
            } catch (removeError) {
                verboseLog("移除異常快取時再次失敗", { repo, removeError });
            }

            return null;
        }
    }

    function writeFirewallCache(repo, value) {
        if (!repo) {
            return;
        }

        const storageKey = getCacheStorageKey(repo);
        const payload = {
            value: !!value,
            timestamp: Date.now()
        };

        try {
            GM_setValue(storageKey, JSON.stringify(payload));
            verboseLog("已更新防火牆狀態快取", { repo, value: payload.value });
        } catch (error) {
            verboseLog("寫入防火牆快取時發生例外", { repo, error });
        }
    }

    function clearFirewallCache(repo) {
        if (!repo) {
            return;
        }

        const storageKey = getCacheStorageKey(repo);

        try {
            GM_deleteValue(storageKey);
            verboseLog("已清除防火牆狀態快取", { repo });
        } catch (error) {
            verboseLog("清除防火牆快取時發生例外", { repo, error });
        }
    }

    function findClosestElementByClassPrefix(element, prefix) {
        let current = element;

        while (current && current !== document) {
            if (current.classList && Array.from(current.classList).some((cls) => cls.startsWith(prefix))) {
                return current;
            }

            current = current.parentElement;
        }

        return null;
    }

    function querySelectorByClassPrefix(root, tagName, classPrefix) {
        const elements = root.getElementsByTagName(tagName);

        for (const element of elements) {
            if (element.classList && Array.from(element.classList).some((cls) => cls.startsWith(classPrefix))) {
                return element;
            }
        }

        return null;
    }

    function addFirewallToggleButton(initialEnabled = false) {
        verboseLog("嘗試尋找導覽列，插入切換按鈕", { initialEnabled });

        const navUl = document.querySelector(APP_HEADER_NAV_SELECTOR);

        if (!navUl) {
            verboseLog("找不到導覽列，取消建立切換按鈕");
            return;
        }

        if (navUl.querySelector("#sweagentd-firewall-toggle-button")) {
            verboseLog("切換按鈕已存在，略過建立流程");
            return;
        }

        const repoSlug = getRepoSlug();

        const toggleMarkup = `
<li>
  <div class="prc-ToggleSwitch-ToggleSwitch-E4lp0" data-status-label-position="start"><span
      class="prc-src-InternalVisuallyHidden-nlR9R">
      <div id="loadingLabel"></div>
    </span><span class="prc-ToggleSwitch-StatusText-hWpj2" data-size="small" data-disabled="false"
      aria-hidden="true"><span class="prc-ToggleSwitch-StatusTextItem-fvvXa" data-hidden="true" data-hidden-text="On"></span><span
        class="prc-ToggleSwitch-StatusTextItem-fvvXa" data-hidden="false" data-hidden-text="Off"></span></span><button type="button"
      class="prc-ToggleSwitch-SwitchButton-5LRHX" data-size="small" data-checked="false" data-disabled="false"
      aria-labelledby="sweagentd-firewall-ui-enable-label"
      aria-describedby="loadingLabel sweagentd-firewall-ui-enable-description" aria-pressed="false"
      aria-disabled="false">
      <div class="prc-ToggleSwitch-SwitchButtonContent-nv4lE" aria-hidden="true">
        <div class="prc-ToggleSwitch-IconContainer-zLC02 prc-ToggleSwitch-LineIconContainer-7sQm8" data-checked="false"
          data-disabled="false"><svg aria-hidden="true" width="12" height="12" viewBox="0 0 16 16" fill="currentColor"
            xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd" d="M8 2a.75.75 0 0 1 .75.75v11.5a.75.75 0 0 1-1.5 0V2.75A.75.75 0 0 1 8 2Z">
            </path>
          </svg></div>
        <div class="prc-ToggleSwitch-IconContainer-zLC02 prc-ToggleSwitch-CircleIconContainer-gHYvi"
          data-checked="false" data-disabled="false"><svg aria-hidden="true" width="12" height="12" viewBox="0 0 16 16"
            fill="currentColor" xmlns="http://www.w3.org/2000/svg">
            <path fill-rule="evenodd"
              d="M8 12.5a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9ZM8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12Z"></path>
          </svg></div>
      </div>
      <div class="prc-ToggleSwitch-ToggleKnob-2e7Rm" data-checked="false" data-disabled="false" aria-hidden="true">
      </div>
    </button></div>
</li>`;

        navUl.insertAdjacentHTML("beforeend", toggleMarkup);

        const toggleLi = navUl.lastElementChild;

        verboseLog("切換按鈕節點已插入，準備初始化事件與狀態");

        if (!toggleLi) {
            verboseLog("找不到新插入的 li 節點，無法初始化切換按鈕");
            return;
        }

        const button = querySelectorByClassPrefix(toggleLi, "button", "prc-ToggleSwitch-SwitchButton-");

        if (!button) {
            verboseLog("切換按鈕節點不存在，初始化失敗");
            return;
        }

        button.id = "sweagentd-firewall-toggle-button";
        button.title = FIREWALL_TOOLTIP_TEXT;
        verboseLog("已設定切換按鈕識別 ID");

        const toggleSwitchContainer = querySelectorByClassPrefix(toggleLi, "div", "prc-ToggleSwitch-ToggleSwitch-");

        if (toggleSwitchContainer && !toggleSwitchContainer.querySelector(".swe-firewall-emoji")) {
            const emojiNode = document.createElement(repoSlug ? "a" : "span");
            emojiNode.className = "swe-firewall-emoji";
            emojiNode.textContent = FIREWALL_EMOJI;
            emojiNode.style.display = "inline-flex";
            emojiNode.style.alignItems = "center";
            emojiNode.style.justifyContent = "center";
            emojiNode.style.marginRight = "4px";
            emojiNode.style.fontSize = "16px";
            emojiNode.style.textDecoration = "none";
            emojiNode.style.color = "inherit";

            if (emojiNode instanceof HTMLAnchorElement && repoSlug) {
                emojiNode.href = buildRepoUrl(repoSlug, FIREWALL_SETTINGS_PATH);
                emojiNode.target = "_self";
                emojiNode.title = "開啟防火牆設定";
            }

            toggleSwitchContainer.insertBefore(emojiNode, button);
            verboseLog("已在切換按鈕旁加入防火牆 Emoji", { emoji: FIREWALL_EMOJI, hasLink: emojiNode instanceof HTMLAnchorElement });
        }

        const statusItems = toggleLi.querySelectorAll(".prc-ToggleSwitch-StatusTextItem-fvvXa");
        const statusOn = statusItems[0] || null;
        const statusOff = statusItems[1] || null;
        const statusText = toggleLi.querySelector(".prc-ToggleSwitch-StatusText-hWpj2");
        const lineIcon = toggleLi.querySelector(".prc-ToggleSwitch-LineIconContainer-7sQm8");
        const circleIcon = toggleLi.querySelector(".prc-ToggleSwitch-CircleIconContainer-gHYvi");
        const knob = toggleLi.querySelector(".prc-ToggleSwitch-ToggleKnob-2e7Rm");
        const loadingLabel = toggleLi.querySelector("#loadingLabel");

        const setCheckedState = (enabled) => {
            const checkedValue = enabled ? "true" : "false";
            const hiddenValueOn = enabled ? "false" : "true";
            const hiddenValueOff = enabled ? "true" : "false";

            button.dataset.checked = checkedValue;
            button.setAttribute("data-checked", checkedValue);
            button.setAttribute("aria-pressed", checkedValue);

            if (statusOn) {
                statusOn.dataset.hidden = hiddenValueOn;
                statusOn.setAttribute("data-hidden", hiddenValueOn);
            }

            if (statusOff) {
                statusOff.dataset.hidden = hiddenValueOff;
                statusOff.setAttribute("data-hidden", hiddenValueOff);
            }

            if (lineIcon) {
                lineIcon.dataset.checked = checkedValue;
                lineIcon.setAttribute("data-checked", checkedValue);
            }

            if (circleIcon) {
                circleIcon.dataset.checked = checkedValue;
                circleIcon.setAttribute("data-checked", checkedValue);
            }

            if (knob) {
                knob.dataset.checked = checkedValue;
                knob.setAttribute("data-checked", checkedValue);
            }
        };

        const setBusyState = (isBusy) => {
            const disabledValue = isBusy ? "true" : "false";

            button.dataset.disabled = disabledValue;
            button.setAttribute("data-disabled", disabledValue);
            button.setAttribute("aria-disabled", disabledValue);
            button.disabled = isBusy;

            if (statusText) {
                statusText.dataset.disabled = disabledValue;
                statusText.setAttribute("data-disabled", disabledValue);
            }

            if (lineIcon) {
                lineIcon.dataset.disabled = disabledValue;
                lineIcon.setAttribute("data-disabled", disabledValue);
            }

            if (circleIcon) {
                circleIcon.dataset.disabled = disabledValue;
                circleIcon.setAttribute("data-disabled", disabledValue);
            }

            if (knob) {
                knob.dataset.disabled = disabledValue;
                knob.setAttribute("data-disabled", disabledValue);
            }
        };

        setCheckedState(initialEnabled);
        setBusyState(false);

        if (loadingLabel) {
            loadingLabel.textContent = "";
        }

        verboseLog("切換按鈕初始化完成，掛載點擊事件");

        button.addEventListener("click", async () => {
            if (button.dataset.disabled === "true") {
                verboseLog("偵測到切換按鈕正在忙碌，忽略此次點擊");
                return;
            }

            const isCurrentlyEnabled = button.getAttribute("data-checked") === "true";
            const nextState = !isCurrentlyEnabled;

            verboseLog("使用者點擊切換按鈕，切換防火牆狀態", {
                current: isCurrentlyEnabled,
                next: nextState
            });

            setBusyState(true);

            if (loadingLabel) {
                loadingLabel.textContent = "切換中…";
            }

            try {
                await toggleFirewallSetting(nextState);
                setCheckedState(nextState);

                verboseLog("防火牆狀態切換完成", { enabled: nextState });

                writeFirewallCache(getRepoSlug(), nextState);

                if (loadingLabel) {
                    loadingLabel.textContent = nextState ? "已開啟" : "已關閉";
                }

                const currentPath = window.location.pathname;
                const repo = getRepoSlug();
                const targetPath = `/${repo}${FIREWALL_SETTINGS_PATH}`;

                if (currentPath === targetPath) {
                    verboseLog("目前位於防火牆設定頁面，將於切換後重新整理頁面", { currentPath });
                    setTimeout(() => {
                        window.location.reload();
                    }, 1000);
                    return;
                }
            } catch (error) {
                console.error("切換防火牆狀態時發生錯誤", error);
                verboseLog("切換防火牆狀態失敗，維持原狀", error);

                if (loadingLabel) {
                    loadingLabel.textContent = "切換失敗";
                }
            } finally {
                setBusyState(false);

                verboseLog("解除切換按鈕忙碌狀態");

                if (loadingLabel) {
                    setTimeout(() => {
                        loadingLabel.textContent = "";
                    }, 1500);
                }
            }
        });
    }

    async function toggleFirewallSetting(state) {
        verboseLog("呼叫 toggleFirewallSetting", { state });

        if (state === undefined) {
            verboseLog("state 未提供，取消呼叫遠端 API");
            return;
        }

        const normalizedStateBoolean = !!state;
        const normalizedStateString = normalizedStateBoolean.toString();

        verboseLog("標準化防火牆狀態", {
            boolean: normalizedStateBoolean,
            string: normalizedStateString
        });

        const repo = getRepoSlug();

        verboseLog("解析目前儲存庫資訊", { repo });

        const payload = {
            enabled: normalizedStateBoolean,
            useDefaultRules: true,
            rules: [],
            error: null
        };

        verboseLog("準備送出防火牆狀態更新請求", payload);

        try {
            const response = await fetch(buildRepoUrl(repo, FIREWALL_API_PATH), {
                "headers": {
                    "accept": "application/json",
                    "accept-language": "zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7,zh-CN;q=0.6,ja;q=0.5,ru;q=0.4",
                    "cache-control": "no-cache",
                    "content-type": "application/json",
                    "github-verified-fetch": "true",
                    "pragma": "no-cache",
                    "x-requested-with": "XMLHttpRequest"
                },
                "referrer": buildRepoUrl(repo, FIREWALL_SETTINGS_PATH),
                "body": JSON.stringify(payload),
                "method": "PUT",
                "mode": "cors",
                "credentials": "include"
            });

            verboseLog("防火牆狀態更新請求已傳送，等待回應", {
                status: response.status,
                ok: response.ok
            });

            if (!response.ok) {
                const errorText = await response.text();

                verboseLog("防火牆狀態更新回應為失敗", {
                    status: response.status,
                    statusText: response.statusText,
                    body: errorText
                });

                throw new Error("切換防火牆狀態失敗，HTTP 狀態碼：" + response.status);
            }

            verboseLog("防火牆狀態更新成功");
        } catch (error) {
            verboseLog("呼叫防火牆狀態更新 API 時發生錯誤", error);
            throw error;
        }
    }

    async function retrieveCurrentFirewallSetting() {
        verboseLog("呼叫 retrieveCurrentFirewallSetting");

        const repo = getRepoSlug();

        verboseLog("解析目前儲存庫資訊", { repo });

        try {
            const cachedValue = readFirewallCache(repo);

            if (cachedValue !== null) {
                verboseLog("快取命中，直接回傳防火牆狀態", { repo, cachedValue });
                return cachedValue;
            }

            const response = await fetch(buildRepoUrl(repo, FIREWALL_SETTINGS_PATH), {
                "headers": {
                    "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
                    "accept-language": "zh-TW,zh;q=0.9,en-US;q=0.8,en;q=0.7,zh-CN;q=0.6,ja;q=0.5,ru;q=0.4",
                    "cache-control": "no-cache",
                    "pragma": "no-cache",
                    "x-requested-with": "XMLHttpRequest"
                },
                "referrer": buildRepoUrl(repo, FIREWALL_SETTINGS_PATH),
                "method": "GET",
                "mode": "cors",
                "credentials": "include"
            });

            verboseLog("取得防火牆狀態頁面回應", {
                status: response.status,
                ok: response.ok
            });

            if (!response.ok) {
                const errorText = await response.text();

                verboseLog("取得防火牆狀態頁面失敗", {
                    status: response.status,
                    statusText: response.statusText,
                    bodyPreview: errorText.slice(0, 200)
                });

                throw new Error("取得防火牆設定頁面失敗，HTTP 狀態碼：" + response.status);
            }

            const htmlText = await response.text();

            verboseLog("解析防火牆設定頁面 HTML");

            const parser = new DOMParser();
            const doc = parser.parseFromString(htmlText, "text/html");

            const layoutMain = doc.querySelector("div.Layout-main");

            if (!layoutMain) {
                verboseLog("在回應中找不到 Layout-main 容器");
                throw new Error("無法在防火牆設定頁面中找到 Layout-main 容器");
            }

            const enableHeading = layoutMain.querySelector("#sweagentd-firewall-ui-enable-label");

            if (!enableHeading) {
                verboseLog("在 Layout-main 中找不到 Enable firewall 標題元素");
                throw new Error("無法在防火牆設定頁面中找到 Enable firewall 標題");
            }

            const enableContainer = findClosestElementByClassPrefix(enableHeading, "Item-module__contents--");

            if (!enableContainer) {
                verboseLog("找不到 Enable firewall 對應的容器元素");
                throw new Error("無法找到 Enable firewall 對應容器");
            }

            const toggleButton = querySelectorByClassPrefix(enableContainer, "button", "prc-ToggleSwitch-SwitchButton-");

            if (!toggleButton) {
                verboseLog("找不到 Enable firewall 對應的切換按鈕元素");
                throw new Error("無法找到 Enable firewall 的切換按鈕");
            }

            const isEnabled = toggleButton.getAttribute("data-checked") === "true";

            verboseLog("已解析 Enable firewall 當前狀態", { isEnabled });

            writeFirewallCache(repo, isEnabled);

            return isEnabled;
        } catch (error) {
            verboseLog("呼叫取得防火牆狀態 API 時發生錯誤", error);
            clearFirewallCache(repo);
            throw error;
        }
    }

})();
