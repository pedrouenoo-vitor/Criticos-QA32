// @vitest-environment jsdom
import React from 'react';
import {it,expect,vi,afterEach} from 'vitest';
import {render,screen,fireEvent,cleanup} from '@testing-library/react';
import ItemModal from './ItemModal';
afterEach(cleanup);
const profile={id:'ana',display_name:'Ana',role:'operator',active:true};
const item={id:'1',owner_id:'admin',assigned_to:'ana',lot:'001',material:'002',description:'Rebite',received_at:'2026-10-01',deadline:'2026-10-20',quantity:10,unit:'PC',notes:'',responsible:''};
it('usa autor autenticado e não oferece atribuição nem exclusão ao operador designado',()=>{
 const save=vi.fn();render(<ItemModal item={item} profile={profile} profiles={[]} busy={false} close={()=>{}} onSave={save}/>);
 expect(screen.queryByLabelText('Atribuir inspeção a')).toBe(null);
 expect(screen.queryByText('Excluir item')).toBe(null);
 fireEvent.change(screen.getByLabelText('Data de liberação'),{target:{value:'2026-10-10'}});
 fireEvent.click(screen.getByText('Salvar item'));
 expect(save.mock.calls[0][0].responsible).toBe('Ana');
 expect(save.mock.calls[0][0].released_at).toBe('2026-10-10');
});
it('trava campos de conclusão e reabre preservando registro',()=>{
 const save=vi.fn();render(<ItemModal item={{...item,released_at:'2026-10-10',responsible:'Ana'}} profile={profile} profiles={[]} busy={false} close={()=>{}} onSave={save}/>);
 expect(screen.getByLabelText('Quantidade *').disabled).toBe(true);
 fireEvent.click(screen.getByText('Reabrir item'));
 expect(save.mock.calls[0][0].released_at).toBe(null);
 expect(save.mock.calls[0][0].lot).toBe('001');
});
