export type WorkspaceRole = 'owner' | 'partner' | 'family' | 'wo'

export interface Workspace {
  id: string
  bride_name: string
  groom_name: string
  engagement_date: string | null
  wedding_date: string | null
  total_budget_target: number
  savings_target: number
  created_by: string | null
  created_at: string
}

export interface WorkspaceMember {
  id: string
  workspace_id: string
  user_id: string
  role: WorkspaceRole
  created_at: string
  user_email?: string
}

export type BudgetPhase = 'engagement' | 'wedding' | 'administration' | 'seserahan'

export interface BudgetItem {
  id: string
  workspace_id: string
  phase: BudgetPhase
  category_name: string
  estimated_amount: number
  actual_amount: number
  notes: string | null
  created_at: string
}

export type VendorStatus = 'research' | 'survey' | 'booked' | 'paid_off' | 'cancelled'

export interface Vendor {
  id: string
  workspace_id: string
  budget_item_id: string | null
  vendor_name: string
  category: string | null
  contact_person: string | null
  phone: string | null
  status: VendorStatus
  total_contract_value: number
  total_paid: number
  contract_file_url: string | null
  notes: string | null
  created_at: string
  budget_item?: BudgetItem
}

export type TransactionType = 'income_saving' | 'expense'
export type PaidBy = 'groom' | 'bride' | 'joint' | 'parents'

export interface Transaction {
  id: string
  workspace_id: string
  budget_item_id: string | null
  vendor_id: string | null
  checklist_item_id: string | null
  type: TransactionType
  title: string
  amount: number
  transaction_date: string
  due_date: string | null
  is_paid: boolean
  paid_by: PaidBy
  receipt_url: string | null
  created_at: string
  budget_item?: BudgetItem
  vendor?: Vendor
}

export type ChecklistType = 'administration' | 'seserahan' | 'general_todo'
export type ChecklistStatus = 'pending' | 'in_progress' | 'purchased' | 'completed'

export interface ChecklistItem {
  id: string
  workspace_id: string
  budget_item_id: string | null
  type: ChecklistType
  title: string
  status: ChecklistStatus
  due_date: string | null
  url_link: string | null
  price: number
  image_url: string | null
  notes: string | null
  created_at: string
  budget_item?: BudgetItem
}

export type GuestSide = 'groom' | 'bride' | 'groom_parents' | 'bride_parents'
export type InvitationType = 'physical' | 'digital' | 'both'
export type RsvpStatus = 'pending' | 'attending' | 'declined'

export interface Guest {
  id: string
  workspace_id: string
  name: string
  side: GuestSide
  group_category: string | null
  phone: string | null
  address: string | null
  invitation_type: InvitationType
  pax_count: number
  rsvp_status: RsvpStatus
  created_at: string
}
