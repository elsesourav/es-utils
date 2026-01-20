"use strict";

const storage = {
  local: {
    set: (key, value) => localStorage.setItem(key, JSON.stringify(value)),
    get: (key) => JSON.parse(localStorage.getItem(key)),
  },
  sync: {
    set: (key, value) =>
      new Promise((r) => chrome.storage.sync.set({ [key]: value }, r)),
    get: (key) =>
      new Promise((r) => chrome.storage.sync.get([key], (res) => r(res[key]))),
  },
  local_chrome: {
    set: (key, value) =>
      chrome.storage.local.set({ [key]: JSON.stringify(value) }),
    get: (key) =>
      new Promise((r) =>
        chrome.storage.local.get([key], (res) =>
          r(res[key] ? JSON.parse(res[key]) : null),
        ),
      ),
    remove: (key) => chrome.storage.local.remove(key),
  },
};

const getActiveTab = () =>
  new Promise((r) =>
    chrome.tabs.query({ currentWindow: true, active: true }, (t) => r(t[0])),
  );

function runtimeSendMessage(type, message, callback) {
  const payload =
    typeof message === "function" ? { type } : { ...message, type };
  const cb = typeof message === "function" ? message : callback;
  chrome.runtime.sendMessage(payload, cb);
}

function tabSendMessage(tabId, type, message, callback) {
  const payload =
    typeof message === "function" ? { type } : { ...message, type };
  const cb = typeof message === "function" ? message : callback;
  chrome.tabs.sendMessage(tabId, payload, (res) => {
    if (!chrome.runtime.lastError) cb?.(res);
  });
}

function runtimeOnMessage(type, callback) {
  chrome.runtime.onMessage.addListener((msg, sender, res) => {
    if (msg.type === type) callback(msg, sender, res);
    return true;
  });
}

function runtimeOnInstalled(callback) {
  chrome.runtime.onInstalled.addListener(callback);
}

function contextMenusOnClicked(callback) {
  chrome.contextMenus.onClicked.addListener(callback);
}

function pagePostMessage(type, data, target = window) {
  target.postMessage({ type, data }, "*");
}

function pageOnMessage(type, callback) {
  window.addEventListener("message", (e) => {
    if (e.data.type === type) callback(e.data.data, e);
  });
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

const debounce = (fn, getDelay) => {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), getDelay());
  };
};

const map = (os, oe, ns, ne, t, round = true) => {
  const v = Math.min(ne, Math.max(ns, ((ne - ns) / (oe - os)) * (t - os) + ns));
  return round ? Math.round(v) : v;
};

const formatTime = (s) => new Date(s * 1000).toISOString().substr(11, 8);

function injectScript(src, type) {
  const s = document.createElement("script");
  s.src = chrome.runtime.getURL(src);
  if (type) s.type = type;
  s.onload = () => s.remove();
  document.documentElement.appendChild(s);
}

function injectCode(code) {
  const s = document.createElement("script");
  s.textContent = code;
  document.documentElement.appendChild(s);
}

function injectCSS(src) {
  const l = document.createElement("link");
  l.rel = "stylesheet";
  l.href = chrome.runtime.getURL(src);
  (document.head || document.documentElement).appendChild(l);
}

function injectStyle(css) {
  const s = document.createElement("style");
  s.textContent = css;
  (document.head || document.documentElement).appendChild(s);
}

function executeScript(tabId, func, ...args) {
  chrome.scripting.executeScript({ target: { tabId }, func, args });
}
