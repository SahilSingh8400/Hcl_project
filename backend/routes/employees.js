const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// Helper: enrich employee with dept & manager names
async function enrichEmployee(emp) {
  if (!emp) return null;
  const dept = emp.department_id ? await db.departments.findOne({ _id: emp.department_id }) : null;
  const mgr = emp.manager_id ? await db.employees.findOne({ _id: emp.manager_id }) : null;
  return { ...emp, department_name: dept?.name, manager_name: mgr ? `${mgr.first_name} ${mgr.last_name}` : null };
}

router.get('/', authenticate, async (req, res) => {
  try {
    const { department, status, search } = req.query;
    let query = {};
    if (department) query.department_id = department;
    if (status) query.status = status;

    let employees = await db.employees.find(query).sort({ created_at: -1 });

    if (search) {
      const s = search.toLowerCase();
      employees = employees.filter(e =>
        e.first_name?.toLowerCase().includes(s) ||
        e.last_name?.toLowerCase().includes(s) ||
        e.email?.toLowerCase().includes(s) ||
        e.employee_code?.toLowerCase().includes(s)
      );
    }

    const enriched = await Promise.all(employees.map(enrichEmployee));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const emp = await db.employees.findOne({ _id: req.params.id });
    if (!emp) return res.status(404).json({ error: 'Employee not found' });
    res.json(await enrichEmployee(emp));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { first_name, last_name, email, phone, date_of_birth, gender, address, city, state, country,
      pincode, department_id, designation, employment_type, date_joined, salary, manager_id,
      emergency_contact_name, emergency_contact_phone, bank_account, bank_ifsc, pan_number, aadhar_number } = req.body;

    // Generate code
    const allEmps = await db.employees.find({}).sort({ employee_code: -1 });
    const lastNum = allEmps.length > 0 ? parseInt(allEmps[0].employee_code.replace('EMP', '')) : 0;
    const employee_code = `EMP${String(lastNum + 1).padStart(3, '0')}`;

    const existing = await db.employees.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already exists' });

    const now = new Date().toISOString();
    const id = uuidv4();
    const emp = { _id: id, employee_code, first_name, last_name, email, phone, date_of_birth, gender,
      address, city, state, country: country || 'India', pincode, department_id, designation,
      employment_type: employment_type || 'Full-time', date_joined, salary: Number(salary) || 0,
      manager_id, emergency_contact_name, emergency_contact_phone, bank_account, bank_ifsc,
      pan_number, aadhar_number, status: 'active', created_at: now, updated_at: now };

    await db.employees.insert(emp);

    // Create user account
    const hashed = bcrypt.hashSync('Employee@123', 10);
    await db.users.insert({ _id: uuidv4(), email, password: hashed, role: 'employee', employee_id: id, created_at: now });

    res.status(201).json(await enrichEmployee(emp));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const allowed = ['first_name', 'last_name', 'phone', 'date_of_birth', 'gender', 'address', 'city',
      'state', 'country', 'pincode', 'department_id', 'designation', 'employment_type', 'salary', 'manager_id',
      'status', 'emergency_contact_name', 'emergency_contact_phone', 'bank_account', 'bank_ifsc', 'pan_number', 'aadhar_number'];

    const updates = {};
    Object.keys(req.body).forEach(k => { if (allowed.includes(k)) updates[k] = req.body[k]; });
    updates.updated_at = new Date().toISOString();

    await db.employees.update({ _id: req.params.id }, { $set: updates });
    const emp = await db.employees.findOne({ _id: req.params.id });
    res.json(await enrichEmployee(emp));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', authenticate, authorizeAdmin, async (req, res) => {
  try {
    await db.employees.update({ _id: req.params.id }, { $set: { status: 'inactive', date_left: new Date().toISOString().split('T')[0] } });
    res.json({ message: 'Employee deactivated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/leave-summary', authenticate, async (req, res) => {
  try {
    const leaveTypes = await db.leaveTypes.find({});
    const currentYear = new Date().getFullYear().toString();
    const summary = await Promise.all(leaveTypes.map(async lt => {
      const approved = await db.leaveRequests.find({ employee_id: req.params.id, leave_type_id: lt._id, status: 'approved' });
      const used = approved.filter(l => l.start_date?.startsWith(currentYear)).reduce((s, l) => s + (l.days || 0), 0);
      return { ...lt, used, remaining: Math.max(0, lt.days_allowed - used) };
    }));
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
