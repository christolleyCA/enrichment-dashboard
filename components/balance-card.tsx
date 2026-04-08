import type { BalanceInfo } from '@/lib/balances'

const STATUS_COLORS = {
  healthy: { bar: 'bg-green-500', text: 'text-green-400', border: 'border-green-500/20' },
  warning: { bar: 'bg-amber-500', text: 'text-amber-400', border: 'border-amber-500/20' },
  critical: { bar: 'bg-red-500', text: 'text-red-400', border: 'border-red-500/20' },
}

export default function BalanceCard({ info }: { info: BalanceInfo }) {
  const colors = STATUS_COLORS[info.status]

  return (
    <div className={`rounded-xl bg-gray-900 border border-gray-800 p-6 ${colors.border}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-gray-400">{info.label}</h3>
        <span className={`text-xs px-2 py-0.5 rounded-full ${colors.bar} bg-opacity-20 ${colors.text}`}>
          {info.status}
        </span>
      </div>

      <p className={`text-3xl font-bold ${colors.text} mb-3`}>
        {info.balanceDisplay}
      </p>

      {/* Progress bar */}
      <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden mb-2">
        <div
          className={`h-full ${colors.bar} rounded-full transition-all`}
          style={{ width: `${Math.min(info.percentRemaining, 100)}%` }}
        />
      </div>
      <p className="text-xs text-gray-500">
        {info.percentRemaining.toFixed(0)}% remaining
        {info.unit !== 'USD' && ` (${info.unit})`}
      </p>

      {info.error && (
        <p className="text-xs text-red-400 mt-2">Error: {info.error}</p>
      )}

      {/* Serpent per-key breakdown */}
      {info.subBalances && info.subBalances.length > 0 && (
        <details className="mt-4">
          <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300">
            Per-key breakdown ({info.subBalances.length} keys)
          </summary>
          <div className="mt-2 space-y-1.5">
            {info.subBalances.map((sub) => (
              <div key={sub.keyLabel} className="flex items-center justify-between text-xs">
                <span className="text-gray-400 truncate max-w-[140px]" title={sub.keyLabel}>
                  {sub.keyLabel}
                </span>
                <div className="flex items-center gap-3">
                  <span className="text-gray-500">
                    {sub.queriesUsed.toLocaleString()} queries
                  </span>
                  <span className={sub.estimatedBalance < 5 ? 'text-red-400' : 'text-gray-300'}>
                    ${sub.estimatedBalance.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  )
}
