import { createServerClient } from './supabase'

export interface SubBalance {
  keyLabel: string
  snapshotBalance: number
  estimatedBalance: number
  queriesUsed: number
}

export interface BalanceInfo {
  provider: string
  label: string
  balanceDisplay: string
  balanceRaw: number
  unit: string
  percentRemaining: number
  status: 'healthy' | 'warning' | 'critical'
  lastChecked: string
  subBalances?: SubBalance[]
  error?: string
}

// Serpent cost per query (USD)
const SERPENT_COST_PER_URL_QUERY = 0.00002   // $0.02/1K (Bing search)
const SERPENT_COST_PER_NEWS_QUERY = 0.00001  // $0.01/1K (news)

// Known capacity baselines for % calculations
const DEEPSEEK_INITIAL_BALANCE = 10      // USD — approximate full top-up
const SERPER_INITIAL_CREDITS = 500000    // credits — approximate full allocation
const SCRAPINGDOG_REQUEST_LIMIT = 10000  // requests per plan

function getStatus(pct: number): 'healthy' | 'warning' | 'critical' {
  if (pct > 50) return 'healthy'
  if (pct >= 15) return 'warning'
  return 'critical'
}

export async function fetchDeepSeekBalance(): Promise<BalanceInfo> {
  try {
    const res = await fetch('https://api.deepseek.com/user/balance', {
      headers: { Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const balance = parseFloat(data.balance_infos?.[0]?.total_balance ?? '0')
    const pct = (balance / DEEPSEEK_INITIAL_BALANCE) * 100

    return {
      provider: 'deepseek',
      label: 'DeepSeek',
      balanceDisplay: `$${balance.toFixed(2)}`,
      balanceRaw: balance,
      unit: 'USD',
      percentRemaining: Math.min(pct, 100),
      status: getStatus(pct),
      lastChecked: new Date().toISOString(),
    }
  } catch (e) {
    return {
      provider: 'deepseek',
      label: 'DeepSeek',
      balanceDisplay: 'Error',
      balanceRaw: 0,
      unit: 'USD',
      percentRemaining: 0,
      status: 'critical',
      lastChecked: new Date().toISOString(),
      error: e instanceof Error ? e.message : 'Unknown error',
    }
  }
}

export async function fetchSerperBalance(): Promise<BalanceInfo> {
  try {
    const res = await fetch('https://google.serper.dev/account', {
      headers: { 'X-API-KEY': process.env.SERPER_API_KEY! },
    })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const credits = data.balance ?? data.credits ?? 0
    const pct = (credits / SERPER_INITIAL_CREDITS) * 100

    return {
      provider: 'serper',
      label: 'Serper',
      balanceDisplay: `${credits.toLocaleString()} credits`,
      balanceRaw: credits,
      unit: 'credits',
      percentRemaining: Math.min(pct, 100),
      status: getStatus(pct),
      lastChecked: new Date().toISOString(),
    }
  } catch (e) {
    return {
      provider: 'serper',
      label: 'Serper',
      balanceDisplay: 'Error',
      balanceRaw: 0,
      unit: 'credits',
      percentRemaining: 0,
      status: 'critical',
      lastChecked: new Date().toISOString(),
      error: e instanceof Error ? e.message : 'Unknown error',
    }
  }
}

export async function fetchScrapingDogBalance(): Promise<BalanceInfo> {
  try {
    const res = await fetch(
      `https://api.scrapingdog.com/account?api_key=${process.env.SCRAPINGDOG_API_KEY}`
    )
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    const used = data.requestUsed ?? 0
    const limit = data.requestLimit ?? SCRAPINGDOG_REQUEST_LIMIT
    const remaining = limit - used
    const pct = limit > 0 ? (remaining / limit) * 100 : 0

    return {
      provider: 'scrapingdog',
      label: 'ScrapingDog',
      balanceDisplay: `${remaining.toLocaleString()} / ${limit.toLocaleString()}`,
      balanceRaw: remaining,
      unit: 'requests',
      percentRemaining: Math.max(pct, 0),
      status: getStatus(pct),
      lastChecked: new Date().toISOString(),
    }
  } catch (e) {
    return {
      provider: 'scrapingdog',
      label: 'ScrapingDog',
      balanceDisplay: 'Error',
      balanceRaw: 0,
      unit: 'requests',
      percentRemaining: 0,
      status: 'critical',
      lastChecked: new Date().toISOString(),
      error: e instanceof Error ? e.message : 'Unknown error',
    }
  }
}

export async function estimateSerpentBalances(): Promise<BalanceInfo> {
  const supabase = createServerClient()

  // Get latest snapshot per key
  const { data: snapshots, error: snapErr } = await supabase
    .from('api_balance_snapshots')
    .select('*')
    .eq('provider', 'serpent')
    .order('snapshot_at', { ascending: false })

  if (snapErr || !snapshots?.length) {
    return {
      provider: 'serpent',
      label: 'Serpent (Estimated)',
      balanceDisplay: 'No data',
      balanceRaw: 0,
      unit: 'USD',
      percentRemaining: 0,
      status: 'critical',
      lastChecked: new Date().toISOString(),
      error: snapErr?.message || 'No snapshots found',
    }
  }

  // Deduplicate: keep only the latest snapshot per key_label
  const latestByKey = new Map<string, typeof snapshots[0]>()
  for (const s of snapshots) {
    if (!latestByKey.has(s.key_label)) {
      latestByKey.set(s.key_label, s)
    }
  }

  // Find the oldest snapshot_at to query usage since then
  let oldestSnapshot = new Date()
  for (const s of latestByKey.values()) {
    const dt = new Date(s.snapshot_at)
    if (dt < oldestSnapshot) oldestSnapshot = dt
  }

  // Get usage since oldest snapshot
  const { data: usage, error: usageErr } = await supabase.rpc('get_serpent_usage_since', {
    since_ts: oldestSnapshot.toISOString(),
  })

  const urlQueries = usage?.url_queries ?? 0
  const newsQueries = usage?.news_articles ?? 0
  const numKeys = latestByKey.size
  const totalQueryCost =
    (urlQueries / numKeys) * SERPENT_COST_PER_URL_QUERY +
    (newsQueries / numKeys) * SERPENT_COST_PER_NEWS_QUERY

  const subBalances: SubBalance[] = []
  let totalEstimated = 0
  let totalSnapshot = 0

  for (const [keyLabel, snapshot] of latestByKey) {
    const snapshotBal = parseFloat(snapshot.balance_value)
    const estimated = Math.max(snapshotBal - totalQueryCost, 0)
    totalEstimated += estimated
    totalSnapshot += snapshotBal
    subBalances.push({
      keyLabel,
      snapshotBalance: snapshotBal,
      estimatedBalance: estimated,
      queriesUsed: Math.round((urlQueries + newsQueries) / numKeys),
    })
  }

  // Assume initial combined balance was ~$120 across all keys
  const initialTotal = 120
  const pct = (totalEstimated / initialTotal) * 100

  return {
    provider: 'serpent',
    label: 'Serpent (Estimated)',
    balanceDisplay: `$${totalEstimated.toFixed(2)}`,
    balanceRaw: totalEstimated,
    unit: 'USD',
    percentRemaining: Math.min(pct, 100),
    status: getStatus(pct),
    lastChecked: new Date().toISOString(),
    subBalances,
    ...(usageErr ? { error: `Usage query failed: ${usageErr.message}` } : {}),
  }
}
