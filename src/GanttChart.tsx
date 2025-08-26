import React, { useRef, useState, useEffect, useMemo } from 'react';
import type { ProjectFormData, PoolData } from './types';

// Pre-processed project interface for better performance
interface ProcessedProject {
  pool: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  weeklyAllocation: number;
  estimatedHours: number;
  status?: string;
  name: string;
  sponsor: string;
  progress: number;
  notes?: string;
  lastModified?: string;
}

// Cache for utilization calculations
class UtilizationCache {
  private cache = new Map<string, any>();
  private maxAge = 2 * 60 * 1000; // 2 minutes cache
  
  get(key: string) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.maxAge) {
      return cached.data;
    }
    return null;
  }
  
  set(key: string, data: any) {
    this.cache.set(key, { data, timestamp: Date.now() });
  }
  
  clear() {
    this.cache.clear();
  }
}

const utilizationCache = new UtilizationCache();

// Pre-process projects for better performance
function preprocessProjects(projects: ProjectFormData[]): ProcessedProject[] {
  return projects.map(p => ({
    pool: p.pool,
    startDate: new Date(p.startDate),
    endDate: new Date(p.targetDate),
    isActive: !p.status?.toLowerCase().includes('complete'),
    weeklyAllocation: p.weeklyAllocation || 0,
    estimatedHours: p.estimatedHours,
    status: p.status,
    name: p.name,
    sponsor: p.sponsor,
    progress: p.progress,
    notes: p.notes,
    lastModified: p.lastModified
  }));
}

// Get active projects for a specific week (optimized)
function getActiveProjectsInWeek(processedProjects: ProcessedProject[], weekStart: Date, weekEnd: Date): ProcessedProject[] {
  return processedProjects.filter(p => 
    p.isActive && 
    p.startDate <= weekEnd && 
    p.endDate >= weekStart
  );
}

// Get projects by pool for a specific week
function getProjectsByPoolInWeek(processedProjects: ProcessedProject[], weekStart: Date, weekEnd: Date): Map<string, ProcessedProject[]> {
  const activeProjects = getActiveProjectsInWeek(processedProjects, weekStart, weekEnd);
  const poolProjects = new Map<string, ProcessedProject[]>();
  
  activeProjects.forEach(project => {
    if (!poolProjects.has(project.pool)) {
      poolProjects.set(project.pool, []);
    }
    poolProjects.get(project.pool)!.push(project);
  });
  
  return poolProjects;
}

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
  onWeekSelect?: (weekIndex: number | null, weekStart: Date | null) => void;
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
  const current = getWeekStart(min);
  // Prepend one week before min
  current.setDate(current.getDate() - 7);
  while (current <= max) {
    weeks.push(new Date(current));
    current.setDate(current.getDate() + 7);
  }
  return weeks;
}

function getCurrentWeekConcurrentProjects(projects: ProjectFormData[], poolName: string, weekStart: Date, weekEnd: Date) {
  // Use pre-processed projects for better performance
  const processedProjects = preprocessProjects(projects);
  return processedProjects.filter(p =>
    p.pool === poolName &&
    p.isActive &&
    p.startDate <= weekEnd &&
    p.endDate >= weekStart
  );
}

function calculatePoolUtilization(projects: ProjectFormData[], pools: PoolData[], poolName: string, weekStart: Date, weekEnd: Date) {
  // Create cache key for this calculation
  const cacheKey = `${poolName}-${weekStart.toISOString().split('T')[0]}-${weekEnd.toISOString().split('T')[0]}`;
  
  // Check cache first
  const cached = utilizationCache.get(cacheKey);
  if (cached) {
    return cached;
  }
  
  const pool = pools.find(p => p.name === poolName);
  if (!pool) return { totalAllocated: 0, poolHours: 0, utilization: 0, isOverAllocated: false };
  
  const concurrentProjects = getCurrentWeekConcurrentProjects(projects, poolName, weekStart, weekEnd);
  const totalAllocated = concurrentProjects.reduce((sum, proj) => {
    const allocationPercent = proj.status?.toLowerCase() === 'complete' ? 0 : (proj.weeklyAllocation || 0);
    // Use pool's standard week hours instead of hardcoded 40
    const standardWeekHours = pool.standardWeekHours || 40;
    return sum + (allocationPercent / 100) * standardWeekHours;
  }, 0);
  
  // Account for reserved hours (support and meetings)
  const reservedHours = (pool.supportHours || 0) + (pool.meetingHours || 0);
  const availableHours = pool.weeklyHours - reservedHours;
  
  const utilization = (totalAllocated / availableHours) * 100;
  const isOverAllocated = totalAllocated > availableHours;
  
  const result = {
    totalAllocated: Math.round(totalAllocated * 10) / 10,
    poolHours: pool.weeklyHours,
    availableHours: Math.round(availableHours * 10) / 10,
    reservedHours: Math.round(reservedHours * 10) / 10,
    utilization: Math.round(utilization * 10) / 10,
    isOverAllocated
  };
  
  // Cache the result
  utilizationCache.set(cacheKey, result);
  
  return result;
}

