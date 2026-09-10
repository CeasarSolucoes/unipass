-- =============================================================================
-- Seed de desenvolvimento
--
-- Cria DUAS escolas de propósito: uma com rede (KNN Sorocaba) e uma
-- independente (Escola Aurora). O teste de isolamento (tests/rls-isolation.test.ts)
-- depende disso — é como provamos que a escola A não enxerga a escola B.
--
-- Senha de todos os usuários: unipass-dev-2026
-- NUNCA rodar em produção.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Planos e categorias
-- -----------------------------------------------------------------------------
insert into public.plans (id, name, max_students, monthly_price, sort_order) values
  ('essencial',   'Essencial',   200,   50.00, 1),
  ('crescimento', 'Crescimento', 500,  120.00, 2),
  ('rede',        'Rede',       1000,  220.00, 3),
  ('rede_plus',   'Rede+',     100000,   0.00, 4);

insert into public.partner_categories (id, name, icon, sort_order) values
  ('alimentacao',  'Alimentação',        'utensils',     1),
  ('educacao',     'Educação',           'graduation-cap', 2),
  ('saude',        'Saúde e bem-estar',  'heart-pulse',  3),
  ('beleza',       'Beleza',             'scissors',     4),
  ('esporte',      'Esporte e fitness',  'dumbbell',     5),
  ('vestuario',    'Vestuário',          'shirt',        6),
  ('lazer',        'Lazer e cultura',    'ticket',       7),
  ('servicos',     'Serviços',           'wrench',       8),
  ('tecnologia',   'Tecnologia',         'laptop',       9),
  ('transporte',   'Transporte',         'car',         10);

-- -----------------------------------------------------------------------------
-- Rede e escolas
-- -----------------------------------------------------------------------------
insert into public.networks (id, name, slug) values
  ('11111111-0000-0000-0000-000000000001', 'KNN Idiomas Brasil', 'knn-brasil');

insert into public.schools
  (id, network_id, name, slug, city, state, member_code_prefix, plan_id, student_limit, whatsapp_number, status)
values
  -- Escola A: dentro de uma rede
  ('22222222-0000-0000-0000-00000000000a',
   '11111111-0000-0000-0000-000000000001',
   'KNN Sorocaba Centro', 'knn-sorocaba-centro', 'Sorocaba', 'SP', 'KNN',
   'essencial', 200, '5515999990000', 'active'),
  -- Escola B: independente, sem rede (D02)
  ('22222222-0000-0000-0000-00000000000b',
   null,
   'Escola Aurora', 'escola-aurora', 'Campinas', 'SP', 'AUR',
   'essencial', 200, '5519888880000', 'active');

-- -----------------------------------------------------------------------------
-- Usuários de autenticação
-- -----------------------------------------------------------------------------
do $$
declare
  users constant jsonb := jsonb_build_array(
    jsonb_build_object('id', '33333333-0000-0000-0000-000000000001', 'email', 'super@unipass.test'),
    jsonb_build_object('id', '33333333-0000-0000-0000-000000000002', 'email', 'rede@knn.test'),
    jsonb_build_object('id', '33333333-0000-0000-0000-00000000000a', 'email', 'coord.sorocaba@knn.test'),
    jsonb_build_object('id', '33333333-0000-0000-0000-00000000000b', 'email', 'coord.aurora@aurora.test'),
    jsonb_build_object('id', '33333333-0000-0000-0000-0000000000a1', 'email', 'maria.aluna@knn.test'),
    jsonb_build_object('id', '33333333-0000-0000-0000-0000000000b1', 'email', 'bruno.aluno@aurora.test'),
    jsonb_build_object('id', '33333333-0000-0000-0000-0000000000c1', 'email', 'dono@cantinasabor.test'),
    jsonb_build_object('id', '33333333-0000-0000-0000-0000000000c2', 'email', 'dono@studiofit.test')
  );
  u jsonb;
