import React, { useState } from 'react';
import type { ProjectFormData, PoolData } from './types';

interface FilterPanelProps {
  projects: ProjectFormData[];
  pools: PoolData[];
  onFiltersChange: (filters: {
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
  }) => void;
}

const FilterPanel: React.FC<FilterPanelProps> = ({ projects, onFiltersChange }) => {
  const [filters, setFilters] = useState<{
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
  }>({
    status: [],
    pool: [],
    dateRange: {
      start: '',
      end: ''
    },
    progress: {
      min: undefined,
      max: undefined
    },
    search: ''
  });

  // Get unique statuses and pools from projects
  const uniqueStatuses = Array.from(new Set(projects.map(p => p.status).filter(Boolean)));
  const uniquePools = Array.from(new Set(projects.map(p => p.pool).filter(Boolean)));

  const updateFilters = (newFilters: typeof filters) => {
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const handleStatusChange = (status: string, checked: boolean) => {
    const currentStatus = filters.status || [];
    const newStatusFilters = checked 
      ? [...currentStatus, status]
      : currentStatus.filter(s => s !== status);
    
    updateFilters({
      ...filters,
      status: newStatusFilters
    });
  };

  const handlePoolChange = (pool: string, checked: boolean) => {
    const currentPool = filters.pool || [];
    const newPoolFilters = checked 
      ? [...currentPool, pool]
      : currentPool.filter(p => p !== pool);
    
    updateFilters({
      ...filters,
      pool: newPoolFilters
    });
  };

  const handleDateRangeChange = (field: 'start' | 'end', value: string) => {
    updateFilters({
      ...filters,
      dateRange: {
        ...filters.dateRange,
        [field]: value
      }
    });
  };

  const handleProgressChange = (field: 'min' | 'max', value: string) => {
    const numValue = value === '' ? undefined : Number(value);
    updateFilters({
      ...filters,
      progress: {
        ...filters.progress,
        [field]: numValue
      }
    });
  };

  const handleSearchChange = (value: string) => {
    updateFilters({
      ...filters,
      search: value
    });
  };

  const clearAllFilters = () => {
    const clearedFilters = {
      status: [],
      pool: [],
      dateRange: { start: '', end: '' },
      progress: { min: undefined, max: undefined },
      search: ''
    };
    setFilters(clearedFilters);
    onFiltersChange(clearedFilters);
  };

  const hasActiveFilters = (filters.status && filters.status.length > 0) || 
    (filters.pool && filters.pool.length > 0) || 
    (filters.dateRange && (filters.dateRange.start || filters.dateRange.end)) || 
    (filters.progress && (filters.progress.min !== undefined || filters.progress.max !== undefined)) || 
    filters.search;

  return (
    <div style={{
      background: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      padding: '1rem',
      marginBottom: '1rem'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 'bold', color: '#000' }}>Filters</h3>
        {hasActiveFilters && (
          <button
            onClick={clearAllFilters}
            style={{
              padding: '0.25rem 0.75rem',
              fontSize: '12px',
              borderRadius: '4px',
              border: '1px solid #dc2626',
              background: 'white',
              color: '#dc2626',
              cursor: 'pointer'
            }}
          >
            Clear All
          </button>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        {/* Search */}
        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '0.5rem', color: '#000' }}>
            Search
          </label>
          <input
            type="text"
            placeholder="Search projects..."
            value={filters.search || ''}
            onChange={(e) => handleSearchChange(e.target.value)}
            style={{
              width: '100%',
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '14px'
            }}
          />
        </div>

        {/* Status Filter */}
        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '0.5rem', color: '#000' }}>
            Status
          </label>
          <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
            {uniqueStatuses.map(status => (
              status && (
                <label key={status} style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
                  <input
                    type="checkbox"
                    checked={(filters.status || []).includes(status)}
                    onChange={(e) => handleStatusChange(status, e.target.checked)}
                    style={{ marginRight: '0.5rem' }}
                  />
                  <span style={{ fontSize: '14px', color: '#000' }}>{status}</span>
                </label>
              )
            ))}
          </div>
        </div>

        {/* Pool Filter */}
        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '0.5rem', color: '#000' }}>
            Pool
          </label>
          <div style={{ maxHeight: '120px', overflowY: 'auto' }}>
            {uniquePools.map(pool => (
              <label key={pool} style={{ display: 'flex', alignItems: 'center', marginBottom: '0.25rem' }}>
                <input
                  type="checkbox"
                  checked={(filters.pool || []).includes(pool)}
                  onChange={(e) => handlePoolChange(pool, e.target.checked)}
                  style={{ marginRight: '0.5rem' }}
                />
                <span style={{ fontSize: '14px', color: '#000' }}>{pool}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Date Range */}
        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '0.5rem', color: '#000' }}>
            Date Range
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <input
              type="date"
              placeholder="Start Date"
              value={filters.dateRange?.start || ''}
              onChange={(e) => handleDateRangeChange('start', e.target.value)}
              style={{
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
            <input
              type="date"
              placeholder="End Date"
              value={filters.dateRange?.end || ''}
              onChange={(e) => handleDateRangeChange('end', e.target.value)}
              style={{
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>
        </div>

        {/* Progress Range */}
        <div>
          <label style={{ display: 'block', fontSize: '14px', fontWeight: 'bold', marginBottom: '0.5rem', color: '#000' }}>
            Progress Range (%)
          </label>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <input
              type="number"
              placeholder="Min"
              min="0"
              max="100"
              value={filters.progress?.min || ''}
              onChange={(e) => handleProgressChange('min', e.target.value)}
              style={{
                flex: 1,
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
            <input
              type="number"
              placeholder="Max"
              min="0"
              max="100"
              value={filters.progress?.max || ''}
              onChange={(e) => handleProgressChange('max', e.target.value)}
              style={{
                flex: 1,
                padding: '0.5rem',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                fontSize: '14px'
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default FilterPanel; 