# Log de Decisões — UniPass

Registro de decisões de produto e arquitetura, com o motivo. Serve para não reabrir discussão já encerrada e
para entender, meses depois, por que algo é do jeito que é.

Decisões revertidas ficam no log, marcadas como **SUPERADA**, com link para a que as substituiu.

---

## 2026-09-10 — Rodada de definição do PRD v1.0

Todas as decisões abaixo foram tomadas por **Caio (product owner)** nas duas rodadas de perguntas que geraram
o [PRD.md](PRD.md).

### Produto e escopo

| ID | Decisão | Motivo |
|---|---|---|
| **D01** | **Sem QR code.** Validação por CPF ou código do membro + confirmação visual por foto | Exigir leitor de QR é atrito no lado mais frágil do marketplace (o parceiro), e o atendente já digita os dados da venda de qualquer forma. Efeito colateral positivo: o aluno não precisa de celular, bateria nem internet |
| **D02** | Nível **Rede/Franqueadora existe, mas é opcional** (`network_id` nullable) e some da interface quando vazio | KNN é franquia, mas o produto também será vendido a escolas independentes. Custo hoje: 1 tabela e 1 coluna. Migrar depois seria caro |
| **D03** | Dependente **≥18 anos tem login próprio**; menor aparece na carteira do titular | Reflete a realidade (o filho de 22 anos vai sozinho ao restaurante) sem criar conta para criança, o que simplifica a LGPD |
| **D04** | **Todo dependente passa por aprovação da escola** antes de usar a carteirinha | O parceiro só confia na rede se a escola for a fonte da verdade sobre quem tem direito |
| **D05** | **Todo membro tem `member_code` individual** (ex.: `KNN-7F4K2`), titular e dependentes | Permite separar os dados de uso de cada pessoa, inclusive de quem não tem login. Serve também como identificador não sensível no balcão (ver D06) |
| **D06** | O campo de validação aceita **CPF ou código**, indiferentemente | Resolve o conflito entre "o aluno já sabe o CPF de cor" e "o parceiro não deve depender de CPF". O código é mais rápido de ditar e não é dado sensível |
| **D07** | **Máximo 4 dependentes:** 2 grátis + pacote pago de 2 | Limite claro, fácil de comunicar e de precificar |
| **D08** | **Sem foto aprovada, sem desconto** | A foto é o único fator de autenticação, por consequência de D01. Sem ela o modelo de segurança não existe |
| **D09** | O aluno sobe a própria foto; a escola modera com motivo de recusa | Zero trabalho de digitalização para a secretaria, com controle de qualidade onde importa |
| **D10** | **CPF do dependente travado por 6 meses** após aprovação, e a trava é **por slot**, não por pessoa | Impede que o slot rode entre várias pessoas. Se fosse por pessoa, bastaria remover e recadastrar |
| **D11** | Status do aluno vem de **reimportação de CSV** (`full_sync` suspende quem sumiu) **+** campo `valid_until` | Alinhado à rotina real da secretaria. O schema já está preparado para uma futura API da KNN (`external_id`, `source`) |
| **D12** | Convite ao aluno por **e-mail + lista de links `wa.me`** para a coordenação disparar; código impresso como alternativa | WhatsApp tem taxa de abertura muito maior no Brasil, sem custo de API |
| **D13** | Validação cancelável em **24h**, só pelo atendente que a registrou | O cliente desiste da compra. 24h porque o atendente consulta a lista de registros anteriores; restrito ao autor para manter rastreabilidade |
| **D14** | **Atendente identificado por PIN de 4 dígitos**, com o dispositivo logado no parceiro | Consequência direta de D13: sem identidade individual não existe "o registro que ele mesmo fez". PIN é o padrão de PDV — sem e-mail, sem senha forte |
| **D15** | Valor economizado: **estimado por padrão + valor real digitado**, e **a escola escolhe o modo** | Alguns parceiros querem dado exato, outros não querem atrito no caixa. Para o aluno, a estimativa já cumpre o papel |
| **D16** | Promoção do parceiro **publica sozinha por padrão**, configurável por escola, com teto mensal | Promoção relâmpago com fila de aprovação deixa de ser relâmpago |
| **D17** | Teto de **2 pushes por semana por aluno**, somando todos os parceiros — editável pela escola | Com 15 parceiros notificando, o aluno desinstala o PWA. O teto é global por aluno, não por parceiro |
| **D18** | Aluno suspenso → **dependentes suspensos junto, sem estorno** | Regra simples e defensável. Precisa estar em contrato, na tela de pagamento e nas notificações, ou vira chargeback |
| **D19** | Modo offline **não entra no MVP**, mas o schema já nasce com `offline_validated`, `sync_status`, `synced_at` | Adicionar essas colunas depois, numa tabela grande de validações, seria doloroso |
| **D20** | A lista de parentescos **inclui "Amigo(a)" e "Outro"** | Sem eles, quem quer incluir alguém de fora da família escolhe "Primo(a)" e mente — e perdemos justamente o dado que interessa ao parceiro |

