# Agent Factory

A React-based management interface for creating and managing AI agents through the Paperclip API.

The project explores AI-agent infrastructure by providing a dedicated web interface for viewing agents, creating agents, deleting agents, and managing agent relationships.

## Features

- Dashboard and API health information
- Agent list and status display
- Create-agent workflow
- Delete-agent workflow
- Agent role and adapter configuration
- Reports-to hierarchy selection
- Paperclip API integration
- React Router navigation
- TanStack Query server state
- Toast-based error and success feedback
- Vite API proxy

## Tech Stack

- React 19
- TypeScript
- Vite
- Tailwind CSS
- React Router
- TanStack Query
- Lucide React
- Paperclip API

## Current Pages

| Route | Purpose | Status |
| --- | --- | --- |
| / | Dashboard and API health | Implemented |
| /agents | List, create, and delete agents | Implemented |
| /org | Agent organization | Placeholder |
| /tasks | Task configuration | Placeholder |

## API Integration

The frontend uses Paperclip endpoints for health checks, companies, agent listing, agent creation, agent details, and deletion.

During local development, Vite proxies /api requests to the Paperclip server to avoid browser CORS restrictions.

## Running Locally

~~~bash
pnpm install
pnpm run dev
~~~

The development server normally runs on http://localhost:5173.

The Paperclip backend must be running separately.

## Environment

Use environment variables for Paperclip configuration, for example:

~~~text
VITE_PAPERCLIP_API_KEY=
VITE_PAPERCLIP_COMPANY_ID=
VITE_PAPERCLIP_API_URL=
~~~

Never commit real API keys or other credentials.

## Architecture

~~~text
src/
├── components/
├── pages/
├── lib/
│   ├── api.ts
│   ├── queryClient.ts
│   └── toastRef.ts
├── App.tsx
└── main.tsx
~~~

The API layer isolates HTTP calls from React components. TanStack Query manages server state, while a toast bridge exposes mutation errors and success messages.

## Roadmap

- Agent organization chart
- Agent detail/edit page
- Task configuration
- Agent pause/resume controls
- Agent key management
- More adapter configuration

## Status

Evolving prototype for AI-agent management and Paperclip-based infrastructure.