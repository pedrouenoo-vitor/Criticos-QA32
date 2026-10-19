import React,{useState} from 'react';
import {Download,Printer,Plus,Save,ShieldCheck,Users,BarChart3,SlidersHorizontal} from 'lucide-react';
import {todayBR,addDays,displayDate} from '../domain';
import {compareProduction,METHOD} from '../analytics';
import {createUser,saveProfile,saveSettings} from '../workspace';
import {downloadReport,printReport,unitsText} from '../reports';

const fmt=(n,suffix='')=>n===null?'—':n.toLocaleString('pt-BR',{maximumFractionDigits:1})+suffix;
export function Change({value}) {
  return <span>{value===null?'Sem base anterior':`${value>0?'+':''}${fmt(value)}%`}</span>;
}
export default function Admin({profile,profiles,workspace,busy,run,refresh,setNotice}) {
  const [tab,setTab]=useState('Produtividade');
  if(profile.role!=='admin'||!profile.active) return <div className="alert error">Área exclusiva de administradores ativos.</div>;
  return <>
    <div className="tabs" aria-label="Áreas do administrador">{[['Produtividade',BarChart3],['Usuários',Users],['Indicadores',SlidersHorizontal]].map(([label,Icon])=><button key={label} aria-pressed={tab===label} className={tab===label?'chosen':''} onClick={()=>setTab(label)}><Icon size={17}/>{label}</button>)}</div>
    {tab==='Produtividade'&&<Productivity releases={workspace.releases} profiles={profiles} days={workspace.settings.comparison_days} busy={busy} run={run} profile={profile}/>}
    {tab==='Usuários'&&<UserAdmin profiles={profiles} busy={busy} run={run} refresh={refresh} setNotice={setNotice}/>}
    {tab==='Indicadores'&&<Settings key={workspace.settings.version} settings={workspace.settings} busy={busy} run={run} refresh={refresh} setNotice={setNotice}/>}
  </>;
}
function Productivity({releases,profiles,days,busy,run,profile}) {
  const [start,setStart]=useState(addDays(todayBR(),-(days-1))),[end,setEnd]=useState(todayBR()),[actor,setActor]=useState('all');
  let report,error;
  try {
    if(new Date(end)-new Date(start)>366*86400000) throw Error('Selecione no máximo 367 dias por relatório.');
    report=compareProduction(releases,{start,end,actor,profiles});
  } catch(e){error=e.message;}
  const actors=new Map(profiles.map(p=>[p.id,p.display_name]));
  releases.filter(r=>r.actor_id&&!r.legacy).forEach(r=>{if(!actors.has(r.actor_id)) actors.set(r.actor_id,r.actor_name);});
  return <>
    <section className="panel"><div className="panel-title"><div><h2>Produtividade da qualidade</h2><p>Liberações válidas, autoria registrada e desempenho no prazo.</p></div><ShieldCheck className="accent"/></div>
      <div className="report-filters"><label>Data inicial<input type="date" value={start} onChange={e=>setStart(e.target.value)}/></label><label>Data final<input type="date" max={todayBR()} value={end} onChange={e=>setEnd(e.target.value)}/></label><label>Responsável<select value={actor} onChange={e=>setActor(e.target.value)}><option value="all">Todos os responsáveis</option>{[...actors].map(([id,name])=><option key={id} value={id}>{name}</option>)}<option value="legacy">Somente histórico sem vínculo</option></select></label></div>
      {error&&<div className="alert error">{error}</div>}
    </section>
    {report&&<>
      <div className="metrics admin-metrics">{[['Lotes liberados',report.total],['SLA no prazo',fmt(report.sla,'%')],['Tempo médio',fmt(report.averageDays,' dias')],['Lotes / dia corrido',fmt(report.perCalendarDay)]].map(([label,value])=><div className="metric" key={label}><span>{label}</span><b>{value}</b></div>)}</div>
      <section className="panel"><div className="panel-title"><div><h2>Relatório gerencial</h2><p>{displayDate(start)} a {displayDate(end)} · {report.tracked} com autoria V2 · {report.legacy} históricos</p></div><div className="actions"><button disabled={busy} onClick={()=>run(()=>downloadReport(report,{generatedBy:profile.display_name}))}><Download size={16}/>Relatório XLSX</button><button disabled={busy} onClick={()=>run(()=>printReport(report,profile.display_name))}><Printer size={16}/>Imprimir / PDF</button></div></div>
        <div className="report-summary"><div><small>Variação de lotes vs. período anterior</small><strong><Change value={report.change}/></strong><small>{report.previousTotal} lotes de {displayDate(report.previousStart)} a {displayDate(report.previousEnd)}</small></div><div><small>Quantidades liberadas, por unidade</small><strong>{unitsText(report.units)}</strong><small>Unidades diferentes permanecem separadas.</small></div><div><small>Base do SLA</small><strong>{report.onTime} no prazo / {report.withDeadline} com deadline</strong><small>{report.total-report.withDeadline} sem deadline, fora do cálculo.</small></div></div>
        <div className="table-wrap"><table><thead><tr><th>Responsável</th><th>Lotes</th><th>Quantidades</th><th>SLA no prazo</th><th>Tempo médio</th><th>Lotes / dia</th><th>Dias com liberação</th></tr></thead><tbody>{report.ranking.map(r=><tr key={r.id}><td><strong>{r.name}</strong><small className="description">{r.legacy?'Histórico sem vínculo de usuário':'Autoria autenticada'}</small></td><td>{r.lots}</td><td>{unitsText(r.units)}</td><td>{fmt(r.sla,'%')}</td><td>{fmt(r.averageDays,' dias')}</td><td>{fmt(r.perCalendarDay)}</td><td>{r.activeDays}</td></tr>)}</tbody></table>{!report.total&&<p className="empty">Nenhuma liberação neste período.</p>}</div>
      </section>
      <div className="charts"><section className="panel"><h2>Lotes por responsável</h2>{report.ranking.map(r=><div className="bar-row" key={r.id}><span title={r.name}>{r.name}</span><div className="bar-track"><div className="bar received" style={{width:`${r.lots/Math.max(1,...report.ranking.map(x=>x.lots))*100}%`}}/></div><b>{r.lots}</b></div>)}{!report.total&&<p className="muted">Sem dados.</p>}</section><section className="panel"><h2>Evolução diária das liberações</h2><div className="daily-chart" role="img" aria-label="Gráfico de lotes liberados por dia">{report.trend.map(r=><div key={r.date} className="daily-column" title={`${displayDate(r.date)}: ${r.lots} lotes`}><b>{r.lots||''}</b><div style={{height:`${r.lots/Math.max(1,...report.trend.map(x=>x.lots))*125}px`}}/><small>{r.date.slice(8)}/{r.date.slice(5,7)}</small></div>)}</div><p className="muted">Inclui dias sem liberação. Passe o cursor sobre uma coluna para consultar a data.</p></section></div>
      <section className="panel"><h2>Liberações do período</h2><div className="table-wrap"><table><thead><tr><th>Data</th><th>Responsável</th><th>Lote</th><th>Material</th><th>Quantidade</th><th>Prazo</th></tr></thead><tbody>{[...report.releases].sort((a,b)=>b.released_on.localeCompare(a.released_on)).map(r=><tr key={r.id}><td>{displayDate(r.released_on)}</td><td>{r.actor_name}{r.legacy&&<small className="description">Histórico</small>}</td><td>{r.lot}</td><td>{r.material}</td><td>{Number(r.quantity).toLocaleString('pt-BR')} {r.unit}</td><td>{r.deadline_on? r.released_on<=r.deadline_on?'No prazo':'Após prazo':'Sem deadline'}</td></tr>)}</tbody></table></div></section>
      <details className="panel"><summary>Metodologia dos indicadores</summary><ul>{METHOD.map(m=><li key={m}>{m}</li>)}</ul></details>
    </>}
  </>;
}
function UserAdmin({profiles,busy,run,refresh,setNotice}) {
  const empty={display_name:'',email:'',password:'',role:'operator'};
  const [form,setForm]=useState(empty),[editing,setEditing]=useState(null);
  return <>
    <section className="panel"><h2>Criar novo usuário</h2><p className="muted">A conta é criada no Supabase Auth por uma Function autenticada da Vercel. Senhas não ficam no histórico nem na lista de usuários.</p>
      <form onSubmit={e=>{e.preventDefault();run(async()=>{await createUser(form);setForm(empty);await refresh();setNotice('Usuário criado. Oriente a pessoa a alterar sua senha inicial em Minha conta.');});}}>
        <div className="form-grid"><label>Nome do usuário<input required maxLength="120" value={form.display_name} onChange={e=>setForm({...form,display_name:e.target.value})}/></label><label>E-mail do usuário<input required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label><label>Senha inicial<input required type="password" autoComplete="new-password" minLength="12" maxLength="128" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/></label><label>Perfil do novo usuário<select value={form.role} onChange={e=>setForm({...form,role:e.target.value})}><option value="operator">Operador</option><option value="admin">Administrador</option></select></label></div>
        <p className="muted">Senha: mínimo de 12 caracteres, com letras e números. Administradores acessam todos os registros e relatórios deste projeto.</p><button className="primary" disabled={busy}><Plus size={16}/>Criar usuário</button>
      </form>
    </section>
    <section className="panel"><h2>Usuários cadastrados <span className="counter">{profiles.length}</span></h2><div className="table-wrap"><table><thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Acesso</th><th>Ação</th></tr></thead><tbody>{profiles.map(p=><tr key={p.id}><td>{p.display_name}</td><td>{p.email}</td><td>{p.role==='admin'?'Administrador':'Operador'}</td><td>{p.active?'Ativo':'Desativado'}</td><td><button disabled={busy} onClick={()=>setEditing({...p})}>Gerenciar</button></td></tr>)}</tbody></table></div></section>
    {editing&&<section className="panel"><h2>Gerenciar {editing.email}</h2><form onSubmit={e=>{e.preventDefault();run(async()=>{await saveProfile(editing.id,editing);await refresh();setEditing(null);setNotice('Perfil atualizado.');});}}><div className="form-grid"><label>Nome de exibição<input required maxLength="120" value={editing.display_name} onChange={e=>setEditing({...editing,display_name:e.target.value})}/></label><label>Perfil de acesso<select value={editing.role} onChange={e=>setEditing({...editing,role:e.target.value})}><option value="operator">Operador</option><option value="admin">Administrador</option></select></label><label className="checkbox-label"><input type="checkbox" checked={editing.active} onChange={e=>setEditing({...editing,active:e.target.checked})}/>Usuário ativo</label></div><p className="muted">Desativar bloqueia consultas e gravações pela API, mesmo se houver uma sessão aberta. O último administrador ativo não pode ser desativado ou rebaixado.</p><div className="actions"><button className="primary" disabled={busy}><Save size={16}/>Salvar perfil</button><button type="button" onClick={()=>setEditing(null)}>Cancelar</button></div></form></section>}
  </>;
}
function Settings({settings,busy,run,refresh,setNotice}) {
  const [days,setDays]=useState(settings.comparison_days),[attention,setAttention]=useState(settings.attention_days);
  return <section className="panel help"><h2>Parâmetros dos indicadores</h2><form onSubmit={e=>{e.preventDefault();run(async()=>{await saveSettings(settings,Number(days),Number(attention));await refresh();setNotice('Parâmetros salvos. Os cards já usam a nova janela de comparação.');});}}><div className="form-grid"><label>Dias de comparação dos cards<input type="number" required min="1" max="365" value={days} onChange={e=>setDays(e.target.value)}/></label><label>Janela de atenção (dias)<input type="number" required min="1" max="30" value={attention} onChange={e=>setAttention(e.target.value)}/></label></div><p>Por padrão, a comparação considera <strong>15 dias</strong>. Aumente ou diminua esse número para mudar a janela usada nos percentuais. O resultado é calculado pelos dados; não é um percentual ajustado manualmente.</p><p>Fórmula: (quantidade atual − quantidade anterior) ÷ quantidade anterior × 100. Quando não existe base histórica suficiente ou o denominador é zero, aparece <strong>Sem base</strong>. A janela de atenção não altera o deadline registrado.</p><button className="primary" disabled={busy}><Save size={16}/>Salvar parâmetros</button></form></section>;
}
