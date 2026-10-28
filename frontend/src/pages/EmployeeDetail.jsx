import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Mail, Phone, MapPin, Calendar, Briefcase, Building2, DollarSign, Star } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function EmployeeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [emp, setEmp] = useState(null);
  const [leaveSummary, setLeaveSummary] = useState([]);
  const [performance, setPerformance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    Promise.all([
      api.get(`/employees/${id}`),
      api.get(`/employees/${id}/leave-summary`),
      api.get(`/employees/${id}/performance`),
    ]).then(([e, l, p]) => { setEmp(e.data); setLeaveSummary(l.data); setPerformance(p.data); })
      .catch(() => toast.error('Failed to load employee'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>;
  if (!emp) return <div className="text-center py-20 text-gray-400">Employee not found</div>;

  const tabs = ['overview', 'leaves', 'performance'];

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-sm"><ArrowLeft size={16} />Back</button>

      {/* Header Card */}
      <div className="card">
        <div className="flex flex-wrap items-start gap-6">
          <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-2xl">{emp.first_name[0]}{emp.last_name[0]}</span>
          </div>
          <div className="flex-1">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{emp.first_name} {emp.last_name}</h1>
                <p className="text-gray-500">{emp.designation}</p>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                  <span className="flex items-center gap-1"><Building2 size={14} />{emp.department_name || 'N/A'}</span>
                  <span className="flex items-center gap-1"><Briefcase size={14} />{emp.employment_type}</span>
                  <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded">{emp.employee_code}</span>
                </div>
              </div>
              <span className={`badge ${emp.status==='active'?'badge-green':'badge-red'} text-sm px-3 py-1`}>{emp.status}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {tabs.map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${tab===t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>{t}</button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Personal */}
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">Personal Information</h3>
            <dl className="space-y-3">
              {[
                { label: 'Email', value: emp.email, icon: Mail },
                { label: 'Phone', value: emp.phone || '—', icon: Phone },
                { label: 'Date of Birth', value: emp.date_of_birth || '—', icon: Calendar },
                { label: 'Gender', value: emp.gender || '—', icon: null },
                { label: 'Address', value: [emp.address, emp.city, emp.state, emp.country].filter(Boolean).join(', ') || '—', icon: MapPin },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex gap-3">
                  {Icon && <Icon size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />}
                  <div><div className="text-xs text-gray-500">{label}</div><div className="text-sm text-gray-800">{value}</div></div>
                </div>
              ))}
            </dl>
          </div>

          {/* Employment */}
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">Employment Details</h3>
            <dl className="space-y-3">
              {[
                { label: 'Date Joined', value: emp.date_joined },
                { label: 'Manager', value: emp.manager_name || '—' },
                { label: 'Salary', value: `₹${(emp.salary||0).toLocaleString()} /month` },
                { label: 'PAN Number', value: emp.pan_number || '—' },
                { label: 'Bank Account', value: emp.bank_account || '—' },
                { label: 'IFSC', value: emp.bank_ifsc || '—' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between">
                  <span className="text-sm text-gray-500">{label}</span>
                  <span className="text-sm font-medium text-gray-800">{value}</span>
                </div>
              ))}
            </dl>
          </div>

          {/* Emergency */}
          {(emp.emergency_contact_name || emp.emergency_contact_phone) && (
            <div className="card">
              <h3 className="font-semibold text-gray-800 mb-4">Emergency Contact</h3>
              <dl className="space-y-2">
                <div className="flex justify-between"><span className="text-sm text-gray-500">Name</span><span className="text-sm font-medium">{emp.emergency_contact_name || '—'}</span></div>
                <div className="flex justify-between"><span className="text-sm text-gray-500">Phone</span><span className="text-sm font-medium">{emp.emergency_contact_phone || '—'}</span></div>
              </dl>
            </div>
          )}
        </div>
      )}

      {tab === 'leaves' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">Leave Balance (Current Year)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={leaveSummary}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Bar dataKey="used" fill="#ef4444" name="Used" radius={[4,4,0,0]} />
                <Bar dataKey="remaining" fill="#10b981" name="Remaining" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-4">Leave Summary</h3>
            <div className="space-y-3">
              {leaveSummary.map(lt => (
                <div key={lt._id} className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{lt.name}</span>
                      <span className="font-medium">{lt.used}/{lt.days_allowed} used</span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (lt.remaining/lt.days_allowed)*100)}%` }} /></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'performance' && (
        <div className="space-y-4">
          {performance.length === 0 ? <div className="card text-center py-12 text-gray-400">No performance reviews yet</div> : performance.map(pr => (
            <div key={pr._id} className="card">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-gray-800">{pr.review_period}</h3>
                  <p className="text-sm text-gray-500">Reviewed by {pr.reviewer_name} on {pr.review_date}</p>
                </div>
                <div className="text-right">
                  <div className="text-3xl font-bold text-blue-600">{pr.overall_rating}</div>
                  <div className="text-xs text-gray-500">/ 5.0</div>
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
                {[['Technical Skills', pr.technical_skills], ['Communication', pr.communication], ['Teamwork', pr.teamwork], ['Leadership', pr.leadership], ['Punctuality', pr.punctuality], ['Initiative', pr.initiative]].map(([k, v]) => (
                  <div key={k} className="bg-gray-50 rounded-lg p-3">
                    <div className="text-xs text-gray-500 mb-1">{k}</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-gray-200 rounded-full"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${(v/5)*100}%` }} /></div>
                      <span className="text-sm font-bold text-gray-700">{v}</span>
                    </div>
                  </div>
                ))}
              </div>
              {pr.strengths && <div className="mb-2"><span className="text-xs font-semibold text-green-600 uppercase">Strengths</span><p className="text-sm text-gray-700 mt-1">{pr.strengths}</p></div>}
              {pr.goals && <div><span className="text-xs font-semibold text-blue-600 uppercase">Goals</span><p className="text-sm text-gray-700 mt-1">{pr.goals}</p></div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
