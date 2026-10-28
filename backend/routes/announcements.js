const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

router.get('/', authenticate, async (req, res) => {
  try {
    const { type, active } = req.query;
    let ann = await db.announcements.find({}).sort({ created_at: -1 });
    if (type) ann = ann.filter(a => a.type === type);
    if (active !== undefined) ann = ann.filter(a => a.is_active === (active === 'true'));
    const enriched = await Promise.all(ann.map(async a => {
      const creator = a.created_by ? await db.employees.findOne({ _id: a.created_by }) : null;
      return { ...a, created_by_name: creator ? `${creator.first_name} ${creator.last_name}` : 'Admin' };
    }));
    res.json(enriched);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { title, content, type, priority, target_department, expires_at } = req.body;
    const now = new Date().toISOString();
    const ann = { _id: uuidv4(), title, content, type: type || 'general', priority: priority || 'normal', target_department, created_by: req.user.employeeId, is_active: true, expires_at, created_at: now, updated_at: now };
    await db.announcements.insert(ann);
    res.status(201).json(ann);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { title, content, type, priority, is_active, expires_at } = req.body;
    await db.announcements.update({ _id: req.params.id }, { $set: { title, content, type, priority, is_active, expires_at, updated_at: new Date().toISOString() } });
    res.json(await db.announcements.findOne({ _id: req.params.id }));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authenticate, authorizeAdmin, async (req, res) => {
  try {
    await db.announcements.remove({ _id: req.params.id });
    res.json({ message: 'Announcement deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
