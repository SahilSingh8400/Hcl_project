const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

const firstNames = [
  'Aarav', 'Aditi', 'Amit', 'Ananya', 'Anita', 'Ansh', 'Arjun', 'Bhavna', 'Chetan', 'Deepak',
  'Divya', 'Gaurav', 'Geeta', 'Harsh', 'Isha', 'Ishaan', 'Jaya', 'Karan', 'Kavita', 'Kiran',
  'Krishna', 'Madhav', 'Manish', 'Meera', 'Mohan', 'Neha', 'Nikhil', 'Nisha', 'Pankaj', 'Pooja',
  'Pradeep', 'Prakash', 'Prateek', 'Priya', 'Rahul', 'Rajesh', 'Ramesh', 'Ravi', 'Ritu', 'Rohan',
  'Rohit', 'Sachin', 'Sameer', 'Sanjay', 'Sangeeta', 'Shalini', 'Shikha', 'Shivam', 'Shreya', 'Siddharth',
  'Sneha', 'Sunil', 'Suresh', 'Swati', 'Tanvi', 'Tarun', 'Varun', 'Vikas', 'Vikram', 'Vinay'
];

const lastNames = [
  'Agarwal', 'Bansal', 'Bhatia', 'Chauhan', 'Chopra', 'Das', 'Desai', 'Dubey', 'Ghosh', 'Gupta',
  'Iyer', 'Jain', 'Jha', 'Joshi', 'Kapoor', 'Kaul', 'Khan', 'Kulkarni', 'Kumar', 'Mahajan',
  'Malhotra', 'Mani', 'Mehta', 'Mishra', 'Mukherjee', 'Nair', 'Nangia', 'Pandey', 'Patel', 'Patil',
  'Pillai', 'Prasad', 'Rao', 'Reddy', 'Roy', 'Sahni', 'Saxena', 'Sen', 'Shah', 'Sharma',
  'Shukla', 'Singh', 'Sinha', 'Soni', 'Srivastava', 'Tiwari', 'Tripathi', 'Varma', 'Verma', 'Yadav'
];

const cities = [
  { city: 'Noida', state: 'Uttar Pradesh' },
  { city: 'Gurgaon', state: 'Haryana' },
  { city: 'Bengaluru', state: 'Karnataka' },
  { city: 'Hyderabad', state: 'Telangana' },
  { city: 'Chennai', state: 'Tamil Nadu' },
  { city: 'Pune', state: 'Maharashtra' },
  { city: 'Mumbai', state: 'Maharashtra' },
  { city: 'Delhi', state: 'Delhi' },
  { city: 'Kolkata', state: 'West Bengal' }
];

const designations = {
  Engineering: {
    L1: 'Associate Software Engineer',
    L2: 'Software Engineer',
    L3: 'Senior Software Engineer',
    L4: 'Principal Engineer',
    L5: 'Engineering Director'
  },
  Sales: {
    L1: 'Sales Associate',
    L2: 'Account Executive',
    L3: 'Senior Account Executive',
    L4: 'Sales Manager',
    L5: 'Director of Sales'
  },
  Marketing: {
    L1: 'Marketing Associate',
    L2: 'Marketing Specialist',
    L3: 'Senior Marketing Manager',
    L4: 'Lead Marketing Strategist',
    L5: 'VP of Marketing'
  },
  HR: {
    L1: 'HR Coordinator',
    L2: 'HR Specialist',
    L3: 'Senior HR Business Partner',
    L4: 'HR Manager',
    L5: 'HR Director'
  },
  Finance: {
    L1: 'Financial Analyst I',
    L2: 'Financial Analyst II',
    L3: 'Senior Financial Analyst',
    L4: 'Finance Manager',
    L5: 'Director of Finance'
  },
  Operations: {
    L1: 'Operations Associate',
    L2: 'Operations Specialist',
    L3: 'Senior Operations Manager',
    L4: 'Operations Lead',
    L5: 'Operations Director'
  },
  'Customer Support': {
    L1: 'Support Executive',
    L2: 'Senior Support Specialist',
    L3: 'Support Team Lead',
    L4: 'Customer Success Manager',
    L5: 'Head of Customer Support'
  },
  Product: {
    L1: 'Associate Product Manager',
    L2: 'Product Manager',
    L3: 'Senior Product Manager',
    L4: 'Lead Product Manager',
    L5: 'VP of Product'
  },
  Legal: {
    L1: 'Junior Legal Associate',
    L2: 'Legal Counsel',
    L3: 'Senior Legal Counsel',
    L4: 'Associate General Counsel',
    L5: 'General Counsel'
  },
  IT: {
    L1: 'IT Support Specialist',
    L2: 'Systems Administrator',
    L3: 'Senior DevOps Engineer',
    L4: 'IT Infrastructure Manager',
    L5: 'Head of IT & Infrastructure'
  }
};

