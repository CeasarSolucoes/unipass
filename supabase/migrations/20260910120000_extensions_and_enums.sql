-- =============================================================================
-- 000 · Extensões, enums e utilitários de base
-- Ver docs/PRD.md §7 e docs/DECISIONS.md
-- =============================================================================

create extension if not exists "pgcrypto" with schema extensions;
create extension if not exists "citext" with schema extensions;

-- -----------------------------------------------------------------------------
-- Papéis e status
-- -----------------------------------------------------------------------------
create type public.user_role as enum (
  'super_admin',
  'network_admin',
  'school_admin',
  'school_staff',
  'student',
  'dependent',
  'partner_owner',
  'partner_staff'
);

create type public.school_status  as enum ('trial', 'active', 'suspended', 'cancelled');
create type public.member_kind    as enum ('student', 'dependent');
create type public.member_status  as enum ('active', 'suspended', 'cancelled', 'graduated');
create type public.photo_status   as enum ('pending', 'approved', 'rejected');
create type public.approval_status as enum ('pending', 'approved', 'rejected');
create type public.profile_status as enum ('invited', 'active', 'suspended');
create type public.record_source  as enum ('manual', 'import', 'api');

-- -----------------------------------------------------------------------------
-- Dependentes — D07, D10, D20
-- -----------------------------------------------------------------------------
create type public.slot_type as enum ('free', 'paid');

create type public.relationship as enum (
  -- núcleo
  'conjuge', 'companheiro', 'filho', 'enteado', 'pai', 'mae', 'irmao',
  -- estendida
  'avo', 'neto', 'bisavo', 'tio', 'sobrinho', 'primo', 'padrasto', 'meio_irmao',
  -- afinidade
  'sogro', 'genro_nora', 'cunhado', 'padrinho', 'afilhado',
  -- jurídico
  'filho_adotivo', 'tutelado', 'curatelado',
  -- outros (D20: existem de propósito, para o dado não vir mentido)
  'amigo', 'colega_republica', 'outro'
);

-- -----------------------------------------------------------------------------
-- Parceiros e benefícios
-- -----------------------------------------------------------------------------
create type public.partner_status     as enum ('pending', 'active', 'paused', 'blocked');
create type public.partnership_status as enum ('pending', 'active', 'paused', 'ended');

create type public.offer_type as enum (
  'permanente',
  'relampago',
  'evento',
  'estoque_limitado',
  'aniversario',
  'primeira_visita',
  'reconquista',
  'horario_morto',
  'progressiva'
);

create type public.discount_type as enum ('percent', 'fixed', 'gift', 'combo');

create type public.limit_rule as enum (
  'unlimited',
  'per_day',
  'per_week',
  'per_month',
  'per_semester',
  'per_year',
  'once_ever',
  'cooldown',
  'total_pool'
);

create type public.limit_scope as enum ('member', 'family');

-- -----------------------------------------------------------------------------
-- Validação — D01, D31
-- -----------------------------------------------------------------------------
create type public.validation_method as enum ('cpf', 'member_code');

create type public.validation_result as enum (
  'approved',
  'denied',
  'cancelled',
  'offline_invalidated'
);

-- A ordem reflete a sequência de checagem do servidor (PRD §5.4).
create type public.deny_reason as enum (
  'nao_encontrado',
  'foto_pendente',
  'aluno_suspenso',
  'matricula_cancelada',
  'dependente_nao_aprovado',
  'carteirinha_vencida',
  'escola_inativa',
  'parceria_encerrada',
  'fora_do_horario',
  'promocao_encerrada',
  'limite_atingido',
  'esgotado',
  'rate_limit'
);

create type public.sync_status as enum ('synced', 'pending', 'failed');
create type public.value_capture_mode as enum ('estimated', 'real', 'partner_choice');
create type public.value_mode as enum ('estimated', 'real');

-- -----------------------------------------------------------------------------
-- Operação e cobrança
-- -----------------------------------------------------------------------------
create type public.promo_approval_mode  as enum ('auto', 'manual');
create type public.import_mode          as enum ('upsert', 'full_sync');
create type public.import_status        as enum ('pending', 'processing', 'completed', 'failed');
create type public.change_request_status as enum ('pending', 'approved', 'rejected');
create type public.subscription_kind    as enum ('school_plan', 'dependent_pack');
create type public.subscription_status  as enum ('trialing', 'active', 'past_due', 'canceled');
create type public.billing_cycle        as enum ('monthly', 'semester', 'yearly');

create type public.consent_doc as enum (
  'termos_uso',
  'privacidade',
  'termo_aluno',
  'termo_responsavel',
  'ciencia_dependente_pago',
  'contrato_escola',
  'termo_parceiro'
);

-- =============================================================================
-- Utilitários
-- =============================================================================

-- updated_at automático. Aplicado por trigger em toda tabela que tem a coluna.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Remove tudo que não for dígito. Usada para normalizar CPF e telefone.
create or replace function public.only_digits(input text)
returns text
language sql
immutable
strict
as $$
  select regexp_replace(input, '[^0-9]', '', 'g');
$$;

-- Validação real de CPF pelo dígito verificador.
-- Rejeita as sequências repetidas (111.111.111-11 etc.), que passam no cálculo
-- mas não existem na Receita — é o erro clássico de quem valida CPF só pela conta.
create or replace function public.is_valid_cpf(input text)
returns boolean
language plpgsql
immutable
as $$
declare
  digits text;
  total  int;
  check1 int;
  check2 int;
  i      int;
begin
  if input is null then
    return false;
  end if;

  digits := public.only_digits(input);

  if length(digits) <> 11 then
    return false;
  end if;

  if digits ~ '^(\d)\1{10}$' then
    return false;
  end if;

  total := 0;
  for i in 1..9 loop
    total := total + substr(digits, i, 1)::int * (11 - i);
  end loop;
  check1 := 11 - (total % 11);
  if check1 >= 10 then
    check1 := 0;
  end if;

  if check1 <> substr(digits, 10, 1)::int then
    return false;
  end if;

  total := 0;
  for i in 1..10 loop
    total := total + substr(digits, i, 1)::int * (12 - i);
  end loop;
  check2 := 11 - (total % 11);
  if check2 >= 10 then
    check2 := 0;
  end if;

  return check2 = substr(digits, 11, 1)::int;
end;
$$;

-- Domínio de CPF: sempre 11 dígitos, sem máscara, sempre válido.
-- Guardar com máscara é o caminho curto para duplicar aluno na importação.
create domain public.cpf as text
  check (value is null or (value ~ '^[0-9]{11}$' and public.is_valid_cpf(value)));

comment on domain public.cpf is
  'CPF normalizado: 11 dígitos, sem pontuação, com dígito verificador válido.';
