-- =============================================================================
-- 700 · Contato do membro
--
-- O e-mail e o telefone do aluno existem ANTES de ele ter login: a escola
-- cadastra (ou importa) o aluno, e só depois dispara o convite. Até aqui esses
-- dados não tinham onde morar — profiles só nasce com o convite aceito.
--
-- O e-mail também é a coluna que a importação em massa preenche (Dia 7), e é
-- por ele que a escola gera a lista de links wa.me (D12).
-- =============================================================================

alter table public.members
  add column email extensions.citext,
  add column phone text;

-- Dois alunos da mesma escola não podem dividir e-mail: o convite iria para a
-- pessoa errada, e a importação idempotente não teria como decidir quem é quem.
-- Parcial porque e-mail é opcional — muito aluno de curso de idioma é menor de
-- idade e usa o e-mail do responsável, ou nenhum.
create unique index members_school_email_key
  on public.members (school_id, email)
  where email is not null;

comment on column public.members.email is
  'Contato para o convite. Independente de profiles.email, que só existe depois que o aluno aceita.';
