# Prompt 1

**Ferramenta:** Copilot Standard

**Texto do prompt:**

I have the following project to develop, dont mind the portuguese keep the conversation in english:

O projeto: "Seguir criadora"

Uma API e uma página simples em que um usuário segue e deixa de seguir uma

criadora, e a página mostra quantos seguidores ela tem.

API

POST /creators/{creatorId}/followers : o usuário (enviado no corpo,

userId ) passa a seguir a criadora.

DELETE /creators/{creatorId}/followers/{userId} : o usuário deixa de

seguir.

GET /creators/{creatorId}/followers/count : devolve {

"creatorId": ..., "count": ... } .

Página: uma tela com o nome da criadora, o número de seguidores e um botão

"Seguir" / "Deixar de seguir"

Im doing this with a vue + node + sqlite stack and am already in the root of the project.

Dont worry about testing for now well focus on the basic implementation first.

For the backend, make sure to implement every route requested, make the creator id and user id uuids and add a validator for that on the requests. Implement any additional endpoints necessary to retrieve the creators and determine whether the current user already follows each one.

Make sure to wire up the backend to the frontend properly using vue/vite. Then implement the visuals for it as instructed. You can add a simple icon placeholder to make it prettier. Also make sure to take responsivity into account and make the page able to handle multiple creators.

For the database/backend, setup the sqlite database and create a initialization script to populate the database with 5 creators with different values in case the table is empty. For the table create a creators one with uuid,name, and created_at, a followers table which will serve as the relational here with creator_id, user_id and a unique constraint between those as well as a created_at. And a users table with id and a name. For the user identification itself create a simple anonymous system using localstorage. On the first visit, generate a uuid, persist the user in the SQLite users table with the name guest, and save the uuid in localstorage. On subsequent visits, reuse the stored uuid instead of creating a new user.

**Por que este prompt:**

Quis começar com uma implementação funcional do projeto, tanto no backend quanto no frontend, antes de entrar na parte de testes.

Escolhi Vue, Node.js e SQLite por serem tecnologias relativamente simples para um projeto desse tamanho e também por familiaridade. Também preferi definir a estrutura do banco e algumas regras de funcionamento desde o começo, para não deixar todas as decisões por conta da IA.

**O que a IA entregou:**

A implementação inicial da API, a interface em Vue e a integração com o banco SQLite, incluindo as tabelas de usuários, criadoras e seguidores.

Também foi implementado o sistema de identificação anônima usando UUID e localStorage, além da interface para seguir e deixar de seguir as criadoras.

**O que estava errado ou faltando, e o que você fez:**

Não encontrei nenhum problema grave durante o primeiro teste manual. A aplicação iniciou e as funcionalidades principais pareceram funcionar corretamente.

Os testes automatizados ainda não haviam sido implementados, pois decidi deixar essa etapa para o segundo prompt.

**Como você conferiu:**

Iniciei o backend e o frontend localmente usando os comandos de desenvolvimento do projeto.

Abri a aplicação no navegador, conferi a lista de criadoras e testei os botões de seguir e deixar de seguir. Também observei a atualização das contagens de seguidores.

---

# Prompt 2

**Ferramenta:** Copilot Standard

**Texto do prompt:**

Good, now I want you to cover these API edge cases:

Follow a creator: 201 Created

Follow the same creator twice: 409 Conflict, no duplicate

Unfollow a creator: 204 No Content

Unfollow someone not followed: 404 Not Found

Invalid creator UUID: 400 Bad Request

Invalid user UUID: 400 Bad Request

Creator doesn't exist: 404 Not Found

User doesn't exist: 404 Not Found

Missing userId in POST: 400 Bad Request

Count followers: 200 OK, correct count

Creator with zero followers: 200 OK, count = 0

Make sure the frontend properly handles the relevant API responses and errors.

Implement automated API integration testing using Vitest and Supertest. Tests should exercise real API requests against an isolated SQLite database, rather than mocking database responses. Ensure proper database setup, cleanup, and test isolation.

Review the existing implementation for edge cases, input validation, database constraints, and error handling. Fix any actual issues found while preserving the existing architecture and functionality.

Follow consistent coding conventions and HTTP status codes. Avoid unnecessary refactoring or changes to existing database schemas and frontend behavior unless required to fix a problem.

Add an npm test script so the tests can be executed with a single command.

