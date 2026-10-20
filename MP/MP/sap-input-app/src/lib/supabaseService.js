import { supabase, IS_DEV_ENV } from '../lib/supabase.js';

// ============================================================
// TABLE NAME RESOLVER
// DEV and PROD now have completely separate PostgreSQL databases
// (pmreg5_dev_db vs pmreg5_db), so standard table names are used.
// ============================================================
const T = {
  master_equipment: 'master_equipment',
  daily_logs:       'daily_logs',
  hierarchy_data:   'hierarchy_data',
  app_users:        'app_users',
};


// ============================================================
// MASTER EQUIPMENT
// ============================================================

/**
 * Upload (replace) all master equipment for a given plant.
 * Deletes existing rows for that plant, then inserts new ones.
 */
export async function uploadMasterEquipment(equipmentsArray) {
  if (!supabase) return { error: 'Supabase not configured' };

  // Group by plant to do targeted deletes
  const plants = [...new Set(equipmentsArray.map(e => e.plant).filter(Boolean))];
  for (const plant of plants) {
    await supabase.from(T.master_equipment).delete().eq('plant', plant);
  }

  const rows = equipmentsArray.map(eq => ({
    eq_num: eq.eqNum,
    plant: eq.plant || '',
    description: eq.description || '',
    functional_loc: eq.functionalLoc || '',
    fl_description: eq.flDescription || '',
    cost_center: eq.costCenter || '',
    eq_type: eq.type || 'Induk',
    induk: eq.induk || '',
    reading: parseFloat(eq.reading) || 0,
  }));

  const { error } = await supabase.from(T.master_equipment).insert(rows);
  return { error };
}

