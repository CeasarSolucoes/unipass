# UniPass — PRD v1.0
### Carteirinha Digital de Estudante + Rede de Parceiros Verificada

**Data:** 10/09/2026 · **Status:** decisões fechadas, pronto para implementação
**Piloto:** 1 unidade KNN Idiomas, ~50 alunos · **Prazo do piloto:** 7 dias

---

## 1. Visão

O UniPass é uma **rede de benefícios verificada, vendida como SaaS multi-tenant para escolas.**

A carteirinha é a interface. O ativo real é o **log de validações**, que transforma cada uso de desconto em
dado acionável para a escola e para o parceiro.

| Para quem | Valor |
|---|---|
| **Aluno** | Carteirinha no celular, catálogo de descontos reais e até 4 pessoas da família cobertas |
| **Escola** | Argumento de matrícula e retenção ("nossos alunos economizaram R$ X"), sem custo operacional |
| **Parceiro** | Base verificada de clientes — 100 alunos × 3 pessoas = 300 clientes potenciais — com dados de quem realmente veio |

### 1.1 A decisão que define o produto: sem QR code

Exigir que o parceiro leia um QR significa exigir que ele tenha um leitor ou abra a câmera a cada cliente.
É atrito no lado mais frágil do marketplace, e o atendente **já precisa registrar a venda de qualquer forma**.

**Validação é por CPF ou código do membro, com confirmação visual por foto.**

Efeito colateral positivo e grande: **o aluno não precisa de celular, bateria nem internet para usar o
benefício.** Basta saber o próprio CPF ou o código. Isso elimina o maior ponto de falha operacional do
produto.

Efeito colateral a gerenciar: a foto passa a ser o único fator de autenticação — tratado no §5.

### 1.2 Marca

O nome **UniPass é provisório**. Consequência técnica obrigatória: **toda a identidade vive em
`src/config/brand.ts`** (nome, logo, cores, domínio, textos legais) e nenhum componente escreve o nome do
produto direto. Trocar a marca depois deve ser a edição de um arquivo, não uma varredura no repositório.

A carteirinha é **white-label**: marca da escola em destaque, "by UniPass" discreto no rodapé. A escola vende
melhor e nós ganhamos distribuição.

---

## 2. Personas, papéis e tenancy

```
Plataforma (Super Admin)
   └── Rede / Franqueadora  ← OPCIONAL (network_id nullable)
         └── Escola (TENANT)
               ├── Alunos titulares
               │     └── Dependentes: 2 grátis + pacote de 2 pagos (máx. 4)
               └── Parcerias ─────┐   (N:N)
Parceiro (empresa)  ──────────────┘
   ├── Unidades
   └── Equipe: dono + atendentes (PIN)
```

**Escolas independentes são cidadãs de primeira classe.** `schools.network_id` é nullable e a interface
**esconde todo o nível de rede** quando não há uma — sem menus vazios. A tabela `networks` existe desde o dia
1 para não exigir migração depois, mas só aparece quando preenchida. Vendemos para franquia e para escola de
bairro com o mesmo produto.

**O parceiro vive fora do tenant**, ligado a escolas por `partnerships` N:N. É isso que permite ao mesmo
restaurante atender KNN, Wizard e a faculdade da cidade — e é o que faz a rede escalar.

| Role | Poder |
|---|---|
| `super_admin` | Tudo: escolas, redes, planos, preços, impersonação, auditoria |
| `network_admin` | Consolidado das unidades da rede. **Não edita aluno** |
| `school_admin` | Alunos, parceiros, moderação de fotos, aprovação de dependentes, relatórios, config |
| `school_staff` | Cadastro/edição de aluno e moderação. Sem financeiro, sem config |
| `student` | Carteirinha, catálogo, dependentes, histórico |
| `dependent` | (≥18) Carteirinha própria, catálogo, histórico. Não gerencia nada |
| `partner_owner` | Perfil, benefícios, promoções, equipe, dashboard, validar |
| `partner_staff` | **Só validar + ver e cancelar os próprios registros** |

### 2.1 Atendentes por PIN

O dispositivo do balcão fica logado no parceiro; cada atendente digita um **PIN de 4 dígitos** antes de
validar — como um PDV. Sem e-mail, sem senha forte, sem atrito de cadastro.

Isso não é conveniência, é requisito: a regra "o atendente só cancela o registro que ele mesmo fez" só existe
se cada atendente for identificável. Com um login coletivo, não existe "ele mesmo".

**Impersonação** (suporte) é exclusiva do `super_admin`, exige justificativa escrita, mostra banner vermelho
permanente, expira em 30 minutos e vai inteira para a auditoria.

---

## 3. Mapa de telas

`[S1]` = semana 1 (piloto) · `[S2]` = semanas 2–3 · `[BL]` = backlog

### 3.1 Público

| Rota | O que faz |
|---|---|
| `/login` **[S1]** | **Login único.** E-mail ou CPF + senha; o sistema descobre o papel e redireciona. Sem "escolha seu tipo de acesso" |
| `/convite/[token]` **[S1]** | Primeiro acesso: define senha, completa cadastro |
| `/ativar` **[S1]** | Alternativa: aluno digita código de ativação impresso |
| `/esqueci-senha` · `/redefinir-senha` **[S1]** | Recuperação |
| `/` Landing **[S2]** | Vitrine B2B para vender às escolas |
| `/e/[slug]` **[BL]** | Vitrine pública dos parceiros da escola — isca de matrícula |

