import { useState, useEffect } from 'react';
import api from '../lib/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Plus, TicketIcon, Edit } from 'lucide-react';
import Modal from '../components/Modal';

export default function Tickets() {
  const { isAdmin } = useAuth();
  const [tickets, setTickets] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [resolveModal, setResolveModal] = useState(null);
  const [resolveForm, setResolveForm] = useState({ status: 'resolved', resolution: '', assigned_to: '' });
  const [filterStatus, setFilterStatus] = useState('');

  const fetchTickets = async () => {
    try { const res = await api.get(`/tickets${filterStatus ? `?status=${filterStatus}` : ''}`); setTickets(res.data); }
    catch { toast.error('Failed to load tickets'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (isAdmin) api.get('/employees?status=active').then(r => setEmployees(r.data));
    fetchTickets();
  }, [filterStatus]);

  const handleResolve = async () => {
    try { await api.put(`/tickets/${resolveModal}`, resolveForm); toast.success('Ticket updated'); setResolveModal(null); fetchTickets(); }
    catch { toast.error('Failed'); }
  };

  const statusColors = { open: 'badge-red', in_progress: 'badge-yellow', resolved: 'badge-green', closed: 'badge-gray' };
  const priorityColors = { high: 'badge-red', medium: 'badge-yellow', low: 'badge-gray' };
  const categoryIcons = { payroll: '💰', leave: '📅', general: '💬', technical: '🔧', compliance: '📋' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">HR Helpdesk</h1>
        <button onClick={() => setShowModal(true)} className="btn-primary"><Plus size={16} />New Ticket</button>
      </div>

      {isAdmin && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Open', value: tickets.filter(t=>t.status==='open').length, color: 'text-red-600', bg: 'bg-red-50' },
            { label: 'In Progress', value: tickets.filter(t=>t.status==='in_progress').length, color: 'text-yellow-600', bg: 'bg-yellow-50' },
            { label: 'Resolved', value: tickets.filter(t=>t.status==='resolved').length, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Total', value: tickets.length, color: 'text-blue-600', bg: 'bg-blue-50' },
          ].map(s => (
            <div key={s.label} className={`card ${s.bg} border-0`}>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-sm text-gray-600">{s.label} Tickets</div>
            </div>
          ))}
        </div>
      )}

      <div className="card py-4">
        <div className="flex gap-3">
          {['','open','in_progress','resolved','closed'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filterStatus===s?'bg-blue-600 text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{s?s.replace('_',' '):'All'}</button>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        {loading ? <div className="text-center py-20 text-gray-400">Loading...</div>
        : tickets.length === 0 ? <div className="card text-center py-16 text-gray-400"><TicketIcon size={40} className="mx-auto mb-3 opacity-30" /><p>No tickets found</p></div>
        : tickets.map(t => (
          <div key={t._id} className="card hover:shadow-sm transition-shadow">
            <div className="flex items-start gap-4">
              <div className="text-2xl mt-1">{categoryIcons[t.category]||'📋'}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-gray-500">{t.ticket_number}</span>
                      <span className={`badge ${priorityColors[t.priority]||'badge-gray'}`}>{t.priority}</span>
                      <span className={`badge ${statusColors[t.status]||'badge-gray'}`}>{t.status?.replace('_',' ')}</span>
                    </div>
                    <h3 className="font-semibold text-gray-900 mt-1">{t.subject}</h3>
                    {isAdmin && <p className="text-xs text-gray-500 mt-0.5">By: {t.employee_name} · {t.employee_code}</p>}
                    <p className="text-sm text-gray-600 mt-2 line-clamp-2">{t.description}</p>
                    {t.resolution && <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2 mt-2">✓ {t.resolution}</p>}
                  </div>
                  {isAdmin && (t.status === 'open' || t.status === 'in_progress') && (
                    <button onClick={() => { setResolveModal(t._id); setResolveForm({ status: 'resolved', resolution: '', assigned_to: t.assigned_to||'' }); }} className="btn-secondary text-xs py-1.5 px-3 flex-shrink-0"><Edit size={14} />Update</button>
                  )}
                </div>
                <div className="flex gap-3 mt-3 text-xs text-gray-400">
                  <span>Category: {t.category}</span>
                  {t.assigned_to_name && <span>Assigned: {t.assigned_to_name}</span>}
                  <span>{new Date(t.created_at).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showModal && <NewTicketModal onClose={() => setShowModal(false)} onSaved={fetchTickets} />}

      {resolveModal && (
        <Modal title="Update Ticket" onClose={() => setResolveModal(null)} size="md">
          <div className="space-y-4">
            <div><label className="label">Status</label>
              <select value={resolveForm.status} onChange={e=>setResolveForm(p=>({...p,status:e.target.value}))} className="input">
                <option value="in_progress">In Progress</option><option value="resolved">Resolved</option><option value="closed">Closed</option>
              </select>
            </div>
            <div><label className="label">Assign To</label>
              <select value={resolveForm.assigned_to} onChange={e=>setResolveForm(p=>({...p,assigned_to:e.target.value}))} className="input">
                <option value="">Unassigned</option>
                {employees.map(e => <option key={e._id} value={e._id}>{e.first_name} {e.last_name}</option>)}
              </select>
            </div>
            <div><label className="label">Resolution / Notes</label><textarea value={resolveForm.resolution} onChange={e=>setResolveForm(p=>({...p,resolution:e.target.value}))} className="input h-24 resize-none" /></div>
            <div className="flex justify-end gap-3"><button onClick={() => setResolveModal(null)} className="btn-secondary">Cancel</button><button onClick={handleResolve} className="btn-primary">Update Ticket</button></div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function NewTicketModal({ onClose, onSaved }) {
  const [form, setForm] = useState({ category: 'general', subject: '', description: '', priority: 'medium' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try { await api.post('/tickets', form); toast.success('Ticket raised successfully'); onSaved(); onClose(); }
    catch { toast.error('Failed to raise ticket'); }
    finally { setLoading(false); }
  };

  const f = k => e => setForm(p => ({...p, [k]: e.target.value}));
  return (
    <Modal title="Raise HR Ticket" onClose={onClose} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Category *</label>
            <select value={form.category} onChange={f('category')} className="input">
              <option value="general">General</option><option value="payroll">Payroll</option><option value="leave">Leave</option><option value="technical">Technical</option><option value="compliance">Compliance</option>
            </select>
          </div>
          <div><label className="label">Priority</label>
            <select value={form.priority} onChange={f('priority')} className="input">
              <option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option>
            </select>
          </div>
        </div>
        <div><label className="label">Subject *</label><input value={form.subject} onChange={f('subject')} className="input" required /></div>
        <div><label className="label">Description *</label><textarea value={form.description} onChange={f('description')} className="input h-28 resize-none" required /></div>
        <div className="flex justify-end gap-3"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button type="submit" disabled={loading} className="btn-primary">{loading?'Submitting...':'Raise Ticket'}</button></div>
      </form>
    </Modal>
  );
}
