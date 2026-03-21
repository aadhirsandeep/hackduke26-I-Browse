function formatTimestamp(timestamp) {
  return new Date(timestamp).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function TransformationsTable({ rows }) {
  return (
    <div className="table-shell">
      <table className="transformations-table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>Domain</th>
            <th>Prompt</th>
            <th>Summary</th>
            <th>Hidden</th>
            <th>Removed</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.request_id}>
              <td>{formatTimestamp(row.timestamp)}</td>
              <td>
                <div className="domain-pill">{row.domain}</div>
              </td>
              <td className="prompt-cell">{row.prompt}</td>
              <td>{row.transform_summary}</td>
              <td>{row.hide_count}</td>
              <td>{row.remove_count}</td>
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
