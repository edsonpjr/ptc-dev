# Relatório — Desafio Folhagem & Cia

## 1. O que foi feito

Implementei a API da loja de plantas em cima do CRUD de usuários que já existia no repositório.

**Obrigatório:**
- Model `Planta` e enum `Luminosidade` no Prisma, com migration commitada.
- As 7 rotas: `POST /plantas`, `GET /plantas` (filtros `luminosidade` e `petFriendly`), `GET /plantas/:id`, `PATCH /plantas/:id`, `DELETE /plantas/:id`, `POST /plantas/:id/venda` e `GET /plantas/estoque/valor-total`.
- Validações e status HTTP das regras de negócio (400 para dado inválido, 404 para id inexistente, venda sem deixar estoque negativo).

**Bônus:**
- Busca por nome sem diferenciar maiúsculas (`?nome=`).
- Ordenação (`?ordem=preco` ou `?ordem=nome`).
- Rota `GET /plantas/esgotadas`.
- Script de seed (`yarn seed`).

**Extra:** tratei o caso de duas vendas simultâneas do último vaso (explicado abaixo).

**O que ficou de fora:** nada do que o enunciado pede. Limitações conscientes:
- Não escrevi testes automatizados; testei cada rota manualmente com `curl` (no terminal) e com a ferramenta **Thunder Client**.
- A validação devolve só o primeiro erro encontrado, não a lista completa.
- O `yarn seed` apaga todas as plantas antes de recriá-las (escolhi isso pela simplicidade: rodar duas vezes não duplica nada).
- O `prisma/seed.ts` fica fora do `include` do `tsconfig.json`, então o `yarn typecheck` não o verifica.

---

## 2. Como foi feito

Segui a mesma organização em camadas do CRUD de usuários: `routes.ts` → Controller → Repository → Prisma.

**Decisões que tomei e o porquê:**

- **Presença com `=== undefined`, não `!campo`:** `!0` e `!false` são `true` em JavaScript, então `if (!estoque)` recusaria `estoque: 0` e `if (!petFriendly)` recusaria `petFriendly: false`, que são valores válidos.
- **Validação de tipo além de presença:** `Number.isInteger` para números (recusa `"8990"` e `89.9`), `typeof` para texto e booleano, e `Object.values(Luminosidade)` para o enum.
- **Uma função de validação para cadastro e edição:** ela só valida os campos que vieram, então o PATCH aceita corpo parcial.
- **Buscar antes de editar/deletar:** sem isso, o erro do Prisma cairia no `catch` e viraria 500 em vez de 404.
- **Filtros da query string:** tudo em `req.query` chega como texto, então `petFriendly` só vira boolean se foi enviado. Filtro ausente não filtra nada.
- **Rotas fixas antes de `/plantas/:id`:** senão o Express leria `estoque` e `esgotadas` como um `:id`.
- **Venda atômica:** a versão simples (ler o estoque, conferir, decrementar) tem condição de corrida: duas requisições podem ler `estoque: 1` ao mesmo tempo e deixar o estoque negativo. Usei `updateMany` com `where: { id, estoque: { gte: quantidade } }`, que confere e decrementa numa única operação no banco. Se nenhuma linha for alterada, a venda é recusada com 400.
- **Valor total no código:** o `aggregate` do Prisma soma uma coluna só, não `preço × estoque`; então busco só `preco` e `estoque` e somo com `reduce`.

**Ordem em que trabalhei:** trabalhei em etapas pequenas, com um commit por etapa, usando a IA como mentora, tira-dúvidas e revisora de erros. Antes de cada trecho eu respondia uma pergunta conceitual; depois aplicava o código, testava e commitava.

1. **Ambiente:** clonei o repo, criei a branch `desafio/edson-junior`, copiei o `.env`, subi o Docker e a migration do `User`. A IA me ajudou a diagnosticar dois problemas de ambiente (seção 3).
2. **Schema:** enum `Luminosidade` e model `Planta`, com a migration.
3. **Repository:** `PlantaRepository`, só com Prisma, sem `req`/`res`.
4. **Controller:** CRUD básico, extraindo a validação para `validarCamposPlanta`, compartilhada entre cadastro e edição.
5. **Rotas:** registrei as cinco rotas do CRUD e testei com `curl`, incluindo os casos de erro (400 e 404).
6. **Filtros** `luminosidade` e `petFriendly` em `GET /plantas`.
7. **Venda:** primeiro discuti a versão simples e a condição de corrida; depois implementei a versão atômica com `updateMany`.
8. **Valor total:** `reduce` sobre `preco` e `estoque`, com a rota registrada antes de `/plantas/:id`.
9. **Revisão final:** `yarn typecheck`, `git log`, `git status`, busca por `console.log` e push da branch.
10. **Bônus:** busca por nome, ordenação, `/plantas/esgotadas` e o seed.

