import React, { useState, useRef, useEffect, useCallback } from "react";

const ELEVENLABS_API_KEY = "sk_ce781fbefe729976f84005e9b25c534e65081973bd176b39";
const VOICE_ID = "JBFqnCBsd6RMkjVDRZzb"; // ElevenLabs "George" voice

async function getPageText() {
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return "";
    const res = await Promise.race([
      chrome.tabs.sendMessage(tab.id, { type: "getPageText" }),
      new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 1500)),
    ]);
    return res?.text || "";
  } catch { return ""; }
}

async function askGemini(message, pageContext) {
  const res = await fetch("http://localhost:8000/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, page_context: pageContext }),
  });
  if (!res.ok) throw new Error(`Backend error ${res.status}`);
  const { reply } = await res.json();
  return reply;
}

async function speakWithElevenLabs(text) {
  const res = await fetch("http://localhost:8000/tts", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  if (!res.ok) throw new Error(`TTS failed: ${res.status}`);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  await new Promise((resolve, reject) => {
    audio.onended = resolve;
    audio.onerror = reject;
    audio.play().catch(reject);
  });
  URL.revokeObjectURL(url);
}

export default function TalkToPage() {
  const [status, setStatus] = useState("idle"); // idle | listening | thinking | speaking
  const [messages, setMessages] = useState([]);
  const [error, setError] = useState("");
  const recognitionRef = useRef(null);
  const pageContextRef = useRef("");
  const chatEndRef = useRef(null);
  const isActive = status !== "idle";

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const addMessage = (source, text) =>
    setMessages((p) => [...p, { id: Date.now() + Math.random(), source, text }]);

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    recognitionRef.current = null;
    setStatus("idle");
  }, []);

  const startListening = useCallback(async () => {
    setError("");
    pageContextRef.current = await getPageText();

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setError("Speech recognition not supported."); return; }

    const recognition = new SR();
    recognition.lang = "en-US";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognitionRef.current = recognition;

    recognition.onstart = () => setStatus("listening");

    recognition.onresult = async (e) => {
      const transcript = e.results[0][0].transcript.trim();
      if (!transcript) { setStatus("idle"); return; }

      addMessage("user", transcript);
      setStatus("thinking");

      try {
        const reply = await askGemini(transcript, pageContextRef.current);
        addMessage("ai", reply);
        setStatus("speaking");
        await speakWithElevenLabs(reply);
      } catch (err) {
        setError(err.message);
      } finally {
        setStatus("idle");
        recognitionRef.current = null;
      }
    };

    recognition.onerror = (e) => {
      if (e.error !== "aborted") setError(`Mic error: ${e.error}`);
      setStatus("idle");
    };

    recognition.onend = () => {
      // Only reset if we haven't already moved past listening (e.g. into thinking/speaking)
      setStatus((prev) => (prev === "listening" ? "idle" : prev));
    };

    recognition.start();
  }, []);

  const handleToggle = useCallback(() => {
    if (isActive) { stopListening(); return; }
    startListening();
  }, [isActive, startListening, stopListening]);

  const statusLabel = { idle: "Click to speak", listening: "Listening…", thinking: "Thinking…", speaking: "Speaking…" }[status];
  const statusColor = { idle: "#475569", listening: "#67e8f9", thinking: "#a5b4fc", speaking: "#c4b5fd" }[status];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div className="divider" />
      <div style={{ fontSize: "11px", color: "#64748b", letterSpacing: "0.6px", textTransform: "uppercase", fontWeight: "600" }}>
        Talk to the Page
      </div>

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "10px" }}>
        <button
          onClick={handleToggle}
          disabled={status === "thinking" || status === "speaking"}
          style={{
            width: "64px", height: "64px", borderRadius: "50%",
            border: isActive ? `2px solid ${statusColor}` : "2px solid rgba(103,232,249,0.2)",
            background: isActive ? `${statusColor}18` : "rgba(255,255,255,0.04)",
            cursor: (status === "thinking" || status === "speaking") ? "not-allowed" : "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            transition: "all 0.25s ease",
            boxShadow: status === "listening" ? `0 0 28px ${statusColor}66` : isActive ? `0 0 16px ${statusColor}44` : "none",
            animation: status === "listening" ? "mic-ring 1.6s ease-in-out infinite" : "none",
            flexShrink: 0,
          }}
        >
          {status === "thinking" ? (
            <span style={{ width: "18px", height: "18px", border: "2px solid rgba(165,180,252,0.3)", borderTop: "2px solid #a5b4fc", borderRadius: "50%", display: "inline-block", animation: "ttpage-spin 0.7s linear infinite" }} />
          ) : isActive ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill={statusColor}>
              <rect x="6" y="6" width="12" height="12" rx="2" />
            </svg>
          ) : (
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="2" width="6" height="11" rx="3" />
              <path d="M5 10a7 7 0 0 0 14 0" />
              <line x1="12" y1="19" x2="12" y2="22" />
              <line x1="8" y1="22" x2="16" y2="22" />
            </svg>
          )}
        </button>

        <div style={{ fontSize: "11.5px", color: statusColor, letterSpacing: "0.3px", transition: "color 0.2s", minHeight: "16px", display: "flex", alignItems: "center", gap: "6px" }}>
          {isActive && status !== "thinking" && (
            <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: statusColor, display: "inline-block", boxShadow: `0 0 6px ${statusColor}`, animation: "ttpage-pulse 1.4s ease-in-out infinite" }} />
          )}
          {statusLabel}
        </div>
      </div>

      {error && (
        <div style={{ fontSize: "12px", color: "#fca5a5", background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", borderRadius: "8px", padding: "8px 12px" }}>
          ⚠ {error}
        </div>
      )}

      {messages.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px", maxHeight: "200px", overflowY: "auto", padding: "2px" }}>
          {messages.map((msg) => {
            const isUser = msg.source === "user";
            return (
              <div key={msg.id} style={{ display: "flex", justifyContent: isUser ? "flex-end" : "flex-start" }}>
                <div style={{
                  maxWidth: "85%", padding: "8px 12px",
                  borderRadius: isUser ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                  background: isUser ? "rgba(139,92,246,0.22)" : "rgba(10,10,25,0.9)",
                  border: isUser ? "1px solid rgba(139,92,246,0.35)" : "1px solid rgba(255,255,255,0.06)",
                  borderLeft: !isUser ? "3px solid rgba(103,232,249,0.5)" : undefined,
                  fontSize: "12.5px", lineHeight: "1.55",
                  color: isUser ? "#e2e8f0" : "#cbd5e1", wordBreak: "break-word",
                }}>
                  {msg.text}
                </div>
              </div>
            );
          })}
          <div ref={chatEndRef} />
        </div>
      )}

      <style>{`
        @keyframes ttpage-pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.4;transform:scale(.7)} }
        @keyframes ttpage-spin { to{transform:rotate(360deg)} }
        @keyframes mic-ring { 0%,100%{box-shadow:0 0 20px ${statusColor}44} 50%{box-shadow:0 0 36px ${statusColor}99} }
      `}</style>
    </div>
  );
}
