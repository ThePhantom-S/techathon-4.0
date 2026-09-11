import React from 'react';
import { Search, Download, Building2, Sun, Moon, RefreshCw, LogOut, Menu, User, ShieldCheck } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { IndustryIcon } from './IndustryIcon';

export type DashboardSubTab = 'overview' | 'risk-map' | 'inflows' | 'outflows';

interface HeaderProps {
  activeTab?: string;
  activeSubTab?: string;
  setActiveSubTab?: (tab: string) => void;
  dashboardSubTab?: DashboardSubTab;
  setDashboardSubTab?: (tab: DashboardSubTab) => void;
  hasBreach?: boolean;
  onExportReport: () => void;
  onRefresh: () => void;
  onOpenConnector: () => void;
  onOpenChatbot?: () => void;
  onLogout?: () => void;
  onToggleSidebar?: () => void;
  businessName?: string;
  industryName?: string;
  industryIcon?: string;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab = 'dashboard',
  activeSubTab,
  setActiveSubTab,
  dashboardSubTab,
  setDashboardSubTab,
  hasBreach,
  onExportReport,
  onRefresh,
  onOpenConnector,
  onOpenChatbot,
  onLogout,
  onToggleSidebar,
  businessName = 'Shakti Electronics',
  industryName,
  industryIcon,
}) => {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';
  const { user } = useAuth();

  const DASHBOARD_TABS: { id: DashboardSubTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'risk-map', label: 'Risk Map' },
    { id: 'inflows', label: 'Inflows' },
    { id: 'outflows', label: 'Outflows' },
  ];

  return (
    <header className={`flex flex-col border-b sticky top-0 z-40 font-sans transition-colors duration-150 ${
      isLight 
        ? 'bg-[#FFFFFF] border-[#EAEAEA] text-[#171717]' 
        : 'bg-[#000000] border-[#222222] text-[#EDEDED]'
    }`}>
      {/* Top Main Row */}
      <div className="h-14 flex items-center justify-between px-3 sm:px-4 lg:px-6 w-full">
        {/* Mobile Sidebar Hamburger Toggle & Logo */}
        <div className="flex items-center gap-3 sm:gap-5 flex-1 min-w-0 pr-2">
          {onToggleSidebar && (
            <div className="flex items-center gap-2 lg:hidden shrink-0">
              <button
                onClick={onToggleSidebar}
                className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                  isLight
                    ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
                }`}
                aria-label="Open Navigation Menu"
              >
                <Menu className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-1.5 shrink-0">
                <img src="/flowshield_logo.svg" alt="FlowShield" className="w-5 h-5 object-contain" />
                <span className={`font-bold text-xs tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                  FlowShield
                </span>
              </div>
            </div>
          )}

          {/* Desktop Segregated Sub-Navigation */}
          {activeTab === 'dashboard' && dashboardSubTab && setDashboardSubTab && (
            <nav
              aria-label="Dashboard Sub Navigation (Desktop)"
              className="hidden md:flex items-center gap-2 sm:gap-6 py-1"
            >
              {DASHBOARD_TABS.map((tab) => {
                const isActive = dashboardSubTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setDashboardSubTab(tab.id)}
                    className={`shrink-0 text-sm font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap ${
                      isActive
                        ? 'bg-indigo-600 text-white px-3 py-1.5 rounded-full shadow-xs'
                        : isLight
                          ? 'text-slate-600 hover:text-slate-950 px-2 py-1'
                          : 'text-zinc-400 hover:text-white px-2 py-1'
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 lg:gap-2.5 shrink-0 whitespace-nowrap">
          {/* Account Connector Status */}
          <button
            onClick={onOpenConnector}
            className={`flex items-center gap-2 text-xs font-medium px-3 py-1.5 rounded-full border whitespace-nowrap shrink-0 transition-all duration-150 cursor-pointer active:scale-[0.97] ${
              isLight
                ? 'bg-[#FAFAFA] border-[#EAEAEA] text-[#171717] hover:bg-[#F4F4F5]'
                : 'bg-[#0A0A0A] border-[#222222] text-[#EDEDED] hover:bg-[#111111]'
            }`}
          >
            <Building2 className="w-3.5 h-3.5 text-[#22C55E] shrink-0" />
            <span className="flex flex-col items-start leading-tight">
              <span className="font-mono text-xs hidden xl:inline whitespace-nowrap">{businessName}</span>
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] shrink-0" />
          </button>

          {/* User Profile / Supabase Status */}
          {user && (
            <div
              className={`hidden lg:flex items-center gap-2 px-2.5 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap shrink-0 ${
                isLight
                  ? 'bg-[#FAFAFA] border-[#EAEAEA] text-[#171717]'
                  : 'bg-[#0A0A0A] border-[#222222] text-[#EDEDED]'
              }`}
              title={`Logged in as ${user.email}`}
            >
              <div
                className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${
                  user.isDemo
                    ? 'bg-amber-500/20 text-amber-500 border border-amber-500/30'
                    : 'bg-indigo-600 text-white'
                }`}
              >
                {user.fullName ? user.fullName[0].toUpperCase() : (user.email ? user.email[0].toUpperCase() : 'U')}
              </div>
              <div className="flex flex-col items-start justify-center leading-none max-w-[120px] truncate">
                <span className="text-[11px] font-semibold truncate">
                  {user.fullName || user.email?.split('@')[0]}
                </span>
                {user.isDemo && (
                  <span className="text-[9px] font-mono mt-0.5 opacity-60 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    <span>Demo</span>
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-full border shrink-0 transition-all duration-150 cursor-pointer active:scale-[0.95] ${
              isLight
                ? 'bg-[#FAFAFA] border-[#EAEAEA] text-[#171717] hover:bg-[#F4F4F5]'
                : 'bg-[#0A0A0A] border-[#222222] text-[#EDEDED] hover:bg-[#111111]'
            }`}
            title={`Switch to ${isLight ? 'Dark' : 'Light'} Mode`}
          >
            {isLight ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
          </button>

          {/* Export Report */}
          <button
            onClick={onExportReport}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap shrink-0 transition-all duration-150 cursor-pointer active:scale-[0.97] ${
              isLight
                ? 'bg-[#FFFFFF] border-[#EAEAEA] text-[#171717] hover:bg-[#FAFAFA]'
                : 'bg-[#0A0A0A] border-[#222222] text-[#EDEDED] hover:bg-[#111111]'
            }`}
          >
            <Download className="w-3.5 h-3.5 shrink-0" />
            <span className="hidden sm:inline whitespace-nowrap">Export</span>
          </button>

          {/* Reset / Refresh - Hidden on Mobile */}
          <button
            onClick={onRefresh}
            className={`hidden md:block p-2 rounded-full border transition-all duration-150 cursor-pointer active:scale-[0.95] ${
              isLight
                ? 'bg-[#FFFFFF] border-[#EAEAEA] text-[#666666] hover:text-[#171717] hover:bg-[#FAFAFA]'
                : 'bg-[#0A0A0A] border-[#222222] text-[#A1A1AA] hover:text-[#EDEDED] hover:bg-[#111111]'
            }`}
            title="Reset Simulation Defaults"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* Logout */}
          {onLogout && (
            <button
              onClick={onLogout}
              className={`p-2 rounded-full border transition-all duration-150 cursor-pointer active:scale-[0.95] ${
                isLight
                  ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                  : 'bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500/20'
              }`}
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Mobile Segregated Sub-Navigation (Shown Below Nav Bar on Mobile Only) */}
      {activeTab === 'dashboard' && dashboardSubTab && setDashboardSubTab && (
        <nav
          aria-label="Dashboard Sub Navigation (Mobile)"
          className={`md:hidden flex items-center gap-2 overflow-x-auto no-scrollbar px-3 py-2 w-full border-t ${
            isLight ? 'border-[#EAEAEA]' : 'border-[#222222]'
          }`}
        >
          {DASHBOARD_TABS.map((tab) => {
            const isActive = dashboardSubTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setDashboardSubTab(tab.id)}
                className={`shrink-0 text-xs font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap ${
                  isActive
                    ? 'bg-indigo-600 text-white px-3 py-1.5 rounded-full shadow-xs'
                    : isLight
                      ? 'text-slate-600 hover:text-slate-950 px-2 py-1'
                      : 'text-zinc-400 hover:text-white px-2 py-1'
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      )}
    </header>
  );
};
