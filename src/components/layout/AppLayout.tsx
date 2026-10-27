import * as React from 'react'
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
import { Select } from '../ui/Select'
import { DatePicker } from '../ui/DatePicker'
import { isSupabaseConfigured } from '../../lib/supabase'

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
  const [brideName, setBrideName] = React.useState('')
  const [groomName, setGroomName] = React.useState('')
  const [weddingDate, setWeddingDate] = React.useState('')
  const [totalBudgetTarget, setTotalBudgetTarget] = React.useState('')
  const [savingsTarget, setSavingsTarget] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const navItems = [
    { label: 'Dashboard', path: '/', icon: LayoutDashboard },
    { label: 'Finance', path: '/finance', icon: Wallet },
    { label: 'Vendors', path: '/vendors', icon: Store },
    { label: 'Checklist', path: '/checklist', icon: CheckSquare },
    { label: 'Tamu', path: '/guests', icon: Users },
  ]

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!brideName || !groomName) return
    setIsSubmitting(true)
    try {
      await createWorkspace({
        bride_name: brideName,
        groom_name: groomName,
        wedding_date: weddingDate || null,
        total_budget_target: Number(totalBudgetTarget) || 0,
        savings_target: Number(savingsTarget) || 0,
      })
      setIsCreateModalOpen(false)
      setBrideName('')
      setGroomName('')
      setWeddingDate('')
      setTotalBudgetTarget('')
      setSavingsTarget('')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col antialiased">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center shadow-xs">
              <Heart className="w-5 h-5 fill-current" />
            </div>
            <div>
              <span className="font-bold text-gray-900 tracking-tight text-lg">
                Rencanakan
              </span>
              <span className="hidden sm:inline-block ml-2 text-xs font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                Wedding SaaS
              </span>
            </div>
          </div>

          {/* Workspace Switcher & User Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            {workspaces.length > 0 ? (
              <div className="w-40 sm:w-56">
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
                className="text-gray-500 hover:text-red-600"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </header>

      {/* Supabase Config Warning (if credentials not filled) */}
      {!isSupabaseConfigured && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 text-xs text-amber-800 flex items-center justify-center gap-2">
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
        onClose={() => setIsCreateModalOpen(false)}
        title="Buat Proyek Pernikahan Baru"
        description="Ruang kerja kolaboratif untuk pasangan CPP & CPW."
      >
        <form onSubmit={handleCreateWorkspace} className="space-y-4">
          <Input
            label="Nama Calon Pengantin Pria (CPP)"
            placeholder="Contoh: Farhan"
            value={groomName}
            onChange={(e) => setGroomName(e.target.value)}
            required
          />
          <Input
            label="Nama Calon Pengantin Wanita (CPW)"
            placeholder="Contoh: Sarah"
            value={brideName}
            onChange={(e) => setBrideName(e.target.value)}
            required
          />
          <DatePicker
            label="Tanggal Akad / Resepsi"
            value={weddingDate}
            onChange={(date) => setWeddingDate(date)}
          />
          <Input
            label="Target Total Budget (Rp)"
            type="number"
            placeholder="Contoh: 150000000"
            value={totalBudgetTarget}
            onChange={(e) => setTotalBudgetTarget(e.target.value)}
          />
          <Input
            label="Target Tabungan Bersama (Rp)"
            type="number"
            placeholder="Contoh: 150000000"
            value={savingsTarget}
            onChange={(e) => setSavingsTarget(e.target.value)}
          />

          <div className="pt-2 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsCreateModalOpen(false)}
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
