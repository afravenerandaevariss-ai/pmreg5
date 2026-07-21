import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://pabnvxlvrussdfhisxzn.supabase.co';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_btvgcbyES8_4w5x3dE-atg_kYfUAii4';
const supabase = createClient(supabaseUrl, supabaseKey);

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).send('Method Not Allowed');
  try {
    const { session_id, type } = req.body;
    if (!session_id || !type) return res.status(400).json({ error: 'Missing parameters' });

    const fileName = `${session_id}.xlsx`;

    // Download file from Supabase Storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('excel_uploads')
      .download(fileName);

    if (downloadError || !fileData) {
      throw new Error(`Gagal mengunduh file dari Storage: ${downloadError?.message || 'File tidak ditemukan'}`);
    }

    // Convert Blob to ArrayBuffer
    const arrayBuffer = await fileData.arrayBuffer();

    // Parse with XLSX
    const wb = XLSX.read(arrayBuffer, { type: 'array' });
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    
    let result;

    if (type === 'iw39') {
      result = XLSX.utils.sheet_to_json(sheet);
    } else if (type === 'zvtab') {
      const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      result = {};
      for (let i = 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length === 0) continue;
        const order = String(row[57] || '').trim();
        const po = String(row[38] || '').trim();
        if (order && po) result[order] = po;
      }
    } else if (type === '046exp') {
      const rawData = XLSX.utils.sheet_to_json(sheet, { range: 5 });
      result = {};
      for (const row of rawData) {
        const po = String(row['PO Number'] || '').trim();
        if (po) {
          result[po] = {
            pr: String(row['PR'] || '').trim(),
            ses: String(row['Ses Doc'] || '').trim(),
            mir7: String(row['Invoice Doc'] || '').trim()
          };
        }
      }
    } else {
      throw new Error(`Unknown parsing type: ${type}`);
    }

    // Store in parsed_excel using supabase-js
    const { error: insertError } = await supabase
      .from('parsed_excel')
      .insert({
        session_id,
        type,
        data: result
      });

    if (insertError) throw insertError;

    // Delete file from Storage to clean up
    const { error: deleteError } = await supabase.storage
      .from('excel_uploads')
      .remove([fileName]);
      
    if (deleteError) console.error("Failed to delete file from storage:", deleteError);

    res.status(200).json({ success: true, session_id });
  } catch (err) {
    console.error('Error in process-excel:', err);
    res.status(500).json({ error: err.message || err });
  }
}
