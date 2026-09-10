-- =============================================================================
-- 600 · Row Level Security — D32
--
-- Duas decisões estruturais que valem mais que as políticas em si:
--
-- 1. O PARCEIRO NÃO TEM POLÍTICA DE SELECT EM members.
--    Ele valida por RPC SECURITY DEFINER, que devolve só os campos do PRD §9 e
--    registra a tentativa. Dar SELECT ao parceiro seria entregar a base inteira
--    para enumeração — exatamente o que o D33 existe para impedir.
--
-- 2. validations NÃO TEM POLÍTICA DE INSERT.
--    Só a RPC escreve. É o D31 ("o servidor decide") aplicado no banco, não na
--    confiança de que a aplicação vai lembrar.
-- =============================================================================

alter table public.plans               enable row level security;
alter table public.networks            enable row level security;
alter table public.schools             enable row level security;
alter table public.profiles            enable row level security;
alter table public.members             enable row level security;
alter table public.students            enable row level security;
alter table public.dependent_slots     enable row level security;
alter table public.dependents          enable row level security;
alter table public.partner_categories  enable row level security;
alter table public.partners            enable row level security;
alter table public.partner_locations   enable row level security;
alter table public.partner_staff       enable row level security;
alter table public.partnerships        enable row level security;
alter table public.benefits            enable row level security;
alter table public.validations         enable row level security;
alter table public.validation_attempts enable row level security;
alter table public.audit_logs          enable row level security;
alter table public.import_jobs         enable row level security;
alter table public.change_requests     enable row level security;
alter table public.consents            enable row level security;
alter table public.subscriptions       enable row level security;
alter table public.notifications       enable row level security;
alter table public.push_subscriptions  enable row level security;

-- =============================================================================
-- Tabelas de referência — leitura para qualquer autenticado
-- =============================================================================
create policy plans_read on public.plans
  for select to authenticated using (true);
create policy plans_admin_write on public.plans
  for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

create policy partner_categories_read on public.partner_categories
  for select to authenticated using (true);
create policy partner_categories_admin_write on public.partner_categories
  for all to authenticated using (public.is_super_admin()) with check (public.is_super_admin());

-- =============================================================================
-- networks / schools
-- =============================================================================
create policy networks_read on public.networks
  for select to authenticated
  using (public.is_super_admin() or id = public.auth_network_id());

create policy networks_admin_write on public.networks
  for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

create policy schools_read on public.schools
  for select to authenticated
  using (
    public.can_read_school(id)
    -- o parceiro precisa do nome e do logo da escola com quem tem parceria
    or (public.auth_partner_id() is not null and public.partner_serves_school(id))
  );

create policy schools_admin_write on public.schools
  for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- A escola configura a si mesma (logo, cores, tetos), mas não muda plano,
-- limite de alunos nem status — isso é comercial, é do super admin.
create policy schools_self_update on public.schools
  for update to authenticated
  using (id = public.auth_school_id() and public.auth_role() = 'school_admin')
  with check (id = public.auth_school_id() and public.auth_role() = 'school_admin');

-- =============================================================================
-- profiles
-- =============================================================================
create policy profiles_read_own on public.profiles
  for select to authenticated using (id = auth.uid());

create policy profiles_read_school on public.profiles
  for select to authenticated
  using (
    public.is_super_admin()
    or (school_id is not null and school_id = public.auth_school_id()
        and public.auth_role() in ('school_admin', 'school_staff'))
    or (partner_id is not null and partner_id = public.auth_partner_id()
        and public.auth_role() = 'partner_owner')
  );

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

create policy profiles_admin_write on public.profiles
  for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

create policy profiles_school_manage on public.profiles
  for all to authenticated
  using (school_id = public.auth_school_id() and public.auth_role() = 'school_admin')
  with check (school_id = public.auth_school_id() and public.auth_role() = 'school_admin');

-- =============================================================================
-- members — o núcleo do isolamento de tenant
-- =============================================================================
create policy members_read_own on public.members
  for select to authenticated using (public.is_own_member(id));

create policy members_read_school on public.members
  for select to authenticated
  using (
    public.is_super_admin()
    or (school_id = public.auth_school_id()
        and public.auth_role() in ('school_admin', 'school_staff'))
    or exists (
      select 1 from public.schools s
      where s.id = members.school_id
        and s.network_id is not null
        and s.network_id = public.auth_network_id()
    )
  );

create policy members_school_write on public.members
  for all to authenticated
  using (
    public.is_super_admin()
    or (school_id = public.auth_school_id()
        and public.auth_role() in ('school_admin', 'school_staff'))
  )
  with check (
    public.is_super_admin()
    or (school_id = public.auth_school_id()
        and public.auth_role() in ('school_admin', 'school_staff'))
  );