### 3.2 Aluno / Dependente — PWA mobile-first

| Rota | Conteúdo |
|---|---|
| `/carteirinha` **[S1]** | Cartão white-label: foto, nome, escola, **código do membro em destaque**, CPF mascarado, validade, status |
| `/carteira` **[S2]** | Alternador entre titular e dependentes (swipe entre cartões) |
| `/beneficios` **[S1]** | Catálogo: busca, filtro por categoria, destaque de promoções |
| `/beneficios/[id]` **[S1]** | Detalhe: desconto, regras, limite de uso, horários, endereço, telefone, Instagram |
| `/historico` **[S1]** | Cada uso com quanto economizou. **Total acumulado no topo** |
| `/dependentes` **[S2]** | Lista, adicionar (2 grátis), comprar o pacote de 2 pagos, status na fila |
| `/perfil` **[S2]** | Dados, foto, senha, notificações. Campos travados exigem solicitação à escola |
| `/notificacoes` **[S2]** | Promoções, avisos da escola, resultado de moderação |

**A tela que vende o produto é `/historico`,** pelo contador **"você já economizou R$ 847"**. É o número que
o aluno mostra em casa, que a escola usa no material de matrícula e que justifica a mensalidade.

### 3.3 Parceiro

**`partner_staff` vê apenas:**

| Rota | Conteúdo |
|---|---|
| `/validar` **[S1]** | Campo único: CPF **ou** código do membro |
| `/validar/resultado` **[S1]** | A tela mais importante do produto — §5.5 |
| `/validar/registros` **[S1]** | Últimas 24h dos **próprios** registros, com botão cancelar |

**`partner_owner` — tudo acima, mais:**

| Rota | Conteúdo |
|---|---|
| `/parceiro/perfil` **[S1]** | Nome, logo, fotos, categoria, descrição, endereços, contato, horários |
| `/parceiro/beneficios` **[S1]** | CRUD do desconto: tipo, valor, regra de uso, dias e horários válidos |
| `/parceiro/equipe` **[S1]** | Cadastrar atendentes com PIN, ver quem validou o quê |
| `/parceiro/historico` **[S1]** | Log completo da loja, exportar CSV |
| `/parceiro` Dashboard **[S2]** | Validações, clientes únicos, novos vs. recorrentes, horários de pico, desconto concedido |
| `/parceiro/promocoes` **[S2]** | Promoções com janela de tempo e push |
| `/parceiro/escolas` **[S2]** | Parcerias, status, aceitar convite de nova escola |

### 3.4 Escola

| Rota | Conteúdo |
|---|---|
| `/escola/alunos` **[S1]** | Tabela com busca, filtro por status e turma, paginação, ações em massa |
| `/escola/alunos/novo` **[S1]** | Cadastro individual |
| `/escola/alunos/[id]` **[S1]** | Ficha completa, reenviar convite, suspender |
| `/escola/moderacao` **[S1]** | **Fila de fotos** — aprovar/reprovar com motivo |
| `/escola/parceiros` **[S1]** | Ativos, convidar (3 campos), pausar, desempenho |
| `/escola/alunos/importar` **[S1]** | Importação CSV — §4.2 |
| `/escola/config` **[S1]** | Logo, cores, política de dependentes, modo de captura de valor, teto de promoções e pushes |
| `/escola/solicitacoes` **[S2]** | **Fila de dependentes** + mudanças de dados pedidas por alunos |
| `/escola` Dashboard **[S2]** | §8.2 |
| `/escola/relatorios` **[S2]** | Uso por parceiro, categoria, turma, período. Exportar |
| `/escola/comunicacao` **[BL]** | Push e e-mail em massa |

**Convite de parceiro em 3 campos** (nome, e-mail, categoria). O parceiro completa o próprio perfil no
primeiro acesso — ele tem incentivo, é a vitrine dele. Fazer a escola cadastrar fotos e horários do parceiro
é o erro que faz a rede nunca sair do papel.

### 3.5 Super Admin

| Rota | Conteúdo |
|---|---|
| `/admin` **[S1]** | Escolas, alunos, validações, MRR |
| `/admin/escolas` **[S1]** | CRUD, plano, limite, status, **impersonar** |
| `/admin/escolas/nova` **[S1]** | Onboarding + criação do primeiro `school_admin` |
| `/admin/parceiros` **[S2]** | Diretório global, parceiros multi-escola |
| `/admin/usuarios` **[S2]** | Busca global, suporte |
| `/admin/financeiro` **[S2]** | Faturamento, dependentes, inadimplência |
| `/admin/auditoria` **[S2]** | Log imutável, toda impersonação, alertas de anomalia |
| `/admin/config` **[S2]** | Planos, preços, categorias, feature flags |

---

## 4. Fluxos

### 4.1 Onboarding da escola

`Super admin cadastra (com ou sem rede) → plano e limite → configura política de dependentes, modo de captura de valor, teto de promoções → cria school_admin → convite → wizard: logo, cores, contrato aceito → importar alunos`

### 4.2 Importação de alunos

`Template CSV → upload → mapeamento de colunas → validação linha a linha (CPF com dígito verificador, duplicado, e-mail) → preview com erros → confirmar → job assíncrono → relatório → gerar convites`

