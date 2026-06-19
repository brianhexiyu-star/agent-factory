import { useQuery } from '@tanstack/react-query'
import { apiGet } from '../lib/api'
import { Activity, Bot, AlertTriangle } from 'lucide-react'

export default function Dashboard() {
  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: () => apiGet<{ status: string }>('/api/health'),
  })

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border p-6 shadow-sm">
          <div className="flex items-center gap-3 text-green-600 mb-2">
            <Activity size={20} />
            <span className="text-sm font-semibold uppercase tracking-wide">API Status</span>
          </div>
          <p className="text-2xl font-bold">{health?.status ?? '—'}</p>
        </div>
        <div className="bg-white rounded-xl border p-6 shadow-sm">
          <div className="flex items-center gap-3 text-blue-600 mb-2">
            <Bot size={20} />
            <span className="text-sm font-semibold uppercase tracking-wide">Agents</span>
          </div>
          <p className="text-2xl font-bold">—</p>
        </div>
        <div className="bg-white rounded-xl border p-6 shadow-sm">
          <div className="flex items-center gap-3 text-amber-600 mb-2">
            <AlertTriangle size={20} />
            <span className="text-sm font-semibold uppercase tracking-wide">Alerts</span>
          </div>
          <p className="text-2xl font-bold">0</p>
        </div>
      </div>
    </div>
  )
}
