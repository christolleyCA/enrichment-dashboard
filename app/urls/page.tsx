import ThroughputChart from '@/components/throughput-chart'
import ActivityTable from '@/components/activity-table'
import DonutChart from '@/components/donut-chart'
import {
  getDashboardStats,
  getUrlThroughput,
  getTimeDeltas,
  getProviderBreakdown,
  type ProviderRow,
} from '@/lib/queries'
import {
  estimateUrlSerpentCost,
  estimateUrlSerperCost,
  formatCost,
} from '@/lib/costs'
import { formatNumber, formatPct } from '@/lib/utils'

export const revalidate = 30

const PROVIDER_COLORS: Record<string, string> = {
  serpent: '#3b82f6',     // blue
  serper: '#a855f7',      // purple
  scrapingdog: '#f59e0b', // amber
  legacy: '#6b7280',      // gray
}

const PROVIDER_LABELS: Record<string, string> = {
  serpent: 'Serpent',
  serper: 'Serper',
  scrapingdog: 'ScrapingDog',
  legacy: 'Pre-tracking',
}

function aggregateByProvider(rows: ProviderRow[] | null, countryFilter?: string) {
  if (!rows) return new Map<string, number>()
  const map = new Map<string, number>()
  for (const row of rows) {
    if (countryFilter && row.country !== countryFilter) continue
    map.set(row.provider, (map.get(row.provider) || 0) + row.urls_found)
  }
  return map
}

function toDonutData(providerMap: Map<string, number>) {
  return Array.from(providerMap.entries())
    .map(([provider, value]) => ({
      name: PROVIDER_LABELS[provider] || provider,
      value,
      color: PROVIDER_COLORS[provider] || '#6b7280',
    }))
    .sort((a, b) => b.value - a.value)
}

