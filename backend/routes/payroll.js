const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

function enrichPayroll(p, empMap = null, deptMap = null) {
  let emp = null;
  if (empMap) {
    emp = empMap[p.employee_id] || empMap[p.employee_code];
  }
  const deptName = deptMap && emp?.department_id ? deptMap[emp.department_id] : (emp?.department_name || p.department_name);
  return {
    ...p,
    employee_name: emp ? `${emp.first_name} ${emp.last_name}` : (p.employee_name || 'HCL Employee'),
    employee_code: emp?.employee_code || p.employee_code,
    designation: emp?.designation || p.designation || 'Staff',
    department_name: deptName || 'General'
  };
}

async function ensureEmployeePayslips(empId) {
  try {
    const existing = await db.payroll.findOne({ employee_id: empId });
    if (!existing) {
      const emp = (await db.employees.findOne({ _id: empId })) || (await db.employees.findOne({ employee_code: empId }));
      if (emp) {
        const gross = emp.salary || emp.monthly_salary_inr || 65000;
        const basic = Math.round(gross * 0.4);
        const hra = Math.round(gross * 0.2);
        const da = Math.round(gross * 0.1);
        const special = Math.round(gross * 0.2);
        const medical = Math.round(gross * 0.05);
        const transport = Math.round(gross * 0.05);
        const pf = Math.round(basic * 0.12);
        const pt = gross > 15000 ? 200 : 0;
        const tax = gross > 100000 ? Math.round((gross - 100000) * 0.05) : 0;
        const totalDed = pf + pt + tax;
        const net = gross - totalDed;
        const newRecords = [];
        const now = new Date().toISOString();
        for (const m of [5, 6, 7, 8, 9, 10]) {
          newRecords.push({
            _id: uuidv4(),
            employee_id: emp._id,
            employee_code: emp.employee_code,
            employee_name: `${emp.first_name} ${emp.last_name}`,
            designation: emp.designation,
            department_name: emp.department_name,
            month: m,
            year: 2026,
            basic_salary: basic,
            hra,
            da,
            special_allowance: special,
            medical_allowance: medical,
            transport_allowance: transport,
            gross_salary: gross,
            pf_employee: pf,
            pf_employer: pf,
            professional_tax: pt,
            income_tax: tax,
            other_deductions: 0,
            total_deductions: totalDed,
            net_salary: net,
            working_days: 26,
            present_days: Math.max(22, 26 - Math.floor(Math.random() * 3)),
            overtime_hours: 0,
            overtime_pay: 0,
            bonus: 0,
            status: 'paid',
            paid_on: `2026-${String(m).padStart(2, '0')}-28`,
            payment_mode: 'bank_transfer',
            created_at: now
          });
        }
        await db.payroll.insert(newRecords);
      }
    }
  } catch (err) {
    console.error('Error auto-generating payslips:', err);
  }
}

router.get('/', authenticate, async (req, res) => {
  try {
    const { employee_id, month, year, status, department, search } = req.query;
    let query = {};
    const empIdToQuery = req.user.role === 'employee' ? req.user.employeeId : employee_id;

    if (empIdToQuery) {
      await ensureEmployeePayslips(empIdToQuery);
      query.employee_id = empIdToQuery;
    }

    if (month) query.month = Number(month);
    if (year) query.year = Number(year);
    if (status) query.status = status;

    let records = await db.payroll.find(query).sort({ year: -1, month: -1 });

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

    let enriched = records
      .map(p => enrichPayroll(p, empMap, deptMap))
      .filter(p => (p.gross_salary > 0 || p.basic_salary > 0) && p.employee_name && p.employee_name.trim().length > 0 && p.employee_name !== 'Unknown');

    if (department && department !== 'all') {
      enriched = enriched.filter(p => p.department_name && p.department_name.toLowerCase() === department.toLowerCase());
    }

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      enriched = enriched.filter(p => 
        (p.employee_name && p.employee_name.toLowerCase().includes(q)) ||
        (p.employee_code && p.employee_code.toLowerCase().includes(q)) ||
        (p.designation && p.designation.toLowerCase().includes(q))
      );
    }

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
    const emp = (await db.employees.findOne({ _id: record.employee_id })) || (await db.employees.findOne({ employee_code: record.employee_id }));
    const dept = emp?.department_id ? await db.departments.findOne({ _id: emp.department_id }) : null;
    res.json({
      ...record,
      employee_name: emp ? `${emp.first_name} ${emp.last_name}` : (record.employee_name || 'HCL Employee'),
      employee_code: emp?.employee_code || record.employee_code,
      designation: emp?.designation || record.designation || 'Staff',
      department_name: dept?.name || record.department_name || 'General'
    });
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

      const gross = emp.monthly_salary_inr || emp.salary || 65000;
      const basic = Math.round(gross * 0.4);
      const hra = Math.round(gross * 0.2);
      const da = Math.round(gross * 0.1);
      const special = Math.round(gross * 0.2);
      const medical = Math.round(gross * 0.05);
      const transport = Math.round(gross * 0.05);
      const pf = Math.round(basic * 0.12);
      const pt = gross > 15000 ? 200 : 0;
      const tax = gross > 100000 ? Math.round((gross - 100000) * 0.05) : 0;
      const totalDed = pf + pt + tax;
      const net = gross - totalDed;

      const prefix = `${year}-${String(month).padStart(2, '0')}`;
      const att = await db.attendance.find({ employee_id: emp._id });
      const present = att.filter(a => a.date?.startsWith(prefix) && a.status === 'present').length;

      const now = new Date().toISOString();
      const p = {
        _id: uuidv4(),
        employee_id: emp._id,
        employee_code: emp.employee_code,
        employee_name: `${emp.first_name} ${emp.last_name}`,
        designation: emp.designation || 'Staff',
        department_name: emp.department_name || 'Engineering',
        month: Number(month),
        year: Number(year),
        basic_salary: basic,
        hra,
        da,
        special_allowance: special,
        medical_allowance: medical,
        transport_allowance: transport,
        gross_salary: gross,
        pf_employee: pf,
        pf_employer: pf,
        professional_tax: pt,
        income_tax: tax,
        other_deductions: 0,
        total_deductions: totalDed,
        net_salary: net,
        working_days: 26,
        present_days: present || 26,
        overtime_hours: 0,
        overtime_pay: 0,
        bonus: 0,
        status: 'paid',
        paid_on: `${year}-${String(month).padStart(2, '0')}-28`,
        payment_mode: 'bank_transfer',
        created_at: now,
        updated_at: now
      };
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
