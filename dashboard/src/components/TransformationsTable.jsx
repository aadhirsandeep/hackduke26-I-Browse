function formatTimestamp(timestamp) {
  return new Date(timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function TransformationsTable({ rows, newRowIds = new Set() }) {
  return (
    <div className="table-shell">
      <table className="transformations-table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Domain</th>
            <th>Prompt</th>
            <th>Summary</th>
            <th style={{ textAlign: "center" }}>Hidden</th>
            <th style={{ textAlign: "center" }}>Removed</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id || row.request_id} className={newRowIds.has(row.id || row.request_id) ? "row--new" : ""}>
              <td><span className="table-ts">{formatTimestamp(row.created_at || row.timestamp)}</span></td>
              <td>
                <div className="domain-pill">{row.domain}</div>
              </td>
              <td className="prompt-cell">{row.prompt}</td>
              <td className="summary-cell">{row.transform_summary}</td>
              <td className="count-cell" style={{ color: row.hide_count > 0 ? "var(--amber)" : "var(--subtle)" }}>
                {row.hide_count ?? 0}
              </td>
              <td className="count-cell" style={{ color: row.remove_count > 0 ? "var(--rose)" : "var(--subtle)" }}>
                {row.remove_count ?? 0}
              </td>
              <td>
                <span className={`status-pill status-pill--${row.status}`}>
                  {row.status}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
