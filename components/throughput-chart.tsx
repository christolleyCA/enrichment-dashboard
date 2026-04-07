'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'

interface LineConfig {
  key: string
  color: string
  label: string
}

interface ThroughputChartProps {
  data: Record<string, unknown>[]
  lines: LineConfig[]
  title: string
}

export default function ThroughputChart({ data, lines, title }: ThroughputChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-gray-100 mb-4">{title}</h3>
        <p className="text-gray-500 text-sm">No throughput data available</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
      <h3 className="text-lg font-semibold text-gray-100 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
          <XAxis
            dataKey="hour"
            stroke="#94a3b8"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            tickFormatter={(v: string) => {
              const d = new Date(v)
              return `${(d.getMonth() + 1)}/${d.getDate()} ${d.getHours()}:00`
            }}
            interval="preserveStartEnd"
          />
          <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#f3f4f6',
            }}
            labelFormatter={(v: unknown) => new Date(String(v)).toLocaleString()}
          />
          <Legend wrapperStyle={{ color: '#94a3b8' }} />
          {lines.map((line) => (
            <Line
              key={line.key}
              type="monotone"
              dataKey={line.key}
              name={line.label}
              stroke={line.color}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
