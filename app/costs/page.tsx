import StatCard from '@/components/stat-card'
import BalanceCard from '@/components/balance-card'
import {
  fetchDeepSeekBalance,
  fetchSerperBalance,
  fetchScrapingDogBalance,
  estimateSerpentBalances,
  type BalanceInfo,
} from '@/lib/balances'
import { getDashboardStats, getNewsStats, getTimeDeltas } from '@/lib/queries'
import {
  estimateUrlSerpentCost,
  estimateUrlSerperCost,
  estimateNewsSerpentCost,
  estimateNewsSerperCost,
  formatCost,
  REAL_COST_PER_QUERY,
} from '@/lib/costs'
import { formatNumber } from '@/lib/utils'

export const dynamic = 'force-dynamic'
export const revalidate = 30

export default async function CostsPage() {
  const [deepseek, serper, scrapingdog, serpent, stats, newsStats, deltas] = await Promise.all([
    fetchDeepSeekBalance(),
    fetchSerperBalance(),
    fetchScrapingDogBalance(),
    estimateSerpentBalances(),
    getDashboardStats(),
    getNewsStats(),
    getTimeDeltas(),
  ])

  const balances: BalanceInfo[] = [deepseek, serper, serpent, scrapingdog]
  const warnings = balances.filter((b) => b.status === 'warning' || b.status === 'critical')

  // Cost calculations (reusing existing functions)
  const urlSerpentCost = estimateUrlSerpentCost(stats.url_serpent_searched, stats.url_serpent_found)
  const urlSerperCost = estimateUrlSerperCost(stats.url_claude_searched)
  const newsSerpentCost = estimateNewsSerpentCost(stats.url_serpent_searched, newsStats.unique_orgs)
  const newsSerperCost = estimateNewsSerperCost(stats.url_claude_searched)
  const totalCost = urlSerpentCost + urlSerperCost + newsSerpentCost + newsSerperCost

  // Burn rate: queries in last 24h
  const d24h = deltas['24h']
  const serpentUrlBurn24h = d24h.serpent_urls * REAL_COST_PER_QUERY.serpentBing
  const serpentNewsBurn24h = d24h.news_articles * REAL_COST_PER_QUERY.serpentNews
  const serperBurn24h = d24h.claude_urls * REAL_COST_PER_QUERY.serper
  const deepseekBurn24h =
    d24h.serpent_urls * 0.25 * REAL_COST_PER_QUERY.deepseekPerOrg + // ~25% get validated
    d24h.news_orgs * REAL_COST_PER_QUERY.deepseekNewsPerOrg

  // Days until exhaustion
  const daysRemaining = (balance: number, dailyBurn: number) =>
    dailyBurn > 0 ? Math.round(balance / dailyBurn) : Infinity

  const serpentDays = daysRemaining(serpent.balanceRaw, serpentUrlBurn24h + serpentNewsBurn24h)
  const deepseekDays = daysRemaining(deepseek.balanceRaw, deepseekBurn24h)
  const serperDays = daysRemaining(serper.balanceRaw * REAL_COST_PER_QUERY.serper, serperBurn24h)

  const now = new Date().toLocaleString('en-US', {
    timeZone: 'America/Toronto',
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  // Cost breakdown rows
  const breakdownRows = [
    {
      workflow: 'URL Discovery (Serpent)',
      queries: stats.url_serpent_searched,
      costPerQuery: REAL_COST_PER_QUERY.serpentBing,
      totalCost: stats.url_serpent_searched * REAL_COST_PER_QUERY.serpentBing,
    },
    {
      workflow: 'URL Discovery (Serper Fallback)',
      queries: stats.url_claude_searched,
      costPerQuery: REAL_COST_PER_QUERY.serper,
      totalCost: urlSerperCost,
    },
    {
      workflow: 'URL Validation (DeepSeek)',
      queries: stats.url_serpent_found,
      costPerQuery: REAL_COST_PER_QUERY.deepseekPerOrg,
      totalCost: stats.url_serpent_found * REAL_COST_PER_QUERY.deepseekPerOrg,
    },
    {
      workflow: 'News Discovery (Serpent)',
      queries: newsStats.unique_orgs,
      costPerQuery: REAL_COST_PER_QUERY.serpentNews,
      totalCost: newsStats.unique_orgs * REAL_COST_PER_QUERY.serpentNews,
    },
    {
      workflow: 'News Classification (DeepSeek)',
      queries: newsStats.unique_orgs,
      costPerQuery: REAL_COST_PER_QUERY.deepseekNewsPerOrg,
      totalCost: newsStats.unique_orgs * REAL_COST_PER_QUERY.deepseekNewsPerOrg,
    },
  ]

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-100">Costs &amp; Balances</h2>
        <p className="text-sm text-gray-500">Last updated: {now}</p>
      </div>

      {/* Warnings Banner */}
      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((w) => (
            <div
              key={w.provider}
              className={`rounded-lg px-4 py-3 text-sm font-medium ${
                w.status === 'critical'
                  ? 'bg-red-500/10 border border-red-500/30 text-red-400'
                  : 'bg-amber-500/10 border border-amber-500/30 text-amber-400'
              }`}
            >
              {w.label} balance {w.status}: {w.balanceDisplay} remaining
            </div>
          ))}
        </div>
      )}

      {/* Balance Cards Grid */}
      <div className="grid grid-cols-4 gap-4">
        {balances.map((b) => (
          <BalanceCard key={b.provider} info={b} />
        ))}
      </div>

      {/* Cost Summary Stats */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Total Est. Spend"
          value={formatCost(totalCost)}
          color="text-amber-400"
        />
        <StatCard
          label="Serpent Spend"
          value={formatCost(urlSerpentCost + newsSerpentCost)}
          sub={`${formatNumber(stats.url_serpent_searched + newsStats.unique_orgs)} queries`}
          color="text-blue-400"
        />
        <StatCard
          label="Serper Spend"
          value={formatCost(urlSerperCost + newsSerperCost)}
          sub={`${formatNumber(stats.url_claude_searched)} queries`}
          color="text-purple-400"
        />
        <StatCard
          label="DeepSeek Spend"
          value={formatCost(
            stats.url_serpent_found * REAL_COST_PER_QUERY.deepseekPerOrg +
            newsStats.unique_orgs * REAL_COST_PER_QUERY.deepseekNewsPerOrg
          )}
          sub={`${formatNumber(stats.url_serpent_found + newsStats.unique_orgs)} calls`}
          color="text-green-400"
        />
      </div>

      {/* Cost Breakdown Table */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-gray-100 mb-4">Cost Breakdown by Workflow</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-500 border-b border-gray-800">
              <th className="text-left py-2 font-medium">Workflow</th>
              <th className="text-right py-2 font-medium">Queries</th>
              <th className="text-right py-2 font-medium">Cost/Query</th>
              <th className="text-right py-2 font-medium">Total (USD)</th>
              <th className="text-right py-2 font-medium">Total (CAD)</th>
            </tr>
          </thead>
          <tbody>
            {breakdownRows.map((row) => (
              <tr key={row.workflow} className="border-b border-gray-800/50">
                <td className="py-2.5 text-gray-300">{row.workflow}</td>
                <td className="py-2.5 text-right text-gray-400">
                  {formatNumber(row.queries)}
                </td>
                <td className="py-2.5 text-right text-gray-400">
                  ${row.costPerQuery.toFixed(5)}
                </td>
                <td className="py-2.5 text-right text-gray-300">
                  ${row.totalCost.toFixed(2)}
                </td>
                <td className="py-2.5 text-right text-amber-400">
                  {formatCost(row.totalCost)}
                </td>
              </tr>
            ))}
            <tr className="font-medium">
              <td className="py-2.5 text-gray-100">Total</td>
              <td className="py-2.5 text-right text-gray-300">
                {formatNumber(breakdownRows.reduce((a, r) => a + r.queries, 0))}
              </td>
              <td className="py-2.5 text-right text-gray-400">&mdash;</td>
              <td className="py-2.5 text-right text-gray-100">
                ${breakdownRows.reduce((a, r) => a + r.totalCost, 0).toFixed(2)}
              </td>
              <td className="py-2.5 text-right text-amber-400">
                {formatCost(breakdownRows.reduce((a, r) => a + r.totalCost, 0))}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Burn Rate & Projections */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-gray-100 mb-4">Burn Rate &amp; Projections</h3>
        <p className="text-xs text-gray-500 mb-4">Based on last 24h activity</p>
        <div className="grid grid-cols-3 gap-6">
          <BurnCard
            provider="DeepSeek"
            dailyBurn={deepseekBurn24h}
            remaining={deepseek.balanceRaw}
            unit="USD"
            daysLeft={deepseekDays}
            status={deepseek.status}
          />
          <BurnCard
            provider="Serpent"
            dailyBurn={serpentUrlBurn24h + serpentNewsBurn24h}
            remaining={serpent.balanceRaw}
            unit="USD"
            daysLeft={serpentDays}
            status={serpent.status}
          />
          <BurnCard
            provider="Serper"
            dailyBurn={d24h.claude_urls}
            remaining={serper.balanceRaw}
            unit="credits/day"
            daysLeft={serperDays}
            status={serper.status}
          />
        </div>
      </div>
    </div>
  )
}

function BurnCard({
  provider,
  dailyBurn,
  remaining,
  unit,
  daysLeft,
  status,
}: {
  provider: string
  dailyBurn: number
  remaining: number
  unit: string
  daysLeft: number
  status: 'healthy' | 'warning' | 'critical'
}) {
  const statusColor =
    status === 'critical' ? 'text-red-400' : status === 'warning' ? 'text-amber-400' : 'text-green-400'

  return (
    <div className="rounded-lg bg-gray-800/50 p-4">
      <p className="text-sm font-medium text-gray-300 mb-2">{provider}</p>
      <div className="space-y-1.5 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-500">Daily burn</span>
          <span className="text-gray-300">
            {unit === 'credits/day'
              ? `${formatNumber(Math.round(dailyBurn))} credits`
              : `$${dailyBurn.toFixed(4)}`}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Remaining</span>
          <span className="text-gray-300">
            {unit === 'credits/day'
              ? `${formatNumber(Math.round(remaining))} credits`
              : `$${remaining.toFixed(2)}`}
          </span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-500">Est. days left</span>
          <span className={`font-medium ${statusColor}`}>
            {daysLeft === Infinity ? 'No activity' : `${daysLeft} days`}
          </span>
        </div>
      </div>
    </div>
  )
}
