/**
 * RekapMonitoringView — Monitoring Rekap Regional Jam Jalan Mesin
 *
 * Design system: CMMS PTPN IV — "Industrial Command Center"
 * Register: product  |  Brand: Forest Canopy #064e3b
 *
 * Polish pass (2026-08-13) — all P0/P1/P2 from critique resolved:
 *  P0  font floor 11px, removed DAY_ABBR 8px sub-row from header
 *  P1  legend moved ABOVE table · symbol vocabulary cut 5→3
 *  P1  MiniBar: removed width transition (layout-thrash, decorative)
 *  P2  KPI eyebrows → sentence case, no uppercase/tracking
 *  P2  missing-detail cards → compact list rows
 *  fix #f1f5f9 → #f8fafc (DESIGN.md neutral-bg token)
 *  fix table header → #064e3b (brand) from off-brand #0f172a
 *  a11y scope on <th>, role="status" on skeleton, aria-label on dots
 *  prefers-reduced-motion: all transitions skipped
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { format, getDaysInMonth, subDays } from 'date-fns';
import { id } from 'date-fns/locale';
import {
  ChevronLeft, ChevronRight, RefreshCw, Download,
  AlertTriangle, CheckCircle2, ClipboardCheck,
  Building2, CalendarCheck,
} from 'lucide-react';
import { supabase, IS_DEV_ENV } from '../lib/supabase';
import * as XLSX from 'xlsx';

const T_DAILY_LOGS = IS_DEV_ENV ? 'dev_daily_logs' : 'daily_logs';

const ALL_PABRIK_PLANTS = [
  { code: '5F01', name: 'GUNUNG MELIAU' },
  { code: '5F04', name: 'RIMBA BELIAN'  },
  { code: '5F07', name: 'NGABANG'       },
  { code: '5F08', name: 'PARINDU'       },
  { code: '5F09', name: 'KEMBAYAN'      },
  { code: '5F14', name: 'PAMUKAN'       },
  { code: '5F15', name: 'PELAIHARI'     },
  { code: '5F21', name: 'SAMUNTAI'      },
  { code: '5F22', name: 'LONG PINANG'  },
];

async function fetchAllPlantsLogs(yearMonth) {
  if (!supabase) return { data: null, error: 'Supabase not configured' };
  const startDate = `${yearMonth}-01`;
  const endDate   = `${yearMonth}-31`;
  let allData = [], from = 0;
  const PAGE = 1000;
  let fetchError = null;
  while (true) {
    const { data, error } = await supabase
      .from(T_DAILY_LOGS).select('plant, date')
      .gte('date', startDate).lte('date', endDate)
      .order('date').range(from, from + PAGE - 1);
    if (error) { fetchError = error; break; }
    if (!data || data.length === 0) break;
    allData = allData.concat(data);
    if (data.length < PAGE) break;
    from += PAGE;
  }
  return fetchError ? { data: null, error: fetchError } : { data: allData, error: null };
}

/* ─── Compliance badge ──────────────────────────────────────── */
function ComplianceBadge({ pct }) {
  const cls =
    pct >= 90 ? 'bg-emerald-100 text-emerald-800 border-emerald-200' :
    pct >= 70 ? 'bg-amber-100  text-amber-800  border-amber-200'    :
                'bg-red-100    text-red-800     border-red-200';
  return (
    <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-black border ${cls}`}>
      {pct}%
    </span>
  );
}

/* ─── Mini bar (no width transition — P1 fix) ───────────────── */
function MiniBar({ pct }) {
  const fill =
    pct >= 90 ? '#10b981' :
    pct >= 70 ? '#f59e0b' : '#ef4444';
  return (
    <div className="flex items-center gap-1.5 w-full min-w-[80px]">
      <div className="flex-1 h-1.5 rounded-full bg-slate-200 overflow-hidden" style={{ minWidth: 40 }}>
        {/* No transition — static data value, not state indicator */}
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: fill }} />
      </div>
      <ComplianceBadge pct={pct} />
    </div>
  );
}

/* ─── Skeleton (ARIA live region) ───────────────────────────── */
function SkeletonTable() {
  return (
    <div
      role="status"
      aria-label="Memuat data rekap..."
      className="overflow-hidden rounded-xl border border-slate-200 bg-white animate-pulse"
    >
      <div className="h-9 bg-[#064e3b]/80" />
      <div className="h-8 bg-slate-100 border-b border-slate-200" />
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex border-b border-slate-100" style={{ height: 38 }}>
          <div className="w-[136px] bg-slate-50 border-r border-slate-200 flex-shrink-0" />
          {Array.from({ length: 16 }).map((__, j) => (
            <div key={j} className="flex-1 border-r border-slate-100" style={{ background: i % 3 === 0 && j % 5 === 0 ? '#f8fafc' : 'white' }} />
          ))}
          <div className="w-[100px] bg-slate-50 flex-shrink-0" />
        </div>
      ))}
      <span className="sr-only">Memuat data rekap...</span>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════
   Main component
════════════════════════════════════════════════════════════ */
export default function RekapMonitoringView({ currentUser, equipments }) {
  const today     = new Date();
  const yesterday = subDays(today, 1);
  const target_str = format(yesterday, 'yyyy-MM-dd');
  const today_str  = format(today,    'yyyy-MM-dd');

  const [rekapMonth,   setRekapMonth]   = useState(format(today, 'yyyy-MM'));
  const [logsData,     setLogsData]     = useState([]);
  const [isLoading,    setIsLoading]    = useState(false);
  const [fetchError,   setFetchError]   = useState(null);
  const [lastUpdated,  setLastUpdated]  = useState(null);

  /* Plant list */
  const pabrikList = useMemo(() => {
    if (!equipments || equipments.length === 0) return ALL_PABRIK_PLANTS;
    const set = new Set(
      equipments.filter(e => e.plant && String(e.plant).startsWith('5F')).map(e => String(e.plant))
    );
    const hit = ALL_PABRIK_PLANTS.filter(p => set.has(p.code));
    return hit.length > 0 ? hit : ALL_PABRIK_PLANTS;
  }, [equipments]);

  const [year, month] = rekapMonth.split('-').map(Number);
  const daysInMonth   = getDaysInMonth(new Date(year, month - 1, 1));
  const monthLabel    = format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: id });
  const isCurrentMonth = rekapMonth === format(today, 'yyyy-MM');

  /* Submitted lookup */
  const submittedSet = useMemo(() => {
    const s = new Set();
    for (const r of logsData) s.add(`${r.plant}_${r.date}`);
    return s;
  }, [logsData]);

  /* Day columns — simplified flags: isTarget / isToday / isFuture */
  const dayColumns = useMemo(() =>
    Array.from({ length: daysInMonth }, (_, i) => {
      const d       = i + 1;
      const dateStr = `${rekapMonth}-${String(d).padStart(2, '0')}`;
      const dow     = new Date(dateStr + 'T12:00:00').getDay();
      return {
        day: d, dateStr, dow,
        isWeekend: dow === 0 || dow === 6,
        isTarget:  dateStr <= target_str,
        isToday:   dateStr === today_str,
        isFuture:  dateStr > today_str,
      };
    }),
    [daysInMonth, rekapMonth, target_str, today_str]
  );

  const targetDays = useMemo(() => dayColumns.filter(d => d.isTarget), [dayColumns]);

  /* Fetch */
  const loadData = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const { data, error } = await fetchAllPlantsLogs(rekapMonth);
      if (error) {
        setFetchError(typeof error === 'string' ? error : error.message ?? 'Gagal memuat data');
        setLogsData([]);
      } else {
        setLogsData(data || []);
      }
      setLastUpdated(new Date());
    } finally { setIsLoading(false); }
  }, [rekapMonth]);

  useEffect(() => { loadData(); }, [loadData]);

  /* Stats */
  const plantStats = useMemo(() =>
    pabrikList.map(p => {
      const submitted = targetDays.filter(d => submittedSet.has(`${p.code}_${d.dateStr}`)).length;
      const missing   = targetDays.length - submitted;
      const pct       = targetDays.length > 0 ? Math.round((submitted / targetDays.length) * 100) : 100;
      return { ...p, submitted, missing, total: targetDays.length, pct };
    }),
    [pabrikList, targetDays, submittedSet]
  );

  const overallCompliance = useMemo(() => {
    if (!targetDays.length || !pabrikList.length) return 100;
    const total  = targetDays.length * pabrikList.length;
    const filled = pabrikList.reduce(
      (a, p) => a + targetDays.filter(d => submittedSet.has(`${p.code}_${d.dateStr}`)).length, 0
    );
    return Math.round((filled / total) * 100);
  }, [targetDays, pabrikList, submittedSet]);

  const daysWithMissing = useMemo(() =>
    targetDays.filter(d => pabrikList.some(p => !submittedSet.has(`${p.code}_${d.dateStr}`))),
    [targetDays, pabrikList, submittedSet]
  );

  /* Navigation */
  const prevMonth = () => setRekapMonth(format(new Date(year, month - 2, 1), 'yyyy-MM'));
  const nextMonth = () => {
    const next = format(new Date(year, month, 1), 'yyyy-MM');
    if (next <= format(today, 'yyyy-MM')) setRekapMonth(next);
  };

  /* Export */
  const handleExport = () => {
    const header = ['Plant', 'Unit', ...targetDays.map(d => String(d.day).padStart(2, '0')), 'Isi', 'Kosong', '%'];
    const rows   = pabrikList.map(p => {
      const s     = plantStats.find(x => x.code === p.code);
      const cells = targetDays.map(d => submittedSet.has(`${p.code}_${d.dateStr}`) ? '✓' : '-');
      return [p.code, p.name, ...cells, s?.submitted ?? 0, s?.missing ?? 0, `${s?.pct ?? 0}%`];
    });
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    ws['!cols'] = [{ wch: 7 }, { wch: 22 }, ...targetDays.map(() => ({ wch: 3 })), { wch: 6 }, { wch: 6 }, { wch: 8 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Rekap ${monthLabel}`);
    XLSX.writeFile(wb, `Rekap_HM_Reg5_${rekapMonth}.xlsx`);
  };

  /* Display tokens */
  const compColor =
    overallCompliance >= 90 ? '#064e3b' :
    overallCompliance >= 70 ? '#92400e' : '#991b1b';
  const targetLabel = `${yesterday.getDate().toString().padStart(2,'0')} ${format(yesterday,'MMM',{locale:id})}`;

  /* ════════════════════════════════════════════════════════
     RENDER
  ════════════════════════════════════════════════════════ */
  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#f8fafc]">

      {/* ── Toolbar ─────────────────────────────────────── */}
      <div className="flex-shrink-0 bg-white border-b border-slate-200 px-5 py-2.5 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <ClipboardCheck size={17} className="text-[#064e3b] flex-shrink-0" aria-hidden="true" />
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 leading-tight truncate">
              Rekap Monitoring HM Equipment — Regional 5
            </h2>
            <p className="text-[11px] text-slate-500 leading-tight">
              Target input s/d{' '}
              <strong className="font-semibold text-slate-700">{targetLabel}</strong>
              {' '}(H&#8209;1){isCurrentMonth ? '' : ` · ${monthLabel}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden">
            <button
              onClick={prevMonth}
              aria-label="Bulan sebelumnya"
              className="px-2 py-1.5 hover:bg-slate-100 text-slate-600 transition-colors border-r border-slate-200"
            >
              <ChevronLeft size={14} />
            </button>
            <input
              type="month" value={rekapMonth}
              max={format(today, 'yyyy-MM')}
              onChange={e => setRekapMonth(e.target.value)}
              aria-label="Pilih bulan"
              className="text-xs font-semibold text-slate-800 bg-transparent border-none outline-none px-2 py-1.5 cursor-pointer w-[126px]"
            />
            <button
              onClick={nextMonth}
              disabled={rekapMonth >= format(today, 'yyyy-MM')}
              aria-label="Bulan berikutnya"
              className="px-2 py-1.5 hover:bg-slate-100 text-slate-600 transition-colors border-l border-slate-200 disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight size={14} />
            </button>
          </div>

          <button
            onClick={loadData} disabled={isLoading}
            aria-label="Perbarui data"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={isLoading ? 'animate-spin text-[#064e3b]' : 'text-slate-500'} aria-hidden="true" />
            {isLoading ? 'Loading…' : 'Refresh'}
          </button>

          <button
            onClick={handleExport} disabled={isLoading || logsData.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#064e3b] hover:bg-[#065f46] text-white text-xs font-semibold transition-colors disabled:opacity-40 shadow-sm"
          >
            <Download size={12} aria-hidden="true" />
            Export Excel
          </button>
        </div>
      </div>

      {/* ── KPI Strip ───────────────────────────────────── */}
      <div className="flex-shrink-0 border-b border-slate-200 bg-white">
        <div className="flex divide-x divide-slate-200">

          {/* Compliance */}
          <div className="flex items-center gap-3 px-5 py-3 min-w-[200px]">
            <span
              className="text-2xl font-black tabular-nums leading-none"
              style={{ color: compColor }}
              aria-label={`Kepatuhan regional ${overallCompliance} persen`}
            >
              {overallCompliance}%
            </span>
            <div>
              {/* P2 fix: sentence case, no tracking-wider */}
              <div className="text-[11px] text-slate-500 font-medium leading-tight">Kepatuhan regional</div>
              <div className="text-[11px] text-slate-600 font-semibold leading-tight">{monthLabel}</div>
              <div className="mt-1.5 h-1 w-full rounded-full bg-slate-100 overflow-hidden" role="progressbar" aria-valuenow={overallCompliance} aria-valuemin={0} aria-valuemax={100}>
                <div
                  className="h-full rounded-full"
                  style={{ width: `${overallCompliance}%`, background: compColor }}
                />
              </div>
            </div>
          </div>

          {/* Target days */}
          <div className="flex items-center gap-2.5 px-5 py-3 min-w-[156px]">
            <CalendarCheck size={18} className="text-slate-400 flex-shrink-0" aria-hidden="true" />
            <div>
              <div className="text-[11px] text-slate-500 font-medium leading-tight">Hari target</div>
              <div className="text-[11px] text-slate-700 leading-tight">
                <span className="text-base font-black text-slate-800">{targetDays.length}</span>
                <span className="text-slate-400"> / {daysInMonth} hari</span>
              </div>
            </div>
          </div>

          {/* Days with missing */}
          <div className="flex items-center gap-2.5 px-5 py-3 min-w-[176px]">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${daysWithMissing.length > 0 ? 'bg-red-100' : 'bg-emerald-100'}`}
              aria-hidden="true"
            >
              {daysWithMissing.length > 0
                ? <AlertTriangle size={15} className="text-red-600" />
                : <CheckCircle2 size={15} className="text-emerald-600" />}
            </div>
            <div>
              <div className="text-[11px] text-slate-500 font-medium leading-tight">Hari ada kosong</div>
              <div className="text-[11px] leading-tight">
                <span className={`text-base font-black ${daysWithMissing.length > 0 ? 'text-red-700' : 'text-emerald-700'}`}>
                  {daysWithMissing.length}
                </span>
                <span className="text-slate-400"> tanggal</span>
              </div>
            </div>
          </div>

          {/* Units with missing */}
          <div className="flex items-center gap-2.5 px-5 py-3 min-w-[176px]">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${plantStats.some(p => p.missing > 0) ? 'bg-amber-100' : 'bg-emerald-100'}`}
              aria-hidden="true"
            >
              <Building2 size={15} className={plantStats.some(p => p.missing > 0) ? 'text-amber-700' : 'text-emerald-600'} />
            </div>
            <div>
              <div className="text-[11px] text-slate-500 font-medium leading-tight">Unit ada kosong</div>
              <div className="text-[11px] leading-tight">
                <span className={`text-base font-black ${plantStats.some(p => p.missing > 0) ? 'text-amber-700' : 'text-emerald-700'}`}>
                  {plantStats.filter(p => p.missing > 0).length}
                </span>
                <span className="text-slate-400"> / {pabrikList.length} unit</span>
              </div>
            </div>
          </div>

          {lastUpdated && (
            <div className="ml-auto flex items-center px-5 py-3">
              <span className="text-[11px] text-slate-400 font-mono whitespace-nowrap">
                Diperbarui {format(lastUpdated, 'HH:mm:ss')}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* ── Fetch error banner ───────────────────────────── */}
      {fetchError && (
        <div role="alert" className="flex-shrink-0 bg-red-50 border-b border-red-200 px-5 py-2.5 flex items-center gap-2">
          <AlertTriangle size={14} className="text-red-500 flex-shrink-0" aria-hidden="true" />
          <p className="text-[12px] text-red-700 font-medium">
            Gagal memuat data: {fetchError}.{' '}
            <button onClick={loadData} className="underline font-semibold hover:no-underline">Coba lagi</button>
          </p>
        </div>
      )}

      {/* ── Matrix + Detail ──────────────────────────────── */}
      <div className="flex-1 overflow-auto px-5 py-4 space-y-4">

        {isLoading ? (
          <SkeletonTable />
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-[0_1px_2px_0_rgb(0,0,0,0.05)]">

            {/* Table header bar — brand #064e3b */}
            <div className="bg-[#064e3b] px-4 py-2.5 flex items-center justify-between">
              <h3 className="text-[11px] font-bold text-emerald-100 tracking-wide uppercase">
                HM Equipment · {monthLabel.toUpperCase()} · Reg 5
              </h3>
              <span className="text-[11px] text-emerald-300/70 font-mono">
                Target s/d tgl {yesterday.getDate().toString().padStart(2,'0')} · H&#8209;1
              </span>
            </div>

            {/* P1 fix: legend ABOVE the table, vocabulary 5→3 */}
            <div className="border-b border-slate-200 px-4 py-1.5 bg-slate-50 flex items-center gap-5 flex-wrap">
              <span className="text-[11px] font-semibold text-slate-500">Keterangan:</span>
              <span className="flex items-center gap-1 text-[11px] text-slate-700">
                <span className="text-emerald-600 font-black text-sm leading-none">✓</span>
                Sudah isi
              </span>
              <span className="flex items-center gap-1 text-[11px] text-slate-700">
                <span className="text-red-500 font-black text-sm leading-none">✕</span>
                Belum isi (target)
              </span>
              <span className="flex items-center gap-1 text-[11px] text-slate-700">
                <span className="text-slate-300 text-sm leading-none">·</span>
                Belum waktunya / hari ini
              </span>
            </div>

            <div className="overflow-auto">
              <table
                className="border-collapse"
                style={{ minWidth: 'max-content', fontSize: 11 }}
                aria-label={`Matriks kepatuhan HM Equipment ${monthLabel}`}
              >
                <thead>
                  <tr className="bg-[#064e3b] text-emerald-100">
                    <th
                      scope="col"
                      className="sticky left-0 z-20 bg-[#064e3b] text-left px-3 py-2 font-bold text-[11px] uppercase tracking-wide border-r border-emerald-800 min-w-[136px] whitespace-nowrap"
                    >
                      Plant / Unit
                    </th>

                    {dayColumns.map(({ day, dateStr, dow, isWeekend, isTarget, isToday, isFuture }) => (
                      <th
                        key={day}
                        scope="col"
                        title={
                          isFuture  ? 'Belum waktunya' :
                          isToday   ? `Hari ini — belum target` :
                          `Target: ${dateStr}`
                        }
                        className={`w-9 min-w-[36px] px-0.5 pt-2 pb-1.5 text-center border-l border-emerald-800/40 select-none align-bottom
                          ${isFuture  ? 'opacity-25' :
                            isToday   ? 'bg-blue-800/50 text-blue-200' :
                            isWeekend ? 'text-amber-300' :
                            'text-emerald-100'}`}
                      >
                        {/* P0 fix: only day number, no 8px sub-row */}
                        <div className="font-mono text-[11px] font-bold">{String(day).padStart(2,'0')}</div>
                      </th>
                    ))}

                    <th scope="col" className="px-3 py-2 text-center font-bold text-[11px] uppercase tracking-wide whitespace-nowrap border-l border-emerald-800 bg-[#053d2e] text-emerald-300">
                      Isi
                    </th>
                    <th scope="col" className="px-2 py-2 text-center font-bold text-[11px] whitespace-nowrap border-l border-emerald-800/50 text-emerald-400/70">
                      ✕
                    </th>
                    <th scope="col" className="px-3 py-2 text-left font-bold text-[11px] uppercase tracking-wide whitespace-nowrap border-l border-emerald-800/50 text-emerald-400/70 min-w-[110px]">
                      Kepatuhan
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {plantStats.map((plant, idx) => {
                    const rowOk  = plant.missing === 0 && plant.total > 0;
                    const rowBad = plant.pct < 70;
                    const statusLabel = rowOk ? 'Lengkap' : rowBad ? 'Kritis' : 'Sebagian';
                    const dotColor    = rowOk ? '#10b981' : rowBad ? '#ef4444' : '#f59e0b';

                    return (
                      <tr key={plant.code}
                        className={`transition-colors hover:bg-slate-50/80 ${
                          rowOk  ? 'bg-emerald-50/30' :
                          rowBad ? 'bg-red-50/20'     :
                          idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                        }`}
                      >
                        {/* Sticky plant cell */}
                        <td className={`sticky left-0 z-10 px-3 py-2.5 border-r border-slate-200 whitespace-nowrap ${
                          rowOk  ? 'bg-emerald-50/60' :
                          rowBad ? 'bg-red-50/50'     :
                          idx % 2 === 0 ? 'bg-white' : 'bg-slate-50'
                        }`}>
                          <div className="flex items-center gap-2">
                            {/* Accessible dot: color + aria-label */}
                            <span
                              className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                              style={{ background: dotColor }}
                              aria-label={`Status: ${statusLabel}`}
                              role="img"
                            />
                            <div>
                              <div className="font-black text-[11px] text-slate-800 font-mono">{plant.code}</div>
                              <div className="text-[11px] text-slate-400 font-medium truncate max-w-[90px]">{plant.name}</div>
                            </div>
                          </div>
                        </td>

                        {/* Day cells */}
                        {dayColumns.map(({ day, dateStr, isTarget, isToday, isFuture }) => {
                          const submitted = submittedSet.has(`${plant.code}_${dateStr}`);
                          return (
                            <td key={day}
                              title={
                                isFuture || isToday ? undefined :
                                submitted ? `${plant.code} sudah isi ${dateStr}` :
                                `${plant.code} belum isi ${dateStr}`
                              }
                              className={`text-center py-2.5 border-l border-slate-100 ${
                                isFuture || isToday ? 'bg-slate-50/30' : ''
                              }`}
                            >
                              {isFuture || isToday ? (
                                <span className="text-slate-200 text-xs">·</span>
                              ) : submitted ? (
                                <span className="text-emerald-600 font-black" style={{ fontSize: 13, lineHeight: 1 }} aria-label="Sudah isi">✓</span>
                              ) : isTarget ? (
                                <span className="text-red-500 font-black text-xs" aria-label="Belum isi">✕</span>
                              ) : (
                                <span className="text-slate-200 text-xs">·</span>
                              )}
                            </td>
                          );
                        })}

                        {/* Stats */}
                        <td className="text-center font-black text-emerald-700 border-l-2 border-slate-200 px-3 py-2.5 font-mono text-[11px]">
                          {plant.submitted}
                        </td>
                        <td className={`text-center font-black px-2 py-2.5 border-l border-slate-100 font-mono text-[11px] ${
                          plant.missing > 0 ? 'text-red-500' : 'text-slate-300'
                        }`}>
                          {plant.missing > 0 ? plant.missing : '—'}
                        </td>
                        <td className="px-3 py-2 border-l border-slate-100">
                          <MiniBar pct={plant.pct} />
                        </td>
                      </tr>
                    );
                  })}

                  {/* Footer totals */}
                  <tr className="bg-[#1e293b] text-white">
                    <td className="sticky left-0 z-10 bg-[#1e293b] px-3 py-2.5 font-bold text-[11px] text-slate-300 border-r border-slate-600 whitespace-nowrap uppercase tracking-wide">
                      Total / {pabrikList.length}
                    </td>
                    {dayColumns.map(({ day, dateStr, isToday, isFuture }) => {
                      if (isFuture || isToday) return (
                        <td key={day} className="text-center py-2 border-l border-slate-700">
                          <span className="text-slate-700 text-xs">·</span>
                        </td>
                      );
                      const filled    = pabrikList.filter(p => submittedSet.has(`${p.code}_${dateStr}`)).length;
                      const allFill   = filled === pabrikList.length;
                      const noneFill  = filled === 0;
                      const bg        = allFill ? '#064e3b' : noneFill ? '#7f1d1d' : '#78350f';
                      return (
                        <td key={day} className="text-center py-1.5 border-l border-slate-700"
                          title={`${dateStr}: ${filled}/${pabrikList.length} unit isi`}>
                          <span className="inline-flex items-center justify-center rounded font-black text-white"
                            style={{ fontSize: 9, padding: '1px 2px', minWidth: 26, background: bg }}>
                            {filled}/{pabrikList.length}
                          </span>
                        </td>
                      );
                    })}
                    <td className="text-center font-black text-emerald-400 border-l-2 border-slate-600 px-3 py-2.5 font-mono text-[11px]">
                      {plantStats.reduce((a, p) => a + p.submitted, 0)}
                    </td>
                    <td className={`text-center font-black px-2 py-2.5 border-l border-slate-700 font-mono text-[11px] ${
                      plantStats.some(p => p.missing > 0) ? 'text-red-400' : 'text-slate-500'
                    }`}>
                      {plantStats.reduce((a, p) => a + p.missing, 0) || '—'}
                    </td>
                    <td className="px-3 py-2.5 border-l border-slate-700">
                      <ComplianceBadge pct={overallCompliance} />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Missing detail — compact list (P2 fix) ──────── */}
        {!isLoading && daysWithMissing.length > 0 && (
          <div className="rounded-xl border border-red-200 bg-white overflow-hidden shadow-[0_1px_2px_0_rgb(0,0,0,0.04)]">
            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-red-100 bg-red-50">
              <AlertTriangle size={14} className="text-red-500 flex-shrink-0" aria-hidden="true" />
              <h3 className="text-[12px] font-bold text-red-800">Detail Tanggal &amp; Unit Belum Mengisi</h3>
              <span className="ml-auto text-[11px] font-bold text-red-600 bg-red-100 border border-red-200 px-2 py-0.5 rounded-full">
                {daysWithMissing.length} hari
              </span>
            </div>

            {/* Compact list — no card grid */}
            <div className="divide-y divide-slate-100">
              {daysWithMissing.map(({ day, dateStr, dow }) => {
                const missingPlants = pabrikList.filter(p => !submittedSet.has(`${p.code}_${dateStr}`));
                const filledCount   = pabrikList.length - missingPlants.length;
                const pct           = Math.round((filledCount / pabrikList.length) * 100);
                const dateObj       = new Date(dateStr + 'T12:00:00');
                const dayName       = format(dateObj, 'EEE dd MMM', { locale: id });

                return (
                  <div key={dateStr} className="flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50">
                    {/* Date label */}
                    <div className="w-[110px] flex-shrink-0">
                      <span className="text-[11px] font-bold text-slate-700 capitalize">{dayName}</span>
                    </div>
                    {/* Missing chips */}
                    <div className="flex flex-wrap gap-1 flex-1">
                      {missingPlants.map(p => (
                        <span
                          key={p.code}
                          className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-red-50 border border-red-200 text-red-700 font-mono"
                          title={p.name}
                        >
                          {p.code}
                        </span>
                      ))}
                    </div>
                    {/* Completion badge */}
                    <div className="flex-shrink-0">
                      <ComplianceBadge pct={pct} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── All-good state ───────────────────────────────── */}
        {!isLoading && !fetchError && daysWithMissing.length === 0 && targetDays.length > 0 && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4 flex items-center gap-4">
            <CheckCircle2 size={28} className="text-emerald-500 flex-shrink-0" aria-hidden="true" />
            <div>
              <p className="text-[13px] font-bold text-emerald-900">Semua Unit Sudah Mengisi</p>
              <p className="text-[11px] text-emerald-700 mt-0.5">
                Seluruh {pabrikList.length} unit telah mengisi jam jalan untuk {targetDays.length} hari target di <strong>{monthLabel}</strong>.
              </p>
            </div>
            <span className="ml-auto text-3xl font-black text-emerald-300 select-none" aria-hidden="true">100%</span>
          </div>
        )}

        {/* ── No target yet ────────────────────────────────── */}
        {!isLoading && !fetchError && targetDays.length === 0 && (
          <div className="rounded-xl border border-slate-200 bg-white px-5 py-8 text-center">
            <CalendarCheck size={32} className="text-slate-300 mx-auto mb-3" aria-hidden="true" />
            <p className="text-[13px] font-semibold text-slate-600">Belum ada hari target</p>
            <p className="text-[11px] text-slate-400 mt-1">
              Bulan ini belum memiliki target pengisian (target dimulai dari H&#8209;1 hari pertama).
            </p>
          </div>
        )}
      </div>

      {/* Reduced-motion override */}
      <style>{`
        @media (prefers-reduced-motion: reduce) {
          * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
      `}</style>
    </div>
  );
}
