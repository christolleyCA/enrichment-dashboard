import StatCard from '@/components/stat-card'
import ThroughputChart from '@/components/throughput-chart'
import ActivityTable from '@/components/activity-table'
import { getDashboardStats, getUrlThroughput, getTimeDeltas } from '@/lib/queries'
import {
  estimateUrlSerpentCost,
  estimateUrlClaudeCost,
  formatCost,
} from '@/lib/costs'
import { formatNumber, formatPct } from '@/lib/utils'

export const revalidate = 300

export default async function UrlDiscoveryPage() {
  const [stats, throughput, deltas] = await Promise.all([
    getDashboardStats(),
    getUrlThroughput(7),
    getTimeDeltas(),
  ])

  const serpentCost = estimateUrlSerpentCost(stats.url_serpent_searched, stats.url_serpent_found)
  const claudeCost = estimateUrlClaudeCost(stats.url_claude_searched)

  const serpentHitRate = formatPct(stats.url_serpent_found, stats.url_serpent_searched)
  const claudeHitRate = formatPct(stats.url_claude_found, stats.url_claude_searched)

  const serpentCostPerUrl = stats.url_serpent_found > 0 ? serpentCost / stats.url_serpent_found : 0
  const claudeCostPerUrl = stats.url_claude_found > 0 ? claudeCost / stats.url_claude_found : 0

  // Pivot throughput by country for chart
  const hourMap = new Map<string, { hour: string; US: number; CA: number }>()
  for (const row of throughput) {
    if (!row.hour) continue
    const key = row.hour
    const existing = hourMap.get(key) || { hour: key, US: 0, CA: 0 }
    if (row.country === 'US') {
      existing.US = row.orgs_searched || 0
    } else if (row.country === 'CA') {
      existing.CA = row.orgs_searched || 0
    }
    hourMap.set(key, existing)
  }
  const chartData = Array.from(hourMap.values()).sort(
    (a, b) => new Date(a.hour).getTime() - new Date(b.hour).getTime()
  )

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-100">URL Discovery</h2>

      {/* Activity Table */}
      <ActivityTable
        deltas={deltas}
        rows={[
          { label: 'Serpent URLs Found', key: 'serpent_urls' },
          { label: 'Claude URLs Found', key: 'claude_urls' },
        ]}
      />

      {/* Country Breakdown */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-gray-100 mb-4">Country Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400">
                <th className="pb-3 font-medium">Country</th>
                <th className="pb-3 font-medium text-right">Total Orgs</th>
                <th className="pb-3 font-medium text-right">Serpent Searched</th>
                <th className="pb-3 font-medium text-right">URLs Found</th>
                <th className="pb-3 font-medium text-right">Hit Rate</th>
                <th className="pb-3 font-medium text-right">Claude Tried</th>
                <th className="pb-3 font-medium text-right">Claude Found</th>
                <th className="pb-3 font-medium text-right">Both Failed</th>
              </tr>
            </thead>
            <tbody className="text-gray-100">
              <tr className="border-b border-gray-800/50">
                <td className="py-3 font-medium">US</td>
                <td className="py-3 text-right">{formatNumber(stats.total_us)}</td>
                <td className="py-3 text-right">{formatNumber(stats.url_serpent_searched_us)}</td>
                <td className="py-3 text-right text-blue-400">{formatNumber(stats.url_serpent_found_us)}</td>
                <td className="py-3 text-right">{formatPct(stats.url_serpent_found_us, stats.url_serpent_searched_us)}</td>
                <td className="py-3 text-right text-purple-400">-</td>
                <td className="py-3 text-right text-green-400">-</td>
                <td className="py-3 text-right text-red-400">-</td>
              </tr>
              <tr className="border-b border-gray-800/50">
                <td className="py-3 font-medium">CA</td>
                <td className="py-3 text-right">{formatNumber(stats.total_ca)}</td>
                <td className="py-3 text-right">{formatNumber(stats.url_serpent_searched_ca)}</td>
                <td className="py-3 text-right text-blue-400">{formatNumber(stats.url_serpent_found_ca)}</td>
                <td className="py-3 text-right">{formatPct(stats.url_serpent_found_ca, stats.url_serpent_searched_ca)}</td>
                <td className="py-3 text-right text-purple-400">-</td>
                <td className="py-3 text-right text-green-400">-</td>
                <td className="py-3 text-right text-red-400">-</td>
              </tr>
              <tr className="font-semibold">
                <td className="py-3">Total</td>
                <td className="py-3 text-right">{formatNumber(stats.total_orgs)}</td>
                <td className="py-3 text-right">{formatNumber(stats.url_serpent_searched)}</td>
                <td className="py-3 text-right text-blue-400">{formatNumber(stats.url_serpent_found)}</td>
                <td className="py-3 text-right">{serpentHitRate}</td>
                <td className="py-3 text-right text-purple-400">{formatNumber(stats.url_claude_searched)}</td>
                <td className="py-3 text-right text-green-400">{formatNumber(stats.url_claude_found)}</td>
                <td className="py-3 text-right text-red-400">{formatNumber(stats.url_both_failed)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Workflow Comparison */}
      <div className="grid grid-cols-2 gap-6">
        <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-blue-400 mb-4">
            Serpent + DeepSeek
          </h3>
          <div className="space-y-3">
            <Row label="Orgs Processed" value={formatNumber(stats.url_serpent_searched)} />
            <Row label="URLs Found" value={formatNumber(stats.url_serpent_found)} color="text-green-400" />
            <Row label="Hit Rate" value={serpentHitRate} />
            <Row label="Est. Cost" value={formatCost(serpentCost)} color="text-amber-400" />
            <Row label="Cost per URL" value={formatCost(serpentCostPerUrl)} color="text-amber-400" />
          </div>
        </div>

        <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-purple-400 mb-4">
            Claude Fallback
          </h3>
          <div className="space-y-3">
            <Row label="Orgs Processed" value={formatNumber(stats.url_claude_searched)} />
            <Row label="URLs Found" value={formatNumber(stats.url_claude_found)} color="text-green-400" />
            <Row label="Hit Rate" value={claudeHitRate} />
            <Row label="Est. Cost" value={formatCost(claudeCost)} color="text-amber-400" />
            <Row label="Cost per URL" value={formatCost(claudeCostPerUrl)} color="text-amber-400" />
          </div>
        </div>
      </div>

      {/* Throughput Chart */}
      <ThroughputChart
        data={chartData}
        lines={[
          { key: 'US', color: '#3b82f6', label: 'US Orgs/hr' },
          { key: 'CA', color: '#22c55e', label: 'CA Orgs/hr' },
        ]}
        title="URL Discovery Throughput (Last 7 Days)"
      />

      {/* Status Funnel */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-gray-100 mb-6">Pipeline Status</h3>
        <div className="grid grid-cols-5 gap-4 text-center">
          <div>
            <p className="text-3xl font-bold text-gray-100">{formatNumber(stats.total_orgs)}</p>
            <p className="text-xs text-gray-500 mt-1">Total Orgs</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-blue-400">{formatNumber(stats.url_serpent_searched)}</p>
            <p className="text-xs text-gray-500 mt-1">Serpent Searched</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-purple-400">{formatNumber(stats.url_claude_searched)}</p>
            <p className="text-xs text-gray-500 mt-1">Claude Tried</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-green-400">{formatNumber(stats.has_url)}</p>
            <p className="text-xs text-gray-500 mt-1">Total with URL</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-500">{formatNumber(stats.url_unsearched)}</p>
            <p className="text-xs text-gray-500 mt-1">Unsearched</p>
          </div>
        </div>
      </div>
    </div>
  )
}

function Row({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color?: string
}) {
  return (
    <div className="flex justify-between">
      <span className="text-sm text-gray-400">{label}</span>
      <span className={`text-sm font-medium ${color || 'text-gray-100'}`}>{value}</span>
    </div>
  )
}
