import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { toast } from 'react-hot-toast';
import { Plus, Search, Filter, Edit, Trash2, Eye, Users } from 'lucide-react';
import Modal from '../components/Modal';

const STATUS_BADGE = { active: 'badge-green', inactive: 'badge-red', 'on-leave': 'badge-yellow' };
const GRADE_BADGE = {
  L1: 'bg-slate-100 text-slate-700 border border-slate-200',
  L2: 'bg-blue-50 text-blue-700 border border-blue-200',
  L3: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
  L4: 'bg-purple-50 text-purple-700 border border-purple-200',
  L5: 'bg-amber-50 text-amber-800 border border-amber-200'
};

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterGrade, setFilterGrade] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [editEmp, setEditEmp] = useState(null);
  const navigate = useNavigate();

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: pageSize });
      if (filterStatus) params.append('status', filterStatus);
      if (filterDept) params.append('department', filterDept);
      if (filterGrade) params.append('grade', filterGrade);
      if (search) params.append('search', search);

      const res = await api.get(`/employees?${params}`);
      if (res.data && res.data.data) {
        setEmployees(res.data.data);
        setTotalCount(res.data.total);
        setTotalPages(res.data.totalPages);
      } else if (Array.isArray(res.data)) {
        setEmployees(res.data);
        setTotalCount(res.data.length);
        setTotalPages(1);
      }
    } catch { toast.error('Failed to load employees'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    api.get('/departments').then(r => setDepartments(r.data));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [search, filterDept, filterGrade, filterStatus, pageSize]);

  useEffect(() => {
    fetchEmployees();
  }, [page, pageSize, search, filterDept, filterGrade, filterStatus]);

  const handleDelete = async (id) => {
    if (!confirm('Deactivate this employee?')) return;
    try { await api.delete(`/employees/${id}`); toast.success('Employee deactivated'); fetchEmployees(); }
    catch { toast.error('Failed to deactivate'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employees Directory</h1>
          <p className="text-gray-500 text-sm mt-1">
            {totalCount.toLocaleString()} employee records across 10 departments (3-Year Dataset)
          </p>
        </div>
        <button onClick={() => { setEditEmp(null); setShowModal(true); }} className="btn-primary"><Plus size={16} />Add Employee</button>
      </div>

      {/* Filters */}
      <div className="card py-4">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email, code (EMP0001)..." className="input pl-9" />
          </div>
          <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="input w-auto">
            <option value="">All 10 Departments</option>
            {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
          <select value={filterGrade} onChange={e => setFilterGrade(e.target.value)} className="input w-auto">
            <option value="">All Grades (L1 - L5)</option>
            <option value="L1">L1 - Entry</option>
            <option value="L2">L2 - Mid</option>
            <option value="L3">L3 - Senior</option>
            <option value="L4">L4 - Lead / Mgr</option>
            <option value="L5">L5 - Director</option>
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input w-auto">
            <option value="">All Employment Status</option>
            <option value="active">Active (88%)</option>
            <option value="inactive">Attrited (12%)</option>
          </select>
          <select value={pageSize} onChange={e => setPageSize(Number(e.target.value))} className="input w-auto">
            <option value="25">25 / page</option>
            <option value="50">50 / page</option>
            <option value="100">100 / page</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="table-th">Employee</th>
                <th className="table-th">Code</th>
                <th className="table-th">Department</th>
                <th className="table-th">Grade</th>
                <th className="table-th">Performance</th>
                <th className="table-th">Leaves</th>
                <th className="table-th">Join Date</th>
                <th className="table-th">Monthly Salary</th>
                <th className="table-th">Attrition</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={10} className="text-center py-12 text-gray-400">Loading records...</td></tr>
              ) : employees.length === 0 ? (
                <tr><td colSpan={10} className="text-center py-12 text-gray-400"><Users size={40} className="mx-auto mb-3 opacity-30" /><p>No employees found</p></td></tr>
              ) : employees.map(emp => (
                <tr key={emp._id} className="table-tr">
                  <td className="table-td">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-700 font-semibold text-xs">{emp.first_name?.[0]}{emp.last_name?.[0]}</span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{emp.first_name} {emp.last_name}</div>
                        <div className="text-xs text-gray-500">{emp.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="table-td font-mono text-xs font-semibold text-gray-700">{emp.employee_code}</td>
                  <td className="table-td">{emp.department_name || '—'}</td>
                  <td className="table-td">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${GRADE_BADGE[emp.grade] || 'bg-gray-100 text-gray-700'}`}>
                      {emp.grade || 'L2'}
                    </span>
                  </td>
                  <td className="table-td">
                    <div className="flex items-center gap-1">
                      <span className="font-semibold text-xs text-gray-800">{emp.performance_score ? Number(emp.performance_score).toFixed(1) : '3.5'}</span>
                      <span className="text-xs text-yellow-500">★</span>
                    </div>
                  </td>
                  <td className="table-td text-xs text-gray-600">{emp.leave_days_taken !== undefined ? `${emp.leave_days_taken} d` : '15 d'}</td>
                  <td className="table-td text-xs text-gray-500">{emp.date_joined || '2025-01-01'}</td>
                  <td className="table-td font-medium text-xs">₹{(emp.salary || emp.monthly_salary_inr || 0).toLocaleString()}</td>
                  <td className="table-td">
                    <span className={`badge ${emp.attrition === 1 || emp.status === 'inactive' ? 'badge-red' : 'badge-green'}`}>
                      {emp.attrition === 1 || emp.status === 'inactive' ? 'Attrited' : 'Active'}
                    </span>
                  </td>
                  <td className="table-td">
                    <div className="flex items-center gap-1">
                      <button onClick={() => navigate(`/employees/${emp._id}`)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg" title="View"><Eye size={15} /></button>
                      <button onClick={() => { setEditEmp(emp); setShowModal(true); }} className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg" title="Edit"><Edit size={15} /></button>
                      <button onClick={() => handleDelete(emp._id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg" title="Deactivate"><Trash2 size={15} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-t border-gray-100">
          <div className="text-xs text-gray-500">
            Showing <strong className="text-gray-900">{totalCount > 0 ? (page - 1) * pageSize + 1 : 0}</strong> to <strong className="text-gray-900">{Math.min(page * pageSize, totalCount)}</strong> of <strong className="text-gray-900">{totalCount.toLocaleString()}</strong> records
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <span className="text-xs text-gray-600 font-medium px-2">
              Page {page} of {totalPages || 1}
            </span>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {showModal && <EmployeeModal onClose={() => setShowModal(false)} onSaved={fetchEmployees} employee={editEmp} departments={departments} employees={employees} />}
    </div>
  );
}

function EmployeeModal({ onClose, onSaved, employee, departments, employees }) {
  const [form, setForm] = useState(employee || { first_name:'', last_name:'', email:'', phone:'', date_of_birth:'', gender:'Male', department_id:'', designation:'', employment_type:'Full-time', date_joined:'', salary:'', city:'', state:'', country:'India', address:'' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      if (employee) { await api.put(`/employees/${employee._id}`, form); toast.success('Employee updated'); }
      else { await api.post('/employees', form); toast.success('Employee added! Default password: Employee@123'); }
      onSaved(); onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed to save'); }
    finally { setLoading(false); }
  };

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));

  return (
    <Modal title={employee ? 'Edit Employee' : 'Add New Employee'} onClose={onClose} size="2xl">
      <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
        <div><label className="label">First Name *</label><input value={form.first_name} onChange={f('first_name')} className="input" required /></div>
        <div><label className="label">Last Name *</label><input value={form.last_name} onChange={f('last_name')} className="input" required /></div>
        <div><label className="label">Email *</label><input type="email" value={form.email} onChange={f('email')} className="input" required disabled={!!employee} /></div>
        <div><label className="label">Phone</label><input value={form.phone||''} onChange={f('phone')} className="input" /></div>
        <div><label className="label">Date of Birth</label><input type="date" value={form.date_of_birth||''} onChange={f('date_of_birth')} className="input" /></div>
        <div><label className="label">Gender</label>
          <select value={form.gender||'Male'} onChange={f('gender')} className="input">
            <option>Male</option><option>Female</option><option>Other</option>
          </select>
        </div>
        <div><label className="label">Department</label>
          <select value={form.department_id||''} onChange={f('department_id')} className="input">
            <option value="">Select Department</option>
            {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
        </div>
        <div><label className="label">Designation *</label><input value={form.designation} onChange={f('designation')} className="input" required /></div>
        <div><label className="label">Employment Type</label>
          <select value={form.employment_type||'Full-time'} onChange={f('employment_type')} className="input">
            <option>Full-time</option><option>Part-time</option><option>Contract</option><option>Intern</option>
          </select>
        </div>
        <div><label className="label">Date Joined *</label><input type="date" value={form.date_joined||''} onChange={f('date_joined')} className="input" required /></div>
        <div><label className="label">Salary (₹)</label><input type="number" value={form.salary||''} onChange={f('salary')} className="input" /></div>
        <div><label className="label">Manager</label>
          <select value={form.manager_id||''} onChange={f('manager_id')} className="input">
            <option value="">No Manager</option>
            {employees.filter(e=>e._id!==employee?._id).map(e=><option key={e._id} value={e._id}>{e.first_name} {e.last_name}</option>)}
          </select>
        </div>
        <div className="col-span-2"><label className="label">Address</label><input value={form.address||''} onChange={f('address')} className="input" /></div>
        <div><label className="label">City</label><input value={form.city||''} onChange={f('city')} className="input" /></div>
        <div><label className="label">State</label><input value={form.state||''} onChange={f('state')} className="input" /></div>
        <div><label className="label">PAN Number</label><input value={form.pan_number||''} onChange={f('pan_number')} className="input" /></div>
        <div><label className="label">Bank Account</label><input value={form.bank_account||''} onChange={f('bank_account')} className="input" /></div>

        <div className="col-span-2 flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving...' : employee ? 'Update Employee' : 'Add Employee'}</button>
        </div>
      </form>
    </Modal>
  );
}
