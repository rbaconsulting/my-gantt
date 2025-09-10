import React, { useState, useEffect } from 'react';
import type { PoolData } from './types';

interface PoolFormProps {
  initialData?: PoolData;
  onSave?: (data: PoolData) => void;
}

const initialForm: Omit<PoolData, 'lastModified'> = {
  name: '',
  weeklyHours: 40,
  standardWeekHours: 40,
  supportHours: 0,
  meetingHours: 0,
  description: '',
  color: '#4F8EF7',
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
    fontFamily: 'inherit'
  },
  inputShort: {
    padding: '0.5rem',
    border: '1px solid #d1d5db',
    borderRadius: '4px',
    fontSize: '14px',
    backgroundColor: 'white',
    color: '#000',
    width: '120px',
    fontFamily: 'inherit'
  },
  inputMedium: {
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
    minHeight: '80px'
  }
};

const PoolForm: React.FC<PoolFormProps> = ({ initialData, onSave }) => {
  const [form, setForm] = useState<PoolData>(initialForm);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});

  useEffect(() => {
    if (initialData) {
      setForm(initialData);
    } else {
      setForm(initialForm);
    }
  }, [initialData]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: name === 'weeklyHours' ? Number(value) : value,
    }));
  };

  const validate = () => {
    const newErrors: { [key: string]: string } = {};
    if (!form.name) newErrors.name = 'Pool name is required';
    if (!form.weeklyHours || form.weeklyHours <= 0) newErrors.weeklyHours = 'Weekly hours must be greater than 0';
    
    // Validate that reserved hours don't exceed total weekly hours
    const totalReserved = (form.supportHours || 0) + (form.meetingHours || 0);
    if (totalReserved > form.weeklyHours) {
      newErrors.supportHours = 'Support + Meeting hours cannot exceed weekly hours';
      newErrors.meetingHours = 'Support + Meeting hours cannot exceed weekly hours';
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
      <h2 style={{ alignSelf: 'flex-start', color: '#000' }}>{initialData ? 'Edit Pool' : 'Add New Pool'}</h2>
      <label style={{ color: '#000' }}>
        Pool Name*:
        <input name="name" value={form.name} onChange={handleChange} required style={formStyles.input} />
        {errors.name && <span style={{ color: 'red' }}>{errors.name}</span>}
      </label>
      {/* Weekly Hours */}
      <label style={{ color: '#000' }}>
        Weekly Hours*:
        <input type="number" name="weeklyHours" value={form.weeklyHours} onChange={handleChange} min={1} max={168} required style={formStyles.inputShort} />
        {errors.weeklyHours && <span style={{ color: 'red' }}>{errors.weeklyHours}</span>}
      </label>

      {/* Standard Week Hours */}
      <label style={{ color: '#000' }}>
        Standard Week Hours:
        <input 
          type="number" 
          name="standardWeekHours" 
          value={form.standardWeekHours} 
          onChange={handleChange} 
          min={1} 
          max={168} 
          placeholder="40"
          style={formStyles.inputShort}
        />
        <small style={{ color: '#666', fontSize: '12px', marginLeft: '8px' }}>
          Hours per week for allocation calculations (default: 40)
        </small>
        {errors.standardWeekHours && <span style={{ color: 'red' }}>{errors.standardWeekHours}</span>}
      </label>

      {/* Support Hours */}
      <label style={{ color: '#000' }}>
        Support Hours:
        <input type="number" name="supportHours" value={form.supportHours} onChange={handleChange} min={0} style={formStyles.inputShort} />
        {errors.supportHours && <span style={{ color: 'red' }}>{errors.supportHours}</span>}
      </label>
      <label style={{ color: '#000' }}>
        Meeting Hours (Reserved):
        <input type="number" name="meetingHours" value={form.meetingHours} onChange={handleChange} min={0} style={formStyles.inputShort} />
        <small style={{ color: '#666', fontSize: '12px' }}>Hours reserved for weekly meetings</small>
        {errors.meetingHours && <span style={{ color: 'red' }}>{errors.meetingHours}</span>}
      </label>
      <label style={{ color: '#000' }}>
        Description:
        <textarea name="description" value={form.description} onChange={handleChange} rows={3} style={formStyles.textarea} />
      </label>
      <label style={{ color: '#000' }}>
        Color:
        <input type="color" name="color" value={form.color} onChange={handleChange} style={{ width: 40, height: 28, padding: 0, border: 'none', background: 'none' }} />
      </label>
      <button type="submit">{initialData ? 'Update Pool' : 'Save Pool'}</button>
    </form>
  );
};

export default PoolForm; 