import {it,expect} from 'vitest';
import {readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import ExcelJS from 'exceljs';
import {parseExcel,excelDate} from './excel';
it.skipIf(!existsSync(new URL('../dados_originais/CRITICOS QA32.XLSX',import.meta.url)))('importa os 106 lotes reais e enriquece 99',async()=>{
 const a=await parseExcel(await readFile(new URL('../dados_originais/CRITICOS QA32.XLSX',import.meta.url)));
 expect(a).toHaveLength(106);expect(a.filter(i=>i.mrp_level)).toHaveLength(99);
 expect(new Set(a.map(i=>JSON.stringify([i.lot,i.material]))).size).toBe(106);
 expect(a.every(i=>i.deadline)).toBe(true);expect(a.every(i=>!i.released_at)).toBe(true);
});
it('datas seriais, brasileiras e fórmulas',()=>{expect(excelDate(1)).toBe('1899-12-31');expect(excelDate('16/10/2026')).toBe('2026-10-16');expect(excelDate({formula:'B2+7',result:46311})).toBeTruthy();expect(()=>excelDate('31/02/2026')).toThrow();});
it('mantém zeros em lotes e adiciona prazo se fórmula não tem cache',async()=>{const b=new ExcelJS.Workbook();const s=b.addWorksheet('Itens');s.addRow(['Lote','Material','Quantidade','Recebimento','Deadline']);s.addRow(['001','002',4,'2026-10-16',{formula:'D2+7'}]);const a=await parseExcel(await b.xlsx.writeBuffer());expect(a[0].lot).toBe('001');expect(a[0].deadline).toBe('2026-10-23');});
it('rejeita formato não mapeado',async()=>{const b=new ExcelJS.Workbook();b.addWorksheet('Resumo').addRow(['Status','Total']);await expect(parseExcel(await b.xlsx.writeBuffer())).rejects.toThrow('Não foi encontrada');});
