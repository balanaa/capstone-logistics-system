-- Shipment DB: RLS Policies (uses granular permissions helper has_perm())
-- Prerequisites:
-- 1) Run create_shipment_tables.sql first (tables + RLS enabled)
-- 2) Ensure permissions table and has_perm(dept text, action text) exist (see docs/02-architecture/auth-and-rbac/granular-permissions-supabase.md)
-- ================================
-- documents
-- ================================
-- Cleanup
drop policy if exists admin_all_documents on public.documents;
drop policy if exists verifier_all_shipment on public.documents;
drop policy if exists doc_select on public.documents;
drop policy if exists doc_insert on public.documents;
drop policy if exists doc_update on public.documents;
drop policy if exists doc_delete on public.documents;
-- Admin override: everything
create policy admin_all_documents on public.documents for all to authenticated using (
    exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
            and 'admin' = any(p.roles)
    )
) with check (
    exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
            and 'admin' = any(p.roles)
    )
);
-- Verifier override: all on shipment only
create policy verifier_all_shipment on public.documents for all to authenticated using (
    department = 'shipment'
    and exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
            and 'verifier' = any(p.roles)
    )
) with check (
    department = 'shipment'
    and exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
            and 'verifier' = any(p.roles)
    )
);
-- SELECT by granular flags
create policy doc_select on public.documents for
select to authenticated using (has_perm(department, 'view'));
-- INSERT by granular flags (bind creator)
create policy doc_insert on public.documents for
insert to authenticated with check (
        has_perm(department, 'write')
        and uploaded_by = auth.uid()
    );
-- UPDATE by granular flags (edit forever)
create policy doc_update on public.documents for
update to authenticated using (has_perm(department, 'write'));
-- DELETE by granular flags
create policy doc_delete on public.documents for delete to authenticated using (has_perm(department, 'delete'));
-- ================================
-- Child tables: document_fields, document_items, document_conflicts,
-- document_item_conflicts, document_issues, label_mappings
-- Pattern: gate by parent document's department via EXISTS join
-- ================================
-- Helper predicate used repeatedly (inline each policy):
-- EXISTS (select 1 from public.documents d where d.id = <child>.document_id and (
--   admin OR (d.department='shipment' and verifier) OR has_perm(d.department, action)
-- ))
-- document_fields
drop policy if exists fields_select on public.document_fields;
drop policy if exists fields_insert on public.document_fields;
drop policy if exists fields_update on public.document_fields;
drop policy if exists fields_delete on public.document_fields;
create policy fields_select on public.document_fields for
select to authenticated using (
        exists (
            select 1
            from public.documents d
            where d.id = document_fields.document_id
                and (
                    exists (
                        select 1
                        from public.profiles p
                        where p.id = auth.uid()
                            and 'admin' = any(p.roles)
                    )
                    or (
                        d.department = 'shipment'
                        and exists (
                            select 1
                            from public.profiles p
                            where p.id = auth.uid()
                                and 'verifier' = any(p.roles)
                        )
                    )
                    or has_perm(d.department, 'view')
                )
        )
    );
create policy fields_insert on public.document_fields for
insert to authenticated with check (
        exists (
            select 1
            from public.documents d
            where d.id = document_fields.document_id
                and has_perm(d.department, 'write')
        )
    );
create policy fields_update on public.document_fields for
update to authenticated using (
        exists (
            select 1
            from public.documents d
            where d.id = document_fields.document_id
                and has_perm(d.department, 'write')
        )
    );
create policy fields_delete on public.document_fields for delete to authenticated using (
    exists (
        select 1
        from public.documents d
        where d.id = document_fields.document_id
            and has_perm(d.department, 'delete')
    )
);
-- document_items
drop policy if exists items_select on public.document_items;
drop policy if exists items_insert on public.document_items;
drop policy if exists items_update on public.document_items;
drop policy if exists items_delete on public.document_items;
create policy items_select on public.document_items for
select to authenticated using (
        exists (
            select 1
            from public.documents d
            where d.id = document_items.document_id
                and (
                    exists (
                        select 1
                        from public.profiles p
                        where p.id = auth.uid()
                            and 'admin' = any(p.roles)
                    )
                    or (
                        d.department = 'shipment'
                        and exists (
                            select 1
                            from public.profiles p
                            where p.id = auth.uid()
                                and 'verifier' = any(p.roles)
                        )
                    )
                    or has_perm(d.department, 'view')
                )
        )
    );
create policy items_insert on public.document_items for
insert to authenticated with check (
        exists (
            select 1
            from public.documents d
            where d.id = document_items.document_id
                and has_perm(d.department, 'write')
        )
    );
