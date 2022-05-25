// ==UserScript==
// @name         Facebook: FixWarnLink
// @version      1.1
// @description  讓 Facebook 點擊「外部連結」時可以不用去點擊確認按鈕
// @license      MIT
// @homepage     https://blog.miniasp.com/
// @homepageURL  https://blog.miniasp.com/
// @website      https://www.facebook.com/will.fans
// @source       https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/FBFixWarnLink.user.js
// @namespace    https://github.com/doggy8088/TampermonkeyUserscripts/raw/main/FBFixWarnLink.user.js
// @match        *://www.facebook.com/flx/warn/?u=*
// @author       Will Huang
// @run-at       document-start
// ==/UserScript==

(function() {
  'use strict';

  function executeActions() {
      // https://www.facebook.com/flx/warn/?u=https%3A%2F%2Fdevblogs.microsoft.com%2F
      location.replace((new URLSearchParams(location.search)).get('u'));
  }

  (function () {
      'use strict';
      executeActions();
  })();

})();
