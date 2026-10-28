import { useState, useEffect } from 'react';
import api from '../lib/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Plus, Megaphone, Edit, Trash2 } from 'lucide-react';
import Modal from '../components/Modal';

export default function Announcements() {
  const { isAdmin } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editAnn, setEditAnn] = useState(null);

  const fetchAnn = async () => {
    try { const res = await api.get('/announcements'); setAnnouncements(res.data); }
    catch { toast.error('Failed to load'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchAnn(); }, []);

  const handleDelete = async (id) => {
    if (!confirm('Delete this announcement?')) return;
    try { await api.delete(`/announcements/${id}`); toast.success('Deleted'); fetchAnn(); }
    catch { toast.error('Failed'); }
  };

  const priorityColors = { high: 'border-l-red-500 bg-red-50', normal: 'border-l-blue-400 bg-blue-50', low: 'border-l-gray-300 bg-gray-50' };
  const typeColors = { general: 'badge-blue', performance: 'badge-purple', policy: 'badge-yellow', event: 'badge-green' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Announcements</h1>
        {isAdmin && <button onClick={() => { setEditAnn(null); setShowModal(true); }} className="btn-primary"><Plus size={16} />New Announcement</button>}
      </div>

      {loading ? <div className="text-center py-20 text-gray-400">Loading...</div>
      : announcements.length === 0 ? <div className="card text-center py-16 text-gray-400"><Megaphone size={40} className="mx-auto mb-3 opacity-30" /><p>No announcements</p></div>
      : (
        <div className="space-y-4">
          {announcements.map(a => (
            <div key={a._id} className={`card border-l-4 ${priorityColors[a.priority]||priorityColors.normal}`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className={`badge ${typeColors[a.type]||'badge-gray'}`}>{a.type}</span>
                    {a.priority === 'high' && <span className="badge badge-red">High Priority</span>}
                    {!a.is_active && <span className="badge badge-gray">Inactive</span>}
                  </div>
                  <h3 className="font-bold text-gray-900 text-lg mb-2">{a.title}</h3>
                  <p className="text-gray-600 text-sm leading-relaxed">{a.content}</p>
                  <div className="flex gap-4 mt-3 text-xs text-gray-400">
                    <span>By: {a.created_by_name}</span>
                    <span>{new Date(a.created_at).toLocaleDateString()}</span>
                    {a.expires_at && <span>Expires: {a.expires_at}</span>}
                  </div>
                </div>
                {isAdmin && (
                  <div className="flex gap-1 flex-shrink-0">
                    <button onClick={() => { setEditAnn(a); setShowModal(true); }} className="p-1.5 text-gray-500 hover:bg-white hover:shadow rounded-lg"><Edit size={15} /></button>
                    <button onClick={() => handleDelete(a._id)} className="p-1.5 text-red-500 hover:bg-white hover:shadow rounded-lg"><Trash2 size={15} /></button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && <AnnModal onClose={() => setShowModal(false)} onSaved={fetchAnn} announcement={editAnn} />}
    </div>
  );
}

function AnnModal({ onClose, onSaved, announcement }) {
  const [form, setForm] = useState(announcement || { title:'', content:'', type:'general', priority:'normal', is_active:true, expires_at:'' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      if (announcement) { await api.put(`/announcements/${announcement._id}`, form); toast.success('Updated'); }
      else { await api.post('/announcements', form); toast.success('Announcement published'); }
      onSaved(); onClose();
    } catch { toast.error('Failed'); }
    finally { setLoading(false); }
  };

  const f = k => e => setForm(p => ({...p, [k]: e.target.value}));
  return (
    <Modal title={announcement ? 'Edit Announcement' : 'New Announcement'} onClose={onClose} size="lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div><label className="label">Title *</label><input value={form.title} onChange={f('title')} className="input" required /></div>
        <div><label className="label">Content *</label><textarea value={form.content} onChange={f('content')} className="input h-32 resize-none" required /></div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Type</label>
            <select value={form.type} onChange={f('type')} className="input">
              <option value="general">General</option><option value="performance">Performance</option><option value="policy">Policy</option><option value="event">Event</option>
            </select>
          </div>
          <div><label className="label">Priority</label>
            <select value={form.priority} onChange={f('priority')} className="input">
              <option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option>
            </select>
          </div>
          <div><label className="label">Expires At</label><input type="date" value={form.expires_at||''} onChange={f('expires_at')} className="input" /></div>
          <div><label className="label">Active</label>
            <select value={form.is_active} onChange={e=>setForm(p=>({...p,is_active:e.target.value==='true'}))} className="input">
              <option value="true">Active</option><option value="false">Inactive</option>
            </select>
          </div>
        </div>
        <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button type="submit" disabled={loading} className="btn-primary">{loading?'Saving...':announcement?'Update':'Publish'}</button></div>
      </form>
    </Modal>
  );
}
