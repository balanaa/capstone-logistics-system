-- Shipment Remarks: DDL, RLS Policies, and Action Logging
-- Safe to run multiple times
create extension if not exists pgcrypto;
-- 1) Table
create table if not exists public.shipment_remarks (
    id uuid primary key default gen_random_uuid(),
    pro_number text not null references public.pro(pro_number) on delete cascade,
    remark_date date not null,
    notes text not null,
    created_by uuid not null references auth.users(id),
    created_at timestamp default now(),
    updated_by uuid references auth.users(id),
    updated_at timestamp
);
-- Helpful index for listing/sorting by shipment & time
create index if not exists idx_shipment_remarks_pro_created on public.shipment_remarks (pro_number, created_at);
-- 2) RLS enable
alter table public.shipment_remarks enable row level security;
-- Helpers: predicates for roles/permissions
-- Admin or Verifier role bypasses granular flags
create or replace function public.is_admin_or_verifier(uid uuid) returns boolean language sql stable as $$
select exists (
        select 1
        from public.profiles pr
        where pr.id = uid
            and (
                'admin' = any(pr.roles)
                or 'verifier' = any(pr.roles)
            )
    );
$$;
create or replace function public.has_shipment_perm(uid uuid, action text) returns boolean language sql stable as $$
select case
        action
        when 'view' then coalesce(
            (
                select p.shipment_can_view
                from public.permissions p
                where p.user_id = uid
            ),
            false
        )
        when 'write' then coalesce(
            (
                select p.shipment_can_write
                from public.permissions p
                where p.user_id = uid
            ),
            false
        )
        when 'delete' then coalesce(
            (
                select p.shipment_can_delete
                from public.permissions p
                where p.user_id = uid
            ),
            false
        )
        else false
    end;
$$;
-- SELECT: viewers with shipment view OR admin/verifier
drop policy if exists shipment_remarks_select on public.shipment_remarks;
create policy shipment_remarks_select on public.shipment_remarks for
select using (
        public.is_admin_or_verifier(auth.uid())
        or public.has_shipment_perm(auth.uid(), 'view')
    );
-- INSERT: editors (write) OR admin/verifier; enforce created_by = auth.uid()
drop policy if exists shipment_remarks_insert on public.shipment_remarks;
create policy shipment_remarks_insert on public.shipment_remarks for
insert with check (
        (
            public.is_admin_or_verifier(auth.uid())
            or public.has_shipment_perm(auth.uid(), 'write')
        )
        and created_by = auth.uid()
    );
-- UPDATE: editors (write) OR admin/verifier
drop policy if exists shipment_remarks_update on public.shipment_remarks;
create policy shipment_remarks_update on public.shipment_remarks for
update using (
        public.is_admin_or_verifier(auth.uid())
        or public.has_shipment_perm(auth.uid(), 'write')
    ) with check (
        public.is_admin_or_verifier(auth.uid())
        or public.has_shipment_perm(auth.uid(), 'write')
    );
-- DELETE: editors (write/delete) OR admin/verifier (verifier allowed even if delete=false)
drop policy if exists shipment_remarks_delete on public.shipment_remarks;
create policy shipment_remarks_delete on public.shipment_remarks for delete using (
    public.is_admin_or_verifier(auth.uid())
    or public.has_shipment_perm(auth.uid(), 'delete')
    or public.has_shipment_perm(auth.uid(), 'write')
);
-- 3) Audit columns trigger (stamp created_by/updated_by)
create or replace function public.trg_set_shipment_remarks_audit() returns trigger language plpgsql security definer as $$ begin if tg_op = 'INSERT' then if new.created_by is null then new.created_by := auth.uid();
end if;
if new.created_at is null then new.created_at := now();
end if;
elsif tg_op = 'UPDATE' then new.updated_by := auth.uid();
new.updated_at := now();
end if;
return new;
end;
$$;
drop trigger if exists set_shipment_remarks_audit on public.shipment_remarks;
create trigger set_shipment_remarks_audit before
insert
    or
update on public.shipment_remarks for each row execute function public.trg_set_shipment_remarks_audit();
-- 4) Actions log trigger (write add/update/delete events)
create or replace function public.trg_log_shipment_remarks() returns trigger language plpgsql security definer as $$
declare actor uuid := auth.uid();
begin if tg_op = 'INSERT' then
insert into public.actions_log (user_id, action, target_type, target_id, payload)
values (
        actor,
        'add_remark',
        'shipment',
        new.id,
        jsonb_build_object(
            'id',
            new.id,
            'date',
            new.remark_date,
            'notes',
            new.notes
        )
    );
return new;
elsif tg_op = 'UPDATE' then
insert into public.actions_log (user_id, action, target_type, target_id, payload)
values (
        actor,
        'update_remark',
        'shipment',
        new.id,
        jsonb_build_object(
            'id',
            new.id,
            'date',
            new.remark_date,
            'notes',
            new.notes
        )
    );
return new;
elsif tg_op = 'DELETE' then
insert into public.actions_log (user_id, action, target_type, target_id, payload)
values (
        actor,
        'delete_remark',
        'shipment',
        old.id,
        jsonb_build_object(
            'id',
            old.id,
            'date',
            old.remark_date,
            'notes',
            old.notes
        )
    );
return old;
end if;
return null;
end;
$$;
drop trigger if exists log_shipment_remarks on public.shipment_remarks;
create trigger log_shipment_remarks
after
insert
    or
update
    or delete on public.shipment_remarks for each row execute function public.trg_log_shipment_remarks();