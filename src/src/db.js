import {createClient} from '@supabase/supabase-js';
const url=import.meta.env.VITE_SUPABASE_URL;
const key=import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
export const configured=!!(url&&key&&!url.includes('SEU-PROJETO')&&!key.includes('SUBSTITUA'));
export const db=configured?createClient(url,key):null;
export async function loadItems(){
 let all=[],from=0;
 while(true){const {data,error}=await db.from('qa_items').select('*').order('id').range(from,from+499);if(error)throw error;all.push(...data);if(data.length<500)return all;from+=500;}
}
export async function saveItem(item,old,user){
 if(old){const {data,error}=await db.from('qa_items').update(item).eq('id',old.id).eq('version',old.version).select();if(error)throw error;if(!data.length)throw Error('Outro usuário alterou o item. Atualize a lista e tente novamente.');}
 else {const {error}=await db.from('qa_items').insert({...item,owner_id:user.id});if(error)throw error;}
}
export async function deleteItem(item){const {data,error}=await db.from('qa_items').delete().eq('id',item.id).eq('version',item.version).select('id');if(error)throw error;if(!data.length)throw Error('O item mudou. Atualize a lista antes de excluir.');}
export async function importItems(items,user){
 // Uma requisição = uma transação; conflitos de lote/material preservam alterações existentes.
 const {data,error}=await db.from('qa_items').upsert(items.map(i=>({...i,owner_id:user.id})),{onConflict:'owner_id,lot,material',ignoreDuplicates:true}).select('id');
 if(error)throw error;return data.length;
}