### Negócio

| ID | Decisão | Motivo |
|---|---|---|
| **D21** | Escola paga **R$ 50/mês até 200 alunos**, com tiers acima | Preço baixo derruba a objeção de venda. Consequência assumida: o volume comercial precisa ser grande |
| **D22** | **O parceiro nunca paga** | É a contrapartida do desconto que ele concede, e o que faz a rede crescer sem esforço comercial |
| **D23** | Dependentes extras vendidos como **pacote de 2 slots**, não por dependente | Simplifica a comunicação e aumenta o ticket: quem quer 1 compra 2 |
| **D24** | Preço do pacote: **R$ 9,90/mês · R$ 49,90/semestre · R$ 89,90/ano**, ciclo escolhido pela escola | O ciclo acompanha o calendário de rematrícula de cada escola |
| **D25** | O **aluno paga direto à plataforma**, via **Asaas**. Escola sem comissão no v1 | A escola não quer virar cobradora. Sem comissão, quem aprova a fila de dependentes não é parte interessada no resultado |
| **D26** | **O pacote de dependentes é o modelo de negócio**, não um extra | Uma escola de 200 alunos rende R$ 50 de assinatura e até ~R$ 396/mês em pacotes. O fluxo de compra precisa ser tão bom quanto a carteirinha |

### Técnicas

| ID | Decisão | Motivo |
|---|---|---|
| **D27** | **Next.js 15 App Router + TypeScript + Tailwind + shadcn/ui** | A validação precisa rodar no servidor e a Vercel é o ambiente natural do Next. SPA obrigaria a manter Edge Functions em Deno em paralelo — dois runtimes, e foi onde as versões anteriores se perderam |
| **D28** | **Supabase** (Postgres + Auth + Storage + RLS) e **Vercel** | Confirmado pelo product owner; é também o que todas as 5 tentativas anteriores usavam |
| **D29** | **PWA primeiro**, app nativo depois | Instala na tela de início, funciona offline, e evita 2 lojas, 2 revisões e taxa de 30% em pagamentos in-app |
| **D30** | **`members` é uma tabela única** para titular e dependente | O motor de validação consulta um lugar só. Em duas tabelas, cada regra seria escrita duas vezes — é onde nascem bugs do tipo "o dependente usou mesmo suspenso" |
| **D31** | **Toda decisão de validação no servidor.** O cliente nunca decide | Nas versões anteriores a lógica vivia em hooks React e era forjável |
| **D32** | **RLS no dia 1**, com teste automatizado de isolamento entre tenants | Nas versões anteriores duas migrations existiram só para consertar RLS. Desta vez é a primeira coisa testada |
| **D33** | **Rate limit + `validation_attempts` por atendente** | Sem isso, um atendente varre CPFs aleatórios para colher nome e foto de estranhos. É o controle que prova que não permitimos varredura da base |
| **D34** | **Toda a marca vive em `src/config/brand.ts`** | O nome "UniPass" é provisório. Trocar a marca deve ser a edição de um arquivo, não uma varredura no repositório |
| **D35** | Carteirinha **white-label**: marca da escola em destaque, "by UniPass" no rodapé | A escola vende melhor e nós ganhamos distribuição |
| **D36** | **Nenhum arquivo passa de ~300 linhas**; CI com `tsc --noEmit` bloqueando merge | Nas versões anteriores havia componentes de 70 KB e um `tsc_errors.log` de 16 KB. Foi o que inviabilizou a manutenção |
| **D37** | Google Planilha, quando entrar, terá **botão manual de "reler planilha"** — nunca sincronização automática | Planilha compartilhada é renomeada por quem não sabe que existe um sistema lendo. A releitura reconfirma as colunas e falha com erro explícito |
| **D38** | Notificação de dependente para a escola: **e-mail automático + botão `wa.me` clicado pelo aluno** | Envio automático por WhatsApp exigiria a Meta Cloud API (custo, template aprovado, número verificado). Quem dispara é o aluno, que tem todo o interesse em avisar |

