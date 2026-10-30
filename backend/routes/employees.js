const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');
const { authenticate, authorizeAdmin } = require('../middleware/auth');
const bcrypt = require('bcryptjs');

// Helper: enrich employee with dept & manager names
async function enrichEmployee(emp, deptMap = null) {
  if (!emp) return null;
  const deptName = deptMap ? deptMap[emp.department_id] : (emp.department_id ? (await db.departments.findOne({ _id: emp.department_id }))?.name : null);
  return {
    ...emp,
    department_name: deptName || emp.department_name,
    salary: emp.salary || emp.monthly_salary_inr || 0,
    monthly_salary_inr: emp.monthly_salary_inr || emp.salary || 0
  };
}

router.get('/', authenticate, async (req, res) => {
  try {
    const { department, status, grade, attrition, search, page, limit } = req.query;
    let query = {};
    if (department) query.department_id = department;
    if (status) query.status = status;
    if (grade) query.grade = grade;
    if (attrition !== undefined && attrition !== '') query.attrition = Number(attrition);

    let employees = await db.employees.find(query).sort({ employee_code: 1 });

    if (search) {
      const s = search.toLowerCase();
      employees = employees.filter(e =>
        e.first_name?.toLowerCase().includes(s) ||
        e.last_name?.toLowerCase().includes(s) ||
        e.email?.toLowerCase().includes(s) ||
        e.employee_code?.toLowerCase().includes(s) ||
        e.designation?.toLowerCase().includes(s) ||
        e.grade?.toLowerCase().includes(s)
      );
    }

    const totalCount = employees.length;

    // Preload departments for fast batch enrichment
    const depts = await db.departments.find({});
    const deptMap = {};
    depts.forEach(d => { deptMap[d._id] = d.name; });

    // Handle pagination if page or limit requested
    if (page || limit) {
      const currentPage = Math.max(1, parseInt(page, 10) || 1);
      const pageSize = limit === 'all' ? totalCount : Math.max(1, parseInt(limit, 10) || 20);
      const startIndex = (currentPage - 1) * pageSize;
      const paginatedEmployees = employees.slice(startIndex, startIndex + pageSize);

      const enriched = await Promise.all(paginatedEmployees.map(e => enrichEmployee(e, deptMap)));
      return res.json({
        data: enriched,
        total: totalCount,
        page: currentPage,
        limit: pageSize,
        totalPages: Math.ceil(totalCount / pageSize)
      });
    }

    // If no pagination requested, limit to 200 by default for safety unless requested
    const enriched = await Promise.all(employees.slice(0, 500).map(e => enrichEmployee(e, deptMap)));
    res.json(enriched);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const emp = (await db.employees.findOne({ _id: req.params.id })) ||
                (await db.employees.findOne({ employee_code: req.params.id }));
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
    const emp = (await db.employees.findOne({ _id: req.params.id })) ||
                (await db.employees.findOne({ employee_code: req.params.id }));
    const leaveTypes = await db.leaveTypes.find({});
    const currentYear = new Date().getFullYear().toString();
    const summary = await Promise.all(leaveTypes.map(async lt => {
      const approved = emp ? await db.leaveRequests.find({ employee_id: emp._id, leave_type_id: lt._id, status: 'approved' }) : [];
      let used = approved.filter(l => l.start_date?.startsWith(currentYear)).reduce((s, l) => s + (l.days || 0), 0);
      if (used === 0 && emp?.leave_days_taken && lt.name === 'Annual Leave') {
        used = Math.min(lt.days_allowed, emp.leave_days_taken);
      }
      return { ...lt, used, remaining: Math.max(0, lt.days_allowed - used) };
    }));
    res.json(summary);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/performance', authenticate, async (req, res) => {
  try {
    const emp = (await db.employees.findOne({ _id: req.params.id })) ||
                (await db.employees.findOne({ employee_code: req.params.id }));
    if (!emp) return res.status(404).json({ error: 'Employee not found' });

    let reviews = await db.performance.find({ employee_id: emp._id }).sort({ review_date: -1, created_at: -1 });
    if (reviews.length === 0) {
      const score = emp.performance_score || 3.5;
      reviews = [{
        _id: uuidv4(),
        employee_id: emp._id,
        review_period: 'Annual Evaluation 2025-2026',
        review_date: '2025-12-15',
        overall_rating: score,
        technical_skills: Math.min(5, Math.max(1, Math.round((score + 0.2) * 10) / 10)),
        communication: Math.min(5, Math.max(1, Math.round((score - 0.1) * 10) / 10)),
        teamwork: Math.min(5, Math.max(1, Math.round((score + 0.1) * 10) / 10)),
        leadership: Math.min(5, Math.max(1, Math.round((score - 0.2) * 10) / 10)),
        punctuality: 4.5,
        initiative: score,
        strengths: `Consistently displays strong domain competencies aligned with grade ${emp.grade || 'L2'}.`,
        weaknesses: 'Can take on higher cross-functional ownership across departments.',
        goals: `Advance leadership roadmap and target next grade promotion.`,
        status: 'published'
      }];
    }
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/:id/payroll', authenticate, async (req, res) => {
  try {
    const emp = (await db.employees.findOne({ _id: req.params.id })) ||
                (await db.employees.findOne({ employee_code: req.params.id }));
    if (!emp) return res.status(404).json({ error: 'Employee not found' });

    let records = await db.payroll.find({ employee_id: emp._id }).sort({ year: -1, month: -1 });
    if (records.length === 0) {
      // Auto-generate realistic payslips for recent months of 2026 based on their monthly salary & grade
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

      const generated = [];
      const now = new Date().toISOString();
      for (const m of [10, 9, 8, 7, 6, 5]) {
        const item = {
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
        };
        generated.push(item);
      }
      await db.payroll.insert(generated);
      records = generated;
    }

    res.json(records);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
