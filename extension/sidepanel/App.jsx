import React, { useEffect, useState } from "react";

const BACKEND_URL = "http://localhost:8000";

const PRESETS = {
  Reader: {
    icon: "📖",
    label: "Reader",
    description: "Clean reading view",
    demo: "en.wikipedia.org",
    demoHint: "Try on Wikipedia or Medium",
    accent: "#f59e0b",
    accentBg: "rgba(245,158,11,0.08)",
    accentBorder: "rgba(245,158,11,0.25)",
    ops: {
      remove: [],
      hide: [],
      restyle: {
        "html, body": "background: #fafaf8 !important; color: #1a1a1a !important;",
        "body": "max-width: 740px !important; margin: 0 auto !important; padding: 32px 24px !important; font-size: 18px !important; line-height: 1.85 !important;",
        "p, li, blockquote": "font-size: 18px !important; line-height: 1.85 !important; color: #222 !important;",
        "h1, h2, h3, h4": "font-family: Georgia, serif !important; color: #111 !important; line-height: 1.3 !important;",
        "img": "max-width: 100% !important; height: auto !important; border-radius: 8px !important;",
        "a": "color: #b45309 !important;",
      },
      inject: [],
    },
  },
  Cinematic: {
    icon: "🎬",
    label: "Cinematic",
    description: "Full dark mode",
    demo: "en.wikipedia.org",
    demoHint: "Try on Wikipedia or any news site",
    accent: "#8b5cf6",
    accentBg: "rgba(139,92,246,0.08)",
    accentBorder: "rgba(139,92,246,0.25)",
    ops: {
      remove: [],
      hide: [],
      restyle: {
        "html, body": "background: #09090b !important; color: #e4e4e7 !important;",
        "body": "background: #09090b !important;",
        "a": "color: #a78bfa !important;",
        "img": "filter: brightness(0.88) contrast(1.05) !important; border-radius: 6px !important;",
        "h1, h2, h3, h4, h5, h6": "color: #fafafa !important;",
        "p, li, td, th, span": "color: #d4d4d8 !important;",
        "input, textarea, select": "background: #18181b !important; color: #e4e4e7 !important; border-color: #3f3f46 !important;",
      },
      inject: [],
    },
  },
  Sensory: {
    icon: "🌿",
    label: "Sensory",
    description: "Low stimulation",
    demo: "en.wikipedia.org",
    demoHint: "Try on Wikipedia or any article",
    accent: "#10b981",
    accentBg: "rgba(16,185,129,0.08)",
    accentBorder: "rgba(16,185,129,0.25)",
    ops: {
      remove: [],
      hide: [],
      restyle: {
        "html, body": "background: #f5f0eb !important; color: #3d3530 !important;",
        "body": "font-size: 17px !important; line-height: 1.8 !important; letter-spacing: 0.015em !important;",
        "img, video": "filter: saturate(0.5) brightness(1.02) !important;",
        "a": "color: #6b5a4e !important;",
        "h1, h2, h3, h4": "color: #2d2520 !important; font-weight: 600 !important;",
        "p, li": "color: #3d3530 !important;",
      },
      inject: [],
    },
  },
  Focus: {
    icon: "🎯",
    label: "Focus",
    description: "Spotlight content",
    demo: "en.wikipedia.org",
    demoHint: "Try on Wikipedia or any article",
    accent: "#06b6d4",
    accentBg: "rgba(6,182,212,0.08)",
    accentBorder: "rgba(6,182,212,0.25)",
    ops: {
      remove: [],
      hide: [],
      restyle: {
        "html, body": "background: #0f172a !important; color: #e2e8f0 !important;",
        "body": "background: #0f172a !important;",
        "p, li": "color: #cbd5e1 !important; font-size: 17px !important; line-height: 1.8 !important;",
        "h1, h2, h3, h4": "color: #f1f5f9 !important;",
        "a": "color: #7dd3fc !important;",
        "table, td, th": "border-color: #1e293b !important; color: #cbd5e1 !important;",
      },
      inject: [],
    },
  },
};

function sendRuntimeMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      if (response?.error) {
        reject(new Error(response.error));
        return;
      }

      resolve(response);
    });
  });
}

async function fetchAuthConfig() {
  const response = await fetch(`${BACKEND_URL}/auth/config`);
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.detail || "Could not load Auth0 config from backend");
  }

  return payload;
}

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [session, setSession] = useState(null);
  const [log, setLog] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [logOpen, setLogOpen] = useState(true);
  const [activePreset, setActivePreset] = useState(null);
  const [hoveredPreset, setHoveredPreset] = useState(null);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      try {
        const response = await sendRuntimeMessage({ type: "auth:getSession" });
        if (mounted) setSession(response.session || null);
      } catch (err) {
        if (mounted) setError(err.message || "Could not read auth session");
      } finally {
        if (mounted) setAuthLoading(false);
      }
    }

    loadSession();
    return () => {
      mounted = false;
    };
  }, []);

  const refreshSession = async () => {
    const response = await sendRuntimeMessage({ type: "auth:getSession" });
    setSession(response.session || null);
    return response.session || null;
  };

  const requireSession = async () => {
    const currentSession = session || (await refreshSession());
    if (!currentSession?.accessToken) {
      throw new Error("Sign in with Auth0 before transforming a page");
    }
    return currentSession;
  };

  const handleLogin = async () => {
    setAuthLoading(true);
    setError("");
    setStatus("");

    try {
      const config = await fetchAuthConfig();
      if (!config.configured) {
        throw new Error("Backend Auth0 config is incomplete. Add AUTH0_DOMAIN, AUTH0_CLIENT_ID, and AUTH0_AUDIENCE.");
      }

      const response = await sendRuntimeMessage({ type: "auth:login", config });
      setSession(response.session || null);
      setStatus(`Signed in as ${(response.session?.user?.email || response.session?.user?.name || "user")}`);
    } catch (err) {
      setError(err.message || "Sign-in failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    setAuthLoading(true);
    setError("");
    setStatus("");

    try {
      await sendRuntimeMessage({ type: "auth:logout" });
      setSession(null);
      setActivePreset(null);
      setStatus("Signed out");
    } catch (err) {
      setError(err.message || "Sign-out failed");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleTransform = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setLog("");
    setStatus("");
    setError("");

    try {
      const authSession = await requireSession();
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error("No active tab found");

      let snapshot;
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { type: "getSnapshot" });
        snapshot = response.snapshot;
      } catch (e) {
        throw new Error("Could not reach content script. Try refreshing the page.");
      }

      const res = await fetch(`${BACKEND_URL}/transform`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authSession.accessToken}`,
        },
        body: JSON.stringify({ prompt: prompt.trim(), snapshot }),
      });

      if (res.status === 401) {
        setSession(null);
        await sendRuntimeMessage({ type: "auth:logout" });
        throw new Error("Your session expired. Sign in again to continue.");
      }

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Backend error ${res.status}: ${text}`);
      }

      const ops = await res.json();
      setLog(JSON.stringify(ops, null, 2));
      await chrome.tabs.sendMessage(tab.id, { type: "applyOps", ops });
      setStatus("Applied successfully");
    } catch (err) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const handlePreset = async (name) => {
    setError("");
    setStatus("");
    setLog("");

    try {
      await requireSession();
      const preset = PRESETS[name];
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error("No active tab found");
      await chrome.tabs.sendMessage(tab.id, { type: "applyOps", ops: preset.ops });
      setActivePreset(name);
      setStatus(`${preset.icon} ${name} mode applied`);
      setLog(JSON.stringify(preset.ops, null, 2));
    } catch (err) {
      setError(err.message || "Unknown error");
    }
  };

  const signedIn = Boolean(session?.accessToken);
  const isDisabled = loading || !prompt.trim() || !signedIn;

  return (
    <>
      <div className="orb" />
      <div className="orb2" />
      <div className="app-container">
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span
              style={{
                fontSize: "22px",
                fontWeight: "700",
                background: "linear-gradient(135deg, #a5b4fc, #c4b5fd, #67e8f9)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                letterSpacing: "-0.5px",
              }}
            >
              I Browse
            </span>
            <div className="live-dot" title={signedIn ? "Signed in" : "Signed out"} />
          </div>
          <div style={{ fontSize: "11px", color: "#475569", letterSpacing: "0.8px", textTransform: "uppercase", fontWeight: "500" }}>
            transform your web
          </div>
        </div>

        <div className="divider" />

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            padding: "12px",
            borderRadius: "14px",
            background: "rgba(255,255,255,0.03)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <div style={{ fontSize: "11px", color: "#64748b", letterSpacing: "0.6px", textTransform: "uppercase", fontWeight: "600" }}>
                Auth0 Access
              </div>
              <div style={{ fontSize: "13px", color: signedIn ? "#e2e8f0" : "#94a3b8", lineHeight: 1.4 }}>
                {signedIn
                  ? (session.user?.email || session.user?.name || "Signed in")
                  : "Sign in before using presets or custom prompts."}
              </div>
            </div>
            {signedIn ? (
              <button
                onClick={handleLogout}
                disabled={authLoading}
                style={{
                  padding: "9px 12px",
                  borderRadius: "10px",
                  border: "1px solid rgba(248,113,113,0.25)",
                  background: "rgba(127,29,29,0.18)",
                  color: "#fecaca",
                  cursor: authLoading ? "not-allowed" : "pointer",
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: "12px",
                  fontWeight: "600",
                }}
              >
                Sign Out
              </button>
            ) : (
              <button
                onClick={handleLogin}
                disabled={authLoading}
                style={{
                  padding: "9px 12px",
                  borderRadius: "10px",
                  border: "1px solid rgba(103,232,249,0.28)",
                  background: "rgba(8,145,178,0.16)",
                  color: "#67e8f9",
                  cursor: authLoading ? "not-allowed" : "pointer",
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: "12px",
                  fontWeight: "600",
                }}
              >
                {authLoading ? "Checking..." : "Sign In"}
              </button>
            )}
          </div>
          {!signedIn && (
            <div style={{ fontSize: "11px", color: "#64748b", lineHeight: 1.5 }}>
              Your Auth0 Universal Login can offer Google, GitHub, and email/password depending on the connections enabled in your Auth0 app.
            </div>
          )}
        </div>

        <div className="divider" />

        <div style={{ display: "flex", flexDirection: "column", gap: "8px", opacity: signedIn ? 1 : 0.5 }}>
          <div style={{ fontSize: "11px", color: "#64748b", letterSpacing: "0.6px", textTransform: "uppercase", fontWeight: "600" }}>
            Quick Presets
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
            {Object.entries(PRESETS).map(([name, preset]) => {
              const isActive = activePreset === name;
              const isHovered = hoveredPreset === name;
              return (
                <button
                  key={name}
                  onClick={() => handlePreset(name)}
                  onMouseEnter={() => setHoveredPreset(name)}
                  onMouseLeave={() => setHoveredPreset(null)}
                  disabled={!signedIn}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-start",
                    gap: "5px",
                    padding: "11px 12px",
                    background: isActive
                      ? preset.accentBg
                      : isHovered
                        ? "rgba(255,255,255,0.05)"
                        : "rgba(255,255,255,0.025)",
                    border: `1px solid ${isActive ? preset.accentBorder : isHovered ? "rgba(255,255,255,0.12)" : "rgba(255,255,255,0.06)"}`,
                    borderRadius: "12px",
                    cursor: signedIn ? "pointer" : "not-allowed",
                    transition: "all 0.18s ease",
                    textAlign: "left",
                    boxShadow: isActive
                      ? `0 0 18px ${preset.accentBg}, inset 0 1px 0 rgba(255,255,255,0.05)`
                      : isHovered
                        ? "0 4px 16px rgba(0,0,0,0.2)"
                        : "none",
                    transform: isHovered && !isActive && signedIn ? "translateY(-1px)" : "none",
                    opacity: signedIn ? 1 : 0.65,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                    <span style={{ fontSize: "18px", lineHeight: 1 }}>{preset.icon}</span>
                    {isActive && (
                      <span
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          background: preset.accent,
                          boxShadow: `0 0 6px ${preset.accent}`,
                          flexShrink: 0,
                        }}
                      />
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: "13px",
                      fontWeight: "600",
                      fontFamily: "'Space Grotesk', sans-serif",
                      color: isActive ? preset.accent : "#e2e8f0",
                      transition: "color 0.18s",
                    }}
                  >
                    {preset.label}
                  </div>
                  <div
                    style={{
                      fontSize: "10.5px",
                      color: "#475569",
                      fontFamily: "'Space Grotesk', sans-serif",
                      lineHeight: 1.3,
                    }}
                  >
                    {preset.description}
                  </div>
                  <div
                    style={{
                      fontSize: "10px",
                      color: isActive ? preset.accent : "#334155",
                      fontFamily: "monospace",
                      letterSpacing: "0.2px",
                      transition: "color 0.18s",
                      opacity: isHovered || isActive ? 1 : 0.7,
                    }}
                  >
                    {preset.demo}
                  </div>
                </button>
              );
            })}
          </div>
          <div
            style={{
              fontSize: "11px",
              color: "#334155",
              textAlign: "center",
              minHeight: "16px",
              transition: "opacity 0.2s",
              opacity: hoveredPreset ? 1 : 0,
            }}
          >
            {hoveredPreset ? PRESETS[hoveredPreset].demoHint : ""}
          </div>
        </div>

        <div className="divider" />

        <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
          <label style={{ fontSize: "11px", color: "#64748b", letterSpacing: "0.6px", textTransform: "uppercase", fontWeight: "600" }}>
            Custom Instruction
          </label>
          <textarea
            style={{
              width: "100%",
              minHeight: "90px",
              background: "rgba(15,15,30,0.8)",
              border: "1px solid rgba(139,92,246,0.2)",
              borderRadius: "12px",
              color: "#e2e8f0",
              padding: "12px 14px",
              fontSize: "14px",
              resize: "vertical",
              outline: "none",
              fontFamily: "'Space Grotesk', sans-serif",
              lineHeight: "1.6",
              transition: "border-color 0.2s, box-shadow 0.2s",
              backdropFilter: "blur(8px)",
              opacity: signedIn ? 1 : 0.6,
            }}
            placeholder={signedIn ? 'e.g. "hide all MrBeast videos" or "make all text blue"' : "Sign in to unlock prompting"}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleTransform();
            }}
            disabled={loading || !signedIn}
          />
          <div style={{ fontSize: "11px", color: "#334155", textAlign: "right" }}>
            ⌘↵ to run
          </div>
        </div>

        <button className="transform-btn" onClick={handleTransform} disabled={isDisabled}>
          {loading ? (
            <>
              <span className="spinner" />
              Analyzing page...
            </>
          ) : signedIn ? (
            "Transform →"
          ) : (
            "Sign In To Transform"
          )}
        </button>

        {status && (
          <div className="status-badge success">
            <span style={{ fontSize: "16px" }}>✦</span>
            {status}
          </div>
        )}

        {error && (
          <div className="status-badge error">
            <span style={{ fontSize: "14px" }}>⚠</span>
            <span style={{ wordBreak: "break-word" }}>{error}</span>
          </div>
        )}

        {log && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div className="log-header" onClick={() => setLogOpen((open) => !open)}>
              <span style={{ fontSize: "11px", color: "#64748b", letterSpacing: "0.6px", textTransform: "uppercase", fontWeight: "600" }}>
                Ops JSON
              </span>
              <span
                style={{
                  fontSize: "12px",
                  color: "#475569",
                  transition: "transform 0.2s",
                  display: "inline-block",
                  transform: logOpen ? "rotate(0deg)" : "rotate(-90deg)",
                }}
              >
                ▾
              </span>
            </div>
            {logOpen && <div className="log-box">{log}</div>}
          </div>
        )}
      </div>
    </>
  );
}