export async function fetchMasterEquipment(forceRefresh = false) {
  if (!supabase) return { data: null, error: 'Supabase not configured' };

  const cacheKey = `master_eq_${T.master_equipment}`;
  if (!forceRefresh) {
    if (memoryCache.has(cacheKey)) {
      return { data: memoryCache.get(cacheKey), error: null };
    }
    try {
      const cached = localStorage.getItem(cacheKey) || sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          memoryCache.set(cacheKey, parsed);
          return { data: parsed, error: null };
        }
      }
    } catch (e) {}
  }

  let allData = [];
  let from = 0;
  const PAGE_SIZE = 5000;
  let fetchError = null;

  while (true) {
    const { data, error } = await supabase
      .from(T.master_equipment)
      .select('eq_num, plant, description, functional_loc, fl_description, cost_center, eq_type, induk, reading')
      .order('plant')
      .order('eq_num')
      .range(from, from + PAGE_SIZE - 1);

    if (error) {
      fetchError = error;
      break;
    }
    if (!data || data.length === 0) break;
    
    allData = allData.concat(data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  if (fetchError) {
    // If fetch failed or timed out, fallback to local cache if available
    try {
      const fallbackCached = localStorage.getItem(cacheKey);
      if (fallbackCached) {
        const parsed = JSON.parse(fallbackCached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return { data: parsed, error: null };
        }
      }
    } catch (e) {}
    return { data: null, error: fetchError };
  }

  const equipments = allData.map(row => ({
    eqNum: row.eq_num,
    plant: row.plant,
    description: row.description,
    functionalLoc: row.functional_loc,
    flDescription: row.fl_description,
    costCenter: row.cost_center,
    type: row.eq_type,
    induk: row.induk,
    reading: row.reading,
  }));

  memoryCache.set(cacheKey, equipments);
  try {
    localStorage.setItem(cacheKey, JSON.stringify(equipments));
  } catch (e) {
    try { sessionStorage.setItem(cacheKey, JSON.stringify(equipments)); } catch (e2) {}
  }

  return { data: equipments, error: null };
}

/**
 * Update reading for a single equipment.
 */
export async function updateEquipmentReading(eqNum, reading) {
  if (!supabase) return;
  await supabase
    .from(T.master_equipment)
    .update({ reading: parseFloat(reading) || 0, updated_at: new Date().toISOString() })
    .eq('eq_num', eqNum);
}

/**
 * Bulk update readings for multiple equipments.
 */
export async function bulkUpdateReadings(equipmentsArray) {
  if (!supabase || !Array.isArray(equipmentsArray) || equipmentsArray.length === 0) return;
  const modified = equipmentsArray.filter(e => parseFloat(e.reading) > 0);
  if (modified.length === 0) return;
  
  const CHUNK_SIZE = 50;
  for (let i = 0; i < modified.length; i += CHUNK_SIZE) {
    const chunk = modified.slice(i, i + CHUNK_SIZE);
    await Promise.all(chunk.map(eq => 
      supabase
        .from(T.master_equipment)
        .update({ reading: parseFloat(eq.reading) || 0, updated_at: new Date().toISOString() })
        .eq('eq_num', eq.eqNum)
    ));
  }
}

// ============================================================
// HIERARCHY DATA
// ============================================================

export async function uploadHierarchyData(hierarchyObj) {
  if (!supabase) return { error: 'Supabase not configured' };
  const { error } = await supabase
    .from(T.hierarchy_data)
    .upsert({ id: 1, data: hierarchyObj, updated_at: new Date().toISOString() });
  return { error };
}

export async function fetchHierarchyData() {
  if (!supabase) return { data: null, error: 'Supabase not configured' };
  const { data, error } = await supabase
    .from(T.hierarchy_data)
    .select('data')
    .eq('id', 1)
    .single();
  if (error) {
    if (error.code === 'PGRST116' || error.status === 406) {
      return { data: null, error: null };
    }
    return { data: null, error };
  }
  return { data: data?.data || null, error: null };
}

const memoryCache = new Map();

// ============================================================
// DAILY LOGS IN-MEMORY CACHE
// Hanya di memori (tidak localStorage/sessionStorage), sehingga:
// - Refresh halaman → cache kosong → data selalu fresh dari Supabase ✅
// - Ganti filter plant/bulan dalam sesi yg sama → pakai cache (cepat) ✅
// - Setelah save/upload data baru → cache di-invalidate → fetch ulang ✅
// ============================================================
const dailyLogsCache = new Map(); // key: "plant__yearMonth"

function dailyLogsCacheKey(plant, yearMonth) {
  return `${plant || 'ALL'}__${yearMonth || ''}`;
}

/** Invalidate cache untuk kombinasi plant+month tertentu, atau semua jika tanpa argumen */
export function invalidateDailyLogsCache(plant, yearMonth) {
  if (!plant && !yearMonth) {
    dailyLogsCache.clear();
    return;
  }
  const key = dailyLogsCacheKey(plant, yearMonth);
  dailyLogsCache.delete(key);
  // Juga invalidate cache "ALL" yang mungkin mencakup plant ini
  dailyLogsCache.delete(dailyLogsCacheKey('ALL', yearMonth));
}

export function resolveConfigNumericId(id) {
  if (typeof id === 'number') return id;
  const strId = String(id || '').trim();
  if (strId === 'hierarchy_data') return 0;
  if (strId === 'master_map') return 2;
  if (strId === 'template_data') return 3;
  if (strId === 'sap_synced_dates') return 5;
  if (strId === 'ik17_raw_data') return 7;
  if (strId === 'vehicle_master') return 8;
  if (strId === 'vehicle_logs') return 9;
  if (strId === 'zco_data') return 10;
  if (strId === 'live_chats') return 11;
  if (strId === 'wa_config') return 12;
  if (strId === 'wa_logs') return 13;
  if (strId === 'iw39_data') return 14;
  if (strId === 'zvtab_data') return 15;
  if (strId === 'export046_data') return 16;
  if (strId === 'doc_details') return 17;
  if (strId === 'knowledge_base') return 18;
  if (strId === 'import_logs') return 19;

  // Dynamic monthly IK17 keys: e.g. "ik17_2026-09" -> 202609
  if (strId.startsWith('ik17_')) {
    const ym = strId.replace('ik17_', '').replace(/[^0-9]/g, '');
    if (ym && ym.length >= 4) {
      return parseInt(ym);
    }
  }

  return 4;
}

export async function saveSystemConfig(id, dataObj) {
  if (!supabase) return { error: 'Supabase not configured' };
  const numericId = resolveConfigNumericId(id);
  
  // Only cache small configs to storage (not large blobs like master_map(2), template_data(3))
  const SMALL_CONFIG_IDS = new Set([4, 5, 12, 13, 17, 18]);
  const cacheKey = `sys_cfg_${T.hierarchy_data}_${numericId}`;
  memoryCache.set(cacheKey, dataObj);
  if (SMALL_CONFIG_IDS.has(numericId)) {
    try { sessionStorage.setItem(cacheKey, JSON.stringify(dataObj)); } catch (e) {}
  }

  const { error } = await supabase
    .from(T.hierarchy_data)
    .upsert({ id: numericId, data: dataObj, updated_at: new Date().toISOString() }, { onConflict: 'id' });
  return { error };
}

export async function deleteSystemConfig(id) {
  if (!supabase) return { error: 'Supabase not configured' };
  const numericId = resolveConfigNumericId(id);

  const cacheKey = `sys_cfg_${T.hierarchy_data}_${numericId}`;
  memoryCache.delete(cacheKey);
  try { sessionStorage.removeItem(cacheKey); } catch (e) {}

  const { error } = await supabase
    .from(T.hierarchy_data)
    .delete()
    .eq('id', numericId);
  return { error };
}


export async function getSystemConfig(id, forceRefresh = false) {
  if (!supabase) return { data: null, error: 'Supabase not configured' };
  const numericId = resolveConfigNumericId(id);

  // Large blob configs are never cached in localStorage to avoid quota issues
  const LARGE_CONFIG_IDS = new Set([2, 3, 7, 8, 9, 10, 14, 15, 16]);
  const cacheKey = `sys_cfg_${T.hierarchy_data}_${numericId}`;

  if (!forceRefresh) {
    if (memoryCache.has(cacheKey)) {
      const memVal = memoryCache.get(cacheKey);
      if (memVal && (numericId !== 3 || (Array.isArray(memVal.equipments) && memVal.equipments.length > 0))) {
        return { data: memVal, error: null };
      }
    }
    if (!LARGE_CONFIG_IDS.has(numericId)) {
      try {
        const cachedItem = sessionStorage.getItem(cacheKey) || localStorage.getItem(cacheKey);
        if (cachedItem) {
          const parsed = JSON.parse(cachedItem);
          if (parsed && (numericId !== 3 || (Array.isArray(parsed.equipments) && parsed.equipments.length > 0))) {
            memoryCache.set(cacheKey, parsed);
            return { data: parsed, error: null };
          }
        }
      } catch (e) {}
    }
  }

  const { data, error } = await supabase
    .from(T.hierarchy_data)
    .select('data')
    .eq('id', numericId)
    .single();

  if (error) {
    if (error.code === 'PGRST116' || error.status === 406) {
      return { data: null, error: null };
    }
    // Fallback to cache if available and valid
    try {
      const fallbackItem = sessionStorage.getItem(cacheKey) || localStorage.getItem(cacheKey);
      if (fallbackItem) {
        const parsed = JSON.parse(fallbackItem);
        if (parsed && (numericId !== 3 || (Array.isArray(parsed.equipments) && parsed.equipments.length > 0))) {
          return { data: parsed, error: null };
        }
      }
    } catch (e) {}
    return { data: null, error };
  }

  if (data?.data !== undefined && data?.data !== null) {
    let resultData = data.data;
    if (resultData && typeof resultData === 'object' && !Array.isArray(resultData) && Array.isArray(resultData.data)) {
      resultData = resultData.data;
    }
    memoryCache.set(cacheKey, resultData);
    if (!LARGE_CONFIG_IDS.has(numericId)) {
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify(resultData));
      } catch (e) {}
      try {
        localStorage.setItem(cacheKey, JSON.stringify(resultData));
      } catch (e) {}
    }
    return { data: resultData, error: null };
  }

  return { data: null, error: null };
}


