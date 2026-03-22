chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "requestMic") {
    (async () => {
      try {
        const existing = await chrome.offscreen.hasDocument();
        if (!existing) {
          await chrome.offscreen.createDocument({
            url: "offscreen.html",
            reasons: ["USER_MEDIA"],
            justification: "Request microphone permission for Talk to the Page feature",
          });
        }
        // Forward the requestMic message to the offscreen document
        const response = await chrome.runtime.sendMessage({ type: "requestMicOffscreen" });
        sendResponse(response);
      } catch (err) {
        sendResponse({ granted: false, error: err.message });
      }
    })();
    return true;
  }
});
