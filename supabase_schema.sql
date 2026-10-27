-- ============================================================================
-- WEDDING PLANNER SAAS - FULL DATABASE SCHEMA & TRIGGERS
-- Run this in Supabase SQL Editor
-- ============================================================================

-- 1. EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. TABLES

-- Workspaces
CREATE TABLE IF NOT EXISTS public.workspaces (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bride_name VARCHAR(100) NOT NULL,
    groom_name VARCHAR(100) NOT NULL,
    engagement_date DATE,
    wedding_date DATE,
    total_budget_target DECIMAL(15, 2) DEFAULT 0,
    savings_target DECIMAL(15, 2) DEFAULT 0,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Workspace Members
CREATE TABLE IF NOT EXISTS public.workspace_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    role VARCHAR(20) CHECK (role IN ('owner', 'partner', 'family', 'wo')) DEFAULT 'partner',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
    UNIQUE(workspace_id, user_id)
);

-- Budget Items
CREATE TABLE IF NOT EXISTS public.budget_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    phase VARCHAR(30) CHECK (phase IN ('engagement', 'wedding', 'administration', 'seserahan')) NOT NULL,
    category_name VARCHAR(100) NOT NULL,
    estimated_amount DECIMAL(15, 2) DEFAULT 0,
    actual_amount DECIMAL(15, 2) DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Vendors
CREATE TABLE IF NOT EXISTS public.vendors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    budget_item_id UUID REFERENCES public.budget_items(id) ON DELETE SET NULL,
    vendor_name VARCHAR(150) NOT NULL,
    category VARCHAR(100),
    contact_person VARCHAR(100),
    phone VARCHAR(30),
    status VARCHAR(30) CHECK (status IN ('research', 'survey', 'booked', 'paid_off', 'cancelled')) DEFAULT 'research',
    total_contract_value DECIMAL(15, 2) DEFAULT 0,
    total_paid DECIMAL(15, 2) DEFAULT 0,
    contract_file_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Checklist Items (created before transactions for FK reference)
CREATE TABLE IF NOT EXISTS public.checklist_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    budget_item_id UUID REFERENCES public.budget_items(id) ON DELETE SET NULL,
    type VARCHAR(30) CHECK (type IN ('administration', 'seserahan', 'general_todo')) NOT NULL,
    title VARCHAR(150) NOT NULL,
    status VARCHAR(30) CHECK (status IN ('pending', 'in_progress', 'purchased', 'completed')) DEFAULT 'pending',
    due_date DATE,
    url_link TEXT,
    price DECIMAL(15, 2) DEFAULT 0,
    image_url TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Transactions / Cashflow
CREATE TABLE IF NOT EXISTS public.transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    budget_item_id UUID REFERENCES public.budget_items(id) ON DELETE SET NULL,
    vendor_id UUID REFERENCES public.vendors(id) ON DELETE SET NULL,
    checklist_item_id UUID REFERENCES public.checklist_items(id) ON DELETE SET NULL,
    type VARCHAR(20) CHECK (type IN ('income_saving', 'expense')) NOT NULL,
    title VARCHAR(150) NOT NULL,
    amount DECIMAL(15, 2) NOT NULL DEFAULT 0,
    transaction_date DATE DEFAULT CURRENT_DATE,
    due_date DATE,
    is_paid BOOLEAN DEFAULT TRUE,
    paid_by VARCHAR(20) CHECK (paid_by IN ('groom', 'bride', 'joint', 'parents')) DEFAULT 'joint',
    receipt_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Guests
CREATE TABLE IF NOT EXISTS public.guests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workspace_id UUID NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    side VARCHAR(20) CHECK (side IN ('groom', 'bride', 'groom_parents', 'bride_parents')) NOT NULL,
    group_category VARCHAR(50),
    phone VARCHAR(30),
    address TEXT,
    invitation_type VARCHAR(20) CHECK (invitation_type IN ('physical', 'digital', 'both')) DEFAULT 'digital',
    pax_count INT DEFAULT 2,
    rsvp_status VARCHAR(20) CHECK (rsvp_status IN ('pending', 'attending', 'declined')) DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- ============================================================================
-- 3. RLS HELPER FUNCTION
-- ============================================================================
CREATE OR REPLACE FUNCTION public.has_workspace_access(target_workspace_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM public.workspace_members 
        WHERE workspace_id = target_workspace_id 
          AND user_id = auth.uid()
    );
$$;

-- ============================================================================
-- 4. ENABLE RLS
-- ============================================================================
ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

