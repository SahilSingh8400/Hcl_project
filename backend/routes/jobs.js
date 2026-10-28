const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

async function enrichJob(job) {
  const dept = job.department_id ? await db.departments.findOne({ _id: job.department_id }) : null;
  const apps = await db.applications.count({ job_id: job._id });
  return { ...job, department_name: dept?.name, application_count: apps };
}

router.get('/', authenticate, async (req, res) => {
  try {
    const { status, department_id } = req.query;
    let query = {};
    if (status) query.status = status;
    if (department_id) query.department_id = department_id;
    const jobs = await db.jobs.find(query).sort({ created_at: -1 });
    res.json(await Promise.all(jobs.map(enrichJob)));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const job = await db.jobs.findOne({ _id: req.params.id });
    if (!job) return res.status(404).json({ error: 'Job not found' });
    const applications = await db.applications.find({ job_id: req.params.id }).sort({ created_at: -1 });
    res.json({ ...await enrichJob(job), applications });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { title, department_id, description, requirements, employment_type, location, salary_min, salary_max, openings, deadline } = req.body;
    const now = new Date().toISOString();
    const job = { _id: uuidv4(), title, department_id, description, requirements, employment_type: employment_type || 'Full-time', location, salary_min: Number(salary_min) || 0, salary_max: Number(salary_max) || 0, openings: Number(openings) || 1, status: 'open', deadline, created_by: req.user.employeeId, created_at: now, updated_at: now };
    await db.jobs.insert(job);
    res.status(201).json(await enrichJob(job));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { title, description, requirements, status, employment_type, location, salary_min, salary_max, openings, deadline } = req.body;
    await db.jobs.update({ _id: req.params.id }, { $set: { title, description, requirements, status, employment_type, location, salary_min: Number(salary_min), salary_max: Number(salary_max), openings: Number(openings), deadline, updated_at: new Date().toISOString() } });
    res.json(await enrichJob(await db.jobs.findOne({ _id: req.params.id })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authenticate, authorizeAdmin, async (req, res) => {
  try { await db.jobs.remove({ _id: req.params.id }); res.json({ message: 'Job posting deleted' }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/apply', authenticate, async (req, res) => {
  try {
    const { applicant_name, applicant_email, applicant_phone, cover_letter } = req.body;
    const now = new Date().toISOString();
    const app = { _id: uuidv4(), job_id: req.params.id, applicant_name, applicant_email, applicant_phone, cover_letter, status: 'applied', created_at: now, updated_at: now };
    await db.applications.insert(app);
    res.status(201).json(app);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/applications/:id', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { status, interview_date, notes } = req.body;
    await db.applications.update({ _id: req.params.id }, { $set: { status, interview_date, notes, updated_at: new Date().toISOString() } });
    res.json(await db.applications.findOne({ _id: req.params.id }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
