'use client'

import { useEffect, useState, useCallback, useTransition } from 'react'
import { useRouter } from 'next/navigation'

const INTERVAL_OPTIONS = [30, 60, 120, 300] // seconds

export default function LiveRefresh() {
  const router = useRouter()
  const [intervalSec, setIntervalSec] = useState(60)
  const [secondsLeft, setSecondsLeft] = useState(60)
  const [paused, setPaused] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date())

  const refresh = useCallback(() => {
    startTransition(() => {
      router.refresh()
    })
    setLastRefresh(new Date())
    setSecondsLeft(intervalSec)
  }, [router, intervalSec])

  // Countdown timer
  useEffect(() => {
    if (paused) return
    const tick = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          refresh()
          return intervalSec
        }
        return prev - 1
      })
    }, 1000)
    return () => clearInterval(tick)
  }, [paused, intervalSec, refresh])

  // Reset countdown when interval changes
  useEffect(() => {
    setSecondsLeft(intervalSec)
  }, [intervalSec])

  const formatTime = (s: number) => {
    if (s >= 60) return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
    return `${s}s`
  }

  const pct = (secondsLeft / intervalSec) * 100

  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-3 bg-gray-900 border border-gray-700 rounded-xl px-4 py-2.5 shadow-lg">
      {/* Live indicator */}
      <div className="flex items-center gap-1.5">
        <span
          className={`inline-block w-2 h-2 rounded-full ${
            paused ? 'bg-gray-500' : 'bg-green-500 animate-pulse'
          }`}
        />
        <span className="text-xs font-medium text-gray-400">
          {isPending ? 'Refreshing...' : paused ? 'Paused' : 'Live'}
        </span>
      </div>

      {/* Circular countdown */}
      {!paused && (
        <div className="relative w-8 h-8">
          <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
            <circle
              cx="16" cy="16" r="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className="text-gray-800"
            />
            <circle
              cx="16" cy="16" r="14"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray={`${(pct / 100) * 87.96} 87.96`}
              strokeLinecap="round"
              className="text-blue-500 transition-all duration-1000 ease-linear"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-[9px] font-mono text-gray-300">
            {formatTime(secondsLeft)}
          </span>
        </div>
      )}

      {/* Interval selector */}
      <select
        value={intervalSec}
        onChange={(e) => setIntervalSec(Number(e.target.value))}
        className="bg-gray-800 border border-gray-700 rounded px-1.5 py-1 text-xs text-gray-300 cursor-pointer"
      >
        {INTERVAL_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s >= 60 ? `${s / 60}m` : `${s}s`}
          </option>
        ))}
      </select>

      {/* Pause / Resume */}
      <button
        onClick={() => setPaused((p) => !p)}
        className="text-xs text-gray-400 hover:text-gray-200 transition-colors px-1"
        title={paused ? 'Resume auto-refresh' : 'Pause auto-refresh'}
      >
        {paused ? '\u25B6' : '\u23F8'}
      </button>

      {/* Manual refresh */}
      <button
        onClick={refresh}
        disabled={isPending}
        className="text-xs text-blue-400 hover:text-blue-300 transition-colors disabled:opacity-50"
        title="Refresh now"
      >
        \u21BB
      </button>

      {/* Last refresh time */}
      <span className="text-[10px] text-gray-600">
        {lastRefresh.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        })}
      </span>
    </div>
  )
}
