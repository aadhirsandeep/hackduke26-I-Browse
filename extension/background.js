chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ tabId: tab.id });
});

const RESTRICTED_WORDS_KEY = "ibrowse:restrictedWords";
const LAST_BLOCKED_KEY = "ibrowse:lastBlocked";
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

function getFirstMatchingWord(words, url) {
  const normalizedUrl = String(url || "").toLowerCase();
  for (const word of words) {
    if (!word) continue;
    if (normalizedUrl.includes(word)) {
      return word;
    }
  }
  return null;
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

  const result = await chrome.storage.local.get([RESTRICTED_WORDS_KEY]);
  const words = normalizeWords(result[RESTRICTED_WORDS_KEY]);
  restrictedWordsCache = words;
  if (words.length === 0) return;

  const matchedWord = getFirstMatchingWord(words, details.url) || findBlockedWord(details.url);
  if (!matchedWord) return;

  await chrome.storage.local.set({
    [LAST_BLOCKED_KEY]: {
      word: matchedWord,
      url: details.url,
      tabId: details.tabId,
      at: Date.now(),
    },
  });

  const blockedUrl = `${blockedPagePrefix}?word=${encodeURIComponent(matchedWord)}&tabId=${details.tabId}`;
  await chrome.tabs.update(details.tabId, { url: blockedUrl });
});