**Idempotente**, chave `(school_id, cpf)`. Reimportar atualiza, nunca duplica.

Dois modos: `upsert` (só cria/atualiza) e `full_sync` (a lista é a verdade — quem sumiu é **suspenso**, nunca
deletado). Antes de confirmar, a escola vê o resumo do que vai acontecer: *"12 novos, 180 atualizados,
**7 serão suspensos**"*.

**Google Planilha [BL]:** quando entrar, será por **botão manual de "reler planilha"**, nunca sincronização
automática. A releitura reconfirma as colunas e **falha com erro explícito** se o cabeçalho divergir do
padrão — planilha compartilhada é renomeada por gente que não sabe que existe um sistema lendo.

### 4.3 Primeiro acesso do aluno

`Convite → confere dados → define senha → sobe foto com guia de enquadramento → aceita o termo (versionado, com IP e timestamp) → carteirinha em "aguardando aprovação" → escola aprova → liberada`

**Canal do convite:** e-mail automático **+** a escola exporta uma lista de **links `wa.me` prontos** para
disparar da secretaria. Alternativa: **código de ativação impresso**, entregue em sala.

**Sem foto aprovada, sem desconto.** O aluno entra e vê o catálogo, mas todo benefício mostra o selo *"Envie
sua foto para usar"* e o servidor recusa a validação com `foto_pendente`.

Ao reprovar, a escola escolhe um motivo (rosto não visível · foto de grupo · óculos escuros · boné · baixa
qualidade · com filtro · conteúdo impróprio · não é a pessoa) e pode complementar por escrito. O aluno é
notificado com o motivo e o guia de como tirar a foto certa, e reenvia.

### 4.4 Adicionar dependente

```
Aluno preenche: nome, CPF, nascimento, parentesco, foto
   → aviso: "após aprovado, o CPF fica travado por 6 meses"
   → aceita → entra na FILA DA ESCOLA
   → escola notificada por e-mail + badge no painel
     + o aluno recebe um botão "avisar a escola pelo WhatsApp" que abre wa.me
       com mensagem pronta para o número da escola
   → escola aprova ou reprova com motivo
   → aprovado: ganha member_code próprio e carteirinha
        ≥18 anos → convite de login próprio
        <18 anos → aparece na carteira do titular
   → slots 3 e 4: pagamento do pacote ANTES de entrar na fila
```

**Trava de 6 meses:** o **CPF** do dependente é imutável por 6 meses após a aprovação. Nome, foto e data de
nascimento podem ser corrigidos, mas a correção também passa pela fila da escola — senão o aluno troca a foto
e o slot vira de outra pessoa, que é o abuso que a trava existe para impedir.

O contador é **por slot, não por pessoa**: remover o dependente não libera o slot antes do prazo. Sem isso a
trava não serve para nada.

**Notificação por WhatsApp sem API:** o envio automático exigiria a Meta Cloud API (custo por mensagem,
aprovação de template, verificação do número). A solução é o **aluno** clicar no link `wa.me` com a mensagem
já preenchida no momento em que envia o pedido — quem dispara é ele, não o servidor. Custo zero, e o aluno
tem todo o interesse em avisar. O e-mail automático para a escola acontece em paralelo, como garantia.

### 4.5 Perda de benefícios em cascata

**Aluno suspenso → todos os dependentes suspensos junto, inclusive os pagos, sem estorno.**

Precisa aparecer em quatro lugares, ou vira reclamação e chargeback:

1. No **termo** que o aluno assina no primeiro acesso, em cláusula destacada
2. Na **tela de pagamento** do pacote, como checkbox obrigatório de ciência
3. Na **notificação de suspensão** enviada ao titular
4. Em **notificação a cada dependente**, explicando o que aconteceu

---

## 5. Validação — o coração do produto

### 5.1 Fluxo no balcão

```
Atendente digita o PIN
  → digita o CPF OU o código do membro (campo único, aceita os dois)
  → SERVIDOR decide
  → VERDE: foto grande + nome + data de nascimento + benefício
    VERMELHO: motivo específico
  → atendente compara o rosto com a foto
  → [modo real] digita o valor da compra → sistema calcula o desconto
    [modo estimado] pula direto
  → CONFIRMAR USO → registrado
```

### 5.2 Identificação: CPF ou código do membro

Cada membro (titular e dependente) tem um código curto e público: **`KNN-7F4K2`**, em destaque na
carteirinha. O campo do balcão aceita os dois — quem decorou o CPF fala o CPF, quem prefere fala o código
(5 caracteres em vez de 11 dígitos, mais rápido de ditar e digitar).

O código também é o que permite **separar os dados de cada dependente**, mesmo os que não têm login.

**Como isso sustenta a promessa de LGPD.** O parceiro digita um CPF, logo o conhece naquele instante — mas
nunca tem acesso à base:

1. **O sistema jamais devolve um CPF.** O atendente digita, o servidor responde sim ou não. Sem busca
   parcial, sem autocompletar, sem "você quis dizer", sem listagem.
2. **Histórico do parceiro mostra CPF mascarado** (`***.456.789-**`). O CPF completo nunca é persistido do
   lado do parceiro.
