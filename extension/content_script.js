console.debug("I Browse content script: loaded", window.location.href);

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

console.debug("I Browse content script: listener registration ready");
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "ping") {
    console.debug("I Browse content script: ping received", window.location.href);
    sendResponse({ status: "ready", url: window.location.href });
    return true;
  }

  if (message.type === "getSnapshot") {
    console.debug("I Browse content script: getSnapshot received", window.location.href);
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
    console.debug("I Browse content script: applyOps received", window.location.href);
    ensureDiffStyles();
    const ops = message.ops;

    // 1. restyle — flash affected elements green
    if (ops.restyle && typeof ops.restyle === "object" && Object.keys(ops.restyle).length > 0) {
      const styleEl = document.createElement("style");
      let css = "";
      for (const [selector, styles] of Object.entries(ops.restyle)) {
        css += `${selector} { ${styles} }\n`;
        try {
          document.querySelectorAll(selector).forEach((el) => flashElement(el, "green"));
        } catch (e) {}
      }
      styleEl.textContent = css;
      document.head.appendChild(styleEl);
    }

    // 2. inject — flash injected elements green after appending
    if (Array.isArray(ops.inject)) {
      for (const item of ops.inject) {
        if (item.payload) {
          const wrapper = document.createElement("div");
          wrapper.innerHTML = item.payload;
          const target = item.location === "head" ? document.head : document.body;
          const children = [...wrapper.children];
          while (wrapper.firstChild) target.appendChild(wrapper.firstChild);
          // Flash each injected root element green
          children.forEach((child) => {
            if (child.isConnected) flashElement(child, "green");
          });
        } else {
          const el = document.createElement(item.tag || "div");
          if (item.id) el.id = item.id;
          if (item.text) el.textContent = item.text;
          if (item.css) el.style.cssText = item.css;
          document.body.appendChild(el);
          flashElement(el, "green");
        }
      }
    }

    // 3. hide — flash red, then hide after animation completes
    if (Array.isArray(ops.hide)) {
      for (const selector of ops.hide) {
        try {
          document.querySelectorAll(selector).forEach((el) => {
            const card = el.closest("ytd-rich-item-renderer, ytd-video-renderer, article, li") || el;
            flashElement(card, "red");
            setTimeout(() => { card.style.display = "none"; }, 700);
          });
        } catch (e) {
          console.warn("I Browse: bad hide selector", selector, e);
        }
      }
    }

    // 4. remove — flash red, then remove after animation completes
    if (Array.isArray(ops.remove)) {
      for (const selector of ops.remove) {
        try {
          document.querySelectorAll(selector).forEach((el) => {
            const card = el.closest("ytd-rich-item-renderer, ytd-video-renderer, article, li") || el;
            flashElement(card, "red");
            setTimeout(() => { card.remove(); }, 700);
          });
        } catch (e) {
          console.warn("I Browse: bad remove selector", selector, e);
        }
      }
    }

    sendResponse({ status: "applied" });
    return true;
  }
});
