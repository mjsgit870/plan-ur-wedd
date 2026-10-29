import * as React from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Wallet,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Layers,
  Receipt,
  Trash2,
  ArrowDownCircle,
  ArrowUpCircle,
} from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'
import type { BudgetItem, Transaction, BudgetPhase, TransactionType, PaidBy } from '../types/database'
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
import { CardSkeleton, TableRowSkeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'
import {
  budgetItemSchema,
  transactionSchema,
  type BudgetItemFormValues,
  type TransactionFormValues,
} from '../lib/schemas'

const PAID_BY_LABELS: Record<string, string> = {
  joint: 'Bersama (Joint)',
  groom: 'CPP (Pria)',
  bride: 'CPW (Wanita)',
  parents: 'Orang Tua',
}

export const Route = createFileRoute('/finance')({ component: FinancePage })

function FinancePage() {
  const currentWorkspace = useAppStore((s) => s.currentWorkspace)
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = React.useState<'budget' | 'transactions'>('budget')
  const [selectedPhase, setSelectedPhase] = React.useState<string>('all')

  // Modals state
  const [isBudgetModalOpen, setIsBudgetModalOpen] = React.useState(false)
  const [isTxModalOpen, setIsTxModalOpen] = React.useState(false)
  const [itemToDelete, setItemToDelete] = React.useState<BudgetItem | null>(null)
  const [deleteOption, setDeleteOption] = React.useState<'unlink' | 'cascade'>('unlink')

  // React Hook Form for Budget
  const {
    register: registerBudget,
    handleSubmit: handleBudgetSubmit,
    control: budgetControl,
    reset: resetBudget,
    formState: { errors: budgetErrors },
  } = useForm<BudgetItemFormValues>({
    resolver: zodResolver(budgetItemSchema),
    defaultValues: {
      phase: 'wedding',
      category_name: '',
      estimated_amount: 0,
      notes: '',
    },
  })

  // React Hook Form for Transaction
  const {
    register: registerTx,
    handleSubmit: handleTxSubmit,
    control: txControl,
    reset: resetTx,
    watch: watchTx,
    formState: { errors: txErrors },
  } = useForm<TransactionFormValues>({
    resolver: zodResolver(transactionSchema),
    defaultValues: {
      type: 'expense',
      title: '',
      amount: 0,
      budget_item_id: '',
      paid_by: 'joint',
      is_paid: true,
      transaction_date: new Date().toISOString().split('T')[0],
    },
  })

  const currentTxType = watchTx('type')

  // Queries
  const { data: budgetItems = [], isLoading: loadingBudget } = useQuery({
    queryKey: ['budget_items', currentWorkspace?.id],
    enabled: Boolean(currentWorkspace?.id && isSupabaseConfigured),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('budget_items')
        .select('*')
        .eq('workspace_id', currentWorkspace!.id)
        .order('created_at', { ascending: true })
      if (error) throw error
      return (data as BudgetItem[]) || []
    },
  })

  const { data: transactions = [], isLoading: loadingTx } = useQuery({
    queryKey: ['transactions', currentWorkspace?.id],
    enabled: Boolean(currentWorkspace?.id && isSupabaseConfigured),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, budget_item:budget_items(*)')
        .eq('workspace_id', currentWorkspace!.id)
        .order('transaction_date', { ascending: false })
      if (error) throw error
      return (data as Transaction[]) || []
    },
  })

  // Mutations
  const addBudgetMutation = useMutation({
    mutationFn: async (values: BudgetItemFormValues) => {
      const { error } = await supabase.from('budget_items').insert({
        workspace_id: currentWorkspace!.id,
        phase: values.phase,
        category_name: values.category_name,
        estimated_amount: Number(values.estimated_amount) || 0,
        notes: values.notes || null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget_items'] })
      setIsBudgetModalOpen(false)
      resetBudget()
      toast.success('Pos Anggaran Disimpan', 'Pos biaya baru berhasil ditambahkan ke anggaran.')
    },
    onError: (err: Error) => {
      toast.error('Gagal Menyimpan Pos', err.message)
    },
  })

  const addTxMutation = useMutation({
    mutationFn: async (values: TransactionFormValues) => {
      const { error } = await supabase.from('transactions').insert({
        workspace_id: currentWorkspace!.id,
        type: values.type,
        title: values.title,
        amount: Number(values.amount) || 0,
        budget_item_id: values.budget_item_id || null,
        paid_by: values.paid_by,
        is_paid: values.is_paid,
        transaction_date: values.transaction_date,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['budget_items'] })
      setIsTxModalOpen(false)
      resetTx()
      toast.success('Transaksi Dicatat', 'Arus kas dan realisasi budget otomatis diperbarui.')
    },
    onError: (err: Error) => {
      toast.error('Gagal Mencatat Transaksi', err.message)
    },
  })

  const deleteBudgetMutation = useMutation({
    mutationFn: async ({
      id,
      deleteRelatedTransactions,
    }: {
      id: string
      deleteRelatedTransactions: boolean
    }) => {
      if (deleteRelatedTransactions) {
        // First delete all linked transactions to revert cashflow
        const { error: txErr } = await supabase
          .from('transactions')
          .delete()
          .eq('budget_item_id', id)
        if (txErr) throw txErr
      }

      // Delete the budget item itself
      const { error: budgetErr } = await supabase
        .from('budget_items')
        .delete()
        .eq('id', id)
      if (budgetErr) throw budgetErr
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['budget_items'] })
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
      setItemToDelete(null)
      setDeleteOption('unlink')
      if (variables.deleteRelatedTransactions) {
        toast.success(
          'Pos & Transaksi Dihapus',
          'Pos anggaran beserta transaksi terkait dihapus, saldo arus kas dikembalikan.'
        )
      } else {
        toast.success(
          'Pos Anggaran Dihapus',
          'Pos anggaran dihapus, catatan riwayat transaksi tetap aman tersimpan.'
        )
      }
    },
    onError: (err: Error) => {
      toast.error('Gagal Menghapus Pos', err.message)
    },
  })

  // Calculations
  const totalEstimated = budgetItems.reduce((acc, it) => acc + Number(it.estimated_amount || 0), 0)
  const totalActual = budgetItems.reduce((acc, it) => acc + Number(it.actual_amount || 0), 0)
  const totalIncome = transactions
    .filter((t) => t.type === 'income_saving' && t.is_paid)
    .reduce((acc, t) => acc + Number(t.amount || 0), 0)
  const totalExpense = transactions
    .filter((t) => t.type === 'expense' && t.is_paid)
    .reduce((acc, t) => acc + Number(t.amount || 0), 0)
  const netCashflow = totalIncome - totalExpense

  const filteredBudget =
    selectedPhase === 'all'
      ? budgetItems
      : budgetItems.filter((it) => it.phase === selectedPhase)

  if (!currentWorkspace) {
    return (
      <div className="p-8 text-center bg-white rounded-xl border border-gray-200">
        <p className="text-gray-500">Pilih atau buat Workspace terlebih dahulu.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Finance & Budgeting</h1>
          <p className="text-xs sm:text-sm text-gray-500">
            Monitoring anggaran pos acara, tabungan bersama, dan arus kas harian.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setIsBudgetModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> Pos Budget
          </Button>
          <Button size="sm" onClick={() => setIsTxModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> Catat Transaksi
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">Total Anggaran (Estimasi)</span>
              <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-bold text-gray-900 mt-2">{formatIDR(totalEstimated)}</div>
            <div className="text-xs text-gray-500 mt-1">
              Target Plafon: {formatIDR(currentWorkspace.total_budget_target)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">Realisasi Pengeluaran</span>
              <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl font-bold text-gray-900 mt-2">{formatIDR(totalActual)}</div>
            <div className="text-xs text-gray-500 mt-1">
              {totalEstimated > 0
                ? `${Math.round((totalActual / totalEstimated) * 100)}% dari estimasi`
                : '0% terpakai'}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-gray-500">Sisa Kas (Cashflow)</span>
              <div
                className={`p-2 rounded-lg ${
                  netCashflow >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                }`}
              >
                {netCashflow >= 0 ? (
                  <ArrowUpRight className="w-4 h-4" />
                ) : (
                  <ArrowDownRight className="w-4 h-4" />
                )}
              </div>
            </div>
            <div
              className={`text-xl font-bold mt-2 ${
                netCashflow >= 0 ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              {formatIDR(netCashflow)}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              Masuk: {formatIDR(totalIncome)} | Keluar: {formatIDR(totalExpense)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Segmented Control (Top-Bottom Layout, Centered) */}
      <div className="flex flex-col items-center gap-3 pt-1 pb-2">
        {/* Main Tab Pill */}
        <div className="bg-slate-100 p-1 rounded-xl inline-flex max-w-sm sm:max-w-md w-full shadow-2xs">
          <button
            type="button"
            onClick={() => setActiveTab('budget')}
            className={`flex-1 py-2 px-3 text-xs sm:text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'budget'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Layers className="w-4 h-4 text-rose-500 shrink-0" />
            <span>Pos Anggaran</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'budget'
                  ? 'bg-rose-50 text-rose-600'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {budgetItems.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('transactions')}
            className={`flex-1 py-2 px-3 text-xs sm:text-sm font-semibold rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'transactions'
                ? 'bg-white text-gray-900 shadow-xs'
                : 'text-gray-500 hover:text-gray-800'
            }`}
          >
            <Receipt className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Arus Kas</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'transactions'
                  ? 'bg-emerald-50 text-emerald-600'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {transactions.length}
            </span>
          </button>
        </div>

        {/* Phase Filter Chips (Centered Bottom Row) */}
        {activeTab === 'budget' && (
          <div className="w-full flex justify-center">
            <div className="flex items-center justify-start sm:justify-center gap-1.5 overflow-x-auto max-w-full px-1 py-1 scrollbar-none">
              {[
                { id: 'all', label: 'Semua' },
                { id: 'engagement', label: 'Lamaran' },
                { id: 'wedding', label: 'Akad & Resepsi' },
                { id: 'administration', label: 'KUA / Dokumen' },
                { id: 'seserahan', label: 'Seserahan' },
              ].map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setSelectedPhase(p.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap cursor-pointer transition-all ${
                    selectedPhase === p.id
                      ? 'bg-rose-600 text-white shadow-2xs font-semibold'
                      : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Tab 1: Pos Anggaran */}
      {activeTab === 'budget' && (
        <div className="space-y-4 animate-fade-in">
          {loadingBudget ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
              <CardSkeleton />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredBudget.map((item) => {
                const est = Number(item.estimated_amount || 0)
                const act = Number(item.actual_amount || 0)
                const pct = est > 0 ? Math.min(Math.round((act / est) * 100), 100) : 0
                const isOver = act > est && est > 0

                return (
                  <Card key={item.id} className="relative group">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 pr-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="purple" className="capitalize text-[10px]">
                              {item.phase}
                            </Badge>
                            <Badge variant={isOver ? 'danger' : act > 0 ? 'warning' : 'default'} className="text-[10px]">
                              {pct}%
                            </Badge>
                          </div>
                          <h4 className="font-semibold text-gray-900 mt-1 truncate">{item.category_name}</h4>
                          {item.notes && <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.notes}</p>}
                        </div>

                        <button
                          type="button"
                          onClick={() => setItemToDelete(item)}
                          title="Hapus Pos Anggaran"
                          className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-lg transition-colors cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="mt-3 space-y-1.5">
                        <div className="flex justify-between text-xs text-gray-600">
                          <span>Realisasi: {formatIDR(act)}</span>
                          <span>Estimasi: {formatIDR(est)}</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all duration-300 ${
                              isOver ? 'bg-red-500' : 'bg-rose-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}

          {filteredBudget.length === 0 && !loadingBudget && (
            <EmptyState
              icon={Layers}
              title="Belum Ada Pos Anggaran"
              description="Rencanakan estimasi pengeluaran per pos (venue, katering, busana) untuk memantau plafon biaya."
              actionLabel="Tambah Pos Anggaran"
              onAction={() => setIsBudgetModalOpen(true)}
            />
          )}
        </div>
      )}

      {/* Tab 2: Transaksi Cashflow */}
      {activeTab === 'transactions' && (
        <Card className="animate-fade-in">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 border-b border-gray-200 text-xs">
                <tr>
                  <th className="px-4 py-3 font-semibold">Tanggal</th>
                  <th className="px-4 py-3 font-semibold">Keterangan</th>
                  <th className="px-4 py-3 font-semibold">Pos Terkait</th>
                  <th className="px-4 py-3 font-semibold">Dibayar Oleh</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                  <th className="px-4 py-3 font-semibold text-right">Nominal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loadingTx ? (
                  <>
                    <TableRowSkeleton cols={6} />
                    <TableRowSkeleton cols={6} />
                    <TableRowSkeleton cols={6} />
                  </>
                ) : (
                  transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-gray-50/50">
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">
                        {formatDate(tx.transaction_date)}
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{tx.title}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        {tx.budget_item?.category_name || '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-medium text-gray-700 bg-gray-100 px-2.5 py-1 rounded-md whitespace-nowrap">
                          {PAID_BY_LABELS[tx.paid_by] || tx.paid_by}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={tx.is_paid ? 'success' : 'warning'}>
                          {tx.is_paid ? 'Lunas' : 'Jadwal'}
                        </Badge>
                      </td>
                      <td
                        className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${
                          tx.type === 'income_saving' ? 'text-emerald-600' : 'text-gray-900'
                        }`}
                      >
                        {tx.type === 'income_saving' ? '+' : '-'} {formatIDR(Number(tx.amount))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {transactions.length === 0 && !loadingTx && (
            <div className="p-4">
              <EmptyState
                icon={Receipt}
                title="Belum Ada Transaksi"
                description="Catat setoran tabungan masuk atau pembayaran pengeluaran untuk memantau arus kas."
                actionLabel="Catat Transaksi Pertama"
                onAction={() => setIsTxModalOpen(true)}
              />
            </div>
          )}
        </Card>
      )}

      {/* Modal Add Budget */}
      <Modal
        isOpen={isBudgetModalOpen}
        onClose={() => {
          setIsBudgetModalOpen(false)
          resetBudget()
        }}
        title="Tambah Pos Anggaran"
      >
        <form
          noValidate
          onSubmit={handleBudgetSubmit((data) => addBudgetMutation.mutate(data))}
          className="space-y-4"
        >
          <Controller
            control={budgetControl}
            name="phase"
            render={({ field }) => (
              <Select
                label="Tahap Acara"
                value={field.value}
                onChange={(e) => field.onChange(e.target.value)}
                options={[
                  { label: 'Lamaran (Engagement)', value: 'engagement' },
                  { label: 'Akad & Resepsi (Wedding)', value: 'wedding' },
                  { label: 'Administrasi & KUA', value: 'administration' },
                  { label: 'Seserahan & Hantaran', value: 'seserahan' },
                ]}
              />
            )}
          />
          <Input
            label="Nama Kategori Pos"
            placeholder="Contoh: Venue & Katering, Busana Pengantin"
            {...registerBudget('category_name')}
            error={budgetErrors.category_name?.message}
          />
          <Controller
            control={budgetControl}
            name="estimated_amount"
            render={({ field }) => (
              <CurrencyInput
                label="Estimasi Biaya (Rp)"
                placeholder="0"
                value={field.value}
                onChange={field.onChange}
                error={budgetErrors.estimated_amount?.message}
              />
            )}
          />
          <Input
            label="Catatan Tambahan (Opsional)"
            placeholder="Contoh: Termasuk 500 porsi prasmanan"
            {...registerBudget('notes')}
            error={budgetErrors.notes?.message}
          />

          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsBudgetModalOpen(false)
                resetBudget()
              }}
            >
              Batal
            </Button>
            <Button type="submit" loading={addBudgetMutation.isPending}>
              Simpan Pos
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Add Transaction */}
      <Modal
        isOpen={isTxModalOpen}
        onClose={() => {
          setIsTxModalOpen(false)
          resetTx()
        }}
        title="Catat Transaksi Kas"
      >
        <form
          noValidate
          onSubmit={handleTxSubmit((data) => addTxMutation.mutate(data))}
          className="space-y-4"
        >
          {/* Segmented Tipe Transaksi Picker */}
          <Controller
            control={txControl}
            name="type"
            render={({ field }) => (
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1.5">
                  Tipe Transaksi
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => field.onChange('expense')}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      field.value === 'expense'
                        ? 'border-rose-500 bg-rose-50/70 text-rose-900 shadow-xs ring-1 ring-rose-500'
                        : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        field.value === 'expense'
                          ? 'bg-rose-100 text-rose-600'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      <ArrowDownCircle className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold leading-tight">Pengeluaran</div>
                      <div className="text-[10px] text-gray-500 mt-0.5 leading-tight truncate">
                        Expense kas & budget
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => field.onChange('income_saving')}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-left cursor-pointer transition-all ${
                      field.value === 'income_saving'
                        ? 'border-emerald-500 bg-emerald-50/70 text-emerald-900 shadow-xs ring-1 ring-emerald-500'
                        : 'border-gray-200 bg-white hover:bg-gray-50 text-gray-700'
                    }`}
                  >
                    <div
                      className={`p-2 rounded-lg shrink-0 ${
                        field.value === 'income_saving'
                          ? 'bg-emerald-100 text-emerald-600'
                          : 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      <ArrowUpCircle className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold leading-tight">Setoran Tabungan</div>
                      <div className="text-[10px] text-gray-500 mt-0.5 leading-tight truncate">
                        Pemasukan kas bersama
                      </div>
                    </div>
                  </button>
                </div>
              </div>
            )}
          />
          <Input
            label="Keterangan Transaksi"
            placeholder="Contoh: Pembayaran DP Gedung, Beli Cincin"
            {...registerTx('title')}
            error={txErrors.title?.message}
          />
          <Controller
            control={txControl}
            name="amount"
            render={({ field }) => (
              <CurrencyInput
                label="Nominal (Rp)"
                placeholder="0"
                value={field.value}
                onChange={field.onChange}
                error={txErrors.amount?.message}
              />
            )}
          />

          {currentTxType === 'expense' && (
            <Controller
              control={txControl}
              name="budget_item_id"
              render={({ field }) => (
                <Select
                  label="Alokasi Pos Budget"
                  value={field.value || ''}
                  onChange={(e) => field.onChange(e.target.value)}
                >
                  <option value="">-- Tanpa Pos Terkait --</option>
                  {budgetItems.map((b) => (
                    <option key={b.id} value={b.id}>
                      [{b.phase.toUpperCase()}] {b.category_name}
                    </option>
                  ))}
                </Select>
              )}
            />
          )}

          <div className="grid grid-cols-2 gap-3">
            <Controller
              control={txControl}
              name="paid_by"
              render={({ field }) => (
                <Select
                  label="Dibayar Oleh"
                  value={field.value}
                  onChange={(e) => field.onChange(e.target.value)}
                  options={[
                    { label: 'Bersama (Joint)', value: 'joint' },
                    { label: 'CPP (Groom)', value: 'groom' },
                    { label: 'CPW (Bride)', value: 'bride' },
                    { label: 'Orang Tua (Parents)', value: 'parents' },
                  ]}
                />
              )}
            />
            <Controller
              control={txControl}
              name="transaction_date"
              render={({ field }) => (
                <DatePicker
                  label="Tanggal Transaksi"
                  value={field.value}
                  onChange={field.onChange}
                />
              )}
            />
          </div>

          <div className="pt-1">
            <Controller
              control={txControl}
              name="is_paid"
              render={({ field }) => (
                <Checkbox
                  checked={field.value}
                  onChange={field.onChange}
                  label="Transaksi Sudah Lunas / Terealisasi"
                />
              )}
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsTxModalOpen(false)
                resetTx()
              }}
            >
              Batal
            </Button>
            <Button type="submit" loading={addTxMutation.isPending}>
              Simpan Transaksi
            </Button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Modal Delete Budget Item */}
      <Modal
        isOpen={Boolean(itemToDelete)}
        onClose={() => {
          setItemToDelete(null)
          setDeleteOption('unlink')
        }}
        title="Hapus Pos Anggaran"
        description="Kelola pos dan status transaksi terkait."
        maxWidth="md"
      >
        {itemToDelete && (() => {
          const linkedTxs = transactions.filter((t) => t.budget_item_id === itemToDelete.id)
          const totalLinkedAmount = linkedTxs.reduce((sum, t) => sum + Number(t.amount || 0), 0)

          return (
            <div className="space-y-4">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-xs text-gray-500 font-medium">Pos yang akan dihapus:</div>
                <div className="text-sm font-bold text-gray-900 mt-0.5">
                  {itemToDelete.category_name} ({itemToDelete.phase.toUpperCase()})
                </div>
                <div className="text-xs text-gray-600 mt-1 flex items-center justify-between">
                  <span>Realisasi terpakai:</span>
                  <span className="font-semibold text-gray-900">{formatIDR(Number(itemToDelete.actual_amount || 0))}</span>
                </div>
              </div>

              {linkedTxs.length > 0 ? (
                <div className="space-y-3">
                  <div className="text-xs font-semibold text-gray-800">
                    Ditemukan {linkedTxs.length} transaksi terkait ({formatIDR(totalLinkedAmount)}). Pilih perlakuan transaksi:
                  </div>

                  <div className="space-y-2">
                    <label
                      onClick={() => setDeleteOption('unlink')}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        deleteOption === 'unlink'
                          ? 'border-rose-500 bg-rose-50/50 ring-1 ring-rose-500/30'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="deleteOption"
                        checked={deleteOption === 'unlink'}
                        onChange={() => setDeleteOption('unlink')}
                        className="mt-0.5 text-rose-600 focus:ring-rose-500"
                      />
                      <div className="text-xs">
                        <div className="font-bold text-gray-900">
                          Simpan Catatan Transaksi (Lepas Pos)
                        </div>
                        <div className="text-gray-500 mt-0.5 leading-relaxed">
                          Transaksi tetap ada di Arus Kas sebagai riwayat pengeluaran asli riil (pos menjadi 'Tanpa Pos'). Saldo kas tidak berubah.
                        </div>
                      </div>
                    </label>

                    <label
                      onClick={() => setDeleteOption('cascade')}
                      className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                        deleteOption === 'cascade'
                          ? 'border-red-500 bg-red-50/50 ring-1 ring-red-500/30'
                          : 'border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      <input
                        type="radio"
                        name="deleteOption"
                        checked={deleteOption === 'cascade'}
                        onChange={() => setDeleteOption('cascade')}
                        className="mt-0.5 text-red-600 focus:ring-red-500"
                      />
                      <div className="text-xs">
                        <div className="font-bold text-red-900">
                          Hapus Transaksi & Kembalikan Saldo Kas
                        </div>
                        <div className="text-gray-500 mt-0.5 leading-relaxed">
                          Semua {linkedTxs.length} transaksi pada pos ini ikut terhapus. Pengeluaran dibatalkan dan saldo kas bertambah kembali {formatIDR(totalLinkedAmount)}.
                        </div>
                      </div>
                    </label>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-600 leading-relaxed">
                  Belum ada transaksi yang terhubung dengan pos ini. Pos akan dihapus permanen.
                </p>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setItemToDelete(null)
                    setDeleteOption('unlink')
                  }}
                  disabled={deleteBudgetMutation.isPending}
                >
                  Batal
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  loading={deleteBudgetMutation.isPending}
                  onClick={() => {
                    deleteBudgetMutation.mutate({
                      id: itemToDelete.id,
                      deleteRelatedTransactions: deleteOption === 'cascade',
                    })
                  }}
                >
                  {deleteOption === 'cascade' && linkedTxs.length > 0
                    ? 'Hapus Pos & Transaksi'
                    : 'Hapus Pos'}
                </Button>
              </div>
            </div>
          )
        })()}
      </Modal>
    </div>
  )
}
