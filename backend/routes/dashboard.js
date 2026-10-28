const express = require('express');
const router = express.Router();
const { db } = require('../database');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

router.get('/', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const currentMonth = today.substring(0, 7);
    const currentYear = today.substring(0, 4);

    const [totalEmployees, newThisMonth, totalDepartments, allAttendance, pendingLeaves, openTickets, openJobs, allPayroll, allEmployees, announcements] = await Promise.all([
      db.employees.count({ status: 'active' }),
      db.employees.count({ date_joined: { $gte: `${currentYear}-${today.substring(5, 7)}-01` } }),
      db.departments.count({}),
      db.attendance.find({ date: today }),
      db.leaveRequests.count({ status: 'pending' }),
      db.tickets.count({ status: 'open' }),
      db.jobs.count({ status: 'open' }),
      db.payroll.find({ year: Number(currentYear), month: Number(today.substring(5, 7)) }),
      db.employees.find({ status: 'active' }),
      db.announcements.find({ is_active: true }),
    ]);

    const presentToday = allAttendance.filter(a => a.status === 'present').length;
    const absentToday = allAttendance.filter(a => a.status === 'absent').length;
    const totalPayroll = allPayroll.reduce((s, p) => s + (p.net_salary || 0), 0);

    // By department
    const depts = await db.departments.find({});
    const byDepartment = await Promise.all(depts.map(async d => ({
      name: d.name,
      count: await db.employees.count({ department_id: d._id, status: 'active' })
    })));

    // By gender
    const genderMap = {};
    allEmployees.forEach(e => { genderMap[e.gender || 'Unknown'] = (genderMap[e.gender || 'Unknown'] || 0) + 1; });
    const byGender = Object.entries(genderMap).map(([gender, count]) => ({ gender, count }));

    // By employment type
    const typeMap = {};
    allEmployees.forEach(e => { typeMap[e.employment_type || 'Unknown'] = (typeMap[e.employment_type || 'Unknown'] || 0) + 1; });
    const byType = Object.entries(typeMap).map(([employment_type, count]) => ({ employment_type, count }));

    // Attendance trend last 6 months
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
    const budgetData = await Promise.all(depts.map(async d => {
      const emps = await db.employees.find({ department_id: d._id, status: 'active' });
      return { name: d.name, budget: d.budget || 0, salary_cost: emps.reduce((s, e) => s + (e.salary || 0), 0) };
    }));

    // Upcoming birthdays (next 7 days)
    const today2 = new Date();
    const mmdd = `${String(today2.getMonth() + 1).padStart(2, '0')}-${String(today2.getDate()).padStart(2, '0')}`;
    const next7 = new Date(today2); next7.setDate(next7.getDate() + 7);
    const next7mmdd = `${String(next7.getMonth() + 1).padStart(2, '0')}-${String(next7.getDate()).padStart(2, '0')}`;
    const upcomingBirthdays = allEmployees.filter(e => {
      if (!e.date_of_birth) return false;
      const bd = e.date_of_birth.substring(5); // MM-DD
      return bd >= mmdd && bd <= next7mmdd;
    }).slice(0, 5);

    // Recent leave requests
    const recentLeaves = await db.leaveRequests.find({});
    const sortedLeaves = recentLeaves.sort((a, b) => b.created_at?.localeCompare(a.created_at || '') || 0).slice(0, 5);
    const enrichedLeaves = await Promise.all(sortedLeaves.map(async l => {
      const emp = await db.employees.findOne({ _id: l.employee_id });
      const lt = await db.leaveTypes.findOne({ _id: l.leave_type_id });
      return { ...l, employee_name: emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown', leave_type: lt?.name };
    }));

    res.json({
      metrics: { totalEmployees, newThisMonth, totalDepartments, presentToday, absentToday, pendingLeaves, openTickets, openJobs, totalPayroll, payrollCount: allPayroll.length },
      charts: { byDepartment, byGender, byType, attendanceTrend, payrollTrend, budgetData },
      recent: { recentLeaves: enrichedLeaves, upcomingBirthdays, announcements: announcements.slice(0, 5) }
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