function calculatePoolUtilizationFromProjects(projects: ProcessedProject[], pool: PoolData) {
  const totalAllocated = projects.reduce((sum, proj) => {
    const allocationPercent = proj.status?.toLowerCase() === 'complete' ? 0 : (proj.weeklyAllocation || 0);
    // Use pool's standard week hours instead of hardcoded 40
    const standardWeekHours = pool.standardWeekHours || 40;
    return sum + (allocationPercent / 100) * standardWeekHours;
  }, 0);
  
  // Account for reserved hours (support and meetings)
  const reservedHours = (pool.supportHours || 0) + (pool.meetingHours || 0);
  const availableHours = pool.weeklyHours - reservedHours;
  
  const utilization = (totalAllocated / availableHours) * 100;
  const isOverAllocated = totalAllocated > availableHours;
  
  return {
    totalAllocated: Math.round(totalAllocated * 10) / 10,
    poolHours: pool.weeklyHours,
    availableHours: Math.round(availableHours * 10) / 10,
    reservedHours: Math.round(reservedHours * 10) / 10,
    utilization: Math.round(utilization * 10) / 10,
    isOverAllocated
  };
}

function getFutureOverAllocationWarnings(projects: ProjectFormData[], pools: PoolData[], weekStarts: Date[], currentWeekIdx: number) {
  const warnings: Array<{poolName: string, weekStart: Date, utilization: ReturnType<typeof calculatePoolUtilization>}> = [];
  
  // Pre-process all projects once
  const processedProjects = preprocessProjects(projects);
  
  // Check next 4 weeks for over-allocation
  const futureWeeks = Math.min(4, weekStarts.length - currentWeekIdx - 1);
  if (futureWeeks <= 0) return warnings;
  
  // Pre-allocate array with estimated size for better performance
  const estimatedWarnings = futureWeeks * pools.length;
  warnings.length = estimatedWarnings;
  let warningIndex = 0;
  
  for (let i = currentWeekIdx + 1; i < Math.min(currentWeekIdx + 5, weekStarts.length); i++) {
    const weekStart = weekStarts[i];
    const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
    
    // Get all active projects for this week once
    const weekProjects = getProjectsByPoolInWeek(processedProjects, weekStart, weekEnd);
    
    // Calculate utilization for all pools in this week
    pools.forEach(pool => {
      const poolProjects = weekProjects.get(pool.name) || [];
      const utilization = calculatePoolUtilizationFromProjects(poolProjects, pool);
      
      if (utilization.isOverAllocated) {
        warnings[warningIndex++] = { 
          poolName: pool.name, 
          weekStart, 
          utilization 
        };
      }
    });
  }
  
  // Trim array to actual size
  warnings.length = warningIndex;
  return warnings;
}

