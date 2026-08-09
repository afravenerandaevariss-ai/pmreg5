import * as XLSX from 'xlsx';
import { format } from 'date-fns';

/**
 * Forces specific columns in a worksheet to text (string) type.
 * Prevents large numbers (e.g. Equipment Number, Measuring Point) from
 * being displayed as scientific notation (1E+11) in Excel.
 */
function forceColumnsAsText(ws, colIndices) {
  if (!ws['!ref']) return;
  const range = XLSX.utils.decode_range(ws['!ref']);
  colIndices.forEach(C => {
    if (C < 0) return;
    for (let R = range.s.r; R <= range.e.r; ++R) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C });
      const cell = ws[addr];
      if (cell) {
        cell.t = 's';
        cell.v = String(cell.v);
        cell.z = '@'; // text format
        delete cell.w;
      }
    }
  });
}

/**
 * Read Master EQ and extract mapping from Equipment Number to MaintPlant
 * Returns a Map: Map<string, string> (Equipment Number -> MaintPlant)
 */
export async function parseMasterEQ(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(firstSheet);
        
        const map = new Map();
        
        const getValue = (row, aliases) => {
          const keys = Object.keys(row);
          for (const alias of aliases) {
            // exact match
            if (row[alias] !== undefined) return row[alias];
            // case insensitive match
            const foundKey = keys.find(k => k.toLowerCase() === alias.toLowerCase() || k.toLowerCase().trim() === alias.toLowerCase());
            if (foundKey) return row[foundKey];
          }
          return undefined;
        };

        jsonData.forEach(row => {
          const eq = getValue(row, ['Equipment', 'Equipment Number', 'Eq. Number']);
          const plant = getValue(row, ['MaintPlant', 'Maint. Plant', 'Plant', 'Maintenance Plant']);
          const description = getValue(row, ['Description', 'Equipment Description', 'Eq. Description']);
          const functionalLoc = getValue(row, ['Functional Loc.', 'Functional Location', 'Func. Loc.']);
          const flDescription = getValue(row, ['Description2', 'FL Description']);
          const costCenter = getValue(row, ['Cost Center', 'Cost center', 'Cost Ctr', 'Cost Ctr.']);
          
          if (eq) {
            map.set(String(eq), {
              plant: String(plant || 'Unknown'),
              description: String(description || ''),
              functionalLoc: String(functionalLoc || ''),
              flDescription: String(flDescription || ''),
              costCenter: String(costCenter || '')
            });
          }
        });
        
        resolve(map);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Parse REGIONAL 5 MP.xlsx into an array of equipment objects
 */
export async function parseRegionalMP(file, masterMap) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];
        
        // Need to preserve the exact header names for export later
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        if (jsonData.length < 2) {
          throw new Error("Invalid Regional MP format");
        }
        
        const headers = jsonData[0];
        const eqColIdx = headers.findIndex(h => typeof h === 'string' && h.includes('Equipment Number'));
        const descColIdx = headers.findIndex(h => typeof h === 'string' && h.includes('Equipment Description'));
        const measuringPtIdx = headers.findIndex(h => typeof h === 'string' && h.includes('Measuring point'));
        const readingIdx = headers.findIndex(h => typeof h === 'string' && h.includes('Counter Reading'));
        
        const equipments = [];
        const originalData = [];
        const allDescriptions = [];
        
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0) continue;
          originalData.push(row);
          const desc = String(row[descColIdx] || '').trim();
          if (desc) allDescriptions.push(desc);
        }
        
        // Sort descriptions by length ascending for parent matching
        allDescriptions.sort((a, b) => a.length - b.length);
        
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0) continue;
          
          const eqNum = String(row[eqColIdx] || '').trim();
          if (!eqNum) continue;
          
          let plant = 'Uncategorized';
          let costCenter = '';
          let masterDescription = '';
          
          const eqNumNorm = eqNum.replace(/^0+/, '');
          // Try exact match first, then normalized match
          const masterInfo = masterMap.get(eqNum) || masterMap.get(eqNumNorm);
          
          if (masterInfo) {
            plant = typeof masterInfo === 'string' ? masterInfo : masterInfo.plant;
            if (typeof masterInfo === 'object') {
              costCenter = masterInfo.costCenter || '';
              masterDescription = masterInfo.description || '';
            }
          }
          
          const description = masterDescription || String(row[descColIdx] || '').trim();
          
          let parentEquipment = (typeof masterInfo === 'object' && masterInfo.induk) ? masterInfo.induk : description;
          if (!parentEquipment || parentEquipment === description) {
            // Pass 1: suffix match
            for (const p of allDescriptions) {
              if (p !== description && description.endsWith(p)) {
                parentEquipment = p;
                break;
              }
            }
            // Pass 2: substring containment match
            if (parentEquipment === description) {
              for (const p of allDescriptions) {
                if (p !== description && p.length < description.length && description.includes(p)) {
                  parentEquipment = p;
                  break;
                }
              }
            }
          }
          
          equipments.push({
            rowIndex: i - 1,
            no: row[0],
            eqNum: eqNum,
            description: description,
            induk: parentEquipment,
            parentEquipment: parentEquipment,
            measuringPoint: row[measuringPtIdx] || '',
            plant: plant,
            costCenter: costCenter,
            reading: row[readingIdx] || '',
          });
        }
        
        resolve({ headers, equipments, originalData });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Validate that no single induk equipment has total running hours > 24 in any single date.
 *
 * @param {Object} dailyLogsMap  - { 'yyyy-MM-dd': [ { indukEqNum, indukDesc, durationMinutes, plant, ... } ] }
 * @param {string} startDate     - 'yyyy-MM-dd' (inclusive)
 * @param {string} endDate       - 'yyyy-MM-dd' (inclusive)
 * @param {string[]} [selectedEqs] - optional filter by indukEqNum
 *
 * @returns {{ valid: boolean, violations: Array<{ date: string, indukEqNum: string, indukDesc: string, totalMinutes: number }> }}
 */
