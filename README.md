# UniPass

Carteirinha digital de estudante + rede de parceiros verificada. SaaS multi-tenant para escolas.

- **Produto:** [docs/PRD.md](docs/PRD.md)
- **Decisões e o porquê de cada uma:** [docs/DECISIONS.md](docs/DECISIONS.md)

> O nome **UniPass é provisório**. Toda a marca vive em [`src/config/brand.ts`](src/config/brand.ts) —
> nenhum componente escreve o nome do produto direto (D34).

---

## Como funciona, em um parágrafo

A escola importa seus alunos. Cada aluno recebe um convite, define senha e envia uma foto, que a
escola aprova. A partir daí ele tem uma carteirinha digital com a marca da escola e um **código de
membro** (`KNN-7F4K2`). No balcão do parceiro, o atendente digita o PIN dele, digita o CPF **ou** o
código que o cliente ditou, e a tela fica **verde com a foto grande** ou **vermelha com o motivo**.
Não há QR code: o aluno não precisa de celular, bateria nem internet (D01). Cada uso vira uma linha
em `validations`, que é o ativo real do produto.

## Stack

| Camada | Escolha |
|---|---|
| App | Next.js 15 (App Router) · React 19 · TypeScript strict |
| Estilo | Tailwind v4 · shadcn/ui |
| Dados | Supabase — Postgres + Auth + Storage + **RLS** |
| Deploy | Vercel |
| Testes | Vitest |

## Rodando localmente

```bash
npm install
cp .env.example .env.local     # preencha com as chaves do seu projeto Supabase
npm run dev
```

Com o Supabase CLI e Docker instalados, o banco local sobe com schema e seed:

```bash
npx supabase start
npx supabase db reset          # aplica migrations + seed
npm run db:types               # regenera src/types/database.ts
```

**Usuários do seed** (senha `unipass-dev-2026`, PIN do atendente `1234`):

| E-mail | Papel |
|---|---|
| `super@unipass.test` | super_admin |
| `rede@knn.test` | network_admin |
| `coord.sorocaba@knn.test` | school_admin — KNN Sorocaba (escola **com** rede) |
| `coord.aurora@aurora.test` | school_admin — Escola Aurora (**sem** rede) |
| `maria.aluna@knn.test` | student |
| `dono@cantinasabor.test` | partner_owner (atende as **duas** escolas) |

## Comandos

```bash
npm run dev         # servidor de desenvolvimento
npm run verify      # typecheck + lint + test — rode antes de todo commit
npm run build       # build de produção
npm run test        # testes
npm run db:reset    # recria o banco local com migrations + seed
npm run db:types    # regenera os tipos a partir do schema
```

## Estrutura

```
docs/                       PRD e log de decisões
supabase/
  migrations/               schema versionado — nunca resetado em produção
  seed.sql                  duas escolas, para o teste de isolamento ter o que provar
src/
  app/                      rotas (App Router)
  config/brand.ts           ÚNICA fonte da marca (D34)
  lib/
    supabase/{client,server,admin}.ts
    cpf.ts                  validação de CPF, máscara e parser do campo do balcão
    roles.ts                mapa papel → rota
    env.ts                  validação de ambiente no boot
  middleware.ts             renova sessão e aplica guarda de rota
tests/
  rls-isolation.test.ts     o portão de qualidade — ver abaixo
```

## As três regras que não se negociam

**1. A RLS é quem protege o dado.** O middleware só decide qual tela mostrar. Se ele falhar, o
usuário chega numa tela vazia — nunca numa tela com dado alheio. `tests/rls-isolation.test.ts` prova
isso a cada CI, e foi escrito **antes** da primeira tela.

**2. O servidor decide a validação.** O app do parceiro manda o identificador e recebe aprovado ou
negado. `validations` **não tem política de INSERT**: só a RPC escreve. Nas versões anteriores essa
lógica vivia em hooks React e era forjável (D31).

**3. O parceiro não tem SELECT em `members`.** Ele valida por RPC, que devolve só os campos do
PRD §9 e registra a tentativa. Dar leitura direta seria entregar a base para enumeração (D33).

## Antes de commitar

```bash
npm run verify
```

O CI roda typecheck, lint, testes e build, e **bloqueia o merge** se algum falhar. Isso não é
zelo: as versões anteriores deste produto morreram com um `tsc_errors.log` de 16 KB e componentes de
70 KB. Nenhum arquivo passa de ~300 linhas (D36).
