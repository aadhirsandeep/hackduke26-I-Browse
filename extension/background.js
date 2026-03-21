chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

const RESTRICTED_WORDS_KEY = "ibrowse:restrictedWords";
const blockedPagePrefix = chrome.runtime.getURL("blocked.html");
let restrictedWordsCache = [];

function normalizeWords(rawWords) {
  if (!Array.isArray(rawWords)) return [];
  return [...new Set(
    rawWords
      .map((word) => String(word || "").trim().toLowerCase())
      .filter(Boolean)
  )];
}

function shouldCheckUrl(url) {
  if (!url || typeof url !== "string") return false;
  if (url.startsWith(blockedPagePrefix)) return false;
  return url.startsWith("http://") || url.startsWith("https://");
}

function findBlockedWord(url) {
  const target = url.toLowerCase();
  return restrictedWordsCache.find((word) => target.includes(word)) || null;
}

async function loadRestrictedWordsCache() {
  const result = await chrome.storage.local.get([RESTRICTED_WORDS_KEY]);
  restrictedWordsCache = normalizeWords(result[RESTRICTED_WORDS_KEY]);
}

chrome.runtime.onInstalled.addListener(() => {
  loadRestrictedWordsCache().catch((err) => {
    console.warn("I Browse: failed loading restricted words on install", err);
  });
});

chrome.runtime.onStartup.addListener(() => {
  loadRestrictedWordsCache().catch((err) => {
    console.warn("I Browse: failed loading restricted words on startup", err);
  });
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area !== "local" || !changes[RESTRICTED_WORDS_KEY]) return;
  restrictedWordsCache = normalizeWords(changes[RESTRICTED_WORDS_KEY].newValue);
});

chrome.webNavigation.onBeforeNavigate.addListener(async (details) => {
  if (details.frameId !== 0 || details.tabId < 0) return;
  if (!shouldCheckUrl(details.url)) return;

  if (restrictedWordsCache.length === 0) {
    await loadRestrictedWordsCache();
    if (restrictedWordsCache.length === 0) return;
  }

  const matchedWord = findBlockedWord(details.url);
  if (!matchedWord) return;

  const blockedUrl = `${blockedPagePrefix}?word=${encodeURIComponent(matchedWord)}&url=${encodeURIComponent(details.url)}`;
  await chrome.tabs.update(details.tabId, { url: blockedUrl });
});
