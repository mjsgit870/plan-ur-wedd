import * as React from 'react'
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
import { Select } from '../components/ui/Select'
import { DatePicker } from '../components/ui/DatePicker'
import { toast } from '../components/ui/Toast'
import { CardSkeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'

export const Route = createFileRoute('/checklist')({ component: ChecklistPage })

function ChecklistPage() {
  const currentWorkspace = useAppStore((s) => s.currentWorkspace)
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = React.useState<ChecklistType>('administration')
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false)

  // Form State
  const [title, setTitle] = React.useState('')
  const [type, setType] = React.useState<ChecklistType>('administration')
  const [price, setPrice] = React.useState('')
  const [dueDate, setDueDate] = React.useState('')
  const [urlLink, setUrlLink] = React.useState('')
  const [imageUrl, setImageUrl] = React.useState('')
  const [selectedBudgetId, setSelectedBudgetId] = React.useState('')
  const [notes, setNotes] = React.useState('')

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

  // Mutations
  const addItemMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('checklist_items').insert({
        workspace_id: currentWorkspace!.id,
        type,
        title,
        price: Number(price) || 0,
        due_date: dueDate || null,
        url_link: urlLink || null,
        image_url: imageUrl || null,
        budget_item_id: selectedBudgetId || null,
        notes: notes || null,
        status: 'pending',
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['checklist_items'] })
      setIsAddModalOpen(false)
      setTitle('')
      setPrice('')
      setDueDate('')
      setUrlLink('')
      setImageUrl('')
      setNotes('')
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
            onClick={() => {
              setType(activeTab)
              setIsAddModalOpen(true)
            }}
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
          onAction={() => {
            setType(activeTab)
            setIsAddModalOpen(true)
          }}
        />
      )}

      {/* Modal Add Item */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={`Tambah ${
          type === 'administration'
            ? 'Berkas Administrasi'
            : type === 'seserahan'
            ? 'Barang Seserahan'
            : 'To-do Checklist'
        }`}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            addItemMutation.mutate()
          }}
          className="space-y-4"
        >
          <Input
            label="Nama / Judul Item"
            placeholder="Contoh: Baju Lamaran, Surat N1, Sepatu Heels"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-3 items-end">
            <Input
              label="Biaya / Harga (Rp)"
              type="number"
              placeholder="0"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
            <DatePicker
              label="Tenggat Waktu (Due Date)"
              value={dueDate}
              onChange={(date) => setDueDate(date)}
            />
          </div>

          {type === 'seserahan' && (
            <Input
              label="Link E-Commerce (Opsional)"
              placeholder="https://shopee.co.id/..."
              value={urlLink}
              onChange={(e) => setUrlLink(e.target.value)}
            />
          )}

          <Select
            label="Alokasi Pos Budget (Otomatis potong saat lunas)"
            value={selectedBudgetId}
            onChange={(e) => setSelectedBudgetId(e.target.value)}
          >
            <option value="">-- Hubungkan ke Pos Budget --</option>
            {budgetItems.map((b) => (
              <option key={b.id} value={b.id}>
                [{b.phase.toUpperCase()}] {b.category_name}
              </option>
            ))}
          </Select>

          <Input
            label="Catatan Tambahan"
            placeholder="Ukuran, warna, atau persyaratan khusus"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
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