create policy items_update on public.document_items for
update to authenticated using (
        exists (
            select 1
            from public.documents d
            where d.id = document_items.document_id
                and has_perm(d.department, 'write')
        )
    );
create policy items_delete on public.document_items for delete to authenticated using (
    exists (
        select 1
        from public.documents d
        where d.id = document_items.document_id
            and has_perm(d.department, 'delete')
    )
);
-- document_conflicts
drop policy if exists conflicts_select on public.document_conflicts;
drop policy if exists conflicts_insert on public.document_conflicts;
drop policy if exists conflicts_update on public.document_conflicts;
drop policy if exists conflicts_delete on public.document_conflicts;
create policy conflicts_select on public.document_conflicts for
select to authenticated using (
        exists (
            select 1
            from public.documents d
            where d.id = document_conflicts.document_id
                and (
                    exists (
                        select 1
                        from public.profiles p
                        where p.id = auth.uid()
                            and 'admin' = any(p.roles)
                    )
                    or (
                        d.department = 'shipment'
                        and exists (
                            select 1
                            from public.profiles p
                            where p.id = auth.uid()
                                and 'verifier' = any(p.roles)
                        )
                    )
                    or has_perm(d.department, 'view')
                )
        )
    );
create policy conflicts_insert on public.document_conflicts for
insert to authenticated with check (
        exists (
            select 1
            from public.documents d
            where d.id = document_conflicts.document_id
                and has_perm(d.department, 'write')
        )
    );
create policy conflicts_update on public.document_conflicts for
update to authenticated using (
        exists (
            select 1
            from public.documents d
            where d.id = document_conflicts.document_id
                and has_perm(d.department, 'write')
        )
    );
create policy conflicts_delete on public.document_conflicts for delete to authenticated using (
    exists (
        select 1
        from public.documents d
        where d.id = document_conflicts.document_id
            and has_perm(d.department, 'delete')
    )
);
-- document_item_conflicts
drop policy if exists item_conflicts_select on public.document_item_conflicts;
drop policy if exists item_conflicts_insert on public.document_item_conflicts;
drop policy if exists item_conflicts_update on public.document_item_conflicts;
drop policy if exists item_conflicts_delete on public.document_item_conflicts;
create policy item_conflicts_select on public.document_item_conflicts for
select to authenticated using (
        exists (
            select 1
            from public.documents d
            where d.id = document_item_conflicts.document_id
                and (
                    exists (
                        select 1
                        from public.profiles p
                        where p.id = auth.uid()
                            and 'admin' = any(p.roles)
                    )
                    or (
                        d.department = 'shipment'
                        and exists (
                            select 1
                            from public.profiles p
                            where p.id = auth.uid()
                                and 'verifier' = any(p.roles)
                        )
                    )
                    or has_perm(d.department, 'view')
                )
        )
    );
create policy item_conflicts_insert on public.document_item_conflicts for
insert to authenticated with check (
        exists (
            select 1
            from public.documents d
            where d.id = document_item_conflicts.document_id
                and has_perm(d.department, 'write')
        )
    );
create policy item_conflicts_update on public.document_item_conflicts for
update to authenticated using (
        exists (
            select 1
            from public.documents d
            where d.id = document_item_conflicts.document_id
                and has_perm(d.department, 'write')
        )
    );
create policy item_conflicts_delete on public.document_item_conflicts for delete to authenticated using (
    exists (
        select 1
        from public.documents d
        where d.id = document_item_conflicts.document_id
            and has_perm(d.department, 'delete')
    )
);
-- document_issues (raised manually by roles; visible by dept perms)
drop policy if exists issues_select on public.document_issues;
drop policy if exists issues_insert on public.document_issues;
drop policy if exists issues_update on public.document_issues;
create policy issues_select on public.document_issues for
select to authenticated using (
        exists (
            select 1
            from public.documents d
            where d.id = document_issues.document_id
                and (
                    exists (
                        select 1
                        from public.profiles p
                        where p.id = auth.uid()
                            and 'admin' = any(p.roles)
                    )
                    or (
                        d.department = 'shipment'
                        and exists (
                            select 1
                            from public.profiles p
                            where p.id = auth.uid()
                                and 'verifier' = any(p.roles)
                        )
                    )
                    or has_perm(d.department, 'view')
                )
        )
    );
create policy issues_insert on public.document_issues for
insert to authenticated with check (
        exists (
            select 1
            from public.documents d
            where d.id = document_issues.document_id
                and (
                    has_perm(d.department, 'write')
                    or (
                        d.department = 'shipment'
                        and exists (
                            select 1
                            from public.profiles p
                            where p.id = auth.uid()
                                and 'verifier' = any(p.roles)
                        )
                    )
                )
        )
    );
