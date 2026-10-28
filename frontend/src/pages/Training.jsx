import { useState, useEffect } from 'react';
import api from '../lib/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Plus, GraduationCap, Edit, Users, Calendar } from 'lucide-react';
import Modal from '../components/Modal';

export default function Training() {
  const { isAdmin } = useAuth();
  const [programs, setPrograms] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [myEnrollments, setMyEnrollments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editProg, setEditProg] = useState(null);
  const [selected, setSelected] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');

  const fetchData = async () => {
    try {
      const [progRes, enrollRes] = await Promise.all([
        api.get(`/training${filterStatus ? `?status=${filterStatus}` : ''}`),
        api.get('/training/my/enrollments'),
      ]);
      setPrograms(progRes.data);
      setMyEnrollments(enrollRes.data);
    } catch { toast.error('Failed to load training'); }
    finally { setLoading(false); }
  };

  useEffect(() => { api.get('/departments').then(r => setDepartments(r.data)); fetchData(); }, [filterStatus]);

  const handleEnroll = async (trainingId) => {
    try { await api.post(`/training/${trainingId}/enroll`); toast.success('Enrolled successfully!'); fetchData(); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const isEnrolled = (trainingId) => myEnrollments.some(e => e.training_id === trainingId);

  const statusColors = { scheduled: 'badge-blue', ongoing: 'badge-yellow', completed: 'badge-green', cancelled: 'badge-red' };
  const modeColors = { online: 'badge-purple', offline: 'badge-blue', hybrid: 'badge-yellow' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Training & Development</h1>
        {isAdmin && <button onClick={() => { setEditProg(null); setShowModal(true); }} className="btn-primary"><Plus size={16} />Add Program</button>}
      </div>

      {!isAdmin && myEnrollments.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-3">My Enrollments</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {myEnrollments.slice(0,4).map(e => (
              <div key={e._id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <GraduationCap size={20} className="text-blue-600 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{e.title}</div>
                  <div className="text-xs text-gray-500">{e.mode} · {e.start_date}</div>
                </div>
                <span className={`badge ${e.status==='completed'?'badge-green':'badge-blue'}`}>{e.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="card py-4">
        <div className="flex gap-3 flex-wrap">
          {['','scheduled','ongoing','completed'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filterStatus===s?'bg-blue-600 text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{s||'All'}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? <div className="col-span-3 text-center py-20 text-gray-400">Loading...</div>
        : programs.length === 0 ? <div className="col-span-3 text-center py-20 text-gray-400"><GraduationCap size={40} className="mx-auto mb-3 opacity-30" /><p>No training programs found</p></div>
        : programs.map(p => (
          <div key={p._id} className="card hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex gap-2">
                <span className={`badge ${statusColors[p.status]||'badge-gray'}`}>{p.status}</span>
                <span className={`badge ${modeColors[p.mode]||'badge-gray'}`}>{p.mode}</span>
              </div>
              {isAdmin && <button onClick={() => { setEditProg(p); setShowModal(true); }} className="p-1 text-gray-400 hover:text-gray-600"><Edit size={14} /></button>}
            </div>
            <h3 className="font-bold text-gray-900 text-lg mb-1">{p.title}</h3>
            <p className="text-sm text-gray-500 mb-3 line-clamp-2">{p.description}</p>
            <div className="space-y-1 text-sm text-gray-500 mb-4">
              <div className="flex items-center gap-1.5"><Users size={13} />Trainer: {p.trainer}</div>
              <div className="flex items-center gap-1.5"><Calendar size={13} />{p.start_date} → {p.end_date}</div>
              <div className="text-xs text-gray-400">{p.duration_hours}h · {p.enrolled_count}/{p.max_participants} enrolled</div>
            </div>
            <div className="flex gap-2">
              {!isAdmin && p.status === 'scheduled' && (
                isEnrolled(p._id)
                  ? <span className="badge badge-green">Enrolled ✓</span>
                  : <button onClick={() => handleEnroll(p._id)} className="btn-primary text-xs py-1.5 px-3">Enroll Now</button>
              )}
              <button onClick={() => setSelected(p)} className="btn-secondary text-xs py-1.5 px-3">View Details</button>
            </div>
          </div>
        ))}
      </div>

      {showModal && <TrainingModal onClose={() => setShowModal(false)} onSaved={fetchData} program={editProg} departments={departments} />}
      {selected && <TrainingDetailModal program={selected} onClose={() => setSelected(null)} isAdmin={isAdmin} />}
    </div>
  );
}

function TrainingModal({ onClose, onSaved, program, departments }) {
  const [form, setForm] = useState(program || { title:'', description:'', trainer:'', department_id:'', start_date:'', end_date:'', duration_hours:'', mode:'online', max_participants:50 });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      if (program) { await api.put(`/training/${program._id}`, form); toast.success('Program updated'); }
      else { await api.post('/training', form); toast.success('Program created'); }
      onSaved(); onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  const f = k => e => setForm(p => ({...p, [k]: e.target.value}));
  return (
    <Modal title={program ? 'Edit Training' : 'Add Training Program'} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><label className="label">Title *</label><input value={form.title} onChange={f('title')} className="input" required /></div>
        <div><label className="label">Description</label><textarea value={form.description||''} onChange={f('description')} className="input h-20 resize-none" /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Trainer</label><input value={form.trainer||''} onChange={f('trainer')} className="input" /></div>
          <div><label className="label">Department</label>
            <select value={form.department_id||''} onChange={f('department_id')} className="input">
              <option value="">All Departments</option>
              {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
          </div>
          <div><label className="label">Start Date</label><input type="date" value={form.start_date||''} onChange={f('start_date')} className="input" /></div>
          <div><label className="label">End Date</label><input type="date" value={form.end_date||''} onChange={f('end_date')} className="input" /></div>
          <div><label className="label">Duration (hours)</label><input type="number" value={form.duration_hours||''} onChange={f('duration_hours')} className="input" /></div>
          <div><label className="label">Mode</label>
            <select value={form.mode} onChange={f('mode')} className="input">
              <option value="online">Online</option><option value="offline">Offline</option><option value="hybrid">Hybrid</option>
            </select>
          </div>
          <div><label className="label">Max Participants</label><input type="number" value={form.max_participants||''} onChange={f('max_participants')} className="input" /></div>
          {program && <div><label className="label">Status</label>
            <select value={form.status||'scheduled'} onChange={f('status')} className="input">
              <option value="scheduled">Scheduled</option><option value="ongoing">Ongoing</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
            </select>
          </div>}
        </div>
        <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button type="submit" disabled={loading} className="btn-primary">{loading?'Saving...':program?'Update':'Create'}</button></div>
      </form>
    </Modal>
  );
}

function TrainingDetailModal({ program, onClose, isAdmin }) {
  const [detail, setDetail] = useState(null);
  useEffect(() => { api.get(`/training/${program._id}`).then(r => setDetail(r.data)); }, [program._id]);

  return (
    <Modal title={program.title} onClose={onClose} size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div><span className="text-gray-500">Trainer:</span> <strong>{program.trainer}</strong></div>
          <div><span className="text-gray-500">Mode:</span> <strong>{program.mode}</strong></div>
          <div><span className="text-gray-500">Start:</span> <strong>{program.start_date}</strong></div>
          <div><span className="text-gray-500">End:</span> <strong>{program.end_date}</strong></div>
          <div><span className="text-gray-500">Duration:</span> <strong>{program.duration_hours}h</strong></div>
          <div><span className="text-gray-500">Capacity:</span> <strong>{program.enrolled_count}/{program.max_participants}</strong></div>
        </div>
        {program.description && <p className="text-sm text-gray-600">{program.description}</p>}
        {isAdmin && detail?.enrollments?.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-700 mb-3">Enrolled Participants ({detail.enrollments.length})</h4>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {detail.enrollments.map(e => (
                <div key={e._id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg text-sm">
                  <span className="font-medium">{e.employee_name}</span>
                  <span className={`badge ${e.status==='completed'?'badge-green':'badge-blue'}`}>{e.status}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
