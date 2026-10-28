const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

router.get('/', authenticate, async (req, res) => {
  try {
    const { status, category, priority } = req.query;
    let tickets = await db.tickets.find(req.user.role === 'employee' ? { employee_id: req.user.employeeId } : {}).sort({ created_at: -1 });
    if (status) tickets = tickets.filter(t => t.status === status);
    if (category) tickets = tickets.filter(t => t.category === category);
    if (priority) tickets = tickets.filter(t => t.priority === priority);
    const enriched = await Promise.all(tickets.map(async t => {
      const emp = await db.employees.findOne({ _id: t.employee_id });
      const assigned = t.assigned_to ? await db.employees.findOne({ _id: t.assigned_to }) : null;
      return { ...t, employee_name: emp ? `${emp.first_name} ${emp.last_name}` : 'Unknown', employee_code: emp?.employee_code, assigned_to_name: assigned ? `${assigned.first_name} ${assigned.last_name}` : null };
    }));
    res.json(enriched);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticate, async (req, res) => {
  try {
    const { category, subject, description, priority } = req.body;
    const all = await db.tickets.find({}).sort({ created_at: -1 });
    const lastNum = all.length > 0 ? parseInt(all[0].ticket_number.replace('TKT-', '')) : 0;
    const ticket_number = `TKT-${String(lastNum + 1).padStart(3, '0')}`;
    const now = new Date().toISOString();
    const ticket = { _id: uuidv4(), ticket_number, employee_id: req.user.employeeId, category, subject, description, priority: priority || 'medium', status: 'open', created_at: now, updated_at: now };
    await db.tickets.insert(ticket);
    res.status(201).json(ticket);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { status, assigned_to, resolution } = req.body;
    const update = { status, assigned_to, resolution, updated_at: new Date().toISOString() };
    if (status === 'resolved') update.resolved_at = new Date().toISOString();
    await db.tickets.update({ _id: req.params.id }, { $set: update });
    res.json(await db.tickets.findOne({ _id: req.params.id }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authenticate, authorizeAdmin, async (req, res) => {
  try { await db.tickets.remove({ _id: req.params.id }); res.json({ message: 'Ticket deleted' }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
