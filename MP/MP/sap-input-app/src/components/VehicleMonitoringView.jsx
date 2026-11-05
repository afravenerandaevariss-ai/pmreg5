import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { format, differenceInCalendarDays, eachDayOfInterval, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { id } from 'date-fns/locale';
import {
  Upload, FileSpreadsheet, Download, RefreshCw, Trash2, Search,
  CheckCircle, AlertCircle, AlertTriangle, ChevronDown, ChevronUp,
  Filter, BarChart2, Layers, TrendingUp, Activity, Truck, Calendar,
  XCircle, Info, Eye, EyeOff, FileDown, Check, X, ArrowRight,
  Copy, Printer, Coins, ShieldAlert, Send, Lock, Clock, MessageSquare,
  Fuel, Gauge, Droplet, ArrowUpRight, ArrowDownRight
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { toPng } from 'html-to-image';
import { fetchVehicleMaster, fetchVehicleLogs, saveVehicleData, invalidateVehicleCache, fetchMasterEquipment, fetchZCOData, saveZCOData, getSystemConfig, fetchDailyLogs, fetchFuelData, saveFuelData, fetchFuelDailyForMonth, saveFuelDailyForMonth, makeFuelTxKey } from '../lib/supabaseService';
import WhatsAppSenderModal from './WhatsAppSenderModal';

// â”€â”€â”€ Plant Master Data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ Job Code Master â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

// â”€â”€â”€ UoM Labels â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const UOM_LABEL = { KG: "Kilogram", KM: "Kilometer", HM: "Jam Operasi", M: "Meter", HA: "Hektar", M3: "Meter Kubik", HK: "Hari Kerja" };

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function excelSerialToDate(serial) {
  const utcDays = Math.floor(serial - 25569);
  const dateInfo = new Date(utcDays * 86400 * 1000);
  return new Date(dateInfo.getUTCFullYear(), dateInfo.getUTCMonth(), dateInfo.getUTCDate());
}

function formatDateStr(rawDate) {
  if (rawDate === undefined || rawDate === null || rawDate === '') return null;
  // If numeric or numeric string representing Excel serial days (e.g. 46296)
  if (typeof rawDate === 'number' || (!isNaN(rawDate) && !isNaN(parseFloat(rawDate)) && isFinite(rawDate) && Number(rawDate) > 20000 && Number(rawDate) < 70000)) {
    const num = Number(rawDate);
    const d = excelSerialToDate(num);
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
  if (rawTime === undefined || rawTime === null || rawTime === '') return '-';
  const num = typeof rawTime === 'number' ? rawTime : (typeof rawTime === 'string' && !isNaN(rawTime) && isFinite(rawTime) && rawTime.includes('.') ? parseFloat(rawTime) : null);
  if (num !== null && num >= 0 && num <= 1) {
    const totalSec = Math.round(num * 86400);
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

// â”€â”€â”€ WA Schedule Badge â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function WAScheduleBadge({ onOpen }) {
  const [countdown, setCountdown] = React.useState('');
  const [nextLabel, setNextLabel] = React.useState('');
  const [isActive, setIsActive] = React.useState(false);

  React.useEffect(() => {
    const SCHEDULE_TIMES = [
      { h: 7,  m: 0,  label: '07:00 WIB' },
      { h: 8,  m: 0,  label: '08:00 WIB' },
      { h: 14, m: 0,  label: '14:00 WIB' },
      { h: 16, m: 0,  label: '16:00 WIB' },
    ];

    const tick = () => {
      const now = new Date();
      // Convert to WIB (UTC+7)
      const wib = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
      const currentH = wib.getHours();
      const currentM = wib.getMinutes();
      const currentTotalMin = currentH * 60 + currentM;

      let nextTime = null;
      for (const t of SCHEDULE_TIMES) {
        const tTotal = t.h * 60 + t.m;
        if (tTotal > currentTotalMin) {
          nextTime = t;
          break;
        }
      }
      // If past all times today, next is first schedule tomorrow
      if (!nextTime) nextTime = SCHEDULE_TIMES[0];

      const nextTotalMin = nextTime.h * 60 + nextTime.m;
      let diffMin = nextTotalMin - currentTotalMin;
      if (diffMin < 0) diffMin += 24 * 60; // wrap to next day

      const diffSec = diffMin * 60 - wib.getSeconds();
      const h = Math.floor(diffSec / 3600);
      const m = Math.floor((diffSec % 3600) / 60);
      const s = diffSec % 60;

      // "Active" = within 5 min of scheduled time
      setIsActive(diffMin <= 5 && diffMin >= 0);
      setNextLabel(nextTime.label);
      setCountdown(
        h > 0
          ? `${h}j ${String(m).padStart(2,'0')}m`
          : `${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}d`
      );
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <button
      onClick={onOpen}
      title="Klik untuk buka Pengaturan WA Otomatis"
      className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition shadow-sm ${
        isActive
          ? 'bg-emerald-50 border-emerald-400 text-emerald-800 animate-pulse'
          : 'bg-slate-50 border-slate-300 text-slate-700 hover:bg-emerald-50 hover:border-emerald-400 hover:text-emerald-800'
      }`}
    >
      <MessageSquare size={13} className={isActive ? 'text-emerald-600' : 'text-slate-500'} />
      <span className="hidden sm:inline">WA Auto-Send:</span>
      <span className={`font-extrabold ${isActive ? 'text-emerald-700' : 'text-slate-800'}`}>
        {nextLabel}
      </span>
      <span className={`font-mono text-[11px] px-1.5 py-0.5 rounded-lg ${
        isActive ? 'bg-emerald-200 text-emerald-900' : 'bg-slate-200 text-slate-600'
      }`}>
        {isActive ? 'ðŸŸ¢ Segera!' : countdown}
      </span>
      <Clock size={11} className="text-slate-400" />
    </button>
  );
}

// â”€â”€â”€ Main Component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function VehicleMonitoringView({ currentUser, screenshotMode }) {
  // Dev-only check: strictly true in local dev / localhost only
  const isLocalDev = Boolean(
    import.meta.env.DEV || 
    (typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname))
  );

  // â”€â”€â”€ Role Detection â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // Normalize role string â€” handles all DB variants: 'USER','Unit','unit','UNIT'
  const roleUpper = currentUser?.role?.toUpperCase() || '';

  // Strictly role DEV only (ADMIN and USER are both hidden)
  const isDevUser = roleUpper === 'DEV';

  // Explicit USER/UNIT check â€” blocks regardless of plant value
  const isUserRole = roleUpper === 'USER' || roleUpper === 'UNIT';

  // ADMIN if: role is Admin/ADMIN/REGIONAL/DEV OR plant is ALL/5R00
  // BUT never admin if explicitly USER or UNIT role
  const isAdmin = !isUserRole && (isDevUser || (currentUser && (
    currentUser.role === 'Admin' ||
    roleUpper === 'ADMIN' ||
    roleUpper === 'REGIONAL' ||
    currentUser.plant === '5R00' ||
    currentUser.plant === 'ALL'
  )));


  const today = new Date();
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null;
  const [targetMonth, setTargetMonth]           = useState(() => searchParams?.get('month') || format(today, 'yyyy-MM'));
  const [targetInputDate, setTargetInputDate]   = useState(() => searchParams?.get('targetDate') || format(today, 'yyyy-MM-dd'));
  const [targetWorkingDays, setTargetWorkingDays] = useState(20);

  const [vehicles, setVehicles] = useState([]);
  const [logs, setLogs]         = useState([]);
  const [masterEquipments, setMasterEquipments] = useState([]);
  const [masterMap, setMasterMap]           = useState(new Map());
  const [zcoData, setZcoData]                   = useState([]);
  const [zcoUploadInfo, setZcoUploadInfo]       = useState(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const [debugMapStr, setDebugMapStr] = useState('');
  const [uploadInfo, setUploadInfo] = useState(null);
  const [isSavingImage, setIsSavingImage] = useState(false);
  const [dataReady, setDataReady] = useState(false);

  // View control - Unit users default to unit-checklist
  const [activeTab, setActiveTab]           = useState(() => isAdmin ? 'summary-regional' : 'unit-checklist');
  const [selectedWilayah, setSelectedWilayah] = useState('ALL');
  const [searchPlant, setSearchPlant]       = useState('');
  const [searchVehicle, setSearchVehicle]   = useState('');
  const [searchZco, setSearchZco]           = useState('');

  // Pagination for Unit Checklist and Daftar Kendaraan
  const [unitPage, setUnitPage]             = useState(1);
  const [vehPage, setVehPage]               = useState(1);
  const [zcoPage, setZcoPage]               = useState(1);
  
  // Plant selected for Unit Checklist tab - strictly locked to user plant if not Admin
  const [selectedPlant, setSelectedPlant]   = useState(() => {
    return (currentUser && !isAdmin && currentUser.plant) ? currentUser.plant : '5E08';
  });

  // Effective plant: non-admins are permanently locked to their assigned plant
  const effectivePlant = (!isAdmin && currentUser?.plant && currentUser.plant !== 'ALL' && currentUser.plant !== '5R00')
    ? currentUser.plant
    : selectedPlant;


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

  const [lastRefreshed, setLastRefreshed] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(''); // granular status during upload

  // â”€â”€ Fuel Evaluation State (Simplified & Unified) â”€â”€
  const [fuelData, setFuelData] = useState({ summaries: [], daily: [] });
  const [fuelUploadInfo, setFuelUploadInfo] = useState(null);
  const [fuelYear, setFuelYear] = useState('2026');
  const [fuelMonth, setFuelMonth] = useState('09');
  const [fuelDate, setFuelDate] = useState('');
  const [fuelPlant, setFuelPlant] = useState('ALL');
  const [searchFuel, setSearchFuel] = useState('');
  // Track which months have been lazy-loaded from per-month storage (IDs 230101-230112)
  const fuelLoadedMonthsRef = React.useRef(new Set());
  const [fuelPage, setFuelPage] = useState(1);
  const [selectedFuelVeh, setSelectedFuelVeh] = useState(null);
  const [fuelModalTab, setFuelModalTab] = useState('zest'); // 'zest' | 'debit' | 'credit'
  const FUEL_PAGE_SIZE = 25;

  // â”€â”€ Load Data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // isManualRefresh: true  â†’ tombol Refresh diklik, force-fetch vehicle_logs & master_map dari server
  //                  false â†’ initial load, prioritaskan cache dulu agar cepat
  const loadData = useCallback(async (isManualRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      // vehicle_logs (2.2k+ rows, 2 halaman PostgREST) butuh ~19s di PROD.
      // Timeout 15s membuat fallback {data:[]} menang balapan â†’ seluruh transaksi tampil 0.
      const TIMEOUT_MS = 90000;
      const withTimeout = (promise, fallback = { data: [], error: null }) =>
        Promise.race([
          promise,
          new Promise(resolve => setTimeout(() => resolve(fallback), TIMEOUT_MS))
        ]);

      // vehicle_logs â†’ selalu force-fetch saat manual refresh (transaksi aktif berubah sering)
      // vehicle_master, zco â†’ force saat manual refresh
      // masterEquipment â†’ cukup cache (jarang berubah, data besar)
      const [vRes, lRes, eqRes, zRes, mapRes, fRes] = await Promise.all([
        withTimeout(fetchVehicleMaster(isManualRefresh),            { data: [], error: null }),
        withTimeout(fetchVehicleLogs(isManualRefresh),              { data: [], error: null }),
        withTimeout(fetchMasterEquipment(),                         { data: [], error: null }),
        withTimeout(fetchZCOData(isManualRefresh),                  { data: [], error: null }),
        withTimeout(getSystemConfig('master_map', isManualRefresh), { data: null, error: null }),
        withTimeout(fetchFuelData(isManualRefresh),                 { data: { summaries: [], daily: [] }, error: null }),
      ]);

      setVehicles(vRes.data || []);
      setLogs(lRes.data || []);
      setMasterEquipments(eqRes.data || []);
      setZcoData(zRes.data || []);
      setFuelData(fRes?.data || { summaries: [], daily: [] });

      if (mapRes) {
        if (Array.isArray(mapRes)) {
          setMasterMap(new Map(mapRes));
        } else if (mapRes.data && Array.isArray(mapRes.data)) {
          setMasterMap(new Map(mapRes.data));
        } else if (mapRes.data?.map && Array.isArray(mapRes.data.map)) {
          setMasterMap(new Map(mapRes.data.map));
        } else {
          setMasterMap(new Map());
        }
      } else {
        setMasterMap(new Map());
      }
      setLastRefreshed(new Date());
      // Restore persistent upload notification if present and data was loaded
      if (!isManualRefresh) {
        try {
          const stored = sessionStorage.getItem('vehicle_upload_info');
          if (stored) {
            const parsed = JSON.parse(stored);
            // Only restore if uploaded in the last 24 hours
            if (parsed?.uploadedAt && (Date.now() - new Date(parsed.uploadedAt).getTime()) < 86400000) {
              setUploadInfo(parsed);
            } else {
              sessionStorage.removeItem('vehicle_upload_info');
            }
          }
        } catch (e) {}
      }
    } catch (e) {
      console.warn('Vehicle load data warning:', e);
    } finally {
      if (screenshotMode) {
        setTimeout(() => {
          setLoading(false);
          setDataReady(true);
        }, 500);
      } else {
        setLoading(false);
      }
    }
  }, [screenshotMode]);

  useEffect(() => { loadData(false); }, [loadData]);


  // Strictly lock selectedPlant to user's plant for non-admins
  useEffect(() => {
    if (!isAdmin && currentUser?.plant && currentUser.plant !== 'ALL' && currentUser.plant !== '5R00') {
      setSelectedPlant(currentUser.plant);
    }
  }, [currentUser?.plant, isAdmin]);

  // Auto-refresh every 5 minutes for USER role (no manual Refresh button shown to them)
  useEffect(() => {
    if (isUserRole) {
      const interval = setInterval(() => loadData(true), 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [isUserRole, loadData]);

  // Lock activeTab to allowed tabs based on role
  // USER: can see unit-checklist, summary-regional, log-raw, zco-reconciliation (filtered by their plant)
  // ADMIN/DEV: can see all tabs
  useEffect(() => {
    const allowedUserTabs = ['unit-checklist', 'summary-regional', 'log-raw', 'zco-reconciliation', 'fuel-evaluation'];
    if (!isAdmin && !allowedUserTabs.includes(activeTab)) {
      setActiveTab('unit-checklist');
    }
  }, [isAdmin, activeTab]);


  // â”€â”€ Excel Upload â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    setUploadInfo(null);
    setUploadProgress('Membaca file Excel...');

    const reader = new FileReader();
    reader.onload = async (evt) => {
      // Yield to browser so the loading spinner renders before the heavy parse
      await new Promise(resolve => setTimeout(resolve, 50));
      try {
        setUploadProgress('Memproses data baris...');
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
        // Priority 1: exact match (case-insensitive), Priority 2: partial substring
        const col = (patterns) => {
          const exact = headers.find(h => patterns.some(p => h.trim().toLowerCase() === p.trim().toLowerCase()));
          if (exact) return exact;
          return headers.find(h => patterns.some(p => h.toLowerCase().includes(p.toLowerCase())));
        };
        
        const ACT_NUM   = col(['Vehicle Actvity Number', 'Vehicle Activity Number', 'Actvity Number', 'Activity Number', 'Vehicle Actvity']);
        const VEH_CODE  = col(['Vehicle Code', 'Vehicle code', 'Vehicle']);
        const VEH_DATE  = col(['Vehicle Date', 'Vehicle date', 'Posting Date', 'Date']);
        const VEH_TIME  = col(['Vehicle Time', 'Vehicle time', 'Time']);
        const PLANT_COL = col(['Plant']);
        const JOB_CODE  = col(['Job Code', 'Job code', 'Job']);
        const HM_KM     = col(['HM/KM', 'HM_KM', 'HM / KM', 'Total HM/KM', 'HM', 'KM']);
        const UNIT_VAL  = col(['Unit', 'Hasil Kerja']);
        const UOM       = col(['UoM', 'UOM', 'Satuan', 'Unit of Measure']);
        const OPERATOR  = col(['Operator', 'Driver']);
        const HELPER1   = col(['Helper 1', 'Helper1']);
        const HELPER2   = col(['Helper 2', 'Helper2']);
        const REFERENCE = col(['Reference', 'Referensi', 'Ref']);
        const REMARKS   = col(['Remarks', 'Keterangan', 'Catatan']);
        const CANCELLED = col(['Cancelled/Reversed', 'Cancelled', 'Reversed', 'Cancel', 'Batal']);
        const LOC_CODE  = col(['Location Code', 'Location code', 'Location', 'Lokasi']);
        const MEAS_DOC  = col(['Measurement document', 'Measurement Document', 'Meas Doc', 'Meas']);
        const DOC_NUM   = col(['Document Number', 'Doc Number', 'Nomor Dokumen']);
        const SPBS_NUM  = col(['Nomor SPBS', 'SPBS']);
        const TGL_ANGKUT = col(['Tgl Angkut', 'Tgl. Angkut', 'Tanggal Angkut']);
        const ANTAR_KEBUN = col(['Antar Kebun', 'Antar kebun']);
        const DEST_PLANT = col(['Destination Plant', 'Dest Plant']);
        const ALOKASI    = col(['Target Alokasi Biaya', 'Target Alokasi', 'Alokasi Biaya', 'Alokasi']);
        const COMPANY    = col(['Company Code', 'Company code', 'Company']);
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
          // Use rawActNum as-is (no row-index suffix) so upsert by activity_number is idempotent.
          // For rows without an SAP activity number, generate a deterministic key from
          // plant + vehicleCode + date + jobCode + vehTime so re-uploading the same file
          // produces the same key and updates instead of inserting duplicate rows.
          const actNum        = rawActNum
            ? rawActNum
            : `VEH-${plant}-${vehCode}-${dateStr}-${jobCode || 'NOJOB'}-${vehTime || '00:00'}`;
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

        // Update UI immediately from parsed data (no DB re-fetch needed)
        setVehicles(finalVehicles);
        setLogs(finalLogs);

        // Save to DB in background â€” UI already shows data
        setUploadProgress(`Menyimpan ${finalLogs.length} transaksi ke server...`);
        const { data: saveRes, error: saveErr } = await saveVehicleData(finalVehicles, finalLogs);
        if (saveErr) {
          const errMsg = saveErr.message || (typeof saveErr === 'string' ? saveErr : JSON.stringify(saveErr));
          throw new Error(errMsg);
        }
        if (saveRes?.vehicles && saveRes?.logs) {
          setVehicles(saveRes.vehicles);
          setLogs(saveRes.logs);
        }
        // Bust vehicle caches again after successful write so next loadData always hits DB
        invalidateVehicleCache();

        setUploadProgress('');
        const newUploadInfo = {
          processed,
          skipped,
          cancelled,
          plants: uniquePlants.size,
          jobCodes: uniqueJobCodes.size,
          file: file.name,
          uploadedAt: new Date().toISOString(),
        };
        setUploadInfo(newUploadInfo);
        try { sessionStorage.setItem('vehicle_upload_info', JSON.stringify(newUploadInfo)); } catch (e) {}

      } catch (err) {
        console.error(err);
        setUploadProgress('');
        let msg = err.message || 'Gagal menyimpan ke server database';
        if (msg.includes('schema cache') || msg.includes('vehicle_master')) {
          msg += ' (Versi cache browser terdeteksi lama. Silakan tekan Ctrl+F5 untuk hard refresh).';
        }
        setError('Error memproses file: ' + msg);
      } finally {
        setLoading(false);
        e.target.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  // â”€â”€ Clear Data â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleClearData = async () => {
    setLoading(true);
    try {
      await saveVehicleData([], []);
      setVehicles([]); setLogs([]); setUploadInfo(null);
      try { sessionStorage.removeItem('vehicle_upload_info'); } catch (e) {}
    } catch (e) { alert('Gagal: ' + e.message); }
    finally { setLoading(false); }
  };

  // â”€â”€ ZCO Upload & Clear â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
          if (!rawCC ||
              rawCC.toLowerCase().startsWith('total') ||
              rawCC.toLowerCase().startsWith('logbook distrik') ||
              rawCC.toLowerCase().startsWith('grand total') ||
              rawCC.toLowerCase().startsWith('plant') ||        // filter "PLANT 5Exx LOG RATE" subtotals dari SAP
              rawCC.toLowerCase() === 'cost center'             // filter baris grand total SAP yang memakai label header
          ) continue;

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
        if (saveErr) {
          const errMsg = saveErr.message || (typeof saveErr === 'string' ? saveErr : JSON.stringify(saveErr));
          throw new Error(errMsg);
        }

        setZcoData(zcoList);
        setZcoUploadInfo({
          processed: zcoList.length,
          file: file.name,
        });
      } catch (err) {
        console.error(err);
        setError('Error memproses file ZCO: ' + (err.message || 'Gagal menyimpan ke server database'));
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

  // â”€â”€ Fuel Evaluation (SALRD & SLARC) Upload & Clear â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  // ── Fuel Evaluation (SALRD & SLARC) Upload & Clear ────────────────────────────
  const handleFuelUploadByMode = (e, uploadType = 'all') => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true);
    setError(null);
    setFuelUploadInfo(null);
    const typeLabel = uploadType === 'salrd' ? 'SALRD (Debit BBM)' : uploadType === 'slarc' ? 'SLARC (Credit BBM)' : 'BBM (SALRD/SLARC)';
    setUploadProgress(`Membaca file Excel ${typeLabel}...`);

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        setUploadProgress('Menganalisis lembar kerja...');
        const data = new Uint8Array(evt.target.result);
        const workbook = XLSX.read(data, { type: 'array' });

        const eqMap = {};
        if (Array.isArray(masterEquipments)) {
          masterEquipments.forEach(m => {
            const cc = String(m.cost_center || m.costCenter || '').trim();
            if (cc) eqMap[cc] = { equipment: m.equipment || '', description: m.description || '', plant: m.plant || '', objectType: m.object_type || m.objectType || '' };
          });
        }
        (fuelData.summaries || []).forEach(s => {
          const cc = String(s.costCenter || '').trim();
          if (cc && !eqMap[cc]) {
            eqMap[cc] = { equipment: s.equipment || '', description: s.description || '', plant: s.plant || '', objectType: s.objectType || '' };
          }
        });

        const ih08SheetName = workbook.SheetNames.find(s => s.toLowerCase().includes('ih08') || s.toLowerCase().includes('equip'));
        if (ih08SheetName) {
          const ws = workbook.Sheets[ih08SheetName];
          const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
          rows.forEach(r => {
            const cc = String(r['Cost Center'] || r['CostCenter'] || r['Pusat Biaya'] || '').trim();
            const eq = String(r['Equipment'] || r['No. Equipment'] || '').trim();
            const desc = String(r['Description'] || r['Deskripsi Kendaraan'] || r['Description of technical object'] || '').trim();
            const plant = String(r['MaintPlant'] || r['Plant'] || '').trim();
            const objType = String(r['Object type'] || r['ObjectType'] || '').trim();
            if (cc) {
              eqMap[cc] = { equipment: eq, description: desc, plant, objectType: objType };
            }
          });
        }

        const parseDateVal = (raw) => {
          if (!raw) return null;
          if (typeof raw === 'number' || (!isNaN(raw) && Number(raw) > 30000 && Number(raw) < 60000)) {
            const d = excelSerialToDate(Number(raw));
            return format(d, 'yyyy-MM-dd');
          }
          const s = String(raw).trim();
          if (s.match(/^\d{4}-\d{2}-\d{2}/)) return s.substring(0, 10);
          if (s.match(/^\d{2}\.\d{2}\.\d{4}/)) {
            const parts = s.split('.');
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
          }
          if (s.match(/^\d{2}\/\d{2}\/\d{4}/)) {
            const parts = s.split('/');
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
          }
          return null;
        };

        const newDaily = [];
        let debitRowsCount = 0;
        let creditRowsCount = 0;

        const debitSheetName = workbook.SheetNames.find(s => s.toLowerCase().includes('debit') || s.toLowerCase().includes('salrd'));
        const creditSheetName = workbook.SheetNames.find(s => s.toLowerCase().includes('credit') || s.toLowerCase().includes('slarc'));

        // 1. Process SALRD / Debit transactions
        if (uploadType === 'salrd' || uploadType === 'all') {
          setUploadProgress('Memproses transaksi SALRD (Debit Solar)...');
          const targetDebitSheet = debitSheetName
            || (uploadType === 'salrd' ? workbook.SheetNames.find(s => !s.toLowerCase().includes('ih08') && !s.toLowerCase().includes('equip')) : null)
            || (uploadType === 'salrd' ? workbook.SheetNames[0] : null);

          if (targetDebitSheet && workbook.Sheets[targetDebitSheet]) {
            const rows = XLSX.utils.sheet_to_json(workbook.Sheets[targetDebitSheet], { defval: '' });
            for (const r of rows) {
              const ce = String(r['Cost Element'] || r['CostElement'] || '').trim();
              const uom = String(r['Posted unit of meas.'] || r['Unit of Measure'] || r['UoM'] || '').trim().toUpperCase();
              if (ce !== '51100057' && uom !== 'L') continue;

              const cc = String(r['Cost Center'] || r['CostCenter'] || r['Pusat Biaya'] || '').trim();
              if (!cc) continue;

              const rawDate = r['Posting Date'] || r['Document Date'] || r['Date'];
              const dateStr = parseDateVal(rawDate);
              const period = String(r['Period'] || '').trim();
              const year = dateStr ? dateStr.substring(0, 4) : '2026';
              const monthStr = dateStr ? dateStr.substring(0, 7) : (period ? `${year}-${period.padStart(2, '0')}` : (targetMonth || '2026-08'));

              const liters = parseFloat(r['Total quantity'] || r['Qty'] || 0) || 0;
              const rupiah = parseFloat(r['Value in Obj. Crcy'] || r['Val.in rep.cur.'] || r['Cost'] || 0) || 0;
              const doc = String(r['Document Number'] || r['Doc Number'] || '').trim();
              const name = String(r['Name'] || r['CO Object Name'] || r['Text'] || '').trim();
              const plant = String(r['Plant'] || cc.substring(0, 4) || '').trim();

              debitRowsCount++;
              newDaily.push({
                c: cc,
                d: dateStr || `${monthStr}-01`,
                m: monthStr,
                t: 'D',
                q: liters,
                u: 'L',
                r: rupiah,
                doc,
                n: name,
                p: plant
              });
            }
          }
        }

        // 2. Process SLARC / Credit transactions
        if (uploadType === 'slarc' || uploadType === 'all') {
          setUploadProgress('Memproses transaksi SLARC (Credit KM/HM)...');
          const targetCreditSheet = creditSheetName
            || (uploadType === 'slarc' ? workbook.SheetNames.find(s => !s.toLowerCase().includes('ih08') && !s.toLowerCase().includes('equip')) : null)
            || (uploadType === 'slarc' ? workbook.SheetNames[0] : null);

          if (targetCreditSheet && workbook.Sheets[targetCreditSheet]) {
            const rows = XLSX.utils.sheet_to_json(workbook.Sheets[targetCreditSheet], { defval: '' });
            for (const r of rows) {
              const ce = String(r['Cost Element'] || r['CostElement'] || '').trim();
              const uom = String(r['Posted unit of meas.'] || r['Unit of Measure'] || r['UoM'] || '').trim().toUpperCase();
              const isKm = ce === '90043002' || uom === 'KM';
              const isHm = ce === '90043003' || uom === 'HR' || uom === 'HM';
              if (!isKm && !isHm) continue;

              const cc = String(r['Cost Center'] || r['CostCenter'] || r['Pusat Biaya'] || '').trim();
              if (!cc) continue;

              const rawDate = r['Posting Date'] || r['Document Date'] || r['Date'];
              const dateStr = parseDateVal(rawDate);
              const period = String(r['Period'] || '').trim();
              const year = dateStr ? dateStr.substring(0, 4) : '2026';
              const monthStr = dateStr ? dateStr.substring(0, 7) : (period ? `${year}-${period.padStart(2, '0')}` : (targetMonth || '2026-08'));

              const qty = parseFloat(r['Total quantity'] || r['Qty'] || 0) || 0;
              const doc = String(r['Document Number'] || r['Doc Number'] || '').trim();
              const name = String(r['Name'] || r['CO Object Name'] || r['Text'] || '').trim();
              const plant = String(r['Plant'] || cc.substring(0, 4) || '').trim();

              creditRowsCount++;
              newDaily.push({
                c: cc,
                d: dateStr || `${monthStr}-01`,
                m: monthStr,
                t: 'C',
                q: qty,
                u: isKm ? 'KM' : 'HM',
                r: 0,
                doc,
                n: name,
                p: plant
              });
            }
          }
        }

        // 3. Fallback for single-sheet when 'all' mode
        if (uploadType === 'all' && !debitSheetName && !creditSheetName) {
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          if (firstSheet) {
            const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
            for (const r of rows) {
              const cc = String(r['Cost Center'] || r['CostCenter'] || '').trim();
              if (!cc) continue;
              const ce = String(r['Cost Element'] || '').trim();
              const uom = String(r['Posted unit of meas.'] || r['Unit of Measure'] || r['UoM'] || '').trim().toUpperCase();
              const rawDate = r['Posting Date'] || r['Document Date'] || r['Date'];
              const dateStr = parseDateVal(rawDate);
              const period = String(r['Period'] || '').trim();
              const year = dateStr ? dateStr.substring(0, 4) : '2026';
              const monthStr = dateStr ? dateStr.substring(0, 7) : (period ? `${year}-${period.padStart(2, '0')}` : (targetMonth || '2026-08'));
              const qty = parseFloat(r['Total quantity'] || r['Qty'] || 0) || 0;
              const rupiah = parseFloat(r['Value in Obj. Crcy'] || r['Val.in rep.cur.'] || r['Cost'] || 0) || 0;
              const doc = String(r['Document Number'] || r['Doc Number'] || '').trim();
              const name = String(r['Name'] || r['CO Object Name'] || r['Text'] || '').trim();
              const plant = String(r['Plant'] || cc.substring(0, 4) || '').trim();

              if (ce === '51100057' || uom === 'L') {
                debitRowsCount++;
                newDaily.push({ c: cc, d: dateStr || `${monthStr}-01`, m: monthStr, t: 'D', q: qty, u: 'L', r: rupiah, doc, n: name, p: plant });
              } else if (ce === '90043002' || uom === 'KM') {
                creditRowsCount++;
                newDaily.push({ c: cc, d: dateStr || `${monthStr}-01`, m: monthStr, t: 'C', q: qty, u: 'KM', r: 0, doc, n: name, p: plant });
              } else if (ce === '90043003' || uom === 'HR' || uom === 'HM') {
                creditRowsCount++;
                newDaily.push({ c: cc, d: dateStr || `${monthStr}-01`, m: monthStr, t: 'C', q: qty, u: 'HM', r: 0, doc, n: name, p: plant });
              }
            }
          }
        }

        const totalProcessedRows = debitRowsCount + creditRowsCount;
        if (totalProcessedRows === 0) {
          throw new Error(
            uploadType === 'salrd'
              ? 'Tidak ditemukan baris transaksi SALRD (Debit) dengan Cost Element 51100057 atau Unit "L".'
              : uploadType === 'slarc'
              ? 'Tidak ditemukan baris transaksi SLARC (Credit) dengan Cost Element 90043002/90043003 atau Unit "KM"/"HM".'
              : 'Tidak ditemukan transaksi SALRD maupun SLARC yang valid dalam file Excel ini.'
          );
        }

        setUploadProgress('Menyinkronkan data lama dan menggabungkan transaksi baru...');

        // 4. INCREMENTAL APPEND: Load existing daily transactions for affected months & merge without losing old files
        const affectedMonths = Array.from(new Set(newDaily.map(d => d.m)));
        let totalNewlyAdded = 0;
        let totalExistingKept = 0;
        const allUpdatedDailyByMonth = {};

        for (const m of affectedMonths) {
          // Collect existing transactions for month m from memory state
          const existingForMonth = (fuelData.daily || []).filter(d => d.m === m);
          let storageForMonth = [];
          try {
            const { data: mDaily } = await fetchFuelDailyForMonth(m);
            if (Array.isArray(mDaily) && mDaily.length > 0) {
              storageForMonth = mDaily;
            }
          } catch(e) {
            console.warn(`Fetch storage for month ${m} warning:`, e);
          }

          // Build map of existing transactions for month m
          const monthMap = new Map();
          for (const d of existingForMonth) {
            monthMap.set(makeFuelTxKey(d), d);
          }
          for (const d of storageForMonth) {
            const k = makeFuelTxKey(d);
            if (!monthMap.has(k)) monthMap.set(k, d);
          }

          const existingCountBefore = monthMap.size;
          let addedForMonth = 0;

          // Merge newly uploaded transactions for month m (only add if not already in monthMap)
          const newForThisMonth = newDaily.filter(d => d.m === m);
          for (const d of newForThisMonth) {
            const k = makeFuelTxKey(d);
            if (!monthMap.has(k)) {
              monthMap.set(k, d);
              addedForMonth++;
            } else {
              // Row already existed: enrich with any richer text/doc if previously empty
              const exist = monthMap.get(k);
              if (!exist.doc && d.doc) exist.doc = d.doc;
              if (!exist.n && d.n) exist.n = d.n;
              if (!exist.p && d.p) exist.p = d.p;
            }
          }

          totalExistingKept += existingCountBefore;
          totalNewlyAdded += addedForMonth;

          const completeMonthDaily = Array.from(monthMap.values());
          allUpdatedDailyByMonth[m] = completeMonthDaily;

          // Save complete merged month daily data to per-month storage
          try {
            await saveFuelDailyForMonth(m, completeMonthDaily);
          } catch(pmErr) {
            console.warn(`Save per-month storage for ${m} warning:`, pmErr);
          }
        }

        // 5. Combine other unaffected months with the updated affected months for fuelData.daily
        const otherMonthsDaily = (fuelData.daily || []).filter(d => !affectedMonths.includes(d.m));
        const allAffectedMonthDaily = Object.values(allUpdatedDailyByMonth).flat();
        const mergedDaily = [...otherMonthsDaily, ...allAffectedMonthDaily].slice(-25000);

        // 6. AUTO-UPDATE SUMMARIES: Recalculate summaries from the COMPLETE merged set of transactions
        const summaryMap = new Map();
        (fuelData.summaries || []).forEach(s => {
          summaryMap.set(`${s.month}_${s.costCenter}`, { ...s });
        });

        let affectedVehiclesCount = 0;

        for (const m of affectedMonths) {
          const monthDaily = allUpdatedDailyByMonth[m] || [];
          const byCC = {};
          for (const d of monthDaily) {
            if (!byCC[d.c]) byCC[d.c] = [];
            byCC[d.c].push(d);
          }

          const allCostCentersForMonth = new Set([
            ...Object.keys(byCC),
            ...(fuelData.summaries || []).filter(s => s.month === m).map(s => s.costCenter)
          ]);

          affectedVehiclesCount += allCostCentersForMonth.size;

          for (const cc of allCostCentersForMonth) {
            const key = `${m}_${cc}`;
            const existing = summaryMap.get(key) || {
              month: m,
              costCenter: cc,
              equipment: '',
              description: '',
              plant: cc.substring(0, 4) || '',
              plantDesc: PLANT_INFO[cc.substring(0, 4)]?.desc || cc.substring(0, 4),
              wilayah: PLANT_INFO[cc.substring(0, 4)]?.wilayah || 'Regional 5',
              objectType: cc.includes('CAR') ? 'CAR' : cc.includes('TRU') ? 'DTRUCK' : cc.includes('TRA') ? 'TRACTOR' : 'VEHICLE',
              debitLiters: 0,
              debitRp: 0,
              creditKm: 0,
              creditHm: 0,
              txCount: 0,
              slarcNarrations: [],
              partnerObjects: []
            };

            // Fill equipment info if missing
            const eqInfo = eqMap[cc] || {};
            if (!existing.equipment && eqInfo.equipment) existing.equipment = eqInfo.equipment;
            if (!existing.description && eqInfo.description) existing.description = eqInfo.description;
            if (!existing.plant && eqInfo.plant) {
              existing.plant = eqInfo.plant;
              existing.plantDesc = PLANT_INFO[eqInfo.plant]?.desc || eqInfo.plant;
              existing.wilayah = PLANT_INFO[eqInfo.plant]?.wilayah || 'Regional 5';
            }
            if (eqInfo.objectType) existing.objectType = eqInfo.objectType;

            const txs = byCC[cc] || [];
            const txsD = txs.filter(d => d.t === 'D');
            const txsC = txs.filter(d => d.t === 'C');

            // Auto update debit if there are debit daily transactions
            if (txsD.length > 0) {
              existing.debitLiters = Math.round(txsD.reduce((sum, d) => sum + (parseFloat(d.q) || 0), 0) * 100) / 100;
              existing.debitRp = Math.round(txsD.reduce((sum, d) => sum + (parseFloat(d.r) || 0), 0));
            }
            // Auto update credit if there are credit daily transactions
            if (txsC.length > 0) {
              existing.creditKm = Math.round(txsC.filter(d => d.u === 'KM').reduce((sum, d) => sum + (parseFloat(d.q) || 0), 0) * 100) / 100;
              existing.creditHm = Math.round(txsC.filter(d => d.u === 'HM').reduce((sum, d) => sum + (parseFloat(d.q) || 0), 0) * 100) / 100;

              const narrations = new Set(existing.slarcNarrations || []);
              const partnerObjs = new Set(existing.partnerObjects || []);
              for (const d of txsC) {
                if (d.n && !d.n.toLowerCase().includes('pembulatan')) {
                  const clean = d.n.split('|')[0].trim();
                  if (clean && clean !== '1' && clean !== '-' && !clean.includes('/ E-')) narrations.add(clean);
                }
                if (d.p && !d.p.toLowerCase().includes('administrasi')) partnerObjs.add(d.p);
              }
              existing.slarcNarrations = Array.from(narrations).slice(0, 5);
              existing.partnerObjects = Array.from(partnerObjs).slice(0, 3);
              existing.slarcRefPrimary = existing.slarcNarrations[0] || existing.partnerObjects[0] || existing.slarcRefPrimary || null;
              existing.slarcRefAll = Array.from(narrations).join('; ') || Array.from(partnerObjs).join('; ') || existing.slarcRefAll || null;
            }

            existing.txCount = txs.length > 0 ? txs.length : (existing.txCount || 0);

            // Recalculate metrics
            const debitL = existing.debitLiters || 0;
            const debitR = existing.debitRp || 0;
            const creditK = existing.creditKm || 0;
            const creditH = existing.creditHm || 0;

            const kmPerL = debitL > 0 && creditK > 0 ? Number((creditK / debitL).toFixed(2)) : 0;
            const literPerH = debitL > 0 && creditH > 0 ? Number((debitL / creditH).toFixed(2)) : 0;

            let costPerUnit = 0;
            if (creditK > 0) costPerUnit = Math.round(debitR / creditK);
            else if (creditH > 0) costPerUnit = Math.round(debitR / creditH);

            const isHeavy = ['TRACTOR', 'EXCAVATOR', 'GRADER', 'WLOADER', 'HEAVY'].some(h => (existing.objectType || '').toUpperCase().includes(h)) || creditH > 0;

            let status = 'NORMAL';
            if (debitL === 0 && creditK === 0 && creditH === 0) {
              status = 'NO_DATA';
            } else if (debitL === 0) {
              status = 'NO_FUEL';
            } else if (creditK === 0 && creditH === 0) {
              status = 'NO_ACTIVITY';
            } else if (isHeavy) {
              if (literPerH <= 3.0) status = 'OPTIMAL';
              else if (literPerH <= 5.0) status = 'NORMAL';
              else status = 'BOROS';
            } else {
              if (kmPerL >= 3.5) status = 'OPTIMAL';
              else if (kmPerL >= 2.0) status = 'NORMAL';
              else status = 'BOROS';
            }

            existing.kmPerLiter = kmPerL;
            existing.literPerHm = literPerH;
            existing.costPerUnit = costPerUnit;
            existing.status = status;

            summaryMap.set(key, existing);
          }
        }

        const mergedSummaries = Array.from(summaryMap.values());

        setUploadProgress('Menyimpan data evaluasi BBM ke database server...');
        const payload = { summaries: mergedSummaries, daily: mergedDaily };
        const { error: saveErr } = await saveFuelData(payload);
        if (saveErr) throw new Error(saveErr);

        setFuelData(payload);
        setFuelUploadInfo({
          type: uploadType,
          file: file.name,
          totalProcessed: totalProcessedRows,
          newAdded: totalNewlyAdded,
          existingKept: totalExistingKept,
          summariesCount: affectedVehiclesCount,
          affectedMonths: affectedMonths.join(', '),
          uploadedAt: new Date().toISOString()
        });

      } catch (err) {
        console.error(err);
        setError(`Error memproses file ${typeLabel}: ` + (err.message || 'Gagal menyimpan ke server database'));
      } finally {
        setLoading(false);
        setUploadProgress('');
        e.target.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleSalrdFileUpload = (e) => handleFuelUploadByMode(e, 'salrd');
  const handleSlarcFileUpload = (e) => handleFuelUploadByMode(e, 'slarc');
  const handleFuelFileUpload = (e) => handleFuelUploadByMode(e, 'all');

  const handleClearFuelData = async () => {
    setLoading(true);
    try {
      await saveFuelData({ summaries: [], daily: [] });
      setFuelData({ summaries: [], daily: [] });
      setFuelUploadInfo(null);
    } catch (e) { alert('Gagal: ' + e.message); }
    finally { setLoading(false); }
  };

  // â”€â”€ Filter month logs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const monthLogs = useMemo(() => {
    const start = `${targetMonth}-01`;
    const end   = `${targetMonth}-31`;
    return logs.filter(l => l.date >= start && l.date <= end).map(l => ({
      ...l,
      _searchStr: `${l.vehicle_code || ''} ${l.plant || ''} ${l.operator || ''} ${l.reference || ''} ${l.activity_number || ''}`.toLowerCase()
    }));
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

  // â”€â”€ Summary per Plant â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const summaryData = useMemo(() => {
    const targetDate = new Date(targetInputDate);
    const list = [];

    Object.entries(PLANT_INFO).forEach(([plantCode, info]) => {
      // 1. Jumlah Veh. Code: Count from uploaded vehicle master data (vehicles), fallback to masterEquipments / masterMap
      const plantFromVehicles = vehicles.filter(v => v.plant === plantCode);
      let vehicleCount = plantFromVehicles.length;

      if (vehicleCount === 0) {
        const plantVehicles = masterEquipments.filter(e => e.plant === plantCode && String(e.eqNum || '').startsWith('20000'));
        if (masterMap && masterMap.size > 0) {
          masterMap.forEach((info, eqNum) => {
            if (!info) return;
            const p = typeof info === 'string' ? info : (info.plant || '');
            if (p === plantCode && String(eqNum).startsWith('20000')) {
              vehicleCount++;
            }
          });
        } else {
          vehicleCount = plantVehicles.length;
        }
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
  }, [vehicles, activeMonthLogs, cancelledMonthLogs, targetMonth, targetInputDate, autoWorkingDays, selectedWilayah, searchPlant, filterStatus, sortBy, sortAsc, masterEquipments, masterMap, isAdmin, currentUser]);

  // â”€â”€ Unit Focused Mode calculations â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const unitFocusedData = useMemo(() => {
    if (!effectivePlant) return { vehiclesList: [], kpis: { total: 0, active: 0, avgDays: 0, lastUpdate: '-', statusColor: 'grey', statusText: 'Belum Ada Data' } };

    const plantVehicles = vehicles.filter(v => v.plant === effectivePlant);
    const plantLogs     = activeMonthLogs.filter(l => l.plant === effectivePlant);
    const targetDate    = new Date(targetInputDate);

    let totalVeh = plantVehicles.length;
    let activeVehCount = 0;
    let totalDaysFilledSum = 0;

    const logsByVehicle = new Map();
    plantLogs.forEach(l => {
      if (!logsByVehicle.has(l.vehicle_code)) logsByVehicle.set(l.vehicle_code, []);
      logsByVehicle.get(l.vehicle_code).push(l);
    });

    const vehiclesList = plantVehicles.map(v => {
      const vLogs = logsByVehicle.get(v.vehicle_code) || [];
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
      // Find matching equipment from masterMap (true Master Data)
      let eqMap = null;
      if (masterMap && masterMap.size > 0) {
        // masterMap keys might be formatted differently, but usually exact match
        const rawVal = masterMap.get(v.vehicle_code);
        if (rawVal) {
          eqMap = typeof rawVal === 'string' ? { description: rawVal, costCenter: '' } : rawVal;
        } else {
          // Try to find by normalized key just in case
          const normalizeEq = (code) => String(code || '').replace(/^0+/, '').trim();
          const normVeh = normalizeEq(v.vehicle_code);
          for (let [k, val] of masterMap.entries()) {
            if (!val) continue;
            if (normalizeEq(k) === normVeh) {
              eqMap = typeof val === 'string' ? { description: val, costCenter: '' } : val;
              break;
            }
          }
        }
      }

      return {
        ...v,
        eqDesc: (eqMap && eqMap.description) ? eqMap.description : (v.description || '-'),
        costCenter: (eqMap && eqMap.costCenter) ? eqMap.costCenter : (v.cost_center || '-'),
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

  // â”€â”€ Per-Vehicle Detail (all plants, original tab) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const vehicleDetailData = useMemo(() => {
    const tDate = new Date(targetInputDate);
    
    let baseVehicles = vehicles;
    if (currentUser && !isAdmin && currentUser.plant) {
      baseVehicles = vehicles.filter(v => v.plant === currentUser.plant);
    }
    
    const activeLogsByVeh = new Map();
    activeMonthLogs.forEach(l => {
      if (!activeLogsByVeh.has(l.vehicle_code)) activeLogsByVeh.set(l.vehicle_code, []);
      activeLogsByVeh.get(l.vehicle_code).push(l);
    });
    
    const cancelLogsByVeh = new Map();
    cancelledMonthLogs.forEach(l => {
      if (!cancelLogsByVeh.has(l.vehicle_code)) cancelLogsByVeh.set(l.vehicle_code, []);
      cancelLogsByVeh.get(l.vehicle_code).push(l);
    });

    let result = baseVehicles.map(v => {
      const vLogs    = activeLogsByVeh.get(v.vehicle_code) || [];
      const vCancel  = cancelLogsByVeh.get(v.vehicle_code) || [];
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
        description: v.description,
        _searchStr: `${v.vehicle_code} ${v.plant} ${pInfo.desc} ${v.description || ''}`.toLowerCase(),
        logs: vLogs,
      };
    });

    if (selectedWilayah !== 'ALL') result = result.filter(r => r.wilayah === selectedWilayah);
    if (searchVehicle.trim()) {
      const q = searchVehicle.toLowerCase();
      result = result.filter(r =>
        r._searchStr.includes(q)
      );
    }
    if (filterStatus !== 'ALL') result = result.filter(r => r.statusColor === filterStatus);

    return result;
  }, [vehicles, activeMonthLogs, cancelledMonthLogs, targetInputDate, selectedWilayah, searchVehicle, filterStatus, currentUser, isAdmin]);

  // â”€â”€ Filtered Log Records (Original Logs tab) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const filteredLogs = useMemo(() => {
    let result = showCancelled ? monthLogs : activeMonthLogs;
    
    if (currentUser && !isAdmin && currentUser.plant) {
      result = result.filter(l => l.plant === currentUser.plant);
    }
    
    if (selectedWilayah !== 'ALL') {
      const plantsInWilayah = Object.entries(PLANT_INFO)
        .filter(([, v]) => v.wilayah === selectedWilayah)
        .map(([k]) => k);
      result = result.filter(l => plantsInWilayah.includes(l.plant));
    }
    if (searchVehicle.trim()) {
      const q = searchVehicle.toLowerCase();
      result = result.filter(l =>
        l._searchStr.includes(q)
      );
    }
    if (filterUoM !== 'ALL') result = result.filter(l => l.uom === filterUoM);
    if (filterJobCode !== 'ALL') result = result.filter(l => l.job_code === filterJobCode);
    return result;
  }, [monthLogs, activeMonthLogs, showCancelled, selectedWilayah, searchVehicle, filterUoM, filterJobCode, currentUser, isAdmin]);

  // â”€â”€ Aggregate Stats â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

  // â”€â”€ Export â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
      
      let text = `*ðŸ“Š MONITORING TRANSAKSI LOGBOOK REGIONAL 5*\n`;
      text += `*Periode:* 1 s.d ${reportDateStr}\n`;
      text += `*Target Input:* ${targetDateStrFormatted} (H-1)\n\n`;
      
      const sorted = [...summaryData].sort((a, b) => a.rank - b.rank);
      
      text += `*ðŸ† PERINGKAT UNIT (Berdasarkan Kepatuhan UTD):*\n`;
      sorted.forEach(item => {
        if (item.totalTx === 0) return;
        const statusEmoji = item.statusColor === 'green' ? 'ðŸŸ¢' : item.statusColor === 'yellow' ? 'ðŸŸ¡' : 'ðŸ”´';
        text += `${item.rank}. *${item.plant}* - ${item.desc}: *${item.pctUtd.toFixed(1)}%* UTD (${item.utdCount}/${item.totalTx} tx) ${statusEmoji} (Last: ${item.lastLogDate ? format(new Date(item.lastLogDate + 'T00:00:00'), 'dd/MM') : '-'})\n`;
      });
      
      const zeroTx = sorted.filter(item => item.totalTx === 0);
      if (zeroTx.length > 0) {
        text += `\n*âš ï¸ Unit Tanpa Transaksi:* \n`;
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
      // Wait 400ms for browser DOM layout and fonts to complete rendering before generating image
      await new Promise(r => setTimeout(r, 400));

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

  // â”€â”€ Fuel Evaluation Computed Data & ZESTHLP16PA Mapping â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const MONTH_NAMES = [
    { val: '01', label: 'Januari' },
    { val: '02', label: 'Februari' },
    { val: '03', label: 'Maret' },
    { val: '04', label: 'April' },
    { val: '05', label: 'Mei' },
    { val: '06', label: 'Juni' },
    { val: '07', label: 'Juli' },
    { val: '08', label: 'Agustus' },
    { val: '09', label: 'September' },
    { val: '10', label: 'Oktober' },
    { val: '11', label: 'November' },
    { val: '12', label: 'Desember' },
  ];

  const fuelAvailableYears = useMemo(() => {
    const set = new Set((fuelData?.summaries || []).map(s => s.month?.substring(0, 4)).filter(Boolean));
    if (set.size === 0) set.add('2026');
    return Array.from(set).sort().reverse();
  }, [fuelData]);

  // â”€â”€ Database VLOOKUP: Cost Center -> Equipment Master â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const costCenterToEquipmentMap = useMemo(() => {
    const map = new Map();

    // 1. From masterMap (17k+ entries from system config)
    if (masterMap && masterMap.size > 0) {
      masterMap.forEach((val, eqNum) => {
        if (val && val.costCenter) {
          const cc = String(val.costCenter).trim().toUpperCase();
          if (cc && !map.has(cc)) {
            map.set(cc, {
              equipment: String(eqNum || '').trim(),
              description: val.description || '',
              plant: val.plant || '',
              objectType: val.objectType || ''
            });
          }
        }
      });
    }

    // 2. From masterEquipments
    if (Array.isArray(masterEquipments)) {
      masterEquipments.forEach(item => {
        const cc = String(item.costCenter || item.cost_center || '').trim().toUpperCase();
        if (cc && (!map.has(cc) || !map.get(cc).equipment)) {
          map.set(cc, {
            equipment: String(item.eqNum || item.equipment || '').trim(),
            description: item.description || '',
            plant: item.plant || '',
            objectType: item.objectType || item.type || ''
          });
        }
      });
    }

    // 3. From vehicle master list (vehicles)
    if (Array.isArray(vehicles)) {
      vehicles.forEach(v => {
        const cc = String(v.cost_center || v.costCenter || '').trim().toUpperCase();
        if (cc && (!map.has(cc) || !map.get(cc).equipment)) {
          map.set(cc, {
            equipment: String(v.vehicle_code || '').trim(),
            description: v.description || '',
            plant: v.plant || '',
            objectType: v.object_type || ''
          });
        }
      });
    }

    // 4. From fuelData.summaries
    (fuelData?.summaries || []).forEach(s => {
      const cc = String(s.costCenter || '').trim().toUpperCase();
      const eq = String(s.equipment || '').trim();
      if (cc && eq && eq !== '-' && (!map.has(cc) || !map.get(cc).equipment || map.get(cc).equipment === '-')) {
        map.set(cc, {
          equipment: eq,
          description: s.description || '',
          plant: s.plant || '',
          objectType: s.objectType || ''
        });
      }
    });

    return map;
  }, [masterMap, masterEquipments, vehicles, fuelData?.summaries]);

  // Fast index of master vehicles by vehicle_code
  const masterVehiclesByCode = useMemo(() => {
    const map = new Map();
    (vehicles || []).forEach(v => {
      if (v && v.vehicle_code) {
        map.set(String(v.vehicle_code).trim(), v);
      }
    });
    return map;
  }, [vehicles]);

  // Fast index of ZCO data by Cost Center
  const zcoMapByCC = useMemo(() => {
    const map = new Map();
    (zcoData || []).forEach(z => {
      const cc = String(z.costCenter || z['Cost Center'] || z.cc || '').trim().toUpperCase();
      if (cc) map.set(cc, z);
    });
    return map;
  }, [zcoData]);

  // â”€â”€ Pre-Index ZESTHLP16PA Logs by No. Equipment & Date â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const zestLogsByEquipment = useMemo(() => {
    const map = new Map();
    (logs || []).forEach(l => {
      const eq = String(l.vehicle_code || '').trim();
      if (!eq) return;
      if (!map.has(eq)) map.set(eq, []);
      map.get(eq).push(l);
    });
    // Sort descending by date
    map.forEach(list => {
      list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    });
    return map;
  }, [logs]);

  // Pre-Index SLARC Credit daily records by Cost Center & Date
  const slarcDailyByCostCenter = useMemo(() => {
    const map = new Map();
    (fuelData?.daily || []).filter(d => d.t === 'C').forEach(d => {
      const cc = String(d.c || '').trim().toUpperCase();
      if (!cc) return;
      if (!map.has(cc)) map.set(cc, []);
      map.get(cc).push(d);
    });
    map.forEach(list => {
      list.sort((a, b) => (b.d || '').localeCompare(a.d || ''));
    });
    return map;
  }, [fuelData?.daily]);

  // Main Fuel Table Data with Deep Reference & Reconciliation Mapping
  const fuelTableData = useMemo(() => {
    const targetPeriod = fuelMonth === 'ALL' ? fuelYear : `${fuelYear}-${fuelMonth}`;
    const activePlant = (!isAdmin && currentUser?.plant && currentUser.plant !== 'ALL')
      ? currentUser.plant
      : fuelPlant;

    // Helper implementing Smart 4-Tier Fallback for REFERENCE and KM/HM reconciliation
    const resolveSmartReference = (equipment, costCenter, ymOrDate, isDate = false, summaryObj = null) => {
      const eqLogs = (equipment && equipment !== '-') ? (zestLogsByEquipment.get(equipment) || []) : [];
      const ccLogs = (costCenter && costCenter !== '-') ? (slarcDailyByCostCenter.get(String(costCenter || '').trim().toUpperCase()) || []) : [];

      let matchedZest = [];
      let matchedSlarc = [];

      if (isDate) {
        matchedZest = eqLogs.filter(l => l.date === ymOrDate);
        matchedSlarc = ccLogs.filter(d => d.d === ymOrDate);
      } else {
        if (fuelMonth !== 'ALL') {
          matchedZest = eqLogs.filter(l => l.date && l.date.startsWith(ymOrDate));
          matchedSlarc = ccLogs.filter(d => d.m === ymOrDate);
        } else {
          matchedZest = eqLogs.filter(l => l.date && l.date.startsWith(fuelYear));
          matchedSlarc = ccLogs.filter(d => d.m && d.m.startsWith(fuelYear));
        }
      }

      // Sum ZEST KM/HM for reconciliation comparison
      let zestKmHmTotal = 0;
      matchedZest.forEach(l => {
        zestKmHmTotal += parseFloat(l.hm_km) || 0;
      });

      // ============================================================
      // PRIORITY 1: REFERENCE from ZESTHLP16PA matching No. Equipment + period
      // ============================================================
      const p1List = [];
      matchedZest.forEach(l => {
        const ref = (l.reference || '').trim();
        if (ref && ref !== '1' && ref !== '-' && !p1List.includes(ref)) {
          p1List.push(ref);
        }
      });

      if (p1List.length > 0) {
        return {
          primary: p1List[0],
          all: p1List.join('; '),
          count: p1List.length,
          priority: 1,
          source: 'ZESTHLP16PA',
          badge: null,
          zestLogs: eqLogs,
          matchedZest,
          matchedSlarc,
          zestKmHmTotal: Math.round(zestKmHmTotal * 100) / 100
        };
      }

      // ============================================================
      // PRIORITY 2: JOB CODE / Pekerjaan Utama / Remarks / Lokasi from ZESTHLP16PA in period
      // ============================================================
      const p2List = [];
      matchedZest.forEach(l => {
        const rem = (l.remarks || '').trim();
        const job = (JOB_CODE_DESC[l.job_code] || l.job_code || '').trim();
        const loc = (l.location || '').trim();
        let text = '';
        if (rem && rem !== '1' && rem !== '-') {
          text = loc && !rem.includes(loc) ? `${rem} (${loc})` : rem;
        } else if (job) {
          text = loc ? `${job} (${loc})` : job;
        }
        if (text && !p2List.includes(text)) {
          p2List.push(text);
        }
      });

      // Also check vehicle master main job for this equipment
      if (p2List.length === 0 && equipment && equipment !== '-') {
        const masterObj = masterVehiclesByCode.get(equipment);
        if (masterObj?.pekerjaan_utama) {
          p2List.push(masterObj.pekerjaan_utama);
        }
      }

      if (p2List.length > 0) {
        return {
          primary: p2List[0],
          all: p2List.join('; '),
          count: p2List.length,
          priority: 2,
          source: 'ZEST_JOB',
          badge: null,
          zestLogs: eqLogs,
          matchedZest,
          matchedSlarc,
          zestKmHmTotal: Math.round(zestKmHmTotal * 100) / 100
        };
      }

      // ============================================================
      // PRIORITY 3: Latest known REFERENCE / Pekerjaan Utama from ZESTHLP16PA (other months)
      // ============================================================
      if (eqLogs.length > 0) {
        const p3List = [];
        let latestPeriod = '';
        eqLogs.forEach(l => {
          const ref = (l.reference || '').trim();
          const rem = (l.remarks || '').trim();
          const job = (JOB_CODE_DESC[l.job_code] || l.job_code || '').trim();
          let text = '';
          if (ref && ref !== '1' && ref !== '-') text = rem && rem !== ref ? `${ref} (${rem})` : ref;
          else if (rem && rem !== '1' && rem !== '-') text = rem;
          else if (job) text = job;
          if (text && !p3List.includes(text)) {
            p3List.push(text);
            if (!latestPeriod && l.date) latestPeriod = l.date.substring(0, 7);
          }
        });

        if (p3List.length > 0) {
          return {
            primary: p3List[0],
            all: p3List.join('; '),
            count: p3List.length,
            priority: 3,
            source: 'ZEST_LATEST',
            badge: 'Ref. Terakhir',
            latestPeriod,
            zestLogs: eqLogs,
            matchedZest,
            matchedSlarc,
            zestKmHmTotal: Math.round(zestKmHmTotal * 100) / 100
          };
        }
      }

      // ============================================================
      // PRIORITY 4: Transaction description / text from SLARC (Credit) / ZCO
      // ============================================================
      const p4List = [];
      // 4a. Check enriched summary fields
      if (summaryObj?.slarcNarrations && Array.isArray(summaryObj.slarcNarrations) && summaryObj.slarcNarrations.length > 0) {
        summaryObj.slarcNarrations.forEach(n => {
          if (n && !p4List.includes(n)) p4List.push(n);
        });
      } else if (summaryObj?.slarcRefPrimary) {
        p4List.push(summaryObj.slarcRefPrimary);
      }

      // 4b. Check daily SLARC records
      const slarcPool = matchedSlarc.length > 0 ? matchedSlarc : ccLogs;
      slarcPool.forEach(d => {
        const text = String(d.n || '').split('|')[0].trim();
        if (text && text !== '1' && text !== '-' && !text.includes('/ E-') && !text.toLowerCase().includes('pembulatan') && !p4List.includes(text)) {
          p4List.push(text);
        }
      });

      // 4c. Check partner object categories (e.g. TM - PENGANGKUTAN BUAH)
      if (p4List.length === 0 && summaryObj?.partnerObjects && Array.isArray(summaryObj.partnerObjects)) {
        summaryObj.partnerObjects.forEach(p => {
          if (p && !p4List.includes(p)) p4List.push(p);
        });
      }

      // 4d. Check ZCO activity if available
      if (p4List.length === 0 && costCenter) {
        const zcoMatch = zcoMapByCC.get(String(costCenter).trim().toUpperCase());
        if (zcoMatch?.activity) {
          p4List.push(`Aktivitas: ${zcoMatch.activity}`);
        }
      }

      if (p4List.length > 0) {
        return {
          primary: p4List[0],
          all: p4List.join('; '),
          count: p4List.length,
          priority: 4,
          source: 'SLARC',
          badge: 'SLARC',
          zestLogs: eqLogs,
          matchedZest,
          matchedSlarc,
          zestKmHmTotal: Math.round(zestKmHmTotal * 100) / 100
        };
      }

      // ============================================================
      // FALLBACK: Absolutely no activity record found
      // ============================================================
      return {
        primary: '-',
        all: '-',
        count: 0,
        priority: 0,
        source: 'NONE',
        badge: null,
        zestLogs: eqLogs,
        matchedZest,
        matchedSlarc,
        zestKmHmTotal: 0
      };
    };

    let result = [];

    if (!fuelDate) {
      // â”€â”€ Rekap Bulanan â”€â”€
      let list = fuelData?.summaries || [];
      if (fuelMonth === 'ALL') {
        list = list.filter(s => s.month?.startsWith(fuelYear));
      } else {
        list = list.filter(s => s.month === targetPeriod);
      }

      if (activePlant !== 'ALL') {
        list = list.filter(s => s.plant === activePlant);
      }

      result = list.map(s => {
        const ccKey = String(s.costCenter || '').trim().toUpperCase();
        const eqLookup = costCenterToEquipmentMap.get(ccKey);
        const resolvedEquipment = (s.equipment && s.equipment !== '-') ? s.equipment : (eqLookup?.equipment || '-');
        const resolvedDescription = s.description || eqLookup?.description || `Kendaraan ${s.costCenter}`;
        const resolvedPlant = s.plant || eqLookup?.plant || s.costCenter.substring(0, 4);
        const refData = resolveSmartReference(resolvedEquipment, s.costCenter, s.month, false, s);

        // Verification between SLARC (Credit) and ZESTHLP16PA
        const slarcTotal = s.creditKm || s.creditHm || 0;
        const zestTotal = refData.zestKmHmTotal;
        const diff = Math.round((slarcTotal - zestTotal) * 100) / 100;
        let reconcileStatus = 'NONE';
        if (slarcTotal > 0 && zestTotal > 0) {
          reconcileStatus = Math.abs(diff) < 0.01 ? 'MATCH' : 'DIFF';
        } else if (slarcTotal > 0) {
          reconcileStatus = 'SLARC_ONLY';
        } else if (zestTotal > 0) {
          reconcileStatus = 'ZEST_ONLY';
        }

        return {
          ...s,
          equipment: resolvedEquipment,
          description: resolvedDescription,
          plant: resolvedPlant,
          plantDesc: s.plantDesc || PLANT_INFO[resolvedPlant]?.desc || resolvedPlant,
          referencePrimary: refData.primary,
          referenceAll: refData.all,
          referenceCount: refData.count,
          referencePriority: refData.priority,
          referenceBadge: refData.badge,
          referenceSource: refData.source,
          referenceLatestPeriod: refData.latestPeriod,
          allZestLogs: refData.zestLogs,
          matchedZestLogs: refData.matchedZest,
          matchedSlarcDaily: refData.matchedSlarc,
          zestTotalKmHm: zestTotal,
          varianceKmHm: diff,
          reconcileStatus
        };
      });
    } else {
      // â”€â”€ Filter Tanggal Spesifik (Harian Drill-Down) â”€â”€
      const dayDaily = (fuelData?.daily || []).filter(d => d.d === fuelDate);
      const dayLogs = (logs || []).filter(l => l.date === fuelDate);

      const vehMap = new Map();

      (fuelData?.summaries || []).forEach(s => {
        if (!vehMap.has(s.costCenter)) {
          vehMap.set(s.costCenter, {
            costCenter: s.costCenter,
            equipment: s.equipment,
            description: s.description,
            plant: s.plant,
            plantDesc: s.plantDesc,
            wilayah: s.wilayah,
            objectType: s.objectType,
            month: s.month,
            debitLiters: 0,
            debitRp: 0,
            creditKm: 0,
            creditHm: 0,
            txCount: 0,
            slarcRefPrimary: s.slarcRefPrimary,
            slarcRefAll: s.slarcRefAll,
            slarcNarrations: s.slarcNarrations,
            partnerObjects: s.partnerObjects
          });
        }
      });

      dayDaily.forEach(d => {
        const cc = String(d.c || '').trim().toUpperCase();
        if (!vehMap.has(cc)) {
          const eqLookup = costCenterToEquipmentMap.get(cc);
          const p = d.p || cc.substring(0, 4);
          vehMap.set(cc, {
            costCenter: cc,
            equipment: eqLookup?.equipment || '-',
            description: eqLookup?.description || `Kendaraan ${cc}`,
            plant: p,
            plantDesc: PLANT_INFO[p]?.desc || p,
            wilayah: PLANT_INFO[p]?.wilayah || 'Regional 5',
            objectType: eqLookup?.objectType || 'VEH',
            month: fuelDate.substring(0, 7),
            debitLiters: 0,
            debitRp: 0,
            creditKm: 0,
            creditHm: 0,
            txCount: 0
          });
        }
        const v = vehMap.get(cc);
        v.txCount += 1;
        if (d.t === 'D') {
          v.debitLiters += (d.q || 0);
          v.debitRp += (d.r || 0);
        } else if (d.t === 'C') {
          if (d.u === 'KM') v.creditKm += (d.q || 0);
          else v.creditHm += (d.q || 0);
        }
      });

      let list = Array.from(vehMap.values());
      if (activePlant !== 'ALL') {
        list = list.filter(v => v.plant === activePlant);
      }
      list = list.filter(v => v.debitLiters > 0 || v.creditKm > 0 || v.creditHm > 0 || v.txCount > 0);

      result = list.map(v => {
        const ccKey = String(v.costCenter || '').trim().toUpperCase();
        const eqLookup = costCenterToEquipmentMap.get(ccKey);
        const resolvedEquipment = (v.equipment && v.equipment !== '-') ? v.equipment : (eqLookup?.equipment || '-');
        const resolvedDescription = v.description || eqLookup?.description || `Kendaraan ${v.costCenter}`;
        const resolvedPlant = v.plant || eqLookup?.plant || v.costCenter.substring(0, 4);
        const refData = resolveSmartReference(resolvedEquipment, v.costCenter, fuelDate, true, v);

        const kmPerL = v.debitLiters > 0 && v.creditKm > 0 ? Number((v.creditKm / v.debitLiters).toFixed(2)) : 0;
        const literPerH = v.debitLiters > 0 && v.creditHm > 0 ? Number((v.debitLiters / v.creditHm).toFixed(2)) : 0;
        const isHeavy = ['TRACTOR', 'EXCAVATOR', 'GRADER', 'WLOADER'].some(h => (v.objectType || '').toUpperCase().includes(h)) || v.creditHm > 0;
        let status = 'NORMAL';
        if (v.debitLiters === 0 && v.creditKm === 0 && v.creditHm === 0) status = 'NO_DATA';
        else if (isHeavy) {
          if (literPerH > 0 && literPerH <= 3.0) status = 'OPTIMAL';
          else if (literPerH > 5.0) status = 'BOROS';
        } else {
          if (kmPerL >= 3.5) status = 'OPTIMAL';
          else if (kmPerL > 0 && kmPerL < 2.0) status = 'BOROS';
        }

        const slarcTotal = v.creditKm || v.creditHm || 0;
        const zestTotal = refData.zestKmHmTotal;
        const diff = Math.round((slarcTotal - zestTotal) * 100) / 100;
        let reconcileStatus = 'NONE';
        if (slarcTotal > 0 && zestTotal > 0) {
          reconcileStatus = Math.abs(diff) < 0.01 ? 'MATCH' : 'DIFF';
        } else if (slarcTotal > 0) {
          reconcileStatus = 'SLARC_ONLY';
        } else if (zestTotal > 0) {
          reconcileStatus = 'ZEST_ONLY';
        }

        return {
          ...v,
          equipment: resolvedEquipment,
          description: resolvedDescription,
          plant: resolvedPlant,
          plantDesc: v.plantDesc || PLANT_INFO[resolvedPlant]?.desc || resolvedPlant,
          kmPerLiter: kmPerL,
          literPerHm: literPerH,
          costPerUnit: v.creditKm > 0 ? Math.round(v.debitRp / v.creditKm) : (v.creditHm > 0 ? Math.round(v.debitRp / v.creditHm) : 0),
          status,
          referencePrimary: refData.primary,
          referenceAll: refData.all,
          referenceCount: refData.count,
          referencePriority: refData.priority,
          referenceBadge: refData.badge,
          referenceSource: refData.source,
          referenceLatestPeriod: refData.latestPeriod,
          allZestLogs: refData.zestLogs,
          matchedZestLogs: refData.matchedZest,
          matchedSlarcDaily: refData.matchedSlarc,
          zestTotalKmHm: zestTotal,
          varianceKmHm: diff,
          reconcileStatus
        };
      });
    }

    if (searchFuel.trim()) {
      const q = searchFuel.toLowerCase();
      result = result.filter(r =>
        (r.equipment || '').toLowerCase().includes(q) ||
        (r.costCenter || '').toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q) ||
        (r.plant || '').toLowerCase().includes(q) ||
        (r.plantDesc || '').toLowerCase().includes(q) ||
        (r.referencePrimary || '').toLowerCase().includes(q) ||
        (r.referenceAll || '').toLowerCase().includes(q)
      );
    }

    return result;
  }, [fuelData, fuelYear, fuelMonth, fuelDate, fuelPlant, searchFuel, zestLogsByEquipment, slarcDailyByCostCenter, logs, costCenterToEquipmentMap, isAdmin, currentUser, masterVehiclesByCode, zcoMapByCC]);

  const fuelKPIs = useMemo(() => {
    let totalLiters = 0;
    let totalCost = 0;
    let totalKm = 0;
    let totalHm = 0;
    let kmLiters = 0;
    let kmVal = 0;
    let hmLiters = 0;
    let hmVal = 0;

    fuelTableData.forEach(r => {
      totalLiters += r.debitLiters || 0;
      totalCost += r.debitRp || 0;
      totalKm += r.creditKm || 0;
      totalHm += r.creditHm || 0;

      if ((r.creditKm || 0) > 0) {
        kmLiters += r.debitLiters || 0;
        kmVal += r.creditKm || 0;
      }
      if ((r.creditHm || 0) > 0) {
        hmLiters += r.debitLiters || 0;
        hmVal += r.creditHm || 0;
      }
    });

    const avgKmL = kmLiters > 0 && kmVal > 0 ? Number((kmVal / kmLiters).toFixed(2)) : 0;
    const avgLHm = hmVal > 0 && hmLiters > 0 ? Number((hmLiters / hmVal).toFixed(2)) : 0;

    return {
      totalLiters: Math.round(totalLiters * 100) / 100,
      totalCost: Math.round(totalCost),
      totalKm: Math.round(totalKm * 100) / 100,
      totalHm: Math.round(totalHm * 100) / 100,
      avgKmL,
      avgLHm,
      totalRows: fuelTableData.length
    };
  }, [fuelTableData]);

  const handleExportFuel = () => {
    const wb = XLSX.utils.book_new();
    const rows = fuelTableData.map((s, idx) => ({
      'No.': idx + 1,
      'Kebun / Unit': `${s.plant} - ${s.plantDesc}`,
      'No. Equipment': s.equipment || '-',
      'Cost Center': s.costCenter,
      'Deskripsi Kendaraan': s.description || '-',
      'Reference': s.referenceAll || s.referencePrimary || '-',
      'Solar (Liter)': s.debitLiters || 0,
      'KM / HM (SLARC)': s.creditKm > 0 ? `${s.creditKm} KM` : (s.creditHm > 0 ? `${s.creditHm} HM` : '-'),
      'KM / HM (ZESTHLP16PA)': s.zestTotalKmHm > 0 ? s.zestTotalKmHm : '-',
      'Selisih (Variance)': s.varianceKmHm !== 0 ? s.varianceKmHm : 0,
      'Rasio / Efisiensi': s.kmPerLiter > 0 ? `${s.kmPerLiter} KM/L` : (s.literPerHm > 0 ? `${s.literPerHm} L/HM` : '-'),
      'Biaya Solar (Rp)': s.debitRp || 0,
      'Status': s.status
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Evaluasi BBM');

    const filePeriod = fuelDate ? fuelDate : (fuelMonth === 'ALL' ? fuelYear : `${fuelYear}-${fuelMonth}`);
    XLSX.writeFile(wb, `Evaluasi_BBM_Regional5_${filePeriod}.xlsx`);
  };

    const handleExportZCO = () => {
    const wb = XLSX.utils.book_new();
    const rows = filteredZCOData.map(r => ({
      'Cost Center': r.rawCostCenter,
      'Cost (Biaya SAP)': r.zcoCost,
      'Activity': r.activity || 0,
      'Rate (Tarif)': r.zcoRate,
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

  // â”€â”€ Sort handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
  const handleSort = (col) => {
    if (sortBy === col) setSortAsc(!sortAsc);
    else { setSortBy(col); setSortAsc(true); }
  };
  const SortIcon = ({ col }) => sortBy === col
    ? (sortAsc ? <ChevronUp size={12} className="inline ml-1" /> : <ChevronDown size={12} className="inline ml-1" />)
    : null;

  // â”€â”€ Paginated logs â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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
        // Fallback: extract plant prefix if possible (e.g. 5D01, 5E08, 5F07)
        const match = ccCode.match(/^(\d[A-Z0-9]{3})/i) || String(row.rawCostCenter || '').match(/(5[EDF]\d{2})/i);
        if (match) {
          const pCandidate = match[1].toUpperCase();
          const pInfo = PLANT_INFO[pCandidate];
          if (pInfo) {
            plantCode = pCandidate;
            plantDesc = pInfo.desc;
            wilayah = pInfo.wilayah;
          }
        }
      }

      const zcoCost = parseFloat(row.totalCost) || 0;
      // Use SAP ZCO activityQty as the primary activity (from uploaded ZCO file)
      const zcoActivityQty = parseFloat(row.activityQty) || 0;
      // logActivityVal = actual logbook HM/KM (for reconciliation comparison)
      const logActivityVal = parseFloat(logActivity) || 0;
      // ACTIVITY column displays SAP ZCO activity qty; rate = cost / SAP activity
      const activity = zcoActivityQty;
      const zcoRate = activity > 0 ? zcoCost / activity : 0;

      // Status logic
      let cekStatus;
      let statusColor;
      let statusText;
      
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
      } else if (Math.abs(zcoCost) + activity + Math.abs(zcoRate) === 0) {
        cekStatus = 'Oke';
        statusColor = 'grey';
        statusText = '';
      } else {
        if (zcoCost > 0 && activity > 0) {
          cekStatus = 'Oke';
          statusColor = 'green';
          statusText = 'Oke';
        } else {
          cekStatus = 'Cek';
          // Apabila ada activity tapi tidak ada cost (cost <= 0)
          if (activity > 0 && zcoCost <= 0) {
            statusColor = 'orange';
            statusText = 'Belum Ada Pembebanan Biaya';
          } else if (zcoCost > 0 && (activity === 0 || logActivityVal === 0)) {
            statusColor = 'red';
            statusText = 'Logbook Belum Dibuat';
          } else {
            statusColor = 'red';
            statusText = 'Perbaiki';
          }
        }
      }

      const _searchStr = `${rawCC} ${ccCode} ${plantCode} ${plantDesc} ${wilayah}`.toLowerCase();

      return {
        ...row,
        plantCode,
        plantDesc,
        wilayah,
        logActivity: logActivityVal,  // actual logbook HM/KM
        activity,                     // SAP ZCO activityQty (shown in ACTIVITY column)
        zcoCost,
        zcoActy: activity,            // SAP activity qty
        zcoRate,
        isPlantLogRate,
        cekStatus,
        statusColor,
        statusText,
        _searchStr
      };
    });
  }, [zcoData, masterEquipments, activeMonthLogs]);

  const filteredZCOData = useMemo(() => {
    let result = zcoReconciliationData;

    if (currentUser && !isAdmin && currentUser.plant) {
      result = result.filter(r => r.plantCode === currentUser.plant || r.plantCode === '-');
    }

    if (zcoWilayah !== 'ALL') {
      const cleanWil = (w) => String(w || '').replace(/[^a-z0-9]/gi, '').toLowerCase();
      const targetW = cleanWil(zcoWilayah);
      result = result.filter(r => {
        const wNorm = cleanWil(r.wilayah);
        return wNorm === targetW || wNorm.includes(targetW);
      });
    }
    
    if (searchZco.trim()) {
      const q = searchZco.toLowerCase();
      result = result.filter(r => 
        (r._searchStr || '').includes(q)
      );
    }

    if (zcoFilterStatus !== 'ALL') {
      result = result.filter(r => r.cekStatus === zcoFilterStatus && r.statusColor !== 'grey');
    }

    return result;
  }, [zcoReconciliationData, zcoWilayah, searchZco, zcoFilterStatus, currentUser, isAdmin]);

  const totalCekRows = useMemo(() => {
    let list = zcoReconciliationData;
    if (zcoWilayah !== 'ALL') {
      list = list.filter(r => r.wilayah === zcoWilayah);
    }
    return list.filter(r => r.cekStatus === 'Cek').length;
  }, [zcoReconciliationData, zcoWilayah]);

  const zcoSummary = useMemo(() => {
    let totalCost = 0;
    let totalActivity = 0;
    filteredZCOData.forEach(r => {
      totalCost += (r.zcoCost || 0);
      totalActivity += (r.activity || 0);
    });
    const avgRate = totalActivity > 0 ? totalCost / totalActivity : 0;
    return { totalCost, totalActivity, avgRate };
  }, [filteredZCOData]);

  const uomOptions    = useMemo(() => ['ALL', ...new Set(monthLogs.map(l => l.uom).filter(Boolean))], [monthLogs]);
  const jobCodeOptions = useMemo(() => ['ALL', ...new Set(monthLogs.map(l => l.job_code).filter(Boolean))], [monthLogs]);

  const allPlantsList = useMemo(() => {
    return Object.entries(PLANT_INFO).map(([code, details]) => ({
      code,
      ...details
    })).sort((a, b) => a.code.localeCompare(b.code));
  }, []);

  return (
    <div className="min-h-full rounded-xl overflow-y-auto relative bg-[#f8fafc] bg-[radial-gradient(#cbd5e1_1.2px,transparent_1.2px)] [background-size:24px_24px]" style={{ maxHeight: 'calc(100vh - 80px)' }}>

      {/* Subtle Ambient Palm Plantation Watermark Texture */}
      <div 
        className="fixed inset-0 z-0 bg-cover bg-center opacity-[0.035] grayscale pointer-events-none"
        style={{ backgroundImage: "url('/sawit.jpg')" }}
      />

      {/* â”€â”€ Side Drawer â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
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
                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-widest">{drawerItem.wilayah} Â· {drawerItem.plant}</p>
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
                        {jc}{JOB_CODE_DESC[jc] ? ` (${JOB_CODE_DESC[jc]})` : ''} Â· {cnt}x
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

        {/* â”€â”€ Header â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl shadow-sm no-print">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Truck size={20} className="text-emerald-400" />
              <span className="text-emerald-400 text-xs font-semibold uppercase tracking-widest text-[10px]">ZESTHLP16PA SAP</span>
            </div>
            <h2 className="text-xl font-bold text-white">Monitoring Logbook Kendaraan</h2>
            <p className="text-slate-400 text-xs mt-0.5">
              Dashboard monitoring operasional kendaraan Regional 5 â€” Bulan {targetMonth}
            </p>
          </div>

          <div className="flex gap-2 shrink-0 flex-wrap">
            {isDevUser && (
              <>
                <input type="file" id="raw-zest-file" className="hidden" accept=".xlsx,.xls" onChange={handleFileUpload} />
                <button
                  onClick={() => document.getElementById('raw-zest-file').click()}
                  disabled={loading}
                  className="bg-white text-slate-800 hover:bg-slate-100 px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm disabled:opacity-50 transition border border-slate-200 cursor-pointer"
                >
                  <Upload size={14} className="text-emerald-600" /> Upload ZESTHLP16PA
                </button>

                <input type="file" id="raw-zco-file" className="hidden" accept=".xlsx,.xls" onChange={handleZCOFileUpload} />
                <button
                  onClick={() => document.getElementById('raw-zco-file').click()}
                  disabled={loading}
                  className="bg-white text-slate-800 hover:bg-slate-100 px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm disabled:opacity-50 transition border border-slate-200 cursor-pointer"
                >
                  <Upload size={14} className="text-emerald-600" /> Upload ZCO_CCTR_01
                </button>

                <input type="file" id="raw-salrd-file" className="hidden" accept=".xlsx,.xls" onChange={handleSalrdFileUpload} />
                <button
                  onClick={() => document.getElementById('raw-salrd-file').click()}
                  disabled={loading}
                  className="bg-white text-slate-800 hover:bg-slate-100 px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm disabled:opacity-50 transition border border-slate-200 cursor-pointer"
                  title="Upload File Excel SALRD (Debit BBM / Pemakaian Solar)"
                >
                  <Upload size={14} className="text-amber-600" /> Upload SALRD (Debit)
                </button>

                <input type="file" id="raw-slarc-file" className="hidden" accept=".xlsx,.xls" onChange={handleSlarcFileUpload} />
                <button
                  onClick={() => document.getElementById('raw-slarc-file').click()}
                  disabled={loading}
                  className="bg-white text-slate-800 hover:bg-slate-100 px-3 py-2 rounded-xl font-bold text-xs flex items-center gap-1.5 shadow-sm disabled:opacity-50 transition border border-slate-200 cursor-pointer"
                  title="Upload File Excel SLARC (Credit BBM / Realisasi KM/HM)"
                >
                  <Upload size={14} className="text-blue-600" /> Upload SLARC (Credit)
                </button>
              </>
            )}
            {/* Show Refresh button only to admins; USER role gets silent auto-refresh */}
            {isAdmin && (
              <div className="flex items-center gap-2">
                {lastRefreshed && !loading && (
                  <span className="text-[10px] text-slate-400 font-medium whitespace-nowrap">
                    Update: {format(lastRefreshed, 'HH:mm:ss')}
                  </span>
                )}
                <button onClick={() => loadData(true)} disabled={loading}
                  className="bg-[#064e3b] hover:bg-[#065f46] text-white px-4 py-2 rounded-xl font-bold text-xs flex items-center gap-2 shadow-sm disabled:opacity-50 transition">
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} /> Refresh
                </button>
              </div>
            )}
          </div>
        </div>

        {/* â”€â”€ Error / Upload Info â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-start gap-3">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <p className="text-sm font-medium">{error}</p>
          </div>
        )}
        {uploadProgress && (
          <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-xl flex items-center gap-3">
            <RefreshCw size={16} className="shrink-0 animate-spin text-blue-500" />
            <p className="text-sm font-medium">{uploadProgress}</p>
          </div>
        )}
        {uploadInfo && (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-3 rounded-xl flex items-start gap-3">
            <CheckCircle size={18} className="shrink-0 mt-0.5 text-emerald-600" />
            <div className="text-sm">
              <p className="font-bold text-xs">Upload berhasil: {uploadInfo.file}</p>
              <p className="text-emerald-700 mt-0.5 text-[11px]">
                {uploadInfo.processed} transaksi diproses Â· {uploadInfo.cancelled} dibatalkan Â· {uploadInfo.skipped} baris dilewati Â· {uploadInfo.plants} plant Â· {uploadInfo.jobCodes} job code
              </p>
            </div>
            <button onClick={() => { setUploadInfo(null); try { sessionStorage.removeItem('vehicle_upload_info'); } catch (e) {} }} className="ml-auto text-emerald-400 hover:text-emerald-600"><XCircle size={16} /></button>
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
        {fuelUploadInfo && (
          <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-xl flex items-start gap-3">
            <CheckCircle size={18} className="shrink-0 mt-0.5 text-amber-600" />
            <div className="text-sm">
              <p className="font-bold text-xs">
                {fuelUploadInfo.type === 'salrd' ? 'Upload SALRD (Debit) Berhasil' : fuelUploadInfo.type === 'slarc' ? 'Upload SLARC (Credit) Berhasil' : 'Upload BBM Berhasil'}: {fuelUploadInfo.file}
              </p>
              <p className="text-amber-800 mt-0.5 text-[11px]">
                {fuelUploadInfo.newAdded !== undefined
                  ? `Berhasil menambahkan ${fuelUploadInfo.newAdded} transaksi baru ke database (mempertahankan ${fuelUploadInfo.existingKept || 0} transaksi lama). Rekap bulanan untuk ${fuelUploadInfo.summariesCount} kendaraan [${fuelUploadInfo.affectedMonths}] otomatis diperbarui.`
                  : `Berhasil memproses ${fuelUploadInfo.totalProcessed || fuelUploadInfo.rows || 0} baris transaksi.`}
              </p>
            </div>
            <button onClick={() => setFuelUploadInfo(null)} className="ml-auto text-amber-400 hover:text-amber-600"><XCircle size={16} /></button>
          </div>
        )}

        {/* â”€â”€ Tab Navigation â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {!screenshotMode && (
          <div className="flex gap-1 bg-slate-200/60 p-1.5 rounded-xl w-fit flex-wrap">
            {[
              { key: 'unit-checklist',    label: 'ðŸ“‹ Checklist Kebun (Unit)', icon: Calendar,        show: true },
              { key: 'summary-regional',  label: 'ðŸ¢ Rekap Regional 5',      icon: BarChart2,       show: true },
              { key: 'detail-veh',        label: 'ðŸšš Daftar Kendaraan',      icon: Truck,           show: isAdmin },
              { key: 'log-raw',           label: 'ðŸ“„ Log Transaksi Asli',    icon: FileSpreadsheet, show: true },
              { key: 'zco-reconciliation',label: 'ðŸ’° Verifikasi Biaya (ZCO)', icon: Coins,          show: true },
              { key: 'fuel-evaluation',   label: 'â›½ Evaluasi BBM (Solar)',    icon: Fuel,           show: true },
            ].filter(t => t.show).map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => { setActiveTab(key); setError(null); }}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold transition-colors duration-300 ${activeTab === key ? 'bg-gradient-to-tr from-[#064e3b] to-[#2dd4bf] text-white shadow-md shadow-emerald-900/20' : 'text-slate-500 hover:text-[#064e3b] hover:bg-emerald-50'}`}>
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
        )}

        {/* â”€â”€ Controls (Adapts based on active tab) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {!screenshotMode && activeTab !== 'fuel-evaluation' && (
          <div className={`${
            isLocalDev 
              ? 'bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs' 
              : 'bg-[#fafafa] p-5 rounded-2xl border border-emerald-100 shadow-lg shadow-emerald-900/5'
          } grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 items-end sticky top-0 z-40 transition-all`}>
            {/* Dev Mode Banner Badge */}
            {isLocalDev && (
              <div className="col-span-2 sm:col-span-3 lg:col-span-5 flex items-center justify-between pb-2 border-b border-slate-100 text-[10px]">
                <span className="font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
                  MDS DATA-DENSE MODE (MORNINGSTAR X PTPN IV HYBRID)
                </span>
                <span className="font-mono text-slate-400 font-semibold">LOCAL DEV ONLY â€¢ COMPACT NUMERALS</span>
              </div>
            )}

            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Pilih Bulan</label>
              <input type="month" value={targetMonth} onChange={e => setTargetMonth(e.target.value)}
                className={`px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 font-medium ${
                  isLocalDev ? 'bg-slate-50/70' : 'rounded-2xl'
                }`} />
            </div>
            
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Tanggal Cek Status</label>
              <input type="date" value={targetInputDate} onChange={e => setTargetInputDate(e.target.value)}
                className={`px-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-600 focus:border-emerald-600 font-medium ${
                  isLocalDev ? 'bg-slate-50/70' : 'rounded-2xl'
                }`} />
            </div>
          {activeTab === 'unit-checklist' ? (
            // Unit view controls: plant selection
            // ADMIN/DEV â†’ full dropdown; USER â†’ locked read-only badge
            <div className="flex flex-col col-span-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1">
                {isAdmin ? 'Pilih Kebun / Unit' : 'Unit / Kebun Anda'}
              </label>
              {isAdmin ? (
                <select
                  value={selectedPlant}
                  onChange={e => setSelectedPlant(e.target.value)}
                  className="px-3 py-2 border border-slate-300 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30 focus:border-[#064e3b] bg-slate-50 font-semibold"
                >
                  {allPlantsList.map(p => (
                    <option key={p.code} value={p.code}>
                      {p.code} - {p.desc} ({p.wilayah})
                    </option>
                  ))}
                </select>
              ) : (
                // USER role: read-only locked badge showing their plant
                <div className="flex items-center gap-2 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-2xl h-[34px]">
                  <span className="font-mono text-[11px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.5 rounded">{selectedPlant}</span>
                  <span className="text-xs font-semibold text-slate-700 truncate">{PLANT_INFO[selectedPlant]?.desc || selectedPlant}</span>
                  <span className="text-[10px] text-slate-400 font-medium ml-auto whitespace-nowrap">{PLANT_INFO[selectedPlant]?.wilayah}</span>
                </div>
              )}
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
        )}

        {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {/* TAB 1: Checklist Kebun (Unit) â€” VERY SIMPLE & DIRECT       */}
        {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {activeTab === 'unit-checklist' && (
          <div className="space-y-4">
            
            {/* Kebun Info Panel & KPIs (Enhanced with Morningstar Analytical Density on Dev) */}
            <div className={`${
              isLocalDev 
                ? 'bg-white rounded-xl border border-slate-200 shadow-2xs divide-y md:divide-y-0 md:divide-x divide-slate-100 grid grid-cols-1 md:grid-cols-4 items-stretch mt-2 overflow-hidden'
                : 'bg-white rounded-2xl border border-slate-100 shadow-lg shadow-emerald-900/5 p-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-center mt-2 hover:shadow-xl transition-shadow duration-300'
            }`}>
              <div className={isLocalDev ? "p-4 flex flex-col justify-between" : "border-r border-slate-100 pr-2"}>
                <div>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Kebun Terpilih</span>
                  <h3 className="text-sm font-extrabold text-slate-900 mt-0.5 leading-snug">{PLANT_INFO[selectedPlant]?.desc || `Kebun ${selectedPlant}`}</h3>
                </div>
                <div className="flex items-center gap-1.5 mt-2">
                  <span className="bg-slate-100 text-slate-800 border border-slate-200 text-[10px] font-bold px-2 py-0.5 rounded font-mono">{selectedPlant}</span>
                  <span className="text-slate-500 text-xs font-semibold">{PLANT_INFO[selectedPlant]?.wilayah}</span>
                </div>
              </div>

              <div className={isLocalDev ? "p-4 flex flex-col items-center justify-center bg-slate-50/40 text-center" : "flex flex-col items-center justify-center p-3 bg-slate-50 rounded-xl"}>
                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Total Kendaraan</span>
                <span className="text-2xl md:text-3xl font-black font-mono tracking-tight text-slate-900 mt-1">
                  {unitFocusedData.kpis.total} <span className="text-xs text-slate-500 font-normal">Unit</span>
                </span>
                <span className="text-[10px] text-slate-500 font-medium mt-0.5">{unitFocusedData.kpis.active} Aktif Bulan Ini</span>
              </div>

              <div className={isLocalDev ? "p-4 flex flex-col items-center justify-center bg-slate-50/40 text-center" : "flex flex-col items-center justify-center p-3 bg-slate-50 rounded-xl"}>
                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Status ({format(new Date(targetInputDate + 'T00:00:00'), 'dd/MM/yyyy')})</span>
                <div className="flex gap-3 mt-1.5 items-center">
                  <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono font-bold text-sm px-2.5 py-1 rounded-md flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 inline-block"></span>
                    {unitFocusedData.kpis.todayFilled} <span className="text-[10px] text-emerald-700 font-sans font-medium">Selesai</span>
                  </span>
                  <span className="bg-red-50 text-red-800 border border-red-200 font-mono font-bold text-sm px-2.5 py-1 rounded-md flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-red-600 inline-block"></span>
                    {unitFocusedData.kpis.todayPending} <span className="text-[10px] text-red-700 font-sans font-medium">Belum</span>
                  </span>
                </div>
              </div>

              <div className={isLocalDev ? "p-4 flex flex-col items-center justify-center bg-slate-50/40 text-center" : "flex flex-col items-center justify-center p-3 bg-slate-50 rounded-xl"}>
                <span className="text-slate-500 text-[10px] font-bold uppercase tracking-wider">Status Pengisian Kebun</span>
                <div className="mt-1.5">
                  <StatusBadge status={unitFocusedData.kpis.statusColor} text={unitFocusedData.kpis.statusText} />
                </div>
                <span className="text-[10px] text-slate-400 font-medium mt-1 font-mono">
                  Update: {unitFocusedData.kpis.lastUpdate !== '-' ? format(new Date(unitFocusedData.kpis.lastUpdate + 'T00:00:00'), 'dd/MM/yyyy') : '-'}
                </span>
              </div>
            </div>

            {/* Checklist Table */}
            {/* Checklist Table (High Density on Dev) */}
            <div className={`${
              isLocalDev 
                ? 'bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden mt-3' 
                : 'bg-white rounded-2xl border border-slate-100 shadow-lg shadow-emerald-900/5 overflow-hidden mt-4'
            }`}>
              <div className={`${
                isLocalDev ? 'px-4 py-2.5 border-b border-slate-200 bg-slate-50/90' : 'p-5 border-b border-emerald-100/50 bg-slate-50/50'
              } flex flex-col sm:flex-row justify-between items-center gap-2`}>
                <div>
                  <h4 className="font-extrabold text-slate-900 text-xs tracking-tight">Checklist Absensi Pengisian Logbook Harian</h4>
                  <p className="text-[10px] text-slate-500">Centang hijau menunjukkan logbook sudah terisi pada tanggal terpilih.</p>
                </div>
                <div className="flex items-center gap-4 text-[11px] font-semibold text-slate-600">
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-emerald-500 rounded-full" /> <span>Terisi</span></div>
                  <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 bg-red-400 rounded-full" /> <span>Belum Terisi</span></div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[10px] font-black uppercase tracking-wider">
                      <th className={`text-center ${isLocalDev ? 'px-3 py-2 w-[110px]' : 'px-4 py-3 w-[120px]'}`}>No. Equipment</th>
                      <th className={`text-center ${isLocalDev ? 'px-3 py-2 min-w-[140px]' : 'px-4 py-3 min-w-[150px]'}`}>Deskripsi Kendaraan</th>
                      <th className={`text-center ${isLocalDev ? 'px-3 py-2 w-[90px]' : 'px-4 py-3 w-[100px]'}`}>Cost Center</th>
                      <th className={`text-center ${isLocalDev ? 'px-3 py-2 min-w-[160px]' : 'px-4 py-3 min-w-[180px]'}`}>Pekerjaan Utama</th>
                      <th className={`text-center ${isLocalDev ? 'px-3 py-2 w-[140px]' : 'px-4 py-3 w-[160px]'}`}>Status Hari Ini</th>
                      <th className={`text-center ${isLocalDev ? 'px-3 py-2 w-[110px]' : 'px-4 py-3 w-[120px]'}`}>Bulan Ini (Terisi)</th>
                      <th className={`text-center ${isLocalDev ? 'px-3 py-2' : 'px-4 py-3'}`}>Absensi Harian (Tanggal 1 s.d. 31)</th>
                      <th className={`text-center ${isLocalDev ? 'px-3 py-2 w-[60px]' : 'px-4 py-3 w-[60px]'}`}>Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {unitFocusedData.vehiclesList.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="py-10 px-6">
                          <div className="flex flex-col items-center gap-4">
                            {/* Role + Plant badge */}
                            <div className="flex items-center gap-3">
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold border ${
                                isAdmin
                                  ? 'bg-blue-50 text-blue-700 border-blue-200'
                                  : 'bg-slate-100 text-slate-600 border-slate-300'
                              }`}>
                                <span className="w-2 h-2 rounded-full bg-current opacity-70 inline-block" />
                                Role: {currentUser?.role?.toUpperCase() || 'USER'}
                              </span>
                              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <span className="font-mono">{selectedPlant}</span>
                                <span className="text-emerald-500">Â·</span>
                                {PLANT_INFO[selectedPlant]?.desc || selectedPlant}
                              </span>
                              {PLANT_INFO[selectedPlant]?.wilayah && (
                                <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 border border-slate-200 px-2 py-1 rounded-full">
                                  {PLANT_INFO[selectedPlant].wilayah}
                                </span>
                              )}
                            </div>
                            {/* Info message */}
                            <div className="text-center">
                              <p className="text-sm font-semibold text-slate-500">Belum ada data kendaraan terdaftar</p>
                              <p className="text-xs text-slate-400 mt-1">
                                Unit <span className="font-bold text-slate-600">{selectedPlant}</span> belum memiliki master kendaraan.{' '}
                                {!isAdmin && 'Hubungi Admin/Keyuser PM untuk sinkronisasi data '}
                                {!isAdmin && <span className="font-mono font-bold text-slate-600">ZESTHLP16PA</span>}
                                {!isAdmin && ' dari SAP.'}
                                {isAdmin && 'Silakan upload file ZESTHLP16PA untuk plant ini.'}
                              </p>
                            </div>
                          </div>
                        </td>
                      </tr>

                    ) : unitFocusedData.vehiclesList.slice((unitPage - 1) * LOG_PAGE_SIZE, unitPage * LOG_PAGE_SIZE).map(v => (
                      <React.Fragment key={v.vehicle_code}>
                        <tr className={`hover:bg-slate-50/80 transition-colors duration-150 border-b border-slate-100 group ${expandedVehicleId === v.vehicle_code ? 'bg-emerald-50/20' : ''}`}>
                          <td className={`${isLocalDev ? 'px-3 py-1.5' : 'px-4 py-3'} font-bold text-slate-900 font-mono text-[12px]`}>{v.vehicle_code}</td>
                          <td className={`${isLocalDev ? 'px-3 py-1.5' : 'px-4 py-3'} text-[11px] text-slate-600 font-medium`}>{v.eqDesc}</td>
                          <td className={`${isLocalDev ? 'px-3 py-1.5' : 'px-4 py-3'} font-mono text-[11px] font-semibold text-slate-700`}>{v.costCenter}</td>
                          <td className={`${isLocalDev ? 'px-3 py-1.5' : 'px-4 py-3'} text-slate-700`}>
                            <span className="font-semibold text-slate-800 block text-xs">{v.description}</span>
                            <span className="text-[10px] text-slate-400 font-medium block">Tipe: {v.description.split(' Ke ')[0]}</span>
                          </td>
                          <td className={`${isLocalDev ? 'px-3 py-1.5' : 'px-4 py-3'} text-center`}>
                            {v.isInputtedToday ? (
                              <div className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-200 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold">
                                <Check size={11} className="text-emerald-700 stroke-[3px]" /> Sudah Diisi
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1 bg-red-50 border border-red-200 text-red-700 px-2 py-0.5 rounded text-[10px] font-bold">
                                <X size={11} className="text-red-600 stroke-[3px]" /> Belum Diisi
                              </div>
                            )}
                          </td>
                          <td className={`${isLocalDev ? 'px-3 py-1.5' : 'px-4 py-3'} text-center font-bold text-slate-800 font-mono text-xs`}>
                            {v.daysFilled} <span className="font-sans text-[10px] text-slate-500 font-normal">Hari</span>
                          </td>
                          <td className={`${isLocalDev ? 'px-3 py-1.5' : 'px-4 py-3'}`}>
                            {/* Calendar Checklist Row (Compact density on Dev) */}
                            <div className="flex flex-wrap gap-0.5 items-center justify-start">
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
                                    className={`${isLocalDev ? 'w-5 h-5 text-[8.5px]' : 'w-6 h-6 text-[9px]'} rounded flex items-center justify-center font-mono font-bold transition cursor-help border ${
                                      state 
                                        ? 'bg-emerald-600 text-white border-emerald-700' 
                                        : 'bg-red-50 text-red-500 hover:bg-red-100 border-red-200'
                                    } ${isCurrentDate ? 'ring-2 ring-emerald-700 ring-offset-1 scale-105 z-10 shadow-xs' : ''}`}
                                  >
                                    {dayNum}
                                  </div>
                                );
                              })}
                            </div>
                          </td>
                          <td className={`${isLocalDev ? 'px-3 py-1.5' : 'px-4 py-3'} text-center`}>
                            <button
                              onClick={() => {
                                setSearchVehicle(v.vehicle_code);
                                setLogPage(1);
                                setActiveTab('log-raw');
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="font-bold text-[11px] px-2.5 py-1 rounded-md transition flex items-center justify-center gap-1 mx-auto border text-[#064e3b] hover:text-emerald-800 bg-slate-50 hover:bg-slate-100 border-slate-300 cursor-pointer"
                              title={`Buka Log Transaksi Asli untuk kendaraan ${v.vehicle_code}`}
                            >
                              <Eye size={11} /> Detail
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
                                  Detail Transaksi Logbook Kendaraan {v.vehicle_code} â€” Bulan {targetMonth}
                                </h5>
                                
                                <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                                  <table className="w-full text-xs text-left">
                                    <thead>
                                      <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                                        <th className="text-center py-2 px-2">Tanggal</th>
                                        <th className="text-center py-2 px-2">Operator (Supir)</th>
                                        <th className="text-center py-2 px-2">Pekerjaan</th>
                                        <th className="py-2 px-2 text-center">HM/KM</th>
                                        <th className="py-2 px-2 text-center">Hasil Angkut</th>
                                        <th className="text-center py-2 px-2">SPBS No.</th>
                                        <th className="text-center py-2 px-2">Lokasi</th>
                                        <th className="text-center py-2 px-2">Keterangan</th>
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

            {/* Pagination Controls Verifikasi Biaya (ZCO) */}
            {filteredZCOData.length > LOG_PAGE_SIZE && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                <span className="text-xs text-slate-500 font-medium">
                  Menampilkan {((zcoPage - 1) * LOG_PAGE_SIZE) + 1} - {Math.min(zcoPage * LOG_PAGE_SIZE, filteredZCOData.length)} dari {filteredZCOData.length} baris ZCO
                </span>
                <div className="flex gap-2">
                  <button 
                    disabled={zcoPage === 1}
                    onClick={() => setZcoPage(p => p - 1)}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors"
                  >
                    Sebelumnya
                  </button>
                  <button 
                    disabled={zcoPage * LOG_PAGE_SIZE >= filteredZCOData.length}
                    onClick={() => setZcoPage(p => p + 1)}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors"
                  >
                    Selanjutnya
                  </button>
                </div>
              </div>
            )}
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

        {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {/* TAB 2: Summary Regional (Semua Kebun)                      */}
        {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {activeTab === 'summary-regional' && (
          <div className="space-y-4">


            {/* Action Bar (Only visible on screen, hidden when printing) */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap justify-between items-center gap-3 no-print">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                <input type="text" placeholder="Cari plant / kebun..." value={searchPlant} onChange={e => setSearchPlant(e.target.value)}
                  className="pl-9 pr-3 py-2 border border-slate-200 rounded-2xl text-xs w-56 focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30 focus:border-[#064e3b]" />
              </div>

              {/* WA Auto-Send Schedule Info */}
              {isAdmin && (
                <WAScheduleBadge onOpen={() => setShowWAModal(true)} />
              )}

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
                {currentUser?.role === 'DEV' && (
                  <button onClick={handleExportSummary}
                    className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-800 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-sm transition">
                    <FileDown size={13} /> Ekspor Excel
                  </button>
                )}
              </div>
            </div>

          {/* Redesigned Excel-style Monitoring Sheet */}
            <div id="excel-report-sheet" className={`bg-white p-4 border border-slate-300 rounded-2xl shadow-sm font-sans ${screenshotMode ? '' : 'overflow-hidden max-w-[1150px] mx-auto w-full'}`} style={screenshotMode ? { maxWidth: 'none', width: 'fit-content', margin: '0', padding: '16px' } : {}}>
              
              {/* Excel Sheet Title and Header */}

              {screenshotMode && dataReady && (
                <div id="data-ready" style={{ display: 'none' }}></div>
              )}
              <div className="flex justify-between items-start mb-2 border-b border-slate-200 pb-2">
                <div className="font-sans">
                  <h1 
                    onDoubleClick={() => { if(isAdmin) setShowWAModal(true); }}
                    className="text-xs font-extrabold text-slate-900 tracking-wide select-none cursor-default"
                    title={isAdmin ? "Klik ganda untuk konfigurasi WA" : ""}
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
                      return now.toLocaleTimeString('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit' }).replace(':', '.');
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
                            <td className="px-2 py-0.5 no-print text-center">
                              {(!isAdmin && currentUser?.plant && item.plant !== currentUser.plant) ? (
                                <span className="inline-flex items-center justify-center text-slate-300 cursor-not-allowed" title="Akses detail unit lain dibatasi">
                                  <Lock size={12} className="opacity-40" />
                                </span>
                              ) : (
                                <button 
                                  onClick={() => {
                                    setSelectedPlant(item.plant);
                                    setActiveTab('unit-checklist');
                                    window.scrollTo(0, 0);
                                  }}
                                  title="Lihat Detail Checklist Kebun"
                                  className="transition-all duration-200 text-[#064e3b] hover:text-[#065f46] hover:scale-110 cursor-pointer"
                                >
                                  <Eye size={13} />
                                </button>
                              )}
                            </td>
                          </tr>
                        </React.Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls Unit Checklist */}
              {unitFocusedData.vehiclesList.length > LOG_PAGE_SIZE && (
                <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                  <span className="text-xs text-slate-500 font-medium">
                    Menampilkan {((unitPage - 1) * LOG_PAGE_SIZE) + 1} - {Math.min(unitPage * LOG_PAGE_SIZE, unitFocusedData.vehiclesList.length)} dari {unitFocusedData.vehiclesList.length} kendaraan
                  </span>
                  <div className="flex gap-2">
                    <button 
                      disabled={unitPage === 1}
                      onClick={() => setUnitPage(p => p - 1)}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors"
                    >Sebelumnya</button>
                    <button 
                      disabled={unitPage * LOG_PAGE_SIZE >= unitFocusedData.vehiclesList.length}
                      onClick={() => setUnitPage(p => p + 1)}
                      className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors"
                    >Berikutnya</button>
                  </div>
                </div>
              )}

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

        {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {/* TAB 3: Daftar Kendaraan â€” ADMIN & DEV only                 */}
        {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {activeTab === 'detail-veh' && isAdmin && (
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
                    <th className="px-3 py-3 text-center">Vehicle Code</th>
                    <th className="px-3 py-3 text-center">Plant</th>
                    <th className="px-3 py-3 text-center">Deskripsi Plant</th>
                    <th className="px-3 py-3 text-center">Tx. Aktif</th>
                    <th className="px-3 py-3 text-center">Dibatalkan</th>
                    <th className="px-3 py-3 text-center">Total Unit</th>
                    <th className="px-3 py-3 text-center">Total HM/KM</th>
                    <th className="px-3 py-3 text-center">Job Code</th>
                    <th className="px-3 py-3 text-center">Operator</th>
                    <th className="px-3 py-3 text-center">Last Input</th>
                    <th className="px-3 py-3 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vehicleDetailData.length === 0 ? (
                    <tr><td colSpan={11} className="py-16 text-center text-slate-400">Tidak ada data kendaraan.</td></tr>
                  ) : vehicleDetailData.slice((vehPage - 1) * LOG_PAGE_SIZE, vehPage * LOG_PAGE_SIZE).map((v, idx) => (
                    <tr key={v.vehicle_code} className={`hover:bg-emerald-50/40 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                      <td className="px-3 py-2.5 font-bold text-slate-800 font-mono">
                        <button
                          onClick={() => {
                            setSearchVehicle(v.vehicle_code);
                            setLogPage(1);
                            setActiveTab('log-raw');
                            window.scrollTo({ top: 0, behavior: 'smooth' });
                          }}
                          className="text-[#064e3b] hover:underline hover:text-emerald-700 transition font-mono font-bold text-left"
                          title={`Lihat Log Transaksi Asli untuk ${v.vehicle_code}`}
                        >
                          {v.vehicle_code} â†—
                        </button>
                      </td>
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

            {/* Pagination Controls Daftar Kendaraan */}
            {vehicleDetailData.length > LOG_PAGE_SIZE && (
              <div className="p-4 border-t border-slate-100 flex items-center justify-between bg-slate-50/50">
                <span className="text-xs text-slate-500 font-medium">
                  Menampilkan {((vehPage - 1) * LOG_PAGE_SIZE) + 1} - {Math.min(vehPage * LOG_PAGE_SIZE, vehicleDetailData.length)} dari {vehicleDetailData.length} kendaraan
                </span>
                <div className="flex gap-2">
                  <button 
                    disabled={vehPage === 1}
                    onClick={() => setVehPage(p => p - 1)}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors"
                  >Sebelumnya</button>
                  <button 
                    disabled={vehPage * LOG_PAGE_SIZE >= vehicleDetailData.length}
                    onClick={() => setVehPage(p => p + 1)}
                    className="px-3 py-1.5 border border-slate-200 rounded-lg text-xs font-semibold text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50 transition-colors"
                  >Berikutnya</button>
                </div>
              </div>
            )}

          </div>
        )}

        {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {/* TAB 4: Log Transaksi Asli                                 */}
        {/* â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        {activeTab === 'log-raw' && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 flex-wrap bg-slate-50/50">
              <div className="flex gap-2 flex-wrap items-center">
                <div className="relative flex items-center">
                  <Search className="absolute left-3 top-2.5 text-slate-400" size={14} />
                  <input type="text" placeholder="Cari kendaraan, supir..." value={searchVehicle} onChange={e => { setSearchVehicle(e.target.value); setLogPage(1); }}
                    className="pl-9 pr-8 py-2 border border-slate-200 rounded-2xl text-xs w-52 focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30 focus:border-[#064e3b] bg-white" />
                  {searchVehicle && (
                    <button 
                      onClick={() => { setSearchVehicle(''); setLogPage(1); }} 
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                      title="Hapus filter kendaraan"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                <select value={filterUoM} onChange={e => { setFilterUoM(e.target.value); setLogPage(1); }}
                  className="px-3 py-2 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30 focus:border-[#064e3b] bg-white">
                  {uomOptions.map(u => <option key={u} value={u}>{u === 'ALL' ? 'Semua UoM' : `${u} (${UOM_LABEL[u] || u})`}</option>)}
                </select>
                <select value={filterJobCode} onChange={e => { setFilterJobCode(e.target.value); setLogPage(1); }}
                  className="px-3 py-2 border border-slate-200 rounded-2xl text-xs focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30 focus:border-[#064e3b] bg-white">
                  {jobCodeOptions.map(jc => <option key={jc} value={jc}>{jc === 'ALL' ? 'Semua Pekerjaan (Job Code)' : `${jc} â€“ ${JOB_CODE_DESC[jc] || jc}`}</option>)}
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
                    <th className="px-3 py-3 text-center whitespace-nowrap">Activity No.</th>
                    <th className="px-3 py-3 text-center whitespace-nowrap">Veh. Code</th>
                    <th className="px-3 py-3 text-center">Plant</th>
                    <th className="px-3 py-3 text-center">Tanggal</th>
                    <th className="px-3 py-3 text-center">Waktu</th>
                    <th className="px-3 py-3 text-center">Job Code</th>
                    <th className="px-3 py-3 text-center">HM/KM</th>
                    <th className="px-3 py-3 text-center">Unit</th>
                    <th className="px-3 py-3 text-center">UoM</th>
                    <th className="px-3 py-3 text-center">Reference</th>
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
                  Halaman {logPage} dari {totalPages} Â· {filteredLogs.length} transaksi
                </span>
                <div className="flex gap-1">
                  <button onClick={() => setLogPage(1)} disabled={logPage === 1}
                    className="px-3 py-1.5 rounded-2xl text-xs border border-slate-200 disabled:opacity-40 hover:bg-slate-200 bg-white">Â«</button>
                  <button onClick={() => setLogPage(p => Math.max(1, p - 1))} disabled={logPage === 1}
                    className="px-3 py-1.5 rounded-2xl text-xs border border-slate-200 disabled:opacity-40 hover:bg-slate-200 bg-white">â€¹</button>
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
                    className="px-3 py-1.5 rounded-2xl text-xs border border-slate-200 disabled:opacity-40 hover:bg-slate-200 bg-white">â€º</button>
                  <button onClick={() => setLogPage(totalPages)} disabled={logPage === totalPages}
                    className="px-3 py-1.5 rounded-2xl text-xs border border-slate-200 disabled:opacity-40 hover:bg-slate-200 bg-white">Â»</button>
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
                value={searchZco}
                onChange={e => setSearchZco(e.target.value)}
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
              <option value="Cek">âš ï¸ Cek</option>
              <option value="Oke">ðŸŸ¢ Oke</option>
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

        {/* â”€â”€ Summary Metric Cards â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 pb-0 bg-white no-print">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-col justify-between shadow-xs">
            <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">Total Biaya SAP (Cost)</span>
            <span className="text-lg font-extrabold text-slate-900 font-mono mt-1">
              Rp {zcoSummary.totalCost.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5">{filteredZCOData.length} Cost Center terpilih</span>
          </div>
          <div className="bg-emerald-50/50 border border-emerald-200/60 rounded-xl p-3 flex flex-col justify-between shadow-xs">
            <span className="text-[10.5px] font-bold text-emerald-800 uppercase tracking-wider">Total Activity SAP</span>
            <span className="text-lg font-extrabold text-[#064e3b] font-mono mt-1">
              {zcoSummary.totalActivity.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-emerald-600 mt-0.5">Total jam / km seluruh kendaraan</span>
          </div>
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex flex-col justify-between shadow-xs">
            <span className="text-[10.5px] font-bold text-slate-500 uppercase tracking-wider">Rata-rata Tarif (Rate)</span>
            <span className="text-lg font-extrabold text-slate-800 font-mono mt-1">
              Rp {zcoSummary.avgRate.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-slate-400 mt-0.5">Total Biaya / Total Activity</span>
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
                <th className="px-3 py-2 text-center w-[220px]">Cost Center</th>
                <th className="px-3 py-2 text-center">Cost (Biaya SAP)</th>
                <th className="px-3 py-2 text-center text-[#064e3b] font-bold bg-emerald-50/50">Activity</th>
                <th className="px-3 py-2 text-center">Rate (Tarif)</th>
                <th className="px-3 py-2 text-center w-[150px]">Kebun / Unit</th>
                <th className="px-3 py-2 text-center w-[90px]">Cek Status</th>
                <th className="px-3 py-2 text-center w-[280px]">Indikator & Tindak Lanjut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredZCOData.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 font-semibold text-xs">
                    {zcoData.length === 0 
                      ? 'Belum ada data ZCO. Silakan upload file ZCO_CCTR_01.xlsx di atas.' 
                      : 'Tidak ada data biaya yang cocok dengan filter pencarian.'}
                  </td>
                </tr>
              ) : (
                filteredZCOData.slice((zcoPage - 1) * LOG_PAGE_SIZE, zcoPage * LOG_PAGE_SIZE).map((row, idx) => {
                  const formattedCost = row.zcoCost > 0 
                    ? row.zcoCost.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 }) 
                    : '0';
                  const formattedActy = (row.activity || row.logActivity) > 0 
                    ? (row.activity || row.logActivity).toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
                    : '-';
                  const formattedRate = row.zcoRate > 0 
                    ? row.zcoRate.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
                    : '0,00';
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
                      <td className="px-3 py-2 text-right font-extrabold text-[#064e3b] bg-emerald-50/30 font-mono">
                        {formattedActy}
                      </td>
                      <td className="px-3 py-2 text-right text-slate-500 font-mono">
                        {formattedRate}
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
            {filteredZCOData.length > 0 && (
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
                <tr>
                  <td className="px-3 py-2 text-left font-mono text-[11px] font-extrabold text-slate-800">
                    TOTAL ({filteredZCOData.length} Cost Center)
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-[11px] font-extrabold text-slate-900">
                    {zcoSummary.totalCost.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-[11px] font-extrabold text-[#064e3b] bg-emerald-100/50">
                    {zcoSummary.totalActivity.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-3 py-2 text-right font-mono text-[11px] text-slate-700">
                    {zcoSummary.avgRate.toLocaleString('id-ID', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td colSpan={3}></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        </div>
      </div>
    )}

      {/* ðŸ”¥ Danger Zone (Regional only) ðŸ”¥ */}
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
                <p className="text-xs font-bold text-red-700 uppercase tracking-wide">âš  Danger Zone â€” Tindakan Ini Tidak Dapat Dibatalkan</p>
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


    {activeTab === 'fuel-evaluation' && (
      <div className="relative z-10 bg-white/95 backdrop-blur-xs rounded-2xl border border-slate-300 shadow-sm overflow-hidden max-w-[1400px] mx-auto w-full font-sans">
        {/* â”€â”€ Single Unified Filter Bar (Tahun, Bulan, Tanggal, Kebun, Cari) â”€â”€ */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/80 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] flex flex-col md:flex-row md:items-center justify-between gap-3 flex-wrap no-print">
          <div className="flex items-center gap-2.5 flex-wrap flex-1">
            {/* 1. Pilih Tahun */}
            <div className="flex flex-col">
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-0.5">Tahun</label>
              <select
                value={fuelYear}
                onChange={e => { setFuelYear(e.target.value); setFuelPage(1); }}
                className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30"
              >
                {fuelAvailableYears.map(yr => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            </div>

            {/* 2. Pilih Bulan */}
            <div className="flex flex-col">
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-0.5">Bulan</label>
              <select
                value={fuelMonth}
                onChange={e => { setFuelMonth(e.target.value); setFuelPage(1); }}
                className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30"
              >
                <option value="ALL">Semua Bulan</option>
                {MONTH_NAMES.map(m => (
                  <option key={m.val} value={m.val}>{m.val} - {m.label}</option>
                ))}
              </select>
            </div>

            {/* 3. Pilih Tanggal (Optional / Drill-down) */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-0.5">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Tanggal (Opsional)</label>
                {fuelDate && (
                  <button
                    type="button"
                    onClick={() => { setFuelDate(''); setFuelPage(1); }}
                    className="text-[9px] font-bold text-red-600 hover:text-red-700 ml-1.5 cursor-pointer"
                    title="Kembali ke rekap 1 bulan penuh"
                  >
                    âœ• Reset
                  </button>
                )}
              </div>
              <input
                type="date"
                value={fuelDate}
                onChange={e => {
                  const val = e.target.value;
                  setFuelDate(val);
                  setFuelPage(1);
                  if (val) {
                    setFuelYear(val.substring(0, 4));
                    setFuelMonth(val.substring(5, 7));
                  }
                }}
                className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30"
                title="Pilih tanggal untuk melihat detail per hari, atau klik Reset untuk melihat rekap bulanan"
              />
            </div>

            {/* 4. Kebun / Unit Filter */}
            <div className="flex flex-col">
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-0.5">Kebun / Unit</label>
              {isAdmin ? (
                <select
                  value={fuelPlant}
                  onChange={e => { setFuelPlant(e.target.value); setFuelPage(1); }}
                  className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30 max-w-[190px]"
                >
                  <option value="ALL">Semua Kebun / Unit</option>
                  {allPlantsList.map(p => (
                    <option key={p.code} value={p.code}>{p.code} - {p.desc}</option>
                  ))}
                </select>
              ) : (
                <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-bold text-emerald-800">
                  {currentUser?.plant || selectedPlant}
                </div>
              )}
            </div>

            {/* 5. Pencarian (Plat / Equipment / Cost Center / Reference) */}
            <div className="flex flex-col flex-1 min-w-[210px]">
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-0.5">Cari Kendaraan / Rute</label>
              <div className="relative">
                <Search className="absolute left-3 top-2 text-slate-400" size={14} />
                <input
                  type="text"
                  placeholder="Plat / Equipment / CC / Reference..."
                  value={searchFuel}
                  onChange={e => { setSearchFuel(e.target.value); setFuelPage(1); }}
                  className="w-full pl-9 pr-3 py-1.5 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30"
                />
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 shrink-0 self-end">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-xs transition"
            >
              <Printer size={13} /> Cetak
            </button>
            <button
              onClick={handleExportFuel}
              className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition"
            >
              <FileDown size={13} /> Ekspor Excel
            </button>
          </div>
        </div>

        {/* â”€â”€ 3 Essential Summary Cards (Solar First, Then KM/HM, Then Average Efficiency) â”€â”€ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 p-4 bg-white no-print">
          {/* Card 1: TOTAL PEMAKAIAN SOLAR */}
          <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-4 flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-amber-900 uppercase tracking-wider">1. Total Pemakaian Solar</span>
              <Droplet size={18} className="text-amber-600" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-amber-950 font-mono">
                {fuelKPIs.totalLiters.toLocaleString('id-ID')} <span className="text-sm font-bold text-amber-800">Liter</span>
              </span>
              <div className="text-xs font-semibold text-amber-700 mt-0.5 truncate">
                Biaya Solar: Rp {fuelKPIs.totalCost.toLocaleString('id-ID')}
              </div>
            </div>
          </div>

          {/* Card 2: TOTAL REALISASI KERJA */}
          <div className="bg-blue-50/80 border border-blue-200/90 rounded-2xl p-4 flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-blue-900 uppercase tracking-wider">2. Total Realisasi Kerja</span>
              <Activity size={18} className="text-blue-600" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-black text-blue-950 font-mono">
                {fuelKPIs.totalKm.toLocaleString('id-ID')} <span className="text-sm font-bold text-blue-800">KM</span>
                {fuelKPIs.totalHm > 0 && (
                  <span className="text-slate-600 font-normal text-lg"> Â· {fuelKPIs.totalHm.toLocaleString('id-ID')} <span className="text-xs font-bold text-blue-800">HM</span></span>
                )}
              </span>
              <div className="text-xs font-semibold text-blue-700 mt-0.5">
                Realisasi Operasional Kendaraan & Alat Berat
              </div>
            </div>
          </div>

          {/* Card 3: RATA-RATA EFISIENSI BBM */}
          <div className="bg-emerald-50/80 border border-emerald-200/90 rounded-2xl p-4 flex flex-col justify-between shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-emerald-900 uppercase tracking-wider">3. Rata-Rata Efisiensi BBM</span>
              <Gauge size={18} className="text-emerald-600" />
            </div>
            <div className="mt-2">
              <div className="flex items-baseline gap-3 flex-wrap">
                {fuelKPIs.avgKmL > 0 && (
                  <span className="text-2xl font-black text-emerald-950 font-mono">
                    {fuelKPIs.avgKmL} <span className="text-xs font-bold text-emerald-800">KM / L</span>
                  </span>
                )}
                {fuelKPIs.avgLHm > 0 && (
                  <span className="text-2xl font-black text-purple-950 font-mono">
                    {fuelKPIs.avgLHm} <span className="text-xs font-bold text-purple-800">L / HM</span>
                  </span>
                )}
                {fuelKPIs.avgKmL === 0 && fuelKPIs.avgLHm === 0 && (
                  <span className="text-xl font-bold text-slate-400">-</span>
                )}
              </div>
              <div className="text-xs font-semibold text-emerald-700 mt-0.5">
                Standar: Mobil â‰¥ 3.5 KM/L Â· Alat Berat â‰¤ 3.0 L/HM
              </div>
            </div>
          </div>
        </div>

        {/* â”€â”€ Active Filter Status Badge â”€â”€ */}
        <div className="sticky top-0 z-20 px-4 py-2.5 bg-slate-100/95 backdrop-blur-xs border-y border-slate-200 flex items-center justify-between text-xs text-slate-600 shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-700">Filter Aktif:</span>
            <span className="bg-white border border-slate-300 px-2 py-0.5 rounded-md font-semibold text-slate-800">
              {fuelDate ? `Tanggal: ${fuelDate}` : `Periode: ${fuelYear} - ${fuelMonth === 'ALL' ? 'Semua Bulan' : MONTH_NAMES.find(m => m.val === fuelMonth)?.label || fuelMonth}`}
            </span>
            {fuelPlant !== 'ALL' && (
              <span className="bg-white border border-slate-300 px-2 py-0.5 rounded-md font-semibold text-slate-800">
                Unit: {fuelPlant}
              </span>
            )}
            {searchFuel && (
              <span className="bg-white border border-slate-300 px-2 py-0.5 rounded-md font-semibold text-slate-800">
                Cari: "{searchFuel}"
              </span>
            )}
          </div>
          <div className="font-bold text-slate-700">
            {fuelTableData.length} Kendaraan Terdaftar
          </div>
        </div>

        {/* â”€â”€ Clean Table with Sticky/Freeze Header â”€â”€ */}
        <div className="p-4 bg-white">
          <div className="overflow-auto max-h-[calc(100vh-270px)] min-h-[420px] excel-cell-border border border-slate-200 rounded-xl relative shadow-2xs">
            <table className="w-full text-xs border-separate border-spacing-0">
              <thead className="sticky top-0 z-30 shadow-xs">
                <tr className="bg-slate-100 text-slate-800 text-[11px] font-black uppercase tracking-wider text-center whitespace-nowrap">
                  <th className="sticky top-0 z-30 bg-slate-100 px-3 py-3 text-center w-12 border-b border-slate-300">No</th>
                  <th className="sticky top-0 z-30 bg-slate-100 px-3 py-3 text-center w-36 border-b border-slate-300">Kebun / Unit</th>
                  <th className="sticky top-0 z-30 bg-[#ecfdf5] text-emerald-950 font-black border-x border-emerald-200 border-b border-slate-300 px-3 py-3 text-center w-36">
                    No. Equipment
                  </th>
                  <th className="sticky top-0 z-30 bg-slate-100 px-3 py-3 text-center w-32 font-mono border-b border-slate-300">Cost Center</th>
                  <th className="sticky top-0 z-30 bg-slate-100 px-3 py-3 text-center min-w-[200px] border-b border-slate-300">Deskripsi Kendaraan</th>
                  <th className="sticky top-0 z-30 bg-slate-100 text-slate-800 px-3 py-3 text-center min-w-[220px] border-b border-slate-300">Reference / Rute</th>
                  <th className="sticky top-0 z-30 bg-[#fffbeb] text-amber-950 font-black border-x border-amber-200 border-b border-slate-300 px-3 py-3 text-center w-32">
                    Solar (Liter)
                  </th>
                  <th className="sticky top-0 z-30 bg-[#eff6ff] text-blue-950 font-black border-r border-blue-200 border-b border-slate-300 px-3 py-3 text-center w-36">
                    KM / HM
                  </th>
                  <th className="sticky top-0 z-30 bg-[#ecfdf5] text-emerald-950 font-black border-r border-emerald-200 border-b border-slate-300 px-3 py-3 text-center w-36">
                    Rasio / Efisiensi
                  </th>
                  <th className="sticky top-0 z-30 bg-slate-100 text-slate-800 px-3 py-3 text-center border-b border-slate-300 w-36">Biaya Solar</th>
                  <th className="sticky top-0 z-30 bg-slate-100 px-3 py-3 text-center w-24 no-print border-b border-slate-300">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {fuelTableData.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="text-center py-12 text-slate-400">
                      <Fuel size={36} className="mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                      <p className="font-semibold text-slate-600 text-xs">Tidak ada data kendaraan untuk filter ini.</p>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Silakan sesuaikan Tahun/Bulan/Tanggal atau gunakan tombol <span className="font-bold text-amber-700">Upload SALRD / SLARC</span> untuk memperbarui data.
                      </p>
                    </td>
                  </tr>
                ) : (
                  fuelTableData
                    .slice((fuelPage - 1) * FUEL_PAGE_SIZE, fuelPage * FUEL_PAGE_SIZE)
                    .map((row, idx) => {
                      const rowNum = (fuelPage - 1) * FUEL_PAGE_SIZE + idx + 1;
                      const isOptimal = row.status === 'OPTIMAL';
                      const isBoros = row.status === 'BOROS';

                      return (
                        <tr 
                          key={`${row.month || fuelDate}_${row.costCenter}_${idx}`} 
                          className="hover:bg-emerald-50/40 even:bg-slate-50/50 transition-colors"
                        >
                          {/* 1. No */}
                          <td className="px-3 py-2.5 text-center text-slate-500 font-mono font-bold text-xs">{rowNum}</td>

                          {/* 2. Kebun / Unit */}
                          <td className="px-3 py-2.5 text-center">
                            <div className="font-extrabold text-slate-900 text-xs">{row.plant}</div>
                            <div className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">{row.plantDesc || row.plant}</div>
                          </td>

                          {/* 3. No. Equipment (First!) */}
                          <td className="px-3 py-2.5 text-center bg-emerald-50/30 border-x border-emerald-100">
                            {row.equipment && row.equipment !== '-' ? (
                              <span className="font-mono font-black text-xs text-emerald-950 bg-emerald-100/90 px-2 py-0.5 rounded-md border border-emerald-300 inline-block shadow-2xs tracking-wide">
                                {row.equipment}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-mono text-xs italic">-</span>
                            )}
                          </td>

                          {/* 4. Cost Center (Second!) */}
                          <td className="px-3 py-2.5 text-center font-mono font-bold text-slate-800 text-xs">
                            {row.costCenter}
                          </td>

                          {/* 5. Deskripsi Kendaraan */}
                          <td className="px-3.5 py-2.5 text-center">
                            <div className="font-bold text-slate-900 text-xs leading-snug">{row.description || '-'}</div>
                            <span className="inline-block mt-0.5 bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold">{row.objectType || 'VEH'}</span>
                          </td>

                          {/* 6. REFERENCE */}
                          <td className="px-3.5 py-2.5 text-center bg-slate-50/30">
                            <div
                              className="text-xs font-semibold text-slate-800 leading-snug"
                              title={row.referenceAll || row.referencePrimary || '-'}
                            >
                              {row.referencePrimary || '-'}
                            </div>
                          </td>

                          {/* 7. Solar (Liter) â”€â”€ FIRST */}
                          <td className="px-3 py-2.5 text-center font-mono font-black text-amber-950 bg-amber-50/40 border-x border-amber-100 text-xs whitespace-nowrap">
                            {row.debitLiters > 0 ? (
                              <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap font-mono font-black text-xs">
                                <span>{row.debitLiters.toLocaleString('id-ID')}</span>
                                <span className="text-[10px] font-bold text-amber-800 bg-amber-100/80 px-1.5 py-0.2 rounded border border-amber-200">L</span>
                              </span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>

                          {/* 8. KM / HM â”€â”€ SECOND (With verification variance against ZESTHLP16PA) */}
                          <td className="px-3 py-2.5 text-center font-mono font-black text-blue-950 bg-blue-50/40 border-r border-blue-100 text-xs whitespace-nowrap">
                            {row.creditKm > 0 && (
                              <div className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap">
                                <span>{row.creditKm.toLocaleString('id-ID')}</span>
                                <span className="text-[10px] font-bold text-blue-800 bg-blue-100 border border-blue-200 px-1.5 py-0.2 rounded">KM</span>
                                {row.reconcileStatus === 'MATCH' && (
                                  <span className="text-emerald-600 text-xs font-bold" title="Sesuai 100% dengan logbook ZESTHLP16PA">âœ“</span>
                                )}
                                {row.reconcileStatus === 'DIFF' && (
                                  <span className="text-amber-600 text-xs font-bold" title={`Selisih dengan ZEST: ${row.varianceKmHm > 0 ? '+' : ''}${row.varianceKmHm} KM`}>âš ï¸</span>
                                )}
                              </div>
                            )}
                            {row.creditHm > 0 && (
                              <div className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap">
                                <span>{row.creditHm.toLocaleString('id-ID')}</span>
                                <span className="text-[10px] font-bold text-purple-800 bg-purple-100 border border-purple-200 px-1.5 py-0.2 rounded">HM</span>
                                {row.reconcileStatus === 'MATCH' && (
                                  <span className="text-emerald-600 text-xs font-bold" title="Sesuai 100% dengan logbook ZESTHLP16PA">âœ“</span>
                                )}
                                {row.reconcileStatus === 'DIFF' && (
                                  <span className="text-amber-600 text-xs font-bold" title={`Selisih dengan ZEST: ${row.varianceKmHm > 0 ? '+' : ''}${row.varianceKmHm} HM`}>âš ï¸</span>
                                )}
                              </div>
                            )}
                            {row.creditKm === 0 && row.creditHm === 0 && (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>

                          {/* 9. Rasio / Efisiensi */}
                          <td className="px-3 py-2.5 text-center bg-emerald-50/30 border-r border-emerald-100 whitespace-nowrap">
                            {row.kmPerLiter > 0 && (
                              <span className={`font-mono font-black text-xs px-2.5 py-1 rounded-md inline-flex items-center gap-1.5 whitespace-nowrap ${
                                isOptimal ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' :
                                isBoros ? 'bg-rose-100 text-rose-900 border border-rose-300' :
                                'bg-amber-100 text-amber-900 border border-amber-300'
                              }`}>
                                <span>{row.kmPerLiter}</span>
                                <span className="text-[9.5px] font-extrabold opacity-80">KM/L</span>
                              </span>
                            )}
                            {row.literPerHm > 0 && (
                              <span className={`font-mono font-black text-xs px-2.5 py-1 rounded-md inline-flex items-center gap-1.5 whitespace-nowrap ${
                                isOptimal ? 'bg-emerald-100 text-emerald-900 border border-emerald-300' :
                                isBoros ? 'bg-rose-100 text-rose-900 border border-rose-300' :
                                'bg-amber-100 text-amber-900 border border-amber-300'
                              }`}>
                                <span>{row.literPerHm}</span>
                                <span className="text-[9.5px] font-extrabold opacity-80">L/HM</span>
                              </span>
                            )}
                            {row.kmPerLiter === 0 && row.literPerHm === 0 && (
                              <span className="text-slate-400 text-xs">-</span>
                            )}
                          </td>

                          {/* 10. Biaya Solar (Rp) */}
                          <td className="px-3 py-2.5 text-center font-mono font-bold text-xs text-slate-800 whitespace-nowrap">
                            {row.debitRp > 0 ? `Rp ${row.debitRp.toLocaleString('id-ID')}` : '-'}
                          </td>

                          {/* 11. Aksi (Detail) */}
                          <td className="px-3 py-2.5 text-center no-print">
                            <button
                              type="button"
                              onClick={async () => {
                                setSelectedFuelVeh(row);
                                setFuelModalTab(isDevUser ? 'reconcile' : 'debit');
                                // Lazy-load daily data for this vehicle's month if not yet loaded
                                const targetMonth = row.month;
                                if (targetMonth && !fuelLoadedMonthsRef.current.has(targetMonth)) {
                                  fuelLoadedMonthsRef.current.add(targetMonth); // Mark as loaded
                                  try {
                                    const { data: monthlyDaily } = await fetchFuelDailyForMonth(targetMonth);
                                    if (monthlyDaily && monthlyDaily.length > 0) {
                                      setFuelData(prev => {
                                        const existing = new Map((prev.daily || []).map(d => [makeFuelTxKey(d), d]));
                                        for (const d of monthlyDaily) {
                                          const k = makeFuelTxKey(d);
                                          if (!existing.has(k)) existing.set(k, d);
                                        }
                                        return { ...prev, daily: Array.from(existing.values()) };
                                      });
                                    }
                                  } catch(e) {
                                    console.warn('Lazy-load month daily warning:', e);
                                  }
                                }
                              }}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#064e3b] hover:bg-[#065f46] text-white shadow-xs transition hover:scale-[1.02] cursor-pointer"
                            >
                              <Eye size={12} /> Detail
                            </button>
                          </td>
                        </tr>
                      );
                    })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {fuelTableData.length > FUEL_PAGE_SIZE && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-200 text-xs no-print">
              <span className="text-slate-500 font-medium">
                Halaman <strong className="text-slate-800">{fuelPage}</strong> dari <strong className="text-slate-800">{Math.ceil(fuelTableData.length / FUEL_PAGE_SIZE)}</strong>
              </span>
              <div className="flex gap-1.5">
                <button
                  disabled={fuelPage === 1}
                  onClick={() => setFuelPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1 bg-white border border-slate-200 rounded-lg font-bold disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
                >
                  Sebelumnya
                </button>
                <button
                  disabled={fuelPage >= Math.ceil(fuelTableData.length / FUEL_PAGE_SIZE)}
                  onClick={() => setFuelPage(p => p + 1)}
                  className="px-3 py-1 bg-white border border-slate-200 rounded-lg font-bold disabled:opacity-40 hover:bg-slate-50 cursor-pointer"
                >
                  Selanjutnya
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    )}

    {/* â”€â”€ Impeccable Detail Modal with ZESTHLP16PA vs SLARC Reconciliation â”€â”€ */}
    {selectedFuelVeh && (() => {
      const dailyDebitForVeh = (fuelData.daily || []).filter(d => 
        d.c === selectedFuelVeh.costCenter && d.t === 'D' && (!selectedFuelVeh.month || d.m === selectedFuelVeh.month)
      );
      const dailyDebitLiters = dailyDebitForVeh.reduce((acc, d) => acc + (d.q || 0), 0);
      const dailyDebitRp = dailyDebitForVeh.reduce((acc, d) => acc + (d.r || 0), 0);

      const fuelLiters = dailyDebitForVeh.length > 0
        ? Math.round(dailyDebitLiters * 100) / 100
        : (selectedFuelVeh.debitLiters && selectedFuelVeh.debitLiters > 0 ? selectedFuelVeh.debitLiters : 0);

      const fuelCostRp = dailyDebitForVeh.length > 0
        ? Math.round(dailyDebitRp)
        : (selectedFuelVeh.debitRp && selectedFuelVeh.debitRp > 0 ? selectedFuelVeh.debitRp : 0);

      const dailyCreditForVeh = (fuelData.daily || []).filter(d => 
        d.c === selectedFuelVeh.costCenter && d.t === 'C' && (!selectedFuelVeh.month || d.m === selectedFuelVeh.month)
      );
      const dailyCreditQty = dailyCreditForVeh.reduce((acc, d) => acc + (d.q || 0), 0);

      const slarcTotal = dailyCreditForVeh.length > 0
        ? Math.round(dailyCreditQty * 100) / 100
        : ((selectedFuelVeh.creditKm || selectedFuelVeh.creditHm || 0) > 0
          ? (selectedFuelVeh.creditKm || selectedFuelVeh.creditHm)
          : 0);

      const zestTotal = selectedFuelVeh.zestTotalKmHm || 0;
      const variance = Math.round((slarcTotal - zestTotal) * 100) / 100;
      const uomLabel = (selectedFuelVeh.creditKm > 0 || dailyCreditForVeh.some(d => d.u === 'KM'))
        ? 'KM'
        : (selectedFuelVeh.creditHm > 0 || dailyCreditForVeh.some(d => d.u === 'HM' || d.u === 'HR'))
        ? 'HM'
        : (selectedFuelVeh.objectType && ['TRACTOR', 'EXCAVATOR', 'GRADER', 'WLOADER', 'HEAVY'].some(h => (selectedFuelVeh.objectType || '').toUpperCase().includes(h)))
        ? 'HM'
        : 'KM';

      // Build daily reconciliation list
      const slarcDailyList = selectedFuelVeh.matchedSlarcDaily || [];
      const zestDailyList = selectedFuelVeh.matchedZestLogs || [];

      // Map combined dates
      const combinedDateMap = new Map();
      slarcDailyList.forEach(d => {
        if (!combinedDateMap.has(d.d)) {
          combinedDateMap.set(d.d, { date: d.d, slarcQty: 0, zestQty: 0, doc: d.doc, ref: d.n, u: d.u });
        }
        combinedDateMap.get(d.d).slarcQty += (d.q || 0);
      });
      zestDailyList.forEach(l => {
        if (!combinedDateMap.has(l.date)) {
          combinedDateMap.set(l.date, { date: l.date, slarcQty: 0, zestQty: 0, doc: l.document_number, ref: l.reference || l.remarks, u: l.uom });
        }
        const item = combinedDateMap.get(l.date);
        item.zestQty += (parseFloat(l.hm_km) || 0);
        if (!item.ref || item.ref === '-') item.ref = l.reference || l.remarks;
        if (!item.doc || item.doc === '-') item.doc = l.document_number;
      });

      const reconciliationRows = Array.from(combinedDateMap.values()).sort((a, b) => b.date.localeCompare(a.date));
      const effectiveModalTab = (!isDevUser && (fuelModalTab === 'reconcile' || fuelModalTab === 'zest')) ? 'debit' : fuelModalTab;
      if (reconciliationRows.length === 0 && (slarcTotal > 0 || zestTotal > 0)) {
        reconciliationRows.push({
          date: selectedFuelVeh.month || 'Periode Ini',
          doc: 'SAP Credit (SLARC)',
          ref: selectedFuelVeh.referencePrimary || selectedFuelVeh.slarcRefPrimary || 'Realisasi SAP Bulanan',
          slarcQty: slarcTotal,
          zestQty: zestTotal,
          u: uomLabel
        });
      }

      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 no-print animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-slate-300 shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <Fuel size={18} className="text-amber-400" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-800">
                    Audit Kendaraan: BBM Solar & Logbook Operasional
                  </span>
                </div>
                <h3 className="text-lg font-black text-white">{selectedFuelVeh.description || selectedFuelVeh.costCenter}</h3>
                <p className="text-xs text-slate-300 mt-1 flex items-center gap-2 flex-wrap">
                  <span>No. Equipment: <strong className="font-mono text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-700">{selectedFuelVeh.equipment && selectedFuelVeh.equipment !== '-' ? selectedFuelVeh.equipment : 'Unmapped'}</strong></span>
                  <span>Â·</span>
                  <span>Cost Center: <strong className="font-mono text-amber-300">{selectedFuelVeh.costCenter}</strong></span>
                  <span>Â·</span>
                  <span>Unit: <strong className="text-white">{selectedFuelVeh.plant} ({selectedFuelVeh.plantDesc})</strong></span>
                </p>
              </div>
              <button
                onClick={() => setSelectedFuelVeh(null)}
                className="text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800 transition cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Source of Reference Info Banner (Role DEV only) */}
            {isDevUser && (
              <div className="px-5 pt-3 pb-0 bg-slate-50">
              <div className={`p-2.5 rounded-xl border flex items-center justify-between gap-3 text-xs flex-wrap ${
                selectedFuelVeh.referencePriority === 1 || selectedFuelVeh.referencePriority === 2
                  ? 'bg-emerald-50/90 border-emerald-200 text-emerald-950'
                  : selectedFuelVeh.referencePriority === 3
                  ? 'bg-amber-50/90 border-amber-200 text-amber-950'
                  : 'bg-blue-50/90 border-blue-200 text-blue-950'
              }`}>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                    selectedFuelVeh.referencePriority === 1 || selectedFuelVeh.referencePriority === 2
                      ? 'bg-emerald-200 text-emerald-900'
                      : selectedFuelVeh.referencePriority === 3
                      ? 'bg-amber-200 text-amber-900'
                      : 'bg-blue-200 text-blue-900'
                  }`}>
                    {selectedFuelVeh.referencePriority === 1 ? 'P1: ZEST REF' :
                     selectedFuelVeh.referencePriority === 2 ? 'P2: ZEST PEKERJAAN' :
                     selectedFuelVeh.referencePriority === 3 ? `P3: REF. TERAKHIR (${selectedFuelVeh.referenceLatestPeriod || 'Bulan Lain'})` :
                     'P4: SLARC SAP (CREDIT)'}
                  </span>
                  <span className="font-semibold text-[11px]">
                    <strong className="text-slate-800">Keterangan:</strong> {selectedFuelVeh.referenceAll || selectedFuelVeh.referencePrimary || '-'}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-medium italic">
                  {selectedFuelVeh.referencePriority === 4
                    ? 'Logbook ZESTHLP16PA belum di-upload (Keterangan diambil dari SAP SLARC)'
                    : selectedFuelVeh.referencePriority === 3
                    ? `Diambil dari riwayat logbook terakhir (${selectedFuelVeh.referenceLatestPeriod})`
                    : 'Terhubung langsung dengan logbook ZESTHLP16PA'}
                </span>
              </div>
              </div>
            )}

            {/* Reconciliation Comparison Top Banner */}
            <div className="bg-slate-50 border-b border-slate-200 p-4">
              <div className={`grid grid-cols-1 ${isDevUser ? 'sm:grid-cols-4' : 'sm:grid-cols-2'} gap-3 items-center`}>
                {/* 1. Bahan Bakar (L) */}
                <div 
                  onClick={() => setFuelModalTab('debit')}
                  className={`bg-white p-3 rounded-xl border transition shadow-2xs text-center cursor-pointer hover:scale-[1.01] ${
                    effectiveModalTab === 'debit' ? 'border-amber-400 ring-2 ring-amber-100 bg-amber-50/20' : 'border-slate-200 hover:border-amber-200'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-amber-900 uppercase">
                    <Droplet size={11} className="text-amber-600" />
                    <span>1. Bahan Bakar (L)</span>
                  </div>
                  <div className="text-lg font-black text-amber-950 font-mono mt-0.5">
                    {fuelLiters.toLocaleString('id-ID')} <span className="text-xs font-bold text-slate-500">L</span>
                  </div>
                  <span className="text-[9.5px] text-slate-500 font-medium">
                    {fuelCostRp > 0 ? `Rp ${fuelCostRp.toLocaleString('id-ID')} · Total Pemakaian Solar` : 'Total Pemakaian Solar'}
                  </span>
                </div>

                {/* 2. KM/HM */}
                <div 
                  onClick={() => setFuelModalTab('credit')}
                  className={`bg-white p-3 rounded-xl border transition shadow-2xs text-center cursor-pointer hover:scale-[1.01] ${
                    effectiveModalTab === 'credit' ? 'border-blue-400 ring-2 ring-blue-100 bg-blue-50/20' : 'border-slate-200 hover:border-blue-200'
                  }`}
                >
                  <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-blue-900 uppercase">
                    <Activity size={11} className="text-blue-600" />
                    <span>{isDevUser ? '2. KM/HM (SLARC)' : '2. KM/HM'}</span>
                  </div>
                  <div className="text-lg font-black text-blue-900 font-mono mt-0.5">
                    {slarcTotal.toLocaleString('id-ID')} <span className="text-xs font-bold text-slate-500">{uomLabel}</span>
                  </div>
                  <span className="text-[9.5px] text-slate-400">Posting Output Aktivitas</span>
                </div>

                {isDevUser && (
                  <>
                    {/* 3. ZESTHLP16PA (Logbook) - DEV ONLY */}
                    <div 
                      onClick={() => setFuelModalTab('zest')}
                      className={`bg-white p-3 rounded-xl border transition shadow-2xs text-center cursor-pointer hover:scale-[1.01] ${
                        effectiveModalTab === 'zest' ? 'border-emerald-400 ring-2 ring-emerald-100 bg-emerald-50/20' : 'border-slate-200 hover:border-emerald-200'
                      }`}
                    >
                      <span className="text-[10px] font-bold text-slate-500 uppercase">3. ZESTHLP16PA (Logbook)</span>
                      <div className="text-lg font-black text-emerald-900 font-mono mt-0.5">
                        {zestTotal.toLocaleString('id-ID')} <span className="text-xs font-bold text-slate-500">{uomLabel}</span>
                      </div>
                      <span className="text-[9.5px] text-slate-400">Total HM/KM dari Logbook</span>
                    </div>

                    {/* 4. Status Rekonsiliasi - DEV ONLY */}
                    <div 
                      onClick={() => setFuelModalTab('reconcile')}
                      className={`p-3 rounded-xl border text-center transition cursor-pointer hover:scale-[1.01] ${
                        effectiveModalTab === 'reconcile' ? 'ring-2 ring-emerald-200 ' : ''
                      }${
                        variance === 0 && (slarcTotal > 0 || zestTotal > 0)
                          ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                          : slarcTotal > 0 && zestTotal > 0
                          ? 'bg-amber-50 border-amber-200 text-amber-900'
                          : 'bg-slate-100 border-slate-200 text-slate-700'
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase">Status Rekonsiliasi</span>
                      <div className="text-sm font-black mt-0.5 flex items-center justify-center gap-1.5">
                        {variance === 0 && (slarcTotal > 0 || zestTotal > 0) ? (
                          <>
                            <CheckCircle size={15} className="text-emerald-600" />
                            <span>100% SESUAI (Klop)</span>
                          </>
                        ) : slarcTotal > 0 && zestTotal > 0 ? (
                          <>
                            <AlertTriangle size={15} className="text-amber-600" />
                            <span>Selisih: {variance > 0 ? `+${variance}` : variance} {uomLabel}</span>
                          </>
                        ) : (
                          <>
                            <Info size={15} className="text-slate-500" />
                            <span>{slarcTotal > 0 ? 'Tercatat di SLARC' : 'Tercatat di ZEST'}</span>
                          </>
                        )}
                      </div>
                      <span className="text-[9.5px] font-medium block mt-0.5">
                        {variance === 0 ? 'Tidak ada perbedaan nilai output' : 'Perlu sinkronisasi logbook'}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-200 px-4 pt-3 gap-2 bg-white flex-wrap">
              {isDevUser && (
                <>
              <button
                onClick={() => setFuelModalTab('reconcile')}
                className={`px-3 py-1.5 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  effectiveModalTab === 'reconcile'
                    ? 'border-indigo-600 text-indigo-900 bg-indigo-50/50 rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Activity size={13} className="text-indigo-600" /> Verifikasi KM/HM ({reconciliationRows.length})
              </button>
              <button
                onClick={() => setFuelModalTab('zest')}
                className={`px-3 py-1.5 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  effectiveModalTab === 'zest'
                    ? 'border-emerald-600 text-emerald-900 bg-emerald-50/50 rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Calendar size={13} className="text-emerald-600" /> Log ZESTHLP16PA ({selectedFuelVeh.matchedZestLogs?.length || 0})
              </button>
                              </>
              )}
              <button
                onClick={() => setFuelModalTab('debit')}
                className={`px-3 py-1.5 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  effectiveModalTab === 'debit'
                    ? 'border-amber-600 text-amber-900 bg-amber-50/50 rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Droplet size={13} className="text-amber-600" /> Pengisian Solar ({(fuelData.daily || []).filter(d => d.c === selectedFuelVeh.costCenter && d.t === 'D' && (!selectedFuelVeh.month || d.m === selectedFuelVeh.month)).length})
              </button>
              <button
                onClick={() => setFuelModalTab('credit')}
                className={`px-3 py-1.5 text-xs font-bold border-b-2 transition flex items-center gap-1.5 cursor-pointer ${
                  effectiveModalTab === 'credit'
                    ? 'border-blue-600 text-blue-900 bg-blue-50/50 rounded-t-lg'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <FileSpreadsheet size={13} className="text-blue-600" /> Transaksi SLARC ({(fuelData.daily || []).filter(d => d.c === selectedFuelVeh.costCenter && d.t === 'C' && (!selectedFuelVeh.month || d.m === selectedFuelVeh.month)).length})
              </button>
            </div>

            {/* Modal Body Table Content */}
            <div className="p-4 overflow-y-auto flex-1">
              {/* TAB 1: RECONCILIATION SIDE BY SIDE */}
              {isDevUser && effectiveModalTab === 'reconcile' && (
                <div>
                  {reconciliationRows.length === 0 ? (
                    <div className="text-center py-10 text-slate-400">
                      <Activity size={36} className="mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                      <p className="font-semibold text-slate-600 text-xs">Belum ada data transaksi aktivitas harian untuk kendaraan ini.</p>
                    </div>
                  ) : (
                    <table className="w-full text-[11px] border-collapse excel-cell-border text-center">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px]">
                          <th className="px-2.5 py-1.5 text-center w-10">No</th>
                          <th className="px-3 py-1.5 text-center w-24">Tanggal</th>
                          <th className="px-3 py-1.5 text-center w-28">No. Dokumen</th>
                          <th className="px-3 py-1.5 text-center w-48">Reference / Keterangan</th>
                          <th className="px-3 py-1.5 text-center w-24 bg-blue-50 text-blue-950 font-bold">SLARC</th>
                          <th className="px-3 py-1.5 text-center w-24 bg-emerald-50 text-emerald-950 font-bold">ZESTHLP16PA</th>
                          <th className="px-3 py-1.5 text-center w-20">Selisih</th>
                          <th className="px-3 py-1.5 text-center w-24">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {reconciliationRows.map((r, i) => {
                          const diff = Math.round((r.slarcQty - r.zestQty) * 100) / 100;
                          const isMatch = Math.abs(diff) < 0.01 && r.slarcQty > 0 && r.zestQty > 0;

                          return (
                            <tr key={i} className="hover:bg-slate-50 text-center">
                              <td className="px-2.5 py-1.5 text-center font-mono text-slate-400">{i + 1}</td>
                              <td className="px-3 py-1.5 text-center font-mono font-medium text-slate-800">{r.date}</td>
                              <td className="px-3 py-1.5 text-center font-mono text-[10px] text-slate-600">{r.doc || '-'}</td>
                              <td className="px-3 py-1.5 text-center text-slate-800 font-semibold truncate max-w-xs">{r.ref || '-'}</td>
                              <td className="px-3 py-1.5 text-center font-mono font-bold text-blue-900 bg-blue-50/30">
                                {r.slarcQty > 0 ? r.slarcQty : '-'}
                              </td>
                              <td className="px-3 py-2 text-center font-mono font-bold text-emerald-900 bg-emerald-50/30">
                                {r.zestQty > 0 ? r.zestQty : '-'}
                              </td>
                              <td className="px-3 py-1.5 text-center font-mono text-[10px]">
                                {diff !== 0 ? (
                                  <span className="text-amber-700 font-bold">{diff > 0 ? `+${diff}` : diff}</span>
                                ) : (
                                  <span className="text-emerald-700 font-bold">0</span>
                                )}
                              </td>
                              <td className="px-3 py-1.5 text-center">
                                {isMatch ? (
                                  <span className="inline-block px-2 py-0.5 text-[9px] font-bold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    Sesuai
                                  </span>
                                ) : r.slarcQty > 0 && r.zestQty > 0 ? (
                                  <span className="inline-block px-2 py-0.5 text-[9px] font-bold rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                                    Selisih
                                  </span>
                                ) : (
                                  <span className="inline-block px-2 py-0.5 text-[9px] font-medium rounded-full bg-slate-100 text-slate-600">
                                    {r.slarcQty > 0 ? 'Hanya SLARC' : 'Hanya ZEST'}
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-slate-100 font-extrabold text-[11px] text-slate-800 border-t-2 border-slate-300">
                          <td colSpan={4} className="px-3 py-2 text-center uppercase tracking-wide">
                            Total ({reconciliationRows.length} Transaksi)
                          </td>
                          <td className="px-3 py-2 text-center font-mono font-black text-blue-950 bg-blue-100/50">
                            {Math.round(reconciliationRows.reduce((acc, r) => acc + (r.slarcQty || 0), 0) * 100) / 100} <span className="text-[10px] text-slate-500 font-normal">{uomLabel}</span>
                          </td>
                          <td className="px-3 py-2 text-center font-mono font-black text-emerald-950 bg-emerald-100/50">
                            {Math.round(reconciliationRows.reduce((acc, r) => acc + (r.zestQty || 0), 0) * 100) / 100} <span className="text-[10px] text-slate-500 font-normal">{uomLabel}</span>
                          </td>
                          <td className="px-3 py-2 text-center font-mono text-[10px]">
                            {(() => {
                              const totalSlarc = reconciliationRows.reduce((acc, r) => acc + (r.slarcQty || 0), 0);
                              const totalZest = reconciliationRows.reduce((acc, r) => acc + (r.zestQty || 0), 0);
                              const diff = Math.round((totalSlarc - totalZest) * 100) / 100;
                              return diff !== 0 ? <span className="text-amber-700 font-bold">{diff > 0 ? `+${diff}` : diff}</span> : <span className="text-emerald-700 font-bold">0</span>;
                            })()}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span className="text-[10px] font-bold text-slate-600">Ringkasan</span>
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  )}
                </div>
              )}

              {/* TAB 2: ZESTHLP16PA LOGS & REFERENCES */}
              {isDevUser && effectiveModalTab === 'zest' && (() => {
                const zestList = (selectedFuelVeh.matchedZestLogs && selectedFuelVeh.matchedZestLogs.length > 0)
                  ? selectedFuelVeh.matchedZestLogs
                  : (selectedFuelVeh.allZestLogs || []);
                const isDifferentPeriod = (!selectedFuelVeh.matchedZestLogs || selectedFuelVeh.matchedZestLogs.length === 0) && zestList.length > 0;

                if (zestList.length === 0) {
                  return (
                    <div className="text-center py-10 text-slate-400">
                      <Calendar size={36} className="mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                      <p className="font-semibold text-slate-600 text-xs">Belum ada catatan log ZESTHLP16PA untuk nomor equipment ini di periode {selectedFuelVeh.month || 'ini'}.</p>
                    </div>
                  );
                }

                return (
                  <div>
                    {isDifferentPeriod && (
                      <div className="mb-3 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center gap-2">
                        <span className="font-bold">Info:</span> Menampilkan riwayat logbook dari periode sebelumnya ({selectedFuelVeh.referenceLatestPeriod || 'Bulan Lain'}) karena belum ada log ZEST untuk bulan {selectedFuelVeh.month}.
                      </div>
                    )}
                    <table className="w-full text-[11px] border-collapse excel-cell-border text-center">
                      <thead>
                        <tr className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px]">
                          <th className="px-2.5 py-1.5 text-center w-10">No</th>
                          <th className="px-3 py-1.5 text-center w-24">Tanggal</th>
                          <th className="px-3 py-1.5 text-center w-48">Reference (Rute / Pemakaian)</th>
                          <th className="px-3 py-1.5 text-center">Remarks (Catatan)</th>
                          <th className="px-3 py-1.5 text-center w-20">HM/KM</th>
                          <th className="px-3 py-1.5 text-center w-24">Operator</th>
                          <th className="px-3 py-1.5 text-center w-24">Lokasi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {zestList.map((l, i) => (
                          <tr key={i} className="hover:bg-slate-50 text-center">
                            <td className="px-2.5 py-1.5 text-center font-mono text-slate-400">{i + 1}</td>
                            <td className="px-3 py-1.5 text-center font-mono font-medium text-slate-800">{l.date}</td>
                            <td className="px-3 py-1.5 text-center font-bold text-emerald-900">{l.reference || '-'}</td>
                            <td className="px-3 py-1.5 text-center text-slate-600">{l.remarks || '-'}</td>
                            <td className="px-3 py-1.5 text-center font-mono font-bold text-slate-800">{l.hm_km}</td>
                            <td className="px-3 py-1.5 text-center text-slate-600 font-mono text-[10px]">{l.operator || '-'}</td>
                            <td className="px-3 py-1.5 text-center text-slate-500 font-mono text-[10px]">{l.location_code || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-emerald-50/80 font-extrabold text-[11px] text-slate-800 border-t-2 border-emerald-200">
                          <td colSpan={4} className="px-3 py-2 text-center uppercase tracking-wide text-emerald-950">
                            Total ZEST ({zestList.length} Log)
                          </td>
                          <td className="px-3 py-2 text-center font-mono font-black text-emerald-950">
                            {Math.round(zestList.reduce((acc, l) => acc + (parseFloat(l.hm_km) || 0), 0) * 100) / 100} <span className="text-[10px] text-slate-500 font-normal">{uomLabel}</span>
                          </td>
                          <td colSpan={2} className="px-3 py-2 text-center text-[10px] text-emerald-900 font-medium">
                            {isDifferentPeriod ? 'Riwayat Periode Lain' : 'Logbook Periode Ini'}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                );
              })()}

              {/* TAB 3: DEBIT FUEL */}
              {effectiveModalTab === 'debit' && (() => {
                const matchedDaily = (fuelData.daily || []).filter(d =>
                  d.c === selectedFuelVeh.costCenter && d.t === 'D' && (!selectedFuelVeh.month || d.m === selectedFuelVeh.month)
                );

                if (matchedDaily.length === 0) {
                  return (
                    <div className="text-center py-10 text-slate-400">
                      <Droplet size={36} className="mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                      <p className="font-semibold text-slate-600 text-xs">Tidak ada detail transaksi pengisian solar harian tercatat untuk kendaraan ini pada periode {selectedFuelVeh.month || 'ini'}.</p>
                    </div>
                  );
                }

                return (
                  <table className="w-full text-[11px] border-collapse excel-cell-border text-center">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px]">
                        <th className="px-2.5 py-1.5 text-center w-10">No</th>
                        <th className="px-3 py-1.5 text-center w-24">Tanggal</th>
                        <th className="px-3 py-1.5 text-center w-28">No. Dokumen</th>
                        <th className="px-3 py-1.5 text-center w-24">Jumlah</th>
                        <th className="px-3 py-1.5 text-center w-28">Nilai (Rp)</th>
                        <th className="px-3 py-1.5 text-center">Uraian / SPBU</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {matchedDaily.map((d, i) => (
                        <tr key={i} className="hover:bg-slate-50 text-center">
                          <td className="px-2.5 py-1.5 text-center font-mono text-slate-400">{i + 1}</td>
                          <td className="px-3 py-1.5 text-center font-mono font-medium text-slate-800">{d.d}</td>
                          <td className="px-3 py-1.5 text-center font-mono text-[10px] text-slate-600">{d.doc || '-'}</td>
                          <td className={`px-3 py-1.5 text-center font-mono font-black ${d.q < 0 ? 'text-red-600' : 'text-amber-950'}`}>
                            {d.q < 0 ? `- ${Math.abs(d.q).toLocaleString('id-ID')}` : d.q.toLocaleString('id-ID')} <span className="text-[10px] text-slate-500 font-normal">L</span>
                          </td>
                          <td className={`px-3 py-1.5 text-center font-mono ${d.r < 0 ? 'text-red-600 font-bold' : 'text-slate-700'}`}>
                            {d.r !== 0 ? `${d.r < 0 ? '- Rp ' : 'Rp '}${Math.abs(d.r).toLocaleString('id-ID')}` : '-'}
                          </td>
                          <td className="px-3 py-1.5 text-center text-slate-600 text-[10.5px] truncate max-w-xs">{d.n || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-amber-50/80 font-extrabold text-[11px] text-slate-800 border-t-2 border-amber-200">
                        <td colSpan={3} className="px-3 py-2 text-center uppercase tracking-wide text-amber-950">
                          Total Pengisian ({matchedDaily.length} Transaksi)
                        </td>
                        <td className="px-3 py-2 text-center font-mono font-black text-amber-950">
                          {Math.round(matchedDaily.reduce((acc, d) => acc + (d.q || 0), 0) * 100) / 100} <span className="text-[10px] text-slate-500 font-normal">L</span>
                        </td>
                        <td className="px-3 py-2 text-center font-mono font-bold text-slate-800">
                          Rp {Math.round(matchedDaily.reduce((acc, d) => acc + (d.r || 0), 0)).toLocaleString('id-ID')}
                        </td>
                        <td className="px-3 py-2 text-center text-[10px] text-amber-900 font-medium">
                          Total Pemakaian Debit SAP
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                );
              })()}

              {/* TAB 4: SLARC DAILY CREDIT */}
              {effectiveModalTab === 'credit' && (() => {
                const matchedDaily = (fuelData.daily || []).filter(d =>
                  d.c === selectedFuelVeh.costCenter && d.t === 'C' && (!selectedFuelVeh.month || d.m === selectedFuelVeh.month)
                );

                if (matchedDaily.length === 0) {
                  return (
                    <div className="text-center py-10 text-slate-400">
                      <FileSpreadsheet size={36} className="mx-auto mb-2 text-slate-300 stroke-[1.5]" />
                      <p className="font-semibold text-slate-600 text-xs">Tidak ada detail transaksi aktivitas SLARC tercatat untuk kendaraan ini pada periode {selectedFuelVeh.month || 'ini'}.</p>
                    </div>
                  );
                }

                return (
                  <table className="w-full text-[11px] border-collapse excel-cell-border text-center">
                    <thead>
                      <tr className="bg-slate-100 text-slate-700 font-extrabold uppercase text-[10px]">
                        <th className="px-2.5 py-1.5 text-center w-10">No</th>
                        <th className="px-3 py-1.5 text-center w-24">Tanggal</th>
                        <th className="px-3 py-1.5 text-center w-28">No. Dokumen</th>
                        <th className="px-3 py-1.5 text-center w-24">Jumlah</th>
                        <th className="px-3 py-1.5 text-center">Uraian SAP</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {matchedDaily.map((d, i) => (
                        <tr key={i} className="hover:bg-slate-50 text-center">
                          <td className="px-2.5 py-1.5 text-center font-mono text-slate-400">{i + 1}</td>
                          <td className="px-3 py-1.5 text-center font-mono font-medium text-slate-800">{d.d}</td>
                          <td className="px-3 py-1.5 text-center font-mono text-[10px] text-slate-600">{d.doc || '-'}</td>
                          <td className="px-3 py-1.5 text-center font-mono font-black text-blue-950">
                            {d.q.toLocaleString('id-ID')} <span className="text-[10px] text-slate-500 font-normal">{d.u}</span>
                          </td>
                          <td className="px-3 py-1.5 text-center text-slate-600 text-[10.5px] truncate max-w-xs">{d.n || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-blue-50/80 font-extrabold text-[11px] text-slate-800 border-t-2 border-blue-200">
                        <td colSpan={3} className="px-3 py-2 text-center uppercase tracking-wide text-blue-950">
                          Total SLARC ({matchedDaily.length} Transaksi)
                        </td>
                        <td className="px-3 py-2 text-center font-mono font-black text-blue-950">
                          {Math.round(matchedDaily.reduce((acc, d) => acc + (d.q || 0), 0) * 100) / 100} <span className="text-[10px] text-slate-600 font-normal">{matchedDaily[0]?.u || uomLabel}</span>
                        </td>
                        <td className="px-3 py-2 text-center text-[10px] text-blue-900 font-medium">
                          Sesuai Ringkasan Aktivitas SAP
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-100 px-4 py-3 border-t border-slate-200 flex justify-end">
              <button
                onClick={() => setSelectedFuelVeh(null)}
                className="bg-slate-800 hover:bg-slate-900 text-white px-4 py-1.5 rounded-xl text-xs font-bold transition shadow-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      );
    })()}


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