create policy issues_update on public.document_issues for
update to authenticated using (
        exists (
            select 1
            from public.documents d
            where d.id = document_issues.document_id
                and (
                    has_perm(d.department, 'write')
                    or (
                        d.department = 'shipment'
                        and exists (
                            select 1
                            from public.profiles p
                            where p.id = auth.uid()
                                and 'verifier' = any(p.roles)
                        )
                    )
                )
        )
    );
-- label_mappings (write by roles with write access; read by viewers)
drop policy if exists label_map_select on public.label_mappings;
drop policy if exists label_map_insert on public.label_mappings;
drop policy if exists label_map_update on public.label_mappings;
drop policy if exists label_map_delete on public.label_mappings;
create policy label_map_select on public.label_mappings for
select to authenticated using (
        has_perm('shipment', 'view')
        or exists (
            select 1
            from public.profiles p
            where p.id = auth.uid()
                and (
                    'admin' = any(p.roles)
                    or 'verifier' = any(p.roles)
                )
        )
    );
create policy label_map_insert on public.label_mappings for
insert to authenticated with check (
        has_perm('shipment', 'write')
        or exists (
            select 1
            from public.profiles p
            where p.id = auth.uid()
                and (
                    'admin' = any(p.roles)
                    or 'verifier' = any(p.roles)
                )
        )
    );
create policy label_map_update on public.label_mappings for
update to authenticated using (
        has_perm('shipment', 'write')
        or exists (
            select 1
            from public.profiles p
            where p.id = auth.uid()
                and (
                    'admin' = any(p.roles)
                    or 'verifier' = any(p.roles)
                )
        )
    );
create policy label_map_delete on public.label_mappings for delete to authenticated using (
    has_perm('shipment', 'delete')
    or exists (
        select 1
        from public.profiles p
        where p.id = auth.uid()
            and (
                'admin' = any(p.roles)
                or 'verifier' = any(p.roles)
            )
    )
);
-- actions_log (append-only by users; admin can read all; users read own)
drop policy if exists actions_insert on public.actions_log;
drop policy if exists actions_select_admin on public.actions_log;
drop policy if exists actions_select_own on public.actions_log;
create policy actions_insert on public.actions_log for
insert to authenticated with check (user_id = auth.uid());
create policy actions_select_admin on public.actions_log for
select to authenticated using (
        exists (
            select 1
            from public.profiles p
            where p.id = auth.uid()
                and 'admin' = any(p.roles)
        )
    );
create policy actions_select_own on public.actions_log for
select to authenticated using (user_id = auth.uid());
-- ================================
-- Storage bucket 'documents' (granular) — optional; run after tables
-- ================================
-- Cleanup
drop policy if exists storage_select_granular on storage.objects;
drop policy if exists storage_insert_granular on storage.objects;
drop policy if exists storage_delete_granular on storage.objects;
-- SELECT (download/list)
create policy storage_select_granular on storage.objects for
select to authenticated using (
        bucket_id = 'documents'
        and (
            exists (
                select 1
                from public.profiles p
                where p.id = auth.uid()
                    and 'admin' = any(p.roles)
            )
            or (
                (storage.foldername(name)) [1] = 'shipment'
                and exists (
                    select 1
                    from public.profiles p
                    where p.id = auth.uid()
                        and 'verifier' = any(p.roles)
                )
            )
            or has_perm((storage.foldername(name)) [1], 'view')
        )
    );
-- INSERT (upload)
create policy storage_insert_granular on storage.objects for
insert to authenticated with check (
        bucket_id = 'documents'
        and (
            exists (
                select 1
                from public.profiles p
                where p.id = auth.uid()
                    and 'admin' = any(p.roles)
            )
            or (
                (storage.foldername(name)) [1] = 'shipment'
                and exists (
                    select 1
                    from public.profiles p
                    where p.id = auth.uid()
                        and 'verifier' = any(p.roles)
                )
            )
            or has_perm((storage.foldername(name)) [1], 'write')
        )
    );
-- DELETE
create policy storage_delete_granular on storage.objects for delete to authenticated using (
    bucket_id = 'documents'
    and (
        exists (
            select 1
            from public.profiles p
            where p.id = auth.uid()
                and 'admin' = any(p.roles)
        )
        or (
            (storage.foldername(name)) [1] = 'shipment'
            and exists (
                select 1
                from public.profiles p
                where p.id = auth.uid()
                    and 'verifier' = any(p.roles)
            )
        )
        or has_perm((storage.foldername(name)) [1], 'delete')
    )
);