3. **Rate limit por atendente:** teto de consultas por hora e bloqueio após consultas negativas seguidas. Sem
   isso, um atendente varre CPFs aleatórios para colher nome e foto de estranhos — vazamento de dado pessoal
   com a nossa assinatura em cima.
4. **Alerta de anomalia** para a escola e para o super admin quando um atendente foge do padrão.

E o produto funciona **inteiro** sem CPF nenhum, se a escola quiser: basta usar só o código.

### 5.3 A foto é o fator de autenticação

Sem QR, o modelo de segurança é o atendente comparar o rosto com a foto — como carteirinha de plano de saúde
e meia-entrada há décadas. Exige três apoios:

1. **Foto boa:** moderação obrigatória da escola + guia de enquadramento no upload (rosto centralizado, sem
   óculos escuros, sem boné, sem filtro, fundo claro).
2. **Foto grande:** pelo menos 40% da tela do atendente. Foto pequena significa que ninguém confere, e aí o
   antifraude não existe.
3. **Foto atualizada:** campo `photo_updated_at` e lembrete anual.

**Apoio ao atendente:** a tela verde mostra também a **data de nascimento** do membro. O parceiro decide o
que fazer com isso — pode simplesmente ignorar, ou perguntar em caso de dúvida quando a foto estiver velha ou
a pessoa tiver mudado de visual. O sistema não obriga nada e não expõe dado novo (o atendente lê a data, não
digita).

**Diligência registrada:** a cada N validações o sistema pede um segundo toque de *"confirmo que conferi a
foto"* e registra. Vira prova se houver disputa.

### 5.4 O servidor decide — sempre

O app do parceiro **nunca** decide nada. Envia identificador + benefício, recebe aprovado ou negado.
*(Nas versões anteriores essa lógica vivia em hooks React no cliente e era forjável. Não repetir.)*

| # | Checagem | Motivo da recusa |
|---|---|---|
| 1 | Membro existe | `nao_encontrado` |
| 2 | Foto aprovada | `foto_pendente` |
| 3 | Membro ativo | `aluno_suspenso` · `matricula_cancelada` · `dependente_nao_aprovado` |
| 4 | `valid_until` não venceu | `carteirinha_vencida` |
| 5 | Escola ativa e adimplente | `escola_inativa` |
| 6 | Parceria ativa | `parceria_encerrada` |
| 7 | Benefício vigente (data, dia, horário) | `fora_do_horario` · `promocao_encerrada` |
| 8 | Limite de uso | `limite_atingido` + quando libera |
| 9 | Estoque da promoção | `esgotado` |

### 5.5 Tela de resultado

Lida em 2 segundos, por alguém apressado, com o cliente na frente. Legível a um metro.

```
┌─────────────────────────────────┐   ┌─────────────────────────────────┐
│  VERDE OCUPA A TELA INTEIRA     │   │  VERMELHO OCUPA A TELA INTEIRA  │
│    ┌───────────────┐            │   │    ┌───────────────┐            │
│    │  FOTO GRANDE  │            │   │    │  FOTO GRANDE  │            │
│    │  (>=40% tela) │            │   │    │  (esmaecida)  │            │
│    └───────────────┘            │   │    └───────────────┘            │
│    MARIA SOUZA SILVA            │   │    JOÃO PEREIRA                 │
│    Aluna · KNN Sorocaba         │   │                                 │
│    KNN-7F4K2 · nasc. 14/03/2004 │   │    ⛔ MATRÍCULA CANCELADA       │
│                                 │   │    Não conceder o desconto      │
│  ── 20% OFF no almoço ──        │   │                                 │
│  Seg a sex, 11h às 15h          │   │    Dúvidas? A escola resolve.   │
│  3ª visita · última em 12/ago   │   │                                 │
│                                 │   │                                 │
│  Valor da compra: R$ ____       │   │                                 │
│  Desconto: R$ --                │   │                                 │
│  [   CONFIRMAR USO   ]          │   │    [   VOLTAR   ]               │
└─────────────────────────────────┘   └─────────────────────────────────┘
```

- **A cor toma a tela toda** — o atendente vê verde ou vermelho antes de ler qualquer palavra.
- **Código visível, CPF nunca.**
- **"3ª visita"** transforma o atendente em vendedor: *"opa, você já é de casa!"*
- **Dois passos:** consultar registra a *tentativa*, confirmar registra o *uso*. A diferença entre os dois é
  uma métrica de desistência no balcão que nenhum concorrente tem.
- **Motivo sempre explícito**, apontando para a escola e nunca acusando o cliente na frente da fila.

### 5.6 Cancelamento

Janela de **24h**. `partner_staff` cancela **apenas** registros com `validated_by` = ele mesmo;
`partner_owner` cancela qualquer um da loja. Nada é apagado: vira `result = cancelled` com `cancelled_by`,
`cancelled_at` e motivo. As métricas descontam; a auditoria mantém.

### 5.7 Modo offline [S2]

O PWA do parceiro mantém cache local dos membros ativos das escolas parceiras (código, hash do CPF, nome,
foto em baixa), sincronizado de hora em hora.

Sem internet: valida contra o cache, marca `offline_validated`, `sync_status = pending`.
Ao voltar: **reconciliação com aviso às duas pontas**. Se uma validação offline for reprovada (o aluno tinha
sido suspenso naquela manhã), parceiro **e** escola são avisados, e o registro vira `offline_invalidated` —
ninguém é penalizado, é informação para a escola conversar com o aluno.

