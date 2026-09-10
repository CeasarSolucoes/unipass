-- =============================================================================
-- 400 · Operação (importação, solicitações, consentimentos) e cobrança
-- =============================================================================

-- -----------------------------------------------------------------------------
-- import_jobs — D11. full_sync suspende quem sumiu da lista; nunca deleta.
-- -----------------------------------------------------------------------------
create table public.import_jobs (
  id        uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  filename  text not null,
  mode      public.import_mode not null default 'upsert',
  status    public.import_status not null default 'pending',

  total     int not null default 0,
  created   int not null default 0,
  updated   int not null default 0,
  suspended int not null default 0,
  failed    int not null default 0,

  error_report jsonb not null default '[]'::jsonb,
  created_by   uuid references public.profiles(id) on delete set null,
  started_at   timestamptz,
  finished_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index import_jobs_school_created_idx on public.import_jobs (school_id, created_at desc);

-- -----------------------------------------------------------------------------
-- change_requests — aluno pede, escola aprova (PRD §3.4)
-- -----------------------------------------------------------------------------
create table public.change_requests (
  id               uuid primary key default gen_random_uuid(),
  school_id        uuid not null references public.schools(id) on delete cascade,
  requester_id     uuid not null references public.profiles(id) on delete cascade,
  target_member_id uuid not null references public.members(id) on delete cascade,

  entity        text not null,
  field         text not null,
  current_value text,
  requested_value text,

  status      public.change_request_status not null default 'pending',
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  reason      text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index change_requests_queue_idx on public.change_requests (school_id, status)
  where status = 'pending';

-- -----------------------------------------------------------------------------
-- consents — D42. Consentimento sem versão não prova nada.
-- -----------------------------------------------------------------------------
create table public.consents (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  school_id   uuid references public.schools(id) on delete set null,
  doc_type    public.consent_doc not null,
  doc_version text not null,
  doc_hash    text not null,
  accepted_at timestamptz not null default now(),
  ip          inet,
  user_agent  text,

  -- Reaceitar a mesma versão do mesmo documento é ruído, não consentimento novo.
  constraint consents_unique_acceptance unique (profile_id, doc_type, doc_version)
);

create index consents_profile_idx on public.consents (profile_id);

-- -----------------------------------------------------------------------------
-- subscriptions — D23, D25. O pacote de 2 slots é a unidade de venda,
-- não o dependente individual.
-- -----------------------------------------------------------------------------
create table public.subscriptions (
  id                uuid primary key default gen_random_uuid(),
  kind              public.subscription_kind not null,
  payer_profile_id  uuid references public.profiles(id) on delete set null,
  school_id         uuid references public.schools(id) on delete cascade,
  holder_member_id  uuid references public.members(id) on delete cascade,

  gateway             text not null default 'asaas',
  gateway_customer_id text,
  gateway_sub_id      text,

  amount numeric(10, 2) not null,
  cycle  public.billing_cycle not null,
  status public.subscription_status not null default 'trialing',

  trial_ends_at      timestamptz,
  current_period_end timestamptz,
  cancelled_at       timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint subscriptions_gateway_sub_key unique (gateway, gateway_sub_id),
  constraint subscriptions_school_plan_shape check (
    kind <> 'school_plan' or (school_id is not null and holder_member_id is null)
  ),
  constraint subscriptions_dependent_pack_shape check (
    kind <> 'dependent_pack' or (holder_member_id is not null and payer_profile_id is not null)
  )
);

create index subscriptions_school_idx on public.subscriptions (school_id) where school_id is not null;
create index subscriptions_holder_idx on public.subscriptions (holder_member_id) where holder_member_id is not null;

-- dependent_slots.subscription_id só pôde ganhar a FK agora.
alter table public.dependent_slots
  add constraint dependent_slots_subscription_id_fkey
  foreign key (subscription_id) references public.subscriptions(id) on delete set null;

-- -----------------------------------------------------------------------------
-- notifications e push — D17 (teto de 2 pushes por semana por aluno)
-- -----------------------------------------------------------------------------
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  profile_id  uuid not null references public.profiles(id) on delete cascade,
  school_id   uuid references public.schools(id) on delete cascade,
  kind        text not null,
  title       text not null,
  body        text,
  deep_link   text,
  is_push     boolean not null default false,
  read_at     timestamptz,
  sent_at     timestamptz,
  created_at  timestamptz not null default now()
);

create index notifications_profile_idx on public.notifications (profile_id, created_at desc);
create index notifications_unread_idx  on public.notifications (profile_id) where read_at is null;
-- Sustenta a contagem semanal do teto de push
create index notifications_push_window_idx on public.notifications (profile_id, sent_at desc)
  where is_push = true;

create table public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  endpoint   text not null unique,
  keys       jsonb not null,
  device     text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);

create index push_subscriptions_profile_idx on public.push_subscriptions (profile_id);

create trigger import_jobs_set_updated_at     before update on public.import_jobs     for each row execute function public.set_updated_at();
create trigger change_requests_set_updated_at before update on public.change_requests for each row execute function public.set_updated_at();
create trigger subscriptions_set_updated_at   before update on public.subscriptions   for each row execute function public.set_updated_at();
