// scripts/generate-report.js
const fs = require('fs');
const path = require('path');

const outputDir = 'dashboard/public';
fs.mkdirSync(outputDir, { recursive: true });

// If no dashboard-data.json exists, create a sample one for demo
const dataFile = path.join(outputDir, 'dashboard-data.json');
if (!fs.existsSync(dataFile)) {
  const sample = {
    runId: 'run-demo',
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
    duration: 12400,
    status: 'passed',
    summary: { total: 10, passed: 8, failed: 1, skipped: 1, timedOut: 0, passRate: 80 },
    tests: [],
    history: []
  };
  fs.writeFileSync(dataFile, JSON.stringify(sample, null, 2));
  console.log('Created sample dashboard-data.json');
}

console.log('✅ Report generation complete. Open dashboard/public/index.html or deploy to Vercel/Netlify.');
