import * as React from 'react'
import { Outlet, createRootRoute } from '@tanstack/react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { useAppStore } from '../store/useAppStore'
import { isSupabaseConfigured } from '../lib/supabase'
import { AuthScreen } from '../components/auth/AuthScreen'
import { AppLayout } from '../components/layout/AppLayout'
import { ToastContainer } from '../components/ui/Toast'
import '../styles.css'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2,
      retry: 1,
    },
  },
})

export const Route = createRootRoute({
  component: RootComponent,
})

function RootComponent() {
  const { user, loading, initialized, initializeAuth } = useAppStore()

  React.useEffect(() => {
    initializeAuth()
  }, [initializeAuth])

  if (!initialized || (loading && !user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-rose-200 border-t-rose-600 rounded-full animate-spin" />
          <span className="text-xs font-medium text-gray-500">Memuat Rencanakan...</span>
        </div>
      </div>
    )
  }

  // If Supabase is configured and user is not authenticated, show Auth screen
  if (isSupabaseConfigured && !user) {
    return (
      <QueryClientProvider client={queryClient}>
        <AuthScreen />
      </QueryClientProvider>
    )
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AppLayout>
        <Outlet />
      </AppLayout>
      <ToastContainer />
      <TanStackDevtools
        config={{
          position: 'bottom-right',
        }}
        plugins={[
          {
            name: 'TanStack Router',
            render: <TanStackRouterDevtoolsPanel />,
          },
        ]}
      />
    </QueryClientProvider>
  )
}
