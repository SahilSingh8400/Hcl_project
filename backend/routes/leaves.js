const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

router.get('/types', authenticate, async (req, res) => {
  try { res.json(await db.leaveTypes.find({}).sort({ name: 1 })); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/types', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { name, days_allowed, carry_forward, description } = req.body;
    const lt = { _id: uuidv4(), name, days_allowed: Number(days_allowed), carry_forward: Number(carry_forward) || 0, description, created_at: new Date().toISOString() };
    await db.leaveTypes.insert(lt);
    res.status(201).json(lt);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/', authenticate, async (req, res) => {
  try {
    const { status, employee_id, month, year } = req.query;
    let query = {};
    if (req.user.role === 'employee') query.employee_id = req.user.employeeId;
    else if (employee_id) query.employee_id = employee_id;
    if (status) query.status = status;

    let leaves = await db.leaveRequests.find(query).sort({ created_at: -1 });
    if (month && year) {
      leaves = leaves.filter(l => l.start_date?.startsWith(`${year}-${String(month).padStart(2, '0')}`));
    }

    const enriched = await Promise.all(leaves.map(async l => {
      const emp = await db.employees.findOne({ _id: l.employee_id });
      const dept = emp?.department_id ? await db.departments.findOne({ _id: emp.department_id }) : null;
      const lt = await db.leaveTypes.findOne({ _id: l.leave_type_id });
      const approver = l.approved_by ? await db.employees.findOne({ _id: l.approved_by }) : null;
      return {
        ...l,
        employee_name: emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown',
        employee_code: emp?.employee_code,
        department_name: dept?.name,
        leave_type_name: lt?.name,
        approved_by_name: approver ? `${approver.first_name} ${approver.last_name}` : null,
      };
    }));
    res.json(enriched);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { leave_type_id, start_date, end_date, reason } = req.body;
    const empId = (req.user.role === 'admin' && req.body.employee_id) ? req.body.employee_id : req.user.employeeId;

    // Count working days
    const start = new Date(start_date), end = new Date(end_date);
    let days = 0;
    const cur = new Date(start);
    while (cur <= end) { if (cur.getDay() !== 0 && cur.getDay() !== 6) days++; cur.setDate(cur.getDate() + 1); }

    const leaveType = await db.leaveTypes.findOne({ _id: leave_type_id });
    const currentYear = new Date().getFullYear().toString();
    const approved = await db.leaveRequests.find({ employee_id: empId, leave_type_id, status: 'approved' });
    const used = approved.filter(l => l.start_date?.startsWith(currentYear)).reduce((s, l) => s + (l.days || 0), 0);
    if (used + days > leaveType.days_allowed) {
      return res.status(400).json({ error: `Insufficient ${leaveType.name} balance. Available: ${leaveType.days_allowed - used} days` });
    }

    const now = new Date().toISOString();
    const leave = { _id: uuidv4(), employee_id: empId, leave_type_id, start_date, end_date, days, reason, status: 'pending', created_at: now, updated_at: now };
    await db.leaveRequests.insert(leave);
    res.status(201).json(leave);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/status', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { status, rejection_reason } = req.body;
    if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
    await db.leaveRequests.update({ _id: req.params.id }, { $set: { status, approved_by: req.user.employeeId, approved_at: new Date().toISOString(), rejection_reason, updated_at: new Date().toISOString() } });
    res.json(await db.leaveRequests.findOne({ _id: req.params.id }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authenticate, async (req, res) => {
  try {
    const leave = await db.leaveRequests.findOne({ _id: req.params.id });
    if (!leave) return res.status(404).json({ error: 'Leave not found' });
    if (leave.status !== 'pending') return res.status(400).json({ error: 'Only pending leaves can be cancelled' });
    await db.leaveRequests.update({ _id: req.params.id }, { $set: { status: 'cancelled' } });
    res.json({ message: 'Leave cancelled' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
