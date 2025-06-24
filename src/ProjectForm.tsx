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
    setForm((prev) => ({
      ...prev,
      [name]: name === 'estimatedHours' || name === 'progress' || name === 'weeklyAllocation' ? Number(value) : value,
    }));
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!form.name) newErrors.name = 'Project name is required';
    if (!form.targetDate) newErrors.targetDate = 'Target date is required';
    if (!form.estimatedHours || form.estimatedHours <= 0) newErrors.estimatedHours = 'Estimated hours must be greater than 0';
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
      maxWidth: 400,
      background: '#f8f9fa',
      borderRadius: '8px',
      border: '1px solid #e9ecef'
    }}>
      <h2 style={{ alignSelf: 'flex-start', color: '#000' }}>{initialData ? 'Edit Project' : 'Add New Project'}</h2>
      <label style={{ color: '#000' }}>
        Project Name*:
        <input name="name" value={form.name} onChange={handleChange} required />
        {errors.name && <span style={{ color: 'red' }}>{errors.name}</span>}
      </label>
      <label style={{ color: '#000' }}>
        Project Sponsor:
        <input name="sponsor" value={form.sponsor} onChange={handleChange} />
      </label>
      <label style={{ color: '#000' }}>
        Project Pool:
        <select name="pool" value={form.pool} onChange={handleChange}>
          <option value="">Select a pool...</option>
          {pools.map((pool) => (
            <option key={pool.name} value={pool.name}>
              {pool.name} ({pool.weeklyHours} hrs/week)
            </option>
          ))}
        </select>
      </label>
      {selectedPool && (
        <div style={{ padding: '8px', backgroundColor: '#f0f0f0', borderRadius: '4px', fontSize: '14px' }}>
          <div style={{ fontWeight: 'bold', color: 'black' }}>Pool: {selectedPool.name} - {selectedPool.weeklyHours} hours/week</div>
          {selectedPool.description && <div style={{ marginTop: '4px', color: '#666' }}>{selectedPool.description}</div>}
        </div>
      )}
      <label style={{ color: '#000' }}>
        Start Date*:
        <input type="date" name="startDate" value={form.startDate} onChange={handleChange} required />
      </label>
      <label style={{ color: '#000' }}>
        Target Completion Date*:
        <input type="date" name="targetDate" value={form.targetDate} onChange={handleChange} required />
        {errors.targetDate && <span style={{ color: 'red' }}>{errors.targetDate}</span>}
      </label>
      <label style={{ color: '#000' }}>
        Estimated Hours*:
        <input type="number" name="estimatedHours" value={form.estimatedHours} onChange={handleChange} min={10} step={10} required />
        {errors.estimatedHours && <span style={{ color: 'red' }}>{errors.estimatedHours}</span>}
      </label>
      <label style={{ color: '#000' }}>
        Current Progress (%):
        <input type="number" name="progress" value={form.progress} onChange={handleChange} min={0} max={100} step={5} />
      </label>
      <label style={{ color: '#000' }}>
        Weekly Allocation (% of 40h):
        <input
          type="number"
          name="weeklyAllocation"
          value={form.weeklyAllocation}
          onChange={handleChange}
          min={0}
          max={100}
          step={5}
          style={{ width: 80 }}
        />
      </label>
      <label style={{ color: '#000' }}>
        Status:
        <select name="status" value={form.status} onChange={handleChange}>
          <option value="Not Started">Not Started</option>
          <option value="Effort Analysis">Effort Analysis</option>
          <option value="Requirements">Requirements</option>
          <option value="Development">Development</option>
          <option value="UAT">UAT</option>
          <option value="On Hold">On Hold</option>
          <option value="Complete">Complete</option>
        </select>
      </label>
      <label style={{ color: '#000' }}>
        Notes:
        <textarea name="notes" value={form.notes} onChange={handleChange} rows={3} style={{ width: '100%' }} />
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