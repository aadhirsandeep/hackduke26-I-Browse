// Inject visual diff keyframes once
function ensureDiffStyles() {
  if (document.getElementById("__ibrowse_diff_styles")) return;
  const style = document.createElement("style");
  style.id = "__ibrowse_diff_styles";
  style.textContent = `
    @keyframes __ibrowse_flash_red {
      0%   { outline: 3px solid rgba(239,68,68,0); box-shadow: inset 0 0 0 0 rgba(239,68,68,0); }
      15%  { outline: 3px solid rgba(239,68,68,0.9); box-shadow: inset 0 0 24px rgba(239,68,68,0.35); }
      60%  { outline: 3px solid rgba(239,68,68,0.6); box-shadow: inset 0 0 12px rgba(239,68,68,0.2); }
      100% { outline: 3px solid rgba(239,68,68,0); box-shadow: inset 0 0 0 0 rgba(239,68,68,0); }
    }
    @keyframes __ibrowse_flash_green {
      0%   { outline: 3px solid rgba(52,211,153,0); box-shadow: inset 0 0 0 0 rgba(52,211,153,0); }
      15%  { outline: 3px solid rgba(52,211,153,0.9); box-shadow: inset 0 0 24px rgba(52,211,153,0.35); }
      60%  { outline: 3px solid rgba(52,211,153,0.6); box-shadow: inset 0 0 12px rgba(52,211,153,0.2); }
      100% { outline: 3px solid rgba(52,211,153,0); box-shadow: inset 0 0 0 0 rgba(52,211,153,0); }
    }
    .__ibrowse_diff_red {
      animation: __ibrowse_flash_red 0.75s ease forwards !important;
      border-radius: 4px;
      outline-offset: 2px;
    }
    .__ibrowse_diff_green {
      animation: __ibrowse_flash_green 0.6s ease forwards !important;
      border-radius: 4px;
      outline-offset: 2px;
    }
  `;
  document.head.appendChild(style);
}

function flashElement(el, type) {
  const cls = type === "red" ? "__ibrowse_diff_red" : "__ibrowse_diff_green";
  el.classList.remove("__ibrowse_diff_red", "__ibrowse_diff_green");
  // Force reflow so re-adding the class restarts animation
  void el.offsetWidth;
  el.classList.add(cls);
  el.addEventListener("animationend", () => el.classList.remove(cls), { once: true });
}

const IBROWSE_STORAGE_PREFIX = "ibrowse:ops:";
const IBROWSE_ORIGINAL_DISPLAY_ATTR = "data-ibrowse-original-display";

const mutationJournal = {
  injectedNodes: new Set(),
  hiddenElements: new Set(),
};

function getPageStorageKey(url = window.location.href) {
  const parsed = new URL(url);
  return `${IBROWSE_STORAGE_PREFIX}${parsed.origin}${parsed.pathname}`;
}

