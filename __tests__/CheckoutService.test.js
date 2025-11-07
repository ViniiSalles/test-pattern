import { CheckoutService } from '../src/services/CheckoutService.js';
import { Item } from '../src/domain/Item.js';
import { Pedido } from '../src/domain/Pedido.js';
import { UserMother } from './builders/UserMother.js';
import { CarrinhoBuilder } from './builders/CarrinhoBuilder.js';

describe('CheckoutService', () => {
    
    describe('quando o pagamento falha', () => {
        it('deve retornar null se o Gateway recusar a cobrança', async () => {
            // Arrange
            const carrinho = new CarrinhoBuilder()
                .comValorTotal(100)
                .build();

            const cartaoCredito = { numero: '1234', cvv: '123' };

            // Stub: Simula falha no pagamento
            const gatewayStub = {
                cobrar: jest.fn().mockResolvedValue({ success: false })
            };

            // Dummies: Não devem ser chamados
            const repositoryDummy = {
                salvar: jest.fn()
            };
            const emailDummy = {
                enviarEmail: jest.fn()
            };

            const checkoutService = new CheckoutService(
                gatewayStub,
                repositoryDummy,
                emailDummy
            );

            // Act
            const pedido = await checkoutService.processarPedido(carrinho, cartaoCredito);

            // Assert - Verificação de Estado
            expect(pedido).toBeNull();
            expect(repositoryDummy.salvar).not.toHaveBeenCalled();
            expect(emailDummy.enviarEmail).not.toHaveBeenCalled();
        });
    });

    describe('quando o pagamento é bem-sucedido', () => {
        it('deve retornar o pedido salvo com o totalFinal correto para cliente padrão', async () => {
            // Arrange
            const carrinho = new CarrinhoBuilder()
                .comUser(UserMother.umUsuarioPadrao())
                .comValorTotal(100)
                .build();

            const cartaoCredito = { numero: '1234', cvv: '123' };

            // Stub: Simula sucesso no pagamento
            const gatewayStub = {
                cobrar: jest.fn().mockResolvedValue({ success: true })
            };

            // Stub: Simula persistência
            const repositoryStub = {
                salvar: jest.fn().mockImplementation((pedido) => {
                    return { ...pedido, id: 123 };
                })
            };

            // Stub: Email não precisa ser verificado neste teste
            const emailStub = {
                enviarEmail: jest.fn().mockResolvedValue(true)
            };

            const checkoutService = new CheckoutService(
                gatewayStub,
                repositoryStub,
                emailStub
            );

            // Act
            const pedido = await checkoutService.processarPedido(carrinho, cartaoCredito);

            // Assert - Verificação de Estado
            expect(pedido).not.toBeNull();
            expect(pedido.id).toBe(123);
            expect(pedido.totalFinal).toBe(100);
            expect(pedido.status).toBe('PROCESSADO');
        });
    });

    describe('quando um cliente Premium finaliza a compra', () => {
        it('deve aplicar 10% de desconto e chamar o Gateway com valor reduzido', async () => {
            // Arrange
            const usuarioPremium = UserMother.umUsuarioPremium();
            const carrinho = new CarrinhoBuilder()
                .comUser(usuarioPremium)
                .comItens([
                    new Item('Produto 1', 100),
                    new Item('Produto 2', 100)
                ])
                .build();

            const cartaoCredito = { numero: '1234', cvv: '123' };

            // Stub/Mock: Queremos verificar o valor passado
            const gatewayMock = {
                cobrar: jest.fn().mockResolvedValue({ success: true })
            };

            const repositoryStub = {
                salvar: jest.fn().mockImplementation((pedido) => {
                    return { ...pedido, id: 456 };
                })
            };

            const emailStub = {
                enviarEmail: jest.fn().mockResolvedValue(true)
            };

            const checkoutService = new CheckoutService(
                gatewayMock,
                repositoryStub,
                emailStub
            );

            // Act
            const pedido = await checkoutService.processarPedido(carrinho, cartaoCredito);

            // Assert - Verificação de Comportamento
            // Valor inicial: 200, com 10% de desconto = 180
            expect(gatewayMock.cobrar).toHaveBeenCalledWith(180, cartaoCredito);
            expect(pedido.totalFinal).toBe(180);
        });
    });

    describe('quando o pedido é processado com sucesso', () => {
        it('deve enviar email de confirmação com os dados corretos', async () => {
            // Arrange
            const usuarioPremium = UserMother.umUsuarioPremium();
            const carrinho = new CarrinhoBuilder()
                .comUser(usuarioPremium)
                .comValorTotal(200)
                .build();

            const cartaoCredito = { numero: '1234', cvv: '123' };

            const gatewayStub = {
                cobrar: jest.fn().mockResolvedValue({ success: true })
            };

            const repositoryStub = {
                salvar: jest.fn().mockImplementation((pedido) => {
                    return { ...pedido, id: 789 };
                })
            };

            // Mock: Queremos verificar a chamada ao serviço de email
            const emailMock = {
                enviarEmail: jest.fn().mockResolvedValue(true)
            };

            const checkoutService = new CheckoutService(
                gatewayStub,
                repositoryStub,
                emailMock
            );

            // Act
            await checkoutService.processarPedido(carrinho, cartaoCredito);

            // Assert - Verificação de Comportamento
            expect(emailMock.enviarEmail).toHaveBeenCalledTimes(1);
            expect(emailMock.enviarEmail).toHaveBeenCalledWith(
                'premium@email.com',
                'Seu Pedido foi Aprovado!',
                expect.stringContaining('789')
            );
            expect(emailMock.enviarEmail).toHaveBeenCalledWith(
                'premium@email.com',
                'Seu Pedido foi Aprovado!',
                expect.stringContaining('180')
            );
        });
    });

    describe('quando o pagamento falha', () => {
        it('não deve chamar o EmailService nem o PedidoRepository', async () => {
            // Arrange
            const carrinho = new CarrinhoBuilder()
                .comValorTotal(100)
                .build();

            const cartaoCredito = { numero: '1234', cvv: '123' };

            // Stub: Simula falha
            const gatewayStub = {
                cobrar: jest.fn().mockResolvedValue({ 
                    success: false, 
                    error: 'Cartão recusado' 
                })
            };

            // Mocks: Verificar que NÃO são chamados
            const repositoryMock = {
                salvar: jest.fn()
            };

            const emailMock = {
                enviarEmail: jest.fn()
            };

            const checkoutService = new CheckoutService(
                gatewayStub,
                repositoryMock,
                emailMock
            );

            // Act
            const resultado = await checkoutService.processarPedido(carrinho, cartaoCredito);

            // Assert - Verificação de Comportamento
            expect(resultado).toBeNull();
            expect(repositoryMock.salvar).not.toHaveBeenCalled();
            expect(emailMock.enviarEmail).not.toHaveBeenCalled();
        });
    });
});