### LGPD

| ID | Decisão | Motivo |
|---|---|---|
| **D39** | O parceiro **nunca** vê CPF completo, e-mail ou telefone. Vê foto, nome, escola, status, código, data de nascimento e o histórico de visitas naquele parceiro | Protege a escola, protege o aluno e é argumento de venda |
| **D40** | A tela de validação mostra a **data de nascimento** ao atendente | Apoio opcional quando a foto está velha ou a pessoa mudou de visual. O parceiro decide se usa; o atendente lê, não digita |
| **D41** | **Retenção de 5 anos anonimizados.** Membro cancelado tem os dados pessoais anonimizados; `validations` sobrevive com o vínculo quebrado | Preserva a estatística sem preservar a pessoa |
| **D42** | Todo aceite é **versionado** (`doc_version`, `accepted_at`, `ip`, `user_agent`, hash) | Consentimento sem versão não prova nada. Se o texto muda, o aceite é pedido de novo |
| **D43** | Rascunhos dos 6 documentos legais escritos internamente, **revisão por advogado antes do lançamento comercial** | Tratamos CPF, foto e menores de idade |

### Escopo e prazo

| ID | Decisão | Motivo |
|---|---|---|
| **D44** | Piloto: **1 unidade KNN, ~50 alunos** | Escopo pequeno, feedback rápido, e o product owner controla as duas pontas |
| **D45** | **A semana 1 entrega o piloto no ar.** Ficam para as semanas 2–3: dependentes, dashboards, Asaas, promoções, offline | Com 50 alunos não há dependentes pagos suficientes nem dado para alimentar dashboard. A prioridade é o corte vertical funcionando em produção |
| **D46** | Construir por **corte vertical**, não por persona | As 5 tentativas anteriores construíram dashboards inteiros que nunca se conectaram. A primeira entrega atravessa o produto de ponta a ponta |

---

## Pendências de terceiros

- **Nome definitivo e domínio** — até lá, subdomínio da Vercel; a marca só em `config/brand.ts` (D34)
- **Revisão jurídica** dos 6 documentos legais (D43)
- **API da KNN** para matrículas — schema já preparado (D11)

---

## Decisões a revisitar

| Quando | O quê |
|---|---|
| Após o piloto | **D21** — R$ 0,25/aluno/mês exige ~200 escolas para R$ 10k de MRR. Reavaliar com dados reais de adesão ao pacote de dependentes |
| Se um parceiro grande exigir | **D01** — o QR code pode voltar como opção adicional, nunca como substituto do CPF/código |
| Ao passar de ~10 escolas | **D19** — o modo offline deixa de ser opcional quando houver parceiro com internet ruim reclamando |

---

## Legado

Existem 5 tentativas anteriores abandonadas em pastas irmãs (`unipass.id`, `unipass-foundation`,
`Student ID`, `unipass-id-digital`, e docs em `infos/`). Nenhuma foi a produção.

**O schema antigo (`unipass-id-digital/infos_app/sql/Consolidated_Schema_v2.sql`) está desatualizado por
construção** — foi escrito quando o produto tinha QR dinâmico, não tinha aprovação de dependente e não tinha
código de membro. O schema do §7 do PRD é o oficial; o antigo serve apenas como fonte de ideias e de regras
de negócio da KNN que possam não ter sido capturadas aqui.
