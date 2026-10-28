const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

async function enrichPayroll(p) {
  const emp = await db.employees.findOne({ _id: p.employee_id });
  const dept = emp?.department_id ? await db.departments.findOne({ _id: emp.department_id }) : null;
  return { ...p, employee_name: emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown', employee_code: emp?.employee_code, designation: emp?.designation, department_name: dept?.name };
}

router.get('/', authenticate, async (req, res) => {
  try {
    const { employee_id, month, year, status } = req.query;
    let query = {};
    if (req.user.role === 'employee') query.employee_id = req.user.employeeId;
    else if (employee_id) query.employee_id = employee_id;
    if (month) query.month = Number(month);
    if (year) query.year = Number(year);
    if (status) query.status = status;
    const records = await db.payroll.find(query).sort({ year: -1, month: -1 });
    const enriched = await Promise.all(records.map(enrichPayroll));
    res.json(enriched);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/summary/monthly', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const all = await db.payroll.find({});
    const map = {};
    all.forEach(p => {
      const key = `${p.year}-${p.month}`;
      if (!map[key]) map[key] = { month: p.month, year: p.year, total_employees: 0, total_gross: 0, total_deductions: 0, total_net: 0, status: p.status };
      map[key].total_employees++;
      map[key].total_gross += p.gross_salary || 0;
      map[key].total_deductions += p.total_deductions || 0;
      map[key].total_net += p.net_salary || 0;
    });
    const result = Object.values(map).sort((a, b) => b.year !== a.year ? b.year - a.year : b.month - a.month).slice(0, 12);
    res.json(result);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const record = await db.payroll.findOne({ _id: req.params.id });
    if (!record) return res.status(404).json({ error: 'Not found' });
    res.json(await enrichPayroll(record));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/generate', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { month, year } = req.body;
    const employees = await db.employees.find({ status: 'active' });
    const results = [];

    for (const emp of employees) {
      const existing = await db.payroll.findOne({ employee_id: emp._id, month: Number(month), year: Number(year) });
      if (existing) continue;

      const gross = emp.salary || 0;
      const basic = gross * 0.4, hra = gross * 0.2, da = gross * 0.1, special = gross * 0.2;
      const medical = gross * 0.05, transport = gross * 0.05;
      const pf = basic * 0.12, pt = gross > 15000 ? 200 : 0;
      const tax = gross > 100000 ? (gross - 100000) * 0.05 : 0;
      const totalDed = pf + pt + tax;
      const net = gross - totalDed;

      const prefix = `${year}-${String(month).padStart(2, '0')}`;
      const att = await db.attendance.find({ employee_id: emp._id });
      const present = att.filter(a => a.date?.startsWith(prefix) && a.status === 'present').length;

      const now = new Date().toISOString();
      const p = { _id: uuidv4(), employee_id: emp._id, month: Number(month), year: Number(year),
        basic_salary: basic, hra, da, special_allowance: special, medical_allowance: medical, transport_allowance: transport,
        gross_salary: gross, pf_employee: pf, pf_employer: pf, professional_tax: pt, income_tax: tax,
        other_deductions: 0, total_deductions: totalDed, net_salary: net,
        working_days: 26, present_days: present || 26, overtime_hours: 0, overtime_pay: 0, bonus: 0,
        status: 'draft', payment_mode: 'bank_transfer', created_at: now, updated_at: now };
      await db.payroll.insert(p);
      results.push({ employee_id: emp._id, employee_name: `${emp.first_name} ${emp.last_name}`, net_salary: net });
    }
    res.json({ message: `Payroll generated for ${results.length} employees`, data: results });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const record = await db.payroll.findOne({ _id: req.params.id });
    if (!record) return res.status(404).json({ error: 'Not found' });
    const { bonus, overtime_hours, overtime_pay, other_deductions, status, paid_on, payment_mode } = req.body;
    const newBonus = bonus !== undefined ? Number(bonus) : record.bonus;
    const newOT = overtime_pay !== undefined ? Number(overtime_pay) : record.overtime_pay;
    const newOtherDed = other_deductions !== undefined ? Number(other_deductions) : record.other_deductions;
    const totalDed = record.pf_employee + record.professional_tax + record.income_tax + newOtherDed;
    const net = record.gross_salary + newBonus + newOT - totalDed;
    await db.payroll.update({ _id: req.params.id }, { $set: { bonus: newBonus, overtime_hours: overtime_hours ?? record.overtime_hours, overtime_pay: newOT, other_deductions: newOtherDed, total_deductions: totalDed, net_salary: net, status: status || record.status, paid_on: paid_on || record.paid_on, payment_mode: payment_mode || record.payment_mode, updated_at: new Date().toISOString() } });
    res.json(await enrichPayroll(await db.payroll.findOne({ _id: req.params.id })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/approve', authenticate, authorizeAdmin, async (req, res) => {
  try {
    await db.payroll.update({ _id: req.params.id }, { $set: { status: 'paid', paid_on: new Date().toISOString().split('T')[0], updated_at: new Date().toISOString() } });
    res.json({ message: 'Payroll approved and marked as paid' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
