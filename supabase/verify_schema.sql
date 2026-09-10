-- =============================================================================
-- Verificação do schema aplicado
--
-- Cole INTEIRO no SQL Editor do Supabase e rode. Ele não altera nada — só lê
-- o catálogo e devolve um relatório linha a linha.
--
-- Serve para confirmar que as 7 migrations entraram na ordem certa quando
-- aplicadas à mão, e para dizer se o seed já foi carregado.
-- =============================================================================

with

-- 1. Tabelas ------------------------------------------------------------------
expected_tables(name) as (
  values ('plans'), ('networks'), ('schools'), ('profiles'), ('members'),
         ('students'), ('dependent_slots'), ('dependents'), ('partner_categories'),
         ('partners'), ('partner_locations'), ('partner_staff'), ('partnerships'),
         ('benefits'), ('validations'), ('validation_attempts'), ('audit_logs'),
         ('import_jobs'), ('change_requests'), ('consents'), ('subscriptions'),
         ('notifications'), ('push_subscriptions')
),
actual_tables as (
  select tablename as name from pg_tables where schemaname = 'public'
),
missing_tables as (
  select string_agg(name, ', ' order by name) as list
  from (select name from expected_tables except select name from actual_tables) t
),

-- 2. Funções ------------------------------------------------------------------
expected_functions(name) as (
  values ('auth_role'), ('auth_school_id'), ('auth_partner_id'), ('auth_network_id'),
         ('is_super_admin'), ('can_read_school'), ('is_own_member'),
         ('partner_serves_school'), ('generate_member_code'), ('is_valid_cpf'),
         ('only_digits'), ('set_updated_at')
),
actual_functions as (
  select p.proname as name
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
),
missing_functions as (
  select string_agg(name, ', ' order by name) as list
  from (select name from expected_functions except select name from actual_functions) t
),

-- 3. Triggers -----------------------------------------------------------------
expected_triggers(name) as (
  values ('members_assign_code'), ('members_normalize_cpf'), ('students_create_slots'),
         ('dependents_lock_slot_on_approval'), ('members_cascade_status'),
         ('members_photo_resets_status')
),
actual_triggers as (
  select tgname as name from pg_trigger where not tgisinternal
),
missing_triggers as (
  select string_agg(name, ', ' order by name) as list
  from (select name from expected_triggers except select name from actual_triggers) t
),

-- 4. RLS ----------------------------------------------------------------------
rls_off as (
  select string_agg(c.relname, ', ' order by c.relname) as list
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public'
    and c.relkind = 'r'
    and c.relrowsecurity = false
    and c.relname in (select name from expected_tables)
),
tables_without_policy as (
  select string_agg(t.name, ', ' order by t.name) as list
  from expected_tables t
  where not exists (
    select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = t.name
  )
),

-- 5. Invariantes de segurança -------------------------------------------------
-- D31: validations não pode ter política de INSERT. Só a RPC escreve.
validations_insert_policy as (
  select string_agg(policyname, ', ') as list
  from pg_policies
  where schemaname = 'public' and tablename = 'validations' and cmd in ('INSERT', 'ALL')
),

checks as (

  select 1 as ord, 'Tabelas' as item,
         (select count(*) from actual_tables a join expected_tables e using (name))::text
           || '/' || (select count(*) from expected_tables)::text as valor,
         coalesce('faltando: ' || (select list from missing_tables), 'todas presentes') as detalhe

  union all select 2, 'Enums',
    (select count(*) from pg_type t join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = 'public' and t.typtype = 'e')::text || '/32',
    'esperado 32 tipos enum'

  union all select 3, 'Domínio public.cpf',
    case when exists (
      select 1 from pg_type t join pg_namespace n on n.oid = t.typnamespace
      where n.nspname = 'public' and t.typname = 'cpf' and t.typtype = 'd'
    ) then 'ok' else 'AUSENTE' end,
    'valida dígito verificador no banco'

  union all select 4, 'Funções',
    (select count(*) from actual_functions a join expected_functions e using (name))::text
      || '/' || (select count(*) from expected_functions)::text,
    coalesce('faltando: ' || (select list from missing_functions), 'todas presentes')

  union all select 5, 'Triggers',
    (select count(*) from actual_triggers a join expected_triggers e using (name))::text
      || '/' || (select count(*) from expected_triggers)::text,
    coalesce('faltando: ' || (select list from missing_triggers), 'todos presentes')

  union all select 6, 'RLS habilitada',
    case when (select list from rls_off) is null then 'ok' else 'FALHA' end,
    coalesce('SEM RLS: ' || (select list from rls_off), 'todas as tabelas protegidas')

  union all select 7, 'Políticas RLS',
    (select count(*) from pg_policies where schemaname = 'public')::text,
    coalesce('sem política: ' || (select list from tables_without_policy),
             'toda tabela tem ao menos uma')

  union all select 8, 'D31 · validations sem INSERT',
    case when (select list from validations_insert_policy) is null then 'ok' else 'FALHA' end,
    coalesce('política indevida: ' || (select list from validations_insert_policy),
             'só a RPC escreve validação')

  -- 6. Seed ---------------------------------------------------------------------
  union all select 9,  'Seed · escolas',    (select count(*) from public.schools)::text,
    'esperado 2 (uma com rede, uma independente) para o teste de isolamento'
  union all select 10, 'Seed · perfis',     (select count(*) from public.profiles)::text, 'esperado 8'
  union all select 11, 'Seed · membros',    (select count(*) from public.members)::text,  'esperado 5'
  union all select 12, 'Seed · parceiros',  (select count(*) from public.partners)::text, 'esperado 2'
  union all select 13, 'Seed · validações', (select count(*) from public.validations)::text, 'esperado 4'
  union all select 14, 'Seed · usuários auth', (select count(*) from auth.users)::text, 'esperado 8'

  union all select 15, 'Seed · member_code gerado',
    coalesce((select string_agg(member_code, ', ' order by member_code) from public.members), '—'),
    'os códigos são gerados por trigger; se vierem vazios, o trigger não rodou'
)

select
  case
    when valor like '%AUSENTE%' or valor like '%FALHA%' then '❌'
    when detalhe like 'faltando:%' or detalhe like 'SEM RLS:%' or detalhe like 'sem política:%' then '❌'
    when valor = '0' and item like 'Seed%' then '⚠️'
    else '✅'
  end as status,
  item,
  valor,
  detalhe
from checks
order by ord;
