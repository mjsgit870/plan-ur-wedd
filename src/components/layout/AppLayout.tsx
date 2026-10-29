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
  Loader2,
  ChevronDown,
  Check,
  Settings,
  Trash2,
  Calendar,
  Share2,
  Copy,
} from 'lucide-react'
import { toast } from '../ui/Toast'
import { createPortal } from 'react-dom'
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
    updateWorkspace,
    deleteWorkspace,
    signOut,
  } = useAppStore()

  const [isCreateModalOpen, setIsCreateModalOpen] = React.useState(false)
  const [isDetailModalOpen, setIsDetailModalOpen] = React.useState(false)
  const [isDeleteWsModalOpen, setIsDeleteWsModalOpen] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isLoggingOut, setIsLoggingOut] = React.useState(false)
  const [isWsDropdownOpen, setIsWsDropdownOpen] = React.useState(false)
  const wsTriggerRef = React.useRef<HTMLButtonElement>(null)
  const wsMenuRef = React.useRef<HTMLDivElement>(null)
  const [wsCoords, setWsCoords] = React.useState<{ top: number; left: number; width: number } | null>(null)

  const updateWsPosition = React.useCallback(() => {
    if (!wsTriggerRef.current) return
    const rect = wsTriggerRef.current.getBoundingClientRect()
    const desiredWidth = Math.max(rect.width, 220)
    let left = rect.right - desiredWidth
    if (left < 8) left = 8
    if (left + desiredWidth > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - desiredWidth - 8)
    }
    setWsCoords({
      top: rect.bottom + 6,
      left,
      width: Math.min(desiredWidth, window.innerWidth - 16),
    })
  }, [])

  React.useEffect(() => {
    if (!isWsDropdownOpen) return
    updateWsPosition()
    const onScrollOrResize = () => updateWsPosition()
    window.addEventListener('resize', onScrollOrResize)
    window.addEventListener('scroll', onScrollOrResize, true)
    return () => {
      window.removeEventListener('resize', onScrollOrResize)
      window.removeEventListener('scroll', onScrollOrResize, true)
    }
  }, [isWsDropdownOpen, updateWsPosition])

  React.useEffect(() => {
    if (!isWsDropdownOpen) return
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node
      if (
        wsTriggerRef.current &&
        !wsTriggerRef.current.contains(target) &&
        wsMenuRef.current &&
        !wsMenuRef.current.contains(target)
      ) {
        setIsWsDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', onMouseDown)
    return () => document.removeEventListener('mousedown', onMouseDown)
  }, [isWsDropdownOpen])

  const handleSignOut = async () => {
    setIsLoggingOut(true)
    try {
      await signOut()
    } finally {
      setIsLoggingOut(false)
    }
  }

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

  const {
    register: registerEditWs,
    handleSubmit: handleEditWsSubmit,
    control: editWsControl,
    reset: resetEditWs,
    formState: { errors: editWsErrors },
  } = useForm<WorkspaceFormValues>({
    resolver: zodResolver(workspaceSchema),
  })

  const openDetailModal = () => {
    if (!currentWorkspace) return
    resetEditWs({
      groom_name: currentWorkspace.groom_name,
      bride_name: currentWorkspace.bride_name,
      engagement_date: currentWorkspace.engagement_date || '',
      wedding_date: currentWorkspace.wedding_date || '',
      total_budget_target: Number(currentWorkspace.total_budget_target) || 0,
      savings_target: Number(currentWorkspace.savings_target) || 0,
    })
    setIsDetailModalOpen(true)
  }

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
      toast.success('Workspace Berhasil Dibuat')
    } catch {
      toast.error('Gagal Membuat Workspace')
    } finally {
      setIsSubmitting(false)
    }
  }

  const onUpdateWorkspace = async (data: WorkspaceFormValues) => {
    if (!currentWorkspace) return
    setIsSubmitting(true)
    try {
      const res = await updateWorkspace(currentWorkspace.id, {
        bride_name: data.bride_name,
        groom_name: data.groom_name,
        engagement_date: data.engagement_date || null,
        wedding_date: data.wedding_date || null,
        total_budget_target: Number(data.total_budget_target) || 0,
        savings_target: Number(data.savings_target) || 0,
      })
      if (res) {
        toast.success('Pengaturan Workspace Disimpan')
        setIsDetailModalOpen(false)
      } else {
        toast.error('Gagal Menyimpan Perubahan')
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const onDeleteWorkspace = async () => {
    if (!currentWorkspace) return
    setIsSubmitting(true)
    try {
      const success = await deleteWorkspace(currentWorkspace.id)
      if (success) {
        toast.success('Workspace Berhasil Dihapus')
        setIsDeleteWsModalOpen(false)
        setIsDetailModalOpen(false)
      } else {
        toast.error('Gagal Menghapus Workspace')
      }
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
            <div className="hidden sm:block">
              <span className="font-bold text-gray-900 tracking-tight text-base sm:text-lg">
                Rencanakan
              </span>
              <span className="hidden md:inline-block ml-2 text-xs font-medium text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-100">
                Wedding SaaS
              </span>
            </div>
          </div>

          {/* Workspace Switcher & User Actions */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
            {workspaces.length > 0 && (
              <div className="relative">
                <button
                  ref={wsTriggerRef}
                  type="button"
                  onClick={() => {
                    updateWsPosition()
                    setIsWsDropdownOpen(!isWsDropdownOpen)
                  }}
                  className="flex items-center gap-1.5 h-8 px-2.5 bg-white hover:bg-gray-50 border border-gray-200 rounded-lg text-xs font-medium text-gray-800 transition-colors shadow-2xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-rose-500/20"
                >
                  <span className="max-w-[110px] xs:max-w-[140px] sm:max-w-[180px] truncate text-left font-semibold text-gray-900">
                    {currentWorkspace
                      ? `${currentWorkspace.groom_name} & ${currentWorkspace.bride_name}`
                      : 'Pilih Acara'}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 text-gray-400 shrink-0 transition-transform duration-150 ${
                      isWsDropdownOpen ? 'rotate-180 text-rose-500' : ''
                    }`}
                  />
                </button>

                {isWsDropdownOpen && wsCoords && typeof document !== 'undefined'
                  ? createPortal(
                      <div
                        ref={wsMenuRef}
                        style={{
                          position: 'fixed',
                          top: `${wsCoords.top}px`,
                          left: `${wsCoords.left}px`,
                          width: `${wsCoords.width}px`,
                          zIndex: 9999,
                        }}
                        className="bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden p-1 select-none animate-fade-in"
                      >
                        <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-gray-400">
                          Pilih Proyek Acara
                        </div>
                        <div className="max-h-56 overflow-y-auto space-y-0.5">
                          {workspaces.map((ws) => {
                            const isSelected = ws.id === currentWorkspace?.id
                            return (
                              <button
                                key={ws.id}
                                type="button"
                                onClick={() => {
                                  setCurrentWorkspace(ws)
                                  setIsWsDropdownOpen(false)
                                }}
                                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-left cursor-pointer transition-colors ${
                                  isSelected
                                    ? 'bg-rose-50 text-rose-900 font-semibold'
                                    : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
                                }`}
                              >
                                <div className="min-w-0 pr-2">
                                  <div className="truncate font-medium">
                                    {ws.groom_name} & {ws.bride_name}
                                  </div>
                                  {ws.wedding_date && (
                                    <div className="text-[10px] text-gray-400 truncate">
                                      {ws.wedding_date}
                                    </div>
                                  )}
                                </div>
                                {isSelected && (
                                  <Check className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                )}
                              </button>
                            )
                          })}
                        </div>
                        <div className="pt-1 mt-1 border-t border-gray-100 space-y-0.5">
                          {currentWorkspace && (
                            <button
                              type="button"
                              onClick={() => {
                                setIsWsDropdownOpen(false)
                                openDetailModal()
                              }}
                              className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-gray-700 hover:bg-gray-100 transition-colors cursor-pointer"
                            >
                              <Settings className="w-3.5 h-3.5 text-gray-400" />
                              <span>Pengaturan Workspace</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setIsWsDropdownOpen(false)
                              setIsCreateModalOpen(true)
                            }}
                            className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Tambah Workspace Baru</span>
                          </button>
                        </div>
                      </div>,
                      document.body
                    )
                  : null}
              </div>
            )}

            <Button
              size="sm"
              variant="outline"
              onClick={() => setIsCreateModalOpen(true)}
              className="hidden sm:inline-flex gap-1.5 h-8 text-xs px-2.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Workspace Baru</span>
            </Button>

            {user && (
              <Button
                size="sm"
                variant="ghost"
                onClick={handleSignOut}
                disabled={isLoggingOut}
                title="Keluar"
                className="text-gray-500 hover:text-red-600 shrink-0 h-8 w-8 sm:h-8 sm:w-8 p-0 flex items-center justify-center cursor-pointer"
              >
                {isLoggingOut ? (
                  <Loader2 className="w-4 h-4 animate-spin text-rose-500" />
                ) : (
                  <LogOut className="w-4 h-4" />
                )}
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

      {/* Modal Detail & Edit Workspace */}
      <Modal
        isOpen={isDetailModalOpen}
        onClose={() => {
          setIsDetailModalOpen(false)
          resetEditWs()
        }}
        title="Pengaturan & Detail Proyek"
        description="Kelola informasi pasangan, target keuangan, dan info kolaborasi."
      >
        <div className="space-y-6">
          {/* Info Card: ID & Kolaborasi */}
          {currentWorkspace && (
            <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-gray-500 font-medium">Workspace ID:</span>
                <div className="flex items-center gap-1.5 font-mono text-[11px] text-gray-700 bg-white px-2 py-0.5 rounded border border-gray-200">
                  <span>{currentWorkspace.id.slice(0, 8)}...</span>
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(currentWorkspace.id)
                      toast.success('ID Tersalin', 'Workspace ID telah disalin ke clipboard.')
                    }}
                    className="text-gray-400 hover:text-gray-700 cursor-pointer"
                    title="Salin ID"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-200/60">
                <span className="text-gray-500 font-medium">Dibuat Pada:</span>
                <span className="text-gray-700 font-medium">
                  {new Date(currentWorkspace.created_at).toLocaleDateString('id-ID', {
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </span>
              </div>
            </div>
          )}

          {/* Form Edit */}
          <form onSubmit={handleEditWsSubmit(onUpdateWorkspace)} noValidate className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Nama Calon Pria (CPP)"
                placeholder="Contoh: Farhan"
                {...registerEditWs('groom_name')}
                error={editWsErrors.groom_name?.message}
              />
              <Input
                label="Nama Calon Wanita (CPW)"
                placeholder="Contoh: Sarah"
                {...registerEditWs('bride_name')}
                error={editWsErrors.bride_name?.message}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Controller
                control={editWsControl}
                name="engagement_date"
                render={({ field }) => (
                  <DatePicker
                    label="Tanggal Lamaran"
                    value={field.value || ''}
                    onChange={field.onChange}
                  />
                )}
              />
              <Controller
                control={editWsControl}
                name="wedding_date"
                render={({ field }) => (
                  <DatePicker
                    label="Tanggal Pernikahan"
                    value={field.value || ''}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Controller
                control={editWsControl}
                name="total_budget_target"
                render={({ field }) => (
                  <CurrencyInput
                    label="Target Total Budget (Rp)"
                    placeholder="0"
                    value={field.value}
                    onChange={field.onChange}
                    error={editWsErrors.total_budget_target?.message}
                  />
                )}
              />
              <Controller
                control={editWsControl}
                name="savings_target"
                render={({ field }) => (
                  <CurrencyInput
                    label="Target Tabungan (Rp)"
                    placeholder="0"
                    value={field.value}
                    onChange={field.onChange}
                    error={editWsErrors.savings_target?.message}
                  />
                )}
              />
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
              <Button
                type="button"
                variant="danger"
                size="sm"
                className="text-xs"
                onClick={() => setIsDeleteWsModalOpen(true)}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" /> Hapus Proyek
              </Button>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsDetailModalOpen(false)}
                  disabled={isSubmitting}
                >
                  Batal
                </Button>
                <Button type="submit" loading={isSubmitting}>
                  Simpan Perubahan
                </Button>
              </div>
            </div>
          </form>
        </div>
      </Modal>

      {/* Confirmation Modal Delete Workspace */}
      <Modal
        isOpen={isDeleteWsModalOpen}
        onClose={() => setIsDeleteWsModalOpen(false)}
        title="Hapus Workspace Proyek?"
        description="Semua data anggaran, vendor, transaksi, checklist, dan tamu pada workspace ini akan terhapus permanen."
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Apakah Anda yakin ingin menghapus proyek{' '}
            <strong className="text-gray-900 font-semibold">
              {currentWorkspace?.groom_name} & {currentWorkspace?.bride_name}
            </strong>
            ?
          </p>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsDeleteWsModalOpen(false)}
              disabled={isSubmitting}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="danger"
              loading={isSubmitting}
              onClick={onDeleteWorkspace}
            >
              Hapus Permanen
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
