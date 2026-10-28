import { useState, useEffect } from 'react';
import api from '../lib/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { Plus, Check, X, Clock } from 'lucide-react';
import Modal from '../components/Modal';

export default function Leaves() {
  const { isAdmin, user } = useAuth();
  const [leaves, setLeaves] = useState([]);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showApply, setShowApply] = useState(false);
  const [filterStatus, setFilterStatus] = useState('');
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchLeaves = async () => {
    try {
      const params = filterStatus ? `?status=${filterStatus}` : '';
      const res = await api.get(`/leaves${params}`);
      setLeaves(res.data);
    } catch { toast.error('Failed to load leaves'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    Promise.all([api.get('/leaves/types'), ...(isAdmin ? [api.get('/employees?status=active')] : [])])
      .then(([lt, emps]) => { setLeaveTypes(lt.data); if (emps) setEmployees(emps.data); });
    fetchLeaves();
  }, [filterStatus]);

  const handleApprove = async (id) => {
    try { await api.put(`/leaves/${id}/status`, { status: 'approved' }); toast.success('Leave approved'); fetchLeaves(); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const handleReject = async () => {
    try { await api.put(`/leaves/${rejectModal}/status`, { status: 'rejected', rejection_reason: rejectReason }); toast.success('Leave rejected'); setRejectModal(null); setRejectReason(''); fetchLeaves(); }
    catch { toast.error('Failed'); }
  };

  const handleCancel = async (id) => {
    if (!confirm('Cancel this leave request?')) return;
    try { await api.delete(`/leaves/${id}`); toast.success('Leave cancelled'); fetchLeaves(); }
    catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const statusBadge = { pending:'badge-yellow', approved:'badge-green', rejected:'badge-red', cancelled:'badge-gray' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Leave Management</h1>
        <button onClick={() => setShowApply(true)} className="btn-primary"><Plus size={16} />Apply Leave</button>
      </div>

      {/* Summary */}
      {!isAdmin && (
        <LeaveSummary leaveTypes={leaveTypes} leaves={leaves} />
      )}

      {/* Filter */}
      <div className="card py-4">
        <div className="flex gap-3">
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="input w-auto">
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                {isAdmin && <th className="table-th">Employee</th>}
                <th className="table-th">Leave Type</th>
                <th className="table-th">From</th>
                <th className="table-th">To</th>
                <th className="table-th">Days</th>
                <th className="table-th">Reason</th>
                <th className="table-th">Status</th>
                {isAdmin && <th className="table-th">Actions</th>}
                {!isAdmin && <th className="table-th">Action</th>}
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={8} className="text-center py-10 text-gray-400">Loading...</td></tr>
              : leaves.length === 0 ? <tr><td colSpan={8} className="text-center py-10 text-gray-400">No leave requests found</td></tr>
              : leaves.map(l => (
                <tr key={l._id} className="table-tr">
                  {isAdmin && <td className="table-td">
                    <div className="font-medium text-sm">{l.employee_name}</div>
                    <div className="text-xs text-gray-500">{l.department_name}</div>
                  </td>}
                  <td className="table-td font-medium">{l.leave_type_name}</td>
                  <td className="table-td">{l.start_date}</td>
                  <td className="table-td">{l.end_date}</td>
                  <td className="table-td text-center font-bold">{l.days}</td>
                  <td className="table-td max-w-48 truncate text-gray-600">{l.reason}</td>
                  <td className="table-td"><span className={`badge ${statusBadge[l.status]||'badge-gray'}`}>{l.status}</span></td>
                  <td className="table-td">
                    {isAdmin && l.status === 'pending' ? (
                      <div className="flex gap-1">
                        <button onClick={() => handleApprove(l._id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"><Check size={15} /></button>
                        <button onClick={() => setRejectModal(l._id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"><X size={15} /></button>
                      </div>
                    ) : !isAdmin && l.status === 'pending' ? (
                      <button onClick={() => handleCancel(l._id)} className="text-xs text-red-500 hover:underline">Cancel</button>
                    ) : <span className="text-gray-400 text-xs">—</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showApply && <ApplyLeaveModal onClose={() => setShowApply(false)} onSaved={fetchLeaves} leaveTypes={leaveTypes} employees={employees} isAdmin={isAdmin} />}

      {rejectModal && (
        <Modal title="Reject Leave" onClose={() => setRejectModal(null)} size="sm">
          <div className="space-y-4">
            <div><label className="label">Reason for rejection</label><textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="input h-24 resize-none" placeholder="Provide rejection reason..." /></div>
            <div className="flex justify-end gap-3"><button onClick={() => setRejectModal(null)} className="btn-secondary">Cancel</button><button onClick={handleReject} className="btn-danger">Reject Leave</button></div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function LeaveSummary({ leaveTypes, leaves }) {
  const currentYear = new Date().getFullYear().toString();
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {leaveTypes.slice(0,3).map(lt => {
        const used = leaves.filter(l => l.leave_type_id === lt._id && l.status === 'approved' && l.start_date?.startsWith(currentYear)).reduce((s,l) => s+(l.days||0), 0);
        const remaining = Math.max(0, lt.days_allowed - used);
        return (
          <div key={lt._id} className="card">
            <div className="text-sm font-medium text-gray-700 mb-2">{lt.name}</div>
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-500">Used: <strong>{used}</strong></span>
              <span className="text-gray-500">Left: <strong className="text-green-600">{remaining}</strong></span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100,(remaining/lt.days_allowed)*100)}%` }} /></div>
          </div>
        );
      })}
    </div>
  );
}

function ApplyLeaveModal({ onClose, onSaved, leaveTypes, employees, isAdmin }) {
  const [form, setForm] = useState({ leave_type_id: '', start_date: '', end_date: '', reason: '', employee_id: '' });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault(); setLoading(true);
    try {
      await api.post('/leaves', form);
      toast.success('Leave request submitted');
      onSaved(); onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <Modal title="Apply for Leave" onClose={onClose} size="md">
      <form onSubmit={handleSubmit} className="space-y-4">
        {isAdmin && (
          <div><label className="label">Employee</label>
            <select value={form.employee_id} onChange={e => setForm(p => ({...p, employee_id: e.target.value}))} className="input" required>
              <option value="">Select Employee</option>
              {employees.map(e => <option key={e._id} value={e._id}>{e.first_name} {e.last_name}</option>)}
            </select>
          </div>
        )}
        <div><label className="label">Leave Type *</label>
          <select value={form.leave_type_id} onChange={e => setForm(p => ({...p, leave_type_id: e.target.value}))} className="input" required>
            <option value="">Select Leave Type</option>
            {leaveTypes.map(lt => <option key={lt._id} value={lt._id}>{lt.name} ({lt.days_allowed} days)</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div><label className="label">Start Date *</label><input type="date" value={form.start_date} onChange={e => setForm(p=>({...p,start_date:e.target.value}))} className="input" required /></div>
          <div><label className="label">End Date *</label><input type="date" value={form.end_date} onChange={e => setForm(p=>({...p,end_date:e.target.value}))} className="input" required /></div>
        </div>
        <div><label className="label">Reason *</label><textarea value={form.reason} onChange={e => setForm(p=>({...p,reason:e.target.value}))} className="input h-24 resize-none" placeholder="Provide reason for leave..." required /></div>
        <div className="flex justify-end gap-3 pt-2"><button type="button" onClick={onClose} className="btn-secondary">Cancel</button><button type="submit" disabled={loading} className="btn-primary">{loading ? 'Submitting...' : 'Submit Request'}</button></div>
      </form>
    </Modal>
  );
}
