## Objetivo rápido

Ajude a manter e evoluir o serviço de checkout e a suíte de testes deste repositório. Foque em alterações pequenas e testáveis — o projeto é pedagógico e as dependências externas são simuladas nos serviços em `src/services/`.

## Visão geral da arquitetura

- Código organizado em `src/domain/` (modelos simples: `User`, `Carrinho`, `Item`, `Pedido`) e `src/services/` (comportamentos e integrações: `CheckoutService`, `GatewayPagamento`, `PedidoRepository`, `EmailService`).
- O `CheckoutService` é o ponto central: recebe um `Carrinho` e usa injeção de dependência para `GatewayPagamento`, `PedidoRepository` e `EmailService`.

Por isso, para mudanças de negócio prefira tocar `src/services/CheckoutService.js` e os modelos em `src/domain/`.

## Fluxos críticos e por que eles importam

- Checkout: calcular total via `Carrinho.calcularTotal()`, aplicar desconto para `User` premium, chamar `GatewayPagamento.cobrar`, salvar com `PedidoRepository.salvar`, notificar com `EmailService.enviarEmail`.
- Observação importante: as implementações em `src/services/*` lançam erros se chamados (ex.: `GatewayPagamento.cobrar` lança), indicando que testes devem usar stubs/mocks/fakes.

## Padrões e convenções do projeto

- Injeção de dependências pelo construtor (ex.: `new CheckoutService(gateway, repo, emailSvc)`).
- Testes esperados: usar Object Mother / Data Builders (veja README/`__tests__/builders` instrução). O repositório foi pensado para exercícios com Jest.
- Os serviços externos NÃO devem ser invocados em testes/CI: substitua por doubles (stub para controlar retorno de pagamento, mock para verificar chamadas de e-mail/repósitorio).

## Como iniciar e testes (comandos importantes)

- Instalar dependências: `npm install`
- Executar testes: `npm test -- --watch`

## Arquivos-chave para revisar ao editar o checkout

- `src/services/CheckoutService.js` — lógica do fluxo de pagamento e efeitos colaterais.
- `src/services/GatewayPagamento.js` — contrato: `async cobrar(valor, cartao) -> { success: boolean, ... }`.
- `src/services/PedidoRepository.js` — contrato: `async salvar(pedido) -> pedidoComId`.
- `src/services/EmailService.js` — contrato: `async enviarEmail(para, assunto, corpo)`.
- `src/domain/Carrinho.js`, `src/domain/User.js`, `src/domain/Pedido.js`, `src/domain/Item.js` — modelos usados no fluxo.

## Exemplos rápidos para testes

- Para simular falha de pagamento: stub `gateway.cobrar` retornando `{ success: false }` e assert `CheckoutService.processarPedido(...) === null`.
- Para sucesso: stub `gateway.cobrar` retornando `{ success: true }`; stub `pedidoRepository.salvar` para retornar pedido com `id`; verificar que `emailService.enviarEmail` foi chamado com `user.email`.
- Para premium: criar `User` com `tipo='PREMIUM'` e verificar que `gateway.cobrar` é chamado com valor reduzido em 10%.

## Boas práticas locais (descobertas no código)

- Não trate falha de envio de e-mail como erro crítico (o `CheckoutService` já captura/exibe console.error) — mantenha esse comportamento se for compatível.
- Prefira pequenas PRs: atualizações no fluxo de pagamento afetam mocks em vários testes.

## Quando pedir ajuda

- Se precisar alterar contratos de serviços externos (gateway, repositório, e-mail), descreva o novo contrato e atualize os testes que usam doubles.

---

Se quiser, faço uma versão em inglês ou adapto para regras de lint/commit específicas. Deseja que eu adicione exemplos de testes (Jest) no repositório também?
