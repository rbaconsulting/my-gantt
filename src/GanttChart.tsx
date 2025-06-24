import React, { useRef, useEffect, useState } from 'react';
import type { ProjectFormData, PoolData } from './types';

interface GanttChartProps {
  projects: ProjectFormData[];
  pools: PoolData[];
  filters?: {
    status?: string[];
    pool?: string[];
    dateRange?: {
      start?: string;
      end?: string;
    };
    progress?: {
      min?: number;
      max?: number;
    };
    search?: string;
  };
}

// Simple color palette for pools
const poolColors = [
  '#4F8EF7', // blue
  '#34C759', // green
  '#FF9500', // orange
  '#AF52DE', // purple
  '#FF2D55', // red
  '#FFD60A', // yellow
  '#5856D6', // indigo
  '#5AC8FA', // teal
];

// Status color mapping
const statusColors: { [key: string]: string } = {
  'Not Started': '#9ca3af',    // Gray
  'Effort Analysis': '#6b7280', // Gray
  'Requirements': '#f59e0b',    // Orange/Gold
  'In Progress': '#3b82f6',     // Blue
  'Development': '#3b82f6',     // Blue
  'UAT': '#4ade80',            // Darker Green
  'On Hold': '#f97316',         // Orange
  'Complete': '#10b981',       // Green
};

function getPoolColor(poolName: string, pools: PoolData[]) {
  const pool = pools.find(p => p.name === poolName);
  if (pool && pool.color) return pool.color;
  const idx = pools.findIndex(p => p.name === poolName);
  return poolColors[idx % poolColors.length] || '#888';
}

function getProjectColor(project: ProjectFormData, pools: PoolData[]) {
  // If project has a status, use status color; otherwise use pool color
  if (project.status && statusColors[project.status]) {
    return statusColors[project.status];
  }
  return getPoolColor(project.pool, pools);
}

function getDateRange(projects: ProjectFormData[]) {
  if (projects.length === 0) {
    const today = new Date();
    const future = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
    return { min: today, max: future };
  }
  
  const dates = projects.flatMap(p => [
    new Date(p.startDate),
    new Date(p.targetDate)
  ]).filter(d => !isNaN(d.getTime()));
  
  if (dates.length === 0) {
    const today = new Date();
    const future = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    return { min: today, max: future };
  }
  
  const min = new Date(Math.min(...dates.map(d => d.getTime())));
  const max = new Date(Math.max(...dates.map(d => d.getTime())));
  
  // Ensure we have at least a 2-week range for better visualization
  const minRange = 14 * 24 * 60 * 60 * 1000; // 14 days in milliseconds
  const actualRange = max.getTime() - min.getTime();
  
  if (actualRange < minRange) {
    const padding = (minRange - actualRange) / 2;
    return {
      min: new Date(min.getTime() - padding),
      max: new Date(max.getTime() + padding)
    };
  }
  
  return { min, max };
}

const BAR_HEIGHT = 18;
const BAR_GAP = 10;
const CHART_LEFT_PAD = 160;
const CHART_TOP_PAD = 100;
const CHART_RIGHT_PAD = 20;
const CHART_HEIGHT_PAD = 120;
const PROJECT_NAME_MAX = 20;

function truncateName(name: string) {
  return name.length > PROJECT_NAME_MAX ? name.slice(0, PROJECT_NAME_MAX - 1) + '…' : name;
}

function getWeekStart(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay()); // Sunday as start of week
  return d;
}

function getAllWeekStarts(min: Date, max: Date) {
  const weeks = [];
  let current = getWeekStart(min);
  // Prepend one week before min
  current.setDate(current.getDate() - 7);
  while (current <= max) {
    weeks.push(new Date(current));
    current.setDate(current.getDate() + 7);
  }
  return weeks;
}

function getCurrentWeekConcurrentProjects(projects: ProjectFormData[], poolName: string, weekStart: Date, weekEnd: Date) {
  return projects.filter(p =>
    p.pool === poolName &&
    !p.status?.toLowerCase().includes('complete') &&
    new Date(p.startDate) <= weekEnd &&
    new Date(p.targetDate) >= weekStart
  );
}

