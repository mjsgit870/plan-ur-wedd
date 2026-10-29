import * as React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  ExternalLink,
  Calendar,
  Sparkles,
  Check,
  CheckSquare,
  Edit,
  Trash2,
  Loader2,
  Link2,
  FileText,
  Gift,
  ListTodo,
} from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'
import type { ChecklistItem, ChecklistType, ChecklistStatus, BudgetItem } from '../types/database'
import { formatIDR, formatDate } from '../lib/utils'
import { Card, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { CurrencyInput } from '../components/ui/CurrencyInput'
import { Select } from '../components/ui/Select'
import { DatePicker } from '../components/ui/DatePicker'
import { toast } from '../components/ui/Toast'
import { CardSkeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import { checklistItemSchema, type ChecklistItemFormValues } from '../lib/schemas'

export const Route = createFileRoute('/checklist')({ component: ChecklistPage })

function ChecklistPage() {
  const currentWorkspace = useAppStore((s) => s.currentWorkspace)
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = React.useState<ChecklistType>('administration')
  const [statusFilter, setStatusFilter] = React.useState<'all' | 'pending' | 'completed'>('all')
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false)
  const [editingItem, setEditingItem] = React.useState<ChecklistItem | null>(null)
  const [itemToDelete, setItemToDelete] = React.useState<ChecklistItem | null>(null)
  const [updatingItemId, setUpdatingItemId] = React.useState<string | null>(null)

  // React Hook Form with Zod
  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<ChecklistItemFormValues>({
    resolver: zodResolver(checklistItemSchema),
    defaultValues: {
      title: '',
      type: 'administration',
      price: 0,
      due_date: '',
      url_link: '',
      budget_item_id: '',
      notes: '',
    },
  })

  const formType = watch('type')

  // Queries
  const { data: items = [], isLoading } = useQuery({
    queryKey: ['checklist_items', currentWorkspace?.id],
    enabled: Boolean(currentWorkspace?.id && isSupabaseConfigured),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checklist_items')
        .select('*, budget_item:budget_items(*)')
        .eq('workspace_id', currentWorkspace!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data as ChecklistItem[]) || []
    },
  })

  const { data: budgetItems = [] } = useQuery({
    queryKey: ['budget_items', currentWorkspace?.id],
    enabled: Boolean(currentWorkspace?.id && isSupabaseConfigured),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_items')
        .select('*')
        .eq('workspace_id', currentWorkspace!.id)
      if (error) throw error
      return (data as BudgetItem[]) || []
    },
  })

  const openAddModal = (tabType: ChecklistType) => {
    reset({
      type: tabType,
      title: '',
      price: 0,
      due_date: '',
      url_link: '',
      budget_item_id: '',
      notes: '',
    })
    setIsAddModalOpen(true)
  }

  // Mutations
  const addItemMutation = useMutation({
    mutationFn: async (values: ChecklistItemFormValues) => {
      const { error } = await supabase.from('checklist_items').insert({
        workspace_id: currentWorkspace!.id,
        type: values.type,
        title: values.title,
        price: Number(values.price) || 0,
        due_date: values.due_date || null,
        url_link: values.url_link || null,
        image_url: null,
        budget_item_id: values.budget_item_id || null,
        notes: values.notes || null,
        status: 'pending',
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist_items'] })
      setIsAddModalOpen(false)
      reset()
      toast.success('Item Berhasil Ditambahkan')
    },
    onError: (err: Error) => {
      toast.error('Gagal Menambah Item', err.message)
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: ChecklistStatus }) => {
      setUpdatingItemId(id)
      const { error } = await supabase
        .from('checklist_items')
        .update({ status: newStatus })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist_items'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['budget_items'] })
      setUpdatingItemId(null)
      toast.info('Status Checklist Diperbarui')
    },
    onError: (err: Error) => {
      setUpdatingItemId(null)
      toast.error('Gagal Mengubah Status', err.message)
    },
  })

  const updateItemMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: ChecklistItemFormValues }) => {
      const { error } = await supabase
        .from('checklist_items')
        .update({
          title: values.title,
          type: values.type,
          price: Number(values.price) || 0,
          due_date: values.due_date || null,
          url_link: values.url_link || null,
          budget_item_id: values.budget_item_id || null,
          notes: values.notes || null,
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist_items'] })
      queryClient.invalidateQueries({ queryKey: ['budget_items'] })
      setEditingItem(null)
      reset()
      toast.success('Checklist Berhasil Diperbarui')
    },
    onError: (err: Error) => {
      toast.error('Gagal Memperbarui Item', err.message)
    },
  })

  const deleteItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('checklist_items').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist_items'] })
      queryClient.invalidateQueries({ queryKey: ['budget_items'] })
      setItemToDelete(null)
      toast.success('Item Checklist Dihapus')
    },
    onError: (err: Error) => {
      toast.error('Gagal Menghapus Item', err.message)
    },
  })

  const loadDefaultKUATemplates = async () => {
    if (!currentWorkspace) return
    const defaultKUA = [
      { title: 'Surat Pengantar RT/RW', type: 'administration' as ChecklistType, price: 0 },
      { title: 'Surat Keterangan Belum Menikah (Kelurahan)', type: 'administration' as ChecklistType, price: 0 },
      { title: 'Formulir N1, N2, N4 Kelurahan', type: 'administration' as ChecklistType, price: 0 },
      { title: 'Surat Rekomendasi Nikah (KUA Asal jika beda kecamatan)', type: 'administration' as ChecklistType, price: 0 },
      { title: 'Suntik Tetanus Toxoid (TT) di Puskesmas', type: 'administration' as ChecklistType, price: 50000 },
      { title: 'Pemeriksaan Kesehatan Pra-Nikah / Elsimil', type: 'administration' as ChecklistType, price: 100000 },
      { title: 'Pendaftaran SIMKAH & Biaya KUA Luar Balai', type: 'administration' as ChecklistType, price: 600000 },
      { title: 'Pas Foto Background Biru 2x3 & 4x6', type: 'administration' as ChecklistType, price: 50000 },
    ]

    const records = defaultKUA.map((d) => ({
      workspace_id: currentWorkspace.id,
      title: d.title,
      type: d.type,
      price: d.price,
      status: 'pending' as ChecklistStatus,
    }))

    const { error } = await supabase.from('checklist_items').insert(records)
    if (!error) {
      queryClient.invalidateQueries({ queryKey: ['checklist_items'] })
      toast.success('Template KUA Dimuat', '8 berkas persyaratan nikah berhasil ditambahkan.')
    } else {
      toast.error('Gagal Memuat Template', error.message)
    }
  }

  const filteredItems = items.filter((item) => item.type === activeTab)
  const displayedItems = filteredItems.filter((item) => {
    const isDone = item.status === 'completed' || item.status === 'purchased'
    if (statusFilter === 'pending') return !isDone
    if (statusFilter === 'completed') return isDone
    return true
  })
  const completedCount = filteredItems.filter(
    (i) => i.status === 'completed' || i.status === 'purchased'
  ).length
  const totalCost = filteredItems.reduce((acc, i) => acc + Number(i.price || 0), 0)

  if (!currentWorkspace) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-gray-200 text-gray-500">
        Pilih atau buat Workspace terlebih dahulu.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Checklist, Administrasi & Seserahan
          </h1>
          <p className="text-xs sm:text-sm text-gray-500">
            Daftar berkas KUA, perlengkapan seserahan hantaran, dan to-do umum.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === 'administration' && filteredItems.length === 0 && (
            <Button size="sm" variant="outline" onClick={loadDefaultKUATemplates}>
              <Sparkles className="w-4 h-4 mr-1 text-rose-500" /> Muat Template KUA
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => openAddModal(activeTab)}
          >
            <Plus className="w-4 h-4 mr-1" /> Tambah Item
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex justify-center">
        <div className="inline-flex bg-gray-100 p-1 rounded-xl max-w-full overflow-x-auto shadow-inner">
          {[
            { id: 'administration', label: 'Administrasi & KUA', icon: FileText },
            { id: 'seserahan', label: 'Daftar Seserahan', icon: Gift },
            { id: 'general_todo', label: 'To-do Umum', icon: ListTodo },
          ].map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            const count = items.filter((i) => i.type === tab.id).length
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as ChecklistType)}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-semibold transition-all duration-200 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-white text-gray-900 shadow-xs'
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50/50'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-rose-600' : 'text-gray-400'}`} />
                <span>{tab.label}</span>
                <span
                  className={`text-[11px] px-1.5 py-0.2 rounded-full font-medium ${
                    isActive ? 'bg-rose-50 text-rose-600' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      {/* Summary Card with Progress Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-xl border border-gray-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="text-xs text-gray-500 font-medium">Progres Penyelesaian</div>
            <div className="text-lg font-bold text-gray-900 mt-0.5">
              {completedCount}{' '}
              <span className="text-sm font-normal text-gray-500">dari {filteredItems.length} item</span>
            </div>
          </div>
          <div className="text-left sm:text-right">
            <div className="text-xs text-gray-500 font-medium">Total Estimasi Biaya</div>
            <div className="text-lg font-bold text-rose-600">{formatIDR(totalCost)}</div>
          </div>
        </div>

        {/* Progress Bar */}
        {filteredItems.length > 0 && (
          <div className="space-y-1.5">
            <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{
                  width: `${filteredItems.length > 0 ? Math.round((completedCount / filteredItems.length) * 100) : 0}%`,
                }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-gray-400 font-medium">
              <span>{Math.round((completedCount / (filteredItems.length || 1)) * 100)}% Selesai</span>
              <span>{filteredItems.length - completedCount} item tersisa</span>
            </div>
          </div>
        )}

        {/* Filter Chips inside summary bar */}
        <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1.5">
            {[
              { id: 'all', label: 'Semua' },
              { id: 'pending', label: 'Belum Selesai' },
              { id: 'completed', label: 'Selesai' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id as any)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md cursor-pointer transition-colors ${
                  statusFilter === f.id
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          {activeTab === 'administration' && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs py-1 px-2.5 h-auto text-rose-600 border-rose-200 hover:bg-rose-50"
              onClick={loadDefaultKUATemplates}
            >
              <Sparkles className="w-3.5 h-3.5 mr-1" /> Muat Template KUA
            </Button>
          )}
        </div>
      </div>

      {/* Items List */}
      {isLoading ? (
        <div className="space-y-3">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <div className="space-y-2.5 animate-fade-in">
          {displayedItems.map((item) => {
            const isDone = item.status === 'completed' || item.status === 'purchased'
            const isUpdating = updatingItemId === item.id

            return (
              <Card
                key={item.id}
                className={`transition-all duration-150 border-gray-200/90 hover:border-gray-300 ${
                  isDone ? 'bg-gray-50/60 opacity-80' : 'bg-white'
                }`}
              >
                <CardContent className="p-3.5 sm:p-4 flex items-center justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Interactive Checkbox with Spinner */}
                    <button
                      type="button"
                      disabled={isUpdating}
                      onClick={() =>
                        updateStatusMutation.mutate({
                          id: item.id,
                          newStatus: isDone ? 'pending' : item.type === 'seserahan' ? 'purchased' : 'completed',
                        })
                      }
                      aria-label={isDone ? 'Tandai belum selesai' : 'Tandai selesai'}
                      className={`mt-0.5 w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 cursor-pointer transition-all duration-150 active:scale-90 ${
                        isDone
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-gray-300 bg-white hover:border-rose-500 text-transparent'
                      } ${isUpdating ? 'opacity-70 pointer-events-none' : ''}`}
                    >
                      {isUpdating ? (
                        <Loader2 className={`w-3.5 h-3.5 animate-spin ${isDone ? 'text-white' : 'text-rose-500'}`} />
                      ) : (
                        <Check className="w-4 h-4 stroke-3" />
                      )}
                    </button>

                    {/* Item Information */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4
                          className={`text-sm font-semibold leading-snug ${
                            isDone ? 'line-through text-gray-400' : 'text-gray-900'
                          }`}
                        >
                          {item.title}
                        </h4>

                        {/* Connected Budget Item Tag */}
                        {item.budget_item && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                            <Link2 className="w-2.5 h-2.5 text-slate-400" />
                            [{item.budget_item.phase.toUpperCase()}] {item.budget_item.category_name}
                          </span>
                        )}
                      </div>

                      {/* Notes Preview */}
                      {item.notes && (
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-1 italic">
                          "{item.notes}"
                        </p>
                      )}

                      {/* Metadata Chips: Due Date, Price, Link */}
                      <div className="flex flex-wrap items-center gap-2.5 mt-1.5 text-xs text-gray-500">
                        {item.due_date && (
                          <span className="inline-flex items-center gap-1 text-gray-600">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            {formatDate(item.due_date)}
                          </span>
                        )}

                        {Number(item.price) > 0 && (
                          <span className="font-semibold text-rose-600">
                            {formatIDR(Number(item.price))}
                          </span>
                        )}

                        {item.url_link && (
                          <a
                            href={item.url_link}
                            target="_blank"
                            rel="noreferrer"
                            className="text-rose-600 hover:text-rose-700 font-medium inline-flex items-center gap-1 bg-rose-50 hover:bg-rose-100/70 px-1.5 py-0.5 rounded transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" /> Link Beli
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions: Edit & Delete buttons */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Badge variant={isDone ? 'success' : 'default'} className="hidden sm:inline-flex capitalize text-[10px]">
                      {isDone ? 'Selesai' : 'Pending'}
                    </Badge>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="p-1.5 h-8 w-8 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg cursor-pointer"
                      title="Edit Item"
                      onClick={() => {
                        setEditingItem(item)
                        reset({
                          title: item.title,
                          type: item.type,
                          price: Number(item.price) || 0,
                          due_date: item.due_date || '',
                          url_link: item.url_link || '',
                          budget_item_id: item.budget_item_id || '',
                          notes: item.notes || '',
                        })
                      }}
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </Button>

                    <Button
                      size="sm"
                      variant="ghost"
                      className="p-1.5 h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                      title="Hapus Item"
                      onClick={() => setItemToDelete(item)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {displayedItems.length === 0 && !isLoading && (
        <EmptyState
          icon={CheckSquare}
          title={statusFilter === 'all' ? 'Belum Ada Item Checklist' : 'Tidak Ada Item'}
          description={
            statusFilter !== 'all'
              ? 'Tidak ada item yang sesuai dengan filter yang dipilih.'
              : activeTab === 'administration'
              ? 'Kelola kelengkapan dokumen pengantar RT/RW, kelurahan, dan pendaftaran KUA.'
              : activeTab === 'seserahan'
              ? 'Catat barang seserahan, harga, serta link marketplace pembelian.'
              : 'Daftar hal penting yang harus disiapkan menjelang hari pernikahan.'
          }
          actionLabel="Tambah Item Baru"
          onAction={() => openAddModal(activeTab)}
        />
      )}

      {/* Modal Add Item */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false)
          reset()
        }}
        title={`Tambah ${
          formType === 'administration'
            ? 'Berkas Administrasi'
            : formType === 'seserahan'
            ? 'Barang Seserahan'
            : 'To-do Checklist'
        }`}
      >
        <form
          noValidate
          onSubmit={handleSubmit((data) => addItemMutation.mutate(data))}
          className="space-y-4"
        >
          <Input
            label="Nama / Judul Item"
            placeholder="Contoh: Baju Lamaran, Surat N1, Sepatu Heels"
            {...register('title')}
            error={errors.title?.message}
          />
          <div className="grid grid-cols-2 gap-3 items-end">
            <Controller
              control={control}
              name="price"
              render={({ field }) => (
                <CurrencyInput
                  label="Biaya / Harga (Rp)"
                  placeholder="0"
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.price?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="due_date"
              render={({ field }) => (
                <DatePicker
                  label="Tenggat Waktu (Due Date)"
                  value={field.value || ''}
                  onChange={field.onChange}
                />
              )}
            />
          </div>

          {formType === 'seserahan' && (
            <Input
              label="Link E-Commerce (Opsional)"
              placeholder="https://shopee.co.id/..."
              {...register('url_link')}
              error={errors.url_link?.message}
            />
          )}

          <Controller
            control={control}
            name="budget_item_id"
            render={({ field }) => (
              <Select
                label="Alokasi Pos Budget (Otomatis potong saat lunas)"
                value={field.value || ''}
                onChange={(e) => field.onChange(e.target.value)}
              >
                <option value="">-- Hubungkan ke Pos Budget --</option>
                {budgetItems.map((b) => (
                  <option key={b.id} value={b.id}>
                    [{b.phase.toUpperCase()}] {b.category_name}
                  </option>
                ))}
              </Select>
            )}
          />

          <Input
            label="Catatan Tambahan"
            placeholder="Ukuran, warna, atau persyaratan khusus"
            {...register('notes')}
            error={errors.notes?.message}
          />

          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsAddModalOpen(false)
                reset()
              }}
            >
              Batal
            </Button>
            <Button type="submit" loading={addItemMutation.isPending}>
              Simpan Item
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Edit Item */}
      <Modal
        isOpen={Boolean(editingItem)}
        onClose={() => {
          setEditingItem(null)
          reset()
        }}
        title={`Edit ${
          formType === 'administration'
            ? 'Berkas Administrasi'
            : formType === 'seserahan'
            ? 'Barang Seserahan'
            : 'To-do Checklist'
        }`}
      >
        <form
          noValidate
          onSubmit={handleSubmit((data) => {
            if (editingItem) {
              updateItemMutation.mutate({ id: editingItem.id, values: data })
            }
          })}
          className="space-y-4"
        >
          <Input
            label="Nama / Judul Item"
            placeholder="Contoh: Baju Lamaran, Surat N1, Sepatu Heels"
            {...register('title')}
            error={errors.title?.message}
          />
          <div className="grid grid-cols-2 gap-3 items-end">
            <Controller
              control={control}
              name="price"
              render={({ field }) => (
                <CurrencyInput
                  label="Biaya / Harga (Rp)"
                  placeholder="0"
                  value={field.value}
                  onChange={field.onChange}
                  error={errors.price?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="due_date"
              render={({ field }) => (
                <DatePicker
                  label="Tenggat Waktu (Due Date)"
                  value={field.value || ''}
                  onChange={field.onChange}
                />
              )}
            />
          </div>

          {formType === 'seserahan' && (
            <Input
              label="Link E-Commerce (Opsional)"
              placeholder="https://shopee.co.id/..."
              {...register('url_link')}
              error={errors.url_link?.message}
            />
          )}

          <Controller
            control={control}
            name="budget_item_id"
            render={({ field }) => (
              <Select
                label="Alokasi Pos Budget"
                value={field.value || ''}
                onChange={(e) => field.onChange(e.target.value)}
              >
                <option value="">-- Tanpa Pos Terkait (Lepaskan) --</option>
                {budgetItems.map((b) => (
                  <option key={b.id} value={b.id}>
                    [{b.phase.toUpperCase()}] {b.category_name}
                  </option>
                ))}
              </Select>
            )}
          />

          <Input
            label="Catatan Tambahan"
            placeholder="Ukuran, warna, atau persyaratan khusus"
            {...register('notes')}
            error={errors.notes?.message}
          />

          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditingItem(null)
                reset()
              }}
              disabled={updateItemMutation.isPending}
            >
              Batal
            </Button>
            <Button type="submit" loading={updateItemMutation.isPending}>
              Simpan Perubahan
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Modal Delete Item */}
      <Modal
        isOpen={Boolean(itemToDelete)}
        onClose={() => setItemToDelete(null)}
        title="Hapus Item Checklist?"
        description="Tindakan ini tidak dapat dibatalkan."
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Apakah Anda yakin ingin menghapus{' '}
            <strong className="text-gray-900 font-semibold">{itemToDelete?.title}</strong>?
          </p>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setItemToDelete(null)}
              disabled={deleteItemMutation.isPending}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="danger"
              loading={deleteItemMutation.isPending}
              onClick={() => {
                if (itemToDelete) deleteItemMutation.mutate(itemToDelete.id)
              }}
            >
              Hapus Item
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
