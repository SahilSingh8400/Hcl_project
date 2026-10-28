const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

router.get('/', authenticate, async (req, res) => {
  try {
    const { employee_id, date, month, year, status } = req.query;
    let query = {};
    if (req.user.role === 'employee') query.employee_id = req.user.employeeId;
    else if (employee_id) query.employee_id = employee_id;
    if (date) query.date = date;
    if (status) query.status = status;

    let records = await db.attendance.find(query).sort({ date: -1 });

    if (month && year) {
      const m = String(month).padStart(2, '0');
      records = records.filter(r => r.date?.startsWith(`${year}-${m}`));
    } else if (year) {
      records = records.filter(r => r.date?.startsWith(year));
    }

    // Preload depts and emps for fast batch enrichment
    const [allDepts, allEmps] = await Promise.all([
      db.departments.find({}),
      db.employees.find({})
    ]);
    const deptMap = {};
    allDepts.forEach(d => { deptMap[d._id] = d.name; });
    const empMap = {};
    allEmps.forEach(e => {
      empMap[e._id] = e;
      if (e.employee_code) empMap[e.employee_code] = e;
    });

    // Enrich with employee info
    const enriched = records.slice(0, 500).map(r => {
      const emp = empMap[r.employee_id] || empMap[r.employee_code];
      const deptName = emp?.department_id ? deptMap[emp.department_id] : (emp?.department_name || r.department_name);
      return {
        ...r,
        employee_name: emp ? `${emp.first_name} ${emp.last_name}` : (r.employee_name || 'HCL Employee'),
        employee_code: emp?.employee_code || r.employee_code || 'EMP',
        department_name: deptName || 'General'
      };
    });
    res.json(enriched);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/today', authenticate, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const record = await db.attendance.findOne({ employee_id: req.user.employeeId, date: today });
    res.json(record || null);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/checkin', authenticate, async (req, res) => {
  try {
    const empId = req.user.employeeId;
    const today = new Date().toISOString().split('T')[0];
    const time = new Date().toTimeString().substring(0, 5);
    const existing = await db.attendance.findOne({ employee_id: empId, date: today });
    if (existing) return res.status(400).json({ error: 'Already checked in today' });
    const record = { _id: uuidv4(), employee_id: empId, date: today, check_in: time, check_out: null, status: 'present', work_hours: 0, created_at: new Date().toISOString() };
    await db.attendance.insert(record);
    res.json({ message: 'Checked in successfully', time });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/checkout', authenticate, async (req, res) => {
  try {
    const empId = req.user.employeeId;
    const today = new Date().toISOString().split('T')[0];
    const time = new Date().toTimeString().substring(0, 5);
    const record = await db.attendance.findOne({ employee_id: empId, date: today });
    if (!record) return res.status(400).json({ error: 'No check-in found for today' });
    if (record.check_out) return res.status(400).json({ error: 'Already checked out' });
    const [inH, inM] = record.check_in.split(':').map(Number);
    const [outH, outM] = time.split(':').map(Number);
    const hours = Math.max(0, ((outH * 60 + outM) - (inH * 60 + inM)) / 60);
    await db.attendance.update({ _id: record._id }, { $set: { check_out: time, work_hours: parseFloat(hours.toFixed(2)) } });
    res.json({ message: 'Checked out successfully', time, work_hours: hours });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/summary/:employee_id', authenticate, async (req, res) => {
  try {
    const { month, year } = req.query;
    const m = month || new Date().getMonth() + 1;
    const y = year || new Date().getFullYear();
    const prefix = `${y}-${String(m).padStart(2, '0')}`;
    const records = await db.attendance.find({ employee_id: req.params.employee_id });
    const monthly = records.filter(r => r.date?.startsWith(prefix));
    const summary = {
      total_days: monthly.length,
      present: monthly.filter(r => r.status === 'present').length,
      absent: monthly.filter(r => r.status === 'absent').length,
      half_day: monthly.filter(r => r.status === 'half_day').length,
      late: monthly.filter(r => r.status === 'late').length,
      total_hours: parseFloat(monthly.reduce((s, r) => s + (r.work_hours || 0), 0).toFixed(2)),
      avg_hours: monthly.length ? parseFloat((monthly.reduce((s, r) => s + (r.work_hours || 0), 0) / monthly.length).toFixed(2)) : 0,
    };
    res.json(summary);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/bulk', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { date, records } = req.body;
    const inserts = records.map(r => ({ _id: uuidv4(), employee_id: r.employee_id, date, check_in: r.check_in, check_out: r.check_out, status: r.status, work_hours: r.work_hours || 0, notes: r.notes, created_at: new Date().toISOString() }));
    for (const ins of inserts) {
      await db.attendance.remove({ employee_id: ins.employee_id, date });
      await db.attendance.insert(ins);
    }
    res.json({ message: 'Attendance marked' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
