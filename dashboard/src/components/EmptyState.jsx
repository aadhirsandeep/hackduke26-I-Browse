export default function EmptyState({ title, description }) {
  return (
    <div className="empty-state">
      <div className="empty-state__eyebrow">No Analytics Yet</div>
      <div className="empty-state__title">{title}</div>
      <div className="empty-state__description">{description}</div>
    </div>
  );
}
