import type { Agent } from './api'

export interface OrgNode {
  agent: Agent
  children: OrgNode[]
  depth: number
}

export interface ChainHealthResult {
  status: 'healthy' | 'warning' | 'broken'
  reason: string
  fullChain: Agent[]
  repairGuidance: string | null
}

/**
 * Build a tree from a flat agent list using reportsTo.
 * Returns roots (agents with reportsTo === null or pointing to non-existent agents).
 */
export function buildOrgTree(agents: Agent[]): OrgNode[] {
  const agentMap = new Map<string, Agent>()
  for (const a of agents) agentMap.set(a.id, a)

  const childrenOf = new Map<string | null, Agent[]>()
  for (const a of agents) {
    const parent = a.reportsTo && agentMap.has(a.reportsTo) ? a.reportsTo : null
    if (!childrenOf.has(parent)) childrenOf.set(parent, [])
    childrenOf.get(parent)!.push(a)
  }

  function build(parentId: string | null, depth: number): OrgNode[] {
    const kids = childrenOf.get(parentId) ?? []
    const orphanIds = new Set(childrenOf.get(null)?.map(a => a.id) ?? [])
    return kids
      .filter(a => {
        // If parent is null, only include agents that truly have no parent
        // (not agents whose parent is missing from the list)
        if (parentId === null) return true
        return !orphanIds.has(a.id)
      })
      .map(a => ({
        agent: a,
        children: build(a.id, depth + 1),
        depth,
      }))
  }

  // Roots: agents with reportsTo = null or pointing to missing agent
  const rootIds = new Set(childrenOf.get(null)?.map(a => a.id) ?? [])
  const roots: Agent[] = []
  for (const a of agents) {
    if (!a.reportsTo || !agentMap.has(a.reportsTo)) {
      if (!rootIds.has(a.id)) {
        rootIds.add(a.id)
        roots.push(a)
      }
    }
  }
  // Also include true null-reporting agents
  for (const a of childrenOf.get(null) ?? []) {
    if (!roots.find(r => r.id === a.id)) roots.push(a)
  }

  return roots.map(a => ({
    agent: a,
    children: build(a.id, 0),
    depth: 0,
  }))
}

/**
 * Walk up the reportsTo chain from an agent and return health info.
 */
export function checkChainHealth(agents: Agent[], agentId: string): ChainHealthResult {
  const agentMap = new Map<string, Agent>()
  for (const a of agents) agentMap.set(a.id, a)

  const visited = new Set<string>()
  const fullChain: Agent[] = []
  let current: Agent | undefined = agentMap.get(agentId)

  if (!current) {
    return {
      status: 'broken',
      reason: 'Agent not found in org',
      fullChain: [],
      repairGuidance: 'Re-create the agent',
    }
  }

  while (current) {
    if (visited.has(current.id)) {
      return {
        status: 'broken',
        reason: `Circular reference detected at ${current.name}`,
        fullChain,
        repairGuidance: `Break the cycle: reassign "${current.name}" to report to someone outside the loop`,
      }
    }
    visited.add(current.id)
    fullChain.push(current)

    if (current.status === 'terminated') {
      return {
        status: 'broken',
        reason: `"${current.name}" is terminated — chain is broken`,
        fullChain,
        repairGuidance: `Reassign subordinates of "${current.name}" to a different manager`,
      }
    }

    if (current.reportsTo) {
      const next = agentMap.get(current.reportsTo)
      if (!next) {
        return {
          status: 'broken',
          reason: `"${current.name}" reports to a non-existent agent`,
          fullChain,
          repairGuidance: `Update "${current.name}" to report to an existing agent or set reportsTo to null`,
        }
      }
      current = next
    } else {
      break
    }
  }

  // Check if any ancestor is paused with paused subordinates
  const pausedLeaves = fullChain.filter(a => a.status === 'paused' && a.reportsTo !== null)
  if (pausedLeaves.length > 0 && fullChain.length > 1) {
    return {
      status: 'warning',
      reason: `${pausedLeaves.length} paused agent(s) in the chain`,
      fullChain,
      repairGuidance: 'Resume paused agents to restore full chain health',
    }
  }

  return {
    status: 'healthy',
    reason: 'Org chain is intact',
    fullChain,
    repairGuidance: null,
  }
}

/**
 * Organize agents into a printable hierarchy for dropdowns.
 * Returns flat array with depth info for indentation.
 */
export interface HierarchyEntry {
  agent: Agent
  depth: number
}

export function flattenTree(nodes: OrgNode[]): HierarchyEntry[] {
  const result: HierarchyEntry[] = []
  function walk(list: OrgNode[]) {
    for (const node of list) {
      result.push({ agent: node.agent, depth: node.depth })
      if (node.children.length > 0) walk(node.children)
    }
  }
  walk(nodes)
  return result
}
