chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "requestMicOffscreen") {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then((stream) => {
        stream.getTracks().forEach((t) => t.stop());
        sendResponse({ granted: true });
      })
      .catch((err) => {
        sendResponse({ granted: false, error: err.name });
      });
    return true;
  }
});
