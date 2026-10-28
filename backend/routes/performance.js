const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

async function enrich(review) {
  const emp = await db.employees.findOne({ _id: review.employee_id });
  const reviewer = await db.employees.findOne({ _id: review.reviewer_id });
  const dept = emp?.department_id ? await db.departments.findOne({ _id: emp.department_id }) : null;
  return { ...review, employee_name: emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown', employee_code: emp?.employee_code, reviewer_name: reviewer ? `${reviewer.first_name} ${reviewer.last_name}` : 'Unknown', designation: emp?.designation, department_name: dept?.name };
}

router.get('/', authenticate, async (req, res) => {
  try {
    const { employee_id, status } = req.query;
    let query = {};
    if (req.user.role === 'employee') query = { $or: [{ employee_id: req.user.employeeId }, { reviewer_id: req.user.employeeId }] };
    else if (employee_id) query.employee_id = employee_id;
    if (status) query.status = status;
    const reviews = await db.performance.find(query).sort({ created_at: -1 });
    res.json(await Promise.all(reviews.map(enrich)));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const review = await db.performance.findOne({ _id: req.params.id });
    if (!review) return res.status(404).json({ error: 'Review not found' });
    res.json(await enrich(review));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { employee_id, review_period, review_date, overall_rating, technical_skills, communication, teamwork, leadership, punctuality, initiative, strengths, weaknesses, goals, comments } = req.body;
    const now = new Date().toISOString();
    const review = { _id: uuidv4(), employee_id, reviewer_id: req.user.employeeId, review_period, review_date, overall_rating: Number(overall_rating), technical_skills: Number(technical_skills) || 0, communication: Number(communication) || 0, teamwork: Number(teamwork) || 0, leadership: Number(leadership) || 0, punctuality: Number(punctuality) || 0, initiative: Number(initiative) || 0, strengths, weaknesses, goals, comments, status: 'draft', created_at: now, updated_at: now };
    await db.performance.insert(review);
    res.status(201).json(await enrich(review));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const { overall_rating, technical_skills, communication, teamwork, leadership, punctuality, initiative, strengths, weaknesses, goals, comments, status } = req.body;
    await db.performance.update({ _id: req.params.id }, { $set: { overall_rating: Number(overall_rating), technical_skills: Number(technical_skills), communication: Number(communication), teamwork: Number(teamwork), leadership: Number(leadership), punctuality: Number(punctuality), initiative: Number(initiative), strengths, weaknesses, goals, comments, status: status || 'draft', updated_at: new Date().toISOString() } });
    res.json(await enrich(await db.performance.findOne({ _id: req.params.id })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authenticate, authorizeAdmin, async (req, res) => {
  try {
    await db.performance.remove({ _id: req.params.id });
    res.json({ message: 'Review deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
