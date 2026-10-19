import {addDays,validDate,queue,STATUSES,todayBR,daysLeft} from './domain';

export function snapshotsAt(history,isoCutoff) {
  const end=new Date(isoCutoff).getTime(),last=new Map();
  for(const h of history) {
    if(new Date(h.changed_at).getTime()>end) continue;
    const previous=last.get(h.item_id);
    if(!previous||new Date(h.changed_at)>new Date(previous.changed_at)
      ||(h.changed_at===previous.changed_at&&BigInt(h.id)>BigInt(previous.id))) last.set(h.item_id,h);
  }
  return [...last.values()].filter(h=>h.operation!=='DELETE'&&h.new_record).map(h=>({...h.new_record,id:h.item_id}));
}
export function percentChange(current,previous) {
  if(previous===0) return null;
  return ((current-previous)/previous)*100;
}
export function cardMetrics(items,history,days=15,attention=2,reference=todayBR(),scope={}) {
  const priorDate=addDays(reference,-days);
  const match=i=>(!scope.supplier||i.supplier===scope.supplier)&&[i.material,i.description,i.lot,i.supplier].some(v=>String(v||'').toLocaleLowerCase().includes((scope.query||'').toLocaleLowerCase()));
  const current=queue(items.filter(match),reference,attention);
  const prior=snapshotsAt(history,priorDate+'T23:59:59.999-03:00').filter(match),before=queue(prior,priorDate,attention);
  return STATUSES.map(s=>{
    const value=current.filter(i=>i.status===s).length,previous=before.filter(i=>i.status===s).length;
    return {status:s,value,previous,change:percentChange(value,previous),hasHistory:prior.length>0,priorDate};
  });
}
function number(v){const n=Number(v);return Number.isFinite(n)?n:0;}
function sumUnits(rows){return rows.reduce((acc,r)=>{const unit=r.unit||'Sem unidade';acc[unit]=(acc[unit]||0)+number(r.quantity);return acc;},{});}
export function productivity(releases,{start,end,actor='all',profiles=[]}={}) {
  if(!validDate(start)||!validDate(end)||end<start) throw Error('Selecione um período válido: início não pode ser posterior ao fim.');
  const calendarDays=daysLeft(end,start)+1;
  const included=releases.filter(r=>!r.voided_at&&r.released_on>=start&&r.released_on<=end
    &&(actor==='all'||(actor==='legacy'?r.legacy:r.actor_id===actor&&!r.legacy)));
  const groups=new Map();
  for(const r of included) {
    const id=r.legacy?'legacy:'+(r.actor_name||'Sem responsável'):(r.actor_id||'unknown:'+r.actor_name);
    if(!groups.has(id)) groups.set(id,[]);groups.get(id).push(r);
  }
  const ranking=[...groups.entries()].map(([id,rows])=>{
    const dated=rows.filter(r=>r.deadline_on),onTime=dated.filter(r=>r.released_on<=r.deadline_on).length;
    return {id,name:rows[0].actor_name||'Histórico sem responsável',legacy:!!rows[0].legacy,
      lots:rows.length,units:sumUnits(rows),onTime,withDeadline:dated.length,sla:dated.length?onTime/dated.length*100:null,
      averageDays:rows.reduce((n,r)=>n+daysLeft(r.released_on,r.received_on),0)/rows.length,
      activeDays:new Set(rows.map(r=>r.released_on)).size,perCalendarDay:rows.length/calendarDays};
  });
  for(const p of profiles) {
    if((actor==='all'||actor===p.id)&&!ranking.some(r=>r.id===p.id)) ranking.push({id:p.id,name:p.display_name,legacy:false,lots:0,units:{},onTime:0,withDeadline:0,sla:null,averageDays:null,activeDays:0,perCalendarDay:0});
  }
  ranking.sort((a,b)=>b.lots-a.lots||a.name.localeCompare(b.name,'pt-BR'));
  const dates={};for(let d=start;d<=end;d=addDays(d,1)) dates[d]=0;
  included.forEach(r=>dates[r.released_on]++);
  const withDeadline=included.filter(r=>r.deadline_on),onTime=withDeadline.filter(r=>r.released_on<=r.deadline_on).length;
  return {start,end,calendarDays,total:included.length,tracked:included.filter(r=>!r.legacy).length,
    legacy:included.filter(r=>r.legacy).length,units:sumUnits(included),onTime,withDeadline:withDeadline.length,
    sla:withDeadline.length?onTime/withDeadline.length*100:null,
    averageDays:included.length?included.reduce((n,r)=>n+daysLeft(r.released_on,r.received_on),0)/included.length:null,
    perCalendarDay:included.length/calendarDays,ranking,trend:Object.entries(dates).map(([date,lots])=>({date,lots})),releases:included};
}
export function compareProduction(releases,options) {
  const report=productivity(releases,options);
  const previous=productivity(releases,{...options,start:addDays(options.start,-report.calendarDays),end:addDays(options.start,-1)});
  return {...report,previousTotal:previous.total,previousStart:previous.start,previousEnd:previous.end,change:percentChange(report.total,previous.total)};
}
export const METHOD=[
  'Lotes liberados: ciclos de liberação não anulados, pela data informada. Reabrir anula o ciclo anterior; liberar novamente cria um novo ciclo.',
  'Autoria V2: usuário autenticado que confirmou a liberação, gravado pelo banco. Nome digitado e proprietário do item não substituem essa autoria.',
  'Histórico V1/importado: autor textual preservado, sem associar a um usuário por suposição. Aparece separado e identificado como histórico.',
  'SLA: liberações até o deadline / liberações com deadline. Registros sem deadline ficam fora do denominador.',
  'Tempo médio: dias corridos entre recebimento e liberação. Lotes por dia: lotes / todos os dias corridos do período, inclusive dias sem produção.',
  'Quantidades são somadas por unidade de medida; PC, KG e outras unidades nunca formam um total único.',
  'Variação de produtividade: total do período versus período imediatamente anterior de igual duração. Denominador zero é exibido como Sem base.',
  'Variação dos cards: posição atual versus posição registrada ao fim de N dias atrás, reconstruída pelo histórico. N é configurado pelo administrador; o percentual não é editado manualmente.',
  'Excluir um item não apaga seu ciclo de produtividade nem a auditoria. O botão Atualizar recarrega configurações e dados.',
];
