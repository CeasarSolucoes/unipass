-- =============================================================================
-- Correção: "Database error querying schema" ao fazer login
--
-- Cole no SQL Editor do Supabase e rode. É idempotente e seguro rodar de novo.
--
-- CAUSA
-- O seed inseriu em auth.users sem preencher as colunas de token
-- (confirmation_token, recovery_token, email_change…), que ficaram NULL.
-- O GoTrue mapeia essas colunas para `string` em Go, não `*string` — um NULL
-- quebra o scan da linha inteira, e o erro que chega ao cliente é genérico,
-- sem dizer qual coluna. Só afeta usuários criados por INSERT manual; quem
-- entra pela API de signup nunca cai nisso, porque o GoTrue grava ''.
--
-- O bloco descobre quais colunas existem antes de tocá-las: o schema do
-- GoTrue muda entre versões, e um UPDATE com nome de coluna inexistente
-- abortaria tudo.
-- =============================================================================

do $$
declare
  token_columns constant text[] := array[
    'confirmation_token',
    'recovery_token',
    'email_change',
    'email_change_token_new',
    'email_change_token_current',
    'phone_change',
    'phone_change_token',
    'reauthentication_token'
  ];
  col       text;
  fixed     int;
  total     int := 0;
begin
  foreach col in array token_columns loop
    if exists (
      select 1
      from information_schema.columns
      where table_schema = 'auth'
        and table_name = 'users'
        and column_name = col
    ) then
      execute format('update auth.users set %I = %L where %I is null', col, '', col);
      get diagnostics fixed = row_count;
      total := total + fixed;

      if fixed > 0 then
        raise notice 'auth.users.% — % linha(s) corrigida(s)', col, fixed;
      end if;
    end if;
  end loop;

  raise notice 'Total de valores corrigidos: %', total;
end $$;

-- Relatório: se sobrar algum NULL aqui, o login continua falhando.
select
  count(*) filter (where confirmation_token is null)          as confirmation_token_null,
  count(*) filter (where recovery_token is null)              as recovery_token_null,
  count(*) filter (where email_change is null)                as email_change_null,
  count(*) filter (where email_change_token_new is null)      as email_change_new_null,
  count(*) filter (where email_change_token_current is null)  as email_change_current_null,
  count(*) filter (where email_confirmed_at is null)          as email_nao_confirmado,
  count(*)                                                    as total_usuarios
from auth.users;