-- Workspaces Policies
DROP POLICY IF EXISTS "Users can view their workspaces" ON public.workspaces;
CREATE POLICY "Users can view their workspaces" 
ON public.workspaces FOR SELECT 
USING (public.has_workspace_access(id) OR created_by = auth.uid());

DROP POLICY IF EXISTS "Authenticated users can create a workspace" ON public.workspaces;
CREATE POLICY "Authenticated users can create a workspace" 
ON public.workspaces FOR INSERT 
WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Workspace members can update workspace details" ON public.workspaces;
CREATE POLICY "Workspace members can update workspace details" 
ON public.workspaces FOR UPDATE 
USING (public.has_workspace_access(id));

-- Workspace Members Policies
DROP POLICY IF EXISTS "Members can view other members in the same workspace" ON public.workspace_members;
CREATE POLICY "Members can view other members in the same workspace" 
ON public.workspace_members FOR SELECT 
USING (public.has_workspace_access(workspace_id) OR user_id = auth.uid());

DROP POLICY IF EXISTS "Members can invite/add partner to workspace" ON public.workspace_members;
CREATE POLICY "Members can invite/add partner to workspace" 
ON public.workspace_members FOR INSERT 
WITH CHECK (public.has_workspace_access(workspace_id) OR user_id = auth.uid());

DROP POLICY IF EXISTS "Members can remove members in their workspace" ON public.workspace_members;
CREATE POLICY "Members can remove members in their workspace" 
ON public.workspace_members FOR DELETE 
USING (public.has_workspace_access(workspace_id));

-- Operational Tables Policies
DROP POLICY IF EXISTS "Full access for workspace members on budget_items" ON public.budget_items;
CREATE POLICY "Full access for workspace members on budget_items"
ON public.budget_items FOR ALL
USING (public.has_workspace_access(workspace_id))
WITH CHECK (public.has_workspace_access(workspace_id));

DROP POLICY IF EXISTS "Full access for workspace members on vendors" ON public.vendors;
CREATE POLICY "Full access for workspace members on vendors"
ON public.vendors FOR ALL
USING (public.has_workspace_access(workspace_id))
WITH CHECK (public.has_workspace_access(workspace_id));

DROP POLICY IF EXISTS "Full access for workspace members on checklist_items" ON public.checklist_items;
CREATE POLICY "Full access for workspace members on checklist_items"
ON public.checklist_items FOR ALL
USING (public.has_workspace_access(workspace_id))
WITH CHECK (public.has_workspace_access(workspace_id));

DROP POLICY IF EXISTS "Full access for workspace members on transactions" ON public.transactions;
CREATE POLICY "Full access for workspace members on transactions"
ON public.transactions FOR ALL
USING (public.has_workspace_access(workspace_id))
WITH CHECK (public.has_workspace_access(workspace_id));

DROP POLICY IF EXISTS "Full access for workspace members on guests" ON public.guests;
CREATE POLICY "Full access for workspace members on guests"
ON public.guests FOR ALL
USING (public.has_workspace_access(workspace_id))
WITH CHECK (public.has_workspace_access(workspace_id));

-- ============================================================================
-- 5. TRIGGERS
-- ============================================================================

-- Trigger 1: Auto add creator as workspace member owner
CREATE OR REPLACE FUNCTION public.handle_new_workspace()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NEW.created_by IS NOT NULL THEN
        INSERT INTO public.workspace_members (workspace_id, user_id, role)
        VALUES (NEW.id, NEW.created_by, 'owner')
        ON CONFLICT (workspace_id, user_id) DO NOTHING;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_after_workspace_created ON public.workspaces;
CREATE TRIGGER trg_after_workspace_created
AFTER INSERT ON public.workspaces
FOR EACH ROW EXECUTE FUNCTION public.handle_new_workspace();

-- Trigger 2: Sync transaction expense to budget_items actual_amount
CREATE OR REPLACE FUNCTION public.sync_budget_actual_amount()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Recalculate NEW budget_item
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') AND NEW.budget_item_id IS NOT NULL THEN
        UPDATE public.budget_items
        SET actual_amount = COALESCE((
            SELECT SUM(amount)
            FROM public.transactions
            WHERE budget_item_id = NEW.budget_item_id
              AND type = 'expense'
              AND is_paid = TRUE
        ), 0)
        WHERE id = NEW.budget_item_id;
    END IF;

    -- Recalculate OLD budget_item if item changed or deleted
    IF (TG_OP = 'UPDATE' OR TG_OP = 'DELETE') AND OLD.budget_item_id IS NOT NULL THEN
        IF (TG_OP = 'DELETE') OR (OLD.budget_item_id IS DISTINCT FROM NEW.budget_item_id) THEN
            UPDATE public.budget_items
            SET actual_amount = COALESCE((
                SELECT SUM(amount)
                FROM public.transactions
                WHERE budget_item_id = OLD.budget_item_id
                  AND type = 'expense'
                  AND is_paid = TRUE
            ), 0)
            WHERE id = OLD.budget_item_id;
        END IF;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_budget_actual ON public.transactions;
