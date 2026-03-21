export default function SectionCard({ title, subtitle, actions, children, className = "" }) {
  return (
    <section className={`section-card ${className}`.trim()}>
      <div className="section-card__header">
        <div>
          <div className="section-card__title">{title}</div>
          {subtitle ? <div className="section-card__subtitle">{subtitle}</div> : null}
        </div>
        {actions ? <div className="section-card__actions">{actions}</div> : null}
      </div>
      <div className="section-card__body">{children}</div>
    </section>
  );
}