function renderMeetingHoursIndicators(projects: ProjectFormData[], pools: PoolData[], weekStarts: Date[], weekWidth: number, chartTopPad: number) {
  const meetingIndicators: React.ReactElement[] = [];
  
  // Pre-process projects once for better performance
  const processedProjects = preprocessProjects(projects);
  
  weekStarts.forEach((weekStart, weekIndex) => {
    const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
    
    // Get all pools that have active projects in this week using optimized function
    const activePoolsInWeek = new Set<string>();
    const weekProjects = getActiveProjectsInWeek(processedProjects, weekStart, weekEnd);
    
    weekProjects.forEach(project => {
      if (project.pool) {
        activePoolsInWeek.add(project.pool);
      }
    });
    
    // Calculate total meeting hours for pools with active projects this week
    let totalMeetingHours = 0;
    activePoolsInWeek.forEach(poolName => {
      const pool = pools.find(p => p.name === poolName);
      if (pool && pool.meetingHours) {
        totalMeetingHours += pool.meetingHours;
      }
    });
    
    // Only show indicator if there are meeting hours
    if (totalMeetingHours > 0) {
      const x = CHART_LEFT_PAD + weekIndex * weekWidth;
      const y = chartTopPad + 10; // Position below the horizontal timeline line
      
      meetingIndicators.push(
        <g key={`meeting-week-${weekIndex}`}>
          <rect
            x={x + 2}
            y={y}
            width={weekWidth - 4}
            height={8}
            fill="#f59e0b"
            opacity={0.7}
            rx={2}
          />
          <text
            x={x + weekWidth / 2}
            y={y + 6}
            fontSize={8}
            fill="#fff"
            textAnchor="middle"
            fontWeight="bold"
          >
            {totalMeetingHours}h
          </text>
        </g>
      );
    }
  });
  
  return meetingIndicators;
}