CREATE TRIGGER trg_sync_budget_actual
AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.sync_budget_actual_amount();

-- Trigger 3: Sync vendor payment and auto-status
CREATE OR REPLACE FUNCTION public.sync_vendor_payment_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_id UUID;
    v_total_paid DECIMAL(15, 2);
    v_contract_val DECIMAL(15, 2);
    v_current_status VARCHAR(30);
BEGIN
    v_id := COALESCE(NEW.vendor_id, OLD.vendor_id);

    IF v_id IS NOT NULL THEN
        SELECT COALESCE(SUM(amount), 0) INTO v_total_paid
        FROM public.transactions
        WHERE vendor_id = v_id
          AND type = 'expense'
          AND is_paid = TRUE;

        SELECT total_contract_value, status INTO v_contract_val, v_current_status
        FROM public.vendors
        WHERE id = v_id;

        UPDATE public.vendors
        SET 
            total_paid = v_total_paid,
            status = CASE 
                WHEN v_contract_val > 0 AND v_total_paid >= v_contract_val THEN 'paid_off'
                WHEN v_total_paid > 0 AND v_current_status IN ('research', 'survey') THEN 'booked'
                ELSE status
            END
        WHERE id = v_id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_vendor_payments ON public.transactions;
CREATE TRIGGER trg_sync_vendor_payments
AFTER INSERT OR UPDATE OR DELETE ON public.transactions
FOR EACH ROW EXECUTE FUNCTION public.sync_vendor_payment_status();

-- Trigger 4: Auto create/sync transaction when checklist item purchased/completed
CREATE OR REPLACE FUNCTION public.auto_sync_transaction_from_checklist()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF (TG_OP = 'UPDATE') THEN
        -- Case 1: Status changed to purchased/completed with price > 0
        IF (NEW.status IN ('purchased', 'completed')) AND (NEW.price > 0) THEN
            -- Check if transaction already exists for this checklist item
            IF EXISTS (SELECT 1 FROM public.transactions WHERE checklist_item_id = NEW.id) THEN
                UPDATE public.transactions
                SET amount = NEW.price,
                    title = '[' || UPPER(NEW.type) || '] ' || NEW.title,
                    budget_item_id = NEW.budget_item_id
                WHERE checklist_item_id = NEW.id;
            ELSE
                INSERT INTO public.transactions (
                    workspace_id,
                    budget_item_id,
                    checklist_item_id,
                    type,
                    title,
                    amount,
                    transaction_date,
                    is_paid
                ) VALUES (
                    NEW.workspace_id,
                    NEW.budget_item_id,
                    NEW.id,
                    'expense',
                    '[' || UPPER(NEW.type) || '] ' || NEW.title,
                    NEW.price,
                    CURRENT_DATE,
                    TRUE
                );
            END IF;
        -- Case 2: Status changed back to pending/in_progress from purchased/completed
        ELSIF (OLD.status IN ('purchased', 'completed')) AND (NEW.status NOT IN ('purchased', 'completed')) THEN
            DELETE FROM public.transactions WHERE checklist_item_id = NEW.id;
        END IF;
    ELSIF (TG_OP = 'DELETE') THEN
        DELETE FROM public.transactions WHERE checklist_item_id = OLD.id;
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_checklist_to_cashflow ON public.checklist_items;
CREATE TRIGGER trg_checklist_to_cashflow
AFTER UPDATE OR DELETE ON public.checklist_items
FOR EACH ROW EXECUTE FUNCTION public.auto_sync_transaction_from_checklist();

-- ============================================================================
-- 6. STORAGE BUCKET FOR ASSETS & RECEIPTS
-- ============================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('wedding-assets', 'wedding-assets', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public access to wedding-assets" ON storage.objects;
CREATE POLICY "Public access to wedding-assets"
ON storage.objects FOR SELECT
USING (bucket_id = 'wedding-assets');

DROP POLICY IF EXISTS "Authenticated users can upload to wedding-assets" ON storage.objects;
CREATE POLICY "Authenticated users can upload to wedding-assets"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'wedding-assets');

DROP POLICY IF EXISTS "Authenticated users can update their wedding-assets" ON storage.objects;
CREATE POLICY "Authenticated users can update their wedding-assets"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'wedding-assets');
