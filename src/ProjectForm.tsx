import React, { useState, useEffect, useMemo } from 'react';
import type { ProjectFormData, PoolData } from './types';

interface ProjectFormProps {
  initialData?: ProjectFormData;
  onSave?: (data: ProjectFormData) => void;
  onCancel?: () => void;
  pools: PoolData[];
  projects?: ProjectFormData[]; // Add projects to calculate over-allocation
}

const initialForm: ProjectFormData = {
  name: '',
  sponsor: '',
  pool: '',
  startDate: '',
  targetDate: '',
  estimatedHours: 0,
  progress: 0,
  status: 'Not Started',
  weeklyAllocation: 0,
  notes: '',
};

// Standardized form styles
const formStyles = {
  input: {
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '14px',
    backgroundColor: 'white',
    color: '#000',
    width: '100%',
    fontFamily: 'inherit',
    textAlign: 'left' as const,
    marginLeft: '0',
    marginRight: '0'
  },
  inputShort: {
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '14px',
    backgroundColor: 'white',
    color: '#000',
    width: '120px',
    fontFamily: 'inherit',
    textAlign: 'left' as const,
    marginLeft: '0',
    marginRight: '0'
  },
  inputMedium: {
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '14px',
    backgroundColor: 'white',
    color: '#000',
    width: '200px',
    fontFamily: 'inherit',
    textAlign: 'left' as const
  },
  inputDate: {
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '14px',
    backgroundColor: 'white',
    color: '#000',
    width: '200px',
    fontFamily: 'inherit',
    textAlign: 'left' as const,
    // Improve date picker icon visibility
    backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%23374151'%3e%3cpath fill-rule='evenodd' d='M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z' clip-rule='evenodd'/%3e%3c/svg%3e")`,
    backgroundRepeat: 'no-repeat',
    backgroundPosition: 'right 0.5rem center',
    backgroundSize: '1rem 1rem',
    paddingRight: '2.5rem'
  },
  select: {
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '14px',
    backgroundColor: 'white',
    color: '#000',
    width: '100%',
    fontFamily: 'inherit',
    textAlign: 'left' as const,
    marginLeft: '0',
    marginRight: '0'
  },
  selectShort: {
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '14px',
    backgroundColor: 'white',
    color: '#000',
    width: '120px',
    fontFamily: 'inherit'
  },
  selectMedium: {
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '14px',
    backgroundColor: 'white',
    color: '#000',
    width: '200px',
    fontFamily: 'inherit'
  },
  textarea: {
    padding: '0.75rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '14px',
    backgroundColor: 'white',
    color: '#000',
    width: '100%',
    fontFamily: 'inherit',
    resize: 'vertical' as const,
    minHeight: '80px',
    textAlign: 'left' as const
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: '600',
    color: '#374151',
    marginBottom: '0.5rem',
    textAlign: 'left' as const,
    width: '100%',
    clear: 'both' as const,
    float: 'none' as const
  }
};

