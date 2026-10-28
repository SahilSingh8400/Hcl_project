import { useState, useEffect } from 'react';
import api from '../lib/api';
import { toast } from 'react-hot-toast';
import { Plus, Edit, Trash2, Building2, Users } from 'lucide-react';
import Modal from '../components/Modal';

export default function Departments() {
  const [depts, setDepts] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editDept, setEditDept] = useState(null);

  const fetchDepts = async () => {
    try { const res = await api.get('/departments'); setDepts(res.data); }
    catch { toast.error('Failed to load departments'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    api.get('/employees?status=active').then(r => setEmployees(r.data));
    fetchDepts();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this department?')) return;
    try { await api.delete(`/departments/${id}`); toast.success('Department deleted'); fetchDepts(); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const colors = ['bg-blue-500','bg-purple-500','bg-green-500','bg-orange-500','bg-cyan-500','bg-pink-500'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Departments</h1>
        <button onClick={() => { setEditDept(null); setShowModal(true); }} className="btn-primary"><Plus size={16} />Add Department</button>
      </div>

      {loading ? <div className="text-center py-20 text-gray-400">Loading...</div> : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {depts.map((d, i) => (
            <div key={d._id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 ${colors[i % colors.length]} rounded-xl flex items-center justify-center`}>
                  <Building2 size={22} className="text-white" />
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setEditDept(d); setShowModal(true); }} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"><Edit size={15} /></button>
                  <button onClick={() => handleDelete(d._id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={15} /></button>
                </div>
              </div>
              <h3 className="font-bold text-gray-900 text-lg mb-1">{d.name}</h3>
              <p className="text-sm text-gray-500 mb-4">{d.description || 'No description'}</p>
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-1 text-gray-600"><Users size={14} />{d.employee_count} employees</div>
                <div className="text-gray-500">₹{(d.budget/100000).toFixed(1)}L budget</div>
              </div>
              {d.manager_name && <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">Manager: <strong>{d.manager_name}</strong></div>}
            </div>
          ))}
        </div>
      )}

      {showModal && <DeptModal onClose={() => setShowModal(false)} onSaved={fetchDepts} dept={editDept} employees={employees} />}
    </div>
  );
}

function DeptModal({ onClose, onSaved, dept, employees }) {
  const [form, setForm] = useState(dept || { name:'', description:'', manager_id:'', budget:'' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      if (dept) { await api.put(`/departments/${dept._id}`, form); toast.success('Department updated'); }
      else { await api.post('/departments', form); toast.success('Department added'); }
      onSaved(); onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  const f = k => e => setForm(p => ({...p, [k]: e.target.value}));
  return (
    <Modal title={dept ? 'Edit Department' : 'Add Department'} onClose={onClose} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><label className="label">Department Name *</label><input value={form.name} onChange={f('name')} className="input" required /></div>
        <div><label className="label">Description</label><textarea value={form.description||''} onChange={f('description')} className="input h-20 resize-none" /></div>
        <div><label className="label">Manager</label>
          <select value={form.manager_id||''} onChange={f('manager_id')} className="input">
            <option value="">No Manager</option>
            {employees.map(e => <option key={e._id} value={e._id}>{e.first_name} {e.last_name}</option>)}
          </select>
        </div>
        <div><label className="label">Annual Budget (₹)</label><input type="number" value={form.budget||''} onChange={f('budget')} className="input" /></div>
        <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button type="submit" disabled={loading} className="btn-primary">{loading?'Saving...':dept?'Update':'Add Department'}</button></div>
      </form>
    </Modal>
  );
}
