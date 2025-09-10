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

const ProjectForm: React.FC<ProjectFormProps> = ({ initialData, onSave, onCancel, pools, projects }) => {
  const [form, setForm] = useState<ProjectFormData>(initialForm);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

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
      
      {/* Project Name - Always first */}
      <label style={{ color: '#000' }}>
        Project Name*:
        <input name="name" value={form.name} onChange={handleChange} required />
        {errors.name && <span style={{ color: 'red' }}>{errors.name}</span>}
      </label>

      {/* Pool Selection - Affects available hours */}
      <label style={{ color: '#000' }}>
        Project Pool*:
        <select name="pool" value={form.pool} onChange={handleChange} required>
          <option value="">Select a pool...</option>
          {pools.map((pool) => (
            <option key={pool.name} value={pool.name}>
              {pool.name} ({pool.weeklyHours} hrs/week)
            </option>
          ))}
        </select>
        {errors.pool && <span style={{ color: 'red' }}>{errors.pool}</span>}
      </label>

      {/* Pool Information Display */}
      {selectedPool && (
        <div style={{ padding: '8px', backgroundColor: '#f0f9ff', borderRadius: '4px', fontSize: '14px', border: '1px solid #bae6fd' }}>
          <div style={{ fontWeight: 'bold', color: 'black' }}>Pool: {selectedPool.name} - {selectedPool.weeklyHours} hours/week</div>
          <div style={{ marginTop: '4px', color: '#666' }}>
            Standard Week: {selectedPool.standardWeekHours || 40} hours | Available: {selectedPool.weeklyHours - (selectedPool.supportHours || 0) - (selectedPool.meetingHours || 0)} hours/week
            {selectedPool.supportHours > 0 && <span style={{ marginLeft: '8px', color: '#dc2626' }}>(Support: {selectedPool.supportHours}h)</span>}
            {selectedPool.meetingHours > 0 && <span style={{ marginLeft: '8px', color: '#f59e0b' }}>(Meetings: {selectedPool.meetingHours}h)</span>}
          </div>
          {selectedPool.description && <div style={{ marginTop: '4px', color: '#666' }}>{selectedPool.description}</div>}
        </div>
      )}

      {/* Estimated Dev Hours - Required for calculations */}
      <label style={{ color: '#000' }}>
        Estimated Dev Hours*:
        <input type="number" name="estimatedHours" value={form.estimatedHours} onChange={handleChange} min={1} required />
        {errors.estimatedHours && <span style={{ color: 'red' }}>{errors.estimatedHours}</span>}
      </label>

      {/* Weekly Allocation - Affects date calculations */}
      <label style={{ color: '#000' }}>
        Weekly Allocation (% of {selectedPool?.standardWeekHours || 40}h week)*:
        <input
          type="number"
          name="weeklyAllocation"
          value={form.weeklyAllocation}
          onChange={handleChange}
          min={0}
          max={100}
          style={{ width: 80 }}
          required
        />
        <small style={{ color: '#666', fontSize: '12px', marginLeft: '8px' }}>
          Required for date auto-calculation
        </small>
        {errors.weeklyAllocation && <span style={{ color: 'red' }}>{errors.weeklyAllocation}</span>}
      </label>

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
          <label style={{ color: '#000', flex: '1', minWidth: '200px' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              marginBottom: '4px',
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
              <span style={{ fontWeight: 'bold' }}>Start Date</span>
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
            <input type="date" name="startDate" value={form.startDate} onChange={handleChange} style={{ width: '100%' }} />
            {errors.startDate && <span style={{ color: 'red' }}>{errors.startDate}</span>}
          </label>
          <label style={{ color: '#000', flex: '1', minWidth: '200px' }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px', 
              marginBottom: '4px',
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
              <span style={{ fontWeight: 'bold' }}>Target End Date</span>
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
            <input type="date" name="targetDate" value={form.targetDate} onChange={handleChange} style={{ width: '100%' }} />
            {errors.targetDate && <span style={{ color: 'red' }}>{errors.targetDate}</span>}
          </label>
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
      <label style={{ color: '#000' }}>
        Project Sponsor:
        <input name="sponsor" value={form.sponsor} onChange={handleChange} />
      </label>

      <label style={{ color: '#000' }}>
        Current Progress (%):
        <input type="number" name="progress" value={form.progress} onChange={handleChange} min={0} max={100} />
      </label>

      <label style={{ color: '#000' }}>
        Project Status:
        <select name="status" value={form.status} onChange={handleChange}>
          <option value="Not Started">Not Started</option>
          <option value="Planning">Planning</option>
          <option value="Development">Development</option>
          <option value="Testing">Testing</option>
          <option value="UAT">UAT</option>
          <option value="Complete">Complete</option>
          <option value="On Hold">On Hold</option>
        </select>
      </label>

      <label style={{ color: '#000' }}>
        Notes:
        <textarea 
          name="notes" 
          value={form.notes} 
          onChange={handleChange} 
          rows={4} 
          placeholder="Enter project notes, requirements, or additional details..."
          style={{ 
            width: '100%', 
            minHeight: '100px',
            padding: '12px',
            border: '2px solid #3b82f6',
            borderRadius: '6px',
            fontSize: '14px',
            fontFamily: 'inherit',
            resize: 'vertical',
            lineHeight: '1.5',
            backgroundColor: '#ffffff',
            color: '#000000'
          }} 
        />
      </label>
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