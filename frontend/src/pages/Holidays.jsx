import { useState, useEffect } from 'react';
import api from '../lib/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Plus, CalendarCheck, Trash2 } from 'lucide-react';
import Modal from '../components/Modal';

export default function Holidays() {
  const { isAdmin } = useAuth();
  const [holidays, setHolidays] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const fetchHolidays = async () => {
    try { const res = await api.get('/holidays'); setHolidays(res.data); }
    catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchHolidays(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this holiday?')) return;
    try { await api.delete(`/holidays/${id}`); toast.success('Deleted'); fetchHolidays(); }
    catch { toast.error('Failed'); }
  };

  const typeColors = { national: 'badge-blue', festival: 'badge-yellow', regional: 'badge-purple', optional: 'badge-gray' };
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

  // Group by month
  const grouped = {};
  holidays.forEach(h => {
    const m = new Date(h.date).getMonth();
    if (!grouped[m]) grouped[m] = [];
    grouped[m].push(h);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Holiday Calendar</h1>
          <p className="text-gray-500 text-sm mt-1">{holidays.length} holidays scheduled</p>
        </div>
        {isAdmin && <button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={16} />Add Holiday</button>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {Object.entries(grouped).map(([month, list]) => (
          <div key={month} className="card">
            <h3 className="font-bold text-gray-800 mb-4 text-lg flex items-center gap-2">
              <CalendarCheck size={18} className="text-blue-600" />
              {months[Number(month)]}
            </h3>
            <div className="space-y-3">
              {list.map(h => (
                <div key={h._id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-700 font-bold text-sm">{new Date(h.date).getDate()}</span>
                    </div>
                    <div>
                      <div className="font-medium text-gray-800 text-sm">{h.name}</div>
                      <span className={`badge ${typeColors[h.type]||'badge-gray'} text-xs`}>{h.type}</span>
                    </div>
                  </div>
                  {isAdmin && <button onClick={() => handleDelete(h._id)} className="p-1 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={13} /></button>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Upcoming */}
      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-4">Upcoming Holidays</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="table-th">Holiday</th>
                <th className="table-th">Date</th>
                <th className="table-th">Day</th>
                <th className="table-th">Type</th>
                {isAdmin && <th className="table-th">Action</th>}
              </tr>
            </thead>
            <tbody>
              {holidays.filter(h => new Date(h.date) >= new Date()).slice(0,10).map(h => (
                <tr key={h._id} className="table-tr">
                  <td className="table-td font-medium">{h.name}</td>
                  <td className="table-td">{h.date}</td>
                  <td className="table-td">{new Date(h.date).toLocaleDateString('en-IN', { weekday: 'long' })}</td>
                  <td className="table-td"><span className={`badge ${typeColors[h.type]||'badge-gray'}`}>{h.type}</span></td>
                  {isAdmin && <td className="table-td"><button onClick={() => handleDelete(h._id)} className="p-1 text-red-400 hover:text-red-600"><Trash2 size={14} /></button></td>}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && <HolidayModal onClose={() => setShowModal(false)} onSaved={fetchHolidays} />}
    </div>
  );
}

function HolidayModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ name: '', date: '', type: 'national', description: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try { await api.post('/holidays', form); toast.success('Holiday added'); onSaved(); onClose(); }
    catch { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  const f = k => e => setForm(p => ({...p, [k]: e.target.value}));
  return (
    <Modal title="Add Holiday" onClose={onClose} size="sm">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><label className="label">Holiday Name *</label><input value={form.name} onChange={f('name')} className="input" required /></div>
        <div><label className="label">Date *</label><input type="date" value={form.date} onChange={f('date')} className="input" required /></div>
        <div><label className="label">Type</label>
          <select value={form.type} onChange={f('type')} className="input">
            <option value="national">National</option><option value="festival">Festival</option><option value="regional">Regional</option><option value="optional">Optional</option>
          </select>
        </div>
        <div><label className="label">Description</label><input value={form.description||''} onChange={f('description')} className="input" /></div>
        <div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button type="submit" disabled={loading} className="btn-primary">{loading?'Saving...':'Add Holiday'}</button></div>
      </form>
    </Modal>
  );
}
