export function formatNumber(n: number): string {
  return n.toLocaleString('en-US')
}

export function formatPct(n: number, d: number): string {
  if (d === 0) return '0.0%'
  return `${((n / d) * 100).toFixed(1)}%`
}

export function calcETA(
  processed: number,
  total: number,
  minTs: string | null,
  maxTs: string | null
): string {
  if (processed >= total) return 'complete'
  if (!minTs || !maxTs) return 'unknown'

  const start = new Date(minTs).getTime()
  const end = new Date(maxTs).getTime()
  const elapsed = end - start

  if (elapsed <= 0 || processed <= 0) return 'unknown'

  const remaining = total - processed
  const msPerOrg = elapsed / processed
  const remainingMs = remaining * msPerOrg

  return formatDuration(remainingMs)
}

export function calcElapsed(minTs: string | null, maxTs: string | null): string {
  if (!minTs || !maxTs) return 'n/a'

  const start = new Date(minTs).getTime()
  const end = new Date(maxTs).getTime()
  const elapsed = end - start

  if (elapsed <= 0) return '0m'

  return formatDuration(elapsed)
}

function formatDuration(ms: number): string {
  const totalMinutes = Math.round(ms / 60000)
  if (totalMinutes < 60) return `${totalMinutes}m`

  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  if (hours < 24) return `~${hours}h ${minutes}m`

  const days = Math.floor(hours / 24)
  const remainHours = hours % 24
  return `~${days}d ${remainHours}h`
}
