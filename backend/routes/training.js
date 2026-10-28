const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

router.get('/', authenticate, async (req, res) => {
  try {
    const { status, department_id } = req.query;
    let programs = await db.training.find({}).sort({ created_at: -1 });
    if (status) programs = programs.filter(p => p.status === status);
    if (department_id) programs = programs.filter(p => p.department_id === department_id);
    const enriched = await Promise.all(programs.map(async p => {
      const dept = p.department_id ? await db.departments.findOne({ _id: p.department_id }) : null;
      const count = await db.enrollments.count({ training_id: p._id });
      return { ...p, department_name: dept?.name, enrolled_count: count };
    }));
    res.json(enriched);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/my/enrollments', authenticate, async (req, res) => {
  try {
    const enrollments = await db.enrollments.find({ employee_id: req.user.employeeId }).sort({ created_at: -1 });
    const enriched = await Promise.all(enrollments.map(async e => {
      const prog = await db.training.findOne({ _id: e.training_id });
      return { ...e, title: prog?.title, start_date: prog?.start_date, end_date: prog?.end_date, trainer: prog?.trainer, mode: prog?.mode, program_status: prog?.status };
    }));
    res.json(enriched);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const program = await db.training.findOne({ _id: req.params.id });
    if (!program) return res.status(404).json({ error: 'Training not found' });
    const dept = program.department_id ? await db.departments.findOne({ _id: program.department_id }) : null;
    const enrollments = await db.enrollments.find({ training_id: req.params.id });
    const enrichedEnroll = await Promise.all(enrollments.map(async e => {
      const emp = await db.employees.findOne({ _id: e.employee_id });
      return { ...e, employee_name: emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown', employee_code: emp?.employee_code };
    }));
    res.json({ ...program, department_name: dept?.name, enrollments: enrichedEnroll });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { title, description, trainer, department_id, start_date, end_date, duration_hours, mode, max_participants } = req.body;
    const now = new Date().toISOString();
    const prog = { _id: uuidv4(), title, description, trainer, department_id, start_date, end_date, duration_hours: Number(duration_hours) || 0, mode: mode || 'online', max_participants: Number(max_participants) || 50, status: 'scheduled', created_by: req.user.employeeId, created_at: now };
    await db.training.insert(prog);
    res.status(201).json(prog);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { title, description, trainer, start_date, end_date, duration_hours, mode, max_participants, status } = req.body;
    await db.training.update({ _id: req.params.id }, { $set: { title, description, trainer, start_date, end_date, duration_hours: Number(duration_hours), mode, max_participants: Number(max_participants), status } });
    res.json(await db.training.findOne({ _id: req.params.id }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/enroll', authenticate, async (req, res) => {
  try {
    const empId = req.body.employee_id || req.user.employeeId;
    const existing = await db.enrollments.findOne({ training_id: req.params.id, employee_id: empId });
    if (existing) return res.status(400).json({ error: 'Already enrolled' });
    const now = new Date().toISOString();
    const enroll = { _id: uuidv4(), training_id: req.params.id, employee_id: empId, enrollment_date: now.split('T')[0], status: 'enrolled', score: null, certificate_issued: false, created_at: now };
    await db.enrollments.insert(enroll);
    res.status(201).json({ message: 'Enrolled successfully' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/enrollments/:id', authenticate, async (req, res) => {
  try {
    const { status, score, completion_date, certificate_issued } = req.body;
    await db.enrollments.update({ _id: req.params.id }, { $set: { status, score: Number(score) || null, completion_date, certificate_issued: !!certificate_issued } });
    res.json(await db.enrollments.findOne({ _id: req.params.id }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
