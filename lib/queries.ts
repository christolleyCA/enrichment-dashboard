import { createServerClient } from './supabase'

export interface DashboardStats {
  total_orgs: number
  total_us: number
  total_ca: number
  has_url: number
  has_url_us: number
  has_url_ca: number
  url_serpent_searched: number
  url_serpent_searched_us: number
  url_serpent_searched_ca: number
  url_serpent_found: number
  url_serpent_found_us: number
  url_serpent_found_ca: number
  url_claude_searched: number
  url_claude_found: number
  url_both_failed: number
  url_serpent_failed_pending_claude: number
  url_unsearched: number
  min_url_searched_at: string | null
  max_url_searched_at: string | null
  min_news_claude_searched_at: string | null
  max_news_claude_searched_at: string | null
}

export interface NewsStats {
  total_articles: number
  unique_orgs: number
  positive: number
  neutral: number
  negative: number
  no_sentiment: number
  content_ok: number
  content_error: number
  content_paywall: number
  content_timeout: number
  content_unfetched: number
  min_discovered_at: string | null
  max_discovered_at: string | null
  articles_last_24h: number
  orgs_last_24h: number
}

export interface ThroughputRow {
  hour: string
  country?: string
  orgs_searched?: number
  urls_found?: number
  articles_found?: number
}

export interface TopSource {
  source_name: string
  article_count: number
}

export interface NewsDateRow {
  month: string
  article_count: number
}

export interface UrlSample {
  id: string
  legal_name: string
  city: string | null
  state_province: string | null
  country: string | null
  website_url: string | null
  url_searched_at: string | null
  url_claude_searched_at: string | null
}

export interface FailedUrlSample {
  id: string
  legal_name: string
  city: string | null
  state_province: string | null
  country: string | null
  url_searched_at: string | null
  url_claude_searched_at: string | null
}

export interface NewsSample {
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

export interface UnsearchedSample {
  id: string
  legal_name: string
  city: string | null
  state_province: string | null
  country: string | null
}

export interface TimeDelta {
  news_articles: number
  news_orgs: number
  serpent_urls: number
  claude_urls: number
}

export interface TimeDeltas {
  '5m': TimeDelta
  '1h': TimeDelta
  '5h': TimeDelta
  '24h': TimeDelta
  '2d': TimeDelta
  '7d': TimeDelta
}

export async function getTimeDeltas(): Promise<TimeDeltas> {
  const supabase = createServerClient()
  const { data, error } = await supabase.rpc('enrichment_time_deltas')
  if (error) throw new Error(`enrichment_time_deltas failed: ${error.message}`)
  return data as TimeDeltas
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const supabase = createServerClient()
  const { data, error } = await supabase.rpc('enrichment_dashboard_stats')
  if (error) throw new Error(`enrichment_dashboard_stats failed: ${error.message}`)
  return data as DashboardStats
}

export async function getNewsStats(): Promise<NewsStats> {
  const supabase = createServerClient()
  const { data, error } = await supabase.rpc('enrichment_news_stats')
  if (error) throw new Error(`enrichment_news_stats failed: ${error.message}`)
  return data as NewsStats
}

export async function getUrlThroughput(daysBack: number): Promise<ThroughputRow[]> {
  const supabase = createServerClient()
  const { data, error } = await supabase.rpc('url_discovery_throughput', { days_back: daysBack })
  if (error) throw new Error(`url_discovery_throughput failed: ${error.message}`)
  return (data as ThroughputRow[]) || []
}

export async function getNewsThroughput(daysBack: number): Promise<ThroughputRow[]> {
  const supabase = createServerClient()
  const { data, error } = await supabase.rpc('news_discovery_throughput', { days_back: daysBack })
  if (error) throw new Error(`news_discovery_throughput failed: ${error.message}`)
  return (data as ThroughputRow[]) || []
}

export async function getTopSources(limit: number): Promise<TopSource[]> {
  const supabase = createServerClient()
  const { data, error } = await supabase.rpc('top_news_sources', { limit_n: limit })
  if (error) throw new Error(`top_news_sources failed: ${error.message}`)
  return (data as TopSource[]) || []
}

export async function getNewsDateDistribution(): Promise<NewsDateRow[]> {
  const supabase = createServerClient()
  const { data, error } = await supabase.rpc('news_date_distribution')
  if (error) throw new Error(`news_date_distribution failed: ${error.message}`)
  return (data as NewsDateRow[]) || []
}

export interface ProviderRow {
  provider: string
  country: string
  urls_found: number
}

export interface ProviderBreakdown {
  all_time: ProviderRow[] | null
  last_24h: ProviderRow[] | null
  last_1h: ProviderRow[] | null
}

export async function getProviderBreakdown(): Promise<ProviderBreakdown> {
  const supabase = createServerClient()
  const { data, error } = await supabase.rpc('url_provider_breakdown')
  if (error) throw new Error(`url_provider_breakdown failed: ${error.message}`)
  return data as ProviderBreakdown
}

export async function getUrlSamples(
  country?: string,
  workflow?: 'serpent' | 'serper'
): Promise<UrlSample[]> {
  const supabase = createServerClient()
  let query = supabase
    .from('nfp_organizations')
    .select('id, legal_name, city, state_province, country, website_url, url_searched_at, url_claude_searched_at')
    .not('website_url', 'is', null)
    .order('url_searched_at', { ascending: false, nullsFirst: false })
    .limit(20)

  if (country) {
    query = query.eq('country', country)
  }
  if (workflow === 'serper') {
    query = query.not('url_claude_searched_at', 'is', null)
  } else if (workflow === 'serpent') {
    query = query.is('url_claude_searched_at', null).not('url_searched_at', 'is', null)
  }

  const { data, error } = await query
  if (error) throw new Error(`getUrlSamples failed: ${error.message}`)
  return (data as UrlSample[]) || []
}

export async function getFailedUrlSamples(country?: string): Promise<FailedUrlSample[]> {
  const supabase = createServerClient()
  let query = supabase
    .from('nfp_organizations')
    .select('id, legal_name, city, state_province, country, url_searched_at, url_claude_searched_at')
    .not('url_searched_at', 'is', null)
    .not('url_claude_searched_at', 'is', null)
    .is('website_url', null)
    .order('url_claude_searched_at', { ascending: false, nullsFirst: false })
    .limit(20)

  if (country) {
    query = query.eq('country', country)
  }

  const { data, error } = await query
  if (error) throw new Error(`getFailedUrlSamples failed: ${error.message}`)
  return (data as FailedUrlSample[]) || []
}

export async function getNewsSamples(sentiment?: string): Promise<NewsSample[]> {
  const supabase = createServerClient()
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

  if (sentiment) {
    if (sentiment === 'null') {
      query = query.is('sentiment', null)
    } else {
      query = query.eq('sentiment', sentiment)
    }
  }

  const { data, error } = await query
  if (error) throw new Error(`getNewsSamples failed: ${error.message}`)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return ((data as any[]) || []).map((row) => ({
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
}

export async function getUnsearchedSamples(): Promise<UnsearchedSample[]> {
  const supabase = createServerClient()
  const { data, error } = await supabase
    .from('nfp_organizations')
    .select('id, legal_name, city, state_province, country')
    .is('url_searched_at', null)
    .is('url_claude_searched_at', null)
    .limit(20)

  if (error) throw new Error(`getUnsearchedSamples failed: ${error.message}`)
  return (data as UnsearchedSample[]) || []
}
