import * as React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Phone,
  CreditCard,
  Store,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  Loader2,
  Link2,
  MoreVertical,
} from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'
import type { Vendor, VendorStatus, BudgetItem, Transaction } from '../types/database'
import { formatIDR, formatDate } from '../lib/utils'
import { Card, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { CurrencyInput } from '../components/ui/CurrencyInput'
import { Select } from '../components/ui/Select'
import { DatePicker } from '../components/ui/DatePicker'
import { Checkbox } from '../components/ui/Checkbox'
import { toast } from '../components/ui/Toast'
import { CardSkeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import {
  vendorSchema,
  terminSchema,
  type VendorFormValues,
  type TerminFormValues,
} from '../lib/schemas'

export const Route = createFileRoute('/vendors')({ component: VendorsPage })

function VendorsPage() {
  const currentWorkspace = useAppStore((s) => s.currentWorkspace)
  const queryClient = useQueryClient()

  const [statusFilter, setStatusFilter] = React.useState<string>('all')
  const [isAddVendorModalOpen, setIsAddVendorModalOpen] = React.useState(false)
  const [editingVendor, setEditingVendor] = React.useState<Vendor | null>(null)
  const [vendorToDelete, setVendorToDelete] = React.useState<Vendor | null>(null)
  const [selectedVendorForPayment, setSelectedVendorForPayment] = React.useState<Vendor | null>(null)

  // React Hook Form for Add/Edit Vendor
  const {
    register: registerVendor,
    handleSubmit: handleVendorSubmit,
    control: vendorControl,
    reset: resetVendor,
    formState: { errors: vendorErrors },
  } = useForm<VendorFormValues>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      vendor_name: '',
      category: '',
      contact_person: '',
      phone: '',
      status: 'research',
      total_contract_value: 0,
      budget_item_id: '',
      notes: '',
    },
  })

  // React Hook Form for Termin
  const {
    register: registerTermin,
    handleSubmit: handleTerminSubmit,
    control: terminControl,
    reset: resetTermin,
    formState: { errors: terminErrors },
  } = useForm<TerminFormValues>({
    resolver: zodResolver(terminSchema),
    defaultValues: {
      title: '',
      amount: 0,
      due_date: '',
      is_paid: true,
    },
  })

  // Fetch Vendors
  const { data: vendors = [], isLoading: loadingVendors } = useQuery({
    queryKey: ['vendors', currentWorkspace?.id],
    enabled: Boolean(currentWorkspace?.id && isSupabaseConfigured),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('vendors')
        .select('*, budget_item:budget_items(*)')
        .eq('workspace_id', currentWorkspace!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data as Vendor[]) || []
    },
  })

  // Fetch Budget items for linking
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

  // Fetch Termins / Transactions for selected vendor
  const { data: vendorTransactions = [], refetch: refetchVendorTx } = useQuery({
    queryKey: ['vendor_transactions', selectedVendorForPayment?.id],
    enabled: Boolean(selectedVendorForPayment?.id && isSupabaseConfigured),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .eq('vendor_id', selectedVendorForPayment!.id)
        .order('transaction_date', { ascending: false })
      if (error) throw error
      return (data as Transaction[]) || []
    },
  })

  // Mutations
  const addVendorMutation = useMutation({
    mutationFn: async (values: VendorFormValues) => {
      const { error } = await supabase.from('vendors').insert({
        workspace_id: currentWorkspace!.id,
        vendor_name: values.vendor_name,
        category: values.category || null,
        contact_person: values.contact_person || null,
        phone: values.phone || null,
        status: values.status,
        total_contract_value: Number(values.total_contract_value) || 0,
        budget_item_id: values.budget_item_id || null,
        notes: values.notes || null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      setIsAddVendorModalOpen(false)
      resetVendor()
      toast.success('Vendor Berhasil Ditambahkan', 'Data vendor masuk ke pipeline pemilihan.')
    },
    onError: (err: Error) => {
      toast.error('Gagal Menambah Vendor', err.message)
    },
  })

  const addTerminMutation = useMutation({
    mutationFn: async (values: TerminFormValues) => {
      if (!selectedVendorForPayment) return
      const { error } = await supabase.from('transactions').insert({
        workspace_id: currentWorkspace!.id,
        vendor_id: selectedVendorForPayment.id,
        budget_item_id: selectedVendorForPayment.budget_item_id,
        type: 'expense',
        title: `[${selectedVendorForPayment.vendor_name}] ${values.title}`,
        amount: Number(values.amount) || 0,
        due_date: values.due_date || null,
        transaction_date: values.is_paid
          ? new Date().toISOString().split('T')[0]
          : values.due_date || new Date().toISOString().split('T')[0],
        is_paid: values.is_paid,
        paid_by: 'joint',
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['budget_items'] })
      refetchVendorTx()
      resetTermin()
      toast.success('Termin Pembayaran Disimpan', 'Total terbayar vendor dan transaksi otomatis diperbarui.')
    },
    onError: (err: Error) => {
      toast.error('Gagal Menyimpan Termin', err.message)
    },
  })

  const updateVendorMutation = useMutation({
    mutationFn: async ({ id, values }: { id: string; values: VendorFormValues }) => {
      const { error } = await supabase
        .from('vendors')
        .update({
          vendor_name: values.vendor_name,
          category: values.category || null,
          contact_person: values.contact_person || null,
          phone: values.phone || null,
          status: values.status,
          total_contract_value: Number(values.total_contract_value) || 0,
          budget_item_id: values.budget_item_id || null,
          notes: values.notes || null,
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['budget_items'] })
      setEditingVendor(null)
      resetVendor()
      toast.success('Data Vendor Diperbarui')
    },
    onError: (err: Error) => {
      toast.error('Gagal Memperbarui Vendor', err.message)
    },
  })

  const deleteVendorMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('vendors').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['budget_items'] })
      setVendorToDelete(null)
      toast.success('Vendor Dihapus')
    },
    onError: (err: Error) => {
      toast.error('Gagal Menghapus Vendor', err.message)
    },
  })

  const toggleTerminPaidMutation = useMutation({
    mutationFn: async ({ id, isPaid }: { id: string; isPaid: boolean }) => {
      const { error } = await supabase
        .from('transactions')
        .update({
          is_paid: isPaid,
          transaction_date: isPaid ? new Date().toISOString().split('T')[0] : undefined,
        })
        .eq('id', id)
      if (error) throw error
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['budget_items'] })
      refetchVendorTx()
      toast.success(
        variables.isPaid ? 'Termin Ditandai Lunas' : 'Status Pembayaran Dibatalkan',
        'Saldo arus kas otomatis disesuaikan.'
      )
    },
    onError: (err: Error) => {
      toast.error('Gagal Mengubah Status Termin', err.message)
    },
  })

  const deleteTerminMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('transactions').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['budget_items'] })
      refetchVendorTx()
      toast.success('Termin Dihapus')
    },
    onError: (err: Error) => {
      toast.error('Gagal Menghapus Termin', err.message)
    },
  })

  const [updatingVendorId, setUpdatingVendorId] = React.useState<string | null>(null)
  const [menuOpenVendorId, setMenuOpenVendorId] = React.useState<string | null>(null)

  // Close 3-dot menu on click outside
  React.useEffect(() => {
    if (!menuOpenVendorId) return
    const handleClickOutside = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest('.vendor-menu-container')) {
        setMenuOpenVendorId(null)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpenVendorId])

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: VendorStatus }) => {
      setUpdatingVendorId(id)
      const { error } = await supabase.from('vendors').update({ status: newStatus }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      setUpdatingVendorId(null)
      toast.success('Status Vendor Diperbarui')
    },
    onError: (err: Error) => {
      setUpdatingVendorId(null)
      toast.error('Gagal Memperbarui Status', err.message)
    },
  })

  const filteredVendors =
    statusFilter === 'all' ? vendors : vendors.filter((v) => v.status === statusFilter)

  const getStatusBadge = (st: VendorStatus) => {
    switch (st) {
      case 'research':
        return <Badge variant="default">Riset</Badge>
      case 'survey':
        return <Badge variant="info">Survey / Tes</Badge>
      case 'booked':
        return <Badge variant="warning">Booked (DP)</Badge>
      case 'paid_off':
        return <Badge variant="success">Lunas</Badge>
      case 'cancelled':
        return <Badge variant="danger">Batal</Badge>
      default:
        return <Badge>{st}</Badge>
    }
  }

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
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Manajemen Vendor</h1>
          <p className="text-xs sm:text-sm text-gray-500">
            Pipeline pemilihan vendor, kontrak kerja sama, dan termin pembayaran.
          </p>
        </div>
        <Button size="sm" onClick={() => setIsAddVendorModalOpen(true)}>
          <Plus className="w-4 h-4 mr-1" /> Tambah Vendor
        </Button>
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
        {[
          { label: 'Semua Status', val: 'all' },
          { label: 'Riset', val: 'research' },
          { label: 'Survey / Tes', val: 'survey' },
          { label: 'Booked (DP)', val: 'booked' },
          { label: 'Lunas', val: 'paid_off' },
        ].map((f) => (
          <button
            key={f.val}
            onClick={() => setStatusFilter(f.val)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap cursor-pointer transition-colors ${
              statusFilter === f.val
                ? 'bg-rose-600 text-white shadow-xs'
                : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Vendor Cards Grid */}
      {loadingVendors ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
          {filteredVendors.map((vendor) => {
            const contract = Number(vendor.total_contract_value || 0)
            const paid = Number(vendor.total_paid || 0)
            const pct = contract > 0 ? Math.min(Math.round((paid / contract) * 100), 100) : 0

            return (
              <Card key={vendor.id} className="flex flex-col justify-between overflow-hidden hover:shadow-md transition-shadow duration-200 border-gray-200/80">
                <CardContent className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    {/* Header: Category Badge + Status Badge */}
                    <div className="flex items-start justify-between gap-2">
                      <span className="inline-flex items-center text-[10px] font-bold uppercase tracking-wider text-rose-600 bg-rose-50 border border-rose-100/80 px-2 py-0.5 rounded-md">
                        {vendor.category || 'Vendor'}
                      </span>
                      <div className="shrink-0">{getStatusBadge(vendor.status)}</div>
                    </div>

                    {/* Title + PIC / WA */}
                    <div>
                      <h3 className="font-bold text-gray-900 text-base leading-snug tracking-tight">
                        {vendor.vendor_name}
                      </h3>
                      {vendor.contact_person && (
                        <div className="text-xs text-gray-500 flex items-center gap-2 mt-1">
                          <span className="font-medium text-gray-700">{vendor.contact_person}</span>
                          {vendor.phone && (
                            <>
                              <span className="text-gray-300">•</span>
                              <a
                                href={`https://wa.me/${vendor.phone.replace(/[^0-9]/g, '')}`}
                                target="_blank"
                                rel="noreferrer"
                                className="text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1 font-medium bg-emerald-50 hover:bg-emerald-100/80 px-1.5 py-0.5 rounded transition-colors"
                              >
                                <Phone className="w-3 h-3" /> WA
                              </a>
                            </>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Pos Anggaran Info Badge */}
                    {vendor.budget_item ? (
                      <div className="text-[11px] text-gray-600 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-100 flex items-center gap-1.5">
                        <Link2 className="w-3 h-3 text-slate-400 shrink-0" />
                        <span className="text-slate-400 font-medium">Pos:</span>
                        <span className="font-semibold text-slate-700 truncate">
                          [{vendor.budget_item.phase.toUpperCase()}] {vendor.budget_item.category_name}
                        </span>
                      </div>
                    ) : (
                      <div className="text-[11px] text-gray-400 bg-gray-50/60 px-2.5 py-1 rounded-md border border-dashed border-gray-200 flex items-center gap-1.5">
                        <Link2 className="w-3 h-3 text-gray-300 shrink-0" />
                        <span>Belum terhubung ke Pos Anggaran</span>
                      </div>
                    )}
                  </div>

                  {/* Payment Progress */}
                  <div className="pt-2 border-t border-gray-100 space-y-2">
                    <div className="flex items-baseline justify-between text-xs">
                      <div className="text-gray-500">
                        Terbayar:{' '}
                        <span className="font-semibold text-gray-900">{formatIDR(paid)}</span>
                      </div>
                      <div className="text-gray-500 font-medium">
                        Total:{' '}
                        <span className="font-bold text-gray-900">{formatIDR(contract)}</span>
                      </div>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          pct >= 100
                            ? 'bg-emerald-500'
                            : pct > 0
                            ? 'bg-rose-500'
                            : 'bg-transparent'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-gray-400">
                      <span>Progres Pelunasan</span>
                      <span className={`font-semibold ${pct >= 100 ? 'text-emerald-600' : 'text-gray-600'}`}>
                        {pct}% Terbayar
                      </span>
                    </div>
                  </div>

                  {/* Quick Status Select & Action Buttons */}
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                    {/* Status Select with Loading Indicator */}
                    <div className="relative flex items-center flex-1 max-w-[145px]">
                      <div className={`w-full ${updatingVendorId === vendor.id ? 'opacity-50 pointer-events-none' : ''}`}>
                        <Select
                          value={vendor.status}
                          disabled={updatingVendorId === vendor.id}
                          onChange={(e) =>
                            updateStatusMutation.mutate({
                              id: vendor.id,
                              newStatus: e.target.value as VendorStatus,
                            })
                          }
                          options={[
                            { label: 'Riset', value: 'research' },
                            { label: 'Survey / Tes', value: 'survey' },
                            { label: 'Booked', value: 'booked' },
                            { label: 'Lunas', value: 'paid_off' },
                            { label: 'Batal', value: 'cancelled' },
                          ]}
                        />
                      </div>
                      {updatingVendorId === vendor.id && (
                        <div className="absolute inset-0 flex items-center justify-center bg-white/70 rounded-md">
                          <Loader2 className="w-4 h-4 text-rose-600 animate-spin" />
                        </div>
                      )}
                    </div>

                    {/* Action Group: Termin CTA + 3-Dot Dropdown Menu */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs py-1.5 px-3 h-auto font-medium text-gray-700 hover:text-rose-600 hover:border-rose-300 hover:bg-rose-50/50 transition-colors cursor-pointer"
                        onClick={() => setSelectedVendorForPayment(vendor)}
                      >
                        <CreditCard className="w-3.5 h-3.5 mr-1.5 text-rose-500" /> Termin
                      </Button>

                      {/* 3-Dot More Menu */}
                      <div className="relative vendor-menu-container">
                        <button
                          type="button"
                          onClick={() =>
                            setMenuOpenVendorId(
                              menuOpenVendorId === vendor.id ? null : vendor.id
                            )
                          }
                          aria-label="Menu Opsi Vendor"
                          className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                            menuOpenVendorId === vendor.id
                              ? 'bg-gray-100 border-gray-300 text-gray-900'
                              : 'border-transparent text-gray-400 hover:text-gray-700 hover:bg-gray-100'
                          }`}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {menuOpenVendorId === vendor.id && (
                          <div className="absolute right-0 bottom-full mb-1 w-36 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-30 animate-fade-in text-xs">
                            <button
                              type="button"
                              onClick={() => {
                                setMenuOpenVendorId(null)
                                setEditingVendor(vendor)
                                resetVendor({
                                  vendor_name: vendor.vendor_name,
                                  category: vendor.category || '',
                                  contact_person: vendor.contact_person || '',
                                  phone: vendor.phone || '',
                                  status: vendor.status,
                                  total_contract_value: Number(vendor.total_contract_value) || 0,
                                  budget_item_id: vendor.budget_item_id || '',
                                  notes: vendor.notes || '',
                                })
                              }}
                              className="w-full text-left px-3 py-2 flex items-center gap-2 text-gray-700 hover:bg-gray-50 cursor-pointer font-medium"
                            >
                              <Edit className="w-3.5 h-3.5 text-gray-400" />
                              <span>Edit Vendor</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setMenuOpenVendorId(null)
                                setVendorToDelete(vendor)
                              }}
                              className="w-full text-left px-3 py-2 flex items-center gap-2 text-red-600 hover:bg-red-50 cursor-pointer font-medium"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-500" />
                              <span>Hapus</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {filteredVendors.length === 0 && !loadingVendors && (
        <EmptyState
          icon={Store}
          title="Belum Ada Vendor"
          description="Catat vendor pernikahan (katering, dekorasi, MUA, dokumentasi) dan pantau jadwal pelunasan termin."
          actionLabel="Tambah Vendor Pertama"
          onAction={() => setIsAddVendorModalOpen(true)}
        />
      )}

      {/* Modal Add Vendor */}
      <Modal
        isOpen={isAddVendorModalOpen}
        onClose={() => {
          setIsAddVendorModalOpen(false)
          resetVendor()
        }}
        title="Tambah Vendor Baru"
      >
        <form
          noValidate
          onSubmit={handleVendorSubmit((data) => addVendorMutation.mutate(data))}
          className="space-y-4"
        >
          <Input
            label="Nama Vendor"
            placeholder="Contoh: Sanggar Kirana, Catering Buana"
            {...registerVendor('vendor_name')}
            error={vendorErrors.vendor_name?.message}
          />
          <Input
            label="Kategori Layanan"
            placeholder="Contoh: Katering, Fotografi, MUA, Dekorasi"
            {...registerVendor('category')}
            error={vendorErrors.category?.message}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Contact Person (PIC)"
              placeholder="Contoh: Mbak Rina"
              {...registerVendor('contact_person')}
              error={vendorErrors.contact_person?.message}
            />
            <Input
              label="Nomor WhatsApp"
              placeholder="Contoh: 08123456789"
              {...registerVendor('phone')}
              error={vendorErrors.phone?.message}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Controller
              control={vendorControl}
              name="status"
              render={({ field }) => (
                <Select
                  label="Status Pipeline"
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  options={[
                    { label: 'Riset', value: 'research' },
                    { label: 'Survey / Tes', value: 'survey' },
                    { label: 'Booked (DP)', value: 'booked' },
                    { label: 'Lunas', value: 'paid_off' },
                  ]}
                />
              )}
            />
            <Controller
              control={vendorControl}
              name="total_contract_value"
              render={({ field }) => (
                <CurrencyInput
                  label="Nilai Kontrak (Rp)"
                  placeholder="0"
                  value={field.value}
                  onChange={field.onChange}
                  error={vendorErrors.total_contract_value?.message}
                />
              )}
            />
          </div>

          <Controller
            control={vendorControl}
            name="budget_item_id"
            render={({ field }) => (
              <Select
                label="Alokasi Pos Budget"
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
            label="Catatan Kontrak / Fasilitas"
            placeholder="Contoh: Include bonus 2 round table & photo booth"
            {...registerVendor('notes')}
            error={vendorErrors.notes?.message}
          />

          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsAddVendorModalOpen(false)
                resetVendor()
              }}
            >
              Batal
            </Button>
            <Button type="submit" loading={addVendorMutation.isPending}>
              Simpan Vendor
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Manage Installments / Termin */}
      {selectedVendorForPayment && (
        <Modal
          isOpen={Boolean(selectedVendorForPayment)}
          onClose={() => setSelectedVendorForPayment(null)}
          title={`Jadwal Pembayaran: ${selectedVendorForPayment.vendor_name}`}
          description={`Nilai Kontrak: ${formatIDR(
            Number(selectedVendorForPayment.total_contract_value)
          )} | Terbayar: ${formatIDR(Number(selectedVendorForPayment.total_paid))}`}
          maxWidth="lg"
        >
          <div className="space-y-6">
            {/* Existing Payments List */}
            <div>
              <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                Riwayat & Jadwal Termin
              </h4>
              <div className="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden bg-white">
                {vendorTransactions.map((tx) => (
                  <div key={tx.id} className="p-3 flex items-center justify-between gap-3 text-xs">
                    <div className="min-w-0 pr-2">
                      <div className="font-semibold text-gray-900 truncate">{tx.title}</div>
                      <div className="text-gray-500 mt-0.5">
                        {tx.is_paid
                          ? `Dibayar: ${formatDate(tx.transaction_date)}`
                          : `Jatuh Tempo: ${formatDate(tx.due_date)}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="font-bold text-gray-900 text-sm">
                        {formatIDR(Number(tx.amount))}
                      </span>

                      {/* Toggle Paid / Unpaid Button */}
                      <button
                        type="button"
                        onClick={() =>
                          toggleTerminPaidMutation.mutate({
                            id: tx.id,
                            isPaid: !tx.is_paid,
                          })
                        }
                        disabled={toggleTerminPaidMutation.isPending}
                        title={tx.is_paid ? 'Klik untuk ubah jadi Belum Lunas' : 'Klik untuk Tandai Lunas'}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold cursor-pointer transition-colors ${
                          tx.is_paid
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                        }`}
                      >
                        {tx.is_paid ? (
                          <>
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            <span>Lunas</span>
                          </>
                        ) : (
                          <>
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Tandai Lunas</span>
                          </>
                        )}
                      </button>

                      {/* Delete Termin Button */}
                      <button
                        type="button"
                        onClick={() => deleteTerminMutation.mutate(tx.id)}
                        disabled={deleteTerminMutation.isPending}
                        title="Hapus Termin"
                        className="p-1 rounded text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
                {vendorTransactions.length === 0 && (
                  <div className="p-4 text-center text-xs text-gray-500">
                    Belum ada termin pembayaran dicatat untuk vendor ini.
                  </div>
                )}
              </div>
            </div>

            {/* Add Termin Form */}
            <form
              noValidate
              onSubmit={handleTerminSubmit((data) => addTerminMutation.mutate(data))}
              className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-3"
            >
              <h4 className="text-xs font-semibold text-gray-900">
                Tambah Termin / Pembayaran Baru
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Judul Termin"
                  placeholder="Contoh: DP 30%, Pelunasan H-7"
                  {...registerTermin('title')}
                  error={terminErrors.title?.message}
                />
                <Controller
                  control={terminControl}
                  name="amount"
                  render={({ field }) => (
                    <CurrencyInput
                      label="Nominal (Rp)"
                      placeholder="0"
                      value={field.value}
                      onChange={field.onChange}
                      error={terminErrors.amount?.message}
                    />
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-3 items-end">
                <Controller
                  control={terminControl}
                  name="due_date"
                  render={({ field }) => (
                    <DatePicker
                      label="Tanggal / Jatuh Tempo"
                      value={field.value || ''}
                      onChange={field.onChange}
                    />
                  )}
                />
                <div className="pb-2">
                  <Controller
                    control={terminControl}
                    name="is_paid"
                    render={({ field }) => (
                      <Checkbox
                        checked={field.value}
                        onChange={field.onChange}
                        label="Sudah Dibayar (Lunas)"
                      />
                    )}
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  size="sm"
                  loading={addTerminMutation.isPending}
                >
                  Simpan Termin
                </Button>
              </div>
            </form>
          </div>
        </Modal>
      )}

      {/* Modal Edit Vendor */}
      <Modal
        isOpen={Boolean(editingVendor)}
        onClose={() => {
          setEditingVendor(null)
          resetVendor()
        }}
        title="Edit Data Vendor"
        description="Perbarui informasi kontak, nilai kontrak, atau pindahkan ke Pos Anggaran lain."
      >
        <form
          noValidate
          onSubmit={handleVendorSubmit((data) => {
            if (editingVendor) {
              updateVendorMutation.mutate({ id: editingVendor.id, values: data })
            }
          })}
          className="space-y-4"
        >
          <Input
            label="Nama Vendor"
            placeholder="Contoh: Sanggar Kirana, Catering Buana"
            {...registerVendor('vendor_name')}
            error={vendorErrors.vendor_name?.message}
          />
          <Input
            label="Kategori Layanan"
            placeholder="Contoh: Katering, Fotografi, MUA, Dekorasi"
            {...registerVendor('category')}
            error={vendorErrors.category?.message}
          />
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Contact Person (PIC)"
              placeholder="Contoh: Mbak Rina"
              {...registerVendor('contact_person')}
              error={vendorErrors.contact_person?.message}
            />
            <Input
              label="Nomor WhatsApp"
              placeholder="Contoh: 08123456789"
              {...registerVendor('phone')}
              error={vendorErrors.phone?.message}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Controller
              control={vendorControl}
              name="status"
              render={({ field }) => (
                <Select
                  label="Status Pipeline"
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  options={[
                    { label: 'Riset', value: 'research' },
                    { label: 'Survey / Tes', value: 'survey' },
                    { label: 'Booked (DP)', value: 'booked' },
                    { label: 'Lunas', value: 'paid_off' },
                    { label: 'Batal', value: 'cancelled' },
                  ]}
                />
              )}
            />
            <Controller
              control={vendorControl}
              name="total_contract_value"
              render={({ field }) => (
                <CurrencyInput
                  label="Nilai Kontrak (Rp)"
                  placeholder="0"
                  value={field.value}
                  onChange={field.onChange}
                  error={vendorErrors.total_contract_value?.message}
                />
              )}
            />
          </div>

          <Controller
            control={vendorControl}
            name="budget_item_id"
            render={({ field }) => (
              <Select
                label="Alokasi Pos Budget (Bisa ubah/hubungkan kapan saja)"
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
            label="Catatan Kontrak / Fasilitas"
            placeholder="Contoh: Include bonus 2 round table & photo booth"
            {...registerVendor('notes')}
            error={vendorErrors.notes?.message}
          />

          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEditingVendor(null)
                resetVendor()
              }}
              disabled={updateVendorMutation.isPending}
            >
              Batal
            </Button>
            <Button type="submit" loading={updateVendorMutation.isPending}>
              Simpan Perubahan
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Modal Delete Vendor */}
      <Modal
        isOpen={Boolean(vendorToDelete)}
        onClose={() => setVendorToDelete(null)}
        title="Hapus Data Vendor?"
        description="Tindakan ini tidak dapat dibatalkan."
        maxWidth="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Apakah Anda yakin ingin menghapus vendor{' '}
            <strong className="text-gray-900 font-semibold">
              {vendorToDelete?.vendor_name}
            </strong>
            ? Transaksi pembayaran yang sudah tercatat akan tetap ada di Arus Kas sebagai riwayat umum.
          </p>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setVendorToDelete(null)}
              disabled={deleteVendorMutation.isPending}
            >
              Batal
            </Button>
            <Button
              type="button"
              variant="danger"
              loading={deleteVendorMutation.isPending}
              onClick={() => {
                if (vendorToDelete) deleteVendorMutation.mutate(vendorToDelete.id)
              }}
            >
              Hapus Vendor
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