async function seedFullDataset() {
  const Datastore = require('nedb-promises');
  const DATA_DIR = path.join(__dirname, 'data');
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

  const db = {
    users: Datastore.create({ filename: path.join(DATA_DIR, 'users.db'), autoload: true }),
    employees: Datastore.create({ filename: path.join(DATA_DIR, 'employees.db'), autoload: true }),
    departments: Datastore.create({ filename: path.join(DATA_DIR, 'departments.db'), autoload: true }),
    attendance: Datastore.create({ filename: path.join(DATA_DIR, 'attendance.db'), autoload: true }),
    payroll: Datastore.create({ filename: path.join(DATA_DIR, 'payroll.db'), autoload: true })
  };

  const csvPath = fs.existsSync(path.join(__dirname, 'data', 'dataset.csv'))
    ? path.join(__dirname, 'data', 'dataset.csv')
    : path.join(__dirname, '..', 'dataset.csv');
  const lines = fs.readFileSync(csvPath, 'utf8').trim().split('\n').filter(l => l.trim().length > 0);
  const rows = lines.slice(1).map(l => l.trim().split(','));

  console.log(`Read ${rows.length} rows from dataset.csv`);

  const now = new Date().toISOString();

  // Define the 10 departments
  const deptConfigs = [
    { name: 'Sales', description: 'Enterprise and B2B Software Sales', budget: 15000000 },
    { name: 'Engineering', description: 'Software Development & Platform Engineering', budget: 35000000 },
    { name: 'Operations', description: 'Business & Infrastructure Operations', budget: 12000000 },
    { name: 'Marketing', description: 'Brand, Digital Marketing & Growth', budget: 14000000 },
    { name: 'HR', description: 'Human Resources & Talent Management', budget: 8000000 },
    { name: 'Finance', description: 'Finance, Accounts & Corporate Strategy', budget: 10000000 },
    { name: 'Customer Support', description: 'Customer Success & Technical Support', budget: 9000000 },
    { name: 'Product', description: 'Product Management & User Experience', budget: 16000000 },
    { name: 'Legal', description: 'Corporate Legal, Compliance & IP', budget: 7000000 },
    { name: 'IT', description: 'IT Systems, Cloud Infrastructure & Cybersecurity', budget: 18000000 }
  ];

  // Clear existing
  await db.departments.remove({}, { multi: true });
  await db.employees.remove({}, { multi: true });
  await db.users.remove({}, { multi: true });

  const deptMap = {};
  const deptsToInsert = [];
  for (const d of deptConfigs) {
    const id = uuidv4();
    deptMap[d.name] = id;
    deptsToInsert.push({
      _id: id,
      name: d.name,
      description: d.description,
      budget: d.budget,
      created_at: now
    });
  }
  await db.departments.insert(deptsToInsert);
  console.log(`Inserted ${deptsToInsert.length} departments.`);

  const hashedAdmin = bcrypt.hashSync('Admin@123', 10);
  const hashedEmp = bcrypt.hashSync('Employee@123', 10);

  const employeesToInsert = [];
  const usersToInsert = [];

  for (let idx = 0; idx < rows.length; idx++) {
    const [emp_id, deptName, grade, join_date, monthly_salary_inr, leave_days_taken, performance_score, attrition] = rows[idx];
    const empNum = idx + 1;
    const empIdGuid = uuidv4();

    let first, last, email;
    if (emp_id === 'EMP0001') {
      first = 'Admin';
      last = 'HR';
      email = 'admin@hcl.com';
    } else if (emp_id === 'EMP0002') {
      first = 'Rahul';
      last = 'Sharma';
      email = 'rahul@hcl.com';
    } else {
      first = firstNames[idx % firstNames.length];
      last = lastNames[Math.floor(idx / firstNames.length) % lastNames.length];
      email = `${first.toLowerCase()}.${last.toLowerCase()}${empNum}@hcl.com`;
    }

    const loc = cities[idx % cities.length];
    const deptId = deptMap[deptName];
    const desig = designations[deptName]?.[grade] || `${deptName} Professional`;

    const gender = (idx % 3 === 0) ? 'Female' : 'Male';
    const isAttrited = Number(attrition) === 1;

    const empObj = {
      _id: empIdGuid,
      employee_code: emp_id,
      first_name: first,
      last_name: last,
      email,
      phone: `987${String(1000000 + (idx % 9000000))}`,
      date_of_birth: `19${85 + (idx % 15)}-0${1 + (idx % 9)}-${String(1 + (idx % 28)).padStart(2, '0')}`,
      gender,
      department_id: deptId,
      department_name: deptName,
      designation: desig,
      grade,
      employment_type: 'Full-time',
      date_joined: join_date,
      salary: parseFloat(monthly_salary_inr),
      monthly_salary_inr: parseFloat(monthly_salary_inr),
      leave_days_taken: parseInt(leave_days_taken, 10),
      performance_score: parseFloat(performance_score),
      attrition: isAttrited ? 1 : 0,
      status: isAttrited ? 'inactive' : 'active',
      city: loc.city,
      state: loc.state,
      country: 'India',
      created_at: `${join_date}T09:00:00.000Z`,
      updated_at: now
    };

    employeesToInsert.push(empObj);

    // Create user accounts for Admin and Rahul, and first 50 sample employees
    if (emp_id === 'EMP0001') {
      usersToInsert.push({
        _id: uuidv4(),
        email: 'admin@hcl.com',
        password: hashedAdmin,
        role: 'admin',
        employee_id: empIdGuid,
        created_at: now
      });
    } else if (emp_id === 'EMP0002') {
      usersToInsert.push({
        _id: uuidv4(),
        email: 'rahul@hcl.com',
        password: hashedEmp,
        role: 'employee',
        employee_id: empIdGuid,
        created_at: now
      });
    } else if (idx < 50) {
      usersToInsert.push({
        _id: uuidv4(),
        email,
        password: hashedEmp,
        role: 'employee',
        employee_id: empIdGuid,
        created_at: now
      });
    }
  }

  console.log(`Inserting ${employeesToInsert.length} employees into db.employees...`);
  await db.employees.insert(employeesToInsert);
  console.log(`Employees inserted successfully.`);

  console.log(`Inserting ${usersToInsert.length} users into db.users...`);
  await db.users.insert(usersToInsert);

  // Set HR manager
  const adminEmp = employeesToInsert[0];
  await db.departments.update({ name: 'HR' }, { $set: { manager_id: adminEmp._id } });

  // Clear and seed Attendance & Payroll with valid employee references
  await db.attendance.remove({}, { multi: true });
  await db.payroll.remove({}, { multi: true });

  // Select sample of active employees across all 10 departments (e.g. first 200 employees)
  const sampleEmps = employeesToInsert.filter(e => e.status === 'active').slice(0, 200);

  console.log(`Generating attendance and payroll records for ${sampleEmps.length} active employees...`);

  // Seed attendance for the last 30 days
  const attendanceRecords = [];
  const today = new Date();
  for (let i = 0; i <= 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (d.getDay() === 0 || d.getDay() === 6) continue; // Skip weekends
    const dateStr = d.toISOString().split('T')[0];

    for (const emp of sampleEmps) {
      const rand = Math.random();
      let status = 'present', checkIn = '09:00', checkOut = '18:00', work_hours = 9;
      if (rand < 0.05) {
        status = 'absent'; checkIn = null; checkOut = null; work_hours = 0;
      } else if (rand < 0.15) {
        status = 'half_day'; checkOut = '13:00'; work_hours = 4;
      }
      attendanceRecords.push({
        _id: uuidv4(),
        employee_id: emp._id,
        employee_code: emp.employee_code,
        employee_name: `${emp.first_name} ${emp.last_name}`,
        department_name: emp.department_name,
        date: dateStr,
        check_in: checkIn,
        check_out: checkOut,
        status,
        work_hours,
        created_at: now
      });
    }
  }
  await db.attendance.insert(attendanceRecords);
  console.log(`Inserted ${attendanceRecords.length} attendance records.`);

  // Seed Payroll records for recent months in 2026 (Aug, Sep, Oct 2026) and 2025
  const payrollRecords = [];
  for (const emp of sampleEmps) {
    const gross = emp.salary || emp.monthly_salary_inr || 65000;
    const basic = Math.round(gross * 0.4);
    const hra = Math.round(gross * 0.2);
    const da = Math.round(gross * 0.1);
    const special = Math.round(gross * 0.2);
    const medical = Math.round(gross * 0.05);
    const transport = Math.round(gross * 0.05);
    const pf = Math.round(basic * 0.12);
    const pt = gross > 15000 ? 200 : 0;
    const tax = gross > 100000 ? Math.round((gross - 100000) * 0.05) : 0;
    const totalDed = pf + pt + tax;
    const net = gross - totalDed;

    // Months 5 to 10 for 2026 (May, Jun, Jul, Aug, Sep, Oct)
    for (const m of [5, 6, 7, 8, 9, 10]) {
      payrollRecords.push({
        _id: uuidv4(),
        employee_id: emp._id,
        employee_code: emp.employee_code,
        employee_name: `${emp.first_name} ${emp.last_name}`,
        designation: emp.designation,
        department_name: emp.department_name,
        month: m,
        year: 2026,
        basic_salary: basic,
        hra,
        da,
        special_allowance: special,
        medical_allowance: medical,
        transport_allowance: transport,
        gross_salary: gross,
        pf_employee: pf,
        pf_employer: pf,
        professional_tax: pt,
        income_tax: tax,
        other_deductions: 0,
        total_deductions: totalDed,
        net_salary: net,
        working_days: 26,
        present_days: Math.max(22, 26 - Math.floor(Math.random() * 3)),
        overtime_hours: 0,
        overtime_pay: 0,
        bonus: 0,
        status: 'paid',
        paid_on: `2026-${String(m).padStart(2, '0')}-28`,
        payment_mode: 'bank_transfer',
        created_at: now
      });
    }

    // Also months 10, 11, 12 for 2025
    for (const m of [10, 11, 12]) {
      payrollRecords.push({
        _id: uuidv4(),
        employee_id: emp._id,
        employee_code: emp.employee_code,
        employee_name: `${emp.first_name} ${emp.last_name}`,
        designation: emp.designation,
        department_name: emp.department_name,
        month: m,
        year: 2025,
        basic_salary: basic,
        hra,
        da,
        special_allowance: special,
        medical_allowance: medical,
        transport_allowance: transport,
        gross_salary: gross,
        pf_employee: pf,
        pf_employer: pf,
        professional_tax: pt,
        income_tax: tax,
        other_deductions: 0,
        total_deductions: totalDed,
        net_salary: net,
        working_days: 26,
        present_days: 26,
        overtime_hours: 0,
        overtime_pay: 0,
        bonus: 0,
        status: 'paid',
        paid_on: `2025-${String(m).padStart(2, '0')}-30`,
        payment_mode: 'bank_transfer',
        created_at: now
      });
    }
  }
  await db.payroll.insert(payrollRecords);
  console.log(`Inserted ${payrollRecords.length} payroll records.`);

  console.log('Database seeding with 5,000 employee records, attendance & payroll complete!');
}

if (require.main === module) {
  seedFullDataset().catch(console.error);
}

module.exports = { seedFullDataset };
