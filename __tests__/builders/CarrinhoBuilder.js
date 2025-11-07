import { Carrinho } from '../../src/domain/Carrinho.js';
import { Item } from '../../src/domain/Item.js';
import { UserMother } from './UserMother.js';

/**
 * Data Builder para criação flexível de carrinhos em testes.
 * Resolve o Test Smell de "Setup Obscuro" tornando explícito
 * apenas o que é importante para cada cenário.
 */
export class CarrinhoBuilder {
    constructor() {
        // Valores padrão
        this._user = UserMother.umUsuarioPadrao();
        this._itens = [new Item('Produto Padrão', 100)];
    }

    comUser(user) {
        this._user = user;
        return this;
    }

    comItens(itens) {
        this._itens = itens;
        return this;
    }

    vazio() {
        this._itens = [];
        return this;
    }

    comValorTotal(valor) {
        // Cria um único item com o valor especificado
        this._itens = [new Item('Produto', valor)];
        return this;
    }

    build() {
        return new Carrinho(this._user, this._itens);
    }
}
