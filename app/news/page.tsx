import StatCard from '@/components/stat-card'
import ThroughputChart from '@/components/throughput-chart'
import HorizontalBarChart from '@/components/bar-chart'
import ActivityTable from '@/components/activity-table'
import {
  getNewsStats,
  getNewsThroughput,
  getTopSources,
  getNewsDateDistribution,
  getTimeDeltas,
} from '@/lib/queries'
import { formatNumber } from '@/lib/utils'

export const revalidate = 300

export default async function NewsDiscoveryPage() {
  const [newsStats, throughput, topSources, dateDist, deltas] = await Promise.all([
    getNewsStats(),
    getNewsThroughput(7),
    getTopSources(20),
    getNewsDateDistribution(),
    getTimeDeltas(),
  ])

  const avgPerOrg =
    newsStats.unique_orgs > 0
      ? (newsStats.total_articles / newsStats.unique_orgs).toFixed(1)
      : '0'

  // Transform throughput for chart
  const chartData = throughput
    .filter((r) => r.hour)
    .map((r) => ({ hour: r.hour, articles: r.articles_found || 0 }))
    .sort((a, b) => new Date(a.hour).getTime() - new Date(b.hour).getTime())

  // Transform top sources for bar chart
  const sourcesChartData = topSources.map((s) => ({
    name: s.source_name,
    value: s.article_count,
  }))

  // Transform date distribution for bar chart
  const dateChartData = dateDist.map((d) => ({
    name: d.month,
    value: d.article_count,
  }))

  return (
    <div className="space-y-8">
      <h2 className="text-2xl font-bold text-gray-100">News Discovery</h2>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <StatCard
          label="Total Articles"
          value={formatNumber(newsStats.total_articles)}
          color="text-green-400"
        />
        <StatCard
          label="Unique Orgs Covered"
          value={formatNumber(newsStats.unique_orgs)}
          color="text-blue-400"
        />
        <StatCard
          label="Avg Articles/Org"
          value={avgPerOrg}
        />
        <StatCard
          label="Last 24h"
          value={formatNumber(newsStats.articles_last_24h)}
          sub={`${formatNumber(newsStats.orgs_last_24h)} orgs`}
          color="text-amber-400"
        />
      </div>

      {/* Activity Table */}
      <ActivityTable
        deltas={deltas}
        rows={[
          { label: 'Articles Discovered', key: 'news_articles' },
          { label: 'Orgs Covered', key: 'news_orgs' },
        ]}
      />

      {/* Throughput Chart */}
      <ThroughputChart
        data={chartData}
        lines={[{ key: 'articles', color: '#22c55e', label: 'Articles/hr' }]}
        title="News Discovery Throughput (Last 7 Days)"
      />

      {/* Sentiment Breakdown */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-gray-100 mb-4">Sentiment Breakdown</h3>
        <div className="grid grid-cols-4 gap-6 text-center">
          <div>
            <p className="text-4xl font-bold text-green-400">
              {formatNumber(newsStats.positive)}
            </p>
            <p className="text-sm text-gray-500 mt-1">Positive</p>
          </div>
          <div>
            <p className="text-4xl font-bold text-gray-400">
              {formatNumber(newsStats.neutral)}
            </p>
            <p className="text-sm text-gray-500 mt-1">Neutral</p>
          </div>
          <div>
            <p className="text-4xl font-bold text-red-400">
              {formatNumber(newsStats.negative)}
            </p>
            <p className="text-sm text-gray-500 mt-1">Negative</p>
          </div>
          <div>
            <p className="text-4xl font-bold text-gray-600">
              {formatNumber(newsStats.no_sentiment)}
            </p>
            <p className="text-sm text-gray-500 mt-1">Unclassified</p>
          </div>
        </div>
      </div>

      {/* Content Fetch Status */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-gray-100 mb-4">Content Fetch Status</h3>
        <div className="grid grid-cols-5 gap-4">
          <MiniStat label="OK" value={formatNumber(newsStats.content_ok)} color="text-green-400" />
          <MiniStat label="Error" value={formatNumber(newsStats.content_error)} color="text-red-400" />
          <MiniStat label="Paywall" value={formatNumber(newsStats.content_paywall)} color="text-amber-400" />
          <MiniStat label="Timeout" value={formatNumber(newsStats.content_timeout)} color="text-orange-400" />
          <MiniStat label="Unfetched" value={formatNumber(newsStats.content_unfetched)} color="text-gray-500" />
        </div>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-2 gap-6">
        <HorizontalBarChart
          data={sourcesChartData}
          title="Top News Sources"
          color="#3b82f6"
        />
        <HorizontalBarChart
          data={dateChartData}
          title="Article Date Distribution (by Month)"
          color="#a855f7"
        />
      </div>
    </div>
  )
}

function MiniStat({
  label,
  value,
  color,
}: {
  label: string
  value: string
  color: string
}) {
  return (
    <div className="rounded-lg bg-gray-800/50 p-4 text-center">
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      <p className="text-xs text-gray-500 mt-1">{label}</p>
    </div>
  )
}
