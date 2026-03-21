import React, { useState } from "react";
import { DASHBOARD_URL } from "./config.js";

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

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [logOpen, setLogOpen] = useState(true);
  const [activePreset, setActivePreset] = useState(null);
  const [hoveredPreset, setHoveredPreset] = useState(null);

  const handleTransform = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setLog("");
    setStatus("");
    setError("");

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error("No active tab found");

      let snapshot;
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { type: "getSnapshot" });
        snapshot = response.snapshot;
      } catch (e) {
        throw new Error("Could not reach content script. Try refreshing the page.");
      }

      const res = await fetch("http://localhost:8000/transform", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: prompt.trim(), snapshot }),
      });

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
    const preset = PRESETS[name];
    setError("");
    setStatus("");
    setLog("");
    try {
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

  const handleOpenDashboard = async () => {
    await chrome.tabs.create({ url: DASHBOARD_URL });
  };

  const isDisabled = loading || !prompt.trim();

  return (
    <>
      <div className="orb" />
      <div className="orb2" />
      <div className="app-container">

        {/* Header */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{
              fontSize: "22px",
              fontWeight: "700",
              background: "linear-gradient(135deg, #a5b4fc, #c4b5fd, #67e8f9)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              letterSpacing: "-0.5px",
            }}>
              I Browse
            </span>
            <div className="live-dot" title="Active" />
          </div>
          <div style={{ fontSize: "11px", color: "#475569", letterSpacing: "0.8px", textTransform: "uppercase", fontWeight: "500" }}>
            transform your web
          </div>
        </div>

        <div className="divider" />

        {/* Preset buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
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
                    cursor: "pointer",
                    transition: "all 0.18s ease",
                    textAlign: "left",
                    boxShadow: isActive
                      ? `0 0 18px ${preset.accentBg}, inset 0 1px 0 rgba(255,255,255,0.05)`
                      : isHovered
                        ? "0 4px 16px rgba(0,0,0,0.2)"
                        : "none",
                    transform: isHovered && !isActive ? "translateY(-1px)" : "none",
                  }}
                >
                  {/* Top row: icon + active indicator */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                    <span style={{ fontSize: "18px", lineHeight: 1 }}>{preset.icon}</span>
                    {isActive && (
                      <span style={{
                        width: "6px", height: "6px", borderRadius: "50%",
                        background: preset.accent,
                        boxShadow: `0 0 6px ${preset.accent}`,
                        flexShrink: 0,
                      }} />
                    )}
                  </div>
                  {/* Label */}
                  <div style={{
                    fontSize: "13px",
                    fontWeight: "600",
                    fontFamily: "'Space Grotesk', sans-serif",
                    color: isActive ? preset.accent : "#e2e8f0",
                    transition: "color 0.18s",
                  }}>
                    {preset.label}
                  </div>
                  {/* Description */}
                  <div style={{
                    fontSize: "10.5px",
                    color: "#475569",
                    fontFamily: "'Space Grotesk', sans-serif",
                    lineHeight: 1.3,
                  }}>
                    {preset.description}
                  </div>
                  {/* Demo site hint */}
                  <div style={{
                    fontSize: "10px",
                    color: isActive ? preset.accent : "#334155",
                    fontFamily: "monospace",
                    letterSpacing: "0.2px",
                    transition: "color 0.18s",
                    opacity: isHovered || isActive ? 1 : 0.7,
                  }}>
                    {preset.demo}
                  </div>
                </button>
              );
            })}
          </div>
          {/* Hint text that changes based on hovered preset */}
          <div style={{
            fontSize: "11px",
            color: "#334155",
            textAlign: "center",
            minHeight: "16px",
            transition: "opacity 0.2s",
            opacity: hoveredPreset ? 1 : 0,
          }}>
            {hoveredPreset ? PRESETS[hoveredPreset].demoHint : ""}
          </div>
        </div>

        <div className="divider" />

        {/* Prompt area */}
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
            }}
            placeholder='e.g. "hide all MrBeast videos" or "make all text blue"'
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleTransform();
            }}
            disabled={loading}
          />
          <div style={{ fontSize: "11px", color: "#334155", textAlign: "right" }}>
            ⌘↵ to run
          </div>
        </div>

        {/* Transform button */}
        <button
          className="transform-btn"
          onClick={handleTransform}
          disabled={isDisabled}
        >
          {loading ? (
            <>
              <span className="spinner" />
              Analyzing page…
            </>
          ) : (
            "Transform →"
          )}
        </button>

        <button
          onClick={handleOpenDashboard}
          style={{
            width: "100%",
            padding: "11px 14px",
            border: "1px solid rgba(103,232,249,0.22)",
            background: "rgba(103,232,249,0.08)",
            color: "#67e8f9",
            borderRadius: "12px",
            fontSize: "13px",
            fontWeight: "600",
            cursor: "pointer",
            letterSpacing: "0.2px",
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.04)",
          }}
        >
          Open Dashboard
        </button>

        {/* Status */}
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

        {/* Log */}
        {log && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div className="log-header" onClick={() => setLogOpen((o) => !o)}>
              <span style={{ fontSize: "11px", color: "#64748b", letterSpacing: "0.6px", textTransform: "uppercase", fontWeight: "600" }}>
                Ops JSON
              </span>
              <span style={{ fontSize: "12px", color: "#475569", transition: "transform 0.2s", display: "inline-block", transform: logOpen ? "rotate(0deg)" : "rotate(-90deg)" }}>
                ▾
              </span>
            </div>
            {logOpen && (
              <div className="log-box">{log}</div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
