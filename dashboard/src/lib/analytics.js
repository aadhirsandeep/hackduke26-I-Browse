function formatCompactNumber(value) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
}

function formatPercent(value) {
  return `${Math.round(value)}%`;
}

function summarizeTransform(row) {
  if (row.status === "failed") {
    return row.error_message ? `Failed: ${row.error_message}` : "Transform failed";
  }

  const parts = [];
  if (row.preset_used) parts.push(`${row.preset_used} preset`);
  if (row.hide_count) parts.push(`${row.hide_count} hidden`);
  if (row.remove_count) parts.push(`${row.remove_count} removed`);
  if (row.restyle_count) parts.push(`${row.restyle_count} restyled`);
  if (row.inject_count) parts.push(`${row.inject_count} injected`);

  return parts.join(" • ") || "Transform applied";
}

function classifyIntent(prompt, presetUsed) {
  const source = `${presetUsed || ""} ${prompt}`.toLowerCase();
  if (source.includes("reader") || source.includes("reading")) return "Reading mode";
  if (source.includes("focus")) return "Focus mode";
  if (source.includes("hide") || source.includes("remove") || source.includes("delete")) return "Declutter";
  if (source.includes("dark") || source.includes("cinematic")) return "Visual theme";
  if (source.includes("sensory") || source.includes("stimulation")) return "Low stimulation";
  return "Custom styling";
}

function topCounts(items, limit = 3) {
  return Object.entries(items)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([label, count]) => `${label} (${count})`)
    .join(", ");
}

export function deriveDashboardAnalytics(events) {
  const rows = events.map((event) => ({
    ...event,
    transform_summary: summarizeTransform(event),
  }));

  const totalTransforms = rows.length;
  const successfulTransforms = rows.filter((row) => row.status === "success").length;
  const totalHiddenNodes = rows.reduce((sum, row) => sum + row.hide_count, 0);
  const totalRemovedNodes = rows.reduce((sum, row) => sum + row.remove_count, 0);
  const totalSpend = rows.reduce((sum, row) => sum + (row.estimated_api_cost || 0), 0);
  const totalPagesTransformed = totalTransforms;
  const totalQuota = 1000;
  const estimatedApiRequestsRemaining = Math.max(totalQuota - totalTransforms, 0);
  const hideUsageCount = rows.filter((row) => row.hide_count > 0).length;
  const removeUsageCount = rows.filter((row) => row.remove_count > 0).length;

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const weekStart = new Date(todayStart);
  weekStart.setDate(todayStart.getDate() - 6);

  const requestsToday = rows.filter((row) => new Date(row.created_at) >= todayStart).length;
  const requestsThisWeek = rows.filter((row) => new Date(row.created_at) >= weekStart).length;

  const domainCounts = {};
  const intentCounts = {};
  let presetCount = 0;

  rows.forEach((row) => {
    domainCounts[row.domain] = (domainCounts[row.domain] || 0) + 1;
    const intent = classifyIntent(row.prompt, row.preset_used);
    intentCounts[intent] = (intentCounts[intent] || 0) + 1;
    if (row.preset_used) presetCount += 1;
  });

  const customCount = totalTransforms - presetCount;

  return {
    rows,
    kpiCards: [
      {
        label: "Total transformation requests",
        value: totalTransforms,
        detail: "All logged requests for the current temporary user",
        accent: "violet",
      },
      {
        label: "Successful transforms",
        value: successfulTransforms,
        detail: "Requests that produced usable DOM operations",
        accent: "emerald",
      },
      {
        label: "Estimated API requests remaining",
        value: estimatedApiRequestsRemaining,
        detail: "Derived from a temporary 1000-request demo quota",
        accent: "cyan",
      },
      {
        label: "Total elements hidden",
        value: totalHiddenNodes,
        detail: "Aggregate nodes visually suppressed across transforms",
        accent: "amber",
      },
      {
        label: "Total elements removed",
        value: totalRemovedNodes,
        detail: "Aggregate nodes removed from rendered pages",
        accent: "rose",
      },
      {
        label: "Total pages transformed",
        value: totalPagesTransformed,
        detail: "Transform requests captured for this current demo user",
        accent: "indigo",
      },
    ],
    insightItems: [
      {
        label: "Most frequently transformed domains",
        value: topCounts(domainCounts) || "No domains yet",
      },
      {
        label: "Most common transformation intents",
        value: topCounts(intentCounts) || "No intent patterns yet",
      },
      {
        label: "Average hidden elements per request",
        value: totalTransforms ? formatCompactNumber(totalHiddenNodes / totalTransforms) : "0",
      },
      {
        label: "Average removed elements per request",
        value: totalTransforms ? formatCompactNumber(totalRemovedNodes / totalTransforms) : "0",
      },
      {
        label: "Custom prompts vs presets",
        value: totalTransforms
          ? `Custom prompts ${formatPercent((customCount / totalTransforms) * 100)} vs presets ${formatPercent((presetCount / totalTransforms) * 100)}`
          : "No transform mix yet",
      },
    ],
    contentImpact: [
      { label: "Total hidden nodes", value: totalHiddenNodes },
      { label: "Total removed nodes", value: totalRemovedNodes },
      {
        label: "Average DOM elements affected per transform",
        value: totalTransforms ? formatCompactNumber((totalHiddenNodes + totalRemovedNodes) / totalTransforms) : "0",
      },
      {
        label: "Transforms using hide",
        value: totalTransforms ? formatPercent((hideUsageCount / totalTransforms) * 100) : "0%",
      },
      {
        label: "Transforms using remove",
        value: totalTransforms ? formatPercent((removeUsageCount / totalTransforms) * 100) : "0%",
      },
    ],
    usageBreakdown: [
      {
        label: "Estimated API quota used",
        current: totalTransforms,
        total: totalQuota,
        tone: "violet",
        helper: `${totalTransforms} of ${totalQuota} request units consumed`,
      },
      {
        label: "Estimated quota remaining",
        current: estimatedApiRequestsRemaining,
        total: totalQuota,
        tone: "cyan",
        helper: `${estimatedApiRequestsRemaining} request units available`,
      },
      {
        label: "Requests today",
        current: requestsToday,
        total: Math.max(requestsToday, 1),
        tone: "emerald",
        helper: "Current-day volume for this temporary user context",
      },
      {
        label: "Requests this week",
        current: requestsThisWeek,
        total: Math.max(requestsThisWeek, 1),
        tone: "amber",
        helper: "Rolling 7-day request volume for this demo user",
      },
    ],
    estimatedSpendThisWeek: Number(totalSpend.toFixed(6)),
  };
}
