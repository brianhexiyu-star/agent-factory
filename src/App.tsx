import { Routes, Route } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClient } from './lib/queryClient'
import { ToastProvider, useToast } from './components/Toast'
import { toastRef } from './lib/toastRef'
import Nav from './components/Nav'
import Dashboard from './pages/Dashboard'
import Agents from './pages/Agents'
import Org from './pages/Org'
import Tasks from './pages/Tasks'
import { useEffect } from 'react'

function ToastInit() {
  const { showToast } = useToast()
  useEffect(() => {
    toastRef.current = showToast
    return () => {
      toastRef.current = null
    }
  }, [showToast])
  return null
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ToastInit />
        <div className="flex min-h-screen bg-gray-50">
          <Nav />
          <main className="flex-1 overflow-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/agents" element={<Agents />} />
              <Route path="/org" element={<Org />} />
              <Route path="/tasks" element={<Tasks />} />
            </Routes>
          </main>
        </div>
      </ToastProvider>
    </QueryClientProvider>
  )
}
