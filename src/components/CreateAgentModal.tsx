import { useState, useEffect, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { X, Bot, Search, Layers, UserPlus } from 'lucide-react'
import { createAgent, getAgents, getDefaultCompanyId, type CreateAgentInput } from '../lib/api'
import { useToast } from './Toast'
import { buildOrgTree, flattenTree } from '../lib/org-chain'

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
  'process', 'http', 'acpx_local', 'claude_local', 'codex_local',
  'cursor_cloud', 'gemini_local', 'opencode_local', 'cursor', 'openclaw_gateway',
]

interface Props {
  open: boolean
  onClose: () => void
}

export default function CreateAgentModal({ open, onClose }: Props) {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [companyId, setCompanyId] = useState<string | null>(null)

  // Single mode
  const [name, setName] = useState('')
  const [role, setRole] = useState('general')
  const [adapterType, setAdapterType] = useState('process')
  const [reportsTo, setReportsTo] = useState('')
  const [reportsSearch, setReportsSearch] = useState('')
  const [showReportsDropdown, setShowReportsDropdown] = useState(false)

  // Batch mode
  const [batchMode, setBatchMode] = useState(false)
  const [batchPrefix, setBatchPrefix] = useState('Worker-')
  const [batchCount, setBatchCount] = useState(3)

  // Post-create
  const [createdAgentId, setCreatedAgentId] = useState<string | null>(null)

  useEffect(() => {
    getDefaultCompanyId().then(setCompanyId).catch(() => {})
  }, [])

  const { data: agents = [] } = useQuery({
    queryKey: ['agents', companyId],
    queryFn: () => getAgents(companyId!),
    enabled: !!companyId,
  })

  const orgTree = useMemo(() => buildOrgTree(agents), [agents])
  const flatTree = useMemo(() => flattenTree(orgTree), [orgTree])

  const filteredReports = useMemo(() => {
    if (!reportsSearch) return flatTree
    return flatTree.filter(e =>
      e.agent.name.toLowerCase().includes(reportsSearch.toLowerCase())
    )
  }, [flatTree, reportsSearch])

  const selectedManager = reportsTo ? agents.find(a => a.id === reportsTo) : null

  const createMutation = useMutation({
    mutationFn: (data: CreateAgentInput) => createAgent(companyId!, data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['agents', companyId] })
      if (batchMode) {
        showToast('Worker created', 'success')
      } else {
        showToast('Agent created successfully', 'success')
        setCreatedAgentId(result.id)
      }
    },
  })

  const canCreateBatch = batchMode && batchPrefix.trim() && batchCount > 0 && batchCount <= 50

  const handleBatchCreate = () => {
    if (!canCreateBatch || !companyId) return
    for (let i = 1; i <= batchCount; i++) {
      createMutation.mutate({
        name: `${batchPrefix.trim()}${i}`,
        role,
        adapterType,
        reportsTo: reportsTo || null,
      })
    }
    showToast(`Creating ${batchCount} workers...`, 'info')
  }

  const handleClose = () => {
    setName('')
    setRole('general')
    setAdapterType('process')
    setReportsTo('')
    setReportsSearch('')
    setBatchMode(false)
    setBatchPrefix('Worker-')
    setBatchCount(3)
    setCreatedAgentId(null)
    onClose()
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || !companyId) return
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
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">
            {batchMode ? 'Create Workers' : 'Create Agent'}
          </h3>
          <button onClick={handleClose} className="text-gray-400 hover:text-gray-700">
            <X size={20} />
          </button>
        </div>

        {/* Mode toggle */}
        <div className="px-6 pt-4 pb-2">
          <button
            type="button"
            onClick={() => setBatchMode(!batchMode)}
            className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
              batchMode
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {batchMode ? <UserPlus size={14} /> : <Layers size={14} />}
            {batchMode ? 'Single mode' : 'Batch mode'}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 pt-2 space-y-4">
          {/* ── Single mode fields ── */}
          {!batchMode && (
            <>
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
            </>
          )}

          {/* ── Batch mode fields ── */}
          {batchMode && (
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Prefix</label>
                <input
                  type="text"
                  value={batchPrefix}
                  onChange={e => setBatchPrefix(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  placeholder="e.g. Worker-"
                />
              </div>
              <div className="w-24">
                <label className="block text-sm font-medium text-gray-700 mb-1">Count</label>
                <input
                  type="number"
                  min={1}
                  max={50}
                  value={batchCount}
                  onChange={e => setBatchCount(Number(e.target.value))}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
            </div>
          )}

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

          {/* Reports To — searchable hierarchical dropdown */}
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reports To
              <span className="font-normal text-gray-400 ml-1">(optional)</span>
            </label>
            <div
              className="flex items-center gap-2 w-full border rounded-lg px-3 py-2 text-sm cursor-pointer hover:border-gray-400"
              onClick={() => setShowReportsDropdown(!showReportsDropdown)}
            >
              {selectedManager ? (
                <>
                  <Bot size={16} className="shrink-0 text-gray-400" />
                  <span className="flex-1">{selectedManager.name}</span>
                  <span className={`px-1 py-0.5 rounded text-[10px] font-medium capitalize bg-gray-100 text-gray-600`}>
                    {selectedManager.role}
                  </span>
                </>
              ) : (
                <span className="text-gray-400">— None (top-level leader) —</span>
              )}
            </div>

            {showReportsDropdown && (
              <div className="absolute z-50 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-64 flex flex-col">
                <div className="flex items-center gap-2 px-3 py-2 border-b">
                  <Search size={14} className="text-gray-400" />
                  <input
                    type="text"
                    value={reportsSearch}
                    onChange={e => setReportsSearch(e.target.value)}
                    placeholder="Search agents..."
                    className="flex-1 text-sm border-none outline-none bg-transparent"
                    autoFocus
                    onClick={e => e.stopPropagation()}
                  />
                </div>
                <div className="overflow-y-auto flex-1 py-1">
                  <button
                    type="button"
                    onClick={() => { setReportsTo(''); setShowReportsDropdown(false); setReportsSearch('') }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 text-left"
                  >
                    <span className="text-gray-300">—</span>
                    None (top-level leader)
                  </button>
                  {filteredReports.length === 0 && (
                    <p className="px-3 py-4 text-sm text-gray-400 text-center">No agents found</p>
                  )}
                  {filteredReports.map(({ agent: a, depth }) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => { setReportsTo(a.id); setShowReportsDropdown(false); setReportsSearch('') }}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-blue-50 text-left ${
                        reportsTo === a.id ? 'bg-blue-50' : ''
                      }`}
                      style={{ paddingLeft: `${12 + depth * 20}px` }}
                    >
                      <Bot size={15} className="shrink-0 text-gray-400" />
                      <span className="font-medium text-gray-900 truncate">{a.name}</span>
                      <span className={`shrink-0 px-1 py-0.5 rounded text-[10px] font-medium capitalize bg-gray-100 text-gray-600`}>
                        {a.role}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          {batchMode ? (
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!canCreateBatch || createMutation.isPending}
                onClick={handleBatchCreate}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Layers size={16} />
                {createMutation.isPending ? 'Creating...' : `Create ${batchCount} Workers`}
              </button>
            </div>
          ) : (
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                Cancel
              </button>
              {createdAgentId ? (
                <button
                  type="button"
                  onClick={() => { handleClose(); navigate('/org') }}
                  className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700"
                >
                  View in Org Chart
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={!name.trim() || createMutation.isPending}
                  className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Creating...' : 'Create Agent'}
                </button>
              )}
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