Finally, execute the tests and report which passed, which failed, and anything you couldn't verify.

**Por que este prompt:**

Depois de verificar que a aplicação estava funcionando, quis garantir que a API também lidasse corretamente com entradas inválidas e situações menos comuns.

Decidi utilizar Vitest e Supertest para criar testes de integração, utilizando um banco SQLite isolado. Minha intenção era testar o funcionamento real dos endpoints e das operações no banco, sem depender apenas de mocks.

**O que a IA entregou:**

A implementação e revisão do tratamento dos casos de erro da API, com códigos HTTP definidos para cada situação.

Também foram adicionados testes automatizados de integração com Vitest e Supertest, utilizando um banco de testes separado do ambiente de desenvolvimento.

**O que estava errado ou faltando, e o que você fez:**

A primeira implementação ainda não tinha uma cobertura automatizada para os casos de erro e situações como seguir a mesma criadora duas vezes.

Usei esse prompt para definir explicitamente o comportamento esperado em cada caso e implementar testes para verificar essas regras.

**Como você conferiu:**

Executei a suíte de testes da API e conferi os resultados apresentados no terminal. Os testes executados passaram.

Também voltei à aplicação no navegador para verificar se as operações de seguir e deixar de seguir continuavam funcionando após as alterações.

---

# Prompt 3

**Ferramenta:** Copilot Standard

**Texto do prompt:**

Good, the API tests are passing and the application seems to be working correctly.

Now I'd like to focus on frontend reliability and reviewing the application as a whole.

First, implement a small set of end-to-end tests using Playwright, covering the main user flow:

- A new visitor receives an anonymous user identity.

- The creators list loads correctly.

- Following a creator updates the button state and follower count.

- Refreshing the page preserves the user's identity and follow status.

- Unfollowing a creator updates the state and count.

- Following one creator does not affect the follow state of others.

Make sure the E2E tests use an isolated environment so they don't modify development data.

Then review the existing codebase for:

- Unnecessary complexity or duplicated logic.

- Proper handling of API failures in the frontend.

- Loading states and prevention of duplicate requests.

- Database consistency and potential race conditions.

- Consistent TypeScript usage and coding conventions, where applicable.

Only fix actual issues. Avoid unnecessary refactoring or introducing new features.

Finally, create or update README.md with the prerequisites, project structure, setup instructions, database initialization, how to run the frontend/backend, and how to execute both API and E2E tests.

Run the available tests and report the results, any issues fixed, and anything that could not be verified.

I also noticed a minor frontend issue: when following or unfollowing one creator, the buttons for other creators briefly flicker.

Investigate the cause rather than applying a cosmetic workaround. Make sure updating one creator doesn't unnecessarily reset or recreate unrelated creator components.

Review Vue list keys, reactive state updates, loading indicators, and how the creators list is refreshed after API requests.

Fix the underlying issue while preserving correct follower counts and follow states, including after page reloads.

**Por que este prompt:**

Com os testes da API funcionando, quis verificar o comportamento da aplicação completa, incluindo a interação do usuário com a interface.

Durante os testes manuais, percebi um problema visual: ao seguir ou deixar de seguir uma criadora, os botões das outras criadoras piscavam rapidamente. Aproveitei esse prompt para pedir uma investigação desse comportamento, além de adicionar testes de ponta a ponta e revisar a organização do projeto.

**O que a IA entregou:**

A IA implementou testes E2E com Playwright, revisou o gerenciamento de estado no Vue e corrigiu o problema de flicker nos botões. Também atualizou o README com as instruções de execução do projeto e dos testes.

**O que estava errado ou faltando, e o que você fez:**

O principal problema observado manualmente era o flicker nos botões de outras criadoras durante as operações de seguir e deixar de seguir.

Descrevi o comportamento no prompt e pedi que a IA investigasse a causa, em vez de apenas esconder o efeito visual. Também procurei evitar mudanças desnecessárias no restante da aplicação.

**Como você conferiu:**

Abri novamente a aplicação e testei as operações de seguir e deixar de seguir, observando especialmente os botões das outras criadoras.

A interface pareceu funcionar normalmente após as alterações.

Evidência (`npm run test:e2e`):

