interface StatCardProps {
  label: string
  value: string
  sub?: string
  color?: string
}

export default function StatCard({ label, value, sub, color }: StatCardProps) {
  return (
    <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
      <p className="text-sm text-gray-400 mb-1">{label}</p>
      <p className={`text-3xl font-bold ${color || 'text-gray-100'}`}>{value}</p>
      {sub && <p className="text-sm text-gray-500 mt-1">{sub}</p>}
    </div>
  )
}
