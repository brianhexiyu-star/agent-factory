import { useState, useEffect, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  ChevronRight, ChevronDown, Bot, CheckCircle, AlertTriangle, Link2, X, Search,
} from 'lucide-react'
import {
  getDefaultCompanyId, getAgents, updateAgent, type Agent,
} from '../lib/api'
import { useToast } from '../components/Toast'
import { buildOrgTree, checkChainHealth, flattenTree, type OrgNode, type ChainHealthResult } from '../lib/org-chain'

const STATUS_BORDER: Record<string, string> = {
  active: 'border-green-400',
  paused: 'border-yellow-400',
  idle: 'border-gray-300',
  running: 'border-blue-400',
  error: 'border-red-400',
  pending_approval: 'border-orange-400',
  terminated: 'border-gray-400',
}

const ROLE_BADGE: Record<string, string> = {
  ceo: 'bg-purple-100 text-purple-700',
  cto: 'bg-blue-100 text-blue-700',
  cmo: 'bg-pink-100 text-pink-700',
  cfo: 'bg-green-100 text-green-700',
  security: 'bg-red-100 text-red-700',
  engineer: 'bg-indigo-100 text-indigo-700',
  designer: 'bg-rose-100 text-rose-700',
  pm: 'bg-amber-100 text-amber-700',
  qa: 'bg-teal-100 text-teal-700',
  devops: 'bg-cyan-100 text-cyan-700',
  researcher: 'bg-violet-100 text-violet-700',
  general: 'bg-gray-100 text-gray-700',
}

export default function OrgChart() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  const [managerModal, setManagerModal] = useState<{ agent: Agent } | null>(null)
  const [managerSearch, setManagerSearch] = useState('')

  useEffect(() => {
    getDefaultCompanyId().then(setCompanyId).catch(() => {})
  }, [])

  const { data: agents = [] } = useQuery({
    queryKey: ['agents', companyId],
    queryFn: () => getAgents(companyId!),
    enabled: !!companyId,
  })

  const tree = useMemo(() => buildOrgTree(agents), [agents])
  const agentMap = useMemo(() => {
    const m = new Map<string, Agent>()
    for (const a of agents) m.set(a.id, a)
    return m
  }, [agents])

  const healthCache = useMemo(() => {
    const cache = new Map<string, ChainHealthResult>()
    for (const a of agents) {
      cache.set(a.id, checkChainHealth(agents, a.id))
    }
    return cache
  }, [agents])

  const updateMutation = useMutation({
    mutationFn: ({ id, reportsTo }: { id: string; reportsTo: string | null }) =>
      updateAgent(id, { reportsTo }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents', companyId] })
      showToast('Reporting relationship updated', 'success')
      setManagerModal(null)
    },
  })

  const toggle = (id: string) => {
    setCollapsed(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Org Chart</h2>
        <span className="text-sm text-gray-500">{agents.length} agents</span>
      </div>

      {tree.length === 0 ? (
        <p className="text-gray-500">No agents loaded.</p>
      ) : (
        <div className="space-y-1">
          {tree.map((node) => (
            <OrgTreeNode
              key={node.agent.id}
              node={node}
              collapsed={collapsed}
              onToggle={toggle}
              health={healthCache.get(node.agent.id)!}
              onSetManager={(agent) => setManagerModal({ agent })}
              allAgents={agents}
              agentMap={agentMap}
            />
          ))}
        </div>
      )}

      {managerModal && (
        <SetManagerModal
          agent={managerModal.agent}
          allAgents={agents.filter(a => a.id !== managerModal.agent.id)}
          agentMap={agentMap}
          search={managerSearch}
          onSearch={setManagerSearch}
          onSelect={(newManagerId) => {
            updateMutation.mutate({ id: managerModal.agent.id, reportsTo: newManagerId })
          }}
          onClear={() => {
            updateMutation.mutate({ id: managerModal.agent.id, reportsTo: null })
          }}
          onClose={() => { setManagerModal(null); setManagerSearch('') }}
          isPending={updateMutation.isPending}
        />
      )}
    </div>
  )
}

// ── Tree Node ──────────────────────────────────────────────

