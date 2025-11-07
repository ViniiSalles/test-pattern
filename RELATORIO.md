# Trabalho Prático: Implementando Padrões de Teste (Test Patterns)

**Disciplina:** Engenharia de Software - Testes  
**Trabalho:** Padrões de Teste (Test Patterns)  
**Aluno:** [Seu Nome Completo]  
**Matrícula:** [Sua Matrícula]  
**Data:** 7 de novembro de 2025

---

## 1. Introdução

Este relatório documenta a implementação de padrões de teste aplicados ao serviço de checkout, especificamente:

- **Padrões de Criação de Dados:** Object Mother e Data Builder
- **Padrões de Test Doubles:** Stubs e Mocks

O objetivo é demonstrar como esses padrões melhoram a legibilidade, manutenibilidade e sustentabilidade da suíte de testes.

---

## 2. Padrões de Criação de Dados (Builders)

### 2.1 Por que CarrinhoBuilder em vez de CarrinhoMother?

O padrão **Object Mother** é adequado para entidades **simples** que raramente variam entre os testes. Por exemplo, `User` tem apenas 4 atributos e geralmente precisamos apenas de dois tipos: usuário padrão e premium.

Já o `Carrinho` é um objeto **complexo** que pode variar significativamente entre cenários:

- Pode ter diferentes usuários (padrão ou premium)
- Pode conter vários itens ou estar vazio
- Pode ter diferentes valores totais

Usar um **Object Mother** para `Carrinho` levaria a uma **explosão de métodos**:

- `umCarrinhoVazio()`
- `umCarrinhoComUmItem()`
- `umCarrinhoComDoisItens()`
- `umCarrinhoPremiumCom100Reais()`
- `umCarrinhoPremiumCom200Reais()`
- etc...

O padrão **Data Builder** resolve este problema oferecendo uma API fluente que permite customização apenas do que é relevante para cada teste.

### 2.2 Exemplo: Antes e Depois

#### ANTES (Setup Manual Complexo e Obscuro):

```javascript
it("deve aplicar desconto para premium", async () => {
  // Setup obscuro - não fica claro o que é importante
  const user = new User(2, "Maria", "premium@email.com", "PREMIUM");
  const item1 = new Item("Produto 1", 100);
  const item2 = new Item("Produto 2", 100);
  const carrinho = new Carrinho(user, [item1, item2]);

  const cartao = { numero: "1234", cvv: "123" };
  const gateway = {
    cobrar: jest.fn().mockResolvedValue({ success: true }),
  };
  const repository = {
    salvar: jest.fn().mockImplementation((p) => ({ ...p, id: 456 })),
  };
  const email = {
    enviarEmail: jest.fn().mockResolvedValue(true),
  };

  const service = new CheckoutService(gateway, repository, email);
  await service.processarPedido(carrinho, cartao);

  expect(gateway.cobrar).toHaveBeenCalledWith(180, cartao);
});
```

**Problemas:**

- Muito código de setup
- Não fica claro o que é importante: o tipo de usuário? Os valores? A quantidade de itens?
- Difícil de reutilizar e manter

#### DEPOIS (Usando Data Builder):

```javascript
it("deve aplicar desconto para premium", async () => {
  // Setup expressivo - fica claro que importa:
  // 1. Usuário Premium
  // 2. Valor total de 200
  const carrinho = new CarrinhoBuilder()
    .comUser(UserMother.umUsuarioPremium())
    .comItens([new Item("Produto 1", 100), new Item("Produto 2", 100)])
    .build();

  const cartao = { numero: "1234", cvv: "123" };
  const gatewayMock = {
    cobrar: jest.fn().mockResolvedValue({ success: true }),
  };
  const repositoryStub = {
    salvar: jest.fn().mockImplementation((p) => ({ ...p, id: 456 })),
  };
  const emailStub = {
    enviarEmail: jest.fn().mockResolvedValue(true),
  };

  const service = new CheckoutService(gatewayMock, repositoryStub, emailStub);
  await service.processarPedido(carrinho, cartao);

  // O foco do teste: desconto de 10% (200 -> 180)
  expect(gatewayMock.cobrar).toHaveBeenCalledWith(180, cartao);
});
```

**Vantagens:**

- O setup é **expressivo e declarativo**
- Fica evidente o que é importante para este teste específico
- O Builder tem valores padrão razoáveis (método `.build()` funciona sem customização)
- Fácil de adaptar para outros cenários: `.vazio()`, `.comValorTotal(50)`, etc.

### 2.3 Como o Builder Melhora Legibilidade e Manutenção

1. **Legibilidade:** O código de teste lê como uma especificação: "Dado um carrinho com usuário premium e itens totalizando 200..."

2. **Manutenção:** Se `Carrinho` ganhar novos atributos no futuro, apenas o Builder precisa ser atualizado com valores padrão. Os testes existentes continuam funcionando.

