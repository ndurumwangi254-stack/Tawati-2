// Shared class strings so repeated patterns (buttons, cards, badges...)
// stay consistent across pages without redefining the whole utility
// string in every file.

const btnBase =
  'inline-flex items-center justify-center gap-2 px-[18px] py-2.5 rounded-pill text-sm font-medium transition-colors disabled:cursor-not-allowed'

export const btn = {
  primary: `${btnBase} bg-primary text-white hover:bg-primary-dark disabled:bg-borderStrong`,
  secondary: `${btnBase} bg-white text-ink border border-borderStrong hover:border-ink`,
  danger: `${btnBase} bg-danger text-white hover:bg-danger/90`,
}

export const btnSm = 'px-3 py-1.5 text-[13px]'

export const card = 'bg-white border border-border rounded-[10px] p-6'
export const cardStack = 'bg-white border border-border rounded-[10px] p-6 mt-4'

export const iconBtn =
  'border-none bg-transparent cursor-pointer text-lg p-1.5 rounded-md text-ink hover:bg-gray-100'

export const field = 'flex flex-col gap-1.5 mb-4'
export const fieldLabel = 'text-[13px] font-medium text-muted'
export const fieldInput =
  'px-[11px] py-2 border border-borderStrong rounded-md text-ink bg-white text-sm focus:outline focus:outline-2 focus:outline-primary focus:border-primary'

export const searchInput =
  'px-3 py-2 border border-borderStrong rounded-md flex-1 min-w-[220px] text-sm focus:outline focus:outline-2 focus:outline-primary'

export const table = 'w-full border-collapse text-sm'
export const tableScroll = 'overflow-x-auto border border-border rounded-[10px]'
export const th = 'text-left px-3 py-2.5 font-medium text-muted border-b border-border whitespace-nowrap'
export const td = 'px-3 py-3 border-b border-border align-middle'

const badgeBase = 'inline-flex items-center gap-1 px-2.5 py-0.5 rounded-pill text-xs font-medium'
export const badge = {
  ok: `${badgeBase} bg-success-tint text-success`,
  low: `${badgeBase} bg-warning-tint text-warning`,
  critical: `${badgeBase} bg-danger text-white`,
  info: `${badgeBase} bg-info-tint text-info-dark`,
  muted: `${badgeBase} bg-gray-100 text-muted`,
}

// Small colored dot for inline stock-status, next to a name in a table row
// (mirrors the reference design's per-row status indicator).
export const statusDot = (variant) => {
  const colors = { ok: 'bg-success', low: 'bg-warning', critical: 'bg-danger' }
  return `inline-block w-2 h-2 rounded-full ${colors[variant] || 'bg-gray-300'}`
}

export const resultRow = 'flex justify-between items-center py-2.5 border-b border-border last:border-b-0'
export const cartItem = 'flex justify-between items-center py-2.5 border-b border-border gap-2'

export const pageHeader = 'flex items-center justify-between gap-3 mb-6 flex-wrap'
export const toolbar = 'flex gap-3 items-center mb-4 flex-wrap'

export const statCard = 'border border-border border-l-[3px] border-l-primary rounded-[10px] p-4'
export const statCardDanger = 'border border-border border-l-[3px] border-l-danger rounded-[10px] p-4'
export const statValue = 'font-display text-[26px] font-semibold'
export const statLabel = 'text-muted text-[13px] mt-0.5'

export const banner = {
  danger: 'flex items-start gap-3 p-4 rounded-[10px] mb-4 text-sm bg-danger-tint text-danger border border-red-200',
  ok: 'flex items-start gap-3 p-4 rounded-[10px] mb-4 text-sm bg-success-tint text-success border border-green-200',
}

export const brandMark =
  'flex items-center justify-center flex-shrink-0 rounded-pill bg-primary text-white font-display font-bold'

export const tab = (active) =>
  `pb-2.5 mr-4 border-0 border-b-2 bg-transparent text-sm font-medium cursor-pointer ${
    active ? 'border-primary text-primary' : 'border-transparent text-muted'
  }`

export const paymentOption = (selected) =>
  `flex-1 p-2.5 text-center border rounded-md cursor-pointer text-sm ${
    selected
      ? 'border-primary bg-primary-tint text-primary-dark font-medium'
      : 'border-borderStrong text-ink'
  }`
