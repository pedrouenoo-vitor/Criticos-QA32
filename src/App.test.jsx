// @vitest-environment jsdom
import React from 'react';
import {it,expect,vi} from 'vitest';
import {render,screen,fireEvent,waitFor} from '@testing-library/react';
const mocks=vi.hoisted(()=>({save:vi.fn(async()=>{}),load:vi.fn(async()=>[{id:'test',version:1,lot:'001',material:'123',description:'Rebite',quantity:10,supplier:'ACME',unit:'PC',received_at:'2026-10-01',deadline:'2026-10-16'}])}));
vi.mock('./db',()=>({configured:true,db:{auth:{getSession:async()=>({data:{session:{user:{id:'owner',email:'teste@example.com'}}}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe:()=>{}}}})}},loadItems:mocks.load,saveItem:mocks.save,deleteItem:vi.fn(),importItems:vi.fn()}));
import Root from './App';
it('interface autenticada: carregar, filtrar, abrir formulário e salvar',async()=>{
 render(<Root/>);
 await screen.findByText('Rebite');
 fireEvent.change(screen.getByLabelText('Buscar'),{target:{value:'inexistente'}});
 expect(screen.getByText('Nenhum item nesta seleção')).toBeTruthy();
 fireEvent.click(screen.getByText('Limpar filtros'));
 expect(screen.getByText('Rebite')).toBeTruthy();
 fireEvent.click(screen.getByText('Novo item'));
 fireEvent.change(screen.getByLabelText('Lote *'),{target:{value:'NOVO'}});
 fireEvent.change(screen.getByLabelText('Material *'),{target:{value:'MAT'}});
 fireEvent.click(screen.getByText('Salvar item'));
 await waitFor(()=>expect(mocks.save).toHaveBeenCalled());
 expect(mocks.save.mock.calls[0][0].lot).toBe('NOVO');
 await screen.findByText('Item salvo com sucesso.');
 fireEvent.click(screen.getByText('Importar Excel'));
 expect(screen.getByText('Traga seus recebimentos')).toBeTruthy();
});