// ============================================================
// DAILY LOGS
// ============================================================

/**
 * Fetch daily logs for a specific plant and date range (month).
 * Menggunakan in-memory cache agar ganti filter tidak perlu fetch ulang.
 * Cache otomatis kosong saat refresh halaman (memory tidak persist).
 * Gunakan invalidateDailyLogsCache() setelah menyimpan data baru.
 */
export async function fetchDailyLogs(plant, yearMonth, forceRefresh = false) {
  if (!supabase) return { data: null, error: 'Supabase not configured' };

  // --- Cek cache dulu ---
  const cKey = dailyLogsCacheKey(plant, yearMonth);
  if (!forceRefresh && dailyLogsCache.has(cKey)) {
    return { data: dailyLogsCache.get(cKey), error: null };
  }

  let allData = [];
  let from = 0;
  const PAGE_SIZE = 1000;
  let fetchError = null;

  while (true) {
    let pageQuery = supabase.from(T.daily_logs).select('*');
    if (plant && plant !== 'ALL') pageQuery = pageQuery.eq('plant', plant);
    if (yearMonth) {
      const parts = yearMonth.split('-');
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10);
      const lastDay = new Date(y, m, 0).getDate();
      const startDate = `${yearMonth}-01`;
      const endDate = `${yearMonth}-${String(lastDay).padStart(2, '0')}`;
      pageQuery = pageQuery.gte('date', startDate).lte('date', endDate);
    }

    const { data, error } = await pageQuery.order('date').order('timestamp').range(from, from + PAGE_SIZE - 1);
    
    if (error) {
      fetchError = error;
      break;
    }
    if (!data || data.length === 0) break;
    
    allData = allData.concat(data);
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  if (fetchError) return { data: null, error: fetchError };

  // Convert to app's internal format: { 'yyyy-MM-dd': [...logs] }
  const logsMap = {};
  for (const row of allData) {
    if (!logsMap[row.date]) logsMap[row.date] = [];
    logsMap[row.date].push({
      id: row.id,
      indukEqNum: row.induk_eq_num,
      indukDesc: row.induk_desc,
      durationMinutes: row.duration_minutes,
      status: row.status,
      notes: row.notes,
      didRun: row.did_run,
      damagedSubs: row.damaged_subs || [],
      timestamp: row.timestamp,
      plant: row.plant,
    });
  }

  // --- Simpan ke cache (memory-only, hilang saat refresh) ---
  dailyLogsCache.set(cKey, logsMap);

  return { data: logsMap, error: null };
}

