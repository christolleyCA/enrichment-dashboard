'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface DonutSlice {
  name: string
  value: number
  color: string
}

interface DonutChartProps {
  data: DonutSlice[]
  title: string
  centerLabel?: string
  centerValue?: string
}

export default function DonutChart({ data, title, centerLabel, centerValue }: DonutChartProps) {
  const total = data.reduce((sum, d) => sum + d.value, 0)

  return (
    <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
      <h3 className="text-lg font-semibold text-gray-100 mb-4">{title}</h3>
      {total === 0 ? (
        <p className="text-gray-500 text-sm text-center py-8">No data yet</p>
      ) : (
        <div className="h-64 relative">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, i) => (
                  <Cell key={i} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #374151',
                  borderRadius: '0.5rem',
                  color: '#f3f4f6',
                  fontSize: '0.75rem',
                }}
                formatter={(value, name) => [
                  `${Number(value).toLocaleString()} (${((Number(value) / total) * 100).toFixed(1)}%)`,
                  String(name),
                ]}
              />
              <Legend
                verticalAlign="bottom"
                iconType="circle"
                iconSize={8}
                formatter={(value: string) => (
                  <span className="text-xs text-gray-400">{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
          {centerLabel && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none" style={{ marginBottom: '2rem' }}>
              <p className="text-2xl font-bold text-gray-100">{centerValue}</p>
              <p className="text-xs text-gray-500">{centerLabel}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