O schema já nasce com `offline_validated`, `sync_status` e `synced_at`, mesmo sem a feature construída:
adicionar essas colunas depois, numa tabela grande, seria doloroso.

---

## 6. Benefícios e promoções

### 6.1 Regras de limite de uso

O parceiro escolhe uma ao criar o benefício. **Default: 1 uso por dia, cota por membro.**

| Regra | Uso típico |
|---|---|
| `per_day` — N por dia | **Default (N=1).** Restaurante, cafeteria |
| `unlimited` | Desconto permanente de baixo valor |
| `per_week` | Academia, salão |
| `per_month` | Clínica, oficina |
| `per_semester` | Odontologia, ótica |
| `per_year` | Anuidade, outro curso |
| `once_ever` | Cupom de boas-vindas, brinde |
| `cooldown` — 1 a cada X horas | Evita 3 usos no mesmo turno |
| `total_pool` — N no total | Estoque limitado; combina com as demais |

**Escopo:** `member` por padrão — cada dependente tem cota própria, já que cada um consome individualmente.
Opção `family` para o parceiro que achar 4 cotas separadas caro demais.

### 6.2 Tipos de oferta

| Tipo | O que é | Push |
|---|---|---|
| `permanente` | Desconto base da parceria, não expira | Não |
| `relampago` | Janela curta, horas ou dias | Sim |
| `evento` | Data específica (volta às aulas) | Sim |
| `estoque_limitado` | Primeiros N alunos | Sim |
| **`aniversario`** | Ativa no mês de aniversário do membro | Automático |
| **`primeira_visita`** | Só para quem nunca usou aquele parceiro | Sim |
| **`reconquista`** | Só para quem não vai há 60+ dias | Automático |
| `horario_morto` | Dias e horários específicos | Opcional |
| `progressiva` | A cada N usos, o próximo é maior | Não |

Os três em negrito só são possíveis **porque temos o log de validações**. Nenhum concorrente de carteirinha
oferece promoção automática de aniversário ou de reconquista — é o que prende o parceiro na rede.

### 6.3 Aprovação e tetos

Configurável por escola; **default: o parceiro publica sozinho** e a escola pode remover depois. Promoção
relâmpago com fila de aprovação deixa de ser relâmpago.

**Tetos, ambos editáveis pela escola:**

- **4 promoções relâmpago por parceiro por mês** (default)
- **2 pushes por semana por aluno**, somando **todos** os parceiros (default)

O segundo é o que importa: com 15 parceiros mandando promoção, o aluno desinstala o PWA na segunda semana.
O teto é global por aluno, não por parceiro — quando estoura, a promoção ainda aparece no catálogo, só não
vira notificação.

---

## 7. Modelo de dados (Supabase / Postgres)

```
networks             id, name, slug, logo_url, status

schools              id, network_id?  ← NULLABLE, name, slug, cnpj, city, state,
                     logo_url, brand_color, plan_id, student_limit,
                     free_dependents (2), paid_slots (2),
                     value_capture_mode (estimated|real|partner_choice),
                     promo_approval_mode (auto|manual),
                     monthly_promo_cap (4), weekly_push_cap (2),
                     dependent_billing_cycle (monthly|semester|yearly),
                     whatsapp_number,   ← destino dos links wa.me
                     status, created_at

profiles             id (=auth.users.id), role, school_id?, partner_id?,
                     full_name, cpf UNIQUE, email, phone, avatar_url,
                     status, last_seen_at

members              id, school_id, kind (student|dependent),
                     member_code UNIQUE,        ← "KNN-7F4K2"
                     profile_id?, full_name, cpf, birth_date,
                     photo_url, photo_status (pending|approved|rejected),
                     photo_rejection_reason, photo_updated_at,
                     status (active|suspended|cancelled|graduated),
                     valid_until, activated_at
                     -- titular e dependente na MESMA tabela: ver nota abaixo

students             member_id, enrollment_code, course, class_group,
                     source (manual|import|api), external_id
                     UNIQUE (school_id, cpf)     ← chave da importação idempotente

dependents           member_id, holder_member_id, relationship,
                     slot_type (free|paid), slot_index (1..4),
                     approval_status (pending|approved|rejected),
                     approved_by, approved_at, rejection_reason,
                     cpf_locked_until            ← 6 meses, POR SLOT

partners             id, legal_name, trade_name, cnpj, category_id, description,
                     logo_url, cover_url, phone, whatsapp, instagram, website,
                     avg_ticket, status, owner_profile_id
partner_locations    id, partner_id, label, address, city, lat, lng, opening_hours
partner_staff        id, partner_id, display_name, pin_hash, status, last_used_at

partnerships         id, school_id, partner_id, status (pending|active|paused|ended),
                     invited_by, started_at, ended_at
                     UNIQUE (school_id, partner_id)

benefits             id, partnership_id, title, description,
                     offer_type (permanente|relampago|evento|estoque_limitado|
                                 aniversario|primeira_visita|reconquista|
                                 horario_morto|progressiva),
                     discount_type (percent|fixed|gift|combo), discount_value, terms,
                     limit_rule (per_day|unlimited|per_week|per_month|per_semester|
                                 per_year|once_ever|cooldown|total_pool),
                     limit_qty, limit_scope (member|family), cooldown_hours,
                     valid_weekdays[], valid_from_time, valid_to_time,
                     starts_at, ends_at, max_redemptions, redemptions_count,
                     approval_status, status

validations          id, school_id, partner_id, partner_location_id, benefit_id,
                     member_id, member_kind, validated_by (partner_staff.id),
                     method (cpf|member_code),
                     result (approved|denied|cancelled|offline_invalidated),
                     deny_reason, purchase_amount?, discount_amount, saved_amount,
                     value_mode (estimated|real), photo_confirmed,
                     offline_validated, sync_status, synced_at,
                     cancelled_by, cancelled_at, cancel_reason, created_at
                     -- APPEND-ONLY. É o ativo do produto.

validation_attempts  id, partner_staff_id, input_hash, result, ip, created_at
                     ← alimenta o rate limit e a detecção de varredura

consents             id, profile_id, doc_type, doc_version, accepted_at,
                     ip, user_agent, signature_hash
audit_logs           id, actor_id, actor_role, school_id?, action, entity,
                     entity_id, before, after, justification, ip, created_at
import_jobs          id, school_id, filename, mode (upsert|full_sync), status,
                     total, created, updated, suspended, failed, error_report, created_by
change_requests      id, school_id, requester_id, target_member_id, entity, field,
                     current, requested, status, reviewed_by, reviewed_at, reason
plans                id, name, max_students, monthly_price, features
subscriptions        id, payer_profile_id, school_id,
                     kind (school_plan|dependent_pack),   ← PACOTE, não por dependente
                     gateway (asaas), gateway_customer_id, gateway_sub_id,
                     amount, cycle (monthly|semester|yearly), status,
                     trial_ends_at, current_period_end
notifications        id, target_type, target_id, kind, title, body, deep_link,
                     read_at, sent_at
push_subscriptions   id, profile_id, endpoint, keys, device
partner_categories   id, name, icon, sort_order
```

