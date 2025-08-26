import React, { useState, useEffect } from 'react';
import type { ProjectFormData, PoolData } from './types';

interface ProjectFormProps {
  initialData?: ProjectFormData;
  onSave?: (data: ProjectFormData) => void;
  onCancel?: () => void;
  pools: PoolData[];
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

const ProjectForm: React.FC<ProjectFormProps> = ({ initialData, onSave, onCancel, pools }) => {
  const [form, setForm] = useState<ProjectFormData>(initialForm);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

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
      const availableHoursPerWeek = ((form.weeklyAllocation || 0) / 100) * (selectedPool?.standardWeekHours || 40); // Convert percentage to hours
      const workDaysNeeded = Math.ceil(form.estimatedHours / availableHoursPerWeek);
      const endDate = addWorkDays(startDate, workDaysNeeded);
      newForm.targetDate = endDate.toISOString().split('T')[0];
    } else if (name === 'targetDate' && value && !form.startDate && form.estimatedHours > 0 && (form.weeklyAllocation || 0) > 0) {
      // Calculate start date based on end date, estimated hours, and weekly allocation
      const endDate = new Date(value);
      const availableHoursPerWeek = ((form.weeklyAllocation || 0) / 100) * (selectedPool?.standardWeekHours || 40); // Convert percentage to hours
      const workDaysNeeded = Math.ceil(form.estimatedHours / availableHoursPerWeek);
      const startDate = subtractWorkDays(endDate, workDaysNeeded);
      newForm.startDate = startDate.toISOString().split('T')[0];
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

  const selectedPool = pools.find(p => p.name === form.pool);

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

      {/* Estimated Hours - Required for calculations */}
      <label style={{ color: '#000' }}>
        Estimated Hours*:
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
                // Recalculate start date based on end date
                const endDate = new Date(form.targetDate);
                const availableHoursPerWeek = ((form.weeklyAllocation || 0) / 100) * (selectedPool?.standardWeekHours || 40);
                const workDaysNeeded = Math.ceil(form.estimatedHours / availableHoursPerWeek);
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
                // Recalculate end date based on start date
                const startDate = new Date(form.startDate);
                const availableHoursPerWeek = ((form.weeklyAllocation || 0) / 100) * (selectedPool?.standardWeekHours || 40);
                const workDaysNeeded = Math.ceil(form.estimatedHours / availableHoursPerWeek);
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
            </div>
            <input type="date" name="targetDate" value={form.targetDate} onChange={handleChange} style={{ width: '100%' }} />
            {errors.targetDate && <span style={{ color: 'red' }}>{errors.targetDate}</span>}
          </label>
        </div>
        
        {/* Show calculated duration if both dates are set */}
        {form.startDate && form.targetDate && form.estimatedHours > 0 && (form.weeklyAllocation || 0) > 0 && (
          <div style={{ marginTop: '8px', padding: '8px', backgroundColor: '#ecfdf5', borderRadius: '4px', border: '1px solid #10b981' }}>
            <div style={{ color: '#065f46', fontSize: '13px' }}>
              <strong>Calculated Duration:</strong> {countWorkDays(new Date(form.startDate), new Date(form.targetDate))} work days
              <br />
              <strong>Weekly Allocation:</strong> {(form.weeklyAllocation || 0)}% ({Math.round(((form.weeklyAllocation || 0) / 100) * (selectedPool?.standardWeekHours || 40) * 10) / 10}h per week)
              <br />
              <strong>Total Project Hours:</strong> {form.estimatedHours}h
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