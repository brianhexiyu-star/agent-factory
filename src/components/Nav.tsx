import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Bot, Network, ListChecks } from 'lucide-react'

const links = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/agents', label: 'Agents', icon: Bot },
  { to: '/org', label: 'Org Chart', icon: Network },
  { to: '/tasks', label: 'Tasks', icon: ListChecks },
]

export default function Nav() {
  return (
    <aside className="w-60 h-screen bg-gray-900 text-white flex flex-col shrink-0">
      <div className="px-5 py-6 border-b border-gray-700">
        <h1 className="text-lg font-bold tracking-tight">Agent Factory</h1>
      </div>
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-gray-700 text-white'
                  : 'text-gray-400 hover:text-white hover:bg-gray-800'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
    </aside>
  )
}