**Por que `members` é uma tabela só:** o motor de validação (§5.4) precisa responder em menos de um segundo,
igual para titular e dependente. Em duas tabelas, cada checagem viraria um `UNION` e cada regra de negócio
seria escrita duas vezes — é exatamente onde nascem bugs do tipo "o dependente usou mesmo suspenso".
`students` e `dependents` guardam só o que é específico de cada um.

**Índices obrigatórios:**
`members(school_id, cpf)` · `members(member_code)` · `validations(school_id, created_at DESC)` ·
`validations(partner_id, created_at DESC)` · `validations(member_id, benefit_id, created_at DESC)` ← limite de
uso · `validation_attempts(partner_staff_id, created_at DESC)` ← rate limit.

**RLS:** funções `auth_role()`, `auth_school_id()`, `auth_partner_id()` lendo custom claims do JWT, com
política em toda tabela que tem `school_id` ou `partner_id`. **Antes de qualquer tela, um teste automatizado
tenta ler dados da escola B logado como escola A e falha.** Nas versões anteriores, duas migrations existiram
só para consertar RLS — desta vez ela é a primeira coisa testada, não a última.

**Views materializadas** (nunca `COUNT(*)` ao vivo em `validations`):
`mv_school_daily` · `mv_partner_daily` · `mv_member_savings` · `mv_partner_health`.

---

## 8. Dados e inteligência

### 8.1 Super Admin — os dados mais completos da plataforma

Painel global com **filtros combináveis: região (UF, cidade), rede, escola, categoria de parceiro, plano,
período**. Tudo exportável.

| Bloco | Conteúdo |
|---|---|
| Negócio | MRR, ARR, ARPU, receita de pacotes de dependente, churn, LTV, inadimplência |
| Rede | Escolas ativas, alunos, dependentes, parceiros, parcerias ativas |
| Uso | Validações por dia, região e categoria; ticket médio; desconto concedido; top parceiros do Brasil |
| Saúde | **Health score por escola** (ativação + MAU + parceiros ativos + validações/aluno), com ranking de risco de churn |
| Comparativo | Benchmark entre escolas e regiões — qual cidade converte melhor, qual categoria domina onde |
| Operação | Moderação atrasada por escola, importações com erro, parceiros sem benefício cadastrado |
| Auditoria | Log completo, toda impersonação, alertas de anomalia de validação |

### 8.2 Escola

Taxa de ativação (% que abriu a carteirinha) · MAU · **economia total gerada (R$)** · validações por mês,
turma e categoria · top parceiros · **parceiros com zero uso em 30 dias** · dependentes por aluno · alunos que
nunca usaram · filas de moderação e aprovação.

A economia acumulada é o número do folder de matrícula: *"nossos alunos economizaram R$ 38.400 em 2026"*.

### 8.3 Parceiro

Validações e **clientes únicos** · novos vs. recorrentes · heatmap de dias e horários · desconto concedido vs.
receita estimada · **benchmark anônimo** ("top 20% de alimentação da rede") · taxa consultou→confirmou.

### 8.4 Aluno

**Economia acumulada** no topo · histórico por parceiro · benefícios nunca usados · "perto de você".

### 8.5 Backlog de dados (todos aprovados)

Heatmap de horários · alerta automático de parceria em risco · ranking de alunos com opt-in ·
**NPS de 1 clique após a validação** · **relatório mensal em PDF automático** para escola e parceiro ·
previsão de economia anual por aluno · exportação total em CSV.

