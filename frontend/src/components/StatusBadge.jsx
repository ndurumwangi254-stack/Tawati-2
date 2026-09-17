import { badge } from '../styles/ui'

// variant: 'ok' (green, genuinely fine) | 'low' (amber-red, needs attention)
// | 'critical' (solid red, urgent) | 'info' (blue, informational) | 'muted'
export default function StatusBadge({ variant = 'muted', children }) {
  return <span className={badge[variant]}>{children}</span>
}
