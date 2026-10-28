const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

router.get('/', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.substring(0, 7);
    const currentYear = today.substring(0, 4);

    const [allEmployees, totalDepartments, allAttendance, pendingLeaves, openTickets, openJobs, announcements] = await Promise.all([
      db.employees.find({}),
      db.departments.count({}),
      db.attendance.find({ date: today }),
      db.leaveRequests.count({ status: 'pending' }),
      db.tickets.count({ status: 'open' }),
      db.jobs.count({ status: 'open' }),
      db.announcements.find({ is_active: true }),
    ]);

    const totalEmployees = allEmployees.length;
    const activeEmployees = allEmployees.filter(e => e.status === 'active' || e.attrition === 0).length;
    const attritedEmployees = allEmployees.filter(e => e.attrition === 1 || e.status === 'inactive').length;
    const attritionRate = totalEmployees > 0 ? ((attritedEmployees / totalEmployees) * 100).toFixed(1) : '12.0';

    const presentToday = allAttendance.filter(a => a.status === 'present').length;
    const absentToday = allAttendance.filter(a => a.status === 'absent').length;

    // Total monthly payroll from employee salaries
    const totalPayroll = allEmployees.filter(e => e.status === 'active').reduce((s, e) => s + (e.salary || e.monthly_salary_inr || 0), 0);

    // Performance distribution (Normal Distribution: 1.0-2.0, 2.1-3.0, 3.1-4.0, 4.1-5.0)
    const perfBuckets = {
      '1.0 - 2.0 (Needs Improvement)': 0,
      '2.1 - 3.0 (Meets Some)': 0,
      '3.1 - 4.0 (Meets Expectations)': 0,
      '4.1 - 5.0 (Exceeds Expectations)': 0
    };
    let perfSum = 0;
    let perfCount = 0;
    allEmployees.forEach(e => {
      const p = e.performance_score;
      if (typeof p === 'number' && !isNaN(p)) {
        perfSum += p;
        perfCount++;
        if (p <= 2.0) perfBuckets['1.0 - 2.0 (Needs Improvement)']++;
        else if (p <= 3.0) perfBuckets['2.1 - 3.0 (Meets Some)']++;
        else if (p <= 4.0) perfBuckets['3.1 - 4.0 (Meets Expectations)']++;
        else perfBuckets['4.1 - 5.0 (Exceeds Expectations)']++;
      }
    });
    const avgPerformance = perfCount > 0 ? (perfSum / perfCount).toFixed(2) : '3.50';
    const performanceDistribution = Object.entries(perfBuckets).map(([range, count]) => ({
      range,
      count,
      percent: perfCount > 0 ? ((count / perfCount) * 100).toFixed(1) : 0
    }));

    // By department (all 10 departments)
    const depts = await db.departments.find({});
    const byDepartment = depts.map(d => {
      const deptEmps = allEmployees.filter(e => e.department_id === d._id || e.department_name === d.name);
      const totalDept = deptEmps.length;
      const attrited = deptEmps.filter(e => e.attrition === 1 || e.status === 'inactive').length;
      const active = totalDept - attrited;
      const deptAttRate = totalDept > 0 ? ((attrited / totalDept) * 100).toFixed(1) : '0.0';
      const avgSal = totalDept > 0 ? Math.round(deptEmps.reduce((s, e) => s + (e.salary || e.monthly_salary_inr || 0), 0) / totalDept) : 0;
      return {
        name: d.name,
        count: totalDept,
        active,
        attrited,
        attritionRate: parseFloat(deptAttRate),
        avgSalary: avgSal
      };
    }).sort((a, b) => b.count - a.count);

    // Salary Bands and Breakdown by Grade (L1 - L5)
    const gradeOrder = ['L1', 'L2', 'L3', 'L4', 'L5'];
    const gradeDataMap = {};
    gradeOrder.forEach(g => { gradeDataMap[g] = { grade: g, count: 0, salaries: [], attrited: 0 }; });

    allEmployees.forEach(e => {
      const g = e.grade || 'L2';
      if (!gradeDataMap[g]) gradeDataMap[g] = { grade: g, count: 0, salaries: [], attrited: 0 };
      gradeDataMap[g].count++;
      const sal = e.salary || e.monthly_salary_inr || 0;
      if (sal > 0) gradeDataMap[g].salaries.push(sal);
      if (e.attrition === 1 || e.status === 'inactive') gradeDataMap[g].attrited++;
    });

    const byGrade = gradeOrder.map(g => {
      const item = gradeDataMap[g];
      const sals = item.salaries.sort((a, b) => a - b);
      const min = sals.length > 0 ? sals[0] : 0;
      const max = sals.length > 0 ? sals[sals.length - 1] : 0;
      const avg = sals.length > 0 ? Math.round(sals.reduce((a, b) => a + b, 0) / sals.length) : 0;
      const attRate = item.count > 0 ? ((item.attrited / item.count) * 100).toFixed(1) : '0.0';
      return {
        grade: g,
        count: item.count,
        minSalary: min,
        maxSalary: max,
        avgSalary: avg,
        attritionRate: parseFloat(attRate),
        bandLabel: `₹${(min / 1000).toFixed(0)}k - ₹${(max / 1000).toFixed(0)}k`
      };
    });

    // By gender
    const genderMap = {};
    allEmployees.forEach(e => { genderMap[e.gender || 'Unknown'] = (genderMap[e.gender || 'Unknown'] || 0) + 1; });
    const byGender = Object.entries(genderMap).map(([gender, count]) => ({ gender, count }));

    // By employment type
    const typeMap = {};
    allEmployees.forEach(e => { typeMap[e.employment_type || 'Full-time'] = (typeMap[e.employment_type || 'Full-time'] || 0) + 1; });
    const byType = Object.entries(typeMap).map(([employment_type, count]) => ({ employment_type, count }));

    // Attendance trend
    const allAtt = await db.attendance.find({});
    const attMap = {};
    allAtt.forEach(a => {
      const m = a.date?.substring(0, 7);
      if (!m) return;
      if (!attMap[m]) attMap[m] = { month: m, total: 0, present: 0, absent: 0 };
      attMap[m].total++;
      if (a.status === 'present') attMap[m].present++;
      if (a.status === 'absent') attMap[m].absent++;
    });
    const sixMonthsAgo = new Date(); sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const attendanceTrend = Object.values(attMap).filter(a => a.month >= sixMonthsAgo.toISOString().substring(0, 7)).sort((a, b) => a.month.localeCompare(b.month));

    // Payroll trend
    const allPay = await db.payroll.find({});
    const payMap = {};
    allPay.forEach(p => {
      const key = `${p.year}-${String(p.month).padStart(2, '0')}`;
      if (!payMap[key]) payMap[key] = { month: p.month, year: p.year, total: 0, gross: 0 };
      payMap[key].total += p.net_salary || 0;
      payMap[key].gross += p.gross_salary || 0;
    });
    const payrollTrend = Object.values(payMap).sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month).slice(0, 6);

    // Budget data
    const budgetData = depts.map(d => {
      const emps = allEmployees.filter(e => (e.department_id === d._id || e.department_name === d.name) && e.status === 'active');
      return { name: d.name, budget: d.budget || 0, salary_cost: emps.reduce((s, e) => s + (e.salary || e.monthly_salary_inr || 0), 0) };
    });

    // Upcoming birthdays (next 7 days)
    const today2 = new Date();
    const mmdd = `${String(today2.getMonth() + 1).padStart(2, '0')}-${String(today2.getDate()).padStart(2, '0')}`;
    const next7 = new Date(today2); next7.setDate(next7.getDate() + 7);
    const next7mmdd = `${String(next7.getMonth() + 1).padStart(2, '0')}-${String(next7.getDate()).padStart(2, '0')}`;
    const upcomingBirthdays = allEmployees.filter(e => {
      if (!e.date_of_birth) return false;
      const bd = e.date_of_birth.substring(5);
      return bd >= mmdd && bd <= next7mmdd;
    }).slice(0, 5);

    // Recent leave requests
    const rawLeaves = await db.leaveRequests.find({});
    const sortedLeaves = rawLeaves.sort((a, b) => b.created_at?.localeCompare(a.created_at || '') || 0).slice(0, 5);
    const recentLeaves = await Promise.all(sortedLeaves.map(async l => {
      const emp = allEmployees.find(e => e._id === l.employee_id) || (await db.employees.findOne({ _id: l.employee_id }));
      const lt = await db.leaveTypes.findOne({ _id: l.leave_type_id });
      return { ...l, employee_name: emp ? `${emp.first_name} ${emp.last_name}` : 'Employee', leave_type: lt?.name || 'Annual Leave' };
    }));

    res.json({
      metrics: {
        totalEmployees,
        activeEmployees,
        attritedEmployees,
        attritionRate: `${attritionRate}%`,
        avgPerformance,
        newThisMonth: allEmployees.filter(e => e.date_joined?.startsWith(currentMonth)).length,
        totalDepartments,
        presentToday,
        absentToday,
        pendingLeaves,
        openTickets,
        openJobs,
        totalPayroll
      },
      charts: {
        byDepartment,
        byGrade,
        performanceDistribution,
        byGender,
        byType,
        attendanceTrend,
        payrollTrend,
        budgetData
      },
      recent: { recentLeaves, upcomingBirthdays, announcements: announcements.slice(0, 5) }
    });
  } catch (err) {
    console.error('Dashboard error:', err);
    res.status(500).json({ error: err.message });
  }
});

