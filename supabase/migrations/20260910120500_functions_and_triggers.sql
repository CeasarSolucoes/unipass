-- =============================================================================
-- 500 · Funções de autorização, geração de member_code e regras em trigger
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Integridade de tenant entre members e suas extensões.
-- Sem isto, um students.school_id divergente de members.school_id faria a RLS
-- mostrar o aluno para a escola errada. Deixar a coluna denormalizada é
-- proposital (a RLS precisa dela sem join); garantir por FK composta é o preço.
-- -----------------------------------------------------------------------------
alter table public.members
  add constraint members_id_school_key unique (id, school_id);

alter table public.students
  add constraint students_member_school_fkey
  foreign key (member_id, school_id) references public.members(id, school_id) on delete cascade;

alter table public.dependents
  add constraint dependents_member_school_fkey
  foreign key (member_id, school_id) references public.members(id, school_id) on delete cascade;

alter table public.dependents
  add constraint dependents_holder_school_fkey
  foreign key (holder_member_id, school_id) references public.members(id, school_id) on delete cascade;

alter table public.dependent_slots
  add constraint dependent_slots_holder_school_fkey
  foreign key (holder_member_id, school_id) references public.members(id, school_id) on delete cascade;

-- =============================================================================
-- Autorização — D32
-- SECURITY DEFINER de propósito: a função lê profiles ignorando RLS, o que
-- evita a recursão infinita clássica (policy em profiles -> função -> profiles).
-- =============================================================================

create or replace function public.auth_role()
returns public.user_role
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.role from public.profiles p where p.id = auth.uid();
$$;

create or replace function public.auth_school_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.school_id from public.profiles p where p.id = auth.uid();
$$;

create or replace function public.auth_partner_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.partner_id from public.profiles p where p.id = auth.uid();
$$;