/**
 * Insert a new log entry.
 */
export async function insertDailyLog(plant, dateStr, log) {
  if (!supabase) return { error: 'Supabase not configured' };
  const { error } = await supabase.from(T.daily_logs).insert({
    id: log.id,
    plant: log.plant || plant,
    date: dateStr,
    induk_eq_num: log.indukEqNum,
    induk_desc: log.indukDesc,
    duration_minutes: log.durationMinutes,
    status: log.status || 'Normal',
    notes: log.notes || '',
    did_run: log.didRun !== false,
    damaged_subs: log.damagedSubs || [],
    timestamp: log.timestamp || new Date().toISOString(),
  });
  return { error };
}

/**
 * Insert multiple log entries at once (mass input).
 */
export async function insertDailyLogs(plant, dateStr, logs) {
  if (!supabase) return { error: 'Supabase not configured' };
  const rows = logs.map(log => ({
    id: log.id,
    plant: log.plant || plant,
    date: log.dateStr || dateStr,
    induk_eq_num: log.indukEqNum,
    induk_desc: log.indukDesc,
    duration_minutes: log.durationMinutes,
    status: log.status || 'Normal',
    notes: log.notes || '',
    did_run: log.didRun !== false,
    damaged_subs: log.damagedSubs || [],
    timestamp: log.timestamp || new Date().toISOString(),
  }));
  const { error } = await supabase.from(T.daily_logs).insert(rows);
  return { error };
}

/**
 * Delete a log entry by id.
 */
export async function deleteDailyLog(logId) {
  if (!supabase) return { error: 'Supabase not configured' };
  const { error } = await supabase.from(T.daily_logs).delete().eq('id', logId);
  return { error };
}

