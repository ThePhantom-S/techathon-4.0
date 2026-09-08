import React from 'react';
import { useTheme } from '../../context/ThemeContext';

interface SkeletonProps {
  className?: string;
  style?: React.CSSProperties;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = '', style }) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  return (
    <div
      className={`animate-pulse rounded-xl ${
        isLight ? 'bg-[#EAEAEA]' : 'bg-[#1A1A1A]'
      } ${className}`}
      style={style}
    />
  );
};

export const KPISkeleton: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  return (
    <div className={`p-5 rounded-2xl border ${
      isLight ? 'bg-[#FAFAFA] border-[#EAEAEA]' : 'bg-[#0A0A0A] border-[#222222]'
    } space-y-3`}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-28" />
        <Skeleton className="h-4 w-16 rounded-full" />
      </div>
      <Skeleton className="h-7 w-36" />
      <Skeleton className="h-3 w-32" />
    </div>
  );
};

export const ChartSkeleton: React.FC<{ height?: string }> = ({ height = 'h-52' }) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  return (
    <div className={`p-5 rounded-2xl border ${
      isLight ? 'bg-[#FAFAFA] border-[#EAEAEA]' : 'bg-[#0A0A0A] border-[#222222]'
    } space-y-4`}>
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-44" />
        <Skeleton className="h-5 w-24 rounded-full" />
      </div>
      <Skeleton className={`${height} w-full rounded-xl`} />
    </div>
  );
};

export const TableRowSkeleton: React.FC<{ columns?: number }> = ({ columns = 5 }) => {
  return (
    <tr className="border-b border-[#222222]/10">
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-3">
          <Skeleton className="h-3 w-full" />
        </td>
      ))}
    </tr>
  );
};

export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({ rows = 6, columns = 5 }) => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  return (
    <div className={`p-4 rounded-2xl border ${
      isLight ? 'bg-[#FAFAFA] border-[#EAEAEA]' : 'bg-[#0A0A0A] border-[#222222]'
    } space-y-3`}>
      <div className="flex items-center justify-between mb-2">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-6 w-24 rounded-full" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-3">
            {Array.from({ length: columns }).map((_, j) => (
              <Skeleton key={j} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

export const DashboardSkeleton: React.FC = () => {
  const { theme } = useTheme();
  const isLight = theme === 'light';

  return (
    <div className="space-y-6 font-sans">
      {/* Title Header Skeleton */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-3.5 w-96" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-7 w-32 rounded-full" />
          <Skeleton className="h-7 w-28 rounded-full" />
        </div>
      </div>

      {/* 4 KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPISkeleton />
        <KPISkeleton />
        <KPISkeleton />
        <KPISkeleton />
      </div>

      {/* 4 Horizon Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={`p-4 rounded-2xl border ${
            isLight ? 'bg-[#FAFAFA] border-[#EAEAEA]' : 'bg-[#0A0A0A] border-[#222222]'
          } space-y-3`}>
            <div className="flex justify-between items-center">
              <Skeleton className="h-3 w-20" />
              <Skeleton className="h-4 w-12 rounded-full" />
            </div>
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-3 w-32" />
          </div>
        ))}
      </div>

      {/* Gauges & Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-4"><ChartSkeleton height="h-44" /></div>
        <div className="lg:col-span-5"><ChartSkeleton height="h-44" /></div>
        <div className="lg:col-span-3"><ChartSkeleton height="h-44" /></div>
      </div>

      {/* Working Capital 4 Cards */}
      <div className={`p-5 rounded-2xl border ${
        isLight ? 'bg-[#FAFAFA] border-[#EAEAEA]' : 'bg-[#0A0A0A] border-[#222222]'
      } space-y-4`}>
        <Skeleton className="h-4 w-64" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className={`p-3.5 rounded-xl border ${
              isLight ? 'bg-[#FFFFFF] border-[#EAEAEA]' : 'bg-[#111111] border-[#222222]'
            } space-y-2`}>
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-6 w-20" />
              <Skeleton className="h-2.5 w-24" />
            </div>
          ))}
        </div>
      </div>

      {/* 90-Day Liquidity Forecast Chart Skeleton */}
      <div className={`p-5 rounded-2xl border ${
        isLight ? 'bg-[#FAFAFA] border-[#EAEAEA]' : 'bg-[#0A0A0A] border-[#222222]'
      }`}>
        <ChartSkeleton height="h-64" />
      </div>
    </div>
  );
};
