import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import {
  Users, Building2, Clock, CalendarDays, DollarSign, Briefcase,
  TicketIcon, TrendingUp, CheckCircle, AlertCircle, Gift, Megaphone, Package
} from 'lucide-react';

const COLORS = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4'];

function StatCard({ icon: Icon, label, value, sub, color = 'blue' }) {
  const colors = {
    blue:'bg-blue-50 text-blue-600',
    green:'bg-green-50 text-green-600',
    yellow:'bg-yellow-50 text-yellow-600',
    red:'bg-red-50 text-red-600',
    purple:'bg-purple-50 text-purple-600',
    cyan:'bg-cyan-50 text-cyan-600'
  };
  return (
    <div className="card flex items-center gap-4">
      <div className={`p-3 rounded-xl ${colors[color] || colors.blue}`}>
        {Icon ? <Icon size={22} /> : null}
      </div>
      <div>
        <div className="text-2xl font-bold text-gray-900">{value ?? '—'}</div>
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
  const [error, setError] = useState(null);

  useEffect(() => {
    let isMounted = true;
    const endpoint = isAdmin ? '/dashboard' : '/dashboard/employee';
    api.get(endpoint)
      .then(r => {
        if (isMounted) {
          setData(r.data);
          setError(null);
        }
      })
      .catch(err => {
        console.error('Dashboard load error:', err);
        if (isMounted) setError(err.response?.data?.error || err.message || 'Failed to load dashboard data');
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => { isMounted = false; };
  }, [isAdmin]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-3" />
        <p className="text-sm text-gray-500">Loading Workforce Dashboard...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="card text-center py-16 space-y-3">
        <AlertCircle className="mx-auto text-amber-500" size={42} />
        <h3 className="text-lg font-bold text-gray-900">Dashboard Unavailable</h3>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          {error || 'Unable to fetch dashboard data. Please make sure the backend server is running on port 5000.'}
        </p>
        <button onClick={() => window.location.reload()} className="btn-primary inline-flex items-center gap-2 mt-2">
          Reload Dashboard
        </button>
      </div>
    );
  }

  if (!isAdmin) return <EmployeeDashboard data={data} />;

  const metrics = data.metrics || {};
  const charts = data.charts || {};
  const recent = data.recent || {};

  const byDept = charts.byDepartment || [];
  const byGrade = charts.byGrade || [];
  const perfDist = charts.performanceDistribution || [];
  const genderData = charts.byGender || [];
  const attTrend = charts.attendanceTrend || [];
  const payrollTrend = charts.payrollTrend || [];
  const budgetData = charts.budgetData || [];
  const recentLeaves = recent.recentLeaves || [];
  const birthdays = recent.upcomingBirthdays || [];
  const announcements = recent.announcements || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">HR & Workforce Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          HCL Enterprise HR Management & 5,000 Employee Dataset Analytics
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={Users} label="Total Employees" value={metrics.totalEmployees ? metrics.totalEmployees.toLocaleString() : '5,000'} sub={`${metrics.activeEmployees ? metrics.activeEmployees.toLocaleString() : '4,400'} active`} color="blue" />
        <StatCard icon={AlertCircle} label="Annual Attrition" value={metrics.attritionRate || '12.0%'} sub={`${metrics.attritedEmployees || 600} attrited over 3 yrs`} color="red" />
        <StatCard icon={Building2} label="Departments" value={metrics.totalDepartments || 10} sub="10 core business units" color="purple" />
        <StatCard icon={TrendingUp} label="Avg Performance" value={metrics.avgPerformance || '3.50'} sub="Normal distribution (1-5)" color="green" />
        <StatCard icon={DollarSign} label="Monthly Payroll" value={`₹${((metrics.totalPayroll || 0)/10000000).toFixed(2)} Cr`} sub="Active employees payroll" color="green" />
        <StatCard icon={Clock} label="Evaluation Period" value="3 Years" sub="2024 - 2026 data" color="cyan" />
        <StatCard icon={Briefcase} label="Hierarchy Levels" value="5 Grades" sub="L1 to L5 salary bands" color="purple" />
        <StatCard icon={CalendarDays} label="Annual Leave Policy" value="0 - 30 Days" sub="Avg 14.7 days utilized" color="yellow" />
      </div>

      {/* Workforce Analytics & Attrition Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 10 Departments Headcount & Attrition */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-800">Headcount across 10 Departments</h3>
              <p className="text-xs text-gray-500">Active vs Attrited headcount per department (12% overall attrition)</p>
            </div>
            <span className="badge badge-blue">10 Departments</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={byDept}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-25} textAnchor="end" height={50} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="active" name="Active Employees" fill="#3b82f6" stackId="a" radius={[0, 0, 0, 0]} />
              <Bar dataKey="attrited" name="Attrited (12%)" fill="#ef4444" stackId="a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Performance Normal Distribution */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-800">Performance Distribution (Normal)</h3>
              <p className="text-xs text-gray-500">Normal distribution curve centered at mean 3.5 rating</p>
            </div>
            <span className="badge badge-green">Mean: {metrics.avgPerformance || '3.5'}</span>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={perfDist}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="range" tick={{ fontSize: 10 }} interval={0} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(val, name, item) => [`${val} employees (${item?.payload?.percent || 0}%)`, 'Count']} />
              <Bar dataKey="count" name="Employees" fill="#10b981" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Salary Bands by Grade */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Grade Breakdown & Salary Bands */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-800">Salary Bands & Compensation by Grade (L1 - L5)</h3>
              <p className="text-xs text-gray-500">Average monthly compensation (INR) and salary ranges across hierarchy</p>
            </div>
            <span className="badge badge-purple">5 Grade Bands</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={byGrade}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="grade" tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `₹${(v/1000).toFixed(0)}k`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => `₹${Number(v).toLocaleString()}`} />
              <Legend />
              <Bar dataKey="avgSalary" name="Average Salary (INR)" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              <Bar dataKey="maxSalary" name="Max Salary Band" fill="#c4b5fd" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Grade Share */}
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-2">Workforce Hierarchy Share</h3>
          <p className="text-xs text-gray-500 mb-3">Employee distribution across L1 to L5</p>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={byGrade} dataKey="count" nameKey="grade" cx="50%" cy="50%" outerRadius={75} label={({ grade, percent }) => `${grade} ${percent ? (percent*100).toFixed(0) : 0}%`}>
                {byGrade.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dept Breakdown */}
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">Employees by Department</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={byDept} layout="vertical">
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
              <Pie data={genderData} dataKey="count" nameKey="gender" cx="50%" cy="50%" outerRadius={80} label={({ gender, percent }) => `${gender} ${percent ? (percent*100).toFixed(0) : 0}%`}>
                {genderData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Attendance Trend */}
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">Attendance Trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={attTrend}>
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
            <BarChart data={[...payrollTrend].reverse()}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" tickFormatter={(m) => `M${m}`} tick={{ fontSize: 11 }} />
              <YAxis tickFormatter={(v) => `₹${(v/100000).toFixed(0)}L`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => `₹${Number(v).toLocaleString()}`} />
              <Bar dataKey="total" fill="#3b82f6" name="Net Payroll" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Budget vs Salary */}
        <div className="card">
          <h3 className="font-semibold text-gray-800 mb-4">Dept Budget vs Salary Cost</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={budgetData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 10 }} />
              <YAxis tickFormatter={(v) => `₹${(v/100000).toFixed(0)}L`} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => `₹${Number(v).toLocaleString()}`} />
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
          {recentLeaves.length === 0 ? (
            <p className="text-sm text-gray-400 py-4">No recent leave requests recorded</p>
          ) : (
            <div className="space-y-3">
              {recentLeaves.map(l => (
                <div key={l._id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 font-semibold text-xs">
                      {(l.employee_name || 'E').split(' ').map(n=>n[0]).filter(Boolean).join('')}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{l.employee_name}</div>
                    <div className="text-xs text-gray-500">{l.leave_type} · {l.days} days</div>
                  </div>
                  <span className={`badge ${l.status==='approved'?'badge-green':l.status==='rejected'?'badge-red':l.status==='cancelled'?'badge-gray':'badge-yellow'}`}>{l.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right col */}
        <div className="space-y-6">
          {/* Birthdays */}
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><Gift size={16} className="text-pink-500" /> Upcoming Birthdays</h3>
            {birthdays.length === 0 ? <p className="text-sm text-gray-400">None this week</p> : (
              <div className="space-y-2">
                {birthdays.map((e, i) => (
                  <div key={i} className="flex items-center gap-3 py-1.5">
                    <div className="w-7 h-7 bg-pink-100 rounded-full flex items-center justify-center text-pink-600 text-xs font-semibold">
                      {e.first_name?.[0] || 'E'}
                    </div>
                    <div>
                      <div className="text-sm font-medium text-gray-800">{e.first_name} {e.last_name}</div>
                      <div className="text-xs text-gray-400">{e.designation} · {e.date_of_birth}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Announcements */}
          <div className="card">
            <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2"><Megaphone size={16} className="text-blue-500" /> Announcements</h3>
            {announcements.length === 0 ? <p className="text-sm text-gray-400">No announcements</p> : (
              <div className="space-y-2">
                {announcements.map((a, i) => (
                  <div key={i} className="py-1.5 border-b border-gray-50 last:border-0">
                    <div className="text-sm font-medium text-gray-800">{a.title}</div>
                    <div className="text-xs text-gray-400 line-clamp-1">{a.content}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function EmployeeDashboard({ data }) {
  const { todayAttendance, leaveBalance, myLeaves, myPayslips, myAssets, myTickets, announcements, myAttendance } = data || {};
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
