import React from 'react';
import { Search, Download, Building2, Sun, Moon, RefreshCw, LogOut, Menu } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface HeaderProps {
  activeTab?: string;
  activeSubTab: string;
  setActiveSubTab: (tab: string) => void;
  onExportReport: () => void;
  onRefresh: () => void;
  onOpenConnector: () => void;
  onOpenChatbot?: () => void;
  onLogout?: () => void;
  onToggleSidebar?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab = 'dashboard',
  activeSubTab,
  setActiveSubTab,
  onExportReport,
  onRefresh,
  onOpenConnector,
  onOpenChatbot,
  onLogout,
  onToggleSidebar,
}) => {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';
  const subTabs = ['Overview', 'Liquidity Exposure', 'Inflows', 'Outflows', 'Financial Intelligence'];

  const getTabTitle = (tab?: string) => {
    switch (tab) {
      case 'dashboard': return 'Financial Command Center';
      case 'time-machine': return 'Cash Flow Timeline';
      case 'what-if': return 'Decision Impact Analysis';
      case 'driver-analysis': return 'Liquidity Risk Engine';
      case 'simulation': return 'Business Miniature Model';
      case 'liquidity-alerts': return 'Liquidity Alert & Briefing';
      case 'data-management': return 'Data Management';
      case 'settings': return 'Platform Settings';
      default: return 'Financial Command Center';
    }
  };

  return (
    <header className={`h-14 border-b flex items-center justify-between px-3 sm:px-4 lg:px-6 sticky top-0 z-40 font-sans transition-colors duration-150 whitespace-nowrap ${
      isLight 
        ? 'bg-[#FFFFFF] border-[#EAEAEA] text-[#171717]' 
        : 'bg-[#000000] border-[#222222] text-[#EDEDED]'
    }`}>
      {/* Breadcrumb & Sub-tabs */}
      <div className="flex items-center gap-2 sm:gap-3 lg:gap-4 min-w-0">
        {/* Mobile Sidebar Hamburger Toggle */}
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            className={`lg:hidden p-1.5 rounded-lg border transition-all cursor-pointer ${
              isLight
                ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800'
            }`}
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-4 h-4" />
          </button>
        )}

        <div className="flex items-center gap-1.5 sm:gap-2 text-xs font-mono whitespace-nowrap shrink-0">
          <span className={isLight ? 'text-[#8A8A8A]' : 'text-[#71717A]'}>FlowShield</span>
          <span className={isLight ? 'text-[#CBD5E1]' : 'text-[#333333]'}>/</span>
          <span className={`font-semibold whitespace-nowrap text-xs truncate max-w-[130px] sm:max-w-none ${isLight ? 'text-[#171717]' : 'text-[#EDEDED]'}`}>
            {getTabTitle(activeTab)}
          </span>
        </div>

        {/* Sub-tabs Navigation — Only visible on Dashboard view */}
        {(activeTab === 'dashboard' || !activeTab) && (
          <nav className={`hidden md:flex items-center gap-1 ml-2 lg:ml-4 pl-2 lg:pl-4 border-l shrink-0 whitespace-nowrap ${
            isLight ? 'border-[#EAEAEA]' : 'border-[#222222]'
          }`}>
            {subTabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveSubTab(tab)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap shrink-0 transition-all duration-150 cursor-pointer active:scale-[0.97] ${
                  activeSubTab === tab
                    ? 'bg-indigo-600 text-white font-bold shadow-sm shadow-indigo-500/20'
                    : isLight
                      ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                      : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900'
                }`}
              >
                {tab}
              </button>
            ))}
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
          <span className="font-mono text-xs hidden xl:inline whitespace-nowrap">Shakti Electronics</span>
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