const ProjectForm: React.FC<ProjectFormProps> = ({ initialData, onSave, onCancel, pools, projects }) => {
  const [form, setForm] = useState<ProjectFormData>(initialForm);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [selectedWeekForAllocation, setSelectedWeekForAllocation] = useState<string>('');
  const [weeklyAllocationInput, setWeeklyAllocationInput] = useState<string>('');

  // Helper function to get the correct allocation for a specific week
  const getWeeklyAllocation = (project: ProjectFormData, weekStart: Date): number => {
    const weekKey = weekStart.toISOString().split('T')[0];
    if (project.weeklyAllocations && project.weeklyAllocations[weekKey] !== undefined) {
      return project.weeklyAllocations[weekKey];
    }
    return project.weeklyAllocation || 0;
  };

  const selectedPool = useMemo(() => pools.find(p => p.name === form.pool), [pools, form.pool]);

  // Calculate over-allocation warnings
  const getOverAllocationWarning = () => {
    if (!form.pool || !form.weeklyAllocation || form.weeklyAllocation <= 0) return null;
    
    if (!selectedPool) return null;

    // Only apply over-allocation logic to Development or Testing status projects
    if (form.status !== 'Development' && form.status !== 'Testing') return null;

    // Calculate what the project would contribute to pool utilization
    const projectHoursPerWeek = (form.weeklyAllocation / 100) * (selectedPool.standardWeekHours || 40);
    
    // Calculate current pool utilization from other projects (excluding this project if editing)
    const otherProjectsInPool = (projects || []).filter((p: ProjectFormData) => 
      p.pool === form.pool && 
      p.name !== form.name && // Exclude current project if editing
      p.status !== 'Complete' && // Exclude completed projects
      (p.weeklyAllocation || 0) > 0
    );
    
    const otherProjectsHours = otherProjectsInPool.reduce((total: number, p: ProjectFormData) => {
      return total + (((p.weeklyAllocation || 0) / 100) * (selectedPool.standardWeekHours || 40));
    }, 0);
    
    // Calculate total allocation if this project is added/updated
    const totalAllocation = otherProjectsHours + projectHoursPerWeek;
    
    // Calculate available hours in the pool
    const reservedHours = (selectedPool.supportHours || 0) + (selectedPool.meetingHours || 0);
    const availableHours = selectedPool.weeklyHours - reservedHours;
    
    // Check if this project would cause over-allocation
    if (totalAllocation > availableHours) {
      return {
        severity: 'high',
        message: `⚠️ This project would cause OVER-ALLOCATION in the pool!`,
        details: `Total allocation: ${totalAllocation.toFixed(1)}h/week, Available: ${availableHours.toFixed(1)}h/week. This project adds ${projectHoursPerWeek.toFixed(1)}h/week.`,
        currentProjects: otherProjectsInPool.length
      };
    }
    
    // Warning for high allocation
    const utilizationPercent = (totalAllocation / availableHours) * 100;
    if (utilizationPercent > 80) {
      return {
        severity: 'medium',
        message: `⚠️ This project would use ${utilizationPercent.toFixed(1)}% of available pool hours.`,
        details: `Total allocation: ${totalAllocation.toFixed(1)}h/week, Available: ${availableHours.toFixed(1)}h/week. Consider reducing allocation.`,
        currentProjects: otherProjectsInPool.length
      };
    }
    
    return null;
  };

  const overAllocationWarning = useMemo(() => getOverAllocationWarning(), [form.pool, form.weeklyAllocation, form.estimatedHours, form.name, projects, pools]);

  // Calculate dynamic duration based on estimated hours and weekly allocation
  const calculatedDuration = useMemo(() => {
    if (!form.estimatedHours || !form.weeklyAllocation || form.weeklyAllocation <= 0) return null;
    
    const standardWeekHours = selectedPool?.standardWeekHours || 40;
    const availableHoursPerWeek = (form.weeklyAllocation / 100) * standardWeekHours;
    
    if (availableHoursPerWeek <= 0) return null;
    
    // Calculate weeks needed (can be fractional)
    const weeksNeeded = form.estimatedHours / availableHoursPerWeek;
    
    // Calculate work days needed (assuming 5 work days per week)
    const workDaysNeeded = Math.ceil(weeksNeeded * 5);
    
    // Calculate calendar weeks (rounded up for planning purposes)
    const calendarWeeksNeeded = Math.ceil(weeksNeeded);
    
    return {
      workDays: workDaysNeeded,
      weeks: weeksNeeded,
      calendarWeeks: calendarWeeksNeeded,
      hoursPerWeek: availableHoursPerWeek,
      estimatedWeeks: weeksNeeded.toFixed(1)
    };
  }, [form.estimatedHours, form.weeklyAllocation, form.pool, pools]);

  useEffect(() => {
    if (initialData) {
      setForm({
        ...initialForm,
        ...initialData,
        // Ensure all optional fields have default values
        status: initialData.status || 'Not Started',
        weeklyAllocation: initialData.weeklyAllocation ?? 0,
        notes: initialData.notes || '',
      });
    } else {
      setForm(initialForm);
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    const newForm = {
      ...form,
      [name]: name === 'estimatedHours' || name === 'progress' || name === 'weeklyAllocation' ? Number(value) : value,
    };

    // Auto-populate logic for dates based on estimated hours (excluding weekends)
    if (name === 'startDate' && value && !form.targetDate && form.estimatedHours > 0 && (form.weeklyAllocation || 0) > 0) {
      // Calculate end date based on start date, estimated hours, and weekly allocation
      const startDate = new Date(value);
      const availableHoursPerWeek = ((form.weeklyAllocation || 0) / 100) * (selectedPool?.standardWeekHours || 40);
      
      // Calculate weeks needed (can be fractional)
      const weeksNeeded = form.estimatedHours / availableHoursPerWeek;
      
      // Convert weeks to work days (assuming 5 work days per week)
      const workDaysNeeded = Math.ceil(weeksNeeded * 5);
      
      const endDate = addWorkDays(startDate, workDaysNeeded);
      newForm.targetDate = endDate.toISOString().split('T')[0];
    } else if (name === 'targetDate' && value && !form.startDate && form.estimatedHours > 0 && (form.weeklyAllocation || 0) > 0) {
      // Calculate start date based on end date, estimated hours, and weekly allocation
      const endDate = new Date(value);
      const availableHoursPerWeek = ((form.weeklyAllocation || 0) / 100) * (selectedPool?.standardWeekHours || 40);
      
      // Calculate weeks needed (can be fractional)
      const weeksNeeded = form.estimatedHours / availableHoursPerWeek;
      
      // Convert weeks to work days (assuming 5 work days per week)
      const workDaysNeeded = Math.ceil(weeksNeeded * 5);
      
      const startDate = subtractWorkDays(endDate, workDaysNeeded);
      newForm.startDate = startDate.toISOString().split('T')[0];
    } else if (name === 'weeklyAllocation' && form.startDate && form.estimatedHours > 0 && Number(value) > 0) {
      // Auto-recalculate target end date when weekly allocation changes
      const startDate = new Date(form.startDate);
      const availableHoursPerWeek = (Number(value) / 100) * (selectedPool?.standardWeekHours || 40);
      
      // Calculate weeks needed (can be fractional)
      const weeksNeeded = form.estimatedHours / availableHoursPerWeek;
      
      // Convert weeks to work days (assuming 5 work days per week)
      const workDaysNeeded = Math.ceil(weeksNeeded * 5);
      
      const endDate = addWorkDays(startDate, workDaysNeeded);
      newForm.targetDate = endDate.toISOString().split('T')[0];
      newForm.autoRecalculated = true; // Flag to show recalculation note
    } else if (name === 'targetDate') {
      // Clear auto-recalculated flag when user manually changes target date
      newForm.autoRecalculated = false;
    }

    setForm(newForm);
  };

  // Helper function to add work days (excluding weekends)
  const addWorkDays = (startDate: Date, workDays: number): Date => {
    if (workDays <= 0) return new Date(startDate);
    
    const result = new Date(startDate);
    let addedDays = 0;
    const currentDate = new Date(startDate);
    
    while (addedDays < workDays) {
      currentDate.setDate(currentDate.getDate() + 1);
      // Skip weekends (Saturday = 6, Sunday = 0)
      if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
        addedDays++;
      }
    }
    
    // Set the result to the final calculated date
    result.setTime(currentDate.getTime());
    return result;
  };

  // Helper function to subtract work days (excluding weekends)
  const subtractWorkDays = (endDate: Date, workDays: number): Date => {
    if (workDays <= 0) return new Date(endDate);
    
    const result = new Date(endDate);
    let subtractedDays = 0;
    const currentDate = new Date(endDate);
    
    while (subtractedDays < workDays) {
      currentDate.setDate(currentDate.getDate() - 1);
      // Skip weekends (Saturday = 6, Sunday = 0)
      if (currentDate.getDay() !== 0 && currentDate.getDay() !== 6) {
        subtractedDays++;
      }
    }
    
    // Set the result to the final calculated date
    result.setTime(currentDate.getTime());
    return result;
  };

  // Helper function to count work days between two dates
  const countWorkDays = (startDate: Date, endDate: Date): number => {
    if (startDate > endDate) return 0; // Invalid date range
    
    let workDays = 0;
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      // Only count weekdays (Monday = 1, Tuesday = 2, ..., Friday = 5)
      if (currentDate.getDay() >= 1 && currentDate.getDay() <= 5) {
        workDays++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return workDays;
  };

  // Helper function to get available weeks for allocation
  const getAvailableWeeks = () => {
    if (!form.startDate || !form.targetDate) return [];
    
    const startDate = new Date(form.startDate);
    const endDate = new Date(form.targetDate);
    const weeks = [];
    
    // Get week start (Sunday)
    const getWeekStart = (date: Date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - d.getDay());
      return d;
    };
    
    const current = getWeekStart(startDate);
    while (current <= endDate) {
      const weekEnd = new Date(current);
      weekEnd.setDate(weekEnd.getDate() + 6);
      weeks.push({ start: new Date(current), end: weekEnd });
      current.setDate(current.getDate() + 7);
    }
    
    return weeks;
  };

  // Handle adding a weekly allocation
  // Pre-populate weekly allocation input when week is selected
  useEffect(() => {
    if (selectedWeekForAllocation) {
      // Get the current allocation for the selected week
      const currentAllocation = getWeeklyAllocation(form, new Date(selectedWeekForAllocation));
      setWeeklyAllocationInput(currentAllocation.toString());
    } else {
      setWeeklyAllocationInput('');
    }
  }, [selectedWeekForAllocation, form.weeklyAllocation, form.weeklyAllocations]);

  const handleAddWeeklyAllocation = () => {
    if (!selectedWeekForAllocation || !weeklyAllocationInput) return;
    
    const allocation = parseFloat(weeklyAllocationInput);
    if (isNaN(allocation) || allocation < 0 || allocation > 100) return;
    
    setForm(prev => ({
      ...prev,
      weeklyAllocations: {
        ...prev.weeklyAllocations,
        [selectedWeekForAllocation]: allocation
      }
    }));
    
    // Clear inputs
    setSelectedWeekForAllocation('');
    setWeeklyAllocationInput('');
  };

  // Handle removing a weekly allocation
  const handleRemoveWeeklyAllocation = (weekStart: string) => {
    setForm(prev => {
      const newAllocations = { ...prev.weeklyAllocations };
      delete newAllocations[weekStart];
      return {
        ...prev,
        weeklyAllocations: newAllocations
      };
    });
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!form.name) newErrors.name = 'Project name is required';
    if (!form.pool) newErrors.pool = 'Project pool is required';
    if (!form.estimatedHours || form.estimatedHours <= 0) newErrors.estimatedHours = 'Estimated hours must be greater than 0';
    if (!form.weeklyAllocation || form.weeklyAllocation <= 0) newErrors.weeklyAllocation = 'Weekly allocation is required for date calculations';
    
    // At least one date must be provided
    if (!form.startDate && !form.targetDate) {
      newErrors.startDate = 'Either start date or end date is required';
      newErrors.targetDate = 'Either start date or end date is required';
    }
    
    // Validate date order if both dates are provided
    if (form.startDate && form.targetDate) {
      const startDate = new Date(form.startDate);
      const endDate = new Date(form.targetDate);
      if (startDate > endDate) {
        newErrors.startDate = 'Start date cannot be after end date';
        newErrors.targetDate = 'End date cannot be before start date';
      }
    }
    
    return newErrors;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const validationErrors = validate();
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length === 0) {
      if (onSave) onSave(form);
      setForm(initialForm);
    }
  };

  const handleCancel = () => {
    if (onCancel) onCancel();
  };

  return (
    <form onSubmit={handleSubmit} style={{ 
      padding: '2rem', 
      display: 'flex', 
      flexDirection: 'column', 
      gap: '1rem', 
      alignItems: 'flex-start', 
      maxWidth: 600,
      background: '#f8f9fa',
      borderRadius: '8px',
      border: '1px solid #e9ecef'
    }}>
      <h2 style={{ alignSelf: 'flex-start', color: '#000' }}>{initialData ? 'Edit Project' : 'Add New Project'}</h2>
      
      {/* Project Name and Pool - Side by side */}
      <div style={{ display: 'flex', gap: '5rem', marginBottom: '1rem' }}>
        <div style={{ flex: '1' }}>
          <label style={{ ...formStyles.label, display: 'block', marginBottom: '0.5rem' }}>
            Project Name*
          </label>
          <input name="name" value={form.name} onChange={handleChange} required style={formStyles.input} />
          {errors.name && <span style={{ color: 'red', fontSize: '12px', marginTop: '0.25rem', display: 'block' }}>{errors.name}</span>}
        </div>
        <div style={{ flex: '1' }}>
          <label style={{ ...formStyles.label, display: 'block', marginBottom: '0.5rem' }}>
            Project Pool*
          </label>
          <select name="pool" value={form.pool} onChange={handleChange} required style={formStyles.select}>
            <option value="">Select a pool...</option>
            {pools.map((pool) => (
              <option key={pool.name} value={pool.name}>
                {pool.name} ({pool.weeklyHours} hrs/week)
              </option>
            ))}
          </select>
          {errors.pool && <span style={{ color: 'red', fontSize: '12px', marginTop: '0.25rem', display: 'block' }}>{errors.pool}</span>}
        </div>
      </div>

      {/* Pool Information Display - Banner spanning both columns */}
      {selectedPool && (
        <div style={{ 
          padding: '12px', 
          backgroundColor: '#f0f9ff', 
          borderRadius: '6px', 
          fontSize: '14px', 
          border: '1px solid #bae6fd',
          marginBottom: '1rem'
        }}>
          <div style={{ fontWeight: 'bold', color: 'black', marginBottom: '4px' }}>
            Pool: {selectedPool.name} - {selectedPool.weeklyHours} hours/week
          </div>
          <div style={{ color: '#666', fontSize: '13px' }}>
            Standard Week: {selectedPool.standardWeekHours || 40} hours | Available: {selectedPool.weeklyHours - (selectedPool.supportHours || 0) - (selectedPool.meetingHours || 0)} hours/week
            {selectedPool.supportHours > 0 && <span style={{ marginLeft: '8px', color: '#dc2626' }}>(Support: {selectedPool.supportHours}h)</span>}
            {selectedPool.meetingHours > 0 && <span style={{ marginLeft: '8px', color: '#f59e0b' }}>(Meetings: {selectedPool.meetingHours}h)</span>}
          </div>
          {selectedPool.description && <div style={{ marginTop: '6px', color: '#666', fontSize: '13px' }}>{selectedPool.description}</div>}
        </div>
      )}

      {/* Estimated Dev Hours and Weekly Allocation - Side by side */}
      <div style={{ display: 'flex', gap: '5rem', marginBottom: '1rem' }}>
        <div style={{ flex: '1' }}>
          <label style={{ ...formStyles.label, display: 'block', marginBottom: '0.5rem' }}>
            Estimated Dev Hours*
          </label>
          <input type="number" name="estimatedHours" value={form.estimatedHours} onChange={handleChange} min={1} required style={formStyles.inputShort} />
          {errors.estimatedHours && <span style={{ color: 'red', fontSize: '12px', marginTop: '0.25rem', display: 'block' }}>{errors.estimatedHours}</span>}
        </div>
        <div style={{ flex: '1' }}>
          <label style={{ ...formStyles.label, display: 'block', marginBottom: '0.5rem' }}>
            Weekly Allocation %*
            <span 
              style={{ 
                marginLeft: '4px', 
                cursor: 'help',
                color: '#6b7280',
                fontSize: '12px'
              }} 
              title={`% of ${selectedPool?.standardWeekHours || 40}h week`}
            >
              ℹ️
            </span>
          </label>
          <input
            type="number"
            name="weeklyAllocation"
            value={form.weeklyAllocation}
            onChange={handleChange}
            min={0}
            max={100}
            style={formStyles.inputShort}
            required
          />
          <small style={{ color: '#666', fontSize: '12px', marginTop: '0.25rem', display: 'block' }}>
            Required for date auto-calculation
          </small>
          {errors.weeklyAllocation && <span style={{ color: 'red', fontSize: '12px', marginTop: '0.25rem', display: 'block' }}>{errors.weeklyAllocation}</span>}
        </div>
      </div>

      {/* Dynamic Duration Calculation */}
      {calculatedDuration && (
        <div style={{ 
          padding: '12px', 
          backgroundColor: '#f0f9ff', 
          borderRadius: '6px', 
          fontSize: '14px', 
          border: '1px solid #0ea5e9',
          width: '100%',
          boxSizing: 'border-box',
          marginTop: '8px'
        }}>
          <div style={{ 
            fontWeight: 'bold', 
            color: '#0c4a6e', 
            marginBottom: '8px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            ⏱️ <span>Project Duration Calculator</span>
          </div>
          <div style={{ color: '#0c4a6e', fontSize: '13px' }}>
            <strong>Estimated Duration:</strong> {calculatedDuration.workDays} work days ({calculatedDuration.estimatedWeeks} weeks)
            <br />
            <strong>Calendar Weeks:</strong> {calculatedDuration.calendarWeeks} weeks (rounded up for planning)
            <br />
            <strong>Weekly Commitment:</strong> {calculatedDuration.hoursPerWeek.toFixed(1)} hours per week
            <br />
            <strong>Total Project Hours:</strong> {form.estimatedHours} hours
            {form.pool && (
              <>
                <br />
                <strong>Pool Standard Week:</strong> {selectedPool?.standardWeekHours || 40} hours
              </>
            )}
          </div>
        </div>
      )}

      {/* Over-allocation Warning */}
      {overAllocationWarning && (
        <div style={{ 
          padding: '12px', 
          backgroundColor: overAllocationWarning.severity === 'high' ? '#fef2f2' : '#fffbeb',
          borderRadius: '6px', 
          fontSize: '14px', 
          border: `2px solid ${overAllocationWarning.severity === 'high' ? '#dc2626' : '#f59e0b'}`,
          width: '100%',
          boxSizing: 'border-box',
          marginTop: '8px'
        }}>
          <div style={{ 
            fontWeight: 'bold', 
            color: overAllocationWarning.severity === 'high' ? '#dc2626' : '#92400e',
            marginBottom: '8px' 
          }}>
            {overAllocationWarning.message}
          </div>
          <div style={{ 
            color: overAllocationWarning.severity === 'high' ? '#dc2626' : '#92400e', 
            fontSize: '13px',
            marginBottom: '8px'
          }}>
            {overAllocationWarning.details}
          </div>
          {overAllocationWarning.currentProjects > 0 && (
            <div style={{ 
              color: '#666', 
              fontSize: '12px',
              fontStyle: 'italic'
            }}>
              ℹ️ There are {overAllocationWarning.currentProjects} other active project(s) in this pool.
            </div>
          )}
        </div>
      )}

      {/* Date Section with Auto-calculation Info */}
      <div style={{ 
        padding: '12px', 
        backgroundColor: '#fef3c7', 
        borderRadius: '6px', 
        fontSize: '14px', 
        border: '1px solid #f59e0b',
        width: '100%',
        boxSizing: 'border-box'
      }}>
        <div style={{ fontWeight: 'bold', color: '#92400e', marginBottom: '8px' }}>
          📅 Date Planning (Auto-calculated)
        </div>
        <div style={{ color: '#92400e', fontSize: '13px', marginBottom: '8px' }}>
          Enter either start date OR end date - the other will be automatically calculated based on your estimated hours and weekly allocation.
          <br />
          <strong>📅 Note:</strong> Date calculations exclude weekends and use {(selectedPool?.standardWeekHours || 40)}-hour work days ({(selectedPool?.standardWeekHours || 40)}h/week).
          <br />
          <strong>💡 Tip:</strong> Click on the date headings (with 🔄 Recalc) to force recalculation when you change hours or allocation values.
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              marginBottom: '0.5rem',
              cursor: 'pointer'
            }} onClick={() => {
              if (form.estimatedHours > 0 && (form.weeklyAllocation || 0) > 0 && form.targetDate) {
                // Recalculate start date based on end date using consistent logic
                const endDate = new Date(form.targetDate);
                const availableHoursPerWeek = ((form.weeklyAllocation || 0) / 100) * (selectedPool?.standardWeekHours || 40);
                
                // Calculate weeks needed (can be fractional)
                const weeksNeeded = form.estimatedHours / availableHoursPerWeek;
                
                // Convert weeks to work days (assuming 5 work days per week)
                const workDaysNeeded = Math.ceil(weeksNeeded * 5);
                
                const startDate = subtractWorkDays(endDate, workDaysNeeded);
                
                setForm(prev => ({
                  ...prev,
                  startDate: startDate.toISOString().split('T')[0]
                }));
              }
            }}>
              <label style={formStyles.label}>
                Start Date
              </label>
              {form.estimatedHours > 0 && (form.weeklyAllocation || 0) > 0 && form.targetDate && (
                <span style={{ 
                  fontSize: '12px', 
                  color: '#3b82f6', 
                  backgroundColor: '#dbeafe', 
                  padding: '2px 6px', 
                  borderRadius: '4px',
                  cursor: 'pointer'
                }} title="Click to recalculate start date">
                  🔄 Recalc
                </span>
              )}
            </div>
            <input type="date" name="startDate" value={form.startDate} onChange={handleChange} style={formStyles.inputDate} />
            {errors.startDate && <span style={{ color: 'red', fontSize: '12px', marginTop: '0.25rem', display: 'block' }}>{errors.startDate}</span>}
          </div>
          <div style={{ flex: '1', minWidth: '200px' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              marginBottom: '0.5rem',
              cursor: 'pointer'
            }} onClick={() => {
              if (form.estimatedHours > 0 && (form.weeklyAllocation || 0) > 0 && form.startDate) {
                // Recalculate end date based on start date using consistent logic
                const startDate = new Date(form.startDate);
                const availableHoursPerWeek = ((form.weeklyAllocation || 0) / 100) * (selectedPool?.standardWeekHours || 40);
                
                // Calculate weeks needed (can be fractional)
                const weeksNeeded = form.estimatedHours / availableHoursPerWeek;
                
                // Convert weeks to work days (assuming 5 work days per week)
                const workDaysNeeded = Math.ceil(weeksNeeded * 5);
                
                const endDate = addWorkDays(startDate, workDaysNeeded);
                
                setForm(prev => ({
                  ...prev,
                  targetDate: endDate.toISOString().split('T')[0]
                }));
              }
            }}>
              <label style={formStyles.label}>
                Target End Date
              </label>
              {form.estimatedHours > 0 && (form.weeklyAllocation || 0) > 0 && form.startDate && (
                <span style={{ 
                  fontSize: '12px', 
                  color: '#3b82f6', 
                  backgroundColor: '#dbeafe', 
                  padding: '2px 6px', 
                  borderRadius: '4px',
                  cursor: 'pointer'
                }} title="Click to recalculate end date">
                  🔄 Recalc
                </span>
              )}
              {form.autoRecalculated && (
                <span style={{ 
                  fontSize: '11px', 
                  color: '#059669', 
                  backgroundColor: '#d1fae5', 
                  padding: '2px 6px', 
                  borderRadius: '4px',
                  marginLeft: '8px'
                }} title="Target end date was automatically recalculated based on weekly allocation change">
                  ✓ Auto-calculated
                </span>
              )}
            </div>
            <input type="date" name="targetDate" value={form.targetDate} onChange={handleChange} style={formStyles.inputDate} />
            {errors.targetDate && <span style={{ color: 'red', fontSize: '12px', marginTop: '0.25rem', display: 'block' }}>{errors.targetDate}</span>}
          </div>
        </div>
        
        {/* Show calculated duration if both dates are set */}
        {form.startDate && form.targetDate && form.estimatedHours > 0 && (form.weeklyAllocation || 0) > 0 && (
          <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#ecfdf5', borderRadius: '4px', border: '1px solid #10b981' }}>
            <div style={{ color: '#065f46', fontSize: '13px' }}>
              <strong>Actual Duration (from dates):</strong> {countWorkDays(new Date(form.startDate), new Date(form.targetDate))} work days
              <br />
              <strong>Weekly Allocation:</strong> {(form.weeklyAllocation || 0)}% ({Math.round(((form.weeklyAllocation || 0) / 100) * (selectedPool?.standardWeekHours || 40) * 10) / 10}h per week)
              <br />
              <strong>Total Project Hours:</strong> {form.estimatedHours}h
              {calculatedDuration && (
                <>
                  <br />
                  <strong>Calculated vs Actual:</strong> {calculatedDuration.workDays} calculated vs {countWorkDays(new Date(form.startDate), new Date(form.targetDate))} actual work days
                  {Math.abs(calculatedDuration.workDays - countWorkDays(new Date(form.startDate), new Date(form.targetDate))) > 1 && (
                    <span style={{ color: '#dc2626', fontWeight: 'bold' }}>
                      ⚠️ Duration mismatch detected!
                    </span>
                  )}
                </>
              )}
            </div>
          </div>
        )}
        
        {/* Show warning if dates are in wrong order */}
        {form.startDate && form.targetDate && new Date(form.startDate) > new Date(form.targetDate) && (
          <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#fef2f2', borderRadius: '4px', border: '1px solid #fecaca' }}>
            <div style={{ color: '#dc2626', fontSize: '13px' }}>
              ⚠️ <strong>Date Order Issue:</strong> Start date is after end date. Please fix the date order or use the recalc buttons to recalculate dates.
            </div>
          </div>
        )}
      </div>

      {/* Other Project Details */}
      <div>
        <label style={formStyles.label}>
          Project Sponsor
        </label>
        <input name="sponsor" value={form.sponsor} onChange={handleChange} style={formStyles.input} />
      </div>

      <div>
        <label style={formStyles.label}>
          Current Progress (%)
        </label>
        <input type="number" name="progress" value={form.progress} onChange={handleChange} min={0} max={100} style={formStyles.inputShort} />
      </div>

      <div>
        <label style={formStyles.label}>
          Project Status
        </label>
        <select name="status" value={form.status} onChange={handleChange} style={formStyles.selectMedium}>
          <option value="Not Started">Not Started</option>
          <option value="Planning">Planning</option>
          <option value="Development">Development</option>
          <option value="Testing">Testing</option>
          <option value="UAT">UAT</option>
          <option value="Complete">Complete</option>
          <option value="On Hold">On Hold</option>
        </select>
      </div>

      {/* Weekly Allocations Section */}
      <div style={{ marginTop: '1rem', padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '6px', border: '1px solid #e9ecef' }}>
        <h4 style={{ margin: '0 0 1rem 0', color: '#000', fontSize: '16px' }}>
          Weekly Allocations (Optional)
        </h4>
        <div style={{ fontSize: '13px', color: '#666', marginBottom: '1rem' }}>
          Set specific allocation percentages for individual weeks. If not set, the default weekly allocation above will be used.
        </div>
        
        {/* Week selector and allocation input */}
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginBottom: '1rem' }}>
          <div style={{ flex: 1 }}>
            <label style={formStyles.label}>
              Week
            </label>
            <select 
              value={selectedWeekForAllocation || ''} 
              onChange={(e) => setSelectedWeekForAllocation(e.target.value)}
              style={formStyles.select}
            >
              <option value="">Select a week...</option>
              {getAvailableWeeks().map((week, index) => (
                <option key={index} value={week.start.toISOString().split('T')[0]}>
                  Week of {week.start.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                  })} - {week.end.toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={formStyles.label}>
              Allocation (%)
            </label>
            <input 
              type="number" 
              value={weeklyAllocationInput || ''} 
              onChange={(e) => setWeeklyAllocationInput(e.target.value)}
              min={0} 
              max={100} 
              step={1}
              style={formStyles.inputShort}
              placeholder="Enter %"
            />
          </div>
          <button 
            type="button"
            onClick={handleAddWeeklyAllocation}
            disabled={!selectedWeekForAllocation || !weeklyAllocationInput}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '14px',
              borderRadius: '4px',
              border: '1px solid #3b82f6',
              background: '#3b82f6',
              color: 'white',
              cursor: 'pointer',
              opacity: (!selectedWeekForAllocation || !weeklyAllocationInput) ? 0.5 : 1
            }}
          >
            Add
          </button>
        </div>
        
        {/* Display current weekly allocations */}
        {form.weeklyAllocations && Object.keys(form.weeklyAllocations).length > 0 && (
          <div>
            <div style={{ fontSize: '12px', fontWeight: 'bold', marginBottom: '0.5rem', color: '#000' }}>
              Current Weekly Allocations:
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {Object.entries(form.weeklyAllocations).map(([weekStart, allocation]) => {
                const weekDate = new Date(weekStart);
                const weekEnd = new Date(weekDate);
                weekEnd.setDate(weekEnd.getDate() + 6);
                return (
                  <div 
                    key={weekStart}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      padding: '0.25rem 0.5rem',
                      backgroundColor: '#e0f2fe',
                      borderRadius: '4px',
                      border: '1px solid #bae6fd',
                      fontSize: '12px'
                    }}
                  >
                    <span style={{ color: '#000' }}>
                      {weekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - {weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}: {allocation}%
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveWeeklyAllocation(weekStart)}
                      style={{
                        background: 'none',
                        border: 'none',
                        color: '#dc2626',
                        cursor: 'pointer',
                        fontSize: '14px',
                        padding: '0'
                      }}
                      title="Remove this allocation"
                    >
                      ×
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <div>
        <label style={formStyles.label}>
          Notes
        </label>
        <textarea 
          name="notes" 
          value={form.notes} 
          onChange={handleChange} 
          rows={4} 
          placeholder="Enter project notes, requirements, or additional details..."
          style={formStyles.textarea}
        />
      </div>
      <div style={{ display: 'flex', gap: '1rem', alignSelf: 'flex-start' }}>
        <button type="submit">{initialData ? 'Update Project' : 'Save Project'}</button>
        <button 
          type="button" 
          onClick={handleCancel}
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
    </form>
  );
};

export default ProjectForm; 