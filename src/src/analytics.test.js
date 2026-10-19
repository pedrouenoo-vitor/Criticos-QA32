import {describe,it,expect} from 'vitest';
import {percentChange,snapshotsAt,cardMetrics,productivity,compareProduction} from './analytics';
import {reportHTML,buildReportWorkbook} from './reports';

const item={id:'1',lot:'001',material:'001',quantity:10,unit:'PC',received_at:'2026-10-01',deadline:'2026-10-20',supplier:'A',description:'Rebite'};
const release={id:'r1',item_id:'1',owner_id:'a',actor_id:'a',actor_name:'Ana',lot:'001',material:'001',description:'Rebite',quantity:10,unit:'PC',received_on:'2026-10-01',deadline_on:'2026-10-10',released_on:'2026-10-10',legacy:false};
describe('Comparação histórica',()=>{
 it.each([[12,10,20],[5,10,-50],[0,0,null],[3,0,null],[0,10,-100]])('variação %s/%s',(a,b,expected)=>expect(percentChange(a,b)).toBe(expected));
 it('não inventa histórico anterior à importação',()=>{
  const cards=cardMetrics([item],[{id:1,item_id:'1',operation:'INSERT',new_record:item,changed_at:'2026-10-17T12:00:00Z'}],15,2,'2026-10-17');
  expect(cards.find(c=>c.status==='EM DIA').value).toBe(1);expect(cards[0].hasHistory).toBe(false);
 });
 it('usa última revisão anterior ao corte e ignora futuras',()=>{
  const h=[{id:1,item_id:'1',operation:'INSERT',new_record:item,changed_at:'2026-10-01T12:00:00Z'},{id:2,item_id:'1',operation:'UPDATE',new_record:{...item,deadline:'2026-10-12'},changed_at:'2026-10-05T12:00:00Z'},{id:3,item_id:'1',operation:'DELETE',new_record:null,changed_at:'2026-10-15T12:00:00Z'}];
  expect(snapshotsAt(h,'2026-10-06T23:59:59Z')[0].deadline).toBe('2026-10-12');expect(snapshotsAt(h,'2026-10-16T23:59:59Z')).toHaveLength(0);
 });
 it('reclassifica o prazo na data antiga e aplica busca e fornecedor',()=>{
  const history=[{id:1,item_id:'1',operation:'INSERT',new_record:item,changed_at:'2026-10-01T12:00:00Z'}];
  const cards=cardMetrics([item],history,15,2,'2026-10-25',{supplier:'A',query:'rebite'});
  expect(cards.find(c=>c.status==='ATRASADO').value).toBe(1);expect(cards.find(c=>c.status==='EM DIA').previous).toBe(1);
 });
});
describe('Relatório gerencial',()=>{
 const rows=[release,{...release,id:'r2',actor_id:'b',actor_name:'Bia',unit:'KG',quantity:2,deadline_on:null,released_on:'2026-10-11'}, {...release,id:'r3',legacy:true,actor_id:null,actor_name:'Legado',quantity:4,deadline_on:'2026-10-09'}, {...release,id:'r4',voided_at:'2026-10-12'}, {...release,id:'r5',released_on:'2026-09-29'}];
 it('separa unidades, exclui anuladas e calcula SLA com denominador correto',()=>{
  const r=productivity(rows,{start:'2026-10-01',end:'2026-10-15'});
  expect(r.total).toBe(3);expect(r.units).toEqual({PC:14,KG:2});expect(r.sla).toBe(50);expect(r.tracked).toBe(2);expect(r.legacy).toBe(1);expect(r.perCalendarDay).toBe(.2);expect(r.trend).toHaveLength(15);
 });
 it('filtra responsável autenticado e histórico separado',()=>{
  expect(productivity(rows,{start:'2026-10-01',end:'2026-10-15',actor:'a'}).total).toBe(1);
  expect(productivity(rows,{start:'2026-10-01',end:'2026-10-15',actor:'legacy'}).total).toBe(1);
 });
 it('compara períodos contíguos de igual duração',()=>{
  const r=compareProduction(rows,{start:'2026-10-01',end:'2026-10-15'});
  expect(r.previousStart).toBe('2026-09-16');expect(r.previousEnd).toBe('2026-09-30');expect(r.change).toBe(200);
 });
 it('não divide por zero e rejeita intervalo inválido',()=>{
  expect(productivity([],{start:'2026-10-01',end:'2026-10-15'}).sla).toBe(null);
  expect(()=>productivity(rows,{start:'2026-10-20',end:'2026-10-01'})).toThrow();
 });
 it('mostra usuários sem liberações com produtividade zero',()=>{
  const r=productivity([],{start:'2026-10-01',end:'2026-10-15',profiles:[{id:'zero',display_name:'Sem produção'}]});
  expect(r.ranking[0].lots).toBe(0);expect(r.ranking[0].averageDays).toBe(null);
 });
 it('escapa conteúdo não confiável no relatório de impressão',()=>{
  const r=compareProduction([{...release,actor_name:'<script>alert(1)</script>'}],{start:'2026-10-01',end:'2026-10-15'});
  const html=reportHTML(r,'<img src=x>');expect(html).not.toContain('<script>');expect(html).toContain('&lt;script&gt;');expect(html).not.toContain('<img src=x>');
 });
 it('gera XLSX com resumo, ranking, detalhe, tendência e metodologia',async()=>{
  const r=compareProduction(rows,{start:'2026-10-01',end:'2026-10-15'});
  const book=await buildReportWorkbook(r,{generatedBy:'Pedro',generatedAt:'2026-10-17T12:00:00Z'});
  expect(book.worksheets.map(s=>s.name)).toEqual(['Resumo','Produtividade','Liberacoes','Tendencia','Metodologia']);
  expect(book.getWorksheet('Liberacoes').rowCount).toBe(4);expect((await book.xlsx.writeBuffer()).byteLength).toBeGreaterThan(5000);
 });
});
