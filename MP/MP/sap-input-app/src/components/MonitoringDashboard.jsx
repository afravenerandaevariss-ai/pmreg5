import React, { useState, useMemo, useEffect } from 'react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, getISOWeek, addMonths, subMonths } from 'date-fns';
import { id } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, Download, Loader2, X, Check } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import * as XLSX from 'xlsx';
import { supabase } from '../lib/supabase';
import { fetchDailyLogs } from '../lib/supabaseService';

export default function MonitoringDashboard({ 
  equipments, 
  currentUser 
}) {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dailyLogs, setDailyLogs] = useState({});
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const rowsPerPage = 50;
  
  const [activeTab, setActiveTab] = useState('plant'); // 'plant' | 'equipment' | 'grafik'
  const [selectedCellDetail, setSelectedCellDetail] = useState(null);
  const [chartPlantFilter, setChartPlantFilter] = useState('ALL');

  // Load logs from Supabase (or localStorage fallback)
  useEffect(() => {
    const loadLogs = async () => {
      setLoading(true);
      try {
        if (supabase) {
          const yearMonth = format(currentMonth, 'yyyy-MM');
          const plant = currentUser?.role === 'Unit' ? currentUser.plant : null;
          const { data, error } = await fetchDailyLogs(plant, yearMonth);
          if (!error && data) {
            setDailyLogs(data);
          }
        } else {
          // localStorage fallback
          const saved = localStorage.getItem(`sapApp_dailyLogs_${currentUser?.plant || 'ALL'}`);
          if (saved) setDailyLogs(JSON.parse(saved));
        }
      } catch (e) {
        console.error('Failed to load monitoring logs', e);
      } finally {
        setLoading(false);
      }
    };
    loadLogs();
  }, [currentMonth, currentUser]);

  useEffect(() => {
    setCurrentPage(1);
  }, [currentMonth, currentUser]);

  // Get only Induk equipments that have at least 1 day of HM data in this month
  const indukEquipments = useMemo(() => {
    const base = equipments.filter(eq =>
      eq.type === 'Induk' &&
      (currentUser?.role !== 'Unit' || eq.plant === currentUser?.plant)
    );

    // If logs have loaded, filter to only those with HM > 0 somewhere this month
    const allLogs = Object.values(dailyLogs).flat();
    if (allLogs.length === 0) return base; // while loading, show all

    return base.filter(eq =>
      allLogs.some(log => log.indukEqNum === eq.eqNum && log.durationMinutes > 0)
    );
  }, [equipments, currentUser, dailyLogs]);

  // Generate days for the current month grouped by week
  const { weeks, flatDays } = useMemo(() => {
    const start = startOfMonth(currentMonth);
    const end = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start, end });
    
    const weeksMap = new Map();
    days.forEach(day => {
      // Using ISO week number to group days
      const weekNum = getISOWeek(day);
      if (!weeksMap.has(weekNum)) {
        weeksMap.set(weekNum, []);
      }
      weeksMap.get(weekNum).push(day);
    });

    const weeksArray = Array.from(weeksMap.entries()).map(([weekNum, daysInWeek], idx) => ({
      label: `M${idx + 1}`,
      days: daysInWeek
    }));

    return { weeks: weeksArray, flatDays: days };
  }, [currentMonth]);

  const totalPages = Math.ceil(indukEquipments.length / rowsPerPage);
  const paginatedEquipments = useMemo(() => {
    const start = (currentPage - 1) * rowsPerPage;
    return indukEquipments.slice(start, start + rowsPerPage);
  }, [indukEquipments, currentPage]);

  const getLogDuration = (eqNum, dateStr) => {
    const logsForDay = dailyLogs[dateStr] || [];
    const log = logsForDay.find(l => l.indukEqNum === eqNum);
    return log ? (log.durationMinutes / 60) : 0;
  };

  const plantRecap = useMemo(() => {
    if (activeTab === 'equipment') return [];
    
    // Group only relevant equipments by plant
    const equipmentsByPlant = {};
    indukEquipments.forEach(eq => {
      if (!equipmentsByPlant[eq.plant]) equipmentsByPlant[eq.plant] = [];
      equipmentsByPlant[eq.plant].push(eq);
    });

    const recap = [];
    Object.keys(equipmentsByPlant).sort().forEach(plant => {
      const plantEqs = equipmentsByPlant[plant];
      const totalEqs = plantEqs.length;
      
      const dailyStats = {};
      flatDays.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const logsForDay = dailyLogs[dateStr] || [];
        
        const ranEqs = [];
        let totalHmMins = 0;
        
        plantEqs.forEach(eq => {
          const log = logsForDay.find(l => l.indukEqNum === eq.eqNum);
          if (log && log.durationMinutes > 0) {
            ranEqs.push({ eq, durationMins: log.durationMinutes });
            totalHmMins += log.durationMinutes;
          }
        });
        
        dailyStats[dateStr] = {
          ranCount: ranEqs.length,
          totalCount: totalEqs,
          avgHm: ranEqs.length > 0 ? (totalHmMins / 60) / ranEqs.length : 0,
          ranEqs
        };
      });
      
      recap.push({ plant, totalEqs, dailyStats });
    });
    
    return recap;
  }, [indukEquipments, dailyLogs, flatDays, activeTab]);

  const chartData = useMemo(() => {
    if (activeTab !== 'grafik' || plantRecap.length === 0) return [];
    
    let data = flatDays.map((day, idx) => {
      const dateStr = format(day, 'yyyy-MM-dd');
      const dataPoint = {
        name: format(day, 'dd'),
        fullDate: format(day, 'dd MMM yyyy', { locale: id }),
        idx
      };
      
      let sumHm = 0, sumPct = 0, count = 0;
      
      plantRecap.forEach(pData => {
        const stats = pData.dailyStats[dateStr];
        const hm = stats ? Number(stats.avgHm.toFixed(2)) : 0;
        const pct = stats && stats.totalCount > 0 ? Number(((stats.ranCount / stats.totalCount) * 100).toFixed(1)) : 0;
        
        dataPoint[`${pData.plant}_hm`] = hm;
        dataPoint[`${pData.plant}_pct`] = pct;
        
        sumHm += hm;
        sumPct += pct;
        count++;
      });
      
      dataPoint['ALL_hm'] = count > 0 ? Number((sumHm / count).toFixed(2)) : 0;
      dataPoint['ALL_pct'] = count > 0 ? Number((sumPct / count).toFixed(1)) : 0;
      
      return dataPoint;
    });
    
    // Calculate trendline for the selected filter (either 'ALL' or a specific plant)
    // Linear regression: y = mx + b
    const yKeyHm = `${chartPlantFilter}_hm`;
    const yKeyPct = `${chartPlantFilter}_pct`;
    
    let sumX = 0, sumY_hm = 0, sumY_pct = 0, sumXY_hm = 0, sumXY_pct = 0, sumX2 = 0;
    const n = data.length;
    
    data.forEach(d => {
      const x = d.idx;
      const y_hm = d[yKeyHm] || 0;
      const y_pct = d[yKeyPct] || 0;
      
      sumX += x;
      sumY_hm += y_hm;
      sumY_pct += y_pct;
      sumXY_hm += (x * y_hm);
      sumXY_pct += (x * y_pct);
      sumX2 += (x * x);
    });
    
    // Avoid division by zero
    if (n > 1) {
      const denom = (n * sumX2 - sumX * sumX);
      if (denom !== 0) {
        const m_hm = (n * sumXY_hm - sumX * sumY_hm) / denom;
        const b_hm = (sumY_hm - m_hm * sumX) / n;
        
        const m_pct = (n * sumXY_pct - sumX * sumY_pct) / denom;
        const b_pct = (sumY_pct - m_pct * sumX) / n;
        
        data = data.map(d => ({
          ...d,
          trend_hm: Number((m_hm * d.idx + b_hm).toFixed(2)),
          trend_pct: Number((m_pct * d.idx + b_pct).toFixed(2))
        }));
      }
    }
    
    return data;
  }, [plantRecap, flatDays, activeTab, chartPlantFilter]);

  const plantColors = useMemo(() => {
    const colors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#f97316', '#64748b', '#84cc16'];
    const map = {};
    plantRecap.forEach((pData, idx) => {
      map[pData.plant] = colors[idx % colors.length];
    });
    return map;
  }, [plantRecap]);

  const exportToExcel = () => {
    const exportData = indukEquipments.map((eq, idx) => {
      const row = {
        "No": idx + 1,
        "Plant": eq.plant,
        "Equipment Induk": eq.description
      };
      
      flatDays.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const displayDate = format(day, 'dd MMM', { locale: id });
        const duration = getLogDuration(eq.eqNum, dateStr);
        row[displayDate] = duration;
      });
      
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Monitoring");
    
    const plantCode = (currentUser?.plant || 'ALL').toLowerCase();
    const monthStr = format(currentMonth, 'MM-yyyy');
    XLSX.writeFile(wb, `Monitoring_${plantCode}_${monthStr}.xlsx`);
  };

  return (
    <div className="flex h-full w-full bg-slate-50 pt-0 px-2 pb-2 gap-2 overflow-hidden flex-col">
      
      {/* Header / Filter */}
      <div className="flex justify-between items-center bg-white px-4 sm:px-5 py-3 rounded-xl border border-slate-200 shadow-sm flex-none sticky top-0 z-50">
        <div className="flex items-center gap-3">
          <div className="bg-slate-100/80 p-1 rounded-lg flex items-center border border-slate-200/60 gap-0.5">
            <button 
              onClick={() => setActiveTab('plant')}
              className={`px-3 py-1.5 text-[11px] sm:text-xs font-semibold rounded-md transition-all duration-200 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30 ${
                activeTab === 'plant' ? 'bg-white text-[#064e3b] shadow-sm border border-slate-200/80' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 border border-transparent'
              }`}
            >
              Rekap per Plant
            </button>
            <button 
              onClick={() => setActiveTab('equipment')}
              className={`px-3 py-1.5 text-[11px] sm:text-xs font-semibold rounded-md transition-all duration-200 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30 ${
                activeTab === 'equipment' ? 'bg-white text-[#064e3b] shadow-sm border border-slate-200/80' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 border border-transparent'
              }`}
            >
              Per Equipment
            </button>
            <button 
              onClick={() => setActiveTab('grafik')}
              className={`px-3 py-1.5 text-[11px] sm:text-xs font-semibold rounded-md transition-all duration-200 whitespace-nowrap focus:outline-none focus:ring-2 focus:ring-[#064e3b]/30 ${
                activeTab === 'grafik' ? 'bg-white text-[#064e3b] shadow-sm border border-slate-200/80' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50 border border-transparent'
              }`}
            >
              Grafik per Plant
            </button>
          </div>

          <div className="h-4 w-px bg-slate-200 mx-1 hidden md:block"></div>

          <div className="hidden md:flex bg-slate-50 border border-slate-200 text-slate-700 px-3 py-1.5 rounded-lg text-[11px] font-medium items-center gap-1.5">
            <span className="text-slate-400">Pabrik</span>
            <span className="font-semibold">{currentUser?.plant || 'Semua Plant'}</span>
          </div>
          
          <div className="flex items-center bg-white rounded-lg border border-slate-200 shadow-sm text-slate-700 overflow-hidden">
            <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-1 sm:p-1.5 hover:bg-slate-50 border-r border-slate-200 transition-colors focus:outline-none focus:bg-slate-100 flex items-center justify-center">
              <ChevronLeft size={14} className="text-slate-500" />
            </button>
            <div className="px-3 py-1.5 font-medium text-[11px] min-w-[90px] sm:min-w-[100px] text-center text-slate-700">
              {format(currentMonth, 'MMM yyyy', { locale: id })}
            </div>
            <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-1 sm:p-1.5 hover:bg-slate-50 border-l border-slate-200 transition-colors focus:outline-none focus:bg-slate-100 flex items-center justify-center">
              <ChevronRight size={14} className="text-slate-500" />
            </button>
          </div>
        </div>

        <button onClick={exportToExcel} className="bg-[#064e3b] hover:bg-[#022c22] text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[11px] sm:text-xs font-semibold flex items-center gap-2 transition-all duration-200 shadow-sm hover:shadow focus:outline-none focus:ring-2 focus:ring-[#064e3b]/50 active:scale-95">
          {loading ? <Loader2 size={14} className="animate-spin opacity-80" /> : <Download size={14} className="opacity-80" />} 
          <span className="hidden sm:inline">Ekspor Data</span>
          <span className="inline sm:hidden">Ekspor</span>
        </button>
      </div>

      {/* Content Wrapper */}
      <div className="flex-1 bg-white rounded-2xl shadow-lg shadow-emerald-900/5 border border-slate-100 overflow-hidden flex flex-col relative mt-2">
        {activeTab === 'grafik' ? (
          <div className="flex-1 overflow-auto custom-scrollbar p-6 flex flex-col gap-6 bg-slate-50/50">
            
            {plantRecap.length > 0 && (
              <div className="flex justify-center bg-white p-3 rounded-xl border border-slate-200 shadow-sm shrink-0">
                <div className="flex items-center gap-3">
                  <span className="text-sm font-semibold text-slate-600">Pilih Pabrik (Grafik):</span>
                  <select 
                    value={chartPlantFilter}
                    onChange={(e) => setChartPlantFilter(e.target.value)}
                    className="border border-slate-300 rounded-2xl px-3 py-1.5 text-sm font-medium text-slate-700 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer"
                  >
                    <option value="ALL">Semua Pabrik (Gabungan)</option>
                    {plantRecap.map(p => (
                      <option key={p.plant} value={p.plant}>{p.plant}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            {/* Chart 1: Average HM */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm min-h-[400px] flex flex-col">
              <h3 className="font-bold text-slate-700 mb-6 text-center text-base">Grafik Rata-rata Jam Operasi (HM) per Pabrik</h3>
              <div className="w-full h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 30, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={{stroke: '#cbd5e1'}} />
                    <YAxis tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={{stroke: '#cbd5e1'}} />
                    <Tooltip 
                      contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                      labelStyle={{fontWeight: 'bold', color: '#334155', marginBottom: '8px'}}
                      labelFormatter={(label, payload) => payload?.[0]?.payload?.fullDate || label}
                      formatter={(value, name) => [`${value} Jam`, name.split('_')[0]]}
                    />
                    <Legend wrapperStyle={{fontSize: '12px', paddingTop: '20px'}} />
                    {plantRecap
                      .filter(pData => chartPlantFilter === 'ALL' || pData.plant === chartPlantFilter)
                      .map(pData => (
                      <Line 
                        key={`${pData.plant}_hm`} 
                        type="monotone" 
                        dataKey={`${pData.plant}_hm`} 
                        name={`${pData.plant}`} 
                        stroke={plantColors[pData.plant]} 
                        strokeWidth={2.5}
                        dot={{ r: 3, strokeWidth: 1 }}
                        activeDot={{ r: 6 }}
                      />
                    ))}
                    <Line 
                      type="linear" 
                      dataKey="trend_hm" 
                      name="Garis Tren (Trendline)" 
                      stroke="#94a3b8" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      activeDot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Persentase Beroperasi */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm min-h-[400px] flex flex-col">
              <h3 className="font-bold text-slate-700 mb-6 text-center text-base">Grafik Persentase Mesin Beroperasi (%) per Pabrik</h3>
              <div className="w-full h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 5, right: 30, left: -20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={{stroke: '#cbd5e1'}} />
                    <YAxis tick={{fontSize: 12, fill: '#64748b'}} tickLine={false} axisLine={{stroke: '#cbd5e1'}} domain={[0, 100]} />
                    <Tooltip 
                      contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                      labelStyle={{fontWeight: 'bold', color: '#334155', marginBottom: '8px'}}
                      labelFormatter={(label, payload) => payload?.[0]?.payload?.fullDate || label}
                      formatter={(value, name) => [`${value}%`, name.split('_')[0]]}
                    />
                    <Legend wrapperStyle={{fontSize: '12px', paddingTop: '20px'}} />
                    {plantRecap
                      .filter(pData => chartPlantFilter === 'ALL' || pData.plant === chartPlantFilter)
                      .map(pData => (
                      <Line 
                        key={`${pData.plant}_pct`} 
                        type="monotone" 
                        dataKey={`${pData.plant}_pct`} 
                        name={`${pData.plant}`} 
                        stroke={plantColors[pData.plant]} 
                        strokeWidth={2.5}
                        dot={{ r: 3, strokeWidth: 1 }}
                        activeDot={{ r: 6 }}
                      />
                    ))}
                    <Line 
                      type="linear" 
                      dataKey="trend_pct" 
                      name="Garis Tren (Trendline)" 
                      stroke="#94a3b8" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      activeDot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

          </div>
        ) : (
          <div className="flex-1 overflow-auto custom-scrollbar">
            <table className="min-w-max w-full text-left text-xs whitespace-nowrap border-collapse">
            <thead className="sticky top-0 z-30">
              {/* First Header Row: Week Groups */}
              <tr>
                <th className="w-[40px] px-2 py-1 font-bold text-slate-700 border-b border-r border-slate-200 sticky left-0 z-40 bg-slate-100" rowSpan="2">No</th>
                <th className={`px-3 py-1 font-bold text-slate-700 border-b border-r border-slate-200 sticky left-[40px] z-40 bg-slate-100 ${activeTab === 'plant' ? 'min-w-[150px] border-r-2 border-r-slate-300 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]' : 'w-[60px]'}`} rowSpan="2">Plant</th>
                {activeTab === 'equipment' && (
                  <th className="w-[220px] px-3 py-1 font-bold text-slate-700 border-b border-r-2 border-r-slate-300 border-b-slate-200 sticky left-[100px] z-40 bg-slate-100 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]" rowSpan="2">Equipment Induk</th>
                )}
                
                {weeks.map((week, idx) => (
                  <th key={idx} colSpan={week.days.length} className="px-4 py-1 font-extrabold text-slate-600 border-b border-r border-slate-200 text-center bg-slate-50 uppercase tracking-wider text-[11px]">
                    {week.label}
                  </th>
                ))}
              </tr>
              {/* Second Header Row: Days */}
              <tr>
                {flatDays.map(day => (
                  <th key={day.toString()} className="min-w-[80px] w-[80px] px-2 py-1 font-semibold text-slate-600 border-b border-r border-slate-200 text-center bg-white">
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="text-[14px]">{format(day, 'dd')}</span>
                      <span className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider">{format(day, 'EEE', { locale: id })}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            
            <tbody className="divide-y divide-slate-100 bg-white">
              {activeTab === 'equipment' ? (
                paginatedEquipments.length === 0 ? (
                  <tr>
                    <td colSpan={flatDays.length + 3} className="px-6 py-12 text-center text-slate-500 font-medium">
                      Tidak ada data equipment untuk ditampilkan.
                    </td>
                  </tr>
                ) : paginatedEquipments.map((eq, idx) => {
                  const absoluteIdx = (currentPage - 1) * rowsPerPage + idx + 1;
                  return (
                  <tr key={eq.eqNum} className="hover:bg-emerald-50/40  hover:shadow-sm transition-colors duration-200 group border-b border-slate-50">
                    <td className="px-2 py-1.5 text-slate-500 border-r border-slate-100 sticky left-0 z-20 bg-white group-hover:bg-emerald-50/40">{absoluteIdx}</td>
                    <td className="px-3 py-1.5 text-slate-600 border-r border-slate-100 sticky left-[40px] z-20 bg-white group-hover:bg-emerald-50/40 truncate font-mono text-[10px] font-bold">{eq.plant}</td>
                    <td className="px-3 py-1.5 font-bold text-slate-700 border-r-2 border-r-slate-200 sticky left-[100px] z-20 bg-white group-hover:bg-emerald-50/40 truncate shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]" title={eq.description}>
                      {eq.description}
                    </td>
                    
                    {flatDays.map(day => {
                      const dateStr = format(day, 'yyyy-MM-dd');
                      const duration = getLogDuration(eq.eqNum, dateStr);
                      const isZero = duration === 0;
                      
                      return (
                        <td key={dateStr} className="px-1.5 py-1.5 border-r border-slate-100 text-center align-middle"
                            onClick={() => setSelectedCellDetail({
                              title: `Detail Input HM`,
                              date: format(day, 'dd MMM yyyy', { locale: id }),
                              plant: eq.plant,
                              equipment: eq.description,
                              hm: duration,
                              status: isZero ? 'Tidak Beroperasi / Belum Input' : 'Beroperasi'
                            })}
                        >
                          <div className="flex justify-center cursor-pointer hover:scale-125 transition-transform" title={`${duration} jam`}>
                            {isZero ? (
                              <X size={14} className="text-slate-400" strokeWidth={2.5} />
                            ) : (
                              <Check size={16} className="text-emerald-500" strokeWidth={3.5} />
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                  );
                })
              ) : (
                plantRecap.length === 0 ? (
                  <tr>
                    <td colSpan={flatDays.length + 2} className="px-6 py-12 text-center text-slate-500 font-medium">
                      Tidak ada data plant.
                    </td>
                  </tr>
                ) : plantRecap.map((pData, idx) => (
                  <tr key={pData.plant} className="hover:bg-emerald-50/40  hover:shadow-sm transition-colors duration-200 group border-b border-slate-50">
                    <td className="px-2 py-1.5 text-slate-500 border-r border-slate-100 sticky left-0 z-20 bg-white group-hover:bg-emerald-50/40">{idx + 1}</td>
                    <td className="px-3 py-1.5 font-bold text-slate-700 border-r-2 border-r-slate-200 sticky left-[40px] z-20 bg-white group-hover:bg-emerald-50/40 min-w-[150px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] font-mono text-[10px]">
                      {pData.plant}
                    </td>
                    
                    {flatDays.map(day => {
                      const dateStr = format(day, 'yyyy-MM-dd');
                      const stats = pData.dailyStats[dateStr];
                      
                      return (
                        <td key={dateStr} className="px-1.5 py-1.5 border-r border-slate-100 text-center align-middle"
                            onClick={() => setSelectedCellDetail({
                              title: `Rekap Plant ${pData.plant}`,
                              date: format(day, 'dd MMM yyyy', { locale: id }),
                              plant: pData.plant,
                              stats
                            })}
                        >
                          <div className="cursor-pointer hover:bg-emerald-50 p-1 rounded transition-colors text-[10px] flex flex-col items-center">
                            <div className={`font-bold font-mono ${stats.ranCount > 0 ? 'text-[#064e3b]' : 'text-slate-400'}`}>
                              {stats.ranCount}/{stats.totalCount}
                            </div>
                            {stats.ranCount > 0 && (
                              <div className="text-slate-600 mt-0.5 font-mono">
                                {stats.avgHm.toFixed(1)}h
                              </div>
                            )}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        )}
        
        {/* Pagination Footer */}
        {activeTab === 'equipment' && totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-slate-200 bg-slate-50 text-xs">
            <div className="text-slate-500 font-medium">
              Menampilkan <span className="font-bold text-slate-700">{(currentPage - 1) * rowsPerPage + 1}</span> hingga <span className="font-bold text-slate-700">{Math.min(currentPage * rowsPerPage, indukEquipments.length)}</span> dari <span className="font-bold text-slate-700">{indukEquipments.length}</span> equipment
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="px-3 py-1 font-bold text-slate-700 bg-white border border-slate-200 rounded-xl">
                {currentPage} / {totalPages}
              </span>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed text-slate-600 transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selectedCellDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col border border-slate-200">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-sm text-slate-800">{selectedCellDetail.title}</h3>
              <button onClick={() => setSelectedCellDetail(null)} className="text-slate-500 hover:text-slate-700 p-1 hover:bg-slate-200 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-500"><X size={18}/></button>
            </div>
            <div className="p-5 overflow-y-auto max-h-[70vh] custom-scrollbar">
              <div className="text-xs space-y-3">
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500 font-medium">Tanggal</span>
                  <span className="font-bold text-slate-700">{selectedCellDetail.date}</span>
                </div>
                <div className="flex justify-between border-b border-slate-100 pb-2">
                  <span className="text-slate-500 font-medium">Pabrik</span>
                  <span className="font-bold font-mono text-slate-700">{selectedCellDetail.plant}</span>
                </div>
                
                {selectedCellDetail.equipment && (
                  <>
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-500">Equipment</span>
                      <span className="font-medium text-right max-w-[200px]">{selectedCellDetail.equipment}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-500">Status</span>
                      <span className="font-medium">{selectedCellDetail.status}</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-500 font-medium">Jam Operasi (HM)</span>
                      <span className="font-bold text-[#064e3b] font-mono">{selectedCellDetail.hm} Jam</span>
                    </div>
                  </>
                )}

                {selectedCellDetail.stats && (
                  <>
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-500">Rasio Operasi</span>
                      <span className="font-medium">{selectedCellDetail.stats.ranCount} / {selectedCellDetail.stats.totalCount} Mesin</span>
                    </div>
                    <div className="flex justify-between border-b border-slate-100 pb-2">
                      <span className="text-slate-500 font-medium">Rata-rata HM</span>
                      <span className="font-bold text-[#064e3b] font-mono">{selectedCellDetail.stats.avgHm.toFixed(2)} Jam</span>
                    </div>
                    
                    <div className="mt-4 pt-2">
                      <div className="font-semibold text-slate-700 mb-2">Daftar Mesin yang Beroperasi:</div>
                      {selectedCellDetail.stats.ranEqs.length === 0 ? (
                        <div className="text-slate-500 italic text-xs bg-slate-50 p-3 rounded-lg border border-slate-200">Tidak ada mesin yang beroperasi (HM=0) pada tanggal ini.</div>
                      ) : (
                        <div className="space-y-1.5">
                          {selectedCellDetail.stats.ranEqs.map((re, i) => (
                            <div key={i} className="flex justify-between bg-slate-50 p-2 rounded text-xs border border-slate-200">
                              <span className="font-medium truncate mr-2 text-slate-700" title={re.eq.description}>{re.eq.description}</span>
                              <span className="text-emerald-600 font-bold shrink-0">{re.durationMins / 60}h</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button onClick={() => setSelectedCellDetail(null)} className="px-4 py-2 bg-[#064e3b] hover:bg-[#065f46] text-white rounded-xl text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-emerald-600 focus:ring-offset-2">
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
      
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f8fafc; 
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1; 
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8; 
        }
      `}</style>
    </div>
  );
}
