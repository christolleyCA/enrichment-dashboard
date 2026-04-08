'use client'

import { useEffect, useState, useCallback } from 'react'

interface GpuData {
  gpus: Array<{
    index: number
    name: string
    temperature: number | null
    util_gpu: number | null
    util_mem: number | null
    mem_used: number | null
    mem_free: number | null
    mem_total: number | null
    power_draw: number | null
    power_limit: number | null
    fan_speed: number | null
    clock_gr: number | null
    clock_mem: number | null
  }>
  processes: Array<{ pid: string; name: string; mem_used: string }>
}

interface SystemData {
  ram: {
    total_bytes: number
    used_bytes: number
    available_bytes: number
    pct_used: number
    swap_total: number
    swap_used: number
  }
  disk: {
    root: { total: number; used: number; available: number; pct_used: number }
    storage: { total: number; used: number; available: number; pct_used: number }
  }
  cpu: { cores: number; load_1: number; load_5: number; load_15: number; load_pct: number }
  uptime_seconds: number
}

interface ServicesData {
  [key: string]: { status: string; active: boolean; port: number; model: string; gpus: string }
}

interface ApiResponse {
  available: boolean
  stale?: boolean
  updated_at: string | null
  gpu_data: GpuData | null
  system_data: SystemData | null
  services_data: ServicesData | null
}

function bytesToGB(bytes: number): string {
  return (bytes / 1073741824).toFixed(1)
}

function formatUptime(seconds: number): string {
  const d = Math.floor(seconds / 86400)
  const h = Math.floor((seconds % 86400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const parts = []
  if (d > 0) parts.push(`${d}d`)
  if (h > 0) parts.push(`${h}h`)
  parts.push(`${m}m`)
  return parts.join(' ')
}

function tempColor(temp: number | null): string {
  if (temp === null) return 'rgb(156,163,175)'
  if (temp < 60) return '#4ade80'
  if (temp < 75) return '#fbbf24'
  return '#f87171'
}

function utilColor(pct: number | null): string {
  if (pct === null) return '#6366f1'
  if (pct < 50) return '#4ade80'
  if (pct < 80) return '#fbbf24'
  return '#f87171'
}

function timeAgo(updatedAt: string | null): string {
  if (!updatedAt) return 'unknown'
  const secs = Math.floor((Date.now() - new Date(updatedAt).getTime()) / 1000)
  if (secs < 60) return `${secs}s ago`
  return `${Math.floor(secs / 60)}m ${secs % 60}s ago`
}

function ProgressBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${pct}%`, background: color }}
      />
    </div>
  )
}

function ProgressBarPct({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{ width: `${Math.min(100, pct)}%`, background: color }}
      />
    </div>
  )
}

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-gray-800 ${className}`} />
}

