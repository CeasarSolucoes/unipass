-- =============================================================================
-- 300 · Validações, tentativas e auditoria
-- validations é o ativo do produto (PRD §7). Append-only.
-- =============================================================================

create table public.validations (
  id uuid primary key default gen_random_uuid(),

  school_id           uuid not null references public.schools(id) on delete cascade,
  partner_id          uuid not null references public.partners(id) on delete cascade,
  partner_location_id uuid references public.partner_locations(id) on delete set null,
  benefit_id          uuid references public.benefits(id) on delete set null,
  member_id           uuid references public.members(id) on delete set null,
  member_kind         public.member_kind,

  -- D14: sempre sabemos QUEM operou
  validated_by uuid not null references public.partner_staff(id) on delete restrict,

  method public.validation_method not null,
  result public.validation_result not null,
  deny_reason public.deny_reason,

  -- D15: valor real digitado, ou estimado pelo ticket médio do parceiro
  purchase_amount numeric(10, 2),
  discount_amount numeric(10, 2),
  saved_amount    numeric(10, 2) not null default 0,
  value_mode      public.value_mode not null default 'estimated',

  -- §5.3: prova de diligência do atendente
  photo_confirmed boolean not null default false,

  -- D19: colunas nascem prontas para o modo offline da semana 2
  offline_validated boolean not null default false,
  sync_status       public.sync_status not null default 'synced',
  synced_at         timestamptz,

  -- D13: cancelamento em 24h, só pelo autor
  cancelled_by   uuid references public.partner_staff(id) on delete set null,
  cancelled_at   timestamptz,
  cancel_reason  text,

  created_at timestamptz not null default now(),

  constraint validations_deny_reason_required check (
    (result = 'denied') = (deny_reason is not null)
  ),
  constraint validations_approved_needs_member check (
    result <> 'approved' or (member_id is not null and benefit_id is not null)
  ),
  constraint validations_cancel_fields_together check (
    (cancelled_at is null) = (cancelled_by is null)
  ),
  constraint validations_cancel_after_creation check (
    cancelled_at is null or cancelled_at >= created_at
  ),
  constraint validations_amounts_non_negative check (
    coalesce(purchase_amount, 0) >= 0
    and coalesce(discount_amount, 0) >= 0
    and saved_amount >= 0
  )
);

-- Dashboards da escola e do super admin
create index validations_school_created_idx  on public.validations (school_id, created_at desc);
-- Dashboard e histórico do parceiro
create index validations_partner_created_idx on public.validations (partner_id, created_at desc);
-- O índice que sustenta o cálculo de limite de uso (PRD §6.1) — o mais quente
create index validations_limit_lookup_idx
  on public.validations (member_id, benefit_id, created_at desc)
  where result = 'approved';
-- Lista "meus registros das últimas 24h" do atendente (D13)
create index validations_staff_created_idx   on public.validations (validated_by, created_at desc);
create index validations_pending_sync_idx    on public.validations (sync_status)
  where sync_status = 'pending';

comment on table public.validations is
  'APPEND-ONLY. Cancelar não apaga: vira result=cancelled com autor, hora e motivo (D13). É a base de todos os dashboards e da economia acumulada do aluno.';

-- -----------------------------------------------------------------------------
-- validation_attempts — D33
-- Alimenta o rate limit e a detecção de varredura de CPF. Sem isto, um atendente
-- mal-intencionado enumera CPFs para colher nome e foto de estranhos.
-- -----------------------------------------------------------------------------
create table public.validation_attempts (
  id               uuid primary key default gen_random_uuid(),
  partner_staff_id uuid not null references public.partner_staff(id) on delete cascade,
  partner_id       uuid not null references public.partners(id) on delete cascade,

  -- Nunca guardamos o CPF consultado em claro. O hash serve só para detectar
  -- repetição e varredura.
  input_hash text not null,
  method     public.validation_method not null,
  found      boolean not null,
  ip         inet,
  created_at timestamptz not null default now()
);

create index validation_attempts_staff_window_idx
  on public.validation_attempts (partner_staff_id, created_at desc);
create index validation_attempts_partner_window_idx
  on public.validation_attempts (partner_id, created_at desc);

-- -----------------------------------------------------------------------------
-- audit_logs — imutável. Toda impersonação passa por aqui (PRD §2.1).
-- -----------------------------------------------------------------------------
create table public.audit_logs (
  id         uuid primary key default gen_random_uuid(),
  actor_id   uuid references public.profiles(id) on delete set null,
  actor_role public.user_role,
  school_id  uuid references public.schools(id) on delete set null,
  partner_id uuid references public.partners(id) on delete set null,

  action    text not null,
  entity    text not null,
  entity_id uuid,

  before jsonb,
  after  jsonb,
  justification text,

  ip         inet,
  user_agent text,
  created_at timestamptz not null default now()
);

create index audit_logs_school_created_idx on public.audit_logs (school_id, created_at desc);
create index audit_logs_actor_created_idx  on public.audit_logs (actor_id, created_at desc);
create index audit_logs_entity_idx         on public.audit_logs (entity, entity_id);
