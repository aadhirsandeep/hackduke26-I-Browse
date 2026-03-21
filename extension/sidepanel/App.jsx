import React, { useState } from "react";

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    padding: "16px",
    gap: "12px",
    background: "#0f0f0f",
    color: "#e0e0e0",
  },
  header: {
    fontSize: "18px",
    fontWeight: "700",
    color: "#a78bfa",
    letterSpacing: "-0.5px",
  },
  textarea: {
    width: "100%",
    minHeight: "80px",
    background: "#1a1a1a",
    border: "1px solid #333",
    borderRadius: "8px",
    color: "#e0e0e0",
    padding: "10px",
    fontSize: "14px",
    resize: "vertical",
    outline: "none",
  },
  button: {
    padding: "10px 16px",
    background: "#7c3aed",
    color: "#fff",
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
    fontSize: "14px",
    transition: "background 0.2s",
  },
  buttonDisabled: {
    background: "#4b2d8a",
    cursor: "not-allowed",
  },
  status: {
    fontSize: "13px",
    color: "#6ee7b7",
    fontWeight: "500",
  },
  error: {
    fontSize: "13px",
    color: "#f87171",
  },
  logBox: {
    flex: 1,
    background: "#1a1a1a",
    border: "1px solid #333",
    borderRadius: "8px",
    padding: "10px",
    overflowY: "auto",
    fontSize: "12px",
    fontFamily: "monospace",
    whiteSpace: "pre-wrap",
    wordBreak: "break-all",
    color: "#a3e635",
  },
};

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const handleTransform = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setLog("");
    setStatus("");
    setError("");

    try {
      // 1. Get active tab
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab?.id) throw new Error("No active tab found");

      // 2. Get DOM snapshot from content script
      let snapshot;
      try {
        const response = await chrome.tabs.sendMessage(tab.id, { type: "getSnapshot" });
        snapshot = response.snapshot;
      } catch (e) {
        throw new Error("Could not reach content script. Try refreshing the page.");
      }

      // 3. POST to FastAPI backend
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

      // 4. Send ops to content script
      await chrome.tabs.sendMessage(tab.id, { type: "applyOps", ops });
      setStatus("✓ Applied successfully");
    } catch (err) {
      setError(err.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  const isDisabled = loading || !prompt.trim();

  return (
    <div style={styles.container}>
      <div style={styles.header}>I Browse</div>

      <textarea
        style={styles.textarea}
        placeholder='Describe a transformation, e.g. "hide all images"'
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleTransform();
        }}
        disabled={loading}
      />

      <button
        style={{ ...styles.button, ...(isDisabled ? styles.buttonDisabled : {}) }}
        onClick={handleTransform}
        disabled={isDisabled}
      >
        {loading ? "Transforming…" : "Transform ↵"}
      </button>

      {status && <div style={styles.status}>{status}</div>}
      {error && <div style={styles.error}>⚠ {error}</div>}

      {log && (
        <>
          <div style={{ fontSize: "12px", color: "#888" }}>Gemini response (ops JSON):</div>
          <div style={styles.logBox}>{log}</div>
        </>
      )}
    </div>
  );
}