create or replace function public.auth_network_id()
returns uuid
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p.network_id from public.profiles p where p.id = auth.uid();
$$;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select coalesce(
    (select p.role = 'super_admin' from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

-- Escola visível a quem administra a escola OU a rede dela.
create or replace function public.can_read_school(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select
    public.is_super_admin()
    or target = public.auth_school_id()
    or exists (
      select 1
      from public.schools s
      where s.id = target
        and s.network_id is not null
        and s.network_id = public.auth_network_id()
    );
$$;

-- O membro é do próprio usuário? Cobre o titular e o dependente com login.
create or replace function public.is_own_member(target uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.members m
    where m.id = target and m.profile_id = auth.uid()
  )
  or exists (
    -- titular enxerga os próprios dependentes
    select 1
    from public.dependents d
    join public.members holder on holder.id = d.holder_member_id
    where d.member_id = target and holder.profile_id = auth.uid()
  );
$$;

-- O parceiro do usuário tem parceria ativa com esta escola?
-- É o que autoriza o balcão a enxergar um membro — e só quando a parceria vive.
create or replace function public.partner_serves_school(target_school uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.partnerships ps
    where ps.partner_id = public.auth_partner_id()
      and ps.school_id = target_school
      and ps.status = 'active'
  );
$$;

revoke execute on function public.auth_role()                     from public;
revoke execute on function public.auth_school_id()                from public;
revoke execute on function public.auth_partner_id()               from public;
revoke execute on function public.auth_network_id()               from public;
revoke execute on function public.is_super_admin()                from public;
revoke execute on function public.can_read_school(uuid)           from public;
revoke execute on function public.is_own_member(uuid)             from public;
revoke execute on function public.partner_serves_school(uuid)     from public;

grant execute on function public.auth_role()                  to authenticated;
grant execute on function public.auth_school_id()             to authenticated;
grant execute on function public.auth_partner_id()            to authenticated;
grant execute on function public.auth_network_id()            to authenticated;
grant execute on function public.is_super_admin()             to authenticated;
grant execute on function public.can_read_school(uuid)        to authenticated;
grant execute on function public.is_own_member(uuid)          to authenticated;
grant execute on function public.partner_serves_school(uuid)  to authenticated;

-- =============================================================================
-- member_code — D05, D06
-- =============================================================================

-- Alfabeto sem 0/O, 1/I/L: o código é ditado em voz alta no balcão, e "zero ou
-- ó" é o tipo de ambiguidade que gera fila. 31^5 ≈ 28,6 milhões por escola.
create or replace function public.generate_member_code(target_school uuid)
returns text
language plpgsql
volatile
security definer
set search_path = public, pg_temp
as $$
declare
  alphabet constant text := '23456789ABCDEFGHJKMNPQRSTUVWXYZ';
  prefix   text;
  suffix   text;
  candidate text;
  attempt  int := 0;
begin
  select member_code_prefix into prefix from public.schools where id = target_school;

  if prefix is null then
    raise exception 'Escola % não encontrada ao gerar member_code', target_school;
  end if;

  loop
    attempt := attempt + 1;

    suffix := '';
    for i in 1..5 loop
      suffix := suffix || substr(alphabet, 1 + floor(random() * length(alphabet))::int, 1);
    end loop;

    candidate := prefix || '-' || suffix;

    if not exists (select 1 from public.members where member_code = candidate) then
      return candidate;
    end if;

    if attempt >= 20 then
      raise exception 'Não foi possível gerar member_code único para a escola % após % tentativas', target_school, attempt;
    end if;
  end loop;
end;
$$;

create or replace function public.tg_members_assign_code()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.member_code is null or new.member_code = '' then
    new.member_code := public.generate_member_code(new.school_id);
  end if;
  return new;
end;
$$;

create trigger members_assign_code
  before insert on public.members
  for each row execute function public.tg_members_assign_code();

-- Normaliza o CPF antes de qualquer validação de domínio, para que a
-- importação aceite "123.456.789-09" e o banco guarde "12345678909".
create or replace function public.tg_normalize_cpf()
returns trigger
language plpgsql
as $$
begin
  if new.cpf is not null then
    new.cpf := public.only_digits(new.cpf::text)::public.cpf;
  end if;
  return new;
end;
$$;

create trigger members_normalize_cpf
  before insert or update of cpf on public.members
  for each row execute function public.tg_normalize_cpf();

create trigger profiles_normalize_cpf
  before insert or update of cpf on public.profiles
  for each row execute function public.tg_normalize_cpf();

-- =============================================================================
-- Dependentes
-- =============================================================================

-- Os 4 slots nascem com o aluno: a tela "meus dependentes" vira uma listagem
-- simples, e a trava do D10 tem onde morar mesmo com o slot vazio.
create or replace function public.tg_students_create_slots()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  free_count int;
  paid_count int;
  idx        int;
begin
  select s.free_dependents, s.paid_slots
    into free_count, paid_count
  from public.schools s
  where s.id = new.school_id;

  for idx in 1..(coalesce(free_count, 0) + coalesce(paid_count, 0)) loop
    insert into public.dependent_slots (holder_member_id, school_id, slot_index, slot_type)
    values (
      new.member_id,
      new.school_id,
      idx,
      case when idx <= coalesce(free_count, 0) then 'free'::public.slot_type
           else 'paid'::public.slot_type end
    )
    on conflict (holder_member_id, slot_index) do nothing;
  end loop;

  return new;
end;
$$;

create trigger students_create_slots
  after insert on public.students
  for each row execute function public.tg_students_create_slots();

-- D10: ao aprovar, o CPF do SLOT trava por 6 meses. A trava vive no slot, não
-- no dependente — remover a pessoa não devolve o slot antes do prazo.
create or replace function public.tg_dependents_lock_slot_on_approval()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.approval_status = 'approved'
     and (old.approval_status is distinct from 'approved') then

    new.approved_at := coalesce(new.approved_at, now());

    update public.dependent_slots
       set cpf_locked_until = now() + interval '6 months'
     where id = new.slot_id;

    update public.members
       set activated_at = coalesce(activated_at, now())
     where id = new.member_id;
  end if;

  return new;
end;
$$;

create trigger dependents_lock_slot_on_approval
  before update on public.dependents
  for each row execute function public.tg_dependents_lock_slot_on_approval();

-- D18: aluno suspenso derruba os dependentes junto, inclusive os pagos.
-- Em cascata no banco porque é a regra que o parceiro precisa que seja
-- verdadeira sempre — não pode depender de a aplicação lembrar.
create or replace function public.tg_members_cascade_status()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.kind = 'student'
     and new.status is distinct from old.status
     and new.status in ('suspended', 'cancelled', 'graduated') then

    update public.members m
       set status = new.status
      from public.dependents d
     where d.member_id = m.id
       and d.holder_member_id = new.id
       and m.status = 'active';
  end if;

  return new;
end;
$$;

create trigger members_cascade_status
  after update of status on public.members
  for each row execute function public.tg_members_cascade_status();

-- Foto reenviada volta para a fila. Sem isto, um aluno reprovado trocaria a
-- imagem e continuaria aprovado — a foto é o único fator de autenticação (D08).
create or replace function public.tg_members_photo_resets_status()
returns trigger
language plpgsql
as $$
begin
  if new.photo_url is distinct from old.photo_url and new.photo_url is not null then
    new.photo_status           := 'pending';
    new.photo_rejection_reason := null;
    new.photo_reviewed_by      := null;
    new.photo_reviewed_at      := null;
    new.photo_updated_at       := now();
  end if;
  return new;
end;
$$;

create trigger members_photo_resets_status
  before update of photo_url on public.members
  for each row execute function public.tg_members_photo_resets_status();
