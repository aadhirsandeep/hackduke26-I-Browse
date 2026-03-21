chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "getSnapshot") {
    const elements = document.querySelectorAll("*");
    const snapshot = [];
    let count = 0;
    for (const el of elements) {
      if (count >= 200) break;
      const text = (el.innerText || el.textContent || "").trim().slice(0, 60);
      snapshot.push({
        tag: el.tagName.toLowerCase(),
        id: el.id || "",
        className: typeof el.className === "string" ? el.className : "",
        text,
      });
      count++;
    }
    sendResponse({ snapshot });
    return true;
  }

  if (message.type === "applyOps") {
    const ops = message.ops;

    // 1. restyle
    if (ops.restyle && typeof ops.restyle === "object") {
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
          document.querySelectorAll(selector).forEach((el) => {
            el.style.display = "none";
          });
        } catch (e) {
          console.warn("evolve: bad hide selector", selector, e);
        }
      }
    }

    // 4. remove
    if (Array.isArray(ops.remove)) {
      for (const selector of ops.remove) {
        try {
          document.querySelectorAll(selector).forEach((el) => el.remove());
        } catch (e) {
          console.warn("evolve: bad remove selector", selector, e);
        }
      }
    }

    sendResponse({ status: "applied" });
    return true;
  }
});
