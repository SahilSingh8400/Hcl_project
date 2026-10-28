const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { db } = require('../database');
const { JWT_SECRET, authenticate } = require('../middleware/auth');

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    const user = await db.users.findOne({ email });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = bcrypt.compareSync(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const employee = await db.employees.findOne({ _id: user.employee_id });
    const dept = employee?.department_id ? await db.departments.findOne({ _id: employee.department_id }) : null;
    const empWithDept = employee ? { ...employee, department_name: dept?.name } : null;

    const token = jwt.sign(
      { userId: user._id, employeeId: user.employee_id, role: user.role, email: user.email },
      JWT_SECRET, { expiresIn: '8h' }
    );

    const { password: _, ...safeUser } = user;
    res.json({ token, user: safeUser, employee: empWithDept });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', authenticate, async (req, res) => {
  try {
    const user = await db.users.findOne({ _id: req.user.userId });
    const employee = await db.employees.findOne({ _id: user.employee_id });
    const dept = employee?.department_id ? await db.departments.findOne({ _id: employee.department_id }) : null;
    const { password: _, ...safeUser } = user;
    res.json({ user: safeUser, employee: employee ? { ...employee, department_name: dept?.name } : null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/change-password', authenticate, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await db.users.findOne({ _id: req.user.userId });
    if (!bcrypt.compareSync(currentPassword, user.password)) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    const hashed = bcrypt.hashSync(newPassword, 10);
    await db.users.update({ _id: req.user.userId }, { $set: { password: hashed } });
    res.json({ message: 'Password changed successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
