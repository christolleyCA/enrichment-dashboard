import { NextResponse } from 'next/server'
import {
  fetchDeepSeekBalance,
  fetchSerperBalance,
  fetchScrapingDogBalance,
  estimateSerpentBalances,
  type BalanceInfo,
} from '@/lib/balances'

export const dynamic = 'force-dynamic'

export async function GET() {
  const results = await Promise.allSettled([
    fetchDeepSeekBalance(),
    fetchSerperBalance(),
    fetchScrapingDogBalance(),
    estimateSerpentBalances(),
  ])

  const balances: BalanceInfo[] = results.map((r, i) => {
    if (r.status === 'fulfilled') return r.value
    const providers = ['deepseek', 'serper', 'scrapingdog', 'serpent']
    const labels = ['DeepSeek', 'Serper', 'ScrapingDog', 'Serpent (Estimated)']
    return {
      provider: providers[i],
      label: labels[i],
      balanceDisplay: 'Error',
      balanceRaw: 0,
      unit: 'USD',
      percentRemaining: 0,
      status: 'critical' as const,
      lastChecked: new Date().toISOString(),
      error: r.reason?.message || 'Fetch failed',
    }
  })

  return NextResponse.json({ balances })
}
