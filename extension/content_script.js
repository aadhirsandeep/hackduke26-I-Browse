chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "getSnapshot") {
    // Target meaningful elements — skip pure containers with no useful attributes
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
    const ops = message.ops;

    // 1. restyle
    if (ops.restyle && typeof ops.restyle === "object" && Object.keys(ops.restyle).length > 0) {
      const styleEl = document.createElement("style");
      let css = "";
      for (const [selector, styles] of Object.entries(ops.restyle)) {
        css += `${selector} { ${styles} }\n`;
      }
      styleEl.textContent = css;
      document.head.appendChild(styleEl);
    }

    // 2. inject
    if (Array.isArray(ops.inject)) {
      for (const item of ops.inject) {
        const el = document.createElement(item.tag || "div");
        if (item.id) el.id = item.id;
        if (item.text) el.textContent = item.text;
        if (item.css) el.style.cssText = item.css;
        document.body.appendChild(el);
      }
    }

    // 3. hide
    if (Array.isArray(ops.hide)) {
      for (const selector of ops.hide) {
        try {
          const matched = document.querySelectorAll(selector);
          matched.forEach((el) => {
            // Walk up to hide the whole card if we matched something inside it
            const card = el.closest("ytd-rich-item-renderer, ytd-video-renderer, article, li") || el;
            card.style.display = "none";
          });
        } catch (e) {
          console.warn("I Browse: bad hide selector", selector, e);
        }
      }
    }

    // 4. remove
    if (Array.isArray(ops.remove)) {
      for (const selector of ops.remove) {
        try {
          const matched = document.querySelectorAll(selector);
          matched.forEach((el) => {
            const card = el.closest("ytd-rich-item-renderer, ytd-video-renderer, article, li") || el;
            card.remove();
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
