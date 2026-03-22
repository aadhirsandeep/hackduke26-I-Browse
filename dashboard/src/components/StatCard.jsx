export default function StatCard({ label, value, detail, accent, icon, delta }) {
  return (
    <div className={`stat-card stat-card--${accent}`}>
      <div className="stat-card__glow" />
      <div className="stat-card__top">
        <span className="stat-card__label">{label}</span>
        {icon && <div className="stat-card__icon">{icon}</div>}
      </div>
      <div className="stat-card__value">{value}</div>
      {delta && <div className="stat-card__delta">↑ {delta}</div>}
      <div className="stat-card__detail">{detail}</div>
    </div>
  );
}
