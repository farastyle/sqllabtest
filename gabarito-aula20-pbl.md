# Gabarito do Instrutor — Aula 20 · PBL: Mapear Ameaças e Riscos (PedeJá)

> **Uso:** material exclusivo do instrutor, para os 15–20 min de explicação após o exercício.
> Não distribuir aos alunos antes da entrega final. Acompanhe as entregas em `/pbl/painel-professor`.

**Roteiro sugerido da explicação (15–20 min):**
1. Superfície de ataque — o que era esperado no mapa (4 min)
2. STRIDE — ameaças por componente, puxando exemplos das entregas dos grupos (6 min)
3. Autenticação — dissecar o token do PedeJá (4 min)
4. Tabela de riscos priorizados "oficial" + revelação das pegadinhas (4 min)

---

## As pegadinhas plantadas no cenário

O texto do cenário descreve tudo como se fosse normal ("aceita quantas tentativas forem necessárias", "para facilitar a depuração"). Um QA atento deveria estranhar:

| # | Pegadinha | Onde estava no texto | Por que é grave |
|---|-----------|----------------------|-----------------|
| 1 | **Login sem rate limit** | "`POST /auth/login` aceita quantas tentativas forem necessárias" | Brute force / credential stuffing livre. É a porta de entrada mais barata para o atacante. |
| 2 | **JWT sem expiração + sem revogação + localStorage** | "o token não tem data de expiração — vale até o usuário trocar a senha"; "não existe refresh token nem lista de revogação"; "guarda no localStorage" | Token vazado = acesso permanente à conta. localStorage é legível por qualquer XSS. É a pegadinha central da aula 19 aplicada aqui. |
| 3 | **Cartão completo (com CVV) gravado em log** | "`POST /pagamentos`: em caso de erro, o corpo completo da requisição é gravado no log" | Dado de cartão em claro fora do fluxo PCI. Logs são copiados, retidos, acessados por gente sem necessidade. Vazamento silencioso. |
| 4 | **`/admin/relatorios` no gateway público** | "usado só pelo time interno, mas publicado no mesmo gateway" | "Interno" não é controle de acesso. Se o JWT não diferencia `role` de verdade, qualquer usuário autenticado lê vendas de todos os restaurantes. |
| 5 | **Preço calculado no cliente** | "`POST /pedidos`: o app envia os itens e o preço total já calculado no celular" | Confiar em valor vindo do cliente = pedido de R$ 100 pago como R$ 1. Regra de ouro: preço se calcula no servidor. |
| 6 | **IDs sequenciais** em `/usuarios/{id}` e `/pedidos/{id}` | "IDs são sequenciais (1001, 1002...)" | Convite ao IDOR: basta iterar o ID para enumerar perfis (com CPF!) e pedidos — **se** não houver checagem de dono no servidor. Conecta com a aula de IDOR da Semana 3. |

> Critério de sucesso do exercício: o grupo encontrou **pelo menos as pegadinhas 1, 2 e 3**. As demais são diferencial.

---

## Etapa 1 — Superfície de ataque (gabarito)

### 1. Pontos de entrada esperados

- Os **8 endpoints** da API via API Gateway (cada um é um ponto de entrada individual)
- **3 aplicações cliente**: app do consumidor, painel web do restaurante, app do entregador — cada uma com seu fluxo de login
- **Respostas/callbacks das integrações externas**: retorno do PagFácil (confirmação de pagamento), respostas do MapaZap e do NotifyHub — dados de fora que entram no sistema
- O **fluxo de localização do entregador** (entrada contínua, a cada 10s — volume alto, dado sensível)
- *Além dos endpoints (a pergunta pedia):* o **formulário de cadastro** (entrada de CPF/endereço), e conceitualmente os **logs** e o **banco compartilhado** como superfície interna

**Erro comum a corrigir no gabarito:** listar só os endpoints. Superfície de ataque inclui integrações, canais de entrada de dados e qualquer lugar onde dado não confiável entra.

### 2. Integrações externas e dados que trafegam

| Integração | Dados que trafegam | Preocupação |
|------------|--------------------|-------------|
| PagFácil | Número do cartão, validade, CVV, valor | Dado PCI atravessando nosso serviço; erro vira log (pegadinha 3) |
| MapaZap | Endereços de clientes e restaurantes | Endereço residencial saindo para terceiro |
| NotifyHub | Tokens de push, conteúdo das notificações | Conteúdo pode vazar dados do pedido |

### 3. Endpoints mais críticos (resposta esperada)

- `POST /pagamentos` — cartão em claro + log do corpo em erro
- `GET /usuarios/{id}` — CPF + endereço com ID sequencial (IDOR)
- `POST /auth/login` — sem rate limit
- `GET /admin/relatorios` — "interno" exposto publicamente
- `GET /entregadores/{id}/localizacao` — posição em tempo real de uma pessoa física (risco de segurança física/stalking — poucos grupos notam; vale destacar)

---

## Etapa 2 — STRIDE (gabarito por componente)

Exigido: ≥3 componentes. Tabela de referência para conduzir a discussão (escolha os que os grupos usaram):

