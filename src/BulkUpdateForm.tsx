import React, { useState, useEffect } from 'react';
import type { ProjectFormData, PoolData } from './types';

interface BulkUpdateFormProps {
  projects: ProjectFormData[];
  pools: PoolData[];
  onSave: (updatedProjects: ProjectFormData[]) => void;
  onCancel: () => void;
  onNewProject: () => void;
  onEditProject: (project: ProjectFormData) => void;
}

interface ConcurrentProject {
  project: ProjectFormData;
  currentAllocation: number;
  newAllocation: number;
  pool: PoolData;
  isActive: boolean;
}

const BulkUpdateForm: React.FC<BulkUpdateFormProps> = ({ projects, pools, onSave, onCancel, onNewProject, onEditProject }) => {
  const [concurrentProjects, setConcurrentProjects] = useState<ConcurrentProject[]>([]);
  const [selectedPool, setSelectedPool] = useState<string>('');

  // Get current week dates
  const getCurrentWeekDates = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const dayOfWeek = today.getDay();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - dayOfWeek);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    return { startOfWeek, endOfWeek };
  };

  // Get projects that are active in the current week
  const getActiveProjects = (poolName?: string) => {
    const { startOfWeek, endOfWeek } = getCurrentWeekDates();
    
    return projects.filter(project => {
      const isInPool = !poolName || project.pool === poolName;
      const isActive = new Date(project.startDate) <= endOfWeek && 
                      new Date(project.targetDate) >= startOfWeek &&
                      !project.status?.toLowerCase().includes('complete');
      // Include projects with any allocation (including 0%) that are active in the current week
      
      return isInPool && isActive;
    });
  };

  // Initialize concurrent projects when pool changes
  useEffect(() => {
    if (selectedPool) {
      const activeProjects = getActiveProjects(selectedPool);
      const pool = pools.find(p => p.name === selectedPool);
      
      const concurrent: ConcurrentProject[] = activeProjects.map(project => ({
        project,
        currentAllocation: project.weeklyAllocation || 0,
        newAllocation: project.weeklyAllocation || 0,
        pool: pool!,
        isActive: (project.weeklyAllocation || 0) > 0 // Only active if they have allocation
      }));

      setConcurrentProjects(concurrent);
    } else {
      setConcurrentProjects([]);
    }
  }, [selectedPool, projects, pools]);

  const handleAllocationChange = (projectName: string, newAllocation: number) => {
    setConcurrentProjects(prev => 
      prev.map(cp => 
        cp.project.name === projectName 
          ? { ...cp, newAllocation }
          : cp
      )
    );
  };

  const handleToggleActive = (projectName: string) => {
    setConcurrentProjects(prev => 
      prev.map(cp => 
        cp.project.name === projectName 
          ? { ...cp, isActive: !cp.isActive, newAllocation: cp.isActive ? 0 : cp.currentAllocation }
          : cp
      )
    );
  };

  const calculateTotalAllocation = () => {
    return concurrentProjects
      .filter(cp => cp.isActive)
      .reduce((sum, cp) => sum + cp.newAllocation, 0);
  };

  const getPoolUtilization = () => {
    if (!selectedPool) return { totalAllocated: 0, poolHours: 0, utilization: 0 };
    
    const pool = pools.find(p => p.name === selectedPool);
    if (!pool) return { totalAllocated: 0, poolHours: 0, utilization: 0 };
    
    const totalAllocated = calculateTotalAllocation();
    const utilization = (totalAllocated / 100) * 40; // Convert percentage to hours
    const utilizationPercent = (utilization / pool.weeklyHours) * 100;
    
    return {
      totalAllocated: Math.round(utilization * 10) / 10,
      poolHours: pool.weeklyHours,
      utilization: Math.round(utilizationPercent * 10) / 10
    };
  };

  const handleSave = () => {
    const updatedProjects = projects.map(project => {
      const concurrent = concurrentProjects.find(cp => cp.project.name === project.name);
      if (concurrent) {
        return {
          ...project,
          weeklyAllocation: concurrent.newAllocation
        };
      }
      return project;
    });
    
    onSave(updatedProjects);
  };

  const handleDistributeEvenly = () => {
    const activeProjects = concurrentProjects.filter(cp => cp.isActive);
    if (activeProjects.length === 0) return;
    
    const evenAllocation = Math.floor(100 / activeProjects.length);
    const remainder = 100 % activeProjects.length;
    
    setConcurrentProjects(prev => 
      prev.map((cp, index) => {
        if (!cp.isActive) return cp;
        const allocation = index < remainder ? evenAllocation + 1 : evenAllocation;
        return { ...cp, newAllocation: allocation };
      })
    );
  };

  const { totalAllocated, poolHours, utilization } = getPoolUtilization();
  const isOverAllocated = totalAllocated > poolHours;

  return (
    <div style={{ 
      padding: '2rem', 
      maxWidth: 800,
      background: '#f8f9fa',
      borderRadius: '8px',
      border: '1px solid #e9ecef'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ margin: 0, color: '#000' }}>Bulk Update - Current Week Allocation</h2>
        <button
          onClick={onNewProject}
          style={{
            padding: '0.5rem 1rem',
            fontSize: '14px',
            borderRadius: '4px',
            border: '1px solid #4F8EF7',
            background: '#4F8EF7',
            color: 'white',
            cursor: 'pointer'
          }}
        >
          + New Project
        </button>
      </div>
      
      {/* Pool Selection */}
      <div style={{ marginBottom: '2rem' }}>
        <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '0.5rem', color: '#000' }}>
          Select Pool:
        </label>
        <select 
          value={selectedPool} 
          onChange={(e) => setSelectedPool(e.target.value)}
          style={{
            padding: '0.5rem',
            border: '1px solid #d1d5db',
            borderRadius: '4px',
            fontSize: '14px',
            minWidth: '200px'
          }}
        >
          <option value="">Select a pool...</option>
          {pools.map(pool => (
            <option key={pool.name} value={pool.name}>
              {pool.name} ({pool.weeklyHours} hrs/week)
            </option>
          ))}
        </select>
      </div>

      {selectedPool && concurrentProjects.length > 0 && (
        <>
          {/* Pool Utilization Summary */}
          <div style={{ 
            background: isOverAllocated ? '#fef2f2' : '#f0f9ff', 
            border: `1px solid ${isOverAllocated ? '#fecaca' : '#bae6fd'}`, 
            borderRadius: '6px', 
            padding: '1rem', 
            marginBottom: '1rem' 
          }}>
            <h3 style={{ margin: '0 0 0.5rem 0', color: '#000' }}>Pool Utilization</h3>
            <div style={{ fontSize: '14px', color: '#000' }}>
              <strong>{selectedPool}</strong>: {totalAllocated}h allocated of {poolHours}h available ({utilization}% utilization)
              {isOverAllocated && (
                <div style={{ color: '#dc2626', fontWeight: 'bold', marginTop: '0.5rem' }}>
                  ⚠️ OVER-ALLOCATED: {totalAllocated - poolHours}h over capacity
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{ marginBottom: '1rem' }}>
            <button
              onClick={handleDistributeEvenly}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '14px',
                borderRadius: '4px',
                border: '1px solid #4F8EF7',
                background: '#4F8EF7',
                color: 'white',
                cursor: 'pointer',
                marginRight: '0.5rem'
              }}
            >
              Distribute Evenly
            </button>
            <span style={{ fontSize: '12px', color: '#666' }}>
              Distributes 100% allocation evenly among active projects
            </span>
          </div>

          {/* Projects Table */}
          <div style={{ marginBottom: '2rem' }}>
            <h3 style={{ marginBottom: '1rem', color: '#000' }}>Concurrent Projects</h3>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e5e7eb' }}>
                  <th style={{ textAlign: 'left', padding: '0.5rem', color: '#000' }}>Project</th>
                  <th style={{ textAlign: 'left', padding: '0.5rem', color: '#000' }}>Status</th>
                  <th style={{ textAlign: 'center', padding: '0.5rem', color: '#000' }}>Active</th>
                  <th style={{ textAlign: 'center', padding: '0.5rem', color: '#000' }}>Current (%)</th>
                  <th style={{ textAlign: 'center', padding: '0.5rem', color: '#000' }}>New (%)</th>
                  <th style={{ textAlign: 'center', padding: '0.5rem', color: '#000' }}>Hours</th>
                </tr>
              </thead>
              <tbody>
                {concurrentProjects.map((cp) => {
                  // Calculate tooltip information similar to Gantt chart
                  const pool = pools.find(p => p.name === cp.project.pool);
                  const poolWeeklyHours = pool?.weeklyHours || 40;
                  const allocationPercent = cp.project.status?.toLowerCase() === 'complete' ? 0 : (cp.project.weeklyAllocation || 0);
                  const allocationHours = Math.round((allocationPercent / 100) * 40 * 10) / 10;
                  const estHoursLeft = Math.round((cp.project.estimatedHours * (1 - (cp.project.progress || 0) / 100)) * 10) / 10;
                  
                  return (
                    <tr 
                      key={cp.project.name} 
                      style={{ 
                        borderBottom: '1px solid #f3f4f6',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f0f9ff';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }}
                      title={`${cp.project.name}
${cp.project.status ? `Status: ${cp.project.status}` : ''}
${cp.project.notes ? `${cp.project.notes}` : ''}
Weekly Allocation: ${allocationPercent}% (${allocationHours}h)
Estimated Hours: ${estHoursLeft} of ${cp.project.estimatedHours}h
Pool: ${cp.project.pool} (${poolWeeklyHours}h/week)`}
                    >
                      <td style={{ padding: '0.5rem', color: '#000' }}>
                        <div 
                          style={{ 
                            fontWeight: 'bold', 
                            cursor: 'pointer',
                            textDecoration: 'underline',
                            color: '#4F8EF7'
                          }}
                          onClick={() => onEditProject(cp.project)}
                          title="Click to edit project"
                        >
                          {cp.project.name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#666' }}>{cp.project.sponsor}</div>
                      </td>
                      <td style={{ padding: '0.5rem', color: '#000' }}>
                        <span style={{ 
                          padding: '0.25rem 0.5rem', 
                          borderRadius: '4px', 
                          fontSize: '12px',
                          background: cp.project.status === 'Development' ? '#dbeafe' : 
                                     cp.project.status === 'UAT' ? '#dcfce7' :
                                     cp.project.status === 'Requirements' ? '#fef3c7' :
                                     cp.project.status === 'Effort Analysis' ? '#f3f4f6' : '#f3f4f6',
                          color: '#000'
                        }}>
                          {cp.project.status}
                        </span>
                      </td>
                      <td style={{ textAlign: 'center', padding: '0.5rem' }}>
                        <input
                          type="checkbox"
                          checked={cp.isActive}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleToggleActive(cp.project.name);
                          }}
                        />
                      </td>
                      <td style={{ textAlign: 'center', padding: '0.5rem', color: '#666' }}>
                        {cp.currentAllocation}%
                      </td>
                      <td style={{ textAlign: 'center', padding: '0.5rem' }}>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="5"
                          value={cp.newAllocation}
                          onChange={(e) => {
                            e.stopPropagation();
                            handleAllocationChange(cp.project.name, Number(e.target.value));
                          }}
                          disabled={!cp.isActive}
                          style={{
                            width: '60px',
                            padding: '0.25rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '4px',
                            textAlign: 'center',
                            background: cp.isActive ? '#3b3b3b' : '#f3f4f6'
                          }}
                        />
                      </td>
                      <td style={{ textAlign: 'center', padding: '0.5rem', color: '#000' }}>
                        {cp.isActive ? Math.round((cp.newAllocation / 100) * 40 * 10) / 10 : 0}h
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '1rem' }}>
            <button
              onClick={handleSave}
              disabled={isOverAllocated}
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: 16,
                borderRadius: 6,
                border: '1px solid #4F8EF7',
                background: isOverAllocated ? '#9ca3af' : '#4F8EF7',
                color: 'white',
                cursor: isOverAllocated ? 'not-allowed' : 'pointer',
                boxShadow: '0 1px 4px #0001',
              }}
            >
              {isOverAllocated ? 'Resolve Over-allocation' : 'Save Changes'}
            </button>
            <button 
              onClick={onCancel}
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: 16,
                borderRadius: 6,
                border: '1px solid #6b7280',
                background: 'white',
                color: '#6b7280',
                cursor: 'pointer',
                boxShadow: '0 1px 4px #0001',
              }}
            >
              Cancel
            </button>
          </div>
        </>
      )}

      {selectedPool && concurrentProjects.length === 0 && (
        <div style={{ 
          padding: '2rem', 
          textAlign: 'center', 
          color: '#666',
          background: '#f9fafb',
          borderRadius: '6px'
        }}>
          No active projects found for {selectedPool} in the current week.
        </div>
      )}
    </div>
  );
};

export default BulkUpdateForm; 