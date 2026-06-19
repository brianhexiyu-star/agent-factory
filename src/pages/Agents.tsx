import { useState, useEffect } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2, ExternalLink } from 'lucide-react'
import { getDefaultCompanyId, getAgents, deleteAgent, type Agent } from '../lib/api'
import { useToast } from '../components/Toast'
import CreateAgentModal from '../components/CreateAgentModal'

const ROLE_BADGE_COLORS: Record<string, string> = {
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

const STATUS_DOT_COLORS: Record<string, string> = {
  active: 'bg-green-500',
  paused: 'bg-yellow-500',
  idle: 'bg-blue-400',
  running: 'bg-blue-600',
  error: 'bg-red-500',
  pending_approval: 'bg-orange-500',
  terminated: 'bg-gray-400',
}

export default function Agents() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null)

  useEffect(() => {
    getDefaultCompanyId().then(setCompanyId).catch(() => {})
  }, [])

  const { data: agents, isLoading } = useQuery({
    queryKey: ['agents', companyId],
    queryFn: () => getAgents(companyId!),
    enabled: !!companyId,
  })

  const deleteMutation = useMutation({
    mutationFn: (agentId: string) => deleteAgent(agentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agents', companyId] })
      showToast('Agent deleted', 'success')
      setConfirmDelete(null)
    },
  })

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Agents</h2>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
        >
          <Plus size={18} />
          Create Agent
        </button>
      </div>

      {isLoading ? (
        <p className="text-gray-500">Loading agents...</p>
      ) : (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b text-left text-gray-500 font-medium">
                <th className="px-5 py-3">Name</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Adapter Type</th>
                <th className="px-5 py-3">Reports To</th>
                <th className="px-5 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {agents?.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-gray-400">
                    No agents yet. Click "Create Agent" to add one.
                  </td>
                </tr>
              )}
              {agents?.map(agent => (
                <tr key={agent.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">{agent.name}</td>
                  <td className="px-5 py-3">
                    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium capitalize ${ROLE_BADGE_COLORS[agent.role] ?? 'bg-gray-100 text-gray-700'}`}>
                      {agent.role}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <span className="flex items-center gap-1.5 capitalize">
                      <span className={`w-2 h-2 rounded-full ${STATUS_DOT_COLORS[agent.status] ?? 'bg-gray-300'}`} />
                      {agent.status}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{agent.adapterType}</td>
                  <td className="px-5 py-3 text-gray-600">
                    {agent.reportsTo ? (
                      <AgentName agentId={agent.reportsTo} agents={agents ?? []} />
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <a
                        href={`http://localhost:4000/${companyId}/agents/${agent.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded hover:bg-blue-50"
                        title="View details"
                      >
                        <ExternalLink size={16} />
                      </a>
                      {confirmDelete === agent.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => deleteMutation.mutate(agent.id)}
                            disabled={deleteMutation.isPending}
                            className="px-2 py-1 text-xs font-medium text-white bg-red-600 rounded hover:bg-red-700"
                          >
                            {deleteMutation.isPending ? '...' : 'Confirm'}
                          </button>
                          <button
                            onClick={() => setConfirmDelete(null)}
                            className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 rounded hover:bg-gray-200"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDelete(agent.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                          title="Delete agent"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <CreateAgentModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}

function AgentName({ agentId, agents }: { agentId: string; agents: Agent[] }) {
  const agent = agents.find(a => a.id === agentId)
  return <>{agent?.name ?? <span className="text-gray-400 italic">{agentId.slice(0, 8)}...</span>}</>
}
