import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { toast } from 'react-hot-toast';
import {
  ArrowLeft, Mail, Phone, MapPin, Calendar, Briefcase,
  Building2, DollarSign, Star, FileText, CheckCircle, ShieldCheck
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Modal from '../components/Modal';

const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [emp, setEmp] = useState(null);
  const [leaveSummary, setLeaveSummary] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [payrollRecords, setPayrollRecords] = useState([]);
  const [selectedPayslip, setSelectedPayslip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    let isMounted = true;
    api.get(`/employees/${id}`)
      .then(e => {
        if (!isMounted) return;
        setEmp(e.data);
        setLoading(false);
        // Load auxiliary data asynchronously
        api.get(`/employees/${id}/leave-summary`).then(l => isMounted && setLeaveSummary(l.data)).catch(() => {});
        api.get(`/employees/${id}/performance`).then(p => isMounted && setPerformance(p.data)).catch(() => {});
        api.get(`/employees/${id}/payroll`).then(pay => isMounted && setPayrollRecords(pay.data)).catch(() => {});
      })
      .catch((err) => {
        console.error('Error loading employee:', err);
        if (isMounted) {
          toast.error('Failed to load employee details');
          setLoading(false);
        }
      });

    return () => { isMounted = false; };
  }, [id]);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>;
  if (!emp) return <div className="text-center py-20 text-gray-400">Employee not found</div>;

  const tabs = ['overview', 'payroll', 'leaves', 'performance'];

  // Salary calculations
  const grossSalary = emp.salary || emp.monthly_salary_inr || 0;
  const basicSalary = Math.round(grossSalary * 0.4);
  const hra = Math.round(grossSalary * 0.2);
  const da = Math.round(grossSalary * 0.1);
  const specialAllowance = Math.round(grossSalary * 0.2);
  const medicalAllowance = Math.round(grossSalary * 0.05);
  const transportAllowance = Math.round(grossSalary * 0.05);

  const pf = Math.round(basicSalary * 0.12);
  const pt = grossSalary > 15000 ? 200 : 0;
  const tax = grossSalary > 100000 ? Math.round((grossSalary - 100000) * 0.05) : 0;
  const totalDeductions = pf + pt + tax;
  const netSalary = grossSalary - totalDeductions;
  const annualCTC = grossSalary * 12;

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm">
        <ArrowLeft size={16} />Back to Employees
      </button>

      {/* Header Card */}
      <div className="card">
        <div className="flex flex-wrap items-start gap-6">
          <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-2xl">{emp.first_name?.[0]}{emp.last_name?.[0]}</span>
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{emp.first_name} {emp.last_name}</h1>
                <p className="text-gray-500">{emp.designation}</p>
                <div className="flex items-center gap-3 mt-2 text-sm text-gray-500 flex-wrap">
                  <span className="flex items-center gap-1"><Building2 size={14} />{emp.department_name || 'N/A'}</span>
                  <span className="flex items-center gap-1"><Briefcase size={14} />{emp.employment_type || 'Full-time'}</span>
                  <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded font-semibold">{emp.employee_code}</span>
                  <span className="px-2 py-0.5 rounded text-xs font-bold bg-purple-50 text-purple-700 border border-purple-200">
                    Grade {emp.grade || 'L2'}
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                    <Star size={12} className="fill-amber-400 text-amber-400" />
                    Rating: {emp.performance_score ? Number(emp.performance_score).toFixed(1) : '3.5'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`badge ${emp.attrition === 1 || emp.status === 'inactive' ? 'badge-red' : 'badge-green'} text-sm px-3 py-1 font-semibold`}>
                  {emp.attrition === 1 || emp.status === 'inactive' ? 'Attrited' : 'Active'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${tab===t ? 'border-blue-600 text-blue-600 font-semibold' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{t}</button>
        ))}
      </div>

      {/* TAB 1: OVERVIEW */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal */}
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">Personal Information</h3>
            <dl className="space-y-3">
              {[
                { label: 'Email Address', value: emp.email, icon: Mail },
                { label: 'Phone Number', value: emp.phone || '—', icon: Phone },
                { label: 'Date of Birth', value: emp.date_of_birth || '—', icon: Calendar },
                { label: 'Gender', value: emp.gender || '—', icon: null },
                { label: 'Location / Address', value: [emp.address, emp.city, emp.state, emp.country].filter(Boolean).join(', ') || 'Noida, Uttar Pradesh, India', icon: MapPin },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex gap-3">
                  {Icon && <Icon size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />}
                  <div><div className="text-xs text-gray-500">{label}</div><div className="text-sm text-gray-800">{value}</div></div>
                </div>
              ))}
            </dl>
          </div>

          {/* Employment */}
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">Employment & Compensation</h3>
            <dl className="space-y-3">
              {[
                { label: 'Date Joined', value: emp.date_joined || '2024-01-01' },
                { label: 'Department', value: emp.department_name || 'Engineering' },
                { label: 'Corporate Grade', value: `${emp.grade || 'L2'} Seniority Band` },
                { label: 'Monthly Gross Salary', value: `₹${grossSalary.toLocaleString()} INR` },
                { label: 'Net Monthly In-Hand', value: `₹${netSalary.toLocaleString()} INR` },
                { label: 'Annual CTC', value: `₹${(annualCTC / 100000).toFixed(2)} Lakhs / annum` },
                { label: 'Annual Leave Taken', value: `${emp.leave_days_taken || 14} days utilized` },
                { label: 'Performance Rating', value: `${emp.performance_score ? Number(emp.performance_score).toFixed(1) : '3.5'} / 5.0 (Normal Distribution)` }
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between py-1 border-b border-gray-50 last:border-0 text-sm">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-medium text-gray-900">{value}</span>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}

      {/* TAB 2: PAYROLL */}
      {tab === 'payroll' && (
        <div className="space-y-6">
          {/* Quick Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card bg-blue-50/50 border border-blue-100">
              <div className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Monthly Gross</div>
              <div className="text-2xl font-bold text-blue-900 mt-1">₹{grossSalary.toLocaleString()}</div>
              <div className="text-xs text-blue-600 mt-0.5">Grade {emp.grade || 'L2'} Band</div>
            </div>
            <div className="card bg-green-50/50 border border-green-100">
              <div className="text-xs font-semibold text-green-700 uppercase tracking-wide">Net Take-Home</div>
              <div className="text-2xl font-bold text-green-900 mt-1">₹{netSalary.toLocaleString()}</div>
              <div className="text-xs text-green-600 mt-0.5">Transferred to Bank Account</div>
            </div>
            <div className="card bg-red-50/50 border border-red-100">
              <div className="text-xs font-semibold text-red-700 uppercase tracking-wide">Total Deductions</div>
              <div className="text-2xl font-bold text-red-900 mt-1">₹{totalDeductions.toLocaleString()}</div>
              <div className="text-xs text-red-600 mt-0.5">PF, PT & TDS Income Tax</div>
            </div>
            <div className="card bg-purple-50/50 border border-purple-100">
              <div className="text-xs font-semibold text-purple-700 uppercase tracking-wide">Annual CTC</div>
              <div className="text-2xl font-bold text-purple-900 mt-1">₹{(annualCTC/100000).toFixed(2)}L</div>
              <div className="text-xs text-purple-600 mt-0.5">Cost to Company</div>
            </div>
          </div>

          {/* Salary Breakdown (Earnings vs Deductions) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center justify-between">
                <span>Monthly Earnings Breakdown</span>
                <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">100% Gross</span>
              </h3>
              <div className="space-y-2 text-sm">
                {[
                  ['Basic Salary (40%)', basicSalary],
                  ['House Rent Allowance (HRA 20%)', hra],
                  ['Dearness Allowance (DA 10%)', da],
                  ['Special Allowance (20%)', specialAllowance],
                  ['Medical Allowance (5%)', medicalAllowance],
                  ['Transport Allowance (5%)', transportAllowance]
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between py-1.5 border-b border-gray-50">
                    <span className="text-gray-600">{label}</span>
                    <span className="font-medium text-gray-900">₹{val.toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2.5 font-bold text-blue-700 border-t border-gray-200">
                  <span>Gross Monthly Salary</span>
                  <span>₹{grossSalary.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-4 flex items-center justify-between">
                <span>Monthly Statutory Deductions</span>
                <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded">Standard Deductions</span>
              </h3>
              <div className="space-y-2 text-sm">
                {[
                  ['Provident Fund (Employee PF 12%)', pf],
                  ['Provident Fund (Employer PF Match)', pf],
                  ['Professional Tax (PT)', pt],
                  ['Income Tax / TDS (Estimated)', tax]
                ].map(([label, val]) => (
                  <div key={label} className="flex justify-between py-1.5 border-b border-gray-50">
                    <span className="text-gray-600">{label}</span>
                    <span className="font-medium text-red-600">-₹{val.toLocaleString()}</span>
                  </div>
                ))}
                <div className="flex justify-between py-2.5 font-bold text-red-700 border-t border-gray-200">
                  <span>Total Deductions</span>
                  <span>-₹{totalDeductions.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payslip History Table */}
          <div className="card p-0 overflow-hidden">
            <div className="p-4 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-gray-900">Payslip History</h3>
                <p className="text-xs text-gray-500">Official monthly payroll disbursement records</p>
              </div>
              <span className="badge badge-green">{payrollRecords.length} Payslips Available</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50/50 border-b border-gray-100">
                  <tr>
                    <th className="table-th">Pay Period</th>
                    <th className="table-th">Working Days</th>
                    <th className="table-th">Gross Salary</th>
                    <th className="table-th">Deductions</th>
                    <th className="table-th">Net Pay</th>
                    <th className="table-th">Payment Mode</th>
                    <th className="table-th">Status</th>
                    <th className="table-th">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {payrollRecords.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-10 text-gray-400">Loading payslip records...</td></tr>
                  ) : payrollRecords.map(p => (
                    <tr key={p._id} className="table-tr">
                      <td className="table-td font-semibold text-gray-900">{months[(p.month || 1) - 1]} {p.year}</td>
                      <td className="table-td text-gray-600">{p.present_days || 26} / {p.working_days || 26} days</td>
                      <td className="table-td font-medium">₹{Math.round(p.gross_salary || grossSalary).toLocaleString()}</td>
                      <td className="table-td text-red-600">-₹{Math.round(p.total_deductions || totalDeductions).toLocaleString()}</td>
                      <td className="table-td font-bold text-green-700">₹{Math.round(p.net_salary || netSalary).toLocaleString()}</td>
                      <td className="table-td text-xs text-gray-500 capitalize">{p.payment_mode ? p.payment_mode.replace('_', ' ') : 'Bank Transfer'}</td>
                      <td className="table-td"><span className="badge badge-green font-semibold">Paid ✓</span></td>
                      <td className="table-td">
                        <button
                          onClick={() => setSelectedPayslip({ ...p, employee_name: `${emp.first_name} ${emp.last_name}`, designation: emp.designation, department_name: emp.department_name })}
                          className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-1"
                        >
                          <FileText size={13} /> View Payslip
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: LEAVES */}
      {tab === 'leaves' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">Leave Balance (Current Year)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={leaveSummary}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="used" fill="#ef4444" name="Used" radius={[4,4,0,0]} />
                <Bar dataKey="remaining" fill="#10b981" name="Remaining" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">Leave Summary</h3>
            <div className="space-y-3">
              {leaveSummary.map(lt => (
                <div key={lt._id} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{lt.name}</span>
                      <span className="font-medium">{lt.used}/{lt.days_allowed} used</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (lt.remaining/lt.days_allowed)*100)}%` }} /></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PERFORMANCE */}
      {tab === 'performance' && (
        <div className="space-y-4">
          {performance.length === 0 ? <div className="card text-center py-12 text-gray-400">No performance reviews yet</div> : performance.map(pr => (
            <div key={pr._id} className="card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-800">{pr.review_period}</h3>
                  <p className="text-sm text-gray-500">{pr.review_date ? `Evaluation Date: ${pr.review_date}` : 'Annual Assessment'}</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-blue-600">{pr.overall_rating}</div>
                  <div className="text-xs text-gray-500">/ 5.0</div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                {[['Technical Skills', pr.technical_skills], ['Communication', pr.communication], ['Teamwork', pr.teamwork], ['Leadership', pr.leadership], ['Punctuality', pr.punctuality], ['Initiative', pr.initiative]].map(([k, v]) => (
                  <div key={k} className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">{k}</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${(v/5)*100}%` }} /></div>
                      <span className="text-sm font-bold text-gray-700">{v}</span>
                    </div>
                  </div>
                ))}
              </div>
              {pr.strengths && <div className="mb-2"><span className="text-xs font-semibold text-green-600 uppercase">Strengths</span><p className="text-sm text-gray-700 mt-1">{pr.strengths}</p></div>}
              {pr.goals && <div><span className="text-xs font-semibold text-blue-600 uppercase">Goals</span><p className="text-sm text-gray-700 mt-1">{pr.goals}</p></div>}
            </div>
          ))}
        </div>
      )}

      {/* Payslip Modal */}
      {selectedPayslip && <PayslipModal record={selectedPayslip} onClose={() => setSelectedPayslip(null)} />}
    </div>
  );
}

