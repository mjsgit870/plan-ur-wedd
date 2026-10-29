import * as React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, ExternalLink, Calendar, Sparkles, Check, CheckSquare } from 'lucide-react'
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
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false)

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
      toast.info('Status Checklist Diperbarui')
    },
    onError: (err: Error) => {
      toast.error('Gagal Mengubah Status', err.message)
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
      <div className="border-b border-gray-200">
        <nav className="flex space-x-6">
          {[
            { id: 'administration', label: 'Administrasi & KUA' },
            { id: 'seserahan', label: 'Daftar Seserahan' },
            { id: 'general_todo', label: 'To-do Umum' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ChecklistType)}
              className={`pb-3 text-sm font-semibold border-b-2 cursor-pointer transition-colors ${
                activeTab === tab.id
                  ? 'border-rose-600 text-rose-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Summary Banner */}
      <div className="bg-white p-4 rounded-xl border border-gray-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="text-xs text-gray-600">
          Progress:{' '}
          <span className="font-bold text-gray-900">
            {completedCount} dari {filteredItems.length} selesai
          </span>
        </div>
        <div className="text-xs text-gray-600">
          Total Biaya / Nilai:{' '}
          <span className="font-bold text-rose-600 text-sm">{formatIDR(totalCost)}</span>
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
        <div className="space-y-3 animate-fade-in">
          {filteredItems.map((item) => {
            const isDone = item.status === 'completed' || item.status === 'purchased'
            return (
              <Card key={item.id} className="transition-all hover:border-gray-300">
                <CardContent className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3 min-w-0">
                    <button
                      onClick={() =>
                        updateStatusMutation.mutate({
                          id: item.id,
                          newStatus: isDone ? 'pending' : item.type === 'seserahan' ? 'purchased' : 'completed',
                        })
                      }
                      className={`mt-0.5 w-6 h-6 rounded-lg border flex items-center justify-center shrink-0 cursor-pointer transition-all duration-150 active:scale-90 ${
                        isDone
                          ? 'bg-emerald-500 border-emerald-500 text-white'
                          : 'border-gray-300 bg-white hover:border-rose-500'
                      }`}
                    >
                      {isDone && <Check className="w-4 h-4 stroke-3" />}
                    </button>

                    <div className="min-w-0">
                      <h4
                        className={`text-sm font-semibold truncate ${
                          isDone ? 'line-through text-gray-400' : 'text-gray-900'
                        }`}
                      >
                        {item.title}
                      </h4>

                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-gray-500">
                        {item.due_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {formatDate(item.due_date)}
                          </span>
                        )}
                        {Number(item.price) > 0 && (
                          <span className="font-medium text-gray-700">{formatIDR(Number(item.price))}</span>
                        )}
                        {item.url_link && (
                          <a
                            href={item.url_link}
                            target="_blank"
                            rel="noreferrer"
                            className="text-rose-600 hover:text-rose-700 inline-flex items-center gap-0.5"
                          >
                            <ExternalLink className="w-3 h-3" /> Link Beli
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0">
                    <Badge variant={isDone ? 'success' : 'default'} className="capitalize text-[11px]">
                      {item.status.replace('_', ' ')}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {filteredItems.length === 0 && !isLoading && (
        <EmptyState
          icon={CheckSquare}
          title="Belum Ada Item Checklist"
          description={
            activeTab === 'administration'
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
    </div>
  )
}
