const fs = require('fs');
const files = [
  'src/App.jsx', 
  'src/components/DailyDashboard.jsx', 
  'src/components/SAPTransactionGuideView.jsx', 
  'src/components/VehicleMonitoringView.jsx', 
  'src/components/WorkOrderMonitoringView.jsx', 
  'src/utils/excel.js'
];

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  content = content.replace(/role === 'Regional'/g, "role === 'Admin'");
  content = content.replace(/role: nik === '00000000' \? 'Regional'/g, "role: nik === '00000000' ? 'Admin'");
  content = content.replace(/name: nik === '00000000' \? 'Regional Offline'/g, "name: nik === '00000000' ? 'Admin Offline'");
  content = content.replace(/u\.role === 'Regional'/g, "u.role === 'Admin'");
  content = content.replace(/value="Regional">Regional \(Admin\)/g, 'value="Admin">Admin');
  content = content.replace(/currentUser\.role === 'Regional'/g, "currentUser.role === 'Admin'");
  content = content.replace(/currentUser\?\.role === 'Regional'/g, "currentUser?.role === 'Admin'");
  content = content.replace(/Regional: \{allUsers/g, "Admin: {allUsers");
  fs.writeFileSync(f, content);
});
console.log('Replacement done.');
