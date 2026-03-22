import { BACKEND_URL, DASHBOARD_URL } from "./config.js";

const TEMP_USER_ID_KEY = "ibrowse_temp_user_id";
const CLIENT_INSTANCE_ID_KEY = "ibrowse_client_instance_id";
const SESSION_ID_KEY = "ibrowse_session_id";

function getSessionStore() {
  return chrome.storage.session ?? chrome.storage.local;
}

function createId() {
  return crypto.randomUUID();
}

async function getLocalValues(keys) {
  return chrome.storage.local.get(keys);
}

async function setLocalValues(values) {
  return chrome.storage.local.set(values);
}

async function getSessionValues(keys) {
  return getSessionStore().get(keys);
}

async function setSessionValues(values) {
  return getSessionStore().set(values);
}

async function ensureStableIdentity() {
  const values = await getLocalValues([TEMP_USER_ID_KEY, CLIENT_INSTANCE_ID_KEY]);

  const temporaryUserId = values[TEMP_USER_ID_KEY] || createId();
  const clientInstanceId = values[CLIENT_INSTANCE_ID_KEY] || createId();

  if (!values[TEMP_USER_ID_KEY] || !values[CLIENT_INSTANCE_ID_KEY]) {
    await setLocalValues({
      [TEMP_USER_ID_KEY]: temporaryUserId,
      [CLIENT_INSTANCE_ID_KEY]: clientInstanceId,
    });
  }

  return { temporaryUserId, clientInstanceId };
}

async function startSessionOnBackend(context) {
  try {
    console.debug("I Browse analytics: starting session", {
      temporary_user_id: context.temporaryUserId,
      client_instance_id: context.clientInstanceId,
      session_id: context.sessionId,
    });
    await fetch(`${BACKEND_URL}/analytics/session/start`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        temporary_user_id: context.temporaryUserId,
        client_instance_id: context.clientInstanceId,
        session_id: context.sessionId,
        browser_info: context.browserInfo,
      }),
    });
    console.debug("I Browse analytics: session start queued", context.sessionId);
  } catch (error) {
    console.warn("I Browse analytics session start failed", error);
  }
}

export async function ensureAnalyticsContext(browserInfo = navigator.userAgent) {
  const identity = await ensureStableIdentity();
  const sessionValues = await getSessionValues([SESSION_ID_KEY]);

  let sessionId = sessionValues[SESSION_ID_KEY];
  const isNewSession = !sessionId;

  if (!sessionId) {
    sessionId = createId();
    await setSessionValues({ [SESSION_ID_KEY]: sessionId });
  }

  const context = {
    ...identity,
    sessionId,
    browserInfo,
  };

  if (isNewSession) {
    void startSessionOnBackend(context);
  }

  console.debug("I Browse analytics: context ready", {
    temporaryUserId: context.temporaryUserId,
    clientInstanceId: context.clientInstanceId,
    sessionId: context.sessionId,
    isNewSession,
  });

  return context;
}

export function buildDashboardUrl(temporaryUserId) {
  const url = new URL(DASHBOARD_URL);
  url.searchParams.set("temp_user_id", temporaryUserId);
  return url.toString();
}

function summarizeOps(ops) {
  const hideCount = Array.isArray(ops?.hide) ? ops.hide.length : 0;
  const removeCount = Array.isArray(ops?.remove) ? ops.remove.length : 0;
  const restyleCount = ops?.restyle ? Object.keys(ops.restyle).length : 0;
  const injectCount = Array.isArray(ops?.inject) ? ops.inject.length : 0;

  return {
    hide_count: hideCount,
    remove_count: removeCount,
    restyle_count: restyleCount,
    inject_count: injectCount,
    total_affected_count: hideCount + removeCount + restyleCount + injectCount,
  };
}

export async function logClientTransformEvent({
  context,
  pageUrl,
  prompt,
  presetUsed = null,
  status,
  ops,
  snapshotNodeCount = null,
  latencyMs = null,
  errorMessage = null,
}) {
  const opSummary = summarizeOps(ops);

  try {
    console.debug("I Browse analytics: logging client transform event", {
      temporary_user_id: context.temporaryUserId,
      client_instance_id: context.clientInstanceId,
      session_id: context.sessionId,
      page_url: pageUrl,
      prompt,
      preset_used: presetUsed,
      status,
      ...opSummary,
    });
    await fetch(`${BACKEND_URL}/analytics/transform-event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        temporary_user_id: context.temporaryUserId,
        client_instance_id: context.clientInstanceId,
        session_id: context.sessionId,
        page_url: pageUrl,
        browser_info: context.browserInfo,
        prompt,
        preset_used: presetUsed,
        status,
        snapshot_node_count: snapshotNodeCount,
        latency_ms: latencyMs,
        error_message: errorMessage,
        ...opSummary,
      }),
    });
  } catch (error) {
    console.warn("I Browse analytics event logging failed", error);
  }
}
