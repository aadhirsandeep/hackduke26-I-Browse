import { useEffect, useMemo, useState } from "react";
import SectionCard from "./components/SectionCard.jsx";
import StatCard from "./components/StatCard.jsx";
import TransformationsTable from "./components/TransformationsTable.jsx";
import InsightList from "./components/InsightList.jsx";
import UsageMeter from "./components/UsageMeter.jsx";
import EmptyState from "./components/EmptyState.jsx";
import { CHROME_EXTENSION_URL, DASHBOARD_HOME_URL } from "./constants.js";
import { deriveDashboardAnalytics } from "./lib/analytics.js";
import { resolveTemporaryUserId } from "./lib/identity.js";
import { isSupabaseConfigured, supabase } from "./lib/supabase.js";

export default function App() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [emptyReason, setEmptyReason] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadAnalytics() {
      setLoading(true);
      setError("");
      setEmptyReason("");

      const temporaryUserId = resolveTemporaryUserId();
      console.debug("I Browse dashboard: resolved temp user id", temporaryUserId);
      if (!temporaryUserId) {
        setEvents([]);
        setLoading(false);
        setEmptyReason("Open the dashboard from the extension first so the temporary local user id is passed into the page.");
        return;
      }

      if (!isSupabaseConfigured || !supabase) {
        setEvents([]);
        setLoading(false);
        setEmptyReason("Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to the dashboard environment to load analytics.");
        return;
      }

      try {
        console.debug("I Browse dashboard: looking up user for temp id", temporaryUserId);
        const userResult = await supabase
          .from("users")
          .select("id")
          .eq("external_auth_id", temporaryUserId)
          .limit(1)
          .maybeSingle();

        if (userResult.error) {
          throw userResult.error;
        }

        console.debug("I Browse dashboard: user lookup result", userResult.data);

        if (!userResult.data?.id) {
          setEvents([]);
          setEmptyReason("No transform events have been recorded yet for this temporary local user.");
          return;
        }

        console.debug("I Browse dashboard: fetching transform_events for user", userResult.data.id);
        const eventsResult = await supabase
          .from("transform_events")
          .select("*")
          .eq("user_id", userResult.data.id)
          .order("created_at", { ascending: false })
          .limit(100);

        if (eventsResult.error) {
          throw eventsResult.error;
        }

        if (!cancelled) {
          console.debug("I Browse dashboard: transform_events fetched", eventsResult.data?.length || 0);
          setEvents(eventsResult.data || []);
          if (!eventsResult.data?.length) {
            setEmptyReason("Your identity is wired up, but no transform events have been logged yet.");
          }
        }
      } catch (fetchError) {
        if (!cancelled) {
          console.error("I Browse dashboard: analytics load failed", fetchError);
          setError(fetchError.message || "Could not load analytics data.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadAnalytics();
    const intervalId = window.setInterval(() => {
      void loadAnalytics();
    }, 5000);

    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  const analytics = useMemo(() => deriveDashboardAnalytics(events), [events]);
  const hasRows = analytics.rows.length > 0;

  return (
    <div className="dashboard-shell">
      <div className="dashboard-shell__backdrop dashboard-shell__backdrop--primary" />
      <div className="dashboard-shell__backdrop dashboard-shell__backdrop--secondary" />

      <header className="page-header">
        <div className="page-header__copy">
          <div className="brand-row">
            <div className="brand-mark">IB</div>
            <div>
              <div className="brand-name">I Browse</div>
              <div className="brand-caption">Transformation analytics companion</div>
            </div>
          </div>
          <h1>Dashboard</h1>
          <p>Track how your browser is being transformed.</p>
        </div>
        <div className="page-header__meta">
          <div className="header-actions">
            <a className="header-button header-button--secondary" href={DASHBOARD_HOME_URL}>
              Dashboard Home
            </a>
            <a
              className="header-button header-button--primary"
              href={CHROME_EXTENSION_URL}
              target="_blank"
              rel="noreferrer"
            >
              Get Chrome Extension
            </a>
          </div>
          <div className="account-chip">
            <div className="account-chip__avatar">SB</div>
            <div>
              <div className="account-chip__name">Demo Workspace</div>
              <div className="account-chip__meta">Analytics Preview</div>
            </div>
          </div>
        </div>
      </header>

      <section className="stats-grid">
        {analytics.kpiCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </section>

      <section className="dashboard-grid dashboard-grid--primary">
        <SectionCard
          title="Recent transformations"
          subtitle="Latest requests with prompt context and DOM impact counts."
          className="dashboard-grid__wide"
        >
          {loading ? (
            <EmptyState
              title="Loading analytics"
              description="Pulling the latest transform events for the current local user context."
            />
          ) : error ? (
            <EmptyState
              title="Analytics load failed"
              description={error}
            />
          ) : hasRows ? (
            <TransformationsTable rows={analytics.rows} />
          ) : (
            <EmptyState
              title="No transform events yet"
              description={emptyReason}
            />
          )}
        </SectionCard>

        <SectionCard
          title="Transformation insights"
          subtitle="High-signal patterns derived from real transform events."
        >
          {hasRows ? (
            <InsightList items={analytics.insightItems} />
          ) : (
            <EmptyState
              title="Insights appear after real usage"
              description="Run a few transforms from the extension and refresh this page to populate domain and intent patterns."
            />
          )}
        </SectionCard>
      </section>

      <section className="dashboard-grid">
        <SectionCard
          title="Content impact"
          subtitle="Aggregate-only metrics. No removed or hidden content text is stored here."
        >
          {hasRows ? (
            <InsightList items={analytics.contentImpact} />
          ) : (
            <EmptyState
              title="No content impact yet"
              description="Content impact metrics appear once transform events are logged for the current local user."
            />
          )}
        </SectionCard>

        <SectionCard
          title="Usage & billing"
          subtitle="Derived usage, pacing, and spend metrics from live analytics rows."
        >
          {hasRows ? (
            <>
              <div className="usage-grid">
                {analytics.usageBreakdown.map((item) => (
                  <UsageMeter key={item.label} {...item} />
                ))}
              </div>
              <div className="usage-summary">
                <div>
                  <span className="usage-summary__label">Estimated spend this week</span>
                  <strong>${analytics.estimatedSpendThisWeek}</strong>
                </div>
                <div>
                  <span className="usage-summary__label">Quota state</span>
                  <strong>Temporary dev tracking</strong>
                </div>
              </div>
            </>
          ) : (
            <EmptyState
              title="Usage appears once events exist"
              description="Usage and billing metrics are derived from transform_events after the extension starts logging analytics."
            />
          )}
        </SectionCard>
      </section>
    </div>
  );
}
