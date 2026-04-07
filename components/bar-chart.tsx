'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface BarChartItem {
  name: string
  value: number
}

interface HorizontalBarChartProps {
  data: BarChartItem[]
  title: string
  color?: string
}

export default function HorizontalBarChart({
  data,
  title,
  color = '#3b82f6',
}: HorizontalBarChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-gray-100 mb-4">{title}</h3>
        <p className="text-gray-500 text-sm">No data available</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
      <h3 className="text-lg font-semibold text-gray-100 mb-4">{title}</h3>
      <ResponsiveContainer width="100%" height={Math.max(300, data.length * 32)}>
        <BarChart data={data} layout="vertical" margin={{ left: 120, right: 20, top: 5, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
          <XAxis type="number" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 11 }} />
          <YAxis
            type="category"
            dataKey="name"
            stroke="#94a3b8"
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            width={110}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '8px',
              color: '#f3f4f6',
            }}
          />
          <Bar dataKey="value" fill={color} radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