export function validateDailyHours(dailyLogsMap, startDate, endDate, selectedEqs, isAfraUser) {
  if (isAfraUser) return { valid: true, violations: [] };
  const MAX_MINUTES_PER_DAY = 24 * 60; // 1440 minutes
  const violations = [];

  const dates = Object.keys(dailyLogsMap).sort();
  dates.forEach(dateStr => {
    if (dateStr < startDate || dateStr > endDate) return;

    const logs = dailyLogsMap[dateStr];
    if (!logs || logs.length === 0) return;

    // Accumulate minutes per induk for this date
    const minutesPerInduk = {}; // indukEqNum -> { totalMinutes, indukDesc }
    logs.forEach(log => {
      if (selectedEqs && selectedEqs.length > 0 && !selectedEqs.includes(log.indukEqNum)) return;
      const key = log.indukEqNum || log.indukDesc || 'UNKNOWN';
      if (!minutesPerInduk[key]) {
        minutesPerInduk[key] = { totalMinutes: 0, indukDesc: log.indukDesc || log.indukEqNum || 'Unknown' };
      }
      minutesPerInduk[key].totalMinutes += (log.durationMinutes || 0);
    });

    // Check each induk
    Object.entries(minutesPerInduk).forEach(([indukKey, data]) => {
      if (data.totalMinutes > MAX_MINUTES_PER_DAY) {
        violations.push({
          date: dateStr,
          indukEqNum: indukKey,
          indukDesc: data.indukDesc,
          totalMinutes: data.totalMinutes,
        });
      }
    });
  });

  return {
    valid: violations.length === 0,
    violations,
  };
}

/**
 * Generate Export Excel file
 */
