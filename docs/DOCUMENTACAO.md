# Documentação da API — Folhagem & Cia

## 1. Visão geral

API da loja de plantas Folhagem & Cia, que substitui a planilha de estoque. Ela cadastra plantas, lista e filtra o catálogo, registra vendas sem deixar o estoque negativo e calcula o valor total do estoque.

**Stack:** Node.js, Express, TypeScript, Prisma, PostgreSQL e Docker.

**Organização:** `routes.ts` → Controller (valida e responde) → Repository (único que fala com o banco) → Prisma.

**URL base:** `http://localhost:3001`. As respostas são JSON e os erros têm o formato `{ "message": "..." }`. A exceção é o corpo com JSON mal formado (veja a seção 5).

## 2. Como rodar

Pré-requisitos: Docker Desktop aberto, Node.js 20+ e Yarn.

```bash
cp .env.example .env           # cria o .env (no PowerShell/CMD: copy .env.example .env)
yarn                           # instala as dependências
docker compose up -d --build   # sobe a API e o banco
yarn migration                 # cria as tabelas
```

Para conferir: `curl http://localhost:3001` deve devolver `{"message":"API do treinamento de CRUD do CITi 🚀"}`.

Se a porta 3001 ou a 5432 estiver ocupada, troque `SERVER_PORT` ou `DATABASE_PORT` no `.env` e suba de novo.

Opcional: `yarn seed` cadastra 7 plantas de exemplo (veja a seção 6).

## 3. Modelo de dados

### Planta

| Campo | Tipo | Obrigatório no cadastro | Regra |
|---|---|---|---|
| `id` | Int | não | Gerado pelo banco |
| `nome` | String | sim | Texto não vazio |
| `especie` | String | sim | Texto não vazio (nome científico) |
| `preco` | Int | sim | Inteiro maior que zero, em **centavos** (`8990` = R$ 89,90) |
| `estoque` | Int | sim | Inteiro maior ou igual a zero (`0` = esgotada) |
| `luminosidade` | Luminosidade | sim | `SOMBRA`, `MEIA_SOMBRA` ou `SOL_PLENO` |
| `petFriendly` | Boolean | sim | `true` ou `false` |
| `regaACadaDias` | Int | sim | Inteiro maior ou igual a 1 |
| `createdAt` / `updatedAt` | DateTime | não | Preenchidos automaticamente |

Na edição (`PATCH`) nenhum campo é obrigatório, mas os que vierem passam pelas mesmas regras.

### Luminosidade (enum)

`SOMBRA`, `MEIA_SOMBRA` e `SOL_PLENO`.

## 4. Rotas

Todos os exemplos de resposta abaixo são de sucesso. Os erros estão na seção 5.

### POST /plantas — cadastra uma planta

Corpo (todos os campos obrigatórios):

```json
{
  "nome": "Costela-de-adão",
  "especie": "Monstera deliciosa",
  "preco": 8990,
  "estoque": 12,
  "luminosidade": "MEIA_SOMBRA",
  "petFriendly": false,
  "regaACadaDias": 3
}
```

Resposta `201`:

```json
{
  "id": 1,
  "nome": "Costela-de-adão",
  "especie": "Monstera deliciosa",
  "preco": 8990,
  "estoque": 12,
  "luminosidade": "MEIA_SOMBRA",
  "petFriendly": false,
  "regaACadaDias": 3,
  "createdAt": "2026-10-30T16:59:55.650Z",
  "updatedAt": "2026-10-30T16:59:55.650Z"
}
```

### GET /plantas — lista as plantas

Filtros opcionais na URL, que podem ser combinados:

| Parâmetro | Valores | O que faz |
|---|---|---|
| `luminosidade` | `SOMBRA`, `MEIA_SOMBRA`, `SOL_PLENO` | Só plantas dessa luminosidade |
| `petFriendly` | `true` ou `false` | Só plantas seguras (ou não) para pets |
| `nome` | texto | Nome que contém o texto, sem diferenciar maiúsculas |
| `ordem` | `preco` ou `nome` | Ordena de forma crescente |

Exemplo: `GET /plantas?luminosidade=SOL_PLENO&petFriendly=true&ordem=preco`

Resposta `200`: lista de plantas no mesmo formato do cadastro. Se nenhuma combinar com os filtros, a resposta é `[]`.

### GET /plantas/:id — busca uma planta

Exemplo: `GET /plantas/1`. Resposta `200`: a planta.

### PATCH /plantas/:id — edita só os campos enviados

Corpo de exemplo:

```json
{ "preco": 7990 }
```

Resposta `200`: a planta completa, já atualizada.

### DELETE /plantas/:id — remove uma planta

Resposta `204`, sem corpo.