export default async function UrlDiscoveryPage() {
  const [stats, throughput, deltas, providers] = await Promise.all([
    getDashboardStats(),
    getUrlThroughput(7),
    getTimeDeltas(),
    getProviderBreakdown(),
  ])

  const serpentCost = estimateUrlSerpentCost(stats.url_serpent_searched, stats.url_serpent_found)
  const serperCost = estimateUrlSerperCost(stats.url_claude_searched)

  const serpentHitRate = formatPct(stats.url_serpent_found, stats.url_serpent_searched)
  const serperHitRate = formatPct(stats.url_claude_found, stats.url_claude_searched)

  const serpentCostPerUrl = stats.url_serpent_found > 0 ? serpentCost / stats.url_serpent_found : 0
  const serperCostPerUrl = stats.url_claude_found > 0 ? serperCost / stats.url_claude_found : 0

  // Provider breakdown data
  const allTimeMap = aggregateByProvider(providers.all_time)
  const last24hMap = aggregateByProvider(providers.last_24h)
  const last1hMap = aggregateByProvider(providers.last_1h)

  // Seed known providers so ScrapingDog shows even at 0
  const KNOWN_PROVIDERS = ['serpent', 'scrapingdog', 'serper', 'legacy']
  for (const p of KNOWN_PROVIDERS) {
    if (!allTimeMap.has(p)) allTimeMap.set(p, 0)
    if (!last24hMap.has(p)) last24hMap.set(p, 0)
    if (!last1hMap.has(p)) last1hMap.set(p, 0)
  }

  const allTimeTotal = Array.from(allTimeMap.values()).reduce((a, b) => a + b, 0)
  const last1hTotal = Array.from(last1hMap.values()).reduce((a, b) => a + b, 0)

  // Per-country provider breakdown for table
  const countryProviders = ['US', 'CA'].map((country) => {
    const map = aggregateByProvider(providers.all_time, country)
    return { country, serpent: map.get('serpent') || 0, scrapingdog: map.get('scrapingdog') || 0, serper: map.get('serper') || 0, legacy: map.get('legacy') || 0 }
  })

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
          { label: 'Serper URLs Found', key: 'claude_urls' },
        ]}
      />

      {/* Provider Breakdown Charts */}
      <div className="grid grid-cols-3 gap-6">
        <DonutChart
          data={toDonutData(allTimeMap)}
          title="Provider Breakdown (All Time)"
          centerLabel="Total"
          centerValue={formatNumber(allTimeTotal)}
        />
        <DonutChart
          data={toDonutData(last24hMap)}
          title="Provider Breakdown (24h)"
          centerLabel="Last 24h"
          centerValue={formatNumber(Array.from(last24hMap.values()).reduce((a, b) => a + b, 0))}
        />
        <DonutChart
          data={toDonutData(last1hMap)}
          title="Provider Breakdown (1h)"
          centerLabel="Last hour"
          centerValue={formatNumber(last1hTotal)}
        />
      </div>

      {/* Provider x Country Table */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-gray-100 mb-4">Provider x Country</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400">
                <th className="pb-3 font-medium">Country</th>
                <th className="pb-3 font-medium text-right">Total Orgs</th>
                <th className="pb-3 font-medium text-right">Searched</th>
                <th className="pb-3 font-medium text-right">
                  <span className="text-blue-400">Serpent</span>
                </th>
                <th className="pb-3 font-medium text-right">
                  <span className="text-amber-400">ScrapingDog</span>
                </th>
                <th className="pb-3 font-medium text-right">
                  <span className="text-purple-400">Serper</span>
                </th>
                <th className="pb-3 font-medium text-right">Pre-tracking</th>
                <th className="pb-3 font-medium text-right">Not Found</th>
              </tr>
            </thead>
            <tbody className="text-gray-100">
              {countryProviders.map((cp) => {
                const totalOrgs = cp.country === 'US' ? stats.total_us : stats.total_ca
                const searched = cp.country === 'US' ? stats.url_serpent_searched_us : stats.url_serpent_searched_ca
                const totalFound = cp.serpent + cp.scrapingdog + cp.serper + cp.legacy
                const notFound = searched - totalFound
                return (
                  <tr key={cp.country} className="border-b border-gray-800/50">
                    <td className="py-3 font-medium">{cp.country}</td>
                    <td className="py-3 text-right">{formatNumber(totalOrgs)}</td>
                    <td className="py-3 text-right">{formatNumber(searched)}</td>
                    <td className="py-3 text-right text-blue-400">{formatNumber(cp.serpent)}</td>
                    <td className="py-3 text-right text-amber-400">{formatNumber(cp.scrapingdog)}</td>
                    <td className="py-3 text-right text-purple-400">{formatNumber(cp.serper)}</td>
                    <td className="py-3 text-right text-gray-500">{formatNumber(cp.legacy)}</td>
                    <td className="py-3 text-right text-red-400">{notFound > 0 ? formatNumber(notFound) : '-'}</td>
                  </tr>
                )
              })}
              <tr className="font-semibold">
                <td className="py-3">Total</td>
                <td className="py-3 text-right">{formatNumber(stats.total_orgs)}</td>
                <td className="py-3 text-right">{formatNumber(stats.url_serpent_searched)}</td>
                <td className="py-3 text-right text-blue-400">{formatNumber((allTimeMap.get('serpent') || 0))}</td>
                <td className="py-3 text-right text-amber-400">{formatNumber((allTimeMap.get('scrapingdog') || 0))}</td>
                <td className="py-3 text-right text-purple-400">{formatNumber((allTimeMap.get('serper') || 0))}</td>
                <td className="py-3 text-right text-gray-500">{formatNumber((allTimeMap.get('legacy') || 0))}</td>
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
            Serper Fallback
          </h3>
          <div className="space-y-3">
            <Row label="URLs Found" value={formatNumber(stats.url_claude_found)} color="text-green-400" />
            <Row label="Hit Rate" value={serperHitRate} />
            <Row label="Est. Cost" value={formatCost(serperCost)} color="text-amber-400" />
            <Row label="Cost per URL" value={formatCost(serperCostPerUrl)} color="text-amber-400" />
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
        <div className="grid grid-cols-6 gap-4 text-center">
          <div>
            <p className="text-3xl font-bold text-gray-100">{formatNumber(stats.total_orgs)}</p>
            <p className="text-xs text-gray-500 mt-1">Total Orgs</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-blue-400">{formatNumber(stats.url_serpent_searched)}</p>
            <p className="text-xs text-gray-500 mt-1">Searched</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-green-400">{formatNumber(stats.url_serpent_found + stats.url_claude_found)}</p>
            <p className="text-xs text-gray-500 mt-1">New URLs Found</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-red-400">{formatNumber(stats.url_both_failed)}</p>
            <p className="text-xs text-gray-500 mt-1">Not Found</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-gray-500">{formatNumber(stats.url_unsearched)}</p>
            <p className="text-xs text-gray-500 mt-1">Unsearched</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-cyan-400">{formatNumber(stats.has_url)}</p>
            <p className="text-xs text-gray-500 mt-1">Total URLs</p>
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
