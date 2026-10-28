import { useState, useEffect } from 'react';
import api from '../lib/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Plus, Star, Edit } from 'lucide-react';
import Modal from '../components/Modal';

function RatingStars({ value, max = 5 }) {
  return (
    <div className="flex items-center gap-1">
      {[...Array(max)].map((_, i) => <Star key={i} size={14} className={i < Math.round(value) ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200 fill-gray-200'} />)}
      <span className="text-sm font-bold text-gray-700 ml-1">{value}</span>
    </div>
  );
}

export default function Performance() {
  const { isAdmin } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editReview, setEditReview] = useState(null);
  const [employees, setEmployees] = useState([]);

  const fetchReviews = async () => {
    try { const res = await api.get('/performance'); setReviews(res.data); }
    catch { toast.error('Failed to load reviews'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (isAdmin) api.get('/employees?status=active').then(r => setEmployees(r.data));
    fetchReviews();
  }, []);

  const statusBadge = { draft: 'badge-yellow', published: 'badge-green', archived: 'badge-gray' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Performance Reviews</h1>
        {isAdmin && <button onClick={() => { setEditReview(null); setShowModal(true); }} className="btn-primary"><Plus size={16} />New Review</button>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? <div className="col-span-3 text-center py-20 text-gray-400">Loading...</div>
        : reviews.length === 0 ? <div className="col-span-3 text-center py-20 text-gray-400">No performance reviews found</div>
        : reviews.map(r => (
          <div key={r._id} className="card hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="font-semibold text-gray-900">{r.employee_name}</h3>
                <p className="text-xs text-gray-500">{r.designation} · {r.department_name}</p>
                <p className="text-xs text-gray-400 mt-1">{r.review_period} · Reviewed by {r.reviewer_name}</p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-blue-600">{r.overall_rating}</div>
                <div className="text-xs text-gray-400">/ 5.0</div>
              </div>
            </div>

            <div className="space-y-2 mb-4">
              {[['Technical Skills', r.technical_skills], ['Communication', r.communication], ['Teamwork', r.teamwork], ['Leadership', r.leadership]].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 w-32">{k}</span>
                  <div className="flex-1 mx-3 h-1.5 bg-gray-100 rounded-full"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${(v/5)*100}%` }} /></div>
                  <span className="text-xs font-bold text-gray-600 w-6">{v}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between">
              <span className={`badge ${statusBadge[r.status]||'badge-gray'}`}>{r.status}</span>
              {isAdmin && <button onClick={() => { setEditReview(r); setShowModal(true); }} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded-lg"><Edit size={15} /></button>}
            </div>

            {r.strengths && <p className="text-xs text-green-700 bg-green-50 rounded-lg px-3 py-2 mt-3">💪 {r.strengths}</p>}
            {r.goals && <p className="text-xs text-blue-700 bg-blue-50 rounded-lg px-3 py-2 mt-2">🎯 {r.goals}</p>}
          </div>
        ))}
      </div>

      {showModal && <ReviewModal onClose={() => setShowModal(false)} onSaved={fetchReviews} review={editReview} employees={employees} />}
    </div>
  );
}

function ReviewModal({ onClose, onSaved, review, employees }) {
  const [form, setForm] = useState(review || { employee_id:'', review_period:'Q4 2025', review_date: new Date().toISOString().split('T')[0], overall_rating: 4, technical_skills: 4, communication: 4, teamwork: 4, leadership: 4, punctuality: 4, initiative: 4, strengths:'', weaknesses:'', goals:'', comments:'', status:'draft' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      if (review) { await api.put(`/performance/${review._id}`, form); toast.success('Review updated'); }
      else { await api.post('/performance', form); toast.success('Review created'); }
      onSaved(); onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  const f = (k) => (e) => setForm(p => ({ ...p, [k]: e.target.value }));
  const ratingFields = [['overall_rating','Overall Rating'],['technical_skills','Technical Skills'],['communication','Communication'],['teamwork','Teamwork'],['leadership','Leadership'],['punctuality','Punctuality'],['initiative','Initiative']];

  return (
    <Modal title={review ? 'Edit Review' : 'New Performance Review'} onClose={onClose} size="xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Employee *</label>
            <select value={form.employee_id} onChange={f('employee_id')} className="input" required disabled={!!review}>
              <option value="">Select Employee</option>
              {employees.map(e => <option key={e._id} value={e._id}>{e.first_name} {e.last_name}</option>)}
            </select>
          </div>
          <div><label className="label">Review Period *</label><input value={form.review_period} onChange={f('review_period')} className="input" placeholder="e.g. Q3 2025" required /></div>
          <div><label className="label">Review Date</label><input type="date" value={form.review_date} onChange={f('review_date')} className="input" /></div>
          <div><label className="label">Status</label>
            <select value={form.status} onChange={f('status')} className="input">
              <option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option>
            </select>
          </div>
        </div>

        <div>
          <h3 className="font-semibold text-gray-700 mb-3">Ratings (1–5)</h3>
          <div className="grid grid-cols-2 gap-3">
            {ratingFields.map(([key, label]) => (
              <div key={key}>
                <label className="label">{label}</label>
                <input type="number" min="1" max="5" step="0.1" value={form[key]} onChange={f(key)} className="input" />
              </div>
            ))}
          </div>
        </div>

        <div><label className="label">Strengths</label><textarea value={form.strengths||''} onChange={f('strengths')} className="input h-20 resize-none" /></div>
        <div><label className="label">Areas for Improvement</label><textarea value={form.weaknesses||''} onChange={f('weaknesses')} className="input h-20 resize-none" /></div>
        <div><label className="label">Goals for Next Period</label><textarea value={form.goals||''} onChange={f('goals')} className="input h-20 resize-none" /></div>

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button type="button" onClick={onClose} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading} className="btn-primary">{loading ? 'Saving...' : review ? 'Update Review' : 'Create Review'}</button>
        </div>
      </form>
    </Modal>
  );
}