begin
  for u in select * from jsonb_array_elements(users) loop
    -- As colunas de token precisam ser '' e NUNCA NULL: o GoTrue as lê como
    -- `string` em Go, e um NULL quebra o scan da linha com o erro genérico
    -- "Database error querying schema" no login. Quem entra pela API de signup
    -- não passa por isso porque o próprio GoTrue grava ''; só INSERT manual
    -- como este cai na armadilha.
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
      confirmation_token, recovery_token, email_change,
      email_change_token_new, email_change_token_current,
      phone_change, phone_change_token, reauthentication_token,
      created_at, updated_at
    ) values (
      '00000000-0000-0000-0000-000000000000',
      (u ->> 'id')::uuid,
      'authenticated',
      'authenticated',
      u ->> 'email',
      extensions.crypt('unipass-dev-2026', extensions.gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{}'::jsonb,
      '', '', '', '', '', '', '', '',
      now(), now()
    )
    on conflict (id) do nothing;

    insert into auth.identities (
      provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
    ) values (
      u ->> 'id',
      (u ->> 'id')::uuid,
      jsonb_build_object('sub', u ->> 'id', 'email', u ->> 'email', 'email_verified', true),
      'email',
      now(), now(), now()
    )
    on conflict do nothing;
  end loop;
end $$;

-- -----------------------------------------------------------------------------
-- Perfis
-- -----------------------------------------------------------------------------
insert into public.profiles (id, role, school_id, network_id, full_name, email, cpf, status) values
  ('33333333-0000-0000-0000-000000000001', 'super_admin',   null, null,
   'Super Admin', 'super@unipass.test', '12345678909', 'active'),
  ('33333333-0000-0000-0000-000000000002', 'network_admin', null, '11111111-0000-0000-0000-000000000001',
   'Coordenação Rede KNN', 'rede@knn.test', '11144477735', 'active'),
  ('33333333-0000-0000-0000-00000000000a', 'school_admin', '22222222-0000-0000-0000-00000000000a', null,
   'Coordenação KNN Sorocaba', 'coord.sorocaba@knn.test', '52998224725', 'active'),
  ('33333333-0000-0000-0000-00000000000b', 'school_admin', '22222222-0000-0000-0000-00000000000b', null,
   'Coordenação Aurora', 'coord.aurora@aurora.test', '39053344705', 'active'),
  ('33333333-0000-0000-0000-0000000000a1', 'student', '22222222-0000-0000-0000-00000000000a', null,
   'Maria Souza Silva', 'maria.aluna@knn.test', '98765432100', 'active'),
  ('33333333-0000-0000-0000-0000000000b1', 'student', '22222222-0000-0000-0000-00000000000b', null,
   'Bruno Almeida Costa', 'bruno.aluno@aurora.test', '74125896364', 'active');

-- -----------------------------------------------------------------------------
-- Parceiros
-- -----------------------------------------------------------------------------
insert into public.partners
  (id, legal_name, trade_name, category_id, description, phone, avg_ticket, status)
values
  ('44444444-0000-0000-0000-000000000001',
   'Cantina Sabor Ltda', 'Cantina Sabor', 'alimentacao',
   'Comida caseira no centro, self-service e marmitas.', '1533221100', 32.00, 'active'),
  ('44444444-0000-0000-0000-000000000002',
   'Studio Fit Academia ME', 'Studio Fit', 'esporte',
   'Musculação, funcional e aulas coletivas.', '1533445566', 120.00, 'active');

insert into public.profiles (id, role, partner_id, full_name, email, status) values
  ('33333333-0000-0000-0000-0000000000c1', 'partner_owner', '44444444-0000-0000-0000-000000000001',
   'Ana Ribeiro', 'dono@cantinasabor.test', 'active'),
  ('33333333-0000-0000-0000-0000000000c2', 'partner_owner', '44444444-0000-0000-0000-000000000002',
   'Carlos Mendes', 'dono@studiofit.test', 'active');

update public.partners set owner_profile_id = '33333333-0000-0000-0000-0000000000c1'
  where id = '44444444-0000-0000-0000-000000000001';
update public.partners set owner_profile_id = '33333333-0000-0000-0000-0000000000c2'
  where id = '44444444-0000-0000-0000-000000000002';

insert into public.partner_locations (id, partner_id, label, address, city, state, is_primary) values
  ('55555555-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001',
   'Unidade Centro', 'Rua XV de Novembro, 120', 'Sorocaba', 'SP', true),
  ('55555555-0000-0000-0000-000000000002', '44444444-0000-0000-0000-000000000002',
   'Studio Fit Campolim', 'Av. Dr. Afonso Vergueiro, 900', 'Sorocaba', 'SP', true);

-- PIN 1234 para os dois atendentes de desenvolvimento
insert into public.partner_staff (id, partner_id, location_id, display_name, pin_hash) values
  ('66666666-0000-0000-0000-000000000001', '44444444-0000-0000-0000-000000000001',
   '55555555-0000-0000-0000-000000000001', 'Joana (caixa)',
   extensions.crypt('1234', extensions.gen_salt('bf'))),
  ('66666666-0000-0000-0000-000000000002', '44444444-0000-0000-0000-000000000002',
   '55555555-0000-0000-0000-000000000002', 'Rafael (recepção)',
   extensions.crypt('1234', extensions.gen_salt('bf')));

-- -----------------------------------------------------------------------------
-- Parcerias — a Cantina atende as DUAS escolas. É o caso que prova o N:N
-- e o que o teste de isolamento usa para verificar que o parceiro não mistura
-- as bases das duas escolas.
-- -----------------------------------------------------------------------------
insert into public.partnerships (id, school_id, partner_id, status, started_at) values
  ('77777777-0000-0000-0000-00000000000a', '22222222-0000-0000-0000-00000000000a',
   '44444444-0000-0000-0000-000000000001', 'active', now()),
  ('77777777-0000-0000-0000-00000000000b', '22222222-0000-0000-0000-00000000000b',
   '44444444-0000-0000-0000-000000000001', 'active', now()),
  ('77777777-0000-0000-0000-00000000000c', '22222222-0000-0000-0000-00000000000a',
   '44444444-0000-0000-0000-000000000002', 'active', now());

insert into public.benefits
  (id, partnership_id, title, description, offer_type, discount_type, discount_value,
   limit_rule, limit_qty, valid_weekdays, valid_from_time, valid_to_time)
values
  ('88888888-0000-0000-0000-000000000001', '77777777-0000-0000-0000-00000000000a',
   '20% OFF no almoço', 'Válido no self-service, exceto feriados.',
   'permanente', 'percent', 20, 'per_day', 1, '{1,2,3,4,5}', '11:00', '15:00'),
  ('88888888-0000-0000-0000-000000000002', '77777777-0000-0000-0000-00000000000b',
   '15% OFF no almoço', 'Válido no self-service.',
   'permanente', 'percent', 15, 'per_day', 1, '{1,2,3,4,5}', '11:00', '15:00'),
  ('88888888-0000-0000-0000-000000000003', '77777777-0000-0000-0000-00000000000c',
   'Matrícula grátis + 1º mês com 50%', 'Para novos alunos.',
   'permanente', 'percent', 50, 'once_ever', 1, '{1,2,3,4,5,6}', null, null);

-- -----------------------------------------------------------------------------
-- Membros. member_code é gerado por trigger; os 4 slots de dependente também.
-- -----------------------------------------------------------------------------
insert into public.members
  (id, school_id, kind, profile_id, full_name, cpf, birth_date,
   photo_url, photo_status, status, valid_until, activated_at)
values
  ('99999999-0000-0000-0000-0000000000a1', '22222222-0000-0000-0000-00000000000a', 'student',
   '33333333-0000-0000-0000-0000000000a1', 'Maria Souza Silva', '98765432100', '2004-03-14',
   'members/maria.jpg', 'approved', 'active', current_date + interval '1 year', now()),
  ('99999999-0000-0000-0000-0000000000a2', '22222222-0000-0000-0000-00000000000a', 'student',
   null, 'Pedro Henrique Lima', '45678912364', '2006-07-22',
   null, 'pending', 'active', current_date + interval '1 year', null),
  ('99999999-0000-0000-0000-0000000000a3', '22222222-0000-0000-0000-00000000000a', 'student',
   null, 'Larissa Moreira', '32165498791', '2001-11-02',
   'members/larissa.jpg', 'approved', 'suspended', current_date + interval '1 year', now()),
  ('99999999-0000-0000-0000-0000000000b1', '22222222-0000-0000-0000-00000000000b', 'student',
   '33333333-0000-0000-0000-0000000000b1', 'Bruno Almeida Costa', '74125896364', '2003-01-30',
   'members/bruno.jpg', 'approved', 'active', current_date + interval '1 year', now());

insert into public.students (member_id, school_id, enrollment_code, course, class_group, source) values
  ('99999999-0000-0000-0000-0000000000a1', '22222222-0000-0000-0000-00000000000a', 'KNN-2026-0001', 'Inglês', 'ING-4B', 'manual'),
  ('99999999-0000-0000-0000-0000000000a2', '22222222-0000-0000-0000-00000000000a', 'KNN-2026-0002', 'Inglês', 'ING-2A', 'manual'),
  ('99999999-0000-0000-0000-0000000000a3', '22222222-0000-0000-0000-00000000000a', 'KNN-2026-0003', 'Espanhol', 'ESP-1A', 'manual'),
  ('99999999-0000-0000-0000-0000000000b1', '22222222-0000-0000-0000-00000000000b', 'AUR-2026-0001', 'Alemão', 'ALE-3C', 'manual');

-- Um dependente aprovado, para exercitar a cascata do D18 e a trava do D10.
insert into public.members
  (id, school_id, kind, full_name, cpf, birth_date, photo_url, photo_status, status, activated_at)
values
  ('99999999-0000-0000-0000-0000000000d1', '22222222-0000-0000-0000-00000000000a', 'dependent',
   'Joaquim Souza Silva', '15975348625', '2012-05-09',
   'members/joaquim.jpg', 'approved', 'active', now());

insert into public.dependents
  (member_id, slot_id, holder_member_id, school_id, relationship, approval_status, approved_by, approved_at)
select
  '99999999-0000-0000-0000-0000000000d1',
  ds.id,
  '99999999-0000-0000-0000-0000000000a1',
  '22222222-0000-0000-0000-00000000000a',
  'filho',
  'approved',
  '33333333-0000-0000-0000-00000000000a',
  now()
from public.dependent_slots ds
where ds.holder_member_id = '99999999-0000-0000-0000-0000000000a1'
  and ds.slot_index = 1;

-- Trava do slot, que normalmente o trigger aplicaria na transição de status.
update public.dependent_slots
   set cpf_locked_until = now() + interval '6 months'
 where holder_member_id = '99999999-0000-0000-0000-0000000000a1'
   and slot_index = 1;

-- -----------------------------------------------------------------------------
-- Algumas validações, para os dashboards não nascerem vazios
-- -----------------------------------------------------------------------------
insert into public.validations
  (school_id, partner_id, partner_location_id, benefit_id, member_id, member_kind,
   validated_by, method, result, deny_reason, purchase_amount, discount_amount,
   saved_amount, value_mode, photo_confirmed, created_at)
values
  ('22222222-0000-0000-0000-00000000000a', '44444444-0000-0000-0000-000000000001',
   '55555555-0000-0000-0000-000000000001', '88888888-0000-0000-0000-000000000001',
   '99999999-0000-0000-0000-0000000000a1', 'student',
   '66666666-0000-0000-0000-000000000001', 'cpf', 'approved', null,
   38.00, 7.60, 7.60, 'real', true, now() - interval '3 days'),
  ('22222222-0000-0000-0000-00000000000a', '44444444-0000-0000-0000-000000000001',
   '55555555-0000-0000-0000-000000000001', '88888888-0000-0000-0000-000000000001',
   '99999999-0000-0000-0000-0000000000a1', 'student',
   '66666666-0000-0000-0000-000000000001', 'member_code', 'approved', null,
   42.50, 8.50, 8.50, 'real', true, now() - interval '1 day'),
  ('22222222-0000-0000-0000-00000000000b', '44444444-0000-0000-0000-000000000001',
   '55555555-0000-0000-0000-000000000001', '88888888-0000-0000-0000-000000000002',
   '99999999-0000-0000-0000-0000000000b1', 'student',
   '66666666-0000-0000-0000-000000000001', 'cpf', 'approved', null,
   30.00, 4.50, 4.50, 'estimated', true, now() - interval '2 days'),
  -- Larissa está suspensa: é o caso de recusa do critério de aceite nº 11
  ('22222222-0000-0000-0000-00000000000a', '44444444-0000-0000-0000-000000000001',
   '55555555-0000-0000-0000-000000000001', null,
   '99999999-0000-0000-0000-0000000000a3', 'student',
   '66666666-0000-0000-0000-000000000001', 'cpf', 'denied', 'aluno_suspenso',
   null, null, 0, 'estimated', false, now() - interval '5 hours');
