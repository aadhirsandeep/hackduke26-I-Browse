export default function StatCard({ label, value, detail, accent }) {
  return (
    <div className="stat-card">
      <div className="stat-card__label-row">
        <span className="stat-card__label">{label}</span>
        <span className={`stat-card__accent stat-card__accent--${accent}`} />
      </div>
      <div className="stat-card__value">{value}</div>
      <div className="stat-card__detail">{detail}</div>
    </div>
  );
}
