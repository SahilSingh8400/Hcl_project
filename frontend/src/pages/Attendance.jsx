import { useState, useEffect } from 'react';
import api from '../lib/api';
import { toast } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { CheckCircle, LogOut, Clock, CalendarDays } from 'lucide-react';

export default function Attendance() {
  const { isAdmin, user } = useAuth();
  const [records, setRecords] = useState([]);
  const [todayRecord, setTodayRecord] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkLoading, setCheckLoading] = useState(false);
  const [filterMonth, setFilterMonth] = useState(new Date().getMonth() + 1);
  const [filterYear, setFilterYear] = useState(new Date().getFullYear());
  const [filterEmp, setFilterEmp] = useState('');
  const [employees, setEmployees] = useState([]);

  const fetchData = async () => {
    try {
      const params = new URLSearchParams({ month: filterMonth, year: filterYear });
      if (filterEmp) params.append('employee_id', filterEmp);
      const [attRes, todayRes] = await Promise.all([
        api.get(`/attendance?${params}`),
        api.get('/attendance/today'),
      ]);
      setRecords(attRes.data);
      setTodayRecord(todayRes.data);
      if (!isAdmin && user?.employeeId) {
        const sumRes = await api.get(`/attendance/summary/${user.employeeId}?month=${filterMonth}&year=${filterYear}`);
        setSummary(sumRes.data);
      }
    } catch { toast.error('Failed to load attendance'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    if (isAdmin) {
      api.get('/employees?status=active&limit=100').then(r => {
        setEmployees(Array.isArray(r.data) ? r.data : (r.data.data || []));
      }).catch(() => {});
    }
    fetchData();
  }, [filterMonth, filterYear, filterEmp]);

  const handleCheckIn = async () => {
    setCheckLoading(true);
    try { await api.post('/attendance/checkin'); toast.success('Checked in successfully!'); fetchData(); }
    catch (err) { toast.error(err.response?.data?.error || 'Check-in failed'); }
    finally { setCheckLoading(false); }
  };

  const handleCheckOut = async () => {
    setCheckLoading(true);
    try { await api.put('/attendance/checkout'); toast.success('Checked out successfully!'); fetchData(); }
    catch (err) { toast.error(err.response?.data?.error || 'Check-out failed'); }
    finally { setCheckLoading(false); }
  };

  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const statusBadge = { present:'badge-green', absent:'badge-red', half_day:'badge-yellow', late:'badge-yellow' };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>

      {/* Check In/Out Card */}
      {!isAdmin && (
        <div className="card">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="font-semibold text-gray-800">Today's Attendance</h3>
              <p className="text-sm text-gray-500">{new Date().toDateString()}</p>
              {todayRecord && (
                <div className="flex gap-4 mt-2 text-sm">
                  {todayRecord.check_in && <span className="text-green-600">🟢 In: {todayRecord.check_in}</span>}
                  {todayRecord.check_out && <span className="text-blue-600">🔵 Out: {todayRecord.check_out}</span>}
                  {todayRecord.work_hours > 0 && <span className="text-gray-600">⏱ {todayRecord.work_hours}h</span>}
                </div>
              )}
            </div>
            <div className="flex gap-3">
              {!todayRecord ? (
                <button onClick={handleCheckIn} disabled={checkLoading} className="btn-success">
                  <CheckCircle size={16} />{checkLoading ? 'Loading...' : 'Check In'}
                </button>
              ) : !todayRecord.check_out ? (
                <button onClick={handleCheckOut} disabled={checkLoading} className="btn-primary">
                  <LogOut size={16} />{checkLoading ? 'Loading...' : 'Check Out'}
                </button>
              ) : (
                <span className="badge badge-green text-sm px-4 py-2">Day Complete ✓</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats (employee) */}
      {!isAdmin && summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Present Days', value: summary.present, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Absent Days', value: summary.absent, color: 'text-red-600', bg: 'bg-red-50' },
            { label: 'Half Days', value: summary.half_day, color: 'text-yellow-600', bg: 'bg-yellow-50' },
            { label: 'Total Hours', value: `${summary.total_hours}h`, color: 'text-blue-600', bg: 'bg-blue-50' },
          ].map(s => (
            <div key={s.label} className={`card ${s.bg} border-0`}>
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-sm text-gray-600">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="card py-4">
        <div className="flex flex-wrap gap-3">
          <select value={filterMonth} onChange={e => setFilterMonth(e.target.value)} className="input w-auto">
            {months.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
          </select>
          <select value={filterYear} onChange={e => setFilterYear(e.target.value)} className="input w-auto">
            {[2023,2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          {isAdmin && (
            <select value={filterEmp} onChange={e => setFilterEmp(e.target.value)} className="input w-auto">
              <option value="">All Employees</option>
              {employees.map(e => <option key={e._id} value={e._id}>{e.first_name} {e.last_name}</option>)}
            </select>
          )}
        </div>
      </div>

      {/* Records Table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="table-th">Date</th>
                {isAdmin && <th className="table-th">Employee</th>}
                <th className="table-th">Check In</th>
                <th className="table-th">Check Out</th>
                <th className="table-th">Hours</th>
                <th className="table-th">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? <tr><td colSpan={6} className="text-center py-10 text-gray-400">Loading...</td></tr>
              : records.length === 0 ? <tr><td colSpan={6} className="text-center py-10 text-gray-400">No records found</td></tr>
              : records.map(r => (
                <tr key={r._id} className="table-tr">
                  <td className="table-td font-medium">{r.date}</td>
                  {isAdmin && <td className="table-td">
                    <div className="font-medium text-gray-900 text-sm">{r.employee_name}</div>
                    <div className="text-xs text-gray-500">{r.department_name}</div>
                  </td>}
                  <td className="table-td">{r.check_in || '—'}</td>
                  <td className="table-td">{r.check_out || '—'}</td>
                  <td className="table-td">{r.work_hours ? `${r.work_hours}h` : '—'}</td>
                  <td className="table-td"><span className={`badge ${statusBadge[r.status]||'badge-gray'}`}>{r.status?.replace('_',' ')}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
