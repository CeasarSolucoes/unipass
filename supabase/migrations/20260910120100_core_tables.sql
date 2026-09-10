-- =============================================================================
-- 100 · Núcleo: planos, redes, escolas, perfis, membros, alunos, dependentes
-- =============================================================================

-- -----------------------------------------------------------------------------
-- plans — D21
-- -----------------------------------------------------------------------------
create table public.plans (
  id            text primary key,
  name          text not null,
  max_students  int  not null,
  monthly_price numeric(10, 2) not null,
  features      jsonb not null default '{}'::jsonb,
  is_public     boolean not null default true,
  sort_order    int not null default 0,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- networks — D02. Opcional: escola independente não tem rede.
-- -----------------------------------------------------------------------------
create table public.networks (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  slug       text not null unique,
  logo_url   text,
  status     public.school_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.networks is
  'Franqueadora / rede de escolas. Opcional — schools.network_id é nullable e a interface esconde este nível quando vazio (D02).';

-- -----------------------------------------------------------------------------
-- schools — o TENANT. Todo dado do produto pendura aqui.
-- -----------------------------------------------------------------------------
create table public.schools (
  id          uuid primary key default gen_random_uuid(),
  network_id  uuid references public.networks(id) on delete set null,
  name        text not null,
  slug        text not null unique,
  cnpj        text,
  city        text,
  state       char(2),

  -- identidade visual da carteirinha white-label (D35)
  logo_url    text,
  brand_color text not null default '#1D4ED8',

  -- prefixo do member_code, ex.: 'KNN' -> KNN-7F4K2 (D05)
  member_code_prefix text not null,

  -- comercial
  plan_id       text not null references public.plans(id),
  student_limit int  not null default 200,

  -- política de dependentes (D07, D24)
  free_dependents int not null default 2 check (free_dependents between 0 and 4),
  paid_slots      int not null default 2 check (paid_slots between 0 and 4),
  dependent_billing_cycle public.billing_cycle not null default 'monthly',

  -- operação (D15, D16, D17)
  value_capture_mode  public.value_capture_mode  not null default 'partner_choice',
  promo_approval_mode public.promo_approval_mode not null default 'auto',
  monthly_promo_cap   int not null default 4  check (monthly_promo_cap >= 0),
  weekly_push_cap     int not null default 2  check (weekly_push_cap >= 0),

  -- destino dos links wa.me da fila de dependentes (D38)
  whatsapp_number text,

  status     public.school_status not null default 'trial',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint schools_slots_within_max check (free_dependents + paid_slots <= 4),
  constraint schools_prefix_format check (member_code_prefix ~ '^[A-Z0-9]{2,6}$')
);

create index schools_network_id_idx on public.schools (network_id) where network_id is not null;
create index schools_status_idx     on public.schools (status);

-- -----------------------------------------------------------------------------
-- profiles — espelho de auth.users com o papel e o vínculo de tenant.
-- Fonte da verdade das funções auth_role() / auth_school_id() / auth_partner_id().
-- -----------------------------------------------------------------------------
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  role       public.user_role not null,
  school_id  uuid references public.schools(id) on delete cascade,
  network_id uuid references public.networks(id) on delete cascade,
  partner_id uuid,  -- FK adicionada na migration 200, quando partners existir

  full_name  text not null,
  cpf        public.cpf,
  email      extensions.citext,
  phone      text,
  avatar_url text,

  status       public.profile_status not null default 'invited',
  last_seen_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  -- Cada papel exige exatamente o vínculo que lhe corresponde. Sem isso um
  -- school_admin sem school_id passaria pela RLS enxergando nada — ou tudo.
  constraint profiles_tenant_matches_role check (
    case role
      when 'super_admin'   then school_id is null and partner_id is null and network_id is null
      when 'network_admin' then network_id is not null and school_id is null and partner_id is null
      when 'school_admin'  then school_id is not null and partner_id is null
      when 'school_staff'  then school_id is not null and partner_id is null
      when 'student'       then school_id is not null and partner_id is null
      when 'dependent'     then school_id is not null and partner_id is null
      when 'partner_owner' then partner_id is not null and school_id is null
      when 'partner_staff' then partner_id is not null and school_id is null
    end
  )
);

create unique index profiles_cpf_key   on public.profiles (cpf)   where cpf is not null;
create unique index profiles_email_key  on public.profiles (email) where email is not null;
create index profiles_school_id_idx     on public.profiles (school_id)  where school_id is not null;
create index profiles_partner_id_idx    on public.profiles (partner_id) where partner_id is not null;
create index profiles_role_idx          on public.profiles (role);

-- -----------------------------------------------------------------------------
-- members — D30: titular e dependente na MESMA tabela.
-- O motor de validação (PRD §5.4) consulta um lugar só.
-- -----------------------------------------------------------------------------
create table public.members (
  id        uuid primary key default gen_random_uuid(),
  school_id uuid not null references public.schools(id) on delete cascade,
  kind      public.member_kind not null,

  -- identificador público do balcão (D05, D06)
  member_code text not null unique,

  profile_id uuid references public.profiles(id) on delete set null,
  full_name  text not null,
  cpf        public.cpf not null,
  birth_date date not null,

  -- foto: único fator de autenticação (D08, D09)
  photo_url              text,
  photo_status           public.photo_status not null default 'pending',
  photo_rejection_reason text,
  photo_reviewed_by      uuid references public.profiles(id) on delete set null,
  photo_reviewed_at      timestamptz,
  photo_updated_at       timestamptz,

  status       public.member_status not null default 'active',
  valid_until  date,
  activated_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- chave da importação idempotente (D11): reimportar atualiza, nunca duplica
  constraint members_school_cpf_key unique (school_id, cpf),
  constraint members_code_format check (member_code ~ '^[A-Z0-9]{2,6}-[A-Z0-9]{5}$'),
  constraint members_birth_date_sane check (birth_date > '1900-01-01' and birth_date <= current_date)
);

create index members_school_status_idx on public.members (school_id, status);
create index members_school_cpf_idx    on public.members (school_id, cpf);
create index members_photo_queue_idx   on public.members (school_id, photo_status)
  where photo_status = 'pending';
create index members_profile_id_idx    on public.members (profile_id) where profile_id is not null;

comment on column public.members.member_code is
  'Identificador público, ditado no balcão (D06). Não é dado sensível — pode ser lido em voz alta.';

-- -----------------------------------------------------------------------------
-- students — o que só o titular tem
-- -----------------------------------------------------------------------------
create table public.students (
  member_id       uuid primary key references public.members(id) on delete cascade,
  school_id       uuid not null references public.schools(id) on delete cascade,
  enrollment_code text,
  course          text,
  class_group     text,
  source          public.record_source not null default 'manual',
  external_id     text,   -- id no ERP da escola, para a futura API (D11)
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint students_external_id_key unique (school_id, external_id)
);

create index students_school_class_idx on public.students (school_id, class_group);

-- -----------------------------------------------------------------------------
-- dependent_slots — D10: a trava de 6 meses é POR SLOT, não por pessoa.
-- Os 4 slots são criados junto com o aluno; remover o dependente esvazia o
-- slot mas NÃO limpa cpf_locked_until.
-- -----------------------------------------------------------------------------
create table public.dependent_slots (
  id               uuid primary key default gen_random_uuid(),
  holder_member_id uuid not null references public.members(id) on delete cascade,
  school_id        uuid not null references public.schools(id) on delete cascade,
  slot_index       smallint not null check (slot_index between 1 and 4),
  slot_type        public.slot_type not null,
  cpf_locked_until timestamptz,
  subscription_id  uuid,   -- FK adicionada na migration 400
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),

  constraint dependent_slots_holder_index_key unique (holder_member_id, slot_index)
);

