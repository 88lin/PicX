// ==UserScript==
// @name         免兑换码脚本
// @namespace    http://tampermonkey.net/
// @version      1.0
// @author       https://home.nuaa.tech/gzh
// @icon         https://nuaa.tech/zz.svg
// @match        https://rpi.imsun.cc/*
// @match        https://zyy.oyoyun.com/*
// @grant             unsafeWindow
// @grant             GM_addStyle
// @grant             GM_openInTab
// @grant             GM_getValue
// @grant             GM_setValue
// @grant             GM_xmlhttpRequest
// ==/UserScript==

(function() {
    'use strict';

    const fakeActivation = {
        activated: true,
        code: "",
        projectName: "RPI Calculator",
        activatedAt: new Date().toISOString(),
        remainingUses: 0,
        validUntil: null
    };

    localStorage.setItem("rpi_activation_status", JSON.stringify(fakeActivation));

    console.log("模拟兑换码激活状态已设置！");
})();
