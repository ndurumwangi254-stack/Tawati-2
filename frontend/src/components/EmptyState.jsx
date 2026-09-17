import { btn } from '../styles/ui'

export default function EmptyState({ icon = '📦', title, description, actionLabel, onAction }) {
  return (
    <div className="text-center py-14 px-4 text-muted">
      <div className="text-3xl mb-3">{icon}</div>
      <h3 className="text-ink text-base mb-1">{title}</h3>
      {description && <p className="text-sm">{description}</p>}
      {actionLabel && (
        <button className={`${btn.primary} mt-4`} onClick={onAction}>
          {actionLabel}
        </button>
      )}
    </div>
  )
}
