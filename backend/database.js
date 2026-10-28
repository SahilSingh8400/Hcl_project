const Datastore = require('nedb-promises');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const DATA_DIR = path.join(__dirname, 'data');

// Create all datastores
const db = {
  users: Datastore.create({ filename: path.join(DATA_DIR, 'users.db'), autoload: true }),
  employees: Datastore.create({ filename: path.join(DATA_DIR, 'employees.db'), autoload: true }),
  departments: Datastore.create({ filename: path.join(DATA_DIR, 'departments.db'), autoload: true }),
  attendance: Datastore.create({ filename: path.join(DATA_DIR, 'attendance.db'), autoload: true }),
  leaveTypes: Datastore.create({ filename: path.join(DATA_DIR, 'leave_types.db'), autoload: true }),
  leaveRequests: Datastore.create({ filename: path.join(DATA_DIR, 'leave_requests.db'), autoload: true }),
  payroll: Datastore.create({ filename: path.join(DATA_DIR, 'payroll.db'), autoload: true }),
  performance: Datastore.create({ filename: path.join(DATA_DIR, 'performance.db'), autoload: true }),
  announcements: Datastore.create({ filename: path.join(DATA_DIR, 'announcements.db'), autoload: true }),
  jobs: Datastore.create({ filename: path.join(DATA_DIR, 'jobs.db'), autoload: true }),
  applications: Datastore.create({ filename: path.join(DATA_DIR, 'applications.db'), autoload: true }),
  training: Datastore.create({ filename: path.join(DATA_DIR, 'training.db'), autoload: true }),
  enrollments: Datastore.create({ filename: path.join(DATA_DIR, 'enrollments.db'), autoload: true }),
  assets: Datastore.create({ filename: path.join(DATA_DIR, 'assets.db'), autoload: true }),
  tickets: Datastore.create({ filename: path.join(DATA_DIR, 'tickets.db'), autoload: true }),
  holidays: Datastore.create({ filename: path.join(DATA_DIR, 'holidays.db'), autoload: true }),
};

async function initializeDatabase() {
  const fs = require('fs');
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  // Ensure indexes
  await db.users.ensureIndex({ fieldName: 'email', unique: true });
  await db.employees.ensureIndex({ fieldName: 'email', unique: true });
  await db.employees.ensureIndex({ fieldName: 'employee_code', unique: true });
  await db.attendance.ensureIndex({ fieldName: 'employee_id' });
  await db.leaveRequests.ensureIndex({ fieldName: 'employee_id' });
  await db.payroll.ensureIndex({ fieldName: 'employee_id' });

  // Check if seeded
  const userCount = await db.users.count({});
  if (userCount > 0) {
    console.log('Database already seeded, skipping...');
    return;
  }

  console.log('Seeding initial data...');
  await seedData();
  console.log('Seeding complete!');
}

