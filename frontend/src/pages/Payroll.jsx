import { useState, useEffect, useMemo } from 'react';
import api from '../lib/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Plus, Download, Check, FileText, Search, Printer, ChevronLeft, ChevronRight, DollarSign, Building2 } from 'lucide-react';
import Modal from '../components/Modal';

const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const departments = [
  'Sales', 'Engineering', 'Operations', 'Marketing', 'HR',
  'Finance', 'Customer Support', 'Product', 'Legal', 'IT'
];

export default function Payroll() {
  const { isAdmin, user, employee } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState('2026');
  const [filterDept, setFilterDept] = useState('');
  const [showGenerate, setShowGenerate] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = 25;

  const fetchPayroll = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterMonth) params.append('month', filterMonth);
      if (filterYear) params.append('year', filterYear);
      if (filterDept) params.append('department', filterDept);
      if (search.trim()) params.append('search', search.trim());
      const res = await api.get(`/payroll?${params}`);
      setRecords(res.data);
      setPage(1);
    } catch { 
      toast.error('Failed to load payroll'); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { 
    fetchPayroll(); 
  }, [filterMonth, filterYear, filterDept]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchPayroll();
  };

  const handleApprove = async (id) => {
    try { 
      await api.put(`/payroll/${id}/approve`); 
      toast.success('Payroll marked as paid'); 
      fetchPayroll(); 
    } catch { 
      toast.error('Failed to approve payroll'); 
    }
  };

  // Client-side quick filter for instantaneous typing response
  const filteredRecords = useMemo(() => {
    let list = records.filter(r => (r.gross_salary > 0 || r.basic_salary > 0) && (r.employee_name || r.employee_code));
    if (!search.trim()) return list;
    const q = search.trim().toLowerCase();
    return list.filter(r => 
      (r.employee_name && r.employee_name.toLowerCase().includes(q)) ||
      (r.employee_code && r.employee_code.toLowerCase().includes(q)) ||
      (r.designation && r.designation.toLowerCase().includes(q))
    );
  }, [records, search]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const paginatedRecords = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredRecords.slice(start, start + pageSize);
  }, [filteredRecords, page]);

  const statusBadge = { draft:'badge-yellow', paid:'badge-green', pending:'badge-blue' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{isAdmin ? 'Payroll Management' : 'My Payslips & Compensation'}</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {isAdmin 
              ? 'Manage and disburse company-wide payroll across all 10 departments' 
              : `View official payslips and salary breakdown for ${employee?.first_name || 'HCL Employee'}`}
          </p>
        </div>
        {isAdmin && (
          <button onClick={() => setShowGenerate(true)} className="btn-primary flex items-center gap-2">
            <Plus size={16} /> Generate Monthly Payroll
          </button>
        )}
      </div>

      {/* Summary Cards */}
      {records.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {isAdmin ? [
            { label: 'Total Disbursed Records', value: records.length },
            { label: 'Total Gross Payout', value: `₹${(records.reduce((s,r)=>s+(r.gross_salary||0),0)/100000).toFixed(2)}L` },
            { label: 'Total Deductions (PF/Tax)', value: `₹${(records.reduce((s,r)=>s+(r.total_deductions||0),0)/100000).toFixed(2)}L` },
            { label: 'Net Disbursed Payout', value: `₹${(records.reduce((s,r)=>s+(r.net_salary||0),0)/100000).toFixed(2)}L` },
          ].map(s => (
            <div key={s.label} className="card p-4">
              <div className="text-2xl font-bold text-blue-600">{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          )) : [
            { label: 'Total Payslips', value: records.length },
            { label: 'Cumulative Gross', value: `₹${(records.reduce((s,r)=>s+(r.gross_salary||0),0)).toLocaleString()}` },
            { label: 'Cumulative Deductions', value: `₹${(records.reduce((s,r)=>s+(r.total_deductions||0),0)).toLocaleString()}` },
            { label: 'Net Compensation Received', value: `₹${(records.reduce((s,r)=>s+(r.net_salary||0),0)).toLocaleString()}` },
          ].map(s => (
            <div key={s.label} className="card p-4">
              <div className="text-2xl font-bold text-emerald-600">{s.value}</div>
              <div className="text-xs text-gray-500 mt-1">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters & Search */}
      <div className="card py-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-3 flex-wrap items-center justify-between">
          <div className="flex gap-3 flex-wrap items-center flex-1 min-w-[280px]">
            {isAdmin && (
              <div className="relative flex-1 min-w-[200px]">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by name, employee code (EMP0001)..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  className="input pl-9 w-full"
                />
              </div>
            )}

            <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="input w-auto">
              <option value="">All Months</option>
              {months.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
            </select>

            <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="input w-auto">
              <option value="">All Years</option>
              {[2026, 2025, 2024].map(y => <option key={y} value={y}>{y}</option>)}
            </select>

            {isAdmin && (
              <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="input w-auto">
                <option value="">All Departments</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            )}
          </div>

          <div className="text-xs text-gray-500">
            Showing <span className="font-semibold text-gray-800">{filteredRecords.length}</span> records
          </div>
        </form>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {isAdmin && <th className="table-th">Employee</th>}
                <th className="table-th">Period</th>
                <th className="table-th">Basic</th>
                <th className="table-th">Gross Salary</th>
                <th className="table-th">Deductions</th>
                <th className="table-th">Net Salary</th>
                <th className="table-th">Status</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={isAdmin ? 8 : 7} className="text-center py-12 text-gray-400">Loading payroll records...</td></tr>
              ) : paginatedRecords.length === 0 ? (
                <tr><td colSpan={isAdmin ? 8 : 7} className="text-center py-12 text-gray-400">No payroll records found for the selected criteria</td></tr>
              ) : (
                paginatedRecords.map(r => (
                  <tr key={r._id} className="table-tr">
                    {isAdmin && (
                      <td className="table-td">
                        <div className="font-semibold text-sm text-gray-900">{r.employee_name || r.employee_code || 'HCL Employee'}</div>
                        <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="font-mono font-bold text-blue-700 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded text-[11px]">{r.employee_code || 'EMP'}</span>
                          <span>•</span>
                          <span>{r.designation || 'Staff'}</span>
                          <span>•</span>
                          <span className="text-gray-400">{r.department_name}</span>
                        </div>
                      </td>
                    )}
                    <td className="table-td font-semibold text-gray-800">{months[(r.month||1)-1]} {r.year}</td>
                    <td className="table-td">₹{Math.round(r.basic_salary||0).toLocaleString()}</td>
                    <td className="table-td font-medium text-gray-900">₹{Math.round(r.gross_salary||0).toLocaleString()}</td>
                    <td className="table-td text-red-600">-₹{Math.round(r.total_deductions||0).toLocaleString()}</td>
                    <td className="table-td font-bold text-green-700">₹{Math.round(r.net_salary||0).toLocaleString()}</td>
                    <td className="table-td">
                      <span className={`badge ${statusBadge[r.status]||'badge-gray'} capitalize font-semibold`}>
                        {r.status === 'paid' ? 'Paid ✓' : r.status}
                      </span>
                    </td>
                    <td className="table-td">
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setSelectedRecord(r)} 
                          className="px-2.5 py-1 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg flex items-center gap-1 transition-colors" 
                          title="View Official Payslip"
                        >
                          <FileText size={14} /> View Payslip
                        </button>
                        {isAdmin && r.status === 'draft' && (
                          <button 
                            onClick={() => handleApprove(r._id)} 
                            className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg" 
                            title="Mark as Paid"
                          >
                            <Check size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between flex-wrap gap-3">
            <div className="text-xs text-gray-500">
              Showing <span className="font-semibold text-gray-800">{(page - 1) * pageSize + 1}</span> to <span className="font-semibold text-gray-800">{Math.min(page * pageSize, filteredRecords.length)}</span> of <span className="font-semibold text-gray-800">{filteredRecords.length}</span> records
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary py-1 px-3 text-xs disabled:opacity-40 flex items-center gap-1"
              >
                <ChevronLeft size={14} /> Previous
              </button>
              <span className="text-xs font-semibold text-gray-700 px-2">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="btn-secondary py-1 px-3 text-xs disabled:opacity-40 flex items-center gap-1"
              >
                Next <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {showGenerate && <GenerateModal onClose={() => setShowGenerate(false)} onGenerated={fetchPayroll} />}
      {selectedRecord && <PayslipModal record={selectedRecord} onClose={() => setSelectedRecord(null)} />}
    </div>
  );
}

function GenerateModal({ onClose, onGenerated }) {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const res = await api.post('/payroll/generate', { month, year });
      toast.success(res.data.message);
      onGenerated(); 
      onClose();
    } catch (err) { 
      toast.error(err.response?.data?.error || 'Failed to generate payroll'); 
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <Modal title="Generate Payroll" onClose={onClose} size="sm">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Month</label>
            <select value={month} onChange={e=>setMonth(Number(e.target.value))} className="input">
              {months.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Year</label>
            <select value={year} onChange={e=>setYear(Number(e.target.value))} className="input">
              {[2024, 2025, 2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        <p className="text-sm text-gray-500">
          This will calculate and generate payroll for all active employees across all 10 departments for {months[month-1]} {year}.
        </p>
        <div className="flex justify-end gap-3 pt-2">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={handleGenerate} disabled={loading} className="btn-primary">
            {loading ? 'Generating...' : 'Generate Payroll'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function PayslipModal({ record: r, onClose }) {
  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal title="Official Payslip" onClose={onClose} size="lg">
      <div className="space-y-6 printable-payslip">
        {/* Header */}
        <div className="flex justify-between items-start p-5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 rounded-xl">
          <div>
            <div className="font-extrabold text-blue-900 text-xl tracking-tight">HCL Technologies Ltd.</div>
            <div className="text-blue-700 text-sm font-medium">Payslip for {months[(r.month||1)-1]} {r.year}</div>
            <div className="text-xs text-gray-500 mt-1 font-mono">Doc ID: {r._id?.slice(0, 8).toUpperCase() || 'PAYSLIP'}</div>
          </div>
          <div className="text-right">
            <div className="font-bold text-gray-900 text-base">{r.employee_name}</div>
            <div className="text-sm font-semibold text-blue-800">{r.employee_code}</div>
            <div className="text-xs text-gray-600">{r.designation}</div>
            <div className="text-xs text-gray-500">{r.department_name}</div>
          </div>
        </div>

        {/* Working Days & Attendance Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-gray-50 p-3 rounded-lg text-xs">
          <div><span className="text-gray-500 block">Total Working Days</span><span className="font-bold text-gray-800">{r.working_days || 26}</span></div>
          <div><span className="text-gray-500 block">Present Days</span><span className="font-bold text-emerald-700">{r.present_days || 26}</span></div>
          <div><span className="text-gray-500 block">Payment Mode</span><span className="font-semibold text-gray-800 capitalize">{r.payment_mode ? r.payment_mode.replace('_', ' ') : 'Direct Bank Transfer'}</span></div>
          <div><span className="text-gray-500 block">Payment Status</span><span className="badge badge-green font-bold text-[11px] inline-block">{r.status?.toUpperCase() || 'PAID'}</span></div>
        </div>

        {/* Earnings vs Deductions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-3 text-xs uppercase tracking-wider flex items-center justify-between border-b pb-2">
              <span>Earnings</span>
              <span className="text-gray-500 font-normal">Amount (INR)</span>
            </h3>
            <div className="space-y-2 text-sm">
              {[
                ['Basic Salary', r.basic_salary],
                ['House Rent Allowance (HRA)', r.hra],
                ['Dearness Allowance (DA)', r.da],
                ['Special Allowance', r.special_allowance],
                ['Medical Allowance', r.medical_allowance],
                ['Transport Allowance', r.transport_allowance],
                ...(r.bonus > 0 ? [['Performance Bonus', r.bonus]] : []),
                ...(r.overtime_pay > 0 ? [['Overtime Pay', r.overtime_pay]] : [])
              ].map(([k,v]) => (
                <div key={k} className="flex justify-between py-1 border-b border-gray-100/60 text-xs">
                  <span className="text-gray-600">{k}</span>
                  <span className="font-medium text-gray-900">₹{Math.round(v||0).toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between pt-3 font-bold text-emerald-700 text-sm border-t border-gray-200">
                <span>Gross Earnings</span>
                <span>₹{Math.round(r.gross_salary||0).toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="bg-gray-50/50 p-4 rounded-xl border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-3 text-xs uppercase tracking-wider flex items-center justify-between border-b pb-2">
              <span>Deductions</span>
              <span className="text-gray-500 font-normal">Amount (INR)</span>
            </h3>
            <div className="space-y-2 text-sm">
              {[
                ['Provident Fund (Employee)', r.pf_employee],
                ['Provident Fund (Employer)', r.pf_employer],
                ['Professional Tax (PT)', r.professional_tax],
                ['Income Tax / TDS', r.income_tax],
                ...(r.other_deductions > 0 ? [['Other Deductions', r.other_deductions]] : [])
              ].map(([k,v]) => (
                <div key={k} className="flex justify-between py-1 border-b border-gray-100/60 text-xs">
                  <span className="text-gray-600">{k}</span>
                  <span className="font-medium text-red-600">₹{Math.round(v||0).toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between pt-3 font-bold text-red-600 text-sm border-t border-gray-200">
                <span>Total Deductions</span>
                <span>-₹{Math.round(r.total_deductions||0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Net Salary Highlight */}
        <div className="flex justify-between items-center p-4 bg-gradient-to-r from-emerald-50 to-green-50 border border-emerald-200 rounded-xl">
          <div>
            <div className="font-bold text-emerald-900 text-base">Net Take-Home Salary</div>
            <div className="text-xs text-emerald-700">Credited to employee salary bank account</div>
          </div>
          <span className="font-extrabold text-emerald-800 text-3xl">₹{Math.round(r.net_salary||0).toLocaleString()}</span>
        </div>

        {/* Footer & Actions */}
        <div className="flex justify-between items-center text-xs text-gray-500 pt-2 border-t border-gray-100 flex-wrap gap-2">
          <span>{r.paid_on ? `Disbursed on: ${r.paid_on}` : 'Payment Status: Verified & Cleared'}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1.5"
            >
              <Printer size={14} /> Print / Download Payslip
            </button>
            <button
              onClick={onClose}
              className="btn-primary text-xs py-1.5 px-3"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
