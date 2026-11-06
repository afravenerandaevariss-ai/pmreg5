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

export const MONTH_NAMES = [
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
export function parseSapNumber(raw) {
  if (raw === null || raw === undefined || raw === '') return 0;
  if (typeof raw === 'number') return isNaN(raw) ? 0 : raw;
  let s = String(raw).trim();
  if (!s || s === '-') return 0;
  let isNeg = false;
  if (s.endsWith('-')) {
    isNeg = true;
    s = s.slice(0, -1).trim();
  } else if (s.startsWith('-')) {
    isNeg = true;
    s = s.substring(1).trim();
  }
  if (s.includes('.') && s.includes(',')) {
    s = s.replace(/\./g, '').replace(/,/g, '.');
  } else if (s.includes('.')) {
    const parts = s.split('.');
    if (parts.length > 2) {
      s = s.replace(/\./g, '');
    } else if (parts[1].length === 3 && parts[0].length >= 1) {
      s = s.replace(/\./g, '');
    }
  } else if (s.includes(',')) {
    s = s.replace(/,/g, '.');
  }
  const num = parseFloat(s);
  if (isNaN(num)) return 0;
  return isNeg ? -num : num;
}


// ─── Fuel Efficiency Evaluation Rules Matrix (MID(5,3) with 10% Tolerance) ────
export const VEHICLE_EFFICIENCY_RULES = {
  CAR: { name: 'Mobil Penumpang', type: 'KM/L', target: 7.0, tolerance: 0.10, desc: 'Min 7.0 KM/L' },
  DTR: { name: 'Dump Truck',      type: 'KM/L', target: 5.0, tolerance: 0.10, desc: 'Min 5.0 KM/L' },
  MOT: { name: 'Sepeda Motor',    type: 'KM/L', target: 30.0, tolerance: 0.10, desc: 'Min 30.0 KM/L' },
  QUT: { name: 'Quick Truck',     type: 'L/HM', target: 1.5, tolerance: 0.10, desc: 'Maks 1.5 L/HM' },
  WLD: { name: 'Mini Wheel Dump', type: 'L/HM', target: 5.5, tolerance: 0.10, desc: 'Maks 5.5 L/HM' },
  TRA: { name: 'Wheel Tractor',   type: 'L/HM', target: 7.0, tolerance: 0.10, desc: 'Maks 7.0 L/HM' },
  COM: { name: 'Compactor',       type: 'L/HM', target: 8.0, tolerance: 0.10, desc: 'Maks 8.0 L/HM' },
  TRB: { name: 'Traktor Besar',   type: 'L/HM', target: 9.0, tolerance: 0.10, desc: 'Maks 9.0 L/HM' },
  GRA: { name: 'Motor Grader',    type: 'L/HM', target: 12.0, tolerance: 0.10, desc: 'Maks 12.0 L/HM' },
  WLO: { name: 'Wheel Loader',    type: 'L/HM', target: 12.0, tolerance: 0.10, desc: 'Maks 12.0 L/HM' },
  EXC: { name: 'Excavator',       type: 'L/HM', target: 18.0, tolerance: 0.10, desc: 'Maks 18.0 L/HM' },
};

export function getVehicleTypeCode(costCenter, fallbackType = '') {
  const cc = String(costCenter || '').trim().toUpperCase();
  if (cc.length >= 7) {
    const code = cc.substring(4, 7);
    if (VEHICLE_EFFICIENCY_RULES[code]) return code;
  }
  const fb = String(fallbackType || '').trim().toUpperCase();
  if (VEHICLE_EFFICIENCY_RULES[fb]) return fb;
  for (const k of Object.keys(VEHICLE_EFFICIENCY_RULES)) {
    if (cc.includes(k) || fb.includes(k)) return k;
  }
  return 'CAR';
}
export function extractLitersFromText(text) {
  if (!text) return 0;
  const m = String(text).match(/(\d+(?:[.,]\d+)?)\s*(?:ltr|liter|l\b)/i);
  return m ? parseFloat(m[1].replace(',', '.')) : 0;
}

export function evaluateFuelEfficiency(costCenter, debitLiters, creditKm, creditHm, fallbackType = '', refText = '') {
  const code = getVehicleTypeCode(costCenter, fallbackType);
  const rule = VEHICLE_EFFICIENCY_RULES[code] || VEHICLE_EFFICIENCY_RULES.CAR;
  const isKmL = rule.type === 'KM/L';
  const debitL = Math.max(0, parseFloat(debitLiters) || 0);
  const creditK = Math.max(0, parseFloat(creditKm) || 0);
  const creditH = Math.max(0, parseFloat(creditHm) || 0);

  // Check dummy standby/rusak/libur (SAP operators post dummy 1 KM/HM when idle or broken)
  const isStandby = (debitL === 0 && ((creditK > 0 && creditK <= 2) || (creditH > 0 && creditH <= 2)) &&
    /standby|standbaye|rusak|libur|perbaikan|servis|breakdown/i.test(refText));

  if (isStandby) {
    return {
      status: 'STANDBY',
      ratioVal: 0,
      uom: rule.type,
      color: 'slate',
      isStandby: true,
      badgeLabel: 'Standby / Rusak',
      targetText: 'Unit Standby / Rusak / Libur (Dummy 1 KM/HM SAP)',
      rule,
      code
    };
  }

  if (debitL === 0 && creditK === 0 && creditH === 0) {
    return { status: 'NO_DATA', ratioVal: 0, uom: rule.type, color: 'slate', badgeLabel: 'Tanpa Data', targetText: rule.desc, rule, code };
  }
  if (debitL === 0) {
    return { status: 'NO_FUEL', ratioVal: 0, uom: rule.type, color: 'amber', isNoFuel: true, badgeLabel: 'Tanpa Solar', targetText: 'Aktivitas Tercatat Tanpa Pengisian Solar (Sewa/Pool)', rule, code };
  }
  if ((isKmL && creditK === 0) || (!isKmL && creditH === 0)) {
    return { status: 'NO_ACTIVITY', ratioVal: 0, uom: rule.type, color: 'amber', badgeLabel: isKmL ? 'Tanpa KM' : 'Tanpa HM', targetText: rule.desc, rule, code };
  }

  if (isKmL) {
    const ratio = Number((creditK / debitL).toFixed(2));
    const targetMin = rule.target;
    const warningMin = Number((targetMin * (1 - rule.tolerance)).toFixed(2)); // 10% tolerance

    if (ratio >= targetMin) {
      return { status: 'OPTIMAL', ratioVal: ratio, uom: 'KM/L', color: 'emerald', badgeLabel: 'Efisien', targetText: rule.desc, rule, code };
    } else if (ratio >= warningMin) {
      return { status: 'NORMAL', ratioVal: ratio, uom: 'KM/L', color: 'amber', badgeLabel: 'Waspada (10%)', targetText: rule.desc, rule, code };
    } else {
      return { status: 'BOROS', ratioVal: ratio, uom: 'KM/L', color: 'red', badgeLabel: 'Boros', targetText: rule.desc, rule, code };
    }
  } else {
    const ratio = Number((debitL / creditH).toFixed(2));
    const targetMax = rule.target;
    const warningMax = Number((targetMax * (1 + rule.tolerance)).toFixed(2)); // 10% tolerance

    if (ratio <= targetMax) {
      return { status: 'OPTIMAL', ratioVal: ratio, uom: 'L/HM', color: 'emerald', badgeLabel: 'Efisien', targetText: rule.desc, rule, code };
    } else if (ratio <= warningMax) {
      return { status: 'NORMAL', ratioVal: ratio, uom: 'L/HM', color: 'amber', badgeLabel: 'Waspada (10%)', targetText: rule.desc, rule, code };
    } else {
      return { status: 'BOROS', ratioVal: ratio, uom: 'L/HM', color: 'red', badgeLabel: 'Boros', targetText: rule.desc, rule, code };
    }
  }
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

// ─── WA Schedule Badge ────────────────────────────────────────────────────────
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
        {isActive ? '🟢 Segera!' : countdown}
      </span>
      <Clock size={11} className="text-slate-400" />
    </button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function VehicleMonitoringView({ currentUser, screenshotMode }) {
  // Dev-only check: strictly true in local dev / localhost only
  const isLocalDev = Boolean(
    import.meta.env.DEV || 
    (typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname))
  );

  // ─── Role Detection ────────────────────────────────────────────────────────
  // Normalize role string — handles all DB variants: 'USER','Unit','unit','UNIT'
  const roleUpper = currentUser?.role?.toUpperCase() || '';

  // Strictly role DEV only (ADMIN and USER are both hidden)
  const isDevUser = roleUpper === 'DEV';

  // Explicit USER/UNIT check — blocks regardless of plant value
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

  // ── Fuel Evaluation State (Simplified & Unified) ──
  const [fuelData, setFuelData] = useState({ summaries: [], daily: [] });
  const [fuelUploadInfo, setFuelUploadInfo] = useState(null);
  const [fuelYear, setFuelYear] = useState('2026');
  const [fuelMonths, setFuelMonths] = useState(['09']); // multi-month array: e.g. ['09'], ['09', '10'], or ['ALL']
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const monthDropdownRef = React.useRef(null);
  const [fuelStartDate, setFuelStartDate] = useState(''); // YYYY-MM-DD
  const [fuelEndDate, setFuelEndDate]     = useState(''); // YYYY-MM-DD

  // Close month dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (monthDropdownRef.current && !monthDropdownRef.current.contains(event.target)) {
        setShowMonthDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const monthDropdownLabel = useMemo(() => {
    const isAll = fuelMonths.includes('ALL') || fuelMonths.length === 12;
    if (isAll) return 'Semua Bulan (01 - 12)';
    if (fuelMonths.length === 0) return 'Pilih Bulan (0 Bulan)';

    const sorted = [...fuelMonths].sort();
    if (sorted.length === 1) {
      const found = MONTH_NAMES.find(m => m.val === sorted[0]);
      return found ? `${found.val} - ${found.label}` : sorted[0];
    }

    return `${sorted.length} Bulan Dipilih`;
  }, [fuelMonths]);

  // Backward-compatible computed helpers
  const fuelMonth = fuelMonths.length === 1 ? fuelMonths[0] : (fuelMonths.includes('ALL') ? 'ALL' : fuelMonths.join(', '));
  const fuelDate = (fuelStartDate && fuelEndDate && fuelStartDate === fuelEndDate) ? fuelStartDate : (fuelStartDate || fuelEndDate || '');
  const [fuelPlant, setFuelPlant] = useState('ALL');
  const [fuelStatusFilter, setFuelStatusFilter] = useState('ALL');
  const [searchFuel, setSearchFuel] = useState('');
  const fuelLoadedMonthsRef = React.useRef(new Set());
  const [fuelPage, setFuelPage] = useState(1);
  const [selectedFuelVeh, setSelectedFuelVeh] = useState(null);
  const [fuelModalTab, setFuelModalTab] = useState('zest'); // 'zest' | 'debit' | 'credit'
  const FUEL_PAGE_SIZE = 25;

  // ── Load Data ────────────────────────────────────────────────────────────────
  // isManualRefresh: true  → tombol Refresh diklik, force-fetch vehicle_logs & master_map dari server
  //                  false → initial load, prioritaskan cache dulu agar cepat
  const loadData = useCallback(async (isManualRefresh = false) => {
    setLoading(true);
    setError(null);
    try {
      // vehicle_logs (2.2k+ rows, 2 halaman PostgREST) butuh ~19s di PROD.
      // Timeout 15s membuat fallback {data:[]} menang balapan → seluruh transaksi tampil 0.
      const TIMEOUT_MS = 90000;
      const withTimeout = (promise, fallback = { data: [], error: null }) =>
        Promise.race([
          promise,
          new Promise(resolve => setTimeout(() => resolve(fallback), TIMEOUT_MS))
        ]);

      // vehicle_logs → selalu force-fetch saat manual refresh (transaksi aktif berubah sering)
      // vehicle_master, zco → force saat manual refresh
      // masterEquipment → cukup cache (jarang berubah, data besar)
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

  // Automatically lazy-load monthly daily records when a date range is active
  useEffect(() => {
    if (!fuelStartDate && !fuelEndDate) return;
    const sMonth = fuelStartDate ? fuelStartDate.substring(0, 7) : `${fuelYear}-09`;
    const eMonth = fuelEndDate ? fuelEndDate.substring(0, 7) : sMonth;

    const monthsToLoad = new Set();
    const sYr = parseInt(sMonth.substring(0, 4));
    const sM = parseInt(sMonth.substring(5, 7));
    const eYr = parseInt(eMonth.substring(0, 4));
    const eM = parseInt(eMonth.substring(5, 7));

    for (let y = sYr; y <= eYr; y++) {
      const startMo = y === sYr ? sM : 1;
      const endMo = y === eYr ? eM : 12;
      for (let m = startMo; m <= endMo; m++) {
        monthsToLoad.add(`${y}-${String(m).padStart(2, '0')}`);
      }
    }

    monthsToLoad.forEach(async (ym) => {
      if (!fuelLoadedMonthsRef.current.has(ym)) {
        fuelLoadedMonthsRef.current.add(ym);
        try {
          const { data: mDaily } = await fetchFuelDailyForMonth(ym);
          if (mDaily && mDaily.length > 0) {
            setFuelData(prev => {
              const map = new Map((prev.daily || []).map(d => [`${d.doc}_${d.c}_${d.d}_${d.t}`, d]));
              for (const d of mDaily) {
                map.set(`${d.doc}_${d.c}_${d.d}_${d.t}`, d);
              }
              return { ...prev, daily: Array.from(map.values()) };
            });
          }
        } catch(e) {
          console.warn(`Lazy-load monthly daily for ${ym} warning:`, e);
        }
      }
    });
  }, [fuelStartDate, fuelEndDate, fuelYear]);


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


  // ── Excel Upload ─────────────────────────────────────────────────────────────
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

        // Save to DB in background — UI already shows data
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

  // ── Clear Data ───────────────────────────────────────────────────────────────
  const handleClearData = async () => {
    setLoading(true);
    try {
      await saveVehicleData([], []);
      setVehicles([]); setLogs([]); setUploadInfo(null);
      try { sessionStorage.removeItem('vehicle_upload_info'); } catch (e) {}
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

  // ── Fuel Evaluation (SALRD & SLARC) Upload & Clear ────────────────────────────
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
        if (masterMap && masterMap.size > 0) {
          masterMap.forEach((val, eqNum) => {
            if (!val || !val.costCenter) return;
            const cc = String(val.costCenter).trim().toUpperCase();
            const desc = val.description || '';
            const plant = val.plant || '';
            const isVeh = String(eqNum).startsWith('20000');
            if (!eqMap[cc] || (isVeh && !eqMap[cc].equipment?.startsWith('20000'))) {
              eqMap[cc] = { equipment: String(eqNum).trim(), description: desc, plant, objectType: val.objectType || (cc.includes('CAR') ? 'CAR' : cc.includes('TRU') ? 'DTRUCK' : 'VEH') };
            }
          });
        }
        if (Array.isArray(masterEquipments)) {
          masterEquipments.forEach(m => {
            const cc = String(m.cost_center || m.costCenter || '').trim().toUpperCase();
            const eqNum = String(m.eq_num || m.eqNum || m.equipment || '').trim();
            const desc = m.description || '';
            const plant = m.plant || '';
            if (cc) {
              const isVeh = eqNum.startsWith('20000');
              if (!eqMap[cc] || (isVeh && !eqMap[cc].equipment?.startsWith('20000'))) {
                eqMap[cc] = { equipment: eqNum, description: desc, plant, objectType: m.object_type || m.objectType || (cc.includes('CAR') ? 'CAR' : cc.includes('TRU') ? 'DTRUCK' : 'VEH') };
              }
            }
          });
        }
        (fuelData.summaries || []).forEach(s => {
          const cc = String(s.costCenter || '').trim().toUpperCase();
          if (cc && !eqMap[cc]) {
            eqMap[cc] = { equipment: s.equipment || '', description: s.description || '', plant: s.plant || '', objectType: s.objectType || '' };
          }
        });

        const ih08SheetName = workbook.SheetNames.find(s => s.toLowerCase().includes('ih08') || s.toLowerCase().includes('equip'));
        if (ih08SheetName) {
          const ws = workbook.Sheets[ih08SheetName];
          const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
          rows.forEach(r => {
            const cc = String(r['Cost Center'] || r['CostCenter'] || r['Pusat Biaya'] || '').trim().toUpperCase();
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
          if (raw instanceof Date && !isNaN(raw)) {
            return format(raw, 'yyyy-MM-dd');
          }
          if (typeof raw === 'number' || (!isNaN(raw) && Number(raw) > 30000 && Number(raw) < 60000)) {
            const d = excelSerialToDate(Number(raw));
            return format(d, 'yyyy-MM-dd');
          }
          const s = String(raw).trim();
          if (s.match(/^\d{4}-\d{2}-\d{2}/)) return s.substring(0, 10);
          if (s.match(/^\d{1,2}[-/. ]\d{1,2}[-/. ]\d{4}/)) {
            const parts = s.split(/[-/. ]/);
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            const year = parts[2];
            return `${year}-${month}-${day}`;
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
            console.log(`[SALRD Ingestion] Sheet "${targetDebitSheet}" total rows before filter: ${rows.length}`);
            let excludedNonFuel = 0;
            let debitReversals = 0;

            for (const r of rows) {
              const rawCe = String(r['Cost Element'] || r['CostElement'] || '').trim();
              const ce = rawCe.replace(/^0+/, '');
              const rawUom = String(r['Posted unit of meas.'] || r['Unit of Measure'] || r['UoM'] || '').trim().toUpperCase();
              const name = String(r['Name'] || r['CO Object Name'] || r['Text'] || '').trim();
              const matDesc = String(r['Material Description'] || '').trim();
              const fullText = `${name} ${matDesc}`;

              const isStandardFuelUom = ['L', 'LTR', 'LITER'].includes(rawUom);
              let parsedLitersFromText = 0;
              const isFuelCostElement = ce === '51100057';

              if (!isFuelCostElement) {
                if (isStandardFuelUom || ce === '51100065' || ce === '51100064' || ce === '51100104') {
                  excludedNonFuel++;
                }
                continue;
              }

              let isAcceptedUom = isStandardFuelUom;
              if (!isAcceptedUom) {
                parsedLitersFromText = extractLitersFromText(fullText);
                const isFuelText = /solar|dexlite|biodiesel|gasoline|bbm|bahan bakar/i.test(fullText);
                if (parsedLitersFromText > 0 || isFuelText || !rawUom) {
                  isAcceptedUom = true;
                }
              }

              if (!isAcceptedUom) {
                excludedNonFuel++;
                continue;
              }

              const cc = String(r['Cost Center'] || r['CostCenter'] || r['Pusat Biaya'] || '').trim().toUpperCase();
              if (!cc) continue;

              const rawDate = r['Posting Date'] || r['Document Date'] || r['Date'];
              const dateStr = parseDateVal(rawDate);
              const period = String(r['Period'] || '').trim();
              const year = dateStr ? dateStr.substring(0, 4) : '2026';
              const periodNum = parseInt(period, 10);
              const hasValidPeriod = !isNaN(periodNum) && periodNum >= 1 && periodNum <= 12;
              const monthStr = hasValidPeriod
                ? `${year}-${String(periodNum).padStart(2, '0')}`
                : (dateStr ? dateStr.substring(0, 7) : (targetMonth || '2026-09'));

              const drCr = String(r['Dr/Cr indicator'] || r['Dr/Cr'] || r['Dr/C'] || '').trim().toUpperCase();
              const isReversal = drCr === 'C' || drCr === 'H';

              let liters = parseSapNumber(r['Total quantity'] || r['Qty'] || 0);
              let rupiah = parseSapNumber(r['Value in Obj. Crcy'] || r['Val.in rep.cur.'] || r['Cost'] || 0);

              if (liters === 0 && parsedLitersFromText > 0) {
                liters = parsedLitersFromText;
              }

              if (isReversal) {
                debitReversals++;
                liters = -Math.abs(liters);
                rupiah = -Math.abs(rupiah);
              } else {
                liters = Math.abs(liters);
                rupiah = Math.abs(rupiah);
              }

              const doc = String(r['Document Number'] || r['Doc Number'] || '').trim();
              const plant = String(r['Plant'] || cc.substring(0, 4) || '').trim().toUpperCase();

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
            console.log(`[SALRD Ingestion] Accepted normalized 51100057+L/Text: ${debitRowsCount} rows (Reversals: ${debitReversals}), Excluded non-fuel rows: ${excludedNonFuel}`);
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
            console.log(`[SLARC Ingestion] Sheet "${targetCreditSheet}" total rows before deduplication: ${rows.length}`);
            const seenCreditUploadKeys = new Set();
            let creditDupsSkipped = 0;

            for (const r of rows) {
              const rawCe = String(r['Cost Element'] || r['CostElement'] || '').trim();
              const ce = rawCe.replace(/^0+/, '');
              const uom = String(r['Posted unit of meas.'] || r['Unit of Measure'] || r['UoM'] || '').trim().toUpperCase();
              const isKm = ce === '90043002' || uom === 'KM';
              const isHm = ce === '90043003' || uom === 'HR' || uom === 'HM';
              if (!isKm && !isHm) continue;

              const cc = String(r['Cost Center'] || r['CostCenter'] || r['Pusat Biaya'] || '').trim().toUpperCase();
              if (!cc) continue;

              const rawDate = r['Posting Date'] || r['Document Date'] || r['Date'];
              const dateStr = parseDateVal(rawDate);
              const period = String(r['Period'] || '').trim();
              const year = dateStr ? dateStr.substring(0, 4) : '2026';
              const periodNum = parseInt(period, 10);
              const hasValidPeriod = !isNaN(periodNum) && periodNum >= 1 && periodNum <= 12;
              const monthStr = hasValidPeriod
                ? `${year}-${String(periodNum).padStart(2, '0')}`
                : (dateStr ? dateStr.substring(0, 7) : (targetMonth || '2026-09'));

              const qty = Math.abs(parseSapNumber(r['Total quantity'] || r['Qty'] || 0) || 0);
              const doc = String(r['Document Number'] || r['Doc Number'] || '').trim();
              const name = String(r['Name'] || r['CO Object Name'] || r['Text'] || '').trim();
              const cleanName = name.split('|')[0].trim().toLowerCase();
              const plant = String(r['Plant'] || cc.substring(0, 4) || '').trim().toUpperCase();
              // Deduplicate double-posted or paired SAP allocation documents (same cc, date, uom, qty, activity)
              const dedupKey = `${cc}_${dateStr || monthStr}_${isKm ? 'KM' : 'HM'}_${qty}_${cleanName}`;
              if (seenCreditUploadKeys.has(dedupKey)) {
                creditDupsSkipped++;
                continue;
              }
              seenCreditUploadKeys.add(dedupKey);

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
            console.log(`[SLARC Ingestion] Accepted unique SLARC rows: ${creditRowsCount}, Deduplicated paired allocations: ${creditDupsSkipped}`);
          }
        }

        // 3. Fallback for single-sheet when 'all' mode
        if (uploadType === 'all' && !debitSheetName && !creditSheetName) {
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
          if (firstSheet) {
            const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: '' });
            const seenCreditFallbackKeys = new Set();
            for (const r of rows) {
              const rawCc = String(r['Cost Center'] || r['CostCenter'] || '').trim().toUpperCase();
              if (!rawCc) continue;
              const rawCe = String(r['Cost Element'] || '').trim();
              const ce = rawCe.replace(/^0+/, '');
              const rawUom = String(r['Posted unit of meas.'] || r['Unit of Measure'] || r['UoM'] || '').trim().toUpperCase();
              const rawDate = r['Posting Date'] || r['Document Date'] || r['Date'];
              const dateStr = parseDateVal(rawDate);
              const period = String(r['Period'] || '').trim();
              const year = dateStr ? dateStr.substring(0, 4) : '2026';
              const periodNum = parseInt(period, 10);
              const hasValidPeriod = !isNaN(periodNum) && periodNum >= 1 && periodNum <= 12;
              const monthStr = hasValidPeriod
                ? `${year}-${String(periodNum).padStart(2, '0')}`
                : (dateStr ? dateStr.substring(0, 7) : (targetMonth || '2026-09'));

              const drCr = String(r['Dr/Cr indicator'] || r['Dr/Cr'] || r['Dr/C'] || '').trim().toUpperCase();
              const isReversal = drCr === 'C' || drCr === 'H';
              let qty = parseSapNumber(r['Total quantity'] || r['Qty'] || 0);
              let rupiah = parseSapNumber(r['Value in Obj. Crcy'] || r['Val.in rep.cur.'] || r['Cost'] || 0);
              const doc = String(r['Document Number'] || r['Doc Number'] || '').trim();
              const name = String(r['Name'] || r['CO Object Name'] || r['Text'] || '').trim();
              const matDesc = String(r['Material Description'] || '').trim();
              const fullText = `${name} ${matDesc}`;
              const plant = String(r['Plant'] || rawCc.substring(0, 4) || '').trim().toUpperCase();

              const isStandardFuelUom = ['L', 'LTR', 'LITER'].includes(rawUom);
              let parsedLiters = 0;
              if (ce === '51100057') {
                let isAcc = isStandardFuelUom;
                if (!isAcc) {
                  parsedLiters = extractLitersFromText(fullText);
                  if (parsedLiters > 0 || /solar|dexlite|biodiesel|gasoline|bbm|bahan bakar/i.test(fullText) || !rawUom) {
                    isAcc = true;
                  }
                }
                if (isAcc) {
                  if (qty === 0 && parsedLiters > 0) qty = parsedLiters;
                  if (isReversal) {
                    qty = -Math.abs(qty);
                    rupiah = -Math.abs(rupiah);
                  } else {
                    qty = Math.abs(qty);
                    rupiah = Math.abs(rupiah);
                  }
                  debitRowsCount++;
                  newDaily.push({ c: rawCc, d: dateStr || `${monthStr}-01`, m: monthStr, t: 'D', q: qty, u: 'L', r: rupiah, doc, n: name, p: plant });
                }
              } else if (ce === '90043002' || rawUom === 'KM' || ce === '90043003' || rawUom === 'HR' || rawUom === 'HM') {
                const isKm = ce === '90043002' || rawUom === 'KM';
                const cleanQty = Math.abs(qty);
                const cleanName = name.split('|')[0].trim().toLowerCase();
                const dedupKey = `${rawCc}_${dateStr || monthStr}_${isKm ? 'KM' : 'HM'}_${cleanQty}_${cleanName}`;
                if (!seenCreditFallbackKeys.has(dedupKey)) {
                  seenCreditFallbackKeys.add(dedupKey);
                  creditRowsCount++;
                  newDaily.push({ c: rawCc, d: dateStr || `${monthStr}-01`, m: monthStr, t: 'C', q: cleanQty, u: isKm ? 'KM' : 'HM', r: 0, doc, n: name, p: plant });
                }
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
            const { error: pmErr } = await saveFuelDailyForMonth(m, completeMonthDaily);
            if (pmErr) {
              const pmMsg = pmErr?.message || (typeof pmErr === 'string' ? pmErr : JSON.stringify(pmErr));
              console.warn(`Save per-month storage for ${m} warning:`, pmMsg);
            }
          } catch(pmErr) {
            console.warn(`Save per-month storage for ${m} warning:`, pmErr);
          }
        }

        // 5. Combine other unaffected months with the updated affected months for fuelData.daily
        const otherMonthsDaily = (fuelData.daily || []).filter(d => !affectedMonths.includes(d.m));
        const allAffectedMonthDaily = Object.values(allUpdatedDailyByMonth).flat();
        const mergedDaily = [...otherMonthsDaily, ...allAffectedMonthDaily];
        // For ID 21 persistent storage, only keep recent active daily items to keep payload < 1MB
        const recentDailyForStorage = allAffectedMonthDaily.length > 0 ? allAffectedMonthDaily.slice(-3000) : mergedDaily.slice(-3000);

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

            // Fill equipment info from PM Master Data
            const eqInfo = eqMap[cc] || {};
            if (eqInfo.equipment) existing.equipment = eqInfo.equipment;
            if (eqInfo.description) existing.description = eqInfo.description;
            if (eqInfo.plant) {
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
              // Deduplicate double-posted or paired SAP allocation documents (same date, uom, qty, activity)
              const seenCreditKeys = new Set();
              const dedupedTxsC = [];
              for (const d of txsC) {
                const k = `${d.d || ''}_${d.u || ''}_${Math.abs(parseFloat(d.q) || 0)}_${String(d.n || '').split('|')[0].trim().toLowerCase()}`;
                if (!seenCreditKeys.has(k)) {
                  seenCreditKeys.add(k);
                  dedupedTxsC.push(d);
                }
              }
              existing.creditKm = Math.round(dedupedTxsC.filter(d => d.u === 'KM').reduce((sum, d) => sum + (parseFloat(d.q) || 0), 0) * 100) / 100;
              existing.creditHm = Math.round(dedupedTxsC.filter(d => d.u === 'HM' || d.u === 'HR').reduce((sum, d) => sum + (parseFloat(d.q) || 0), 0) * 100) / 100;
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
        const storagePayload = { summaries: mergedSummaries, daily: recentDailyForStorage };
        const { error: saveErr } = await saveFuelData(storagePayload);
        if (saveErr) {
          const msg = saveErr?.message || (typeof saveErr === 'string' ? saveErr : JSON.stringify(saveErr));
          throw new Error(msg || 'Gagal menyimpan ke server database');
        }

        // Keep all loaded daily in client React state for instant responsiveness
        setFuelData({ summaries: mergedSummaries, daily: mergedDaily });
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
        console.error('Fuel upload error:', err);
        const errMsg = err?.message || (typeof err === 'string' ? err : 'Gagal menyimpan ke server database');
        setError(`Error memproses file ${typeLabel}: ${errMsg}`);
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

  // ── Filter month logs ────────────────────────────────────────────────────────
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

  // ── Summary per Plant ────────────────────────────────────────────────────────
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

  // ── Unit Focused Mode calculations ──────────────────────────────────────────
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

  // ── Per-Vehicle Detail (all plants, original tab) ───────────────────────────
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

  // ── Filtered Log Records (Original Logs tab) ─────────────────────────────────
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
        text += `\n*⚠️ Unit Tanpa Transaksi:* \n`;
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

  // ── Fuel Evaluation Computed Data & ZESTHLP16PA Mapping ───────────────────
  const fuelAvailableYears = useMemo(() => {
    const set = new Set((fuelData?.summaries || []).map(s => s.month?.substring(0, 4)).filter(Boolean));
    if (set.size === 0) set.add('2026');
    return Array.from(set).sort().reverse();
  }, [fuelData]);

  // ── Database VLOOKUP: Equipment & Cost Center -> PM Master Data ────────────────────────
  const { pmMasterByEquipment, pmMasterByCostCenter } = useMemo(() => {
    const byEq = new Map();
    const byCC = new Map();

    const registerItem = (eqNum, desc, cc, plant, objType) => {
      const eq = String(eqNum || '').trim();
      const cleanCC = String(cc || '').trim().toUpperCase();
      const cleanDesc = String(desc || '').trim();
      const cleanPlant = String(plant || (cleanCC ? cleanCC.substring(0, 4) : '')).trim();

      if (!eq && !cleanCC) return;

      let type = objType || '';
      if (!type) {
        if (cleanCC.includes('CAR') || /^(mobil|pajero|strada|triton|hilux|innova|avanza)/i.test(cleanDesc)) type = 'CAR';
        else if (cleanCC.includes('DTR') || cleanCC.includes('TRU') || /dump\s*truck|truk|truck/i.test(cleanDesc)) type = 'DTRUCK';
        else if (cleanCC.includes('TRA') || /traktor|tractor/i.test(cleanDesc)) type = 'TRACTOR';
        else if (cleanCC.includes('GRA') || /grader/i.test(cleanDesc)) type = 'GRADER';
        else if (cleanCC.includes('COM') || /vibrator|compactor|bomag/i.test(cleanDesc)) type = 'COMPACTOR';
        else if (cleanCC.includes('EXC') || /excavator/i.test(cleanDesc)) type = 'EXCAVATOR';
        else if (cleanCC.includes('QUT') || /quick\s*truck/i.test(cleanDesc)) type = 'QUICK TRUCK';
        else if (eq.startsWith('20000')) type = 'VEH';
      }

      const item = {
        equipment: eq,
        description: cleanDesc,
        costCenter: cleanCC,
        plant: cleanPlant,
        objectType: type
      };

      if (eq) {
        if (!byEq.has(eq) || (cleanDesc && cleanDesc !== eq && byEq.get(eq).description === eq)) {
          byEq.set(eq, item);
        }
        const unpadded = eq.replace(/^0+/, '');
        if (unpadded !== eq && (!byEq.has(unpadded) || (cleanDesc && cleanDesc !== unpadded && byEq.get(unpadded).description === unpadded))) {
          byEq.set(unpadded, item);
        }
      }

      if (cleanCC) {
        if (!byCC.has(cleanCC)) {
          byCC.set(cleanCC, item);
        } else {
          const existing = byCC.get(cleanCC);
          const isVehicleEq = eq.startsWith('20000');
          const existingIsVehicleEq = existing.equipment?.startsWith('20000');
          if (isVehicleEq && !existingIsVehicleEq) {
            byCC.set(cleanCC, item);
          } else if (cleanDesc && (!existing.description || existing.description === existing.equipment)) {
            byCC.set(cleanCC, item);
          }
        }
      }
    };

    // 1. From masterMap (17k+ entries from PM Master Data)
    if (masterMap && masterMap.size > 0) {
      masterMap.forEach((val, eqNum) => {
        if (!val) return;
        const desc = typeof val === 'string' ? '' : (val.description || '');
        const cc = typeof val === 'string' ? '' : (val.costCenter || '');
        const plant = typeof val === 'string' ? val : (val.plant || '');
        const objType = typeof val === 'string' ? '' : (val.objectType || '');
        registerItem(eqNum, desc, cc, plant, objType);
      });
    }

    // 2. From masterEquipments (master_equipment DB table)
    if (Array.isArray(masterEquipments)) {
      masterEquipments.forEach(item => {
        const eqNum = item.eqNum || item.eq_num || item.equipment || '';
        const desc = item.description || '';
        const cc = item.costCenter || item.cost_center || '';
        const plant = item.plant || '';
        const objType = item.objectType || item.type || item.object_type || '';
        registerItem(eqNum, desc, cc, plant, objType);
      });
    }

    // 3. From vehicle master list (vehicles)
    if (Array.isArray(vehicles)) {
      vehicles.forEach(v => {
        const eqNum = v.vehicle_code || '';
        const desc = v.description || '';
        const cc = v.cost_center || v.costCenter || '';
        const plant = v.plant || '';
        const objType = v.object_type || '';
        registerItem(eqNum, desc, cc, plant, objType);
      });
    }

    return { pmMasterByEquipment: byEq, pmMasterByCostCenter: byCC };
  }, [masterMap, masterEquipments, vehicles]);

  // Backward compatibility alias for any existing references
  const costCenterToEquipmentMap = pmMasterByCostCenter;

  // Dedicated VLOOKUP function based on Equipment Number & Cost Center on PM Master Data
  const lookupMasterPM = useCallback((eqNum, costCenter) => {
    const cleanEq = String(eqNum || '').trim();
    const cleanCC = String(costCenter || '').trim().toUpperCase();

    // Priority 1: VLOOKUP by Equipment Number in PM Master Data
    if (cleanEq && cleanEq !== '-') {
      const match = pmMasterByEquipment.get(cleanEq) || pmMasterByEquipment.get(cleanEq.replace(/^0+/, ''));
      if (match && match.description && match.description !== cleanEq) {
        return match;
      }
    }

    // Priority 2: VLOOKUP by Cost Center in PM Master Data
    if (cleanCC && cleanCC !== '-') {
      const match = pmMasterByCostCenter.get(cleanCC);
      if (match && match.description) {
        return match;
      }
    }

    // Priority 3: Fallback equipment match
    if (cleanEq && cleanEq !== '-') {
      const match = pmMasterByEquipment.get(cleanEq) || pmMasterByEquipment.get(cleanEq.replace(/^0+/, ''));
      if (match) return match;
    }

    return null;
  }, [pmMasterByEquipment, pmMasterByCostCenter]);
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

  // ── Pre-Index ZESTHLP16PA Logs by No. Equipment & Date ─────────────────────
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

  // Main Fuel Table Data with Deep Reference, Reconciliation, Multi-Month & Date Range Aggregation
  const rawFuelTableData = useMemo(() => {
    const isDateRange = Boolean(fuelStartDate || fuelEndDate);
    const activePlant = (!isAdmin && currentUser?.plant && currentUser.plant !== 'ALL')
      ? currentUser.plant
      : fuelPlant;

    // Helper implementing Smart 4-Tier Fallback for REFERENCE and KM/HM reconciliation
    const resolveSmartReference = (equipment, costCenter, ymOrDate, isDate = false, summaryObj = null) => {
      const eqLogs = (equipment && equipment !== '-') ? (zestLogsByEquipment.get(equipment) || []) : [];
      const ccLogs = (costCenter && costCenter !== '-') ? (slarcDailyByCostCenter.get(String(costCenter || '').trim().toUpperCase()) || []) : [];

      let matchedZest;
      let matchedSlarc;

      if (isDate) {
        matchedZest = eqLogs.filter(l => l.date === ymOrDate);
        matchedSlarc = ccLogs.filter(d => d.d === ymOrDate);
      } else {
        if (fuelMonths.length === 1 && !fuelMonths.includes('ALL')) {
          const mKey = `${fuelYear}-${fuelMonths[0]}`;
          matchedZest = eqLogs.filter(l => l.date && l.date.startsWith(mKey));
          matchedSlarc = ccLogs.filter(d => d.m === mKey);
        } else {
          matchedZest = eqLogs.filter(l => l.date && l.date.startsWith(fuelYear));
          matchedSlarc = ccLogs.filter(d => d.m && d.m.startsWith(fuelYear));
        }
      }

      let zestKmHmTotal = 0;
      matchedZest.forEach(l => {
        zestKmHmTotal += parseFloat(l.hm_km) || 0;
      });

      // Priority 1
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

      // Priority 2
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

      if (p2List.length > 0) {
        return {
          primary: p2List[0],
          all: p2List.join('; '),
          count: p2List.length,
          priority: 2,
          source: 'ZESTHLP16PA',
          badge: 'ZEST-JOB',
          zestLogs: eqLogs,
          matchedZest,
          matchedSlarc,
          zestKmHmTotal: Math.round(zestKmHmTotal * 100) / 100
        };
      }

      // Priority 3
      if (eqLogs.length > 0) {
        const sortedLogs = [...eqLogs].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        const p3List = [];
        let latestPeriod = null;

        for (const l of sortedLogs) {
          const ref = (l.reference || '').trim();
          const rem = (l.remarks || '').trim();
          const job = (JOB_CODE_DESC[l.job_code] || l.job_code || '').trim();
          const text = (ref && ref !== '1' && ref !== '-') ? ref : (rem && rem !== '1' && rem !== '-') ? rem : job;
          if (text && !p3List.includes(text)) {
            p3List.push(text);
            if (!latestPeriod && l.date) latestPeriod = l.date.substring(0, 7);
          }
          if (p3List.length >= 3) break;
        }

        if (p3List.length > 0) {
          return {
            primary: p3List[0],
            all: p3List.join('; '),
            count: p3List.length,
            priority: 3,
            source: 'ZESTHLP16PA_HISTORICAL',
            badge: `ZEST ${latestPeriod || 'HIST'}`,
            latestPeriod,
            zestLogs: eqLogs,
            matchedZest,
            matchedSlarc,
            zestKmHmTotal: Math.round(zestKmHmTotal * 100) / 100
          };
        }
      }

      // Priority 4
      const p4List = [];
      if (summaryObj?.slarcNarrations && Array.isArray(summaryObj.slarcNarrations) && summaryObj.slarcNarrations.length > 0) {
        summaryObj.slarcNarrations.forEach(n => {
          if (n && !p4List.includes(n)) p4List.push(n);
        });
      } else if (summaryObj?.slarcRefPrimary) {
        p4List.push(summaryObj.slarcRefPrimary);
      }

      const slarcPool = matchedSlarc.length > 0 ? matchedSlarc : ccLogs;
      slarcPool.forEach(d => {
        const text = String(d.n || '').split('|')[0].trim();
        if (text && text !== '1' && text !== '-' && !text.includes('/ E-') && !text.toLowerCase().includes('pembulatan') && !p4List.includes(text)) {
          p4List.push(text);
        }
      });

      if (p4List.length === 0 && summaryObj?.partnerObjects && Array.isArray(summaryObj.partnerObjects)) {
        summaryObj.partnerObjects.forEach(p => {
          if (p && !p4List.includes(p)) p4List.push(p);
        });
      }

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

    let result;

    if (isDateRange) {
      // Date Range Filter
      const inRangeDaily = (fuelData?.daily || []).filter(d => {
        if (!d.d) return false;
        if (fuelStartDate && d.d < fuelStartDate) return false;
        if (fuelEndDate && d.d > fuelEndDate) return false;
        return true;
      });

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
            month: `${fuelStartDate || ''} s/d ${fuelEndDate || ''}`,
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

      inRangeDaily.forEach(d => {
        const cc = String(d.c || '').trim().toUpperCase();
        if (!vehMap.has(cc)) {
          const master = lookupMasterPM('', cc);
          const p = d.p || cc.substring(0, 4);
          vehMap.set(cc, {
            costCenter: cc,
            equipment: master?.equipment || '-',
            description: master?.description || `Kendaraan ${cc}`,
            plant: p,
            plantDesc: PLANT_INFO[p]?.desc || p,
            wilayah: PLANT_INFO[p]?.wilayah || 'Regional 5',
            objectType: master?.objectType || 'VEH',
            month: `${fuelStartDate || ''} s/d ${fuelEndDate || ''}`,
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
        const rawEq = (v.equipment && v.equipment !== '-') ? String(v.equipment).trim() : '';
        const masterMatch = lookupMasterPM(rawEq, ccKey);

        const resolvedEquipment = masterMatch?.equipment || rawEq || '-';
        const resolvedDescription = masterMatch?.description || (
          v.description && !v.description.includes('Sedang Perbaikan') && !v.description.includes('Au58:') && !v.description.includes('Solar =') && !v.description.toLowerCase().startsWith('dinas ke')
            ? v.description
            : `Kendaraan ${ccKey}`
        );
        const resolvedPlant = masterMatch?.plant || v.plant || (ccKey ? ccKey.substring(0, 4) : '');
        const resolvedObjectType = masterMatch?.objectType || v.objectType || (ccKey.includes('CAR') ? 'CAR' : ccKey.includes('TRU') ? 'DTRUCK' : 'VEH');
        const refData = resolveSmartReference(resolvedEquipment, v.costCenter, fuelStartDate || v.month, true, v);

        const debitL = Math.round(v.debitLiters * 100) / 100;
        const debitR = Math.round(v.debitRp);
        const creditK = Math.round(v.creditKm * 100) / 100;
        const creditH = Math.round(v.creditHm * 100) / 100;

        // Apply Task 1 BBM Efficiency Evaluation Matrix (MID(5,3) with 10% tolerance & Standby handling)
        const refText = `${refData.primary || ''} ${refData.all || ''} ${v.slarcRefPrimary || ''} ${v.description || ''}`;
        const eff = evaluateFuelEfficiency(ccKey, debitL, creditK, creditH, resolvedObjectType, refText);
        const slarcTotal = creditK || creditH || 0;
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
          objectType: resolvedObjectType,
          debitLiters: debitL,
          debitRp: debitR,
          creditKm: creditK,
          creditHm: creditH,
          kmPerLiter: eff.uom === 'KM/L' ? eff.ratioVal : 0,
          literPerHm: eff.uom === 'L/HM' ? eff.ratioVal : 0,
          costPerUnit: creditK > 0 ? Math.round(debitR / creditK) : (creditH > 0 ? Math.round(debitR / creditH) : 0),
          status: eff.status,
          efficiency: eff,
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
      // Multi-Month Filter
      const isAllMonths = fuelMonths.includes('ALL') || fuelMonths.length === 0;
      const targetMonths = isAllMonths ? [] : fuelMonths.map(m => `${fuelYear}-${m}`);

      let list = fuelData?.summaries || [];
      if (isAllMonths) {
        list = list.filter(s => s.month?.startsWith(fuelYear));
      } else {
        list = list.filter(s => targetMonths.includes(s.month));
      }

      if (activePlant !== 'ALL') {
        list = list.filter(s => s.plant === activePlant);
      }

      if (isAllMonths || fuelMonths.length > 1) {
        const aggregatedMap = new Map();
        list.forEach(s => {
          const cc = s.costCenter;
          if (!aggregatedMap.has(cc)) {
            aggregatedMap.set(cc, {
              ...s,
              month: isAllMonths ? `${fuelYear} (Semua Bulan)` : fuelMonths.join(', '),
              debitLiters: 0,
              debitRp: 0,
              creditKm: 0,
              creditHm: 0,
              txCount: 0
            });
          }
          const cur = aggregatedMap.get(cc);
          cur.debitLiters += (s.debitLiters || 0);
          cur.debitRp += (s.debitRp || 0);
          cur.creditKm += (s.creditKm || 0);
          cur.creditHm += (s.creditHm || 0);
          cur.txCount += (s.txCount || 0);
        });
        list = Array.from(aggregatedMap.values());
      }

      result = list.map(s => {
        const ccKey = String(s.costCenter || '').trim().toUpperCase();
        const rawEq = (s.equipment && s.equipment !== '-') ? String(s.equipment).trim() : '';
        const masterMatch = lookupMasterPM(rawEq, ccKey);

        const resolvedEquipment = masterMatch?.equipment || rawEq || '-';
        const resolvedDescription = masterMatch?.description || (
          s.description && !s.description.includes('Sedang Perbaikan') && !s.description.includes('Au58:') && !s.description.includes('Solar =') && !s.description.toLowerCase().startsWith('dinas ke')
            ? s.description
            : `Kendaraan ${ccKey}`
        );
        const resolvedPlant = masterMatch?.plant || s.plant || (ccKey ? ccKey.substring(0, 4) : '');
        const resolvedObjectType = masterMatch?.objectType || s.objectType || (ccKey.includes('CAR') ? 'CAR' : ccKey.includes('TRU') ? 'DTRUCK' : 'VEH');
        const refData = resolveSmartReference(resolvedEquipment, s.costCenter, s.month, false, s);

        const debitL = Math.round((s.debitLiters || 0) * 100) / 100;
        const debitR = Math.round(s.debitRp || 0);
        const creditK = Math.round((s.creditKm || 0) * 100) / 100;
        const creditH = Math.round((s.creditHm || 0) * 100) / 100;

        // Apply Task 1 BBM Efficiency Evaluation Matrix (MID(5,3) with 10% tolerance & Standby handling)
        const refText = `${refData.primary || ''} ${refData.all || ''} ${s.slarcRefPrimary || ''} ${s.description || ''}`;
        const eff = evaluateFuelEfficiency(ccKey, debitL, creditK, creditH, resolvedObjectType, refText);
        const slarcTotal = creditK || creditH || 0;
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
          objectType: resolvedObjectType,
          debitLiters: debitL,
          debitRp: debitR,
          creditKm: creditK,
          creditHm: creditH,
          kmPerLiter: eff.uom === 'KM/L' ? eff.ratioVal : 0,
          literPerHm: eff.uom === 'L/HM' ? eff.ratioVal : 0,
          costPerUnit: creditK > 0 ? Math.round(debitR / creditK) : (creditH > 0 ? Math.round(debitR / creditH) : 0),
          status: eff.status,
          efficiency: eff,
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

    return result;
  }, [fuelData, fuelYear, fuelMonths, fuelStartDate, fuelEndDate, fuelPlant, zestLogsByEquipment, slarcDailyByCostCenter, logs, costCenterToEquipmentMap, lookupMasterPM, isAdmin, currentUser, masterVehiclesByCode, zcoMapByCC]);

  // Dynamic status counts for filter badges & dropdown
  const fuelStatusCounts = useMemo(() => {
    let optimal = 0;
    let normal = 0;
    let boros = 0;
    let standby = 0;
    let noFuel = 0;
    let noActivity = 0;

    rawFuelTableData.forEach(r => {
      const s = r.efficiency?.status || r.status;
      const isStb = r.efficiency?.isStandby || s === 'STANDBY';
      const isNf = (r.efficiency?.isNoFuel || s === 'NO_FUEL') && !isStb;

      if (isStb) standby++;
      else if (isNf) noFuel++;
      else if (s === 'OPTIMAL') optimal++;
      else if (s === 'NORMAL') normal++;
      else if (s === 'BOROS') boros++;
      else if (s === 'NO_ACTIVITY') noActivity++;
    });

    return {
      total: rawFuelTableData.length,
      optimal,
      normal,
      boros,
      standby,
      noFuel,
      noActivity
    };
  }, [rawFuelTableData]);

  // Filtered Fuel Table Data (by Status & Search query)
  const fuelTableData = useMemo(() => {
    let list = rawFuelTableData;

    if (fuelStatusFilter && fuelStatusFilter !== 'ALL') {
      list = list.filter(r => {
        const s = r.efficiency?.status || r.status;
        const isStb = r.efficiency?.isStandby || s === 'STANDBY';
        const isNf = (r.efficiency?.isNoFuel || s === 'NO_FUEL') && !isStb;

        if (fuelStatusFilter === 'OPTIMAL' || fuelStatusFilter === 'EFISIEN') return s === 'OPTIMAL' && !isStb && !isNf;
        if (fuelStatusFilter === 'NORMAL' || fuelStatusFilter === 'WASPADA') return s === 'NORMAL' && !isStb && !isNf;
        if (fuelStatusFilter === 'BOROS') return s === 'BOROS' && !isStb && !isNf;
        if (fuelStatusFilter === 'STANDBY') return isStb;
        if (fuelStatusFilter === 'NO_FUEL') return isNf;
        if (fuelStatusFilter === 'NO_ACTIVITY') return s === 'NO_ACTIVITY';
        return s === fuelStatusFilter;
      });
    }

    if (searchFuel.trim()) {
      const q = searchFuel.toLowerCase();
      list = list.filter(r =>
        (r.equipment || '').toLowerCase().includes(q) ||
        (r.costCenter || '').toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q) ||
        (r.plant || '').toLowerCase().includes(q) ||
        (r.plantDesc || '').toLowerCase().includes(q) ||
        (r.referencePrimary || '').toLowerCase().includes(q) ||
        (r.referenceAll || '').toLowerCase().includes(q) ||
        (r.efficiency?.badgeLabel || '').toLowerCase().includes(q) ||
        (r.efficiency?.status || '').toLowerCase().includes(q)
      );
    }

    return list;
  }, [rawFuelTableData, fuelStatusFilter, searchFuel]);

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
      const debitL = Math.abs(r.debitLiters || 0);
      const creditK = Math.abs(r.creditKm || 0);
      const creditH = Math.abs(r.creditHm || 0);
      const isStandby = r.efficiency?.isStandby;

      totalLiters += debitL;
      totalCost += Math.abs(r.debitRp || 0);
      totalKm += creditK;
      totalHm += creditH;

      // Only count towards efficiency ratio if vehicle is actively operating with fuel (not standby/dummy)
      if (!isStandby && debitL > 0 && creditK > 0) {
        kmLiters += debitL;
        kmVal += creditK;
      }
      if (!isStandby && debitL > 0 && creditH > 0) {
        hmLiters += debitL;
        hmVal += creditH;
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
      'Tipe Kendaraan': s.efficiency ? s.efficiency.code : (s.objectType || '-'),
      'Deskripsi Kendaraan': s.description || '-',
      'Reference': s.referenceAll || s.referencePrimary || '-',
      'Solar (Liter)': s.debitLiters || 0,
      'ACTIVITY (SLARC)': s.creditKm > 0 ? `${s.creditKm} KM` : (s.creditHm > 0 ? `${s.creditHm} HM` : '-'),
      'ACTIVITY (ZESTHLP16PA)': s.zestTotalKmHm > 0 ? `${s.zestTotalKmHm} ${s.creditHm > 0 ? 'HM' : 'KM'}` : '-',
      'Selisih (Variance)': s.varianceKmHm !== 0 ? s.varianceKmHm : 0,
      'Rasio / Efisiensi': s.efficiency && s.efficiency.ratioVal > 0 ? `${s.efficiency.ratioVal} ${s.efficiency.uom}` : (s.kmPerLiter > 0 ? `${s.kmPerLiter} KM/L` : (s.literPerHm > 0 ? `${s.literPerHm} L/HM` : '-')),
      'Keterangan Efisiensi': s.efficiency?.isStandby ? 'Standby / Rusak' : (s.efficiency?.isNoFuel ? 'Tanpa Solar' : (s.efficiency?.status === 'NO_ACTIVITY' ? 'Tanpa Aktivitas' : (s.efficiency ? s.efficiency.badgeLabel : (s.status || '-')))),
      'Evaluasi BBM (Standar)': s.efficiency ? `${s.efficiency.badgeLabel} (${s.efficiency.targetText})` : s.status,
      'Biaya Solar (Rp)': s.debitRp || 0,
      'Biaya Solar / L (Rp)': Math.abs(s.debitLiters || 0) > 0 ? Math.round(Math.abs(s.debitRp || 0) / Math.abs(s.debitLiters || 0)) : 0,
      'Status': s.efficiency?.isStandby ? 'STANDBY' : s.status
    }));
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), 'Evaluasi BBM');

    const filePeriod = (fuelStartDate || fuelEndDate)
      ? `${fuelStartDate || 'start'}_sd_${fuelEndDate || 'end'}`
      : (fuelMonths.includes('ALL') ? fuelYear : `${fuelYear}-${fuelMonths.join('_')}`);
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
      'ACTIVITY':         l.hm_km,
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

      <div className="p-3 md:p-4 lg:p-5 space-y-4">
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

        {/* ── Error / Upload Info ─────────────────────────────────── */}
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
                {uploadInfo.processed} transaksi diproses · {uploadInfo.cancelled} dibatalkan · {uploadInfo.skipped} baris dilewati · {uploadInfo.plants} plant · {uploadInfo.jobCodes} job code
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

        {/* ── Tab Navigation ──────────────────────────────────────── */}
        {!screenshotMode && (
          <div className="flex gap-1 bg-slate-200/60 p-1.5 rounded-xl w-fit flex-wrap">
            {[
              { key: 'unit-checklist',    label: '📋 Checklist Kebun (Unit)', icon: Calendar,        show: true },
              { key: 'summary-regional',  label: '📊 Rekap Regional 5',      icon: BarChart2,       show: true },
              { key: 'detail-veh',        label: '🚚 Daftar Kendaraan',      icon: Truck,           show: isAdmin },
              { key: 'log-raw',           label: '📄 Log Transaksi Asli',    icon: FileSpreadsheet, show: true },
              { key: 'zco-reconciliation',label: '🔗 Verifikasi Biaya (ZCO)', icon: Coins,          show: true },
              { key: 'fuel-evaluation',   label: '⛽ Evaluasi BBM (Solar)',    icon: Fuel,           show: true },
            ].filter(t => t.show).map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => { setActiveTab(key); setError(null); }}
                className={`flex items-center gap-1.5 px-4 py-2.5 rounded-2xl text-xs font-bold transition-colors duration-300 ${activeTab === key ? 'bg-gradient-to-tr from-[#064e3b] to-[#2dd4bf] text-white shadow-md shadow-emerald-900/20' : 'text-slate-500 hover:text-[#064e3b] hover:bg-emerald-50'}`}>
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
        )}

        {/* ── Controls (Adapts based on active tab) ────────────────── */}
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
                <span className="font-mono text-slate-400 font-semibold">LOCAL DEV ONLY • COMPACT NUMERALS</span>
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
            // ADMIN/DEV → full dropdown; USER → locked read-only badge
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

        {/* ─────────────────────────────────────────────────────────── */}
        {/* TAB 1: Checklist Kebun (Unit) — VERY SIMPLE & DIRECT       */}
        {/* ─────────────────────────────────────────────────────────── */}
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
                                <span className="text-emerald-500">·</span>
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
                                  Detail Transaksi Logbook Kendaraan {v.vehicle_code} — Bulan {targetMonth}
                                </h5>
                                
                                <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                                  <table className="w-full text-xs text-left">
                                    <thead>
                                      <tr className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200">
                                        <th className="text-center py-2 px-2">Tanggal</th>
                                        <th className="text-center py-2 px-2">Operator (Supir)</th>
                                        <th className="text-center py-2 px-2">Pekerjaan</th>
                                        <th className="py-2 px-2 text-center">ACTIVITY</th>
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

        {/* ─────────────────────────────────────────────────────────── */}
        {/* TAB 3: Daftar Kendaraan — ADMIN & DEV only                 */}
        {/* ─────────────────────────────────────────────────────────── */}
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
                    <th className="px-3 py-3 text-center">Total Activity</th>
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
                          {v.vehicle_code} ↗
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

        {/* ─────────────────────────────────────────────────────────── */}
        {/* TAB 4: Log Transaksi Asli                                 */}
        {/* ─────────────────────────────────────────────────────────── */}
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
                    <th className="px-3 py-3 text-center whitespace-nowrap">Activity No.</th>
                    <th className="px-3 py-3 text-center whitespace-nowrap">Veh. Code</th>
                    <th className="px-3 py-3 text-center">Plant</th>
                    <th className="px-3 py-3 text-center">Tanggal</th>
                    <th className="px-3 py-3 text-center">Waktu</th>
                    <th className="px-3 py-3 text-center">Job Code</th>
                    <th className="px-3 py-3 text-center">ACTIVITY</th>
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
              <option value="Cek">⚠️ Cek</option>
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

        {/* ── Summary Metric Cards ─────────────────────────────── */}
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
                <p className="text-xs font-bold text-red-700 uppercase tracking-wide">⚠️ Danger Zone — Tindakan Ini Tidak Dapat Dibatalkan</p>
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
      <div className="relative z-10 bg-white/95 backdrop-blur-xs rounded-2xl border border-slate-300 shadow-sm overflow-hidden w-full font-sans">
        {/* ── Single Unified Filter Bar (Compact Row with Month Checkbox Dropdown) ── */}
        <div className="p-4 border-b border-slate-200 bg-slate-50/80 bg-[radial-gradient(#e2e8f0_1px,transparent_1px)] [background-size:16px_16px] flex flex-col md:flex-row md:items-center justify-between gap-3 flex-wrap no-print">
          <div className="flex items-center gap-2.5 flex-wrap flex-1">
            {/* 1. Pilih Tahun */}
            <div className="flex flex-col">
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-0.5">Tahun</label>
              <select
                value={fuelYear}
                onChange={e => { setFuelYear(e.target.value); setFuelPage(1); }}
                className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30 cursor-pointer"
              >
                {fuelAvailableYears.map(yr => (
                  <option key={yr} value={yr}>{yr}</option>
                ))}
              </select>
            </div>

            {/* 2. Pilih Bulan (Centang Dropdown / Multi-Select) */}
            <div className="flex flex-col relative" ref={monthDropdownRef}>
              <div className="flex items-center justify-between mb-0.5">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Bulan</label>
                {fuelMonths.length > 1 && !fuelMonths.includes('ALL') && (
                  <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-100 px-1 rounded ml-1">
                    {fuelMonths.length} bln
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => setShowMonthDropdown(prev => !prev)}
                className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30 flex items-center justify-between gap-2 min-w-[170px] cursor-pointer text-left shadow-2xs"
                title="Klik untuk memilih bulan (dapat memilih bulan 1-9, bulan 1-8, atau centang bebas)"
              >
                <span className="truncate">{monthDropdownLabel}</span>
                <ChevronDown size={14} className={`text-slate-400 transition-transform ${showMonthDropdown ? 'rotate-180' : ''}`} />
              </button>

              {/* Popover / Dropdown Menu dengan Centang (Checkboxes) */}
              {showMonthDropdown && (() => {
                const isAllSelected = fuelMonths.includes('ALL') || fuelMonths.length === 12;
                return (
                  <div className="absolute top-full left-0 mt-1.5 z-50 bg-white border border-slate-200/90 rounded-2xl shadow-2xl p-3.5 w-84 animate-in fade-in duration-150 ring-1 ring-black/5">
                    {/* Header: Toggle Semua Bulan (Sekali klik tercentang semua, klik lagi batal semua) */}
                    <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 mb-2.5">
                      <label className="flex items-center gap-2 cursor-pointer select-none group">
                        <input
                          type="checkbox"
                          checked={isAllSelected}
                          onChange={() => {
                            setFuelPage(1);
                            if (isAllSelected) {
                              // Klik sekali lagi -> tidak tercentang semua
                              setFuelMonths([]);
                            } else {
                              // Klik sekali -> tercentang semua
                              setFuelMonths(MONTH_NAMES.map(x => x.val));
                            }
                          }}
                          className="w-4 h-4 rounded border-slate-300 text-emerald-700 focus:ring-emerald-500 cursor-pointer accent-emerald-700"
                        />
                        <span className="text-xs font-black text-slate-800 tracking-wide group-hover:text-emerald-900 transition-colors">
                          Pilih Semua Bulan
                        </span>
                      </label>

                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                          {isAllSelected ? '12/12' : `${fuelMonths.length}/12`}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowMonthDropdown(false)}
                          className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                          title="Tutup"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    </div>

                    {/* 12 Months Professional 2-Column Grid */}
                    <div className="grid grid-cols-2 gap-1.5 max-h-64 overflow-y-auto pr-1">
                      {MONTH_NAMES.map(m => {
                        const isChecked = fuelMonths.includes('ALL') || fuelMonths.includes(m.val);
                        return (
                          <label
                            key={m.val}
                            className={`flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-medium cursor-pointer transition-all select-none border ${
                              isChecked
                                ? 'bg-emerald-50/90 text-emerald-950 font-bold border-emerald-300 shadow-2xs'
                                : 'bg-white text-slate-700 border-slate-200/70 hover:bg-slate-50 hover:border-slate-300'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                setFuelPage(1);
                                if (fuelMonths.includes('ALL')) {
                                  const all12 = MONTH_NAMES.map(x => x.val);
                                  const next = all12.filter(x => x !== m.val);
                                  setFuelMonths(next);
                                } else if (fuelMonths.includes(m.val)) {
                                  const next = fuelMonths.filter(x => x !== m.val);
                                  setFuelMonths(next);
                                } else {
                                  const next = [...fuelMonths, m.val].sort();
                                  if (next.length === 12) setFuelMonths(['ALL']);
                                  else setFuelMonths(next);
                                }
                              }}
                              className="w-3.5 h-3.5 rounded border-slate-300 text-emerald-700 focus:ring-emerald-500 cursor-pointer accent-emerald-700 shrink-0"
                            />
                            <span className="font-mono text-[11px] font-bold text-slate-500 shrink-0">{m.val}</span>
                            <span className="truncate">{m.label}</span>
                          </label>
                        );
                      })}
                    </div>

                    {/* Dropdown Footer */}
                    <div className="flex items-center justify-between pt-2.5 border-t border-slate-100 mt-2.5 text-xs">
                      <button
                        type="button"
                        onClick={() => {
                          setFuelMonths([]);
                          setFuelPage(1);
                        }}
                        className="text-[11px] font-bold text-slate-400 hover:text-red-600 transition cursor-pointer"
                      >
                        Batal Semua
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowMonthDropdown(false)}
                        className="px-3.5 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition shadow-xs flex items-center gap-1 cursor-pointer"
                      >
                        <Check size={12} /> Terapkan
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* 3. Rentang Tanggal (Optional / Drill-down) */}
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-0.5">
                <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Tanggal (Opsional)</label>
                {(fuelStartDate || fuelEndDate) && (
                  <button
                    type="button"
                    onClick={() => { setFuelStartDate(''); setFuelEndDate(''); setFuelPage(1); }}
                    className="text-[9px] font-bold text-red-600 hover:text-red-700 ml-1.5 cursor-pointer"
                    title="Reset rentang tanggal"
                  >
                    ✕ Reset
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1">
                <input
                  type="date"
                  value={fuelStartDate}
                  onChange={e => { setFuelStartDate(e.target.value); setFuelPage(1); }}
                  placeholder="Mulai"
                  className="px-2.5 py-1.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30"
                  title="Tanggal Mulai"
                />
                <span className="text-slate-400 text-xs font-bold">s/d</span>
                <input
                  type="date"
                  value={fuelEndDate}
                  onChange={e => { setFuelEndDate(e.target.value); setFuelPage(1); }}
                  placeholder="Akhir"
                  className="px-2.5 py-1.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30"
                  title="Tanggal Akhir"
                />
              </div>
            </div>

            {/* 4. Kebun / Unit Filter */}
            <div className="flex flex-col">
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-0.5">Kebun / Unit</label>
              {isAdmin ? (
                <select
                  value={fuelPlant}
                  onChange={e => { setFuelPlant(e.target.value); setFuelPage(1); }}
                  className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30 max-w-[190px] cursor-pointer"
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

            {/* 5. Filter Keterangan Efisiensi */}
            <div className="flex flex-col">
              <label className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-0.5">Status Efisiensi</label>
              <select
                value={fuelStatusFilter}
                onChange={e => { setFuelStatusFilter(e.target.value); setFuelPage(1); }}
                className="px-3 py-1.5 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30 cursor-pointer"
              >
                <option value="ALL">Semua Status ({fuelStatusCounts.total})</option>
                <option value="OPTIMAL">Efisien ({fuelStatusCounts.optimal})</option>
                <option value="NORMAL">Waspada 10% ({fuelStatusCounts.normal})</option>
                <option value="BOROS">Boros ({fuelStatusCounts.boros})</option>
                <option value="STANDBY">Standby / Rusak ({fuelStatusCounts.standby})</option>
                <option value="NO_FUEL">Tanpa Solar ({fuelStatusCounts.noFuel})</option>
                {fuelStatusCounts.noActivity > 0 && (
                  <option value="NO_ACTIVITY">Tanpa Aktivitas ({fuelStatusCounts.noActivity})</option>
                )}
              </select>
            </div>

            {/* 6. Pencarian (Plat / Equipment / Cost Center / Reference) */}
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
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-900 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <Printer size={13} /> Cetak
            </button>
            <button
              onClick={handleExportFuel}
              className="flex items-center gap-1.5 bg-amber-600 hover:bg-amber-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
            >
              <FileDown size={13} /> Ekspor Excel
            </button>
          </div>
        </div>

        {/* ── 3 Essential Summary Cards (Executive Redesign with Generous Padding & Polish) ── */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 bg-white no-print">
          {/* Card 1: TOTAL PEMAKAIAN SOLAR */}
          <div className="bg-gradient-to-br from-amber-50/90 via-amber-50/40 to-white border border-amber-200 rounded-2xl p-5 flex flex-col justify-between shadow-xs hover:shadow-sm transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-950 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-2xs"></span>
                1. Total Pemakaian Solar
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-100/90 flex items-center justify-center text-amber-700 shadow-2xs">
                <Droplet size={18} />
              </div>
            </div>
            <div className="mt-3.5">
              <div className="text-2xl lg:text-3xl font-black text-amber-950 font-mono tracking-tight">
                {fuelKPIs.totalLiters.toLocaleString('id-ID')} <span className="text-sm font-bold text-amber-800">Liter</span>
              </div>
              <div className="text-xs font-semibold text-amber-900 mt-1.5 flex items-center gap-1.5 flex-wrap">
                <span className="text-slate-500">Biaya Solar:</span>
                <span className="font-mono font-bold text-amber-950 bg-amber-100/80 px-2 py-0.5 rounded-md border border-amber-200">
                  Rp {fuelKPIs.totalCost.toLocaleString('id-ID')}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: TOTAL REALISASI KERJA */}
          <div className="bg-gradient-to-br from-blue-50/90 via-blue-50/40 to-white border border-blue-200 rounded-2xl p-5 flex flex-col justify-between shadow-xs hover:shadow-sm transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-blue-950 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-2xs"></span>
                2. Total Realisasi Aktivitas
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-100/90 flex items-center justify-center text-blue-700 shadow-2xs">
                <Activity size={18} />
              </div>
            </div>
            <div className="mt-3.5">
              <div className="text-2xl lg:text-3xl font-black text-blue-950 font-mono tracking-tight flex items-baseline gap-2 flex-wrap">
                <span>{fuelKPIs.totalKm.toLocaleString('id-ID')} <span className="text-sm font-bold text-blue-800">KM</span></span>
                {fuelKPIs.totalHm > 0 && (
                  <span className="text-slate-600 font-bold text-xl"> · {fuelKPIs.totalHm.toLocaleString('id-ID')} <span className="text-xs font-bold text-blue-800">HM</span></span>
                )}
              </div>
              <div className="text-xs font-semibold text-blue-800 mt-1.5">
                Realisasi Operasional Kendaraan & Alat Berat
              </div>
            </div>
          </div>

          {/* Card 3: RATA-RATA EFISIENSI BBM */}
          <div className="bg-gradient-to-br from-emerald-50/90 via-emerald-50/40 to-white border border-emerald-200 rounded-2xl p-5 flex flex-col justify-between shadow-xs hover:shadow-sm transition">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-950 uppercase tracking-wider flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-2xs"></span>
                3. Rata-Rata Efisiensi BBM
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-100/90 flex items-center justify-center text-emerald-700 shadow-2xs">
                <Gauge size={18} />
              </div>
            </div>
            <div className="mt-3.5">
              <div className="flex items-baseline gap-3 flex-wrap">
                {fuelKPIs.avgKmL > 0 && (
                  <span className="text-2xl lg:text-3xl font-black text-emerald-950 font-mono tracking-tight">
                    {fuelKPIs.avgKmL} <span className="text-sm font-bold text-emerald-800">KM / L</span>
                  </span>
                )}
                {fuelKPIs.avgLHm > 0 && (
                  <span className="text-2xl lg:text-3xl font-black text-purple-950 font-mono tracking-tight">
                    {fuelKPIs.avgLHm} <span className="text-sm font-bold text-purple-800">L / HM</span>
                  </span>
                )}
                {fuelKPIs.avgKmL === 0 && fuelKPIs.avgLHm === 0 && (
                  <span className="text-2xl font-bold text-slate-400">-</span>
                )}
              </div>
              <div className="text-xs font-semibold text-emerald-800 mt-1.5">
                Standar: Mobil ≥ 7.0 KM/L · Truk ≥ 5.0 KM/L
              </div>
            </div>
          </div>
        </div>

        {/* ── Active Filter Status & Segmented Filter Pills Bar ── */}
        <div className="sticky top-0 z-20 px-5 py-3 bg-white/95 backdrop-blur-md border-y border-slate-200/90 flex flex-col lg:flex-row lg:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-500">Filter Aktif:</span>
            <span className="bg-slate-100 border border-slate-200 px-3 py-1 rounded-lg text-xs font-bold text-slate-800 flex items-center gap-1.5 shadow-2xs">
              <Calendar size={13} className="text-emerald-700" />
              {(() => {
                const isDateRange = fuelStartDate || fuelEndDate;
                const dateRangeStr = fuelStartDate && fuelEndDate
                  ? `${fuelStartDate} s/d ${fuelEndDate}`
                  : fuelStartDate
                  ? `Mulai ${fuelStartDate}`
                  : `Sampai ${fuelEndDate}`;

                const monthsStr = fuelMonths.includes('ALL')
                  ? 'Semua Bulan'
                  : fuelMonths.map(m => MONTH_NAMES.find(x => x.val === m)?.label || m).join(', ');

                if (isDateRange) {
                  return `${fuelYear} · ${monthsStr} (${dateRangeStr})`;
                }
                return `${fuelYear} · ${monthsStr}`;
              })()}
            </span>
            {fuelPlant !== 'ALL' && (
              <span className="bg-slate-100 border border-slate-200 px-3 py-1 rounded-lg text-xs font-bold text-slate-800">
                Unit: {fuelPlant}
              </span>
            )}
            {searchFuel.trim() && (
              <span className="bg-amber-50 border border-amber-200 px-3 py-1 rounded-lg text-xs font-bold text-amber-900">
                Cari: "{searchFuel}"
              </span>
            )}
          </div>

          {/* Quick Status Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs font-bold text-slate-500 mr-1 hidden 2xl:inline">Status:</span>
            {[
              { key: 'ALL', label: 'Semua', count: fuelStatusCounts.total, activeClass: 'bg-slate-900 text-white border-slate-900' },
              { key: 'OPTIMAL', label: 'Efisien', count: fuelStatusCounts.optimal, activeClass: 'bg-emerald-700 text-white border-emerald-700' },
              { key: 'NORMAL', label: 'Waspada', count: fuelStatusCounts.normal, activeClass: 'bg-amber-600 text-white border-amber-600' },
              { key: 'BOROS', label: 'Boros', count: fuelStatusCounts.boros, activeClass: 'bg-rose-700 text-white border-rose-700' },
              { key: 'STANDBY', label: 'Standby / Rusak', count: fuelStatusCounts.standby, activeClass: 'bg-slate-700 text-white border-slate-700' },
              { key: 'NO_FUEL', label: 'Tanpa Solar', count: fuelStatusCounts.noFuel, activeClass: 'bg-amber-700 text-white border-amber-700' },
            ].map(tab => {
              const isActive = fuelStatusFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => { setFuelStatusFilter(tab.key); setFuelPage(1); }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 border shadow-2xs ${
                    isActive
                      ? `${tab.activeClass} shadow-xs`
                      : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-300'
                  }`}
                >
                  <span>{tab.label}</span>
                  <span className={`text-xs px-1.5 py-0.2 rounded-full font-mono font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-700'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
            <div className="h-5 w-px bg-slate-200 mx-1 hidden sm:block"></div>
            <div className="text-xs font-bold text-slate-600 whitespace-nowrap pl-1">
              <strong className="text-slate-900 font-mono text-sm">{fuelTableData.length}</strong> Unit
            </div>
          </div>
        </div>

        {/* ── Clean Table with Sticky/Freeze Header ── */}
        <div className="p-3 sm:p-4 bg-white">
          <div className="overflow-x-auto max-h-[calc(100vh-250px)] min-h-[420px] excel-cell-border border border-slate-200 rounded-xl relative shadow-2xs">
            <table className="w-full text-xs border-separate border-spacing-0">
              <thead className="sticky top-0 z-30 shadow-xs">
                <tr className="bg-slate-100/95 text-slate-800 text-[11px] font-black uppercase tracking-tight text-center whitespace-nowrap">
                  <th className="sticky top-0 z-30 bg-slate-100 px-1.5 py-2.5 text-center w-10 border-b border-slate-300">No</th>
                  <th className="sticky top-0 z-30 bg-slate-100 px-1.5 py-2.5 text-center w-20 border-b border-slate-300">Kebun / Unit</th>
                  <th className="sticky top-0 z-30 bg-[#ecfdf5] text-emerald-950 font-black border-x border-emerald-200 border-b border-slate-300 px-1.5 py-2.5 text-center w-28 whitespace-nowrap">
                    No. Equipment
                  </th>
                  <th className="sticky top-0 z-30 bg-slate-100 px-1.5 py-2.5 text-center w-28 font-mono border-b border-slate-300 whitespace-nowrap">Cost Center</th>
                  <th className="sticky top-0 z-30 bg-slate-100 px-2.5 py-2.5 text-center min-w-[140px] border-b border-slate-300">Deskripsi Kendaraan</th>
                  <th className="sticky top-0 z-30 bg-slate-100 text-slate-800 px-2.5 py-2.5 text-center min-w-[130px] border-b border-slate-300">Reference / Rute</th>
                  <th className="sticky top-0 z-30 bg-[#fffbeb] text-amber-950 font-black border-x border-amber-200 border-b border-slate-300 px-1.5 py-2.5 text-center w-24 whitespace-nowrap">
                    Solar (Liter)
                  </th>
                  <th className="sticky top-0 z-30 bg-[#eff6ff] text-blue-950 font-black border-r border-blue-200 border-b border-slate-300 px-1.5 py-2.5 text-center w-24 whitespace-nowrap">
                    ACTIVITY
                  </th>
                  <th className="sticky top-0 z-30 bg-[#ecfdf5] text-emerald-950 font-black border-r border-emerald-200 border-b border-slate-300 px-1.5 py-2.5 text-center w-24 whitespace-nowrap">
                    Rasio / Efisiensi
                  </th>
                  <th className="sticky top-0 z-30 bg-[#f0fdf4] text-emerald-950 font-black border-r border-emerald-200 border-b border-slate-300 px-1.5 py-2.5 text-center w-28 whitespace-nowrap">
                    Keterangan Efisiensi
                  </th>
                  <th className="sticky top-0 z-30 bg-slate-100 text-slate-800 px-1.5 py-2.5 text-center border-b border-slate-300 w-28 whitespace-nowrap">Biaya Solar</th>
                  <th className="sticky top-0 z-30 bg-slate-100 px-1.5 py-2.5 text-center w-20 no-print border-b border-slate-300 whitespace-nowrap">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {fuelTableData.length === 0 ? (
                  <tr>
                    <td colSpan="12" className="text-center py-12 text-slate-400">
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
                          <td className="px-1 py-2 text-center text-slate-500 font-mono font-bold text-xs">{rowNum}</td>

                          {/* 2. Kebun / Unit */}
                          <td className="px-1.5 py-2 text-center">
                            <div className="font-extrabold text-slate-900 text-xs">{row.plant}</div>
                            <div className="text-[10px] text-slate-500 font-medium leading-tight mt-0.5 truncate max-w-[80px] mx-auto">{row.plantDesc || row.plant}</div>
                          </td>

                          {/* 3. No. Equipment */}
                          <td className="px-1.5 py-2 text-center bg-emerald-50/30 border-x border-emerald-100 whitespace-nowrap">
                            {row.equipment && row.equipment !== '-' ? (
                              <span className="font-mono font-black text-xs text-emerald-950 bg-emerald-100/90 px-1.5 py-0.5 rounded-md border border-emerald-300 inline-block shadow-2xs tracking-wide">
                                {row.equipment}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-mono text-xs italic">-</span>
                            )}
                          </td>

                          {/* 4. Cost Center */}
                          <td className="px-1.5 py-2 text-center font-mono font-bold text-slate-800 text-xs whitespace-nowrap">
                            {row.costCenter}
                          </td>

                          {/* 5. Deskripsi Kendaraan */}
                          <td className="px-2 py-2 text-center">
                            <div className="font-bold text-slate-900 text-xs leading-tight">{row.description || '-'}</div>
                            <span className="inline-block mt-0.5 bg-slate-100 text-slate-600 px-1.5 py-0.2 rounded text-[10px] font-mono font-semibold">{row.objectType || 'VEH'}</span>
                          </td>

                          {/* 6. REFERENCE */}
                          <td className="px-2 py-2 text-center bg-slate-50/30">
                            <div
                              className="text-xs font-semibold text-slate-800 leading-tight"
                              title={row.referenceAll || row.referencePrimary || '-'}
                            >
                              {row.referencePrimary || '-'}
                            </div>
                          </td>

                          {/* 7. Solar (Liter) */}
                          <td className="px-1.5 py-2 text-center font-mono font-black text-amber-950 bg-amber-50/40 border-x border-amber-100 text-xs whitespace-nowrap">
                            {row.debitLiters > 0 ? (
                              <span className="inline-flex items-center justify-center gap-1 font-mono font-black text-xs">
                                <span>{row.debitLiters.toLocaleString('id-ID')}</span>
                                <span className="text-[10px] font-bold text-amber-800 bg-amber-100/80 px-1 py-0.2 rounded border border-amber-200">L</span>
                              </span>
                            ) : (
                              <span className="text-slate-300 font-mono text-xs">-</span>
                            )}
                          </td>

                          {/* 8. ACTIVITY */}
                          <td className="px-1.5 py-2 text-center font-mono font-black text-blue-950 bg-blue-50/40 border-r border-blue-100 text-xs whitespace-nowrap">
                            {row.creditKm > 0 && (
                              <div className="inline-flex items-center justify-center gap-1">
                                <span>{row.creditKm.toLocaleString('id-ID')}</span>
                                <span className="text-[10px] font-bold text-blue-800 bg-blue-100 border border-blue-200 px-1 py-0.2 rounded">KM</span>
                              </div>
                            )}
                            {row.creditHm > 0 && (
                              <div className="inline-flex items-center justify-center gap-1">
                                <span>{row.creditHm.toLocaleString('id-ID')}</span>
                                <span className="text-[10px] font-bold text-purple-800 bg-purple-100 border border-purple-200 px-1 py-0.2 rounded">HM</span>
                              </div>
                            )}
                            {row.creditKm === 0 && row.creditHm === 0 && (
                              <span className="text-slate-300 font-mono text-xs">-</span>
                            )}
                          </td>

                          {/* 9. Rasio / Efisiensi */}
                          <td className="px-1.5 py-2 text-center bg-emerald-50/30 border-r border-emerald-100 whitespace-nowrap">
                            {row.efficiency && row.efficiency.ratioVal > 0 ? (
                              <span
                                className={`font-mono font-black text-xs px-2 py-1 rounded-md inline-flex items-center gap-1 shadow-2xs ${
                                  row.efficiency.color === 'emerald'
                                    ? 'bg-emerald-100 text-emerald-950 border border-emerald-300'
                                    : row.efficiency.color === 'amber'
                                    ? 'bg-amber-100 text-amber-950 border border-amber-300'
                                    : 'bg-rose-100 text-rose-950 border border-rose-300'
                                }`}
                                title={`Standar ${row.efficiency.code}: ${row.efficiency.targetText}`}
                              >
                                <span>{row.efficiency.ratioVal}</span>
                                <span className="text-[9.5px] font-extrabold opacity-80">{row.efficiency.uom}</span>
                              </span>
                            ) : (
                              <span className="text-slate-300 font-mono text-xs">-</span>
                            )}
                          </td>

                          {/* 10. Keterangan Efisiensi */}
                          <td className="px-1.5 py-2 text-center bg-slate-50/40 border-r border-slate-200 whitespace-nowrap">
                            {row.efficiency?.isStandby ? (
                              <span
                                className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-300 shadow-2xs tracking-wide"
                                title="Kendaraan Standby / Rusak / Libur (Dummy 1 KM/HM SAP, tidak dihitung efisiensi)"
                              >
                                Standby / Rusak
                              </span>
                            ) : row.efficiency?.isNoFuel ? (
                              <span
                                className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs"
                                title="Aktivitas operasional tercatat tanpa pemakaian BBM pada Cost Center ini (Unit Sewa / Pool BBM Luar)"
                              >
                                Tanpa Solar
                              </span>
                            ) : row.efficiency?.status === 'NO_ACTIVITY' ? (
                              <span
                                className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs"
                                title="Ada pengisian solar tanpa aktivitas KM/HM pada Cost Center ini"
                              >
                                {row.efficiency.badgeLabel || 'Tanpa Aktivitas'}
                              </span>
                            ) : row.efficiency && row.efficiency.ratioVal > 0 ? (
                              <span
                                className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-tight shadow-2xs ${
                                  row.efficiency.color === 'emerald'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : row.efficiency.color === 'amber'
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                    : 'bg-rose-100 text-rose-800 border border-rose-300'
                                }`}
                                title={`Standar ${row.efficiency.code}: ${row.efficiency.targetText}`}
                              >
                                {row.efficiency.badgeLabel}
                              </span>
                            ) : (
                              <span className="text-slate-300 text-xs">-</span>
                            )}
                          </td>

                          {/* 11. Biaya Solar (Rp) */}
                          <td className="px-1.5 py-2 text-center font-mono font-bold text-xs text-slate-800 whitespace-nowrap">
                            {row.debitRp > 0 ? `Rp ${row.debitRp.toLocaleString('id-ID')}` : '-'}
                          </td>

                          {/* 12. Aksi (Detail) */}
                          <td className="px-1.5 py-2 text-center no-print whitespace-nowrap">
                            <button
                              type="button"
                              onClick={async () => {
                                setSelectedFuelVeh(row);
                                setFuelModalTab(isDevUser ? 'reconcile' : 'debit');
                                const vehCC = String(row.costCenter || '').trim().toUpperCase();
                                // Find which months have data for this vehicle across summaries
                                const activeMonthsForVeh = (fuelData.summaries || [])
                                  .filter(s => String(s.costCenter || '').trim().toUpperCase() === vehCC && s.month)
                                  .map(s => s.month.substring(0, 7));

                                let targetMonthsToFetch = [];
                                if (row.month?.includes('Semua Bulan') || fuelMonths.includes('ALL')) {
                                  targetMonthsToFetch = [...new Set(activeMonthsForVeh)];
                                  if (targetMonthsToFetch.length === 0) {
                                    targetMonthsToFetch = ['2026-01', '2026-02', '2026-09', '2026-10'];
                                  }
                                } else if (fuelMonths.length > 0 && !fuelMonths.includes('ALL')) {
                                  targetMonthsToFetch = fuelMonths.map(m => m.length === 2 ? `${fuelYear}-${m}` : m);
                                } else if (row.month && row.month.length === 7) {
                                  targetMonthsToFetch = [row.month];
                                }

                                const missingMonths = targetMonthsToFetch.filter(m => !fuelLoadedMonthsRef.current.has(m));
                                if (missingMonths.length > 0) {
                                  for (const m of missingMonths) {
                                    fuelLoadedMonthsRef.current.add(m);
                                  }
                                  try {
                                    const results = await Promise.all(missingMonths.map(m => fetchFuelDailyForMonth(m)));
                                    const fetchedDaily = results.flatMap(res => (Array.isArray(res?.data) ? res.data : []));
                                    if (fetchedDaily.length > 0) {
                                      setFuelData(prev => {
                                        const existing = new Map((prev.daily || []).map(d => [makeFuelTxKey(d), d]));
                                        for (const d of fetchedDaily) {
                                          const k = makeFuelTxKey(d);
                                          if (!existing.has(k)) existing.set(k, d);
                                        }
                                        return { ...prev, daily: Array.from(existing.values()) };
                                      });
                                    }
                                  } catch (e) {
                                    console.warn('Lazy-load fuel daily warning:', e);
                                  }
                                }
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold bg-[#064e3b] hover:bg-[#065f46] text-white shadow-xs transition hover:scale-[1.02] cursor-pointer"
                            >
                              <Eye size={13} /> Detail
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

    {/* ── Impeccable Detail Modal with ZESTHLP16PA vs SLARC Reconciliation ── */}
    {selectedFuelVeh && (() => {
      const vehCC = String(selectedFuelVeh.costCenter || '').trim().toUpperCase();

      const isDateInSelectedPeriod = (dStr, dMonth) => {
        if (!selectedFuelVeh.month) return true;
        const mStr = String(selectedFuelVeh.month).trim();
        // Case: "2026 (Semua Bulan)" or "ALL" or year-only "2026"
        if (mStr.includes('Semua Bulan') || mStr === 'ALL' || mStr === fuelYear) {
          return Boolean((dStr && dStr.startsWith(fuelYear)) || (dMonth && dMonth.startsWith(fuelYear)));
        }
        // Case: multi-month comma separated "08, 09" or "2026-08, 2026-09"
        if (mStr.includes(',')) {
          const parts = mStr.split(',').map(x => x.trim());
          return parts.some(p => {
            const ym = p.length === 2 ? `${fuelYear}-${p}` : p;
            return (dStr && (dStr === ym || dStr.startsWith(ym))) || (dMonth && dMonth === ym);
          });
        }
        // Case: single month "2026-09" or "09"
        const ym = mStr.length === 2 ? `${fuelYear}-${mStr}` : (mStr.length === 7 ? mStr : mStr.substring(0, 7));
        return Boolean((dStr && (dStr === ym || dStr.startsWith(ym))) || (dMonth && dMonth === ym));
      };

      const dailyDebitForVeh = (fuelData.daily || []).filter(d => 
        String(d.c || '').trim().toUpperCase() === vehCC && d.t === 'D' && isDateInSelectedPeriod(d.d, d.m)
      );
      const dailyDebitLiters = dailyDebitForVeh.reduce((acc, d) => acc + (d.q || 0), 0);
      const dailyDebitRp = dailyDebitForVeh.reduce((acc, d) => acc + (d.r || 0), 0);

      const fuelLiters = dailyDebitForVeh.length > 0
        ? Math.round(dailyDebitLiters * 100) / 100
        : (selectedFuelVeh.debitLiters && selectedFuelVeh.debitLiters > 0 ? selectedFuelVeh.debitLiters : 0);

      const fuelCostRp = dailyDebitForVeh.length > 0
        ? Math.round(dailyDebitRp)
        : (selectedFuelVeh.debitRp && selectedFuelVeh.debitRp > 0 ? selectedFuelVeh.debitRp : 0);

      // Task 1: Weighted average fuel cost per liter (Biaya Solar per L)
      const avgCostPerLiter = fuelLiters > 0 ? Math.round(fuelCostRp / fuelLiters) : 0;

      // Task 2: Take KM/HM strictly from SALRC at the summary/aggregate level, NOT from detailed line-item transactions
      const slarcTotal = ((selectedFuelVeh.creditKm || selectedFuelVeh.creditHm || 0) > 0)
        ? (selectedFuelVeh.creditKm || selectedFuelVeh.creditHm)
        : 0;

      const dailyCreditForVeh = (fuelData.daily || []).filter(d => 
        String(d.c || '').trim().toUpperCase() === vehCC && d.t === 'C' && isDateInSelectedPeriod(d.d, d.m)
      );
      const dailyCreditQty = dailyCreditForVeh.reduce((acc, d) => acc + (d.q || 0), 0);
      // Clean reference helper ensuring no blank '-' or placeholder '1'
      const cleanRefVal = (val) => {
        const s = String(val || '').trim();
        if (!s || s === '-' || s === '1') return '';
        return s;
      };

      // Raw ZEST logs lookup
      const rawZestLogs = (selectedFuelVeh.equipment && selectedFuelVeh.equipment !== '-') ? (zestLogsByEquipment.get(selectedFuelVeh.equipment) || []) : [];
      const zestDailyList = (selectedFuelVeh.matchedZestLogs && selectedFuelVeh.matchedZestLogs.length > 0)
        ? selectedFuelVeh.matchedZestLogs
        : rawZestLogs.filter(l => isDateInSelectedPeriod(l.date, l.date?.substring(0, 7)));

      const zestTotal = zestDailyList.reduce((acc, l) => acc + (parseFloat(l.hm_km) || 0), 0) || selectedFuelVeh.zestTotalKmHm || 0;
      const variance = Math.round((slarcTotal - zestTotal) * 100) / 100;
      const uomLabel = (selectedFuelVeh.creditKm > 0)
        ? 'KM'
        : (selectedFuelVeh.creditHm > 0)
        ? 'HM'
        : (selectedFuelVeh.objectType && ['TRACTOR', 'EXCAVATOR', 'GRADER', 'WLOADER', 'HEAVY'].some(h => (selectedFuelVeh.objectType || '').toUpperCase().includes(h)))
        ? 'HM'
        : 'KM';
      // Build daily reconciliation list (SLARC + ZEST aligned by date)
      const slarcDailyList = dailyCreditForVeh.length > 0 ? dailyCreditForVeh : (selectedFuelVeh.matchedSlarcDaily || []);

      // Map combined dates
      const combinedDateMap = new Map();
      slarcDailyList.forEach(d => {
        const dateKey = d.d;
        if (!dateKey) return;
        const slarcRef = cleanRefVal(d.n);
        if (!combinedDateMap.has(dateKey)) {
          combinedDateMap.set(dateKey, { date: dateKey, slarcQty: 0, zestQty: 0, doc: d.doc, ref: slarcRef, u: d.u });
        }
        combinedDateMap.get(dateKey).slarcQty += (d.q || 0);
      });
      zestDailyList.forEach(l => {
        const dateKey = l.date;
        if (!dateKey) return;
        const zestRef = cleanRefVal(l.reference) || cleanRefVal(l.remarks) || cleanRefVal(JOB_CODE_DESC[l.job_code]);
        if (!combinedDateMap.has(dateKey)) {
          combinedDateMap.set(dateKey, { date: dateKey, slarcQty: 0, zestQty: 0, doc: l.document_number, ref: zestRef, u: l.uom });
        }
        const item = combinedDateMap.get(dateKey);
        item.zestQty += (parseFloat(l.hm_km) || 0);
        if (zestRef) item.ref = zestRef;
        if (!item.doc || item.doc === '-') item.doc = l.document_number;
      });

      // Final pass on reconciliation items to resolve clean description
      combinedDateMap.forEach(item => {
        if (!item.ref || item.ref === '-' || item.ref === '1') {
          item.ref = cleanRefVal(selectedFuelVeh.referencePrimary) || cleanRefVal(selectedFuelVeh.slarcRefPrimary) || 'Realisasi Operasional';
        }
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
                  <span>·</span>
                  <span>Cost Center: <strong className="font-mono text-amber-300">{selectedFuelVeh.costCenter}</strong></span>
                  <span>·</span>
                  <span>Unit: <strong className="text-white">{selectedFuelVeh.plant} ({selectedFuelVeh.plantDesc})</strong></span>
                  {(() => {
                    const eff = selectedFuelVeh.efficiency || evaluateFuelEfficiency(selectedFuelVeh.costCenter, fuelLiters, selectedFuelVeh.creditKm, selectedFuelVeh.creditHm, selectedFuelVeh.objectType);
                    return (
                      <>
                        <span>·</span>
                        <span className="flex items-center gap-1.5">
                          <span className="text-slate-400">Efisiensi:</span>
                          <strong className={`font-mono px-2 py-0.5 rounded text-[11px] font-black ${
                            eff.color === 'emerald'
                              ? 'bg-emerald-800 text-emerald-200 border border-emerald-600'
                              : eff.color === 'amber'
                              ? 'bg-amber-800 text-amber-200 border border-amber-600'
                              : eff.color === 'red'
                              ? 'bg-rose-800 text-rose-200 border border-rose-600'
                              : 'bg-slate-800 text-slate-300'
                          }`}>
                            {eff.ratioVal > 0 ? `${eff.ratioVal} ${eff.uom}` : '-'} ({eff.badgeLabel})
                          </strong>
                          <span className="text-[10px] text-slate-400 font-medium">({eff.code}: {eff.targetText})</span>
                        </span>
                      </>
                    );
                  })()}
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
                  <div className="text-[11px] font-bold text-amber-800 font-mono mt-0.5">
                    {avgCostPerLiter > 0 ? `Rp ${avgCostPerLiter.toLocaleString('id-ID')} / L` : '-'}
                  </div>
                  <span className="text-[9.5px] text-slate-500 font-medium block mt-0.5">
                    {fuelCostRp > 0 ? `Total: Rp ${fuelCostRp.toLocaleString('id-ID')}` : 'Total Pemakaian Solar'}
                  </span>
                </div>

                {/* 2. KM/HM (SLARC Summary Only) */}
                <div 
                  className="bg-white p-3 rounded-xl border transition shadow-2xs text-center border-slate-200"
                >
                  <div className="flex items-center justify-center gap-1 text-[10px] font-bold text-blue-900 uppercase">
                    <Activity size={11} className="text-blue-600" />
                    <span>{isDevUser ? '2. ACTIVITY (SLARC Ringkasan)' : '2. ACTIVITY'}</span>
                  </div>
                  <div className="text-lg font-black text-blue-900 font-mono mt-0.5">
                    {slarcTotal.toLocaleString('id-ID')} <span className="text-xs font-bold text-slate-500">{uomLabel}</span>
                  </div>
                  <span className="text-[9.5px] text-slate-400">Ringkasan Output Aktivitas</span>
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
                <Activity size={13} className="text-indigo-600" /> Verifikasi Activity ({reconciliationRows.length})
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
                <Droplet size={13} className="text-amber-600" /> Pengisian Solar ({dailyDebitForVeh.length})
              </button>
              {/* Transaksi SLARC tab button removed per Task 2 (KM/HM summary only) */}
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
                          <th className="px-3 py-1.5 text-center w-20">ACTIVITY</th>
                          <th className="px-3 py-1.5 text-center w-24">Operator</th>
                          <th className="px-3 py-1.5 text-center w-24">Lokasi</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {zestList.map((l, i) => (
                          <tr key={i} className="hover:bg-slate-50 text-center">
                            <td className="px-2.5 py-1.5 text-center font-mono text-slate-400">{i + 1}</td>
                            <td className="px-3 py-1.5 text-center font-mono font-medium text-slate-800">{l.date}</td>
                            <td className="px-3 py-1.5 text-center font-bold text-emerald-900">{cleanRefVal(l.reference) || cleanRefVal(l.remarks) || '-'}</td>
                            <td className="px-3 py-1.5 text-center text-slate-600">{cleanRefVal(l.remarks) || '-'}</td>
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
                const matchedDaily = dailyDebitForVeh;

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
                        <th className="px-3 py-1.5 text-center w-28 text-amber-900 bg-amber-50/60 font-black">Biaya Solar / L</th>
                        <th className="px-3 py-1.5 text-center">Uraian / SPBU</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {matchedDaily.map((d, i) => {
                        const absLiters = Math.abs(d.q || 0);
                        const absRp = Math.abs(d.r || 0);
                        const costPerL = absLiters > 0 ? Math.round(absRp / absLiters) : 0;

                        return (
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
                            <td className="px-3 py-1.5 text-center font-mono font-bold text-amber-900 bg-amber-50/30">
                              {costPerL > 0 ? `Rp ${costPerL.toLocaleString('id-ID')}` : '-'}
                            </td>
                            <td className="px-3 py-1.5 text-center text-slate-600 text-[10.5px] truncate max-w-xs">{d.n || '-'}</td>
                          </tr>
                        );
                      })}
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
                        <td className="px-3 py-2 text-center font-mono font-black text-amber-950 bg-amber-100/70">
                          {avgCostPerLiter > 0 ? `Rp ${avgCostPerLiter.toLocaleString('id-ID')} / L` : '-'}
                        </td>
                        <td className="px-3 py-2 text-center text-[10px] text-amber-900 font-medium">
                          Rata-rata Tertimbang Biaya Solar
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                );
              })()}
              {/* Transaksi SLARC detailed breakdown table removed per Task 2 (KM/HM summary only) */}
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
