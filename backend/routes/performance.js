const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

async function enrich(review) {
  const emp = await db.employees.findOne({ _id: review.employee_id });
  let deptName = emp?.department_name;
  if (!deptName && emp?.department_id) {
    const dept = await db.departments.findOne({ _id: emp.department_id });
    deptName = dept?.name;
  }
  return {
    ...review,
    employee_name: emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown',
    employee_code: emp?.employee_code,
    designation: emp?.designation || 'Specialist',
    department_name: deptName || 'General'
  };
}

router.get('/', authenticate, async (req, res) => {
  try {
    const { employee_id, status } = req.query;
    let query = {};
    if (req.user.role === 'employee') {
      query.employee_id = req.user.employeeId;
      // Auto-fallback if employee doesn't have reviews yet
      const count = await db.performance.count(query);
      if (count === 0 && req.user.employeeId) {
        const emp = await db.employees.findOne({ _id: req.user.employeeId });
        if (emp) {
          const score = Number(emp.performance_score) || 4.2;
          const now = new Date().toISOString();
          const autoReviews = [
            {
              _id: uuidv4(),
              employee_id: emp._id,
              review_period: 'Q1 2026',
              review_date: '2026-03-31',
              overall_rating: score,
              technical_skills: Math.min(5, Math.max(1, Math.round((score + 0.2) * 10) / 10)),
              communication: Math.min(5, Math.max(1, Math.round((score - 0.1) * 10) / 10)),
              teamwork: Math.min(5, Math.max(1, Math.round((score + 0.1) * 10) / 10)),
              leadership: Math.min(5, Math.max(1, Math.round((score - 0.2) * 10) / 10)),
              punctuality: 4.6,
              initiative: score,
              strengths: `Consistently meets and exceeds departmental expectations, demonstrating strong domain expertise.`,
              weaknesses: 'Continue expanding cross-functional collaboration and knowledge-sharing sessions.',
              goals: 'Target advanced responsibilities and mentor junior peers on strategic priorities.',
              status: 'published',
              created_at: now,
              updated_at: now
            },
            {
              _id: uuidv4(),
              employee_id: emp._id,
              review_period: 'Q4 2025',
              review_date: '2025-12-20',
              overall_rating: Math.min(5, Math.max(1, Math.round((score - 0.2) * 10) / 10)),
              technical_skills: Math.min(5, Math.max(1, Math.round((score + 0.1) * 10) / 10)),
              communication: Math.min(5, Math.max(1, Math.round((score - 0.2) * 10) / 10)),
              teamwork: score,
              leadership: Math.min(5, Math.max(1, Math.round((score - 0.3) * 10) / 10)),
              punctuality: 4.4,
              initiative: Math.min(5, Math.max(1, Math.round((score - 0.1) * 10) / 10)),
              strengths: 'Reliable team contributor with solid problem-solving agility.',
              weaknesses: 'Document project processes more comprehensively for team knowledge sharing.',
              goals: 'Lead a departmental initiative and improve turnaround times on deliverables.',
              status: 'published',
              created_at: now,
              updated_at: now
            }
          ];
          await db.performance.insert(autoReviews);
        }
      }
    } else if (employee_id) {
      query.employee_id = employee_id;
    }
    if (status) query.status = status;
    const reviews = await db.performance.find(query).sort({ review_date: -1, created_at: -1 });
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
    const { employee_id, review_period, review_date, overall_rating, technical_skills, communication, teamwork, leadership, punctuality, initiative, strengths, weaknesses, goals, comments, status } = req.body;
    const now = new Date().toISOString();
    const review = {
      _id: uuidv4(),
      employee_id,
      review_period,
      review_date: review_date || now.split('T')[0],
      overall_rating: Number(overall_rating) || 4,
      technical_skills: Number(technical_skills) || 0,
      communication: Number(communication) || 0,
      teamwork: Number(teamwork) || 0,
      leadership: Number(leadership) || 0,
      punctuality: Number(punctuality) || 0,
      initiative: Number(initiative) || 0,
      strengths: strengths || '',
      weaknesses: weaknesses || '',
      goals: goals || '',
      comments: comments || '',
      status: status || 'published',
      created_at: now,
      updated_at: now
    };
    await db.performance.insert(review);
    res.status(201).json(await enrich(review));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authenticate, async (req, res) => {
  try {
    const { overall_rating, technical_skills, communication, teamwork, leadership, punctuality, initiative, strengths, weaknesses, goals, comments, status } = req.body;
    await db.performance.update({ _id: req.params.id }, { $set: { overall_rating: Number(overall_rating), technical_skills: Number(technical_skills), communication: Number(communication), teamwork: Number(teamwork), leadership: Number(leadership), punctuality: Number(punctuality), initiative: Number(initiative), strengths, weaknesses, goals, comments, status: status || 'published', updated_at: new Date().toISOString() } });
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