// ============================================================
// USERS
// ============================================================

export async function loginUser(nik, password) {
  if (!supabase) return { data: null, error: 'Supabase not configured' };
  
  let data, error;
  try {
    const result = await supabase
      .from(T.app_users)
      .select('*')
      .eq('nik', nik)
      .single();
    data = result.data;
    error = result.error;
  } catch (networkErr) {
    return { data: null, error: 'Koneksi ke server gagal. Periksa jaringan internet Anda.' };
  }

  if (error) {
    // PGRST116 = no rows found (NIK genuinely not found)
    if (error.code === 'PGRST116') {
      return { data: null, error: 'NIK tidak ditemukan' };
    }
    // 402 / Project paused
    if (error.status === 402 || error.message?.includes('402')) {
      return { data: null, error: 'Server database sedang tidak aktif (402). Hubungi admin.' };
    }
    // 401 / Invalid API key
    if (error.status === 401 || error.message?.includes('401') || error.message?.includes('Invalid API key')) {
      return { data: null, error: 'Konfigurasi server tidak valid (401). Hubungi admin.' };
    }
    // Network / CORS / fetch error (TypeError: Failed to fetch)
    if (error.message?.includes('Failed to fetch') || error.message?.includes('NetworkError') || error.message?.includes('fetch')) {
      return { data: null, error: 'Koneksi ke server gagal. Periksa jaringan internet Anda.' };
    }
    // Generic DB error — log to console and show safe message
    console.error('[loginUser] Supabase error:', error.code, error.status, error.message);
    return { data: null, error: `Gagal terhubung ke server (${error.code || error.status || 'unknown'}). Hubungi admin.` };
  }
  
  if (!data) {
    return { data: null, error: 'NIK tidak ditemukan' };
  }

  if (data.password !== password) {
    return { data: null, error: 'Password salah' };
  }
  
  return { data, error: null };
}

export async function getUserByNik(nik) {
  if (!supabase) return { data: null, error: 'Supabase not configured' };
  const { data, error } = await supabase
    .from(T.app_users)
    .select('*')
    .eq('nik', nik)
    .single();

  if (error) return { data: null, error: 'NIK tidak ditemukan' };
  return { data, error: null };
}

export async function fetchAllUsers() {
  if (!supabase) return { data: null, error: 'Supabase not configured' };
  const { data, error } = await supabase
    .from(T.app_users)
    .select('nik, name, role, plant, jabatan, unit_name')
    .order('role')
    .order('plant')
    .order('nik');
  if (error) return { data: null, error };
  return { data, error: null };
}

export async function createUser(userData) {
  if (!supabase) return { data: null, error: 'Supabase not configured' };
  // Default password is '123' if not provided
  const newUserData = {
    ...userData,
    password: userData.password || '123'
  };
  const { data, error } = await supabase
    .from(T.app_users)
    .insert([newUserData])
    .select();
  if (error) return { data: null, error };
  return { data, error: null };
}

export async function updateUser(nik, userData) {
  if (!supabase) return { data: null, error: 'Supabase not configured' };
  const { data, error } = await supabase
    .from(T.app_users)
    .update(userData)
    .eq('nik', nik)
    .select();
  if (error) return { data: null, error };
  return { data, error: null };
}

export async function deleteUser(nik) {
  if (!supabase) return { data: null, error: 'Supabase not configured' };
  const { data, error } = await supabase
    .from(T.app_users)
    .delete()
    .eq('nik', nik);
  if (error) return { data: null, error };
  return { data, error: null };
}

// ============================================================
// GSHEET URL HISTORY
// ============================================================

/**
 * Save GSheet URL history to Supabase (hierarchy_data id=5).
 * historyArray: [{ id, url, label, addedAt }]
 */
export async function saveGSheetHistory(historyArray) {
  if (!supabase) return { error: 'Supabase not configured' };
  const { error } = await supabase
    .from(T.hierarchy_data)
    .upsert({ id: 5, data: historyArray, updated_at: new Date().toISOString() });
  return { error };
}

