import { useState, useEffect } from 'react';
import api from '../lib/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Plus, Briefcase, Edit, Trash2, Users, MapPin, DollarSign } from 'lucide-react';
import Modal from '../components/Modal';

export default function Jobs() {
  const { isAdmin } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editJob, setEditJob] = useState(null);
  const [selectedJob, setSelectedJob] = useState(null);
  const [filterStatus, setFilterStatus] = useState('open');

  const fetchJobs = async () => {
    try { const res = await api.get(`/jobs${filterStatus ? `?status=${filterStatus}` : ''}`); setJobs(res.data); }
    catch { toast.error('Failed to load jobs'); }
    finally { setLoading(false); }
  };

  useEffect(() => { api.get('/departments').then(r => setDepartments(r.data)); fetchJobs(); }, [filterStatus]);

  const handleDelete = async (id) => {
    if (!confirm('Delete this job posting?')) return;
    try { await api.delete(`/jobs/${id}`); toast.success('Job posting deleted'); fetchJobs(); }
    catch { toast.error('Failed'); }
  };

  const statusColors = { open:'badge-green', closed:'badge-red', paused:'badge-yellow' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Recruitment</h1>
        {isAdmin && <button onClick={() => { setEditJob(null); setShowModal(true); }} className="btn-primary"><Plus size={16} />Post Job</button>}
      </div>

      <div className="card py-4">
        <div className="flex gap-3">
          {['open','closed','paused',''].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)} className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${filterStatus===s?'bg-blue-600 text-white':'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{s||'All'}</button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? <div className="col-span-3 text-center py-20 text-gray-400">Loading...</div>
        : jobs.length === 0 ? <div className="col-span-3 text-center py-20 text-gray-400"><Briefcase size={40} className="mx-auto mb-3 opacity-30" /><p>No job postings found</p></div>
        : jobs.map(j => (
          <div key={j._id} className="card hover:shadow-md transition-shadow cursor-pointer" onClick={() => setSelectedJob(j)}>
            <div className="flex items-start justify-between mb-3">
              <span className={`badge ${statusColors[j.status]||'badge-gray'}`}>{j.status}</span>
              {isAdmin && (
                <div className="flex gap-1" onClick={e=>e.stopPropagation()}>
                  <button onClick={() => { setEditJob(j); setShowModal(true); }} className="p-1 text-gray-400 hover:text-gray-600"><Edit size={14} /></button>
                  <button onClick={() => handleDelete(j._id)} className="p-1 text-red-400 hover:text-red-600"><Trash2 size={14} /></button>
                </div>
              )}
            </div>
            <h3 className="font-bold text-gray-900 text-lg mb-1">{j.title}</h3>
            <p className="text-sm text-blue-600 font-medium mb-3">{j.department_name}</p>
            <div className="space-y-1.5 text-sm text-gray-500">
              {j.location && <div className="flex items-center gap-1.5"><MapPin size={13} />{j.location}</div>}
              <div className="flex items-center gap-1.5"><Briefcase size={13} />{j.employment_type}</div>
              {j.salary_min && <div className="flex items-center gap-1.5"><DollarSign size={13} />₹{(j.salary_min/1000).toFixed(0)}K – ₹{(j.salary_max/1000).toFixed(0)}K</div>}
              <div className="flex items-center gap-1.5"><Users size={13} />{j.openings} opening{j.openings>1?'s':''} · {j.application_count||0} applied</div>
            </div>
            {j.deadline && <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">Deadline: {j.deadline}</div>}
          </div>
        ))}
      </div>

      {showModal && <JobModal onClose={() => setShowModal(false)} onSaved={fetchJobs} job={editJob} departments={departments} />}
      {selectedJob && <JobDetailModal job={selectedJob} onClose={() => setSelectedJob(null)} isAdmin={isAdmin} onRefresh={fetchJobs} />}
    </div>
  );
}