export function exportToSAP(headers, originalData, updatedEquipments, docDetails) {
  // Strip \r from headers to prevent double \r\r\n corruption
  const cleanHeaders = headers.map(h => typeof h === 'string' ? h.replace(/\r/g, '') : h);
  const wsData = [cleanHeaders];
  
  // Clone original data to avoid mutating state directly
  const dataToExport = JSON.parse(JSON.stringify(originalData));
  
  // Format dates for SAP (DD.MM.YYYY)
  const dateParts = docDetails.date.split('-');
  const sapDate = dateParts.length === 3 ? `${dateParts[2]}.${dateParts[1]}.${dateParts[0]}` : docDetails.date;
  const sapTime = docDetails.time.length === 5 ? `${docDetails.time}:00` : docDetails.time;
  
  const dateIdx = headers.findIndex(h => typeof h === 'string' && h.includes('Measurement Date'));
  const timeIdx = headers.findIndex(h => typeof h === 'string' && h.includes('Measurement Time'));
  const readingIdx = headers.findIndex(h => typeof h === 'string' && h.includes('Counter Reading'));
  const diffIdx = headers.findIndex(h => typeof h === 'string' && h.startsWith('Difference'));
  const readByIdx = headers.findIndex(h => typeof h === 'string' && h.includes('Read By'));
  const shortTextIdx = headers.findIndex(h => typeof h === 'string' && h.includes('Short Text'));
  
  // Update dataToExport with new values
  updatedEquipments.forEach(eq => {
    const rowIdx = eq.rowIndex;
    if (dataToExport[rowIdx]) {
      // Ensure row is long enough
      const maxColIdx = Math.max(dateIdx, timeIdx, readingIdx, diffIdx, readByIdx, shortTextIdx);
      while (dataToExport[rowIdx].length <= maxColIdx) {
        dataToExport[rowIdx].push("");
      }
      
      if (dateIdx !== -1) dataToExport[rowIdx][dateIdx] = sapDate;
      if (timeIdx !== -1) dataToExport[rowIdx][timeIdx] = sapTime;
      if (readingIdx !== -1) dataToExport[rowIdx][readingIdx] = eq.reading ? String(eq.reading).replace('.', ',') : eq.reading;
      const readByVal = (docDetails.readBy && docDetails.readBy.trim() ? docDetails.readBy.trim() : 'ADMIN').substring(0, 12);
      if (readByIdx !== -1) dataToExport[rowIdx][readByIdx] = readByVal;
      if (shortTextIdx !== -1) dataToExport[rowIdx][shortTextIdx] = docDetails.shortText;
      // You might want to update diffIdx if needed.
    }
  });
  
  wsData.push(...dataToExport);
  
  // Renumber 'No. Urut' column (always column 0) starting from 1
  for (let i = 1; i < wsData.length; i++) {
    if (wsData[i] && wsData[i].length > 0) wsData[i][0] = i;
  }

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  // Force Equipment Number and Measuring Point columns as text to prevent 1E+11 scientific notation
  const _eqNumIdx = headers.findIndex(h => typeof h === 'string' && h.includes('Equipment Number'));
  const _mpIdx = headers.findIndex(h => typeof h === 'string' && h.includes('Measuring point'));
  forceColumnsAsText(ws, [_eqNumIdx, _mpIdx]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  
  XLSX.writeFile(wb, `SAP_Export_${format(new Date(), 'yyyyMMdd_HHmmss')}.xlsx`);
}

/**
 * Build parentDescToEqNum and eqToParentEqNum for robust parent-child HM resolution.
 * - parentDescToEqNum: Map<Parent Description, Parent EqNum>
 * - eqToParentEqNum: Map<Equipment EqNum, Parent EqNum>
 */
function buildParentChildMaps(equipments) {
  const parentDescToEqNum = {};
  const parentEqNumsSet = new Set();
  
  // Pass 1: Register true parents with plant isolation key: `${plant}_${parentDesc}`
  equipments.forEach(eq => {
    const eqKey = String(eq.eqNum || eq.eq_num || '').trim();
    const desc = String(eq.description || '').trim();
    const pDesc = String(eq.induk || eq.parentEquipment || desc).trim();
    const plant = String(eq.plant || '').trim().toUpperCase();
    if (eqKey && desc && (desc === pDesc || eq.type === 'Induk')) {
      const key = plant ? `${plant}_${desc}` : desc;
      parentDescToEqNum[key] = eqKey;
      parentEqNumsSet.add(eqKey);
    }
  });

  // Pass 2: Fallback — register any equipment whose desc has no parent registered yet per plant
  equipments.forEach(eq => {
    const eqKey = String(eq.eqNum || eq.eq_num || '').trim();
    const desc = String(eq.description || '').trim();
    const plant = String(eq.plant || '').trim().toUpperCase();
    const key = plant ? `${plant}_${desc}` : desc;
    if (eqKey && desc && !parentDescToEqNum[key]) {
      let isSub = false;
      const prefix = plant ? `${plant}_` : '';
      for (const pKey of Object.keys(parentDescToEqNum)) {
        if (!prefix || pKey.startsWith(prefix)) {
          const pDesc = prefix ? pKey.substring(prefix.length) : pKey;
          if (desc !== pDesc && desc.includes(pDesc)) {
            isSub = true;
            break;
          }
        }
      }
      if (!isSub) {
        parentDescToEqNum[key] = eqKey;
        parentEqNumsSet.add(eqKey);
      }
    }
  });

  // Pass 3: Map every eqKey -> Parent EqNum
  const eqToParentEqNum = {};
  equipments.forEach(eq => {
    const eqKey = String(eq.eqNum || eq.eq_num || '').trim();
    const desc = String(eq.description || '').trim();
    const pDesc = String(eq.induk || eq.parentEquipment || desc).trim();
    const plant = String(eq.plant || '').trim().toUpperCase();
    
    const key = plant ? `${plant}_${pDesc}` : pDesc;
    let pEqNum = parentDescToEqNum[key];
    if (!pEqNum) {
      let bestLen = 0;
      const prefix = plant ? `${plant}_` : '';
      for (const [pKey, parentNum] of Object.entries(parentDescToEqNum)) {
        if (!prefix || pKey.startsWith(prefix)) {
          const parentDesc = prefix ? pKey.substring(prefix.length) : pKey;
          if (desc.includes(parentDesc) && parentDesc.length > bestLen) {
            bestLen = parentDesc.length;
            pEqNum = parentNum;
          }
        }
      }
    }
    eqToParentEqNum[eqKey] = pEqNum || eqKey;
  });

  return { parentDescToEqNum, eqToParentEqNum };
}

export function exportDailyToSAP(headers, originalData, equipments, dailyLogsMap, docDetails) {
  // Strip \r from headers to prevent double \r\r\n corruption
  const cleanHeaders = headers.map(h => typeof h === 'string' ? h.replace(/\r/g, '') : h);
  const wsData = [cleanHeaders];

  // Only use logs from the selected date
  const selectedDate = docDetails.date; // format 'yyyy-MM-dd'
  const todaysLogs = dailyLogsMap[selectedDate] || [];

  const { eqToParentEqNum } = buildParentChildMaps(equipments);

  // STEP 1: Aggregate HM to Family Parent EqNum
  const parentHmMap = {}; // { [parentEqNum]: totalHours }
  todaysLogs.forEach(log => {
    const logEqNum = String(log.indukEqNum || log.induk_eq_num || '').trim();
    if (!logEqNum) return;
    if (docDetails.selectedEqs && docDetails.selectedEqs.length > 0 && !docDetails.selectedEqs.includes(logEqNum)) return;
    const pEqNum = eqToParentEqNum[logEqNum] || logEqNum;
    const durationHours = (log.durationMinutes || 0) / 60;
    parentHmMap[pEqNum] = (parentHmMap[pEqNum] || 0) + durationHours;
  });

  // STEP 2: Resolve HM per template row — parent and all sub-equipments get parentHmMap[pEqNum]
  const dailyDurations = {};
  equipments.forEach(eq => {
    const eqKey = String(eq.eqNum || eq.eq_num || '').trim();
    if (!eqKey) return;
    const pEqNum = eqToParentEqNum[eqKey] || eqKey;
    dailyDurations[eqKey] = parentHmMap[pEqNum] || 0;
  });

  const dateParts = docDetails.date.split('-');
  const sapDate = dateParts.length === 3 ? `${dateParts[2]}.${dateParts[1]}.${dateParts[0]}` : docDetails.date;
  const sapTime = docDetails.time.length === 5 ? `${docDetails.time}:00` : docDetails.time;
  
  const dateIdx = headers.findIndex(h => typeof h === 'string' && (h.includes('Measurement Date') || h.toLowerCase().includes('date')));
  const timeIdx = headers.findIndex(h => typeof h === 'string' && (h.includes('Measurement Time') || h.toLowerCase().includes('time')));
  const readingIdx = headers.findIndex(h => typeof h === 'string' && (h.includes('Counter Reading') || h.toLowerCase().includes('reading')));
  const readByIdx = headers.findIndex(h => typeof h === 'string' && (h.includes('Read By') || h.toLowerCase().includes('read by')));
  let shortTextIdx = headers.findIndex(h => typeof h === 'string' && h.toLowerCase().includes('short text'));
  if (shortTextIdx === -1) shortTextIdx = 10;

  const processedRowIndices = new Set();
  const exportedEqKeys = new Set();

  equipments.forEach((eq) => {
    const rowIdx = eq.rowIndex;
    if (rowIdx === undefined || !originalData[rowIdx]) return;
    if (processedRowIndices.has(rowIdx)) return;
    processedRowIndices.add(rowIdx);

    const eqKey = String(eq.eqNum || eq.eq_num || '').trim();
    if (eqKey) exportedEqKeys.add(eqKey);

    const duration = dailyDurations[eqKey] || 0;
    const rowData = [...originalData[rowIdx]]; 
    
    const maxColIdx = Math.max(dateIdx, timeIdx, readingIdx, readByIdx, shortTextIdx);
    while (rowData.length <= maxColIdx) {
      rowData.push("");
    }

    // Format reading: no trailing decimals for whole numbers
    let readingStr = duration.toString();
    if (!Number.isInteger(duration)) {
      readingStr = duration.toFixed(2);
    }
    readingStr = readingStr.replace('.', ',');
    
    if (dateIdx !== -1) rowData[dateIdx] = sapDate;
    if (timeIdx !== -1) rowData[timeIdx] = sapTime;
    if (readingIdx !== -1) rowData[readingIdx] = readingStr;
    const readByVal = (docDetails.readBy && docDetails.readBy.trim() ? docDetails.readBy.trim() : 'ADMIN').substring(0, 12);
    if (readByIdx !== -1) rowData[readByIdx] = readByVal;
    
    const plantCodeStr = eq.plant || '5F01';
    let note = `HM Mesin ${plantCodeStr} tgl ${sapDate.replace(/\./g, '-')}`;
    if (note.length > 30) note = note.substring(0, 30);
    if (shortTextIdx !== -1) rowData[shortTextIdx] = note;
    for (let c = 0; c < rowData.length; c++) {
      if (typeof rowData[c] === 'string' && rowData[c].toLowerCase().includes('import gsheet')) {
        rowData[c] = note;
      }
    }
    
    wsData.push(rowData);
  });

  // FALLBACK: Include logged equipments that were NOT present in the template originalData
  todaysLogs.forEach(log => {
    const logEqNum = String(log.indukEqNum || log.induk_eq_num || '').trim();
    if (!logEqNum || exportedEqKeys.has(logEqNum)) return;
    exportedEqKeys.add(logEqNum);

    const duration = dailyDurations[logEqNum] || (log.durationMinutes / 60) || 0;
    const newRow = new Array(cleanHeaders.length).fill('');

    const eqColIdx = cleanHeaders.findIndex(h => typeof h === 'string' && h.includes('Equipment Number'));
    const descColIdx = cleanHeaders.findIndex(h => typeof h === 'string' && h.includes('Equipment Description'));

    if (eqColIdx !== -1) newRow[eqColIdx] = logEqNum;
    if (descColIdx !== -1) newRow[descColIdx] = log.indukDesc || log.induk_desc || logEqNum;
    if (dateIdx !== -1) newRow[dateIdx] = sapDate;
    if (timeIdx !== -1) newRow[timeIdx] = sapTime;

    let readingStr = duration.toString();
    if (!Number.isInteger(duration)) readingStr = duration.toFixed(2);
    readingStr = readingStr.replace('.', ',');
    if (readingIdx !== -1) newRow[readingIdx] = readingStr;

    const readByVal = (docDetails.readBy && docDetails.readBy.trim() ? docDetails.readBy.trim() : 'ADMIN').substring(0, 12);
    if (readByIdx !== -1) newRow[readByIdx] = readByVal;

    const plantCodeStr = log.plant || '5F01';
    let note = `HM Mesin ${plantCodeStr} tgl ${sapDate.replace(/\./g, '-')}`;
    if (note.length > 30) note = note.substring(0, 30);
    if (shortTextIdx !== -1) newRow[shortTextIdx] = note;

    wsData.push(newRow);
  });

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  
  // Renumber 'No. Urut' column (column 0) starting from 1
  for (let i = 1; i < wsData.length; i++) {
    if (wsData[i] && wsData[i].length > 0) wsData[i][0] = i;
  }
  // Re-apply sheet with renumbered data
  const ws2 = XLSX.utils.aoa_to_sheet(wsData);
  // Force Equipment Number and Measuring Point columns as text to prevent 1E+11 scientific notation
  const _eqIdx = headers.findIndex(h => typeof h === 'string' && h.includes('Equipment Number'));
  const _mpIdx = headers.findIndex(h => typeof h === 'string' && h.includes('Measuring point'));
  forceColumnsAsText(ws2, [_eqIdx, _mpIdx]);
  const wb2 = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb2, ws2, "Sheet1");
  
  const plantCode = (docDetails.plant || 'ALL').toLowerCase();
  const selectedDateObj = new Date(docDetails.date);
  const dateStr = format(selectedDateObj, 'ddMMyy');
  const fileName = `hm${plantCode}-${dateStr}.xlsx`;
  
  XLSX.writeFile(wb2, fileName);
}