-- O aluno troca a própria foto; o trigger devolve a foto para a fila (D08/D09).
create policy members_update_own_photo on public.members
  for update to authenticated
  using (public.is_own_member(id)) with check (public.is_own_member(id));

-- =============================================================================
-- students / dependent_slots / dependents
-- =============================================================================
create policy students_read on public.students
  for select to authenticated
  using (public.is_own_member(member_id) or public.can_read_school(school_id));

create policy students_school_write on public.students
  for all to authenticated
  using (
    public.is_super_admin()
    or (school_id = public.auth_school_id()
        and public.auth_role() in ('school_admin', 'school_staff'))
  )
  with check (
    public.is_super_admin()
    or (school_id = public.auth_school_id()
        and public.auth_role() in ('school_admin', 'school_staff'))
  );

create policy dependent_slots_read on public.dependent_slots
  for select to authenticated
  using (public.is_own_member(holder_member_id) or public.can_read_school(school_id));

create policy dependent_slots_school_write on public.dependent_slots
  for all to authenticated
  using (
    public.is_super_admin()
    or (school_id = public.auth_school_id()
        and public.auth_role() in ('school_admin', 'school_staff'))
  )
  with check (
    public.is_super_admin()
    or (school_id = public.auth_school_id()
        and public.auth_role() in ('school_admin', 'school_staff'))
  );

create policy dependents_read on public.dependents
  for select to authenticated
  using (
    public.is_own_member(member_id)
    or public.is_own_member(holder_member_id)
    or public.can_read_school(school_id)
  );

-- O titular cadastra o próprio dependente. A aprovação é da escola (D04) —
-- por isso o titular não tem UPDATE aqui.
create policy dependents_holder_insert on public.dependents
  for insert to authenticated
  with check (public.is_own_member(holder_member_id) and approval_status = 'pending');

create policy dependents_school_write on public.dependents
  for all to authenticated
  using (
    public.is_super_admin()
    or (school_id = public.auth_school_id()
        and public.auth_role() in ('school_admin', 'school_staff'))
  )
  with check (
    public.is_super_admin()
    or (school_id = public.auth_school_id()
        and public.auth_role() in ('school_admin', 'school_staff'))
  );

-- =============================================================================
-- Parceiros
-- =============================================================================
-- O aluno enxerga os parceiros com parceria ativa na escola dele — é o catálogo.
create policy partners_read on public.partners
  for select to authenticated
  using (
    public.is_super_admin()
    or id = public.auth_partner_id()
    or exists (
      select 1 from public.partnerships ps
      where ps.partner_id = partners.id
        and ps.status = 'active'
        and public.can_read_school(ps.school_id)
    )
  );

create policy partners_owner_write on public.partners
  for update to authenticated
  using (id = public.auth_partner_id() and public.auth_role() = 'partner_owner')
  with check (id = public.auth_partner_id() and public.auth_role() = 'partner_owner');

create policy partners_admin_write on public.partners
  for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

create policy partner_locations_read on public.partner_locations
  for select to authenticated
  using (
    public.is_super_admin()
    or partner_id = public.auth_partner_id()
    or exists (
      select 1 from public.partnerships ps
      where ps.partner_id = partner_locations.partner_id
        and ps.status = 'active'
        and public.can_read_school(ps.school_id)
    )
  );

create policy partner_locations_owner_write on public.partner_locations
  for all to authenticated
  using (partner_id = public.auth_partner_id() and public.auth_role() = 'partner_owner')
  with check (partner_id = public.auth_partner_id() and public.auth_role() = 'partner_owner');

-- A equipe é assunto interno do parceiro. A escola não vê, o aluno não vê.
create policy partner_staff_read on public.partner_staff
  for select to authenticated
  using (public.is_super_admin() or partner_id = public.auth_partner_id());

create policy partner_staff_owner_write on public.partner_staff
  for all to authenticated
  using (partner_id = public.auth_partner_id() and public.auth_role() = 'partner_owner')
  with check (partner_id = public.auth_partner_id() and public.auth_role() = 'partner_owner');

create policy partnerships_read on public.partnerships
  for select to authenticated
  using (
    public.is_super_admin()
    or public.can_read_school(school_id)
    or partner_id = public.auth_partner_id()
  );

create policy partnerships_school_write on public.partnerships
  for all to authenticated
  using (
    public.is_super_admin()
    or (school_id = public.auth_school_id() and public.auth_role() = 'school_admin')
  )
  with check (
    public.is_super_admin()
    or (school_id = public.auth_school_id() and public.auth_role() = 'school_admin')
  );

-- O parceiro aceita ou pausa a própria parceria, mas não a cria sozinho.
create policy partnerships_partner_update on public.partnerships
  for update to authenticated
  using (partner_id = public.auth_partner_id() and public.auth_role() = 'partner_owner')
  with check (partner_id = public.auth_partner_id() and public.auth_role() = 'partner_owner');