function OrgTreeNode({
  node,
  collapsed,
  onToggle,
  health,
  onSetManager,
  allAgents,
  agentMap,
}: {
  node: OrgNode
  collapsed: Set<string>
  onToggle: (id: string) => void
  health: ChainHealthResult
  onSetManager: (agent: Agent) => void
  allAgents: Agent[]
  agentMap: Map<string, Agent>
}) {
  const isCollapsed = collapsed.has(node.agent.id)
  const hasChildren = node.children.length > 0
  const indent = node.depth * 28

  return (
    <div>
      <div
        className={`flex items-center gap-3 px-4 py-3 bg-white rounded-lg border-l-4 ${STATUS_BORDER[node.agent.status] ?? 'border-gray-300'} shadow-sm hover:shadow-md transition-shadow ml-[${indent}px]`}
        style={{ marginLeft: indent }}
      >
        {/* Expand/collapse */}
        <button
          onClick={() => onToggle(node.agent.id)}
          className={`shrink-0 text-gray-400 hover:text-gray-700 transition-transform ${hasChildren ? '' : 'invisible'}`}
        >
          {isCollapsed ? <ChevronRight size={18} /> : <ChevronDown size={18} />}
        </button>

        {/* Icon */}
        <Bot size={22} className="shrink-0 text-gray-500" />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-gray-900 truncate">{node.agent.name}</span>
            <span className={`shrink-0 px-1.5 py-0.5 rounded text-xs font-medium capitalize ${ROLE_BADGE[node.agent.role] ?? 'bg-gray-100 text-gray-700'}`}>
              {node.agent.role}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
            <span className="capitalize">{node.agent.status}</span>
            <span>{node.agent.adapterType}</span>
          </div>
        </div>

        {/* Health */}
        <div className="shrink-0" title={health.reason + (health.repairGuidance ? `\n${health.repairGuidance}` : '')}>
          {health.status === 'healthy' ? (
            <CheckCircle size={18} className="text-green-500" />
          ) : (
            <AlertTriangle size={18} className="text-amber-500" />
          )}
        </div>

        {/* Set manager */}
        <button
          onClick={() => onSetManager(node.agent)}
          className="shrink-0 flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-500 bg-gray-100 rounded hover:bg-gray-200"
        >
          <Link2 size={14} />
          Set Manager
        </button>
      </div>

      {/* Children */}
      {hasChildren && !isCollapsed && (
        <div className="relative">
          {/* Vertical connector line */}
          <div
            className="absolute left-[calc(28px+1.25rem)] top-0 bottom-0 w-px bg-gray-200"
            style={{ marginLeft: indent }}
          />
          {node.children.map(child => (
            <div key={child.agent.id} className="relative">
              {/* Horizontal connector */}
              <div
                className="absolute left-0 top-[1.625rem] w-[1.25rem] h-px bg-gray-200"
                style={{ marginLeft: indent + 28 }}
              />
              <OrgTreeNode
                node={child}
                collapsed={collapsed}
                onToggle={onToggle}
                health={health}
                onSetManager={onSetManager}
                allAgents={allAgents}
                agentMap={agentMap}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Set Manager Modal ──────────────────────────────────────

function SetManagerModal({
  agent,
  allAgents,
  agentMap,
  search,
  onSearch,
  onSelect,
  onClear,
  onClose,
  isPending,
}: {
  agent: Agent
  allAgents: Agent[]
  agentMap: Map<string, Agent>
  search: string
  onSearch: (s: string) => void
  onSelect: (id: string) => void
  onClear: () => void
  onClose: () => void
  isPending: boolean
}) {
  const filtered = search
    ? allAgents.filter(a => a.name.toLowerCase().includes(search.toLowerCase()))
    : allAgents

  const tree = useMemo(() => buildOrgTree([...allAgents, agent]), [allAgents, agent])
  const flatTree = useMemo(() => flattenTree(tree).filter(e => e.agent.id !== agent.id), [tree, agent.id])

  const displayList = search ? filtered.map(a => ({ agent: a, depth: 0 })) : flatTree

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-3 border-b">
          <h3 className="text-sm font-semibold">Set Manager for <span className="text-blue-600">{agent.name}</span></h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-5 py-3 border-b">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
            <Search size={16} className="text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => onSearch(e.target.value)}
              placeholder="Search agents..."
              className="bg-transparent border-none outline-none text-sm flex-1"
            />
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-0.5">
          {/* Clear option */}
          <button
            onClick={onClear}
            disabled={isPending}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 rounded-lg hover:bg-gray-100 disabled:opacity-50"
          >
            <span className="text-gray-400">—</span>
            No manager (top-level leader)
          </button>
          <div className="border-t my-1" />

          {displayList.length === 0 && (
            <p className="px-3 py-4 text-sm text-gray-400 text-center">No agents found</p>
          )}
          {displayList.map(({ agent: a, depth }) => (
            <button
              key={a.id}
              onClick={() => onSelect(a.id)}
              disabled={isPending}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-blue-50 disabled:opacity-50 text-left"
              style={{ paddingLeft: `${12 + depth * 20}px` }}
            >
              <Bot size={16} className="shrink-0 text-gray-400" />
              <span className="font-medium text-gray-900">{a.name}</span>
              <span className={`px-1 py-0.5 rounded text-[10px] font-medium capitalize ${ROLE_BADGE[a.role] ?? 'bg-gray-100 text-gray-700'}`}>
                {a.role}
              </span>
              <span className="ml-auto text-xs text-gray-400 capitalize">{a.status}</span>
            </button>
          ))}
        </div>

        <div className="px-5 py-3 border-t text-xs text-gray-400">
          Currently reports to: {agent.reportsTo ? agentMap.get(agent.reportsTo)?.name ?? agent.reportsTo.slice(0, 8) : '(none)'}
        </div>
      </div>
    </div>
  )
}