function JobModal({ onClose, onSaved, job, departments }) {
  const [form, setForm] = useState(job || { title:'', department_id:'', description:'', requirements:'', employment_type:'Full-time', location:'', salary_min:'', salary_max:'', openings:1, deadline:'', status:'open' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      if (job) { await api.put(`/jobs/${job._id}`, form); toast.success('Job updated'); }
      else { await api.post('/jobs', form); toast.success('Job posted'); }
      onSaved(); onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  const f = k => e => setForm(p => ({...p, [k]: e.target.value}));
  return (
    <Modal title={job ? 'Edit Job Posting' : 'Post New Job'} onClose={onClose} size="xl">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="label">Job Title *</label><input value={form.title} onChange={f('title')} className="input" required /></div>
          <div><label className="label">Department</label>
            <select value={form.department_id||''} onChange={f('department_id')} className="input">
              <option value="">Select Department</option>
              {departments.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
            </select>
          </div>
          <div><label className="label">Employment Type</label>
            <select value={form.employment_type} onChange={f('employment_type')} className="input">
              <option>Full-time</option><option>Part-time</option><option>Contract</option><option>Intern</option>
            </select>
          </div>
          <div><label className="label">Location</label><input value={form.location||''} onChange={f('location')} className="input" placeholder="City / Remote" /></div>
          <div><label className="label">Openings</label><input type="number" value={form.openings} onChange={f('openings')} className="input" min="1" /></div>
          <div><label className="label">Min Salary (₹)</label><input type="number" value={form.salary_min||''} onChange={f('salary_min')} className="input" /></div>
          <div><label className="label">Max Salary (₹)</label><input type="number" value={form.salary_max||''} onChange={f('salary_max')} className="input" /></div>
          <div><label className="label">Deadline</label><input type="date" value={form.deadline||''} onChange={f('deadline')} className="input" /></div>
          <div><label className="label">Status</label>
            <select value={form.status} onChange={f('status')} className="input">
              <option value="open">Open</option><option value="paused">Paused</option><option value="closed">Closed</option>
            </select>
          </div>
        </div>
        <div><label className="label">Job Description *</label><textarea value={form.description} onChange={f('description')} className="input h-28 resize-none" required /></div>
        <div><label className="label">Requirements</label><textarea value={form.requirements||''} onChange={f('requirements')} className="input h-20 resize-none" /></div>
        <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button type="submit" disabled={loading} className="btn-primary">{loading?'Saving...':job?'Update':'Post Job'}</button></div>
      </form>
    </Modal>
  );
}

function JobDetailModal({ job, onClose, isAdmin, onRefresh }) {
  const [jobDetail, setJobDetail] = useState(null);
  const [showApply, setShowApply] = useState(false);
  const [applyForm, setApplyForm] = useState({ applicant_name:'', applicant_email:'', applicant_phone:'', cover_letter:'' });

  useEffect(() => { api.get(`/jobs/${job._id}`).then(r => setJobDetail(r.data)); }, [job._id]);

  const handleApplicationUpdate = async (appId, status) => {
    try { await api.put(`/jobs/applications/${appId}`, { status }); toast.success('Updated'); api.get(`/jobs/${job._id}`).then(r => setJobDetail(r.data)); }
    catch { toast.error('Failed'); }
  };

  const handleApply = async (e) => {
    e.preventDefault();
    try { await api.post(`/jobs/${job._id}/apply`, applyForm); toast.success('Application submitted!'); setShowApply(false); api.get(`/jobs/${job._id}`).then(r => setJobDetail(r.data)); }
    catch { toast.error('Failed'); }
  };

  const appStatusColors = { applied:'badge-blue', screening:'badge-yellow', interview:'badge-purple', offered:'badge-green', rejected:'badge-red' };

  return (
    <Modal title={job.title} onClose={onClose} size="xl">
      <div className="space-y-5">
        <div className="flex flex-wrap gap-3 text-sm text-gray-600">
          {job.department_name && <span className="bg-blue-50 text-blue-700 px-3 py-1 rounded-full">{job.department_name}</span>}
          {job.location && <span className="bg-gray-100 px-3 py-1 rounded-full flex items-center gap-1"><MapPin size={12} />{job.location}</span>}
          {job.employment_type && <span className="bg-gray-100 px-3 py-1 rounded-full">{job.employment_type}</span>}
          {job.salary_min && <span className="bg-green-50 text-green-700 px-3 py-1 rounded-full">₹{(job.salary_min/1000).toFixed(0)}K–₹{(job.salary_max/1000).toFixed(0)}K</span>}
        </div>

        <div>
          <h4 className="font-semibold text-gray-700 mb-2">Description</h4>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{job.description}</p>
        </div>
        {job.requirements && <div>
          <h4 className="font-semibold text-gray-700 mb-2">Requirements</h4>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{job.requirements}</p>
        </div>}

        {!isAdmin && job.status === 'open' && (
          !showApply ? <button onClick={() => setShowApply(true)} className="btn-primary">Apply Now</button>
          : <form onSubmit={handleApply} className="space-y-3 border border-gray-200 rounded-xl p-4">
            <h4 className="font-semibold">Submit Application</h4>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Your Name *</label><input value={applyForm.applicant_name} onChange={e=>setApplyForm(p=>({...p,applicant_name:e.target.value}))} className="input" required /></div>
              <div><label className="label">Email *</label><input type="email" value={applyForm.applicant_email} onChange={e=>setApplyForm(p=>({...p,applicant_email:e.target.value}))} className="input" required /></div>
              <div><label className="label">Phone</label><input value={applyForm.applicant_phone} onChange={e=>setApplyForm(p=>({...p,applicant_phone:e.target.value}))} className="input" /></div>
            </div>
            <div><label className="label">Cover Letter</label><textarea value={applyForm.cover_letter} onChange={e=>setApplyForm(p=>({...p,cover_letter:e.target.value}))} className="input h-24 resize-none" /></div>
            <div className="flex gap-2"><button type="submit" className="btn-primary">Submit</button><button type="button" onClick={() => setShowApply(false)} className="btn-secondary">Cancel</button></div>
          </form>
        )}

        {isAdmin && jobDetail?.applications?.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-700 mb-3">Applications ({jobDetail.applications.length})</h4>
            <div className="space-y-2">
              {jobDetail.applications.map(a => (
                <div key={a._id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-sm">{a.applicant_name}</div>
                    <div className="text-xs text-gray-500">{a.applicant_email}</div>
                  </div>
                  <span className={`badge ${appStatusColors[a.status]||'badge-gray'}`}>{a.status}</span>
                  <select value={a.status} onChange={e=>handleApplicationUpdate(a._id,e.target.value)} className="text-xs border border-gray-200 rounded-lg px-2 py-1" onClick={e=>e.stopPropagation()}>
                    {['applied','screening','interview','offered','rejected'].map(s=><option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
