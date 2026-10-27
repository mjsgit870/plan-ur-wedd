import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import {
  Clock,
  Wallet,
  TrendingDown,
  ArrowUpRight,
  Store,
  CheckCircle2,
  Users,
  ChevronRight,
  Sparkles,
} from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'
import type { BudgetItem, Transaction, ChecklistItem, Guest } from '../types/database'
import { formatIDR, formatDate, daysUntil } from '../lib/utils'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'

export const Route = createFileRoute('/')({ component: DashboardPage })

function DashboardPage() {
  const currentWorkspace = useAppStore((s) => s.currentWorkspace)

  // Fetch all related workspace data
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

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions', currentWorkspace?.id],
    enabled: Boolean(currentWorkspace?.id && isSupabaseConfigured),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('transactions')
        .select('*, vendor:vendors(*)')
        .eq('workspace_id', currentWorkspace!.id)
        .order('due_date', { ascending: true })
      if (error) throw error
      return (data as Transaction[]) || []
    },
  })

  const { data: checklistItems = [] } = useQuery({
    queryKey: ['checklist_items', currentWorkspace?.id],
    enabled: Boolean(currentWorkspace?.id && isSupabaseConfigured),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('checklist_items')
        .select('*')
        .eq('workspace_id', currentWorkspace!.id)
        .order('due_date', { ascending: true })
      if (error) throw error
      return (data as ChecklistItem[]) || []
    },
  })

  const { data: guests = [] } = useQuery({
    queryKey: ['guests', currentWorkspace?.id],
    enabled: Boolean(currentWorkspace?.id && isSupabaseConfigured),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guests')
        .select('*')
        .eq('workspace_id', currentWorkspace!.id)
      if (error) throw error
      return (data as Guest[]) || []
    },
  })

  // Financial Calculations
  const totalActual = budgetItems.reduce((acc, it) => acc + Number(it.actual_amount || 0), 0)
  const totalIncome = transactions
    .filter((t) => t.type === 'income_saving' && t.is_paid)
    .reduce((acc, t) => acc + Number(t.amount || 0), 0)
  const totalExpense = transactions
    .filter((t) => t.type === 'expense' && t.is_paid)
    .reduce((acc, t) => acc + Number(t.amount || 0), 0)
  const netCashflow = totalIncome - totalExpense

  // Deadlines
  const upcomingPayments = transactions.filter((t) => !t.is_paid && t.due_date).slice(0, 5)
  const pendingTasks = checklistItems
    .filter((c) => c.status !== 'completed' && c.status !== 'purchased')
    .slice(0, 5)

  // Countdowns
  const daysToWedding = daysUntil(currentWorkspace?.wedding_date)
  const daysToEngagement = daysUntil(currentWorkspace?.engagement_date)

  if (!currentWorkspace) {
    return (
      <div className="p-12 text-center bg-white rounded-2xl border border-gray-200">
        <Sparkles className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-gray-900">Selamat Datang di Rencanakan!</h2>
        <p className="text-sm text-gray-500 max-w-md mx-auto mt-2">
          Mulai dengan membuat Workspace pernikahan Anda untuk merencanakan anggaran, vendor, seserahan, dan daftar tamu bersama pasangan.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero Wedding Header */}
      <div className="relative overflow-hidden bg-linear-to-r from-rose-600 to-pink-600 rounded-2xl p-6 sm:p-8 text-white shadow-md">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/20 backdrop-blur-xs text-xs font-medium">
              <Sparkles className="w-3.5 h-3.5" /> Ruang Kerja Pernikahan
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight mt-3">
              {currentWorkspace.groom_name} & {currentWorkspace.bride_name}
            </h1>
            <p className="text-rose-100 text-xs sm:text-sm mt-1">
              {currentWorkspace.wedding_date
                ? `Hari Bahagia: ${formatDate(currentWorkspace.wedding_date)}`
                : 'Belum menentukan tanggal pernikahan'}
            </p>
          </div>

          {/* Countdowns */}
          <div className="flex items-center gap-3">
            {daysToWedding !== null && (
              <div className="bg-white/15 backdrop-blur-md border border-white/20 rounded-xl p-3 text-center min-w-[100px]">
                <div className="text-2xl sm:text-3xl font-black">{daysToWedding}</div>
                <div className="text-[11px] font-medium text-rose-100 uppercase tracking-wider">
                  Hari Menuju Resepsi
                </div>
              </div>
            )}
            {daysToEngagement !== null && (
              <div className="bg-white/15 backdrop-blur-md border border-white/20 rounded-xl p-3 text-center min-w-[100px]">
                <div className="text-2xl sm:text-3xl font-black">{daysToEngagement}</div>
                <div className="text-[11px] font-medium text-rose-100 uppercase tracking-wider">
                  Hari Menuju Lamaran
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Tabungan */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Tabungan Terkumpul
              </span>
              <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mt-2">{formatIDR(totalIncome)}</div>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Target: {formatIDR(currentWorkspace.savings_target)}</span>
                <span>
                  {currentWorkspace.savings_target > 0
                    ? `${Math.round((totalIncome / currentWorkspace.savings_target) * 100)}%`
                    : '0%'}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(
                      currentWorkspace.savings_target > 0
                        ? Math.round((totalIncome / currentWorkspace.savings_target) * 100)
                        : 0,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Budget Realization */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Realisasi Biaya
              </span>
              <div className="p-2 rounded-lg bg-rose-50 text-rose-600">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="text-2xl font-bold text-gray-900 mt-2">{formatIDR(totalActual)}</div>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs text-gray-500">
                <span>Plafon: {formatIDR(currentWorkspace.total_budget_target)}</span>
                <span>
                  {currentWorkspace.total_budget_target > 0
                    ? `${Math.round((totalActual / currentWorkspace.total_budget_target) * 100)}%`
                    : '0%'}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-rose-500 h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(
                      currentWorkspace.total_budget_target > 0
                        ? Math.round((totalActual / currentWorkspace.total_budget_target) * 100)
                        : 0,
                      100
                    )}%`,
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sisa Kas */}
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Sisa Kas Bersih
              </span>
              <div
                className={`p-2 rounded-lg ${
                  netCashflow >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div
              className={`text-2xl font-bold mt-2 ${
                netCashflow >= 0 ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              {formatIDR(netCashflow)}
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Total masuk Rp {totalIncome.toLocaleString('id-ID')} &middot; Total keluar Rp{' '}
              {totalExpense.toLocaleString('id-ID')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Two Column: Upcoming Payments & Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Termin Vendor Mendekati Jatuh Tempo */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Store className="w-4 h-4 text-rose-500" />
              Jadwal Pembayaran Vendor Terdekat
            </CardTitle>
            <Link to="/vendors" className="text-xs font-semibold text-rose-600 hover:text-rose-700">
              Lihat Vendor
            </Link>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-gray-100">
            {upcomingPayments.map((item) => (
              <div key={item.id} className="p-4 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-gray-900">{item.title}</div>
                  <div className="text-gray-500 mt-0.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>Jatuh Tempo: {formatDate(item.due_date)}</span>
                  </div>
                </div>
                <span className="font-bold text-gray-900">{formatIDR(Number(item.amount))}</span>
              </div>
            ))}
            {upcomingPayments.length === 0 && (
              <div className="p-6 text-center text-xs text-gray-500">
                Tidak ada termin pembayaran yang tertunda.
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tugas / Checklist Mendekati Deadline */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-rose-500" />
              Tugas & Dokumen Mendekati Deadline
            </CardTitle>
            <Link to="/checklist" className="text-xs font-semibold text-rose-600 hover:text-rose-700">
              Buka Checklist
            </Link>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-gray-100">
            {pendingTasks.map((task) => (
              <div key={task.id} className="p-4 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-gray-900">{task.title}</div>
                  <div className="text-gray-500 mt-0.5 capitalize">
                    Kategori: {task.type.replace('_', ' ')}
                  </div>
                </div>
                {task.due_date ? (
                  <Badge variant="warning">{formatDate(task.due_date)}</Badge>
                ) : (
                  <Badge variant="default">Belum ada tgl</Badge>
                )}
              </div>
            ))}
            {pendingTasks.length === 0 && (
              <div className="p-6 text-center text-xs text-gray-500">
                Semua checklist tugas telah selesai!
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Summary: Guests & Quick Links */}
      <Card className="bg-linear-to-r from-rose-50/70 to-pink-50/50 border-rose-100">
        <CardContent className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-white border border-rose-200 text-rose-600 flex items-center justify-center shrink-0 shadow-xs">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
                Statistik Tamu Undangan
              </div>
              <div className="text-lg font-bold text-gray-900 mt-0.5">
                {guests.length} Undangan Terdaftar &middot; Estimasi{' '}
                {guests.reduce((acc, g) => acc + Number(g.pax_count || 0), 0)} Pax Katering
              </div>
            </div>
          </div>
          <Link to="/guests">
            <Button size="sm" variant="outline" className="bg-white">
              Kelola Tamu & CSV <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
