import React, { useState, useMemo, useEffect, useRef } from 'react';
import { format, endOfMonth, getDaysInMonth } from 'date-fns';
import { id } from 'date-fns/locale';
import { RefreshCw, Download, Calendar, List, X, Copy, Check, Upload } from 'lucide-react';
import { supabase, IS_DEV_ENV } from '../lib/supabase';

const T_DAILY_LOGS = IS_DEV_ENV ? 'dev_daily_logs' : 'daily_logs';

import { getSystemConfig, saveSystemConfig, fetchMasterEquipment } from '../lib/supabaseService';
import * as XLSX from 'xlsx';

export default function SAPVerificationView({ equipments, currentUser }) {
  const [targetMonth, setTargetMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState('');
  const [isUploadingIK17, setIsUploadingIK17] = useState(false);
  const ik17InputRef = useRef(null);
  const [matrixData, setMatrixData] = useState([]); 
  const [lastUpdated, setLastUpdated] = useState('');
  const [debugMsg, setDebugMsg] = useState('');
  const [groupBy, setGroupBy] = useState('plant'); // 'plant' or 'equipment'

  // ── Session-level caches (survive re-renders, reset on page refresh) ──────
  const _cacheMasterEq    = useRef(null); // { data: [...] } — 17,277 rows, fetched once
  const _cacheMasterMap   = useRef(null); // raw master_map entries, fetched once
  const _cacheIK17Base    = useRef(null); // ik17_parsed_data.json — 63k rows, fetched once
  const _cacheIK17DB      = useRef({ data: null, ts: 0 }); // ik17_raw_data — TTL 60s
  const _cacheMonitoredEq = useRef(null); // all-time induk_eq_num+plant from daily_logs, fetched once
  const [filterPlant, setFilterPlant] = useState('ALL');
  const [filterJenis, setFilterJenis] = useState('');
  const [searchEq, setSearchEq] = useState('');
  const [showOnlySelisih, setShowOnlySelisih] = useState(false);
  const [showRekapModal, setShowRekapModal] = useState(false);
  const [copiedEqs, setCopiedEqs] = useState(false);
  const [rawWebLogs, setRawWebLogs] = useState([]);
  const [rawSapLogs, setRawSapLogs] = useState([]);
  const [detailModal, setDetailModal] = useState(null); // { plant, dateKey, selisihTotal }

  const handleIK17Upload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setIsUploadingIK17(true);
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: 'array' });
      const sheetName = wb.SheetNames[0];
      const sheet = wb.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
      if (jsonData.length < 2) throw new Error("Format file IK17 tidak valid.");

      const cleanDateStr = (raw) => {
        if (raw === undefined || raw === null || raw === '') return '';
        if (typeof raw === 'number') {
          const dateObj = XLSX.SSF.parse_date_code(raw);
          if (dateObj) {
            return `${dateObj.y}-${String(dateObj.m).padStart(2, '0')}-${String(dateObj.d).padStart(2, '0')}`;
          }
        }
        if (raw instanceof Date && !isNaN(raw.getTime())) {
          return format(raw, 'yyyy-MM-dd');
        }

        let str = String(raw).trim();
        if (str.includes(' ')) {
          str = str.split(' ')[0];
        }
        if (!str) return '';

        if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

        if (/^\d{4}[\/\.]\d{1,2}[\/\.]\d{1,2}$/.test(str)) {
          const p = str.split(/[\/\.]/);
          return `${p[0]}-${p[1].padStart(2, '0')}-${p[2].padStart(2, '0')}`;
        }

        const parts = str.split(/[\/\.\-]/);
        if (parts.length === 3) {
          let [p1, p2, p3] = parts;
          if (p3.length === 2) p3 = `20${p3}`;
          if (p1.length === 4) {
            return `${p1}-${p2.padStart(2, '0')}-${p3.padStart(2, '0')}`;
          }
          return `${p3.padStart(4, '20')}-${p2.padStart(2, '0')}-${p1.padStart(2, '0')}`;
        }

        return '';
      };

      const normEq = (s) => String(s || '').replace(/^0+/, '').trim();

      const subKeywords = [
        'ACCESSORIES', 'ACCESSORY', 'ACC ', 'ACC_', 'ACC.',
        'PANEL', 'GEARBOX', 'GEAR BOX', 'G/BOX', 'PIPE', 'PIPING',
        'ELECTROMOTOR', 'ELECTRO MOTOR', 'ELMOT', 'EL. MOTOR', 'E/M',
        'HYDRAULIC', 'HIDROLIK', 'HPU', 'STRUCTURE', 'STRUKTUR',
        'BODY', 'WHEEL', 'RODA', 'CONTROLLERS', 'CONTROLLER', 'KONTROL',
        'AUTOMATIC', 'EXHAUST', 'VALVE', 'CHAIN', 'RANTAI', 'BEARING',
        'SHAFT', 'POROS', 'COUPLING', 'KOPLING', 'CHUTE', 'CORONG',
        'IMPELLER', 'NOZZLE', 'GAUGE', 'METER', 'SENSOR', 'SWITCH',
        'BREAKER', 'KABEL', 'CABLE', 'DUCTING', 'DUCT', 'SILENCER'
      ];
      const isSubDesc = (desc) => {
        if (!desc) return false;
        const u = String(desc).toUpperCase();
        return subKeywords.some(kw => u.includes(kw));
      };

      const parentEqSet = new Set();

      // Populate parentEqSet from daily_logs (all monitored Parent Equipments)
      if (supabase) {
        try {
          let eqFrom = 0;
          const EQ_PAGE = 1000;
          while (true) {
            const { data: dbLogs, error: dbErr } = await supabase
              .from(T_DAILY_LOGS)
              .select('induk_eq_num')
              .range(eqFrom, eqFrom + EQ_PAGE - 1);
            if (dbErr || !dbLogs || dbLogs.length === 0) break;
            dbLogs.forEach(l => {
              if (l.induk_eq_num) {
                const e = String(l.induk_eq_num).trim();
                parentEqSet.add(e);
                parentEqSet.add(normEq(e));
              }
            });
            if (dbLogs.length < EQ_PAGE) break;
            eqFrom += dbLogs.length;
          }
        } catch (err) {
          console.warn('Error fetching daily_logs for upload parentEqSet:', err);
        }
      }

      // Also add from equipments prop if available
      if (Array.isArray(equipments)) {
        equipments.forEach(eq => {
          const eqNum = String(eq.eqNum || eq.eq_num || '').trim();
          if (!eqNum) return;
          const desc = eq.description || '';
          const eqType = eq.type || eq.eq_type;
          const isSub = eqType === 'Sub' || eqType === 'sub' || isSubDesc(desc);
          if (!isSub) {
            parentEqSet.add(eqNum);
            parentEqSet.add(normEq(eqNum));
          }
        });
      }

      // STRICT COLUMN MAPPING AS INSTRUCTED BY USER:
      // Column D = Index 3 (Tanggal)
      // Column F = Index 5 (Nomor Equipment Induk)
      // Column H = Index 7 (Nilai HM / Hour Meter)
      const parsedRows = [];
      const newDatesSet = new Set();

      for (let i = 0; i < jsonData.length; i++) {
        const row = jsonData[i];
        if (!row || row[5] === undefined || row[5] === null) continue;
        const eqStr = String(row[5]).trim();
        // Skip non-numeric header lines
        if (!eqStr || !/\d/.test(eqStr) || eqStr.toUpperCase().includes('EQUIPMENT') || eqStr.toUpperCase().includes('CREATED BY') || eqStr.toUpperCase().includes('TOTAL') || eqStr.toUpperCase().includes('RESULT')) continue;

        const eqNorm = normEq(eqStr);

        // Filter ONLY parents (Induk equipment)
        if (parentEqSet.size > 0) {
          const isParent = parentEqSet.has(eqStr) || parentEqSet.has(eqNorm);
          if (!isParent) continue; // Skip sub-equipments
        }

        let valNum = parseFloat(String(row[7] || '0').replace(',', '.'));
        if (isNaN(valNum)) valNum = 0;
        
        const dateStr = cleanDateStr(row[3]);
        if (!dateStr) continue;

        newDatesSet.add(dateStr);

        parsedRows.push({
          e: eqNorm,
          h: valNum,
          d: dateStr,
          s: false,
          t: ''
        });
      }

      // Update _cacheIK17Base in memory directly (merge new rows, replace dates)
      const currentBase = Array.isArray(_cacheIK17Base.current) ? _cacheIK17Base.current : [];
      let mergedBase = currentBase.filter(r => r.d && !newDatesSet.has(cleanDateStr(r.d)));
      mergedBase = [...mergedBase, ...parsedRows];
      _cacheIK17Base.current = mergedBase;

      // Group parsed rows by year-month key and save to system_config
      const byMonth = {};
      parsedRows.forEach(r => {
        const ym = r.d ? r.d.substring(0, 7) : null;
        if (!ym) return;
        if (!byMonth[ym]) byMonth[ym] = [];
        byMonth[ym].push(r);
      });

      const savePromises = Object.entries(byMonth).map(async ([ym, rows]) => {
        try {
          const monthKey = `ik17_${ym}`;
          const { data: existingMonth } = await getSystemConfig(monthKey);
          let monthData = Array.isArray(existingMonth) ? existingMonth : [];
          const newDates = new Set(rows.map(r => r.d));
          monthData = monthData.filter(r => !newDates.has(r.d));
          monthData = [...monthData, ...rows];
          await saveSystemConfig(monthKey, monthData);
        } catch (saveErr) {
          console.warn('Error saving IK17 month', ym, saveErr);
        }
      });
      await Promise.all(savePromises);

      _cacheIK17DB.current = { data: null, ts: 0 };
      alert(`Berhasil mengunggah file IK17 SAP! Terproses ${parsedRows.length} baris data pengukuran parent equipment (${newDatesSet.size} tanggal).`);
      loadMatrixData();
    } catch (err) {
      alert('Gagal mengunggah file IK17: ' + err.message);
    } finally {
      setIsUploadingIK17(false);
      if (e.target) e.target.value = '';
    }
  };

  const uniquePlants = useMemo(() => {
    return ['5F01', '5F04', '5F07', '5F08', '5F09', '5F14', '5F15', '5F21', '5F22'];
  }, []);

  const isLoadingRef = useRef(false);

  const loadMatrixData = async (forceRefreshMaster = false) => {
    if (isLoadingRef.current) return;
    isLoadingRef.current = true;
    setIsProcessing(true);
    try {
       const startDate = `${targetMonth}-01`;
       const endDate = format(endOfMonth(new Date(startDate)), 'yyyy-MM-dd');

        const normEq = (s) => String(s || '').replace(/^0+/, '').trim();
        const cleanDateStr = (raw) => {
          if (!raw) return '';
          let str = String(raw).trim();
          if (str.includes(' ')) str = str.split(' ')[0];
          if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
          const parts = str.split(/[\/\.\-]/);
          if (parts.length === 3) {
            let [p1, p2, p3] = parts;
            if (p3.length === 2) p3 = `20${p3}`;
            if (p1.length === 4) return `${p1}-${p2.padStart(2, '0')}-${p3.padStart(2, '0')}`;
            return `${p3.padStart(4, '20')}-${p2.padStart(2, '0')}-${p1.padStart(2, '0')}`;
          }
          return str;
        };

        if (forceRefreshMaster) {
          _cacheMasterEq.current    = null;
          _cacheMasterMap.current   = null;
          _cacheIK17Base.current    = null;
          _cacheIK17DB.current      = { data: null, ts: 0 };
          _cacheMonitoredEq.current = null;
        }

        setLoadingPhase('Mengambil data...');

        const logsPromise = (async () => {
          if (!supabase) return [];
          const logs = [];
          let from = 0;
          const PAGE_SIZE = 1000;
          let iterations = 0;
          while (iterations < 20) {
            iterations++;
            const { data, error } = await supabase
              .from(T_DAILY_LOGS)
              .select('plant, date, duration_minutes, induk_eq_num')
              .gte('date', startDate)
              .lte('date', endDate)
              .range(from, from + PAGE_SIZE - 1);
            if (error) throw error;
            if (data && data.length > 0) {
              logs.push(...data);
              if (data.length < PAGE_SIZE) break;
              from += data.length;
            } else break;
          }
          return logs;
        })();

        const monitoredEqPromise = (async () => {
          if (_cacheMonitoredEq.current) return _cacheMonitoredEq.current;
          if (!supabase) return [];
          const allEq = [];
          let eqFrom = 0;
          const EQ_PAGE = 1000;
          while (true) {
            const { data: eqPage, error: eqErr } = await supabase
              .from(T_DAILY_LOGS)
              .select('induk_eq_num, plant')
              .range(eqFrom, eqFrom + EQ_PAGE - 1);
            if (eqErr || !eqPage || eqPage.length === 0) break;
            allEq.push(...eqPage);
            if (eqPage.length < EQ_PAGE) break;
            eqFrom += eqPage.length;
          }
          _cacheMonitoredEq.current = allEq;
          return allEq;
        })();

        const masterEqPromise = (async () => {
          if (_cacheMasterEq.current) return _cacheMasterEq.current;
          try {
            const { data } = await fetchMasterEquipment();
            _cacheMasterEq.current = Array.isArray(data) ? data : [];
          } catch { _cacheMasterEq.current = []; }
          return _cacheMasterEq.current;
        })();

        const masterMapPromise = (async () => {
          if (_cacheMasterMap.current) return _cacheMasterMap.current;
          const { data } = await getSystemConfig('master_map');
          let entries = [];
          if (data) {
            entries = Array.isArray(data) ? data : (data.map && Array.isArray(data.map) ? data.map : []);
          }
          _cacheMasterMap.current = entries;
          return entries;
        })();

        const ik17BasePromise = (async () => {
          if (_cacheIK17Base.current) return _cacheIK17Base.current;
          try {
            const res = await fetch('/ik17_parsed_data.json');
            _cacheIK17Base.current = res.ok ? await res.json() : [];
          } catch { _cacheIK17Base.current = []; }
          return _cacheIK17Base.current;
        })();

        const ik17DbPromise = (async () => {
          const now = Date.now();
          if (_cacheIK17DB.current.data !== null && now - _cacheIK17DB.current.ts < 60000) {
            return _cacheIK17DB.current.data;
          }
          const monthKey = `ik17_${targetMonth}`;
          const { data: monthData } = await getSystemConfig(monthKey);
          const result = Array.isArray(monthData) ? monthData : [];
          if (result.length === 0) {
            const { data: legacyData } = await getSystemConfig('ik17_raw_data');
            const legacyResult = Array.isArray(legacyData) ? legacyData : [];
            _cacheIK17DB.current = { data: legacyResult, ts: now };
            return legacyResult;
          }
          _cacheIK17DB.current = { data: result, ts: now };
          return result;
        })();

        setLoadingPhase('Memuat data master & IK17...');

        const [allLogs, dbMasterEq, mmEntries, ik17BaseData, dbIK17, allTimeMonitored] = await Promise.all([
          logsPromise, masterEqPromise, masterMapPromise, ik17BasePromise, ik17DbPromise, monitoredEqPromise
        ]);

        setLoadingPhase('Memproses matrix...');
        setRawWebLogs(allLogs);

        const subKeywords = [
          'ACCESSORIES', 'ACCESSORY', 'ACC ', 'ACC_', 'ACC.',
          'PANEL', 'GEARBOX', 'GEAR BOX', 'G/BOX', 'PIPE', 'PIPING',
          'ELECTROMOTOR', 'ELECTRO MOTOR', 'ELMOT', 'EL. MOTOR', 'E/M',
          'HYDRAULIC', 'HIDROLIK', 'HPU', 'STRUCTURE', 'STRUKTUR',
          'BODY', 'WHEEL', 'RODA', 'CONTROLLERS', 'CONTROLLER', 'KONTROL',
          'AUTOMATIC', 'EXHAUST', 'VALVE', 'CHAIN', 'RANTAI', 'BEARING',
          'SHAFT', 'POROS', 'COUPLING', 'KOPLING', 'CHUTE', 'CORONG',
          'IMPELLER', 'NOZZLE', 'GAUGE', 'METER', 'SENSOR', 'SWITCH',
          'BREAKER', 'KABEL', 'CABLE', 'DUCTING', 'DUCT', 'SILENCER'
        ];
        const isSubDesc = (desc) => {
          if (!desc) return false;
          const u = String(desc).toUpperCase();
          return subKeywords.some(kw => u.includes(kw));
        };

        const eqToPlant  = new Map();
        const eqNameMap  = new Map();
        const parentEqSet = new Set();

        // 1. ALL-TIME monitored induk_eq_num from daily_logs
        allTimeMonitored.forEach(l => {
          if (l.induk_eq_num) {
            const e = String(l.induk_eq_num).trim();
            const eNorm = normEq(e);
            if (eNorm) {
              parentEqSet.add(e);
              parentEqSet.add(eNorm);
            }
          }
          if (l.induk_eq_num && l.plant) {
            const eNorm = normEq(l.induk_eq_num);
            const p = String(l.plant).toUpperCase().trim();
            eqToPlant.set(eNorm, p);
          }
        });

        allLogs.forEach(l => {
          if (l.induk_eq_num && l.plant) {
            const eNorm = normEq(l.induk_eq_num);
            const p = String(l.plant).toUpperCase().trim();
            eqToPlant.set(eNorm, p);
          }
        });

        // 2. From equipments prop
        if (Array.isArray(equipments)) {
          equipments.forEach(eq => {
            const eqNum = String(eq.eqNum || eq.eq_num || '').trim();
            if (!eqNum) return;
            const eqNumNorm = normEq(eqNum);
            const desc = eq.description || '';
            const eqType = eq.type || eq.eq_type;
            const isSub = eqType === 'Sub' || eqType === 'sub';
            if (!isSub) {
              parentEqSet.add(eqNum);
              parentEqSet.add(eqNumNorm);
            }
            if (desc) {
              eqNameMap.set(eqNum, `${desc} [${eqNumNorm}]`);
              eqNameMap.set(eqNumNorm, `${desc} [${eqNumNorm}]`);
            }
            if (eq.plant) eqToPlant.set(eqNumNorm, String(eq.plant).toUpperCase().trim());
          });
        }

        // 3. From master_map
        mmEntries.forEach(([eqNum, info]) => {
          if (!eqNum || !info) return;
          const eqNumStr  = String(eqNum).trim();
          const eqNumNorm = normEq(eqNumStr);
          const plant  = typeof info === 'string' ? info : (info.plant || '');
          const desc   = typeof info === 'string' ? eqNumStr : (info.description || eqNumStr);
          const parentName = typeof info === 'string' ? '' : (info.induk || '');
          const isParent = !parentName || desc.toUpperCase() === parentName.toUpperCase();
          if (isParent) {
            parentEqSet.add(eqNumStr);
            parentEqSet.add(eqNumNorm);
          }
          if (plant) { const p = String(plant).toUpperCase().trim(); eqToPlant.set(eqNumStr, p); eqToPlant.set(eqNumNorm, p); }
          eqNameMap.set(eqNumStr, `${desc} [${eqNumNorm}]`); eqNameMap.set(eqNumNorm, `${desc} [${eqNumNorm}]`);
        });

        // 4. From dbMasterEq
        dbMasterEq.forEach(eq => {
          const eqNum = String(eq.eq_num || eq.eqNum || '').trim();
          if (!eqNum) return;
          const eqNumNorm = normEq(eqNum);
          const plant = String(eq.plant || '').toUpperCase().trim();
          const desc = eq.description || eqNum;
          const parentName = (eq.induk || '').trim();
          const isParent = eq.eq_type !== 'Sub' && (!parentName || desc.toUpperCase() === parentName.toUpperCase());
          if (isParent) {
            parentEqSet.add(eqNum);
            parentEqSet.add(eqNumNorm);
          }
          if (plant) { eqToPlant.set(eqNum, plant); eqToPlant.set(eqNumNorm, plant); }
          eqNameMap.set(eqNum, `${desc} [${eqNumNorm}]`); eqNameMap.set(eqNumNorm, `${desc} [${eqNumNorm}]`);
        });

        const getPlantFromEq = (eStr, eNorm, textStr = '') => {
          if (eqToPlant.has(eNorm)) return eqToPlant.get(eNorm);
          if (eqToPlant.has(eStr)) return eqToPlant.get(eStr);
          const txtUpper = String(textStr || '').toUpperCase();
          for (const p of uniquePlants) { if (txtUpper.includes(p)) return p; }
          for (const p of uniquePlants) { if (eStr.includes(p) || eNorm.includes(p)) return p; }
          return 'Unknown';
        };

        let rawIK17 = ik17BaseData;
        if (dbIK17.length > 0) {
          const dbDates = new Set(dbIK17.map(r => cleanDateStr(r.d)).filter(Boolean));
          rawIK17 = rawIK17.filter(r => !dbDates.has(cleanDateStr(r.d)));
          rawIK17 = [...rawIK17, ...dbIK17];
        }

        const sapHmMap       = new Map();
        const sapSaldoAwalMap = new Map();

        if (Array.isArray(rawIK17)) {
          rawIK17.forEach(row => {
            const cleanD = cleanDateStr(row.d || '');
            if (cleanD >= startDate && cleanD <= endDate) {
              const eqStr = String(row.e || '').trim();
              const eqNorm = normEq(eqStr);

              // STRICT ONLY PARENT EQUIPMENT FILTER
              const isParent = parentEqSet.has(eqStr) || parentEqSet.has(eqNorm);
              if (!isParent) return;

              if (filterJenis && !eqStr.startsWith(filterJenis) && !eqNorm.startsWith(filterJenis)) return;
              const plant = getPlantFromEq(eqStr, eqNorm, row.t || '');
              if ((currentUser?.role === 'Unit' || currentUser?.role?.toUpperCase() === 'USER') && currentUser?.plant !== plant) return;

              const groupKey = groupBy === 'plant' ? plant : eqNorm;
              if (row.s) {
                sapSaldoAwalMap.set(groupKey, (sapSaldoAwalMap.get(groupKey) || 0) + (row.h || 0));
              } else {
                const key = `${groupKey}_${cleanD}`;
                sapHmMap.set(key, (sapHmMap.get(key) || 0) + (row.h || 0));
              }
            }
          });

          setLastUpdated('Data terakhir yang tersimpan di server');

          let matched = 0;
          const ik17DatesInMonth = [];
          rawIK17.forEach(r => {
            const e = String(r.e || '').trim();
            if (getPlantFromEq(e, normEq(e), r.t || '') !== 'Unknown') matched++;
            const cleanD = cleanDateStr(r.d || '');
            if (cleanD && cleanD >= startDate && cleanD <= endDate && !r.s) ik17DatesInMonth.push(cleanD);
          });
          ik17DatesInMonth.sort();
          const minDateStr = ik17DatesInMonth.length > 0 ? ik17DatesInMonth[0] : '-';
          const maxDateStr = ik17DatesInMonth.length > 0 ? ik17DatesInMonth[ik17DatesInMonth.length - 1] : '-';
          setDebugMsg(`Data SAP IK17: ${rawIK17.length} rows, tersedia: ${minDateStr} s/d ${maxDateStr}, ${matched} equipment tercocokkan dari ${eqToPlant.size} mapping.`);
        } else {
          setDebugMsg(`Data SAP IK17 belum tersedia atau format tidak valid.`);
        }
        setRawSapLogs(rawIK17 && Array.isArray(rawIK17) ? rawIK17 : []);

        const webHmMap = new Map();
        allLogs.forEach(log => {
           const eqStr = String(log.induk_eq_num || '').trim();
           const eqNorm = normEq(eqStr);

           const isParent = parentEqSet.has(eqStr) || parentEqSet.has(eqNorm);
           if (!isParent) return;

           if (filterJenis && !eqStr.startsWith(filterJenis) && !eqNorm.startsWith(filterJenis)) return;
           const hm = (log.duration_minutes || 0) / 60;
           const plant = getPlantFromEq(eqStr, eqNorm) || log.plant || 'Unknown';
           if ((currentUser?.role === 'Unit' || currentUser?.role?.toUpperCase() === 'USER') && currentUser?.plant !== plant) return;
           const groupKey = groupBy === 'plant' ? plant : eqNorm;
           if (!groupKey) return;
           const key = `${groupKey}_${log.date}`;
           webHmMap.set(key, (webHmMap.get(key) || 0) + hm);
        });

       const groupsToInclude = new Set([
         ...Array.from(sapHmMap.keys()).map(k => k.split('_')[0]),
         ...Array.from(webHmMap.keys()).map(k => k.split('_')[0])
       ]);
       if (groupBy === 'plant') {
          uniquePlants.forEach(p => {
              if ((currentUser?.role === 'Unit' || currentUser?.role?.toUpperCase() === 'USER') && currentUser?.plant !== p) return;
              groupsToInclude.add(p);
          });
       }

       const matrix = [];
       const daysInMonth = getDaysInMonth(new Date(startDate));

       groupsToInclude.forEach(groupKey => {
          const dates = {};
          let hasAnyData = false;
          const saldoAwal = sapSaldoAwalMap.get(groupKey) || 0;
          for (let i = 1; i <= daysInMonth; i++) {
             const d = `${targetMonth}-${String(i).padStart(2, '0')}`;
             const key = `${groupKey}_${d}`;
             const web = Math.round((webHmMap.get(key) || 0) * 100) / 100;
             const sap = Math.round((sapHmMap.get(key) || 0) * 100) / 100;
             dates[d] = { web, sap };
             if (web > 0 || sap > 0) hasAnyData = true;
          }
          if (hasAnyData || saldoAwal > 0 || groupBy === 'plant') {
             const groupName = groupBy === 'plant' ? groupKey : (eqNameMap.get(groupKey) || eqNameMap.get(normEq(groupKey)) || groupKey);
             const eqPlant = groupBy === 'plant' ? groupKey : (eqToPlant.get(groupKey) || eqToPlant.get(normEq(groupKey)) || 'Unknown');
             matrix.push({ groupName, dates, saldoAwal, plant: eqPlant, eqNum: groupKey });
          }
       });

       setMatrixData(matrix.sort((a, b) => a.groupName.localeCompare(b.groupName)));
       setLoadingPhase('');
    } catch (e) {
       console.error(e);
       alert("Gagal memuat data matrix: " + e.message);
    } finally {
       setIsProcessing(false);
       setLoadingPhase('');
       isLoadingRef.current = false;
    }
  };

  const eqCount = Array.isArray(equipments) ? equipments.length : 0;
  useEffect(() => {
    loadMatrixData();
  }, [targetMonth, eqCount, groupBy, filterJenis]);

  const daysInMonth = getDaysInMonth(new Date(`${targetMonth}-01`));
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  
  const showPlantCol = groupBy === 'equipment';
  const colPlantWidth = showPlantCol ? 60 : 0;

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
              {lastUpdated
                ? `Menggunakan data referensi SAP IK17 dari database. ${debugMsg}`
                : (loadingPhase || 'Memuat data...')}
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

            <input
              type="file"
              ref={ik17InputRef}
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleIK17Upload}
            />
            <button
              onClick={() => ik17InputRef.current?.click()}
              disabled={isProcessing || isUploadingIK17}
              title="Upload file IK17 dari SAP untuk sinkronisasi matrik verifikasi"
              className="bg-violet-600 hover:bg-violet-700 text-white px-3 py-2 sm:py-2.5 mt-5 sm:mt-0 rounded-2xl font-bold flex items-center justify-center transition-colors shadow-sm disabled:opacity-50 text-xs gap-1.5"
            >
              <Upload size={14} className={isUploadingIK17 ? 'animate-pulse' : ''} />
              {isUploadingIK17 ? 'Memproses IK17...' : 'Upload IK17'}
            </button>

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
                  {showPlantCol && (
                    <th style={{ width: colPlantWidth, minWidth: colPlantWidth, left: 0 }} className="text-center border border-slate-200 px-2 py-2.5 font-bold text-slate-600 bg-slate-50 sticky z-20 uppercase tracking-wider text-[10px]">
                      Plant
                    </th>
                  )}
                  <th style={{ width: col1Width, minWidth: col1Width, left: colPlantWidth }} className="text-center border border-slate-200 px-2 py-2.5 font-bold text-slate-600 bg-slate-50 sticky z-20 uppercase tracking-wider text-[10px]">
                    {groupBy === 'plant' ? 'Plant' : 'Equipment'}
                  </th>
                  <th style={{ width: col2Width, minWidth: col2Width, left: colPlantWidth + col1Width }} className="text-center border border-slate-200 px-2 py-2.5 font-bold text-slate-600 bg-slate-50 sticky z-20 uppercase tracking-wider text-[10px]">
                    Kategori
                  </th>
                  <th style={{ width: col3Width, minWidth: col3Width, left: colPlantWidth + col1Width + col2Width }} className="text-center border border-slate-200 px-2 py-2.5 font-bold text-slate-600 bg-slate-50 sticky z-20 uppercase tracking-wider text-[10px]">
                    Data
                  </th>
                  {daysArray.map(d => (
                    <th key={d} className="text-center border border-slate-200 px-2 py-2.5 font-bold text-slate-500 min-w-[30px] text-[10px]">{String(d).padStart(2, '0')}</th>
                  ))}
                  <th className="text-center border border-slate-200 px-2 py-2.5 font-bold text-[#064e3b] bg-emerald-50 min-w-[50px] text-[10px] uppercase tracking-wider">s.d {daysInMonth}</th>
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

                  // Determine last date with actual Web or SAP log entry for this row
                  let maxInputDay = 0;
                  for (let d = daysInMonth; d >= 1; d--) {
                     const dateKey = `${targetMonth}-${String(d).padStart(2, '0')}`;
                     const cell = row.dates[dateKey];
                     if (cell && (cell.web > 0 || cell.sap > 0)) {
                        maxInputDay = d;
                        break;
                     }
                  }

                  return (
                    <React.Fragment key={row.groupName}>
                      {/* --- Kategori: Per Tanggal --- */}
                      {/* Web */}
                      <tr className="border-t-[3px] border-slate-300">
                        {showPlantCol && (
                          <td rowSpan={6} style={{ width: colPlantWidth, minWidth: colPlantWidth, maxWidth: colPlantWidth, left: 0 }} className="border border-slate-200 px-2 py-1 font-bold text-slate-700 bg-slate-50 align-middle sticky z-10 text-center">
                            {row.plant}
                          </td>
                        )}
                        <td rowSpan={6} style={{ width: col1Width, minWidth: col1Width, maxWidth: col1Width, left: colPlantWidth }} className="border border-slate-200 px-2 py-1 font-bold text-slate-800 bg-slate-50 align-middle sticky z-10 whitespace-normal break-words text-left">
                          {row.groupName}
                        </td>
                        <td rowSpan={3} style={{ width: col2Width, minWidth: col2Width, left: colPlantWidth + col1Width }} className="border border-slate-200 px-2 py-1 text-slate-700 bg-slate-50 align-middle sticky z-10">
                          Per Tanggal
                        </td>
                        <td style={{ width: col3Width, minWidth: col3Width, left: colPlantWidth + col1Width + col2Width }} className="border border-slate-200 px-2 py-1 text-slate-600 font-medium text-left bg-white sticky z-10">
                          Web
                        </td>
                        {ptWeb.map((v, i) => <td key={i} className="border border-slate-200 px-1 py-1">{v || '-'}</td>)}
                        <td className="border border-slate-200 px-2 py-1 font-bold bg-emerald-50 text-emerald-900">{Math.round(cumWeb * 100) / 100}</td>
                      </tr>
                      {/* SAP */}
                      <tr>
                        <td style={{ width: col3Width, minWidth: col3Width, left: colPlantWidth + col1Width + col2Width }} className="border border-slate-200 px-2 py-1 text-slate-600 font-medium text-left bg-white sticky z-10">
                          SAP
                        </td>
                        {ptSap.map((v, i) => <td key={i} className="border border-slate-200 px-1 py-1">{v || '-'}</td>)}
                        <td className="border border-slate-200 px-2 py-1 font-bold bg-emerald-50 text-emerald-900">{Math.round(cumSap * 100) / 100}</td>
                      </tr>
                      {/* Selisih */}
                      <tr>
                        <td style={{ width: col3Width, minWidth: col3Width, left: colPlantWidth + col1Width + col2Width }} className="border border-slate-200 px-2 py-1 text-slate-600 font-bold text-left bg-slate-50 sticky z-10">
                          Selisih
                        </td>
                        {ptSelisih.map((v, i) => {
                          const dateKey = `${targetMonth}-${String(i + 1).padStart(2, '0')}`;
                          const isClickable = groupBy === 'plant' && v !== 0;
                          return (
                            <td 
                              key={i} 
                              onClick={() => {
                                if (isClickable) setDetailModal({ plant: row.groupKey || row.groupName, dateKey, selisihTotal: v });
                              }}
                              className={`border border-slate-200 px-1 py-1 font-black ${v > 0 ? 'bg-amber-50 text-amber-600 shadow-[inset_0_0_0_1px_rgba(217,119,6,0.2)]' : (v < 0 ? 'bg-rose-50 text-rose-600 shadow-[inset_0_0_0_1px_rgba(225,29,72,0.2)]' : 'text-slate-300 font-medium')} ${isClickable ? 'cursor-pointer hover:opacity-80 underline decoration-dashed underline-offset-2' : ''}`}
                            >
                              {v || 0}
                            </td>
                          );
                        })}
                        <td className={`border border-slate-200 px-2 py-1 font-black ${Math.round((cumWeb - cumSap) * 100) / 100 !== 0 ? 'bg-rose-100 text-rose-700 shadow-[inset_0_0_0_1px_rgba(225,29,72,0.3)]' : 'bg-emerald-50 text-slate-400'}`}>
                           {Math.round((cumWeb - cumSap) * 100) / 100}
                        </td>
                      </tr>

                      {/* --- Kategori: S.d Tanggal --- */}
                      {/* Web */}
                      <tr className="border-t-2 border-slate-200">
                        <td rowSpan={3} style={{ width: col2Width, minWidth: col2Width, left: colPlantWidth + col1Width }} className="border border-slate-200 px-2 py-1 text-slate-700 bg-slate-50 align-middle sticky z-10">
                          S.d Tanggal
                        </td>
                        <td style={{ width: col3Width, minWidth: col3Width, left: colPlantWidth + col1Width + col2Width }} className="border border-slate-200 px-2 py-1 text-slate-600 font-medium text-left bg-white sticky z-10">
                          Web
                        </td>
                        {sdWeb.map((v, i) => {
                          const day = i + 1;
                          const isPastMax = maxInputDay > 0 && day > maxInputDay;
                          return (
                            <td key={i} className="border border-slate-200 px-1 py-1 text-slate-500 bg-slate-50/50 font-mono">
                              {isPastMax || maxInputDay === 0 ? '-' : v}
                            </td>
                          );
                        })}
                        <td className="border border-slate-200 px-2 py-1 font-bold bg-emerald-100 text-[#064e3b] font-mono">{Math.round(cumWeb * 100) / 100}</td>
                      </tr>
                      {/* SAP */}
                      <tr>
                        <td style={{ width: col3Width, minWidth: col3Width, left: colPlantWidth + col1Width + col2Width }} className="border border-slate-200 px-2 py-1 text-slate-600 font-medium text-left bg-white sticky z-10">
                          SAP
                        </td>
                        {sdSap.map((v, i) => {
                          const day = i + 1;
                          const isPastMax = maxInputDay > 0 && day > maxInputDay;
                          return (
                            <td key={i} className="border border-slate-200 px-1 py-1 text-slate-500 bg-slate-50/50 font-mono">
                              {isPastMax || maxInputDay === 0 ? '-' : v}
                            </td>
                          );
                        })}
                        <td className="border border-slate-200 px-2 py-1 font-bold bg-emerald-100 text-[#064e3b] font-mono">{Math.round(cumSap * 100) / 100}</td>
                      </tr>
                      {/* Selisih */}
                      <tr>
                        <td style={{ width: col3Width, minWidth: col3Width, left: colPlantWidth + col1Width + col2Width }} className="border border-slate-200 px-2 py-1 text-slate-600 font-bold text-left bg-slate-50 sticky z-10">
                          Selisih
                        </td>
                        {sdSelisih.map((v, i) => {
                          const day = i + 1;
                          const isPastMax = maxInputDay > 0 && day > maxInputDay;
                          if (isPastMax || maxInputDay === 0) {
                            return (
                              <td key={i} className="border border-slate-200 px-1 py-1 text-slate-300 font-medium bg-slate-50/50">
                                -
                              </td>
                            );
                          }
                          return (
                            <td key={i} className={`border border-slate-200 px-1 py-1 font-black ${v > 0 ? 'bg-amber-50 text-amber-600 shadow-[inset_0_0_0_1px_rgba(217,119,6,0.2)]' : (v < 0 ? 'bg-rose-50 text-rose-600 shadow-[inset_0_0_0_1px_rgba(225,29,72,0.2)]' : 'text-slate-300 font-medium bg-slate-50/50')}`}>
                              {v || 0}
                            </td>
                          );
                        })}
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
                    <th className="text-center px-4 py-3 font-semibold text-slate-600 border-b bg-slate-50">No</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600 border-b bg-slate-50">Plant</th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600 border-b bg-slate-50">Equipment</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 border-b bg-slate-50 text-center">Web s.d (HM)</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 border-b bg-slate-50 text-center">SAP s.d (HM)</th>
                    <th className="px-4 py-3 font-semibold text-slate-600 border-b bg-slate-50 text-center">Selisih</th>
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
      
      {/* Detail Selisih Modal */}
      {detailModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh] border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
                  <List size={16} className="text-[#064e3b]" />
                  Detail Selisih Equipment (Plant {detailModal.plant})
                </h3>
                <p className="text-xs text-slate-400 font-medium mt-0.5">Tanggal: {detailModal.dateKey} | Total Selisih: {detailModal.selisihTotal}</p>
              </div>
              <button onClick={() => setDetailModal(null)} className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-2xl transition-colors"><X size={18}/></button>
            </div>
            <div className="p-0 overflow-auto flex-1">
              <table className="w-full text-sm text-left border-collapse">
                <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                  <tr>
                    <th className="text-center px-4 py-3 font-semibold text-slate-600 border-b bg-slate-50 w-12">No</th>
                    <th className="text-left px-4 py-3 font-semibold text-slate-600 border-b bg-slate-50">Equipment</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600 border-b bg-slate-50">Web (HM)</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600 border-b bg-slate-50">SAP (HM)</th>
                    <th className="text-right px-4 py-3 font-semibold text-slate-600 border-b bg-slate-50">Selisih</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {(() => {
                    const eqMap = new Map();
                    // map names
                    equipments.forEach(eq => {
                       if (eq.plant === detailModal.plant && eq.type === 'Induk') {
                          eqMap.set(eq.eqNum, { name: `${eq.description} [${eq.eqNum}]`, web: 0, sap: 0 });
                       }
                    });

                    // Aggregate web
                    rawWebLogs.forEach(log => {
                       if (log.plant === detailModal.plant && log.date === detailModal.dateKey && eqMap.has(log.induk_eq_num)) {
                          eqMap.get(log.induk_eq_num).web += (log.duration_minutes || 0) / 60;
                       }
                    });

                    // Aggregate SAP
                    rawSapLogs.forEach(row => {
                       if (row.d === detailModal.dateKey && eqMap.has(row.e)) {
                          eqMap.get(row.e).sap += (row.h || 0);
                       }
                    });

                    let counter = 1;
                    const rows = [];
                    eqMap.forEach((data, eqNum) => {
                       const web = Math.round(data.web * 100) / 100;
                       const sap = Math.round(data.sap * 100) / 100;
                       const diff = Math.round((web - sap) * 100) / 100;
                       
                       if (diff !== 0) {
                          rows.push(
                            <tr key={eqNum} className="hover:bg-slate-50">
                              <td className="px-4 py-2 text-center">{counter++}</td>
                              <td className="px-4 py-2 font-medium">{data.name}</td>
                              <td className="px-4 py-2 text-right">{web}</td>
                              <td className="px-4 py-2 text-right">{sap}</td>
                              <td className={`px-4 py-2 text-right font-bold ${diff > 0 ? 'text-amber-600' : 'text-rose-600'}`}>{diff}</td>
                            </tr>
                          );
                       }
                    });

                    if (rows.length === 0) {
                      return <tr><td colSpan="5" className="px-4 py-8 text-center text-slate-500">Tidak ada selisih detail di level equipment pada tanggal ini.</td></tr>;
                    }
                    return rows;
                  })()}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