function calculatePoolUtilization(projects: ProjectFormData[], pools: PoolData[], poolName: string, weekStart: Date, weekEnd: Date) {
  const pool = pools.find(p => p.name === poolName);
  if (!pool) return { totalAllocated: 0, poolHours: 0, utilization: 0, isOverAllocated: false };
  
  const concurrentProjects = getCurrentWeekConcurrentProjects(projects, poolName, weekStart, weekEnd);
  const totalAllocated = concurrentProjects.reduce((sum, proj) => {
    const allocationPercent = proj.status?.toLowerCase() === 'complete' ? 0 : (proj.weeklyAllocation || 0);
    return sum + (allocationPercent / 100) * 40; // Convert percentage to hours
  }, 0);
  
  const utilization = (totalAllocated / pool.weeklyHours) * 100;
  const isOverAllocated = totalAllocated > pool.weeklyHours;
  
  return {
    totalAllocated: Math.round(totalAllocated * 10) / 10,
    poolHours: pool.weeklyHours,
    utilization: Math.round(utilization * 10) / 10,
    isOverAllocated
  };
}

const GanttChart: React.FC<GanttChartProps> = ({ projects, pools, filters }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(1200);

  useEffect(() => {
    function updateWidth() {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.offsetWidth);
      }
    }
    updateWidth();
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

  // Apply filters to projects
  const filteredProjects = projects.filter(proj => {
    // Status filter
    if (filters?.status && filters.status.length > 0) {
      if (!proj.status || !filters.status.includes(proj.status)) {
        return false;
      }
    }

    // Pool filter
    if (filters?.pool && filters.pool.length > 0) {
      if (!proj.pool || !filters.pool.includes(proj.pool)) {
        return false;
      }
    }

    // Date range filter
    if (filters?.dateRange) {
      const { start, end } = filters.dateRange;
      if (start && new Date(proj.startDate) < new Date(start)) {
        return false;
      }
      if (end && new Date(proj.targetDate) > new Date(end)) {
        return false;
      }
    }

    // Progress filter
    if (filters?.progress) {
      const { min, max } = filters.progress;
      const progress = proj.progress || 0;
      if (min !== undefined && progress < min) {
        return false;
      }
      if (max !== undefined && progress > max) {
        return false;
      }
    }

    // Search filter
    if (filters?.search) {
      const searchTerm = filters.search.toLowerCase();
      const projectText = `${proj.name} ${proj.sponsor} ${proj.notes}`.toLowerCase();
      if (!projectText.includes(searchTerm)) {
        return false;
      }
    }

    return true;
  });

  const validProjects = filteredProjects.filter(
    p => !isNaN(new Date(p.targetDate).getTime()) && !isNaN(new Date(p.startDate).getTime())
  );
  if (!validProjects.length) return <div style={{ padding: 24 }}>No projects match the current filters.</div>;

  // Sort projects by start date
  const sorted = [...validProjects].sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  const { min, max } = getDateRange([
    ...sorted.map(p => ({ targetDate: p.startDate } as ProjectFormData)),
    ...sorted
  ]);
  
  // Calculate chart dimensions with better handling for short date ranges
  const minChartWidth = 600;
  const chartWidth = Math.max(minChartWidth, containerWidth);
  const chartHeight = sorted.length * (BAR_HEIGHT + BAR_GAP) + CHART_HEIGHT_PAD;

  // Weeks
  const weekStarts = getAllWeekStarts(min, max);
  const weekCount = weekStarts.length;
  const availableWidth = chartWidth - CHART_LEFT_PAD - CHART_RIGHT_PAD;
  const weekWidth = Math.max(40, availableWidth / weekCount);
  // Ensure the total width of all columns doesn't exceed available width
  const totalColumnsWidth = weekCount * weekWidth;
  const adjustedWeekWidth = totalColumnsWidth > availableWidth ? availableWidth / weekCount : weekWidth;

  // Helper to map a date to an x position, snapped to week
  const dateToX = (date: string) => {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    
    // Find which week this date falls into
    const weekIdx = weekStarts.findIndex(w => {
      const weekEnd = new Date(w.getTime() + 7 * 24 * 60 * 60 * 1000);
      return d >= w && d < weekEnd;
    });
    
    if (weekIdx >= 0) {
      // Date falls within a week, position it proportionally within that week
      const weekStart = weekStarts[weekIdx];
      const daysIntoWeek = (d.getTime() - weekStart.getTime()) / (24 * 60 * 60 * 1000);
      const weekProgress = Math.max(0, Math.min(1, daysIntoWeek / 7));
      
      return CHART_LEFT_PAD + weekIdx * adjustedWeekWidth + (weekProgress * adjustedWeekWidth);
    } else if (d < weekStarts[0]) {
      // Date is before the first week
      return CHART_LEFT_PAD;
    } else {
      // Date is after the last week
      return CHART_LEFT_PAD + (weekCount - 1) * adjustedWeekWidth;
    }
  };

  // Helper to get the width of a project bar based on start and end dates
  const getProjectWidth = (startDate: string, endDate: string) => {
    const startX = dateToX(startDate);
    const endX = dateToX(endDate);
    return Math.max(adjustedWeekWidth * 0.5, endX - startX); // Minimum width of half a week
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const rawCurrentWeekIdx = weekStarts.findIndex(w => today >= w && today < new Date(w.getTime() + 7 * 24 * 60 * 60 * 1000));
  const currentWeekIdx = rawCurrentWeekIdx >= 0 ? rawCurrentWeekIdx : -1;

  // Get unique statuses from projects
  const uniqueStatuses = Array.from(new Set(validProjects.map(p => p.status).filter(Boolean)));
  
  // Get unique pools from projects
  const uniquePools = Array.from(new Set(validProjects.map(p => p.pool).filter(Boolean)));

  // Calculate current week over-allocation warnings
  const currentWeekStart = weekStarts[currentWeekIdx >= 0 ? currentWeekIdx : 0];
  const currentWeekEnd = new Date(currentWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
  const overAllocatedPools = uniquePools.filter(poolName => {
    const utilization = calculatePoolUtilization(projects, pools, poolName, currentWeekStart, currentWeekEnd);
    return utilization.isOverAllocated;
  });

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      {/* Over-allocation Warnings */}
      {overAllocatedPools.length > 0 && (
        <div style={{ 
          background: '#fef2f2', 
          border: '1px solid #fecaca', 
          borderRadius: '6px', 
          padding: '1rem', 
          marginBottom: '1rem',
          color: '#dc2626'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
            ⚠️ Over-allocation Warnings
          </div>
          {overAllocatedPools.map(poolName => {
            const utilization = calculatePoolUtilization(projects, pools, poolName, currentWeekStart, currentWeekEnd);
            return (
              <div key={poolName} style={{ fontSize: '14px', marginBottom: '0.25rem' }}>
                <strong>{poolName}</strong>: {utilization.totalAllocated}h allocated of {utilization.poolHours}h available ({utilization.utilization}% utilization)
              </div>
            );
          })}
        </div>
      )}

      {/* Status and Pool Legends */}
      {(uniqueStatuses.length > 0 || uniquePools.length > 0) && (
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          gap: '2rem', 
          marginBottom: '1rem',
          flexWrap: 'wrap',
          padding: '0.5rem'
        }}>
          {/* Status Legend */}
          {uniqueStatuses.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Status:</span>
              {uniqueStatuses.map(status => (
                <div key={status} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{
                    width: '12px',
                    height: '12px',
                    backgroundColor: statusColors[status!] || '#888',
                    borderRadius: '2px'
                  }} />
                  <span style={{ fontSize: '12px', color: '#666' }}>{status}</span>
                </div>
              ))}
            </div>
          )}
          
          {/* Pool Legend */}
          {uniquePools.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '12px', color: '#666', fontWeight: 'bold' }}>Pools:</span>
              {uniquePools.map(poolName => {
                const utilization = calculatePoolUtilization(projects, pools, poolName, currentWeekStart, currentWeekEnd);
                // Check if this pool has any projects with work in current week
                const hasActiveProjects = projects.some(proj => 
                  proj.pool === poolName && 
                  (proj.weeklyAllocation || 0) > 0 &&
                  new Date(proj.startDate) <= currentWeekEnd && 
                  new Date(proj.targetDate) >= currentWeekStart &&
                  !proj.status?.toLowerCase().includes('complete')
                );
                const showOverAllocationWarning = utilization.isOverAllocated && hasActiveProjects;
                
                return (
                  <div key={poolName} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      backgroundColor: getPoolColor(poolName, pools),
                      borderRadius: '2px',
                      border: showOverAllocationWarning ? '1px solid #dc2626' : '0.5px solid #ccc'
                    }} />
                    <span style={{ 
                      fontSize: '12px', 
                      color: showOverAllocationWarning ? '#dc2626' : '#666',
                      fontWeight: showOverAllocationWarning ? 'bold' : 'normal'
                    }}>
                      {poolName} {showOverAllocationWarning && '⚠️'}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      
      <svg width={chartWidth} height={chartHeight} style={{ 
        background: '#fff', 
        borderRadius: 8, 
        boxShadow: '0 2px 8px #0001', 
        margin: '2rem auto', 
        width: '100%', 
        maxWidth: '100%',
        display: 'block'
      }}>
        <text x={CHART_LEFT_PAD} y={36} fontSize={18} fontWeight="bold">Project Timeline</text>
        {/* Highlight current week column */}
        {currentWeekIdx > -1 && (
          <rect
            x={CHART_LEFT_PAD + currentWeekIdx * adjustedWeekWidth}
            y={CHART_TOP_PAD - 30}
            width={adjustedWeekWidth}
            height={chartHeight - (CHART_TOP_PAD - 30) - 10}
            fill="#ffe066"
            fillOpacity={0.4}
            style={{ pointerEvents: 'none' }}
          />
        )}
        {/* Week grid lines and labels */}
        {weekStarts.map((w, i) => {
          const isNarrowColumn = adjustedWeekWidth < 60;
          const labelX = CHART_LEFT_PAD + i * adjustedWeekWidth + adjustedWeekWidth / 2;
          const labelY = isNarrowColumn ? CHART_TOP_PAD - 5 : CHART_TOP_PAD - 10;
          
          return (
            <g key={w.toISOString()}>
              <line
                x1={CHART_LEFT_PAD + i * adjustedWeekWidth}
                y1={CHART_TOP_PAD - 30}
                x2={CHART_LEFT_PAD + i * adjustedWeekWidth}
                y2={chartHeight - 10}
                stroke="#eee"
              />
              {/* Week labels - show all weeks with conditional rotation for narrow columns */}
              <text
                x={labelX}
                y={labelY}
                fontSize={isNarrowColumn ? 8 : 10}
                textAnchor="middle"
                fill={i === currentWeekIdx ? '#d97706' : '#888'}
                fontWeight={i === currentWeekIdx ? 'bold' : 'normal'}
                textDecoration={i === currentWeekIdx ? 'underline' : 'none'}
                transform={isNarrowColumn ? `rotate(-45, ${labelX}, ${labelY})` : ''}
              >
                {isNarrowColumn 
                  ? w.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric' })
                  : w.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                }
              </text>
            </g>
          );
        })}
        {/* Date axis - extend full width of chart */}
        <line 
          x1={CHART_LEFT_PAD} 
          y1={CHART_TOP_PAD + 5} 
          x2={CHART_LEFT_PAD + weekCount * adjustedWeekWidth} 
          y2={CHART_TOP_PAD + 5} 
          stroke="#bbb" 
        />
        {sorted.map((proj, i) => {
          const y = CHART_TOP_PAD + i * (BAR_HEIGHT + BAR_GAP);
          const x1 = dateToX(proj.startDate);
          const barWidth = getProjectWidth(proj.startDate, proj.targetDate);
          const color = getProjectColor(proj, pools);
          // Tooltip calculations
          const pool = pools.find(p => p.name === proj.pool);
          const poolWeeklyHours = pool?.weeklyHours || 40;
          const allocationPercent = proj.status?.toLowerCase() === 'complete' ? 0 : (proj.weeklyAllocation || 0);
          const allocationHours = Math.round((allocationPercent / 100) * 40 * 10) / 10;
          const estHoursLeft = Math.round((proj.estimatedHours * (1 - (proj.progress || 0) / 100)) * 10) / 10;
          // Find current week
          const today = new Date(); today.setHours(0,0,0,0);
          const currentWeekStart = weekStarts[currentWeekIdx >= 0 ? currentWeekIdx : 0];
          const currentWeekEnd = new Date(currentWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
          const concurrent = getCurrentWeekConcurrentProjects(projects, proj.pool, currentWeekStart, currentWeekEnd);
          const concurrentCount = concurrent.length || 1;
          const allocatedThisWeek = poolWeeklyHours * (allocationPercent / 100) / concurrentCount;
          
          // Check if this project's pool is over-allocated AND this project has work in current week
          const poolUtilization = calculatePoolUtilization(projects, pools, proj.pool, currentWeekStart, currentWeekEnd);
          const hasWorkThisWeek = allocationPercent > 0 && 
            new Date(proj.startDate) <= currentWeekEnd && 
            new Date(proj.targetDate) >= currentWeekStart &&
            !proj.status?.toLowerCase().includes('complete');
          const isOverAllocated = poolUtilization.isOverAllocated && hasWorkThisWeek;
          
          return (
            <g key={proj.name}>
              {/* Tooltip for full project name, status, notes, allocation */}
              <title>
                {proj.name}
                {proj.status ? `\nStatus: ${proj.status}` : ''}
                {proj.notes ? `\n${proj.notes}` : ''}
                {`\nWeekly Allocation: ${allocationPercent}% (${allocationHours}h)`}
                {`\nEstimated Hours: ${estHoursLeft} of ${proj.estimatedHours}h`}
                {`\nAllocated This Week: ${Math.round(allocatedThisWeek * 10) / 10}h (of ${poolWeeklyHours}h pool, ${concurrentCount} concurrent)`}
                {isOverAllocated ? `\n⚠️ POOL OVER-ALLOCATED: ${poolUtilization.totalAllocated}h of ${poolUtilization.poolHours}h (${poolUtilization.utilization}%)` : ''}
              </title>
              {/* Bar */}
              <rect 
                x={x1} 
                y={y+20} 
                width={barWidth} 
                height={BAR_HEIGHT} 
                fill={color} 
                rx={6}
                stroke={isOverAllocated ? '#dc2626' : 'none'}
                strokeWidth={isOverAllocated ? 2 : 0}
              />
              {/* Project name */}
              <text x={24} y={y + BAR_HEIGHT / 2 + 25} fontSize={12} fontWeight="bold" fill="#222">
                {truncateName(proj.name)}
              </text>
              {/* Pool color indicator */}
              <rect 
                x={8} 
                y={y + 23} 
                width={12} 
                height={12} 
                fill={getPoolColor(proj.pool, pools)} 
                rx={2}
                stroke={isOverAllocated ? '#dc2626' : '#ccc'}
                strokeWidth={isOverAllocated ? 1.5 : 0.5}
              />
              {/* Over-allocation warning indicator */}
              {isOverAllocated && (
                <text x={22} y={y + 18} fontSize={12} fill="#dc2626" fontWeight="bold">
                  ⚠️
                </text>
              )}
              {/* Percent complete */}
              {typeof proj.progress === 'number' && (
                <text x={x1 + barWidth - 80} y={y + BAR_HEIGHT / 2 + 25} fontSize={13} fill="#fff" textAnchor="end" fontWeight="bold">
                  {proj.progress}%
                </text>
              )}
              {/* Target date label inside the bar, right-aligned */}
              <text x={x1 + barWidth - 8} y={y + BAR_HEIGHT / 2 + 25} fontSize={10} fill="#fff" textAnchor="end">
                {proj.targetDate}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default GanttChart;