import { TimeDeltas } from '@/lib/queries'

const PERIODS = ['5m', '1h', '5h', '24h', '2d', '7d'] as const

interface ActivityRow {
  label: string
  key: keyof TimeDeltas[typeof PERIODS[number]]
}

export default function ActivityTable({
  deltas,
  rows,
}: {
  deltas: TimeDeltas
  rows: ActivityRow[]
}) {
  return (
    <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
      <h3 className="text-lg font-semibold text-gray-100 mb-4">Recent Activity</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left">
          <thead>
            <tr className="border-b border-gray-800 text-gray-400">
              <th className="pb-3 font-medium">Metric</th>
              {PERIODS.map((p) => (
                <th key={p} className="pb-3 font-medium text-right">{p}</th>
              ))}
            </tr>
          </thead>
          <tbody className="text-gray-100">
            {rows.map((row) => (
              <tr key={row.key} className="border-b border-gray-800/50">
                <td className="py-3 font-medium text-gray-300">{row.label}</td>
                {PERIODS.map((p) => {
                  const val = deltas[p]?.[row.key] ?? 0
                  return (
                    <td key={p} className="py-3 text-right">
                      {val > 0 ? (
                        <span className="text-green-400 font-medium">+{val.toLocaleString()}</span>
                      ) : (
                        <span className="text-gray-600">&mdash;</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
