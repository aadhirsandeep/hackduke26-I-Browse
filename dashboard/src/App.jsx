import { useEffect, useMemo, useRef, useState } from "react";
import SectionCard from "./components/SectionCard.jsx";
import StatCard from "./components/StatCard.jsx";
import TransformationsTable from "./components/TransformationsTable.jsx";
import InsightList from "./components/InsightList.jsx";
import UsageMeter from "./components/UsageMeter.jsx";
import { deriveDashboardAnalytics } from "./lib/analytics.js";

// ─── Mock seed data so the dashboard always looks great ──────────────────────
const MOCK_EVENTS = [
  {
    id: "mock-1", created_at: new Date(Date.now() - 2 * 60000).toISOString(),
    domain: "reddit.com", prompt: "hide all ads and promoted posts", preset_used: null,
    status: "success", hide_count: 14, remove_count: 3, restyle_count: 0, inject_count: 0,
    estimated_api_cost: 0.000042, snapshot_node_count: 312, latency_ms: 1840,
  },
  {
    id: "mock-2", created_at: new Date(Date.now() - 18 * 60000).toISOString(),
    domain: "twitter.com", prompt: "remove trending sidebar and who to follow", preset_used: null,
    status: "success", hide_count: 0, remove_count: 7, restyle_count: 0, inject_count: 0,
    estimated_api_cost: 0.000038, snapshot_node_count: 289, latency_ms: 2100,
  },
  {
    id: "mock-3", created_at: new Date(Date.now() - 45 * 60000).toISOString(),
    domain: "news.ycombinator.com", prompt: "make this look like a reading mode", preset_used: "reader",
    status: "success", hide_count: 4, remove_count: 0, restyle_count: 12, inject_count: 1,
    estimated_api_cost: 0.000055, snapshot_node_count: 198, latency_ms: 1620,
  },
  {
    id: "mock-4", created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    domain: "youtube.com", prompt: "hide comments section and sidebar recommendations", preset_used: null,
    status: "success", hide_count: 22, remove_count: 0, restyle_count: 0, inject_count: 0,
    estimated_api_cost: 0.000061, snapshot_node_count: 410, latency_ms: 2340,
  },
  {
    id: "mock-5", created_at: new Date(Date.now() - 3 * 3600000).toISOString(),
    domain: "linkedin.com", prompt: "focus mode - remove all distractions", preset_used: "focus",
    status: "success", hide_count: 18, remove_count: 5, restyle_count: 0, inject_count: 0,
    estimated_api_cost: 0.000049, snapshot_node_count: 356, latency_ms: 1980,
  },
  {
    id: "mock-6", created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
    domain: "medium.com", prompt: "dark cinematic reading theme", preset_used: null,
    status: "success", hide_count: 2, remove_count: 0, restyle_count: 24, inject_count: 2,
    estimated_api_cost: 0.000071, snapshot_node_count: 267, latency_ms: 2780,
  },
  {
    id: "mock-7", created_at: new Date(Date.now() - 8 * 3600000).toISOString(),
    domain: "reddit.com", prompt: "remove comment section entirely", preset_used: null,
    status: "success", hide_count: 0, remove_count: 31, restyle_count: 0, inject_count: 0,
    estimated_api_cost: 0.000033, snapshot_node_count: 445, latency_ms: 1450,
  },
  {
    id: "mock-8", created_at: new Date(Date.now() - 14 * 3600000).toISOString(),
    domain: "espn.com", prompt: "sensory friendly mode low stimulation", preset_used: "sensory",
    status: "failed", hide_count: 0, remove_count: 0, restyle_count: 0, inject_count: 0,
    estimated_api_cost: 0, snapshot_node_count: 512, latency_ms: 8100,
    error_message: "Response timeout",
  },
  {
    id: "mock-9", created_at: new Date(Date.now() - 22 * 3600000).toISOString(),
    domain: "twitter.com", prompt: "hide all media embeds and images", preset_used: null,
    status: "success", hide_count: 38, remove_count: 0, restyle_count: 0, inject_count: 0,
    estimated_api_cost: 0.000044, snapshot_node_count: 388, latency_ms: 1720,
  },
  {
    id: "mock-10", created_at: new Date(Date.now() - 26 * 3600000).toISOString(),
    domain: "github.com", prompt: "highlight my open PRs and issues", preset_used: null,
    status: "success", hide_count: 0, remove_count: 0, restyle_count: 8, inject_count: 3,
    estimated_api_cost: 0.000059, snapshot_node_count: 234, latency_ms: 2020,
  },
];

// ─── Merge real events on top of mock data ───────────────────────────────────
function mergeEvents(real, mock) {
  const realIds = new Set(real.map((e) => e.id));
  const filtered = mock.filter((m) => !realIds.has(m.id));
  return [...real, ...filtered].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at)
  );
}

