// ==UserScript==
// @name         Facebook: 移除「商店」按鈕
// @version      1.0
// @description  移除 FB 畫面上方的「商店」按鈕（上面全部都是色情廣告）
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/RemoveFBShopButton.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/RemoveFBShopButton.user.js
// @match        *://www.facebook.com/*
// @author       Will Huang
// @run-at       document-idle
// ==/UserScript==

(function() {
  'use strict';

  var id;

  function executeActions() {
      if (document.querySelector('a[aria-label=Marketplace]')) {
          document.querySelector('a[aria-label=Marketplace]').closest('li').style.visibility = 'hidden';
          clearInterval(id);
      }
  }

  (function () {
      'use strict';
      id = setInterval(executeActions, 500);
  })();

})();
