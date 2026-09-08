import React from 'react';
import {
  LayoutDashboard,
  Clock,
  Box,
  BarChart3,
  Database,
  Settings,
  Play,
  Building2,
  RefreshCw,
  Bot,
  Zap,
  X,
  Bell,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onRunSimulation: () => void;
  onOpenConnector?: () => void;
  onOpenChatbot?: () => void;
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  onRunSimulation,
  onOpenConnector,
  onOpenChatbot,
  isOpen = false,
  onClose,
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'time-machine', label: 'Cash Flow Timeline', icon: Clock },
    { id: 'what-if', label: 'Decision Impact Analysis', icon: Zap },
    { id: 'simulation', label: 'Business Miniature Model', icon: Box },
    { id: 'driver-analysis', label: 'Liquidity Risk Engine', icon: BarChart3 },
    { id: 'liquidity-alerts', label: 'Liquidity Alert & Briefing', icon: Bell },
    { id: 'data-management', label: 'Ledger Data', icon: Database },
    { id: 'connector', label: 'Integrations', icon: Building2 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside className={`fixed left-0 top-0 h-full w-[240px] lg:w-[220px] border-r z-50 flex flex-col py-5 px-3 font-sans transition-transform duration-200 ease-out ${
        isOpen ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
      } ${
        isLight 
          ? 'bg-[#FFFFFF] border-[#EAEAEA] text-[#171717]' 
          : 'bg-[#000000] border-[#222222] text-[#EDEDED]'
      }`}>
        {/* Brand Section */}
        <div className="mb-6 px-2 pt-1 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="/flowshield_logo.svg"
              alt="FlowShield Logo"
              className="w-7 h-7 object-contain"
            />
            <span className={`font-bold text-sm tracking-tight font-sans ${isLight ? 'text-slate-900' : 'text-white'}`}>
              FlowShield
            </span>
          </div>

          {/* Close button on mobile */}
          <button
            onClick={onClose}
            className={`lg:hidden p-1.5 rounded-lg border transition-colors cursor-pointer ${
              isLight ? 'border-slate-200 text-slate-600 hover:bg-slate-100' : 'border-zinc-800 text-zinc-400 hover:bg-zinc-900'
            }`}
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

      {/* Navigation Links */}
      <nav className="flex-1 space-y-1">
        <div className={`px-3 text-[10px] font-mono uppercase tracking-wider mb-2 ${
          isLight ? 'text-[#8A8A8A]' : 'text-[#71717A]'
        }`}>
          Platform
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'connector' && onOpenConnector) {
                  onOpenConnector();
                } else {
                  setActiveTab(item.id);
                }
                if (onClose) onClose();
              }}
              className={`w-full flex items-center gap-2.5 px-3.5 py-2 rounded-xl text-xs font-medium transition-all duration-150 ease-out cursor-pointer text-left ${
                isActive
                  ? 'bg-indigo-600 text-white font-bold shadow-md shadow-indigo-500/20'
                  : isLight
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80 hover:translate-x-0.5'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 hover:translate-x-0.5'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${
                isActive
                  ? 'text-white'
                  : isLight ? 'text-slate-400' : 'text-zinc-500'
              }`} />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Actions */}
      <div className={`pt-4 border-t space-y-2 ${isLight ? 'border-[#EAEAEA]' : 'border-[#222222]'}`}>
        <button
          onClick={() => {
            if (onOpenChatbot) onOpenChatbot();
            if (onClose) onClose();
          }}
          className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-full border text-xs font-medium transition-all duration-150 cursor-pointer active:scale-[0.97] ${
            isLight
              ? 'bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100'
              : 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300 hover:bg-indigo-500/25'
          }`}
        >
          <Bot className="w-3.5 h-3.5" />
          <span>Financial Intelligence Assistant</span>
        </button>

        <button
          onClick={() => {
            onRunSimulation();
            if (onClose) onClose();
          }}
          className={`w-full font-medium text-xs py-2 px-3 rounded-full flex items-center justify-center gap-1.5 transition-all duration-150 cursor-pointer active:scale-[0.97] ${
            isLight
              ? 'bg-[#171717] text-[#FFFFFF] hover:opacity-90'
              : 'bg-[#EDEDED] text-[#000000] hover:opacity-90'
          }`}
        >
          <Play className="w-3 h-3 fill-current" />
          <span>Run Simulation</span>
        </button>
      </div>
    </aside>
  </>
);
};
