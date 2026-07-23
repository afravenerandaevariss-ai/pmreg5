import React, { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../lib/supabase';

import { Search, Filter, FileSpreadsheet, RefreshCw, Layers, DollarSign, X, Info, AlertTriangle, CheckCircle, Printer, ChevronDown, Copy } from 'lucide-react';

export default function WorkOrderMonitoringView({ currentUser }) {
  const [data, setData] = useState([]);
  const [zvtabData, setZvtabData] = useState({});
  const [export046Data, setExport046Data] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Filters state
  const isAdmin = currentUser?.role === 'Admin' || currentUser?.role === 'Regional';

  const [selectedPlant, setSelectedPlant] = useState(
    !isAdmin && currentUser?.plant ? currentUser.plant : ''
  );
  
  useEffect(() => {
    if (!isAdmin && currentUser?.plant) {
      setSelectedPlant(currentUser.plant);
    }
  }, [isAdmin, currentUser]);

  const [selectedType, setSelectedType] = useState('');
  const [selectedStatus, setSelectedStatus] = useState([]);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const statusDropdownRef = useRef(null);
  const [selectedMonth, setSelectedMonth] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Selected WO for Detail Modal
  const [selectedWoDetail, setSelectedWoDetail] = useState(null);

  const fetchData = async () => {
    try {
      const res = await fetch('/IW39.xlsx');
      if (!res.ok) throw new Error("Gagal mengunduh file data IW39.xlsx. Pastikan file berada di folder public.");
      const parsedData = await processFileOnBackend(await res.blob(), 'iw39');
      setData(parsedData);
    } catch (err) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const processFileOnBackend = async (fileBlob, type) => {
    return new Promise(async (resolve, reject) => {
      try {
        const sessionId = crypto.randomUUID();
        const fileName = `${sessionId}.xlsx`;
        
        // Upload directly to Supabase Storage (100% browser-native upload)
        setUploadProgress(10);
        const { error: uploadError } = await supabase.storage
          .from('excel_uploads')
          .upload(fileName, fileBlob, {
            cacheControl: '3600',
            upsert: false
          });

        if (uploadError) {
          throw new Error(`Gagal mengunggah file ke Storage: ${uploadError.message}`);
        }
        
        setUploadProgress(75); // Start processing

        // Trigger backend processing
        const processRes = await fetch('/api/process-excel', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ session_id: sessionId, type })
        });
        
        if (!processRes.ok) {
          const errBody = await processRes.text();
          throw new Error(`Gagal memproses data di server: ${errBody}`);
        }
        setUploadProgress(90); // Fetching from DB

        // Fetch result from Supabase
        const { data, error } = await supabase
          .from('parsed_excel')
          .select('data')
          .eq('session_id', sessionId)
          .single();
          
        if (error || !data) throw new Error('Gagal mengambil hasil pemrosesan dari server');

        setUploadProgress(100);
        resolve(data.data);
      } catch (err) {
        reject(err);
      } finally {
        setTimeout(() => setUploadProgress(0), 1000);
      }
    });
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    try {
      const parsedData = await processFileOnBackend(file, 'iw39');
      setData(parsedData);
      setSuccessMsg("Data IW39 berhasil diperbarui!");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error(err);
      setError("Gagal membaca file IW39. Pastikan format file Excel (XLSX).");
    } finally {
      setLoading(false);
    }
  };

  const handleZvtabUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    try {
      const parsedData = await processFileOnBackend(file, 'zvtab');
      setZvtabData(parsedData);
      setSuccessMsg("Data ZVTAB berhasil diperbarui!");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error(err);
      setError("Gagal membaca file ZVTAB.");
    } finally {
      setLoading(false);
    }
  };

  const handleExport046Upload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    try {
      const parsedData = await processFileOnBackend(file, '046exp');
      setExport046Data(parsedData);
      setSuccessMsg("Data 046EXPORT berhasil diperbarui!");
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error(err);
      setError("Gagal membaca file 046EXPORT.");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  useEffect(() => {
    function handleClickOutside(event) {
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(event.target)) {
        setIsStatusDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    fetchData();
  }, []);

  const [copiedOrders, setCopiedOrders] = useState(false);

  const handleCopyOrders = () => {
    const orders = filteredData.map(item => String(item['Order'] || '').trim()).filter(Boolean);
    if (orders.length > 0) {
      navigator.clipboard.writeText(orders.join('\n')).then(() => {
        setCopiedOrders(true);
        setTimeout(() => setCopiedOrders(false), 2000);
      }).catch(err => {
        console.error("Failed to copy:", err);
      });
    }
  };

  const convertExcelDate = (serial) => {
    if (!serial) return '-';
    if (typeof serial === 'string') {
      const s = serial.trim();
      if (/^\d{8}$/.test(s)) {
        const year = s.substring(0, 4);
        const month = s.substring(4, 6);
        const day = s.substring(6, 8);
        const date = new Date(`${year}-${month}-${day}`);
        if (!isNaN(date.getTime())) {
          return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
        }
      }
      return serial;
    }
    const date = new Date((serial - 25569) * 86400 * 1000);
    return date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  const getExcelMonth = (serial) => {
    if (!serial) return null;
    if (typeof serial === 'string') {
      const s = serial.trim();
      if (/^\d{8}$/.test(s)) return parseInt(s.substring(4, 6), 10);
      if (/^\d{4}-\d{2}-\d{2}/.test(s)) return parseInt(s.split('-')[1], 10);
      if (/^\d{2}\.\d{2}\.\d{4}/.test(s)) return parseInt(s.split('.')[1], 10);
      if (/^\d{2}\/\d{2}\/\d{4}/.test(s)) return parseInt(s.split('/')[1], 10);
      const date = new Date(s);
      if (!isNaN(date.getTime())) return date.getMonth() + 1;
      return null;
    }
    const date = new Date((serial - 25569) * 86400 * 1000);
    return date.getMonth() + 1; // 1-indexed
  };

  const formatCurrency = (val) => {
    const num = Number(val || 0);
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(num);
  };

  // Filter options
  const uniquePlants = useMemo(() => {
    if (!isAdmin && currentUser?.plant) {
      return [currentUser.plant];
    }
    const plants = data.map(item => item['Plant'] || item['Planning Plant']).filter(Boolean);
    return [...new Set(plants)].sort();
  }, [data, isAdmin, currentUser]);

  const uniqueTypes = useMemo(() => {
    const types = data.map(item => item['Order Type']).filter(Boolean);
    return [...new Set(types)].sort();
  }, [data]);

  const uniqueStatuses = useMemo(() => {
    const statuses = new Set();
    data.forEach(item => {
      const statusStr = item['System status'] || '';
      const firstToken = statusStr.trim().split(/\s+/)[0].toUpperCase();
      if (firstToken && ['REL', 'TECO', 'CLSD'].includes(firstToken)) {
        statuses.add(firstToken);
      }
    });
    // Ensure the specific order or at least only these 3 if they exist
    return ['REL', 'TECO', 'CLSD'];
  }, [data]);

  const indonesianMonths = [
    { val: '1', label: 'Januari' },
    { val: '2', label: 'Februari' },
    { val: '3', label: 'Maret' },
    { val: '4', label: 'April' },
    { val: '5', label: 'Mei' },
    { val: '6', label: 'Juni' },
    { val: '7', label: 'Juli' },
    { val: '8', label: 'Agustus' },
    { val: '9', label: 'September' },
    { val: '10', label: 'Oktober' },
    { val: '11', label: 'November' },
    { val: '12', label: 'Desember' }
  ];

  // Filtered data
  const filteredData = useMemo(() => {
    const joinedData = data.map(item => {
      const order = String(item['Order'] || '').trim();
      const po = zvtabData[order] || '';
      const exportData = export046Data[po] || { pr: '', ses: '', mir7: '' };
      return {
        ...item,
        PO: po,
        PR: exportData.pr,
        SES: exportData.ses,
        MIR7: exportData.mir7
      };
    });

    return joinedData.filter(item => {
      const plantVal = String(item['Plant'] || item['Planning Plant'] || '').toLowerCase();
      const typeVal = String(item['Order Type'] || '').toLowerCase();
      const statusVal = String(item['System status'] || '');
      const orderVal = String(item['Order'] || '').toLowerCase();
      const ccVal = String(item['Cost Center'] || '').toLowerCase();
      const eqVal = String(item['Equipment'] || '').toLowerCase();
      const descVal = String(item['Description'] || '').toLowerCase();
      const desc2Val = String(item['Description_2'] || '').toLowerCase();

      const matchesPlant = !selectedPlant || plantVal === selectedPlant.toLowerCase();
      const matchesType = !selectedType || typeVal === selectedType.toLowerCase();
      
      const firstStatusToken = statusVal.trim().split(/\s+/)[0].toUpperCase();
      const matchesStatus = selectedStatus.length === 0 || selectedStatus.some(status => firstStatusToken.startsWith(status));
      
      const matchesMonth = !selectedMonth || getExcelMonth(item['Reference Date']) === Number(selectedMonth);
      
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch = !query || 
        orderVal.includes(query) ||
        ccVal.includes(query) ||
        eqVal.includes(query) ||
        descVal.includes(query) ||
        desc2Val.includes(query);

      return matchesPlant && matchesType && matchesStatus && matchesMonth && matchesSearch;
    });
  }, [data, zvtabData, export046Data, selectedPlant, selectedType, selectedStatus, selectedMonth, searchQuery]);

  // Calculations
  const totals = useMemo(() => {
    let planned = 0;
    let actual = 0;
    filteredData.forEach(item => {
      planned += Number(item['TotalPlnndCosts'] || 0);
      actual += Number(item['Total act.costs'] || 0);
    });
    return {
      planned,
      actual,
      count: filteredData.length
    };
  }, [filteredData]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-32 bg-white rounded-3xl border border-slate-200 shadow-sm m-8 gap-4">
        <RefreshCw className="animate-spin text-[#064e3b]" size={40} />
        <p className="text-sm font-semibold text-slate-500">Membaca file data IW39.xlsx dari server lokal...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center bg-white rounded-3xl border border-red-200 m-8 space-y-4 shadow-sm">
        <AlertTriangle className="text-red-500 mx-auto" size={48} />
        <h3 className="text-lg font-bold text-slate-800">Gagal Memuat Laporan IW39</h3>
        <p className="text-sm text-slate-500 max-w-md mx-auto">{error}</p>
        <button 
          onClick={fetchData}
          className="bg-[#064e3b] hover:bg-[#065f46] focus:bg-[#065f46] text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-colors duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#064e3b]"
        >
          Coba Lagi
        </button>
      </div>
    );
  }

  return (
    <div className="-mx-3 -my-3 sm:-mx-6 sm:-my-6 lg:-mx-8 lg:-my-8 bg-transparent h-[calc(100vh-64px)] overflow-y-auto print:p-0 print:m-0 print:overflow-visible print:h-auto">
      <div className="p-4 sm:p-10 font-sans text-slate-800 space-y-6 print:p-0 print:m-0 print:space-y-0">
      <style type="text/css">
        {`
          @media print {
            @page {
              size: A4 landscape;
              margin: 5mm 6mm;
            }
            html, body, #root, #root > div, main {
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              border: none !important;
              box-shadow: none !important;
              overflow: visible !important;
              display: block !important;
            }
            body * {
              visibility: hidden !important;
            }
            #wo-print-area, #wo-print-area * {
              visibility: visible !important;
            }
            #wo-print-area {
              position: relative !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              max-width: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              background: #ffffff !important;
              box-sizing: border-box !important;
            }
            #wo-print-area table {
              width: 100% !important;
              max-width: 100% !important;
              table-layout: fixed !important;
              zoom: 0.78 !important;
              margin: 0 auto !important;
            }
            #wo-print-area th {
              word-break: break-word !important;
              overflow-wrap: break-word !important;
              padding: 5px 3px !important;
              font-size: 8px !important;
              line-height: 1.2 !important;
              border: 1px solid #000000 !important;
              color: #000000 !important;
            }
            #wo-print-area td {
              word-break: break-word !important;
              overflow-wrap: break-word !important;
              padding: 4px 3px !important;
              font-size: 7.5px !important;
              line-height: 1.2 !important;
              border: 1px solid #000000 !important;
              color: #000000 !important;
            }
            tr {
              page-break-inside: avoid !important;
              break-inside: avoid !important;
            }
            thead {
              display: table-header-group !important;
            }
            .print-header-box {
              padding-top: 16px !important;
              padding-bottom: 14px !important;
              text-align: center !important;
            }
          }
        `}
      </style>
      
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <FileSpreadsheet className="text-[#064e3b]" /> Laporan Realisasi Work Order (IW39)
          </h2>
          <p className="text-slate-500 text-sm mt-1">
            Data pemeliharaan aset, realisasi pengerjaan, dan monitoring biaya aktual vs planned langsung dari SAP PM.
          </p>
        </div>
        <div className="flex items-center gap-2 print:hidden">
          {isAdmin && (
            <button 
              onClick={handleCopyOrders}
              className="flex items-center gap-2 text-xs font-bold bg-slate-100 text-slate-700 px-4 py-2 rounded-xl border border-slate-200 shadow-sm hover:bg-slate-200 transition-colors duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-slate-300"
            >
              {copiedOrders ? <><CheckCircle size={16} className="text-emerald-600" /> Disalin</> : <><Copy size={16} /> Salin No. Order</>}
            </button>
          )}
          <button 
            onClick={handlePrint}
            className="flex items-center gap-2 text-xs font-bold bg-white text-slate-700 px-4 py-2 rounded-xl border border-slate-200 shadow-sm hover:bg-slate-50 transition-colors duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-slate-200"
          >
            <Printer size={16} /> Cetak Laporan
          </button>
          <div className="flex items-center gap-2 text-xs font-semibold bg-emerald-50 text-emerald-700 px-3.5 py-2 rounded-xl border border-emerald-100 hidden sm:flex">
            <Layers size={14} /> Sinkronisasi SAP PM
          </div>
        </div>
      </div>

      {/* Upload Section (Regional/Admin Only) */}
      {isAdmin && (
        <div className="bg-white p-6 rounded-3xl border border-emerald-200 shadow-sm bg-emerald-50/30 print:hidden">
          <h3 className="text-sm font-bold text-[#064e3b] mb-3 flex items-center gap-2">
            <Layers size={16} /> Update Data Laporan IW39 (Admin Area)
          </h3>
          
          {successMsg && (
            <div className="mb-4 bg-emerald-100 border border-emerald-300 text-emerald-800 px-4 py-3 rounded-xl flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300">
              <CheckCircle size={18} className="text-emerald-600 shrink-0" />
              <p className="text-sm font-bold">{successMsg}</p>
            </div>
          )}
          
          {loading && (
            <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-4 rounded-2xl flex flex-col gap-3 shadow-sm print:hidden">
              <div className="flex items-center gap-3">
                <RefreshCw className="animate-spin text-blue-500" size={20} />
                <div className="flex flex-col">
                  <span className="font-bold text-sm">Sedang memproses data di Backend Server...</span>
                  <span className="text-xs text-blue-600">Mohon tunggu. Proses ini dijamin tidak akan membuat browser Anda freeze.</span>
                </div>
              </div>
              {uploadProgress > 0 && (
                <div className="w-full bg-blue-200 rounded-full h-2.5 mt-1">
                  <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                </div>
              )}
            </div>
          )}
          
          <div className="flex flex-col xl:flex-row items-start justify-between gap-6">
            <p className="text-xs text-slate-600 max-w-sm leading-relaxed">
              Silakan upload file <strong className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">IW39</strong>, <strong className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">ZVTAB</strong>, dan <strong className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200">046EXP</strong> untuk memperbarui data realisasi WO di *dashboard* ini.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 w-full xl:w-auto">
              <div className="flex items-center justify-between sm:justify-start gap-2 bg-white p-2 rounded-xl border border-slate-200 flex-1">
                <span className="text-[10px] font-bold text-slate-600 w-12 text-right">IW39</span>
                <input type="file" accept=".xlsx, .xls" onChange={handleFileUpload} className="block w-full text-[10px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-[#064e3b] file:text-white hover:file:bg-[#065f46] transition-colors duration-200 ease-out cursor-pointer focus:outline-none" />
              </div>
              <div className="flex items-center justify-between sm:justify-start gap-2 bg-white p-2 rounded-xl border border-slate-200 flex-1">
                <span className="text-[10px] font-bold text-slate-600 w-12 text-right">ZVTAB</span>
                <input type="file" accept=".xlsx, .xls" onChange={handleZvtabUpload} className="block w-full text-[10px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-[#064e3b] file:text-white hover:file:bg-[#065f46] transition-colors duration-200 ease-out cursor-pointer focus:outline-none" />
              </div>
              <div className="flex items-center justify-between sm:justify-start gap-2 bg-white p-2 rounded-xl border border-slate-200 flex-1">
                <span className="text-[10px] font-bold text-slate-600 w-12 text-right">046EXP</span>
                <input type="file" accept=".xlsx, .xls" onChange={handleExport046Upload} className="block w-full text-[10px] text-slate-500 file:mr-2 file:py-1 file:px-2 file:rounded-lg file:border-0 file:text-[10px] file:font-bold file:bg-[#064e3b] file:text-white hover:file:bg-[#065f46] transition-colors duration-200 ease-out cursor-pointer focus:outline-none" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Summary totals */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 print:hidden">
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-emerald-50 text-[#064e3b] rounded-2xl border border-emerald-100">
            <Layers size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Work Order</p>
            <h3 className="text-2xl font-black text-slate-800 mt-1">{totals.count} WO</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-slate-100 text-slate-700 rounded-2xl border border-slate-200">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Planned Cost (Budget)</p>
            <h3 className="text-2xl font-black text-slate-800 mt-1">{formatCurrency(totals.planned)}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3.5 bg-amber-50 text-amber-700 rounded-2xl border border-amber-100">
            <DollarSign size={24} />
          </div>
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Actual Cost (Realisasi)</p>
            <h3 className="text-2xl font-black text-[#064e3b] mt-1">{formatCurrency(totals.actual)}</h3>
          </div>
        </div>
      </div>

      {/* Table & Filters Card */}
      <div id="wo-print-area" className="bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col print:border-none print:shadow-none print:rounded-none print:overflow-visible">
        {/* Filters bar */}
        <div className="p-5 border-b border-slate-200 bg-slate-50/50 flex flex-wrap gap-4 items-center justify-between print:hidden">
          <div className="flex flex-wrap gap-3 items-center flex-1">
            <div className="relative flex-1 min-w-[200px] max-w-xs group">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#064e3b] transition-colors duration-200 ease-out" />
              <input
                type="text"
                placeholder="Cari Order, Equipment, Deskripsi..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-[#064e3b]/20 focus:border-[#064e3b] outline-none text-slate-700 font-medium transition-all duration-200"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Filter size={14} className="text-slate-500" />
              
              {/* Filter Plant */}
              <select
                value={selectedPlant}
                onChange={(e) => setSelectedPlant(e.target.value)}
                className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-700 font-semibold focus:ring-2 focus:ring-[#064e3b]/20 focus:border-[#064e3b] focus:outline-none hover:border-slate-300 transition-colors duration-200 ease-out cursor-pointer"
              >
                <option value="">Semua Unit (Plant)</option>
                {uniquePlants.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>

              {/* Filter Order Type */}
              <select
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-700 font-semibold focus:ring-2 focus:ring-[#064e3b]/20 focus:border-[#064e3b] focus:outline-none hover:border-slate-300 transition-colors duration-200 ease-out cursor-pointer"
              >
                <option value="">Semua Tipe WO</option>
                {uniqueTypes.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

              {/* Filter System Status */}
              <div className="relative" ref={statusDropdownRef}>
                <button 
                  onClick={() => setIsStatusDropdownOpen(!isStatusDropdownOpen)}
                  className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-700 font-semibold focus:ring-2 focus:ring-[#064e3b]/20 focus:border-[#064e3b] focus:outline-none hover:border-slate-300 transition-colors duration-200 ease-out flex items-center justify-between min-w-[170px]"
                >
                  <span className="truncate">
                    {selectedStatus.length === 0 
                      ? "Semua Status Sistem" 
                      : selectedStatus.length === 1 
                        ? selectedStatus[0] 
                        : `${selectedStatus.length} Status Terpilih`}
                  </span>
                  <ChevronDown size={14} className="ml-2 text-slate-400" />
                </button>

                {isStatusDropdownOpen && (
                  <div className="absolute z-50 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-lg py-2">
                    <div className="max-h-60 overflow-auto">
                      {uniqueStatuses.map(s => {
                        const isSelected = selectedStatus.includes(s);
                        return (
                          <label key={s} className="flex items-center px-4 py-2 hover:bg-slate-50 cursor-pointer text-xs transition-colors duration-200">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {
                                if (isSelected) {
                                  setSelectedStatus(prev => prev.filter(item => item !== s));
                                } else {
                                  setSelectedStatus(prev => [...prev, s]);
                                }
                              }}
                              className="mr-3 rounded border-slate-300 text-[#064e3b] focus:ring-[#064e3b] h-4 w-4 cursor-pointer"
                            />
                            <span className="text-slate-700 font-medium">{s}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Filter Month */}
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-white border border-slate-200 px-3 py-2 rounded-xl text-xs text-slate-700 font-semibold focus:ring-2 focus:ring-[#064e3b]/20 focus:border-[#064e3b] focus:outline-none hover:border-slate-300 transition-colors duration-200 ease-out cursor-pointer"
              >
                <option value="">Semua Bulan</option>
                {indonesianMonths.map(m => (
                  <option key={m.val} value={m.val}>{m.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="text-xs text-slate-500 font-semibold">
            Menampilkan {filteredData.length} baris data
          </div>
        </div>

        {/* Print Only Header */}
        <div className="hidden print:block print-header-box">
          <h2 className="text-base font-black uppercase tracking-widest text-black">
            MONITORING WORK ORDER
          </h2>
          {selectedPlant && (
            <p className="text-[10px] font-bold uppercase tracking-wider text-black mt-0.5">
              UNIT / PLANT: {selectedPlant}
            </p>
          )}
        </div>

        {/* Table Content */}
        <div className="print:overflow-visible print:max-h-none">
          <table className="w-full text-left text-xs text-slate-700 border-collapse print:text-black print:border-collapse print:w-full print:table-fixed">
            <colgroup className="hidden print:table-column-group">
              <col style={{ width: '6%' }} />
              <col style={{ width: '4%' }} />
              <col style={{ width: '6%' }} />
              <col style={{ width: '8%' }} />
              <col style={{ width: '6%' }} />
              <col style={{ width: '6%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '12%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '7%' }} />
              <col style={{ width: '7%' }} />
            </colgroup>
            <thead className="text-[10px] font-bold text-slate-500 uppercase tracking-wider font-mono print:static print:shadow-none">
              <tr>
                <th className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm px-3 py-3.5 print:static print:px-1 print:py-1.5">NO ORDER</th>
                <th className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm px-3 py-3.5 print:static print:px-1 print:py-1.5 print:text-center">TIPE</th>
                <th className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm px-3 py-3.5 print:static print:px-1 print:py-1.5">TANGGAL</th>
                <th className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm px-3 py-3.5 print:static print:px-1 print:py-1.5">STATUS</th>
                <th className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm px-3 py-3.5 print:static print:px-1 print:py-1.5">CC</th>
                <th className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm px-3 py-3.5 print:static print:px-1 print:py-1.5">EQUIP</th>
                <th className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm px-3 py-3.5 print:static print:px-1 print:py-1.5">DESC EQ</th>
                <th className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm px-3 py-3.5 print:static print:px-1 print:py-1.5">KET WO</th>
                <th className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm px-3 py-3.5 print:static print:px-1 print:py-1.5">PO</th>
                <th className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm px-3 py-3.5 print:static print:px-1 print:py-1.5">PR</th>
                <th className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm px-3 py-3.5 print:static print:px-1 print:py-1.5">SES</th>
                <th className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm px-3 py-3.5 print:static print:px-1 print:py-1.5">MIR7</th>
                <th className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm px-3 py-3.5 text-right print:static print:px-1 print:py-1.5">PLN COST</th>
                <th className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm px-3 py-3.5 text-right print:static print:px-1 print:py-1.5">ACT COST</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-[11px]">
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan="14" className="px-6 py-20 text-center bg-white/50">
                    <div className="flex flex-col items-center justify-center space-y-3">
                      <div className="p-4 bg-slate-100 rounded-full text-slate-400">
                        <Search size={32} />
                      </div>
                      <h4 className="text-sm font-bold text-slate-700">Tidak ada Work Order ditemukan</h4>
                      <p className="text-xs text-slate-500 max-w-sm">Data tidak tersedia untuk kriteria filter yang Anda pilih. Coba sesuaikan filter atau *upload* data terbaru.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredData.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors duration-200 ease-out">
                    <td className="px-3 py-2 print:px-1 print:py-1 text-slate-900 font-mono font-bold print:text-[7.5px] print:whitespace-nowrap print:overflow-hidden">
                      <button 
                        onClick={() => setSelectedWoDetail(item)}
                        className="text-[#064e3b] hover:text-[#065f46] hover:underline focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30 rounded px-1 -ml-1 transition-colors duration-200 ease-out font-mono font-bold text-left print:text-black print:p-0 print:m-0 print:no-underline print:text-[7.5px]"
                      >
                        {item['Order'] || '-'}
                      </button>
                    </td>
                    <td className="px-3 py-2 print:px-1 print:py-1 print:text-[7.5px] print:text-center print:whitespace-nowrap print:overflow-hidden">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold print:bg-transparent print:border-none print:text-black print:p-0 print:text-[7.5px] ${
                        item['Order Type'] === 'PM01' ? 'bg-red-50 text-red-700 border border-red-100' :
                        item['Order Type'] === 'PM02' ? 'bg-green-50 text-green-700 border border-green-100' :
                        'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {item['Order Type'] || '-'}
                      </span>
                    </td>
                    <td className="px-3 py-2 print:px-1 print:py-1 font-mono text-slate-500 print:text-black print:text-[7.5px] print:whitespace-nowrap print:overflow-hidden">{convertExcelDate(item['Reference Date'])}</td>
                    <td className="px-3 py-2 print:px-1 print:py-1 max-w-[120px] truncate print:max-w-none print:whitespace-normal print:break-words print:text-[7px] print:leading-tight" title={item['System status']}>{item['System status'] || '-'}</td>
                    <td className="px-3 py-2 print:px-1 print:py-1 font-mono text-slate-500 print:text-black print:text-[7.5px] print:whitespace-nowrap print:overflow-hidden">{item['Cost Center'] || '-'}</td>
                    <td className="px-3 py-2 print:px-1 print:py-1 font-mono print:text-black print:text-[7.5px] print:whitespace-nowrap print:overflow-hidden">{item['Equipment'] || '-'}</td>
                    <td className="px-3 py-2 print:px-1 print:py-1 text-slate-600 truncate max-w-[120px] print:max-w-none print:whitespace-normal print:break-words print:text-[7px] print:leading-tight print:text-black" title={item['Description']}>{item['Description'] || '-'}</td>
                    <td className="px-3 py-2 print:px-1 print:py-1 text-slate-600 truncate max-w-[120px] print:max-w-none print:whitespace-normal print:break-words print:text-[7px] print:leading-tight print:text-black" title={item['Description_2']}>{item['Description_2'] || '-'}</td>
                    <td className="px-3 py-2 print:px-1 print:py-1 font-mono text-[#064e3b] font-bold print:text-[7.5px] print:whitespace-nowrap print:overflow-hidden">{item.PO || '-'}</td>
                    <td className="px-3 py-2 print:px-1 print:py-1 font-mono text-blue-700 font-bold print:text-[7.5px] print:whitespace-nowrap print:overflow-hidden">{item.PR || '-'}</td>
                    <td className="px-3 py-2 print:px-1 print:py-1 font-mono text-amber-700 font-bold print:text-[7.5px] print:whitespace-nowrap print:overflow-hidden">{item.SES || '-'}</td>
                    <td className="px-3 py-2 print:px-1 print:py-1 font-mono text-rose-700 font-bold print:text-[7.5px] print:whitespace-nowrap print:overflow-hidden">{item.MIR7 || '-'}</td>
                    <td className="px-3 py-2 print:px-1 print:py-1 text-right font-mono text-slate-500 print:text-black print:text-[7.5px] print:whitespace-nowrap print:overflow-hidden">{formatCurrency(item['TotalPlnndCosts'])}</td>
                    <td className="px-3 py-2 print:px-1 print:py-1 text-right font-mono text-slate-900 font-bold print:text-black print:text-[7.5px] print:whitespace-nowrap print:overflow-hidden">{formatCurrency(item['Total act.costs'])}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Work Order Detail Modal */}
      {selectedWoDetail && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden flex flex-col animate-in scale-in duration-200">
            {/* Modal Header */}
            <div className="bg-[#064e3b] text-white px-6 py-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Info size={20} />
                <h3 className="font-bold text-base font-mono">Detail Work Order #{selectedWoDetail['Order']}</h3>
              </div>
              <button 
                onClick={() => setSelectedWoDetail(null)}
                className="text-white/80 hover:text-white hover:bg-white/10 focus:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/50 p-1.5 rounded-lg transition-colors duration-200 ease-out"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh]">
              {/* Prominent Keterangan WO */}
              <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-1">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Keterangan WO</p>
                <p className="text-sm font-bold text-slate-800 leading-relaxed">
                  {selectedWoDetail['Description_2'] || 'Tidak ada keterangan detail.'}
                </p>
              </div>

              {/* Data Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
                <div className="space-y-3">
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-semibold">Tipe Order</span>
                    <span className="font-bold text-slate-800">{selectedWoDetail['Order Type'] || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-semibold">Tanggal Referensi</span>
                    <span className="font-bold text-slate-800">{convertExcelDate(selectedWoDetail['Reference Date'])}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-semibold">Plant / Unit</span>
                    <span className="font-bold text-slate-800">{selectedWoDetail['Plant'] || selectedWoDetail['Planning Plant'] || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-semibold">CC</span>
                    <span className="font-mono font-bold text-slate-800">{selectedWoDetail['Cost Center'] || '-'}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-semibold">ID Equipment</span>
                    <span className="font-mono font-bold text-slate-800">{selectedWoDetail['Equipment'] || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-semibold">Deskripsi Equipment</span>
                    <span className="font-bold text-slate-800">{selectedWoDetail['Description'] || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-semibold">Nomor PO</span>
                    <span className="font-mono font-bold text-[#064e3b]">{selectedWoDetail.PO || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-semibold">Nomor PR</span>
                    <span className="font-mono font-bold text-blue-700">{selectedWoDetail.PR || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-semibold">SES</span>
                    <span className="font-mono font-bold text-amber-700">{selectedWoDetail.SES || '-'}</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-slate-100">
                    <span className="text-slate-500 font-semibold">MIR7 / Invoice</span>
                    <span className="font-mono font-bold text-rose-700">{selectedWoDetail.MIR7 || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Status Section */}
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Status Sistem SAP</span>
                <p className="bg-emerald-50 border border-emerald-100 text-[#064e3b] px-3.5 py-2.5 rounded-xl font-mono text-[11px] leading-relaxed font-bold">
                  {selectedWoDetail['System status'] || '-'}
                </p>
              </div>

              {/* Cost Section */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">Planned Cost (Budget)</span>
                  <p className="text-base font-black text-slate-900 mt-1">{formatCurrency(selectedWoDetail['TotalPlnndCosts'])}</p>
                </div>
                <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-100">
                  <span className="text-[10px] font-bold text-amber-700 uppercase tracking-wider">Actual Cost (Realisasi)</span>
                  <p className="text-base font-black text-[#064e3b] mt-1">{formatCurrency(selectedWoDetail['Total act.costs'])}</p>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button 
                onClick={() => setSelectedWoDetail(null)}
                className="bg-[#064e3b] hover:bg-[#065f46] focus:bg-[#065f46] text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-colors duration-200 ease-out focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#064e3b]"
              >
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}