function styleKey(selector, styles) {
  return `__ibrowse_style_${btoa(unescape(encodeURIComponent(`${selector}__${styles}`))).replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

function payloadNodeKey(payload) {
  return `__ibrowse_payload_${btoa(unescape(encodeURIComponent(payload))).replace(/[^a-zA-Z0-9_-]/g, "")}`;
}

async function persistOpsForPage(ops) {
  const key = getPageStorageKey();
  await chrome.storage.local.set({
    [key]: {
      enabled: true,
      ops,
      updatedAt: Date.now(),
      url: window.location.href,
    },
  });
}

async function clearPersistedOpsForPage() {
  const key = getPageStorageKey();
  await chrome.storage.local.remove(key);
}

function applyOps(ops, options = {}) {
  const {
    flash = true,
    record = true,
  } = options;

  ensureDiffStyles();

  // 1. restyle — flash affected elements green
  if (ops.restyle && typeof ops.restyle === "object" && Object.keys(ops.restyle).length > 0) {
    for (const [selector, styles] of Object.entries(ops.restyle)) {
      const uniqueStyleId = styleKey(selector, styles);
      if (document.getElementById(uniqueStyleId)) continue;

      const styleEl = document.createElement("style");
      styleEl.id = uniqueStyleId;
      styleEl.setAttribute("data-ibrowse-owned", "1");
      styleEl.textContent = `${selector} { ${styles} }`;
      document.head.appendChild(styleEl);
      if (record) mutationJournal.injectedNodes.add(styleEl);

      if (flash) {
        try {
          document.querySelectorAll(selector).forEach((el) => flashElement(el, "green"));
        } catch (e) {}
      }
    }
  }

  // 2. inject — flash injected elements green after appending
  if (Array.isArray(ops.inject)) {
    for (const item of ops.inject) {
      if (item.payload) {
        const nodeId = payloadNodeKey(item.payload);
        if (document.getElementById(nodeId)) continue;

        const wrapper = document.createElement("div");
        wrapper.innerHTML = item.payload;
        const target = item.location === "head" ? document.head : document.body;
        const children = [...wrapper.children];

        if (children.length > 0) {
          if (!children[0].id) children[0].id = nodeId;
          children.forEach((child, index) => {
            child.setAttribute("data-ibrowse-owned", "1");
            if (!child.id && index > 0) {
              child.id = `${nodeId}_${index}`;
            }
          });
        }

        while (wrapper.firstChild) {
          const child = wrapper.firstChild;
          target.appendChild(child);
          if (record && child.nodeType === Node.ELEMENT_NODE) mutationJournal.injectedNodes.add(child);
        }

        if (flash) {
          children.forEach((child) => {
            if (child.isConnected) flashElement(child, "green");
          });
        }
      } else {
        const el = document.createElement(item.tag || "div");
        if (item.id) {
          if (document.getElementById(item.id)) continue;
          el.id = item.id;
        }
        if (item.text) el.textContent = item.text;
        if (item.css) el.style.cssText = item.css;
        el.setAttribute("data-ibrowse-owned", "1");
        document.body.appendChild(el);
        if (record) mutationJournal.injectedNodes.add(el);
        if (flash) flashElement(el, "green");
      }
    }
  }

  // 3. hide — flash red, then hide after animation completes
  if (Array.isArray(ops.hide)) {
    for (const selector of ops.hide) {
      try {
        document.querySelectorAll(selector).forEach((el) => {
          const card = el.closest("ytd-rich-item-renderer, ytd-video-renderer, article, li") || el;
          if (!card.hasAttribute(IBROWSE_ORIGINAL_DISPLAY_ATTR)) {
            card.setAttribute(IBROWSE_ORIGINAL_DISPLAY_ATTR, card.style.display || "");
          }
          if (record) mutationJournal.hiddenElements.add(card);
          if (flash) {
            flashElement(card, "red");
            setTimeout(() => { card.style.display = "none"; }, 700);
          } else {
            card.style.display = "none";
          }
        });
      } catch (e) {
        console.warn("I Browse: bad hide selector", selector, e);
      }
    }
  }

  // 4. remove — handled as reversible hide so reset can restore without reload
  if (Array.isArray(ops.remove)) {
    for (const selector of ops.remove) {
      try {
        document.querySelectorAll(selector).forEach((el) => {
          const card = el.closest("ytd-rich-item-renderer, ytd-video-renderer, article, li") || el;
          if (!card.hasAttribute(IBROWSE_ORIGINAL_DISPLAY_ATTR)) {
            card.setAttribute(IBROWSE_ORIGINAL_DISPLAY_ATTR, card.style.display || "");
          }
          if (record) mutationJournal.hiddenElements.add(card);
          if (flash) {
            flashElement(card, "red");
            setTimeout(() => { card.style.display = "none"; }, 700);
          } else {
            card.style.display = "none";
          }
        });
      } catch (e) {
        console.warn("I Browse: bad remove selector", selector, e);
      }
    }
  }
}

function resetOps(options = {}) {
  const { flash = true } = options;

  for (const el of mutationJournal.hiddenElements) {
    if (!el || !el.isConnected) continue;
    const originalDisplay = el.getAttribute(IBROWSE_ORIGINAL_DISPLAY_ATTR) || "";
    el.style.display = originalDisplay;
    el.removeAttribute(IBROWSE_ORIGINAL_DISPLAY_ATTR);
    if (flash) flashElement(el, "green");
  }
  mutationJournal.hiddenElements.clear();

  for (const node of mutationJournal.injectedNodes) {
    if (!node || !node.isConnected) continue;
    node.remove();
  }
  mutationJournal.injectedNodes.clear();
}

async function restorePersistedOps() {
  try {
    const key = getPageStorageKey();
    const stored = await chrome.storage.local.get([key]);
    const pageState = stored[key];
    if (!pageState?.enabled || !pageState?.ops) return;
    applyOps(pageState.ops, { flash: false, record: true });
  } catch (e) {
    console.warn("I Browse: failed to restore persisted ops", e);
  }
}

restorePersistedOps();

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "getSnapshot") {
    const SELECTORS = [
      "a[href]", "img", "video", "button", "input", "h1", "h2", "h3",
      "[id]", "[aria-label]", "[data-testid]", "[role]",
      "ytd-rich-item-renderer", "ytd-video-renderer", "ytd-compact-video-renderer",
      "article", "section", "li", "span", "p", "div[class]"
    ];

    const seen = new Set();
    const snapshot = [];

    for (const sel of SELECTORS) {
      if (snapshot.length >= 300) break;
      try {
        for (const el of document.querySelectorAll(sel)) {
          if (snapshot.length >= 300) break;
          if (seen.has(el)) continue;
          seen.add(el);

          const text = (el.getAttribute("aria-label") || el.innerText || el.textContent || "")
            .trim().replace(/\s+/g, " ").slice(0, 80);

          snapshot.push({
            tag: el.tagName.toLowerCase(),
            id: el.id || "",
            className: typeof el.className === "string" ? el.className.trim().slice(0, 80) : "",
            text,
            href: el.getAttribute("href") || "",
            ariaLabel: el.getAttribute("aria-label") || "",
            dataTestId: el.getAttribute("data-testid") || "",
            role: el.getAttribute("role") || "",
          });
        }
      } catch (e) {}
    }

    sendResponse({ snapshot });
    return true;
  }

  if (message.type === "applyOps") {
    (async () => {
      try {
        const ops = message.ops || { remove: [], hide: [], restyle: {}, inject: [] };
        applyOps(ops, { flash: true, record: true });
        await persistOpsForPage(ops);
        sendResponse({ status: "applied" });
      } catch (e) {
        sendResponse({ status: "error", error: String(e?.message || e) });
      }
    })();
    return true;
  }

  if (message.type === "resetOps") {
    (async () => {
      try {
        resetOps({ flash: true });
        await clearPersistedOpsForPage();
        sendResponse({ status: "reset" });
      } catch (e) {
        sendResponse({ status: "error", error: String(e?.message || e) });
      }
    })();
    return true;
  }
});