-- =============================================================================
-- benefits
-- =============================================================================
create policy benefits_read on public.benefits
  for select to authenticated
  using (
    exists (
      select 1 from public.partnerships ps
      where ps.id = benefits.partnership_id
        and (
          public.is_super_admin()
          or public.can_read_school(ps.school_id)
          or ps.partner_id = public.auth_partner_id()
        )
    )
  );

create policy benefits_partner_write on public.benefits
  for all to authenticated
  using (
    exists (
      select 1 from public.partnerships ps
      where ps.id = benefits.partnership_id
        and ps.partner_id = public.auth_partner_id()
        and public.auth_role() = 'partner_owner'
    )
  )
  with check (
    exists (
      select 1 from public.partnerships ps
      where ps.id = benefits.partnership_id
        and ps.partner_id = public.auth_partner_id()
        and public.auth_role() = 'partner_owner'
    )
  );

-- A escola modera: pode despublicar, não pode editar a oferta alheia.
create policy benefits_school_moderate on public.benefits
  for update to authenticated
  using (
    exists (
      select 1 from public.partnerships ps
      where ps.id = benefits.partnership_id
        and ps.school_id = public.auth_school_id()
        and public.auth_role() = 'school_admin'
    )
  )
  with check (
    exists (
      select 1 from public.partnerships ps
      where ps.id = benefits.partnership_id
        and ps.school_id = public.auth_school_id()
        and public.auth_role() = 'school_admin'
    )
  );

create policy benefits_admin_write on public.benefits
  for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

-- =============================================================================
-- validations — SEM política de INSERT: só a RPC escreve (D31)
-- =============================================================================
create policy validations_read on public.validations
  for select to authenticated
  using (
    public.is_super_admin()
    or public.can_read_school(school_id)
    or partner_id = public.auth_partner_id()
    or public.is_own_member(member_id)
  );

-- D13: o atendente cancela em 24h, e só o que ele mesmo registrou.
-- O dono da loja cancela qualquer registro da própria loja.
create policy validations_cancel on public.validations
  for update to authenticated
  using (
    partner_id = public.auth_partner_id()
    and created_at > now() - interval '24 hours'
    and (
      public.auth_role() = 'partner_owner'
      or validated_by in (
        select ps.id from public.partner_staff ps
        where ps.partner_id = public.auth_partner_id()
      )
    )
  )
  with check (partner_id = public.auth_partner_id());

create policy validation_attempts_read on public.validation_attempts
  for select to authenticated
  using (public.is_super_admin() or partner_id = public.auth_partner_id());

-- =============================================================================
-- Auditoria — leitura apenas. Ninguém escreve pela API; só funções internas.
-- =============================================================================
create policy audit_logs_read on public.audit_logs
  for select to authenticated
  using (
    public.is_super_admin()
    or (school_id is not null and school_id = public.auth_school_id()
        and public.auth_role() = 'school_admin')
  );

-- =============================================================================
-- Operação
-- =============================================================================
create policy import_jobs_school on public.import_jobs
  for all to authenticated
  using (
    public.is_super_admin()
    or (school_id = public.auth_school_id()
        and public.auth_role() in ('school_admin', 'school_staff'))
  )
  with check (
    public.is_super_admin()
    or (school_id = public.auth_school_id()
        and public.auth_role() in ('school_admin', 'school_staff'))
  );

create policy change_requests_read on public.change_requests
  for select to authenticated
  using (requester_id = auth.uid() or public.can_read_school(school_id));

create policy change_requests_insert on public.change_requests
  for insert to authenticated
  with check (requester_id = auth.uid() and status = 'pending');

create policy change_requests_school_review on public.change_requests
  for update to authenticated
  using (school_id = public.auth_school_id()
         and public.auth_role() in ('school_admin', 'school_staff'))
  with check (school_id = public.auth_school_id()
              and public.auth_role() in ('school_admin', 'school_staff'));

create policy consents_read_own on public.consents
  for select to authenticated
  using (profile_id = auth.uid() or public.is_super_admin() or public.can_read_school(school_id));

create policy consents_insert_own on public.consents
  for insert to authenticated
  with check (profile_id = auth.uid());

create policy subscriptions_read on public.subscriptions
  for select to authenticated
  using (
    public.is_super_admin()
    or payer_profile_id = auth.uid()
    or (school_id is not null and school_id = public.auth_school_id()
        and public.auth_role() = 'school_admin')
  );

create policy subscriptions_admin_write on public.subscriptions
  for all to authenticated
  using (public.is_super_admin()) with check (public.is_super_admin());

create policy notifications_own on public.notifications
  for select to authenticated using (profile_id = auth.uid());

create policy notifications_mark_read on public.notifications
  for update to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());

create policy push_subscriptions_own on public.push_subscriptions
  for all to authenticated
  using (profile_id = auth.uid()) with check (profile_id = auth.uid());
