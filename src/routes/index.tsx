import * as React from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
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
  Calendar,
  CheckSquare,
  Circle,
  AlertCircle,
  Plus,
} from 'lucide-react'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'
import type { BudgetItem, Transaction, ChecklistItem, Guest, ChecklistStatus } from '../types/database'
import { formatIDR, formatDate, daysUntil } from '../lib/utils'
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { toast } from '../components/ui/Toast'

export const Route = createFileRoute('/')({ component: DashboardPage })

function DashboardPage() {
  const currentWorkspace = useAppStore((s) => s.currentWorkspace)
  const queryClient = useQueryClient()

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

  // Quick toggle task completed from dashboard
  const toggleTaskMutation = useMutation({
    mutationFn: async ({ id, isDone }: { id: string; isDone: boolean }) => {
      const nextStatus: ChecklistStatus = isDone ? 'pending' : 'completed'
      const { error } = await supabase
        .from('checklist_items')
        .update({ status: nextStatus })
        .eq('id', id)
      if (error) throw error
      return nextStatus
    },
    onSuccess: (status) => {
      queryClient.invalidateQueries({ queryKey: ['checklist_items', currentWorkspace?.id] })
      if (status === 'completed') {
        toast.success('Tugas ditandai selesai!')
      } else {
        toast.info('Tugas dibuka kembali')
      }
    },
    onError: (err: Error) => {
      toast.error('Gagal memperbarui status', err.message)
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

  // Deadlines & Tasks
  const upcomingPayments = transactions.filter((t) => !t.is_paid && t.due_date).slice(0, 4)

  const tasksWithDeadline = checklistItems
    .filter((c) => c.status !== 'completed' && c.status !== 'purchased' && Boolean(c.due_date))
    .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())

  const tasksWithoutDeadline = checklistItems.filter(
    (c) => c.status !== 'completed' && c.status !== 'purchased' && !c.due_date
  )

  const displayTasks = [...tasksWithDeadline, ...tasksWithoutDeadline].slice(0, 4)

  // Overall readiness
  const totalTasks = checklistItems.length
  const completedTasks = checklistItems.filter(
    (c) => c.status === 'completed' || c.status === 'purchased'
  ).length
  const taskProgressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

  // Guest calculations
  const totalPax = guests.reduce((acc, g) => acc + Number(g.pax_count || 0), 0)
  const attendingPax = guests
    .filter((g) => g.rsvp_status === 'attending')
    .reduce((acc, g) => acc + Number(g.pax_count || 1), 0)
  const pendingRsvpCount = guests.filter((g) => g.rsvp_status === 'pending').length

  // Countdowns
  const daysToWedding = daysUntil(currentWorkspace?.wedding_date)
  const daysToEngagement = daysUntil(currentWorkspace?.engagement_date)

  const getDueBadge = (dueDateStr: string | null) => {
    if (!dueDateStr) {
      return (
        <Badge variant="default" className="text-[10px] py-0.5">
          Belum ada tgl
        </Badge>
      )
    }
    const days = daysUntil(dueDateStr)
    if (days === null) {
      return (
        <Badge variant="default" className="text-[10px] py-0.5">
          {formatDate(dueDateStr)}
        </Badge>
      )
    }
    if (days < 0) {
      return (
        <Badge variant="danger" className="text-[10px] py-0.5 font-semibold">
          Lewat {Math.abs(days)} hari
        </Badge>
      )
    }
    if (days === 0) {
      return (
        <Badge variant="warning" className="text-[10px] py-0.5 font-semibold">
          Hari ini!
        </Badge>
      )
    }
    if (days <= 7) {
      return (
        <Badge variant="warning" className="text-[10px] py-0.5">
          {days} hari lagi
        </Badge>
      )
    }
    return (
      <Badge variant="default" className="text-[10px] py-0.5">
        {formatDate(dueDateStr)}
      </Badge>
    )
  }

  if (!currentWorkspace) {
    return (
      <div className="p-8 sm:p-12 text-center bg-white rounded-2xl border border-gray-200">
        <Sparkles className="w-12 h-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-gray-900">Selamat Datang di Rencanakan!</h2>
        <p className="text-sm text-gray-500 max-w-md mx-auto mt-2">
          Mulai dengan membuat Workspace pernikahan Anda untuk merencanakan anggaran, vendor, seserahan, dan daftar tamu bersama pasangan.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4 sm:space-y-6 pb-6 animate-fade-in">
      {/* Hero Wedding Header - Mobile Optimized */}
      <div className="relative overflow-hidden bg-linear-to-br from-rose-600 via-rose-500 to-pink-500 rounded-2xl p-4 sm:p-6 text-white shadow-md">
        <div className="absolute -right-12 -bottom-12 w-44 h-44 rounded-full bg-white/10 blur-2xl pointer-events-none" />
        <div className="absolute -left-12 -top-12 w-44 h-44 rounded-full bg-rose-400/20 blur-2xl pointer-events-none" />

        {/* Top Tag & Secondary Event Countdown */}
        <div className="relative z-10 flex items-center justify-between gap-2 mb-2">
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-[11px] font-medium tracking-wide">
            <Sparkles className="w-3 h-3 text-rose-200" /> Ruang Kerja Pernikahan
          </span>
          {daysToEngagement !== null && (
            <span className="text-[11px] font-medium bg-black/15 px-2 py-0.5 rounded-full text-rose-100">
              Lamaran: {daysToEngagement} Hari
            </span>
          )}
        </div>

        {/* Main Info: Groom & Bride on Left, Countdown Card on Right */}
        <div className="relative z-10 flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight leading-tight truncate">
              {currentWorkspace.groom_name} & {currentWorkspace.bride_name}
            </h1>
            <p className="text-rose-100 text-xs sm:text-sm mt-1 flex items-center gap-1.5 truncate">
              <Calendar className="w-3.5 h-3.5 shrink-0 opacity-80" />
              <span>
                {currentWorkspace.wedding_date
                  ? `Hari Bahagia: ${formatDate(currentWorkspace.wedding_date)}`
                  : 'Belum menentukan tanggal'}
              </span>
            </p>
          </div>

          {/* Countdowns */}
          {daysToWedding !== null && (
            <div className="bg-white/15 backdrop-blur-md border border-white/25 rounded-xl px-3 py-2 sm:px-4 sm:py-2.5 text-center min-w-[76px] sm:min-w-[90px] shadow-xs shrink-0">
              <div className="text-2xl sm:text-3xl font-black leading-none">{daysToWedding}</div>
              <div className="text-[9px] sm:text-[10px] font-semibold text-rose-100 uppercase tracking-wider mt-1">
                Hari Lagi
              </div>
            </div>
          )}
        </div>

        {/* Preparation Readiness Progress Bar */}
        <div className="relative z-10 mt-3.5 pt-3 border-t border-white/20 flex items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-rose-100 min-w-0 truncate text-[11px] sm:text-xs">
            <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-white" />
            <span className="truncate">
              Checklist: <strong className="text-white">{completedTasks}/{totalTasks}</strong> Selesai ({taskProgressPercent}%)
            </span>
          </div>
          <div className="w-24 sm:w-36 bg-black/20 rounded-full h-1.5 overflow-hidden shrink-0">
            <div
              className="bg-white h-full rounded-full transition-all duration-300"
              style={{ width: `${taskProgressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Quick Action Shortcuts - Thumb Friendly */}
      <div className="grid grid-cols-4 gap-2">
        <Link
          to="/finance"
          className="flex flex-col items-center justify-center p-2.5 bg-white border border-rose-100 rounded-xl shadow-xs hover:border-rose-300 hover:shadow-sm active:scale-95 transition-all text-center group"
        >
          <div className="w-9 h-9 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center group-hover:bg-rose-100 transition-colors">
            <Wallet className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-semibold text-gray-700 mt-1 group-hover:text-rose-600">
            + Biaya
          </span>
        </Link>
        <Link
          to="/vendors"
          className="flex flex-col items-center justify-center p-2.5 bg-white border border-rose-100 rounded-xl shadow-xs hover:border-rose-300 hover:shadow-sm active:scale-95 transition-all text-center group"
        >
          <div className="w-9 h-9 rounded-lg bg-pink-50 text-pink-600 flex items-center justify-center group-hover:bg-pink-100 transition-colors">
            <Store className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-semibold text-gray-700 mt-1 group-hover:text-pink-600">
            + Vendor
          </span>
        </Link>
        <Link
          to="/checklist"
          className="flex flex-col items-center justify-center p-2.5 bg-white border border-rose-100 rounded-xl shadow-xs hover:border-rose-300 hover:shadow-sm active:scale-95 transition-all text-center group"
        >
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center group-hover:bg-amber-100 transition-colors">
            <CheckSquare className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-semibold text-gray-700 mt-1 group-hover:text-amber-600">
            + Tugas
          </span>
        </Link>
        <Link
          to="/guests"
          className="flex flex-col items-center justify-center p-2.5 bg-white border border-rose-100 rounded-xl shadow-xs hover:border-rose-300 hover:shadow-sm active:scale-95 transition-all text-center group"
        >
          <div className="w-9 h-9 rounded-lg bg-sky-50 text-sky-600 flex items-center justify-center group-hover:bg-sky-100 transition-colors">
            <Users className="w-4 h-4" />
          </div>
          <span className="text-[11px] font-semibold text-gray-700 mt-1 group-hover:text-sky-600">
            + Tamu
          </span>
        </Link>
      </div>

      {/* Financial Overview Cards - Compact */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Tabungan */}
        <Card className="border-gray-200/90 shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Tabungan Terkumpul
              </span>
              <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600">
                <Wallet className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
              {formatIDR(totalIncome)}
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs text-gray-500">
                <span className="truncate">Target: {formatIDR(currentWorkspace.savings_target)}</span>
                <span className="font-semibold text-emerald-600">
                  {currentWorkspace.savings_target > 0
                    ? `${Math.round((totalIncome / currentWorkspace.savings_target) * 100)}%`
                    : '0%'}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-300"
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
        <Card className="border-gray-200/90 shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Realisasi Biaya
              </span>
              <div className="p-1.5 rounded-lg bg-rose-50 text-rose-600">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-gray-900 mt-1">
              {formatIDR(totalActual)}
            </div>
            <div className="mt-2 space-y-1">
              <div className="flex justify-between text-xs text-gray-500">
                <span className="truncate">Plafon: {formatIDR(currentWorkspace.total_budget_target)}</span>
                <span className="font-semibold text-rose-600">
                  {currentWorkspace.total_budget_target > 0
                    ? `${Math.round((totalActual / currentWorkspace.total_budget_target) * 100)}%`
                    : '0%'}
                </span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-rose-500 h-full rounded-full transition-all duration-300"
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
        <Card className="border-gray-200/90 shadow-xs">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Sisa Kas Bersih
              </span>
              <div
                className={`p-1.5 rounded-lg ${
                  netCashflow >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'
                }`}
              >
                <ArrowUpRight className="w-4 h-4" />
              </div>
            </div>
            <div
              className={`text-xl sm:text-2xl font-bold mt-1 ${
                netCashflow >= 0 ? 'text-emerald-600' : 'text-red-600'
              }`}
            >
              {formatIDR(netCashflow)}
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-gray-500 truncate">
              <span>Masuk: {formatIDR(totalIncome)}</span>
              <span>Keluar: {formatIDR(totalExpense)}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Two Column: Upcoming Payments & Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Termin Vendor Mendekati Jatuh Tempo */}
        <Card>
          <CardHeader className="py-3 px-4">
            <CardTitle className="text-xs sm:text-sm font-semibold flex items-center gap-1.5">
              <Store className="w-4 h-4 text-rose-500" />
              Jadwal Pembayaran Vendor
            </CardTitle>
            <Link to="/vendors" className="text-xs font-semibold text-rose-600 hover:text-rose-700">
              Lihat Vendor
            </Link>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-gray-100">
            {upcomingPayments.map((item) => (
              <div key={item.id} className="p-3.5 sm:p-4 flex items-center justify-between text-xs gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-gray-900 truncate">{item.title}</div>
                  <div className="text-gray-500 mt-0.5 flex items-center gap-1.5 text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>{item.vendor?.vendor_name ? `${item.vendor.vendor_name} · ` : ''}</span>
                    <span>{getDueBadge(item.due_date)}</span>
                  </div>
                </div>
                <span className="font-bold text-gray-900 shrink-0">
                  {formatIDR(Number(item.amount))}
                </span>
              </div>
            ))}
            {upcomingPayments.length === 0 && (
              <div className="p-6 text-center text-xs">
                <Store className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <p className="text-gray-500">Tidak ada termin pembayaran yang tertunda.</p>
                <Link to="/vendors" className="inline-block mt-2">
                  <Button size="sm" variant="outline" className="text-xs h-8">
                    + Tambah Pembayaran Vendor
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tugas / Checklist Mendekati Deadline with Direct Toggle */}
        <Card>
          <CardHeader className="py-3 px-4">
            <div className="flex items-center gap-2">
              <CardTitle className="text-xs sm:text-sm font-semibold flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-rose-500" />
                Checklist & Prioritas Tugas
              </CardTitle>
              {tasksWithDeadline.length > 0 && (
                <span className="text-[10px] bg-rose-50 text-rose-600 px-1.5 py-0.5 rounded-full font-bold">
                  {tasksWithDeadline.length} Butuh Jadwal
                </span>
              )}
            </div>
            <Link to="/checklist" className="text-xs font-semibold text-rose-600 hover:text-rose-700">
              Buka Checklist
            </Link>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-gray-100">
            {displayTasks.map((task) => {
              const isCompleted = task.status === 'completed' || task.status === 'purchased'
              return (
                <div
                  key={task.id}
                  className="p-3 sm:p-4 flex items-center justify-between text-xs gap-3 transition-colors hover:bg-slate-50/50"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <button
                      type="button"
                      onClick={() =>
                        toggleTaskMutation.mutate({
                          id: task.id,
                          isDone: isCompleted,
                        })
                      }
                      disabled={toggleTaskMutation.isPending}
                      className="shrink-0 text-gray-400 hover:text-rose-600 transition-colors cursor-pointer p-0.5"
                      title={isCompleted ? 'Batalkan Selesai' : 'Tandai Selesai'}
                    >
                      {isCompleted ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-500 fill-emerald-50" />
                      ) : (
                        <Circle className="w-5 h-5" />
                      )}
                    </button>
                    <div className="min-w-0">
                      <div
                        className={`font-semibold text-gray-900 truncate ${
                          isCompleted ? 'line-through text-gray-400' : ''
                        }`}
                      >
                        {task.title}
                      </div>
                      <div className="text-gray-400 text-[11px] capitalize mt-0.5">
                        Kategori: {task.type.replace('_', ' ')}
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0">{getDueBadge(task.due_date)}</div>
                </div>
              )
            })}
            {displayTasks.length === 0 && (
              <div className="p-6 text-center text-xs">
                <CheckCircle2 className="w-8 h-8 text-emerald-300 mx-auto mb-2" />
                <p className="text-gray-500">Semua checklist tugas telah selesai!</p>
                <Link to="/checklist" className="inline-block mt-2">
                  <Button size="sm" variant="outline" className="text-xs h-8">
                    + Buat Checklist Baru
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Summary: Guests & Quick Links */}
      <Card className="bg-linear-to-r from-rose-50/60 via-pink-50/40 to-white border-rose-100">
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white border border-rose-200 text-rose-600 flex items-center justify-center shrink-0 shadow-xs">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-rose-700 uppercase tracking-wider">
                Statistik Tamu Undangan
              </div>
              <div className="text-base sm:text-lg font-bold text-gray-900 mt-0.5">
                {guests.length} Undangan &middot; {totalPax} Pax Katering
              </div>
              <div className="text-xs text-gray-500 mt-0.5">
                {attendingPax} Pax Terkonfirmasi Hadir &middot; {pendingRsvpCount} Belum Respon
              </div>
            </div>
          </div>
          <Link to="/guests" className="self-end sm:self-auto">
            <Button size="sm" variant="outline" className="bg-white text-xs h-9">
              Kelola Tamu & CSV <ChevronRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    </div>
  )
}
