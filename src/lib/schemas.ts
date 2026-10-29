import { z } from 'zod'

export const authSchema = z.object({
  email: z
    .string()
    .min(1, 'Email wajib diisi')
    .email('Format email tidak valid (contoh: nama@email.com)'),
  password: z
    .string()
    .min(1, 'Kata sandi wajib diisi')
    .min(6, 'Kata sandi minimal 6 karakter'),
})
export type AuthFormValues = z.infer<typeof authSchema>

export const workspaceSchema = z.object({
  groom_name: z.string().min(1, 'Nama Calon Pengantin Pria (CPP) wajib diisi'),
  bride_name: z.string().min(1, 'Nama Calon Pengantin Wanita (CPW) wajib diisi'),
  wedding_date: z.string().optional().nullable(),
  total_budget_target: z.coerce.number().min(0).default(0),
  savings_target: z.coerce.number().min(0).default(0),
})
export type WorkspaceFormValues = z.infer<typeof workspaceSchema>

export const checklistItemSchema = z.object({
  title: z.string().min(1, 'Nama / Judul item wajib diisi'),
  type: z.enum(['administration', 'seserahan', 'general_todo']),
  price: z.coerce.number().min(0).default(0),
  due_date: z.string().optional().nullable(),
  url_link: z.string().optional().nullable(),
  budget_item_id: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})
export type ChecklistItemFormValues = z.infer<typeof checklistItemSchema>

export const vendorSchema = z.object({
  vendor_name: z.string().min(1, 'Nama vendor wajib diisi'),
  category: z.string().optional().nullable(),
  contact_person: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  status: z.enum(['research', 'survey', 'booked', 'paid_off', 'cancelled']).default('research'),
  total_contract_value: z.coerce.number().min(0).default(0),
  budget_item_id: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
})
export type VendorFormValues = z.infer<typeof vendorSchema>

export const terminSchema = z.object({
  title: z.string().min(1, 'Judul termin wajib diisi'),
  amount: z.coerce.number().positive('Nominal termin harus lebih dari 0'),
  due_date: z.string().optional().nullable(),
  is_paid: z.boolean().default(false),
})
export type TerminFormValues = z.infer<typeof terminSchema>

export const budgetItemSchema = z.object({
  phase: z.enum(['engagement', 'wedding', 'administration', 'seserahan']),
  category_name: z.string().min(1, 'Nama kategori pos wajib diisi'),
  estimated_amount: z.coerce.number().positive('Estimasi biaya harus lebih dari 0'),
  notes: z.string().optional().nullable(),
})
export type BudgetItemFormValues = z.infer<typeof budgetItemSchema>

export const transactionSchema = z.object({
  type: z.enum(['expense', 'income_saving']),
  title: z.string().min(1, 'Keterangan transaksi wajib diisi'),
  amount: z.coerce.number().positive('Nominal harus lebih dari 0'),
  budget_item_id: z.string().optional().nullable(),
  paid_by: z.enum(['groom', 'bride', 'joint', 'parents']).default('joint'),
  is_paid: z.boolean().default(true),
  transaction_date: z.string().min(1, 'Tanggal transaksi wajib diisi'),
})
export type TransactionFormValues = z.infer<typeof transactionSchema>

export const guestSchema = z.object({
  name: z.string().min(1, 'Nama tamu / keluarga wajib diisi'),
  side: z.enum(['groom', 'bride', 'groom_parents', 'bride_parents']),
  group_category: z.string().min(1, 'Kategori grup wajib dipilih'),
  phone: z.string().optional().nullable(),
  invitation_type: z.enum(['physical', 'digital', 'both']).default('digital'),
  pax_count: z.coerce.number().int().min(1, 'Jumlah pax minimal 1'),
  rsvp_status: z.enum(['pending', 'attending', 'declined']).default('pending'),
})
export type GuestFormValues = z.infer<typeof guestSchema>
