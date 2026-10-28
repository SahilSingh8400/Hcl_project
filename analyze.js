const fs = require('fs');
const lines = fs.readFileSync('dataset.csv', 'utf8').trim().split('\n').filter(l => l.trim().length > 0);
console.log('Total non-empty lines:', lines.length);
const rows = lines.slice(1).map(l => l.trim().split(','));

const depts = {};
const grades = {};
let totalAttrition = 0;
const perfScores = [];
const leaves = [];
const salariesByGrade = {};
const dates = [];

for (const r of rows) {
  const [emp_id, dept, grade, join_date, sal, lvs, perf, attr] = r;
  depts[dept] = (depts[dept] || 0) + 1;
  grades[grade] = (grades[grade] || 0) + 1;
  totalAttrition += Number(attr);
  perfScores.push(Number(perf));
  leaves.push(Number(lvs));
  dates.push(join_date);
  if (!salariesByGrade[grade]) salariesByGrade[grade] = [];
  salariesByGrade[grade].push(Number(sal));
}

console.log('Departments:', JSON.stringify(depts, null, 2));
console.log('Grades:', JSON.stringify(grades, null, 2));
console.log('Attrition rate:', (totalAttrition / rows.length * 100).toFixed(2) + '% (' + totalAttrition + '/' + rows.length + ')');
const avgPerf = perfScores.reduce((a,b)=>a+b, 0) / perfScores.length;
const variancePerf = perfScores.reduce((a,b)=>a+Math.pow(b-avgPerf, 2), 0) / perfScores.length;
console.log('Performance: mean =', avgPerf.toFixed(2), 'std =', Math.sqrt(variancePerf).toFixed(2), 'min =', Math.min(...perfScores), 'max =', Math.max(...perfScores));
console.log('Leaves: min =', Math.min(...leaves), 'max =', Math.max(...leaves), 'avg =', (leaves.reduce((a,b)=>a+b,0)/leaves.length).toFixed(1));
dates.sort();
console.log('Date range:', dates[0], 'to', dates[dates.length - 1]);

for (const g of Object.keys(salariesByGrade).sort()) {
  const sals = salariesByGrade[g].sort((a,b)=>a-b);
  const min = sals[0], max = sals[sals.length-1];
  const avg = sals.reduce((a,b)=>a+b,0) / sals.length;
  console.log('Grade ' + g + ': min=' + min + ', max=' + max + ', avg=' + avg.toFixed(0) + ', count=' + sals.length);
}
