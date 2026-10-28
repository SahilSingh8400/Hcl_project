# HCL HR Management System & Workforce Analytics

An enterprise Human Resource Management System (HRMS) with integrated workforce analytics, built with React, Node.js, Express, and NeDB.

---

## 📊 Dataset Specification (5,000 Records)

The system includes a synthesized dataset of **5,000 employee records** generated in strict alignment with enterprise HR modeling standards:

- **Row Count:** 5,000 rows (original 500 records preserved + 4,500 additional records).
- **10 Core Departments (500 records each):**
  1. Engineering
  2. Sales
  3. Operations
  4. Marketing
  5. Human Resources (HR)
  6. Finance
  7. Customer Support
  8. Product
  9. Legal
  10. Information Technology (IT)
- **Hiring Horizon:** 3-year timeline spanning `2024-01-01` to `2026-12-31`.
- **Grade-Based Salary Bands (INR):**
  - **L1 (Entry / Associate):** ₹28,000 - ₹55,000 (Average ~₹48,500)
  - **L2 (Mid / Specialist):** ₹50,000 - ₹88,000 (Average ~₹73,000)
  - **L3 (Senior / Lead):** ₹82,000 - ₹135,000 (Average ~₹108,500)
  - **L4 (Staff / Manager):** ₹125,000 - ₹180,000 (Average ~₹141,500)
  - **L5 (Director / Executive):** ₹165,000 - ₹245,000 (Average ~₹178,500)
  *(Includes realistic 2-5% outliers and anomaly distributions).*
- **Performance Distribution:** Normal distribution with mean $\mu \approx 3.5$, standard deviation $\sigma \approx 0.8$, bounded on a $1.0 - 5.0$ scale.
- **Annual Attrition Rate:** Exactly **12.00%** (600 attrited employees out of 5,000).

---

## 📖 Data Dictionary

| Column Name | Data Type | Nullable | Description | Sample Values |
| :--- | :--- | :--- | :--- | :--- |
| `emp_id` | String / Object | No | Unique sequential employee identification code (`EMP0001` to `EMP5000`) | `EMP0001`, `EMP0002` |
| `department` | String / Object | No | Business department assignment across 10 distinct company departments | `Sales`, `Engineering`, `IT` |
| `grade` | String / Object | No | Seniority and job hierarchy level (`L1` to `L5`) | `L1`, `L2`, `L3`, `L4`, `L5` |
| `join_date` | Date / String | No | Official onboarding date (`YYYY-MM-DD`) across 2024-2026 | `2024-05-24`, `2026-01-25` |
| `monthly_salary_inr` | Float / Numeric | No | Gross monthly compensation in INR aligned with grade salary bands | `40932.0`, `123614.0` |
| `leave_days_taken` | Integer / Numeric | No | Total annual paid leave days utilized by employee (range 0 to 30) | `5`, `14`, `28` |
| `performance_score` | Float / Numeric | No | Annual performance evaluation score following a normal distribution ($1.0 - 5.0$) | `2.7`, `3.5`, `4.8` |
| `attrition` | Integer / Binary | No | Binary attrition indicator ($0 = \text{Active}$, $1 = \text{Attrited}$) yielding 12% attrition | `0`, `1` |

---

## 🚀 Quick Start

1. Double-click `start.bat` in the root folder to start both frontend and backend.
2. Alternatively, run manually:
   ```bash
   # Terminal 1: Backend
   cd backend
   npm start

   # Terminal 2: Frontend
   cd frontend
   npm run dev
   ```
3. To re-seed the 5,000 employee records into the local database at any time:
   ```bash
   cd backend
   npm run seed
   ```

### Default Login Credentials
- **Administrator:** `admin@hcl.com` / `Admin@123`
- **Employee:** `rahul@hcl.com` / `Employee@123`
