const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');
const { db } = require('../database');
const { authenticate, authorizeAdmin } = require('../middleware/auth');

async function enrichAsset(a) {
  const emp = a.assigned_to ? await db.employees.findOne({ _id: a.assigned_to }) : null;
  return { ...a, assigned_to_name: emp ? `${emp.first_name} ${emp.last_name}` : null, employee_code: emp?.employee_code };
}

router.get('/', authenticate, async (req, res) => {
  try {
    const { status, category, assigned_to } = req.query;
    let assets = await db.assets.find({}).sort({ created_at: -1 });
    if (status) assets = assets.filter(a => a.status === status);
    if (category) assets = assets.filter(a => a.category === category);
    if (assigned_to) assets = assets.filter(a => a.assigned_to === assigned_to);
    res.json(await Promise.all(assets.map(enrichAsset)));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', authenticate, async (req, res) => {
  try {
    const asset = await db.assets.findOne({ _id: req.params.id });
    if (!asset) return res.status(404).json({ error: 'Asset not found' });
    res.json(await enrichAsset(asset));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { name, category, brand, model, serial_number, purchase_date, purchase_cost, condition, notes } = req.body;
    const all = await db.assets.find({}).sort({ asset_code: -1 });
    const lastNum = all.length > 0 ? parseInt(all[0].asset_code.replace('AST', '')) : 0;
    const asset_code = `AST${String(lastNum + 1).padStart(3, '0')}`;
    const now = new Date().toISOString();
    const asset = { _id: uuidv4(), asset_code, name, category, brand, model, serial_number, purchase_date, purchase_cost: Number(purchase_cost) || 0, current_value: Number(purchase_cost) || 0, status: 'available', condition: condition || 'good', notes, created_at: now, updated_at: now };
    await db.assets.insert(asset);
    res.status(201).json(asset);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { name, brand, model, serial_number, condition, status, notes, current_value } = req.body;
    await db.assets.update({ _id: req.params.id }, { $set: { name, brand, model, serial_number, condition, status, notes, current_value: Number(current_value) || 0, updated_at: new Date().toISOString() } });
    res.json(await enrichAsset(await db.assets.findOne({ _id: req.params.id })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/assign', authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { employee_id } = req.body;
    const update = employee_id
      ? { assigned_to: employee_id, assigned_date: new Date().toISOString().split('T')[0], status: 'assigned', updated_at: new Date().toISOString() }
      : { assigned_to: null, assigned_date: null, status: 'available', updated_at: new Date().toISOString() };
    await db.assets.update({ _id: req.params.id }, { $set: update });
    res.json(await enrichAsset(await db.assets.findOne({ _id: req.params.id })));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authenticate, authorizeAdmin, async (req, res) => {
  try { await db.assets.remove({ _id: req.params.id }); res.json({ message: 'Asset deleted' }); }
  catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
