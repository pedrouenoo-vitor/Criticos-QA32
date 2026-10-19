import React,{useState,useEffect,useRef} from 'react';
import {ClipboardCheck,LayoutDashboard,Plus,Upload,History,LogOut,RefreshCw,Download,Search,Pencil,ShieldCheck,PanelLeftClose,PanelLeftOpen,Moon,Sun,UserRound,ArrowUpRight} from 'lucide-react';
import {db,configured,saveItem,deleteItem,importItems} from './db';
import {loadProfile,loadProfiles,loadWorkspace} from './workspace';
import {todayBR,displayDate,STATUSES,queue,filterQueue} from './domain';
import {cardMetrics} from './analytics';
import {parseExcel,downloadExcel} from './excel';
import ItemModal from './components/ItemModal';
import './style.css';

const EMPTY={items:[],history:[],releases:[],settings:{comparison_days:15,attention_days:2,version:1}};
const Admin=React.lazy(()=>import('./components/Admin'));
function remembered(key,fallback) {try{return localStorage.getItem(key)||fallback;}catch{return fallback;}}
function remember(key,value) {try{localStorage.setItem(key,value);}catch{/* Preferências continuam na sessão se o armazenamento estiver bloqueado. */}}
function App() {
  const [session,setSession]=useState(null),[authReady,setAuthReady]=useState(!configured),[profile,setProfile]=useState(null),[profiles,setProfiles]=useState([]),[workspace,setWorkspace]=useState(EMPTY);
  const [page,setPage]=useState('Painel'),[busy,setBusy]=useState(false),[error,setError]=useState(''),[notice,setNotice]=useState('');
  const [query,setQuery]=useState(''),[supplier,setSupplier]=useState(''),[selected,setSelected]=useState(STATUSES.slice(0,5));
  const [clock,setClock]=useState(todayBR()),[editing,setEditing]=useState(undefined),[incoming,setIncoming]=useState([]),[importDays,setImportDays]=useState(7);
  const [email,setEmail]=useState(''),[password,setPassword]=useState('');
  const [theme,setTheme]=useState(()=>remember('qa32.theme','light')),[collapsed,setCollapsed]=useState(()=>remember('qa32.sidebar','expanded')==='collapsed');
  const identity=useRef(null),requestNumber=useRef(0);
  useEffect(()=>{document.documentElement.dataset.theme=theme;remember('qa32.theme',theme);},[theme]);
  useEffect(()=>{remember('qa32.sidebar',collapsed?'collapsed':'expanded');},[collapsed]);
  useEffect(()=>{const t=setInterval(()=>setClock(todayBR()),60000);return()=>clearInterval(t);},[]);
  useEffect(()=>{
    if(!db) return;
    let live=true;
    function accept(s) {
      if(!live) return;
      if(identity.current!==s?.user.id) {
        requestNumber.current++;setProfile(null);setProfiles([]);setWorkspace(EMPTY);setIncoming([]);setEditing(undefined);setPage('Painel');
      }
      identity.current=s?.user.id||null;setSession(s);setAuthReady(true);
    }
    db.auth.getSession().then(({data,error})=>{accept(data.session);if(error&&live)setError(error.message);});
    const {data}=db.auth.onAuthStateChange((event,s)=>accept(s));
    return()=>{live=false;data.subscription.unsubscribe();};
  },[]);
  useEffect(()=>{if(session)run(()=>refresh(session.user.id));},[session?.user.id]);
  async function run(fn) {
    setBusy(true);setError('');setNotice('');
    try{await fn();return true;}catch(e){setError(e.code==='23505'?'Este lote e material já existem.':e.message||'Não foi possível concluir a operação.');return false;}finally{setBusy(false);}
  }
  async function refresh(userId=identity.current) {
    const n=++requestNumber.current;
    const current=await loadProfile(userId);
    if(identity.current!==userId||n!==requestNumber.current)return;
    setProfile(current);
    if(!current.active){setWorkspace(EMPTY);setProfiles([]);return;}
    const [data,people]=await Promise.all([loadWorkspace(),current.role==='admin'?loadProfiles():Promise.resolve([])]);
    if(identity.current!==userId||n!==requestNumber.current)return;
    setWorkspace(data);setProfiles(people);setClock(todayBR());
    if(current.role!=='admin')setPage(p=>p==='Administrador'?'Painel':p);
  }
  const signOut=()=>run(async()=>{const {error}=await db.auth.signOut();if(error)throw error;});
  const themeButton=<button className="icon-button" aria-label={theme==='dark'?'Ativar modo claro':'Ativar modo escuro'} title={theme==='dark'?'Modo claro':'Modo escuro'} onClick={()=>setTheme(theme==='dark'?'light':'dark')}>{theme==='dark'?<Sun size={19}/>:<Moon size={19}/>}</button>;
  if(!configured)return <div className="setup"><ClipboardCheck size={40}/><h1>QA32 pronto para conectar</h1><p>Configure VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY na Vercel e gere um novo deploy. Para a V2, execute também a migração 002_admin_productivity.sql.</p></div>;
  if(!authReady)return <div className="setup">Verificando sessão…</div>;
  if(!session)return <div className="login"><section><div className="brand"><ClipboardCheck/><b>QA32</b><span>QUALITY CONTROL · V2</span></div><span className="eyebrow">RECEBIMENTO · INSPEÇÃO · LIBERAÇÃO</span><h1>O próximo item.<br/>Na hora certa.</h1><p>Uma fila clara para acompanhar materiais, prazos e produtividade da qualidade.</p></section><form onSubmit={e=>{e.preventDefault();run(async()=>{const {error}=await db.auth.signInWithPassword({email,password});if(error)throw error;setPassword('');});}}><div className="panel-title"><h2>Entrar na sua conta</h2>{themeButton}</div><p>Use o usuário criado pelo administrador.</p><label>E-mail<input required type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)}/></label><label>Senha<input required type="password" autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/></label>{error&&<div role="alert" className="alert error">{error}</div>}<button className="primary" disabled={busy}>{busy?'Entrando…':'Acessar painel'}<ArrowUpRight size={17}/></button></form></div>;
  if(!profile||!profile.active) return <div className="setup"><h1>{profile?'Acesso desativado':'Preparando seu acesso'}</h1><p>{profile?'Seu acesso ao projeto está desativado. Procure o administrador.':'Conferindo perfil e migração do banco da V2.'}</p>{error&&<div role="alert" className="alert error">{error}</div>}<div className="actions"><button disabled={busy} onClick={()=>run(refresh)}>Tentar novamente</button><button disabled={busy} onClick={signOut}>Sair</button></div></div>;
  const {items,history,releases,settings}=workspace;
  const all=queue(items,clock,settings.attention_days),filtered=filterQueue(all,{query,supplier,selected});
  const metrics=cardMetrics(items,history,settings.comparison_days,settings.attention_days,clock,{query,supplier});
  const shownStatuses=['ATRASADO','VENCE HOJE','ATENÇÃO','EM DIA','LIBERADO'];
  const existing=new Set(items.map(i=>JSON.stringify([i.lot,i.material]))),fresh=incoming.filter(i=>!existing.has(JSON.stringify([i.lot,i.material])));
  const navigation=[['Painel',LayoutDashboard],['Importar Excel',Upload],['Histórico',History],...(profile.role==='admin'?[['Administrador',ShieldCheck]]:[]),['Minha conta',UserRound],['Ajuda',ClipboardCheck]];
  return <div className={'layout'+(collapsed?' sidebar-collapsed':'')}>
    <aside><div className="brand"><ClipboardCheck/><b>QA32</b><span>QUALITY CONTROL · V2</span></div><button className="collapse-button" aria-label={collapsed?'Expandir menu lateral':'Recolher menu lateral'} title={collapsed?'Expandir menu':'Recolher menu'} onClick={()=>setCollapsed(!collapsed)}>{collapsed?<PanelLeftOpen size={19}/>:<PanelLeftClose size={19}/>}<span>{collapsed?'':'Recolher menu'}</span></button><div className="sidebar-label">ESPAÇO DE TRABALHO</div><nav>{navigation.map(([label,Icon])=><button key={label} title={label} aria-label={label} aria-current={page===label?'page':undefined} className={page===label?'active':''} disabled={busy} onClick={()=>{setPage(label);setError('');setNotice('');}}><Icon size={18}/><span>{label}</span></button>)}</nav><div className="sidebar-bottom"><span className="online"/><span className="sidebar-status">Supabase · {profile.role==='admin'?'Administrador':'Operador'}</span><p>{profile.display_name}<br/>{session.user.email}</p><button disabled={busy} aria-label="Sair da conta" onClick={signOut}><LogOut size={16}/><span>Sair da conta</span></button></div></aside>
    <main><header><div><span className="eyebrow">OPERAÇÕES / CONTROLE DE QUALIDADE</span><h1>{page==='Painel'?'Recebimento de materiais':page}</h1><p>{displayDate(clock)} · São Paulo · {items.length} itens acessíveis</p></div><div className="actions">{themeButton}<button className="mobile-signout" aria-label="Sair" disabled={busy} onClick={signOut}><LogOut size={17}/></button><button disabled={busy} onClick={()=>run(refresh)}><RefreshCw size={16}/>Atualizar</button><button className="primary" disabled={busy} onClick={()=>{setError('');setEditing(null);}}><Plus size={17}/>Novo item</button></div></header>
      {error&&<div role="alert" className="alert error">{error}</div>}{notice&&<div role="status" className="alert success">{notice}</div>}{busy&&<div className="alert" role="status">Processando…</div>}
      {page==='Painel'&&<>
        <div className="metrics five-cards">{shownStatuses.map(s=>{const m=metrics.find(m=>m.status===s),change=m.hasHistory?m.change:null;
          const favorable=change===null||change===0?'neutral':s==='ATRASADO'?(change<0?'good':'bad'):s==='LIBERADO'?(change>0?'good':'bad'):'neutral';
          return <button key={s} className={'metric m'+STATUSES.indexOf(s)} aria-label={'Filtrar '+s} onClick={()=>setSelected([s])}><div><span>{s==='LIBERADO'?'ITENS LIBERADOS':s}</span><ArrowUpRight size={15}/></div><b>{m.value}</b><span className={'change '+favorable}>{change===null?'Sem base':`${change>0?'+':''}${change.toLocaleString('pt-BR',{maximumFractionDigits:1})}%`} <small>vs. {settings.comparison_days} dias atrás</small></span></button>;})}</div>
        <p className="card-caption">Cards respeitam busca e fornecedor. A seleção de status filtra somente a fila. Base de comparação: fim de {displayDate(metrics[0].priorDate)}. Sem histórico suficiente, o percentual aparece como Sem base.</p>
        <section className="panel"><div className="panel-title"><div><h2>Fila de inspeção <span className="counter">{filtered.length}</span></h2><p>Os prazos mais urgentes aparecem primeiro.</p></div><button disabled={busy||!filtered.length} onClick={()=>run(()=>downloadExcel(filtered))}><Download size={16}/>Exportar Excel</button></div>
          <div className="filters"><label className="search"><Search size={17}/><input aria-label="Buscar" placeholder="Buscar material, lote, descrição…" value={query} onChange={e=>setQuery(e.target.value)}/></label><select aria-label="Fornecedor" value={supplier} onChange={e=>setSupplier(e.target.value)}><option value="">Todos os fornecedores</option>{[...new Set(items.map(i=>i.supplier))].filter(Boolean).sort().map(v=><option key={v}>{v}</option>)}</select><small>Atenção: {settings.attention_days} dias</small></div>
          <div className="chips">{STATUSES.map((s,n)=><button aria-pressed={selected.includes(s)} className={selected.includes(s)?'chosen':''} key={s} onClick={()=>setSelected(selected.includes(s)?selected.filter(x=>x!==s):[...selected,s])}><span className={'dot s'+n}/>{s}</button>)}<button onClick={()=>{setQuery('');setSupplier('');setSelected(STATUSES.slice(0,5));}}>Limpar filtros</button></div>
          <div className="table-wrap"><table><thead><tr>{['#','Material / descrição','Lote','Fornecedor','Quantidade','Deadline','Situação','Responsável / atribuição','Ações'].map(h=><th key={h}>{h}</th>)}</tr></thead><tbody>{filtered.map((i,n)=><tr key={i.id}><td className="seq">{String(n+1).padStart(2,'0')}</td><td><strong>{i.material}</strong><span className="description">{i.description||'Sem descrição'}</span></td><td>{i.lot}</td><td>{i.supplier||'—'}</td><td>{Number(i.quantity).toLocaleString('pt-BR')} <small>{i.unit}</small></td><td><strong>{displayDate(i.deadline)}</strong><span className="description">{i.status==='LIBERADO'?`Liberado em ${displayDate(i.released_at)}`:i.days===null?'Sem prazo':i.days<0?`${-i.days} dia(s) em atraso`:i.days===0?'Hoje':`Em ${i.days} dia(s)`}</span></td><td><span className={'badge s'+STATUSES.indexOf(i.status)}>{i.status}</span></td><td>{i.responsible||'—'}<small className="description">{i.assigned_to?`Atribuído: ${profiles.find(p=>p.id===i.assigned_to)?.display_name||(i.assigned_to===profile.id?'você':'usuário')}`:'Sem atribuição adicional'}</small></td><td><button title="Editar ou liberar" aria-label={'Editar lote '+i.lot} disabled={busy} onClick={()=>{setError('');setEditing(i);}}><Pencil size={15}/></button></td></tr>)}</tbody></table>{!filtered.length&&<div className="empty"><ClipboardCheck size={32}/><h3>Nenhum item nesta seleção</h3><p>Altere os filtros, cadastre um material ou importe sua planilha QA32.</p></div>}</div>
          <div className="table-footer">{filtered.length} registros filtrados · {filtered.filter(i=>i.status==='LIBERADO').length} liberados · {filtered.filter(i=>i.status==='SEM PRAZO').length} sem prazo</div>
        </section>
        <div className="charts"><section className="panel"><h2>Distribuição dos prazos</h2>{STATUSES.map((s,n)=>{const count=filtered.filter(i=>i.status===s).length;return <div className="bar-row" key={s}><span>{s}</span><div className="bar-track"><div className={'bar s'+n} style={{width:`${count/Math.max(1,filtered.length)*100}%`}}/></div><b>{count}</b></div>;})}</section><section className="panel"><h2>Recebimentos recentes</h2>{Object.entries(filtered.reduce((a,i)=>{a[i.received_at]=(a[i.received_at]||0)+1;return a;},{})).sort(([a],[b])=>b.localeCompare(a)).slice(0,7).map(([d,n])=><div className="bar-row" key={d}><span>{displayDate(d)}</span><div className="bar-track"><div className="bar received" style={{width:`${n/Math.max(1,filtered.length)*100}%`}}/></div><b>{n}</b></div>)}</section></div>
      </>}
      {page==='Administrador'&&<React.Suspense fallback={<div className="alert">Abrindo administração…</div>}><Admin profile={profile} profiles={profiles} workspace={workspace} busy={busy} run={run} refresh={refresh} setNotice={setNotice}/></React.Suspense>}
      {page==='Importar Excel'&&<section className="panel import"><Upload size={36}/><h2>Traga seus recebimentos</h2><p>Integra QA32 e SINALIZADOR CRITICO. Acrescenta novos lotes e preserva alterações existentes.</p><label>Prazo padrão, se o deadline estiver vazio (dias corridos)<input type="number" min="0" max="365" value={importDays} onChange={e=>{setIncoming([]);setImportDays(Math.max(0,Math.min(365,Number(e.target.value)||0)));}}/></label><label className="upload-zone">Selecionar planilha .xlsx<input type="file" accept=".xlsx" disabled={busy} onChange={e=>{const file=e.target.files[0];setIncoming([]);if(file)run(async()=>{if(file.size>15*1024*1024)throw Error('Arquivo maior que 15 MB. Divida a planilha.');const rows=await parseExcel(await file.arrayBuffer(),importDays);if(rows.length>500)throw Error('Limite por importação: 500 registros.');setIncoming(rows);});}}/></label>{!!incoming.length&&<><div className="alert">{incoming.length} registros válidos · {fresh.length} novos · {incoming.length-fresh.length} já existentes</div><ul>{incoming.slice(0,5).map(i=><li key={i.lot+i.material}>{i.lot} · {i.material} · {i.description}</li>)}</ul><button className="primary" disabled={busy||!fresh.length} onClick={()=>run(async()=>{const n=await importItems(fresh,session.user);await refresh();setIncoming([]);setNotice(`${n} registros importados.`);})}>Confirmar importação de {fresh.length} itens</button></>}<small>Datas de liberação trazidas pelo Excel entram no relatório como histórico sem vínculo de autoria. Para registrar uma liberação V2, abra um item pendente e confirme a data.</small></section>}
      {page==='Histórico'&&<section className="panel"><h2>Últimas 100 alterações acessíveis</h2>{[...history].sort((a,b)=>b.changed_at.localeCompare(a.changed_at)||Number(b.id)-Number(a.id)).slice(0,100).map(h=><details key={h.id}><summary>{new Date(h.changed_at).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})} · {({INSERT:'Cadastro',UPDATE:'Edição',DELETE:'Exclusão'})[h.operation]} · Lote {(h.new_record||h.old_record)?.lot}</summary><pre>{JSON.stringify({antes:h.old_record,depois:h.new_record},null,2)}</pre></details>)}{!history.length&&<p>Nenhuma alteração registrada.</p>}</section>}
      {page==='Minha conta'&&<Account profile={profile} busy={busy} run={run} setNotice={setNotice}/>}
      {page==='Ajuda'&&<section className="panel help"><h2>QA32 V2 · Como usar</h2><ol><li>Importe a planilha ou cadastre recebimentos.</li><li>Consulte a fila e abra o lápis para editar ou liberar.</li><li>A liberação é atribuída automaticamente ao usuário autenticado.</li><li>Para corrigir quantidade ou datas de um item liberado, reabra primeiro.</li><li>Administradores podem atribuir um item a outro usuário, acompanhar produtividade e criar contas.</li></ol><p>Operadores veem seus itens e aqueles atribuídos a eles. Administradores veem todos os dados deste projeto. Prazos usam dias corridos e fuso de São Paulo.</p><p>O modo escuro e o menu recolhível são preferências deste navegador. Os dias de comparação e de atenção são salvos no Supabase pelo administrador, em Administrador → Indicadores.</p><p>Reabrir anula o ciclo anterior no relatório; a auditoria permanece. Excluir um item preserva sua produtividade já registrada. Faça backups e exportações periódicas.</p><button disabled={busy} onClick={()=>run(()=>downloadExcel(all))}><Download size={16}/>Exportar base acessível</button></section>}
      <footer>QA32 V2 · Gestão da qualidade<span>{profile.role==='admin'?'Visão administrativa':'Visão do operador'} · Dias corridos</span></footer>
    </main>
    {editing!==undefined&&<ItemModal item={editing} profile={profile} profiles={profiles} busy={busy} error={error} close={()=>{setEditing(undefined);setError('');}} onSave={record=>run(async()=>{await saveItem(record,editing,session.user);await refresh();setEditing(undefined);setNotice('Item salvo com sucesso.');})} onDelete={()=>run(async()=>{await deleteItem(editing);await refresh();setEditing(undefined);setNotice('Item excluído. Auditoria e produtividade foram preservadas.');})}/>}
  </div>;
}
function Account({profile,busy,run,setNotice}) {
  const [password,setPassword]=useState(''),[confirm,setConfirm]=useState('');
  return <section className="panel help"><h2>{profile.display_name}</h2><p>{profile.email} · {profile.role==='admin'?'Administrador':'Operador'}</p><h3>Alterar minha senha</h3><form onSubmit={e=>{e.preventDefault();run(async()=>{if(password!==confirm)throw Error('As senhas não coincidem.');if(password.length<12||!/[a-zA-Z]/.test(password)||!/\d/.test(password))throw Error('Use ao menos 12 caracteres, com letras e números.');const {error}=await db.auth.updateUser({password});if(error)throw error;setPassword('');setConfirm('');setNotice('Senha alterada.');});}}><div className="form-grid"><label>Nova senha<input type="password" autoComplete="new-password" required minLength="12" maxLength="128" value={password} onChange={e=>setPassword(e.target.value)}/></label><label>Confirmar nova senha<input type="password" autoComplete="new-password" required value={confirm} onChange={e=>setConfirm(e.target.value)}/></label></div><button className="primary" disabled={busy}>Salvar nova senha</button></form></section>;
}
class ErrorBoundary extends React.Component {
  state={failed:false};static getDerivedStateFromError(){return {failed:true};}
  render(){return this.state.failed?<div className="setup"><h1>Não foi possível abrir o painel</h1><p>Atualize a página e confira a migração e as variáveis de ambiente.</p><button onClick={()=>location.reload()}>Recarregar</button></div>:this.props.children;}
}
export default function Root(){return <ErrorBoundary><App/></ErrorBoundary>;}
