# Agent Factory — Summary for AI Agent Handoff

## Project Location

```
~/Desktop/agent-factory/
```

## Running Dev Server

```bash
cd ~/Desktop/agent-factory
pnpm run dev
# opens on http://localhost:5173
```

The dev server should already be running. Check with:

```bash
curl -s -o /dev/null -w "%{http_code}" http://localhost:5173
```

## Environment

`.env` file:

```
VITE_PAPERCLIP_API_KEY=pcp_board_60ea470d3e8cf42a040d46847b6efa137c44af19f7a31954
VITE_PAPERCLIP_COMPANY_ID=09638ead-76fa-476f-927b-038a7a57203a
```

- **API Key**: Board API key (NOT agent key — agent keys can't read `/api/companies`)
- **Company ID**: Pre-configured to skip `GET /api/companies` lookup
- **API URL**: Not set — uses empty string (relative paths via Vite proxy)

## CORS / Proxy

Paperclip Docker runs on `http://localhost:4000`. The Vite dev server proxies `/api/*` requests there:

```ts
// vite.config.ts
server: {
  proxy: {
    '/api': { target: 'http://localhost:4000', changeOrigin: true }
  }
}
```

All API paths in `src/lib/api.ts` use `/api/...` prefix so they hit the proxy. If `VITE_PAPERCLIP_API_URL` is set to an absolute URL, it overrides the proxy.

## Project Structure

```
agent-factory/
├── .env                          # API key + company ID
├── vite.config.ts                # Vite + React + Tailwind + /api proxy
├── package.json                  # React 19, react-router, TanStack Query, Tailwind v4, Lucide
├── src/
│   ├── main.tsx                  # Entry: BrowserRouter + App
│   ├── App.tsx                   # QueryClientProvider + ToastProvider + Nav + Routes
│   ├── index.css                 # Tailwind v4 import
│   ├── lib/
│   │   ├── api.ts                # Fetch wrapper + Company/Agent API functions
│   │   ├── queryClient.ts        # TanStack Query client with global mutation onError → toast
│   │   └── toastRef.ts           # Global ref bridge so queryClient can call toast outside React tree
│   ├── components/
│   │   ├── Nav.tsx               # Left sidebar nav (Dashboard, Agents, Org, Tasks)
│   │   ├── Toast.tsx             # Toast provider (error/success/info, 5s auto-dismiss)
│   │   └── CreateAgentModal.tsx  # Modal form for creating agents
│   └── pages/
│       ├── Dashboard.tsx         # / — API health, summary cards
│       ├── Agents.tsx            # /agents — Agent list table + create/delete
│       ├── Org.tsx               # /org — Placeholder
│       └── Tasks.tsx             # /tasks — Placeholder
```

## What's Implemented (Phase 1 + Phase 2)

### Pages

| Route | Page | Status |
|-------|------|--------|
| `/` | Dashboard — API health check, placeholder cards | Done |
| `/agents` | Agent list table with create/delete | Done |
| `/org` | Org chart | Placeholder |
| `/tasks` | Configuration tasks | Placeholder |

### Agent CRUD

- **List**: `GET /api/companies/{companyId}/agents` — table with Name, Role (color badge), Status (dot indicator), Adapter Type, Reports To
- **Create**: `POST /api/companies/{companyId}/agents` — modal form with name, role (12 options), adapter type (10 options), reportsTo (dropdown of existing agents)
- **Delete**: `DELETE /api/agents/{agentId}` — requires confirmation click
- **View**: External link to Paperclip UI agent detail page

### API Client (`src/lib/api.ts`)

```typescript
getCompanies()              → GET /api/companies
getDefaultCompanyId()       → env var or first company
getAgents(companyId)        → GET /api/companies/{id}/agents
getAgent(agentId)           → GET /api/agents/{id}
createAgent(companyId, data) → POST /api/companies/{id}/agents
deleteAgent(agentId)        → DELETE /api/agents/{id}
```

### Error Handling

- All API errors → red Toast (top-right, 5s auto-dismiss)
- Mutation success → green Toast
- Global `queryClient.defaultOptions.mutations.onError` bridges to Toast via `toastRef`
- `ApiError` class with `.status` for programmatic handling

## Paperclip API Reference

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/health` | GET | Health check |
| `/api/companies` | GET | List companies |
| `/api/companies/{companyId}` | GET | Get company |
| `/api/companies/{companyId}/agents` | GET | List agents |
| `/api/companies/{companyId}/agents` | POST | Create agent |
| `/api/agents/{id}` | GET | Get agent detail |
| `/api/agents/{id}` | DELETE | Delete agent |

### Agent object fields (relevant)

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | UUID |
| `name` | string | Agent name |
| `role` | string | ceo/cto/cmo/cfo/security/engineer/designer/pm/qa/devops/researcher/general |
| `status` | string | active/paused/idle/running/error/pending_approval/terminated |
| `adapterType` | string | process/http/claude_local/codex_local/opencode_local/openclaw_gateway/... |
| `reportsTo` | string\|null | Parent agent UUID |
| `adapterConfig` | object | Adapter-specific configuration |
| `urlKey` | string | URL-safe name key |
| `createdAt` | string | ISO date |

### CreateAgentInput

```typescript
{
  name: string;           // required
  role?: string;          // default "general"
  adapterType: string;    // required
  reportsTo?: string|null;
  title?: string|null;
  icon?: string|null;
  capabilities?: string|null;
  adapterConfig?: Record<string, unknown>;
  budgetMonthlyCents?: number;
}
```

Note: `status` is NOT accepted on create — only set via PATCH after creation.

## Key Engineering Decisions

1. **Vite proxy over CORS** — Paperclip server has no CORS middleware. All requests go through Vite's dev proxy to avoid browser CORS preflight blocking POST/PATCH/DELETE.
2. **Toast via global ref** — `queryClient` is created at module level (outside React tree). A `toastRef` module-level mutable ref bridges the gap: `App.tsx` -> `ToastInit` sets `toastRef.current = showToast` on mount.
3. **Empty BASE_URL by default** — Uses relative paths (`/api/...`) so the Vite proxy handles them. Absolute URL in `VITE_PAPERCLIP_API_URL` overrides for production/standalone use.

## Next Possible Steps (Phase 3)

- Org Chart page (`/org`) — visualize agent hierarchy using `GET /api/companies/{companyId}/org`
- Agent detail/edit page (`/agents/:id`)
- Task configuration page (`/tasks`)
- Agent status toggle (pause/resume)
- Agent key management (create/revoke API keys)
