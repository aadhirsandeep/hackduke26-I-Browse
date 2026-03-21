import SectionCard from "./components/SectionCard.jsx";
import StatCard from "./components/StatCard.jsx";
import TransformationsTable from "./components/TransformationsTable.jsx";
import InsightList from "./components/InsightList.jsx";
import UsageMeter from "./components/UsageMeter.jsx";
import { CHROME_EXTENSION_URL, DASHBOARD_HOME_URL } from "./constants.js";
import {
  contentImpact,
  dashboardSummary,
  insightItems,
  transformationEvents,
  usageBreakdown,
} from "./data/mockAnalytics.js";

const kpiCards = [
  {
    label: "Total transformation requests",
    value: dashboardSummary.totalTransformationRequests,
    detail: "All mocked extension requests captured in this workspace",
    accent: "violet",
  },
  {
    label: "Successful transforms",
    value: dashboardSummary.successfulTransforms,
    detail: "Requests that produced usable DOM operations",
    accent: "emerald",
  },
  {
    label: "Estimated API requests remaining",
    value: dashboardSummary.estimatedApiRequestsRemaining,
    detail: "Remaining capacity before the current mock quota resets",
    accent: "cyan",
  },
  {
    label: "Total elements hidden",
    value: dashboardSummary.totalElementsHidden,
    detail: "Aggregate nodes visually suppressed across transforms",
    accent: "amber",
  },
  {
    label: "Total elements removed",
    value: dashboardSummary.totalElementsRemoved,
    detail: "Aggregate nodes removed from rendered pages",
    accent: "rose",
  },
  {
    label: "Total pages transformed",
    value: dashboardSummary.totalPagesTransformed,
    detail: "Page sessions processed in the current demo dataset",
    accent: "indigo",
  },
];

export default function App() {
  // Replace mocked JSON here with real backend analytics payloads once event ingestion exists.
  const rows = transformationEvents;

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
        {kpiCards.map((card) => (
          <StatCard key={card.label} {...card} />
        ))}
      </section>

      <section className="dashboard-grid dashboard-grid--primary">
        <SectionCard
          title="Recent transformations"
          subtitle="Latest requests with prompt context and DOM impact counts."
          className="dashboard-grid__wide"
        >
          <TransformationsTable rows={rows} />
        </SectionCard>

        <SectionCard
          title="Transformation insights"
          subtitle="High-signal patterns from the current mocked dataset."
        >
          <InsightList items={insightItems} />
        </SectionCard>
      </section>

      <section className="dashboard-grid">
        <SectionCard
          title="Content impact"
          subtitle="Aggregate-only metrics. No removed or hidden content text is stored here."
        >
          <InsightList items={contentImpact} />
        </SectionCard>

        <SectionCard
          title="Usage & billing"
          subtitle="Quota, pacing, and spend metrics ready to swap to live usage APIs."
        >
          <div className="usage-grid">
            {usageBreakdown.map((item) => (
              <UsageMeter key={item.label} {...item} />
            ))}
          </div>
          <div className="usage-summary">
            <div>
              <span className="usage-summary__label">Estimated spend this week</span>
              <strong>${dashboardSummary.estimatedSpendThisWeek}</strong>
            </div>
            <div>
              <span className="usage-summary__label">Quota state</span>
              <strong>Mocked live tracking</strong>
            </div>
          </div>
        </SectionCard>
      </section>
    </div>
  );
}
