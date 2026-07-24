import React, { useState, useMemo, useEffect, useRef } from 'react';
import { format, startOfWeek, addDays, startOfMonth, endOfMonth, isSameDay, subMonths, addMonths } from 'date-fns';
import { id } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Filter, Search, Plus, Minus, X, Save, Clock, AlertTriangle, CheckCircle, ClipboardList, Download, FileDown, Trash2, Eye, Upload, History, Flag, Bot } from 'lucide-react';
import * as XLSX from 'xlsx';
import { exportDailyToSAP, exportCumulativeToSAP, exportAccumulatedToSAP, exportMonthlyToSAP } from '../utils/excel';
import { supabase } from '../lib/supabase';
import { insertDailyLog, insertDailyLogs, deleteDailyLog, fetchDailyLogs, saveGSheetHistory, getGSheetHistory, saveSystemConfig, getSystemConfig } from '../lib/supabaseService';

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

export default function DailyDashboard({ 
  equipments, 
  setEquipments,
  hierarchyData,
  currentUser,
  templateData,
  sapSyncedDates = [],
  setSapSyncedDates
}) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [logPlantFilter, setLogPlantFilter] = useState('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showForm, setShowForm] = useState(false);
  const [showMassForm, setShowMassForm] = useState(false);
  const [massPlantFilter, setMassPlantFilter] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [viewLog, setViewLog] = useState(null);
  const [uploadError, setUploadError] = useState(null);
  const [uploadPreview, setUploadPreview] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState('');
  // GSheet states
  const [showGSheetModal, setShowGSheetModal] = useState(false);
  const [googleSheetUrl, setGoogleSheetUrl] = useState('');
  const [selectedGSheetMonth, setSelectedGSheetMonth] = useState((new Date().getMonth() + 1).toString());
  const [selectedGSheetYear, setSelectedGSheetYear] = useState(new Date().getFullYear().toString());
  const [isFetchingSheet, setIsFetchingSheet] = useState(false);
  const [gsheetHistory, setGsheetHistory] = useState([]);
  // Smart sync states
  const [showSmartSyncModal, setShowSmartSyncModal] = useState(false);
  const [smartSyncResult, setSmartSyncResult] = useState(null); // { newRows, conflictRows, skipRows }
  const [conflictResolutions, setConflictResolutions] = useState({}); // { 'dateStr_eqNum': 'timpa'|'skip' }
  const [syncTab, setSyncTab] = useState('new'); // 'new'|'conflict'|'skip'
  const [isSyncing, setIsSyncing] = useState(false);
  const [massData, setMassData] = useState({});
  const [exportSettings, setExportSettings] = useState({ 
    time: '08:00', 
    readBy: currentUser?.role === 'Unit' ? currentUser.name : 'ADMIN',
    startDate: format(new Date(), 'yyyy-MM-dd'),
    endDate: format(new Date(), 'yyyy-MM-dd'),
    isAccumulated: false
  });
  const [selectedExportEqs, setSelectedExportEqs] = useState([]);
  const [selectedExportPlants, setSelectedExportPlants] = useState([]);
  const [exportEqSearch, setExportEqSearch] = useState('');
  const [indukSearch, setIndukSearch] = useState('');
  const [showIndukDropdown, setShowIndukDropdown] = useState(false);
  const indukDropdownRef = useRef(null);
  
  const ik17InputRef = useRef(null);
  const handleIK17Upload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploadingIK17(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        
        if (jsonData.length < 2) throw new Error("Format file IK17 tidak valid.");

        const headers = jsonData[0];
        let dateColIdx = headers.findIndex(h => typeof h === 'string' && h.includes('Date'));
        let eqColIdx = headers.findIndex(h => typeof h === 'string' && (h.includes('Equipment') || h.includes('Eq')));
        let diffColIdx = headers.findIndex(h => typeof h === 'string' && h.includes('Difference'));
        let textColIdx = headers.findIndex(h => typeof h === 'string' && h.includes('Text'));

        if (dateColIdx === -1) dateColIdx = 3; // fallback to column 3
        if (eqColIdx === -1) eqColIdx = 5;
        if (diffColIdx === -1) diffColIdx = 7;
        if (textColIdx === -1) textColIdx = 11;

        const dateSet = new Set(sapSyncedDates || []);
        let newDatesCount = 0;
        const newRawRows = [];

        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (row && row[dateColIdx]) {
            const serial = row[dateColIdx];
            if (typeof serial === 'number') {
              const parsed = XLSX.SSF.parse_date_code(serial);
              if (parsed) {
                const dateStr = `${parsed.y}-${String(parsed.m).padStart(2, '0')}-${String(parsed.d).padStart(2, '0')}`;
                
                // Add to calendar synced dates
                if (!dateSet.has(dateStr)) {
                  dateSet.add(dateStr);
                  newDatesCount++;
                }

                // Extract for SAP Verification
                const eq = String(row[eqColIdx] || '').trim();
                const diff = parseFloat(row[diffColIdx]) || 0;
                const text = String(row[textColIdx] || '').trim().toLowerCase();
                const isSaldoAwal = text.includes('ib sd') || text.includes('ib s.d') || text.includes('saldo awal');
                
                if (eq && diff > 0) {
                  newRawRows.push({ d: dateStr, e: eq, h: diff, s: isSaldoAwal });
                }
              }
            }
          }
        }

        const updatedDates = Array.from(dateSet).sort();
        setSapSyncedDates(updatedDates);
        
        if (supabase) {
          // 1. Save Calendar Dates
          await saveSystemConfig('sap_synced_dates', updatedDates);

          // 2. Merge and Save Raw IK17 Data
          const { data: existingRaw } = await getSystemConfig('ik17_raw_data');
          const rawMap = new Map();
          if (Array.isArray(existingRaw)) {
            existingRaw.forEach(r => rawMap.set(`${r.d}_${r.e}`, r));
          }
          newRawRows.forEach(r => rawMap.set(`${r.d}_${r.e}`, r));
          const mergedRaw = Array.from(rawMap.values());
          await saveSystemConfig('ik17_raw_data', mergedRaw);
        }

        alert(`Berhasil memproses IK17. Terdapat ${newDatesCount} tanggal baru yang disinkronisasi dengan SAP.`);
      } catch (err) {
        console.error(err);
        alert('Gagal memproses IK17: ' + err.message);
      }
      setIsUploadingIK17(false);
      e.target.value = ''; // reset input
    };
    reader.readAsArrayBuffer(file);
  };
  
  // dailyLogs: { 'yyyy-MM-dd': [ { id, indukEqNum, indukDesc, durationHours, durationMins, status, notes, damagedSubs: [] } ] }
  const [dailyLogs, setDailyLogs] = useState({});
  const [logsLoading, setLogsLoading] = useState(false);
  const [isUploadingIK17, setIsUploadingIK17] = useState(false);

  // Riwayat Alat State
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyEqId, setHistoryEqId] = useState('');
  const [historySearchEq, setHistorySearchEq] = useState('');
  const [showHistoryDropdown, setShowHistoryDropdown] = useState(false);
  const [historyData, setHistoryData] = useState([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(false);
  const historyDropdownRef = useRef(null);

  const fetchHistory = async (eqNum) => {
    setIsHistoryLoading(true);
    try {
      const { data, error } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('induk_eq_num', eqNum)
        .order('date', { ascending: true });
      if (error) throw error;
      
      let logs = data || [];
      let processed = [];

      let baseHm = 0;
      let baseDate = null;
      try {
        const { data: rawIk17 } = await getSystemConfig('ik17_raw_data');
        if (Array.isArray(rawIk17)) {
          const matchingRaw = rawIk17.filter(r => r.e === eqNum && r.s === true);
          if (matchingRaw.length > 0) {
            matchingRaw.sort((a, b) => b.d.localeCompare(a.d));
            baseHm = matchingRaw[0].h;
            baseDate = matchingRaw[0].d;
          }
        }
      } catch (e) {}

      if (baseDate) {
        processed = logs.map(log => {
           let hm = baseHm;
           if (log.date >= baseDate) {
              hm += logs.filter(l => l.date > baseDate && l.date <= log.date).reduce((acc, l) => acc + (l.duration_minutes/60), 0);
           } else {
              hm -= logs.filter(l => l.date > log.date && l.date <= baseDate).reduce((acc, l) => acc + (l.duration_minutes/60), 0);
           }
           return { ...log, cumulative_hm: hm };
        });
      } else {
        let running = 0;
        processed = logs.map(log => {
           running += (log.duration_minutes / 60);
           return { ...log, cumulative_hm: running };
        });
      }
      
      setHistoryData(processed.reverse());
    } catch (err) {
      console.error(err);
      alert('Gagal mengambil riwayat');
    } finally {
      setIsHistoryLoading(false);
    }
  };

  // Load logs from Supabase (or localStorage fallback) when component mounts or month changes
  // Close induk dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (indukDropdownRef.current && !indukDropdownRef.current.contains(e.target)) {
        setShowIndukDropdown(false);
        setIndukSearch('');
      }
      if (historyDropdownRef.current && !historyDropdownRef.current.contains(e.target)) {
        setShowHistoryDropdown(false);
        setHistorySearchEq('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const loadHistory = async () => {
      const { data } = await getGSheetHistory();
      if (data && data.length > 0) {
        // Filter out legacy string entries or entries without a valid label
        const cleanedData = data.filter(h => typeof h === 'object' && h !== null && h.label);
        setGsheetHistory(cleanedData);
        
        // Overwrite DB if we removed legacy entries
        if (cleanedData.length !== data.length) {
          saveGSheetHistory(cleanedData);
        }
      }
    };
    loadHistory();
  }, []);

  useEffect(() => {
    const loadLogs = async () => {
      setLogsLoading(true);
      try {
        if (supabase) {
          const yearMonth = format(currentMonth, 'yyyy-MM');
          const plant = currentUser?.role === 'Unit' ? currentUser.plant : null;
          const { data, error } = await fetchDailyLogs(plant, yearMonth);
          if (!error && data) {
            setDailyLogs(data);
          } else {
            if (error) console.error('Supabase fetch error:', error);
            const saved = localStorage.getItem(`sapApp_dailyLogs_${currentUser?.plant || 'ALL'}`);
            if (saved) setDailyLogs(JSON.parse(saved));
          }
        } else {
          // localStorage fallback
          const saved = localStorage.getItem(`sapApp_dailyLogs_${currentUser?.plant || 'ALL'}`);
          if (saved) setDailyLogs(JSON.parse(saved));
        }
      } catch (e) {
        console.error('Failed to load logs', e);
      } finally {
        setLogsLoading(false);
      }
    };
    loadLogs();
  }, [currentMonth, currentUser]);

  const saveDailyLogs = (newLogs) => {
    setDailyLogs(newLogs);
    // Always save to localStorage as local cache, but catch quota errors
    try {
      localStorage.setItem(`sapApp_dailyLogs_${currentUser?.plant || 'ALL'}`, JSON.stringify(newLogs));
    } catch (e) {
      console.warn("Could not save dailyLogs to localStorage (possibly exceeded quota):", e);
    }
  };

  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
  const todaysLogs = dailyLogs[selectedDateStr] || [];

  const [sortCol, setSortCol] = useState('plant');
  const [sortDir, setSortDir] = useState('asc');

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const filteredTodaysLogs = useMemo(() => {
    let logs = todaysLogs;
    if (logPlantFilter) {
      logs = logs.filter(l => l.plant === logPlantFilter);
    }
    // Dedupe: keep only latest entry per indukEqNum
    const seen = new Map();
    for (const log of logs) {
      const key = log.indukEqNum;
      if (!seen.has(key) || log.timestamp > seen.get(key).timestamp) {
        seen.set(key, log);
      }
    }
    logs = Array.from(seen.values());

    // Sort
    return logs.sort((a, b) => {
      let valA, valB;
      if (sortCol === 'plant') { valA = a.plant || ''; valB = b.plant || ''; }
      else if (sortCol === 'equipment') { valA = a.indukDesc || ''; valB = b.indukDesc || ''; }
      else if (sortCol === 'status') { valA = a.status || ''; valB = b.status || ''; }
      else if (sortCol === 'duration') { valA = a.durationMinutes || 0; valB = b.durationMinutes || 0; }
      else { valA = a.plant || ''; valB = b.plant || ''; }
      if (typeof valA === 'number') return sortDir === 'asc' ? valA - valB : valB - valA;
      return sortDir === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
    });
  }, [todaysLogs, logPlantFilter, sortCol, sortDir]);

  // Get only Induk equipments for the current plant
  const indukEquipments = useMemo(() => {
    return equipments.filter(eq => 
      eq.type === 'Induk' && 
      (currentUser?.role !== 'Unit' || eq.plant === currentUser?.plant)
    );
  }, [equipments, currentUser]);

  const filteredExportEqs = useMemo(() => {
    return indukEquipments.filter(eq => 
      (eq.description || '').toLowerCase().includes(exportEqSearch.toLowerCase()) || 
      (eq.eqNum || '').toLowerCase().includes(exportEqSearch.toLowerCase())
    );
  }, [indukEquipments, exportEqSearch]);

  // Unique plants from induk equipments (for Regional dropdown in mass form)
  const uniquePlants = useMemo(() => {
    const plants = new Set(indukEquipments.map(eq => eq.plant).filter(Boolean));
    return Array.from(plants).sort();
  }, [indukEquipments]);

  // Equipment filtered by plant selection in mass input modal
  const massIndukEquipments = useMemo(() => {
    if (currentUser?.role === 'Unit') return indukEquipments;
    if (!massPlantFilter) return indukEquipments;
    return indukEquipments.filter(eq => eq.plant === massPlantFilter);
  }, [indukEquipments, massPlantFilter, currentUser]);

  const [formData, setFormData] = useState({
    indukId: '',
    hours: 0,
    minutes: 0,
    status: 'Normal',
    notes: '',
    didRun: true,
    damagedSubs: []
  });

  // Derived state for the form
  const selectedInduk = useMemo(() => {
    return indukEquipments.find(eq => eq.eqNum === formData.indukId);
  }, [formData.indukId, indukEquipments]);

  // Get children of selected Induk
  const indukChildren = useMemo(() => {
    if (!selectedInduk) return [];
    return equipments.filter(eq => eq.induk === selectedInduk.description && eq.type !== 'Induk');
  }, [selectedInduk, equipments]);

  const handleSaveForm = async () => {
    if (!formData.indukId) {
      alert("Pilih Equipment Induk terlebih dahulu");
      return;
    }

    let totalDurationMinutes = (formData.hours * 60) + formData.minutes;
    
    // If damaged and didn't run, force 0
    if (formData.status === 'Rusak' && !formData.didRun) {
      totalDurationMinutes = 0;
    }

    const newLog = {
      id: Date.now().toString(),
      indukEqNum: selectedInduk.eqNum,
      indukDesc: selectedInduk.description,
      durationMinutes: totalDurationMinutes,
      status: formData.status,
      notes: formData.notes,
      didRun: formData.didRun,
      damagedSubs: formData.damagedSubs,
      timestamp: new Date().toISOString(),
      plant: selectedInduk.plant || currentUser?.plant
    };

    // Update Logs local state
    const updatedLogs = { ...dailyLogs };
    if (!updatedLogs[selectedDateStr]) updatedLogs[selectedDateStr] = [];
    updatedLogs[selectedDateStr].push(newLog);
    saveDailyLogs(updatedLogs);

    // Save to Supabase
    if (supabase) {
      const plant = selectedInduk.plant || currentUser?.plant;
      await insertDailyLog(plant, selectedDateStr, newLog);
    }

    // Update Equipments (Add duration to reading for Induk and all its children)
    if (totalDurationMinutes > 0) {
      const addedReading = totalDurationMinutes / 60; // Usually hour meter is in hours
      
      const updatedEquipments = equipments.map(eq => {
        // If this is the Induk or one of its children in the same plant
        if (eq.eqNum === selectedInduk.eqNum || (eq.induk === selectedInduk.description && eq.plant === selectedInduk.plant)) {
          const currentReading = parseFloat(eq.reading) || 0;
          return { ...eq, reading: (currentReading + addedReading).toFixed(2) };
        }
        return eq;
      });
      setEquipments(updatedEquipments);
    }

    setShowForm(false);
    // Reset form
    setFormData({
      indukId: '',
      hours: 0,
      minutes: 0,
      status: 'Normal',
      notes: '',
      didRun: true,
      damagedSubs: []
    });
  };

  const handleDeleteLog = async (log) => {
    if (!window.confirm(`Hapus jam jalan ${log.indukDesc}?`)) return;

    // Remove from local state
    const updatedLogs = { ...dailyLogs };
    if (updatedLogs[selectedDateStr]) {
      updatedLogs[selectedDateStr] = updatedLogs[selectedDateStr].filter(l => l.id !== log.id);
      saveDailyLogs(updatedLogs);
    }

    // Remove from Supabase
    if (supabase) {
      await deleteDailyLog(log.id);
    }

    // Reverse the reading update on Equipments
    if (log.durationMinutes > 0) {
      const removedReading = log.durationMinutes / 60;
      const logInduk = indukEquipments.find(e => e.eqNum === log.indukEqNum);
      const updatedEquipments = equipments.map(eq => {
        if (logInduk && (eq.eqNum === log.indukEqNum || (eq.induk === log.indukDesc && eq.plant === logInduk.plant))) {
          const currentReading = parseFloat(eq.reading) || 0;
          return { ...eq, reading: Math.max(0, currentReading - removedReading).toFixed(2) };
        }
        return eq;
      });
      setEquipments(updatedEquipments);
    }
  };

  const toggleDamagedSub = (eqNum) => {
    setFormData(prev => ({
      ...prev,
      damagedSubs: prev.damagedSubs.includes(eqNum)
        ? prev.damagedSubs.filter(id => id !== eqNum)
        : [...prev.damagedSubs, eqNum]
    }));
  };

  const handlePaste = (e, startIndex) => {
    e.preventDefault();
    const pasteText = e.clipboardData.getData('text');
    const rows = pasteText.split(/\r?\n/).filter(r => r.trim() !== '');
    
    const newMassData = { ...massData };
    for (let i = 0; i < rows.length; i++) {
      const eqIndex = startIndex + i;
      if (eqIndex >= massIndukEquipments.length) break;
      
      const eq = massIndukEquipments[eqIndex];
      let valStr = rows[i].trim().replace(',', '.');
      let val = parseFloat(valStr);
      
      if (!isNaN(val)) {
        if (val < 0) val = 0;
        if (val > 24) val = 24;
        
        // Round to nearest 0.5
        val = Math.round(val * 2) / 2;
        
        const h = Math.floor(val);
        const m = (val % 1) === 0.5 ? 30 : 0;
        const raw = (h + (m === 30 ? 0.5 : 0)).toString().replace('.', ',');
        newMassData[eq.eqNum] = { hours: h, minutes: m, raw };
      }
    }
    setMassData(newMassData);
  };

  const handleSaveMassForm = async () => {
    const updatedLogs = { ...dailyLogs };
    if (!updatedLogs[selectedDateStr]) updatedLogs[selectedDateStr] = [];
    
    let newEquipments = [...equipments];
    let logsAdded = 0;
    const logsToInsert = [];
    
    Object.entries(massData).forEach(([eqNum, data]) => {
      const totalDurationMinutes = (data.hours * 60) + data.minutes;
      if (totalDurationMinutes === 0) return; // Skip 0 inputs
      
      const induk = indukEquipments.find(e => e.eqNum === eqNum);
      if (!induk) return;
      
      const newLog = {
        id: Date.now().toString() + Math.random(),
        indukEqNum: induk.eqNum,
        indukDesc: induk.description,
        durationMinutes: totalDurationMinutes,
        status: 'Normal', // Default Normal
        notes: '',
        didRun: true,
        damagedSubs: [],
        timestamp: new Date().toISOString(),
        plant: induk.plant || currentUser?.plant // Attach plant for Supabase bulk insert
      };
      
      updatedLogs[selectedDateStr].push(newLog);
      logsToInsert.push(newLog);
      logsAdded++;
      
      const addedReading = totalDurationMinutes / 60;
      newEquipments = newEquipments.map(eq => {
        if (eq.eqNum === induk.eqNum || (eq.induk === induk.description && eq.plant === induk.plant)) {
          const currentReading = parseFloat(eq.reading) || 0;
          return { ...eq, reading: (currentReading + addedReading).toFixed(2) };
        }
        return eq;
      });
    });
    
    if (logsAdded > 0) {
      saveDailyLogs(updatedLogs);
      setEquipments(newEquipments);
      
      if (supabase) {
        // We pass '' as plant because logsToInsert have individual plants
        await insertDailyLogs('', selectedDateStr, logsToInsert);
      }
    }
    
    setShowMassForm(false);
    setMassData({});
  };

  const downloadMassTemplate = () => {
    const data = massIndukEquipments.map((eq, idx) => ({
      "No": idx + 1,
      "Equipment ID": eq.eqNum,
      "Nama Equipment Induk": eq.description,
      "Durasi Jam Jalan": ""
    }));
    
    const ws = XLSX.utils.json_to_sheet(data);
    const wscols = [{wch:5},{wch:15},{wch:40},{wch:20}];
    ws['!cols'] = wscols;
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_Masal");
    XLSX.writeFile(wb, `Template_Input_Masal_${currentUser?.plant || 'ALL'}.xlsx`);
  };

  // ---- Excel Bulk Upload ----
  const downloadUploadTemplate = () => {
    const sampleData = [
      { "Tanggal": "18-06-2026", "Kode Equipment Induk": "1000206812", "Durasi (Jam)": 1, "Status": "Normal", "Catatan": "" },
      { "Tanggal": "18-06-2026", "Kode Equipment Induk": "1000206813", "Durasi (Jam)": 2.5, "Status": "", "Catatan": "" },
    ];
    const ws = XLSX.utils.json_to_sheet(sampleData);
    ws['!cols'] = [{wch:14},{wch:22},{wch:14},{wch:10},{wch:30}];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template_Upload");
    XLSX.writeFile(wb, 'Template_Upload_Harian.xlsx');
  };

  const handleUploadExcelFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploadError(null);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

        if (rows.length === 0) { setUploadError('File Excel kosong.'); return; }

        const parsed = [];
        const errors = [];

        rows.forEach((row, idx) => {
          const lineNum = idx + 2;
          // Flexible header matching
          const tanggalRaw = row['Tanggal'] || row['tanggal'] || row['Date'] || '';
          const eqNumRaw  = (row['Kode Equipment Induk'] || row['Kode Equipment'] || row['Equipment ID'] || row['eqNum'] || '').toString().trim();
          const durasiRaw = row['Durasi (Jam)'] ?? row['Durasi'] ?? row['HM'] ?? row['Duration'] ?? '';
          const statusRaw = (row['Status'] || '').toString().trim();
          const catatanRaw = (row['Catatan'] || row['Notes'] || '').toString().trim();

          if (!tanggalRaw && !eqNumRaw) return; // skip blank rows

          // Parse date (accepts dd-MM-yyyy, dd/MM/yyyy, yyyy-MM-dd)
          let dateStr = '';
          const dStr = tanggalRaw.toString().trim();
          const dmyMatch = dStr.match(/^(\d{1,2})[\-\/](\d{1,2})[\-\/](\d{4})$/);
          const isoMatch = dStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
          if (dmyMatch) {
            dateStr = `${dmyMatch[3]}-${dmyMatch[2].padStart(2,'0')}-${dmyMatch[1].padStart(2,'0')}`;
          } else if (isoMatch) {
            dateStr = dStr;
          } else if (typeof tanggalRaw === 'number') {
            // Excel serial date
            const jsDate = XLSX.SSF.parse_date_code(tanggalRaw);
            dateStr = `${jsDate.y}-${String(jsDate.m).padStart(2,'0')}-${String(jsDate.d).padStart(2,'0')}`;
          } else {
            errors.push(`Baris ${lineNum}: Format tanggal tidak dikenali ("${dStr}"). Gunakan dd-MM-yyyy.`);
            return;
          }

          const durasi = parseFloat(String(durasiRaw).replace(',','.'));
          if (isNaN(durasi) || durasi < 0) {
            errors.push(`Baris ${lineNum}: Durasi tidak valid ("${durasiRaw}").`);
            return;
          }

          // Search as Induk first, then fallback to any equipment with that eqNum
          const induk = equipments.find(eq => eq.eqNum === eqNumRaw && eq.type === 'Induk')
                     || equipments.find(eq => eq.eqNum === eqNumRaw);
          if (!induk) {
            errors.push(`Baris ${lineNum}: Kode Equipment "${eqNumRaw}" tidak ditemukan di Master Data.`);
            return;
          }

          parsed.push({
            dateStr,
            indukEqNum: induk.eqNum,
            indukDesc: induk.description,
            plant: induk.plant,
            durationMinutes: Math.round(durasi * 60),
            status: statusRaw || 'Normal',
            notes: catatanRaw,
          });
        });

        if (errors.length > 0 && parsed.length === 0) {
          setUploadError(errors.join('\n'));
          return;
        }

        setUploadPreview({ rows: parsed, warnings: errors });
        setShowUploadModal(true);
      } catch (err) {
        setUploadError('Gagal membaca file: ' + err.message);
      }
    };
    reader.readAsBinaryString(file);
  };

  const analyzeSync = (parsedRows) => {
    const newRows = [];
    const conflictRows = [];
    const skipRows = [];

    parsedRows.forEach(row => {
      const existingLogs = dailyLogs[row.dateStr] || [];
      const existing = existingLogs.find(l => l.indukEqNum === row.indukEqNum);
      
      if (!existing) {
        newRows.push(row);
      } else {
        if (existing.durationMinutes === row.durationMinutes) {
          skipRows.push({ ...row, oldDuration: existing.durationMinutes });
        } else {
          conflictRows.push({ ...row, oldDuration: existing.durationMinutes });
        }
      }
    });

    setSmartSyncResult({ newRows, conflictRows, skipRows });
    
    // Default resolutions: pre-select 'timpa' for conflicts, up to user to change
    const defaultRes = {};
    conflictRows.forEach(row => {
      defaultRes[`${row.dateStr}_${row.indukEqNum}`] = 'timpa';
    });
    setConflictResolutions(defaultRes);
    setSyncTab('new');
  };

  const MONTH_NAMES = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

  // ---- Google Sheet Fetch ----
  const handleFetchGoogleSheet = async () => {
    if (!googleSheetUrl.trim()) return;
    
    const urlToSave = googleSheetUrl.trim();
    const labelToSave = `${MONTH_NAMES[parseInt(selectedGSheetMonth) - 1]} ${selectedGSheetYear}`;
    
    const existingUrlEntry = gsheetHistory.find(h => h.url === urlToSave);
    const existingLabelEntry = gsheetHistory.find(h => h.label === labelToSave);

    if (existingUrlEntry && existingUrlEntry.label !== labelToSave) {
      if (!window.confirm(`Link ini sudah dipakai untuk bulan ${existingUrlEntry.label}. Apakah Anda yakin ingin menggunakannya lagi untuk bulan ${labelToSave}?`)) {
        return;
      }
    }

    if (existingLabelEntry && existingLabelEntry.url !== urlToSave) {
      if (!window.confirm(`Data Google Sheet untuk bulan ${labelToSave} sudah pernah disimpan sebelumnya dengan link berbeda. Apakah Anda ingin menimpanya?`)) {
        return;
      }
    }

    setIsFetchingSheet(true);
    setUploadError(null);
    try {
      const response = await fetch(googleSheetUrl.trim());
      if (!response.ok) throw new Error(`HTTP ${response.status}: Gagal mengambil data`);
      const csvText = await response.text();

      const lines = csvText.split('\n').map(l => l.trimEnd()).filter(l => l.trim());
      if (lines.length < 2) throw new Error('Data kosong atau hanya header');

      // Parse header row
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, '').toLowerCase());
      const tanggalIdx  = headers.findIndex(h => h.includes('tanggal') || h.includes('date'));
      const plantIdx    = headers.findIndex(h => h.includes('plant'));
      const eqIdx       = headers.findIndex(h => h.includes('equipment') || h.includes('kode'));
      const descIdx     = headers.findIndex(h => h.includes('desc') || h.includes('deskripsi'));
      const jamIdx      = headers.findIndex(h => h.includes('jam') || h.includes('durasi') || h.includes('hour'));

      if (tanggalIdx < 0 || eqIdx < 0 || jamIdx < 0)
        throw new Error('Kolom wajib tidak ditemukan. Pastikan ada kolom: Tanggal, Equipment, Jam');

      const parsed = [];
      const errors = [];

      for (let i = 1; i < lines.length; i++) {
        // Split CSV handling quoted fields
        const cols = [];
        let cur = '', inQuote = false;
        for (const ch of lines[i]) {
          if (ch === '"') { inQuote = !inQuote; }
          else if (ch === ',' && !inQuote) { cols.push(cur.trim()); cur = ''; }
          else cur += ch;
        }
        cols.push(cur.trim());

        const tanggalRaw = (cols[tanggalIdx] || '').replace(/^"|"$/g, '').trim();
        const eqNumRaw   = (cols[eqIdx]      || '').replace(/^"|"$/g, '').trim();
        const jamRaw     = (cols[jamIdx]      || '').replace(/^"|"$/g, '').trim();
        const plantRaw   = plantIdx >= 0 ? (cols[plantIdx] || '').replace(/^"|"$/g, '').trim() : '';
        const descRaw    = descIdx >= 0  ? (cols[descIdx]  || '').replace(/^"|"$/g, '').trim() : '';

        if (!tanggalRaw && !eqNumRaw) continue;

        // Parse date: accepts DD-MM-YYYY, DD/MM/YYYY, YYYY-MM-DD
        let dateStr = '';
        const dmyMatch = tanggalRaw.match(/^(\d{1,2})[\-\/](\d{1,2})[\-\/](\d{4})$/);
        const isoMatch = tanggalRaw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (dmyMatch) {
          dateStr = `${dmyMatch[3]}-${dmyMatch[2].padStart(2,'0')}-${dmyMatch[1].padStart(2,'0')}`;
        } else if (isoMatch) {
          dateStr = tanggalRaw;
        } else {
          errors.push(`Baris ${i+1}: Format tanggal tidak dikenali ("${tanggalRaw}")`);
          continue;
        }

        const jam = parseFloat(jamRaw.replace(',', '.'));
        if (isNaN(jam) || jam < 0) {
          errors.push(`Baris ${i+1}: Nilai Jam tidak valid ("${jamRaw}")`);
          continue;
        }

        const induk = equipments.find(eq => eq.eqNum === eqNumRaw && eq.type === 'Induk')
                   || equipments.find(eq => eq.eqNum === eqNumRaw);
        if (!induk) {
          errors.push(`Baris ${i+1}: Equipment "${eqNumRaw}" tidak ditemukan di Master Data`);
          continue;
        }

        parsed.push({
          dateStr,
          indukEqNum: induk.eqNum,
          indukDesc: induk.description || descRaw,
          plant: induk.plant || plantRaw,
          durationMinutes: Math.round(jam * 60),
          status: 'Normal',
          notes: '',
        });
      }

      if (errors.length > 0 && parsed.length === 0) {
        setUploadError(errors.join('\n'));
        setIsFetchingSheet(false);
        return;
      }

      // Validate that all dates match the currently active calendar month
      const activeMonthStr = format(currentMonth, 'yyyy-MM');
      const mismatchedDates = parsed.filter(p => !p.dateStr.startsWith(activeMonthStr));
      if (mismatchedDates.length > 0) {
        setUploadError(`⛔ GAGAL IMPORT: Data Google Sheet berisi tanggal dari bulan lain (contoh: ${mismatchedDates[0].dateStr}).\n\nKalender aplikasi saat ini berada di bulan ${format(currentMonth, 'MMMM yyyy', { locale: id })}.\nSilakan tutup jendela ini, lalu geser kalender utama ke bulan yang sesuai dengan data Google Sheet, baru ulangi proses import.`);
        setIsFetchingSheet(false);
        return;
      }

      // Save History
      const newEntry = {
        id: Date.now().toString(),
        url: urlToSave,
        label: labelToSave,
        addedAt: new Date().toISOString()
      };
      
      const newHistory = [newEntry, ...gsheetHistory.filter(h => h.label !== labelToSave)].slice(0, 10);
      
      setGsheetHistory(newHistory);
      saveGSheetHistory(newHistory);

      analyzeSync(parsed);
      setShowGSheetModal(false);
      setShowSmartSyncModal(true);
    } catch (err) {
      setUploadError('Gagal: ' + err.message);
    }
    setIsFetchingSheet(false);
  };

  const processImport = async (rows) => {
    setIsImporting(true);
    setImportProgress('Mempersiapkan data...');
    try {
      const updatedLogs = { ...dailyLogs };
      let newEquipments = [...equipments];
      const supabaseLogs = [];

      rows.forEach(row => {
        const { dateStr, durationMinutes, ...rest } = row;
        const newLog = {
          id: Date.now().toString() + Math.random(),
          ...rest,
          durationMinutes,
          didRun: durationMinutes > 0,
          damagedSubs: [],
          timestamp: new Date().toISOString(),
        };

        if (!updatedLogs[dateStr]) updatedLogs[dateStr] = [];
        // Remove old log for same equipment on same date (prevent local duplicate)
        updatedLogs[dateStr] = updatedLogs[dateStr].filter(l => l.indukEqNum !== newLog.indukEqNum);
        updatedLogs[dateStr].push(newLog);
        supabaseLogs.push({ ...newLog, dateStr });

        if (durationMinutes > 0) {
          const addedReading = durationMinutes / 60;
          newEquipments = newEquipments.map(eq => {
            if (eq.eqNum === row.indukEqNum || (eq.induk === row.indukDesc && eq.plant === row.plant)) {
              const cur = parseFloat(eq.reading) || 0;
              return { ...eq, reading: (cur + addedReading).toFixed(2) };
            }
            return eq;
          });
        }
      });

      saveDailyLogs(updatedLogs);
      setEquipments(newEquipments);

      if (supabase) {
        const byDate = {};
        supabaseLogs.forEach(l => {
          if (!byDate[l.dateStr]) byDate[l.dateStr] = [];
          byDate[l.dateStr].push(l);
        });
        let hasError = false;
        let processed = 0;
        const total = Object.keys(byDate).length;
        for (const [dateStr, logs] of Object.entries(byDate)) {
          processed++;
          setImportProgress(`Menyimpan ${processed}/${total} tanggal...`);
          // Delete existing rows for same date+equipment to prevent duplicates
          const eqNums = [...new Set(logs.map(l => l.indukEqNum))];
          if (eqNums.length > 0) {
            // Process deletes in chunks of 50 to avoid URI too long errors in PostgREST
            const chunkSize = 50;
            for (let i = 0; i < eqNums.length; i += chunkSize) {
              const chunk = eqNums.slice(i, i + chunkSize);
              // Use .or() instead of .in() to avoid any potential minifier issues with the 'in' keyword
              const orQuery = chunk.map(num => `induk_eq_num.eq.${num}`).join(',');
              const { error: delErr } = await supabase
                .from('daily_logs')
                .delete()
                .eq('date', dateStr)
                .or(orQuery);
              if (delErr) {
                 console.error("Supabase delete error:", delErr);
              }
            }
          }
          const { error } = await insertDailyLogs('', dateStr, logs);
          if (error) {
            hasError = true;
            console.error("Supabase insert error:", error);
            alert("Gagal menyimpan ke database tanggal " + dateStr + ": " + error.message);
          }
        }
        if (hasError) {
          setIsImporting(false);
          setIsSyncing(false);
          return;
        }
      }

      setIsImporting(false);
      setIsSyncing(false);
      setShowUploadModal(false);
      setShowSmartSyncModal(false);
      setUploadPreview(null);
      setSmartSyncResult(null);
      alert(`✅ ${rows.length} data berhasil diupload!`);
    } catch (err) {
      console.error("Unhandled error in processImport:", err);
      // Ensure we can see the stack trace if it still throws
      alert(`Terjadi kesalahan saat memproses data:\n${err.message}\n\nStack:\n${err.stack}`);
      setIsImporting(false);
      setIsSyncing(false);
    }
  };

  const handleConfirmUpload = async () => {
    if (!uploadPreview) return;
    await processImport(uploadPreview.rows);
  };

  const handleConfirmSmartSync = async () => {
    if (!smartSyncResult) return;
    setIsSyncing(true);
    const rowsToImport = [...smartSyncResult.newRows];
    smartSyncResult.conflictRows.forEach(row => {
      const key = `${row.dateStr}_${row.indukEqNum}`;
      if (conflictResolutions[key] === 'timpa') {
        rowsToImport.push(row);
      }
    });

    if (rowsToImport.length === 0) {
      alert("Tidak ada data baru atau data yang dipilih untuk diimport.");
      setShowSmartSyncModal(false);
      return;
    }
    
    await processImport(rowsToImport);
  };

  // Fix old logs with empty plant by looking up equipment
  const handleFixOldPlants = async () => {
    if (!supabase) return;
    if (!window.confirm('Perbaiki semua data lama yang plantnya kosong? Proses ini otomatis mengisi plant berdasarkan nomor equipment.')) return;
    
    const { data: allLogs, error } = await supabase
      .from('daily_logs')
      .select('id, induk_eq_num, plant')
      .or('plant.is.null,plant.eq.');
    
    if (error || !allLogs?.length) {
      alert(allLogs?.length === 0 ? '✅ Tidak ada data dengan plant kosong!' : '❌ Gagal mengambil data: ' + error?.message);
      return;
    }

    let fixed = 0;
    for (const log of allLogs) {
      const eq = equipments.find(e => e.eqNum === log.induk_eq_num);
      if (eq?.plant) {
        await supabase.from('daily_logs').update({ plant: eq.plant }).eq('id', log.id);
        fixed++;
      }
    }
    alert(`✅ ${fixed} dari ${allLogs.length} data berhasil diperbaiki plantnya! Halaman akan dimuat ulang.`);
    window.location.reload();
  };

  // Calendar rendering logic
  const renderCalendar = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    
    const days = [];
    let day = startDate;
    let formattedDate = '';

    for (let i = 0; i < 42; i++) {
      const cloneDay = day;
      const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
      const isSelected = isSameDay(day, selectedDate);
      const dayStr = format(cloneDay, 'yyyy-MM-dd');
      const hasLogs = dailyLogs[dayStr] && dailyLogs[dayStr].length > 0;

      days.push(
        <div
          key={dayStr}
          onClick={() => setSelectedDate(cloneDay)}
          className={`relative p-2 flex items-center justify-center cursor-pointer text-sm font-semibold transition-colors duration-300 rounded-full h-10 w-10 mx-auto
            ${!isCurrentMonth ? 'text-slate-300' : 'text-slate-700'}
            ${isSelected ? 'bg-gradient-to-tr from-[#064e3b] to-[#2dd4bf] text-white shadow-md shadow-emerald-900/20 scale-110' : 'hover:bg-emerald-50 hover:text-[#064e3b] hover:scale-105'}
          `}
        >
          {format(day, 'd')}
          {sapSyncedDates?.includes(dayStr) ? (
            <span className={`absolute bottom-0.5 ${isSelected ? 'text-white' : 'text-emerald-500'}`}>
               <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
            </span>
          ) : (hasLogs && !isSelected && (
            <span className="absolute bottom-1 w-1.5 h-1.5 bg-green-500 rounded-full"></span>
          ))}
        </div>
      );
      day = addDays(day, 1);
    }

    return (
      <div className="bg-white rounded-2xl shadow-lg shadow-emerald-900/5 border border-slate-100 p-5 w-full max-w-sm transition-colors duration-300 hover:shadow-xl hover:border-emerald-100 group">
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 hover:bg-slate-100 rounded">
            <ChevronLeft size={20} className="text-slate-600" />
          </button>
          <span className="font-bold text-slate-800">{format(currentMonth, 'MMMM yyyy', { locale: id })}</span>
          <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 hover:bg-slate-100 rounded">
            <ChevronRight size={20} className="text-slate-600" />
          </button>
        </div>
        <div className="grid grid-cols-7 mb-2">
          {['Min','Sen','Sel','Rab','Kam','Jum','Sab'].map(d => (
            <div key={d} className="text-center text-xs font-semibold text-slate-400">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-y-2">
          {days}
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-full w-full bg-slate-50 p-5 gap-5 overflow-hidden">
      
      {/* Left Panel: Calendar */}
      <div className="flex-none w-80 flex flex-col gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-3 flex items-center gap-2.5 shadow-sm">
          <Search size={16} className="text-slate-400 flex-shrink-0" />
          <input type="text" placeholder="Cari Log..." className="w-full text-xs outline-none bg-transparent placeholder-slate-400 text-slate-700 font-medium" />
          <Filter size={16} className="text-slate-400 cursor-pointer hover:text-[#064e3b] flex-shrink-0" />
        </div>
        {renderCalendar()}
      </div>

      {/* Right Panel: Data Table */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-100 flex flex-col overflow-hidden shadow-lg shadow-emerald-900/5">
        <div className="px-6 py-4 border-b border-emerald-100/50 flex justify-between items-center bg-[#fafafa] sticky top-0 z-20 flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-base font-black text-slate-800 tracking-tight">Riwayat Input Jam Jalan</h2>
              <p className="text-xs text-emerald-600 font-semibold">{format(selectedDate, 'EEEE, dd MMMM yyyy', { locale: id })}</p>
            </div>
            {currentUser?.role !== 'Unit' && (
              <select
                value={logPlantFilter}
                onChange={(e) => setLogPlantFilter(e.target.value)}
                className="px-3 py-1.5 border border-slate-200 rounded-xl text-xs text-slate-700 font-bold focus:ring-2 focus:ring-[#064e3b]/20 focus:border-[#064e3b] focus:outline-none bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <option value="">Semua Plant</option>
                {uniquePlants.map(p => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            )}
          </div>
          <div className="flex items-center gap-2 flex-nowrap overflow-x-auto pb-1 sm:pb-0">
            {/* Regional-only: Template download & bulk upload */}
            {currentUser?.role !== 'Unit' && (
              <>
                <input
                  type="file"
                  id="daily-upload-input"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleUploadExcelFile}
                />
                <button
                  onClick={downloadUploadTemplate}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 px-2.5 py-1.5 rounded-2xl font-semibold flex items-center gap-1.5 transition-colors text-xs whitespace-nowrap"
                  title="Download Template Upload"
                >
                  <Download size={13} /> Template
                </button>
                <button
                  onClick={() => document.getElementById('daily-upload-input').click()}
                  className="bg-violet-600 hover:bg-violet-700 text-white px-2.5 py-1.5 rounded-2xl font-semibold flex items-center gap-1.5 transition-colors text-xs whitespace-nowrap shadow-sm"
                >
                  <Upload size={13} /> Upload
                </button>
                <button
                  onClick={() => { setUploadError(null); setShowGSheetModal(true); }}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1.5 rounded-2xl font-semibold flex items-center gap-1.5 transition-colors text-xs whitespace-nowrap shadow-sm"
                  title="Import dari Google Sheet"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M19.77 4.93l1.3 1.3L8.44 18.86l-5.44-5.37 1.29-1.31 4.15 4.09L19.77 4.93m0-2.82L8.44 13.44l-4.15-4.09L0 13.63 8.44 22 24 6.37 19.77 2.11z"/></svg>
                  GSheet
                </button>
                <button
                  onClick={handleFixOldPlants}
                  className="bg-amber-500 hover:bg-amber-600 text-white px-2.5 py-1.5 rounded-2xl font-semibold flex items-center gap-1.5 transition-colors text-xs whitespace-nowrap shadow-sm"
                  title="Perbaiki data lama yang plant-nya kosong"
                >
                  <CheckCircle size={13} /> Perbaiki Plant
                </button>
              </>
            )}
            <button 
              onClick={() => setShowHistoryModal(true)}
              className="bg-sky-600 hover:bg-sky-700 text-white px-2.5 py-1.5 rounded-2xl font-semibold flex items-center gap-1.5 transition-colors text-xs whitespace-nowrap shadow-sm"
            >
              <History size={13} /> Riwayat Alat
            </button>
            <button 
              onClick={() => {
                setExportSettings(prev => ({ ...prev, time: '08:00' }));
                setShowExportModal(true);
              }}
              className="bg-[#0f172a] hover:bg-slate-700 text-white px-2.5 py-1.5 rounded-2xl font-semibold flex items-center gap-1.5 transition-colors text-xs whitespace-nowrap shadow-sm"
            >
              <FileDown size={13} /> Export SAP
            </button>
            <input
              type="file"
              ref={ik17InputRef}
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleIK17Upload}
            />
            <button
              onClick={() => ik17InputRef.current.click()}
              disabled={isUploadingIK17}
              className={`${isUploadingIK17 ? 'bg-slate-500 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'} text-white px-3 py-1.5 rounded-2xl font-medium flex items-center gap-1.5 transition-colors text-xs whitespace-nowrap`}
              title="Upload file IK17 dari SAP untuk sinkronisasi kalender"
            >
              <CheckCircle size={14} className={isUploadingIK17 ? 'animate-pulse' : ''} /> 
              {isUploadingIK17 ? 'Memproses...' : 'Verif IK17'}
            </button>
            <button 
              onClick={() => setShowMassForm(true)}
              className="bg-[#064e3b] hover:bg-[#065f46] text-white px-2.5 py-1.5 rounded-2xl font-semibold flex items-center gap-1.5 transition-colors text-xs whitespace-nowrap shadow-sm"
            >
              <ClipboardList size={13} /> Input Masal
            </button>
            <button 
              onClick={() => setShowForm(true)}
              className="bg-[#064e3b] hover:bg-[#065f46] text-white px-2.5 py-1.5 rounded-2xl font-semibold flex items-center gap-1.5 transition-colors text-xs whitespace-nowrap shadow-sm border border-[#064e3b]/30"
            >
              <Plus size={13} /> Input Baru
            </button>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto bg-slate-50/30">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-white/90 sticky top-0 border-b border-slate-100 z-10">
              <tr>
                {[['Tanggal',''], ['Plant','plant'], ['Equipment Induk','equipment'], ['Status','status'], ['Durasi','duration'], ['Catatan',''], ['Aksi','']].map(([label, col]) => (
                  <th
                    key={label}
                    onClick={() => col && handleSort(col)}
                    className={`px-4 py-3 font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap select-none ${
                      col ? 'cursor-pointer hover:text-slate-700 transition-colors' : ''
                    } ${label === 'Aksi' ? 'text-right' : ''}`}
                  >
                    <span className={`flex items-center gap-1 ${label === 'Aksi' ? 'justify-end' : ''}`}>
                      {label}
                      {col && sortCol === col && (
                        <span className="text-[#064e3b] text-[10px]">{sortDir === 'asc' ? '▲' : '▼'}</span>
                      )}
                      {col && sortCol !== col && <span className="text-slate-300 text-[10px]">⇅</span>}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
              <tbody className="divide-y divide-slate-100">
              {filteredTodaysLogs.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-24 text-center bg-slate-50/20">
                    <div className="max-w-md mx-auto space-y-5">
                      <div className="w-16 h-16 bg-[#064e3b]/10 rounded-2xl flex items-center justify-center mx-auto shadow-sm border border-[#064e3b]/20 text-[#064e3b]">
                        <CalendarIcon size={32} />
                      </div>
                      <div>
                        <h4 className="text-base font-black text-slate-800 tracking-tight">Belum Ada Logbook Hari Ini</h4>
                        <p className="text-xs text-slate-500 mt-2 max-w-xs mx-auto leading-relaxed font-medium">
                          Tidak ada data input logbook mesin pabrik tercatat untuk tanggal {format(new Date(selectedDate), 'dd MMMM yyyy', { locale: id })}. Silakan mulai dengan salah satu aksi di bawah ini.
                        </p>
                      </div>
                      <div className="flex justify-center gap-3 pt-2">
                        <button 
                          onClick={() => document.getElementById('daily-upload-input').click()} 
                          className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-2"
                        >
                          <Upload size={14} className="text-slate-400" /> Impor Excel Logbook
                        </button>
                        <button 
                          onClick={() => setShowForm(true)} 
                          className="bg-[#064e3b] hover:bg-[#065f46] text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm transition-colors flex items-center gap-2"
                        >
                          <Plus size={14} /> Input Baru
                        </button>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredTodaysLogs.map((log) => (
                  <tr key={log.id} className="group hover:bg-white bg-slate-50/50 border-b border-slate-100 hover:shadow-[0_2px_8px_rgb(15,118,110,0.06)]  transition-colors duration-200 last:border-0">
                    <td className="px-5 py-3.5 font-mono text-slate-500 font-medium">{format(new Date(selectedDate), 'dd/MM/yyyy')}</td>
                    <td className="px-5 py-3.5">
                      <span className="bg-slate-100/80 text-slate-600 px-2.5 py-1 rounded-xl text-[10px] font-bold border border-slate-200 font-mono tracking-widest group-hover:border-emerald-200 group-hover:text-emerald-700 group-hover:bg-emerald-50 transition-colors">
                        {log.plant || '-'}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-bold text-slate-700 max-w-[200px] truncate" title={log.indukDesc}>{log.indukDesc}</td>
                    <td className="px-5 py-3.5">
                      <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black inline-flex items-center gap-1.5 uppercase tracking-wider ${log.status === 'Normal' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-rose-50 text-rose-600 border border-rose-100 shadow-sm shadow-rose-900/5'}`}>
                        {log.status === 'Normal' ? <CheckCircle size={12}/> : <AlertTriangle size={12}/>}
                        {log.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 font-mono font-black text-slate-700 group-hover:text-[#064e3b] transition-colors">{Math.floor(log.durationMinutes / 60)}h {String(log.durationMinutes % 60).padStart(2, '0')}m</td>
                    <td className="px-4 py-2.5 text-slate-500 max-w-[160px] truncate text-[11px]" title={log.notes}>{log.notes || <span className="text-slate-400">—</span>}</td>
                    <td className="px-4 py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button 
                          onClick={() => setViewLog(log)}
                          className="text-slate-400 hover:text-[#064e3b] p-1.5 hover:bg-emerald-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                          title="Lihat Detail"
                        >
                          <Eye size={14} />
                        </button>
                        <button 
                          onClick={() => handleDeleteLog(log)}
                          className="text-slate-400 hover:text-red-600 p-1.5 hover:bg-red-50 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500/20"
                          title="Hapus"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-slate-800 text-white p-4 rounded-t-2xl flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">INPUT JAM JALAN HARIAN</h3>
                <p className="text-xs text-slate-300">{format(selectedDate, 'dd/MM/yyyy')} • {currentUser?.plant}</p>
              </div>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-white p-1.5 rounded-full bg-slate-700/50 hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400">
                <X size={20} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              
              {/* Equipment Searchable Dropdown */}
              <div ref={indukDropdownRef} className="relative">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Pilih Equipment Induk</label>
                <div
                  className="w-full border border-slate-300 rounded-2xl bg-slate-50 text-sm focus-within:ring-2 focus-within:ring-emerald-500 flex items-center gap-2 px-2.5"
                  onClick={() => setShowIndukDropdown(true)}
                >
                  <Search size={14} className="text-slate-400 flex-none" />
                  <input
                    type="text"
                    className="flex-1 py-2.5 bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
                    placeholder={formData.indukId ? indukEquipments.find(e => e.eqNum === formData.indukId)?.description || '-- Pilih Equipment --' : 'Ketik nama alat...'}
                    value={indukSearch}
                    onChange={e => { setIndukSearch(e.target.value); setShowIndukDropdown(true); }}
                    onFocus={() => setShowIndukDropdown(true)}
                  />
                  {formData.indukId && (
                    <button type="button" onClick={e => { e.stopPropagation(); setFormData({...formData, indukId: ''}); setIndukSearch(''); }} className="text-slate-400 hover:text-red-500 flex-none">
                      <X size={14} />
                    </button>
                  )}
                </div>
                {formData.indukId && !showIndukDropdown && (
                  <p className="text-xs text-emerald-600 font-medium mt-1 pl-1">✓ {indukEquipments.find(e => e.eqNum === formData.indukId)?.description}</p>
                )}
                {showIndukDropdown && (
                  <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto">
                    {indukEquipments
                      .filter(eq => eq.description.toLowerCase().includes(indukSearch.toLowerCase()) || eq.eqNum.toLowerCase().includes(indukSearch.toLowerCase()))
                      .length === 0 ? (
                        <div className="px-4 py-3 text-sm text-slate-500 text-center">Tidak ada hasil</div>
                      ) : (
                        indukEquipments
                          .filter(eq => eq.description.toLowerCase().includes(indukSearch.toLowerCase()) || eq.eqNum.toLowerCase().includes(indukSearch.toLowerCase()))
                          .map(eq => (
                            <button
                              key={eq.eqNum}
                              type="button"
                              onClick={() => {
                                setFormData({...formData, indukId: eq.eqNum});
                                setIndukSearch('');
                                setShowIndukDropdown(false);
                              }}
                              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-emerald-50 transition-colors flex flex-col gap-0.5 border-b border-slate-50 last:border-0 ${
                                formData.indukId === eq.eqNum ? 'bg-emerald-50 text-emerald-700 font-semibold' : 'text-slate-700'
                              }`}
                            >
                              <span>{eq.description}</span>
                              <span className="text-xs text-slate-500 font-mono">{eq.eqNum} • {eq.plant}</span>
                            </button>
                          ))
                      )}
                  </div>
                )}
              </div>

              {/* Total Jam Jalan Input */}
              <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100">
                <label className="block text-sm font-semibold text-slate-700 mb-3 text-center">Durasi Jam Jalan (Tambahan)</label>
                <div className="flex items-center justify-center gap-6">
                  {/* Hours */}
                  <div className="flex flex-col items-center">
                    <div className="flex items-center bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                      <button type="button" onClick={() => setFormData({...formData, hours: Math.max(0, formData.hours - 1)})} className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border-r border-slate-200"><Minus size={16}/></button>
                      <input type="number" min="0" max="24" className="w-14 text-center py-2 font-bold text-lg outline-none" value={formData.hours} onChange={e => setFormData({...formData, hours: parseInt(e.target.value)||0})} />
                      <button type="button" onClick={() => setFormData({...formData, hours: Math.min(24, formData.hours + 1)})} className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border-l border-slate-200"><Plus size={16}/></button>
                    </div>
                    <span className="text-xs text-slate-500 mt-1 font-medium uppercase">Jam</span>
                  </div>
                  <span className="text-2xl font-bold text-slate-300 mb-4">:</span>
                  {/* Minutes */}
                  <div className="flex flex-col items-center">
                    <div className="flex items-center bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
                      <button type="button" onClick={() => setFormData({...formData, minutes: formData.minutes === 30 ? 0 : 30})} className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border-r border-slate-200"><Minus size={16}/></button>
                      <input type="text" readOnly className="w-14 text-center py-2 font-bold text-lg outline-none bg-slate-50" value={formData.minutes === 30 ? '30' : '00'} />
                      <button type="button" onClick={() => setFormData({...formData, minutes: formData.minutes === 0 ? 30 : 0})} className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 border-l border-slate-200"><Plus size={16}/></button>
                    </div>
                    <span className="text-xs text-slate-500 mt-1 font-medium uppercase">Menit</span>
                  </div>
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Status Kondisi</label>
                <select 
                  className="w-full border border-slate-300 rounded-2xl p-2.5 bg-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  value={formData.status}
                  onChange={e => setFormData({...formData, status: e.target.value})}
                >
                  <option value="Normal">Normal Beroperasi</option>
                  <option value="Rusak">Rusak / Break Down</option>
                </select>
              </div>

              {/* Conditional Break Down Fields */}
              {formData.status === 'Rusak' && (
                <div className="bg-red-50/50 p-4 rounded-xl border border-red-100 space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-red-800 mb-2">Apakah alat sempat beroperasi hari ini?</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="didRun" checked={formData.didRun} onChange={() => setFormData({...formData, didRun: true})} className="text-red-600 focus:ring-red-500" />
                        <span className="text-sm font-medium text-slate-700">Ya, sempat jalan</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="didRun" checked={!formData.didRun} onChange={() => setFormData({...formData, didRun: false})} className="text-red-600 focus:ring-red-500" />
                        <span className="text-sm font-medium text-slate-700">Tidak (0 Jam)</span>
                      </label>
                    </div>
                  </div>

                  {indukChildren.length > 0 && (
                    <div>
                      <label className="block text-sm font-bold text-red-800 mb-2">Pilih Komponen yang Rusak:</label>
                      <div className="max-h-40 overflow-y-auto space-y-1.5 bg-white p-2 border border-red-200 rounded-2xl">
                        {indukChildren.map(child => (
                          <label key={child.eqNum} className="flex items-start gap-2.5 p-1.5 hover:bg-red-50 rounded cursor-pointer">
                            <input 
                              type="checkbox" 
                              className="mt-0.5 rounded text-red-600 focus:ring-red-500 border-slate-300" 
                              checked={formData.damagedSubs.includes(child.eqNum)}
                              onChange={() => toggleDamagedSub(child.eqNum)}
                            />
                            <div className="flex flex-col">
                              <span className="text-xs font-semibold text-slate-800">{child.description}</span>
                              <span className="text-[10px] text-slate-500 font-mono">{child.eqNum}</span>
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Catatan Opsional</label>
                <textarea 
                  rows="3" 
                  className="w-full border border-slate-300 rounded-2xl p-2.5 bg-white text-sm focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  placeholder="Contoh: Operasi normal, shift 2 ganti filter..."
                  value={formData.notes}
                  onChange={e => setFormData({...formData, notes: e.target.value})}
                ></textarea>
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
              <button 
                onClick={handleSaveForm}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
              >
                <Save size={20} /> SIMPAN DATA LOG
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mass Input Modal */}
      {showMassForm && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl flex flex-col max-h-[90vh]">
            <div className="bg-slate-800 text-white p-4 rounded-t-2xl flex justify-between items-start">
              <div className="flex-1">
                <h3 className="font-bold text-lg mb-1">INPUT MASAL JAM JALAN</h3>
                <p className="text-xs text-slate-300 mb-3">{format(selectedDate, 'dd/MM/yyyy')} • Paste satu kolom penuh dari Excel ke kotak Durasi di bawah</p>
                <div className="flex items-center gap-3 flex-wrap">
                  {currentUser?.role !== 'Unit' && (
                    <select
                      value={massPlantFilter}
                      onChange={e => { setMassPlantFilter(e.target.value); setMassData({}); }}
                      className="text-sm bg-slate-700 border border-slate-600 text-white rounded-2xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    >
                      <option value="">Semua Plant</option>
                      {uniquePlants.map(p => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                  )}
                  <button onClick={downloadMassTemplate} className="text-xs font-semibold bg-slate-700 hover:bg-slate-600 px-3 py-1.5 rounded-2xl flex items-center gap-2 transition-colors border border-slate-600 shadow-sm">
                    <Download size={14} /> Download Template Excel
                  </button>
                </div>
              </div>
              <button onClick={() => setShowMassForm(false)} className="text-slate-400 hover:text-white p-1.5 rounded-full bg-slate-700/50 hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400 mt-1">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-0 overflow-y-auto flex-1">
              <table className="w-full text-left text-sm text-slate-600">
                <thead className="bg-slate-50 sticky top-0 border-b border-slate-200 shadow-sm z-10">
                  <tr>
                    <th className="px-6 py-3 font-semibold text-slate-700 w-16">No</th>
                    {currentUser?.role !== 'Unit' && (
                      <th className="px-4 py-3 font-semibold text-slate-700 w-24">Plant</th>
                    )}
                    <th className="px-6 py-3 font-semibold text-slate-700">Equipment Induk</th>
                    <th className="px-6 py-3 font-semibold text-slate-700 w-48 text-center">Durasi Jam (Max 24)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {massIndukEquipments.map((eq, idx) => {
                    const md = massData[eq.eqNum] || { hours: '', minutes: '', raw: undefined };
                    let displayVal = '';
                    if (md.raw !== undefined) {
                      displayVal = md.raw;
                    } else if (md.hours !== '' || md.minutes !== '') {
                      displayVal = ((md.hours || 0) + (md.minutes === 30 ? 0.5 : 0)).toString().replace('.', ',');
                    }
                    
                    return (
                      <tr key={eq.eqNum} className="hover:bg-emerald-50/30">
                        <td className="px-6 py-3 text-slate-400">{idx + 1}</td>
                        {currentUser?.role !== 'Unit' && (
                          <td className="px-4 py-3">
                            <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded text-xs font-semibold border border-emerald-100">{eq.plant}</span>
                          </td>
                        )}
                        <td className="px-6 py-3 font-medium text-slate-700">{eq.description}</td>
                        <td className="px-6 py-2">
                          <input 
                            type="text"
                            placeholder="0"
                            className="w-full px-3 py-2 border border-emerald-200 rounded-xl text-center font-bold text-emerald-700 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none transition-colors shadow-inner bg-slate-50 focus:bg-white"
                            value={displayVal}
                            onPaste={(e) => handlePaste(e, idx)}
                            onChange={(e) => {
                              const rawVal = e.target.value;
                              let valStr = rawVal.replace(',', '.');
                              if (valStr === '') {
                                const newMD = {...massData};
                                delete newMD[eq.eqNum];
                                setMassData(newMD);
                                return;
                              }
                              let val = parseFloat(valStr);
                              if (!isNaN(val)) {
                                if (val < 0) val = 0;
                                if (val > 24) val = 24;
                                val = Math.round(val * 2) / 2;
                                const h = Math.floor(val);
                                const m = (val % 1) === 0.5 ? 30 : 0;
                                setMassData({...massData, [eq.eqNum]: {hours: h, minutes: m, raw: rawVal}});
                              } else {
                                setMassData({...massData, [eq.eqNum]: {...(massData[eq.eqNum]||{}), raw: rawVal}});
                              }
                            }}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
              <button 
                onClick={handleSaveMassForm}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
              >
                <Save size={20} /> SIMPAN DATA MASAL ({Object.keys(massData).length} Alat Terisi)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Export Modal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col">
            <div className="bg-slate-800 text-white p-4 rounded-t-2xl flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">PENGATURAN EXPORT SAP</h3>
                <p className="text-xs text-slate-300">Pilih rentang tanggal untuk diekspor</p>
              </div>
              <button onClick={() => setShowExportModal(false)} className="text-slate-400 hover:text-white p-1.5 rounded-full bg-slate-700/50 hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Mulai Tanggal</label>
                  <input type="date" className="w-full border border-slate-300 rounded-2xl p-2.5 bg-slate-50 text-sm focus:ring-2 focus:ring-emerald-500" value={exportSettings.startDate} onChange={e => setExportSettings({...exportSettings, startDate: e.target.value})} />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Sampai Tanggal</label>
                  <input type="date" className="w-full border border-slate-300 rounded-2xl p-2.5 bg-slate-50 text-sm focus:ring-2 focus:ring-emerald-500" value={exportSettings.endDate} onChange={e => setExportSettings({...exportSettings, endDate: e.target.value})} />
                </div>
              </div>
              <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-2xl cursor-pointer hover:bg-emerald-100 transition-colors" onClick={() => setExportSettings({...exportSettings, isAccumulated: !exportSettings.isAccumulated})}>
                <input type="checkbox" checked={exportSettings.isAccumulated} onChange={() => {}} className="mt-1 h-4 w-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer" />
                <div className="flex-1">
                  <span className="text-sm font-bold text-emerald-900 block">Akumulasi Jam Jalan (Satu Baris)</span>
                  <span className="text-xs text-emerald-700">Jika dicentang, HM dalam periode ini akan dijumlahkan jadi 1 baris per alat. Jika tidak, akan diekspor terpisah per tanggal.</span>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Jam Dibukukan</label>
                  <input type="time" disabled className="w-full border border-slate-300 rounded-2xl p-2.5 bg-slate-100 text-slate-400 cursor-not-allowed text-sm focus:outline-none" value={exportSettings.time} onChange={e => setExportSettings({...exportSettings, time: e.target.value})} />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">Read By (Petugas)</label>
                  <input type="text" maxLength="12" className="w-full border border-slate-300 rounded-2xl p-2.5 bg-slate-50 text-sm focus:ring-2 focus:ring-emerald-500" value={exportSettings.readBy} onChange={e => setExportSettings({...exportSettings, readBy: e.target.value})} />
                </div>
              </div>

              {currentUser?.role?.toUpperCase() === 'ADMIN' && (
                <fieldset className="border border-slate-200 rounded-2xl p-3 bg-white space-y-1">
                  <legend className="px-2 text-xs font-bold text-slate-500 uppercase tracking-wide">Pilih Unit (Opsional)</legend>
                  <p className="text-[11px] text-slate-400 mb-2 px-1">Biarkan kosong untuk ekspor seluruh unit</p>
                  <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-1.5 border border-slate-100 rounded-xl bg-slate-50/50">
                    {uniquePlants.map(plantCode => {
                      const isChecked = selectedExportPlants.includes(plantCode);
                      const name = PLANT_INFO[plantCode]?.desc || `Plant ${plantCode}`;
                      return (
                        <label key={plantCode} className="flex items-center gap-2 p-1.5 hover:bg-white rounded-lg cursor-pointer text-xs font-medium text-slate-700 transition-colors border border-transparent hover:border-slate-100">
                          <input 
                            type="checkbox" 
                            checked={isChecked} 
                            onChange={() => {
                              if (isChecked) {
                                setSelectedExportPlants(prev => prev.filter(p => p !== plantCode));
                              } else {
                                setSelectedExportPlants(prev => [...prev, plantCode]);
                              }
                            }}
                            className="rounded text-emerald-600 focus:ring-emerald-500" 
                          />
                          <span className="truncate" title={`${plantCode} - ${name}`}>{plantCode} - {name}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              )}

              <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                <div className="p-3 bg-slate-50 border-b border-slate-200">
                  <label className="block text-sm font-semibold text-slate-700 mb-1">Pilih Equipment (Opsional)</label>
                  <p className="text-xs text-slate-500 mb-2">Biarkan kosong untuk ekspor seluruh alat</p>
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                      type="text" 
                      placeholder="Ketik lalu Enter, atau Paste banyak nomor..." 
                      className="w-full pl-9 pr-3 py-2 border border-slate-300 rounded-2xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      value={exportEqSearch}
                      onChange={e => setExportEqSearch(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                           e.preventDefault();
                           const term = exportEqSearch.trim();
                           if (!term) return;
                           const exactMatch = indukEquipments.find(eq => eq.eqNum === term || eq.description.toLowerCase() === term.toLowerCase());
                           const match = exactMatch || (filteredExportEqs.length > 0 ? filteredExportEqs[0] : null);
                           if (match && !selectedExportEqs.includes(match.eqNum)) {
                              setSelectedExportEqs(prev => [...prev, match.eqNum]);
                              setExportEqSearch('');
                           }
                        }
                      }}
                      onPaste={e => {
                        const pastedData = e.clipboardData.getData('text');
                        if (!pastedData) return;
                        const tokens = pastedData.split(/[\s,\t\n;]+/).filter(Boolean);
                        if (tokens.length > 0) {
                           const validEqs = tokens.filter(t => indukEquipments.some(eq => eq.eqNum === t));
                           if (validEqs.length > 0) {
                              e.preventDefault();
                              setSelectedExportEqs(prev => Array.from(new Set([...prev, ...validEqs])));
                              setExportEqSearch('');
                           }
                        }
                      }}
                    />
                  </div>
                  {selectedExportEqs.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {selectedExportEqs.map(eqNum => {
                        const eqObj = equipments?.find(e => e.eqNum === eqNum);
                        return (
                          <div key={eqNum} className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded text-xs font-medium flex items-center gap-1">
                            <span className="truncate max-w-[120px]">{eqObj ? eqObj.description : eqNum}</span>
                            <button onClick={() => setSelectedExportEqs(prev => prev.filter(id => id !== eqNum))} className="hover:text-emerald-900"><X size={12}/></button>
                          </div>
                        );
                      })}
                      <button onClick={() => setSelectedExportEqs([])} className="text-xs text-red-500 hover:text-red-700 ml-1 font-medium">Hapus Semua</button>
                    </div>
                  )}
                </div>
                {exportEqSearch && (
                  <div className="max-h-40 overflow-y-auto">
                    {filteredExportEqs.length > 0 ? (
                      filteredExportEqs.map(eq => (
                        <div 
                          key={eq.eqNum} 
                          className="px-3 py-2 border-b border-slate-100 hover:bg-emerald-50 cursor-pointer flex items-start gap-2"
                          onClick={() => {
                            if (!selectedExportEqs.includes(eq.eqNum)) {
                              setSelectedExportEqs([...selectedExportEqs, eq.eqNum]);
                            }
                            setExportEqSearch('');
                          }}
                        >
                          <Plus size={14} className="text-emerald-500 mt-0.5 flex-none" />
                          <div>
                            <p className="text-sm text-slate-800 font-medium leading-tight">{eq.description}</p>
                            <p className="text-xs text-slate-500 font-mono mt-0.5">{eq.eqNum}</p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="p-3 text-center text-sm text-slate-500">Tidak ada mesin ditemukan.</p>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-slate-50 p-3 rounded-2xl text-xs text-slate-600 border border-slate-200">
                <p><strong>Catatan:</strong> Hanya alat yang memiliki jam jalan harian &gt; 0 di periode ini yang masuk ke Excel.</p>
              </div>
            </div>
            <div className="p-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex flex-col gap-3">
              <button 
                onClick={() => {
                  if (!templateData) {
                    alert("Template belum diupload. Silakan upload di Pengaturan.");
                    return;
                  }
                  
                  if (exportSettings.startDate > exportSettings.endDate) {
                    alert("Tanggal Awal tidak boleh lebih besar dari Tanggal Akhir.");
                    return;
                  }

                  const exportPayload = {
                    date: exportSettings.endDate, // for compatibility
                    startDate: exportSettings.startDate,
                    endDate: exportSettings.endDate,
                    time: exportSettings.time,
                    readBy: exportSettings.readBy,
                    plant: currentUser?.plant,
                    selectedEqs: selectedExportEqs
                  };

                  // Filter equipments by selected plants if any are selected (Admin only)
                  let targetEquipments = equipments;
                  const isAdmin = currentUser?.role?.toUpperCase() === 'ADMIN';
                  if (isAdmin && selectedExportPlants.length > 0) {
                    targetEquipments = equipments.filter(eq => selectedExportPlants.includes(eq.plant));
                  }

                  if (exportSettings.isAccumulated) {
                    exportAccumulatedToSAP(templateData.headers, templateData.originalData, targetEquipments, dailyLogs, exportPayload);
                  } else {
                    exportCumulativeToSAP(templateData.headers, templateData.originalData, targetEquipments, dailyLogs, exportPayload);
                  }
                  setShowExportModal(false);
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-3 rounded-xl shadow-md transition-colors flex items-center justify-center gap-2"
              >
                <FileDown size={20} /> DOWNLOAD EXCEL SAP
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Modal View Details */}
      {viewLog && (() => {
        const actualPlant = viewLog.plant || equipments.find(e => e.eqNum === viewLog.indukEqNum)?.plant || 'Unknown';
        return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
            <div className="bg-slate-800 text-white p-4 rounded-t-2xl flex justify-between items-center">
              <div>
                <h3 className="font-bold text-lg">Detail Jam Jalan</h3>
                <p className="text-xs text-slate-300">{format(new Date(selectedDate), 'dd/MM/yyyy')} • Plant: {actualPlant}</p>
              </div>
              <button onClick={() => setViewLog(null)} className="text-slate-400 hover:text-white p-1.5 rounded-full bg-slate-700/50 hover:bg-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="mb-4">
                <p className="text-sm text-slate-500 mb-1">Equipment Induk</p>
                <p className="font-semibold text-slate-800">{viewLog.indukDesc}</p>
                <p className="text-xs text-slate-500 font-mono mt-0.5"><span translate="no" className="notranslate">{viewLog.indukEqNum}</span></p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <p className="text-xs text-slate-500 mb-1">Durasi Jalan</p>
                  <p className="font-semibold text-slate-700">{Math.floor(viewLog.durationMinutes / 60)} Jam {viewLog.durationMinutes % 60} Menit</p>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <p className="text-xs text-slate-500 mb-1">Status</p>
                  <p className={`font-semibold ${viewLog.status === 'Normal' ? 'text-green-600' : 'text-red-600'}`}>{viewLog.status}</p>
                </div>
              </div>

              {viewLog.notes && (
                <div className="mb-6">
                  <p className="text-sm text-slate-500 mb-1">Catatan</p>
                  <p className="text-sm text-slate-700 bg-yellow-50 p-3 rounded-2xl border border-yellow-100">{viewLog.notes}</p>
                </div>
              )}

              <h4 className="font-semibold text-slate-800 mb-3 border-b border-slate-100 pb-2">Equipment Terpengaruh (+ HM)</h4>
              <ul className="space-y-2">
                {equipments
                  .filter(eq => eq.eqNum === viewLog.indukEqNum || (eq.induk === viewLog.indukDesc && eq.plant === actualPlant))
                  .map(eq => (
                    <li key={eq.eqNum} className="flex justify-between items-center text-sm p-2 bg-slate-50 rounded border border-slate-100">
                      <div>
                        <p className="font-medium text-slate-700">{eq.description}</p>
                        <p className="text-xs text-slate-500 font-mono">{eq.eqNum}</p>
                      </div>
                      <span className="text-emerald-600 font-semibold text-xs bg-emerald-50 px-2 py-1 rounded">+{Number(viewLog.durationMinutes / 60).toFixed(2)} HM</span>
                    </li>
                  ))}
              </ul>
              
              {viewLog.damagedSubs?.length > 0 && (
                <div className="mt-6">
                  <h4 className="font-semibold text-red-600 mb-3 border-b border-red-100 pb-2">Sub Equipment Rusak</h4>
                  <ul className="space-y-2">
                    {viewLog.damagedSubs.map(subEqNum => {
                      const subEq = equipments.find(e => e.eqNum === subEqNum);
                      return (
                        <li key={subEqNum} className="flex flex-col text-sm p-2 bg-red-50 rounded border border-red-100">
                          <span className="font-medium text-red-700">{subEq ? subEq.description : subEqNum}</span>
                          <span className="text-xs text-red-500 font-mono">{subEqNum}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end">
              <button 
                onClick={() => setViewLog(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-2xl font-medium transition-colors"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Upload Error Toast */}
      {uploadError && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-red-600 text-white px-5 py-3 rounded-xl shadow-xl max-w-lg text-sm whitespace-pre-line flex gap-3 items-start">
          <AlertTriangle size={18} className="flex-none mt-0.5" />
          <span className="flex-1">{uploadError}</span>
          <button onClick={() => setUploadError(null)} className="text-red-200 hover:text-white transition-colors p-1 rounded-lg hover:bg-red-500/50 focus:outline-none focus:ring-2 focus:ring-white/20"><X size={16}/></button>
        </div>
      )}

      {/* Upload Preview Modal */}
      {showUploadModal && uploadPreview && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl flex flex-col max-h-[90vh]">
            <div className="bg-purple-700 text-white p-4 rounded-t-2xl flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-bold text-lg">Preview Upload Excel</h3>
                <p className="text-xs text-purple-200">{uploadPreview.rows.length} baris siap diimport</p>
              </div>
              <button onClick={() => { setShowUploadModal(false); setUploadPreview(null); }} className="text-purple-300 hover:text-white p-1.5 rounded-full bg-purple-800/50 hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-400">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
              {uploadPreview.warnings?.length > 0 && (
                <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-2xl text-xs text-yellow-800 space-y-1">
                  <p className="font-semibold flex items-center gap-1"><AlertTriangle size={14}/> {uploadPreview.warnings.length} baris dilewati:</p>
                  {uploadPreview.warnings.map((w, i) => <p key={i}>{w}</p>)}
                </div>
              )}

              <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="px-3 py-2 font-semibold text-slate-600">Tanggal</th>
                    <th className="px-3 py-2 font-semibold text-slate-600">Plant</th>
                    <th className="px-3 py-2 font-semibold text-slate-600">Equipment Induk</th>
                    <th className="px-3 py-2 font-semibold text-slate-600">Durasi</th>
                    <th className="px-3 py-2 font-semibold text-slate-600">Status</th>
                    <th className="px-3 py-2 font-semibold text-slate-600">Catatan</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {uploadPreview.rows.map((row, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="px-3 py-2 font-mono text-xs">{row.dateStr}</td>
                      <td className="px-3 py-2"><span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded font-medium">{row.plant}</span></td>
                      <td className="px-3 py-2 text-slate-700 font-medium">{row.indukDesc}<br/><span className="text-xs text-slate-500 font-mono notranslate" translate="no">{row.indukEqNum}</span></td>
                      <td className="px-3 py-2 font-mono">{Math.floor(row.durationMinutes/60)}h {row.durationMinutes%60}m</td>
                      <td className="px-3 py-2">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${row.status === 'Normal' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{row.status}</span>
                      </td>
                      <td className="px-3 py-2 text-slate-500 text-xs">{row.notes || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-between items-center gap-3 shrink-0">
              {isImporting ? (
                <span className="text-sm text-purple-700 font-medium flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4 text-purple-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
                  </svg>
                  {importProgress}
                </span>
              ) : <span />}
              <div className="flex gap-3">
                <button onClick={() => { setShowUploadModal(false); setUploadPreview(null); }} disabled={isImporting} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-2xl font-medium transition-colors disabled:opacity-50">
                  Batal
                </button>
                <button onClick={handleConfirmUpload} disabled={isImporting} className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-2xl font-medium flex items-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed">
                  {isImporting ? (
                    <><svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg> Mengimpor...</>
                  ) : (
                    <><Upload size={16}/> Import {uploadPreview.rows.length} Data</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Google Sheet Import Modal */}
      {showGSheetModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#16a34a"><path d="M19.77 4.93l1.3 1.3L8.44 18.86l-5.44-5.37 1.29-1.31 4.15 4.09L19.77 4.93m0-2.82L8.44 13.44l-4.15-4.09L0 13.63 8.44 22 24 6.37 19.77 2.11z"/></svg>
                  Import dari Google Sheet
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Tempel link CSV Google Sheet yang sudah di-publish</p>
              </div>
              <button onClick={() => setShowGSheetModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-200"><X size={20}/></button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="bg-green-50 border border-green-200 rounded-2xl p-3 text-xs text-green-800 space-y-1">
                <p className="font-semibold">📋 Cara mendapatkan link:</p>
                <p>1. Buka Google Sheet bulan tersebut</p>
                <p>2. Klik <b>File → Share → Publish to web</b></p>
                <p>3. Pilih sheet yang ingin diimport, format <b>CSV</b></p>
                <p>4. Klik <b>Publish</b> → salin link → tempel di bawah</p>
              </div>
              {gsheetHistory.length > 0 && (
                <div className="pt-2">
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Riwayat Link Tersimpan</label>
                  <div className="flex flex-wrap gap-2">
                    {gsheetHistory.map(h => (
                      <button
                        key={h.id}
                        onClick={() => { 
                          setGoogleSheetUrl(h.url || '');
                          const parts = (h.label || '').split(' ');
                          if (parts.length >= 2) {
                            const mIndex = MONTH_NAMES.indexOf(parts[0]);
                            if (mIndex >= 0) setSelectedGSheetMonth((mIndex + 1).toString());
                            setSelectedGSheetYear(parts[1]);
                          }
                        }}
                        className="text-xs px-2.5 py-1.5 bg-green-50 border border-green-200 text-green-700 rounded-full hover:bg-green-100 transition-colors flex items-center gap-1"
                      >
                        <Clock size={12}/> {h.label || 'Riwayat'}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Bulan & Tahun Import</label>
                <div className="flex gap-3 mb-3">
                  <select
                    value={selectedGSheetMonth}
                    onChange={(e) => setSelectedGSheetMonth(e.target.value)}
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-2xl text-sm focus:ring-2 focus:ring-green-400 focus:outline-none bg-white"
                  >
                    {MONTH_NAMES.map((m, i) => (
                      <option key={i} value={(i + 1).toString()}>{m}</option>
                    ))}
                  </select>
                  <select
                    value={selectedGSheetYear}
                    onChange={(e) => setSelectedGSheetYear(e.target.value)}
                    className="w-1/3 px-3 py-2 border border-slate-300 rounded-2xl text-sm focus:ring-2 focus:ring-green-400 focus:outline-none bg-white"
                  >
                    {Array.from({ length: 7 }, (_, i) => 2024 + i).map(y => (
                      <option key={y} value={y.toString()}>{y}</option>
                    ))}
                  </select>
                </div>
                
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Link CSV Google Sheet</label>
                <input
                  type="url"
                  value={googleSheetUrl}
                  onChange={e => setGoogleSheetUrl(e.target.value)}
                  placeholder="https://docs.google.com/spreadsheets/d/e/.../pub?output=csv"
                  className="w-full px-3 py-2 border border-slate-300 rounded-2xl text-sm focus:ring-2 focus:ring-green-400 focus:outline-none"
                />
              </div>
              <div className="text-xs text-slate-500 bg-slate-50 rounded-2xl p-3">
                <p className="font-medium text-slate-600 mb-1">Format kolom yang didukung:</p>
                <p><b>Tanggal</b> | <b>Plant</b> | <b>Equipment</b> | Description | <b>Jam</b></p>
                <p className="mt-1 text-slate-500">Kolom bold wajib ada. Tanggal format: DD-MM-YYYY</p>
              </div>
              {uploadError && (
                <div className="bg-red-50 border border-red-200 rounded-2xl p-3 text-xs text-red-700 whitespace-pre-wrap max-h-32 overflow-y-auto shrink-0">{uploadError}</div>
              )}
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 rounded-b-2xl flex justify-end gap-3 shrink-0">
              <button onClick={() => { setShowGSheetModal(false); setUploadError(null); }} className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-2xl font-medium transition-colors text-sm">
                Batal
              </button>
              <button
                onClick={handleFetchGoogleSheet}
                disabled={isFetchingSheet || !googleSheetUrl.trim()}
                className="px-5 py-2 bg-green-600 hover:bg-green-700 text-white rounded-2xl font-medium flex items-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm"
              >
                {isFetchingSheet ? (
                  <><svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg> Mengambil data...</>
                ) : (
                  <>Ambil & Preview Data</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Smart Sync Modal */}
      {showSmartSyncModal && smartSyncResult && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="#3b82f6"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-5H9v5H8v-6H7v-2h4v8h-2zm4 0h-2v-8h2v8zm-2-9.5h-2v-2h2v2zm4 9.5h-2v-2h2v2z"/></svg>
                  Review Sinkronisasi Data
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Pilih data yang ingin dimasukkan atau ditimpa</p>
              </div>
              <button onClick={() => setShowSmartSyncModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors p-1 rounded-lg hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-slate-200"><X size={20}/></button>
            </div>
            
            <div className="flex border-b border-slate-200 shrink-0">
              <button onClick={() => setSyncTab('new')} className={`px-4 py-3 text-sm font-medium flex items-center gap-2 ${syncTab === 'new' ? 'text-emerald-600 border-b-2 border-emerald-600 bg-emerald-50/50' : 'text-slate-500 hover:bg-slate-50'}`}>
                <Plus size={16}/> Data Baru ({smartSyncResult.newRows.length})
              </button>
              <button onClick={() => setSyncTab('conflict')} className={`px-4 py-3 text-sm font-medium flex items-center gap-2 ${syncTab === 'conflict' ? 'text-amber-600 border-b-2 border-amber-600 bg-amber-50/50' : 'text-slate-500 hover:bg-slate-50'}`}>
                <AlertTriangle size={16}/> Berbeda ({smartSyncResult.conflictRows.length})
              </button>
              <button onClick={() => setSyncTab('skip')} className={`px-4 py-3 text-sm font-medium flex items-center gap-2 ${syncTab === 'skip' ? 'text-slate-700 border-b-2 border-slate-700 bg-slate-100/50' : 'text-slate-500 hover:bg-slate-50'}`}>
                <CheckCircle size={16}/> Sama/Skip ({smartSyncResult.skipRows.length})
              </button>
            </div>
            
            <div className="p-0 overflow-y-auto flex-1 bg-slate-50">
              {syncTab === 'new' && (
                <div className="p-4">
                  <div className="bg-emerald-50 text-emerald-800 text-xs p-3 rounded-2xl border border-emerald-200 mb-3">
                    Baris di bawah ini adalah data yang belum ada di sistem dan akan diimport otomatis.
                  </div>
                  <table className="w-full text-left text-sm bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <thead className="bg-slate-100 text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Tanggal</th>
                        <th className="py-2 px-3">Plant</th>
                        <th className="py-2 px-3">Equipment</th>
                        <th className="py-2 px-3 text-right">Durasi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {smartSyncResult.newRows.length === 0 ? (
                        <tr><td colSpan="4" className="py-4 text-center text-slate-500">Tidak ada data baru</td></tr>
                      ) : smartSyncResult.newRows.map((r, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="py-2 px-3">{r.dateStr}</td>
                          <td className="py-2 px-3">{r.plant}</td>
                          <td className="py-2 px-3">
                            <div className="font-medium">{r.indukEqNum}</div>
                            <div className="text-xs text-slate-500">{r.indukDesc}</div>
                          </td>
                          <td className="py-2 px-3 text-right font-medium text-emerald-600">{r.durationMinutes / 60} jam</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              
              {syncTab === 'conflict' && (
                <div className="p-4">
                  <div className="bg-amber-50 text-amber-800 text-xs p-3 rounded-2xl border border-amber-200 mb-3">
                    Baris ini sudah ada di sistem, tapi nilai jamnya berbeda dengan file Google Sheet. 
                    Pilih apakah ingin menimpa dengan data GSheet atau mengabaikannya.
                  </div>
                  <table className="w-full text-left text-sm bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
                    <thead className="bg-slate-100 text-slate-600 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Tanggal</th>
                        <th className="py-2 px-3">Equipment</th>
                        <th className="py-2 px-3 text-right">Nilai Saat Ini</th>
                        <th className="py-2 px-3 text-right">Nilai GSheet</th>
                        <th className="py-2 px-3 text-center">Tindakan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {smartSyncResult.conflictRows.length === 0 ? (
                        <tr><td colSpan="5" className="py-4 text-center text-slate-500">Tidak ada konflik</td></tr>
                      ) : smartSyncResult.conflictRows.map((r, i) => {
                        const key = `${r.dateStr}_${r.indukEqNum}`;
                        const action = conflictResolutions[key] || 'timpa';
                        return (
                          <tr key={i} className="hover:bg-slate-50">
                            <td className="py-2 px-3">{r.dateStr}</td>
                            <td className="py-2 px-3">
                              <div className="font-medium">{r.indukEqNum}</div>
                              <div className="text-xs text-slate-500">{r.indukDesc}</div>
                            </td>
                            <td className="py-2 px-3 text-right text-slate-500">{r.oldDuration / 60} jam</td>
                            <td className="py-2 px-3 text-right font-medium text-amber-600">{r.durationMinutes / 60} jam</td>
                            <td className="py-2 px-3 text-center">
                              <select 
                                value={action}
                                onChange={(e) => setConflictResolutions(prev => ({...prev, [key]: e.target.value}))}
                                className={`text-xs p-1 rounded border ${action === 'timpa' ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-slate-100 border-slate-300 text-slate-600'}`}
                              >
                                <option value="timpa">Timpa</option>
                                <option value="skip">Skip</option>
                              </select>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              
              {syncTab === 'skip' && (
                <div className="p-4">
                  <div className="bg-slate-100 text-slate-600 text-xs p-3 rounded-2xl border border-slate-200 mb-3">
                    Baris di bawah ini sudah ada di sistem dan nilai jamnya identik. Sistem otomatis melewati baris ini.
                  </div>
                  <table className="w-full text-left text-sm bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden opacity-75">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-3">Tanggal</th>
                        <th className="py-2 px-3">Equipment</th>
                        <th className="py-2 px-3 text-right">Durasi (Sama)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {smartSyncResult.skipRows.length === 0 ? (
                        <tr><td colSpan="3" className="py-4 text-center text-slate-500">Tidak ada data yang identik</td></tr>
                      ) : smartSyncResult.skipRows.map((r, i) => (
                        <tr key={i}>
                          <td className="py-2 px-3">{r.dateStr}</td>
                          <td className="py-2 px-3">
                            <div className="font-medium">{r.indukEqNum}</div>
                          </td>
                          <td className="py-2 px-3 text-right text-slate-500">{r.durationMinutes / 60} jam</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
            
            <div className="p-4 border-t border-slate-100 bg-white rounded-b-2xl flex justify-between shrink-0 items-center">
              <div className="text-sm font-medium text-slate-600 flex items-center gap-2">
                Total import: <span className="text-emerald-600 font-bold">{smartSyncResult.newRows.length + smartSyncResult.conflictRows.filter(r => conflictResolutions[`${r.dateStr}_${r.indukEqNum}`] === 'timpa').length}</span> baris
                {isSyncing && (
                  <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded ml-2 animate-pulse">
                    {importProgress}
                  </span>
                )}
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowSmartSyncModal(false)} className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-2xl font-medium transition-colors text-sm">
                  Batal
                </button>
                <button
                  onClick={handleConfirmSmartSync}
                  disabled={isSyncing}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-medium flex items-center gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm"
                >
                  {isSyncing ? (
                    <><svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg> Memproses...</>
                  ) : (
                    <>Lanjutkan Import</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Riwayat Alat Modal */}
      {showHistoryModal && (() => {
        const historySaldoAwal = historyData.length > 0 
          ? (historyData[historyData.length - 1].cumulative_hm - (historyData[historyData.length - 1].duration_minutes / 60))
          : 0;
        const historySaldoAkhir = historyData.length > 0 
          ? historyData[0].cumulative_hm 
          : 0;
        
        return (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex justify-center items-center z-[110] p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl flex flex-col max-h-[90vh]">
            <div className="bg-sky-700 text-white p-4 rounded-t-2xl flex justify-between items-center shrink-0">
              <div>
                <h3 className="font-bold text-lg flex items-center gap-2"><History size={20}/> Riwayat Jam Jalan (All Time)</h3>
                <p className="text-xs text-slate-200">Cari equipment untuk melihat seluruh riwayat HM yang tersimpan</p>
              </div>
              <button onClick={() => { setShowHistoryModal(false); setHistoryData([]); setHistoryEqId(''); }} className="text-slate-300 hover:text-white p-1.5 rounded-full bg-slate-800/50 hover:bg-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-slate-400">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 flex flex-col gap-4 bg-slate-50 rounded-b-2xl">
              {/* Equipment Searchable Dropdown */}
              <div ref={historyDropdownRef} className="relative shrink-0">
                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Pilih Equipment</label>
                <div
                  className="w-full max-w-md border border-slate-300 rounded-2xl bg-white shadow-sm text-sm focus-within:ring-2 focus-within:ring-emerald-500 flex items-center gap-2 px-2.5"
                  onClick={() => setShowHistoryDropdown(true)}
                >
                  <Search size={14} className="text-slate-400 flex-none" />
                  <input
                    type="text"
                    className="flex-1 py-2.5 bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
                    placeholder={historyEqId ? equipments.find(e => e.eqNum === historyEqId)?.description || '...' : 'Ketik nama atau nomor alat...'}
                    value={historySearchEq}
                    onChange={e => { setHistorySearchEq(e.target.value); setShowHistoryDropdown(true); }}
                    onFocus={() => setShowHistoryDropdown(true)}
                  />
                  {historyEqId && (
                    <button type="button" onClick={e => { e.stopPropagation(); setHistoryEqId(''); setHistorySearchEq(''); setHistoryData([]); }} className="text-slate-400 hover:text-red-500 flex-none">
                      <X size={14} />
                    </button>
                  )}
                </div>
                {historyEqId && !showHistoryDropdown && (
                  <p className="text-xs text-emerald-600 font-medium mt-1.5 pl-1">✓ {equipments.find(e => e.eqNum === historyEqId)?.description} ({historyEqId})</p>
                )}
                {showHistoryDropdown && (
                  <div className="absolute z-50 mt-1 w-full max-w-md bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto">
                    {equipments
                      .filter(eq => eq.description.toLowerCase().includes(historySearchEq.toLowerCase()) || eq.eqNum.toLowerCase().includes(historySearchEq.toLowerCase()))
                      .length === 0 ? (
                        <div className="px-4 py-3 text-sm text-slate-500 text-center">Tidak ada hasil</div>
                      ) : (
                        equipments
                          .filter(eq => eq.description.toLowerCase().includes(historySearchEq.toLowerCase()) || eq.eqNum.toLowerCase().includes(historySearchEq.toLowerCase()))
                          .slice(0, 100)
                          .map(eq => (
                            <button
                              key={eq.eqNum}
                              type="button"
                              onClick={() => {
                                setHistoryEqId(eq.eqNum);
                                setHistorySearchEq('');
                                setShowHistoryDropdown(false);
                                fetchHistory(eq.eqNum);
                              }}
                              className="w-full text-left px-4 py-3 hover:bg-emerald-50 border-b border-slate-100 last:border-0 transition-colors"
                            >
                              <div className="font-medium text-slate-700">{eq.description}</div>
                              <div className="text-xs text-slate-500 font-mono mt-0.5">{eq.eqNum} {eq.plant ? `• ${eq.plant}` : ''}</div>
                            </button>
                          ))
                      )}
                  </div>
                )}
              </div>

              {/* Saldo Summary */}
              {historyEqId && historyData.length > 0 && !isHistoryLoading && (
                <div className="flex flex-col sm:flex-row gap-4 mt-2 mb-2 shrink-0">
                  <div className="flex-1 bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                      <Flag size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Saldo Awal HM</p>
                      <p className="text-lg font-bold text-slate-800">{Number(historySaldoAwal || 0).toFixed(2).replace('.', ',')} <span className="text-sm font-medium text-slate-500">HM</span></p>
                    </div>
                  </div>
                  <div className="flex-1 bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600">
                      <CheckCircle size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Saldo Akhir HM</p>
                      <p className="text-lg font-bold text-slate-800">{Number(historySaldoAkhir || 0).toFixed(2).replace('.', ',')} <span className="text-sm font-medium text-slate-500">HM</span></p>
                    </div>
                  </div>
                </div>
              )}

              {/* Table */}
              <div className="flex-1 bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm flex flex-col">
                <div className="overflow-auto flex-1">
                  <table className="w-full text-sm text-left">
                    <thead className="bg-slate-100 border-b border-slate-200 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 font-semibold text-slate-700 bg-slate-100 border-b border-slate-200">No</th>
                        <th className="px-4 py-3 font-semibold text-slate-700 bg-slate-100 border-b border-slate-200">Tanggal</th>
                        <th className="px-4 py-3 font-semibold text-slate-700 bg-slate-100 border-b border-slate-200 text-right">Durasi</th>
                        <th className="px-4 py-3 font-semibold text-slate-700 bg-slate-100 border-b border-slate-200 text-right">HM s.d.</th>
                        <th className="px-4 py-3 font-semibold text-slate-700 bg-slate-100 border-b border-slate-200">Status</th>
                        <th className="px-4 py-3 font-semibold text-slate-700 bg-slate-100 border-b border-slate-200">Catatan</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {isHistoryLoading ? (
                        <tr><td colSpan="6" className="px-4 py-10 text-center text-slate-500 animate-pulse">Memuat riwayat dari database...</td></tr>
                      ) : !historyEqId ? (
                        <tr><td colSpan="6" className="px-4 py-10 text-center text-slate-500">Pilih equipment di atas untuk melihat riwayat perjalanan HM-nya.</td></tr>
                      ) : historyData.length === 0 ? (
                        <tr><td colSpan="6" className="px-4 py-10 text-center text-slate-500">Belum ada riwayat HM untuk alat ini di database.</td></tr>
                      ) : (
                        historyData.map((log, idx) => (
                          <tr key={log.id || idx} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-2.5 text-slate-500">{idx + 1}</td>
                            <td className="px-4 py-2.5 font-medium text-slate-800">{format(new Date(log.date), 'dd MMMM yyyy', { locale: id })}</td>
                            <td className="px-4 py-2.5 text-right font-bold text-emerald-600">
                              {Number(log.duration_minutes / 60).toFixed(2).replace('.', ',')} Jam
                            </td>
                            <td className="px-4 py-2.5 text-right font-bold text-emerald-600 bg-emerald-50/30">
                              {Number(log.cumulative_hm || 0).toFixed(2).replace('.', ',')}
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${log.status === 'Normal' ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-red-100 text-red-700 border border-red-200'}`}>
                                {log.status}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-slate-600">
                              {log.notes || '-'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
        );
      })()}

    </div>
  );
}
