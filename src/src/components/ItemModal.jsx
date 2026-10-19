import React,{useState} from 'react';
import {X,Check,Trash2,RotateCcw} from 'lucide-react';
import {todayBR,addDays,validate} from '../domain';

const FIELDS=['lot','material','description','supplier','quantity','unit','received_at','deadline','released_at','responsible','notes','mrp_level','sap_status','stock','safety_stock','coverage_days','assigned_to'];
export default function ItemModal({item,profile,profiles,busy,error,close,onSave,onDelete}) {
  const [form,setForm]=useState(item?{...item}:{lot:'',material:'',description:'',supplier:'',quantity:0,unit:'PC',received_at:todayBR(),deadline:addDays(todayBR(),7),released_at:'',responsible:'',notes:'',mrp_level:'',sap_status:'',stock:'',safety_stock:'',coverage_days:'',assigned_to:''});
  const [localError,setLocalError]=useState(''),[confirm,setConfirm]=useState(false);
  const locked=!!item?.released_at;
  const readOnly=!!item&&profile.role!=='admin'&&item.owner_id!==profile.id;
  function record(reopen=false) {
    const data=Object.fromEntries(FIELDS.map(k=>[k,form[k]??'']));
    data.quantity=Number(data.quantity);
    for(const k of ['stock','safety_stock','coverage_days']) {
      data[k]=data[k]===''?null:Number(data[k]);
      if(data[k]!==null&&!Number.isFinite(data[k])) throw Error('Confira os campos numéricos.');
    }
    for(const k of ['lot','material','responsible']) data[k]=data[k].trim();
    data.deadline=data.deadline||null;data.released_at=reopen?null:(data.released_at||null);
    data.assigned_to=data.assigned_to||null;
    if(!locked&&data.released_at) data.responsible=profile.display_name;
    validate(data);return data;
  }
  function field(name,label,type='text',disabled=false) {
    return <label key={name}>{label}<input type={type} value={form[name]??''} required={['lot','material','quantity','received_at'].includes(name)} disabled={disabled||busy||readOnly} min={name==='quantity'?0:undefined} max={name==='released_at'?todayBR():undefined} step={type==='number'?'any':undefined} onChange={e=>setForm({...form,[name]:e.target.value})}/></label>;
  }
  return <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-label={item?'Editar item':'Novo item'}><div className="panel-title"><h2>{item?'Editar / liberar material':'Novo recebimento'}</h2><button aria-label="Fechar formulário" disabled={busy} onClick={close}><X size={18}/></button></div>
    {(error||localError)&&<div role="alert" className="alert error">{localError||error}</div>}
    {readOnly&&<div className="alert">Consulta somente leitura: este item pertence a outro usuário. Apenas quem cadastrou ou um administrador pode editar e liberar.</div>}
    {locked&&<div className="alert">Este item já foi liberado. Para corrigir quantidade, datas ou autoria, use Reabrir; o ciclo anterior será anulado no relatório.</div>}
    <form onSubmit={e=>{e.preventDefault();try{setLocalError('');onSave(record());}catch(err){setLocalError(err.message);}}}>
      <div className="form-grid">
        {field('lot','Lote *','text',locked)}{field('material','Material *','text',locked)}
        {field('description','Descrição')}{field('supplier','Fornecedor')}
        {field('quantity','Quantidade *','number',locked)}{field('unit','Unidade','text',locked)}
        {field('received_at','Recebimento *','date',locked)}{field('deadline','Deadline','date',locked)}
        {field('released_at','Data de liberação','date',!item||locked)}
        <label>Autoria da liberação<input readOnly value={locked?form.responsible:form.released_at?profile.display_name:'Usuário conectado ao liberar'} /></label>
        {field('mrp_level','Nível MRP')}{field('sap_status','Status SAP')}
        {field('stock','Estoque','number')}{field('safety_stock','Estoque de segurança','number')}{field('coverage_days','Cobertura em dias','number')}
        {profile.role==='admin'&&<label>Atribuir inspeção a<select value={form.assigned_to||''} disabled={busy} onChange={e=>setForm({...form,assigned_to:e.target.value})}><option value="">Sem atribuição adicional</option>{profiles.filter(p=>p.active).map(p=><option key={p.id} value={p.id}>{p.display_name}</option>)}</select></label>}
      </div>
      <label>Observações / referência de evidência<textarea rows="3" disabled={busy||readOnly} value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label>
      <p className="muted">{!item?'Salve o recebimento e depois abra o item para registrar uma liberação com autoria autenticada.':'A liberação será atribuída pelo banco ao usuário conectado. O proprietário do registro é preservado.'}</p>
      <div className="actions">{!readOnly&&<button className="primary" disabled={busy}><Check size={16}/>Salvar item</button>}{!readOnly&&locked&&<button type="button" disabled={busy} onClick={()=>{try{setLocalError('');onSave(record(true));}catch(err){setLocalError(err.message);}}}><RotateCcw size={16}/>Reabrir item</button>}</div>
    </form>
    {item&&(profile.role==='admin'||item.owner_id===profile.id)&&<div className="danger-zone"><label className="checkbox-label"><input type="checkbox" checked={confirm} onChange={e=>setConfirm(e.target.checked)}/>Confirmo excluir este registro</label><button className="danger" disabled={busy||!confirm} onClick={onDelete}><Trash2 size={16}/>Excluir item</button></div>}
  </section></div>;
}
