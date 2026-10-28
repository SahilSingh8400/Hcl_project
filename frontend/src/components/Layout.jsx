import { useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, Users, Clock, CalendarDays, DollarSign, Star, Building2,
  Briefcase, GraduationCap, Package, TicketIcon, Megaphone, CalendarCheck,
  User, LogOut, ChevronLeft, ChevronRight, Bell, Search, Menu, X
} from 'lucide-react';

const adminNav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/employees', icon: Users, label: 'Employees' },
  { to: '/departments', icon: Building2, label: 'Departments' },
  { to: '/attendance', icon: Clock, label: 'Attendance' },
  { to: '/leaves', icon: CalendarDays, label: 'Leaves' },
  { to: '/payroll', icon: DollarSign, label: 'Payroll' },
  { to: '/performance', icon: Star, label: 'Performance' },
  { to: '/jobs', icon: Briefcase, label: 'Recruitment' },
  { to: '/training', icon: GraduationCap, label: 'Training' },
  { to: '/assets', icon: Package, label: 'Assets' },
  { to: '/tickets', icon: TicketIcon, label: 'HR Helpdesk' },
  { to: '/announcements', icon: Megaphone, label: 'Announcements' },
  { to: '/holidays', icon: CalendarCheck, label: 'Holidays' },
];

const employeeNav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'My Dashboard' },
  { to: '/attendance', icon: Clock, label: 'Attendance' },
  { to: '/leaves', icon: CalendarDays, label: 'My Leaves' },
  { to: '/payroll', icon: DollarSign, label: 'My Payslips' },
  { to: '/performance', icon: Star, label: 'Performance' },
  { to: '/training', icon: GraduationCap, label: 'Training' },
  { to: '/assets', icon: Package, label: 'My Assets' },
  { to: '/tickets', icon: TicketIcon, label: 'HR Helpdesk' },
  { to: '/announcements', icon: Megaphone, label: 'Announcements' },
  { to: '/holidays', icon: CalendarCheck, label: 'Holidays' },
];

export default function Layout() {
  const { user, employee, logout, isAdmin } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();
  const navItems = isAdmin ? adminNav : employeeNav;

  const Sidebar = ({ mobile = false }) => (
    <div className={`${mobile ? 'w-64' : collapsed ? 'w-16' : 'w-64'} flex flex-col h-full bg-white border-r border-gray-100 transition-all duration-300`}>
      {/* Logo */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-100">
        <div className="flex-shrink-0 w-9 h-9 bg-blue-600 rounded-xl flex items-center justify-center">
          <span className="text-white font-bold text-sm">HCL</span>
        </div>
        {(!collapsed || mobile) && (
          <div>
            <div className="font-bold text-gray-900 text-sm">HCL Technologies</div>
            <div className="text-xs text-gray-500">HR Management</div>
          </div>
        )}
        {!mobile && (
          <button onClick={() => setCollapsed(!collapsed)} className="ml-auto text-gray-400 hover:text-gray-600 transition-colors p-1">
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} onClick={() => mobile && setMobileOpen(false)}
            className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <Icon size={18} className="flex-shrink-0" />
            {(!collapsed || mobile) && <span className="truncate">{label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* User */}
      <div className="p-3 border-t border-gray-100">
        <NavLink to="/profile" onClick={() => mobile && setMobileOpen(false)}
          className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''} mb-1`}>
          <User size={18} className="flex-shrink-0" />
          {(!collapsed || mobile) && <span className="truncate">My Profile</span>}
        </NavLink>
        <button onClick={logout} className="sidebar-link w-full text-red-500 hover:bg-red-50 hover:text-red-600">
          <LogOut size={18} className="flex-shrink-0" />
          {(!collapsed || mobile) && <span>Logout</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex flex-shrink-0">
        <Sidebar />
      </div>

      {/* Mobile Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <div className="absolute left-0 top-0 bottom-0 z-10">
            <Sidebar mobile />
          </div>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <header className="bg-white border-b border-gray-100 px-4 py-3 flex items-center gap-4">
          <button onClick={() => setMobileOpen(true)} className="md:hidden text-gray-500 hover:text-gray-700">
            <Menu size={20} />
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-medium text-gray-900">{employee ? `${employee.first_name} ${employee.last_name}` : user?.email}</div>
              <div className="text-xs text-gray-500">{employee?.designation || user?.role}</div>
            </div>
            <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center cursor-pointer" onClick={() => navigate('/profile')}>
              <span className="text-blue-600 font-semibold text-sm">
                {employee ? `${employee.first_name?.[0] || 'E'}${employee.last_name?.[0] || ''}` : (user?.email?.[0]?.toUpperCase() || '?')}
              </span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
