import {describe,it,expect} from 'vitest';
import {status,queue,addDays,validate,filterQueue} from './domain';
const base={lot:'001',material:'002',quantity:10,received_at:'2026-10-01',deadline:'2026-10-16',description:'Rebite',supplier:'ACME'};
describe('Prazos e fila',()=>{
 for(const [n,s] of [[-1,'ATRASADO'],[0,'VENCE HOJE'],[1,'ATENÇÃO'],[2,'ATENÇÃO'],[3,'EM DIA']])it('limite '+n,()=>expect(status({...base,deadline:addDays('2026-10-16',n)},'2026-10-16')).toBe(s));
 it('liberado encerra pendência',()=>expect(status({...base,released_at:'2026-10-15'},'2026-10-16')).toBe('LIBERADO'));
 it('sem prazo',()=>expect(status({...base,deadline:null},'2026-10-16')).toBe('SEM PRAZO'));
 it('ordena grupos e deadlines',()=>{const a=queue([base,{...base,deadline:'2026-10-14'},{...base,deadline:'2026-10-10'},{...base,deadline:'2026-10-20'}],'2026-10-16');expect(a.map(x=>x.deadline)).toEqual(['2026-10-10','2026-10-14','2026-10-16','2026-10-20']);});
 it('filtra busca sem regex',()=>{const a=queue([base],'2026-10-16');expect(filterQueue(a,{query:'rebite'})).toHaveLength(1);expect(filterQueue(a,{query:'['})).toHaveLength(0);expect(filterQueue(a,{selected:[]})).toHaveLength(0);});
 it('rejeita quantidade negativa e data inválida',()=>{expect(()=>validate({...base,quantity:-1})).toThrow();expect(()=>validate({...base,deadline:'2026-02-30'})).toThrow();expect(()=>validate({...base,deadline:'2026-09-30'})).toThrow();});
 it('exige autor na liberação',()=>expect(()=>validate({...base,released_at:'2026-10-15',responsible:''})).toThrow());
 it('soma dias entre meses',()=>expect(addDays('2026-12-30',7)).toBe('2027-01-06'));
});
