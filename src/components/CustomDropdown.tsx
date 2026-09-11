import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

export interface DropdownOption {
  value: string;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
}

interface CustomDropdownProps {
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  placeholder?: string;
  leftIcon?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

export const CustomDropdown: React.FC<CustomDropdownProps> = ({
  value,
  options,
  onChange,
  placeholder = 'Select an option',
  leftIcon,
  disabled = false,
  className = '',
}) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  return (
    <div className={`relative w-full ${className}`} ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full flex items-center justify-between pl-3 pr-3 py-2.5 rounded-xl border text-xs font-sans outline-none transition-all cursor-pointer ${
          isLight
            ? 'bg-white border-slate-300 text-slate-900 hover:border-slate-400 focus:border-indigo-600 focus:ring-2 focus:ring-indigo-600/20'
            : 'bg-zinc-900 border-zinc-800 text-zinc-100 hover:border-zinc-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${
          isOpen ? (isLight ? 'border-indigo-600 ring-2 ring-indigo-600/20' : 'border-indigo-500 ring-2 ring-indigo-500/20') : ''
        }`}
      >
        <div className="flex items-center gap-2.5 min-w-0 truncate">
          {selectedOption?.icon ? (
            <span className="shrink-0 text-slate-400 dark:text-zinc-400">{selectedOption.icon}</span>
          ) : leftIcon ? (
            <span className="shrink-0 text-slate-400 dark:text-zinc-400">{leftIcon}</span>
          ) : null}

          <span className="truncate font-medium">
            {selectedOption ? selectedOption.label : placeholder}
          </span>
        </div>

        <ChevronDown
          className={`w-4 h-4 shrink-0 transition-transform duration-200 text-slate-400 dark:text-zinc-400 ${
            isOpen ? 'rotate-180 text-indigo-600 dark:text-indigo-400' : ''
          }`}
        />
      </button>

      {/* Dropdown Menu Popover */}
      {isOpen && (
        <div
          className={`absolute left-0 right-0 top-full mt-1.5 z-50 rounded-xl border shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 ${
            isLight
              ? 'bg-white border-slate-200 shadow-slate-200/80 text-slate-900'
              : 'bg-[#141416] border-zinc-800 shadow-black/80 text-zinc-100'
          }`}
        >
          <div className="max-h-60 overflow-y-auto p-1.5 space-y-0.5 custom-scrollbar">
            {options.map((option) => {
              const isSelected = option.value === value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    onChange(option.value);
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-sans transition-colors cursor-pointer text-left ${
                    isSelected
                      ? isLight
                        ? 'bg-indigo-50/90 text-indigo-700 font-semibold'
                        : 'bg-indigo-600/20 text-indigo-400 font-semibold'
                      : isLight
                      ? 'hover:bg-slate-100/80 text-slate-700'
                      : 'hover:bg-zinc-800/70 text-zinc-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0 truncate">
                    {option.icon && (
                      <span
                        className={`shrink-0 ${
                          isSelected
                            ? isLight
                              ? 'text-indigo-600'
                              : 'text-indigo-400'
                            : 'text-slate-400 dark:text-zinc-400'
                        }`}
                      >
                        {option.icon}
                      </span>
                    )}
                    <span className="truncate">{option.label}</span>
                    {option.sublabel && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-md font-mono shrink-0 ${
                          isLight ? 'bg-slate-100 text-slate-500' : 'bg-zinc-800 text-zinc-400'
                        }`}
                      >
                        {option.sublabel}
                      </span>
                    )}
                  </div>

                  {isSelected && (
                    <Check
                      className={`w-4 h-4 shrink-0 ml-2 ${
                        isLight ? 'text-indigo-600' : 'text-indigo-400'
                      }`}
                    />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