create index dependent_slots_holder_idx on public.dependent_slots (holder_member_id);

comment on column public.dependent_slots.cpf_locked_until is
  'D10: o CPF do slot é imutável até esta data. Sobrevive à remoção do dependente — senão bastaria remover e recadastrar para burlar a trava.';

-- -----------------------------------------------------------------------------
-- dependents — o que só o dependente tem
-- -----------------------------------------------------------------------------
create table public.dependents (
  member_id        uuid primary key references public.members(id) on delete cascade,
  slot_id          uuid not null references public.dependent_slots(id) on delete restrict,
  holder_member_id uuid not null references public.members(id) on delete cascade,
  school_id        uuid not null references public.schools(id) on delete cascade,
  relationship     public.relationship not null,
  relationship_note text,   -- obrigatório quando relationship = 'outro'

  -- D04: toda entrada passa pela escola
  approval_status  public.approval_status not null default 'pending',
  approved_by      uuid references public.profiles(id) on delete set null,
  approved_at      timestamptz,
  rejection_reason text,
  requested_at     timestamptz not null default now(),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint dependents_note_required_for_outro check (
    relationship <> 'outro' or (relationship_note is not null and length(trim(relationship_note)) > 0)
  ),
  constraint dependents_rejection_reason_required check (
    approval_status <> 'rejected' or rejection_reason is not null
  )
);

-- Um slot comporta um dependente vivo por vez. Registros cancelados ficam no
-- histórico, então o índice é parcial.
create unique index dependents_one_live_per_slot_idx
  on public.dependents (slot_id)
  where approval_status <> 'rejected';

create index dependents_holder_idx        on public.dependents (holder_member_id);
create index dependents_approval_queue_idx on public.dependents (school_id, approval_status)
  where approval_status = 'pending';

-- =============================================================================
-- Triggers de base
-- =============================================================================

create trigger plans_set_updated_at            before update on public.plans            for each row execute function public.set_updated_at();
create trigger networks_set_updated_at         before update on public.networks         for each row execute function public.set_updated_at();
create trigger schools_set_updated_at          before update on public.schools          for each row execute function public.set_updated_at();
create trigger profiles_set_updated_at         before update on public.profiles         for each row execute function public.set_updated_at();
create trigger members_set_updated_at          before update on public.members          for each row execute function public.set_updated_at();
create trigger students_set_updated_at         before update on public.students         for each row execute function public.set_updated_at();
create trigger dependent_slots_set_updated_at  before update on public.dependent_slots  for each row execute function public.set_updated_at();
create trigger dependents_set_updated_at       before update on public.dependents       for each row execute function public.set_updated_at();
