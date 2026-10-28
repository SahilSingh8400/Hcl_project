const express = require('express');
const cors = require('cors');
const path = require('path');
const { initializeDatabase } = require('./database');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: 'http://localhost:5173', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/employees', require('./routes/employees'));
app.use('/api/departments', require('./routes/departments'));
app.use('/api/attendance', require('./routes/attendance'));
app.use('/api/leaves', require('./routes/leaves'));
app.use('/api/payroll', require('./routes/payroll'));
app.use('/api/performance', require('./routes/performance'));
app.use('/api/announcements', require('./routes/announcements'));
app.use('/api/jobs', require('./routes/jobs'));
app.use('/api/training', require('./routes/training'));
app.use('/api/assets', require('./routes/assets'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/holidays', require('./routes/holidays'));
app.use('/api/dashboard', require('./routes/dashboard'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', message: 'HCL HR System API Running', timestamp: new Date().toISOString() }));

// Start server after DB init
initializeDatabase().then(() => {
  app.listen(PORT, () => {
    console.log(`\n🚀 HCL HR Management System`);
    console.log(`📡 Server running on http://localhost:${PORT}`);
    console.log(`\n📋 Default Credentials:`);
    console.log(`   Admin:    admin@hcl.com / Admin@123`);
    console.log(`   Employee: rahul@hcl.com / Employee@123\n`);
  });
}).catch(err => {
  console.error('Failed to initialize database:', err);
  process.exit(1);
});

module.exports = app;
