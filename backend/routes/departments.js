const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

router.get('/', authenticate, async (req, res) => {
  try {
    const depts = await db.departments.find({});
    const enriched = await Promise.all(depts.map(async d => {
      const mgr = d.manager_id ? await db.employees.findOne({ _id: d.manager_id }) : null;
      const empCount = await db.employees.count({ department_id: d._id, status: 'active' });
      return { ...d, manager_name: mgr ? `${mgr.first_name} ${mgr.last_name}` : null, employee_count: empCount };
    }));
    res.json(enriched.sort((a, b) => a.name.localeCompare(b.name)));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const dept = await db.departments.findOne({ _id: req.params.id });
    if (!dept) return res.status(404).json({ error: 'Department not found' });
    const mgr = dept.manager_id ? await db.employees.findOne({ _id: dept.manager_id }) : null;
    const employees = await db.employees.find({ department_id: req.params.id, status: 'active' });
    res.json({ ...dept, manager_name: mgr ? `${mgr.first_name} ${mgr.last_name}` : null, employees });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { name, description, manager_id, budget } = req.body;
    const existing = await db.departments.findOne({ name });
    if (existing) return res.status(400).json({ error: 'Department name already exists' });
    const now = new Date().toISOString();
    const dept = { _id: uuidv4(), name, description, manager_id, budget: Number(budget) || 0, created_at: now, updated_at: now };
    await db.departments.insert(dept);
    res.status(201).json(dept);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { name, description, manager_id, budget } = req.body;
    await db.departments.update({ _id: req.params.id }, { $set: { name, description, manager_id, budget: Number(budget) || 0, updated_at: new Date().toISOString() } });
    res.json(await db.departments.findOne({ _id: req.params.id }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const empCount = await db.employees.count({ department_id: req.params.id, status: 'active' });
    if (empCount > 0) return res.status(400).json({ error: 'Cannot delete department with active employees' });
    await db.departments.remove({ _id: req.params.id });
    res.json({ message: 'Department deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
