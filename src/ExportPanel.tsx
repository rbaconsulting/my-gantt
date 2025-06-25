import React, { useState } from 'react';
import type { ProjectFormData, PoolData } from './types';

interface ExportPanelProps {
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
  onImport: (data: { projects: ProjectFormData[]; pools: PoolData[] }) => void;
}

interface ConflictResult {
  type: 'project' | 'pool';
  name: string;
  action: 'updated' | 'kept' | 'added' | 'deleted';
  existingData?: any;
  importedData?: any;
  reason?: string;
}

// Add a helper to parse simple CSV
function parseSimpleCSV(csv: string) {
  const lines = csv.trim().split(/\r?\n/);
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
  const rows = lines.slice(1).map(line => {
    const values = line.split(',').map(v => v.replace(/^"|"$/g, '').trim());
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = values[i] || ''; });
    return row;
  });
  return { headers, rows };
}

// Add a helper to analyze project conflicts (for both JSON and CSV imports)
function analyzeProjectConflicts(
  importedProjects: ProjectFormData[],
  existingProjects: ProjectFormData[]
): ConflictResult[] {
  const results: ConflictResult[] = [];
  const mergedProjects = [...existingProjects];

  importedProjects.forEach((importedProject) => {
    const existingIndex = mergedProjects.findIndex((p) => p.name === importedProject.name);
    if (existingIndex !== -1) {
      // Compare all fields except lastModified
      const existing = mergedProjects[existingIndex];
      const fieldsToCompare = [
        'name', 'sponsor', 'pool', 'startDate', 'targetDate',
        'estimatedHours', 'progress', 'status', 'weeklyAllocation', 'notes'
      ];
      const isIdentical = fieldsToCompare.every(
        (field) => (existing as any)[field] === (importedProject as any)[field]
      );
      if (isIdentical) {
        results.push({
          type: 'project',
          name: importedProject.name,
          action: 'kept',
          existingData: existing,
          importedData: importedProject,
          reason: 'No changes'
        });
      } else {
        results.push({
          type: 'project',
          name: importedProject.name,
          action: 'updated',
          existingData: existing,
          importedData: importedProject,
          reason: 'Project updated (fields differ)'
        });
      }
    } else {
      results.push({
        type: 'project',
        name: importedProject.name,
        action: 'added',
        importedData: importedProject,
        reason: 'New project'
      });
    }
  });

  existingProjects.forEach((existingProject) => {
    const existsInImport = importedProjects.some((p) => p.name === existingProject.name);
    if (!existsInImport) {
      results.push({
        type: 'project',
        name: existingProject.name,
        action: 'deleted',
        existingData: existingProject,
        reason: 'Project not found in import data (deleted)'
      });
    }
  });

  return results;
}

