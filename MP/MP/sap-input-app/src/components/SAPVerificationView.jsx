import React, { useState, useMemo, useEffect } from 'react';
import { format, endOfMonth, getDaysInMonth } from 'date-fns';
import { id } from 'date-fns/locale';
import { RefreshCw, Download, Calendar, List, X, Copy, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { getSystemConfig } from '../lib/supabaseService';
import * as XLSX from 'xlsx';

export default function SAPVerificationView({ equipments, currentUser }) {
  const [targetMonth, setTargetMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [isProcessing, setIsProcessing] = useState(false);
  const [matrixData, setMatrixData] = useState([]); 
  const [lastUpdated, setLastUpdated] = useState('');
  const [debugMsg, setDebugMsg] = useState('');
  const [groupBy, setGroupBy] = useState('plant'); // 'plant' or 'equipment'
  const [filterPlant, setFilterPlant] = useState('ALL');
  const [filterJenis, setFilterJenis] = useState('');
  const [searchEq, setSearchEq] = useState('');
  const [showOnlySelisih, setShowOnlySelisih] = useState(false);
  const [showRekapModal, setShowRekapModal] = useState(false);
  const [copiedEqs, setCopiedEqs] = useState(false);

  const uniquePlants = useMemo(() => {
    return ['5F01', '5F04', '5F07', '5F08', '5F09', '5F14', '5F15', '5F21', '5F22'];
  }, []);

  const loadMatrixData = async () => {
    setIsProcessing(true);
    try {
       const startDate = `${targetMonth}-01`;
       const endDate = format(endOfMonth(new Date(startDate)), 'yyyy-MM-dd');

       // 1. Fetch ik17_raw_data
       const { data: rawIK17 } = await getSystemConfig('ik17_raw_data');
       const sapHmMap = new Map(); // key: 'plant_date', value: HM
       const sapSaldoAwalMap = new Map(); // key: 'plant', value: HM Saldo Awal
       
       // map eq to plant
       const eqToPlant = new Map();
       const isIndukMap = new Map();
       const eqNameMap = new Map();
       equipments.forEach(eq => {
         isIndukMap.set(eq.eqNum, eq.type === 'Induk');
         eqNameMap.set(eq.eqNum, `${eq.description} [${eq.eqNum}]`);
         if (eq.plant) eqToPlant.set(eq.eqNum, eq.plant);
       });

       if (Array.isArray(rawIK17)) {
         rawIK17.forEach(row => {
           if (row.d >= startDate && row.d <= endDate) {
             // Only process if it is an Induk!
             if (isIndukMap.get(row.e)) {
               if (filterJenis && !String(row.e).startsWith(filterJenis)) return;
               const plant = eqToPlant.get(row.e) || 'Unknown';
               if (currentUser?.role === 'Unit' && currentUser?.plant !== plant) return;

               const groupKey = groupBy === 'plant' ? plant : row.e;

               if (row.s) { // is Saldo Awal
                 sapSaldoAwalMap.set(groupKey, (sapSaldoAwalMap.get(groupKey) || 0) + (row.h || 0));
               } else {
                 const key = `${groupKey}_${row.d}`;
                 if (!sapHmMap.has(key)) sapHmMap.set(key, 0);
                 sapHmMap.set(key, sapHmMap.get(key) + (row.h || 0));
               }
             }
           }
         });
         
         // try to get updated_at for info, if possible. Since we don't return updated_at from getSystemConfig, we just leave it out or add a new field in future.
         setLastUpdated('Data terakhir yang tersimpan di server');
         
         let matched = 0;
         rawIK17.forEach(r => {
           if (eqToPlant.has(r.e)) matched++;
         });
         setDebugMsg(`(Debug: ${rawIK17.length} rows IK17, ${matched} matched eq, ${eqToPlant.size} eq mapping)`);
       } else {
         setDebugMsg(`(Debug: rawIK17 is ${typeof rawIK17})`);
       }

       // 2. Fetch daily_logs
       let allLogs = [];
       if (supabase) {
          let from = 0;
          const PAGE_SIZE = 1000;
          while (true) {
            const { data, error } = await supabase
              .from('daily_logs')
              .select('plant, date, duration_minutes, induk_eq_num')
              .gte('date', startDate)
              .lte('date', endDate)
              .range(from, from + PAGE_SIZE - 1);
              
            if (error) throw error;
            if (data && data.length > 0) {
              allLogs = allLogs.concat(data);
              if (data.length < PAGE_SIZE) break;
              from += PAGE_SIZE;
            } else {
              break;
            }
          }
       }
       
       const webHmMap = new Map();
       allLogs.forEach(log => {
          if (filterJenis && !String(log.induk_eq_num).startsWith(filterJenis)) return;
          const hm = (log.duration_minutes || 0) / 60;
          const plant = log.plant || 'Unknown';
          if (currentUser?.role === 'Unit' && currentUser?.plant !== plant) return;
          
          const groupKey = groupBy === 'plant' ? plant : log.induk_eq_num;
          if (!groupKey) return; // skip if induk_eq_num missing
          
          const date = log.date;
          const key = `${groupKey}_${date}`;
          if (!webHmMap.has(key)) webHmMap.set(key, 0);
          webHmMap.set(key, webHmMap.get(key) + hm);
       });

       // 3. Combine into matrix
       const groupsToInclude = new Set([...Array.from(sapHmMap.keys()).map(k => k.split('_')[0]), ...Array.from(webHmMap.keys()).map(k => k.split('_')[0])]);
       
       if (groupBy === 'plant') {
          uniquePlants.forEach(p => {
              if (currentUser?.role === 'Unit' && currentUser?.plant !== p) return;
              groupsToInclude.add(p);
          });
       }
       
       const matrix = [];
       const daysInMonth = getDaysInMonth(new Date(startDate));

       groupsToInclude.forEach(groupKey => {
          const dates = {};
          let hasAnyData = false;
          const saldoAwal = sapSaldoAwalMap.get(groupKey) || 0;
          
          for (let i=1; i<=daysInMonth; i++) {
             const d = `${targetMonth}-${String(i).padStart(2, '0')}`;
             const key = `${groupKey}_${d}`;
             const web = Math.round((webHmMap.get(key) || 0) * 100) / 100;
             const sap = Math.round((sapHmMap.get(key) || 0) * 100) / 100;
             dates[d] = { web, sap };
             if (web > 0 || sap > 0) hasAnyData = true;
          }
          
          if (hasAnyData || saldoAwal > 0 || groupBy === 'plant') {
             const groupName = groupBy === 'plant' ? groupKey : (eqNameMap.get(groupKey) || groupKey);
             const eqPlant = groupBy === 'plant' ? groupKey : (eqToPlant.get(groupKey) || 'Unknown');
             matrix.push({ groupName, dates, saldoAwal, plant: eqPlant, eqNum: groupKey });
          }
       });

       setMatrixData(matrix.sort((a,b) => a.groupName.localeCompare(b.groupName)));
    } catch (e) {
       console.error(e);
       alert("Gagal memuat data matrix: " + e.message);
    }
    setIsProcessing(false);
  };

  useEffect(() => {
    if (equipments && equipments.length > 0) {
      loadMatrixData();
    }
  }, [targetMonth, equipments, groupBy, filterJenis]);

  const daysInMonth = getDaysInMonth(new Date(`${targetMonth}-01`));
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const filteredMatrixData = useMemo(() => {
    let result = matrixData;
    
    if (showOnlySelisih) {
       result = result.filter(r => {
          let cumWeb = r.saldoAwal || 0;
          let cumSap = r.saldoAwal || 0;
          
          for (let i = 1; i <= daysInMonth; i++) {
             const d = `${targetMonth}-${String(i).padStart(2, '0')}`;
             const cell = r.dates[d];
             if (cell) {
                cumWeb = Math.round((cumWeb + cell.web) * 100) / 100;
                cumSap = Math.round((cumSap + cell.sap) * 100) / 100;
             }
          }
          
          const finalDiff = Math.round((cumWeb - cumSap) * 100) / 100;
          return finalDiff !== 0;
       });
    }

    if (groupBy === 'equipment') {
       if (filterPlant !== 'ALL') {
          result = result.filter(r => r.plant === filterPlant);
       }
       if (filterJenis) {
          result = result.filter(r => r.eqNum && String(r.eqNum).startsWith(filterJenis));
       }
       if (searchEq.trim() !== '') {
          const q = searchEq.toLowerCase();
          result = result.filter(r => r.groupName.toLowerCase().includes(q));
       }
    }
    return result;
  }, [matrixData, groupBy, filterPlant, filterJenis, searchEq, showOnlySelisih, daysInMonth, targetMonth]);

  const handleExport = () => {
    // Generate a simple Excel from the rendered table
    const table = document.getElementById('matrix-table');
    const wb = XLSX.utils.table_to_book(table, { sheet: "Verifikasi SAP" });
    XLSX.writeFile(wb, `Verifikasi_SAP_${targetMonth}.xlsx`);
  };

  const handleCopyEqs = () => {
    if (groupBy === 'plant') {
      alert("Silakan ubah 'Tampilkan Berdasarkan' menjadi 'Mesin (Equipment)' terlebih dahulu untuk menyalin nomor equipment.");
      return;
    }
    
    const eqsToCopy = [];
    const dataSource = filteredMatrixData;
    
    dataSource.forEach(r => {
      let cumWeb = r.saldoAwal || 0;
      let cumSap = r.saldoAwal || 0;
      for (let i = 1; i <= daysInMonth; i++) {
         const d = `${targetMonth}-${String(i).padStart(2, '0')}`;
         const cell = r.dates[d];
         if (cell) {
            cumWeb = Math.round((cumWeb + cell.web) * 100) / 100;
            cumSap = Math.round((cumSap + cell.sap) * 100) / 100;
         }
      }
      const finalDiff = Math.round((cumWeb - cumSap) * 100) / 100;
      if (finalDiff !== 0) {
        const match = r.groupName.match(/\[(.*?)\]/);
        if (match) {
          eqsToCopy.push(match[1]);
        } else {
          eqsToCopy.push(r.groupName);
        }
      }
    });

    if (eqsToCopy.length > 0) {
      navigator.clipboard.writeText(eqsToCopy.join('\n'))
        .then(() => {
          setCopiedEqs(true);
          setTimeout(() => setCopiedEqs(false), 2000);
        })
        .catch(err => {
          console.error("Gagal menyalin:", err);
          alert("Gagal menyalin ke clipboard");
        });
    } else {
      alert("Tidak ada equipment yang memiliki selisih untuk disalin.");
    }
  };

  const col1Width = groupBy === 'plant' ? 60 : 250;
  const col2Width = 80;
  const col3Width = 60;

  return (
    <div className="bg-slate-50 min-h-full h-[calc(100vh-100px)] overflow-y-auto flex flex-col">
      <div className="p-4 md:p-6 w-full space-y-4">
        
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#fafafa]  p-6 rounded-2xl border border-emerald-100 shadow-lg shadow-emerald-900/5 sticky top-0 z-50">
          <div>
            <h2 className="text-base font-bold text-slate-800">Verifikasi Sinkronisasi SAP (Matrix)</h2>
            <p className="text-xs text-slate-400 font-medium mt-0.5">
              {lastUpdated ? `Menggunakan data referensi SAP IK17 dari database. ${debugMsg}` : 'Memuat data...'}
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 items-end sm:items-end">
            
            <div className="flex flex-col">
              <label className="text-xs font-bold text-slate-500 mb-1">Tampilkan Berdasarkan</label>
              <select 
                value={groupBy}
                onChange={e => setGroupBy(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-2xl text-xs font-medium bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30 focus:border-[#064e3b]"
              >
                <option value="plant">Pabrik (Plant)</option>
                <option value="equipment">Mesin (Equipment)</option>
              </select>
            </div>

            <div className="flex flex-col">
              <label className="text-xs font-bold text-slate-500 mb-1">Pilih Bulan</label>
              <div className="relative">
                <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input 
                  type="month"
                  value={targetMonth}
                  onChange={e => setTargetMonth(e.target.value)}
                  className="pl-8 pr-3 py-2 border border-slate-200 rounded-2xl text-xs font-medium bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30 focus:border-[#064e3b]"
                />
              </div>
            </div>
            
            <div className="flex flex-col">
              <label className="text-xs font-bold text-slate-500 mb-1">Jenis Equipment</label>
              <select 
                value={filterJenis}
                onChange={e => setFilterJenis(e.target.value)}
                className="px-3 py-2 border border-slate-200 rounded-2xl text-xs font-medium bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30 focus:border-[#064e3b]"
              >
                <option value="">Semua Jenis</option>
                <option value="1">Pabrik (1)</option>
                <option value="2">Kendaraan (2)</option>
              </select>
            </div>

            {groupBy === 'equipment' && (
              <>
                <div className="flex flex-col">
                  <label className="text-xs font-bold text-slate-500 mb-1">Filter Plant</label>
                  <select 
                    value={filterPlant}
                    onChange={e => setFilterPlant(e.target.value)}
                    className="px-3 py-2 border border-slate-200 rounded-2xl text-xs font-medium bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30 focus:border-[#064e3b]"
                  >
                    <option value="ALL">Semua Plant</option>
                    {uniquePlants.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col">
                  <label className="text-xs font-bold text-slate-500 mb-1">Cari Equipment</label>
                  <input 
                    type="text"
                    value={searchEq}
                    onChange={e => setSearchEq(e.target.value)}
                    placeholder="Nama atau Nomor..."
                    className="px-3 py-2 border border-slate-200 rounded-2xl text-xs font-medium bg-slate-50 text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30 focus:border-[#064e3b] min-w-[150px]"
                  />
                </div>
              </>
            )}

            <div className="flex flex-col h-[38px] justify-end sm:ml-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-600 bg-white border border-slate-200 px-3 py-2 rounded-2xl hover:bg-slate-50 transition-colors h-full select-none">
                <input 
                  type="checkbox"
                  checked={showOnlySelisih}
                  onChange={e => setShowOnlySelisih(e.target.checked)}
                  className="w-3.5 h-3.5 text-[#064e3b] rounded border-slate-300 focus:ring-[#064e3b]"
                />
                Hanya Selisih
              </label>
            </div>

            <button
              onClick={loadMatrixData}
              disabled={isProcessing}
              title="Muat Ulang"
              className={`bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 p-2 sm:p-2.5 mt-5 sm:mt-0 rounded-2xl font-medium flex items-center justify-center transition-colors shadow-sm ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <RefreshCw size={15} className={isProcessing ? 'animate-spin' : ''} />
            </button>

            <button
              onClick={handleExport}
              disabled={isProcessing || matrixData.length === 0}
              title="Export Excel"
              className="bg-emerald-600 hover:bg-emerald-700 text-white p-2 sm:p-2.5 mt-5 sm:mt-0 rounded-2xl font-medium flex items-center justify-center transition-colors shadow-sm disabled:opacity-50"
            >
              <Download size={15} />
            </button>

            <button
              onClick={() => setShowRekapModal(true)}
              disabled={isProcessing || filteredMatrixData.length === 0}
              title="Lihat Rekap Selisih"
              className="bg-[#064e3b] hover:bg-[#065f46] text-white px-3 py-2 sm:py-2.5 mt-5 sm:mt-0 rounded-2xl font-bold flex items-center justify-center transition-colors shadow-sm disabled:opacity-50 text-xs gap-1.5"
            >
              <List size={14} /> Rekap Selisih
            </button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-lg shadow-emerald-900/5 overflow-hidden flex flex-col max-h-[75vh] mt-2">
          <div className="overflow-auto flex-1">
            <table id="matrix-table" className="w-full text-center text-xs border-collapse">
              <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-200">
                <tr>
                  <th style={{ width: col1Width, minWidth: col1Width, left: 0 }} className="border border-slate-200 px-2 py-2.5 font-bold text-slate-600 bg-slate-50 sticky z-20 uppercase tracking-wider text-[10px]">
                    {groupBy === 'plant' ? 'Plant' : 'Equipment'}
                  </th>
                  <th style={{ width: col2Width, minWidth: col2Width, left: col1Width }} className="border border-slate-200 px-2 py-2.5 font-bold text-slate-600 bg-slate-50 sticky z-20 uppercase tracking-wider text-[10px]">
                    Kategori
                  </th>
                  <th style={{ width: col3Width, minWidth: col3Width, left: col1Width + col2Width }} className="border border-slate-200 px-2 py-2.5 font-bold text-slate-600 bg-slate-50 sticky z-20 uppercase tracking-wider text-[10px]">
                    Data
                  </th>
                  {daysArray.map(d => (
                    <th key={d} className="border border-slate-200 px-2 py-2.5 font-bold text-slate-500 min-w-[30px] text-[10px]">{String(d).padStart(2, '0')}</th>
                  ))}
                  <th className="border border-slate-200 px-2 py-2.5 font-bold text-[#064e3b] bg-emerald-50 min-w-[50px] text-[10px] uppercase tracking-wider">s.d {daysInMonth}</th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {filteredMatrixData.length === 0 && !isProcessing && (
                  <tr>
                    <td colSpan={daysInMonth + 4} className="py-12 text-center text-slate-400">Tidak ada data untuk filter tersebut.</td>
                  </tr>
                )}
                {filteredMatrixData.map((row, idx) => {
                  const saldoAwal = row.saldoAwal || 0;
                  let cumWeb = saldoAwal;
                  let cumSap = saldoAwal;
                  
                  // Per Tanggal row arrays
                  const ptWeb = [];
                  const ptSap = [];
                  const ptSelisih = [];
                  
                  // S.d Tanggal row arrays
                  const sdWeb = [];
                  const sdSap = [];
                  const sdSelisih = [];

                  daysArray.forEach(d => {
                     const dateKey = `${targetMonth}-${String(d).padStart(2, '0')}`;
                     const { web, sap } = row.dates[dateKey] || { web: 0, sap: 0 };
                     
                     // Per Tanggal
                     ptWeb.push(web);
                     ptSap.push(sap);
                     const diffPT = Math.round((web - sap) * 100) / 100;
                     ptSelisih.push(diffPT);

                     // Kumulatif
                     cumWeb = Math.round((cumWeb + web) * 100) / 100;
                     cumSap = Math.round((cumSap + sap) * 100) / 100;
                     sdWeb.push(cumWeb);
                     sdSap.push(cumSap);
                     const diffSD = Math.round((cumWeb - cumSap) * 100) / 100;
                     sdSelisih.push(diffSD);
                  });

                  return (
                    <React.Fragment key={row.groupName}>
                      {/* --- Kategori: Per Tanggal --- */}
                      {/* Web */}
                      <tr className="border-t-[3px] border-slate-300">
                        <td rowSpan={6} style={{ width: col1Width, minWidth: col1Width, maxWidth: col1Width, left: 0 }} className="border border-slate-200 px-2 py-1 font-bold text-slate-800 bg-slate-50 align-middle sticky z-10 whitespace-normal break-words text-left">
                          {row.groupName}
                        </td>
                        <td rowSpan={3} style={{ width: col2Width, minWidth: col2Width, left: col1Width }} className="border border-slate-200 px-2 py-1 text-slate-700 bg-slate-50 align-middle sticky z-10">
                          Per Tanggal
                        </td>
                        <td style={{ width: col3Width, minWidth: col3Width, left: col1Width + col2Width }} className="border border-slate-200 px-2 py-1 text-slate-600 font-medium text-left bg-white sticky z-10">
                          Web
                        </td>
                        {ptWeb.map((v, i) => <td key={i} className="border border-slate-200 px-1 py-1">{v || '-'}</td>)}
                        <td className="border border-slate-200 px-2 py-1 font-bold bg-emerald-50 text-emerald-900">{Math.round(cumWeb * 100) / 100}</td>
                      </tr>
                      {/* SAP */}
                      <tr>
                        <td style={{ width: col3Width, minWidth: col3Width, left: col1Width + col2Width }} className="border border-slate-200 px-2 py-1 text-slate-600 font-medium text-left bg-white sticky z-10">
                          SAP
                        </td>
                        {ptSap.map((v, i) => <td key={i} className="border border-slate-200 px-1 py-1">{v || '-'}</td>)}
                        <td className="border border-slate-200 px-2 py-1 font-bold bg-emerald-50 text-emerald-900">{Math.round(cumSap * 100) / 100}</td>
                      </tr>
                      {/* Selisih */}
                      <tr>
                        <td style={{ width: col3Width, minWidth: col3Width, left: col1Width + col2Width }} className="border border-slate-200 px-2 py-1 text-slate-600 font-bold text-left bg-slate-50 sticky z-10">
                          Selisih
                        </td>
                        {ptSelisih.map((v, i) => (
                          <td key={i} className={`border border-slate-200 px-1 py-1 font-black ${v > 0 ? 'bg-amber-50 text-amber-600 shadow-[inset_0_0_0_1px_rgba(217,119,6,0.2)]' : (v < 0 ? 'bg-rose-50 text-rose-600 shadow-[inset_0_0_0_1px_rgba(225,29,72,0.2)]' : 'text-slate-300 font-medium')}`}>
                            {v || 0}
                          </td>
                        ))}
                        <td className={`border border-slate-200 px-2 py-1 font-black ${Math.round((cumWeb - cumSap) * 100) / 100 !== 0 ? 'bg-rose-100 text-rose-700 shadow-[inset_0_0_0_1px_rgba(225,29,72,0.3)]' : 'bg-emerald-50 text-slate-400'}`}>
                           {Math.round((cumWeb - cumSap) * 100) / 100}
                        </td>
                      </tr>

                      {/* --- Kategori: S.d Tanggal --- */}
                      {/* Web */}
                      <tr className="border-t-2 border-slate-200">
                        <td rowSpan={3} style={{ width: col2Width, minWidth: col2Width, left: col1Width }} className="border border-slate-200 px-2 py-1 text-slate-700 bg-slate-50 align-middle sticky z-10">
                          S.d Tanggal
                        </td>
                        <td style={{ width: col3Width, minWidth: col3Width, left: col1Width + col2Width }} className="border border-slate-200 px-2 py-1 text-slate-600 font-medium text-left bg-white sticky z-10">
                          Web
                        </td>
                        {sdWeb.map((v, i) => <td key={i} className="border border-slate-200 px-1 py-1 text-slate-500 bg-slate-50/50 font-mono">{v}</td>)}
                        <td className="border border-slate-200 px-2 py-1 font-bold bg-emerald-100 text-[#064e3b] font-mono">{Math.round(cumWeb * 100) / 100}</td>
                      </tr>
                      {/* SAP */}
                      <tr>
                        <td style={{ width: col3Width, minWidth: col3Width, left: col1Width + col2Width }} className="border border-slate-200 px-2 py-1 text-slate-600 font-medium text-left bg-white sticky z-10">
                          SAP
                        </td>
                        {sdSap.map((v, i) => <td key={i} className="border border-slate-200 px-1 py-1 text-slate-500 bg-slate-50/50 font-mono">{v}</td>)}
                        <td className="border border-slate-200 px-2 py-1 font-bold bg-emerald-100 text-[#064e3b] font-mono">{Math.round(cumSap * 100) / 100}</td>
                      </tr>
                      {/* Selisih */}
                      <tr>
                        <td style={{ width: col3Width, minWidth: col3Width, left: col1Width + col2Width }} className="border border-slate-200 px-2 py-1 text-slate-600 font-bold text-left bg-slate-50 sticky z-10">
                          Selisih
                        </td>
                        {sdSelisih.map((v, i) => (
                          <td key={i} className={`border border-slate-200 px-1 py-1 font-black ${v > 0 ? 'bg-amber-50 text-amber-600 shadow-[inset_0_0_0_1px_rgba(217,119,6,0.2)]' : (v < 0 ? 'bg-rose-50 text-rose-600 shadow-[inset_0_0_0_1px_rgba(225,29,72,0.2)]' : 'text-slate-300 font-medium bg-slate-50/50')}`}>
                            {v || 0}
                          </td>
                        ))}
                         <td className={`border border-slate-200 px-2 py-1 font-black font-mono ${Math.round((cumWeb - cumSap) * 100) / 100 !== 0 ? 'bg-rose-100 text-rose-700 shadow-[inset_0_0_0_1px_rgba(225,29,72,0.3)]' : 'bg-emerald-50 text-slate-400'}`}>
                            {Math.round((cumWeb - cumSap) * 100) / 100}
                         </td>
                      </tr>
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Rekap Selisih Modal */}
      {showRekapModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                  <List size={16} className="text-[#064e3b]" />
                  Rekap Equipment Selisih HM
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Bulan: {format(new Date(`${targetMonth}-01`), 'MMMM yyyy', { locale: id })}</p>
              </div>
              <div className="flex items-center gap-3">
                <button 
                  onClick={handleCopyEqs}
                  disabled={groupBy === 'plant'}
                  className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title={groupBy === 'plant' ? "Ubah tampilan ke Equipment terlebih dahulu" : "Salin nomor equipment ke clipboard"}
                >
                  {copiedEqs ? <><Check size={13} className="text-emerald-600"/> Disalin</> : <><Copy size={13}/> Salin No. Eq</>}
                </button>
                <button onClick={() => setShowRekapModal(false)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-2xl transition-colors"><X size={18}/></button>
              </div>
            </div>
            <div className="p-0 overflow-auto flex-1">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="px-4 py-3 font-semibold text-slate-600 border-b bg-slate-50">No</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 border-b bg-slate-50">Plant</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 border-b bg-slate-50">Equipment</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 border-b bg-slate-50 text-right">Web s.d (HM)</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 border-b bg-slate-50 text-right">SAP s.d (HM)</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 border-b bg-slate-50 text-right">Selisih</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(() => {
                    let counter = 1;
                    const rows = [];
                    // Selalu gunakan matrixData penuh untuk mencari selisih, 
                    // kecuali filter plant / pencarian aktif.
                    const dataSource = groupBy === 'equipment' ? filteredMatrixData : matrixData;
                    
                    dataSource.forEach(r => {
                      let cumWeb = r.saldoAwal || 0;
                      let cumSap = r.saldoAwal || 0;
                      for (let i = 1; i <= daysInMonth; i++) {
                         const d = `${targetMonth}-${String(i).padStart(2, '0')}`;
                         const cell = r.dates[d];
                         if (cell) {
                            cumWeb = Math.round((cumWeb + cell.web) * 100) / 100;
                            cumSap = Math.round((cumSap + cell.sap) * 100) / 100;
                         }
                      }
                      const finalDiff = Math.round((cumWeb - cumSap) * 100) / 100;
                      if (finalDiff !== 0) {
                        rows.push(
                          <tr key={r.groupName} className="hover:bg-slate-50">
                            <td className="px-4 py-2">{counter++}</td>
                            <td className="px-4 py-2 font-medium"><span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs">{r.plant || '-'}</span></td>
                            <td className="px-4 py-2">{r.groupName}</td>
                            <td className="px-4 py-2 text-right">{cumWeb}</td>
                            <td className="px-4 py-2 text-right">{cumSap}</td>
                            <td className="px-4 py-2 text-right font-bold text-red-600">{finalDiff}</td>
                          </tr>
                        );
                      }
                    });
                    if (rows.length === 0) {
                      return <tr><td colSpan="6" className="px-4 py-8 text-center text-slate-500">Tidak ada equipment dengan selisih s.d HM.</td></tr>;
                    }
                    return rows;
                  })()}
                </tbody>
              </table>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end shrink-0">
              <button onClick={() => setShowRekapModal(false)} className="px-4 py-2 bg-[#064e3b] hover:bg-[#065f46] text-white rounded-2xl font-bold transition-colors text-xs">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
