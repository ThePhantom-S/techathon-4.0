import React from 'react';
import { Search, Download, Building2, Sun, Moon, RefreshCw, LogOut, Menu } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
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

  const DASHBOARD_TABS: { id: DashboardSubTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'risk-map', label: 'Risk Map' },
    { id: 'inflows', label: 'Inflows' },
    { id: 'outflows', label: 'Outflows' },
  ];

  return (
    <header className={`h-14 border-b flex items-center justify-between px-3 sm:px-4 lg:px-6 sticky top-0 z-40 font-sans transition-colors duration-150 whitespace-nowrap ${
      isLight 
        ? 'bg-[#FFFFFF] border-[#EAEAEA] text-[#171717]' 
        : 'bg-[#000000] border-[#222222] text-[#EDEDED]'
    }`}>
      {/* Mobile Sidebar Hamburger Toggle & Dashboard Tabs */}
      <div className="flex items-center gap-3 sm:gap-5 min-w-0">
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
            <div className="flex items-center gap-1.5">
              <img src="/flowshield_logo.svg" alt="FlowShield" className="w-5 h-5 object-contain" />
              <span className={`font-bold text-xs tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                FlowShield
              </span>
            </div>
          </div>
        )}

        {/* Dashboard Segregated Sub-Navigation (Exact Pill & Plain-Text Switcher) */}
        {activeTab === 'dashboard' && dashboardSubTab && setDashboardSubTab && (
          <nav
            aria-label="Dashboard Sub Navigation"
            className="flex items-center gap-4 sm:gap-6 overflow-x-auto no-scrollbar py-1"
          >
            {DASHBOARD_TABS.map((tab) => {
              const isActive = dashboardSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setDashboardSubTab(tab.id)}
                  className={`text-xs sm:text-sm font-semibold transition-all duration-150 cursor-pointer whitespace-nowrap ${
                    isActive
                      ? 'bg-indigo-600 text-white px-4 py-1.5 rounded-full shadow-xs'
                      : isLight
                        ? 'text-slate-600 hover:text-slate-950 px-1 py-1'
                        : 'text-zinc-400 hover:text-white px-1 py-1'
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
            {industryName && (
              <span className="text-[9px] font-mono hidden xl:inline-flex items-center gap-1 whitespace-nowrap opacity-80">
                <IndustryIcon icon={industryIcon} className="w-2.5 h-2.5 shrink-0" />
                <span>{industryName}</span>
              </span>
            )}
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] shrink-0" />
        </button>

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

        {/* Reset / Refresh */}
        <button
          onClick={onRefresh}
          className={`p-2 rounded-full border transition-all duration-150 cursor-pointer active:scale-[0.95] ${
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
    </header>
  );
};
