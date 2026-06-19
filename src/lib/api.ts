const BASE_URL = import.meta.env.VITE_PAPERCLIP_API_URL ?? ''
const API_KEY: string | undefined = import.meta.env.VITE_PAPERCLIP_API_KEY
const COMPANY_ID: string | undefined = import.meta.env.VITE_PAPERCLIP_COMPANY_ID

let cachedCompanyId: string | null = null

class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (API_KEY) {
    headers['Authorization'] = `Bearer ${API_KEY}`
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body != null ? JSON.stringify(body) : undefined,
  })

  if (!res.ok) {
    const errorBody = await res.json().catch(() => ({ message: res.statusText }))
    throw new ApiError(errorBody.message ?? `Request failed: ${res.status}`, res.status)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export function apiGet<T>(path: string): Promise<T> {
  return request<T>('GET', path)
}

export function apiPost<T>(path: string, body?: unknown): Promise<T> {
  return request<T>('POST', path, body)
}

export function apiPatch<T>(path: string, body?: unknown): Promise<T> {
  return request<T>('PATCH', path, body)
}

export function apiDelete<T>(path: string): Promise<T> {
  return request<T>('DELETE', path)
}

export { ApiError }

// ── Company ────────────────────────────────────────────────
export interface Company {
  id: string
  name: string
  description: string | null
  status: string
}

export function getCompanies(): Promise<Company[]> {
  return apiGet<Company[]>('/api/companies')
}

export async function getDefaultCompanyId(): Promise<string> {
  if (COMPANY_ID) return COMPANY_ID
  if (cachedCompanyId) return cachedCompanyId
  const companies = await getCompanies()
  if (companies.length === 0) throw new ApiError('No companies found', 404)
  cachedCompanyId = companies[0].id
  return cachedCompanyId
}

// ── Agent ──────────────────────────────────────────────────
export interface Agent {
  id: string
  companyId: string
  name: string
  urlKey: string
  role: string
  title: string | null
  icon: string | null
  status: string
  reportsTo: string | null
  capabilities: string | null
  adapterType: string
  adapterConfig: Record<string, unknown>
  budgetMonthlyCents: number
  spentMonthlyCents: number
  pauseReason: string | null
  pausedAt: string | null
  permissions: Record<string, unknown>
  lastHeartbeatAt: string | null
  metadata: Record<string, unknown> | null
  createdAt: string
  updatedAt: string
}

export interface CreateAgentInput {
  name: string
  role?: string
  title?: string | null
  icon?: string | null
  reportsTo?: string | null
  capabilities?: string | null
  adapterType: string
  adapterConfig?: Record<string, unknown>
  budgetMonthlyCents?: number
}

export function getAgents(companyId: string): Promise<Agent[]> {
  return apiGet<Agent[]>(`/api/companies/${companyId}/agents`)
}

export function getAgent(agentId: string): Promise<Agent> {
  return apiGet<Agent>(`/api/agents/${agentId}`)
}

export function createAgent(companyId: string, data: CreateAgentInput): Promise<Agent> {
  return apiPost<Agent>(`/api/companies/${companyId}/agents`, data)
}

export function deleteAgent(agentId: string): Promise<void> {
  return apiDelete<void>(`/api/agents/${agentId}`)
}
