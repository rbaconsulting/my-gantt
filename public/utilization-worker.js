// Web Worker for heavy utilization calculations
// This runs in a separate thread to avoid blocking the main UI

// Pre-processed project interface
class ProcessedProject {
  constructor(data) {
    this.pool = data.pool;
    this.startDate = new Date(data.startDate);
    this.endDate = new Date(data.targetDate);
    this.isActive = !data.status?.toLowerCase().includes('complete');
    this.weeklyAllocation = data.weeklyAllocation || 0;
    this.estimatedHours = data.estimatedHours;
    this.status = data.status;
    this.name = data.name;
    this.sponsor = data.sponsor;
    this.progress = data.progress;
    this.notes = data.notes;
    this.lastModified = data.lastModified;
  }
}

// Pre-process projects for better performance
function preprocessProjects(projects) {
  return projects.map(p => new ProcessedProject(p));
}

// Get active projects for a specific week
function getActiveProjectsInWeek(processedProjects, weekStart, weekEnd) {
  return processedProjects.filter(p => 
    p.isActive && 
    p.startDate <= weekEnd && 
    p.endDate >= weekStart
  );
}

// Get projects by pool for a specific week
function getProjectsByPoolInWeek(processedProjects, weekStart, weekEnd) {
  const activeProjects = getActiveProjectsInWeek(processedProjects, weekStart, weekEnd);
  const poolProjects = new Map();
  
  activeProjects.forEach(project => {
    if (!poolProjects.has(project.pool)) {
      poolProjects.set(project.pool, []);
    }
    poolProjects.get(project.pool).push(project);
  });
  
  return poolProjects;
}

// Calculate pool utilization from pre-processed projects
function calculatePoolUtilizationFromProjects(projects, pool) {
  const totalAllocated = projects.reduce((sum, proj) => {
    const allocationPercent = proj.status?.toLowerCase() === 'complete' ? 0 : (proj.weeklyAllocation || 0);
    const standardWeekHours = pool.standardWeekHours || 40;
    return sum + (allocationPercent / 100) * standardWeekHours;
  }, 0);
  
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

// Calculate future over-allocation warnings
function getFutureOverAllocationWarnings(projects, pools, weekStarts, currentWeekIdx) {
  const warnings = [];
  
  // Pre-process all projects once
  const processedProjects = preprocessProjects(projects);
  
  // Check next 4 weeks for over-allocation
  const futureWeeks = Math.min(4, weekStarts.length - currentWeekIdx - 1);
  if (futureWeeks <= 0) return warnings;
  
  for (let i = currentWeekIdx + 1; i < Math.min(currentWeekIdx + 5, weekStarts.length); i++) {
    const weekStart = new Date(weekStarts[i]);
    const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
    
    // Get all active projects for this week once
    const weekProjects = getProjectsByPoolInWeek(processedProjects, weekStart, weekEnd);
    
    // Calculate utilization for all pools in this week
    pools.forEach(pool => {
      const poolProjects = weekProjects.get(pool.name) || [];
      const utilization = calculatePoolUtilizationFromProjects(poolProjects, pool);
      
      if (utilization.isOverAllocated) {
        warnings.push({ 
          poolName: pool.name, 
          weekStart: weekStart.toISOString(), 
          utilization 
        });
      }
    });
  }
  
  return warnings;
}

// Calculate all week utilizations in batch
function calculateAllWeekUtilizations(projects, pools, weekStarts) {
  const results = new Map();
  
  // Pre-process all projects
  const processedProjects = preprocessProjects(projects);
  
  weekStarts.forEach((weekStart, weekIndex) => {
    const weekKey = weekStart.toISOString().split('T')[0];
    const weekEnd = new Date(weekStart.getTime() + 6 * 24 * 60 * 60 * 1000);
    
    // Get active projects for this week once
    const weekProjects = getProjectsByPoolInWeek(processedProjects, weekStart, weekEnd);
    
    // Calculate for all pools in this week
    const weekResults = new Map();
    pools.forEach(pool => {
      const poolProjects = weekProjects.get(pool.name) || [];
      const utilization = calculatePoolUtilizationFromProjects(poolProjects, pool);
      weekResults.set(pool.name, utilization);
    });
    
    results.set(weekKey, weekResults);
  });
  
  return results;
}

// Handle messages from main thread
self.onmessage = function(e) {
  const { type, data } = e.data;
  
  try {
    let result;
    
    switch (type) {
      case 'FUTURE_WARNINGS':
        result = getFutureOverAllocationWarnings(
          data.projects, 
          data.pools, 
          data.weekStarts.map(d => new Date(d)), 
          data.currentWeekIdx
        );
        break;
        
      case 'ALL_WEEK_UTILIZATIONS':
        result = calculateAllWeekUtilizations(
          data.projects, 
          data.pools, 
          data.weekStarts.map(d => new Date(d))
        );
        break;
        
      case 'BATCH_CALCULATIONS':
        const warnings = getFutureOverAllocationWarnings(
          data.projects, 
          data.pools, 
          data.weekStarts.map(d => new Date(d)), 
          data.currentWeekIdx
        );
        const utilizations = calculateAllWeekUtilizations(
          data.projects, 
          data.pools, 
          data.weekStarts.map(d => new Date(d))
        );
        result = { warnings, utilizations };
        break;
        
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
    
    // Send result back to main thread
    self.postMessage({
      type: `${type}_RESULT`,
      data: result,
      requestId: e.data.requestId
    });
    
  } catch (error) {
    // Send error back to main thread
    self.postMessage({
      type: 'ERROR',
      error: error.message,
      requestId: e.data.requestId
    });
  }
};

// Notify main thread that worker is ready
self.postMessage({ type: 'WORKER_READY' });
