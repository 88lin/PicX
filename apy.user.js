// ==UserScript==
// @name         AYP免费测试
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  自动设置激活状态并解锁高级功能
// @match        https://xiaoxiao6test.netlify.app/*
// @match        http://localhost:*/*
// @run-at       document-start
// ==/UserScript==

(function () {
  'use strict';

  const LS_ACTIVE_KEY = 'ayp_premium_active';
  const LS_CODE_KEY   = 'ayp_activated_code';
  try {
    localStorage.setItem(LS_ACTIVE_KEY, 'true');
    localStorage.setItem(LS_CODE_KEY, 'DEBUG-CODE');
    console.log('[AYP DEBUG] premium active ON');
  } catch(e) {
    console.error('[AYP DEBUG] localStorage write failed', e);
  }
  function waitAndUnlock() {
    const interval = 100;
    const maxTry = 200;
    let count = 0;

    const timer = setInterval(() => {
      count++;

      if (typeof window.unlockPremiumFeatures === 'function') {
        try {
          window.unlockPremiumFeatures();
          console.log('[AYP DEBUG] unlockPremiumFeatures() executed');
        } catch (e) {
          console.error('[AYP DEBUG] unlock call failed', e);
        }
        clearInterval(timer);
        return;
      }

      if (count >= maxTry) {
        clearInterval(timer);
        console.warn('[AYP DEBUG] unlockPremiumFeatures not found');
      }
    }, interval);
  }
  window.addEventListener('DOMContentLoaded', waitAndUnlock);
})();