/**
 * Load GSheet URL history from Supabase.
 * Returns array of { id, url, label, addedAt }.
 */
export async function getGSheetHistory() {
  if (!supabase) return { data: [], error: null };
  const { data, error } = await supabase
    .from(T.hierarchy_data)
    .select('data')
    .eq('id', 5)
    .single();
  if (error) return { data: [], error: null };
  return { data: Array.isArray(data?.data) ? data.data : [], error: null };
}

// ============================================================
// VEHICLES (ZESTHLP16PA)
// ============================================================

// ── Vehicle Master & Logs (stored in hierarchy_data id=8 & id=9) ─────────────

const VEHICLE_CACHE_KEY_MASTER = 'veh_master_cache_v1';
const VEHICLE_CACHE_KEY_LOGS   = 'veh_logs_cache_v1';

export async function fetchVehicleMaster(forceRefresh = false) {
  if (!supabase) return { data: [], error: 'Supabase not configured' };

  if (!forceRefresh && memoryCache.has(VEHICLE_CACHE_KEY_MASTER)) {
    return { data: memoryCache.get(VEHICLE_CACHE_KEY_MASTER), error: null };
  }
  if (!forceRefresh) {
    try {
      const cached = sessionStorage.getItem(VEHICLE_CACHE_KEY_MASTER);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          memoryCache.set(VEHICLE_CACHE_KEY_MASTER, parsed);
          return { data: parsed, error: null };
        }
      }
    } catch (e) {}
  }

  const { data, error } = await getSystemConfig('vehicle_master', forceRefresh);
  let result = [];
  if (Array.isArray(data)) {
    result = data;
  } else if (data && Array.isArray(data.data)) {
    result = data.data;
  }

  if (error) return { data: result, error: error.message || String(error) };

  memoryCache.set(VEHICLE_CACHE_KEY_MASTER, result);
  try { sessionStorage.setItem(VEHICLE_CACHE_KEY_MASTER, JSON.stringify(result)); } catch (e) {}

  return { data: result, error: null };
}

// ── Vehicle Logs ─────────────────────────────────────────────────────────────

export async function fetchVehicleLogs(forceRefresh = false) {
  if (!supabase) return { data: [], error: 'Supabase not configured' };

  if (!forceRefresh && memoryCache.has(VEHICLE_CACHE_KEY_LOGS)) {
    return { data: memoryCache.get(VEHICLE_CACHE_KEY_LOGS), error: null };
  }
  if (!forceRefresh) {
    try {
      const cached = sessionStorage.getItem(VEHICLE_CACHE_KEY_LOGS);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) {
          memoryCache.set(VEHICLE_CACHE_KEY_LOGS, parsed);
          return { data: parsed, error: null };
        }
      }
    } catch (e) {}
  }

  const { data, error } = await getSystemConfig('vehicle_logs', forceRefresh);
  let result = [];
  if (Array.isArray(data)) {
    result = data;
  } else if (data && Array.isArray(data.data)) {
    result = data.data;
  }

  if (error) return { data: result, error: error.message || String(error) };

  memoryCache.set(VEHICLE_CACHE_KEY_LOGS, result);
  try { sessionStorage.setItem(VEHICLE_CACHE_KEY_LOGS, JSON.stringify(result)); } catch (e) {}

  return { data: result, error: null };
}

// ── Invalidate vehicle caches ────────────────────────────────────────────────
export function invalidateVehicleCache() {
  memoryCache.delete(VEHICLE_CACHE_KEY_MASTER);
  memoryCache.delete(VEHICLE_CACHE_KEY_LOGS);
  const cacheKeyMaster = `sys_cfg_${T.hierarchy_data}_8`;
  const cacheKeyLogs   = `sys_cfg_${T.hierarchy_data}_9`;
  memoryCache.delete(cacheKeyMaster);
  memoryCache.delete(cacheKeyLogs);
  try { sessionStorage.removeItem(VEHICLE_CACHE_KEY_MASTER); } catch (e) {}
  try { sessionStorage.removeItem(VEHICLE_CACHE_KEY_LOGS); } catch (e) {}
  try { sessionStorage.removeItem(cacheKeyMaster); } catch (e) {}
  try { sessionStorage.removeItem(cacheKeyLogs); } catch (e) {}
  try { localStorage.removeItem(cacheKeyMaster); } catch (e) {}
  try { localStorage.removeItem(cacheKeyLogs); } catch (e) {}
}

