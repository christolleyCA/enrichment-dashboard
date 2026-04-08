import StatCard from '@/components/stat-card'
import ProgressRing from '@/components/progress-ring'
import ActivityTable from '@/components/activity-table'
import { getDashboardStats, getNewsStats, getTimeDeltas } from '@/lib/queries'
import {
  estimateUrlSerpentCost,
  estimateUrlSerperCost,
  estimateNewsSerpentCost,
  estimateNewsSerperCost,
  formatCost,
} from '@/lib/costs'
import { formatNumber, formatPct, calcETA } from '@/lib/utils'

export const revalidate = 300 // 5 minutes

export default async function OverviewPage() {
  const [stats, newsStats, deltas] = await Promise.all([
    getDashboardStats(),
    getNewsStats(),
    getTimeDeltas(),
  ])

  const urlSerpentCost = estimateUrlSerpentCost(stats.url_serpent_searched, stats.url_serpent_found)
  const urlSerperCost = estimateUrlSerperCost(stats.url_claude_searched)
  const newsSerpentCost = estimateNewsSerpentCost(stats.url_serpent_searched, newsStats.unique_orgs)
  const newsSerperCost = estimateNewsSerperCost(stats.url_claude_searched)
  const totalCost = urlSerpentCost + urlSerperCost + newsSerpentCost + newsSerperCost

  const urlProcessed = stats.url_serpent_searched
  const urlTotal = stats.total_orgs
  const urlPct = urlTotal > 0 ? (urlProcessed / urlTotal) * 100 : 0

  const newsProcessed = newsStats.unique_orgs
  const newsPct = urlTotal > 0 ? (newsProcessed / urlTotal) * 100 : 0

  const urlHitRate = formatPct(stats.has_url, urlProcessed)
  const urlEta = calcETA(
    urlProcessed,
    urlTotal,
    stats.min_url_searched_at,
    stats.max_url_searched_at
  )

  const newsEta = calcETA(
    newsProcessed,
    urlTotal,
    newsStats.min_discovered_at,
    newsStats.max_discovered_at
  )

  const now = new Date().toLocaleString('en-US', {
    timeZone: 'America/Toronto',
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-100">Pipeline Overview</h2>
        <p className="text-sm text-gray-500">Last updated: {now}</p>
      </div>

      {/* Summary Metric Cards */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Total Orgs"
          value={formatNumber(stats.total_orgs)}
          sub={`${formatNumber(stats.total_us)} US / ${formatNumber(stats.total_ca)} CA`}
        />
        <StatCard
          label="URLs Found"
          value={formatNumber(stats.has_url)}
          sub={`${urlHitRate} hit rate`}
          color="text-blue-400"
        />
        <StatCard
          label="Articles Found"
          value={formatNumber(newsStats.total_articles)}
          sub={`${formatNumber(newsStats.unique_orgs)} orgs covered`}
          color="text-green-400"
        />
        <StatCard
          label="Total Est. Cost"
          value={formatCost(totalCost)}
          sub={`URL: ${formatCost(urlSerpentCost + urlSerperCost)} / News: ${formatCost(newsSerpentCost + newsSerperCost)}`}
          color="text-amber-400"
        />
      </div>

      {/* Progress Cards */}
      <div className="grid grid-cols-2 gap-6">
        {/* URL Discovery Progress */}
        <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-gray-100 mb-4">URL Discovery Progress</h3>
          <div className="flex items-center gap-8">
            <ProgressRing pct={urlPct} color="#3b82f6" />
            <div className="space-y-2">
              <p className="text-sm text-gray-400">
                Processed:{' '}
                <span className="text-gray-100 font-medium">
                  {formatNumber(urlProcessed)} / {formatNumber(urlTotal)}
                </span>
              </p>
              <p className="text-sm text-gray-400">
                URLs Found:{' '}
                <span className="text-blue-400 font-medium">{formatNumber(stats.has_url)}</span>
              </p>
              <p className="text-sm text-gray-400">
                Hit Rate: <span className="text-gray-100 font-medium">{urlHitRate}</span>
              </p>
              <p className="text-sm text-gray-400">
                Est. Cost:{' '}
                <span className="text-amber-400 font-medium">
                  {formatCost(urlSerpentCost + urlSerperCost)}
                </span>
              </p>
              <p className="text-sm text-gray-400">
                ETA: <span className="text-gray-100 font-medium">{urlEta}</span>
              </p>
            </div>
          </div>
        </div>

        {/* News Discovery Progress */}
        <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-gray-100 mb-4">News Discovery Progress</h3>
          <div className="flex items-center gap-8">
            <ProgressRing pct={newsPct} color="#22c55e" />
            <div className="space-y-2">
              <p className="text-sm text-gray-400">
                Orgs Covered:{' '}
                <span className="text-gray-100 font-medium">
                  {formatNumber(newsProcessed)} / {formatNumber(urlTotal)}
                </span>
              </p>
              <p className="text-sm text-gray-400">
                Articles Found:{' '}
                <span className="text-green-400 font-medium">
                  {formatNumber(newsStats.total_articles)}
                </span>
              </p>
              <p className="text-sm text-gray-400">
                Avg Articles/Org:{' '}
                <span className="text-gray-100 font-medium">
                  {newsProcessed > 0
                    ? (newsStats.total_articles / newsProcessed).toFixed(1)
                    : '0'}
                </span>
              </p>
              <p className="text-sm text-gray-400">
                Est. Cost:{' '}
                <span className="text-amber-400 font-medium">
                  {formatCost(newsSerpentCost + newsSerperCost)}
                </span>
              </p>
              <p className="text-sm text-gray-400">
                ETA: <span className="text-gray-100 font-medium">{newsEta}</span>
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Table */}
      <ActivityTable
        deltas={deltas}
        rows={[
          { label: 'News Articles', key: 'news_articles' },
          { label: 'Orgs with News', key: 'news_orgs' },
          { label: 'Serpent URLs Found', key: 'serpent_urls' },
          { label: 'Serper URLs Found', key: 'claude_urls' },
        ]}
      />

      {/* Pipeline Funnel */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-gray-100 mb-6">Pipeline Funnel</h3>
        <div className="flex items-center justify-between gap-2">
          <FunnelStep
            label="All Orgs"
            value={formatNumber(stats.total_orgs)}
            color="text-gray-100"
          />
          <Arrow />
          <FunnelStep
            label="Serpent Searched"
            value={formatNumber(stats.url_serpent_searched)}
            color="text-blue-400"
          />
          <Arrow />
          <div className="flex flex-col gap-2">
            <FunnelStep
              label="URLs Found"
              value={formatNumber(stats.url_serpent_found)}
              color="text-green-400"
              small
            />
            <FunnelStep
              label="Failed"
              value={formatNumber(stats.url_serpent_searched - stats.url_serpent_found)}
              color="text-red-400"
              small
            />
          </div>
          <Arrow />
          <FunnelStep
            label="Serper Tried"
            value={formatNumber(stats.url_claude_searched)}
            color="text-purple-400"
          />
          <Arrow />
          <div className="flex flex-col gap-2">
            <FunnelStep
              label="Serper Found"
              value={formatNumber(stats.url_claude_found)}
              color="text-green-400"
              small
            />
            <FunnelStep
              label="Both Failed"
              value={formatNumber(stats.url_both_failed)}
              color="text-red-400"
              small
            />
          </div>
          <Arrow />
          <FunnelStep
            label="Unsearched"
            value={formatNumber(stats.url_unsearched)}
            color="text-gray-500"
          />
        </div>
      </div>
    </div>
  )
}

function FunnelStep({
  label,
  value,
  color,
  small,
}: {
  label: string
  value: string
  color: string
  small?: boolean
}) {
  return (
    <div className="text-center">
      <p className={`${small ? 'text-xl' : 'text-2xl'} font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  )
}

function Arrow() {
  return (
    <span className="text-gray-600 text-2xl shrink-0">&rarr;</span>
  )
}
