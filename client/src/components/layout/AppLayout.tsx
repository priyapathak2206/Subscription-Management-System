import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  Package,
  Layers,
  Percent,
  Receipt,
  Users,
  LayoutDashboard,
  CalendarDays,
  FileText,
  CreditCard,
  UserCheck,
  LogOut,
  Menu,
  X,
  Building2,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext.js';

interface NavItem {
  name: string;
  path: string;
  icon: React.ElementType;
  badge?: string;
  isTeammate?: boolean;
}

export const AppLayout: React.FC = () => {
  const { user, logout, isAdmin, isStaff, isCustomer } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  // Build navigation items based on user role
  const navItems: { section: string; items: NavItem[] }[] = [];

  if (isAdmin || isStaff) {
    navItems.push({
      section: 'Overview',
      items: [
        {
          name: 'Dashboard',
          path: '/dashboard',
          icon: LayoutDashboard,
          isTeammate: true,
        },
      ],
    });

    navItems.push({
      section: 'Catalog Management',
      items: [
        { name: 'Products & Variants', path: '/products', icon: Package },
        { name: 'Subscription Plans', path: '/plans', icon: Layers },
        { name: 'Tax Rates', path: '/taxes', icon: Receipt },
        { name: 'Discounts & Promos', path: '/discounts', icon: Percent },
      ],
    });

    const billingItems: NavItem[] = [
      { name: 'Subscriptions', path: '/subscriptions', icon: CalendarDays, isTeammate: true },
      { name: 'Invoices', path: '/invoices', icon: FileText, isTeammate: true },
      { name: 'Payments', path: '/payments', icon: CreditCard, isTeammate: true },
    ];
    navItems.push({
      section: 'Billing & Operations',
      items: billingItems,
    });

    if (isAdmin) {
      navItems.push({
        section: 'Administration',
        items: [
          { name: 'Staff Members', path: '/staff', icon: Users },
        ],
      });
    }
  } else if (isCustomer) {
    navItems.push({
      section: 'Customer Portal',
      items: [
        { name: 'My Portal', path: '/portal', icon: UserCheck, isTeammate: true },
        { name: 'My Subscriptions', path: '/subscriptions', icon: CalendarDays, isTeammate: true },
        { name: 'My Invoices', path: '/invoices', icon: FileText, isTeammate: true },
        { name: 'My Payments', path: '/payments', icon: CreditCard, isTeammate: true },
      ],
    });
  }

  const roleBadgeColor =
    user?.role === 'ADMIN'
      ? 'bg-purple-100 text-purple-700 border-purple-200'
      : user?.role === 'STAFF'
      ? 'bg-blue-100 text-blue-700 border-blue-200'
      : 'bg-emerald-100 text-emerald-700 border-emerald-200';

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-300">
      {/* Brand Header */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800">
        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white font-bold text-lg shadow-inner">
          <Building2 className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-white font-bold text-base tracking-tight leading-tight">Brightloop</h1>
          <p className="text-xs text-slate-400 font-medium">Subscription System</p>
        </div>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {navItems.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1">
            <h2 className="px-3 text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              {group.section}
            </h2>
            {group.items.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20 font-semibold'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <div className="flex items-center gap-3">
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </div>
              </NavLink>
            ))}
          </div>
        ))}
      </div>

      {/* User profile & logout bottom banner */}
      <div className="p-4 border-t border-slate-800 bg-slate-950/40">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-indigo-500/20 text-indigo-400 font-bold flex items-center justify-center text-sm border border-indigo-500/30 shrink-0">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-white truncate leading-tight">{user?.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border ${roleBadgeColor}`}>
                  {user?.role}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            title="Log out"
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-64 shrink-0 fixed inset-y-0 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Backdrop */}
      {mobileOpen && (
        <div
          className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-in-out lg:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {sidebarContent}
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 sm:px-8 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center text-xs text-slate-500 font-medium">
              <span>Brightloop</span>
              <ChevronRight className="w-3.5 h-3.5 mx-1.5 text-slate-400" />
              <span className="text-slate-800 capitalize font-semibold">
                {window.location.pathname.replace('/', '') || 'Dashboard'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <span className="text-xs text-slate-500 block">{user?.email}</span>
            </div>
            <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${roleBadgeColor}`}>
              {user?.role}
            </span>
          </div>
        </header>

        {/* Page Body */}
        <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

