const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'src', 'components');
const files = [
  'BeritaAcaraView.jsx',
  'DailyDashboard.jsx',
  'MonitoringDashboard.jsx',
  'SAPVerificationView.jsx',
  'VehicleMonitoringView.jsx',
  'WorkOrderMonitoringView.jsx'
];

files.forEach(file => {
  const filePath = path.join(dir, file);
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Replace text-left and text-right with text-center in <th ...>
  // using \b ensures we match `<th` and not `<thead`
  content = content.replace(/<th(\s[^>]*)?>/g, (match, p1 = '') => {
    // If it's the BeritaAcaraView with inline style: textAlign: 'left' etc
    if (p1.includes("textAlign: 'left'") || p1.includes("textAlign: 'right'")) {
       p1 = p1.replace(/textAlign:\s*'left'/g, "textAlign: 'center'");
       p1 = p1.replace(/textAlign:\s*'right'/g, "textAlign: 'center'");
    }

    if (p1.includes('className=')) {
      // replace text-left or text-right with text-center
      p1 = p1.replace(/\btext-left\b/g, 'text-center');
      p1 = p1.replace(/\btext-right\b/g, 'text-center');
      
      // if it doesn't have text-center, add it
      if (!p1.includes('text-center')) {
        p1 = p1.replace(/className=(["'])/, 'className=$1text-center ');
      }
    } else {
      // Add className="text-center" if there is no className
      p1 = ' className="text-center"' + p1;
    }
    return `<th${p1}>`;
  });

  if (content !== original) {
    fs.writeFileSync(filePath, content);
    console.log(`Updated ${file}`);
  }
});
