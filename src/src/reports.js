import {displayDate} from './domain';
import {METHOD} from './analytics';

export const unitsText=units=>Object.entries(units).map(([u,n])=>`${Number(n).toLocaleString('pt-BR',{maximumFractionDigits:3})} ${u}`).join(' · ')||'—';
const pct=n=>n===null?'Sem base':`${n.toFixed(1)}%`;
const fmt=n=>n===null?'—':n.toFixed(1);
export async function buildReportWorkbook(report,{generatedBy,generatedAt=new Date().toISOString()}={}) {
  const {default:ExcelJS}=await import('exceljs');
  const book=new ExcelJS.Workbook();book.creator='QA32 V2';book.created=new Date(generatedAt);
  function sheet(name,columns,rows) {
    const ws=book.addWorksheet(name);ws.columns=columns.map(([header,key,width=22])=>({header,key,width}));
    rows.forEach(r=>ws.addRow(r));ws.views=[{state:'frozen',ySplit:1}];
    ws.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};
    ws.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF17365D'}};
    ws.autoFilter={from:{row:1,column:1},to:{row:Math.max(1,ws.rowCount),column:columns.length}};
    return ws;
  }
  sheet('Resumo',[['Indicador','label',44],['Resultado','value',65]],[
    {label:'Período',value:`${displayDate(report.start)} a ${displayDate(report.end)}`},
    {label:'Emitido por',value:generatedBy||'Administrador'}, {label:'Emitido em (ISO)',value:generatedAt},
    {label:'Lotes liberados',value:report.total},{label:'Com autoria V2',value:report.tracked},{label:'Histórico/importado',value:report.legacy},
    {label:'Quantidades por unidade',value:unitsText(report.units)},
    {label:'SLA no prazo (%)',value:report.sla},{label:'Denominador SLA (com deadline)',value:report.withDeadline},
    {label:'Tempo médio em dias corridos',value:report.averageDays},
    {label:'Lotes por dia corrido',value:report.perCalendarDay},
    {label:'Período anterior',value:`${displayDate(report.previousStart)} a ${displayDate(report.previousEnd)}`},
    {label:'Lotes no período anterior',value:report.previousTotal},{label:'Variação (%)',value:report.change===null?'Sem base':report.change},
  ]);
  sheet('Produtividade',[['Responsável','name',30],['Origem','origin'],['Lotes','lots',12],['Quantidades','units',40],['SLA (%)','sla',15],['Com deadline','withDeadline'],['No prazo','onTime'],['Tempo médio (dias)','averageDays'],['Dias com liberação','activeDays'],['Lotes/dia corrido','perCalendarDay']],report.ranking.map(r=>({...r,origin:r.legacy?'Histórico sem vínculo':'Usuário autenticado',units:unitsText(r.units)})));
  sheet('Liberacoes',[['Lote','lot'],['Material','material'],['Descrição','description',45],['Responsável','actor_name',30],['Origem','origin'],['Quantidade','quantity'],['Unidade','unit'],['Recebimento','received_on'],['Deadline','deadline_on'],['Liberação','released_on']],report.releases.map(r=>({...r,quantity:Number(r.quantity),origin:r.legacy?'Histórico sem vínculo':'Usuário autenticado'})));
  sheet('Tendencia',[['Data','date'],['Lotes liberados','lots']],report.trend);
  sheet('Metodologia',[['Critério','text',120]],METHOD.map(text=>({text})));
  return book;
}
export async function downloadReport(report,options) {
  const book=await buildReportWorkbook(report,options);
  const url=URL.createObjectURL(new Blob([await book.xlsx.writeBuffer()],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}));
  const a=document.createElement('a');a.href=url;a.download=`QA32_Relatorio_${report.start}_${report.end}.xlsx`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function reportHTML(report,name='Administrador') {
  const rows=report.ranking.map(r=>`<tr><td>${escape(r.name)}${r.legacy?' (histórico)':''}</td><td>${r.lots}</td><td>${escape(unitsText(r.units))}</td><td>${pct(r.sla)}</td><td>${fmt(r.averageDays)}</td><td>${fmt(r.perCalendarDay)}</td></tr>`).join('');
  return `<!doctype html><html lang="pt-BR"><meta charset="UTF-8"><title>QA32 - Relatório gerencial</title><style>body{font:13px Arial;color:#17304d;margin:36px}h1{font-size:26px}table{border-collapse:collapse;width:100%;margin:24px 0}th,td{padding:10px;border:1px solid #ccd5df;text-align:left}th{background:#edf2f8}li{margin:10px 0;line-height:1.5}.kpis{display:flex;gap:24px;flex-wrap:wrap}.kpis b{font-size:24px;display:block}footer{font-size:11px;margin-top:25px}@page{size:A4 landscape;margin:14mm}@media print{button{display:none}thead{display:table-header-group}tr{break-inside:avoid}}</style><h1>QA32 · Relatório gerencial de produtividade</h1><p>Período: ${displayDate(report.start)} a ${displayDate(report.end)} · Emitido por ${escape(name)}</p><div class="kpis"><div><b>${report.total}</b>Lotes liberados</div><div><b>${pct(report.sla)}</b>SLA no prazo</div><div><b>${fmt(report.averageDays)}</b>Tempo médio (dias)</div><div><b>${report.tracked}</b>Com autoria V2</div></div><p>Quantidades: ${escape(unitsText(report.units))}. Histórico sem vínculo: ${report.legacy} lotes.</p><p>Variação de produção: ${pct(report.change)}. Período anterior: ${displayDate(report.previousStart)} a ${displayDate(report.previousEnd)}, ${report.previousTotal} lotes.</p><table><thead><tr><th>Responsável</th><th>Lotes</th><th>Quantidades por unidade</th><th>SLA</th><th>Tempo médio (dias)</th><th>Lotes/dia corrido</th></tr></thead><tbody>${rows||'<tr><td colspan="6">Sem liberações no período.</td></tr>'}</tbody></table><h2>Critérios e limites</h2><ul>${METHOD.map(m=>`<li>${escape(m)}</li>`).join('')}</ul><footer>Emitido em ${escape(new Date().toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}))}. Dados sujeitos às correções registradas no histórico.</footer></html>`;
}
export function printReport(report,name) {
  const win=window.open('','_blank');
  if(!win) throw Error('Permita a abertura do relatório nesta página para imprimir ou salvar como PDF.');
  win.opener=null;win.document.write(reportHTML(report,name));win.document.close();win.focus();win.print();
}
