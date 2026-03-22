export default function InsightList({ items }) {
  return (
    <div className="insight-list">
      {items.map((item) => (
        <div className="insight-list__row" key={item.label}>
          <div className="insight-list__label">{item.label}</div>
          <div className="insight-list__value">{item.value}</div>
        </div>
      ))}
    </div>
  );
}
