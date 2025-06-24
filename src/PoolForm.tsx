import React, { useState, useEffect } from 'react';
import type { PoolData } from './types';

interface PoolFormProps {
  initialData?: PoolData;
  onSave?: (data: PoolData) => void;
}

const initialForm: PoolData = {
  name: '',
  weeklyHours: 0,
  description: '',
  color: '#4F8EF7',
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
        <input name="name" value={form.name} onChange={handleChange} required />
        {errors.name && <span style={{ color: 'red' }}>{errors.name}</span>}
      </label>
      <label style={{ color: '#000' }}>
        Weekly Hours Allocation*:
        <input type="number" name="weeklyHours" value={form.weeklyHours} onChange={handleChange} min={1} required />
        {errors.weeklyHours && <span style={{ color: 'red' }}>{errors.weeklyHours}</span>}
      </label>
      <label style={{ color: '#000' }}>
        Description:
        <textarea name="description" value={form.description} onChange={handleChange} rows={3} style={{ width: '100%' }} />
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