import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Wallet, TrendingDown, ArrowUpRight, ArrowDownRight, Layers, Receipt } from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'
import type { BudgetItem, Transaction, BudgetPhase, TransactionType, PaidBy } from '../types/database'
import { formatIDR, formatDate } from '../lib/utils'
import { Card, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { DatePicker } from '../components/ui/DatePicker'
import { Checkbox } from '../components/ui/Checkbox'
import { toast } from '../components/ui/Toast'
import { CardSkeleton, TableRowSkeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'

export const Route = createFileRoute('/finance')({ component: FinancePage })

function FinancePage() {
  const currentWorkspace = useAppStore((s) => s.currentWorkspace)
  const queryClient = useQueryClient()

  const [activeTab, setActiveTab] = React.useState<'budget' | 'transactions'>('budget')
  const [selectedPhase, setSelectedPhase] = React.useState<string>('all')

  // Modals state
  const [isBudgetModalOpen, setIsBudgetModalOpen] = React.useState(false)
  const [isTxModalOpen, setIsTxModalOpen] = React.useState(false)

  // Budget form
  const [budgetPhase, setBudgetPhase] = React.useState<BudgetPhase>('wedding')
  const [categoryName, setCategoryName] = React.useState('')
  const [estimatedAmount, setEstimatedAmount] = React.useState('')
  const [budgetNotes, setBudgetNotes] = React.useState('')

  // Transaction form
  const [txType, setTxType] = React.useState<TransactionType>('expense')
  const [txTitle, setTxTitle] = React.useState('')
  const [txAmount, setTxAmount] = React.useState('')
  const [txBudgetId, setTxBudgetId] = React.useState('')
  const [txPaidBy, setTxPaidBy] = React.useState<PaidBy>('joint')
  const [txIsPaid, setTxIsPaid] = React.useState(true)
  const [txDate, setTxDate] = React.useState(new Date().toISOString().split('T')[0])

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
    mutationFn: async () => {
      const { error } = await supabase.from('budget_items').insert({
        workspace_id: currentWorkspace!.id,
        phase: budgetPhase,
        category_name: categoryName,
        estimated_amount: Number(estimatedAmount) || 0,
        notes: budgetNotes || null,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['budget_items'] })
      setIsBudgetModalOpen(false)
      setCategoryName('')
      setEstimatedAmount('')
      setBudgetNotes('')
      toast.success('Pos Anggaran Disimpan', 'Pos biaya baru berhasil ditambahkan ke anggaran.')
    },
    onError: (err: Error) => {
      toast.error('Gagal Menyimpan Pos', err.message)
    },
  })

  const addTxMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('transactions').insert({
        workspace_id: currentWorkspace!.id,
        type: txType,
        title: txTitle,
        amount: Number(txAmount) || 0,
        budget_item_id: txBudgetId ? txBudgetId : null,
        paid_by: txPaidBy,
        is_paid: txIsPaid,
        transaction_date: txDate,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transactions'] })
      queryClient.invalidateQueries({ queryKey: ['budget_items'] })
      setIsTxModalOpen(false)
      setTxTitle('')
      setTxAmount('')
      setTxBudgetId('')
      toast.success('Transaksi Dicatat', 'Arus kas dan realisasi budget otomatis diperbarui.')
    },
    onError: (err: Error) => {
      toast.error('Gagal Mencatat Transaksi', err.message)
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

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-6">
          <button
            onClick={() => setActiveTab('budget')}
            className={`pb-3 text-sm font-semibold border-b-2 cursor-pointer transition-colors ${
              activeTab === 'budget'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Pos Anggaran ({budgetItems.length})
          </button>
          <button
            onClick={() => setActiveTab('transactions')}
            className={`pb-3 text-sm font-semibold border-b-2 cursor-pointer transition-colors ${
              activeTab === 'transactions'
                ? 'border-rose-600 text-rose-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            Arus Kas Transaksi ({transactions.length})
          </button>
        </nav>
      </div>

      {/* Tab 1: Pos Anggaran */}
      {activeTab === 'budget' && (
        <div className="space-y-4 animate-fade-in">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
              {['all', 'engagement', 'wedding', 'administration', 'seserahan'].map((phase) => (
                <button
                  key={phase}
                  onClick={() => setSelectedPhase(phase)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg capitalize whitespace-nowrap cursor-pointer transition-colors ${
                    selectedPhase === phase
                      ? 'bg-rose-600 text-white shadow-xs'
                      : 'bg-white border border-gray-200 text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  {phase === 'all' ? 'Semua Tahap' : phase}
                </button>
              ))}
            </div>
          </div>

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
                  <Card key={item.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <Badge variant="purple" className="capitalize text-[10px]">
                            {item.phase}
                          </Badge>
                          <h4 className="font-semibold text-gray-900 mt-1">{item.category_name}</h4>
                          {item.notes && <p className="text-xs text-gray-500 mt-0.5">{item.notes}</p>}
                        </div>
                        <Badge variant={isOver ? 'danger' : act > 0 ? 'warning' : 'default'}>
                          {pct}%
                        </Badge>
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
                        <span className="text-xs capitalize font-medium text-gray-700 bg-gray-100 px-2 py-0.5 rounded-md">
                          {tx.paid_by}
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
        onClose={() => setIsBudgetModalOpen(false)}
        title="Tambah Pos Anggaran"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            addBudgetMutation.mutate()
          }}
          className="space-y-4"
        >
          <Select
            label="Tahap Acara"
            value={budgetPhase}
            onChange={(e) => setBudgetPhase(e.target.value as BudgetPhase)}
            options={[
              { label: 'Lamaran (Engagement)', value: 'engagement' },
              { label: 'Akad & Resepsi (Wedding)', value: 'wedding' },
              { label: 'Administrasi & KUA', value: 'administration' },
              { label: 'Seserahan & Hantaran', value: 'seserahan' },
            ]}
          />
          <Input
            label="Nama Kategori Pos"
            placeholder="Contoh: Venue & Katering, Busana Pengantin"
            value={categoryName}
            onChange={(e) => setCategoryName(e.target.value)}
            required
          />
          <Input
            label="Estimasi Biaya (Rp)"
            type="number"
            placeholder="0"
            value={estimatedAmount}
            onChange={(e) => setEstimatedAmount(e.target.value)}
            required
          />
          <Input
            label="Catatan Tambahan (Opsional)"
            placeholder="Contoh: Termasuk 500 porsi prasmanan"
            value={budgetNotes}
            onChange={(e) => setBudgetNotes(e.target.value)}
          />

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsBudgetModalOpen(false)}>
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
        onClose={() => setIsTxModalOpen(false)}
        title="Catat Transaksi Kas"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            addTxMutation.mutate()
          }}
          className="space-y-4"
        >
          <Select
            label="Tipe Transaksi"
            value={txType}
            onChange={(e) => setTxType(e.target.value as TransactionType)}
            options={[
              { label: 'Pengeluaran (Expense)', value: 'expense' },
              { label: 'Setoran Tabungan Bersama (Income)', value: 'income_saving' },
            ]}
          />
          <Input
            label="Keterangan Transaksi"
            placeholder="Contoh: Pembayaran DP Gedung, Beli Cincin"
            value={txTitle}
            onChange={(e) => setTxTitle(e.target.value)}
            required
          />
          <Input
            label="Nominal (Rp)"
            type="number"
            placeholder="0"
            value={txAmount}
            onChange={(e) => setTxAmount(e.target.value)}
            required
          />

          {txType === 'expense' && (
            <Select
              label="Alokasi Pos Budget"
              value={txBudgetId}
              onChange={(e) => setTxBudgetId(e.target.value)}
            >
              <option value="">-- Tanpa Pos Terkait --</option>
              {budgetItems.map((b) => (
                <option key={b.id} value={b.id}>
                  [{b.phase.toUpperCase()}] {b.category_name}
                </option>
              ))}
            </Select>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Dibayar Oleh"
              value={txPaidBy}
              onChange={(e) => setTxPaidBy(e.target.value as PaidBy)}
              options={[
                { label: 'Bersama (Joint)', value: 'joint' },
                { label: 'CPP (Groom)', value: 'groom' },
                { label: 'CPW (Bride)', value: 'bride' },
                { label: 'Orang Tua (Parents)', value: 'parents' },
              ]}
            />
            <DatePicker
              label="Tanggal Transaksi"
              value={txDate}
              onChange={(date) => setTxDate(date)}
            />
          </div>

          <div className="pt-1">
            <Checkbox
              checked={txIsPaid}
              onChange={(checked) => setTxIsPaid(checked)}
              label="Transaksi Sudah Lunas / Terealisasi"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsTxModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" loading={addTxMutation.isPending}>
              Simpan Transaksi
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