3. **Reutilização:** O mesmo builder serve para todos os testes, com customização pontual via métodos fluentes.

4. **Evita Test Smell "Obscure Test":** Cada teste declara explicitamente apenas o que é relevante para seu cenário.

---

## 3. Padrões de Test Doubles (Mocks vs. Stubs)

### 3.1 Teste Escolhido: "Cliente Premium com Desconto"

```javascript
describe("quando um cliente Premium finaliza a compra", () => {
  it("deve aplicar 10% de desconto e chamar o Gateway com valor reduzido", async () => {
    // Arrange
    const usuarioPremium = UserMother.umUsuarioPremium();
    const carrinho = new CarrinhoBuilder()
      .comUser(usuarioPremium)
      .comItens([new Item("Produto 1", 100), new Item("Produto 2", 100)])
      .build();

    const cartaoCredito = { numero: "1234", cvv: "123" };

    // Stub/Mock: Queremos verificar o valor passado
    const gatewayMock = {
      cobrar: jest.fn().mockResolvedValue({ success: true }),
    };

    const repositoryStub = {
      salvar: jest.fn().mockImplementation((pedido) => {
        return { ...pedido, id: 456 };
      }),
    };

    const emailStub = {
      enviarEmail: jest.fn().mockResolvedValue(true),
    };

    const checkoutService = new CheckoutService(
      gatewayMock,
      repositoryStub,
      emailStub
    );

    // Act
    const pedido = await checkoutService.processarPedido(
      carrinho,
      cartaoCredito
    );

    // Assert - Verificação de Comportamento
    expect(gatewayMock.cobrar).toHaveBeenCalledWith(180, cartaoCredito);
    expect(pedido.totalFinal).toBe(180);
  });
});
```

### 3.2 Identificação: Stub vs. Mock

Neste teste:

**GatewayPagamento = MOCK** (mas também funciona como Stub parcial)

- **Por quê?** Estamos **verificando o comportamento**: que o método `cobrar` foi chamado com o valor correto (180, após desconto de 10%)
- A linha `expect(gatewayMock.cobrar).toHaveBeenCalledWith(180, ...)` é uma **verificação de comportamento**
- Também retorna um valor controlado (`{ success: true }`), funcionando parcialmente como Stub

**PedidoRepository = STUB**

- **Por quê?** Apenas controla o retorno (pedido com ID) para permitir que o fluxo continue
- **Não há verificação** sobre se ou como foi chamado
- Serve apenas para **fornecer dados de teste indiretos**

**EmailService = STUB**

- **Por quê?** Neste teste específico, apenas evitamos erros
- Não estamos verificando se foi chamado ou com quais parâmetros
- O foco do teste é o desconto, não a notificação

### 3.3 Explicação: Por que essa diferença?

A escolha entre **Stub** e **Mock** depende do **foco do teste**:

#### Verificação de Estado vs. Comportamento

**Stubs** são usados para **Verificação de Estado**:

- Testamos o **resultado final** (estado)
- Exemplo: "O pedido retornado deve ter `totalFinal = 180`"
- O Stub apenas fornece dados de entrada ou intermediários necessários
- Não verificamos **como** as dependências foram usadas

**Mocks** são usados para **Verificação de Comportamento**:

- Testamos **interações e efeitos colaterais**
- Exemplo: "O gateway deve ser chamado **exatamente com valor 180**"
- Verificamos **como** o SUT (System Under Test) interage com suas dependências
- Útil quando o comportamento é mais importante que o estado final

#### Por que GatewayPagamento foi (principalmente) um Mock?

No contexto do teste de desconto Premium:

- O **comportamento crítico** é: "o sistema deve aplicar 10% de desconto **antes** de chamar o gateway"
- Não basta verificar que o pedido final tem `totalFinal = 180`
- Precisamos garantir que o **gateway recebeu exatamente 180**, não 200
- Por isso usamos **verificação de comportamento**: `expect(gateway.cobrar).toHaveBeenCalledWith(180, ...)`

#### Por que EmailService foi um Stub (neste teste)?

- O foco deste teste é o **desconto**, não a notificação
- O `EmailService` existe apenas para evitar que o `CheckoutService` lance erro
- Em **outro teste** (veja arquivo de testes), o `EmailService` vira **Mock** quando verificamos:
  - `expect(emailMock.enviarEmail).toHaveBeenCalledTimes(1)`
  - `expect(emailMock.enviarEmail).toHaveBeenCalledWith('premium@email.com', ...)`

### 3.4 Exemplo de Mock para EmailService

No teste "deve enviar email de confirmação com os dados corretos":

```javascript
const emailMock = {
  enviarEmail: jest.fn().mockResolvedValue(true),
};

// ...

// Verificação de Comportamento (Mock)
expect(emailMock.enviarEmail).toHaveBeenCalledTimes(1);
expect(emailMock.enviarEmail).toHaveBeenCalledWith(
  "premium@email.com",
  "Seu Pedido foi Aprovado!",
  expect.stringContaining("789")
);
```

