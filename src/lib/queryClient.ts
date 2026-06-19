import { QueryClient } from '@tanstack/react-query'
import { toastRef } from './toastRef'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
    },
    mutations: {
      onError: (error) => {
        toastRef.current?.(error instanceof Error ? error.message : 'An unexpected error occurred')
      },
    },
  },
})