/**
 * Export SAP accumulated: 1 row per equipment, total summed hours from day 1 up to selected date.
 */
export function exportAccumulatedToSAP(headers, originalData, equipments, dailyLogsMap, docDetails) {
  const cleanHeaders = headers.map(h => typeof h === 'string' ? h.replace(/\r/g, '') : h);
  const wsData = [cleanHeaders];

  const startDate = docDetails.startDate || docDetails.date;
  const endDate = docDetails.endDate || docDetails.date;
  const accDurations = {};
  const eqNotes = {};
  const loggedEquipmentsMap = {};

  const { eqToParentEqNum } = buildParentChildMaps(equipments);

  // STEP 1: Aggregate HM per parent eq num across the date range
  const parentHmMap = {}; // { [parentEqNum]: totalHours }
  Object.entries(dailyLogsMap).forEach(([dateStr, logs]) => {
    if (dateStr < startDate || dateStr > endDate) return;
    logs.forEach(log => {
      const logEqNum = String(log.indukEqNum || log.induk_eq_num || '').trim();
      if (!logEqNum) return;
      if (docDetails.selectedEqs && docDetails.selectedEqs.length > 0 && !docDetails.selectedEqs.includes(logEqNum)) return;
      const pEqNum = eqToParentEqNum[logEqNum] || logEqNum;
      const durationHours = (log.durationMinutes || 0) / 60;
      parentHmMap[pEqNum] = (parentHmMap[pEqNum] || 0) + durationHours;
      loggedEquipmentsMap[pEqNum] = log;
    });
  });

  // STEP 2: Resolve HM per template row — parent and all sub-equipments get parentHmMap[pEqNum]
  equipments.forEach(eq => {
    const eqKey = String(eq.eqNum || eq.eq_num || '').trim();
    if (!eqKey) return;
    const pEqNum = eqToParentEqNum[eqKey] || eqKey;
    accDurations[eqKey] = parentHmMap[pEqNum] || 0;
  });

  const dateParts = endDate.split('-');
  const sapDate = dateParts.length === 3 ? `${dateParts[2]}.${dateParts[1]}.${dateParts[0]}` : endDate;
  const sapTime = docDetails.time.length === 5 ? `${docDetails.time}:00` : docDetails.time;

  const dateIdx = headers.findIndex(h => typeof h === 'string' && (h.includes('Measurement Date') || h.toLowerCase().includes('date')));
  const timeIdx = headers.findIndex(h => typeof h === 'string' && (h.includes('Measurement Time') || h.toLowerCase().includes('time')));
  const readingIdx = headers.findIndex(h => typeof h === 'string' && (h.includes('Counter Reading') || h.toLowerCase().includes('reading')));
  const readByIdx = headers.findIndex(h => typeof h === 'string' && (h.includes('Read By') || h.toLowerCase().includes('read by')));
  let shortTextIdx = headers.findIndex(h => typeof h === 'string' && h.toLowerCase().includes('short text'));
  if (shortTextIdx === -1) shortTextIdx = 10;

  const processedRowIndices = new Set();
  const exportedEqKeys = new Set();

  equipments.forEach((eq) => {
    const rowIdx = eq.rowIndex;
    if (rowIdx === undefined || !originalData[rowIdx]) return;
    if (processedRowIndices.has(rowIdx)) return;
    processedRowIndices.add(rowIdx);

    const eqKey = String(eq.eqNum || eq.eq_num || '').trim();
    if (eqKey) exportedEqKeys.add(eqKey);

    const total = accDurations[eqKey] || 0;
    const rowData = [...originalData[rowIdx]];
    const maxColIdx = Math.max(dateIdx, timeIdx, readingIdx, readByIdx, shortTextIdx);
    while (rowData.length <= maxColIdx) rowData.push('');

    let readingStr = total.toString();
    if (!Number.isInteger(total)) readingStr = total.toFixed(2);
    readingStr = readingStr.replace('.', ',');

    if (dateIdx !== -1) rowData[dateIdx] = sapDate;
    if (timeIdx !== -1) rowData[timeIdx] = sapTime;
    if (readingIdx !== -1) rowData[readingIdx] = readingStr;
    const readByVal = (docDetails.readBy && docDetails.readBy.trim() ? docDetails.readBy.trim() : 'ADMIN').substring(0, 12);
    if (readByIdx !== -1) rowData[readByIdx] = readByVal;

    const plantCodeStr = eq.plant || '5F01';
    let note = `HM Mesin ${plantCodeStr} tgl ${sapDate.replace(/\./g, '-')}`;
    if (note.length > 30) note = note.substring(0, 30);
    if (shortTextIdx !== -1) rowData[shortTextIdx] = note;
    for (let c = 0; c < rowData.length; c++) {
      if (typeof rowData[c] === 'string' && rowData[c].toLowerCase().includes('import gsheet')) {
        rowData[c] = note;
      }
    }

    wsData.push(rowData);
  });

  // FALLBACK: Include logged equipments missing from originalData template
  Object.keys(loggedEquipmentsMap).forEach(eqKey => {
    if (exportedEqKeys.has(eqKey)) return;
    exportedEqKeys.add(eqKey);

    const total = accDurations[eqKey] || 0;
    if (total <= 0) return;

    const log = loggedEquipmentsMap[eqKey];
    const newRow = new Array(cleanHeaders.length).fill('');

    const eqColIdx = cleanHeaders.findIndex(h => typeof h === 'string' && h.includes('Equipment Number'));
    const descColIdx = cleanHeaders.findIndex(h => typeof h === 'string' && h.includes('Equipment Description'));

    if (eqColIdx !== -1) newRow[eqColIdx] = eqKey;
    if (descColIdx !== -1) newRow[descColIdx] = log.indukDesc || log.induk_desc || eqKey;
    if (dateIdx !== -1) newRow[dateIdx] = sapDate;
    if (timeIdx !== -1) newRow[timeIdx] = sapTime;

    let readingStr = total.toString();
    if (!Number.isInteger(total)) readingStr = total.toFixed(2);
    readingStr = readingStr.replace('.', ',');
    if (readingIdx !== -1) newRow[readingIdx] = readingStr;

    const readByVal = (docDetails.readBy && docDetails.readBy.trim() ? docDetails.readBy.trim() : 'ADMIN').substring(0, 12);
    if (readByIdx !== -1) newRow[readByIdx] = readByVal;

    const plantCodeStr = log.plant || '5F01';
    let note = `HM Mesin ${plantCodeStr} tgl ${sapDate.replace(/\./g, '-')}`;
    if (note.length > 30) note = note.substring(0, 30);
    if (shortTextIdx !== -1) newRow[shortTextIdx] = note;

    wsData.push(newRow);
  });

  // Renumber No. Urut
  for (let i = 1; i < wsData.length; i++) {
    if (wsData[i] && wsData[i].length > 0) wsData[i][0] = i;
  }
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const _eqIdx1 = headers.findIndex(h => typeof h === 'string' && h.includes('Equipment Number'));
  const _mpIdx1 = headers.findIndex(h => typeof h === 'string' && h.includes('Measuring point'));
  forceColumnsAsText(ws, [_eqIdx1, _mpIdx1]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

  const plantCode = (docDetails.plant || 'ALL').toLowerCase();
  const dateStrStart = format(new Date(startDate), 'ddMMyy');
  const dateStrEnd = format(new Date(endDate), 'ddMMyy');
  const fileName = `hm${plantCode}-akum_${dateStrStart}-${dateStrEnd}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

/**
 * Export SAP per-date up to the selected date (one row per date per equipment, not summed).
 */
export function exportCumulativeToSAP(headers, originalData, equipments, dailyLogsMap, docDetails) {
  // Strip \r from headers to prevent double \r\r\n corruption
  const cleanHeaders = headers.map(h => typeof h === 'string' ? h.replace(/\r/g, '') : h);
  const wsData = [cleanHeaders];

  const startDate = docDetails.startDate || docDetails.date;
  const endDate = docDetails.endDate || docDetails.date; // format 'yyyy-MM-dd'
  const sapTime = docDetails.time.length === 5 ? `${docDetails.time}:00` : docDetails.time;

  const dateIdx = headers.findIndex(h => typeof h === 'string' && (h.includes('Measurement Date') || h.toLowerCase().includes('date')));
  const timeIdx = headers.findIndex(h => typeof h === 'string' && (h.includes('Measurement Time') || h.toLowerCase().includes('time')));
  const readingIdx = headers.findIndex(h => typeof h === 'string' && (h.includes('Counter Reading') || h.toLowerCase().includes('reading')));
  const readByIdx = headers.findIndex(h => typeof h === 'string' && (h.includes('Read By') || h.toLowerCase().includes('read by')));
  let shortTextIdx = headers.findIndex(h => typeof h === 'string' && h.toLowerCase().includes('short text'));
  if (shortTextIdx === -1) shortTextIdx = 10;

  // Iterate each date in sorted order, up to and including selected date
  const dates = (startDate === endDate) ? [endDate] : Object.keys(dailyLogsMap).sort();

  dates.forEach(dateStr => {
    if (dateStr < startDate || dateStr > endDate) return; // only within range

    const logsForDate = dailyLogsMap[dateStr];
    if (!logsForDate || logsForDate.length === 0) return;

    const dailyDurations = {};
    const loggedEquipmentsMap = {};

    const { eqToParentEqNum } = buildParentChildMaps(equipments);

    // STEP 1: Aggregate HM per parent eq num for this date
    const parentHmMapDate = {}; // { [parentEqNum]: totalHours }
    logsForDate.forEach(log => {
      const logEqNum = String(log.indukEqNum || log.induk_eq_num || '').trim();
      if (!logEqNum) return;
      if (docDetails.selectedEqs && docDetails.selectedEqs.length > 0 && !docDetails.selectedEqs.includes(logEqNum)) return;
      const pEqNum = eqToParentEqNum[logEqNum] || logEqNum;
      const durationHours = (log.durationMinutes || 0) / 60;
      parentHmMapDate[pEqNum] = (parentHmMapDate[pEqNum] || 0) + durationHours;
      loggedEquipmentsMap[pEqNum] = log;
    });

    // STEP 2: Resolve HM per template row for this date
    equipments.forEach(eq => {
      const eqKey = String(eq.eqNum || eq.eq_num || '').trim();
      if (!eqKey) return;
      const pEqNum = eqToParentEqNum[eqKey] || eqKey;
      dailyDurations[eqKey] = parentHmMapDate[pEqNum] || 0;
    });

    const dateParts = dateStr.split('-');
    const sapDate = dateParts.length === 3 ? `${dateParts[2]}.${dateParts[1]}.${dateParts[0]}` : dateStr;

    const processedRowIndices = new Set();
    const exportedEqKeys = new Set();

    equipments.forEach((eq) => {
      const rowIdx = eq.rowIndex;
      if (rowIdx === undefined || !originalData[rowIdx]) return;
      if (processedRowIndices.has(rowIdx)) return;
      processedRowIndices.add(rowIdx);

      const eqKey = String(eq.eqNum || eq.eq_num || '').trim();
      if (eqKey) exportedEqKeys.add(eqKey);

      const duration = dailyDurations[eqKey] || 0;
      const rowData = [...originalData[rowIdx]];
      const maxColIdx = Math.max(dateIdx, timeIdx, readingIdx, readByIdx, shortTextIdx);
      while (rowData.length <= maxColIdx) rowData.push('');

      let readingStr = duration.toString();
      if (!Number.isInteger(duration)) readingStr = duration.toFixed(2);
      readingStr = readingStr.replace('.', ',');

      if (dateIdx !== -1) rowData[dateIdx] = sapDate;
      if (timeIdx !== -1) rowData[timeIdx] = sapTime;
      if (readingIdx !== -1) rowData[readingIdx] = readingStr;
      const readByVal = (docDetails.readBy && docDetails.readBy.trim() ? docDetails.readBy.trim() : 'ADMIN').substring(0, 12);
      if (readByIdx !== -1) rowData[readByIdx] = readByVal;
      
      const plantCodeStr = eq.plant || '5F01';
      let note = `HM Mesin ${plantCodeStr} tgl ${sapDate.replace(/\./g, '-')}`;
      if (note.length > 30) note = note.substring(0, 30);
      if (shortTextIdx !== -1) rowData[shortTextIdx] = note;
      for (let c = 0; c < rowData.length; c++) {
        if (typeof rowData[c] === 'string' && rowData[c].toLowerCase().includes('import gsheet')) {
          rowData[c] = note;
        }
      }

      wsData.push(rowData);
    });

    // FALLBACK: Include logged equipments missing from template originalData
    Object.keys(loggedEquipmentsMap).forEach(eqKey => {
      if (exportedEqKeys.has(eqKey)) return;
      exportedEqKeys.add(eqKey);

      const duration = dailyDurations[eqKey] || 0;
      if (duration <= 0) return;

      const log = loggedEquipmentsMap[eqKey];
      const newRow = new Array(cleanHeaders.length).fill('');

      const eqColIdx = cleanHeaders.findIndex(h => typeof h === 'string' && h.includes('Equipment Number'));
      const descColIdx = cleanHeaders.findIndex(h => typeof h === 'string' && h.includes('Equipment Description'));

      if (eqColIdx !== -1) newRow[eqColIdx] = eqKey;
      if (descColIdx !== -1) newRow[descColIdx] = log.indukDesc || log.induk_desc || eqKey;
      if (dateIdx !== -1) newRow[dateIdx] = sapDate;
      if (timeIdx !== -1) newRow[timeIdx] = sapTime;

      let readingStr = duration.toString();
      if (!Number.isInteger(duration)) readingStr = duration.toFixed(2);
      readingStr = readingStr.replace('.', ',');
      if (readingIdx !== -1) newRow[readingIdx] = readingStr;

      const readByVal = (docDetails.readBy && docDetails.readBy.trim() ? docDetails.readBy.trim() : 'ADMIN').substring(0, 12);
      if (readByIdx !== -1) newRow[readByIdx] = readByVal;

      const plantCodeStr = log.plant || '5F01';
      let note = `HM Mesin ${plantCodeStr} tgl ${sapDate.replace(/\./g, '-')}`;
      if (note.length > 30) note = note.substring(0, 30);
      if (shortTextIdx !== -1) newRow[shortTextIdx] = note;

      wsData.push(newRow);
    });
  });

  // Renumber No. Urut
  for (let i = 1; i < wsData.length; i++) {
    if (wsData[i] && wsData[i].length > 0) wsData[i][0] = i;
  }
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const _eqIdx2 = headers.findIndex(h => typeof h === 'string' && h.includes('Equipment Number'));
  const _mpIdx2 = headers.findIndex(h => typeof h === 'string' && h.includes('Measuring point'));
  forceColumnsAsText(ws, [_eqIdx2, _mpIdx2]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

  const plantCode = (docDetails.plant || 'ALL').toLowerCase();
  const dateStr = format(new Date(docDetails.date), 'ddMMyy');
  const fileName = `hm${plantCode}-sd${dateStr}.xlsx`;
  XLSX.writeFile(wb, fileName);
}

export function exportMonthlyToSAP(headers, originalData, equipments, logsMap, docDetails) {
  // Strip \r from headers to prevent double \r\r\n corruption
  const cleanHeaders = headers.map(h => typeof h === 'string' ? h.replace(/\r/g, '') : h);
  const wsData = [cleanHeaders];
  
  const dateIdx = headers.findIndex(h => typeof h === 'string' && h.includes('Measurement Date'));
  const timeIdx = headers.findIndex(h => typeof h === 'string' && h.includes('Measurement Time'));
  const readingIdx = headers.findIndex(h => typeof h === 'string' && h.includes('Counter Reading'));
  const readByIdx = headers.findIndex(h => typeof h === 'string' && h.includes('Read By'));
  const shortTextIdx = headers.findIndex(h => typeof h === 'string' && h.includes('Short Text'));

  const dates = Object.keys(logsMap).sort();

  dates.forEach(dateStr => {
    const todaysLogs = logsMap[dateStr];
    if (!todaysLogs || todaysLogs.length === 0) return;

    const dailyDurations = {};
    const eqNotes = {}; 
    
    todaysLogs.forEach(log => {
      const durationHours = log.durationMinutes / 60;
      const actualPlant = log.plant || equipments.find(e => e.eqNum === log.indukEqNum)?.plant;
      
      equipments.forEach(eq => {
        if (eq.eqNum === log.indukEqNum || (eq.induk === log.indukDesc && eq.plant === actualPlant)) {
          dailyDurations[eq.eqNum] = (dailyDurations[eq.eqNum] || 0) + durationHours;
          if (log.notes) {
            eqNotes[eq.eqNum] = log.notes;
          }
        }
      });
    });

    const dateParts = dateStr.split('-');
    const sapDate = dateParts.length === 3 ? `${dateParts[2]}.${dateParts[1]}.${dateParts[0]}` : dateStr;
    const sapTime = docDetails.time.length === 5 ? `${docDetails.time}:00` : docDetails.time;

    equipments.forEach(eq => {
      const rowIdx = eq.rowIndex;
      const duration = dailyDurations[eq.eqNum] || 0;
      
      if ((eq.eqNum in dailyDurations) && originalData[rowIdx]) {
        const rowData = [...originalData[rowIdx]]; 
        
        const maxColIdx = Math.max(dateIdx, timeIdx, readingIdx, readByIdx, shortTextIdx);
        while (rowData.length <= maxColIdx) {
          rowData.push("");
        }
        
        if (dateIdx !== -1) rowData[dateIdx] = sapDate;
        if (timeIdx !== -1) rowData[timeIdx] = sapTime;
        if (readingIdx !== -1) rowData[readingIdx] = String(duration).replace('.', ',');
        if (readByIdx !== -1) rowData[readByIdx] = docDetails.readBy;
        
        if (shortTextIdx !== -1) {
          const plantStr = eq.plant ? ` ${eq.plant}` : '';
          let note = `HM Mesin${plantStr} tgl ${sapDate.replace(/\./g, '-')}`;
          if (note.length > 30) note = note.substring(0, 30);
          rowData[shortTextIdx] = note;
        }
        
        wsData.push(rowData);
      }
    });
  });

  // Renumber 'No. Urut' column (always column 0) starting from 1
  for (let i = 1; i < wsData.length; i++) {
    if (wsData[i] && wsData[i].length > 0) wsData[i][0] = i;
  }

  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const _eqIdx3 = headers.findIndex(h => typeof h === 'string' && h.includes('Equipment Number'));
  const _mpIdx3 = headers.findIndex(h => typeof h === 'string' && h.includes('Measuring point'));
  forceColumnsAsText(ws, [_eqIdx3, _mpIdx3]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  
  const plantCode = (docDetails.plant || 'ALL').toLowerCase();
  const timeStr = docDetails.time.replace(/:/g, '');
  const dateStrStart = docDetails.startDate ? format(new Date(docDetails.startDate), 'ddMMyy') : 'start';
  const dateStrEnd = docDetails.endDate ? format(new Date(docDetails.endDate), 'ddMMyy') : 'end';
  const fileName = `hm${plantCode}-perhari_${dateStrStart}-${dateStrEnd}_${timeStr}.xlsx`;
  
  XLSX.writeFile(wb, fileName);
}

/**
 * Parse Hierarchy Reference Excel (data mesin pabrik.xlsx or hasil_grouping_mesin_cleaned.xlsx)
 */
export async function parseHierarchyReference(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        
        const jsonObjects = XLSX.utils.sheet_to_json(firstSheet);
        const mapping = {}; // child -> { induk, sInduk, type }
        const order = [];

        if (jsonObjects.length > 0 && jsonObjects[0]['Alat Induk'] && jsonObjects[0]['Nama Alat']) {
          // Explicit 3-level mapping format found!
          jsonObjects.forEach(row => {
            const induk = String(row['Alat Induk'] || '').trim();
            const sInduk = String(row['Sub Induk'] || '').trim();
            const child = String(row['Nama Alat'] || '').trim();
            const type = String(row['Kategori (Induk/S-Induk/Sub)'] || '').trim();
            
            if (induk && child) {
              mapping[child] = {
                induk: induk,
                sInduk: sInduk === 'nan' || sInduk === 'undefined' || !sInduk ? null : sInduk,
                type: type
              };
              if (!order.includes(induk)) {
                order.push(induk);
              }
            }
          });
          resolve({ mapping, order });
          return;
        }

        // Fallback to old heuristic logic (single column list) - keeping this for backward compatibility
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
        let currentHeader = null;
        let startIdx = 0;
        if (jsonData[0] && typeof jsonData[0][0] === 'string' && jsonData[0][0].includes('Equipment Description')) {
           startIdx = 1;
        }

        for (let i = startIdx; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0 || !row[0]) continue;
          
          const eqName = String(row[0]).trim();
          
          let nextEqName = null;
          for (let j = i + 1; j < jsonData.length; j++) {
            if (jsonData[j] && jsonData[j].length > 0 && jsonData[j][0]) {
              nextEqName = String(jsonData[j][0]).trim();
              break;
            }
          }
          
          if (nextEqName && nextEqName.includes(eqName)) {
            currentHeader = eqName;
            mapping[eqName] = { induk: currentHeader, sInduk: null, type: 'Induk' };
            if (!order.includes(currentHeader)) order.push(currentHeader);
          } else {
            if (currentHeader && eqName.includes(currentHeader)) {
              mapping[eqName] = { induk: currentHeader, sInduk: null, type: 'Sub' };
            } else {
              currentHeader = eqName;
              mapping[eqName] = { induk: currentHeader, sInduk: null, type: 'Induk' };
              if (!order.includes(currentHeader)) order.push(currentHeader);
            }
          }
        }
        
        resolve({ mapping, order });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsArrayBuffer(file);
  });
}