Prioridade dentro do backlog: **relatório PDF mensal** primeiro (é a melhor arma contra churn de parceiro —
faz ele lembrar todo mês que a parceria existe), **NPS** em seguida (dado que nenhum concorrente tem).

---

## 9. LGPD, contratos e retenção

**Documentos a redigir** — rascunhos escritos internamente, **advogado revisa antes do lançamento**:

| Documento | Quem aceita | Quando |
|---|---|---|
| Termos de Uso + Política de Privacidade | Todos | Primeiro acesso |
| Termo de Consentimento do Aluno (imagem, CPF, compartilhamento com parceiros) | Aluno | Primeiro acesso |
| Termo do Responsável por dependente menor de 18 | Titular | Ao cadastrar |
| Ciência de perda de benefícios sem estorno | Titular | Na tela de pagamento |
| Contrato de Prestação de Serviço | Escola | Onboarding |
| Termo de Adesão do Parceiro (o que pode e não pode fazer com o dado) | Parceiro | Onboarding |

Todo aceite é **versionado** (`doc_version`, `accepted_at`, `ip`, `user_agent`, hash do documento). Se o texto
mudar, o aceite é pedido de novo — sem isso o consentimento não prova nada.

**Regras técnicas:**

- O parceiro vê: foto, nome, escola, status, código, data de nascimento e histórico de visitas **naquele
  parceiro**. Nada mais. Nunca e-mail, telefone ou CPF completo.
- Fotos em bucket privado com URL assinada de curta duração. Nunca bucket público.
- **Retenção: 5 anos anonimizados.** Membro cancelado tem os dados pessoais anonimizados; `validations`
  permanece com o vínculo quebrado, como dado estatístico.
- Rate limit e `validation_attempts` (§5.2) são o controle que prova que não permitimos varredura da base.

---

## 10. Monetização

### 10.1 Escola

| Plano | Alunos | Preço/mês |
|---|---|---|
| Essencial | até 200 | **R$ 50** |
| Crescimento | até 500 | R$ 120 |
| Rede | até 1.000 | R$ 220 |
| Rede+ | acima de 1.000 | sob consulta |

**O parceiro nunca paga.** É a contrapartida do desconto que ele concede, e é o que mantém a rede crescendo
sem esforço comercial.

### 10.2 Pacote de dependentes

**Vendido como pacote de 2 slots, não por dependente.** O aluno que quer apenas 1 dependente extra compra o
espaço dos 2 do mesmo jeito.

| Ciclo | Preço | Desconto |
|---|---|---|
| Mensal | R$ 9,90 | — |
| Semestral | R$ 49,90 | 16% |
| Anual | R$ 89,90 | 24% |

O ciclo é escolhido pela **escola**, alinhado ao calendário de rematrícula. **30 dias de trial.** O aluno paga
direto à plataforma via **Asaas** (Pix, boleto, cartão recorrente). A escola não recebe comissão no v1 —
simplifica o financeiro e evita que quem aprova a fila de dependentes seja parte interessada no resultado.

Fluxo: assinatura no Asaas → webhook confirma → dependentes entram na fila da escola → aprovados → ativos.
Inadimplência: 2 lembretes, depois suspende **os dependentes pagos**, nunca o titular.

### 10.3 A matemática que orienta o produto

> Escola de 200 alunos: **R$ 50/mês** de assinatura.
> Se 20% dos alunos comprarem o pacote → 40 × R$ 9,90 = **R$ 396/mês** do mesmo tenant.
> **O pacote de dependentes vale 8× a assinatura da escola.**

Consequência de produto: **o fluxo de comprar o pacote precisa ser tão bom quanto a carteirinha.** Não pode
ser uma tela escondida no perfil — merece um card permanente na carteirinha: *"traga sua família"*.

---

## 11. Fora de escopo do v1

QR code · pagamento no app e cashback · reviews de parceiros · chat aluno↔parceiro · app nativo nas lojas ·
marketplace de cupons vendidos · integração com catraca · carteirinha física · multi-idioma · gamificação.

**Backlog:** WhatsApp oficial via Meta Cloud API · Google Planilha com releitura manual · integração com ERP
da escola (já previsto no schema via `external_id` e `source`) · NPS pós-validação · relatório PDF mensal ·
heatmap · alerta de parceria em risco · ranking de alunos · vitrine pública `/e/[slug]` · geolocalização ·
comunicação em massa · destaque patrocinado.

---

## 12. Roadmap

### Semana 1 — piloto no ar (50 alunos, 1 unidade KNN)

| Dia | Entrega |
|---|---|
| **1** | Repo, Next 15 + TS + Tailwind + shadcn, Supabase, **deploy na Vercel funcionando**. Schema completo + RLS + **teste de isolamento de tenant** + seed. `config/brand.ts` |
| **2** | Auth, custom claims, login único com redirect por papel, layouts das 5 personas, design system |
| **3** | Super admin cria escola (com e sem rede) → `school_admin` → convite → wizard. Escola cadastra aluno e envia convite |
| **4** | Primeiro acesso do aluno: senha, foto, termo. Moderação de foto. **Carteirinha white-label com `member_code`** |
| **5** | Parceiro: onboarding, perfil, benefício com regra de uso, atendente com PIN. **Motor de validação server-side + tela verde/vermelha** |
| **6** | Confirmação com valor real/estimado, cancelamento 24h, registros do atendente, catálogo e histórico do aluno |
| **7** | **Importação CSV**, PWA instalável, roteiro de aceite do §15, dados reais do piloto |