const ExportPanel: React.FC<ExportPanelProps> = ({ projects, pools, filters, onImport }) => {
  const [importData, setImportData] = useState('');
  const [importError, setImportError] = useState('');
  const [showConflictSummary, setShowConflictSummary] = useState(false);
  const [conflictResults, setConflictResults] = useState<ConflictResult[]>([]);
  const [backupData, setBackupData] = useState<{ projects: ProjectFormData[]; pools: PoolData[] } | null>(null);
  const [importApplied, setImportApplied] = useState(false);
  const [pendingImport, setPendingImport] = useState<{ projects: ProjectFormData[]; pools: PoolData[] } | null>(null);
  const [csvImportError, setCsvImportError] = useState('');

  // Apply filters to projects (same logic as GanttChart)
  const getFilteredProjects = () => {
    return projects.filter(proj => {
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
  };

  const exportFilteredData = () => {
    const filteredProjects = getFilteredProjects();
    const filteredPools = pools.filter(pool => 
      filteredProjects.some(proj => proj.pool === pool.name)
    );

    const exportData = {
      projects: filteredProjects,
      pools: filteredPools,
      filters: filters,
      exportDate: new Date().toISOString(),
      exportType: 'filtered'
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gantt-filtered-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportFullBackup = () => {
    const backupData = {
      projects: projects.map(p => ({ ...p, lastModified: p.lastModified || new Date().toISOString() })),
      pools: pools.map(p => ({ ...p, lastModified: p.lastModified || new Date().toISOString() })),
      exportDate: new Date().toISOString(),
      exportType: 'full-backup'
    };

    const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gantt-full-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportFilteredTable = () => {
    const filteredProjects = getFilteredProjects();
    
    // Create CSV content
    const headers = [
      'Project Name',
      'Sponsor',
      'Pool',
      'Start Date',
      'Target Date',
      'Estimated Hours',
      'Progress (%)',
      'Status',
      'Weekly Allocation (%)',
      'Notes',
      'Last Modified'
    ];

    const csvContent = [
      headers.join(','),
      ...filteredProjects.map(proj => [
        `"${proj.name}"`,
        `"${proj.sponsor}"`,
        `"${proj.pool}"`,
        proj.startDate,
        proj.targetDate,
        proj.estimatedHours,
        proj.progress || 0,
        `"${proj.status || ''}"`,
        proj.weeklyAllocation || 0,
        `"${(proj.notes || '').replace(/"/g, '""')}"`,
        proj.lastModified || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gantt-projects-table-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    try {
      setImportError('');
      const parsedData = JSON.parse(importData);
      
      if (!parsedData.projects || !parsedData.pools) {
        throw new Error('Invalid data format. Expected projects and pools arrays.');
      }

      // Validate data structure
      const requiredProjectFields = ['name', 'sponsor', 'pool', 'startDate', 'targetDate', 'estimatedHours'];
      const requiredPoolFields = ['name', 'weeklyHours'];

      parsedData.projects.forEach((proj: any, index: number) => {
        requiredProjectFields.forEach(field => {
          if (!(field in proj)) {
            throw new Error(`Project ${index + 1} missing required field: ${field}`);
          }
        });
      });

      parsedData.pools.forEach((pool: any, index: number) => {
        requiredPoolFields.forEach(field => {
          if (!(field in pool)) {
            throw new Error(`Pool ${index + 1} missing required field: ${field}`);
          }
        });
      });

      // Create backup before import
      const backup = {
        projects: [...projects],
        pools: [...pools]
      };
      setBackupData(backup);

      // Add timestamps if missing
      const timestampedData = {
        projects: parsedData.projects.map((p: ProjectFormData) => ({
          ...p,
          lastModified: p.lastModified || new Date().toISOString()
        })),
        pools: parsedData.pools.map((p: PoolData) => ({
          ...p,
          lastModified: p.lastModified || new Date().toISOString()
        }))
      };

      // Process conflicts and track results
      const results: ConflictResult[] = [];
      const mergedProjects = [...projects];
      const mergedPools = [...pools];

      // Handle project conflicts
      const projectConflicts = analyzeProjectConflicts(timestampedData.projects, projects);
      results.push(...projectConflicts);
      
      // Actually merge the imported projects
      timestampedData.projects.forEach((importedProject: ProjectFormData) => {
        const existingIndex = mergedProjects.findIndex((p) => p.name === importedProject.name);
        if (existingIndex !== -1) {
          // Update existing project
          mergedProjects[existingIndex] = importedProject;
        } else {
          // Add new project
          mergedProjects.push(importedProject);
        }
      });
      
      // Remove projects that don't exist in import (deletions)
      const importedProjectNames = timestampedData.projects.map((p: ProjectFormData) => p.name);
      for (let i = mergedProjects.length - 1; i >= 0; i--) {
        if (!importedProjectNames.includes(mergedProjects[i].name)) {
          mergedProjects.splice(i, 1);
        }
      }

      // Handle pool conflicts
      timestampedData.pools.forEach((importedPool: PoolData) => {
        const existingIndex = mergedPools.findIndex((p: PoolData) => p.name === importedPool.name);
        
        if (existingIndex !== -1) {
          // Conflict detected - compare timestamps
          const existing = mergedPools[existingIndex];
          const existingTime = existing.lastModified ? new Date(existing.lastModified).getTime() : 0;
          const importedTime = importedPool.lastModified ? new Date(importedPool.lastModified).getTime() : 0;
          
          if (importedTime > existingTime) {
            // Imported data is newer, replace existing
            mergedPools[existingIndex] = importedPool;
            results.push({
              type: 'pool',
              name: importedPool.name,
              action: 'updated',
              existingData: existing,
              importedData: importedPool,
              reason: `Imported data is newer (${new Date(importedTime).toLocaleString()} vs ${new Date(existingTime).toLocaleString()})`
            });
          } else {
            // Existing is newer or equal, keep existing
            results.push({
              type: 'pool',
              name: importedPool.name,
              action: 'kept',
              existingData: existing,
              importedData: importedPool,
              reason: `Existing data is newer or equal (${new Date(existingTime).toLocaleString()} vs ${new Date(importedTime).toLocaleString()})`
            });
          }
        } else {
          // New pool, add it
          mergedPools.push(importedPool);
          results.push({
            type: 'pool',
            name: importedPool.name,
            action: 'added',
            importedData: importedPool,
            reason: 'New pool'
          });
        }
      });

      // Handle deletions (items that exist locally but not in import)
      projects.forEach((existingProject: ProjectFormData) => {
        const existsInImport = timestampedData.projects.some((p: ProjectFormData) => p.name === existingProject.name);
        if (!existsInImport) {
          results.push({
            type: 'project',
            name: existingProject.name,
            action: 'deleted',
            existingData: existingProject,
            reason: 'Project not found in import data (deleted)'
          });
          // Remove from merged projects
          const index = mergedProjects.findIndex((p: ProjectFormData) => p.name === existingProject.name);
          if (index !== -1) {
            mergedProjects.splice(index, 1);
          }
        }
      });

      pools.forEach((existingPool: PoolData) => {
        const existsInImport = timestampedData.pools.some((p: PoolData) => p.name === existingPool.name);
        if (!existsInImport) {
          results.push({
            type: 'pool',
            name: existingPool.name,
            action: 'deleted',
            existingData: existingPool,
            reason: 'Pool not found in import data (deleted)'
          });
          // Remove from merged pools
          const index = mergedPools.findIndex((p: PoolData) => p.name === existingPool.name);
          if (index !== -1) {
            mergedPools.splice(index, 1);
          }
        }
      });

      setConflictResults(results);
      setShowConflictSummary(true);
      setImportApplied(false);
      setPendingImport({ projects: mergedProjects, pools: mergedPools });
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'Invalid JSON data');
    }
  };

  const handleConfirmImport = () => {
    if (pendingImport) {
      onImport(pendingImport);
      setImportApplied(true);
      setShowConflictSummary(false);
      setPendingImport(null);
      setImportData('');
    }
  };

  const handleRevert = () => {
    if (backupData) {
      onImport(backupData);
      setShowConflictSummary(false);
      setConflictResults([]);
      setBackupData(null);
      setImportApplied(false);
      setPendingImport(null);
      setImportData('');
    }
  };

  const handleCSVImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCsvImportError('');
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      try {
        const { headers, rows } = parseSimpleCSV(text);
        // Validate required columns
        const required = [
          'Project Name', 'Sponsor', 'Pool', 'Start Date', 'Target Date',
          'Estimated Hours', 'Progress (%)', 'Status', 'Weekly Allocation (%)', 'Notes', 'Last Modified'
        ];
        for (const col of required) {
          if (!headers.includes(col)) throw new Error(`Missing column: ${col}`);
        }
        // Convert rows to ProjectFormData
        const projects = rows.map(row => ({
          name: row['Project Name'],
          sponsor: row['Sponsor'],
          pool: row['Pool'],
          startDate: row['Start Date'],
          targetDate: row['Target Date'],
          estimatedHours: Number(row['Estimated Hours']) || 0,
          progress: Number(row['Progress (%)']) || 0,
          status: row['Status'],
          weeklyAllocation: Number(row['Weekly Allocation (%)']) || 0,
          notes: row['Notes'],
          lastModified: row['Last Modified'] || new Date().toISOString(),
        }));
        // Use pools from current state (or optionally parse from CSV if included)
        setPendingImport({ projects, pools });
        // Analyze conflicts for summary
        setConflictResults(analyzeProjectConflicts(projects, projects));
        setShowConflictSummary(true);
        setImportApplied(false);
      } catch (err: any) {
        setCsvImportError(err.message || 'Invalid CSV format');
      }
    };
    reader.readAsText(file);
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'updated': return '#f59e0b';
      case 'kept': return '#6b7280';
      case 'added': return '#10b981';
      case 'deleted': return '#dc2626';
      default: return '#6b7280';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'updated': return '🔄';
      case 'kept': return '✅';
      case 'added': return '➕';
      case 'deleted': return '🗑️';
      default: return '❓';
    }
  };

  const filteredProjects = getFilteredProjects();
  const hasActiveFilters = filters && (
    (filters.status && filters.status.length > 0) ||
    (filters.pool && filters.pool.length > 0) ||
    (filters.dateRange && (filters.dateRange.start || filters.dateRange.end)) ||
    (filters.progress && (filters.progress.min !== undefined || filters.progress.max !== undefined)) ||
    filters.search
  );

  return (
    <div style={{
      background: '#f8f9fa',
      border: '1px solid #e2e8f0',
      borderRadius: '8px',
      padding: '1rem',
      marginBottom: '1rem'
    }}>
      <h3 style={{ margin: '0 0 1rem 0', color: '#000' }}>Export & Import</h3>
      
      {/* Conflict Summary Section */}
      {showConflictSummary && (
        <div style={{ 
          background: '#fff', 
          border: '1px solid #e5e7eb', 
          borderRadius: '6px', 
          padding: '1rem', 
          marginBottom: '1rem' 
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <h4 style={{ margin: 0, color: '#000' }}>Import Summary</h4>
          </div>
          
          <div style={{ fontSize: '14px', marginBottom: '1rem' }}>
            <strong>Backup created:</strong> {backupData ? new Date().toLocaleString() : 'None'}
            {importApplied && <span style={{ color: '#10b981', marginLeft: '1rem' }}>✅ Import applied successfully</span>}
          </div>

          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {conflictResults.map((result, index) => (
              <div 
                key={index} 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  padding: '0.5rem', 
                  borderBottom: '1px solid #f3f4f6',
                  fontSize: '14px'
                }}
              >
                <span style={{ marginRight: '0.5rem', fontSize: '16px' }}>
                  {getActionIcon(result.action)}
                </span>
                <span style={{ 
                  fontWeight: 'bold', 
                  color: getActionColor(result.action),
                  marginRight: '0.5rem',
                  minWidth: '80px'
                }}>
                  {result.action.toUpperCase()}
                </span>
                <span style={{ 
                  fontWeight: 'bold', 
                  color: '#000',
                  marginRight: '0.5rem',
                  minWidth: '100px'
                }}>
                  {result.type}:
                </span>
                <span style={{ color: '#000', flex: 1 }}>
                  {result.name}
                </span>
                <span style={{ color: '#666', fontSize: '12px' }}>
                  {result.reason}
                </span>
              </div>
            ))}
          </div>

          <div style={{ 
            marginTop: '1rem', 
            padding: '0.5rem', 
            background: '#f0f9ff', 
            borderRadius: '4px',
            fontSize: '14px',
            color: '#000'
          }}>
            <strong>Summary:</strong> {conflictResults.filter(r => r.action === 'added').length} added, 
            {conflictResults.filter(r => r.action === 'updated').length} updated, 
            {conflictResults.filter(r => r.action === 'kept').length} kept, 
            {conflictResults.filter(r => r.action === 'deleted').length} deleted
          </div>

          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button
              onClick={handleConfirmImport}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '14px',
                borderRadius: '4px',
                border: '1px solid #10b981',
                background: '#10b981',
                color: 'white',
                cursor: 'pointer',
              }}
              disabled={!pendingImport}
            >
              Confirm Import
            </button>
            {backupData && (
              <button
                onClick={handleRevert}
                style={{
                  padding: '0.5rem 1rem',
                  fontSize: '14px',
                  borderRadius: '4px',
                  border: '1px solid #dc2626',
                  background: 'white',
                  color: '#dc2626',
                  cursor: 'pointer',
                }}
              >
                🔄 Revert to Previous State
              </button>
            )}
          </div>
        </div>
      )}
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
        
        {/* Filtered Export Section */}
        <div>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#000' }}>Export Filtered Data</h4>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '1rem' }}>
            Export current filtered view ({filteredProjects.length} projects)
          </p>
          <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
            <button
              onClick={exportFilteredData}
              disabled={!hasActiveFilters}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '14px',
                borderRadius: '4px',
                border: '1px solid #4F8EF7',
                background: hasActiveFilters ? '#4F8EF7' : '#9ca3af',
                color: 'white',
                cursor: hasActiveFilters ? 'pointer' : 'not-allowed'
              }}
            >
              Export JSON
            </button>
            <button
              onClick={exportFilteredTable}
              disabled={filteredProjects.length === 0}
              style={{
                padding: '0.5rem 1rem',
                fontSize: '14px',
                borderRadius: '4px',
                border: '1px solid #10b981',
                background: filteredProjects.length > 0 ? '#10b981' : '#9ca3af',
                color: 'white',
                cursor: filteredProjects.length > 0 ? 'pointer' : 'not-allowed'
              }}
            >
              Export CSV
            </button>
          </div>
        </div>

        {/* Full Backup Section */}
        <div>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#000' }}>Full Backup</h4>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '1rem' }}>
            Export all data for backup/restore ({projects.length} projects, {pools.length} pools)
          </p>
          <button
            onClick={exportFullBackup}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '14px',
              borderRadius: '4px',
              border: '1px solid #f59e0b',
              background: '#f59e0b',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            Export Full Backup
          </button>
        </div>

        {/* Import Section */}
        <div>
          <h4 style={{ margin: '0 0 0.5rem 0', color: '#000' }}>Import Data</h4>
          <p style={{ fontSize: '14px', color: '#666', marginBottom: '1rem' }}>
            Paste JSON data to import (will replace current data), or import a CSV exported from this tool.
          </p>
          <div style={{ 
            padding: '0.5rem', 
            background: '#fef3c7', 
            border: '1px solid #f59e0b', 
            borderRadius: '4px', 
            marginBottom: '1rem',
            fontSize: '14px',
            color: '#000'
          }}>
            ⚠️ <strong>Warning:</strong> For CSV import, only use file templates exported from this tool.
          </div>
          <input type="file" accept=".csv" onChange={handleCSVImport} style={{ marginBottom: '0.5rem' }} />
          {csvImportError && (
            <div style={{ color: '#dc2626', fontSize: '12px', marginBottom: '0.5rem' }}>
              {csvImportError}
            </div>
          )}
          <textarea
            value={importData}
            onChange={(e) => {
              setImportData(e.target.value);
              // Clear conflict summary when new data is entered
              if (showConflictSummary) {
                setShowConflictSummary(false);
                setConflictResults([]);
                setBackupData(null);
                setImportApplied(false);
              }
            }}
            placeholder="Paste JSON data here..."
            style={{
              width: '100%',
              minHeight: '100px',
              padding: '0.5rem',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              fontSize: '14px',
              marginBottom: '0.5rem'
            }}
          />
          {importError && (
            <div style={{ color: '#dc2626', fontSize: '12px', marginBottom: '0.5rem' }}>
              {importError}
            </div>
          )}
          <button
            onClick={handleImport}
            disabled={!importData.trim()}
            style={{
              padding: '0.5rem 1rem',
              fontSize: '14px',
              borderRadius: '4px',
              border: '1px solid #dc2626',
              background: importData.trim() ? '#dc2626' : '#9ca3af',
              color: 'white',
              cursor: importData.trim() ? 'pointer' : 'not-allowed'
            }}
          >
            Import Data
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportPanel; 