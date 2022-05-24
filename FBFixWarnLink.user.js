// ==UserScript==
// @name         Facebook: FixWarnLink
// @version      1.0
// @description  讓 Facebook 點擊「外部連結」時可以不用去點擊確認按鈕
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/FBFixWarnLink.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/FBFixWarnLink.user.js
// @match        *://www.facebook.com/flx/warn/*
// @author       Will Huang
// @run-at       document-idle
// ==/UserScript==

(function() {
  'use strict';

  var id;

  function executeActions() {
      if (document.querySelectorAll('a[aria-label=前往連結]')[1]) {
          document.querySelectorAll('a[aria-label=前往連結]')[1].click();
          clearInterval(id);
      }
  }

  (function () {
      'use strict';
      id = setInterval(executeActions, 500);
  })();

})();
