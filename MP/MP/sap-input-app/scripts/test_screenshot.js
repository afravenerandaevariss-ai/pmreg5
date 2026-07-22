import { execFile } from 'child_process';
import fs from 'fs';
import path from 'path';

const chromePath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

const sampleHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #fff; margin: 20px; }
    .card { border: 1px solid #d1d5db; border-radius: 12px; padding: 20px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); width: 1050px; background: #fff; }
    .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px; }
    .title { font-size: 15px; font-weight: 800; color: #0f172a; }
    .subtitle { font-size: 13px; font-weight: 700; color: #0f172a; }
    .target { font-size: 12px; font-weight: 700; color: #0f172a; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 10px; }
    th, td { border: 1px solid #cbd5e1; padding: 6px 8px; text-align: center; }
    th { bg-color: #f8fafc; font-weight: 800; color: #334155; }
    .th-group { background: #f1f5f9; text-transform: uppercase; font-size: 10px; }
    .plant-desc { text-align: left; font-weight: 600; }
    .bg-green { background-color: #10b981; color: white; font-weight: 800; }
    .bg-yellow { background-color: #f59e0b; color: white; font-weight: 800; }
    .bg-red { background-color: #ef4444; color: white; font-weight: 800; }
    .bg-black { background-color: #0f172a; color: white; font-weight: 800; }
    .legend { display: flex; gap: 20px; margin-top: 15px; font-size: 11px; font-weight: 600; }
    .legend-item { display: flex; items-center; gap: 8px; }
    .box { width: 30px; height: 14px; border-radius: 2px; }
  </style>
</head>
<body>
  <div class="card" id="capture">
    <div class="header">
      <div>
        <div class="title">Monitoring Transaksi Logbook tanggal 1 s.d 22 Jul 2026 15.25</div>
        <div class="subtitle">REGIONAL 5</div>
      </div>
      <div style="text-align: right;">
        <div style="background:#e2e8f0; padding:2px 6px; border-radius:4px; font-size:10px; font-weight:700; display:inline-block;">H + 1</div>
        <div class="target" style="margin-top:4px;">Target input logbook : 22/07/2026</div>
      </div>
    </div>

    <table>
      <thead>
        <tr>
          <th rowspan="2">WILAYAH</th>
          <th rowspan="2">PLANT</th>
          <th rowspan="2">DESC</th>
          <th rowspan="2">JUMLAH<br>VEHICLE CODE</th>
          <th rowspan="2">JUMLAH<br>HARI KERJA</th>
          <th rowspan="2">RENCANA<br>TRANSAKSI</th>
          <th colspan="2" class="th-group">STATUS</th>
          <th rowspan="2">TOTAL<br>TRANSAKSI</th>
          <th colspan="2" class="th-group">PERSENTASE (%)</th>
          <th rowspan="2">LAST<br>LOGBOOK DATE</th>
          <th rowspan="2">RANK</th>
        </tr>
        <tr>
          <th>UP TO DATE</th>
          <th>TIDAK UP TO DATE</th>
          <th>UP TO DATE</th>
          <th>TIDAK UP TO DATE</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Kal-Bar</td>
          <td style="font-weight:700;">5D01</td>
          <td class="plant-desc">DISTRIK KALBAR</td>
          <td>8</td>
          <td>16</td>
          <td>20</td>
          <td>11</td>
          <td>9</td>
          <td style="font-weight:800;">20</td>
          <td>55.00%</td>
          <td>45.00%</td>
          <td class="bg-red">16/07/2026</td>
          <td style="font-weight:800;">23</td>
        </tr>
        <tr>
          <td>Kal-Bar</td>
          <td style="font-weight:700;">5E07</td>
          <td class="plant-desc">KEBUN NGABANG</td>
          <td>18</td>
          <td>16</td>
          <td>456</td>
          <td>239</td>
          <td>217</td>
          <td style="font-weight:800;">456</td>
          <td>52.41%</td>
          <td>47.59%</td>
          <td class="bg-green">21/07/2026</td>
          <td style="font-weight:800;">1</td>
        </tr>
      </tbody>
    </table>

    <div class="legend">
      <div style="font-weight:700;">Indikator :</div>
      <div style="display:flex; align-items:center; gap:6px;">
        <div class="box bg-green"></div> <span>Inputan sesuai / lebih dari target</span>
      </div>
      <div style="display:flex; align-items:center; gap:6px;">
        <div class="box bg-yellow"></div> <span>Inputan terlambat &gt; 1 dan &lt; 3 hari</span>
      </div>
      <div style="display:flex; align-items:center; gap:6px;">
        <div class="box bg-red"></div> <span>Inputan terlambat &gt; 3 hari</span>
      </div>
    </div>
  </div>
</body>
</html>
`;

const htmlPath = path.resolve('temp_report.html');
const outputPath = path.resolve('temp_report.png');
fs.writeFileSync(htmlPath, sampleHtml);

console.log("Rendering HTML to PNG using headless Chrome...");
execFile(chromePath, [
  '--headless=new',
  '--disable-gpu',
  `--screenshot=${outputPath}`,
  '--window-size=1150,750',
  '--default-background-color=00000000',
  `file:///${htmlPath.replace(/\\/g, '/')}`
], (err) => {
  if (err) {
    console.error("Exec error:", err);
  } else {
    console.log("Screenshot saved successfully to:", outputPath);
    console.log("File exists:", fs.existsSync(outputPath), "Size:", fs.statSync(outputPath).size);
  }
});
