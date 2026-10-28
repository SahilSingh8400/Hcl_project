import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { toast } from 'react-hot-toast';
import { Plus, Search, Filter, Edit, Trash2, Eye, Users } from 'lucide-react';
import Modal from '../components/Modal';

const STATUS_BADGE = { active: 'badge-green', inactive: 'badge-red', 'on-leave': 'badge-yellow' };

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterDept, setFilterDept] = useState('');
  const [filterStatus, setFilterStatus] = useState('active');
  const [showModal, setShowModal] = useState(false);
  const [editEmp, setEditEmp] = useState(null);
  const navigate = useNavigate();

  const fetchEmployees = async () => {
    try {
      const params = new URLSearchParams({ status: filterStatus });
      if (filterDept) params.append('department', filterDept);
      if (search) params.append('search', search);
      const res = await api.get(`/employees?${params}`);
      setEmployees(res.data);
    } catch { toast.error('Failed to load employees'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    api.get('/departments').then(r => setDepartments(r.data));
  }, []);

  useEffect(() => { fetchEmployees(); }, [search, filterDept, filterStatus]);

  const handleDelete = async (id) => {
    if (!confirm('Deactivate this employee?')) return;
    try { await api.delete(`/employees/${id}`); toast.success('Employee deactivated'); fetchEmployees(); }
    catch { toast.error('Failed to deactivate'); }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Employees</h1><p className="text-gray-500 text-sm mt-1">{employees.length} employees found</p></div>
        <button onClick={() => { setEditEmp(null); setShowModal(true); }} className="btn-primary"><Plus size={16} />Add Employee</button>
      </div>

      {/* Filters */}
      <div className="card py-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-48">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name, email, code..." className="input pl-9" />
          </div>
          <select value={filterDept} onChange={e => setFilterDept(e.target.value)} className="input w-auto">
            <option value="">All Departments</option>
            {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input w-auto">
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="">All</option>
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
                <th className="table-th">Designation</th>
                <th className="table-th">Date Joined</th>
                <th className="table-th">Salary</th>
                <th className="table-th">Status</th>
                <th className="table-th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400">Loading...</td></tr>
              ) : employees.length === 0 ? (
                <tr><td colSpan={8} className="text-center py-12 text-gray-400"><Users size={40} className="mx-auto mb-3 opacity-30" /><p>No employees found</p></td></tr>
              ) : employees.map(emp => (
                <tr key={emp._id} className="table-tr">
                  <td className="table-td">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-700 font-semibold text-xs">{emp.first_name[0]}{emp.last_name[0]}</span>
                      </div>
                      <div>
                        <div className="font-medium text-gray-900">{emp.first_name} {emp.last_name}</div>
                        <div className="text-xs text-gray-500">{emp.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="table-td font-mono text-xs">{emp.employee_code}</td>
                  <td className="table-td">{emp.department_name || '—'}</td>
                  <td className="table-td">{emp.designation}</td>
                  <td className="table-td">{emp.date_joined}</td>
                  <td className="table-td font-medium">₹{(emp.salary||0).toLocaleString()}</td>
                  <td className="table-td"><span className={`badge ${STATUS_BADGE[emp.status]||'badge-gray'}`}>{emp.status}</span></td>
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
