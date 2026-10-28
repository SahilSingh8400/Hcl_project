const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

router.get('/', authenticate, async (req, res) => {
  try { res.json((await db.holidays.find({})).sort((a, b) => a.date.localeCompare(b.date))); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { name, date, type, description } = req.body;
    const existing = await db.holidays.findOne({ date });
    if (existing) return res.status(400).json({ error: 'Holiday on this date already exists' });
    const h = { _id: uuidv4(), name, date, type: type || 'national', description, created_at: new Date().toISOString() };
    await db.holidays.insert(h);
    res.status(201).json(h);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authenticate, authorizeAdmin, async (req, res) => {
  try { await db.holidays.remove({ _id: req.params.id }); res.json({ message: 'Holiday deleted' }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