async function seedData() {
  const now = new Date().toISOString();
  
  // 10 Departments aligning with dataset.csv
  const depts = [
    { _id: uuidv4(), name: 'Sales', description: 'Enterprise and B2B Software Sales', budget: 15000000, created_at: now },
    { _id: uuidv4(), name: 'Engineering', description: 'Software Development & Platform Engineering', budget: 35000000, created_at: now },
    { _id: uuidv4(), name: 'Operations', description: 'Business & Infrastructure Operations', budget: 12000000, created_at: now },
    { _id: uuidv4(), name: 'Marketing', description: 'Brand, Digital Marketing & Growth', budget: 14000000, created_at: now },
    { _id: uuidv4(), name: 'HR', description: 'Human Resources & Talent Management', budget: 8000000, created_at: now },
    { _id: uuidv4(), name: 'Finance', description: 'Finance, Accounts & Corporate Strategy', budget: 10000000, created_at: now },
    { _id: uuidv4(), name: 'Customer Support', description: 'Customer Success & Technical Support', budget: 9000000, created_at: now },
    { _id: uuidv4(), name: 'Product', description: 'Product Management & User Experience', budget: 16000000, created_at: now },
    { _id: uuidv4(), name: 'Legal', description: 'Corporate Legal, Compliance & IP', budget: 7000000, created_at: now },
    { _id: uuidv4(), name: 'IT', description: 'IT Systems, Cloud Infrastructure & Cybersecurity', budget: 18000000, created_at: now },
  ];
  await db.departments.insert(depts);

  const hrDept = depts.find(d => d.name === 'HR') || depts[4];
  const engDept = depts.find(d => d.name === 'Engineering') || depts[1];

  // Try to seed from dataset.csv if exists
  const fs = require('fs');
  const csvPath = fs.existsSync(path.join(__dirname, 'data', 'dataset.csv'))
    ? path.join(__dirname, 'data', 'dataset.csv')
    : path.join(__dirname, '..', 'dataset.csv');

  if (fs.existsSync(csvPath)) {
    console.log('Loading 5,000 employee records from dataset.csv...');
    const { seedFullDataset } = require('./seed_dataset');
    await seedFullDataset();
    return;
  }

  // Employees
  const employees = [
    { _id: uuidv4(), employee_code: 'EMP001', first_name: 'Admin', last_name: 'HR', email: 'admin@hcl.com', phone: '9876543210', date_of_birth: '1985-01-15', gender: 'Male', department_id: hrDept._id, designation: 'HR Director', employment_type: 'Full-time', date_joined: '2020-01-01', status: 'active', salary: 150000, city: 'Noida', state: 'UP', country: 'India', created_at: now },
    { _id: uuidv4(), employee_code: 'EMP002', first_name: 'Rahul', last_name: 'Sharma', email: 'rahul@hcl.com', phone: '9876543211', date_of_birth: '1990-05-20', gender: 'Male', department_id: engDept._id, designation: 'Senior Developer', employment_type: 'Full-time', date_joined: '2021-03-15', status: 'active', salary: 120000, city: 'Noida', state: 'UP', country: 'India', created_at: now },
    { _id: uuidv4(), employee_code: 'EMP003', first_name: 'Priya', last_name: 'Singh', email: 'priya@hcl.com', phone: '9876543212', date_of_birth: '1992-08-10', gender: 'Female', department_id: depts[2]._id, designation: 'Sales Manager', employment_type: 'Full-time', date_joined: '2021-06-01', status: 'active', salary: 100000, city: 'Delhi', state: 'Delhi', country: 'India', created_at: now },
    { _id: uuidv4(), employee_code: 'EMP004', first_name: 'Amit', last_name: 'Kumar', email: 'amit@hcl.com', phone: '9876543213', date_of_birth: '1988-12-25', gender: 'Male', department_id: depts[3]._id, designation: 'Finance Manager', employment_type: 'Full-time', date_joined: '2020-07-01', status: 'active', salary: 110000, city: 'Gurgaon', state: 'Haryana', country: 'India', created_at: now },
    { _id: uuidv4(), employee_code: 'EMP005', first_name: 'Sneha', last_name: 'Patel', email: 'sneha@hcl.com', phone: '9876543214', date_of_birth: '1995-03-08', gender: 'Female', department_id: engDept._id, designation: 'Junior Developer', employment_type: 'Full-time', date_joined: '2022-01-15', status: 'active', salary: 70000, city: 'Noida', state: 'UP', country: 'India', created_at: now },
    { _id: uuidv4(), employee_code: 'EMP006', first_name: 'Vikram', last_name: 'Gupta', email: 'vikram@hcl.com', phone: '9876543215', date_of_birth: '1987-07-19', gender: 'Male', department_id: depts[4]._id, designation: 'Operations Head', employment_type: 'Full-time', date_joined: '2020-04-01', status: 'active', salary: 130000, city: 'Mumbai', state: 'Maharashtra', country: 'India', created_at: now },
    { _id: uuidv4(), employee_code: 'EMP007', first_name: 'Anita', last_name: 'Desai', email: 'anita@hcl.com', phone: '9876543216', date_of_birth: '1993-11-30', gender: 'Female', department_id: depts[5]._id, designation: 'Support Lead', employment_type: 'Full-time', date_joined: '2021-09-01', status: 'active', salary: 80000, city: 'Bangalore', state: 'Karnataka', country: 'India', created_at: now },
    { _id: uuidv4(), employee_code: 'EMP008', first_name: 'Rajesh', last_name: 'Nair', email: 'rajesh@hcl.com', phone: '9876543217', date_of_birth: '1991-04-22', gender: 'Male', department_id: engDept._id, designation: 'Tech Lead', employment_type: 'Full-time', date_joined: '2021-01-10', status: 'active', salary: 140000, city: 'Chennai', state: 'Tamil Nadu', country: 'India', created_at: now },
  ];
  await db.employees.insert(employees);

  const adminEmp = employees[0];

  // Update HR dept with manager
  await db.departments.update({ _id: hrDept._id }, { $set: { manager_id: adminEmp._id } });

  // Users
  const hashedAdmin = bcrypt.hashSync('Admin@123', 10);
  const hashedEmp = bcrypt.hashSync('Employee@123', 10);
  const users = [
    { _id: uuidv4(), email: 'admin@hcl.com', password: hashedAdmin, role: 'admin', employee_id: adminEmp._id, created_at: now },
    ...employees.slice(1).map(e => ({ _id: uuidv4(), email: e.email, password: hashedEmp, role: 'employee', employee_id: e._id, created_at: now })),
  ];
  await db.users.insert(users);

  // Leave Types
  const leaveTypes = [
    { _id: uuidv4(), name: 'Annual Leave', days_allowed: 21, carry_forward: 10, description: 'Yearly paid leave', created_at: now },
    { _id: uuidv4(), name: 'Sick Leave', days_allowed: 12, carry_forward: 0, description: 'Medical sick leave', created_at: now },
    { _id: uuidv4(), name: 'Casual Leave', days_allowed: 7, carry_forward: 0, description: 'Casual personal leave', created_at: now },
    { _id: uuidv4(), name: 'Maternity Leave', days_allowed: 180, carry_forward: 0, description: 'Maternity benefit leave', created_at: now },
    { _id: uuidv4(), name: 'Paternity Leave', days_allowed: 15, carry_forward: 0, description: 'Paternity leave', created_at: now },
    { _id: uuidv4(), name: 'Compensatory Off', days_allowed: 10, carry_forward: 5, description: 'Comp off for overtime work', created_at: now },
  ];
  await db.leaveTypes.insert(leaveTypes);

  // Holidays
  const holidays = [
    { _id: uuidv4(), name: "New Year's Day", date: '2025-01-01', type: 'national', created_at: now },
    { _id: uuidv4(), name: 'Republic Day', date: '2025-01-26', type: 'national', created_at: now },
    { _id: uuidv4(), name: 'Holi', date: '2025-03-14', type: 'festival', created_at: now },
    { _id: uuidv4(), name: 'Good Friday', date: '2025-04-18', type: 'national', created_at: now },
    { _id: uuidv4(), name: 'Independence Day', date: '2025-08-15', type: 'national', created_at: now },
    { _id: uuidv4(), name: 'Gandhi Jayanti', date: '2025-10-02', type: 'national', created_at: now },
    { _id: uuidv4(), name: 'Diwali', date: '2025-10-20', type: 'festival', created_at: now },
    { _id: uuidv4(), name: 'Christmas', date: '2025-12-25', type: 'national', created_at: now },
  ];
  await db.holidays.insert(holidays);

  // Announcements
  await db.announcements.insert([
    { _id: uuidv4(), title: 'Welcome to HCL HR Portal', content: 'We are pleased to announce the launch of our new HR Management System. Please explore all features and report any issues to the HR team.', type: 'general', priority: 'high', is_active: true, created_by: adminEmp._id, created_at: now },
    { _id: uuidv4(), title: 'Q4 Performance Reviews', content: 'Annual performance reviews for Q4 2025 will begin from November 1st. All managers are requested to complete reviews by November 30th.', type: 'performance', priority: 'normal', is_active: true, created_by: adminEmp._id, created_at: now },
    { _id: uuidv4(), title: 'Holiday Schedule 2025', content: 'Please find the updated holiday schedule for 2025 in the system. Total of 8 holidays have been declared.', type: 'general', priority: 'normal', is_active: true, created_by: adminEmp._id, created_at: now },
  ]);

  // Seed attendance for last 30 days
  const attendanceRecords = [];
  const today = new Date();
  for (let i = 1; i <= 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (d.getDay() === 0 || d.getDay() === 6) continue;
    const dateStr = d.toISOString().split('T')[0];
    
    for (const emp of employees) {
      const rand = Math.random();
      let status = 'present', checkIn = '09:00', checkOut = '18:00', work_hours = 9;
      if (rand < 0.05) { status = 'absent'; checkIn = null; checkOut = null; work_hours = 0; }
      else if (rand < 0.15) { status = 'half_day'; checkOut = '13:00'; work_hours = 4; }
      attendanceRecords.push({ _id: uuidv4(), employee_id: emp._id, date: dateStr, check_in: checkIn, check_out: checkOut, status, work_hours, created_at: now });
    }
  }
  if (attendanceRecords.length > 0) await db.attendance.insert(attendanceRecords);

  // Payroll for last 3 months
  const payrollRecords = [];
  for (const emp of employees) {
    const gross = emp.salary;
    const basic = gross * 0.4, hra = gross * 0.2, da = gross * 0.1, special = gross * 0.2;
    const medical = gross * 0.05, transport = gross * 0.05;
    const pf = basic * 0.12, pt = gross > 15000 ? 200 : 0;
    const tax = gross > 100000 ? (gross - 100000) * 0.05 : 0;
    const totalDed = pf + pt + tax;
    const net = gross - totalDed;
    
    for (let m = 7; m <= 9; m++) {
      payrollRecords.push({
        _id: uuidv4(), employee_id: emp._id, month: m, year: 2025,
        basic_salary: basic, hra, da, special_allowance: special, medical_allowance: medical, transport_allowance: transport,
        gross_salary: gross, pf_employee: pf, pf_employer: pf, professional_tax: pt, income_tax: tax,
        other_deductions: 0, total_deductions: totalDed, net_salary: net,
        working_days: 26, present_days: 26, overtime_hours: 0, overtime_pay: 0, bonus: 0,
        status: 'paid', paid_on: `2025-0${m + 1}-05`, payment_mode: 'bank_transfer', created_at: now
      });
    }
  }
  await db.payroll.insert(payrollRecords);

  // Assets
  await db.assets.insert([
    { _id: uuidv4(), asset_code: 'AST001', name: 'MacBook Pro 14"', category: 'Laptop', brand: 'Apple', model: 'M3 Pro', serial_number: 'SN-MAC-001', purchase_date: '2021-03-15', purchase_cost: 250000, current_value: 200000, assigned_to: employees[1]._id, assigned_date: '2021-03-15', status: 'assigned', condition: 'excellent', created_at: now },
    { _id: uuidv4(), asset_code: 'AST002', name: 'Dell Monitor 27"', category: 'Monitor', brand: 'Dell', model: 'U2722D', serial_number: 'SN-DEL-001', purchase_date: '2021-03-15', purchase_cost: 45000, current_value: 35000, assigned_to: employees[1]._id, assigned_date: '2021-03-15', status: 'assigned', condition: 'good', created_at: now },
    { _id: uuidv4(), asset_code: 'AST003', name: 'iPhone 15 Pro', category: 'Mobile', brand: 'Apple', model: 'iPhone 15 Pro', serial_number: 'SN-IPH-001', purchase_date: '2023-10-01', purchase_cost: 134900, current_value: 110000, assigned_to: employees[2]._id, assigned_date: '2023-10-01', status: 'assigned', condition: 'excellent', created_at: now },
    { _id: uuidv4(), asset_code: 'AST004', name: 'HP EliteBook 840', category: 'Laptop', brand: 'HP', model: 'EliteBook 840', serial_number: 'SN-HP-001', purchase_date: '2023-01-01', purchase_cost: 85000, current_value: 70000, assigned_to: null, status: 'available', condition: 'good', created_at: now },
    { _id: uuidv4(), asset_code: 'AST005', name: 'Office Chair', category: 'Furniture', brand: 'Herman Miller', model: 'Aeron', serial_number: 'SN-CH-001', purchase_date: '2020-01-01', purchase_cost: 95000, current_value: 70000, assigned_to: employees[0]._id, assigned_date: '2020-01-01', status: 'assigned', condition: 'good', created_at: now },
  ]);

  // Job Postings
  await db.jobs.insert([
    { _id: uuidv4(), title: 'Senior React Developer', department_id: engDept._id, description: 'Looking for experienced React developer to join our frontend team', requirements: '5+ years React experience, TypeScript, Redux', employment_type: 'Full-time', location: 'Noida / Remote', salary_min: 100000, salary_max: 150000, openings: 2, status: 'open', deadline: '2025-12-31', created_by: adminEmp._id, created_at: now },
    { _id: uuidv4(), title: 'HR Business Partner', department_id: hrDept._id, description: 'HR BP to manage employee relations and HR operations', requirements: '3+ years HR experience, MBA preferred', employment_type: 'Full-time', location: 'Noida', salary_min: 70000, salary_max: 100000, openings: 1, status: 'open', deadline: '2025-11-30', created_by: adminEmp._id, created_at: now },
    { _id: uuidv4(), title: 'Sales Executive', department_id: depts[2]._id, description: 'Drive B2B sales for enterprise software products', requirements: '2+ years B2B sales experience', employment_type: 'Full-time', location: 'Delhi NCR', salary_min: 50000, salary_max: 80000, openings: 3, status: 'open', deadline: '2025-11-15', created_by: adminEmp._id, created_at: now },
  ]);

  // Training Programs
  await db.training.insert([
    { _id: uuidv4(), title: 'Leadership Excellence', description: 'Develop leadership skills for managers', trainer: 'Dr. Anand Mehta', department_id: hrDept._id, start_date: '2025-11-01', end_date: '2025-11-05', duration_hours: 40, mode: 'offline', max_participants: 20, status: 'scheduled', created_by: adminEmp._id, created_at: now },
    { _id: uuidv4(), title: 'AWS Cloud Fundamentals', description: 'Introduction to AWS Cloud Services', trainer: 'Raj Kumar', department_id: engDept._id, start_date: '2025-10-15', end_date: '2025-10-20', duration_hours: 30, mode: 'online', max_participants: 50, status: 'completed', created_by: adminEmp._id, created_at: now },
    { _id: uuidv4(), title: 'Excel for HR Analytics', description: 'Advanced Excel for HR data analysis', trainer: 'Pooja Sharma', department_id: hrDept._id, start_date: '2025-11-15', end_date: '2025-11-17', duration_hours: 20, mode: 'online', max_participants: 30, status: 'scheduled', created_by: adminEmp._id, created_at: now },
  ]);

  // Tickets
  await db.tickets.insert([
    { _id: uuidv4(), ticket_number: 'TKT-001', employee_id: employees[1]._id, category: 'payroll', subject: 'Salary Discrepancy in September', description: 'My September salary was less than expected. Please check the deductions.', priority: 'high', status: 'open', created_at: now },
    { _id: uuidv4(), ticket_number: 'TKT-002', employee_id: employees[4]._id, category: 'leave', subject: 'Leave Balance Update', description: 'My leave balance is not reflecting the approved leaves.', priority: 'medium', status: 'in_progress', created_at: now },
    { _id: uuidv4(), ticket_number: 'TKT-003', employee_id: employees[2]._id, category: 'general', subject: 'Work From Home Request', description: 'Requesting approval for permanent WFH arrangement.', priority: 'low', status: 'resolved', resolution: 'Approved for 3 days per week WFH', resolved_at: now, created_at: now },
  ]);

  // Performance Reviews
  await db.performance.insert([
    { _id: uuidv4(), employee_id: employees[1]._id, reviewer_id: adminEmp._id, review_period: 'Q3 2025', review_date: '2025-10-01', overall_rating: 4.2, technical_skills: 4.5, communication: 3.8, teamwork: 4.0, leadership: 4.0, punctuality: 4.5, initiative: 4.2, strengths: 'Strong technical skills, quick learner', weaknesses: 'Can improve communication', goals: 'Lead a major project in Q4', status: 'published', created_at: now },
    { _id: uuidv4(), employee_id: employees[4]._id, reviewer_id: adminEmp._id, review_period: 'Q3 2025', review_date: '2025-10-01', overall_rating: 3.8, technical_skills: 4.0, communication: 4.2, teamwork: 4.5, leadership: 3.5, punctuality: 3.8, initiative: 3.5, strengths: 'Great team player, collaborative', weaknesses: 'Needs to take more ownership', goals: 'Improve technical depth, handle features independently', status: 'published', created_at: now },
  ]);
}

module.exports = { db, initializeDatabase };
