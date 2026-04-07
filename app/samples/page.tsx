'use client'

import { useState, useCallback } from 'react'
import { createBrowserClient } from '@/lib/supabase'

type Tab = 'url-found' | 'url-failed' | 'news' | 'unsearched'

interface UrlRow {
  id: string
  legal_name: string
  city: string | null
  state_province: string | null
  country: string | null
  website_url: string | null
  url_searched_at: string | null
  url_claude_searched_at: string | null
}

interface FailedRow {
  id: string
  legal_name: string
  city: string | null
  state_province: string | null
  country: string | null
  url_searched_at: string | null
  url_claude_searched_at: string | null
}

interface NewsRow {
  id: string
  title: string | null
  source_name: string | null
  article_date: string | null
  sentiment: string | null
  url: string | null
  snippet: string | null
  discovered_at: string | null
  org_name: string | null
}

interface UnsearchedRow {
  id: string
  legal_name: string
  city: string | null
  state_province: string | null
  country: string | null
}

const supabase = createBrowserClient()

export default function SamplesPage() {
  const [tab, setTab] = useState<Tab>('url-found')
  const [countryFilter, setCountryFilter] = useState<string>('')
  const [sentimentFilter, setSentimentFilter] = useState<string>('')
  const [workflowFilter, setWorkflowFilter] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [urlRows, setUrlRows] = useState<UrlRow[]>([])
  const [failedRows, setFailedRows] = useState<FailedRow[]>([])
  const [newsRows, setNewsRows] = useState<NewsRow[]>([])
  const [unsearchedRows, setUnsearchedRows] = useState<UnsearchedRow[]>([])
  const [expandedNews, setExpandedNews] = useState<Set<string>>(new Set())

  const loadSample = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      if (tab === 'url-found') {
        let query = supabase
          .from('nfp_organizations')
          .select('id, legal_name, city, state_province, country, website_url, url_searched_at, url_claude_searched_at')
          .not('website_url', 'is', null)
          .order('url_searched_at', { ascending: false, nullsFirst: false })
          .limit(20)

        if (countryFilter) query = query.eq('country', countryFilter)
        if (workflowFilter === 'claude') query = query.not('url_claude_searched_at', 'is', null)
        else if (workflowFilter === 'serpent') query = query.is('url_claude_searched_at', null).not('url_searched_at', 'is', null)

        const { data, error: err } = await query
        if (err) throw err
        setUrlRows((data as UrlRow[]) || [])
      } else if (tab === 'url-failed') {
        let query = supabase
          .from('nfp_organizations')
          .select('id, legal_name, city, state_province, country, url_searched_at, url_claude_searched_at')
          .not('url_searched_at', 'is', null)
          .not('url_claude_searched_at', 'is', null)
          .is('website_url', null)
          .order('url_claude_searched_at', { ascending: false, nullsFirst: false })
          .limit(20)

        if (countryFilter) query = query.eq('country', countryFilter)

        const { data, error: err } = await query
        if (err) throw err
        setFailedRows((data as FailedRow[]) || [])
      } else if (tab === 'news') {
        let query = supabase
          .from('nfp_news_mentions')
          .select(`
            id,
            title,
            source_name,
            article_date,
            sentiment,
            url,
            snippet,
            discovered_at,
            nfp_organizations!inner(legal_name)
          `)
          .order('discovered_at', { ascending: false, nullsFirst: false })
          .limit(20)

        if (sentimentFilter) {
          if (sentimentFilter === 'null') query = query.is('sentiment', null)
          else query = query.eq('sentiment', sentimentFilter)
        }

        const { data, error: err } = await query
        if (err) throw err

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapped = ((data as any[]) || []).map((row) => ({
          id: row.id,
          title: row.title,
          source_name: row.source_name,
          article_date: row.article_date,
          sentiment: row.sentiment,
          url: row.url,
          snippet: row.snippet,
          discovered_at: row.discovered_at,
          org_name: row.nfp_organizations?.legal_name || null,
        }))
        setNewsRows(mapped)
        setExpandedNews(new Set())
      } else if (tab === 'unsearched') {
        const { data, error: err } = await supabase
          .from('nfp_organizations')
          .select('id, legal_name, city, state_province, country')
          .is('url_searched_at', null)
          .is('url_claude_searched_at', null)
          .limit(20)

        if (err) throw err
        setUnsearchedRows((data as UnsearchedRow[]) || [])
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load samples')
    } finally {
      setLoading(false)
    }
  }, [tab, countryFilter, sentimentFilter, workflowFilter])

  const toggleExpand = (id: string) => {
    setExpandedNews((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const sentimentColor: Record<string, string> = {
    positive: 'bg-green-900/50 text-green-400 border-green-800',
    neutral: 'bg-gray-800 text-gray-400 border-gray-700',
    negative: 'bg-red-900/50 text-red-400 border-red-800',
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-100">Quality Samples</h2>

      {/* Tabs */}
      <div className="flex gap-2">
        {([
          ['url-found', 'URL Found'],
          ['url-failed', 'URL Failed'],
          ['news', 'News Articles'],
          ['unsearched', 'Unsearched'],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === key
                ? 'bg-blue-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-center">
        {(tab === 'url-found' || tab === 'url-failed') && (
          <select
            value={countryFilter}
            onChange={(e) => setCountryFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100"
          >
            <option value="">All Countries</option>
            <option value="US">US</option>
            <option value="CA">CA</option>
          </select>
        )}

        {tab === 'url-found' && (
          <select
            value={workflowFilter}
            onChange={(e) => setWorkflowFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100"
          >
            <option value="">All Workflows</option>
            <option value="serpent">Serpent</option>
            <option value="claude">Claude</option>
          </select>
        )}

        {tab === 'news' && (
          <select
            value={sentimentFilter}
            onChange={(e) => setSentimentFilter(e.target.value)}
            className="bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-100"
          >
            <option value="">All Sentiments</option>
            <option value="positive">Positive</option>
            <option value="neutral">Neutral</option>
            <option value="negative">Negative</option>
            <option value="null">Unclassified</option>
          </select>
        )}

        <button
          onClick={loadSample}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium transition-colors disabled:opacity-50"
        >
          {loading ? 'Loading...' : 'Load New Sample'}
        </button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-900/30 border border-red-800 p-4 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Tables */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
        {tab === 'url-found' && (
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400">
                <th className="p-4 font-medium">Org Name</th>
                <th className="p-4 font-medium">City</th>
                <th className="p-4 font-medium">State</th>
                <th className="p-4 font-medium">Country</th>
                <th className="p-4 font-medium">Website URL</th>
                <th className="p-4 font-medium">Source</th>
                <th className="p-4 font-medium">Discovered</th>
              </tr>
            </thead>
            <tbody className="text-gray-100">
              {urlRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="p-4 text-center text-gray-500">
                    Click &quot;Load New Sample&quot; to fetch rows
                  </td>
                </tr>
              )}
              {urlRows.map((row) => (
                <tr key={row.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="p-4 font-medium max-w-48 truncate">{row.legal_name}</td>
                  <td className="p-4 text-gray-400">{row.city || '-'}</td>
                  <td className="p-4 text-gray-400">{row.state_province || '-'}</td>
                  <td className="p-4">{row.country || '-'}</td>
                  <td className="p-4 max-w-64 truncate">
                    {row.website_url ? (
                      <a
                        href={row.website_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline"
                      >
                        {row.website_url}
                      </a>
                    ) : (
                      '-'
                    )}
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        row.url_claude_searched_at
                          ? 'bg-purple-900/50 text-purple-400'
                          : 'bg-blue-900/50 text-blue-400'
                      }`}
                    >
                      {row.url_claude_searched_at ? 'Claude' : 'Serpent'}
                    </span>
                  </td>
                  <td className="p-4 text-gray-400 text-xs">
                    {row.url_searched_at
                      ? new Date(row.url_searched_at).toLocaleDateString()
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'url-failed' && (
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400">
                <th className="p-4 font-medium">Org Name</th>
                <th className="p-4 font-medium">City</th>
                <th className="p-4 font-medium">State</th>
                <th className="p-4 font-medium">Country</th>
                <th className="p-4 font-medium">Serpent Tried</th>
                <th className="p-4 font-medium">Claude Tried</th>
              </tr>
            </thead>
            <tbody className="text-gray-100">
              {failedRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-gray-500">
                    Click &quot;Load New Sample&quot; to fetch rows
                  </td>
                </tr>
              )}
              {failedRows.map((row) => (
                <tr key={row.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="p-4 font-medium max-w-48 truncate">{row.legal_name}</td>
                  <td className="p-4 text-gray-400">{row.city || '-'}</td>
                  <td className="p-4 text-gray-400">{row.state_province || '-'}</td>
                  <td className="p-4">{row.country || '-'}</td>
                  <td className="p-4 text-gray-400 text-xs">
                    {row.url_searched_at
                      ? new Date(row.url_searched_at).toLocaleDateString()
                      : '-'}
                  </td>
                  <td className="p-4 text-gray-400 text-xs">
                    {row.url_claude_searched_at
                      ? new Date(row.url_claude_searched_at).toLocaleDateString()
                      : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'news' && (
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400">
                <th className="p-4 font-medium">Org Name</th>
                <th className="p-4 font-medium">Title</th>
                <th className="p-4 font-medium">Source</th>
                <th className="p-4 font-medium">Date</th>
                <th className="p-4 font-medium">Sentiment</th>
                <th className="p-4 font-medium">URL</th>
              </tr>
            </thead>
            <tbody className="text-gray-100">
              {newsRows.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-gray-500">
                    Click &quot;Load New Sample&quot; to fetch rows
                  </td>
                </tr>
              )}
              {newsRows.map((row) => (
                <>
                  <tr
                    key={row.id}
                    className="border-b border-gray-800/50 hover:bg-gray-800/30 cursor-pointer"
                    onClick={() => toggleExpand(row.id)}
                  >
                    <td className="p-4 font-medium max-w-40 truncate">{row.org_name || '-'}</td>
                    <td className="p-4 max-w-56 truncate">{row.title || '-'}</td>
                    <td className="p-4 text-gray-400">{row.source_name || '-'}</td>
                    <td className="p-4 text-gray-400 text-xs">
                      {row.article_date || '-'}
                    </td>
                    <td className="p-4">
                      {row.sentiment ? (
                        <span
                          className={`px-2 py-1 rounded text-xs font-medium border ${
                            sentimentColor[row.sentiment] || 'bg-gray-800 text-gray-400 border-gray-700'
                          }`}
                        >
                          {row.sentiment}
                        </span>
                      ) : (
                        <span className="text-gray-600 text-xs">-</span>
                      )}
                    </td>
                    <td className="p-4">
                      {row.url ? (
                        <a
                          href={row.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-400 hover:underline text-xs"
                          onClick={(e) => e.stopPropagation()}
                        >
                          link
                        </a>
                      ) : (
                        '-'
                      )}
                    </td>
                  </tr>
                  {expandedNews.has(row.id) && (
                    <tr key={`${row.id}-detail`} className="bg-gray-800/30">
                      <td colSpan={6} className="p-4 text-sm text-gray-400">
                        {row.snippet || 'No snippet available'}
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}

        {tab === 'unsearched' && (
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="border-b border-gray-800 text-gray-400">
                <th className="p-4 font-medium">Org Name</th>
                <th className="p-4 font-medium">City</th>
                <th className="p-4 font-medium">State</th>
                <th className="p-4 font-medium">Country</th>
              </tr>
            </thead>
            <tbody className="text-gray-100">
              {unsearchedRows.length === 0 && (
                <tr>
                  <td colSpan={4} className="p-4 text-center text-gray-500">
                    Click &quot;Load New Sample&quot; to fetch rows
                  </td>
                </tr>
              )}
              {unsearchedRows.map((row) => (
                <tr key={row.id} className="border-b border-gray-800/50 hover:bg-gray-800/30">
                  <td className="p-4 font-medium max-w-48 truncate">{row.legal_name}</td>
                  <td className="p-4 text-gray-400">{row.city || '-'}</td>
                  <td className="p-4 text-gray-400">{row.state_province || '-'}</td>
                  <td className="p-4">{row.country || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
