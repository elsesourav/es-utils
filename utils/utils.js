/* eslint-disable no-unused-vars */
"use strict";

function setDataFromLocalStorage(key, object) {
  let data = JSON.stringify(object);
  localStorage.setItem(key, data);
}

function getDataFromLocalStorage(key) {
  return JSON.parse(localStorage.getItem(key));
}

function reloadLocation() {
  window.location.reload();
}

function map(os, oe, ns, ne, t, isRound = true) {
  const r = (ne - ns) / (oe - os);
  let v = r * (t - os) + ns;
  v = Math.min(ne, Math.max(ns, v));
  return isRound ? Math.round(v) : v;
}

function setDataToLocalStorage(key, object) {
  let data = JSON.stringify(object);
  localStorage.setItem(key, data);
}

function getDataToLocalStorage(key) {
  return JSON.parse(localStorage.getItem(key));
}

function OBJECTtoJSON(data) {
  return JSON.stringify(data);
}

function JSONtoOBJECT(data) {
  return JSON.parse(data);
}

/* ----------- extension utils ----------- */
function getActiveTab() {
  return new Promise((resolve) => {
    chrome.tabs.query(
      {
        currentWindow: true,
        active: true,
      },
      (tabs) => {
        resolve(tabs[0]);
      },
    );
  });
}

function getFormatTime(t) {
  const date = new Date(0);
  date.setSeconds(t);
  return date.toISOString().substr(11, 8);
}

function runtimeSendMessage(type, message, callback) {
  if (typeof message === "function") {
    chrome.runtime.sendMessage({ type }, (response) => {
      message && message(response);
    });
  } else {
    chrome.runtime.sendMessage({ ...message, type }, (response) => {
      callback && callback(response);
    });
  }
}

function tabSendMessage(tabId, type, message, callback) {
  // if third parameter is not pass. in message parameter pass callback function
  if (typeof message === "function") {
    chrome.tabs.sendMessage(tabId, { type }, (response) => {
      message && message(response);
    });
  } else {
    chrome.tabs.sendMessage(tabId, { ...message, type }, (response) => {
      callback && callback(response);
    });
  }
}

function runtimeOnMessage(type, callback) {
  chrome.runtime.onMessage.addListener((message, sender, response) => {
    if (type === message.type) {
      callback(message, sender, response);
    }
    return true;
  });
}

function runtimeOnInstalled(callback) {
  chrome.runtime.onInstalled.addListener((details) => {
    callback(details);
  });
}

function contextMenusOnClicked(callback) {
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    callback(info, tab);
  });
}

function pagePostMessage(type, data, contentWindow = window) {
  contentWindow.postMessage({ type, data }, "*");
}

/* ######## send inject script to => content script ########
   pagePostMessage("i_c", { some: "data" });
*/

function pageOnMessage(type, callback) {
  window.addEventListener("message", (event) => {
    if (event.data.type === type) {
      callback(event.data.data, event);
    }
  });
}

/* ######## accept inject script to => content script ########
pageOnMessage("i_c", (data, event) => {
   console.log(data);
   console.log(event);
});
*/

const debounce = (func, delayFn) => {
  let debounceTimer;
  return function (...args) {
    const context = this;
    const delay = delayFn();
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => func.apply(context, args), delay);
  };
};

/**
 * @param {number} ms
 **/
function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chromeStorageSet(key, value, callback) {
  return new Promise((resolve) => {
    let items = {};
    items[key] = value;
    chrome.storage.sync.set(items, function () {
      if (chrome.runtime.lastError) {
        console.error("Error setting item:", chrome.runtime.lastError);
      } else if (callback) {
        callback();
      }
      resolve();
    });
  });
}
// Example usage:
// chromeStorageSet("myKey", "myValue", function () {
//    console.log("Item set");
// });

function chromeStorageGet(key, callback = () => {}) {
  return new Promise((resolve) => {
    chrome.storage.sync.get([key], function (result) {
      if (chrome.runtime.lastError) {
        console.error("Error getting item:", chrome.runtime.lastError);
      } else if (callback) {
        callback(result[key]);
        resolve(result[key]);
      }
    });
  });
}

function setInputLikeHuman(element) {
  const event = new Event("change", { bubbles: true });
  element.dispatchEvent(event);
}

function chromeStorageSetLocal(key, value, callback) {
  const obj = JSON.stringify(value);

  chrome.storage.local.set({ [key]: obj }).then(() => {
    if (chrome.runtime.lastError) {
      console.error("Error setting item:", chrome.runtime.lastError);
    } else if (callback) {
      callback(true);
    } else {
      return true;
    }
  });
}

function chromeStorageGetLocal(key, callback) {
  return new Promise((resolve) => {
    chrome.storage.local.get([key]).then((result) => {
      if (chrome.runtime.lastError) {
        console.error("Error getting item:", chrome.runtime.lastError);
      } else {
        const OBJ =
          typeof result[key] === "string" ? JSON.parse(result[key]) : null;
        callback && callback(OBJ);
        resolve(OBJ);
      }
    });
  });
}

function chromeStorageRemoveLocal(key) {
  chrome.storage.local.remove(key).then(() => {
    if (chrome.runtime.lastError) {
      console.log("Error removing item:", chrome.runtime.lastError);
    }
  });
}

function injectScript(src, type, doc = document || document.documentElement) {
  const script = document.createElement("script");
  script.src = chrome.runtime.getURL(src);
  if (type) script.type = type;
  script.onload = () => script.remove();
  doc.appendChild(script);
}

function injectJSCode(code) {
  const scriptElement = document.createElement("script");
  scriptElement.setAttribute("type", "text/javascript");
  scriptElement.textContent = code;
  document.documentElement.appendChild(scriptElement);
}

// Function to inject external JavaScript file
function injectJSLink(src) {
  const scriptElement = document.createElement("script");
  scriptElement.setAttribute("type", "text/javascript");
  scriptElement.setAttribute("src", src);
  document.documentElement.appendChild(scriptElement);
}

function injectCSSFile(
  src,
  ref = "stylesheet",
  type = "text/css",
  crossorigin,
  doc = document || document.documentElement,
) {
  const link = document.createElement("link");
  if (ref) link.rel = ref;
  if (type) link.type = "text/css";
  if (crossorigin) link.setAttribute("crossorigin", "anonymous");
  link.href = chrome.runtime.getURL(src);
  doc.appendChild(link);
}

function injectCSSCode(cssCode) {
  const style = document.createElement("style");
  style.type = "text/css";
  style.textContent = cssCode;
  (document.head || document.documentElement).appendChild(style);
}

function injectCSSLink(href) {
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.type = "text/css";
  link.href = href;
  (document.head || document.documentElement).appendChild(link);
}

function executeScript(tabId, func, ...args) {
  chrome.scripting.executeScript({ target: { tabId }, func, args: [...args] });
}
