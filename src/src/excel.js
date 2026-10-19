import {addDays,validate,validDate} from './domain';
const aliases={lot:['lote','lote de controle'],material:['material'],description:['descricao','texto breve de material','texto breve do objeto de controle'],supplier:['fornecedor'],quantity:['quantidade','qtd.lote controle'],unit:['unidade','um','um basica'],received_at:['recebimento','inicio do controle'],deadline:['deadline'],released_at:['liberacao','data liberacao'],responsible:['responsavel','autor liberacao','autor da du'],notes:['observacoes'],mrp_level:['nivel mrp'],sap_status:['status sap','status do sistema']};
Object.assign(aliases,{stock:['estoque','estoque de centro'],safety_stock:['estoque seguranca','estoque de seguranca'],coverage_days:['cobertura dias','cobert.estoq.dias']});
const norm=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
export function scalar(v){if(v&&typeof v==='object'&&!(v instanceof Date)){if('formula'in v||'sharedFormula'in v)return v.result??'';if(v.richText)return v.richText.map(t=>t.text).join('');return v.text??'';}return v??'';}
export function excelDate(v){v=scalar(v);if(v==='')return null;if(v instanceof Date)return v.toISOString().slice(0,10);if(typeof v==='number')return new Date(Date.UTC(1899,11,30)+v*86400000).toISOString().slice(0,10);if(validDate(String(v).slice(0,10)))return String(v).slice(0,10);const m=String(v).match(/^(\d{2})\/(\d{2})\/(\d{4})$/);if(m){const d=`${m[3]}-${m[2]}-${m[1]}`;if(validDate(d))return d;}throw Error(`Data não reconhecida: ${v}`);}
export async function parseExcel(buffer,days=7){
 const {default:ExcelJS}=await import('exceljs');const book=new ExcelJS.Workbook();await book.xlsx.load(buffer);const records=new Map();let sheets=0;
 const ordered=[...book.worksheets].sort((a,b)=>((a.name==='QA32'?0:a.name==='SINALIZADOR CRITICO'?1:2)-(b.name==='QA32'?0:b.name==='SINALIZADOR CRITICO'?1:2)));
 for(const sheet of ordered){
  const header=new Map();sheet.getRow(1).eachCell((c,col)=>header.set(norm(c.value),col));
  if(!header.has('material')||!(header.has('lote')||header.has('lote de controle')))continue;sheets++;
  for(let n=2;n<=sheet.rowCount;n++){
   const row=sheet.getRow(n);const rec={};
   for(const [target,names]of Object.entries(aliases)){const h=names.find(x=>header.has(x));rec[target]=h?scalar(row.getCell(header.get(h)).value):'';}
   for(const k of Object.keys(rec))if(!['received_at','deadline','released_at','quantity'].includes(k))rec[k]=String(rec[k]??'').trim();
   if(!rec.lot&&!rec.material)continue;
   const label=`${sheet.name}, linha ${n}`;
   try{
    for(const k of ['received_at','deadline','released_at'])rec[k]=excelDate(rec[k]);
    if(rec.quantity==='')throw Error('Quantidade ausente');
    rec.quantity=typeof rec.quantity==='number'?rec.quantity:Number(String(rec.quantity).replace(',','.'));
    for(const k of ['stock','safety_stock','coverage_days']){rec[k]=rec[k]===''?null:Number(String(rec[k]).replace(',','.'));if(rec[k]!==null&&!Number.isFinite(rec[k]))throw Error('Valor numérico inválido: '+k);}
    const id=JSON.stringify([rec.lot,rec.material]);
    if(records.has(id)){const current=records.get(id);for(const [k,v]of Object.entries(rec))if(current[k]===''||current[k]===null)current[k]=v;}
    else records.set(id,rec);
   }catch(e){throw Error(`${label}: ${e.message}`);}
  }
 }
 if(!sheets)throw Error('Não foi encontrada uma aba com Material e Lote de controle (ou Lote).');
 return [...records.values()].map(i=>validate({...i,deadline:i.deadline||addDays(i.received_at,days)}));
}
export async function downloadExcel(items){
 const {default:ExcelJS}=await import('exceljs');const book=new ExcelJS.Workbook();const ws=book.addWorksheet('Itens');
 const fields={Lote:'lot',Material:'material','Descrição':'description',Fornecedor:'supplier',Quantidade:'quantity',Unidade:'unit',Recebimento:'received_at',Deadline:'deadline','Liberação':'released_at','Responsável':'responsible','Observações':'notes','Nível MRP':'mrp_level','Status SAP':'sap_status',Estoque:'stock','Estoque segurança':'safety_stock','Cobertura dias':'coverage_days','Status prazo':'status'};
 ws.columns=Object.entries(fields).map(([header,key])=>({header,key,width:key==='description'?48:22}));
 items.forEach(i=>ws.addRow(i));ws.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};ws.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF17365D'}};ws.views=[{state:'frozen',ySplit:1}];ws.autoFilter={from:'A1',to:'Q1'};
 const blob=new Blob([await book.xlsx.writeBuffer()],{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='qa32_exportacao.xlsx';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