```text
> test:e2e
> npm --prefix frontend run test:e2e

> frontend@0.0.0 test:e2e
> node run-e2e.cjs

[WebServer] ◇ injected env (0) from ..\.env

Running 1 test using 1 worker
  ✓ 1 …anonymous visitor follows, reloads, and unfollows creators independently (781ms)

  1 passed (4.3s)
```

---

# Prompt 4

**Ferramenta:** Copilot Standard

**Texto do prompt:**

The application is now functional and all tests are passing. However, I noticed that the backend is implemented in JavaScript, while the technical requirements specify Node.js with TypeScript.

I want you to migrate the existing backend implementation to TypeScript.

Requirements:

- Convert the backend application source code from JavaScript to TypeScript.
- Configure TypeScript properly, including tsconfig.json and the necessary dependencies.
- Use strict type checking and appropriate types for request handlers, database operations, and application data.
- Update the development, build, and start scripts to support TypeScript.
- Adapt the existing Vitest/Supertest integration tests as necessary.
- Preserve all existing API endpoints, HTTP status codes, database behavior, and frontend integration.
- Avoid unnecessary refactoring, architectural changes, or new features.
- Keep JavaScript configuration files where necessary; focus on migrating application code.
After the migration:

1. Run the TypeScript type checker.
2. Verify that the backend builds and starts successfully.
3. Run all existing API integration tests.
4. Run the Playwright E2E tests to verify that frontend functionality hasn't been affected.
5. Report any errors encountered, the fixes applied, and the final test results.
The goal is a clean TypeScript migration without changing the application's existing behavior.

Finally, update the existing PROMPTS.md to include this fourth prompt, following the same structure and writing style as the previous entries.

Add a new section titled "Prompt 4" containing:

Ferramenta: Copilot Standard

Texto do prompt: The exact text of this entire prompt, including these documentation instructions.

Por que este prompt: Explain that the migration was necessary to align the backend with the challenge's TypeScript requirements.

O que a IA entregou: Summarize the actual changes made during the migration.

O que estava errado ou faltando, e o que você fez: Explain that the original backend was implemented in JavaScript and describe any issues encountered during migration.

Keep the explanations in natural Portuguese, consistent with the existing document. Do not invent test results or manual verification steps.

**Por que este prompt:**

Durante a revisão final, percebi que o backend havia sido implementado em JavaScript, enquanto o enunciado especificava Node.js/TypeScript. Quis corrigir essa diferença sem alterar as funcionalidades que já estavam funcionando.

**O que a IA entregou:**

Migração completa e coerente do backend para Typescript.

**O que estava errado ou faltando, e o que você fez:**

O backend estava em JavaScript, o que poderia não atender ao requisito de TypeScript do desafio. Solicitei uma migração focada, preservando as rotas, o banco e os testes existentes.

# Decisões que tomei

- **Stack:** escolhi Vue com Vite para o frontend, Node.js para o backend e SQLite para o banco de dados. Considerei uma combinação simples e suficiente para o escopo do desafio.

- **Identificação dos usuários:** optei por um sistema anônimo com UUID salvo no localStorage, sem implementar autenticação completa. Isso permite reconhecer o mesmo navegador em visitas futuras, mas não representa uma identidade segura de usuário.

- **Estrutura do banco:** defini tabelas separadas para usuários, criadoras e seguidores, com uma restrição de unicidade entre `creator_id` e `user_id` para impedir relacionamentos duplicados.

- **Dados iniciais:** decidi popular o banco com cinco criadoras para facilitar a demonstração da aplicação.

- **Tratamento de erros:** defini códigos HTTP específicos para as operações e situações inválidas, como `409` para tentativas duplicadas de seguir.

- **Testes:** priorizei testes de integração da API com Vitest e Supertest, usando um banco SQLite isolado. Depois, decidi adicionar testes E2E com Playwright para verificar os fluxos principais da interface.

- **Organização do trabalho:** preferi separar a implementação inicial, a validação da API e a revisão do frontend em etapas, para conseguir conferir os resultados antes de seguir para a próxima.

# O que não verifiquei

- Não fiz testes de carga ou de desempenho com muitos usuários simultâneos.

- Não realizei um deploy em produção. A verificação foi feita no ambiente local.

- Não testei a aplicação em todos os navegadores e dispositivos.

- Não implementei autenticação real. O UUID salvo no navegador serve apenas como identificação anônima para esta demonstração.

- Não fiz uma auditoria de segurança completa da aplicação.