// ── Save Vehicle Data (stored in hierarchy_data id=8 & id=9) ─────────────────

export async function saveVehicleData(vehicles, logs) {
  if (!supabase) return { error: 'Supabase not configured' };

  invalidateVehicleCache();

  // Clear data
  if ((!vehicles || vehicles.length === 0) && (!logs || logs.length === 0)) {
    const vErr = await saveSystemConfig('vehicle_master', []);
    const lErr = await saveSystemConfig('vehicle_logs', []);
    invalidateVehicleCache();
    return { data: { vehicles: [], logs: [] }, error: vErr?.error || lErr?.error || null };
  }

  // Fetch current data to merge so different plants do not overwrite each other
  const { data: currentVehicles } = await fetchVehicleMaster(true);
  const { data: currentLogs } = await fetchVehicleLogs(true);

  // Merge vehicles by vehicle_code
  const vehicleMap = new Map();
  (currentVehicles || []).forEach(v => {
    if (v && v.vehicle_code) vehicleMap.set(v.vehicle_code, v);
  });
  (vehicles || []).forEach(v => {
    if (v && v.vehicle_code) vehicleMap.set(v.vehicle_code, v);
  });
  const mergedVehicles = Array.from(vehicleMap.values());

  // Merge logs:
  // Identify plants in incoming logs
  const incomingPlants = new Set((logs || []).map(l => l.plant).filter(Boolean));
  let mergedLogs = [];
  if (incomingPlants.size > 0) {
    const otherPlantLogs = (currentLogs || []).filter(l => !incomingPlants.has(l.plant));
    mergedLogs = [...otherPlantLogs, ...(logs || [])];
  } else {
    mergedLogs = logs || [];
  }

  const vErr = await saveSystemConfig('vehicle_master', mergedVehicles);
  if (vErr?.error) return { error: vErr.error };

  const lErr = await saveSystemConfig('vehicle_logs', mergedLogs);
  if (lErr?.error) return { error: lErr.error };

  invalidateVehicleCache();
  return { data: { vehicles: mergedVehicles, logs: mergedLogs }, error: null };
}


export async function fetchZCOData(forceRefresh = false) {
  const { data, error } = await getSystemConfig('zco_data', forceRefresh);
  if (error || !Array.isArray(data)) { const errorMsg = error ? error.message : `Not array: type=${typeof data}, isNull=${data === null}, preview=${typeof data === "string" ? data.substring(0, 30) : JSON.stringify(data).substring(0, 30)}`; return { data: [], error: errorMsg }; }
  return { data, error: null };
}

export async function saveZCOData(zcoList) {
  const { error } = await saveSystemConfig('zco_data', zcoList);
  return { error };
}

// ============================================================
// LIVE CHATS (id=11)
// ============================================================

export async function fetchLiveChats() {
  const { data, error } = await getSystemConfig('live_chats');
  if (error || !Array.isArray(data)) { const errorMsg = error ? error.message : `Not array: type=${typeof data}, isNull=${data === null}, preview=${typeof data === "string" ? data.substring(0, 30) : JSON.stringify(data).substring(0, 30)}`; return { data: [], error: errorMsg }; }
  return { data, error: null };
}

export async function saveLiveChats(chats) {
  const { error } = await saveSystemConfig('live_chats', chats);
  return { error };
}

// ============================================================
// WHATSAPP AUTO-SEND CONFIG & LOGS (id=12, id=13)
// ============================================================

