import { exportDailyToSAP } from './src/utils/excel.js';
import fs from 'fs';

// Mock data based on the database
const headers = [
  'No. Urut',
  'Equipment',
  'Equipment Description',
  'Measuring point',
  'Measurement Date',
  'Measurement Time',
  'Counter Reading/\r\nReading Difference',
  'Unit of Me',
  'Difference\r\n(1 char)\r\nC',
  'Read By',
  'Short Text'
];

const originalData = [];
originalData[5] = [
  '5',
  '1000206812',
  'HORIZONTAL STERILIZER NO. 1',
  '1000001201',
  '17.06.2026',
  '09:53:00',
  '',
  'H',
  'x',
  'ADMIN',
  'HM Mesin'
];

const equipments = [
  {
    rowIndex: 5,
    eqNum: '1000206812',
    indukDesc: 'HORIZONTAL STERILIZER NO. 1',
    plant: '5F01',
    reading: 55021
  }
];

// Summing up to 280 hours
const dailyLogsMap = {
  '2026-06-17': [
    {
      indukEqNum: '1000206812',
      durationMinutes: 16800, // 280 hours total for simplicity
      plant: '5F01'
    }
  ]
};

const docDetails = {
  date: '2026-06-17',
  time: '09:53',
  readBy: 'ADMIN'
};

// We need to mock XLSX to just intercept wsData
import * as XLSX from 'xlsx';
const original_aoa_to_sheet = XLSX.utils.aoa_to_sheet;
let exportedWsData = null;
XLSX.utils.aoa_to_sheet = (wsData) => {
  exportedWsData = wsData;
  return original_aoa_to_sheet(wsData);
};
XLSX.writeFile = () => {}; // block writing file

exportDailyToSAP(headers, originalData, equipments, dailyLogsMap, docDetails);

console.log('--- Exported Row ---');
console.log(exportedWsData[1]);
