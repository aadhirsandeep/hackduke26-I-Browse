export default function UsageMeter({ label, current, total, helper, tone }) {
  const pct = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;

  return (
    <div className="usage-meter">
      <div className="usage-meter__header">
        <span className="usage-meter__label">{label}</span>
        <span className="usage-meter__pct">{pct}%</span>
      </div>
      <div className="usage-meter__track">
        <div
          className={`usage-meter__fill usage-meter__fill--${tone}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {helper && <div className="usage-meter__helper">{helper}</div>}
    </div>
  );
}
