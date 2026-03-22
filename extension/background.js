const SESSION_KEY = "ibrowseAuthSession";

function b64UrlEncode(bytes) {
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function randomString(length = 32) {
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  return b64UrlEncode(bytes);
}

async function sha256(input) {
  const encoded = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest("SHA-256", encoded);
  return new Uint8Array(hash);
}

function decodeJwtClaims(token) {
  if (!token) return null;
  const [, payload] = token.split(".");
  if (!payload) return null;

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (normalized.length % 4)) % 4);
    return JSON.parse(atob(normalized + padding));
  } catch (error) {
    return null;
  }
}

function sessionFromTokenResponse(tokenResponse, config, user) {
  const claims = decodeJwtClaims(tokenResponse.id_token) || decodeJwtClaims(tokenResponse.access_token) || {};

  return {
    accessToken: tokenResponse.access_token,
    idToken: tokenResponse.id_token || "",
    tokenType: tokenResponse.token_type || "Bearer",
    expiresAt: Date.now() + (tokenResponse.expires_in || 3600) * 1000,
    scope: tokenResponse.scope || "",
    config,
    user: user || {
      sub: claims.sub || "",
      name: claims.name || claims.nickname || claims.email || "Signed in user",
      email: claims.email || "",
      picture: claims.picture || "",
    },
  };
}

async function getStoredSession() {
  const result = await chrome.storage.local.get(SESSION_KEY);
  const session = result[SESSION_KEY];
  if (!session) return null;

  if (session.expiresAt && session.expiresAt <= Date.now()) {
    await chrome.storage.local.remove(SESSION_KEY);
    return null;
  }

  return session;
}

async function storeSession(session) {
  await chrome.storage.local.set({ [SESSION_KEY]: session });
  return session;
}

async function clearSession() {
  await chrome.storage.local.remove(SESSION_KEY);
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    const detail = payload.error_description || payload.error || payload.detail || response.statusText;
    throw new Error(detail || "Request failed");
  }

  return payload;
}

async function startLogin(config) {
  if (!config?.domain || !config?.clientId || !config?.audience) {
    throw new Error("Missing Auth0 configuration");
  }

  const redirectUri = chrome.identity.getRedirectURL("auth0");
  const verifier = randomString(64);
  const state = randomString(32);
  const challenge = b64UrlEncode(await sha256(verifier));

  const authUrl = new URL(`https://${config.domain}/authorize`);
  authUrl.searchParams.set("client_id", config.clientId);
  authUrl.searchParams.set("redirect_uri", redirectUri);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid profile email");
  authUrl.searchParams.set("audience", config.audience);
  authUrl.searchParams.set("code_challenge", challenge);
  authUrl.searchParams.set("code_challenge_method", "S256");
  authUrl.searchParams.set("state", state);

  const redirectUrl = await chrome.identity.launchWebAuthFlow({
    url: authUrl.toString(),
    interactive: true,
  });

  if (!redirectUrl) {
    throw new Error("Login was cancelled");
  }

  const responseUrl = new URL(redirectUrl);
  const returnedState = responseUrl.searchParams.get("state");
  const code = responseUrl.searchParams.get("code");
  const authError = responseUrl.searchParams.get("error");

  if (authError) {
    throw new Error(responseUrl.searchParams.get("error_description") || authError);
  }

  if (!code || returnedState !== state) {
    throw new Error("Auth0 login failed");
  }

  const tokenResponse = await fetchJson(`https://${config.domain}/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      client_id: config.clientId,
      code_verifier: verifier,
      code,
      redirect_uri: redirectUri,
    }),
  });

  let user = null;
  try {
    user = await fetchJson(`https://${config.domain}/userinfo`, {
      headers: {
        Authorization: `Bearer ${tokenResponse.access_token}`,
      },
    });
  } catch (error) {
    user = null;
  }

  const session = sessionFromTokenResponse(tokenResponse, config, user);
  await storeSession(session);
  return session;
}

async function logout(session) {
  await clearSession();
  if (!session?.config?.domain || !session?.config?.clientId) return { ok: true };

  const redirectUri = chrome.identity.getRedirectURL("auth0-logout");
  const logoutUrl = new URL(`https://${session.config.domain}/v2/logout`);
  logoutUrl.searchParams.set("client_id", session.config.clientId);
  logoutUrl.searchParams.set("returnTo", redirectUri);

  try {
    await chrome.identity.launchWebAuthFlow({
      url: logoutUrl.toString(),
      interactive: true,
    });
  } catch (error) {
    // Local logout is still enough to block the extension UI.
  }

  return { ok: true };
}

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  (async () => {
    if (message.type === "auth:getSession") {
      sendResponse({ session: await getStoredSession() });
      return;
    }

    if (message.type === "auth:login") {
      sendResponse({ session: await startLogin(message.config) });
      return;
    }

    if (message.type === "auth:logout") {
      const session = await getStoredSession();
      sendResponse(await logout(session));
      return;
    }

    sendResponse({ error: "Unsupported message type" });
  })().catch((error) => {
    sendResponse({ error: error.message || "Auth request failed" });
  });

  return true;
});

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