### POST /plantas/:id/venda — registra uma venda

Corpo:

```json
{ "quantidade": 2 }
```

Resposta `200`: a planta com o estoque já diminuído (por exemplo, `estoque: 10` se tinha 12).

### GET /plantas/estoque/valor-total — valor do estoque

Soma `preco × estoque` de todas as plantas e o total de vasos. Resposta `200`:

```json
{ "valorTotalEmCentavos": 402100, "totalDeVasos": 75 }
```

Sem plantas cadastradas, os dois valores são `0`.

### GET /plantas/esgotadas — plantas com estoque zero

Resposta `200`: lista de plantas com `estoque: 0` (ou `[]`).

## 5. Erros e status HTTP

| Rota | Erro | Quando |
|---|---|---|
| `POST /plantas` | `400` | Falta algum campo (`Preencha todos os campos obrigatórios.`) ou algum valor é inválido (mensagem diz qual) |
| | `500` | Erro inesperado (`Erro ao criar planta.`) |
| `GET /plantas` | `400` | `luminosidade`, `petFriendly`, `nome` ou `ordem` inválidos |
| | `500` | Erro inesperado (`Erro ao buscar plantas.`) |
| `GET /plantas/:id` | `400` | `id` não é um número inteiro maior que zero (`id inválido.`) |
| | `404` | Não existe planta com esse id (`Planta não encontrada.`) |
| | `500` | Erro inesperado |
| `PATCH /plantas/:id` | `400` | `id` inválido ou algum campo enviado é inválido |
| | `404` | Não existe planta com esse id |
| | `500` | Erro inesperado |
| `DELETE /plantas/:id` | `400` | `id` inválido |
| | `404` | Não existe planta com esse id |
| | `500` | Erro inesperado |
| `POST /plantas/:id/venda` | `400` | `id` inválido, `quantidade` que não é inteiro maior que zero, ou estoque insuficiente (`Temos só 3 vasos em estoque.`) |
| | `404` | Não existe planta com esse id |
| | `500` | Erro inesperado (`Erro ao vender planta.`) |
| `GET /plantas/estoque/valor-total` | `500` | Erro inesperado |
| `GET /plantas/esgotadas` | `500` | Erro inesperado |

**Observações:**

- Na validação do cadastro e da edição, a API devolve só a primeira mensagem de erro que encontrar, não a lista completa.
- Na venda, as validações de `id` e `quantidade` vêm antes da busca da planta. Por isso `quantidade: 0` em um id que não existe responde `400`, não `404`.
- Na edição, o `id` é conferido antes do corpo: id inexistente com corpo inválido responde `404`.
- Rota que não existe responde `404` com `{ "message": "Rota não encontrada" }`.
- Corpo com JSON mal formado (por exemplo, uma vírgula sobrando) é recusado pelo Express com `400` em **HTML**, não em JSON. Nada é criado ou alterado. Não tratei esse caso.

## 6. Decisões e bônus

**Decisões:**

- **Presença com `=== undefined`:** `estoque: 0` e `petFriendly: false` são valores válidos, e `!campo` os recusaria.
- **Validação de tipo além de presença:** `"8990"` (texto) e `89.9` (decimal) são recusados no `preco`.
- **`estoque` sem valor padrão no banco:** o cadastro sem `estoque` deve dar `400`, e um padrão `0` esconderia a falta do campo.
- **PATCH só repassa os 7 campos validados:** o cliente não consegue alterar `id` nem `createdAt` pelo corpo.
- **Rotas fixas antes de `/plantas/:id`:** senão o Express leria `estoque` e `esgotadas` como um `id`.
- **Venda atômica (duas vendas do último vaso ao mesmo tempo):** a versão simples (ler o estoque, conferir e diminuir) deixaria as duas requisições lerem `estoque: 1` e o estoque ficar negativo. Usei `updateMany` com `where: { id, estoque: { gte: quantidade } }`, que confere e diminui em uma única operação no banco. Das duas requisições, só uma passa e a outra recebe `400`.

**Bônus feitos:**

- Busca por nome sem diferenciar maiúsculas: `?nome=`.
- Ordenação: `?ordem=preco` ou `?ordem=nome`.
- Rota `GET /plantas/esgotadas`.
- Seed: `yarn seed` (o banco e as migrations precisam estar no ar) **apaga todas as plantas existentes**, inclusive as cadastradas à mão, e cadastra 7 de exemplo, duas delas com estoque zero. Pode rodar mais de uma vez sem duplicar nada.

**Limitações:** não há testes automatizados; as rotas foram testadas manualmente com `curl` e com a ferramenta **Thunder Client**. O `prisma/seed.ts` não é verificado pelo `yarn typecheck`.