export default function App() {
  const [realEvents, setRealEvents] = useState([]);
  const [liveEvents, setLiveEvents] = useState([]); // events from this session's transforms
  const [loading, setLoading] = useState(true);
  const [newRowIds, setNewRowIds] = useState(new Set());
  const prevCountRef = useRef(0);

  // ─── Poll backend /events every 2s ─────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    async function loadReal() {
      try {
        const res = await fetch("http://localhost:8000/events");
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setRealEvents(data || []);
      } catch (_) {
        // backend not running — mock data still shows
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void loadReal();
    const id = window.setInterval(() => void loadReal(), 2000);
    return () => { cancelled = true; window.clearInterval(id); };
  }, []);

  // ─── Listen for live transform events from the extension ───────────────────
  useEffect(() => {
    function addLiveEvent(payload) {
      const id = payload.id || crypto.randomUUID();
      const enriched = { ...payload, id, created_at: payload.created_at || new Date().toISOString() };
      setLiveEvents((prev) => [enriched, ...prev]);
      setNewRowIds((prev) => new Set([...prev, id]));
      setTimeout(() => setNewRowIds((prev) => { const n = new Set(prev); n.delete(id); return n; }), 3000);
    }

    // Listen via window.postMessage (content script relay)
    function handleWindowMessage(event) {
      if (event.data?.type === "IBROWSE_TRANSFORM_EVENT") addLiveEvent(event.data.payload);
    }
    window.addEventListener("message", handleWindowMessage);

    return () => {
      window.removeEventListener("message", handleWindowMessage);
    };
  }, []);

  // ─── Combine: live > real > mock ───────────────────────────────────────────
  const allEvents = useMemo(() => {
    const combined = mergeEvents([...liveEvents, ...realEvents], MOCK_EVENTS);
    return combined;
  }, [realEvents, liveEvents]);

  const analytics = useMemo(() => deriveDashboardAnalytics(allEvents), [allEvents]);

  // ─── Flash new row indicator on KPI when count increases ──────────────────
  useEffect(() => {
    prevCountRef.current = liveEvents.length;
  }, [liveEvents]);

  const liveCount = liveEvents.length;

  return (
    <div className="dashboard-shell">
      <div className="dashboard-shell__orb dashboard-shell__orb--1" />
      <div className="dashboard-shell__orb dashboard-shell__orb--2" />
      <div className="dashboard-shell__orb dashboard-shell__orb--3" />

      {/* ─── HEADER ─── */}
      <header className="page-header">
        <div className="page-header__left">
          <div className="brand-row">
            <img src="/logo.png" alt="Ibrowse" className="brand-logo" />
            <div>
              <div className="brand-name">Ibrowse</div>
              <div className="brand-caption">Transformation analytics</div>
            </div>
          </div>
          <h1>Dashboard</h1>
          <p className="page-header__sub">
            Real-time view of how your browser is being reshaped.
          </p>
        </div>

        <div className="page-header__right">
          <div className="header-actions">
            {liveCount > 0 && (
              <div className="live-badge">
                <span className="live-badge__dot" />
                {liveCount} live event{liveCount !== 1 ? "s" : ""}
              </div>
            )}
            <div className="live-badge" style={{ background: "rgba(52,211,153,0.08)", color: "var(--emerald)" }}>
              <span className="live-badge__dot" />
              Live
            </div>
          </div>
          <div className="header-actions">
            <button className="header-button header-button--ghost" style={{ fontSize: "0.82rem" }}>
              ⚙ Settings
            </button>
            <a
              className="header-button header-button--primary"
              href="https://chromewebstore.google.com"
              target="_blank"
              rel="noreferrer"
            >
              ↗ Extension
            </a>
          </div>
        </div>
      </header>

      {/* ─── KPI STATS ─── */}
      <section className="stats-grid">
        {analytics.kpiCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </section>

      {/* ─── MAIN GRID: Table + Insights ─── */}
      <section className="dashboard-grid dashboard-grid--primary">
        <SectionCard
          title="Recent transformations"
          subtitle="Live feed of DOM operations across all browsing sessions."
          className="dashboard-grid__wide"
          badge={`${allEvents.length} events`}
        >
          <TransformationsTable rows={analytics.rows} newRowIds={newRowIds} />
        </SectionCard>

        <SectionCard
          title="Patterns & insights"
          subtitle="Detected intent and usage patterns."
          badge="Auto-derived"
        >
          <InsightList items={analytics.insightItems} />
        </SectionCard>
      </section>

      {/* ─── SECONDARY GRID: Impact + Usage ─── */}
      <section className="dashboard-grid">
        <SectionCard
          title="Content impact"
          subtitle="Aggregate DOM changes. No content text is stored."
        >
          <InsightList items={analytics.contentImpact} />
        </SectionCard>

        <SectionCard
          title="Usage & quota"
          subtitle="API usage pacing derived from logged transform events."
        >
          <div className="usage-grid">
            {analytics.usageBreakdown.map((item) => (
              <UsageMeter key={item.label} {...item} />
            ))}
          </div>
          <div className="usage-summary">
            <div className="usage-summary__item">
              <span className="usage-summary__label">Est. spend this week</span>
              <span className="usage-summary__val">${analytics.estimatedSpendThisWeek}</span>
            </div>
            <div className="usage-summary__item">
              <span className="usage-summary__label">Quota state</span>
              <span className="usage-summary__val">Dev tracking</span>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Session overview"
          subtitle="Activity breakdown for the current analytics window."
        >
          <InsightList items={[
            { label: "Live events this session", value: liveCount > 0 ? `${liveCount} transforms captured` : "Waiting for transforms…" },
            { label: "Data source", value: realEvents.length > 0 ? `${realEvents.length} from Supabase + mock baseline` : "Mock baseline (Supabase not connected)" },
            { label: "Polling interval", value: "Every 5 seconds" },
            { label: "Most recent transform", value: allEvents[0] ? new Date(allEvents[0].created_at).toLocaleTimeString() : "—" },
          ]} />
        </SectionCard>
      </section>
    </div>
  );
}
