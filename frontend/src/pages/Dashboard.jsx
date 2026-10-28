import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { Users, Building2, Clock, CalendarDays, DollarSign, Briefcase, TicketIcon, TrendingUp, CheckCircle, AlertCircle, Gift, Megaphone } from 'lucide-react';

const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4'];

function StatCard({ icon: Icon, label, value, sub, color = 'blue' }) {
  const colors = { blue:'bg-blue-50 text-blue-600', green:'bg-green-50 text-green-600', yellow:'bg-yellow-50 text-yellow-600', red:'bg-red-50 text-red-600', purple:'bg-purple-50 text-purple-600', cyan:'bg-cyan-50 text-cyan-600' };
  return (
    <div className="card flex items-center gap-4">
      <div className={`p-3 rounded-xl ${colors[color]}`}><Icon size={22} /></div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value}</div>
        <div className="text-sm text-gray-500">{label}</div>
        {sub && <div className="text-xs text-gray-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

export default function Dashboard() {
  const { isAdmin } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const endpoint = isAdmin ? '/dashboard' : '/dashboard/employee';
    api.get(endpoint).then(r => setData(r.data)).catch(console.error).finally(() => setLoading(false));
  }, [isAdmin]);

  if (loading) return <div className="flex justify-center py-20"><div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" /></div>;
  if (!data) return null;

  if (!isAdmin) return <EmployeeDashboard data={data} />;

  const { metrics, charts, recent } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">HR Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Welcome back! Here's what's happening today.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Employees" value={metrics.totalEmployees} sub={`+${metrics.newThisMonth} this month`} color="blue" />
        <StatCard icon={Building2} label="Departments" value={metrics.totalDepartments} color="purple" />
        <StatCard icon={Clock} label="Present Today" value={metrics.presentToday} sub={`${metrics.absentToday} absent`} color="green" />
        <StatCard icon={CalendarDays} label="Pending Leaves" value={metrics.pendingLeaves} color="yellow" />
        <StatCard icon={DollarSign} label="Monthly Payroll" value={`₹${(metrics.totalPayroll/100000).toFixed(1)}L`} sub={`${metrics.payrollCount} employees`} color="green" />
        <StatCard icon={Briefcase} label="Open Jobs" value={metrics.openJobs} color="cyan" />
        <StatCard icon={TicketIcon} label="Open Tickets" value={metrics.openTickets} color="red" />
        <StatCard icon={TrendingUp} label="Avg Rating" value="4.0" sub="Q3 2025" color="purple" />
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dept Breakdown */}
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">Employees by Department</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={charts.byDepartment} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={90} />
              <Tooltip />
              <Bar dataKey="count" fill="#3b82f6" radius={[0,4,4,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Gender */}
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">Gender Distribution</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={charts.byGender} dataKey="count" nameKey="gender" cx="50%" cy="50%" outerRadius={80} label={({ gender, percent }) => `${gender} ${(percent*100).toFixed(0)}%`}>
                {charts.byGender.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Attendance Trend */}
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">Attendance Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={charts.attendanceTrend}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="present" stroke="#10b981" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="absent" stroke="#ef4444" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Payroll Trend */}
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">Monthly Payroll (₹)</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={[...charts.payrollTrend].reverse()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tickFormatter={(m) => `M${m}`} tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `₹${(v/100000).toFixed(0)}L`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => `₹${v.toLocaleString()}`} />
              <Bar dataKey="total" fill="#3b82f6" name="Net Payroll" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Budget vs Salary */}
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">Dept Budget vs Salary Cost</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={charts.budgetData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={(v) => `₹${(v/100000).toFixed(0)}L`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => `₹${v.toLocaleString()}`} />
              <Legend />
              <Bar dataKey="budget" fill="#e0e7ff" name="Budget" radius={[4,4,0,0]} />
              <Bar dataKey="salary_cost" fill="#3b82f6" name="Salary Cost" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Recent Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Leave Requests */}
        <div className="card lg:col-span-2">
          <h3 className="font-semibold text-gray-800 mb-4">Recent Leave Requests</h3>
          <div className="space-y-3">
            {recent.recentLeaves.map(l => (
              <div key={l._id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <span className="text-blue-600 font-semibold text-xs">{l.employee_name?.split(' ').map(n=>n[0]).join('')}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900 truncate">{l.employee_name}</div>
                  <div className="text-xs text-gray-500">{l.leave_type} · {l.days} days</div>
                </div>
                <span className={`badge ${l.status==='approved'?'badge-green':l.status==='rejected'?'badge-red':l.status==='cancelled'?'badge-gray':'badge-yellow'}`}>{l.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right col */}
        <div className="space-y-6">
          {/* Birthdays */}
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><Gift size={16} className="text-pink-500" /> Upcoming Birthdays</h3>
            {recent.upcomingBirthdays.length === 0 ? <p className="text-sm text-gray-400">None this week</p> : (
              <div className="space-y-2">
                {recent.upcomingBirthdays.map((e, i) => (
                  <div key={i} className="text-sm">
                    <span className="font-medium text-gray-800">{e.first_name} {e.last_name}</span>
                    <span className="text-gray-500 text-xs ml-2">{e.date_of_birth?.substring(5)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Announcements */}
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><Megaphone size={16} className="text-blue-500" /> Announcements</h3>
            <div className="space-y-2">
              {recent.announcements.slice(0,3).map(a => (
                <div key={a._id} className="border-l-2 border-blue-300 pl-3">
                  <div className="text-sm font-medium text-gray-800 line-clamp-1">{a.title}</div>
                  <div className="text-xs text-gray-500 line-clamp-2">{a.content}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function EmployeeDashboard({ data }) {
  const { todayAttendance, leaveBalance, myLeaves, myPayslips, myAssets, myTickets, announcements, myAttendance } = data;
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const presentDays = myAttendance?.filter(a=>a.status==='present').length || 0;
  const totalDays = myAttendance?.length || 0;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Clock} label="Present This Month" value={presentDays} sub={`of ${totalDays} days`} color="green" />
        <StatCard icon={CalendarDays} label="Pending Leaves" value={myLeaves?.filter(l=>l.status==='pending').length||0} color="yellow" />
        <StatCard icon={DollarSign} label="Last Salary" value={myPayslips?.[0]?`₹${(myPayslips[0].net_salary/1000).toFixed(0)}K`:'—'} sub={myPayslips?.[0]?`${months[myPayslips[0].month-1]} ${myPayslips[0].year}`:'No data'} color="blue" />
        <StatCard icon={Package} label="Assets Assigned" value={myAssets?.length||0} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Today Attendance */}
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">Today's Attendance</h3>
          {todayAttendance ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                <CheckCircle className="text-green-600" size={20} />
                <div><div className="font-medium text-green-800">Checked In</div><div className="text-sm text-green-600">{todayAttendance.check_in}</div></div>
              </div>
              {todayAttendance.check_out && (
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                  <CheckCircle className="text-blue-600" size={20} />
                  <div><div className="font-medium text-blue-800">Checked Out</div><div className="text-sm text-blue-600">{todayAttendance.check_out} · {todayAttendance.work_hours}h worked</div></div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
              <AlertCircle className="text-yellow-600" size={20} />
              <div className="font-medium text-yellow-800">Not checked in today</div>
            </div>
          )}
        </div>

        {/* Leave Balance */}
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">Leave Balance</h3>
          <div className="space-y-2">
            {leaveBalance?.slice(0,4).map(lt => (
              <div key={lt._id}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-700">{lt.name}</span>
                  <span className="font-medium text-gray-900">{lt.remaining}/{lt.days_allowed}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, (lt.remaining/lt.days_allowed)*100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Leaves */}
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">Recent Leave Requests</h3>
          {myLeaves?.length === 0 ? <p className="text-sm text-gray-400">No leave requests</p> : (
            <div className="space-y-2">
              {myLeaves?.map(l => (
                <div key={l._id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div>
                    <div className="text-sm font-medium text-gray-800">{l.leave_type_name}</div>
                    <div className="text-xs text-gray-500">{l.start_date} to {l.end_date} ({l.days} days)</div>
                  </div>
                  <span className={`badge ${l.status==='approved'?'badge-green':l.status==='rejected'?'badge-red':l.status==='cancelled'?'badge-gray':'badge-yellow'}`}>{l.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Announcements */}
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">Announcements</h3>
          <div className="space-y-3">
            {announcements?.slice(0,4).map(a => (
              <div key={a._id} className="border-l-3 border-blue-400 pl-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`badge ${a.priority==='high'?'badge-red':'badge-blue'}`}>{a.priority}</span>
                  <span className="text-xs text-gray-400">{a.type}</span>
                </div>
                <div className="text-sm font-medium text-gray-800">{a.title}</div>
                <div className="text-xs text-gray-500 line-clamp-2">{a.content}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