router.get('/employee', authenticate, async (req, res) => {
  try {
    const empId = req.user.employeeId;
    const today = new Date().toISOString().split('T')[0];
    const currentYear = today.substring(0, 4);
    const currentMonth = today.substring(0, 7);

    const [todayAttendance, allLeaveTypes, myLeaves, myPayslips, myAssets, myTickets, announcements, myTrainings, myAttendance] = await Promise.all([
      db.attendance.findOne({ employee_id: empId, date: today }),
      db.leaveTypes.find({}),
      db.leaveRequests.find({ employee_id: empId }),
      db.payroll.find({ employee_id: empId }),
      db.assets.find({ assigned_to: empId }),
      db.tickets.find({ employee_id: empId }),
      db.announcements.find({ is_active: true }),
      db.enrollments.find({ employee_id: empId }),
      db.attendance.find({ employee_id: empId }),
    ]);

    const leaveBalance = await Promise.all(allLeaveTypes.map(async lt => {
      const used = myLeaves.filter(l => l.leave_type_id === lt._id && l.status === 'approved' && l.start_date?.startsWith(currentYear)).reduce((s, l) => s + (l.days || 0), 0);
      return { ...lt, used, remaining: Math.max(0, lt.days_allowed - used) };
    }));

    const sortedLeaves = myLeaves.sort((a, b) => b.created_at?.localeCompare(a.created_at || '') || 0).slice(0, 5);
    const enrichedLeaves = await Promise.all(sortedLeaves.map(async l => {
      const lt = await db.leaveTypes.findOne({ _id: l.leave_type_id });
      return { ...l, leave_type_name: lt?.name };
    }));

    const enrichedTrainings = await Promise.all(myTrainings.slice(0, 5).map(async e => {
      const prog = await db.training.findOne({ _id: e.training_id });
      return { ...e, title: prog?.title, start_date: prog?.start_date, end_date: prog?.end_date, trainer: prog?.trainer, mode: prog?.mode, program_status: prog?.status };
    }));

    const monthlyAttendance = myAttendance.filter(a => a.date?.startsWith(currentMonth));

    res.json({
      todayAttendance,
      leaveBalance,
      myLeaves: enrichedLeaves,
      myPayslips: myPayslips.sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month).slice(0, 3),
      myAssets,
      myTickets: myTickets.sort((a, b) => b.created_at?.localeCompare(a.created_at || '') || 0).slice(0, 5),
      announcements: announcements.sort((a, b) => b.created_at?.localeCompare(a.created_at || '') || 0).slice(0, 5),
      myTrainings: enrichedTrainings,
      myAttendance: monthlyAttendance.sort((a, b) => b.date.localeCompare(a.date)),
    });
  } catch (err) {
    console.error('Employee dashboard error:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
