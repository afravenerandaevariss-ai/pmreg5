import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { format, differenceInCalendarDays, eachDayOfInterval, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { id } from 'date-fns/locale';
import {
  Upload, FileSpreadsheet, Download, RefreshCw, Trash2, Search,
  CheckCircle, AlertCircle, AlertTriangle, ChevronDown, ChevronUp,
  Filter, BarChart2, Layers, TrendingUp, Activity, Truck, Calendar,
  XCircle, Info, Eye, EyeOff, FileDown, Check, X, ArrowRight,
  Copy, Printer, Coins, ShieldAlert, Send
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { toPng } from 'html-to-image';
import { fetchVehicleMaster, fetchVehicleLogs, saveVehicleData, fetchMasterEquipment, fetchZCOData, saveZCOData, getSystemConfig } from '../lib/supabaseService';
import WhatsAppSenderModal from './WhatsAppSenderModal';

// ─── Plant Master Data ────────────────────────────────────────────────────────
const PLANT_INFO = {
  // Kal-Bar
  "5E01": { desc: "KEBUN GUNUNG MELIAU",    wilayah: "Kal-Bar" },
  "5E02": { desc: "KEBUN GUNUNG MAS",       wilayah: "Kal-Bar" },
  "5E03": { desc: "KEBUN SUNGAI DEKAN",     wilayah: "Kal-Bar" },
  "5E04": { desc: "KEBUN RIMBA BELIAN",     wilayah: "Kal-Bar" },
  "5E06": { desc: "KEBUN SINTANG",          wilayah: "Kal-Bar" },
  "5E07": { desc: "KEBUN NGABANG",          wilayah: "Kal-Bar" },
  "5E08": { desc: "KEBUN PARINDU",          wilayah: "Kal-Bar" },
  "5E09": { desc: "KEBUN KEMBAYAN",         wilayah: "Kal-Bar" },
  "5F01": { desc: "PABRIK GUNUNG MELIAU",   wilayah: "Kal-Bar" },
  "5F04": { desc: "PABRIK RIMBA BELIAN",    wilayah: "Kal-Bar" },
  "5F07": { desc: "PABRIK NGABANG",         wilayah: "Kal-Bar" },
  "5F08": { desc: "PABRIK PARINDU",         wilayah: "Kal-Bar" },
  "5F09": { desc: "PABRIK KEMBAYAN",        wilayah: "Kal-Bar" },
  "5D01": { desc: "DISTRIK KALBAR",         wilayah: "Kal-Bar" },
  // Kal-Sel-Teng
  "5E11": { desc: "KEBUN DANAU SALAK",      wilayah: "Kal-Sel-Teng" },
  "5E12": { desc: "KEBUN KUMAI KARET",      wilayah: "Kal-Sel-Teng" },
  "5E13": { desc: "KEBUN BATULICIN",        wilayah: "Kal-Sel-Teng" },
  "5E14": { desc: "KEBUN PAMUKAN",          wilayah: "Kal-Sel-Teng" },
  "5E15": { desc: "KEBUN PELAIHARI",        wilayah: "Kal-Sel-Teng" },
  "5F11": { desc: "UNIT PROYEK BATU BARA",  wilayah: "Kal-Sel-Teng" },
  "5F14": { desc: "PABRIK PAMUKAN",         wilayah: "Kal-Sel-Teng" },
  "5F15": { desc: "PABRIK PELAIHARI",       wilayah: "Kal-Sel-Teng" },
  "5F20": { desc: "PKR TAMBARANGAN",        wilayah: "Kal-Sel-Teng" },
  "5F21": { desc: "PABRIK SAMUNTAI",        wilayah: "Kal-Sel-Teng" },
  "5F22": { desc: "PABRIK LONG PINANG",     wilayah: "Kal-Sel-Teng" },
  "5D02": { desc: "DISTRIK KALTIM",         wilayah: "Kal-Sel-Teng" },
  "5D03": { desc: "DISTRIK KALSELTENG",     wilayah: "Kal-Sel-Teng" },
  // Kal-Tim
  "5E16": { desc: "KEBUN TABARA",           wilayah: "Kal-Tim" },
  "5E17": { desc: "KEBUN TAJATI",           wilayah: "Kal-Tim" },
  "5E18": { desc: "KEBUN PANDAWA",          wilayah: "Kal-Tim" },
  "5E19": { desc: "KEBUN LONGKALI",         wilayah: "Kal-Tim" },
};

// ─── Job Code Master ──────────────────────────────────────────────────────────
const JOB_CODE_DESC = {
  "11210": "Angkut Hasil Panen (Lain)",
  "11602": "Angkut Bahan (Kebun)",
  "11603": "Angkut Bahan Kimia",
  "11901": "Angkut Tankos",
  "12903": "Angkut Janjang/Deri",
  "13004": "Angkut Material",
  "13101": "Kontrol Afdeling (Mobil)",
  "13102": "Semprot/Garuk (Traktor)",
  "13104": "Kontrol TBM (Mobil)",
  "13108": "Kontrol TBM (Sepeda Motor)",
  "13206": "Angkut TBS Internal",
  "13207": "Angkut Tankos/Deri Internal",
  "14101": "Muat/Angkut Material Bangunan",
  "14102": "Angkut Batu/Pasir",
  "14104": "Muat Laterit (Excavator)",
  "14105": "Muat Batu (Excavator)",
  "14106": "Grading/Perbaikan Jalan",
  "14107": "Pekerjaan Alat Berat",
  "14307": "Semprot Kimia (Traktor)",
  "14505": "Angkut Pupuk",
  "14506": "Angkut Janjang Kosong",
  "14518": "Perawatan TBM",
  "14519": "Angkut Limbah",
  "14802": "Angkut TBS Ke Pabrik",
  "14803": "Quick (Angkut TBS Cepat)",
  "14808": "Pekerjaan Harian",
  "EQ002": "Equipment Maintenance",
};

// ─── UoM Labels ───────────────────────────────────────────────────────────────
const UOM_LABEL = { KG: "Kilogram", KM: "Kilometer", HM: "Jam Operasi", M: "Meter", HA: "Hektar", M3: "Meter Kubik", HK: "Hari Kerja" };

// ─── Helpers ──────────────────────────────────────────────────────────────────
function excelSerialToDate(serial) {
  const utcDays = Math.floor(serial - 25569);
  const dateInfo = new Date(utcDays * 86400 * 1000);
  return new Date(dateInfo.getUTCFullYear(), dateInfo.getUTCMonth(), dateInfo.getUTCDate());
}

function formatDateStr(rawDate) {
  if (!rawDate) return null;
  if (typeof rawDate === 'number') {
    const d = excelSerialToDate(rawDate);
    return format(d, 'yyyy-MM-dd');
  }
  let s = String(rawDate).trim();
  s = s.split(' ')[0]; // handle appended time
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  
  const sep = s.includes('/') ? '/' : s.includes('.') ? '.' : (s.includes('-') ? '-' : null);
  if (sep) {
    const parts = s.split(sep);
    if (parts.length === 3) {
      // Avoid swapping if it's already yyyy-mm-dd
      if (parts[0].length === 4) {
        return `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      }
      const day   = parts[0].padStart(2, '0');
      const month = parts[1].padStart(2, '0');
      const year  = parts[2].length === 2 ? `20${parts[2]}` : parts[2];
      return `${year}-${month}-${day}`;
    }
  }
  return null;
}

function formatTimeStr(rawTime) {
  if (!rawTime) return '-';
  if (typeof rawTime === 'number') {
    const totalSec = Math.round(rawTime * 86400);
    const h = Math.floor(totalSec / 3600).toString().padStart(2, '0');
    const m = Math.floor((totalSec % 3600) / 60).toString().padStart(2, '0');
    return `${h}:${m}`;
  }
  return String(rawTime).trim();
}

const StatusBadge = ({ status, text }) => {
  const map = {
    green:  'bg-emerald-50 text-emerald-700 border-emerald-200',
    yellow: 'bg-amber-50 text-amber-700 border-amber-200',
    red:    'bg-red-50 text-red-600 border-red-200',
    grey:   'bg-slate-100 text-slate-500 border-slate-200',
    blue:   'bg-emerald-50 text-emerald-700 border-emerald-200',
  };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${map[status] || map.grey}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-current" />
      {text}
    </span>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function VehicleMonitoringView({ currentUser, screenshotMode }) {
  const isAdmin = currentUser && (
    currentUser.role === 'Admin' || 
    currentUser.role?.toUpperCase() === 'ADMIN' || 
    currentUser.role?.toUpperCase() === 'REGIONAL'
  );

  const today = new Date();
  const [targetMonth, setTargetMonth]           = useState(format(today, 'yyyy-MM'));
  const [targetInputDate, setTargetInputDate]   = useState(format(today, 'yyyy-MM-dd'));
  const [targetWorkingDays, setTargetWorkingDays] = useState(20);

  const [vehicles, setVehicles] = useState([]);
  const [logs, setLogs]         = useState([]);
  const [masterEquipments, setMasterEquipments] = useState([]);
  const [zcoData, setZcoData]                   = useState([]);
  const [zcoUploadInfo, setZcoUploadInfo]       = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [uploadInfo, setUploadInfo] = useState(null);
  const [isSavingImage, setIsSavingImage] = useState(false);

  // View control
  const [activeTab, setActiveTab]           = useState('summary-regional');  // unit-checklist | summary-regional | detail-veh | log-raw
  const [selectedWilayah, setSelectedWilayah] = useState('ALL');
  const [searchPlant, setSearchPlant]       = useState('');
  const [searchVehicle, setSearchVehicle]   = useState('');
  
  // Plant selected for Unit Checklist tab
  const [selectedPlant, setSelectedPlant]   = useState(() => {
    return currentUser?.role === 'Unit' ? currentUser.plant : '5E08'; // Default Parindu for Regional
  });

  const [filterStatus, setFilterStatus]     = useState('ALL');
  const [filterUoM, setFilterUoM]           = useState('ALL');
  const [filterJobCode, setFilterJobCode]   = useState('ALL');
  const [showCancelled, setShowCancelled]   = useState(false);
  const [zcoWilayah, setZcoWilayah]         = useState('ALL');
  const [zcoFilterStatus, setZcoFilterStatus] = useState('ALL');
  const [expandedPlant, setExpandedPlant]   = useState(null);
  const [expandedVehicleId, setExpandedVehicleId] = useState(null);
  const [showDangerZone, setShowDangerZone] = useState(false);
  const [zestConfirmInput, setZestConfirmInput] = useState('');
  const [zcoConfirmInput, setZcoConfirmInput] = useState('');
  const [drawerItem, setDrawerItem] = useState(null); // slide-out drawer
  const [sortBy, setSortBy]                 = useState('plant');
  const [sortAsc, setSortAsc]               = useState(true);
  const [logPage, setLogPage]               = useState(1);
  const [showWAModal, setShowWAModal]       = useState(false);
  const LOG_PAGE_SIZE = 50;

  // ── Load Data ────────────────────────────────────────────────────────────────
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [vRes, lRes, eqRes, zRes, mapRes] = await Promise.all([
        fetchVehicleMaster(),
        fetchVehicleLogs(),
        fetchMasterEquipment(),
        fetchZCOData(),
        getSystemConfig('master_map')
      ]);
      setVehicles(vRes.data || []);
      setLogs(lRes.data || []);
      setMasterEquipments(eqRes.data || []);
      setZcoData(zRes.data || []);
      if (mapRes && mapRes.data) {
        setMasterMap(new Map(mapRes.data));
      } else {
        setMasterMap(new Map());
      }
    } catch (e) {
      setError('Gagal memuat data: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // If role is Unit, force selectedPlant to user's plant
  useEffect(() => {
    if (currentUser?.role === 'Unit' && currentUser.plant) {
      setSelectedPlant(currentUser.plant);
    }
  }, [currentUser]);

  // ── Excel Upload ─────────────────────────────────────────────────────────────
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    setUploadInfo(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        let sheetData = null;
        for (const sheetName of workbook.SheetNames) {
          const ws = workbook.Sheets[sheetName];
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
          if (!rows.length) continue;
          for (let i = 0; i < Math.min(rows.length, 10); i++) {
            const row = rows[i] || [];
            const clean = row.map(c => String(c || '').trim().toLowerCase());
            const hasVeh  = clean.some(c => c.includes('vehicle code') || c.includes('vehicle actvity'));
            const hasDate = clean.some(c => c.includes('vehicle date') || c === 'date');
            const hasPlant = clean.some(c => c === 'plant' || c.includes('plant'));
            if (hasVeh || (hasDate && hasPlant)) {
              sheetData = { ws, rows, headerIdx: i, headers: row.map(c => String(c || '').trim()) };
              break;
            }
          }
          if (sheetData) break;
        }

        if (!sheetData) {
          const ws = workbook.Sheets[workbook.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
          sheetData = { ws, rows, headerIdx: 0, headers: (rows[0] || []).map(c => String(c || '').trim()) };
        }

        const { rows, headerIdx, headers } = sheetData;
        const col = (patterns) => headers.find(h => patterns.some(p => h.toLowerCase().includes(p.toLowerCase())));
        
        const ACT_NUM   = col(['Actvity Number', 'Activity Number', 'Vehicle Actvity']);
        const VEH_CODE  = col(['Vehicle Code', 'Vehicle code']);
        const VEH_DATE  = col(['Vehicle Date', 'Vehicle date']);
        const VEH_TIME  = col(['Vehicle Time', 'Vehicle time']);
        const PLANT_COL = col(['Plant']);
        const JOB_CODE  = col(['Job Code', 'Job code']);
        const HM_KM     = col(['HM/KM', 'HM_KM', 'HM', 'KM']);
        const UNIT_VAL  = col(['Unit']);
        const UOM       = col(['UoM', 'UOM', 'Satuan']);
        const OPERATOR  = col(['Operator']);
        const HELPER1   = col(['Helper 1', 'Helper1']);
        const HELPER2   = col(['Helper 2', 'Helper2']);
        const REFERENCE = col(['Reference', 'Referensi']);
        const REMARKS   = col(['Remarks', 'Keterangan', 'Catatan']);
        const CANCELLED = col(['Cancelled', 'Reversed', 'Cancel']);
        const LOC_CODE  = col(['Location Code', 'Location code', 'Lokasi']);
        const MEAS_DOC  = col(['Measurement document', 'Measurement Document', 'Meas']);
        const DOC_NUM   = col(['Document Number', 'Doc Number', 'Nomor Dokumen']);
        const SPBS_NUM  = col(['Nomor SPBS', 'SPBS']);
        const TGL_ANGKUT = col(['Tgl Angkut', 'Tgl. Angkut', 'Tanggal Angkut']);
        const ANTAR_KEBUN = col(['Antar Kebun']);
        const DEST_PLANT = col(['Destination Plant', 'Dest Plant']);
        const ALOKASI    = col(['Target Alokasi', 'Alokasi Biaya', 'Alokasi']);
        const COMPANY    = col(['Company Code', 'Company code']);
        const FISCAL_YEAR = col(['Fiscal Year', 'Fiscal year']);
        const CREATED_BY  = col(['Created by']);
        const CREATED_ON  = col(['Created on']);
        const CHANGED_BY  = col(['Changed by']);
        const CHANGED_ON  = col(['Changed on']);
        const COST_CENTER = col(['Cost Center', 'Cost center', 'Cctr', 'Cost Ctr']);

        if (!VEH_CODE || !PLANT_COL) {
          throw new Error('Kolom "Vehicle Code" atau "Plant" tidak ditemukan. Pastikan file dari ZESTHLP16PA SAP.');
        }

        const newLogsMap  = new Map();
        const newVehMap   = new Map();

        let processed = 0, skipped = 0, cancelled = 0;
        const uniqueJobCodes = new Set();
        const uniquePlants   = new Set();

        for (let i = headerIdx + 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          const get = (colName) => {
            const idx = headers.indexOf(colName);
            return idx >= 0 ? row[idx] : undefined;
          };

          const vehCode  = String(get(VEH_CODE) || '').trim();
          const plant    = String(get(PLANT_COL) || '').trim().toUpperCase();
          const rawDate  = get(VEH_DATE);
          const dateStr  = formatDateStr(rawDate);

          if (!vehCode || !plant || !dateStr) { skipped++; continue; }

          const isCancelled   = String(get(CANCELLED) || '').trim().toUpperCase() === 'X';
          const jobCode       = String(get(JOB_CODE)   || '').trim();
          const hmKm          = parseFloat(String(get(HM_KM) || '0').replace(',', '.')) || 0;
          const unitVal       = parseFloat(String(get(UNIT_VAL) || '0').replace(',', '.')) || 0;
          const uom           = String(get(UOM)       || '').trim();
          const operator      = String(get(OPERATOR)  || '').trim();
          const helper1       = String(get(HELPER1)   || '').trim();
          const helper2       = String(get(HELPER2)   || '').trim();
          const reference     = String(get(REFERENCE) || '').trim();
          const remarks       = String(get(REMARKS)   || '').trim();
          const locCode       = String(get(LOC_CODE)  || '').trim();
          const measDoc       = String(get(MEAS_DOC)  || '').trim();
          const docNum        = String(get(DOC_NUM)   || '').trim();
          const spbsNum       = String(get(SPBS_NUM)  || '').trim();
          const tglAngkut     = formatDateStr(get(TGL_ANGKUT));
          const antarKebun    = String(get(ANTAR_KEBUN) || '').trim();
          const destPlant     = String(get(DEST_PLANT) || '').trim();
          const alokasi       = String(get(ALOKASI)   || '').trim();
          const company       = String(get(COMPANY)   || '').trim();
          const fiscalYear    = String(get(FISCAL_YEAR) || '').trim();
          const vehTime       = formatTimeStr(get(VEH_TIME));
          const rawActNum     = String(get(ACT_NUM) || '').trim();
          const actNum        = rawActNum ? `${rawActNum}-${i}` : `VEH-${plant}-${i}-${dateStr}`;
          const createdBy     = String(get(CREATED_BY) || '').trim();
          const createdOn     = formatDateStr(get(CREATED_ON)) || '';
          const changedBy     = String(get(CHANGED_BY) || '').trim();
          const changedOn     = formatDateStr(get(CHANGED_ON)) || '';
          const costCenterStr = String(get(COST_CENTER) || '').trim();

          if (isCancelled) cancelled++;
          uniqueJobCodes.add(jobCode);
          uniquePlants.add(plant);

          newLogsMap.set(actNum, {
            activity_number: actNum,
            vehicle_code:    vehCode,
            plant,
            date:            dateStr,
            vehicle_time:    vehTime,
            job_code:        jobCode,
            hm_km:           hmKm,
            unit_value:      unitVal,
            uom,
            location_code:   locCode,
            operator,
            helper_1:        helper1,
            helper_2:        helper2,
            reference,
            remarks,
            measurement_doc: measDoc,
            document_number: docNum,
            spbs_number:     spbsNum,
            tgl_angkut:      tglAngkut,
            antar_kebun:     antarKebun,
            destination_plant: destPlant,
            target_alokasi:  alokasi,
            company_code:    company,
            fiscal_year:     fiscalYear,
            cancelled:       isCancelled,
            created_by:      createdBy,
            created_on:      createdOn,
            changed_by:      changedBy,
            changed_on:      changedOn,
          });

          // Auto-register vehicle master
          if (!newVehMap.has(vehCode)) {
            const pInfo = PLANT_INFO[plant] || { desc: `Plant ${plant}`, wilayah: 'Lainnya' };
            newVehMap.set(vehCode, {
              vehicle_code: vehCode,
              description:  reference || remarks || `Kendaraan ${vehCode}`,
              plant,
              cost_center:  costCenterStr,
              wilayah:      pInfo.wilayah,
              created_at:   new Date().toISOString(),
              updated_at:   new Date().toISOString(),
            });
          }
          processed++;
        }

        if (processed === 0) throw new Error('Tidak ada baris data valid yang ditemukan.');

        const finalVehicles = Array.from(newVehMap.values());
        const finalLogs     = Array.from(newLogsMap.values());

        const { error: saveErr } = await saveVehicleData(finalVehicles, finalLogs);
        if (saveErr) throw new Error(saveErr);

        setVehicles(finalVehicles);
        setLogs(finalLogs);
        setUploadInfo({
          processed,
          skipped,
          cancelled,
          plants: uniquePlants.size,
          jobCodes: uniqueJobCodes.size,
          file: file.name,
        });

      } catch (err) {
        console.error(err);
        setError('Error memproses file: ' + err.message);
      } finally {
        setLoading(false);
        e.target.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // ── Clear Data ───────────────────────────────────────────────────────────────
  const handleClearData = async () => {
    setLoading(true);
    try {
      await saveVehicleData([], []);
      setVehicles([]); setLogs([]); setUploadInfo(null);
    } catch (e) { alert('Gagal: ' + e.message); }
    finally { setLoading(false); }
  };

  // ── ZCO Upload & Clear ───────────────────────────────────────────────────────
  const handleZCOFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    setZcoUploadInfo(null);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const ws = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { header: 1 });
        if (!rows.length) throw new Error('File Excel kosong.');

        let headerIdx = -1;
        for (let i = 0; i < Math.min(rows.length, 10); i++) {
          const row = rows[i] || [];
          if (row.some(c => String(c).trim().toLowerCase() === 'cost center')) {
            headerIdx = i;
            break;
          }
        }
        if (headerIdx === -1) headerIdx = 0;

        const headers = (rows[headerIdx] || []).map(c => String(c || '').trim());
        const col = (patterns) => headers.find(h => patterns.some(p => h.toLowerCase() === p.toLowerCase()));
        
        const CC_COL   = col(['Cost Center', 'Costcenter', 'Pusat Biaya']);
        const COST_COL = col(['Total Cost', 'Cost', 'Biaya', 'Total']);
        const ACT_COL  = col(['Activity Qty', 'Activity', 'Qty', 'Aktivitas']);
        const RATE_COL = col(['Act. Rate Est.', 'Rate', 'Tarif']);

        if (!CC_COL) {
          throw new Error('Kolom "Cost Center" tidak ditemukan. Pastikan file dari SAP ZCO_CCTR_01.');
        }

        const zcoList = [];
        for (let i = headerIdx + 1; i < rows.length; i++) {
          const row = rows[i];
          if (!row || row.length === 0) continue;

          const getVal = (colName) => {
            const idx = headers.indexOf(colName);
            return idx >= 0 ? row[idx] : undefined;
          };

          const rawCC = String(getVal(CC_COL) || '').trim();
          if (!rawCC || rawCC.toLowerCase().startsWith('total') || rawCC.toLowerCase().startsWith('logbook distrik') || rawCC.toLowerCase().startsWith('grand total')) continue;

          const ccCode = rawCC.split(/\s+/)[0];
          if (!ccCode) continue;

          const totalCost   = parseFloat(getVal(COST_COL)) || 0;
          const activityQty = parseFloat(getVal(ACT_COL)) || 0;
          const actRateEst  = parseFloat(getVal(RATE_COL)) || 0;

          zcoList.push({
            rawCostCenter: rawCC,
            costCenterCode: ccCode,
            totalCost,
            activityQty,
            actRateEst,
          });
        }

        if (zcoList.length === 0) throw new Error('Tidak ada baris data valid yang ditemukan.');

        const { error: saveErr } = await saveZCOData(zcoList);
        if (saveErr) throw new Error(saveErr);

        setZcoData(zcoList);
        setZcoUploadInfo({
          processed: zcoList.length,
          file: file.name,
        });
      } catch (err) {
        console.error(err);
        setError('Error memproses file ZCO: ' + err.message);
      } finally {
        setLoading(false);
        e.target.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleClearZCOData = async () => {
    setLoading(true);
    try {
      await saveZCOData([]);
      setZcoData([]);
      setZcoUploadInfo(null);
    } catch (e) { alert('Gagal: ' + e.message); }
    finally { setLoading(false); }
  };

  // ── Filter month logs ────────────────────────────────────────────────────────
  const monthLogs = useMemo(() => {
    const start = `${targetMonth}-01`;
    const end   = `${targetMonth}-31`;
    return logs.filter(l => l.date >= start && l.date <= end);
  }, [logs, targetMonth]);

  const activeMonthLogs     = useMemo(() => monthLogs.filter(l => !l.cancelled), [monthLogs]);
  const cancelledMonthLogs  = useMemo(() => monthLogs.filter(l => l.cancelled),  [monthLogs]);

  // Generate calendar days for visual representation
  const calendarDays = useMemo(() => {
    try {
      const start = startOfMonth(new Date(targetMonth + '-01T00:00:00'));
      const end   = endOfMonth(new Date(targetMonth + '-01T00:00:00'));
      return eachDayOfInterval({ start, end });
    } catch (e) {
      return [];
    }
  }, [targetMonth]);

  // Automatically calculate working days (excluding Saturday and Sunday)
  const autoWorkingDays = useMemo(() => {
    try {
      const start = startOfMonth(new Date(targetMonth + '-01T00:00:00'));
      const end = subDays(new Date(targetInputDate + 'T00:00:00'), 1); // H-1 for target input
      if (end < start) return 0;
      
      let count = 0;
      const days = eachDayOfInterval({ start, end });
      days.forEach(day => {
        const dayOfWeek = day.getDay(); // 0 = Sunday, 6 = Saturday
        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
          count++;
        }
      });
      return count;
    } catch (e) {
      return 0;
    }
  }, [targetMonth, targetInputDate]);

  // ── Summary per Plant ────────────────────────────────────────────────────────
  const summaryData = useMemo(() => {
    const targetDate = new Date(targetInputDate);
    const list = [];

    Object.entries(PLANT_INFO).forEach(([plantCode, info]) => {
      // 1. Jumlah Veh. Code: Prioritize hardcoded KPI targets (which exclude broken vehicles), fallback to DB
      const plantVehicles = masterEquipments.filter(e => e.plant === plantCode && String(e.eqNum || '').startsWith('20000'));
      // Calculate vehicleCount from masterMap as single source of truth
      let vehicleCount = 0;
      if (masterMap && masterMap.size > 0) {
        masterMap.forEach((info, eqNum) => {
          const p = typeof info === 'string' ? info : info.plant;
          if (p === plantCode && String(eqNum).startsWith('20000')) {
            vehicleCount++;
          }
        });
      } else {
        vehicleCount = plantVehicles.length;
      }

      // Include cancelled logs in the main calculation since they still count as input activity KPI
      const plantLogs     = monthLogs.filter(l => l.plant === plantCode);
      const totalTx       = plantLogs.length;
      const totalCancelled = plantLogs.filter(l => l.cancelled).length;
      const totalTxAll    = totalTx; // Now totalTx includes all, so totalTxAll is the same

      // 2. Rencana Transaksi is set equal to Total Transaksi (as in Excel screenshot)
      const rencana = totalTx;

      // 3. Jumlah Hari Kerja: semua unit tetap diisi walaupun tidak beroperasi (sesuai request)
      const hariKerja = autoWorkingDays;

      // 4. Status Up To Date / Tidak Up To Date count per transaction
      let utdCount = 0;
      let tutdCount = 0;

      plantLogs.forEach(l => {
        if (!l.created_on) {
          tutdCount++;
        } else {
          try {
            const vDate = new Date(l.date + 'T00:00:00');
            const cDate = new Date(l.created_on + 'T00:00:00');
            const diff = differenceInCalendarDays(cDate, vDate);
            if (diff <= 1) {
              utdCount++;
            } else {
              tutdCount++;
            }
          } catch (e) {
            tutdCount++;
          }
        }
      });

      const pctUtd = totalTx > 0 ? (utdCount / totalTx) * 100 : 0;
      const pctTutd = totalTx > 0 ? (tutdCount / totalTx) * 100 : 0;

      const activeVehicles = new Set(plantLogs.map(l => l.vehicle_code));
      const totalUnit     = plantLogs.reduce((s, l) => s + (parseFloat(l.unit_value) || 0), 0);
      const totalHmKm     = plantLogs.reduce((s, l) => s + (parseFloat(l.hm_km) || 0), 0);

      // Last input date and indicator status
      let lastLogDate = null, statusColor = 'grey', statusText = 'Belum Ada Data';
      if (plantLogs.length > 0) {
        const dates = plantLogs.map(l => l.date).sort();
        const maxDate = dates[dates.length - 1];
        lastLogDate = maxDate;
        const diff = differenceInCalendarDays(targetDate, new Date(maxDate + 'T00:00:00'));
        if (diff <= 1)      { statusColor = 'green';  statusText = 'Up To Date'; }
        else if (diff <= 3) { statusColor = 'yellow'; statusText = 'Terlambat'; }
        else                { statusColor = 'red';    statusText = 'Tidak Up To Date'; }
      }

      const operators = [...new Set(plantLogs.map(l => l.operator).filter(Boolean))];

      list.push({
        wilayah: info.wilayah,
        plant: plantCode,
        desc: info.desc,
        vehicleCount,
        activeVehicleCount: activeVehicles.size,
        hariKerja,
        rencana,
        utdCount,
        tutdCount,
        totalTx,
        totalCancelled,
        totalTxAll,
        pctUtd,
        pctTutd,
        pct: pctUtd, // Fallback pct
        totalUnit,
        totalHmKm,
        lastLogDate,
        statusColor,
        statusText,
        operators,
        plantLogs,
      });
    });

    // 5. Rank calculation: sort by utdCount desc, then totalTx desc, then plantCode asc
    const rankableList = list
      .filter(item => item.totalTx > 0 && item.utdCount > 0)
      .map(item => ({ plant: item.plant, utdCount: item.utdCount, totalTx: item.totalTx }))
      .sort((a, b) => {
        if (b.utdCount !== a.utdCount) return b.utdCount - a.utdCount;
        if (b.totalTx !== a.totalTx) return b.totalTx - a.totalTx;
        return a.plant.localeCompare(b.plant);
      });

    const rankMap = {};
    rankableList.forEach((item, idx) => {
      rankMap[item.plant] = idx + 1;
    });

    list.forEach(item => {
      if (item.totalTx === 0 || item.utdCount === 0) {
        item.rank = 28;
      } else {
        item.rank = rankMap[item.plant] || 28;
      }
    });

    let result = list;
    if (selectedWilayah !== 'ALL') result = result.filter(r => r.wilayah === selectedWilayah);
    if (searchPlant.trim()) {
      const q = searchPlant.toLowerCase();
      result = result.filter(r => r.plant.toLowerCase().includes(q) || r.desc.toLowerCase().includes(q));
    }
    if (filterStatus !== 'ALL') result = result.filter(r => r.statusColor === filterStatus);

    result = [...result].sort((a, b) => {
      let va = a[sortBy], vb = b[sortBy];
      if (typeof va === 'string') va = va.toLowerCase();
      if (typeof vb === 'string') vb = vb.toLowerCase();
      return sortAsc ? (va < vb ? -1 : 1) : (va > vb ? -1 : 1);
    });

    return result;
  }, [vehicles, activeMonthLogs, cancelledMonthLogs, targetMonth, targetInputDate, autoWorkingDays, selectedWilayah, searchPlant, filterStatus, sortBy, sortAsc, masterEquipments, masterMap]);

  // ── Unit Focused Mode calculations ──────────────────────────────────────────
  const unitFocusedData = useMemo(() => {
    if (!selectedPlant) return { vehiclesList: [], kpis: { total: 0, active: 0, avgDays: 0, lastUpdate: '-', statusColor: 'grey', statusText: 'Belum Ada Data' } };

    const plantVehicles = vehicles.filter(v => v.plant === selectedPlant);
    const plantLogs     = activeMonthLogs.filter(l => l.plant === selectedPlant);
    const targetDate    = new Date(targetInputDate);

    let totalVeh = plantVehicles.length;
    let activeVehCount = 0;
    let totalDaysFilledSum = 0;

    const vehiclesList = plantVehicles.map(v => {
      const vLogs = plantLogs.filter(l => l.vehicle_code === v.vehicle_code);
      const uniqueDays = new Set(vLogs.map(l => l.date));
      const daysFilled = uniqueDays.size;

      if (daysFilled > 0) activeVehCount++;
      totalDaysFilledSum += daysFilled;

      // Check status today (targetInputDate)
      const logsToday = vLogs.filter(l => l.date === targetInputDate);
      const isInputtedToday = logsToday.length > 0;
      const totalUnitsToday = logsToday.reduce((s, l) => s + (parseFloat(l.unit_value) || 0), 0);
      const totalHmKmToday  = logsToday.reduce((s, l) => s + (parseFloat(l.hm_km) || 0), 0);
      const todayUoM        = logsToday[0]?.uom || '';
      
      const operatorsToday = [...new Set(logsToday.map(l => l.operator).filter(Boolean))].join(', ');

      // Find last transaction
      const sortedLogs = [...vLogs].sort((a, b) => b.date.localeCompare(a.date));
      const lastTx = sortedLogs[0] || null;

      // Attendance history map
      const attendance = {};
      uniqueDays.forEach(d => {
        const dayLogs = vLogs.filter(l => l.date === d);
        const hmKmVal = dayLogs.reduce((s, l) => s + (parseFloat(l.hm_km) || 0), 0);
        const unitVal = dayLogs.reduce((s, l) => s + (parseFloat(l.unit_value) || 0), 0);
        const uomVal  = dayLogs[0]?.uom || '';
        attendance[d] = {
          filled: true,
          count: dayLogs.length,
          desc: hmKmVal > 0 ? `${hmKmVal} ${uomVal === 'HM' || uomVal === 'KM' ? uomVal : 'HM/KM'}` : `${unitVal} ${uomVal || 'Unit'}`
        };
      });
      // Find matching equipment from masterEquipments
      const normalizeEq = (code) => String(code || '').replace(/^0+/, '').trim();
      const eq = masterEquipments.find(e => normalizeEq(e.eqNum) === normalizeEq(v.vehicle_code));

      return {
        ...v,
        eqDesc: (eq && eq.description) ? eq.description : (v.description || '-'),
        costCenter: (eq && eq.costCenter) ? eq.costCenter : (v.cost_center || '-'),
        daysFilled,
        isInputtedToday,
        todayDetails: isInputtedToday ? {
          txCount: logsToday.length,
          units: totalUnitsToday,
          hmKm: totalHmKmToday,
          uom: todayUoM,
          operator: operatorsToday || '-'
        } : null,
        lastTx: lastTx ? {
          date: lastTx.date,
          operator: lastTx.operator || '-',
          jobCode: lastTx.job_code,
          val: lastTx.hm_km > 0 ? `${lastTx.hm_km} ${lastTx.uom}` : `${lastTx.unit_value} ${lastTx.uom}`,
          ref: lastTx.reference || lastTx.remarks || '-'
        } : null,
        attendance,
        allLogs: vLogs
      };
    });

    // KPI status for this plant
    const avgDays = totalVeh > 0 ? Math.round((totalDaysFilledSum / totalVeh) * 10) / 10 : 0;
    
    let lastUpdate = '-';
    let statusColor = 'grey';
    let statusText = 'Belum Ada Data';
    
    if (plantLogs.length > 0) {
      const dates = plantLogs.map(l => l.date).sort();
      const maxDate = dates[dates.length - 1];
      lastUpdate = maxDate;
      const diff = differenceInCalendarDays(targetDate, new Date(maxDate + 'T00:00:00'));
      if (diff <= 1)      { statusColor = 'green';  statusText = 'Up To Date (Lengkap)'; }
      else if (diff <= 3) { statusColor = 'yellow'; statusText = 'Terlambat Input'; }
      else                { statusColor = 'red';    statusText = 'Tidak Up To Date'; }
    }

    const todayFilledCount = vehiclesList.filter(v => v.isInputtedToday).length;

    return {
      vehiclesList,
      kpis: {
        total: totalVeh,
        active: activeVehCount,
        todayFilled: todayFilledCount,
        todayPending: totalVeh - todayFilledCount,
        avgDays,
        lastUpdate,
        statusColor,
        statusText
      }
    };
  }, [vehicles, activeMonthLogs, selectedPlant, targetMonth, targetInputDate, masterEquipments]);

  // ── Per-Vehicle Detail (all plants, original tab) ───────────────────────────
  const vehicleDetailData = useMemo(() => {
    const tDate = new Date(targetInputDate);
    
    let result = vehicles.map(v => {
      const vLogs    = activeMonthLogs.filter(l => l.vehicle_code === v.vehicle_code);
      const vCancel  = cancelledMonthLogs.filter(l => l.vehicle_code === v.vehicle_code);
      const totalTx  = vLogs.length;
      const totalUnit = vLogs.reduce((s, l) => s + (parseFloat(l.unit_value) || 0), 0);
      const totalHmKm = vLogs.reduce((s, l) => s + (parseFloat(l.hm_km) || 0), 0);
      const jobCodes = [...new Set(vLogs.map(l => l.job_code).filter(Boolean))];
      const operators = [...new Set(vLogs.map(l => l.operator).filter(Boolean))];
      const dates    = vLogs.map(l => l.date).sort();
      const lastDate = dates.length ? dates[dates.length - 1] : null;
      let statusColor = 'grey', statusText = 'Belum Ada Data';
      if (lastDate) {
        const diff = differenceInCalendarDays(tDate, new Date(lastDate + 'T00:00:00'));
        if (diff <= 1)      { statusColor = 'green';  statusText = 'Up To Date'; }
        else if (diff <= 3) { statusColor = 'yellow'; statusText = 'Terlambat'; }
        else                { statusColor = 'red';    statusText = 'Tidak Up To Date'; }
      }
      const pInfo = PLANT_INFO[v.plant] || { desc: v.plant, wilayah: '-' };
      return {
        ...v,
        wilayah: pInfo.wilayah,
        plantDesc: pInfo.desc,
        totalTx,
        totalCancelled: vCancel.length,
        totalUnit,
        totalHmKm,
        jobCodes,
        operators,
        lastDate,
        statusColor,
        statusText,
        logs: vLogs,
      };
    });

    if (selectedWilayah !== 'ALL') result = result.filter(r => r.wilayah === selectedWilayah);
    if (searchVehicle.trim()) {
      const q = searchVehicle.toLowerCase();
      result = result.filter(r =>
        r.vehicle_code.toLowerCase().includes(q) ||
        r.plant.toLowerCase().includes(q) ||
        r.plantDesc.toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q)
      );
    }
    if (filterStatus !== 'ALL') result = result.filter(r => r.statusColor === filterStatus);

    return result;
  }, [vehicles, activeMonthLogs, cancelledMonthLogs, targetInputDate, selectedWilayah, searchVehicle, filterStatus]);

  // ── Filtered Log Records (Original Logs tab) ─────────────────────────────────
  const filteredLogs = useMemo(() => {
    let result = showCancelled ? monthLogs : activeMonthLogs;
    if (selectedWilayah !== 'ALL') {
      const plantsInWilayah = Object.entries(PLANT_INFO)
        .filter(([, v]) => v.wilayah === selectedWilayah)
        .map(([k]) => k);
      result = result.filter(l => plantsInWilayah.includes(l.plant));
    }
    if (searchVehicle.trim()) {
      const q = searchVehicle.toLowerCase();
      result = result.filter(l =>
        (l.vehicle_code || '').toLowerCase().includes(q) ||
        (l.plant || '').toLowerCase().includes(q) ||
        (l.operator || '').toLowerCase().includes(q) ||
        (l.reference || '').toLowerCase().includes(q) ||
        (l.activity_number || '').toLowerCase().includes(q)
      );
    }
    if (filterUoM !== 'ALL') result = result.filter(l => l.uom === filterUoM);
    if (filterJobCode !== 'ALL') result = result.filter(l => l.job_code === filterJobCode);
    return result;
  }, [monthLogs, activeMonthLogs, showCancelled, selectedWilayah, searchVehicle, filterUoM, filterJobCode]);

  // ── Aggregate Stats ───────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const active = summaryData.filter(r => r.totalTx > 0).length;
    const totalTx = monthLogs.length;
    const totalCancelled = cancelledMonthLogs.length;
    const totalVeh = vehicles.length;
    const upToDate = summaryData.filter(r => r.statusColor === 'green').length;
    const late     = summaryData.filter(r => r.statusColor === 'yellow').length;
    const notUpToDate = summaryData.filter(r => r.statusColor === 'red').length;
    const avgPct   = summaryData.filter(r => r.vehicleCount > 0).reduce((s, r) => s + r.pct, 0) / Math.max(1, summaryData.filter(r => r.vehicleCount > 0).length);
    return { active, totalTx, totalCancelled, totalVeh, upToDate, late, notUpToDate, avgPct };
  }, [summaryData, monthLogs, cancelledMonthLogs, vehicles]);

  // ── Export ────────────────────────────────────────────────────────────────────
  const handleExportSummary = () => {
    const wb = XLSX.utils.book_new();
    const rows = summaryData.map(r => ({
      'Wilayah': r.wilayah,
      'Plant': r.plant,
      'Desc': r.desc,
      'Jumlah Veh. Code': r.vehicleCount,
      'Jumlah Hari Kerja': r.hariKerja,
      'Rencana Transaksi': r.rencana,
      'Up To Date': r.utdCount,
      'Tidak Up To Date': r.tutdCount,
      'Total Transaksi': r.totalTx,
      'Persentase (%) Up To Date': r.pctUtd ? `${r.pctUtd.toFixed(2)}%` : '0.00%',
      'Persentase (%) Tidak Up To Date': r.pctTutd ? `${r.pctTutd.toFixed(2)}%` : '0.00%',
      'Last Logbook Date': r.lastLogDate ? format(new Date(r.lastLogDate + 'T00:00:00'), 'dd/MM/yyyy') : '-',
      'Rank': r.rank,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Summary');
    XLSX.writeFile(wb, `Monitoring_Logbook_Regional5_${targetMonth}.xlsx`);
  };

  // WhatsApp copy (Rankings list)
  const handleCopyWASimple = () => {
    try {
      const targetDateObj = subDays(new Date(targetInputDate + 'T00:00:00'), 1);
      const reportDateObj = new Date(targetInputDate + 'T00:00:00');
      const reportDateStr = format(reportDateObj, 'dd MMM yyyy', { locale: id });
      const targetDateStrFormatted = format(targetDateObj, 'dd/MM/yyyy');
      
      let text = `*📊 MONITORING TRANSAKSI LOGBOOK REGIONAL 5*\n`;
      text += `*Periode:* 1 s.d ${reportDateStr}\n`;
      text += `*Target Input:* ${targetDateStrFormatted} (H-1)\n\n`;
      
      const sorted = [...summaryData].sort((a, b) => a.rank - b.rank);
      
      text += `*🏆 PERINGKAT UNIT (Berdasarkan Kepatuhan UTD):*\n`;
      sorted.forEach(item => {
        if (item.totalTx === 0) return;
        const statusEmoji = item.statusColor === 'green' ? '🟢' : item.statusColor === 'yellow' ? '🟡' : '🔴';
        text += `${item.rank}. *${item.plant}* - ${item.desc}: *${item.pctUtd.toFixed(1)}%* UTD (${item.utdCount}/${item.totalTx} tx) ${statusEmoji} (Last: ${item.lastLogDate ? format(new Date(item.lastLogDate + 'T00:00:00'), 'dd/MM') : '-'})\n`;
      });
      
      const zeroTx = sorted.filter(item => item.totalTx === 0);
      if (zeroTx.length > 0) {
        text += `\n*⚠️ Unit Tanpa Transaksi:* \n`;
        text += zeroTx.map(item => `${item.plant} (${item.desc})`).join(', ') + '\n';
      }
      
      navigator.clipboard.writeText(text);
      alert('Laporan teks ringkas WA berhasil disalin ke clipboard! Siap ditempel di grup WhatsApp.');
    } catch (e) {
      alert('Gagal menyalin laporan: ' + e.message);
    }
  };

  // WhatsApp copy (Monospace ASCII Table)
  const handleCopyWATable = () => {
    try {
      const targetDateObj = new Date(targetInputDate + 'T00:00:00');
      const reportDateObj = targetDateObj;
      const reportDateStr = format(reportDateObj, 'dd MMM yyyy', { locale: id });
      const targetDateStrFormatted = format(targetDateObj, 'dd/MM/yyyy');
      
      let text = `*Monitoring Transaksi Logbook tanggal 1 s.d ${reportDateStr}*\n`;
      text += `*REGIONAL 5*\n`;
      text += `Target input logbook: *${targetDateStrFormatted}* (H-1)\n\n`;
      
      text += `\`\`\`\n`;
      text += `| Plant | Unit Description          | Veh | Hari | Total Tx | UTD | % UTD  | Rank |\n`;
      text += `|-------|---------------------------|-----|------|----------|-----|--------|------|\n`;
      
      const sorted = [...summaryData].sort((a, b) => a.rank - b.rank);
      sorted.forEach(item => {
        const nameTrunc = item.desc.length > 25 ? item.desc.substring(0, 22) + '...' : item.desc.padEnd(25);
        const plantStr = item.plant.padEnd(5);
        const vehCountStr = String(item.vehicleCount).padStart(3);
        const hariStr = String(item.hariKerja).padStart(4);
        const txStr = String(item.totalTx).padStart(8);
        const utdStr = String(item.utdCount).padStart(3);
        const pctStr = `${item.pctUtd.toFixed(1)}%`.padStart(6);
        const rankStr = String(item.rank).padStart(4);
        
        text += `| ${plantStr} | ${nameTrunc} | ${vehCountStr} | ${hariStr} | ${txStr} | ${utdStr} | ${pctStr} | ${rankStr} |\n`;
      });
      text += `\`\`\`\n`;
      
      navigator.clipboard.writeText(text);
      alert('Laporan tabel WA berhasil disalin ke clipboard! Gunakan font monospace di aplikasi WA Desktop.');
    } catch (e) {
      alert('Gagal menyalin laporan: ' + e.message);
    }
  };

  // Trigger print dialog
  // Trigger High-Quality Image Download
  const handlePrint = async () => {
    if (isSavingImage) return;
    
    const element = document.getElementById('excel-report-sheet');
    if (!element) return;
    
    setIsSavingImage(true);
    
    // Find inner scrollable wrapper to prevent horizontal cropping
    const tableWrapper = element.querySelector('.overflow-x-auto');
    
    // Save original styles
    const origElementCss = element.style.cssText;
    const origWrapperCss = tableWrapper ? tableWrapper.style.cssText : '';
    
    // Force element to expand fully to avoid cropping
    element.style.setProperty('max-width', 'none', 'important');
    element.style.setProperty('width', 'max-content', 'important');
    element.style.setProperty('margin', '0', 'important');
    if (tableWrapper) {
      tableWrapper.style.setProperty('overflow', 'visible', 'important');
      tableWrapper.style.setProperty('width', 'max-content', 'important');
    }
    
    try {
      // Create high-quality canvas (pixelRatio 2 for HD but avoids freezing)
      const dataUrl = await toPng(element, {
        pixelRatio: 2,
        backgroundColor: '#ffffff',
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
        }
      });
      
      // Download image
      const link = document.createElement('a');
      link.href = dataUrl;
      
      const now = new Date();
      const dateStr = `${String(now.getDate()).padStart(2, '0')}${String(now.getMonth()+1).padStart(2, '0')}${now.getFullYear()}`;
      link.download = `Logbook_Regional5_${dateStr}.png`;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('Gagal menyimpan gambar: ' + err.message);
    } finally {
      // Restore original styles
      element.style.cssText = origElementCss;
      if (tableWrapper) {
        tableWrapper.style.cssText = origWrapperCss;
      }
      setIsSavingImage(false);
    }
  };

  const handleExportZCO = () => {
    const wb = XLSX.utils.book_new();
    const rows = filteredZCOData.map(r => ({
      'Cost Center': r.rawCostCenter,
      'Cost (Biaya SAP)': r.zcoCost,
      'Acty (SAP)': r.zcoActy,
      'Rate (Tarif)': r.zcoRate,
      'Logbook (Acty)': r.logActivity || 0,
      'Kebun / Unit': `${r.plantCode} - ${r.plantDesc}`,
      'Cek Status': r.cekStatus,
      'Indikator & Tindak Lanjut': r.statusText,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'ZCO Reconciliation');
    XLSX.writeFile(wb, `ZCO_Reconciliation_${targetMonth}.xlsx`);
  };

  const handleExportDetail = () => {
    const wb = XLSX.utils.book_new();
    const rows = filteredLogs.map(l => ({
      'Vehicle Activity No.': l.activity_number,
      'Vehicle Code':     l.vehicle_code,
      'Plant':            l.plant,
      'Tanggal':          l.date,
      'Waktu':            l.vehicle_time,
      'Job Code':         l.job_code,
      'Deskripsi Job':    JOB_CODE_DESC[l.job_code] || '-',
      'HM/KM':            l.hm_km,
      'Unit':             l.unit_value,
      'UoM':              l.uom,
      'Lokasi':           l.location_code,
      'Operator':         l.operator,
      'Helper 1':         l.helper_1,
      'Helper 2':         l.helper_2,
      'Reference':        l.reference,
      'Remarks':          l.remarks,
      'Meas. Doc':        l.measurement_doc,
      'Nomor Dokumen':    l.document_number,
      'Nomor SPBS':       l.spbs_number,
      'Tgl Angkut':       l.tgl_angkut || '-',
      'Antar Kebun':      l.antar_kebun,
      'Dest. Plant':      l.destination_plant,
      'Alokasi Biaya':    l.target_alokasi,
      'Company':          l.company_code,
      'Fiscal Year':      l.fiscal_year,
      'Cancelled':        l.cancelled ? 'X' : '',
      'Created By':       l.created_by,
      'Created On':       l.created_on,
      'Changed By':       l.changed_by,
      'Changed On':       l.changed_on,
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Detail Log');
    XLSX.writeFile(wb, `Detail_Log_Kendaraan_${targetMonth}.xlsx`);
  };

  // ── Sort handler ──────────────────────────────────────────────────────────────
  const handleSort = (col) => {
    if (sortBy === col) setSortAsc(!sortAsc);
    else { setSortBy(col); setSortAsc(true); }
  };
  const SortIcon = ({ col }) => sortBy === col
    ? (sortAsc ? <ChevronUp size={12} className="inline ml-1" /> : <ChevronDown size={12} className="inline ml-1" />)
    : null;

  // ── Paginated logs ─────────────────────────────────────────────────────────────
  const paginatedLogs = useMemo(() => {
    const start = (logPage - 1) * LOG_PAGE_SIZE;
    return filteredLogs.slice(start, start + LOG_PAGE_SIZE);
  }, [filteredLogs, logPage]);
  const totalPages = Math.ceil(filteredLogs.length / LOG_PAGE_SIZE);

  const zcoReconciliationData = useMemo(() => {
    return zcoData.map(row => {
      const ccCode = row.costCenterCode;
      
      // Find all vehicles in masterEquipments that belong to this cost center code
      const linkedEqs = masterEquipments.filter(e => {
        const eqCC = String(e.costCenter || '').trim();
        return eqCC.toLowerCase() === ccCode.toLowerCase();
      });
      const linkedEqNums = linkedEqs.map(e => e.eqNum);

      // Find all active logs for this month that belong to these vehicles
      const linkedLogs = activeMonthLogs.filter(l => {
        return linkedEqNums.includes(l.vehicle_code);
      });

      // Sum HM/KM (activity) from logs
      const logActivity = linkedLogs.reduce((sum, l) => sum + (parseFloat(l.hm_km) || 0), 0);

      // Determine unit/kebun and region from the plant information
      let plantCode = '-';
      let plantDesc = '-';
      let wilayah = '-';
      if (linkedEqs.length > 0) {
        plantCode = linkedEqs[0].plant || '-';
        const pInfo = PLANT_INFO[plantCode];
        if (pInfo) {
          plantDesc = pInfo.desc;
          wilayah = pInfo.wilayah;
        }
      } else {
        // Fallback: extract plant prefix if possible (e.g. 5D01 from 5D01CAR001)
        const match = ccCode.match(/^(\d[A-Z]\d{2})/i);
        if (match) {
          plantCode = match[1].toUpperCase();
          const pInfo = PLANT_INFO[plantCode];
          if (pInfo) {
            plantDesc = pInfo.desc;
            wilayah = pInfo.wilayah;
          }
        }
      }

      const zcoCost = parseFloat(row.totalCost) || 0;
      const zcoActy = parseFloat(row.activityQty) || 0;
      const zcoRate = zcoActy > 0 ? zcoCost / zcoActy : 0;

      // Status logic
      let cekStatus = 'Oke';
      let statusColor = 'green';
      let statusText = 'Oke';
      
      const rawCC = String(row.rawCostCenter || '').trim();
      const isPlantLogRate = rawCC.toLowerCase().startsWith('plant') || rawCC.toLowerCase().includes('log rate');

      if (isPlantLogRate) {
        cekStatus = 'Oke';
        statusColor = 'green';
        statusText = 'Oke';
        plantDesc = '';
        wilayah = '';
      } else if (!plantCode || plantCode === '-' || plantCode === '') {
        cekStatus = 'Oke';
        statusColor = 'grey';
        statusText = '';
      } else if (zcoCost + zcoActy + zcoRate === 0) {
        cekStatus = 'Oke';
        statusColor = 'grey';
        statusText = '';
      } else {
        if (zcoCost > 0 && zcoActy > 0) {
          cekStatus = 'Oke';
          statusColor = 'green';
          statusText = 'Oke';
        } else {
          cekStatus = 'Cek';
          if (zcoCost > 0 && zcoActy === 0) {
            statusColor = 'red';
            statusText = 'Logbook Belum Dibuat';
          } else if (zcoCost === 0 && zcoActy > 0) {
            statusColor = 'orange';
            statusText = 'Belum Ada Pembebanan Biaya';
          } else {
            statusColor = 'red';
            statusText = 'Perbaiki';
          }
        }
      }

      return {
        ...row,
        plantCode,
        plantDesc,
        wilayah,
        logActivity,
        zcoCost,
        zcoActy,
        zcoRate,
        isPlantLogRate,
        cekStatus,
        statusColor,
        statusText
      };
    });
  }, [zcoData, masterEquipments, activeMonthLogs]);

  const filteredZCOData = useMemo(() => {
    let result = zcoReconciliationData;

    if (zcoWilayah !== 'ALL') {
      result = result.filter(r => r.wilayah === zcoWilayah);
    }
    
    if (searchVehicle.trim()) {
      const q = searchVehicle.toLowerCase();
      result = result.filter(r => 
        r.rawCostCenter.toLowerCase().includes(q) ||
        r.costCenterCode.toLowerCase().includes(q) ||
        r.plantCode.toLowerCase().includes(q) ||
        r.plantDesc.toLowerCase().includes(q)
      );
    }

    if (zcoFilterStatus !== 'ALL') {
      result = result.filter(r => r.cekStatus === zcoFilterStatus && r.statusColor !== 'grey');
    }

    return result;
  }, [zcoReconciliationData, zcoWilayah, searchVehicle, zcoFilterStatus]);

  const totalCekRows = useMemo(() => {
    let list = zcoReconciliationData;
    if (zcoWilayah !== 'ALL') {
      list = list.filter(r => r.wilayah === zcoWilayah);
    }
    return list.filter(r => r.cekStatus === 'Cek').length;
  }, [zcoReconciliationData, zcoWilayah]);

  const uomOptions    = useMemo(() => ['ALL', ...new Set(monthLogs.map(l => l.uom).filter(Boolean))], [monthLogs]);
  const jobCodeOptions = useMemo(() => ['ALL', ...new Set(monthLogs.map(l => l.job_code).filter(Boolean))], [monthLogs]);

  const allPlantsList = useMemo(() => {
    return Object.entries(PLANT_INFO).map(([code, details]) => ({
      code,
      ...details
    })).sort((a, b) => a.code.localeCompare(b.code));
  }, []);

  return (
    <div className="bg-slate-50 min-h-full rounded-xl overflow-y-auto" style={{ maxHeight: 'calc(100vh - 80px)' }}>

      {/* ── Side Drawer ─────────────────────────────────────────── */}
      {drawerItem && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/30 backdrop-blur-[1px] z-40 no-print"
            onClick={() => setDrawerItem(null)}
          />
          {/* Drawer panel */}
          <div className="fixed right-0 top-0 h-full w-full sm:w-[420px] bg-white shadow-2xl z-50 flex flex-col no-print" style={{ transition: 'transform 0.25s ease' }}>
            {/* Drawer header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-900">
              <div>
                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">{drawerItem.wilayah} · {drawerItem.plant}</p>
                <h3 className="text-sm font-bold text-white mt-0.5 uppercase">{drawerItem.desc}</h3>
              </div>
              <button onClick={() => setDrawerItem(null)} className="text-slate-400 hover:text-white transition p-1 rounded-2xl hover:bg-slate-700">
                <X size={18} />
              </button>
            </div>

            {/* Drawer content */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6 text-xs">

              {/* Stats row */}
              <div className="grid grid-cols-3 gap-3">
                {[['UTD', drawerItem.utdCount, 'text-emerald-700 bg-emerald-50 border-emerald-100'],
                  ['TUTD', drawerItem.tutdCount, 'text-red-700 bg-red-50 border-red-100'],
                  ['Total', drawerItem.totalTx, 'text-slate-800 bg-slate-50 border-slate-100']
                ].map(([label, val, cls]) => (
                  <div key={label} className={`border rounded-xl p-3 text-center ${cls}`}>
                    <p className="text-[10px] font-bold uppercase tracking-wide opacity-70">{label}</p>
                    <p className="text-xl font-extrabold mt-0.5">{val}</p>
                  </div>
                ))}
              </div>

              {/* UTD % gauge */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="font-bold text-slate-600">% UTD</span>
                  <span className="font-extrabold text-emerald-700">{drawerItem.pctUtd.toFixed(2)}%</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div className="h-2 rounded-full bg-emerald-500 transition-colors" style={{ width: `${Math.min(drawerItem.pctUtd, 100)}%` }} />
                </div>
              </div>

              {/* Operators */}
              <div>
                <p className="font-bold text-slate-600 mb-2 flex items-center gap-1">
                  <Activity size={12} /> Operator Aktif ({drawerItem.operators.length})
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {drawerItem.operators.length === 0
                    ? <span className="text-slate-400 italic">Tidak ada data</span>
                    : drawerItem.operators.map(op => (
                      <span key={op} className="bg-slate-50 border border-slate-200 text-slate-700 px-2 py-0.5 rounded font-mono text-[10px]">{op}</span>
                    ))
                  }
                </div>
              </div>

              {/* Job Codes */}
              <div>
                <p className="font-bold text-slate-600 mb-2 flex items-center gap-1">
                  <Layers size={12} /> Jenis Pekerjaan (Job Code)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(() => {
                    const jcMap = {};
                    drawerItem.plantLogs.forEach(l => { if (l.job_code) jcMap[l.job_code] = (jcMap[l.job_code] || 0) + 1; });
                    return Object.entries(jcMap).map(([jc, cnt]) => (
                      <span key={jc} className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded font-mono text-[10px]">
                        {jc}{JOB_CODE_DESC[jc] ? ` (${JOB_CODE_DESC[jc]})` : ''} · {cnt}x
                      </span>
                    ));
                  })()}
                </div>
              </div>

              {/* Log date info */}
              <div className="border-t border-slate-100 pt-4">
                <div className="flex justify-between text-[11px]">
                  <span className="text-slate-500">Hari Kerja</span><span className="font-bold text-slate-800">{drawerItem.hariKerja} hari</span>
                </div>
                <div className="flex justify-between text-[11px] mt-1.5">
                  <span className="text-slate-500">Rencana Transaksi</span><span className="font-bold text-slate-800">{drawerItem.rencana}</span>
                </div>
                <div className="flex justify-between text-[11px] mt-1.5">
                  <span className="text-slate-500">Last Log</span>
                  <span className="font-bold text-slate-800">
                    {drawerItem.lastLogDate ? format(new Date(drawerItem.lastLogDate + 'T00:00:00'), 'dd/MM/yyyy') : '-'}
                  </span>
                </div>
                <div className="flex justify-between text-[11px] mt-1.5">
                  <span className="text-slate-500">Rank</span><span className="font-extrabold text-emerald-700">#{drawerItem.rank}</span>
                </div>
              </div>

            </div>
          </div>
        </>
      )}

      <div className="p-4 md:p-6 space-y-4">
        {/* Global style block for print layout and Excel cell borders */}
        <style>{`
          @media print {
            body * {
              visibility: hidden !important;
            }
            #excel-report-sheet, #excel-report-sheet *,
            #zco-report-sheet, #zco-report-sheet * {
              visibility: visible !important;
            }
            #excel-report-sheet, #zco-report-sheet {
              position: absolute !important;
              left: 0 !important;
              top: 0 !important;
              width: 100% !important;
              border: none !important;
              box-shadow: none !important;
              padding: 10px !important;
              margin: 0 !important;
              background: white !important;
            }
            .no-print {
              display: none !important;
            }
          }
          .excel-cell-border th, .excel-cell-border td {
            border: 1px solid #cbd5e1 !important;
          }
        `}</style>

        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm no-print">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Truck size={20} className="text-emerald-400" />
              <span className="text-emerald-400 text-xs font-semibold uppercase tracking-widest text-[10px]">ZESTHLP16PA SAP</span>
            </div>
            <h2 className="text-xl font-bold text-white">Monitoring Logbook Kendaraan</h2>
            <p className="text-slate-400 text-xs mt-0.5">
              Dashboard monitoring operasional kendaraan Regional 5 — Bulan {targetMonth}
            </p>
          </div>

          <div className="flex gap-2 shrink-0 flex-wrap">
            {isAdmin && (
              <>
                <input type="file" id="raw-zest-file" className="hidden" accept=".xlsx,.xls" onChange={handleFileUpload} />
                <button
                  onClick={() => document.getElementById('raw-zest-file').click()}
                  disabled={loading}
                  className="bg-white text-slate-800 hover:bg-slate-50 px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm disabled:opacity-50 transition border border-slate-200"
                >
                  <Upload size={14} className="text-emerald-600" /> Upload ZESTHLP16PA
                </button>

                <input type="file" id="raw-zco-file" className="hidden" accept=".xlsx,.xls" onChange={handleZCOFileUpload} />
                <button
                  onClick={() => document.getElementById('raw-zco-file').click()}
                  disabled={loading}
                  className="bg-white text-slate-800 hover:bg-slate-50 px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm disabled:opacity-50 transition border border-slate-200"
                >
                  <Upload size={14} className="text-emerald-600" /> Upload ZCO_CCTR_01
                </button>
              </>
            )}
            <button onClick={loadData} disabled={loading}
              className="bg-[#064e3b] hover:bg-[#065f46] text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm disabled:opacity-50 transition">
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
            </button>
          </div>
        </div>

        {/* ── Error / Upload Info ─────────────────────────────────── */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start gap-3">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}
        {uploadInfo && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-start gap-3">
            <CheckCircle size={18} className="shrink-0 mt-0.5 text-emerald-600" />
            <div className="text-sm">
              <p className="font-bold text-xs">Upload berhasil: {uploadInfo.file}</p>
              <p className="text-emerald-700 mt-0.5 text-[11px]">
                {uploadInfo.processed} transaksi diproses · {uploadInfo.cancelled} dibatalkan · {uploadInfo.skipped} baris dilewati · {uploadInfo.plants} plant · {uploadInfo.jobCodes} job code
              </p>
            </div>
            <button onClick={() => setUploadInfo(null)} className="ml-auto text-emerald-400 hover:text-emerald-600"><XCircle size={16} /></button>
          </div>
        )}
        {zcoUploadInfo && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-start gap-3">
            <CheckCircle size={18} className="shrink-0 mt-0.5 text-emerald-600" />
            <div className="text-sm">
              <p className="font-bold text-xs">Upload ZCO Berhasil: {zcoUploadInfo.file}</p>
              <p className="text-emerald-700 mt-0.5 text-[11px]">
                Berhasil mengimpor {zcoUploadInfo.processed} baris data Cost Center untuk pemantauan verifikasi biaya.
              </p>
            </div>
            <button onClick={() => setZcoUploadInfo(null)} className="ml-auto text-emerald-400 hover:text-emerald-600"><XCircle size={16} /></button>
          </div>
        )}

        {/* ── Tab Navigation ──────────────────────────────────────── */}
        <div className="flex gap-1 bg-slate-200/60 p-1.5 rounded-xl w-fit">
          {[
            { key: 'unit-checklist',    label: '📋 Checklist Kebun (Unit)', icon: Calendar },
            { key: 'summary-regional',  label: '🏢 Rekap Regional 5',      icon: BarChart2 },
            { key: 'detail-veh',        label: '🚚 Daftar Kendaraan',      icon: Truck },
            {key: 'log-raw',           label: '📄 Log Transaksi Asli',    icon: FileSpreadsheet },
            { key: 'zco-reconciliation',  label: '💰 Verifikasi Biaya (ZCO)', icon: Coins },
          ].map(({ key, label, icon: Icon }) => (
            <button key={key} onClick={() => { setActiveTab(key); setError(null); }}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold transition-colors duration-300 ${activeTab === key ? 'bg-gradient-to-tr from-[#064e3b] to-[#2dd4bf] text-white shadow-md shadow-emerald-900/20' : 'text-slate-500 hover:text-[#064e3b] hover:bg-emerald-50'}`}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        {/* ── Controls (Adapts based on active tab) ────────────────── */}
        <div className="bg-[#fafafa]  p-5 rounded-2xl border border-emerald-100 shadow-lg shadow-emerald-900/5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4 items-end sticky top-0 z-40">
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1">Pilih Bulan</label>
            <input type="month" value={targetMonth} onChange={e => setTargetMonth(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30 focus:border-[#064e3b]" />
          </div>
          
          <div className="flex flex-col">
            <label className="text-[10px] font-bold text-slate-400 uppercase mb-1">Tanggal Cek Status</label>
            <input type="date" value={targetInputDate} onChange={e => setTargetInputDate(e.target.value)}
              className="px-3 py-2 border border-slate-300 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30 focus:border-[#064e3b]" />
          </div>

          {activeTab === 'unit-checklist' ? (
            // Unit view controls: plant selection
            <div className="flex flex-col col-span-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1">Pilih Kebun / Unit</label>
              <select 
                value={selectedPlant} 
                onChange={e => setSelectedPlant(e.target.value)}
                disabled={currentUser?.role === 'Unit'}
                className="px-3 py-2 border border-slate-300 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30 focus:border-[#064e3b] bg-slate-50 disabled:opacity-80 font-semibold"
              >
                {allPlantsList.map(p => (
                  <option key={p.code} value={p.code}>
                    {p.code} - {p.desc} ({p.wilayah})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            // Regional / Other view controls
            <>
              <div className="flex flex-col">
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1">Target Hari Kerja (Otomatis)</label>
                <div className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-2xl text-xs font-bold text-slate-700 h-[34px] flex items-center shadow-inner">
                  {autoWorkingDays} Hari
                </div>
              </div>
              {activeTab !== 'zco-reconciliation' && (
                <div className="flex flex-col">
                  <label className="text-[10px] font-bold text-slate-400 uppercase mb-1">Filter Wilayah</label>
                  <select value={selectedWilayah} onChange={e => setSelectedWilayah(e.target.value)}
                    className="px-3 py-2 border border-slate-300 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30 focus:border-[#064e3b]">
                    <option value="ALL">Semua Wilayah</option>
                    <option value="Kal-Bar">Kal-Bar</option>
                    <option value="Kal-Sel-Teng">Kal-Sel-Teng</option>
                    <option value="Kal-Tim">Kal-Tim</option>
                  </select>
                </div>
              )}
            </>
          )}

          {activeTab !== 'zco-reconciliation' && (
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1">Status Cek</label>
              <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                className="px-3 py-2 border border-slate-300 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30 focus:border-[#064e3b]">
                <option value="ALL">Semua Status</option>
                <option value="green">Up To Date</option>
                <option value="yellow">Terlambat</option>
                <option value="red">Belum Lengkap</option>
                <option value="grey">Belum Ada Data</option>
              </select>
            </div>
          )}
        </div>

        {/* ─────────────────────────────────────────────────────────── */}
        {/* TAB 1: Checklist Kebun (Unit) — VERY SIMPLE & DIRECT       */}
        {/* ─────────────────────────────────────────────────────────── */}
        {activeTab === 'unit-checklist' && (
          <div className="space-y-4">
            
            {/* Kebun Info Panel & KPIs */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-lg shadow-emerald-900/5 p-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-center mt-2 hover:shadow-xl transition-shadow duration-300">
              <div className="border-r border-slate-100 pr-2">
                <span className="text-[9px] font-bold text-[#064e3b] uppercase tracking-widest">Kebun Terpilih</span>
                <h3 className="text-base font-bold text-slate-800 mt-0.5">{PLANT_INFO[selectedPlant]?.desc || `Kebun ${selectedPlant}`}</h3>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-bold px-2 py-0.5 rounded font-mono">{selectedPlant}</span>
                  <span className="text-slate-400 text-xs font-semibold">{PLANT_INFO[selectedPlant]?.wilayah}</span>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 text-[10px] font-bold uppercase">Total Kendaraan</span>
                <span className="text-2xl font-bold text-slate-800 mt-1">{unitFocusedData.kpis.total} <span className="text-xs text-slate-400 font-semibold">Unit</span></span>
                <span className="text-[9px] text-slate-400 mt-0.5">{unitFocusedData.kpis.active} Aktif Bulan Ini</span>
              </div>

              <div className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 text-[10px] font-bold uppercase">Status Hari Ini ({format(new Date(targetInputDate + 'T00:00:00'), 'dd/MM/yyyy')})</span>
                <div className="flex gap-3 mt-1 items-center">
                  <span className="text-emerald-600 font-extrabold text-base flex items-center gap-0.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block mr-1"></span>
                    {unitFocusedData.kpis.todayFilled} <span className="text-[10px] text-slate-400 font-semibold">Selesai</span>
                  </span>
                  <span className="text-red-500 font-extrabold text-base flex items-center gap-0.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block mr-1"></span>
                    {unitFocusedData.kpis.todayPending} <span className="text-[10px] text-slate-400 font-semibold">Belum</span>
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-center justify-center p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-400 text-[10px] font-bold uppercase">Status Pengisian Kebun</span>
                <span className="text-sm font-bold text-slate-800 mt-2">
                  <StatusBadge status={unitFocusedData.kpis.statusColor} text={unitFocusedData.kpis.statusText} />
                </span>
                <span className="text-[9px] text-slate-400 mt-1">Terakhir Update: {unitFocusedData.kpis.lastUpdate !== '-' ? format(new Date(unitFocusedData.kpis.lastUpdate + 'T00:00:00'), 'dd/MM/yyyy') : '-'}</span>
              </div>
            </div>

            {/* Checklist Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-lg shadow-emerald-900/5 overflow-hidden mt-4">
              <div className="p-5 border-b border-emerald-100/50 flex flex-col sm:flex-row justify-between items-center gap-3 bg-slate-50/50">
                <div>
                  <h4 className="font-bold text-slate-700 text-xs">Checklist Absensi Pengisian Logbook Harian</h4>
                  <p className="text-[10px] text-slate-400">Centang hijau menunjukkan logbook sudah terisi pada tanggal terpilih.</p>
                </div>
                <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-full" /> <span>Terisi</span></div>
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-red-400 rounded-full" /> <span>Belum Terisi</span></div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-100/60 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                      <th className="px-4 py-3 w-[120px]">No. Equipment</th>
                      <th className="px-4 py-3 min-w-[150px]">Deskripsi Kendaraan</th>
                      <th className="px-4 py-3 w-[100px]">Cost Center</th>
                      <th className="px-4 py-3 min-w-[180px]">Pekerjaan Utama (Transaksi)</th>
                      <th className="px-4 py-3 text-center w-[160px]">Status Hari Ini</th>
                      <th className="px-4 py-3 text-center w-[120px]">Bulan Ini (Terisi)</th>
                      <th className="px-4 py-3">Absensi Harian (Tanggal 1 s.d. 31)</th>
                      <th className="px-4 py-3 text-center w-[60px]">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {unitFocusedData.vehiclesList.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-16 text-center text-slate-400 font-medium">
                          Tidak ada kendaraan terdaftar di Kebun/Unit ini. Silakan upload file ZESTHLP16PA SAP untuk mendaftarkan data.
                        </td>
                      </tr>
                    ) : unitFocusedData.vehiclesList.map(v => (
                      <React.Fragment key={v.vehicle_code}>
                        <tr className={`hover:bg-emerald-50/40  hover:shadow-sm transition-colors duration-200 border-b border-slate-50 group ${expandedVehicleId === v.vehicle_code ? 'bg-emerald-50/10' : ''}`}>
                          <td className="px-4 py-3 font-bold text-slate-800 font-mono text-[13px]">{v.vehicle_code}</td>
                          <td className="px-4 py-3 text-[10px] text-slate-500 font-medium">{v.eqDesc}</td>
                          <td className="px-4 py-3 font-mono text-[11px] font-semibold text-slate-700">{v.costCenter}</td>
                          <td className="px-4 py-3 text-slate-600">
                            <span className="font-semibold text-slate-700 block text-xs">{v.description}</span>
                            <span className="text-[10px] text-slate-400 font-medium mt-0.5 block">Tipe Pekerjaan Utama: {v.description.split(' Ke ')[0]}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {v.isInputtedToday ? (
                              <div className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-800 px-2.5 py-1 rounded-2xl font-bold text-[10px]">
                                <Check size={12} className="text-emerald-600 stroke-[3px]" /> Sudah Diisi
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1 bg-red-50 border border-red-200 text-red-700 px-2.5 py-1 rounded-2xl font-bold text-[10px]">
                                <X size={12} className="text-red-500 stroke-[3px]" /> Belum Diisi
                              </div>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center font-bold text-slate-700">
                            {v.daysFilled} Hari
                          </td>
                          <td className="px-4 py-3">
                            {/* Calendar Checklist Row */}
                            <div className="flex flex-wrap gap-1 items-center justify-start">
                              {calendarDays.map(day => {
                                const dateStr = format(day, 'yyyy-MM-dd');
                                const dayNum  = format(day, 'd');
                                const dayName = format(day, 'EEE', { locale: id });
                                const state   = v.attendance[dateStr];
                                const isCurrentDate = dateStr === targetInputDate;
                                
                                return (
                                  <div
                                    key={dateStr}
                                    title={`Tanggal ${dayNum} (${dayName}): ${state ? state.desc : 'Belum Ada Input'}`}
                                    className={`w-6 h-6 rounded flex items-center justify-center font-mono text-[9px] font-bold transition cursor-help border ${
                                      state 
                                        ? 'bg-emerald-500 text-white border-emerald-600' 
                                        : 'bg-red-100 text-red-500 hover:bg-red-200 border-red-200'
                                    } ${isCurrentDate ? 'ring-2 ring-[#064e3b] ring-offset-1 scale-110 shadow-sm' : ''}`}
                                  >
                                    {dayNum}
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <button 
                              onClick={() => setExpandedVehicleId(expandedVehicleId === v.vehicle_code ? null : v.vehicle_code)}
                              className="text-[#064e3b] hover:text-[#065f46] font-bold text-xs"
                            >
                              {expandedVehicleId === v.vehicle_code ? 'Tutup' : 'Detail'}
                            </button>
                          </td>
                        </tr>

                        {/* Expanded detail row showing logs for selected vehicle */}
                        {expandedVehicleId === v.vehicle_code && (
                          <tr className="bg-slate-50/50">
                            <td colSpan={8} className="px-6 py-4">
                              <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-inner max-w-4xl">
                                <h5 className="font-bold text-slate-700 text-xs mb-3 flex items-center gap-1.5">
                                  <Truck size={14} className="text-[#064e3b]" /> 
                                  Detail Transaksi Logbook Kendaraan {v.vehicle_code} — Bulan {targetMonth}
                                </h5>
                                
                                <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                                  <table className="w-full text-xs text-left">
                                    <thead>
                                      <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                                        <th className="py-2 px-2">Tanggal</th>
                                        <th className="py-2 px-2">Operator (Supir)</th>
                                        <th className="py-2 px-2">Pekerjaan</th>
                                        <th className="py-2 px-2 text-center">HM/KM</th>
                                        <th className="py-2 px-2 text-center">Hasil Angkut</th>
                                        <th className="py-2 px-2">SPBS No.</th>
                                        <th className="py-2 px-2">Lokasi</th>
                                        <th className="py-2 px-2">Keterangan</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                      {v.allLogs.length === 0 ? (
                                        <tr><td colSpan={8} className="py-6 text-center text-slate-400 italic">Belum ada transaksi logbook terisi bulan ini.</td></tr>
                                      ) : v.allLogs.sort((a, b) => b.date.localeCompare(a.date)).map(log => (
                                        <tr key={log.activity_number} className="hover:bg-slate-50/50 text-[11px]">
                                          <td className="py-2 px-2 font-semibold whitespace-nowrap">{format(new Date(log.date + 'T00:00:00'), 'dd/MM/yyyy')}</td>
                                          <td className="py-2 px-2 font-mono font-medium text-slate-700">{log.operator || '-'}</td>
                                          <td className="py-2 px-2 text-slate-600 font-medium">{JOB_CODE_DESC[log.job_code] || log.job_code || '-'}</td>
                                          <td className="py-2 px-2 text-center font-bold text-slate-800">{log.hm_km > 0 ? log.hm_km : '-'}</td>
                                          <td className="py-2 px-2 text-center font-semibold text-slate-800">
                                            {log.unit_value > 0 ? `${log.unit_value.toLocaleString('id-ID')} ${log.uom}` : '-'}
                                          </td>
                                          <td className="py-2 px-2 font-mono text-slate-500 max-w-[120px] truncate" title={log.spbs_number}>{log.spbs_number || '-'}</td>
                                          <td className="py-2 px-2 font-mono text-slate-500 text-center">{log.location_code || '-'}</td>
                                          <td className="py-2 px-2 text-slate-400 max-w-[180px] truncate" title={log.reference || log.remarks}>{log.reference || log.remarks || '-'}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Quick guide for Unit user */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 flex gap-3 text-xs text-emerald-800">
              <Info size={16} className="text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Panduan Cara Cek Checklist Logbook:</p>
                <ul className="list-disc pl-4 mt-1 space-y-1 text-emerald-700">
                  <li>Pilih bulan dan tanggal yang ingin dicek pada kolom kontrol di atas.</li>
                  <li>Kolom <strong>"Status Hari Ini"</strong> akan menunjukkan apakah kendaraan sudah diisi logbooknya pada tanggal tersebut.</li>
                  <li>Daftar kotak angka <strong>1 s.d. 31</strong> menunjukkan absensi harian kendaraan tersebut. Kotak <strong>hijau</strong> berarti sudah terisi, kotak <strong>merah</strong> berarti kosong.</li>
                  <li>Arahkan kursor pada kotak angka untuk melihat ringkasan hasil kerja pada hari tersebut.</li>
                  <li>Klik tombol <strong>"Detail"</strong> untuk melihat daftar lengkap transaksi kendaraan selama satu bulan.</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────── */}
        {/* TAB 2: Summary Regional (Semua Kebun)                      */}
        {/* ─────────────────────────────────────────────────────────── */}
        {activeTab === 'summary-regional' && (
          <div className="space-y-4">


            {/* Action Bar (Only visible on screen, hidden when printing) */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap justify-between items-center gap-3 no-print">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                <input type="text" placeholder="Cari plant / kebun..." value={searchPlant} onChange={e => setSearchPlant(e.target.value)}
                  className="pl-9 pr-3 py-2 border border-slate-200 rounded-2xl text-xs w-56 focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30 focus:border-[#064e3b]" />
              </div>
              <div className="flex gap-2 flex-wrap">
                <button onClick={handlePrint} disabled={isSavingImage}
                  className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold shadow-sm transition ${
                    isSavingImage ? 'bg-slate-400 text-slate-100 cursor-wait' : 'bg-[#064e3b] hover:bg-[#065f46] text-white'
                  }`}>
                  {isSavingImage ? (
                    <>
                      <RefreshCw size={13} className="animate-spin" /> Memproses...
                    </>
                  ) : (
                    <>
                      <Download size={13} /> Simpan Gambar HD
                    </>
                  )}
                </button>
                <button onClick={handleExportSummary}
                  className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-800 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-sm transition">
                  <FileDown size={13} /> Ekspor Excel
                </button>
              </div>
            </div>

            {/* Redesigned Excel-style Monitoring Sheet */}
            <div id="excel-report-sheet" className={`bg-white p-4 border border-slate-300 rounded-2xl shadow-sm font-sans ${screenshotMode ? '' : 'overflow-hidden max-w-[1150px] mx-auto w-full'}`} style={screenshotMode ? { maxWidth: 'none', width: 'fit-content', margin: '0', padding: '16px' } : {}}>
              
              {/* Excel Sheet Title and Header */}
              <div className="flex justify-between items-start mb-2 border-b border-slate-200 pb-2">
                <div className="font-sans">
                  <h1 
                    onDoubleClick={() => { if(currentUser?.role === 'Admin') setShowWAModal(true); }}
                    className="text-xs font-extrabold text-slate-900 tracking-wide select-none cursor-default"
                    title={currentUser?.role === 'Admin' ? "Klik ganda untuk konfigurasi WA" : ""}
                  >
                    Monitoring Transaksi Logbook tanggal 1 s.d {(() => {
                      try {
                        const parts = targetInputDate.split('-');
                        const targetDateObj = new Date(parts[0], parts[1] - 1, parts[2]);
                        const reportDateObj = targetDateObj; // Monitoring date stays the same
                        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agt', 'Sep', 'Okt', 'Nov', 'Des'];
                        return `${String(reportDateObj.getDate()).padStart(2, '0')} ${months[reportDateObj.getMonth()]} ${reportDateObj.getFullYear()}`;
                      } catch (e) {
                        return '-';
                      }
                    })()} {(() => {
                      const now = new Date();
                      return `${String(now.getHours()).padStart(2, '0')}.${String(now.getMinutes()).padStart(2, '0')}`;
                    })()}
                  </h1>
                  <h2 className="text-[10px] font-extrabold text-slate-800 tracking-wider mt-0.5">
                    REGIONAL 5
                  </h2>
                </div>
                <div className="text-right font-sans">
                  <span className="text-[10px] font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-300 inline-block mb-0.5">
                    H+ 1
                  </span>
                  <p className="text-[10px] font-semibold text-slate-700">
                    Target input logbook : <span className="font-extrabold">{(() => {
                      try {
                        const parts = targetInputDate.split('-');
                        const d = new Date(parts[0], parts[1] - 1, parts[2]);
                        d.setDate(d.getDate() - 1); // H-1
                        return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                      } catch (e) {
                        return '-';
                      }
                    })()}</span>
                  </p>
                </div>
              </div>

              {/* The Grid Table */}
              <div className={screenshotMode ? '' : 'overflow-x-auto'} style={screenshotMode ? { overflow: 'visible', width: 'max-content' } : {}}>
                <table className="w-full text-[11px] text-center border-collapse excel-cell-border">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 font-bold">
                      <th className="px-2 py-1.5 whitespace-nowrap text-center min-w-[100px]" rowSpan="2">WILAYAH</th>
                      <th className="px-2 py-1.5 whitespace-nowrap text-center" rowSpan="2">PLANT</th>
                      <th className="px-2 py-1.5 whitespace-nowrap text-center min-w-[180px]" rowSpan="2">DESC</th>
                      <th className="px-2 py-1.5 whitespace-nowrap text-center" rowSpan="2">JUMLAH<br/>VEHICLE CODE</th>
                      <th className="px-2 py-1.5 whitespace-nowrap text-center" rowSpan="2">JUMLAH<br/>HARI KERJA</th>
                      <th className="px-2 py-1.5 whitespace-nowrap text-center" rowSpan="2">RENCANA<br/>TRANSAKSI</th>
                      <th className="px-2 py-1.5 whitespace-nowrap text-center" colSpan="2">STATUS</th>
                      <th className="px-2 py-1.5 whitespace-nowrap text-center" rowSpan="2">TOTAL<br/>TRANSAKSI</th>
                      <th className="px-2 py-1.5 whitespace-nowrap text-center" colSpan="2">PERSENTASE ( % )</th>
                      <th className="px-2 py-1.5 whitespace-nowrap text-center" rowSpan="2">LAST<br/>LOGBOOK DATE</th>
                      <th className="px-2 py-1.5 whitespace-nowrap text-center" rowSpan="2">RANK</th>
                      <th className="px-2 py-1.5 whitespace-nowrap text-center no-print" rowSpan="2">DETAIL</th>
                    </tr>
                    <tr className="bg-slate-50 text-slate-700 font-bold">
                      <th className="px-1.5 py-1 text-center font-bold">UP TO DATE</th>
                      <th className="px-1.5 py-1 text-center font-bold">TIDAK<br/>UP TO DATE</th>
                      <th className="px-1.5 py-1 text-center font-bold">UP TO DATE</th>
                      <th className="px-1.5 py-1 text-center font-bold">TIDAK<br/>UP TO DATE</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {summaryData.length === 0 ? (
                      <tr><td colSpan={14} className="py-16 text-center text-slate-400 font-medium border border-slate-200">Tidak ada data untuk filter ini.</td></tr>
                    ) : summaryData.map((item, idx) => {
                      let dateBgStyle = {};
                      if (item.lastLogDate) {
                        if (item.statusColor === 'green') {
                          dateBgStyle = { backgroundColor: '#10b981', color: 'white', fontWeight: 'bold' };
                        } else if (item.statusColor === 'yellow') {
                          dateBgStyle = { backgroundColor: '#fef08a', color: '#854d0e', fontWeight: 'bold' };
                        } else if (item.statusColor === 'red') {
                          dateBgStyle = { backgroundColor: '#ef4444', color: 'white', fontWeight: 'bold' };
                        }
                      } else {
                        dateBgStyle = { backgroundColor: '#000000', color: 'white', fontWeight: 'semibold' };
                      }

                      return (
                        <React.Fragment key={item.plant}>
                          <tr className={`hover:bg-slate-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`}>
                            <td className="px-2.5 py-0.5 text-slate-600 text-left font-semibold">{item.wilayah}</td>
                            <td className="px-2.5 py-0.5 font-bold text-[#064e3b]">{item.plant}</td>
                            <td className="px-2.5 py-0.5 text-left font-semibold text-slate-700 uppercase">{item.desc}</td>
                            <td className="px-2 py-0.5 font-semibold text-slate-800">{item.vehicleCount}</td>
                            <td className="px-2 py-0.5 font-semibold text-slate-800">{item.hariKerja}</td>
                            <td className="px-2 py-0.5 font-semibold text-slate-800">{item.rencana}</td>
                            <td className="px-2 py-0.5 font-bold text-emerald-800 bg-emerald-50/30">{item.utdCount}</td>
                            <td className="px-2 py-0.5 font-bold text-red-800 bg-red-50/30">{item.tutdCount}</td>
                            <td className="px-2 py-0.5 font-extrabold text-slate-900">{item.totalTx}</td>
                            <td className="px-2 py-0.5 font-bold text-emerald-700 bg-emerald-50/40">{item.pctUtd.toFixed(2)}%</td>
                            <td className="px-2 py-0.5 font-bold text-red-700 bg-red-50/40">{item.pctTutd.toFixed(2)}%</td>
                            <td className="px-2 py-0.5 whitespace-nowrap" style={dateBgStyle}>
                              {item.lastLogDate ? format(new Date(item.lastLogDate + 'T00:00:00'), 'dd/MM/yyyy') : '-'}
                            </td>
                            <td className="px-2 py-0.5 font-black text-slate-800">{item.rank}</td>
                            <td className="px-2 py-0.5 no-print">
                              <button onClick={() => {
                                setSelectedPlant(item.plant);
                                setActiveTab('unit-checklist');
                                window.scrollTo(0, 0);
                              }}
                                className="text-[#064e3b] hover:text-[#065f46] transition"><Eye size={13} /></button>
                            </td>
                          </tr>

                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Legend matching Excel exactly */}
              <div className="mt-4 border-t border-slate-200 pt-3 flex flex-wrap gap-x-6 gap-y-2 items-center text-[11px] font-semibold text-slate-700">
                <span className="font-bold text-slate-800">Indikator :</span>
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-4 inline-block border border-slate-400" style={{ backgroundColor: '#10b981' }}></span>
                  <span>Inputan sesuai / lebih dari target</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-4 inline-block border border-slate-400" style={{ backgroundColor: '#fef08a' }}></span>
                  <span>Inputan terlambat &gt; 1 dan &lt; 3 hari</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-5 h-4 inline-block border border-slate-400" style={{ backgroundColor: '#ef4444' }}></span>
                  <span>Inputan terlambat &gt; 3 hari</span>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────── */}
        {/* TAB 3: Daftar Kendaraan                                    */}
        {/* ─────────────────────────────────────────────────────────── */}
        {activeTab === 'detail-veh' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                <input type="text" placeholder="Cari kode kendaraan, plant..." value={searchVehicle} onChange={e => setSearchVehicle(e.target.value)}
                  className="pl-9 pr-3 py-2 border border-slate-200 rounded-2xl text-xs w-64 focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30 focus:border-[#064e3b]" />
              </div>
              <p className="text-xs text-slate-400">{vehicleDetailData.length} kendaraan ditemukan</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                    <th className="px-3 py-3 text-left">Vehicle Code</th>
                    <th className="px-3 py-3 text-center">Plant</th>
                    <th className="px-3 py-3 text-left">Deskripsi Plant</th>
                    <th className="px-3 py-3 text-center">Tx. Aktif</th>
                    <th className="px-3 py-3 text-center">Dibatalkan</th>
                    <th className="px-3 py-3 text-center">Total Unit</th>
                    <th className="px-3 py-3 text-center">Total HM/KM</th>
                    <th className="px-3 py-3 text-left">Job Code</th>
                    <th className="px-3 py-3 text-left">Operator</th>
                    <th className="px-3 py-3 text-center">Last Input</th>
                    <th className="px-3 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vehicleDetailData.length === 0 ? (
                    <tr><td colSpan={11} className="py-16 text-center text-slate-400">Tidak ada data kendaraan.</td></tr>
                  ) : vehicleDetailData.map((v, idx) => (
                    <tr key={v.vehicle_code} className={`hover:bg-emerald-50/40 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                      <td className="px-3 py-2.5 font-bold text-slate-800 font-mono">{v.vehicle_code}</td>
                      <td className="px-3 py-2.5 text-center font-bold text-[#064e3b]">{v.plant}</td>
                      <td className="px-3 py-2.5 text-slate-600 whitespace-nowrap">{v.plantDesc}</td>
                      <td className="px-3 py-2.5 text-center font-bold text-slate-900">{v.totalTx}</td>
                      <td className="px-3 py-2.5 text-center">
                        {v.totalCancelled > 0 ? <span className="text-red-500 font-semibold">{v.totalCancelled}</span> : <span className="text-slate-300">0</span>}
                      </td>
                      <td className="px-3 py-2.5 text-center text-slate-600">
                        {v.totalUnit > 0 ? v.totalUnit.toLocaleString('id-ID', { maximumFractionDigits: 0 }) : '-'}
                      </td>
                      <td className="px-3 py-2.5 text-center text-slate-600">{v.totalHmKm > 0 ? v.totalHmKm.toFixed(2) : '-'}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {v.jobCodes.slice(0, 3).map(jc => (
                            <span key={jc} title={JOB_CODE_DESC[jc]} className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-mono text-[9px]">{jc}</span>
                          ))}
                          {v.jobCodes.length > 3 && <span className="text-slate-400 text-[9px]">+{v.jobCodes.length - 3}</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="flex flex-wrap gap-1">
                          {v.operators.slice(0, 2).map(op => (
                            <span key={op} className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-mono text-[9px]">{op}</span>
                          ))}
                          {v.operators.length > 2 && <span className="text-slate-400 text-[9px]">+{v.operators.length - 2}</span>}
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-center whitespace-nowrap text-slate-600">
                        {v.lastDate ? format(new Date(v.lastDate + 'T00:00:00'), 'dd/MM/yyyy') : '-'}
                      </td>
                      <td className="px-3 py-2.5 text-center"><StatusBadge status={v.statusColor} text={v.statusText} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────── */}
        {/* TAB 4: Log Transaksi Asli (Tabel Detail 31 Kolom)          */}
        {/* ─────────────────────────────────────────────────────────── */}
        {activeTab === 'log-raw' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 flex-wrap bg-slate-50/50">
              <div className="flex gap-2 flex-wrap items-center">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                  <input type="text" placeholder="Cari kendaraan, supir..." value={searchVehicle} onChange={e => { setSearchVehicle(e.target.value); setLogPage(1); }}
                    className="pl-9 pr-3 py-2 border border-slate-200 rounded-2xl text-xs w-52 focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30 focus:border-[#064e3b] bg-white" />
                </div>
                <select value={filterUoM} onChange={e => { setFilterUoM(e.target.value); setLogPage(1); }}
                  className="px-3 py-2 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30 focus:border-[#064e3b] bg-white">
                  {uomOptions.map(u => <option key={u} value={u}>{u === 'ALL' ? 'Semua UoM' : `${u} (${UOM_LABEL[u] || u})`}</option>)}
                </select>
                <select value={filterJobCode} onChange={e => { setFilterJobCode(e.target.value); setLogPage(1); }}
                  className="px-3 py-2 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30 focus:border-[#064e3b] bg-white">
                  {jobCodeOptions.map(jc => <option key={jc} value={jc}>{jc === 'ALL' ? 'Semua Pekerjaan (Job Code)' : `${jc} – ${JOB_CODE_DESC[jc] || jc}`}</option>)}
                </select>
                <button onClick={() => setShowCancelled(!showCancelled)}
                  className={`flex items-center gap-1.5 px-3 py-2 border rounded-2xl text-xs font-semibold transition ${showCancelled ? 'bg-red-50 border-red-200 text-red-600' : 'border-slate-200 text-slate-500 hover:bg-slate-50 bg-white'}`}>
                  <XCircle size={13} /> {showCancelled ? 'Sembunyikan Cancel' : 'Tampilkan Cancel'}
                </button>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 font-medium">{filteredLogs.length} transaksi</span>
                <button onClick={handleExportDetail}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-2xl text-xs font-semibold shadow-sm transition">
                  <FileDown size={14} /> Ekspor Detail
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-[11px] border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                    <th className="px-3 py-3 text-left whitespace-nowrap">Activity No.</th>
                    <th className="px-3 py-3 text-center whitespace-nowrap">Veh. Code</th>
                    <th className="px-3 py-3 text-center">Plant</th>
                    <th className="px-3 py-3 text-center">Tanggal</th>
                    <th className="px-3 py-3 text-center">Waktu</th>
                    <th className="px-3 py-3 text-center">Job Code</th>
                    <th className="px-3 py-3 text-center">HM/KM</th>
                    <th className="px-3 py-3 text-center">Unit</th>
                    <th className="px-3 py-3 text-center">UoM</th>
                    <th className="px-3 py-3 text-left">Reference</th>
                    <th className="px-3 py-3 text-center">Lokasi</th>
                    <th className="px-3 py-3 text-center">Operator</th>
                    <th className="px-3 py-3 text-center">Helper 1</th>
                    <th className="px-3 py-3 text-center">Alokasi</th>
                    <th className="px-3 py-3 text-center">Meas. Doc</th>
                    <th className="px-3 py-3 text-center">SPBS</th>
                    <th className="px-3 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {paginatedLogs.length === 0 ? (
                    <tr><td colSpan={17} className="py-16 text-center text-slate-400">Tidak ada transaksi untuk filter ini.</td></tr>
                  ) : paginatedLogs.map((l, idx) => (
                    <tr key={l.activity_number} className={`hover:bg-emerald-50/30 transition-colors ${l.cancelled ? 'opacity-50 bg-red-50/10' : ''} ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                      <td className="px-3 py-2 font-mono text-slate-600 whitespace-nowrap">{l.activity_number}</td>
                      <td className="px-3 py-2 font-mono font-bold text-[#064e3b] text-center whitespace-nowrap">{l.vehicle_code}</td>
                      <td className="px-3 py-2 text-center font-semibold text-slate-700">{l.plant}</td>
                      <td className="px-3 py-2 text-center whitespace-nowrap">{l.date ? format(new Date(l.date + 'T00:00:00'), 'dd/MM/yyyy') : '-'}</td>
                      <td className="px-3 py-2 text-center font-mono text-slate-500">{l.vehicle_time || '-'}</td>
                      <td className="px-3 py-2 text-center">
                        <span title={JOB_CODE_DESC[l.job_code]} className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-mono">{l.job_code || '-'}</span>
                      </td>
                      <td className="px-3 py-2 text-center font-bold text-slate-800">{l.hm_km > 0 ? l.hm_km : '-'}</td>
                      <td className="px-3 py-2 text-center font-semibold">{l.unit_value > 0 ? l.unit_value.toLocaleString('id-ID') : '-'}</td>
                      <td className="px-3 py-2 text-center">
                        <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{l.uom || '-'}</span>
                      </td>
                      <td className="px-3 py-2 text-slate-600 max-w-[160px] truncate" title={l.reference}>{l.reference || l.remarks || '-'}</td>
                      <td className="px-3 py-2 text-center font-mono text-slate-500">{l.location_code || '-'}</td>
                      <td className="px-3 py-2 text-center font-mono text-slate-600">{l.operator || '-'}</td>
                      <td className="px-3 py-2 text-center font-mono text-slate-500">{l.helper_1 && l.helper_1 !== '0' ? l.helper_1 : '-'}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${l.target_alokasi === 'FF' ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-600'}`}>
                          {l.target_alokasi || '-'}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center font-mono text-slate-500">{l.measurement_doc || '-'}</td>
                      <td className="px-3 py-2 text-center text-slate-500 max-w-[100px] truncate" title={l.spbs_number}>{l.spbs_number || '-'}</td>
                      <td className="px-3 py-2 text-center">
                        {l.cancelled
                          ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 border border-red-200 text-red-600 text-[9px] font-bold"><XCircle size={9} />Cancel</span>
                          : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[9px] font-bold"><CheckCircle size={9} />Aktif</span>
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="p-3 border-t border-slate-100 flex items-center justify-between bg-slate-50">
                <span className="text-xs text-slate-400">
                  Halaman {logPage} dari {totalPages} · {filteredLogs.length} transaksi
                </span>
                <div className="flex gap-1">
                  <button onClick={() => setLogPage(1)} disabled={logPage === 1}
                    className="px-3 py-1.5 rounded-2xl text-xs border border-slate-200 disabled:opacity-40 hover:bg-slate-200 bg-white">«</button>
                  <button onClick={() => setLogPage(p => Math.max(1, p - 1))} disabled={logPage === 1}
                    className="px-3 py-1.5 rounded-2xl text-xs border border-slate-200 disabled:opacity-40 hover:bg-slate-200 bg-white">‹</button>
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = Math.max(1, Math.min(logPage - 2 + i, totalPages - 4 + i));
                    return (
                      <button key={page} onClick={() => setLogPage(page)}
                        className={`px-3 py-1.5 rounded-2xl text-xs border ${logPage === page ? 'bg-[#064e3b] text-white border-[#064e3b]' : 'border-slate-200 hover:bg-slate-200 bg-white'}`}>
                        {page}
                      </button>
                    );
                  })}
                  <button onClick={() => setLogPage(p => Math.min(totalPages, p + 1))} disabled={logPage === totalPages}
                    className="px-3 py-1.5 rounded-2xl text-xs border border-slate-200 disabled:opacity-40 hover:bg-slate-200 bg-white">›</button>
                  <button onClick={() => setLogPage(totalPages)} disabled={logPage === totalPages}
                    className="px-3 py-1.5 rounded-2xl text-xs border border-slate-200 disabled:opacity-40 hover:bg-slate-200 bg-white">»</button>
                </div>
              </div>
        )}
      </div>
    )}

    {activeTab === 'zco-reconciliation' && (
      <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden max-w-[1150px] mx-auto w-full font-sans">
        <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 flex-wrap bg-slate-50/50 no-print">
          <div className="flex gap-2 flex-wrap items-center">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
              <input
                type="text"
                placeholder="Cari Cost Center / Unit..."
                value={searchVehicle}
                onChange={e => setSearchVehicle(e.target.value)}
                className="pl-9 pr-3 py-2 border border-slate-200 rounded-2xl text-xs w-56 focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30 focus:border-[#064e3b] bg-white"
              />
            </div>
            <select
              value={zcoWilayah}
              onChange={e => setZcoWilayah(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30 focus:border-[#064e3b] bg-white"
            >
              <option value="ALL">Semua Wilayah</option>
              <option value="Kalbar">Kalbar</option>
              <option value="Kaltim">Kaltim</option>
              <option value="Kalselteng">Kalselteng</option>
            </select>
            <select
              value={zcoFilterStatus}
              onChange={e => setZcoFilterStatus(e.target.value)}
              className="px-3 py-2 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30 focus:border-[#064e3b] bg-white font-semibold text-slate-700"
            >
              <option value="ALL">Semua Status</option>
              <option value="Cek">⚠️ Cek</option>
              <option value="Oke">🟢 Oke</option>
            </select>
            {zcoFilterStatus === 'Cek' && totalCekRows > 0 && (
              <div className="flex items-center gap-1.5 bg-red-50 border border-red-200 text-red-700 px-3 py-1.5 rounded-2xl text-[11px] font-bold shadow-sm">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                <span>Perlu Perbaikan: <strong className="text-xs font-extrabold">{totalCekRows}</strong></span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="text-[11px] text-slate-500 font-medium">
              Menampilkan <span className="font-bold text-slate-800">{filteredZCOData.length}</span> baris Cost Center
            </div>
            <button onClick={handlePrint}
              className="flex items-center gap-1.5 bg-[#064e3b] hover:bg-[#065f46] text-white px-3 py-2 rounded-xl text-xs font-bold shadow-sm transition">
              <Printer size={13} /> Cetak PDF
            </button>
            <button onClick={handleExportZCO}
              className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-800 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-sm transition">
              <FileDown size={13} /> Ekspor Excel
            </button>
          </div>
        </div>

        <div id="zco-report-sheet" className="p-4 bg-white">
          {/* Print Header (Only visible when printing) */}
          <div className="hidden print:block mb-4 border-b border-slate-300 pb-2">
            <h1 className="text-xs font-extrabold text-slate-900 tracking-wide text-center">
              VERIFIKASI & REKONSILIASI BIAYA KENDARAAN (ZCO_CCTR_01)
            </h1>
            <div className="text-[9px] text-slate-500 font-semibold text-center mt-1 flex justify-center gap-6">
              <span>Periode: {targetMonth}</span>
              <span>Tanggal Cek: {targetInputDate ? format(new Date(targetInputDate + 'T00:00:00'), 'dd/MM/yyyy') : '-'}</span>
            </div>
          </div>

          <div className="overflow-x-auto excel-cell-border">
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 text-slate-700 text-[10px] font-extrabold uppercase tracking-wider text-center">
                <th className="px-3 py-2 text-left w-[220px]">Cost Center</th>
                <th className="px-3 py-2 text-right">Cost (Biaya SAP)</th>
                <th className="px-3 py-2 text-right">Acty (SAP)</th>
                <th className="px-3 py-2 text-right">Rate (Tarif)</th>
                <th className="px-3 py-2 text-right text-[#064e3b] font-bold bg-emerald-50/50">Logbook (Acty)</th>
                <th className="px-3 py-2 text-left w-[150px]">Kebun / Unit</th>
                <th className="px-3 py-2 text-center w-[90px]">Cek Status</th>
                <th className="px-3 py-2 text-left w-[280px]">Indikator & Tindak Lanjut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredZCOData.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 font-semibold text-xs">
                    {zcoData.length === 0 
                      ? 'Belum ada data ZCO. Silakan upload file ZCO_CCTR_01.xlsx di atas.' 
                      : 'Tidak ada data biaya yang cocok dengan filter pencarian.'}
                  </td>
                </tr>
              ) : (
                filteredZCOData.map((row, idx) => {
                  const formattedCost = row.zcoCost > 0 
                    ? row.zcoCost.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) 
                    : '0';
                  const formattedActy = row.zcoActy > 0 
                    ? row.zcoActy.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
                    : '0,00';
                  const formattedRate = row.zcoRate > 0 
                    ? row.zcoRate.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
                    : '0,00';
                  const formattedLogAct = row.logActivity > 0 
                    ? row.logActivity.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
                    : '-';

                  // Dynamic row bg classes based on compliance status
                  let rowBgClass = 'bg-white hover:bg-slate-50';
                  if (row.statusColor === 'red') {
                    rowBgClass = 'bg-red-50/30 hover:bg-red-50/60 transition-colors';
                  } else if (row.statusColor === 'orange') {
                    rowBgClass = 'bg-orange-50/30 hover:bg-orange-50/60 transition-colors';
                  } else if (row.statusColor === 'yellow') {
                    rowBgClass = 'bg-amber-50/30 hover:bg-amber-50/60 transition-colors';
                  } else if (row.statusColor === 'grey') {
                    rowBgClass = 'bg-white hover:bg-slate-50/50 opacity-95';
                  }

                  return (
                    <tr 
                      key={`${row.costCenterCode}-${row.rawCostCenter || idx}`} 
                      className={`${rowBgClass} transition-colors`}
                    >
                      <td className="px-3 py-2 font-semibold text-slate-800 font-mono text-[11px] leading-tight">
                        {row.rawCostCenter}
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-slate-800 font-mono">
                        {formattedCost}
                      </td>
                      <td className="px-3 py-2 text-right font-medium text-slate-600 font-mono">
                        {formattedActy}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-500 font-mono">
                        {formattedRate}
                      </td>
                      <td className="px-3 py-2 text-right font-extrabold text-[#064e3b] bg-emerald-50/30 font-mono">
                        {formattedLogAct}
                      </td>
                      <td className="px-3 py-2 text-left">
                        <span className="font-bold text-slate-700 block">{row.plantCode}</span>
                        <span className="text-slate-500 text-[10px] block font-medium leading-tight">{row.plantDesc}</span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        {row.cekStatus === 'Cek' ? (
                          <span className="inline-flex items-center gap-1 bg-red-600 text-white px-2.5 py-0.5 rounded text-[10px] font-extrabold shadow-sm border border-red-700">
                            Cek
                          </span>
                        ) : row.statusColor === 'green' ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-500 text-white px-2.5 py-0.5 rounded text-[10px] font-extrabold shadow-sm border border-emerald-600">
                            Oke
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 text-slate-400 px-2.5 py-0.5 rounded text-[10px] font-bold">
                            -
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-left">
                        {row.statusColor === 'green' && (
                          <span className="text-emerald-600 font-semibold text-[11px] uppercase">{row.statusText}</span>
                        )}
                        {row.statusColor === 'red' && (
                          <span className="text-red-600 font-semibold text-[11.5px]">
                            {row.statusText}
                          </span>
                        )}
                        {row.statusColor === 'orange' && (
                          <span className="text-orange-500 font-semibold text-[11.5px]">
                            {row.statusText}
                          </span>
                        )}
                        {row.statusColor === 'yellow' && (
                          <span className="text-amber-500 font-semibold text-[11.5px]">
                            {row.statusText}
                          </span>
                        )}
                        {row.statusColor === 'grey' && (
                          <span className="text-slate-400 font-medium text-[10px] italic">{row.statusText}</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        </div>
      </div>
    )}

      {/* 🔥 Danger Zone (Regional only) 🔥 */}
      {isAdmin && (
        <div className="no-print">
          <button
            onClick={() => { setShowDangerZone(prev => !prev); setZestConfirmInput(''); setZcoConfirmInput(''); }}
            className={`flex items-center gap-2 text-xs font-bold px-4 py-2 rounded-xl border transition ${showDangerZone ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-200'}`}
          >
            <ShieldAlert size={14} />
            {showDangerZone ? 'Tutup Area Bahaya' : 'Kelola Penghapusan Data (Danger Zone)'}
          </button>

          {showDangerZone && (
            <div className="border border-red-200 bg-red-50/50 rounded-2xl p-5 space-y-4 mt-2">
              <div className="flex items-center gap-2 mb-1">
                <ShieldAlert size={16} className="text-red-600 shrink-0" />
                <p className="text-xs font-bold text-red-700 uppercase tracking-wide">⚠ Danger Zone — Tindakan Ini Tidak Dapat Dibatalkan</p>
              </div>
              <p className="text-[11px] text-red-600">Hapus data hanya jika Anda yakin. Ketikkan kata konfirmasi pada kolom di bawah untuk mengaktifkan tombol hapus.</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* ZEST Delete */}
                <div className="bg-white border border-red-100 rounded-xl p-4 space-y-3">
                  <div>
                    <p className="text-xs font-bold text-slate-800">Hapus Data Logbook (ZESTHLP16PA)</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Menghapus semua {vehicles.length} baris data transaksi kendaraan bulan {targetMonth}.</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Ketik <span className="text-red-600 font-extrabold">HAPUS</span> untuk konfirmasi:</label>
                    <input
                      type="text"
                      value={zestConfirmInput}
                      onChange={e => setZestConfirmInput(e.target.value)}
                      placeholder="Ketik HAPUS"
                      className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-red-300"
                    />
                  </div>
                  <button
                    onClick={() => { handleClearData(); setZestConfirmInput(''); setShowDangerZone(false); }}
                    disabled={zestConfirmInput !== 'HAPUS' || loading || vehicles.length === 0}
                    className="w-full flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-xl font-bold text-xs shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <Trash2 size={13} /> Hapus Semua Data Logbook
                  </button>
                </div>

                {/* ZCO Delete */}
                <div className="bg-white border border-orange-100 rounded-xl p-4 space-y-3">
                  <div>
                    <p className="text-xs font-bold text-slate-800">Hapus Data ZCO_CCTR_01</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Menghapus semua {zcoData.length} baris data rekonsiliasi biaya ZCO bulan {targetMonth}.</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wide">Ketik <span className="text-orange-600 font-extrabold">HAPUS ZCO</span> untuk konfirmasi:</label>
                    <input
                      type="text"
                      value={zcoConfirmInput}
                      onChange={e => setZcoConfirmInput(e.target.value)}
                      placeholder="Ketik HAPUS ZCO"
                      className="mt-1 w-full px-3 py-2 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-orange-300"
                    />
                  </div>
                  <button
                    onClick={() => { handleClearZCOData(); setZcoConfirmInput(''); setShowDangerZone(false); }}
                    disabled={zcoConfirmInput !== 'HAPUS ZCO' || loading || zcoData.length === 0}
                    className="w-full flex items-center justify-center gap-1.5 bg-orange-600 hover:bg-orange-700 text-white px-3 py-2 rounded-xl font-bold text-xs shadow-sm disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <Trash2 size={13} /> Hapus Semua Data ZCO
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

        <WhatsAppSenderModal 
          isOpen={showWAModal} 
          onClose={() => setShowWAModal(false)} 
          summaryData={summaryData} 
          targetInputDate={targetInputDate} 
        />
      </div>
    </div>
  );
}
