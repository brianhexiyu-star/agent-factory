import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { createAgent, getAgents, getDefaultCompanyId, type CreateAgentInput } from '../lib/api'
import { useToast } from './Toast'

const AGENT_ROLES = [
  'ceo', 'cto', 'cmo', 'cfo', 'security',
  'engineer', 'designer', 'pm', 'qa', 'devops',
  'researcher', 'general',
] as const

const ROLE_LABELS: Record<string, string> = {
  ceo: 'CEO', cto: 'CTO', cmo: 'CMO', cfo: 'CFO',
  security: 'Security', engineer: 'Engineer', designer: 'Designer',
  pm: 'PM', qa: 'QA', devops: 'DevOps', researcher: 'Researcher',
  general: 'General',
}

const ADAPTER_TYPES = [
  'process',
  'http',
  'acpx_local',
  'claude_local',
  'codex_local',
  'cursor_cloud',
  'gemini_local',
  'opencode_local',
  'cursor',
  'openclaw_gateway',
]

interface Props {
  open: boolean
  onClose: () => void
}

export default function CreateAgentModal({ open, onClose }: Props) {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [role, setRole] = useState('general')
  const [adapterType, setAdapterType] = useState('process')
  const [reportsTo, setReportsTo] = useState('')

  useEffect(() => {
    getDefaultCompanyId().then(setCompanyId).catch(() => {})
  }, [])

  const { data: agents } = useQuery({
    queryKey: ['agents', companyId],
    queryFn: () => getAgents(companyId!),
    enabled: !!companyId,
  })

  const createMutation = useMutation({
    mutationFn: (data: CreateAgentInput) => createAgent(companyId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents', companyId] })
      showToast('Agent created successfully', 'success')
      handleClose()
    },
  })

  const handleClose = () => {
    setName('')
    setRole('general')
    setAdapterType('process')
    setReportsTo('')
    onClose()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    if (!companyId) return
    createMutation.mutate({
      name: name.trim(),
      role,
      adapterType,
      reportsTo: reportsTo || null,
    })
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">Create Agent</h3>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="e.g. Senior Engineer"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <select
              value={role}
              onChange={e => setRole(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              {AGENT_ROLES.map(r => (
                <option key={r} value={r}>{ROLE_LABELS[r]}</option>
              ))}
            </select>
          </div>

          {/* Adapter Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Adapter Type</label>
            <select
              value={adapterType}
              onChange={e => setAdapterType(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              {ADAPTER_TYPES.map(t => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          {/* Reports To */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reports To</label>
            <select
              value={reportsTo}
              onChange={e => setReportsTo(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="">— None —</option>
              {(agents ?? []).map(a => (
                <option key={a.id} value={a.id}>
                  {a.name} ({a.role})
                </option>
              ))}
            </select>
          </div>

          {/* Submit */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {createMutation.isPending ? 'Creating...' : 'Create Agent'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
