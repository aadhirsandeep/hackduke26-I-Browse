import React, { useState } from "react";

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [logOpen, setLogOpen] = useState(true);

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

  const isDisabled = loading || !prompt.trim();

  return (
    <>
      <div className="orb" />
      <div className="orb2" />
      <div className="app-container">

        {/* Header */}
        <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
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
            </div>
            <div className="live-dot" title="Active" />
          </div>
          <div style={{ fontSize: "11px", color: "#475569", letterSpacing: "0.8px", textTransform: "uppercase", fontWeight: "500" }}>
            transform your web
          </div>
        </div>

        <div className="divider" />

        {/* Prompt area */}
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
          <label style={{ fontSize: "11px", color: "#64748b", letterSpacing: "0.6px", textTransform: "uppercase", fontWeight: "600" }}>
            Instruction
          </label>
          <textarea
            style={{
              width: "100%",
              minHeight: "100px",
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

        {/* Button */}
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
