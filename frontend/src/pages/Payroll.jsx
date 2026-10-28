import { useState, useEffect } from 'react';
import api from '../lib/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Plus, Download, Check, FileText } from 'lucide-react';
import Modal from '../components/Modal';

const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function Payroll() {
  const { isAdmin } = useAuth();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterMonth, setFilterMonth] = useState('');
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [showGenerate, setShowGenerate] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);

  const fetchPayroll = async () => {
    try {
      const params = new URLSearchParams();
      if (filterMonth) params.append('month', filterMonth);
      if (filterYear) params.append('year', filterYear);
      const res = await api.get(`/payroll?${params}`);
      setRecords(res.data);
    } catch { toast.error('Failed to load payroll'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchPayroll(); }, [filterMonth, filterYear]);

  const handleApprove = async (id) => {
    try { await api.put(`/payroll/${id}/approve`); toast.success('Payroll marked as paid'); fetchPayroll(); }
    catch { toast.error('Failed'); }
  };

  const statusBadge = { draft:'badge-yellow', paid:'badge-green', pending:'badge-blue' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">{isAdmin ? 'Payroll Management' : 'My Payslips'}</h1>
        {isAdmin && <button onClick={() => setShowGenerate(true)} className="btn-primary"><Plus size={16} />Generate Payroll</button>}
      </div>

      {/* Summary Cards (Admin) */}
      {isAdmin && records.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Employees', value: records.length },
            { label: 'Total Gross', value: `₹${(records.reduce((s,r)=>s+(r.gross_salary||0),0)/100000).toFixed(1)}L` },
            { label: 'Total Deductions', value: `₹${(records.reduce((s,r)=>s+(r.total_deductions||0),0)/100000).toFixed(1)}L` },
            { label: 'Net Payout', value: `₹${(records.reduce((s,r)=>s+(r.net_salary||0),0)/100000).toFixed(1)}L` },
          ].map(s => (
            <div key={s.label} className="card"><div className="text-xl font-bold text-blue-600">{s.value}</div><div className="text-sm text-gray-500">{s.label}</div></div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="card py-4">
        <div className="flex gap-3 flex-wrap">
          <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="input w-auto">
            <option value="">All Months</option>
            {months.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
          <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="input w-auto">
            {[2023,2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
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
              {loading ? <tr><td colSpan={8} className="text-center py-10 text-gray-400">Loading...</td></tr>
              : records.length === 0 ? <tr><td colSpan={8} className="text-center py-10 text-gray-400">No payroll records found</td></tr>
              : records.map(r => (
                <tr key={r._id} className="table-tr">
                  {isAdmin && <td className="table-td">
                    <div className="font-medium text-sm">{r.employee_name}</div>
                    <div className="text-xs text-gray-500">{r.designation}</div>
                  </td>}
                  <td className="table-td font-medium">{months[(r.month||1)-1]} {r.year}</td>
                  <td className="table-td">₹{Math.round(r.basic_salary||0).toLocaleString()}</td>
                  <td className="table-td font-medium">₹{Math.round(r.gross_salary||0).toLocaleString()}</td>
                  <td className="table-td text-red-600">-₹{Math.round(r.total_deductions||0).toLocaleString()}</td>
                  <td className="table-td font-bold text-green-700">₹{Math.round(r.net_salary||0).toLocaleString()}</td>
                  <td className="table-td"><span className={`badge ${statusBadge[r.status]||'badge-gray'}`}>{r.status}</span></td>
                  <td className="table-td">
                    <div className="flex gap-1">
                      <button onClick={() => setSelectedRecord(r)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="View Payslip"><FileText size={15} /></button>
                      {isAdmin && r.status === 'draft' && <button onClick={() => handleApprove(r._id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg" title="Mark Paid"><Check size={15} /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
      onGenerated(); onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <Modal title="Generate Payroll" onClose={onClose} size="sm">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Month</label>
            <select value={month} onChange={e=>setMonth(e.target.value)} className="input">
              {months.map((m,i) => <option key={i} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div><label className="label">Year</label>
            <select value={year} onChange={e=>setYear(e.target.value)} className="input">
              {[2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
        </div>
        <p className="text-sm text-gray-500">This will generate payroll for all active employees for {months[month-1]} {year}.</p>
        <div className="flex justify-end gap-3"><button onClick={onClose} className="btn-secondary">Cancel</button><button onClick={handleGenerate} disabled={loading} className="btn-primary">{loading ? 'Generating...' : 'Generate Payroll'}</button></div>
      </div>
    </Modal>
  );
}

function PayslipModal({ record: r, onClose }) {
  return (
    <Modal title="Payslip" onClose={onClose} size="lg">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-start p-4 bg-blue-50 rounded-xl">
          <div>
            <div className="font-bold text-blue-900 text-lg">HCL Technologies</div>
            <div className="text-blue-700 text-sm">Payslip for {months[(r.month||1)-1]} {r.year}</div>
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
            <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">Earnings</h3>
            <div className="space-y-2 text-sm">
              {[['Basic Salary', r.basic_salary], ['HRA', r.hra], ['DA', r.da], ['Special Allowance', r.special_allowance], ['Medical Allowance', r.medical_allowance], ['Transport Allowance', r.transport_allowance], ...(r.bonus>0?[['Bonus', r.bonus]]:[]), ...(r.overtime_pay>0?[['Overtime Pay', r.overtime_pay]]:[])].map(([k,v]) => (
                <div key={k} className="flex justify-between py-1 border-b border-gray-50">
                  <span className="text-gray-600">{k}</span>
                  <span className="font-medium">₹{Math.round(v||0).toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between py-2 font-bold text-green-700 border-t border-gray-200">
                <span>Gross Salary</span><span>₹{Math.round(r.gross_salary||0).toLocaleString()}</span>
              </div>
            </div>
          </div>
          <div>
            <h3 className="font-semibold text-gray-700 mb-3 text-sm uppercase tracking-wide">Deductions</h3>
            <div className="space-y-2 text-sm">
              {[['PF (Employee)', r.pf_employee], ['PF (Employer)', r.pf_employer], ['Professional Tax', r.professional_tax], ['Income Tax', r.income_tax], ...(r.other_deductions>0?[['Other', r.other_deductions]]:[])].map(([k,v]) => (
                <div key={k} className="flex justify-between py-1 border-b border-gray-50">
                  <span className="text-gray-600">{k}</span>
                  <span className="font-medium text-red-600">₹{Math.round(v||0).toLocaleString()}</span>
                </div>
              ))}
              <div className="flex justify-between py-2 font-bold text-red-600 border-t border-gray-200">
                <span>Total Deductions</span><span>₹{Math.round(r.total_deductions||0).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Net */}
        <div className="flex justify-between items-center p-4 bg-green-50 rounded-xl">
          <span className="font-bold text-green-800 text-lg">Net Salary</span>
          <span className="font-bold text-green-700 text-2xl">₹{Math.round(r.net_salary||0).toLocaleString()}</span>
        </div>

        <div className="flex justify-between text-xs text-gray-400">
          <span>Payment Mode: {r.payment_mode?.replace('_',' ')}</span>
          {r.paid_on && <span>Paid on: {r.paid_on}</span>}
          <span>Status: <strong>{r.status}</strong></span>
        </div>
      </div>
    </Modal>
  );
}