const GanttChart: React.FC<GanttChartProps> = ({ projects, pools, filters, onWeekSelect }) => {
  console.log('GanttChart: Component rendering started', { projectsCount: projects.length, poolsCount: pools.length });
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(1200);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState<number | null>(null);
  
  // Virtual scrolling state
  const [scrollTop, setScrollTop] = useState(0);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 50 });
  const ROW_HEIGHT = BAR_HEIGHT + BAR_GAP;
  const BUFFER_SIZE = 10; // Number of extra rows to render above/below visible area
  
  // Web Worker state
  const [worker, setWorker] = useState<Worker | null>(null);
  const [workerReady, setWorkerReady] = useState(false);
  const [isCalculating, setIsCalculating] = useState(false);
  const [cachedFutureWarnings, setCachedFutureWarnings] = useState<any[]>([]);

  console.log('GanttChart: Hooks initialized');

  // Initialize Web Worker
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Worker' in window) {
      const newWorker = new Worker('/utilization-worker.js');
      
      newWorker.onmessage = (e) => {
        const { type, data } = e.data;
        
        switch (type) {
          case 'WORKER_READY':
            setWorkerReady(true);
            break;
            
          case 'FUTURE_WARNINGS_RESULT':
            setCachedFutureWarnings(data);
            setIsCalculating(false);
            break;
            
          case 'ERROR':
            console.error('Worker error:', data.error);
            setIsCalculating(false);
            break;
        }
      };
      
      setWorker(newWorker);
      
      return () => {
        newWorker.terminate();
      };
    }
  }, []);

  // Clear cache when projects or pools change
  useEffect(() => {
    utilizationCache.clear();
    setCachedFutureWarnings([]);
  }, [projects, pools]);

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

  // Calculate future over-allocation warnings
  const futureOverAllocationWarnings = useMemo(() => {
    // Use cached results from worker if available
    if (cachedFutureWarnings.length > 0) {
      return cachedFutureWarnings.map(warning => ({
        ...warning,
        weekStart: new Date(warning.weekStart)
      }));
    }
    
    // Fallback to main thread calculation
    return getFutureOverAllocationWarnings(projects, pools, weekStarts, currentWeekIdx);
  }, [cachedFutureWarnings, projects, pools, weekStarts, currentWeekIdx]);

  // Trigger worker calculation when data changes
  useEffect(() => {
    if (worker && workerReady && projects.length > 0 && pools.length > 0 && weekStarts.length > 0) {
      setIsCalculating(true);
      
      worker.postMessage({
        type: 'FUTURE_WARNINGS',
        data: {
          projects,
          pools,
          weekStarts: weekStarts.map(d => d.toISOString()),
          currentWeekIdx
        },
        requestId: Date.now()
      });
    }
  }, [worker, workerReady, projects, pools, weekStarts, currentWeekIdx]);

  // Calculate visible range based on scroll position
  useEffect(() => {
    const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - BUFFER_SIZE);
    const end = Math.min(
      sorted.length,
      Math.ceil((scrollTop + chartHeight) / ROW_HEIGHT) + BUFFER_SIZE
    );
    setVisibleRange({ start, end });
  }, [scrollTop, chartHeight, sorted.length]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  };

  const handleWeekClick = (weekIndex: number) => {
    const newSelectedWeek = selectedWeekIndex === weekIndex ? null : weekIndex;
    setSelectedWeekIndex(newSelectedWeek);
    
    // Call the callback with the selected week information
    if (onWeekSelect) {
      onWeekSelect(newSelectedWeek, newSelectedWeek !== null ? weekStarts[newSelectedWeek] : null);
    }
  };

  // Early return check - but hooks must be called before this
  if (!validProjects.length) {
    console.log('GanttChart: Early return - no valid projects');
    return <div style={{ padding: 24 }}>No projects match the current filters.</div>;
  }

  console.log('GanttChart: About to render JSX', { 
    validProjectsCount: validProjects.length, 
    sortedCount: sorted.length,
    chartHeight,
    weekCount 
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
            ⚠️ Current Week Over-allocation Warnings
          </div>
          {overAllocatedPools.map(poolName => {
            const utilization = calculatePoolUtilization(projects, pools, poolName, currentWeekStart, currentWeekEnd);
            return (
              <div key={poolName} style={{ fontSize: '14px', marginBottom: '0.25rem' }}>
                <strong>{poolName}</strong>: {utilization.totalAllocated}h allocated of {utilization.availableHours}h available 
                ({utilization.utilization}% utilization)
                {utilization.reservedHours && utilization.reservedHours > 0 && (
                  <span style={{ color: '#666', fontSize: '12px' }}>
                    {' '}({utilization.poolHours}h total - {utilization.reservedHours}h reserved)
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Future Over-allocation Warnings */}
      {futureOverAllocationWarnings.length > 0 && (
        <div style={{ 
          background: '#fff7ed', 
          border: '1px solid #fed7aa', 
          borderRadius: '6px', 
          padding: '1rem', 
          marginBottom: '1rem',
          color: '#ea580c'
        }}>
          <div style={{ fontWeight: 'bold', marginBottom: '0.5rem' }}>
            🔮 Future Week Over-allocation Warnings
            {isCalculating && (
              <span style={{ marginLeft: '8px', fontSize: '14px', color: '#666' }}>
                ⏳ Calculating...
              </span>
            )}
          </div>
          {futureOverAllocationWarnings.map((warning, index) => {
            const weekLabel = warning.weekStart.toLocaleDateString('en-US', { 
              month: 'short', 
              day: 'numeric',
              year: 'numeric'
            });
            return (
              <div key={`${warning.poolName}-${index}`} style={{ fontSize: '14px', marginBottom: '0.25rem' }}>
                <strong>{warning.poolName}</strong> (Week of {weekLabel}): {warning.utilization.totalAllocated}h allocated of {warning.utilization.availableHours}h available 
                ({warning.utilization.utilization}% utilization)
                {warning.utilization.reservedHours && warning.utilization.reservedHours > 0 && (
                  <span style={{ color: '#666', fontSize: '12px' }}>
                    {' '}({warning.utilization.poolHours}h total - {warning.utilization.reservedHours}h reserved)
                  </span>
                )}
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
      
      <div 
        style={{ 
          height: chartHeight, 
          overflowY: 'auto', 
          overflowX: 'hidden',
          position: 'relative'
        }}
        onScroll={handleScroll}
      >
        <svg 
          width={chartWidth} 
          height={chartHeight} 
          style={{ 
            background: '#fff', 
            borderRadius: 8, 
            boxShadow: '0 2px 8px #0001', 
            margin: '2rem auto', 
            width: '100%', 
            maxWidth: '100%',
            display: 'block',
            position: 'absolute',
            top: 0,
            left: 0
          }}
        >
          <text x={CHART_LEFT_PAD} y={36} fontSize={18} fontWeight="bold">Project Timeline</text>
          
          {/* Highlight current week column */}
          {currentWeekIdx > -1 && (
            <rect
              x={CHART_LEFT_PAD + currentWeekIdx * adjustedWeekWidth}
              y={0}
              width={adjustedWeekWidth}
              height={chartHeight}
              fill="#3b82f6"
              opacity={0.1}
            />
          )}
          
          {/* Highlight selected week column */}
          {selectedWeekIndex !== null && selectedWeekIndex !== currentWeekIdx && (
            <rect
              x={CHART_LEFT_PAD + selectedWeekIndex * adjustedWeekWidth}
              y={0}
              width={adjustedWeekWidth}
              height={chartHeight}
              fill="#8b5cf6"
              opacity={0.1}
            />
          )}

          {/* Week grid lines and labels */}
          {weekStarts.map((w, i) => {
            const isNarrowColumn = adjustedWeekWidth < 60;
            const labelX = CHART_LEFT_PAD + i * adjustedWeekWidth + adjustedWeekWidth / 2;
            const labelY = isNarrowColumn ? CHART_TOP_PAD - 5 : CHART_TOP_PAD - 10;
            const isSelected = selectedWeekIndex === i;
            const isCurrent = i === currentWeekIdx;
            
            return (
              <g key={w.toISOString()}>
                <line
                  x1={CHART_LEFT_PAD + i * adjustedWeekWidth}
                  y1={CHART_TOP_PAD - 30}
                  x2={CHART_LEFT_PAD + i * adjustedWeekWidth}
                  y2={chartHeight - 10}
                  stroke="#eee"
                />
                {/* Clickable week header */}
                <rect
                  x={CHART_LEFT_PAD + i * adjustedWeekWidth}
                  y={CHART_TOP_PAD - 40}
                  width={adjustedWeekWidth}
                  height={20}
                  fill="transparent"
                  cursor="pointer"
                  onClick={() => handleWeekClick(i)}
                  style={{ pointerEvents: 'all' }}
                />
                {/* Week labels - show all weeks with conditional rotation for narrow columns */}
                <text
                  x={labelX}
                  y={labelY}
                  fontSize={isNarrowColumn ? 8 : 10}
                  textAnchor="middle"
                  fill={isSelected ? '#3b82f6' : isCurrent ? '#d97706' : '#888'}
                  fontWeight={isSelected || isCurrent ? 'bold' : 'normal'}
                  textDecoration={isSelected ? 'underline' : isCurrent ? 'underline' : 'none'}
                  transform={isNarrowColumn ? `rotate(-45, ${labelX}, ${labelY})` : ''}
                  style={{ pointerEvents: 'none' }}
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
          
          {/* Virtual scrolling: Only render visible project rows */}
          {sorted.slice(visibleRange.start, visibleRange.end).map((proj, index) => {
            const actualIndex = visibleRange.start + index;
            const y = CHART_TOP_PAD + actualIndex * (BAR_HEIGHT + BAR_GAP);
            const x1 = dateToX(proj.startDate);
            const barWidth = getProjectWidth(proj.startDate, proj.targetDate);
            const color = getProjectColor(proj, pools);
            
            // Tooltip calculations
            const pool = pools.find(p => p.name === proj.pool);
            const poolWeeklyHours = pool?.weeklyHours || 40;
            const allocationPercent = proj.status?.toLowerCase() === 'complete' ? 0 : (proj.weeklyAllocation || 0);
            const allocationHours = Math.round((allocationPercent / 100) * (pool?.standardWeekHours || 40) * 10) / 10;
            const estHoursLeft = Math.round((proj.estimatedHours * (1 - (proj.progress || 0) / 100)) * 10) / 10;
            
            // Find current week
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
                  {`\nWeekly Allocation: ${allocationPercent}% (${allocationHours}h of ${proj.estimatedHours}h total)`}
                  {`\nEstimated Hours: ${estHoursLeft} of ${proj.estimatedHours}h remaining`}
                  {`\nAllocated This Week: ${Math.round(allocatedThisWeek * 10) / 10}h (of ${poolWeeklyHours}h pool, ${concurrentCount} concurrent)`}
                  {isOverAllocated ? `\n⚠️ POOL OVER-ALLOCATED: ${poolUtilization.totalAllocated}h of ${poolUtilization.availableHours}h available (${poolUtilization.utilization}%)` : ''}
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
          {/* Meeting Hours Indicators */}
          {renderMeetingHoursIndicators(projects, pools, weekStarts, adjustedWeekWidth, CHART_TOP_PAD)}
        </svg>
      </div>
    </div>
  );
};

export default GanttChart;