export async function fetchWAConfig() {
  const { data, error } = await getSystemConfig('wa_config');
  const STRICT_PROD_GROUPS = ['120363430505509462'];
  const defaultConfig = {
    targetPhone: '120363430505509462@g.us',
    targetGroup: 'Grup ID 120363430505509462@g.us',
    provider: 'gowa',
    gowaUrl: 'https://gowa.afratarigan.my.id',
    gowaUser: 'admin',
    gowaPass: 'Sedap321#',
    gowaDevice: '6285135734210@s.whatsapp.net', // Device: 6285135734210@s.whatsapp.net (Plant Maintenance PM)
    autoSendEnabled: false,
    sendTime: '07:00, 08:00, 14:00 & 16:00 WIB',
  };
  if (error || !data || typeof data !== 'object') {
    return { data: defaultConfig, error: null };
  }
  const merged = { ...defaultConfig, ...data };
  if (IS_DEV_ENV && merged.targetPhone && STRICT_PROD_GROUPS.some(id => String(merged.targetPhone).includes(id))) {
    merged.targetPhone = '120363430505509462@g.us';
    merged.targetGroup = 'Grup ID 120363430505509462@g.us';
  }
  return { data: merged, error: null };
}

export async function saveWAConfig(configObj) {
  const { error } = await saveSystemConfig('wa_config', configObj);
  return { error };
}

export async function fetchWALogs() {
  const { data, error } = await getSystemConfig('wa_logs');
  if (error || !Array.isArray(data)) { const errorMsg = error ? error.message : `Not array: type=${typeof data}, isNull=${data === null}, preview=${typeof data === "string" ? data.substring(0, 30) : JSON.stringify(data).substring(0, 30)}`; return { data: [], error: errorMsg }; }
  return { data, error: null };
}

export async function saveWALog(logEntry) {
  const { data: logs } = await fetchWALogs();
  const updatedLogs = [logEntry, ...(logs || [])].slice(0, 100);
  const { error } = await saveSystemConfig('wa_logs', updatedLogs);
  return { error };
}

// ============================================================
// WORK ORDER DATA (IW39, ZVTAB, EXPORT046)
// ============================================================

export async function fetchIW39Data() {
  const { data, error } = await getSystemConfig('iw39_data');
  if (error || !Array.isArray(data)) return { data: [], error: error ? error.message : 'Not array' };
  return { data, error: null };
}

export async function saveIW39Data(data) {
  return await saveSystemConfig('iw39_data', data);
}

export async function fetchZvtabData() {
  const { data } = await getSystemConfig('zvtab_data');
  return { data: typeof data === 'object' ? data : {}, error: null };
}

export async function saveZvtabData(data) {
  return await saveSystemConfig('zvtab_data', data);
}

export async function fetchExport046Data() {
  const { data } = await getSystemConfig('export046_data');
  return { data: typeof data === 'object' ? data : {}, error: null };
}

export async function saveExport046Data(data) {
  return await saveSystemConfig('export046_data', data);
}

// ============================================================
// IMPORT LOG HISTORY (id=14)
// Stores GSheet import audit trail for debugging sync issues.
// ============================================================

/**
 * Append a new entry to the import log.
 * Entry: { id, timestamp, user, sourceUrl, totalRecords, inserted, updated, failed, durationMs }
 */
export async function saveImportLog(logEntry) {
  const { data: existing } = await getSystemConfig('import_logs');
  const logs = Array.isArray(existing) ? existing : [];
  const updated = [logEntry, ...logs].slice(0, 50); // keep last 50
  const { error } = await saveSystemConfig('import_logs', updated);
  return { error };
}

/**
 * Fetch the import log history.
 * Returns array of log entries sorted newest first.
 */
export async function getImportLogs() {
  const { data, error } = await getSystemConfig('import_logs');
  if (error || !Array.isArray(data)) return { data: [], error: null };
  return { data, error: null };
}

// ============================================================
// KNOWLEDGE BASE (id=18)
// Stores Q&A knowledge base & FAQ items for DEV settings and Chatbot
// ============================================================
export async function fetchKnowledgeBase(forceRefresh = false) {
  const { data, error } = await getSystemConfig('knowledge_base', forceRefresh);
  if (error || !Array.isArray(data)) return { data: null, error };
  return { data, error: null };
}

export async function saveKnowledgeBase(dataList) {
  return await saveSystemConfig('knowledge_base', dataList);
}
