export default function UsageMeter({ label, current, total, helper, tone }) {
  const pct = Math.min(100, Math.round((current / total) * 100));

  return (
    <div className="usage-meter">
      <div className="usage-meter__header">
        <span>{label}</span>
        <span>{pct}%</span>
      </div>
      <div className="usage-meter__track">
        <div
          className={`usage-meter__fill usage-meter__fill--${tone}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="usage-meter__helper">{helper}</div>
    </div>
  );
}
