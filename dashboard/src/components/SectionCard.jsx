export default function SectionCard({ title, subtitle, actions, badge, children, className = "" }) {
  return (
    <section className={`section-card ${className}`.trim()}>
      <div className="section-card__header">
        <div className="section-card__title-group">
          <div className="section-card__title">{title}</div>
          {subtitle ? <div className="section-card__subtitle">{subtitle}</div> : null}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {badge && <span className="section-card__badge">{badge}</span>}
          {actions}
        </div>
      </div>
      <div className="section-card__body">{children}</div>
    </section>
  );
}
