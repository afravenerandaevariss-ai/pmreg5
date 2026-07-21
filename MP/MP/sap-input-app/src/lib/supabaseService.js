import { supabase } from '../lib/supabase';

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
    await supabase.from('master_equipment').delete().eq('plant', plant);
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

  const { error } = await supabase.from('master_equipment').insert(rows);
  return { error };
}

/**
 * Fetch all master equipment from Supabase.
 * Returns array in the app's internal format.
 */
export async function fetchMasterEquipment() {
  if (!supabase) return { data: null, error: 'Supabase not configured' };

  const { data, error } = await supabase
    .from('master_equipment')
    .select('*')
    .order('plant')
    .order('eq_num');

  if (error) return { data: null, error };

  const equipments = data.map(row => ({
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

  return { data: equipments, error: null };
}

/**
 * Update reading for a single equipment.
 */
export async function updateEquipmentReading(eqNum, reading) {
  if (!supabase) return;
  await supabase
    .from('master_equipment')
    .update({ reading: parseFloat(reading) || 0, updated_at: new Date().toISOString() })
    .eq('eq_num', eqNum);
}

/**
 * Bulk update readings for multiple equipments.
 */
export async function bulkUpdateReadings(equipmentsArray) {
  if (!supabase) return;
  for (const eq of equipmentsArray) {
    await supabase
      .from('master_equipment')
      .update({ reading: parseFloat(eq.reading) || 0, updated_at: new Date().toISOString() })
      .eq('eq_num', eq.eqNum);
  }
}

// ============================================================
// HIERARCHY DATA
// ============================================================

export async function uploadHierarchyData(hierarchyObj) {
  if (!supabase) return { error: 'Supabase not configured' };
  const { error } = await supabase
    .from('hierarchy_data')
    .upsert({ id: 1, data: hierarchyObj, updated_at: new Date().toISOString() });
  return { error };
}

export async function fetchHierarchyData() {
  if (!supabase) return { data: null, error: 'Supabase not configured' };
  const { data, error } = await supabase
    .from('hierarchy_data')
    .select('data')
    .eq('id', 1)
    .single();
  if (error) return { data: null, error };
  return { data: data?.data || null, error: null };
}

export async function saveSystemConfig(id, dataObj) {
  if (!supabase) return { error: 'Supabase not configured' };
  let numericId = 4;
  if (id === 'master_map') numericId = 2;
  else if (id === 'template_data') numericId = 3;
  else if (id === 'sap_synced_dates') numericId = 5;
  else if (id === 'ik17_raw_data') numericId = 7;
  else if (id === 'vehicle_master') numericId = 8;
  else if (id === 'vehicle_logs') numericId = 9;
  else if (id === 'zco_data') numericId = 10;
  else if (id === 'live_chats') numericId = 11;
  
  const { error } = await supabase
    .from('hierarchy_data')
    .upsert({ id: numericId, data: dataObj, updated_at: new Date().toISOString() });
  return { error };
}

export async function getSystemConfig(id) {
  if (!supabase) return { data: null, error: 'Supabase not configured' };
  let numericId = 4;
  if (id === 'master_map') numericId = 2;
  else if (id === 'template_data') numericId = 3;
  else if (id === 'sap_synced_dates') numericId = 5;
  else if (id === 'ik17_raw_data') numericId = 7;
  else if (id === 'vehicle_master') numericId = 8;
  else if (id === 'vehicle_logs') numericId = 9;
  else if (id === 'zco_data') numericId = 10;
  else if (id === 'live_chats') numericId = 11;

  const { data, error } = await supabase
    .from('hierarchy_data')
    .select('data')
    .eq('id', numericId)
    .single();
  if (error) return { data: null, error };
  return { data: data?.data || null, error: null };
}

// ============================================================
// DAILY LOGS
// ============================================================

/**
 * Fetch daily logs for a specific plant and date range (month).
 */
export async function fetchDailyLogs(plant, yearMonth) {
  if (!supabase) return { data: null, error: 'Supabase not configured' };

  let allData = [];
  let from = 0;
  const PAGE_SIZE = 1000;
  let fetchError = null;

  while (true) {
    let pageQuery = supabase.from('daily_logs').select('*');
    if (plant && plant !== 'ALL') pageQuery = pageQuery.eq('plant', plant);
    if (yearMonth) {
      const startDate = `${yearMonth}-01`;
      const endDate = `${yearMonth}-31`;
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
  return { data: logsMap, error: null };
}

/**
 * Insert a new log entry.
 */
export async function insertDailyLog(plant, dateStr, log) {
  if (!supabase) return { error: 'Supabase not configured' };
  const { error } = await supabase.from('daily_logs').insert({
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
  const { error } = await supabase.from('daily_logs').insert(rows);
  return { error };
}

/**
 * Delete a log entry by id.
 */
export async function deleteDailyLog(logId) {
  if (!supabase) return { error: 'Supabase not configured' };
  const { error } = await supabase.from('daily_logs').delete().eq('id', logId);
  return { error };
}

// ============================================================
// USERS
// ============================================================

export async function loginUser(nik, password) {
  if (!supabase) return { data: null, error: 'Supabase not configured' };
  const { data, error } = await supabase
    .from('app_users')
    .select('*')
    .eq('nik', nik)
    .single();

  if (error) return { data: null, error: 'NIK tidak ditemukan' };
  
  if (data.password !== password) {
    return { data: null, error: 'Password salah' };
  }
  
  return { data, error: null };
}

export async function fetchAllUsers() {
  if (!supabase) return { data: null, error: 'Supabase not configured' };
  const { data, error } = await supabase
    .from('app_users')
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
    .from('app_users')
    .insert([newUserData])
    .select();
  if (error) return { data: null, error };
  return { data, error: null };
}

export async function updateUser(nik, userData) {
  if (!supabase) return { data: null, error: 'Supabase not configured' };
  const { data, error } = await supabase
    .from('app_users')
    .update(userData)
    .eq('nik', nik)
    .select();
  if (error) return { data: null, error };
  return { data, error: null };
}

export async function deleteUser(nik) {
  if (!supabase) return { data: null, error: 'Supabase not configured' };
  const { data, error } = await supabase
    .from('app_users')
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
    .from('hierarchy_data')
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
    .from('hierarchy_data')
    .select('data')
    .eq('id', 5)
    .single();
  if (error) return { data: [], error: null };
  return { data: Array.isArray(data?.data) ? data.data : [], error: null };
}

// ============================================================
// VEHICLES (ZESTHLP16PA)
// ============================================================

export async function fetchVehicleMaster() {
  const { data, error } = await getSystemConfig('vehicle_master');
  if (error || !Array.isArray(data)) return { data: [], error: null };
  return { data, error: null };
}

export async function fetchVehicleLogs() {
  const { data, error } = await getSystemConfig('vehicle_logs');
  if (error || !Array.isArray(data)) return { data: [], error: null };
  return { data, error: null };
}

export async function saveVehicleData(vehicles, logs) {
  const vErr = await saveSystemConfig('vehicle_master', vehicles);
  if (vErr.error) return { error: vErr.error };
  const lErr = await saveSystemConfig('vehicle_logs', logs);
  return { error: lErr.error || null };
}

export async function fetchZCOData() {
  const { data, error } = await getSystemConfig('zco_data');
  if (error || !Array.isArray(data)) return { data: [], error: null };
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
  if (error || !Array.isArray(data)) return { data: [], error: null };
  return { data, error: null };
}

export async function saveLiveChats(chats) {
  const { error } = await saveSystemConfig('live_chats', chats);
  return { error };
}

