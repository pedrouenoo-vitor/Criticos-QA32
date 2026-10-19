export const STATUSES=['ATRASADO','VENCE HOJE','ATENÇÃO','EM DIA','SEM PRAZO','LIBERADO'];
export const todayBR=()=>new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
export function validDate(s){return typeof s==='string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s)) && new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;}
export function addDays(s,n){if(!validDate(s)) throw Error('Data inválida');return new Date(Date.parse(s+'T00:00:00Z')+n*86400000).toISOString().slice(0,10);}
export function daysLeft(s,ref=todayBR()){return s?Math.round((Date.parse(s+'T00:00:00Z')-Date.parse(ref+'T00:00:00Z'))/86400000):null;}
export function status(item,ref=todayBR(),attention=2){if(item.released_at)return 'LIBERADO';const n=daysLeft(item.deadline,ref);return n===null?'SEM PRAZO':n<0?'ATRASADO':n===0?'VENCE HOJE':n<=attention?'ATENÇÃO':'EM DIA';}
export function queue(items,ref=todayBR(),attention=2){return items.map(i=>({...i,status:status(i,ref,attention),days:daysLeft(i.deadline,ref)})).sort((a,b)=>STATUSES.indexOf(a.status)-STATUSES.indexOf(b.status)||(a.deadline||'9999').localeCompare(b.deadline||'9999')||a.received_at.localeCompare(b.received_at)||a.lot.localeCompare(b.lot));}
export const displayDate=s=>s?s.split('-').reverse().join('/'):'—';
export function validate(i){
 if(!i.lot?.trim()||!i.material?.trim())throw Error('Lote e material são obrigatórios.');
 if(!Number.isFinite(Number(i.quantity))||Number(i.quantity)<0)throw Error('Quantidade inválida.');
 if(!validDate(i.received_at))throw Error('Recebimento inválido.');
 if(i.deadline&&(!validDate(i.deadline)||i.deadline<i.received_at))throw Error('Deadline inválido ou anterior ao recebimento.');
 if(i.released_at&&(!validDate(i.released_at)||i.released_at<i.received_at||i.released_at>todayBR()))throw Error('Data de liberação inválida.');
 if(i.released_at&&!i.responsible?.trim())throw Error('Informe o responsável pela liberação.');
 return i;
}
export function filterQueue(items,{query='',supplier='',selected=STATUSES.slice(0,5)}={}){const q=query.toLocaleLowerCase();return items.filter(i=>selected.includes(i.status)&&(!supplier||i.supplier===supplier)&&[i.material,i.description,i.lot,i.supplier].some(v=>(v||'').toLocaleLowerCase().includes(q)));}
