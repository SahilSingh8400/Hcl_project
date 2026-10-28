import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { toast } from 'react-hot-toast';
import { User, Mail, Phone, Building2, Briefcase, Calendar, Lock } from 'lucide-react';

export default function Profile() {
  const { user, employee, isAdmin } = useAuth();
  const [form, setForm] = useState({ first_name: employee?.first_name||'', last_name: employee?.last_name||'', phone: employee?.phone||'', address: employee?.address||'', city: employee?.city||'', state: employee?.state||'', emergency_contact_name: employee?.emergency_contact_name||'', emergency_contact_phone: employee?.emergency_contact_phone||'' });
  const [passForm, setPassForm] = useState({ currentPassword:'', newPassword:'', confirmPassword:'' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPass, setSavingPass] = useState(false);
  const [tab, setTab] = useState('profile');

  const handleSaveProfile = async (e) => {
    e.preventDefault(); setSavingProfile(true);
    try { await api.put(`/employees/${employee._id}`, form); toast.success('Profile updated'); }
    catch { toast.error('Failed to update profile'); }
    finally { setSavingProfile(false); }
  };

  const handleChangePass = async (e) => {
    e.preventDefault();
    if (passForm.newPassword !== passForm.confirmPassword) return toast.error('Passwords do not match');
    if (passForm.newPassword.length < 6) return toast.error('Password must be at least 6 characters');
    setSavingPass(true);
    try { await api.put('/auth/change-password', passForm); toast.success('Password changed'); setPassForm({ currentPassword:'', newPassword:'', confirmPassword:'' }); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSavingPass(false); }
  };

  const f = k => e => setForm(p => ({...p, [k]: e.target.value}));
  const pf = k => e => setPassForm(p => ({...p, [k]: e.target.value}));

  return (
    <div className="space-y-6 max-w-4xl">
      <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>

      {/* Header */}
      <div className="card">
        <div className="flex items-center gap-6">
          <div className="w-20 h-20 bg-blue-600 rounded-2xl flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-2xl">{employee?.first_name?.[0]}{employee?.last_name?.[0]}</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">{employee?.first_name} {employee?.last_name}</h2>
            <p className="text-gray-500">{employee?.designation}</p>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500 flex-wrap">
              <span className="flex items-center gap-1"><Building2 size={14} />{employee?.department_name||'N/A'}</span>
              <span className="flex items-center gap-1"><Mail size={14} />{user?.email}</span>
              <span className="font-mono text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{employee?.employee_code}</span>
              <span className={`badge ${user?.role==='admin'?'badge-purple':'badge-blue'}`}>{user?.role}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-200">
        {['profile', 'security'].map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${tab===t?'border-blue-600 text-blue-600':'border-transparent text-gray-500 hover:text-gray-700'}`}>{t}</button>
        ))}
      </div>

      {tab === 'profile' && (
        <form onSubmit={handleSaveProfile} className="card space-y-5">
          <h3 className="font-semibold text-gray-800">Personal Information</h3>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">First Name</label><input value={form.first_name} onChange={f('first_name')} className="input" /></div>
            <div><label className="label">Last Name</label><input value={form.last_name} onChange={f('last_name')} className="input" /></div>
            <div><label className="label">Phone</label><input value={form.phone} onChange={f('phone')} className="input" /></div>
            <div><label className="label">City</label><input value={form.city} onChange={f('city')} className="input" /></div>
            <div><label className="label">State</label><input value={form.state} onChange={f('state')} className="input" /></div>
            <div className="col-span-2"><label className="label">Address</label><input value={form.address} onChange={f('address')} className="input" /></div>
          </div>
          <h3 className="font-semibold text-gray-800 pt-2 border-t border-gray-100">Emergency Contact</h3>
          <div className="grid grid-cols-2 gap-4">
            <div><label className="label">Contact Name</label><input value={form.emergency_contact_name} onChange={f('emergency_contact_name')} className="input" /></div>
            <div><label className="label">Contact Phone</label><input value={form.emergency_contact_phone} onChange={f('emergency_contact_phone')} className="input" /></div>
          </div>
          <div className="flex justify-end pt-2 border-t border-gray-100">
            <button type="submit" disabled={savingProfile} className="btn-primary">{savingProfile?'Saving...':'Save Changes'}</button>
          </div>
        </form>
      )}

      {tab === 'security' && (
        <form onSubmit={handleChangePass} className="card space-y-5 max-w-md">
          <h3 className="font-semibold text-gray-800">Change Password</h3>
          <div><label className="label">Current Password</label><input type="password" value={passForm.currentPassword} onChange={pf('currentPassword')} className="input" required /></div>
          <div><label className="label">New Password</label><input type="password" value={passForm.newPassword} onChange={pf('newPassword')} className="input" required /></div>
          <div><label className="label">Confirm New Password</label><input type="password" value={passForm.confirmPassword} onChange={pf('confirmPassword')} className="input" required /></div>
          <div className="flex justify-end">
            <button type="submit" disabled={savingPass} className="btn-primary"><Lock size={16} />{savingPass?'Changing...':'Change Password'}</button>
          </div>
        </form>
      )}

      {/* Employment Details (read-only) */}
      <div className="card">
        <h3 className="font-semibold text-gray-800 mb-4">Employment Details</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {[
            { label: 'Employee Code', value: employee?.employee_code },
            { label: 'Designation', value: employee?.designation },
            { label: 'Department', value: employee?.department_name },
            { label: 'Employment Type', value: employee?.employment_type },
            { label: 'Date Joined', value: employee?.date_joined },
            { label: 'Status', value: employee?.status },
          ].map(({ label, value }) => (
            <div key={label} className="bg-gray-50 rounded-xl p-4">
              <div className="text-xs text-gray-500 mb-1">{label}</div>
              <div className="font-medium text-gray-800">{value || '—'}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