Aqui, `emailMock` é claramente um **Mock** porque:

- Verificamos **quantas vezes** foi chamado
- Verificamos **com quais argumentos** foi chamado
- O foco é o **comportamento de notificação**, não apenas o estado final

---

## 4. Cobertura de Cenários

A suíte implementada cobre todos os cenários principais:

### 4.1 Verificação de Estado (Stub):

✅ **Falha no pagamento:** Retorna `null` quando gateway recusa  
✅ **Sucesso padrão:** Retorna pedido salvo com `totalFinal` correto para cliente padrão

### 4.2 Verificação de Comportamento (Mock):

✅ **Desconto Premium:** Gateway é chamado com 10% de desconto  
✅ **Envio de Email:** `EmailService` é chamado com dados corretos após sucesso  
✅ **Não chamar em falha:** `EmailService` e `Repository` não são chamados quando pagamento falha

### 4.3 Resultado dos Testes:

```
 PASS  __tests__/CheckoutService.test.js
  CheckoutService
    quando o pagamento falha
      ✓ deve retornar null se o Gateway recusar a cobrança
      ✓ não deve chamar o EmailService nem o PedidoRepository
    quando o pagamento é bem-sucedido
      ✓ deve retornar o pedido salvo com totalFinal correto para cliente padrão
    quando um cliente Premium finaliza a compra
      ✓ deve aplicar 10% de desconto e chamar o Gateway com valor reduzido
    quando o pedido é processado com sucesso
      ✓ deve enviar email de confirmação com os dados corretos

Test Suites: 1 passed, 1 total
Tests:       5 passed, 5 total
```

---

## 5. Conclusão

### 5.1 Benefícios dos Padrões Implementados

A aplicação deliberada de **Padrões de Teste** trouxe melhorias significativas:

#### Padrões de Criação (Builders):

- **Object Mother para User:** Simples e eficaz para entidades com poucas variações
- **Data Builder para Carrinho:** Flexibilidade para cenários complexos sem explosão de métodos
- **Evita "Obscure Test":** Cada teste declara explicitamente apenas o que importa
- **Facilita manutenção:** Mudanças em `Carrinho` impactam apenas o Builder

#### Test Doubles (Stubs e Mocks):

- **Stubs:** Controlam fluxo e fornecem dados indiretos (verificação de estado)
- **Mocks:** Verificam interações críticas (verificação de comportamento)
- **Isolamento:** Testes não dependem de serviços externos reais
- **Rapidez:** Testes executam em milissegundos sem I/O

### 5.2 Prevenção de Test Smells

Os padrões aplicados previnem diversos Test Smells:

1. **Obscure Test:** Builders tornam o setup explícito e legível
2. **Fragile Test:** Isolamento com doubles reduz dependências externas
3. **Erratic Test:** Stubs garantem comportamento determinístico
4. **Test Code Duplication:** Builders e Mothers centralizam criação de objetos

### 5.3 Sustentabilidade da Suíte

Uma suíte de testes sustentável requer:

- ✅ Testes **legíveis** (padrão AAA respeitado)
- ✅ Testes **rápidos** (sem I/O real)
- ✅ Testes **isolados** (doubles evitam efeitos colaterais)
- ✅ Testes **manuteníveis** (builders centralizam mudanças)

Todos esses requisitos foram atendidos através da aplicação consciente dos padrões de teste.

### 5.4 Reflexão Final

O uso de **Test Patterns** não é apenas uma "boa prática", mas uma **necessidade** para projetos de médio e grande porte. Sem esses padrões, a suíte de testes rapidamente se torna:

- Difícil de entender (setup obscuro)
- Difícil de manter (duplicação de código)
- Frágil (dependências de serviços externos)
- Lenta (I/O desnecessário)

Com os padrões aplicados, a suíte se torna uma **documentação viva** do comportamento esperado do sistema, servindo como especificação executável e rede de segurança para refatorações futuras.

---

## Anexos

### Estrutura de Arquivos Implementada:

```
__tests__/
├── builders/
│   ├── UserMother.js          # Object Mother para usuários
│   └── CarrinhoBuilder.js     # Data Builder para carrinhos
└── CheckoutService.test.js    # Suite de testes completa

src/
├── domain/
│   ├── User.js
│   ├── Carrinho.js
│   ├── Item.js
│   └── Pedido.js
└── services/
    ├── CheckoutService.js
    ├── GatewayPagamento.js
    ├── PedidoRepository.js
    └── EmailService.js
```

### Links Úteis:

- **Repositório GitHub:** [Seu link do fork aqui]
- **Documentação Jest:** https://jestjs.io/
- **Test Patterns (xUnit Patterns):** http://xunitpatterns.com/

---

**Fim do Relatório**
