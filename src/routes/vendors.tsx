import * as React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Phone, CreditCard, Store } from 'lucide-react'
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
  const [selectedVendorForPayment, setSelectedVendorForPayment] = React.useState<Vendor | null>(null)

  // React Hook Form for Vendor
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

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: VendorStatus }) => {
      const { error } = await supabase.from('vendors').update({ status: newStatus }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      toast.info('Status Vendor Diperbarui')
    },
    onError: (err: Error) => {
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
        return <Badge variant="info">Survey / Test</Badge>
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
          { label: 'Survey / Test Food', val: 'survey' },
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
              <Card key={vendor.id} className="flex flex-col justify-between">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-xs font-semibold text-rose-600 uppercase tracking-wider">
                        {vendor.category || 'Vendor'}
                      </span>
                      <h3 className="font-bold text-gray-900 text-base mt-0.5">{vendor.vendor_name}</h3>
                    </div>
                    {getStatusBadge(vendor.status)}
                  </div>

                  {vendor.contact_person && (
                    <div className="text-xs text-gray-600 flex items-center gap-2">
                      <span className="font-medium text-gray-700">{vendor.contact_person}</span>
                      {vendor.phone && (
                        <a
                          href={`https://wa.me/${vendor.phone.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1 font-medium"
                        >
                          <Phone className="w-3 h-3" /> WA
                        </a>
                      )}
                    </div>
                  )}

                  {/* Payment Progress */}
                  <div className="pt-2 border-t border-gray-100 space-y-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Terbayar: {formatIDR(paid)}</span>
                      <span className="font-semibold text-gray-900">{formatIDR(contract)}</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          pct >= 100 ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="text-right text-[11px] font-medium text-gray-500">
                      {pct}% Terbayar
                    </div>
                  </div>

                  {/* Quick Status Select */}
                  <div className="pt-2 flex items-center justify-between gap-2">
                    <div className="w-32">
                      <Select
                        value={vendor.status}
                        onChange={(e) =>
                          updateStatusMutation.mutate({
                            id: vendor.id,
                            newStatus: e.target.value as VendorStatus,
                          })
                        }
                        options={[
                          { label: 'Riset', value: 'research' },
                          { label: 'Survey', value: 'survey' },
                          { label: 'Booked', value: 'booked' },
                          { label: 'Lunas', value: 'paid_off' },
                          { label: 'Batal', value: 'cancelled' },
                        ]}
                      />
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs py-2 px-3 h-auto"
                      onClick={() => setSelectedVendorForPayment(vendor)}
                    >
                      <CreditCard className="w-3.5 h-3.5 mr-1" /> Termin
                    </Button>
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
                    { label: 'Survey / Test Food', value: 'survey' },
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
                  <div key={tx.id} className="p-3 flex items-center justify-between text-xs">
                    <div>
                      <div className="font-semibold text-gray-900">{tx.title}</div>
                      <div className="text-gray-500 mt-0.5">
                        {tx.is_paid
                          ? `Dibayar: ${formatDate(tx.transaction_date)}`
                          : `Jatuh Tempo: ${formatDate(tx.due_date)}`}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant={tx.is_paid ? 'success' : 'warning'}>
                        {tx.is_paid ? 'Lunas' : 'Belum Lunas'}
                      </Badge>
                      <span className="font-bold text-gray-900 text-sm">
                        {formatIDR(Number(tx.amount))}
                      </span>
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
    </div>
  )
}
