-- =============================================================================
-- 200 · Parceiros, equipe, parcerias e benefícios
-- O parceiro vive FORA do tenant: liga-se a escolas por partnerships N:N (PRD §2).
-- =============================================================================

create table public.partner_categories (
  id         text primary key,
  name       text not null,
  icon       text,
  sort_order int not null default 0
);

-- -----------------------------------------------------------------------------
-- partners
-- -----------------------------------------------------------------------------
create table public.partners (
  id          uuid primary key default gen_random_uuid(),
  legal_name  text not null,
  trade_name  text not null,
  cnpj        text,
  category_id text references public.partner_categories(id) on delete set null,
  description text,

  logo_url  text,
  cover_url text,
  phone     text,
  whatsapp  text,
  instagram text,
  website   text,

  -- usado no modo de captura estimada do valor economizado (D15)
  avg_ticket numeric(10, 2),

  owner_profile_id uuid references public.profiles(id) on delete set null,
  status     public.partner_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index partners_category_idx on public.partners (category_id);
create index partners_status_idx   on public.partners (status);

-- profiles.partner_id só pôde ganhar a FK agora que partners existe.
alter table public.profiles
  add constraint profiles_partner_id_fkey
  foreign key (partner_id) references public.partners(id) on delete cascade;

-- -----------------------------------------------------------------------------
-- partner_locations
-- -----------------------------------------------------------------------------
create table public.partner_locations (
  id         uuid primary key default gen_random_uuid(),
  partner_id uuid not null references public.partners(id) on delete cascade,
  label      text not null,
  address    text,
  city       text,
  state      char(2),
  postal_code text,
  lat        numeric(10, 7),
  lng        numeric(10, 7),
  opening_hours jsonb not null default '{}'::jsonb,
  is_primary boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index partner_locations_partner_idx on public.partner_locations (partner_id);

-- -----------------------------------------------------------------------------
-- partner_staff — D14: atendente identificado por PIN de 4 dígitos.
-- Sem identidade individual, a regra "só cancela o que você registrou" (D13)
-- não existe.
-- -----------------------------------------------------------------------------
create table public.partner_staff (
  id           uuid primary key default gen_random_uuid(),
  partner_id   uuid not null references public.partners(id) on delete cascade,
  location_id  uuid references public.partner_locations(id) on delete set null,
  display_name text not null,

  -- bcrypt via extensions.crypt(). O PIN em claro nunca toca o banco.
  pin_hash     text not null,

  status       public.profile_status not null default 'active',
  last_used_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),

  constraint partner_staff_name_unique unique (partner_id, display_name)
);

create index partner_staff_partner_idx on public.partner_staff (partner_id);

comment on column public.partner_staff.pin_hash is
  'Hash bcrypt do PIN de 4 dígitos. Espaço de busca é pequeno de propósito: o PIN identifica quem operou, não autentica o dispositivo — quem autentica é a sessão do parceiro.';

-- -----------------------------------------------------------------------------
-- partnerships — o N:N que faz a rede escalar (PRD §2)
-- -----------------------------------------------------------------------------
create table public.partnerships (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references public.schools(id) on delete cascade,
  partner_id uuid not null references public.partners(id) on delete cascade,
  status     public.partnership_status not null default 'pending',
  invited_by uuid references public.profiles(id) on delete set null,
  started_at timestamptz,
  ended_at   timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint partnerships_school_partner_key unique (school_id, partner_id)
);

create index partnerships_school_status_idx  on public.partnerships (school_id, status);
create index partnerships_partner_status_idx on public.partnerships (partner_id, status);

-- -----------------------------------------------------------------------------
-- benefits — D16 (aprovação), 6.1 (limite de uso), 6.2 (tipos de oferta)
-- -----------------------------------------------------------------------------
create table public.benefits (
  id             uuid primary key default gen_random_uuid(),
  partnership_id uuid not null references public.partnerships(id) on delete cascade,
  title          text not null,
  description    text,
  terms          text,

  offer_type     public.offer_type not null default 'permanente',
  discount_type  public.discount_type not null,
  discount_value numeric(10, 2),

  -- regra de uso. Default: 1 por dia, cota por membro (PRD §6.1)
  limit_rule     public.limit_rule not null default 'per_day',
  limit_qty      int not null default 1 check (limit_qty > 0),
  limit_scope    public.limit_scope not null default 'member',
  cooldown_hours int,

  -- janela de validade
  valid_weekdays  smallint[] not null default '{0,1,2,3,4,5,6}'::smallint[],
  valid_from_time time,
  valid_to_time   time,
  starts_at       timestamptz,
  ends_at         timestamptz,

  -- estoque (offer_type estoque_limitado / limit_rule total_pool)
  max_redemptions   int,
  redemptions_count int not null default 0,

  approval_status public.approval_status not null default 'approved',
  status          public.partner_status not null default 'active',
  created_by      uuid references public.profiles(id) on delete set null,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),

  constraint benefits_weekdays_valid check (
    valid_weekdays <@ '{0,1,2,3,4,5,6}'::smallint[] and array_length(valid_weekdays, 1) > 0
  ),
  constraint benefits_time_window_ordered check (
    valid_from_time is null or valid_to_time is null or valid_from_time < valid_to_time
  ),
  constraint benefits_date_window_ordered check (
    starts_at is null or ends_at is null or starts_at < ends_at
  ),
  constraint benefits_cooldown_requires_hours check (
    limit_rule <> 'cooldown' or cooldown_hours is not null
  ),
  constraint benefits_pool_requires_max check (
    limit_rule <> 'total_pool' or max_redemptions is not null
  ),
  constraint benefits_percent_range check (
    discount_type <> 'percent' or (discount_value > 0 and discount_value <= 100)
  ),
  constraint benefits_value_required check (
    discount_type in ('gift', 'combo') or discount_value is not null
  ),
  -- Oferta relâmpago sem janela de tempo é oferta permanente com nome errado.
  constraint benefits_flash_requires_window check (
    offer_type <> 'relampago' or (starts_at is not null and ends_at is not null)
  )
);

create index benefits_partnership_idx on public.benefits (partnership_id);
create index benefits_active_idx      on public.benefits (partnership_id, status)
  where status = 'active';
create index benefits_flash_idx       on public.benefits (starts_at, ends_at)
  where offer_type = 'relampago';

create trigger partners_set_updated_at          before update on public.partners          for each row execute function public.set_updated_at();
create trigger partner_locations_set_updated_at before update on public.partner_locations for each row execute function public.set_updated_at();
create trigger partner_staff_set_updated_at     before update on public.partner_staff     for each row execute function public.set_updated_at();
create trigger partnerships_set_updated_at      before update on public.partnerships      for each row execute function public.set_updated_at();
create trigger benefits_set_updated_at          before update on public.benefits          for each row execute function public.set_updated_at();