function PayslipModal({ record: r, onClose }) {
  return (
    <Modal title="HCL Employee Payslip" onClose={onClose} size="lg">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start p-4 bg-blue-50 rounded-xl">
          <div>
            <div className="font-bold text-blue-900 text-lg">HCL Technologies Ltd.</div>
            <div className="text-blue-700 text-sm">Monthly Payslip · {months[(r.month || 1) - 1]} {r.year}</div>
            <div className="text-xs text-blue-600 mt-1">Payment Mode: Direct Bank Transfer</div>
          </div>
          <div className="text-right">
            <div className="font-semibold text-gray-800">{r.employee_name}</div>
            <div className="text-sm text-gray-600">{r.designation}</div>
            <div className="text-xs text-gray-500">{r.department_name}</div>
          </div>
        </div>

        {/* Earnings vs Deductions */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">Earnings (INR)</h3>
            <div className="space-y-2 text-sm">
              {[
                ['Basic Salary', r.basic_salary],
                ['HRA', r.hra],
                ['DA', r.da],
                ['Special Allowance', r.special_allowance],
                ['Medical Allowance', r.medical_allowance],
                ['Transport Allowance', r.transport_allowance]
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-1 border-b border-gray-50">
                  <span className="text-gray-600">{k}</span>
                  <span className="font-medium">₹{Math.round(v || 0).toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between py-2 font-bold text-green-700 border-t border-gray-200">
                <span>Gross Monthly Earnings</span><span>₹{Math.round(r.gross_salary || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">Deductions (INR)</h3>
            <div className="space-y-2 text-sm">
              {[
                ['PF (Employee 12%)', r.pf_employee],
                ['PF (Employer Contribution)', r.pf_employer],
                ['Professional Tax (PT)', r.professional_tax],
                ['TDS Income Tax', r.income_tax]
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between py-1 border-b border-gray-50">
                  <span className="text-gray-600">{k}</span>
                  <span className="font-medium text-red-600">-₹{Math.round(v || 0).toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between py-2 font-bold text-red-600 border-t border-gray-200">
                <span>Total Deductions</span><span>-₹{Math.round(r.total_deductions || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Net Take Home */}
        <div className="flex justify-between items-center p-4 bg-green-50 rounded-xl">
          <div>
            <span className="font-bold text-green-800 text-lg block">Net Disbursed Salary</span>
            <span className="text-xs text-green-600">Disbursed on: {r.paid_on || '2026-10-28'}</span>
          </div>
          <span className="font-bold text-green-700 text-3xl">₹{Math.round(r.net_salary || 0).toLocaleString()}</span>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <button onClick={() => window.print()} className="btn-secondary">Print / Download</button>
          <button onClick={onClose} className="btn-primary">Close</button>
        </div>
      </div>
    </Modal>
  );
}
