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
        
        // Optimize suffix matching by sorting descriptions by length ascending
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
          
          // Find parent: the shortest description that is a suffix of the current description
          let parentEquipment = description;
          for (const p of allDescriptions) {
            if (description.endsWith(p)) {
              parentEquipment = p;
              break; // sorted by length ascending, so first match is shortest (root parent)
            }
          }
          
          equipments.push({
            rowIndex: i - 1,
            no: row[0],
            eqNum: eqNum,
            description: description,
            measuringPoint: row[measuringPtIdx] || '',
            plant: plant,
            costCenter: costCenter,
            parentEquipment: parentEquipment,
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
      if (readByIdx !== -1) dataToExport[rowIdx][readByIdx] = docDetails.readBy;
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

export function exportDailyToSAP(headers, originalData, equipments, dailyLogsMap, docDetails) {
  // Strip \r from headers to prevent double \r\r\n corruption
  const cleanHeaders = headers.map(h => typeof h === 'string' ? h.replace(/\r/g, '') : h);
  const wsData = [cleanHeaders];
  
  const dailyDurations = {};
  const eqNotes = {};

  // Only use logs from the selected date
  const selectedDate = docDetails.date; // format 'yyyy-MM-dd'
  const todaysLogs = dailyLogsMap[selectedDate] || [];

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

  const dateParts = docDetails.date.split('-');
  const sapDate = dateParts.length === 3 ? `${dateParts[2]}.${dateParts[1]}.${dateParts[0]}` : docDetails.date;
  const sapTime = docDetails.time.length === 5 ? `${docDetails.time}:00` : docDetails.time;
  
  const dateIdx = headers.findIndex(h => typeof h === 'string' && h.includes('Measurement Date'));
  const timeIdx = headers.findIndex(h => typeof h === 'string' && h.includes('Measurement Time'));
  const readingIdx = headers.findIndex(h => typeof h === 'string' && h.includes('Counter Reading'));
  const readByIdx = headers.findIndex(h => typeof h === 'string' && h.includes('Read By'));
  const shortTextIdx = headers.findIndex(h => typeof h === 'string' && h.includes('Short Text'));

  equipments.forEach(eq => {
    const rowIdx = eq.rowIndex;
    const duration = dailyDurations[eq.eqNum] || 0;
    
    // Only export equipments that have a log entry on the selected date
    if (duration <= 0 || !originalData[rowIdx]) return;

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
    // Leave Difference column (x) as-is from original template
    if (readByIdx !== -1) rowData[readByIdx] = docDetails.readBy;
    
    if (shortTextIdx !== -1) {
      const plantStr = eq.plant ? ` ${eq.plant}` : '';
      let note = eqNotes[eq.eqNum] || `HM Mesin${plantStr} tgl ${sapDate.replace(/\./g, '-')}`;
      if (note.length > 30) note = note.substring(0, 30);
      rowData[shortTextIdx] = note;
    }
    
    wsData.push(rowData);
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

  // Sum all logs within the date range
  Object.entries(dailyLogsMap).forEach(([dateStr, logs]) => {
    if (dateStr < startDate || dateStr > endDate) return;
    logs.forEach(log => {
      // If selectedEqs is provided and not empty, skip logs for Induks not selected
      if (docDetails.selectedEqs && docDetails.selectedEqs.length > 0 && !docDetails.selectedEqs.includes(log.indukEqNum)) return;
      
      const durationHours = log.durationMinutes / 60;
      const actualPlant = log.plant || equipments.find(e => e.eqNum === log.indukEqNum)?.plant;
      equipments.forEach(eq => {
        if (eq.eqNum === log.indukEqNum || (eq.induk === log.indukDesc && eq.plant === actualPlant)) {
          accDurations[eq.eqNum] = (accDurations[eq.eqNum] || 0) + durationHours;
          if (dateStr === endDate && log.notes) eqNotes[eq.eqNum] = log.notes;
        }
      });
    });
  });

  const dateParts = endDate.split('-');
  const sapDate = dateParts.length === 3 ? `${dateParts[2]}.${dateParts[1]}.${dateParts[0]}` : endDate;
  const sapTime = docDetails.time.length === 5 ? `${docDetails.time}:00` : docDetails.time;

  const dateIdx = headers.findIndex(h => typeof h === 'string' && h.includes('Measurement Date'));
  const timeIdx = headers.findIndex(h => typeof h === 'string' && h.includes('Measurement Time'));
  const readingIdx = headers.findIndex(h => typeof h === 'string' && h.includes('Counter Reading'));
  const readByIdx = headers.findIndex(h => typeof h === 'string' && h.includes('Read By'));
  const shortTextIdx = headers.findIndex(h => typeof h === 'string' && h.includes('Short Text'));

  // Only export equipments that have at least one log on the end date, OR within the range if accumulated
  // To be safe and show all accumulated HM in the period, we should check if they ran *at all* during the period
  const ranDuringPeriod = new Set();
  Object.entries(dailyLogsMap).forEach(([dateStr, logs]) => {
    if (dateStr < startDate || dateStr > endDate) return;
    logs.forEach(log => {
      const actualPlant = log.plant || equipments.find(e => e.eqNum === log.indukEqNum)?.plant;
      equipments.forEach(eq => {
        if (eq.eqNum === log.indukEqNum || (eq.induk === log.indukDesc && eq.plant === actualPlant)) {
          ranDuringPeriod.add(eq.eqNum);
        }
      });
    });
  });


  equipments.forEach(eq => {
    if (!ranDuringPeriod.has(eq.eqNum)) return;
    const rowIdx = eq.rowIndex;
    const total = accDurations[eq.eqNum] || 0;
    if (total <= 0 || !originalData[rowIdx]) return;

    const rowData = [...originalData[rowIdx]];
    const maxColIdx = Math.max(dateIdx, timeIdx, readingIdx, readByIdx, shortTextIdx);
    while (rowData.length <= maxColIdx) rowData.push('');

    let readingStr = total.toString();
    if (!Number.isInteger(total)) readingStr = total.toFixed(2);
    readingStr = readingStr.replace('.', ',');

    if (dateIdx !== -1) rowData[dateIdx] = sapDate;
    if (timeIdx !== -1) rowData[timeIdx] = sapTime;
    if (readingIdx !== -1) rowData[readingIdx] = readingStr;
    if (readByIdx !== -1) rowData[readByIdx] = docDetails.readBy;
    if (shortTextIdx !== -1) {
      const plantStr = eq.plant ? ` ${eq.plant}` : '';
      const formatShortDate = (d) => { const p = d.split('-'); return p.length === 3 ? `${p[2]}/${p[1]}/${p[0].substring(2)}` : d; };
      const sDate = formatShortDate(startDate);
      const eDate = formatShortDate(endDate);
      let note = eqNotes[eq.eqNum] || `HM ${startDate === endDate ? sDate : `${sDate}-${eDate}`}`;
      if (note.length > 30) note = note.substring(0, 30);
      rowData[shortTextIdx] = note;
    }
    wsData.push(rowData);
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

  const dateIdx = headers.findIndex(h => typeof h === 'string' && h.includes('Measurement Date'));
  const timeIdx = headers.findIndex(h => typeof h === 'string' && h.includes('Measurement Time'));
  const readingIdx = headers.findIndex(h => typeof h === 'string' && h.includes('Counter Reading'));
  const readByIdx = headers.findIndex(h => typeof h === 'string' && h.includes('Read By'));
  const shortTextIdx = headers.findIndex(h => typeof h === 'string' && h.includes('Short Text'));

  // Iterate each date in sorted order, up to and including selected date
  const dates = Object.keys(dailyLogsMap).sort();

  dates.forEach(dateStr => {
    if (dateStr < startDate || dateStr > endDate) return; // only within range

    const logsForDate = dailyLogsMap[dateStr];
    if (!logsForDate || logsForDate.length === 0) return;

    const dailyDurations = {};
    const eqNotes = {};

    logsForDate.forEach(log => {
      // If selectedEqs is provided and not empty, skip logs for Induks not selected
      if (docDetails.selectedEqs && docDetails.selectedEqs.length > 0 && !docDetails.selectedEqs.includes(log.indukEqNum)) return;
      
      const durationHours = log.durationMinutes / 60;
      const actualPlant = log.plant || equipments.find(e => e.eqNum === log.indukEqNum)?.plant;
      equipments.forEach(eq => {
        if (eq.eqNum === log.indukEqNum || (eq.induk === log.indukDesc && eq.plant === actualPlant)) {
          dailyDurations[eq.eqNum] = (dailyDurations[eq.eqNum] || 0) + durationHours;
          if (log.notes) eqNotes[eq.eqNum] = log.notes;
        }
      });
    });

    const dateParts = dateStr.split('-');
    const sapDate = dateParts.length === 3 ? `${dateParts[2]}.${dateParts[1]}.${dateParts[0]}` : dateStr;

    equipments.forEach(eq => {
      const rowIdx = eq.rowIndex;
      const duration = dailyDurations[eq.eqNum] || 0;
      if (duration <= 0 || !originalData[rowIdx]) return;

      const rowData = [...originalData[rowIdx]];
      const maxColIdx = Math.max(dateIdx, timeIdx, readingIdx, readByIdx, shortTextIdx);
      while (rowData.length <= maxColIdx) rowData.push('');

      let readingStr = duration.toString();
      if (!Number.isInteger(duration)) readingStr = duration.toFixed(2);
      readingStr = readingStr.replace('.', ',');

      if (dateIdx !== -1) rowData[dateIdx] = sapDate;
      if (timeIdx !== -1) rowData[timeIdx] = sapTime;
      if (readingIdx !== -1) rowData[readingIdx] = readingStr;
      if (readByIdx !== -1) rowData[readByIdx] = docDetails.readBy;
      if (shortTextIdx !== -1) {
        const plantStr = eq.plant ? ` ${eq.plant}` : '';
        let note = eqNotes[eq.eqNum] || `HM Mesin${plantStr} tgl ${sapDate.replace(/\./g, '-')}`;
        if (note.length > 30) note = note.substring(0, 30);
        rowData[shortTextIdx] = note;
      }
      wsData.push(rowData);
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
      
      if (duration > 0 && originalData[rowIdx]) {
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
          let note = eqNotes[eq.eqNum] || `HM Mesin${plantStr} tgl ${sapDate.replace(/\./g, '-')}`;
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