export default function SystemPage() {
  const [data, setData] = useState<ApiResponse | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch('/api/gpu')
      const json = await res.json()
      setData(json)
    } catch {
      // keep existing data
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
    const interval = setInterval(fetchData, 30_000)
    return () => clearInterval(interval)
  }, [fetchData])

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-64" />)}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[0, 1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-32" />)}
        </div>
      </div>
    )
  }

  const gpus = data?.gpu_data?.gpus ?? []
  const processes = data?.gpu_data?.processes ?? []
  const sys = data?.system_data
  const services = data?.services_data

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-100">GPU & System</h2>
          <p className="text-sm text-gray-500 mt-1">HP Z8 G4 · 4x RTX 5060 Ti · 96GB RAM</p>
        </div>
        <div className="flex items-center gap-3">
          {data?.stale && (
            <span className="text-xs px-2 py-1 rounded-full font-medium bg-amber-500/10 border border-amber-500/30 text-amber-400">
              STALE
            </span>
          )}
          {!data?.available && (
            <span className="text-xs px-2 py-1 rounded-full font-medium bg-red-500/10 border border-red-500/30 text-red-400">
              OFFLINE
            </span>
          )}
          {data?.updated_at && (
            <span className="text-xs text-gray-500">
              Data: {timeAgo(data.updated_at)}
            </span>
          )}
          <button
            onClick={fetchData}
            className="text-xs px-3 py-1.5 rounded-lg font-medium transition-colors bg-gray-800 border border-gray-700 text-gray-300 hover:bg-gray-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* GPU Cards */}
      {gpus.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {gpus.map((gpu) => (
            <div key={gpu.index} className="rounded-xl bg-gray-900 border border-gray-800 p-5 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-2 py-0.5 rounded-full font-mono font-bold bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                      GPU {gpu.index}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-gray-200">{gpu.name}</p>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold" style={{ color: tempColor(gpu.temperature) }}>
                    {gpu.temperature !== null ? `${gpu.temperature}°` : '—'}
                  </div>
                  <div className="text-[10px] uppercase tracking-wider text-gray-500">TEMP</div>
                  {gpu.fan_speed !== null && (
                    <div className="text-xs mt-1 text-gray-500">Fan {gpu.fan_speed}%</div>
                  )}
                </div>
              </div>

              {/* Compute */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-gray-500">COMPUTE</span>
                  <span className="text-sm font-semibold" style={{ color: utilColor(gpu.util_gpu) }}>
                    {gpu.util_gpu !== null ? `${gpu.util_gpu}%` : '—'}
                  </span>
                </div>
                <ProgressBarPct pct={gpu.util_gpu ?? 0} color={utilColor(gpu.util_gpu)} />
              </div>

              {/* VRAM */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-gray-500">VRAM</span>
                  <span className="text-sm font-semibold text-gray-300">
                    {gpu.mem_used !== null && gpu.mem_total !== null
                      ? `${gpu.mem_used} / ${gpu.mem_total} MiB`
                      : '—'}
                  </span>
                </div>
                <ProgressBar value={gpu.mem_used ?? 0} max={gpu.mem_total ?? 1} color="#a78bfa" />
                {gpu.mem_total !== null && gpu.mem_used !== null && (
                  <div className="text-xs mt-1 text-gray-500">
                    {((gpu.mem_used / gpu.mem_total) * 100).toFixed(1)}% used
                  </div>
                )}
              </div>

              {/* Power */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-gray-500">POWER</span>
                  <span className="text-sm font-semibold text-gray-300">
                    {gpu.power_draw !== null ? `${gpu.power_draw}W` : '—'}
                    {gpu.power_limit !== null && (
                      <span className="text-gray-500"> / {gpu.power_limit}W</span>
                    )}
                  </span>
                </div>
                <ProgressBar value={gpu.power_draw ?? 0} max={gpu.power_limit ?? 100} color="#fbbf24" />
              </div>

              {/* Mem BW */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-[10px] uppercase tracking-wider text-gray-500">MEM BW</span>
                  <span className="text-sm font-semibold text-gray-300">
                    {gpu.util_mem !== null ? `${gpu.util_mem}%` : '—'}
                  </span>
                </div>
                <ProgressBarPct pct={gpu.util_mem ?? 0} color="#38bdf8" />
              </div>

              {/* Clocks */}
              <div className="flex gap-4 text-xs text-gray-500">
                <div>
                  <span className="text-[10px] uppercase tracking-wider">GR CLOCK</span>
                  <p className="text-gray-400 mt-0.5">{gpu.clock_gr !== null ? `${gpu.clock_gr} MHz` : '—'}</p>
                </div>
                <div>
                  <span className="text-[10px] uppercase tracking-wider">MEM CLOCK</span>
                  <p className="text-gray-400 mt-0.5">{gpu.clock_mem !== null ? `${gpu.clock_mem} MHz` : '—'}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* System Stats */}
      {sys && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="rounded-xl bg-gray-900 border border-gray-800 p-4 space-y-2">
            <span className="text-[10px] uppercase tracking-wider text-gray-500">RAM</span>
            <div className="text-2xl font-bold text-gray-100">
              {bytesToGB(sys.ram.used_bytes)}
              <span className="text-sm font-normal text-gray-500">/{bytesToGB(sys.ram.total_bytes)} GB</span>
            </div>
            <ProgressBarPct pct={sys.ram.pct_used} color="#a78bfa" />
            <div className="text-xs text-gray-500">{sys.ram.pct_used.toFixed(1)}% used</div>
            {sys.ram.swap_total > 0 && (
              <div className="text-xs text-gray-600">
                Swap {bytesToGB(sys.ram.swap_used)}/{bytesToGB(sys.ram.swap_total)} GB
              </div>
            )}
          </div>

          <div className="rounded-xl bg-gray-900 border border-gray-800 p-4 space-y-2">
            <span className="text-[10px] uppercase tracking-wider text-gray-500">CPU</span>
            <div className="text-2xl font-bold text-gray-100">
              {sys.cpu.load_pct.toFixed(0)}<span className="text-sm font-normal text-gray-500">%</span>
            </div>
            <ProgressBarPct pct={sys.cpu.load_pct} color={utilColor(sys.cpu.load_pct)} />
            <div className="text-xs text-gray-500 space-y-0.5">
              <div>{sys.cpu.cores} cores</div>
              <div>Load {sys.cpu.load_1.toFixed(2)} / {sys.cpu.load_5.toFixed(2)} / {sys.cpu.load_15.toFixed(2)}</div>
            </div>
          </div>

          <div className="rounded-xl bg-gray-900 border border-gray-800 p-4 space-y-2">
            <span className="text-[10px] uppercase tracking-wider text-gray-500">ROOT (/)</span>
            <div className="text-2xl font-bold text-gray-100">
              {bytesToGB(sys.disk.root.used)}
              <span className="text-sm font-normal text-gray-500">/{bytesToGB(sys.disk.root.total)} GB</span>
            </div>
            <ProgressBarPct pct={sys.disk.root.pct_used} color="#38bdf8" />
            <div className="text-xs text-gray-500">{sys.disk.root.pct_used.toFixed(1)}% used</div>
          </div>

          <div className="rounded-xl bg-gray-900 border border-gray-800 p-4 space-y-2">
            <span className="text-[10px] uppercase tracking-wider text-gray-500">STORAGE (/mnt)</span>
            <div className="text-2xl font-bold text-gray-100">
              {bytesToGB(sys.disk.storage.used)}
              <span className="text-sm font-normal text-gray-500">/{bytesToGB(sys.disk.storage.total)} GB</span>
            </div>
            <ProgressBarPct pct={sys.disk.storage.pct_used} color="#38bdf8" />
            <div className="text-xs text-gray-500">{sys.disk.storage.pct_used.toFixed(1)}% used</div>
          </div>

          <div className="rounded-xl bg-gray-900 border border-gray-800 p-4 space-y-2">
            <span className="text-[10px] uppercase tracking-wider text-gray-500">UPTIME</span>
            <div className="text-2xl font-bold text-gray-100">{formatUptime(sys.uptime_seconds)}</div>
            <div className="text-xs text-gray-500">since last boot</div>
          </div>
        </div>
      )}

      {/* vLLM Services */}
      {services && Object.keys(services).length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
            vLLM Services
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.entries(services).map(([name, svc]) => (
              <div key={name} className="rounded-xl bg-gray-900 border border-gray-800 p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="text-sm font-semibold text-gray-100">{name}</div>
                    <div className="text-xs mt-0.5 text-gray-500">
                      :{svc.port} · GPUs {svc.gpus}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <div
                      className="w-2 h-2 rounded-full"
                      style={{
                        background: svc.active ? '#4ade80' : '#f87171',
                        boxShadow: svc.active
                          ? '0 0 6px rgba(74,222,128,0.6)'
                          : '0 0 6px rgba(248,113,113,0.6)',
                      }}
                    />
                    <span className="text-xs" style={{ color: svc.active ? '#4ade80' : '#f87171' }}>
                      {svc.active ? 'ACTIVE' : 'INACTIVE'}
                    </span>
                  </div>
                </div>
                <div className="text-xs font-mono truncate text-gray-500">{svc.model}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GPU Processes */}
      {processes.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-3">
            GPU Processes
          </h3>
          <div className="rounded-xl bg-gray-900 border border-gray-800 p-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left pb-2 text-[10px] uppercase tracking-wider text-gray-500 font-medium">PID</th>
                  <th className="text-left pb-2 text-[10px] uppercase tracking-wider text-gray-500 font-medium">NAME</th>
                  <th className="text-right pb-2 text-[10px] uppercase tracking-wider text-gray-500 font-medium">VRAM</th>
                </tr>
              </thead>
              <tbody>
                {processes.map((proc, i) => (
                  <tr key={i} className="border-b border-gray-800/50">
                    <td className="py-2 font-mono text-xs text-gray-500">{proc.pid}</td>
                    <td className="py-2 text-gray-300">{proc.name}</td>
                    <td className="py-2 text-right font-mono text-xs text-gray-400">{proc.mem_used}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Offline state */}
      {!data?.available && !loading && (
        <div className="rounded-xl bg-gray-900 border border-gray-800 p-10 text-center">
          <div className="text-4xl mb-3 opacity-40">&#x2B21;</div>
          <div className="text-gray-400 font-medium">System metrics unavailable</div>
          <div className="text-gray-600 text-sm mt-1">
            The metrics collector may not be running on Overlord.
          </div>
        </div>
      )}
    </div>
  )
}
