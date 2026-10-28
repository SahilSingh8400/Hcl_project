const fs = require('fs');

// Box-Muller transform for normal distribution
function randomGaussian(mean = 0, stdev = 1) {
  let u = 1 - Math.random();
  let v = Math.random();
  let z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  return z * stdev + mean;
}

// Random date between start and end
function randomDate(start, end) {
  const d = new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

// Read the first 500 rows from dataset.csv
const existingContent = fs.readFileSync('dataset.csv', 'utf8').trim().split('\n').filter(l => l.trim().length > 0);
const header = existingContent[0];
const existingRows = existingContent.slice(1).map(l => l.trim().split(','));

console.log('Existing rows count:', existingRows.length);

const departments = [
  'Sales',
  'Engineering',
  'Operations',
  'Marketing',
  'HR',
  'Finance',
  'Customer Support',
  'Product',
  'Legal',
  'IT'
];

// Count existing by department
const existingDeptCounts = {};
for (const dept of departments) existingDeptCounts[dept] = 0;
for (const r of existingRows) {
  const d = r[1];
  existingDeptCounts[d] = (existingDeptCounts[d] || 0) + 1;
}

console.log('Existing department counts:', existingDeptCounts);

// We want 500 per department total -> 5,000 total!
const targetDeptCounts = {};
for (const dept of departments) {
  targetDeptCounts[dept] = 500 - (existingDeptCounts[dept] || 0);
}
console.log('Remaining to generate per department:', targetDeptCounts);

// Build dept pool for remaining 4,500 rows
const deptPool = [];
for (const [dept, count] of Object.entries(targetDeptCounts)) {
  for (let i = 0; i < count; i++) deptPool.push(dept);
}

// Shuffle array
function shuffle(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}
shuffle(deptPool);

console.log('Dept pool length:', deptPool.length);

// Salary bands by grade (in INR)
const salaryBands = {
  L1: { min: 28000, max: 55000, mean: 40000, std: 6000 },
  L2: { min: 50000, max: 88000, mean: 68000, std: 9000 },
  L3: { min: 82000, max: 135000, mean: 108000, std: 13000 },
  L4: { min: 125000, max: 180000, mean: 150000, std: 14000 },
  L5: { min: 165000, max: 245000, mean: 200000, std: 18000 }
};

const grades = ['L1', 'L2', 'L3', 'L4', 'L5'];
const gradeWeights = [0.24, 0.28, 0.24, 0.15, 0.09]; // realistic corporate hierarchy

function pickGrade() {
  const r = Math.random();
  let cumulative = 0;
  for (let i = 0; i < grades.length; i++) {
    cumulative += gradeWeights[i];
    if (r <= cumulative) return grades[i];
  }
  return 'L2';
}

const startDate = new Date('2024-01-01');
const endDate = new Date('2026-12-31');

// We need 543 attritions out of 4,500 rows to reach exactly 600 attritions (12.0%) across 5,000 rows
const newRows = [];

for (let i = 0; i < 4500; i++) {
  const empNum = 501 + i;
  const empId = `EMP${String(empNum).padStart(4, '0')}`;
  const dept = deptPool[i];
  const grade = pickGrade();
  const joinDate = randomDate(startDate, endDate);

  // Performance score: normal distribution around 3.5, std 0.82, bounded [1.0, 5.0]
  let perf = randomGaussian(3.5, 0.82);
  perf = Math.max(1.0, Math.min(5.0, perf));
  perf = Math.round(perf * 10) / 10;

  // Monthly salary with realistic bands and ~3% anomaly/outlier
  const band = salaryBands[grade];
  let salary;
  const isAnomaly = Math.random() < 0.03; // 3% anomalies
  if (isAnomaly) {
    if (grade === 'L1' || grade === 'L2') {
      // Unusually high salary anomaly
      salary = Math.round(randomGaussian(120000, 20000));
    } else {
      // Unusually low salary anomaly
      salary = Math.round(randomGaussian(65000, 10000));
    }
  } else {
    salary = Math.round(randomGaussian(band.mean, band.std));
    salary = Math.max(band.min, Math.min(band.max, salary));
  }
  // Ensure formatted as float with .0
  const monthlySalaryInr = salary.toFixed(1);

  // Leaves taken: 0 to 30 days
  let leaveDays = Math.round(randomGaussian(14.5, 6.5));
  leaveDays = Math.max(0, Math.min(30, leaveDays));

  // Compute an attrition risk score for realistic allocation
  let attritionRisk = 0.10;
  if (perf < 2.5) attritionRisk += 0.25;
  else if (perf > 4.5) attritionRisk -= 0.05;

  if (salary < band.mean * 0.85) attritionRisk += 0.15;
  if (leaveDays > 22) attritionRisk += 0.10;

  newRows.push({
    empId,
    dept,
    grade,
    joinDate,
    monthlySalaryInr,
    leaveDays,
    perf: perf.toFixed(1),
    attritionRisk,
    attrition: 0
  });
}

// Exactly 543 rows must have attrition = 1 (to make 57 + 543 = 600 / 5000 = 12.0%)
// Sort by attritionRisk descending with some randomness
newRows.sort((a, b) => (b.attritionRisk + Math.random() * 0.3) - (a.attritionRisk + Math.random() * 0.3));

for (let i = 0; i < 543; i++) {
  newRows[i].attrition = 1;
}

// Sort back by empId so records are strictly sequential
newRows.sort((a, b) => a.empId.localeCompare(b.empId));

// Combine existing rows + new rows
const allRows = [
  header,
  ...existingRows.map(r => r.join(',')),
  ...newRows.map(r => `${r.empId},${r.dept},${r.grade},${r.joinDate},${r.monthlySalaryInr},${r.leaveDays},${r.perf},${r.attrition}`)
];

fs.writeFileSync('dataset.csv', allRows.join('\n') + '\n', 'utf8');
console.log('Successfully wrote 5000 records to dataset.csv!');