| Componente | Ameaça | Categoria STRIDE | Impacto |
|------------|--------|------------------|---------|
| Serviço de Autenticação | Brute force / credential stuffing no login sem rate limit | **S**poofing | Tomada de contas em massa |
| Serviço de Autenticação | Token sem `exp` forjável se o segredo HS256 vazar (segredo único compartilhado pelos 3 serviços) | **S**poofing / **E**levation | Acesso permanente como qualquer usuário |
| API Gateway | Enumeração de IDs sequenciais em `/usuarios/{id}` e `/pedidos/{id}` | **I**nformation Disclosure | Vazamento de CPF, endereço e histórico de toda a base |
| API Gateway | Inundação do endpoint de localização (entrada a cada 10s, sem limite descrito) | **D**enial of Service | App fora do ar em horário de pico |
| Serviço de Pedidos | Adulteração do preço enviado pelo app | **T**ampering | Fraude financeira direta |
| Serviço de Pedidos | Sem trilha de auditoria descrita — restaurante nega ter recusado pedido / cliente nega pedido | **R**epudiation | Disputas sem prova, prejuízo operacional |
| Serviço de Pagamentos | Cartão com CVV nos logs de erro | **I**nformation Disclosure | Vazamento PCI, multas, fraude com cartões |
| Banco de Dados | Banco único compartilhado: comprometeu um serviço, leu tudo (cartões, CPFs, pedidos) | **I**nformation Disclosure / **E**levation | Blast radius total — sem segregação |
| App do Cliente | XSS no WebView lê o JWT do localStorage | **I**nformation Disclosure → **S**poofing | Sequestro de sessão permanente (token nunca expira) |
| `/admin/relatorios` | Usuário comum acessa relatório interno se `role` não for validada | **E**levation of Privilege | Dados comerciais de todos os restaurantes expostos |

**Pontos de ensino ao corrigir:**
- Uma mesma falha pode aparecer em mais de uma categoria — STRIDE é lente, não gaveta.
- **R (Repudiation)** é a categoria que quase nenhum grupo preenche — usar como gancho: "quem aqui pensou em auditoria?"
- Cobrar impacto **concreto** ("vaza CPF de toda a base") em vez de genérico ("dados vazam").

---

## Etapa 3 — Autenticação por token (gabarito)

### 1. O que falta no ciclo de vida do JWT do PedeJá

Comparando com o ciclo saudável (aula 19):
- **Sem claim `exp`** — token nunca expira
- **Sem refresh token** — logo, sem rotação
- **Sem revogação** (denylist) — logout não invalida nada no servidor
- **Armazenamento inseguro** — localStorage em WebView (exposto a XSS), em vez de armazenamento seguro/cookie HttpOnly
- **Segredo HS256 único compartilhado por 3 serviços** — triplica os pontos onde o segredo pode vazar; vazou, forja-se token de qualquer usuário (inclusive `role: admin`)

### 2. Se um token vazar hoje, o que a equipe consegue fazer?

**Praticamente nada.** Não há `exp`, não há denylist, não há refresh para rotacionar. A única saída é o **usuário** trocar a senha (a equipe nem consegue forçar isso token a token) — ou trocar o segredo global, o que **desloga todos os usuários do app de uma vez**. Essa é a resposta-chave da etapa: a ausência de ciclo de vida transforma um incidente pequeno em incidente sem remédio.

### 3. Riscos de autenticação esperados (≥2 destes)

1. **Token vazado = acesso vitalício** à conta (sem exp, sem revogação) → fraude, compras, exposição de dados pessoais.
2. **XSS no app rouba o token do localStorage** → sequestro de sessão em escala; combinado com o risco 1, permanente.
3. **Vazamento do segredo HS256** (que vive em 3 serviços) → forja de token com `role` arbitrária → controle total, inclusive `/admin/relatorios`.
4. **Brute force no login sem rate limit** → tomada de contas mesmo sem nenhum vazamento de token.
5. **Payload legível** — se colocarem CPF/dados no payload, qualquer um que capture o token lê (Base64 ≠ criptografia).

---

## Entrega final — Tabela de riscos priorizados "oficial"

Referência para comparar com as tabelas dos grupos (a ordem exata pode variar — o que importa é a **justificativa** probabilidade × impacto):

| # | Risco | Probabilidade | Impacto | Prioridade |
|---|-------|---------------|---------|------------|
| 1º | Dados de cartão com CVV gravados em log de erro | Alta (acontece sozinho, a cada erro) | Alta (PCI, multas, fraude) | **Crítica** |
| 2º | JWT sem expiração/revogação em localStorage — vazou, é para sempre | Alta | Alta | **Crítica** |
| 3º | IDOR por IDs sequenciais expõe CPF/endereço/pedidos de toda a base | Alta (trivial de explorar) | Alta (LGPD) | **Crítica** |
| 4º | Login sem rate limit → credential stuffing | Alta | Média/Alta | **Alta** |
| 5º | Preço do pedido calculado no cliente → fraude financeira | Média | Alta | **Alta** |
| 6º | `/admin/relatorios` acessível a qualquer autenticado | Média | Média | **Média** |

**Discussão de fechamento (2 min):** por que o log de cartão ganha do IDOR? Porque nem precisa de atacante — o vazamento já está acontecendo a cada erro de pagamento. Priorizar não é ranquear "o ataque mais legal", é ranquear **probabilidade × impacto**. E fechar amarrando a semana: Etapa 1 foi a aula 17, Etapa 2 a aula 16, Etapa 3 as aulas 18–19 — o PBL foi o threat model inteiro, do mapa ao plano de ação, que é exatamente o papel do QA em segurança.
