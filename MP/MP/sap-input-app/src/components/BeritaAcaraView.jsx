/**
 * ============================================================================
 * 🔒 STRICTLY LOCKED COMPONENT: BERITA ACARA (KUNCI KETAT)
 * ============================================================================
 * STATUS: LOCKED & FROZEN BY USER REQUEST
 * 
 * DO NOT MODIFY THIS FILE OR ITS LOGIC WHEN WORKING ON OTHER MODULES.
 * All formatting, print layout, unit-code mapping, dual-page pagination,
 * multi-page borders, and Supabase auto-save persistence have been verified
 * and deployed to production.
 * ============================================================================
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FileText, RefreshCw, Printer, ExternalLink, AlertTriangle, Upload, X, FolderOpen, Trash2, Clock, CheckCircle2, Loader2, FileUp } from 'lucide-react';
import { supabase } from '../lib/supabase';

// BA tables are shared between DEV and PROD (dev_ba_edits etc. don't exist in Supabase)
const T_BA_EDITS      = 'ba_edits';
const T_BA_UNIT_EDITS = 'ba_unit_edits';
const T_PDF_UPLOADS   = 'pdf_uploads';


// ============================================================
// GOOGLE APPS SCRIPT WEB APP URL untuk Upload ke Google Drive
// Ganti nilai ini dengan URL yang Anda dapatkan setelah deploy GAS
// ============================================================
const DRIVE_UPLOAD_GAS_URL = 'https://script.google.com/macros/s/AKfycbyDTupiGzQkcIMB9NhPF452qcRbAsqO5GcEnzluhVim0RRZoGo7VJiF4WkUjIbXstVXEw/exec';
const DRIVE_PARENT_FOLDER_ID = '1JbdKfnnLtFEEX1Ket-zDG-vSWUJouXOK';

const baSpreadsheetId = "1qnUO7cv0QkgcmbHfbKqtuxrNBvRAvW1Pis_lNe-bH9Q";
const baPlantGidMap = {
  "5E01": "1303884220",  // KEBUN GUNUNG MELIAU
  "5E02": "2135738591",  // KEBUN GUNUNG MAS
  "5E03": "1517696568",  // KEBUN SUNGAI DEKAN
  "5E04": "497071386",   // KEBUN RIMBA BELIAN
  "5E06": "1160889375",  // KEBUN SINTANG
  "5E07": "963639228",   // KEBUN NGABANG
  "5E08": "1219696675",  // KEBUN PARINDU
  "5E09": "950761709",   // KEBUN KEMBAYAN
  "5E11": "1674828736",  // KEBUN DANAU SALAK
  "5E12": "1887172657",  // KEBUN KUMAI KARET
  "5E13": "1266359771",  // KEBUN BATULICIN
  "5E14": "384993858",   // KEBUN PAMUKAN
  "5E15": "1997746437",  // KEBUN PELAIHARI
  "5E16": "1178360160",  // KEBUN TABARA
  "5E17": "670595830",   // KEBUN TAJATI
  "5E18": "226029537",   // KEBUN PANDAWA
  "5E19": "118697651",   // KEBUN LONGKALI
  "5F01": "837306200",   // PABRIK GUNUNG MELIAU
  "5F04": "1166270100",  // PABRIK RIMBA BELIAN
  "5F07": "516903064",   // PABRIK NGABANG
  "5F08": "942213141",   // PABRIK PARINDU
  "5F09": "121172532",   // PABRIK KEMBAYAN
  "5F11": "1037474081",  // UNIT PROYEK BATU BARA
  "5F14": "249921846",   // PABRIK PAMUKAN
  "5F15": "1819863835",  // PABRIK PELAIHARI
  "5F20": "1343055326",  // PKR TAMBARANGAN
  "5F21": "1007069224",  // PABRIK SAMUNTAI
  "5F22": "1097123651",  // PABRIK LONG PINANG
  "5D01": "1199608937",  // DISTRIK KALBAR
  "5D02": "1122696923",  // DISTRIK KALTIM
  "5D03": "1042534132",  // DISTRIK KALSELTENG
};

function loadGoogleSheetJSONP(url) {
  return new Promise((resolve, reject) => {
    const callbackName = "gvizCallback_" + Math.round(100000 * Math.random());
    const scriptId = "jsonp_gviz_" + callbackName;
    
    window[callbackName] = function(data) {
      resolve(data);
      delete window[callbackName];
      const scriptEl = document.getElementById(scriptId);
      if (scriptEl && scriptEl.parentNode) {
        scriptEl.parentNode.removeChild(scriptEl);
      }
    };
    
    const separator = url.includes('?') ? '&' : '?';
    const jsonpUrl = url + separator + "tqx=responseHandler:" + callbackName;
    
    const script = document.createElement('script');
    script.id = scriptId;
    script.src = jsonpUrl;
    script.onerror = (err) => {
      reject(new Error("Gagal mengambil data dari Google Sheets. Pastikan spreadsheet Anda memiliki izin akses 'Siapa saja yang memiliki link'."));
      delete window[callbackName];
      const scriptEl = document.getElementById(scriptId);
      if (scriptEl && scriptEl.parentNode) {
        scriptEl.parentNode.removeChild(scriptEl);
      }
    };
    
    document.body.appendChild(script);
  });
}

export default function BeritaAcaraView({ currentUser }) {
  const [selectedUnit, setSelectedUnit] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [baData, setBaData] = useState(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [gid, setGid] = useState('');
  const autoLoadedRef = useRef(false);

  // Upload PDF state
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploadFile, setUploadFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null); // 'success' | 'error' | null
  const [uploadMessage, setUploadMessage] = useState('');
  const [uploadHistory, setUploadHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isDeletingId, setIsDeletingId] = useState(null);

  const isAdmin = currentUser && (
    currentUser.role === 'Admin' ||
    currentUser.role?.toUpperCase() === 'ADMIN' ||
    currentUser.role?.toUpperCase() === 'REGIONAL' ||
    currentUser.role?.toUpperCase() === 'DEV'
  );


  const isRestricted = currentUser && (currentUser.plant !== '5R00' && currentUser.plant !== 'ALL');

  useEffect(() => {
    if (isRestricted && currentUser.plant) {
      const allOptions = [
        "Gunung Meliau|5E01",
        "Gunung Mas|5E02",
        "Sungai Dekan|5E03",
        "Rimba Belian|5E04",
        "Sintang|5E06",
        "Ngabang|5E07",
        "Parindu|5E08",
        "Kembayan|5E09",
        "Danau Salak|5E11",
        "Kumai|5E12",
        "Batu Licin|5E13",
        "Pamukan|5E14",
        "Pelaihari|5E15",
        "Tabara|5E16",
        "Tajati|5E17",
        "Pandawa|5E18",
        "Longkali|5E19",
        "PKS Gunung Meliau|5F01",
        "PKS Rimba Belian|5F04",
        "PKS Ngabang|5F07",
        "PKS Parindu|5F08",
        "PKS Kembayan|5F09",
        "Unit Proyek Batu Bara|5F11",
        "PKS Pamukan|5F14",
        "PKS Pelaihari|5F15",
        "Tambarangan|5F20",
        "PKS Samuntai|5F21",
        "PKS Longpinang|5F22"
      ];
      const match = allOptions.find(opt => opt.endsWith(`|${currentUser.plant}`));
      if (match) {
        setSelectedUnit(match);
      }
    }
  }, [currentUser, isRestricted]);

  const handleLoad = async (overrideUnit = null) => {
    const unitToLoad = overrideUnit || selectedUnit;
    if (!unitToLoad) {
      setError("Silakan pilih unit terlebih dahulu.");
      return;
    }

    const parts = unitToLoad.split('|');
    const unitName = parts[0];
    const plantCode = parts[1];
    const targetGid = baPlantGidMap[plantCode] || "1303884220";
    setGid(targetGid);
    setError(null);
    setLoading(true);
    setStatusMsg(`Memuat data ${plantCode ? '[' + plantCode + '] ' : ''}${unitName}...`);

    // Check localStorage cache first for immediate responsiveness
    try {
      const cached = localStorage.getItem('ba_draft_' + plantCode);
      if (cached) {
        const parsedCached = JSON.parse(cached);
        if (parsedCached && parsedCached.plantCode === plantCode) {
          setBaData(parsedCached);
        }
      }
    } catch (e) {}

    const jsonpUrl = `https://docs.google.com/spreadsheets/d/${baSpreadsheetId}/gviz/tq?tq=&gid=${targetGid}&_ts=${Date.now()}`;

    try {
      const data = await loadGoogleSheetJSONP(jsonpUrl);
      if (!data || !data.table || !data.table.rows) {
        throw new Error("Data Google Sheets kosong atau tidak valid.");
      }
      
      let overrides = [];
      let unitOverrides = {};
      if (supabase) {
        const { data: ovData, error: sbError } = await supabase.from(T_BA_EDITS).select('*');
        if (!sbError && ovData) overrides = ovData;
        const { data: uOvData } = await supabase.from(T_BA_UNIT_EDITS).select('*').eq('unit_code', plantCode).maybeSingle();
        if (uOvData) unitOverrides = uOvData;
      }
      
      parseAndSetData(data, unitName, plantCode, overrides, unitOverrides);
      setStatusMsg(`Data Berita Acara ${plantCode ? '[' + plantCode + '] ' : ''}${unitName} berhasil dimuat.`);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedUnit) {
      handleLoad(selectedUnit);
    }
  }, [selectedUnit]);

  // ─── Load upload history from Supabase ───
  const loadUploadHistory = useCallback(async (plantCode) => {
    if (!plantCode) return;
    setLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from(T_PDF_UPLOADS)
        .select('*')
        .eq('unit_code', plantCode)
        .order('uploaded_at', { ascending: false })
        .limit(20);
      if (!error) setUploadHistory(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingHistory(false);
    }
  }, []);

  useEffect(() => {
    if (baData?.plantCode) {
      loadUploadHistory(baData.plantCode);
    }
  }, [baData?.plantCode, loadUploadHistory]);

  // ─── Generate auto filename ───
  const getAutoFileName = (plantCode, unitName) => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const h = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    
    // Replace spaces with underscores and uppercase the unit name
    const cleanUnitName = unitName ? unitName.replace(/\s+/g, '_').toUpperCase() : 'UNIT';
    
    return `${plantCode}_${cleanUnitName}_${y}${m}${d}${h}${min}${s}.pdf`;
  };

  // ─── Handle PDF file selection ───
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setUploadFile(file);
    } else {
      alert('Hanya file PDF yang diperbolehkan.');
      e.target.value = '';
    }
  };

  // ─── Upload PDF to Google Drive via GAS ───
  const handleUploadPDF = async () => {
    if (!uploadFile) { alert('Pilih file PDF terlebih dahulu.'); return; }
    if (!baData?.plantCode) { alert('Data unit belum dimuat.'); return; }

    const fileName = getAutoFileName(baData.plantCode, baData.unitName);
    setIsUploading(true);
    setUploadStatus(null);
    setUploadMessage('');

    // Buka tab kosong di awal secara sinkron agar tidak diblokir Popup Blocker
    let newTab = null;
    try {
      newTab = window.open('about:blank', '_blank');
      if (newTab) {
        newTab.document.write(`
          <div style="font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; color: #475569;">
            <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#8b5cf6" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="animation: spin 1s linear infinite;"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg>
            <h2 style="margin-top: 20px;">Mengupload ke Google Drive...</h2>
            <p>Mohon tunggu sebentar, halaman ini akan otomatis dialihkan ke folder Anda.</p>
            <style>@keyframes spin { 100% { transform: rotate(360deg); } }</style>
          </div>
        `);
      }
    } catch (e) {
      console.warn('Gagal membuka tab baru:', e);
    }

    try {
      // Read file as base64
      const reader = new FileReader();
      const base64Promise = new Promise((resolve, reject) => {
        reader.onload = (e) => resolve(e.target.result.split(',')[1]);
        reader.onerror = reject;
        reader.readAsDataURL(uploadFile);
      });
      const base64Data = await base64Promise;

      const payload = {
        action: 'upload_pdf',
        parentFolderId: DRIVE_PARENT_FOLDER_ID,
        unitCode: baData.plantCode,
        unitName: baData.unitName,
        fileName: fileName,
        notes: uploadNotes,
        fileData: base64Data,
        mimeType: 'application/pdf'
      };

      let driveFileId = null;
      let driveFolderUrl = `https://drive.google.com/drive/folders/${DRIVE_PARENT_FOLDER_ID}`;
      let driveFolderId = DRIVE_PARENT_FOLDER_ID;

      // Only call GAS if URL is configured
      if (DRIVE_UPLOAD_GAS_URL && DRIVE_UPLOAD_GAS_URL !== 'YOUR_APPS_SCRIPT_WEBAP_URL_HERE') {
        const resp = await fetch(DRIVE_UPLOAD_GAS_URL, {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        const result = await resp.json();
        if (result.status !== 'success') {
          throw new Error(result.message || 'Upload ke Google Drive gagal.');
        }
        driveFileId = result.fileId;
        driveFolderUrl = result.folderUrl || driveFolderUrl;
        driveFolderId = result.folderId || driveFolderId;
      } else {
        // GAS not configured yet — save record only (for demo/testing)
        console.warn('GAS URL belum dikonfigurasi. File hanya dicatat di database.');
      }

      // Save record to Supabase
      const { error: sbError } = await supabase.from(T_PDF_UPLOADS).insert({
        unit_code: baData.plantCode,
        file_name: fileName,
        notes: uploadNotes || null,
        drive_file_id: driveFileId,
        drive_folder_id: driveFolderId,
        drive_folder_url: driveFolderUrl,
        uploaded_by: currentUser?.name || currentUser?.nik || 'Unknown',
        uploaded_at: new Date().toISOString()
      });
      if (sbError) throw new Error('Gagal menyimpan riwayat ke database.');

      setUploadStatus('success');
      setUploadMessage(`File "${fileName}" berhasil diupload!`);

      // Refresh history
      await loadUploadHistory(baData.plantCode);

      // Arahkan tab yang sudah dibuka ke URL folder Drive
      if (newTab && !newTab.closed) {
        newTab.location.href = driveFolderUrl;
      }

    } catch (err) {
      console.error(err);
      setUploadStatus('error');
      setUploadMessage(err.message || 'Terjadi kesalahan saat upload.');
      
      // Tutup tab loading jika terjadi error
      if (newTab && !newTab.closed) {
        newTab.close();
      }
    } finally {
      setIsUploading(false);
    }
  };

  // ─── Delete upload record (Admin only) ───
  const handleDeleteUpload = async (id, driveFileId) => {
    if (!window.confirm('Hapus riwayat upload ini? (File di Google Drive tidak akan terhapus dari sini)')) return;
    setIsDeletingId(id);
    try {
      await supabase.from(T_PDF_UPLOADS).delete().eq('id', id);
      setUploadHistory(prev => prev.filter(r => r.id !== id));
    } catch (e) {
      console.error(e);
    } finally {
      setIsDeletingId(null);
    }
  };

  const handleAutoSaveEquipment = async (originalNoEq, row, currentPlantCode) => {
    if (!row || !originalNoEq) return;
    const plant = currentPlantCode || baData?.plantCode;
    try {
      if (plant && baData) {
        try {
          localStorage.setItem('ba_draft_' + plant, JSON.stringify(baData));
        } catch (e) {}
      }
      if (supabase) {
        await supabase.from(T_BA_EDITS).upsert({
          no_eq: originalNoEq,
          new_no_eq: row.noEq || '',
          no_urut: row.no || '',
          name: row.name || '',
          cc: row.cc || '',
          status: row.status || '',
          kepemilikan: row.kepemilikan || '',
          updated_at: new Date().toISOString()
        }, { onConflict: 'no_eq' });
      }
    } catch (err) {
      console.error('Error saving equipment edit to Supabase:', err);
    }
  };

  // ─── Add a new empty row to the table ───
  const handleAddRow = () => {
    if (!baData) return;
    const plant = baData.plantCode || 'UNIT';
    const newKey = `new_${plant}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newRow = {
      no: String(baData.equipmentRows.length + 1),
      name: '',
      noEq: '',
      cc: '',
      status: '',
      kepemilikan: '',
      originalNoEq: newKey
    };
    const updated = { ...baData, equipmentRows: [...baData.equipmentRows, newRow] };
    setBaData(updated);
    try {
      localStorage.setItem('ba_draft_' + plant, JSON.stringify(updated));
    } catch (e) {}
    handleAutoSaveEquipment(newKey, newRow, plant);
  };

  // ─── Delete a row from the table ───
  const handleDeleteRow = async (idx) => {
    if (!baData) return;
    const row = baData.equipmentRows[idx];
    const plant = baData.plantCode || 'UNIT';
    const newRows = baData.equipmentRows.filter((_, i) => i !== idx).map((r, i) => ({
      ...r,
      no: String(i + 1)
    }));
    const updated = { ...baData, equipmentRows: newRows };
    setBaData(updated);
    try {
      localStorage.setItem('ba_draft_' + plant, JSON.stringify(updated));
    } catch (e) {}

    if (row && row.originalNoEq && supabase) {
      try {
        if (row.originalNoEq.startsWith('new_')) {
          await supabase.from(T_BA_EDITS).delete().eq('no_eq', row.originalNoEq);
        } else {
          await supabase.from(T_BA_EDITS).upsert({
            no_eq: row.originalNoEq,
            status: '__DELETED__',
            updated_at: new Date().toISOString()
          }, { onConflict: 'no_eq' });
        }
      } catch (e) {
        console.error('Error deleting BA equipment row:', e);
      }
    }
  };

  const handleAutoSaveUnit = async (field, value, currentData) => {
    if (!currentData || !currentData.plantCode) return;
    const updated = { ...currentData, [field]: value };
    setBaData(updated);
    try {
      localStorage.setItem('ba_draft_' + currentData.plantCode, JSON.stringify(updated));
    } catch (e) {}
    const payload = {
      unit_code: currentData.plantCode,
      nomor_ba: field === 'nomorBA' ? value : currentData.nomorBA,
      perihal_text: field === 'perihal' ? value : currentData.perihal,
      penutup: field === 'penutup' ? value : currentData.penutup,
      sig_buat: field === 'sigBuat' ? value : currentData.sigBuat,
      jabatan_buat: field === 'jabatanBuat' ? value : currentData.jabatanBuat,
      nama_buat: field === 'namaBuat' ? value : currentData.namaBuat,
      sig_ketahui: field === 'sigKetahui' ? value : currentData.sigKetahui,
      jabatan_ketahui: field === 'jabatanKetahui' ? value : currentData.jabatanKetahui,
      nama_ketahui: field === 'namaKetahui' ? value : currentData.namaKetahui,
      updated_at: new Date().toISOString()
    };
    if (supabase) {
      try {
        await supabase.from(T_BA_UNIT_EDITS).upsert(payload, { onConflict: 'unit_code' });
      } catch (err) {
        console.error('Error saving unit edit to Supabase:', err);
      }
    }
  };

  // ─── Parse Google Sheets GViz response into BA data ───
  // The spreadsheet layout for every unit sheet (confirmed via CSV export):
  //
  //  Row (col B = index 1)                           | Col F (index 5)
  //  ─────────────────────────────────────────────────┼──────────────────────
  //  (blank)                                          |
  //  "BERITA ACARA INVENTARISASI EQUIPMENT SAP"       |
  //  "Nomor: 5KTJ/BA/ M- 20 /VII/2026"               |
  //  (blank)                                          |
  //  "Perihal : Equipment Aktif Di Unit Kebun Tajati" |
  //  (blank)                                          |
  //  "Pada hari ini, ..."                             |
  //  (blank)                                          |
  //  No | Nama Equipment | No Equipment | CC | Status | Kepemilikan   ← header row
  //  1  | Triton KB ...  | 2000022749  | …  |  Baik  | Sewa          ← equipment rows
  //  …
  //  "Demikian Berita Acara ini dibuat …"             |
  //  (blank)                                          |
  //  "Dibuat Oleh,"                                   | "Diketahui Oleh,"
  //  "Asisten Teknik"                                 | "Manajer"
  //  (blank × 4)                                      |
  //  "(Gerry Suharno)"                                | "(Willy Budiawan Sunaryo)"
  //  "AKHLAK-Amanah, …"                              |
  //
  // IMPORTANT: All unit-specific content lives in the DATA ROWS (rows[i][1..6]),
  // NOT in the GViz column-header label (cols[1].label).  The old code read from
  // cols[1].label which only contains GViz metadata, causing every unit to fall
  // back to generic defaults instead of using its own sheet data.
  const parseAndSetData = (data, unitName, plantCode, overrides = [], unitOverrides = {}) => {
    const overrideMap = {};
    overrides.forEach(row => {
      overrideMap[row.no_eq] = row;
    });

    // Convert every GViz row to a flat string array
    const rows = (data.table.rows || []).map(r => {
      if (!r || !r.c) return [];
      return r.c.map(cell => {
        if (!cell) return '';
        return cell.f !== undefined ? String(cell.f) : (cell.v !== undefined ? String(cell.v) : '');
      });
    });

    const cols = data.table.cols || [];
    const colBLabel = cols[1]?.label || '';

    // ── Step 1: Scan cols[1].label and rows for unit-specific header fields ──
    let titleBA           = 'BERITA ACARA INVENTARISASI EQUIPMENT SAP';
    let nomorBAFromSheet  = '';
    let perihalFromSheet  = '';
    let penutupFromSheet  = '';

    // Extract from column B label if GViz collapsed header metadata
    if (colBLabel.includes('BERITA ACARA')) {
      const tMatch = colBLabel.match(/^(.*?)\s*Nomor\s*:/i);
      if (tMatch && tMatch[1].trim()) titleBA = tMatch[1].trim();
    }
    if (colBLabel.includes('Nomor:')) {
      const noMatch = colBLabel.match(/Nomor\s*:\s*(.*?)\s*Perihal/i);
      if (noMatch) nomorBAFromSheet = 'Nomor: ' + noMatch[1].trim();
    }
    if (colBLabel.includes('Perihal')) {
      const perihalMatch = colBLabel.match(/Perihal\s*:\s*(.*?)\s*Pada hari ini/i);
      if (perihalMatch) perihalFromSheet = perihalMatch[1].trim();
    }

    let equipmentStartIdx = -1;
    let closingStartIdx   = rows.length;
    let sigBlockStartIdx  = rows.length;

    // Scan rows for boundaries and cell-based headers
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const colB = (row[1] || '').trim();
      const colC = (row[2] || '').trim();
      const rowStr = row.join(' ').trim();

      // Title row
      if (!titleBA.includes('SAP') && colB.toUpperCase().includes('BERITA ACARA')) {
        titleBA = colB;
      }
      if (colB.toUpperCase().includes('BERITA ACARA') && colB.toUpperCase().includes('SAP')) {
        titleBA = colB;
      }

      // Nomor row: "Nomor: …" or "Nomor :…"
      if (!nomorBAFromSheet && /^Nomor\s*:/i.test(colB)) {
        nomorBAFromSheet = colB;
      }

      // Perihal row: "Perihal :…" or "Perihal:…"
      if (!perihalFromSheet && /^Perihal\s*:/i.test(colB)) {
        const afterColon = colB.replace(/^Perihal\s*:\s*/i, '').trim();
        perihalFromSheet = afterColon.match(/^Equipment Aktif Di Unit/i)
          ? afterColon
          : `Equipment Aktif Di Unit ${afterColon}`;
      }

      // Closing / Demikian row
      if (closingStartIdx === rows.length && /Demikian/i.test(rowStr)) {
        closingStartIdx = i;
        penutupFromSheet = colB || rowStr;
      }

      // Signature block start: "Dibuat Oleh"
      if (sigBlockStartIdx === rows.length && /Dibuat Oleh/i.test(rowStr)) {
        sigBlockStartIdx = i;
      }

      // Equipment row start detection
      if (
        equipmentStartIdx === -1 &&
        colC.length >= 2 &&
        !colC.toLowerCase().includes('nama equipment') &&
        !/Dibuat Oleh|Demikian|Nomor:|Perihal:/i.test(rowStr)
      ) {
        if (/^\d+$/.test(colB) || (row[3] && row[3].length >= 5)) {
          equipmentStartIdx = i;
        }
      }
    }

    // ── Step 2: Scan signature block ──────────────────
    let sigBuatFromSheet      = '';
    let sigKetahuiFromSheet   = '';
    let jabatanBuatFromSheet  = '';
    let jabatanKetahuiFromSheet = '';
    let namaBuatFromSheet     = '';
    let namaKetahuiFromSheet  = '';

    for (let i = sigBlockStartIdx; i < rows.length; i++) {
      const row = rows[i];
      const colC = (row[2] || row[1] || '').trim();
      const colF = (row[5] || row[4] || row[6] || '').trim();

      if (/Dibuat Oleh/i.test(colC)) {
        sigBuatFromSheet    = colC;
        sigKetahuiFromSheet = colF || 'Diketahui Oleh,';
      } else if (/Asisten|Astk|Teknik/i.test(colC)) {
        jabatanBuatFromSheet    = colC;
        jabatanKetahuiFromSheet = colF || 'Manajer';
      } else if (colC.startsWith('(') && colC.endsWith(')')) {
        namaBuatFromSheet    = colC;
        namaKetahuiFromSheet = colF || '(______________)';
      }
    }

    // ── Step 3: Validate ──
    const foundStructure = nomorBAFromSheet || perihalFromSheet || sigBuatFromSheet || (cols.length > 3);
    if (!foundStructure) {
      setError(`Konfigurasi Berita Acara untuk Kode Unit [${plantCode}] belum ditemukan. Pastikan sheet unit ini sudah tersedia di spreadsheet referensi.`);
      setBaData(null);
      setLoading(false);
      return;
    }

    // ── Step 4: Resolve fields — unitOverrides (Supabase) > sheet > default ──
    const today = new Date();
    const monthRoman = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'][today.getMonth()];
    const year = today.getFullYear();

    const nomorBA = unitOverrides.nomor_ba ||
      nomorBAFromSheet ||
      `Nomor:    /BA/ M-02/${monthRoman}/${year}`;

    const perihal = unitOverrides.perihal_text ||
      perihalFromSheet ||
      `Equipment Aktif Di Unit ${unitName.toUpperCase()}`;

    const sigBuat        = unitOverrides.sig_buat        || sigBuatFromSheet        || 'Dibuat Oleh,';
    const sigKetahui     = unitOverrides.sig_ketahui     || sigKetahuiFromSheet     || 'Diketahui Oleh,';
    const jabatanBuat    = unitOverrides.jabatan_buat    || jabatanBuatFromSheet    || 'Asisten Teknik';
    const jabatanKetahui = unitOverrides.jabatan_ketahui || jabatanKetahuiFromSheet || 'Manajer';
    const namaBuat       = unitOverrides.nama_buat       || namaBuatFromSheet       || '(______________)';
    const namaKetahui    = unitOverrides.nama_ketahui    || namaKetahuiFromSheet    || '(______________)';

    // ── Step 5: Build dynamic pembukaan (always uses today's date) ──
    const days = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
    const dayName = days[today.getDay()];
    const dateStr = today.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '-');
    const unitNameOnly = perihal.replace(/^Equipment Aktif Di Unit\s*/i, '').trim();
    const pembukaan = `Pada hari ini, ${dayName} tanggal ${dateStr}, bertempat di Kantor ${unitNameOnly}, Asisten Teknik Menginventarisasi Equipment (Kendaraan dan Mesin) yang masih aktif atau yang masih dalam perbaikan dan Manajer mengawasi kegiatan Inventarisasi tersebut, adapun hasil inventaris dengan rincian sebagai berikut`;

    // ── Step 6: Parse equipment rows ──
    const endScan = Math.min(closingStartIdx, sigBlockStartIdx);
    const startScan = equipmentStartIdx >= 0 ? equipmentStartIdx : 0;
    const equipmentRows = [];

    for (let i = startScan; i < endScan; i++) {
      const row = rows[i];
      if (!row) continue;
      let no          = (row[1] || '').trim();
      let name        = (row[2] || '').trim();
      const noEq      = (row[3] || '').trim();
      let cc          = (row[4] || '').trim();
      let status      = (row[5] || '').trim();
      let kepemilikan = (row[6] || '').trim();

      // Skip non-equipment rows (header row, blank rows, text rows)
      if (!name || name.length < 2) continue;
      if (name.toLowerCase().includes('nama equipment')) continue;
      if (/Dibuat Oleh|Demikian|Nomor:|Perihal:/i.test(name)) continue;

      // Skip rows marked as deleted in Supabase
      if (overrideMap[noEq] && overrideMap[noEq].status === '__DELETED__') {
        continue;
      }

      if (!no || !/^\d+$/.test(no)) {
        no = String(equipmentRows.length + 1);
      }

      // Apply per-row Supabase overrides
      if (overrideMap[noEq]) {
        no          = overrideMap[noEq].no_urut      || no;
        name        = overrideMap[noEq].name         || name;
        cc          = overrideMap[noEq].cc           || cc;
        status      = overrideMap[noEq].status       || status;
        kepemilikan = overrideMap[noEq].kepemilikan  || kepemilikan;
      }

      const currentNoEq = (overrideMap[noEq]?.new_no_eq !== undefined && overrideMap[noEq]?.new_no_eq !== '') 
        ? overrideMap[noEq].new_no_eq 
        : noEq;
      equipmentRows.push({ no, name, noEq: currentNoEq, cc, status, kepemilikan, originalNoEq: noEq });
    }

    // ── Step 6b: Append user-added custom rows (new_${plantCode}_... or legacy new_...) ──
    const addedRows = overrides.filter(ov => 
      ov && 
      ov.no_eq && 
      (ov.no_eq.startsWith(`new_${plantCode}_`) || ov.no_eq.startsWith(`new_${plantCode}`)) && 
      ov.status !== '__DELETED__'
    );

    // Also include legacy new_ rows created without plantCode prefix if they exist
    const legacyNewRows = overrides.filter(ov =>
      ov &&
      ov.no_eq &&
      ov.no_eq.startsWith('new_') &&
      !ov.no_eq.includes('_5E') &&
      !ov.no_eq.includes('_5F') &&
      !ov.no_eq.includes('_5D') &&
      ov.status !== '__DELETED__' &&
      (ov.name || ov.new_no_eq || ov.cc)
    );

    const allAdded = [...addedRows];
    legacyNewRows.forEach(l => {
      if (!allAdded.some(a => a.no_eq === l.no_eq)) {
        allAdded.push(l);
      }
    });

    allAdded.sort((a, b) => (Number(a.no_urut) || 9999) - (Number(b.no_urut) || 9999));

    allAdded.forEach(ov => {
      equipmentRows.push({
        no: ov.no_urut || String(equipmentRows.length + 1),
        name: ov.name || '',
        noEq: ov.new_no_eq || '',
        cc: ov.cc || '',
        status: ov.status || '',
        kepemilikan: ov.kepemilikan || '',
        originalNoEq: ov.no_eq
      });
    });

    // Normalize sequential row numbering (1, 2, 3...)
    equipmentRows.forEach((r, idx) => {
      r.no = String(idx + 1);
    });

    // ── Step 7: Build penutup ──
    const formattedUnitName = perihal.replace(/^Equipment Aktif Di Unit/i, '').trim();
    const penutup = unitOverrides.penutup ||
      (penutupFromSheet
        ? penutupFromSheet.replace(
            // Bolden the unit name if it appears in the raw closing text
            new RegExp(`(${formattedUnitName}|${unitNameOnly})`, 'i'),
            `<strong>$1</strong>`
          )
        : `Demikian Berita Acara ini dibuat dan sejak ditandatanganinya Berita Acara ini maka manajemen unit <strong>${formattedUnitName || unitName}</strong> bertanggung jawab atas keakuratan data tersebut diatas.`
      );

    const finalBaData = {
      penutup,
      titleBA,
      nomorBA,
      perihal,
      pembukaan,
      equipmentRows,
      sigBuat,
      sigKetahui,
      jabatanBuat,
      jabatanKetahui,
      namaBuat,
      namaKetahui,
      formattedUnitName,
      unitName,
      plantCode
    };

    setBaData(finalBaData);
    try {
      localStorage.setItem('ba_draft_' + plantCode, JSON.stringify(finalBaData));
    } catch (e) {}
  };

  const getChunkedRows = () => {
    if (!baData || !baData.equipmentRows || baData.equipmentRows.length === 0) return [];
    
    const chunks = [];
    const rows = baData.equipmentRows;
    
    // First chunk: 30 items
    chunks.push(rows.slice(0, 30));
    
    // Subsequent chunks: 40 items per page
    let currentIdx = 30;
    while (currentIdx < rows.length) {
      chunks.push(rows.slice(currentIdx, currentIdx + 40));
      currentIdx += 40;
    }
    
    return chunks;
  };
  
  const chunkedRows = getChunkedRows();

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 max-w-5xl mx-auto">
      
      <style>{`
        @media screen {
          .hidden-on-web, .print-only {
            display: none !important;
          }
        }
        @media print {
          body {
            visibility: hidden !important;
            background: #ffffff !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-only {
            display: block !important;
            color: #000000 !important;
            font-size: 11px !important;
            line-height: 1.4 !important;
          }
          .print-border-bottom {
            border-bottom: 1.5px solid #000000 !important;
          }
          .print-spacer {
            display: table-row !important;
            height: 10mm !important;
            border-top: hidden !important;
            border-left: hidden !important;
            border-right: hidden !important;
          }
          #print-area-wrapper {
            visibility: visible !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 4mm 8mm !important;
            border: none !important;
            box-shadow: none !important;
            background: #ffffff !important;
            box-sizing: border-box !important;
          }
          #print-area-wrapper * {
            visibility: visible !important;
          }
          html, body {
            height: auto !important;
            overflow: visible !important;
            position: static !important;
          }
          #print-area-wrapper > div.ba-document-box {
            width: 100% !important;
            min-height: unset !important;
            border: none !important;
            box-shadow: none !important;
            margin: 0 auto !important;
            display: block !important;
            box-sizing: border-box !important;
          }
          #print-area-wrapper > div.ba-footer {
            width: 100% !important;
            border-top: 1.2px solid #000000 !important;
            margin: 4px auto 0 !important;
          }
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            color-adjust: exact !important;
          }
          table {
            width: 100% !important;
            border-collapse: collapse !important;
            font-size: 11px !important;
          }
          th {
            background-color: #ffc000 !important;
            color: #000000 !important;
            font-weight: bold !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          td, th {
            padding: 4px 6px !important;
            color: #000000 !important;
          }
          @page {
            size: A4 portrait;
            margin: 4mm 6mm;
          }
        }
      `}</style>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5 mb-6">
        <div>
          <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="text-teal-600" size={24} />
            Berita Acara Inventarisasi Equipment SAP
          </h2>
          <p className="text-sm text-slate-500 mt-1">Preview & Cetak Berita Acara per Unit</p>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 bg-slate-50 p-4 rounded-xl mb-6">
        <div className="flex items-center gap-2 flex-1 min-w-[280px]">
          <span className="text-sm font-semibold text-slate-600 whitespace-nowrap">
            Pilih Unit: 
          </span>
          <select 
            value={selectedUnit} 
            onChange={(e) => setSelectedUnit(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"
          >
            <option value="">-- Pilih Unit/Kebun --</option>
            <optgroup label="🌿 KEBUN">
              <option value="Gunung Meliau|5E01">5E01 - KEBUN GUNUNG MELIAU</option>
              <option value="Gunung Mas|5E02">5E02 - KEBUN GUNUNG MAS</option>
              <option value="Sungai Dekan|5E03">5E03 - KEBUN SUNGAI DEKAN</option>
              <option value="Rimba Belian|5E04">5E04 - KEBUN RIMBA BELIAN</option>
              <option value="Sintang|5E06">5E06 - KEBUN SINTANG</option>
              <option value="Ngabang|5E07">5E07 - KEBUN NGABANG</option>
              <option value="Parindu|5E08">5E08 - KEBUN PARINDU</option>
              <option value="Kembayan|5E09">5E09 - KEBUN KEMBAYAN</option>
              <option value="Danau Salak|5E11">5E11 - KEBUN DANAU SALAK</option>
              <option value="Kumai|5E12">5E12 - KEBUN KUMAI KARET</option>
              <option value="Batu Licin|5E13">5E13 - KEBUN BATULICIN</option>
              <option value="Pamukan|5E14">5E14 - KEBUN PAMUKAN</option>
              <option value="Pelaihari|5E15">5E15 - KEBUN PELAIHARI</option>
              <option value="Tabara|5E16">5E16 - KEBUN TABARA</option>
              <option value="Tajati|5E17">5E17 - KEBUN TAJATI</option>
              <option value="Pandawa|5E18">5E18 - KEBUN PANDAWA</option>
              <option value="Longkali|5E19">5E19 - KEBUN LONGKALI</option>
            </optgroup>
            <optgroup label="🏭 PABRIK / PKS">
              <option value="PKS Gunung Meliau|5F01">5F01 - PABRIK GUNUNG MELIAU</option>
              <option value="PKS Rimba Belian|5F04">5F04 - PABRIK RIMBA BELIAN</option>
              <option value="PKS Ngabang|5F07">5F07 - PABRIK NGABANG</option>
              <option value="PKS Parindu|5F08">5F08 - PABRIK PARINDU</option>
              <option value="PKS Kembayan|5F09">5F09 - PABRIK KEMBAYAN</option>
              <option value="Unit Proyek Batu Bara|5F11">5F11 - UNIT PROYEK BATU BARA</option>
              <option value="PKS Pamukan|5F14">5F14 - PABRIK PAMUKAN</option>
              <option value="PKS Pelaihari|5F15">5F15 - PABRIK PELAIHARI</option>
              <option value="Tambarangan|5F20">5F20 - PKR TAMBARANGAN</option>
              <option value="PKS Samuntai|5F21">5F21 - PABRIK SAMUNTAI</option>
              <option value="PKS Longpinang|5F22">5F22 - PABRIK LONG PINANG</option>
            </optgroup>
            <optgroup label="🏢 DISTRIK">
              <option value="Distrik Kalimantan Barat|5D01">5D01 - DISTRIK KALBAR</option>
              <option value="Distrik Kalimantan Timur|5D02">5D02 - DISTRIK KALTIM</option>
              <option value="Distrik Kalimantan Selatan|5D03">5D03 - DISTRIK KALSELTENG</option>
            </optgroup>
          </select>
        </div>

        <button 
          onClick={() => handleLoad(selectedUnit)} 
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm px-4 py-2 rounded-lg transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
        >
          {loading ? <RefreshCw className="animate-spin" size={16} /> : <RefreshCw size={16} />}
          Muat Data
        </button>

        <button 
          onClick={() => window.print()} 
          disabled={!baData}
          className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm px-4 py-2 rounded-lg transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50"
        >
          <Printer size={16} />
          Cetak / PDF
        </button>

        {/* Upload PDF Button */}
        {baData && (
          <button
            onClick={() => { setShowUploadModal(true); setUploadStatus(null); setUploadMessage(''); setUploadFile(null); setUploadNotes(''); }}
            className="bg-purple-600 hover:bg-purple-700 text-white font-medium text-sm px-4 py-2 rounded-lg transition-colors flex items-center gap-2 shadow-sm"
          >
            <Upload size={16} />
            Upload PDF ke Drive
          </button>
        )}

      </div>

      {/* ─── Upload PDF Modal ─── */}
      {showUploadModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <FileUp size={20} className="text-purple-600" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-800 text-base">Upload PDF ke Google Drive</h3>
                  <p className="text-xs text-slate-500">Unit: <span className="font-semibold text-purple-600">{baData?.plantCode}</span></p>
                </div>
              </div>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg p-1.5 transition-colors">
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Auto filename preview */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Nama File Otomatis</p>
                <p className="font-mono text-sm font-bold text-purple-700">{baData ? getAutoFileName(baData.plantCode, baData.unitName) : ''}</p>
                <p className="text-xs text-slate-400 mt-1">Format: KodeUnit_NamaUnit_YYYYMMDDHHmmss.pdf</p>
              </div>

              {/* File picker */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">Pilih File PDF *</label>
                <label className="flex items-center gap-3 cursor-pointer border-2 border-dashed border-slate-300 hover:border-purple-400 rounded-xl p-4 transition-colors group">
                  <Upload size={20} className="text-slate-400 group-hover:text-purple-500 transition-colors" />
                  <div className="flex-1 min-w-0">
                    {uploadFile
                      ? <p className="text-sm font-medium text-slate-700 truncate">{uploadFile.name}</p>
                      : <p className="text-sm text-slate-400">Klik untuk memilih file PDF...</p>
                    }
                  </div>
                  <input type="file" accept=".pdf,application/pdf" onChange={handleFileChange} className="hidden" />
                </label>
              </div>

              {/* Info Note */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 text-amber-800">
                <AlertTriangle size={20} className="shrink-0 text-amber-600" />
                <p className="text-sm leading-relaxed">
                  <span className="font-semibold block mb-0.5">Perhatian</span>
                  Pastikan Berita Acara Equipment yang diupload telah memiliki Tanda tangan dan Cap yang lengkap
                </p>
              </div>

              {/* Status message */}
              {uploadStatus === 'success' && (
                <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl p-3.5">
                  <CheckCircle2 size={18} className="shrink-0" />
                  <div>
                    <p className="text-sm font-semibold">{uploadMessage}</p>
                    <p className="text-xs mt-0.5">Folder Drive unit akan terbuka di tab baru.</p>
                  </div>
                </div>
              )}
              {uploadStatus === 'error' && (
                <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 text-red-700 rounded-xl p-3.5">
                  <AlertTriangle size={18} className="shrink-0" />
                  <p className="text-sm">{uploadMessage}</p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex gap-3 px-6 pb-6">
              <button
                onClick={() => setShowUploadModal(false)}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
              >
                Tutup
              </button>
              <button
                onClick={handleUploadPDF}
                disabled={isUploading || !uploadFile}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {isUploading ? <><Loader2 size={16} className="animate-spin" /> Mengupload...</> : <><Upload size={16} /> Upload Sekarang</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Info Status / Error */}
      {statusMsg && !error && (
        <div className="text-xs text-blue-600 font-medium mb-4 pl-1">
          ℹ️ {statusMsg}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-xl flex items-start gap-3 mb-6 shadow-sm">
          <AlertTriangle className="shrink-0 mt-0.5" size={18} />
          <div>
            <p className="font-semibold text-sm">Gagal memuat Berita Acara:</p>
            <p className="text-xs mt-1">{error}</p>
            <div className="text-[11px] text-slate-500 mt-2 leading-relaxed">
              <strong>Solusi:</strong>
              <ol className="list-decimal pl-4 mt-0.5 space-y-0.5">
                <li>Buka Google Sheets terkait.</li>
                <li>Klik tombol <strong>Bagikan (Share)</strong>.</li>
                <li>Di bagian Akses Umum, ubah menjadi <strong>"Siapa saja yang memiliki link"</strong> dengan role <strong>Viewer/Editor</strong>.</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* BA Preview Area */}
      <div id="print-area-wrapper" className="bg-[#f1f5f9] p-4 sm:p-8 rounded-xl border border-slate-200 overflow-x-auto">
        {baData ? (
          <>
            <div 
              className="ba-document-box"
              style={{
                fontFamily: 'Arial, Helvetica, sans-serif',
                fontSize: '13px',
                lineHeight: '1.6',
                color: '#000000',
                border: 'none',
                padding: '0',
                backgroundColor: '#ffffff',
                width: '800px',
                minHeight: '1030px',
                display: 'flex',
                flexDirection: 'column',
                margin: '0 auto',
                boxSizing: 'border-box'
              }}
            >
              {/* Header Title Box */}
              <div 
                style={{
                  textAlign: 'center',
                  borderTop: '2.2px solid #000000',
                  borderLeft: '2.2px solid #000000',
                  borderRight: '2.2px solid #000000',
                  borderBottom: '1.5px solid #000000',
                  padding: '12px 16px',
                  fontWeight: 'bold',
                  backgroundColor: '#ffffff',
                  margin: '0',
                  boxSizing: 'border-box'
                }}
              >
                <div style={{ fontSize: '15px', textDecoration: 'underline', textTransform: 'uppercase', marginBottom: '4px', letterSpacing: '0.5px' }}>
                  {baData.titleBA || 'BERITA ACARA INVENTARISASI EQUIPMENT SAP'}
                </div>
                <div style={{ fontSize: '13px', fontWeight: 'bold', display: 'flex', justifyContent: 'center' }}>
                  <div
                    contentEditable suppressContentEditableWarning
                    onBlur={(e) => handleAutoSaveUnit('nomorBA', e.target.innerText, baData)}
                    className="hover:bg-slate-50 transition-colors cursor-text min-w-[200px]"
                    style={{ outline: 'none', borderBottom: '1px solid transparent' }}
                  >{baData.nomorBA.replace(/&nbsp;/g, ' ')}</div>
                </div>
              </div>

              {/* Perihal Box */}
              <div style={{ borderLeft: '2.2px solid #000000', borderRight: '2.2px solid #000000', borderBottom: '1.5px solid #000000', padding: '10px 16px', fontWeight: 'bold', textAlign: 'left', margin: '0', boxSizing: 'border-box' }}>
                Perihal : <span
                  contentEditable suppressContentEditableWarning
                  onBlur={(e) => handleAutoSaveUnit('perihal', 'Equipment Aktif Di Unit ' + e.target.innerText, baData)}
                  className="hover:bg-slate-50 transition-colors cursor-text inline-block min-w-[200px]"
                  style={{ outline: 'none', borderBottom: '1px solid transparent' }}
                >{baData.perihal.replace(/^Equipment Aktif Di Unit\s*/i, '').trim()}</span>
              </div>

              {/* Pembukaan Box */}
              <div style={{ borderLeft: '2.2px solid #000000', borderRight: '2.2px solid #000000', borderBottom: '1.5px solid #000000', padding: '16px', textAlign: 'justify', margin: '0', boxSizing: 'border-box' }}>
                {baData.pembukaan}
              </div>

              {/* Equipment Tables (Chunked for pagination) */}
              {chunkedRows.length > 0 ? (
                chunkedRows.map((chunk, chunkIdx) => (
                  <div key={chunkIdx} style={{ pageBreakInside: 'avoid', pageBreakBefore: chunkIdx > 0 ? 'always' : 'auto' }} className={`table-wrapper ${chunkIdx > 0 ? "pt-0 print:pt-0" : ""}`}>
                    <table 
                      style={{ 
                        width: '100%', 
                        tableLayout: 'fixed', 
                        borderCollapse: 'collapse', 
                        fontSize: '12px', 
                        margin: '0', 
                        borderLeft: '2.2px solid #000000', 
                        borderRight: '2.2px solid #000000',
                        borderTop: chunkIdx > 0 ? '2.2px solid #000000' : 'none',
                        borderBottom: (chunkIdx < chunkedRows.length - 1) ? '2.2px solid #000000' : '1.5px solid #000000',
                        boxSizing: 'border-box'
                      }}
                    >
                      <colgroup>
                        <col style={{ width: '45px' }} />
                        <col style={{ width: 'auto' }} />
                        <col style={{ width: '125px' }} />
                        <col style={{ width: '110px' }} />
                        <col style={{ width: '100px' }} />
                        <col style={{ width: '100px' }} />
                      </colgroup>
                      <thead className={chunkIdx > 0 ? "hidden-on-web" : ""}>
                        <tr style={{ backgroundColor: '#ffc000', fontWeight: 'bold', color: '#000000' }}>
                          <th className="text-center" style={{ border: '1px solid #000000', borderTop: '1.5px solid #000000', borderLeft: 'none', padding: '8px', textAlign: 'center', width: '45px', verticalAlign: 'middle' }}>No</th>
                          <th className="text-center" style={{ border: '1px solid #000000', borderTop: '1.5px solid #000000', padding: '8px', textAlign: 'center', verticalAlign: 'middle' }}>Nama Equipment</th>
                          <th className="text-center" style={{ border: '1px solid #000000', borderTop: '1.5px solid #000000', padding: '8px', textAlign: 'center', width: '125px', verticalAlign: 'middle' }}>No Equipment</th>
                          <th className="text-center" style={{ border: '1px solid #000000', borderTop: '1.5px solid #000000', padding: '8px', textAlign: 'center', width: '110px', verticalAlign: 'middle' }}>Cost Center</th>
                          <th className="text-center" style={{ border: '1px solid #000000', borderTop: '1.5px solid #000000', padding: '8px', textAlign: 'center', width: '100px', verticalAlign: 'middle' }}>Status Kendaraan</th>
                          <th className="text-center" style={{ border: '1px solid #000000', borderTop: '1.5px solid #000000', borderRight: 'none', padding: '8px', textAlign: 'center', width: '100px', verticalAlign: 'middle' }}>Kepemilikan</th>
                        </tr>
                      </thead>
                      <tbody>
                        {chunk.map((eq, innerIdx) => {
                          const idx = chunkIdx === 0 ? innerIdx : 30 + (chunkIdx - 1) * 40 + innerIdx;
                          return (
                            <tr key={idx}>
                              <td style={{ border: '1px solid #000000', borderLeft: 'none', padding: '4px 6px', textAlign: 'center', verticalAlign: 'middle' }}>
                                <div className="no-print">
                                  <input 
                                    type="text" 
                                    value={eq.no} 
                                    onChange={(e) => {
                                      const newRows = [...baData.equipmentRows];
                                      newRows[idx].no = e.target.value;
                                      const updated = { ...baData, equipmentRows: newRows };
                                      setBaData(updated);
                                      if (baData.plantCode) {
                                        try { localStorage.setItem('ba_draft_' + baData.plantCode, JSON.stringify(updated)); } catch (err) {}
                                      }
                                    }}
                                    onBlur={() => handleAutoSaveEquipment(eq.originalNoEq, baData.equipmentRows[idx])}
                                    className="w-full text-center bg-transparent border border-transparent hover:border-slate-300 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-teal-500 transition-colors"
                                  />
                                </div>
                                <span className="print-only font-medium" style={{ textAlign: 'center' }}>{eq.no}</span>
                              </td>
                              <td style={{ border: '1px solid #000000', padding: '4px 6px', verticalAlign: 'middle', textAlign: 'left' }}>
                                <div className="no-print">
                                  <input 
                                    type="text" 
                                    value={eq.name} 
                                    onChange={(e) => {
                                      const newRows = [...baData.equipmentRows];
                                      newRows[idx].name = e.target.value;
                                      const updated = { ...baData, equipmentRows: newRows };
                                      setBaData(updated);
                                      if (baData.plantCode) {
                                        try { localStorage.setItem('ba_draft_' + baData.plantCode, JSON.stringify(updated)); } catch (err) {}
                                      }
                                    }}
                                    onBlur={() => handleAutoSaveEquipment(eq.originalNoEq, baData.equipmentRows[idx])}
                                    className="w-full text-left bg-transparent border border-transparent hover:border-slate-300 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-teal-500 transition-colors"
                                  />
                                </div>
                                <span className="print-only" style={{ textAlign: 'left' }}>{eq.name}</span>
                              </td>
                              <td style={{ border: '1px solid #000000', padding: '4px 6px', textAlign: 'center', verticalAlign: 'middle' }}>
                                <div className="no-print">
                                  <input 
                                    type="text" 
                                    value={eq.noEq} 
                                    onChange={(e) => {
                                      const newRows = [...baData.equipmentRows];
                                      newRows[idx].noEq = e.target.value;
                                      const updated = { ...baData, equipmentRows: newRows };
                                      setBaData(updated);
                                      if (baData.plantCode) {
                                        try { localStorage.setItem('ba_draft_' + baData.plantCode, JSON.stringify(updated)); } catch (err) {}
                                      }
                                    }}
                                    onBlur={() => handleAutoSaveEquipment(eq.originalNoEq, baData.equipmentRows[idx])}
                                    className="w-full text-center bg-transparent border border-transparent hover:border-slate-300 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-teal-500 transition-colors"
                                  />
                                </div>
                                <span className="print-only" style={{ textAlign: 'center' }}>{eq.noEq}</span>
                              </td>
                              <td style={{ border: '1px solid #000000', padding: '4px 6px', textAlign: 'center', verticalAlign: 'middle' }}>
                                <div className="no-print">
                                  <input 
                                    type="text" 
                                    value={eq.cc} 
                                    onChange={(e) => {
                                      const newRows = [...baData.equipmentRows];
                                      newRows[idx].cc = e.target.value;
                                      const updated = { ...baData, equipmentRows: newRows };
                                      setBaData(updated);
                                      if (baData.plantCode) {
                                        try { localStorage.setItem('ba_draft_' + baData.plantCode, JSON.stringify(updated)); } catch (err) {}
                                      }
                                    }}
                                    onBlur={() => handleAutoSaveEquipment(eq.originalNoEq, baData.equipmentRows[idx])}
                                    className="w-full text-center bg-transparent border border-transparent hover:border-slate-300 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-teal-500 transition-colors"
                                  />
                                </div>
                                <span className="print-only" style={{ textAlign: 'center' }}>{eq.cc}</span>
                              </td>
                              <td style={{ border: '1px solid #000000', padding: '4px 6px', textAlign: 'center', verticalAlign: 'middle' }}>
                                <div className="no-print">
                                  <select 
                                    value={eq.status || ''} 
                                    onChange={(e) => {
                                      const newRows = [...baData.equipmentRows];
                                      newRows[idx].status = e.target.value;
                                      const updated = { ...baData, equipmentRows: newRows };
                                      setBaData(updated);
                                      if (baData.plantCode) {
                                        try { localStorage.setItem('ba_draft_' + baData.plantCode, JSON.stringify(updated)); } catch (err) {}
                                      }
                                      handleAutoSaveEquipment(eq.originalNoEq, newRows[idx]);
                                    }}
                                    className="w-full text-center bg-transparent border border-transparent hover:border-slate-300 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-teal-500 transition-colors cursor-pointer appearance-none"
                                    style={{ textAlignLast: 'center' }}
                                  >
                                    <option value="">-</option>
                                    <option value="Baik">Baik</option>
                                    <option value="Rusak">Rusak</option>
                                  </select>
                                </div>
                                <span className="print-only" style={{ textAlign: 'center' }}>{eq.status || '-'}</span>
                              </td>
                              <td style={{ border: '1px solid #000000', borderRight: 'none', padding: '4px 6px', textAlign: 'center', verticalAlign: 'middle' }}>
                                <div className="no-print flex items-center gap-1">
                                  <select 
                                    value={eq.kepemilikan || ''} 
                                    onChange={(e) => {
                                      const newRows = [...baData.equipmentRows];
                                      newRows[idx].kepemilikan = e.target.value;
                                      const updated = { ...baData, equipmentRows: newRows };
                                      setBaData(updated);
                                      if (baData.plantCode) {
                                        try { localStorage.setItem('ba_draft_' + baData.plantCode, JSON.stringify(updated)); } catch (err) {}
                                      }
                                      handleAutoSaveEquipment(eq.originalNoEq, newRows[idx]);
                                    }}
                                    className="w-full text-center bg-transparent border border-transparent hover:border-slate-300 rounded px-1 py-0.5 text-xs focus:outline-none focus:border-teal-500 transition-colors cursor-pointer appearance-none"
                                    style={{ textAlignLast: 'center' }}
                                  >
                                    <option value="">-</option>
                                    <option value="Sewa">Sewa</option>
                                    <option value="Perusahaan">Perusahaan</option>
                                  </select>
                                  {/* Delete row button - hidden when printing */}
                                  <button
                                    onClick={() => handleDeleteRow(idx)}
                                    className="no-print p-0.5 text-slate-400 hover:text-red-500 rounded bg-white hover:bg-red-50 ml-1 flex-shrink-0 transition-colors"
                                    title="Hapus baris"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <span className="print-only" style={{ textAlign: 'center' }}>{eq.kepemilikan || '-'}</span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ))
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', margin: '0', borderBottom: '1.5px solid #000000' }}>
                  <thead>
                    <tr style={{ backgroundColor: '#ffc000', fontWeight: 'bold', color: '#000000' }}>
                      <th className="text-center" style={{ border: '1px solid #000000', borderTop: '1.5px solid #000000', borderLeft: 'none', padding: '8px', textAlign: 'center', width: '45px', verticalAlign: 'middle' }}>No</th>
                      <th className="text-center" style={{ border: '1px solid #000000', borderTop: '1.5px solid #000000', padding: '8px', textAlign: 'center', verticalAlign: 'middle' }}>Nama Equipment</th>
                      <th className="text-center" style={{ border: '1px solid #000000', borderTop: '1.5px solid #000000', padding: '8px', textAlign: 'center', width: '125px', verticalAlign: 'middle' }}>No Equipment</th>
                      <th className="text-center" style={{ border: '1px solid #000000', borderTop: '1.5px solid #000000', padding: '8px', textAlign: 'center', width: '110px', verticalAlign: 'middle' }}>Cost Center</th>
                      <th className="text-center" style={{ border: '1px solid #000000', borderTop: '1.5px solid #000000', padding: '8px', textAlign: 'center', width: '100px', verticalAlign: 'middle' }}>Status Kendaraan</th>
                      <th className="text-center" style={{ border: '1px solid #000000', borderTop: '1.5px solid #000000', borderRight: 'none', padding: '8px', textAlign: 'center', width: '100px', verticalAlign: 'middle' }}>Kepemilikan</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td colSpan="6" style={{ border: '1px solid #000000', borderLeft: 'none', borderRight: 'none', padding: '20px', textAlign: 'center', color: '#888888' }}>
                        Tidak ada data equipment.
                      </td>
                    </tr>
                  </tbody>
                </table>
              )}

              {/* Add Row button - hidden when printing */}
              <div className="no-print mt-2 mb-4">
                <button
                  onClick={handleAddRow}
                  className="flex items-center gap-1.5 text-xs text-teal-600 hover:text-teal-800 font-semibold hover:bg-teal-50 px-3 py-1.5 rounded-lg transition-colors border border-dashed border-teal-300 hover:border-teal-500 w-full justify-center"
                >
                  <span className="text-base leading-none">+</span> Tambah Baris
                </button>
              </div>

              {/* Penutup Box */}
              <div 
                contentEditable 
                suppressContentEditableWarning
                onBlur={(e) => handleAutoSaveUnit('penutup', e.target.innerHTML, baData)}
                dangerouslySetInnerHTML={{ __html: baData.penutup }}
                className="hover:bg-slate-50 transition-colors cursor-text"
                style={{ 
                  borderLeft: '2.2px solid #000000',
                  borderRight: '2.2px solid #000000',
                  borderBottom: '1.5px solid #000000', 
                  padding: '16px', 
                  textAlign: 'justify', 
                  margin: '0', 
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />

              {/* Spacer before signatures */}
              <div style={{ 
                height: '25px', 
                borderLeft: '2.2px solid #000000', 
                borderRight: '2.2px solid #000000',
                margin: '0',
                boxSizing: 'border-box' 
              }}></div>

              {/* Signatures Block */}
              <div style={{ 
                borderLeft: '2.2px solid #000000', 
                borderRight: '2.2px solid #000000', 
                borderBottom: '2.2px solid #000000', 
                padding: '0 30px 30px 30px', 
                marginTop: 'auto', 
                marginBottom: '0', 
                boxSizing: 'border-box' 
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-around', textAlign: 'center', width: '100%' }}>
                  <div style={{ minWidth: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', height: '140px' }}>
                    <div>
                      <div 
                        contentEditable suppressContentEditableWarning
                        onBlur={(e) => handleAutoSaveUnit('sigBuat', e.target.innerText, baData)}
                        className="hover:bg-slate-50 transition-colors cursor-text"
                        style={{ fontWeight: 'bold', fontSize: '13px', outline: 'none', minWidth: '100px' }}
                      >{baData.sigBuat}</div>
                      <div 
                        contentEditable suppressContentEditableWarning
                        onBlur={(e) => handleAutoSaveUnit('jabatanBuat', e.target.innerText, baData)}
                        className="hover:bg-slate-50 transition-colors cursor-text"
                        style={{ fontWeight: 'bold', fontSize: '13px', outline: 'none', minWidth: '100px' }}
                      >{baData.jabatanBuat}</div>
                    </div>
                    <div 
                      contentEditable suppressContentEditableWarning
                      onBlur={(e) => handleAutoSaveUnit('namaBuat', e.target.innerText, baData)}
                      className="hover:bg-slate-50 transition-colors cursor-text"
                      style={{ width: '180px', fontWeight: 'bold', fontSize: '13px', paddingBottom: '2px', outline: 'none', borderBottom: '1px solid transparent' }}
                    >{baData.namaBuat}</div>
                  </div>
                  <div style={{ minWidth: '220px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', height: '140px' }}>
                    <div>
                      <div 
                        contentEditable suppressContentEditableWarning
                        onBlur={(e) => handleAutoSaveUnit('sigKetahui', e.target.innerText, baData)}
                        className="hover:bg-slate-50 transition-colors cursor-text"
                        style={{ fontWeight: 'bold', fontSize: '13px', outline: 'none', minWidth: '100px' }}
                      >{baData.sigKetahui}</div>
                      <div 
                        contentEditable suppressContentEditableWarning
                        onBlur={(e) => handleAutoSaveUnit('jabatanKetahui', e.target.innerText, baData)}
                        className="hover:bg-slate-50 transition-colors cursor-text"
                        style={{ fontWeight: 'bold', fontSize: '13px', outline: 'none', minWidth: '100px' }}
                      >{baData.jabatanKetahui}</div>
                    </div>
                    <div 
                      contentEditable suppressContentEditableWarning
                      onBlur={(e) => handleAutoSaveUnit('namaKetahui', e.target.innerText, baData)}
                      className="hover:bg-slate-50 transition-colors cursor-text"
                      style={{ width: '180px', fontWeight: 'bold', fontSize: '13px', paddingBottom: '2px', outline: 'none', borderBottom: '1px solid transparent' }}
                    >{baData.namaKetahui}</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer inside print wrapper */}
            <div className="ba-footer" style={{ 
              fontFamily: 'Arial, Helvetica, sans-serif', 
              fontSize: '11px', 
              color: '#002060', 
              fontWeight: 'bold', 
              width: '800px', 
              margin: '15px auto 0', 
              padding: '10px 0 0 2px', 
              textAlign: 'left',
              borderTop: '1.2px solid #000000',
              boxSizing: 'border-box'
            }}>
              <span style={{ color: '#00b0f0' }}>AKHLAK</span>-Amanah, Kompeten, Harmonis, Loyal, Adaptif, Kolaboratif-PTPN XIII Bangkit
            </div>
          </>
        ) : (
          <div className="text-center py-20 text-slate-400 bg-white rounded-xl border border-dashed border-slate-200">
            <FileText size={48} className="mx-auto text-slate-300 mb-3" />
            <p className="text-sm">Pilih unit dan klik <strong>Muat Data</strong> untuk menampilkan Berita Acara</p>
          </div>
        )}
      </div>

      {/* ─── Upload History Section ─── */}
      {baData && (
        <div className="mt-8 bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50">
            <div className="flex items-center gap-2">
              <FolderOpen size={18} className="text-purple-600" />
              <h3 className="font-bold text-slate-800 text-sm">Riwayat Upload PDF</h3>
              <span className="text-xs text-slate-500">— Unit {baData.plantCode}</span>
            </div>
            <button
              onClick={() => loadUploadHistory(baData.plantCode)}
              className="text-xs text-slate-500 hover:text-slate-700 flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-200 transition-colors"
            >
              <RefreshCw size={12} /> Refresh
            </button>
          </div>

          {loadingHistory ? (
            <div className="flex items-center justify-center py-10 gap-2 text-slate-400">
              <Loader2 size={18} className="animate-spin" />
              <span className="text-sm">Memuat riwayat...</span>
            </div>
          ) : uploadHistory.length === 0 ? (
            <div className="text-center py-10 text-slate-400">
              <FileText size={36} className="mx-auto mb-2 text-slate-300" />
              <p className="text-sm">Belum ada file yang diupload untuk unit ini.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="text-center px-5 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide">Nama File</th>
                    <th className="text-center px-5 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide">Catatan</th>
                    <th className="text-center px-5 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide">Diupload Oleh</th>
                    <th className="text-center px-5 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide">Waktu Upload</th>
                    <th className="text-center px-5 py-3 text-xs font-bold text-slate-600 uppercase tracking-wide">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {uploadHistory.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-5 py-3">
                        {record.drive_folder_url ? (
                          <a
                            href={record.drive_folder_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 text-purple-700 hover:text-purple-900 font-medium group"
                          >
                            <FileText size={15} className="shrink-0" />
                            <span className="truncate max-w-[200px]">{record.file_name}</span>
                            <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
                          </a>
                        ) : (
                          <span className="flex items-center gap-2 text-slate-600 font-medium">
                            <FileText size={15} />
                            {record.file_name}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3 text-slate-500 text-xs max-w-[200px] truncate">
                        {record.notes || <span className="text-slate-300 italic">—</span>}
                      </td>
                      <td className="px-5 py-3 text-slate-600 text-xs">{record.uploaded_by}</td>
                      <td className="px-5 py-3 text-slate-500 text-xs">
                        <div className="flex items-center gap-1.5">
                          <Clock size={12} />
                          {new Date(record.uploaded_at).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          {record.drive_folder_url && (
                            <a
                              href={record.drive_folder_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Buka Folder Drive"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-purple-600 hover:bg-purple-50 transition-colors"
                            >
                              <FolderOpen size={15} />
                            </a>
                          )}
                          {isAdmin ? (
                            <button
                              onClick={() => handleDeleteUpload(record.id, record.drive_file_id)}
                              disabled={isDeletingId === record.id}
                              title="Hapus Riwayat"
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50"
                            >
                              {isDeletingId === record.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                            </button>
                          ) : (
                            <span title="Hanya Admin yang dapat menghapus" className="p-1.5 text-slate-200 cursor-not-allowed">
                              <Trash2 size={15} />
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