---

## 3. Dificuldades

**Docker deslogado.** O `docker compose up` falhou com "Cannot connect to the Docker daemon". A causa era simples: eu estava deslogado do Docker Desktop. Depois de logar, confirmei com `docker info`.

**Porta 5432 ocupada.** O primeiro `yarn migration` já tinha dado `P1000` (credenciais inválidas), sinal de que algo diferente do meu Postgres respondia em `localhost:5432`. Com o Docker de pé, o compose falhou com "address already in use", mesmo com o `lsof` sem mostrar nenhum processo, e `docker compose down` + `up` repetia o erro. Em vez de caçar o processo, troquei `DATABASE_PORT` para `5433` no `.env`. Como essa variável alimenta o `command: -p`, o mapeamento de portas e a `DATABASE_URL`, nada mais precisou mudar. Conferi com `docker compose ps`, os logs do Postgres e um `curl` na raiz.

**`@default(0)` no estoque.** Minha primeira resposta foi que, sem o campo, "supomos que não tem estoque". Só depois entendi que o default mascararia a regra "todos os campos obrigatórios": um `POST` sem `estoque` voltaria 201 em vez de 400. Por isso `estoque` ficou sem default e a presença é checada no controller.

**`Number("abc")`.** Não sabia o que acontecia. Aprendi que vira `NaN` e que `Number.isInteger(NaN)` é `false`, então `Number.isInteger(id) && id > 0` já cobre texto, zero e negativos no `:id`.

**Mass assignment.** Chamei o risco de "injection"; o nome certo é *mass assignment*. Na primeira versão proposta do PATCH, o `req.body` ia direto para o repository. Eu mesmo apontei que isso deixaria o cliente alterar `id` e `createdAt`, e corrigimos desestruturando só os 7 campos validados.

**`as number` e o `&&`.** Perguntei por que precisava do cast se o `&&` já protege em tempo de execução. A diferença: em runtime o curto-circuito basta; para o compilador, `Number.isInteger` não é *type guard*, então o valor continua `unknown`.

**Ordem das rotas.** Minha primeira ideia foi vaga ("evitar confusão"). Entendi o mecanismo ao analisar melhor o que o Express faria com `estoque` em `/plantas/:id`: `:id` casa qualquer texto naquela posição. Depois apliquei a mesma lógica em `/plantas/esgotadas`.

**Venda simultânea.** Identifiquei a condição de corrida (duas leituras de `estoque: 1`, estoque negativo) e pedi a versão atômica com `updateMany`. O custo é uma consulta a mais, porque o `updateMany` só devolve `count`.

**Erro do editor no `seed.ts`.** O VS Code reclamou de `process`. Como o arquivo está fora do `include` do `tsconfig`, o erro era só do editor: o `yarn typecheck` não o lê e o seed roda com `--transpile-only`.

---

## 4. Uso de IA

Usei o **Claude Sonnet 5(Anthropic)** como mentor de pair programming durante todo o desafio: schema, repository, controller, validações, venda, bônus e seed. Boa parte do código nasceu de sugestões da IA em trechos curtos; eu aplicava, discutia o porquê e só avançava com tudo testado. Ao final, me ajudou como revisora da documentação de toda a implementação do desafio (`DOCUMENTACAO.md`).

**Para quê.** Para entender antes de implementar. A IA explicou cada etapa em pedaços pequenos, tirou minhas dúvidas (Docker, Prisma, ordem de rotas, tipos do TypeScript), ajudou a diagnosticar erros do ambiente e apontou code smells. O exemplo principal foi a extração da validação: cadastro e edição repetiriam as mesmas checagens de tipo, então extraímos `validarCamposPlanta`. Ela também me orientou a manter o Prisma só no repository e me ajudou no passo de criar o `seed.ts`.

**Como conferi.** Rodei `yarn typecheck` em todas as etapas e testei cada rota com `curl`, incluindo os casos de erro, comparando status e mensagem com o enunciado. No fim, revisei com teste manuais no **Thunder Client**, devido à facilidade da interface. Também questionei as respostas: foi assim que apontei o risco de mass assignment no PATCH.

**O que ainda não dominava.** Quando não sabia algo (`Number("abc")` virar `NaN`, a diferença entre checagem em runtime e tipo no `as number`), pedi explicações, antes de avançar para qualquer outra etapa.