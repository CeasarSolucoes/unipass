-- =============================================================================
-- 800 · Ordem de validação do CPF
--
-- BUG: CPF com máscara ("258.369.147-37") era recusado com
--      'value for domain cpf violates check constraint "cpf_check"',
--      mesmo existindo um trigger para normalizá-lo.
--
-- CAUSA: a constraint de um DOMÍNIO é avaliada no cast do valor de entrada —
--        antes de qualquer trigger BEFORE INSERT. O tg_normalize_cpf nunca
--        chegava a rodar: era código morto desde que foi escrito.
--
--        A ordem real no Postgres é:
--          cast para o tipo/domínio  →  BEFORE trigger  →  CHECK de tabela
--
-- CORREÇÃO: mover a exigência de formato do domínio para a tabela. O domínio
--           passa a validar só o dígito verificador (is_valid_cpf já ignora
--           pontuação), e o CHECK de tabela — que roda DEPOIS do trigger —
--           garante que o que fica gravado tem exatamente 11 dígitos.
--
--           Resultado: entrada tolerante, armazenamento rígido. A importação
--           em massa aceita a planilha como a secretaria exporta, e o banco
--           continua com uma única representação por CPF, que é o que sustenta
--           a chave (school_id, cpf) da importação idempotente.
-- =============================================================================

alter domain public.cpf drop constraint cpf_check;

alter domain public.cpf add constraint cpf_check
  check (value is null or public.is_valid_cpf(value));

comment on domain public.cpf is
  'CPF com dígito verificador válido. Aceita máscara na entrada; o trigger de normalização grava só os 11 dígitos (ver CHECK de tabela).';

-- Estes CHECKs rodam depois do BEFORE trigger, então enxergam o valor já
-- normalizado. São eles que impedem que dois formatos do mesmo CPF coexistam.
alter table public.members
  add constraint members_cpf_normalized
  check (cpf ~ '^[0-9]{11}$');

alter table public.profiles
  add constraint profiles_cpf_normalized
  check (cpf is null or cpf ~ '^[0-9]{11}$');