### Semanas 2–3

Dependentes grátis com fila de aprovação e links `wa.me` → dashboards de escola e parceiro → pacote pago com
Asaas → promoções e push com tetos → fila de solicitações de alteração → modo offline → relatório PDF mensal.

---

## 13. Lista de parentescos

**Família nuclear:** Cônjuge · Companheiro(a) / união estável · Filho(a) · Enteado(a) · Pai · Mãe · Irmão / Irmã
**Estendida:** Avô / Avó · Neto(a) · Bisavô / Bisavó · Tio(a) · Sobrinho(a) · Primo(a) · Padrasto / Madrasta · Meio-irmão / meia-irmã
**Por afinidade:** Sogro(a) · Genro / Nora · Cunhado(a) · Padrinho / Madrinha · Afilhado(a)
**Jurídico:** Filho(a) adotivo(a) · Tutelado(a) / sob guarda · Curatelado(a)
**Outros:** Amigo(a) · Colega de república · Outro *(exige descrição livre)*

"Amigo(a)" e "Outro" ficam na lista de propósito: sem eles, quem quisesse incluir alguém de fora da família
escolheria "Primo(a)" e mentiria — e aí perderíamos o dado, que é justamente o que interessa ao parceiro para
entender o público real. Sem limite de idade e sem exigência de sobrenome ou endereço, "amigo" já é um caso
legítimo de qualquer forma.

---

## 14. Princípios de engenharia

Extraídos das 5 tentativas anteriores. Não são sugestões.

| O que deu errado antes | Regra |
|---|---|
| 5 reinícios, nenhum em produção | **A semana 1 vai ao ar em produção.** Deploy contínuo desde o commit 1 |
| `AdminDashboard.tsx` com 70 KB, `LoginScreen.tsx` com 56 KB | **Nenhum arquivo passa de ~300 linhas.** Um login só, com redirect por papel |
| `tsc_errors.log` de 16 KB, build quebrado | **CI com `tsc --noEmit` + lint bloqueando merge** |
| Schema em 6 migrations + "Script de Reset Total" | Migrations versionadas com timestamp real. **Nunca resetar.** Seed separado |
| Validação de QR no cliente | **Toda decisão no servidor** |
| RLS instável, 2 migrations só para consertar | RLS no dia 1, com teste de isolamento automatizado |
| Vite SPA em 4 versões, Next em 1, nunca convergiu | **Next.js App Router**, decidido e travado |
| 25 documentos para um app que não compilava | Este PRD é o último documento longo |

**Por que Next.js e não SPA:** a validação precisa rodar no servidor, a Vercel é o ambiente natural do Next, e
a vitrine pública precisa de SEO. SPA obrigaria a manter Edge Functions em Deno em paralelo — dois runtimes,
dois deploys, e foi exatamente onde as versões anteriores se perderam.

---

## 15. Critérios de aceite do dia 7

Testados manualmente, ponta a ponta, **em produção**:

1. Super admin cria escola **com** rede e **sem** rede; a interface esconde o nível de rede na segunda
2. `school_admin` recebe convite, define senha, cai no painel certo
3. Escola cadastra aluno → aluno recebe link → define senha → sobe foto → aceita termo
4. Aluno com foto pendente vê o catálogo mas **não valida** (`foto_pendente`)
5. Escola reprova a foto com motivo → aluno é avisado → reenvia → aprovada → libera
6. Parceiro completa perfil, cria benefício "20% seg–sex 11h–15h, 1 uso/dia", cadastra atendente com PIN
7. Atendente digita PIN → digita CPF → **tela verde com foto grande em menos de 2s** → confirma com valor
8. A mesma validação funciona digitando o **código do membro** em vez do CPF
9. Aparece no histórico do parceiro **e** no do aluno, com a economia calculada
10. Mesmo aluno no mesmo dia → **`limite_atingido`** com a data de liberação
11. Tentativa às 16h → **`fora_do_horario`** · aluno suspenso → **`aluno_suspenso`**
12. Atendente A **não** cancela o registro de B; cancela o próprio dentro de 24h
13. 25 CPFs inexistentes seguidos → atendente bloqueado, escola alertada
14. Importação de 50 alunos; **reimportar o mesmo arquivo não duplica nada**
15. Escola A não enxerga **nenhum** dado da escola B *(automatizado)*
16. Carteirinha instala na tela de início do iPhone e do Android; Lighthouse >=90 em 4G real

**Testes automatizados obrigatórios:** isolamento de tenant por RLS · motor de decisão da validação (cada
motivo de recusa) · idempotência da importação · cada `limit_rule` · trava de 6 meses do CPF do dependente.

---

## 16. Decisões pendentes de terceiros

- **Nome definitivo e domínio** — o produto opera em subdomínio da Vercel até lá; a marca vive só em `config/brand.ts`
- **Revisão jurídica** dos 6 documentos do §9, antes do lançamento comercial
- **API da KNN** para sincronizar matrículas — se surgir, o schema já está preparado (`external_id`, `source`)
