import * as React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useRouterState } from '@tanstack/react-router'
import {
  LayoutDashboard,
  Wallet,
  Store,
  CheckSquare,
  Users,
  LogOut,
  Plus,
  Heart,
  AlertCircle,
} from 'lucide-react'
import { useAppStore } from '../../store/useAppStore'
import { Button } from '../ui/Button'
import { Modal } from '../ui/Modal'
import { Input } from '../ui/Input'
import { CurrencyInput } from '../ui/CurrencyInput'
import { Select } from '../ui/Select'
import { DatePicker } from '../ui/DatePicker'
import { isSupabaseConfigured } from '../../lib/supabase'
import { workspaceSchema, type WorkspaceFormValues } from '../../lib/schemas'

export function AppLayout({ children }: { children: React.ReactNode }) {
  const router = useRouterState()
  const currentPath = router.location.pathname

  const {
    user,
    currentWorkspace,
    workspaces,
    setCurrentWorkspace,
    createWorkspace,
    signOut,
  } = useAppStore()

  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const {
    register: registerWorkspace,
    handleSubmit: handleWorkspaceSubmit,
    control: workspaceControl,
    reset: resetWorkspace,
    formState: { errors: workspaceErrors },
  } = useForm<WorkspaceFormValues>({
    resolver: zodResolver(workspaceSchema),
    defaultValues: {
      groom_name: '',
      bride_name: '',
      wedding_date: '',
      total_budget_target: 0,
      savings_target: 0,
    },
  })

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Finance', path: '/finance', icon: Wallet },
    { label: 'Vendors', path: '/vendors', icon: Store },
    { label: 'Checklist', path: '/checklist', icon: CheckSquare },
    { label: 'Tamu', path: '/guests', icon: Users },
  ]

  const onCreateWorkspace = async (data: WorkspaceFormValues) => {
    setIsSubmitting(true)
    try {
      await createWorkspace({
        bride_name: data.bride_name,
        groom_name: data.groom_name,
        wedding_date: data.wedding_date || null,
        total_budget_target: Number(data.total_budget_target) || 0,
        savings_target: Number(data.savings_target) || 0,
      })
      setIsCreateModalOpen(false)
      resetWorkspace()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col antialiased">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-14 sm:h-16 flex items-center justify-between gap-2">
          {/* Brand Logo & Name */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-xs">
              <Heart className="w-4 h-4 sm:w-5 sm:h-5 fill-current" />
            </div>
            <div>
              <span className="font-bold text-gray-900 tracking-tight text-base sm:text-lg">
                Rencanakan
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                Wedding SaaS
              </span>
            </div>
          </div>

          {/* Workspace Switcher & User Actions */}
          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0">
            {workspaces.length > 0 ? (
              <div className="w-28 xs:w-36 sm:w-56 min-w-0">
                <Select
                  value={currentWorkspace?.id || ''}
                  onChange={(e) => {
                    const ws = workspaces.find((w) => w.id === e.target.value)
                    if (ws) setCurrentWorkspace(ws)
                  }}
                  options={workspaces.map((ws) => ({
                    label: `${ws.groom_name} & ${ws.bride_name}`,
                    value: ws.id,
                  }))}
                />
              </div>
            ) : null}

            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsCreateModalOpen(true)}
              className="hidden sm:inline-flex gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>Workspace Baru</span>
            </Button>

            {user && (
              <Button
                size="sm"
                variant="ghost"
                onClick={signOut}
                title="Keluar"
                className="text-gray-500 hover:text-red-600 shrink-0 h-8 w-8 sm:h-9 sm:w-9 p-0 flex items-center justify-center"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Supabase Config Warning (if credentials not filled) */}
      {!isSupabaseConfigured && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-800 flex items-center justify-center gap-2 text-center">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Supabase belum terkonfigurasi. Silakan isi <code>.env</code> dengan{' '}
            <code>VITE_SUPABASE_URL</code> dan <code>VITE_SUPABASE_ANON_KEY</code>.
          </span>
        </div>
      )}

      {/* Main Container with Sidebar + Content */}
      <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex gap-6 pb-24 lg:pb-8">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 shrink-0">
          <div className="sticky top-24 space-y-1">
            <div className="p-3 bg-white border border-gray-200 rounded-xl mb-4">
              <div className="text-xs text-gray-500 font-medium">Acara Aktif:</div>
              <div className="font-semibold text-gray-900 text-sm truncate mt-0.5">
                {currentWorkspace
                  ? `${currentWorkspace.groom_name} & ${currentWorkspace.bride_name}`
                  : 'Belum Ada Workspace'}
              </div>
              {currentWorkspace?.wedding_date && (
                <div className="text-xs text-rose-600 mt-1 font-medium">
                  {currentWorkspace.wedding_date}
                </div>
              )}
            </div>

            <nav className="space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive =
                  item.path === '/'
                    ? currentPath === '/'
                    : currentPath.startsWith(item.path)
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </Link>
                )
              })}
            </nav>
          </div>
        </aside>

        {/* Content Area */}
        <main className="flex-1 min-w-0 animate-fade-in">{children}</main>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-gray-200 z-40 px-2 py-1.5 flex items-center justify-around shadow-lg">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive =
            item.path === '/'
              ? currentPath === '/'
              : currentPath.startsWith(item.path)
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-col items-center justify-center py-1 px-2 rounded-lg text-xs font-medium transition-colors ${
                isActive ? 'text-rose-600 font-semibold' : 'text-gray-500 hover:text-gray-800'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span>{item.label}</span>
            </Link>
          )
        })}
      </nav>

      {/* Modal Buat Workspace */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false)
          resetWorkspace()
        }}
        title="Buat Proyek Pernikahan Baru"
        description="Ruang kerja kolaboratif untuk pasangan CPP & CPW."
      >
        <form onSubmit={handleWorkspaceSubmit(onCreateWorkspace)} noValidate className="space-y-4">
          <Input
            label="Nama Calon Pengantin Pria (CPP)"
            placeholder="Contoh: Farhan"
            {...registerWorkspace('groom_name')}
            error={workspaceErrors.groom_name?.message}
          />
          <Input
            label="Nama Calon Pengantin Wanita (CPW)"
            placeholder="Contoh: Sarah"
            {...registerWorkspace('bride_name')}
            error={workspaceErrors.bride_name?.message}
          />
          <Controller
            control={workspaceControl}
            name="wedding_date"
            render={({ field }) => (
              <DatePicker
                label="Tanggal Akad / Resepsi"
                value={field.value || ''}
                onChange={field.onChange}
              />
            )}
          />
          <Controller
            control={workspaceControl}
            name="total_budget_target"
            render={({ field }) => (
              <CurrencyInput
                label="Target Total Budget (Rp)"
                placeholder="0"
                value={field.value}
                onChange={field.onChange}
                error={workspaceErrors.total_budget_target?.message}
              />
            )}
          />
          <Controller
            control={workspaceControl}
            name="savings_target"
            render={({ field }) => (
              <CurrencyInput
                label="Target Tabungan Bersama (Rp)"
                placeholder="0"
                value={field.value}
                onChange={field.onChange}
                error={workspaceErrors.savings_target?.message}
              />
            )}
          />

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsCreateModalOpen(false)
                resetWorkspace()
              }}
            >
              Batal
            </Button>
            <Button type="submit" loading={isSubmitting}>
              Buat Workspace
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
