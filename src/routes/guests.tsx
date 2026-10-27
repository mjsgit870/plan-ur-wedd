import * as React from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Download, Upload, Trash2, Phone, Search, Users } from 'lucide-react'
import Papa from 'papaparse'
import { supabase, isSupabaseConfigured } from '../lib/supabase'
import { useAppStore } from '../store/useAppStore'
import type { Guest, GuestSide, InvitationType, RsvpStatus } from '../types/database'
import { Card, CardContent } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { Modal } from '../components/ui/Modal'
import { Input } from '../components/ui/Input'
import { Select } from '../components/ui/Select'
import { toast } from '../components/ui/Toast'
import { TableRowSkeleton } from '../components/ui/Skeleton'
import { EmptyState } from '../components/ui/EmptyState'

export const Route = createFileRoute('/guests')({ component: GuestsPage })

function GuestsPage() {
  const currentWorkspace = useAppStore((s) => s.currentWorkspace)
  const queryClient = useQueryClient()

  const [search, setSearch] = React.useState('')
  const [sideFilter, setSideFilter] = React.useState<string>('all')
  const [rsvpFilter, setRsvpFilter] = React.useState<string>('all')
  const [isAddModalOpen, setIsAddModalOpen] = React.useState(false)

  // Form State
  const [name, setName] = React.useState('')
  const [side, setSide] = React.useState<GuestSide>('groom')
  const [groupCategory, setGroupCategory] = React.useState('Keluarga')
  const [phone, setPhone] = React.useState('')
  const [invitationType, setInvitationType] = React.useState<InvitationType>('digital')
  const [paxCount, setPaxCount] = React.useState('2')
  const [rsvpStatus, setRsvpStatus] = React.useState<RsvpStatus>('pending')

  const fileInputRef = React.useRef<HTMLInputElement>(null)

  // Fetch Guests
  const { data: guests = [], isLoading } = useQuery({
    queryKey: ['guests', currentWorkspace?.id],
    enabled: Boolean(currentWorkspace?.id && isSupabaseConfigured),
    queryFn: async () => {
      const { data, error } = await supabase
        .from('guests')
        .select('*')
        .eq('workspace_id', currentWorkspace!.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      return (data as Guest[]) || []
    },
  })

  // Mutations
  const addGuestMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('guests').insert({
        workspace_id: currentWorkspace!.id,
        name,
        side,
        group_category: groupCategory,
        phone: phone || null,
        invitation_type: invitationType,
        pax_count: Number(paxCount) || 2,
        rsvp_status: rsvpStatus,
      })
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests'] })
      setIsAddModalOpen(false)
      setName('')
      setPhone('')
      setPaxCount('2')
      toast.success('Tamu Berhasil Ditambahkan')
    },
    onError: (err: Error) => {
      toast.error('Gagal Menambah Tamu', err.message)
    },
  })

  const deleteGuestMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('guests').delete().eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests'] })
      toast.info('Tamu Berhasil Dihapus')
    },
    onError: (err: Error) => {
      toast.error('Gagal Menghapus Tamu', err.message)
    },
  })

  const updateRsvpMutation = useMutation({
    mutationFn: async ({ id, newStatus }: { id: string; newStatus: RsvpStatus }) => {
      const { error } = await supabase.from('guests').update({ rsvp_status: newStatus }).eq('id', id)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['guests'] })
      toast.info('Status RSVP Diperbarui')
    },
    onError: (err: Error) => {
      toast.error('Gagal Memperbarui RSVP', err.message)
    },
  })

  // CSV Export
  const handleExportCSV = () => {
    if (guests.length === 0) {
      toast.info('Belum Ada Data Tamu untuk Diekspor')
      return
    }
    const csvData = guests.map((g) => ({
      Nama: g.name,
      Pihak: g.side,
      Kategori: g.group_category,
      Telepon: g.phone || '',
      'Tipe Undangan': g.invitation_type,
      Pax: g.pax_count,
      RSVP: g.rsvp_status,
    }))
    const csv = Papa.unparse(csvData)
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `Daftar_Tamu_${currentWorkspace?.groom_name}_${currentWorkspace?.bride_name}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('File CSV Berhasil Diunduh')
  }

  // CSV Import
  const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !currentWorkspace) return

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        const rows = results.data as Array<Record<string, string>>
        const newRecords = rows
          .filter((r) => r.Nama || r.name)
          .map((r) => ({
            workspace_id: currentWorkspace.id,
            name: r.Nama || r.name || 'Tamu',
            side: (r.Pihak || r.side || 'groom') as GuestSide,
            group_category: r.Kategori || r.group_category || 'Teman',
            phone: r.Telepon || r.phone || null,
            invitation_type: (r['Tipe Undangan'] || r.invitation_type || 'digital') as InvitationType,
            pax_count: Number(r.Pax || r.pax_count) || 2,
            rsvp_status: (r.RSVP || r.rsvp_status || 'pending') as RsvpStatus,
          }))

        if (newRecords.length > 0) {
          const { error } = await supabase.from('guests').insert(newRecords)
          if (!error) {
            queryClient.invalidateQueries({ queryKey: ['guests'] })
            toast.success('Import CSV Berhasil', `${newRecords.length} tamu berhasil ditambahkan.`)
          } else {
            toast.error('Gagal Import CSV', error.message)
          }
        }
      },
    })
  }

  // Metrics
  const totalGuests = guests.length
  const totalPax = guests.reduce((acc, g) => acc + Number(g.pax_count || 0), 0)
  const attendingPax = guests
    .filter((g) => g.rsvp_status === 'attending')
    .reduce((acc, g) => acc + Number(g.pax_count || 0), 0)

  // Filtered List
  const filteredGuests = guests.filter((g) => {
    const matchesSearch = g.name.toLowerCase().includes(search.toLowerCase())
    const matchesSide = sideFilter === 'all' || g.side === sideFilter
    const matchesRsvp = rsvpFilter === 'all' || g.rsvp_status === rsvpFilter
    return matchesSearch && matchesSide && matchesRsvp
  })

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
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Manajemen Tamu</h1>
          <p className="text-xs sm:text-sm text-gray-500">
            Daftar undangan CPP & CPW, kalkulasi kuota pax katering, dan tracking RSVP.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportCSV}
            accept=".csv"
            className="hidden"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            title="Import CSV"
          >
            <Upload className="w-4 h-4 mr-1" /> Import CSV
          </Button>
          <Button size="sm" variant="outline" onClick={handleExportCSV} title="Export CSV">
            <Download className="w-4 h-4 mr-1" /> Export CSV
          </Button>
          <Button size="sm" onClick={() => setIsAddModalOpen(true)}>
            <Plus className="w-4 h-4 mr-1" /> Tambah Tamu
          </Button>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <span className="text-xs font-medium text-gray-500">Total Undangan</span>
            <div className="text-xl font-bold text-gray-900 mt-1">{totalGuests} Undangan</div>
            <div className="text-xs text-gray-500 mt-1">
              CPP: {guests.filter((g) => g.side === 'groom').length} | CPW:{' '}
              {guests.filter((g) => g.side === 'bride').length}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <span className="text-xs font-medium text-gray-500">Estimasi Pax Katering</span>
            <div className="text-xl font-bold text-rose-600 mt-1">{totalPax} Pax</div>
            <div className="text-xs text-gray-500 mt-1">Konfirmasi Hadir: {attendingPax} Pax</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <span className="text-xs font-medium text-gray-500">Status RSVP</span>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="success">
                {guests.filter((g) => g.rsvp_status === 'attending').length} Hadir
              </Badge>
              <Badge variant="warning">
                {guests.filter((g) => g.rsvp_status === 'pending').length} Menunggu
              </Badge>
              <Badge variant="danger">
                {guests.filter((g) => g.rsvp_status === 'declined').length} Tidak
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Cari nama tamu..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm bg-white border border-gray-300 rounded-lg shadow-xs focus:outline-none focus:ring-2 focus:ring-rose-500"
          />
        </div>

        <div className="w-full sm:w-44 shrink-0">
          <Select
            value={sideFilter}
            onChange={(e) => setSideFilter(e.target.value)}
            options={[
              { label: 'Semua Pihak', value: 'all' },
              { label: 'CPP (Pria)', value: 'groom' },
              { label: 'CPW (Wanita)', value: 'bride' },
              { label: 'Ortu CPP', value: 'groom_parents' },
              { label: 'Ortu CPW', value: 'bride_parents' },
            ]}
          />
        </div>

        <div className="w-full sm:w-40 shrink-0">
          <Select
            value={rsvpFilter}
            onChange={(e) => setRsvpFilter(e.target.value)}
            options={[
              { label: 'Semua RSVP', value: 'all' },
              { label: 'Hadir', value: 'attending' },
              { label: 'Menunggu', value: 'pending' },
              { label: 'Tidak Hadir', value: 'declined' },
            ]}
          />
        </div>
      </div>

      {/* Guest Table */}
      <Card className="animate-fade-in">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 border-b border-gray-200 text-xs">
              <tr>
                <th className="px-4 py-3 font-semibold">Nama Tamu</th>
                <th className="px-4 py-3 font-semibold">Pihak</th>
                <th className="px-4 py-3 font-semibold">Kategori</th>
                <th className="px-4 py-3 font-semibold">Tipe</th>
                <th className="px-4 py-3 font-semibold text-center">Pax</th>
                <th className="px-4 py-3 font-semibold">RSVP</th>
                <th className="px-4 py-3 font-semibold text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <>
                  <TableRowSkeleton cols={7} />
                  <TableRowSkeleton cols={7} />
                  <TableRowSkeleton cols={7} />
                  <TableRowSkeleton cols={7} />
                </>
              ) : (
                filteredGuests.map((g) => (
                  <tr key={g.id} className="hover:bg-gray-50/50">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        <span>{g.name}</span>
                        {g.phone && (
                          <a
                            href={`https://wa.me/${g.phone.replace(/[^0-9]/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-600 hover:text-emerald-700"
                            title="Kirim Undangan WA"
                          >
                            <Phone className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs uppercase font-medium text-gray-600">
                      {g.side.replace('_', ' ')}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">
                      <Badge variant="purple">{g.group_category || '-'}</Badge>
                    </td>
                    <td className="px-4 py-3 text-xs capitalize text-gray-600">
                      {g.invitation_type}
                    </td>
                    <td className="px-4 py-3 text-center font-bold text-gray-800">{g.pax_count}</td>
                    <td className="px-4 py-2 w-36">
                      <Select
                        value={g.rsvp_status}
                        onChange={(e) =>
                          updateRsvpMutation.mutate({
                            id: g.id,
                            newStatus: e.target.value as RsvpStatus,
                          })
                        }
                        options={[
                          { label: 'Menunggu', value: 'pending' },
                          { label: 'Hadir', value: 'attending' },
                          { label: 'Tidak Hadir', value: 'declined' },
                        ]}
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => deleteGuestMutation.mutate(g.id)}
                        className="text-gray-400 hover:text-red-600 p-1 rounded-md transition-colors cursor-pointer"
                        title="Hapus Tamu"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {filteredGuests.length === 0 && !isLoading && (
          <div className="p-4">
            <EmptyState
              icon={Users}
              title="Daftar Tamu Masih Kosong"
              description="Tambahkan tamu undangan CPP & CPW atau impor sekaligus menggunakan template file CSV."
              actionLabel="Tambah Tamu Pertama"
              onAction={() => setIsAddModalOpen(true)}
            />
          </div>
        )}
      </Card>

      {/* Modal Add Guest */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Tambah Tamu Undangan"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault()
            addGuestMutation.mutate()
          }}
          className="space-y-4"
        >
          <Input
            label="Nama Tamu / Keluarga"
            placeholder="Contoh: Bpk. Bambang & Keluarga"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Pihak Pengundang"
              value={side}
              onChange={(e) => setSide(e.target.value as GuestSide)}
              options={[
                { label: 'CPP (Pria)', value: 'groom' },
                { label: 'CPW (Wanita)', value: 'bride' },
                { label: 'Orang Tua CPP', value: 'groom_parents' },
                { label: 'Orang Tua CPW', value: 'bride_parents' },
              ]}
            />
            <Select
              label="Kategori Grup"
              value={groupCategory}
              onChange={(e) => setGroupCategory(e.target.value)}
              options={[
                { label: 'Keluarga Inti', value: 'Keluarga Inti' },
                { label: 'Keluarga Besar', value: 'Keluarga Besar' },
                { label: 'VIP', value: 'VIP' },
                { label: 'Teman Kantor', value: 'Teman Kantor' },
                { label: 'Teman Kuliah / Sekolah', value: 'Teman Kuliah' },
                { label: 'Tetangga', value: 'Tetangga' },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Nomor WhatsApp"
              placeholder="08123456789"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <Input
              label="Jumlah Pax (Orang)"
              type="number"
              value={paxCount}
              onChange={(e) => setPaxCount(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Tipe Undangan"
              value={invitationType}
              onChange={(e) => setInvitationType(e.target.value as InvitationType)}
              options={[
                { label: 'Digital Web / WA', value: 'digital' },
                { label: 'Fisik (Cetak)', value: 'physical' },
                { label: 'Keduanya', value: 'both' },
              ]}
            />
            <Select
              label="Status RSVP"
              value={rsvpStatus}
              onChange={(e) => setRsvpStatus(e.target.value as RsvpStatus)}
              options={[
                { label: 'Menunggu', value: 'pending' },
                { label: 'Hadir', value: 'attending' },
                { label: 'Tidak Hadir', value: 'declined' },
              ]}
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Batal
            </Button>
            <Button type="submit" loading={addGuestMutation.isPending}>
              Simpan Tamu
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  )
}
