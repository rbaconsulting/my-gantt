import { useState, useEffect } from 'react';
import './App.css';
import GanttChart from './GanttChart';
import ProjectForm from './ProjectForm';
import PoolForm from './PoolForm';
import BulkUpdateForm from './BulkUpdateForm';
import FilterPanel from './FilterPanel';
import ExportPanel from './ExportPanel';
import ErrorBoundary from './ErrorBoundary';
import type { ProjectFormData, PoolData } from './types';

type TabType = 'projects' | 'pools' | 'bulk-update' | 'export';

// Helper functions for week calculations
function getWeekStart(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - d.getDay()); // Sunday as start of week
  return d;
}

function getAllWeekStarts(min: Date, max: Date) {
  const weeks = [];
  const current = getWeekStart(min);
  // Prepend one week before min
  current.setDate(current.getDate() - 7);
  while (current <= max) {
    weeks.push(new Date(current));
    current.setDate(current.getDate() + 7);
  }
  return weeks;
}

function getDateRange(projects: ProjectFormData[]) {
  if (projects.length === 0) {
    const today = new Date();
    const future = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
    return { min: today, max: future };
  }
  
  const dates = projects.flatMap(p => [
    new Date(p.startDate),
    new Date(p.targetDate)
  ]).filter(d => !isNaN(d.getTime()));
  
  if (dates.length === 0) {
    const today = new Date();
    const future = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    return { min: today, max: future };
  }
  
  return {
    min: new Date(Math.min(...dates.map(d => d.getTime()))),
    max: new Date(Math.max(...dates.map(d => d.getTime())))
  };
}

// Sample default data for testing
const defaultPools: PoolData[] = [
  {
    name: 'Development Team',
    weeklyHours: 40,
    standardWeekHours: 40,
    supportHours: 0,
    meetingHours: 0,
    description: 'Core development team for software projects',
    color: '#4F8EF7',
    lastModified: new Date().toISOString()
  },
  {
    name: 'QA Team',
    weeklyHours: 40,
    standardWeekHours: 40,
    supportHours: 0,
    meetingHours: 0,
    description: 'Quality assurance and testing team',
    color: '#34C759',
    lastModified: new Date().toISOString()
  },
  {
    name: 'DevOps Team',
    weeklyHours: 40,
    standardWeekHours: 40,
    supportHours: 0,
    meetingHours: 0,
    description: 'Infrastructure and deployment team',
    color: '#FF9500',
    lastModified: new Date().toISOString()
  }
];

const today = new Date();
const addDays = (date: Date, days: number) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const defaultProjects: ProjectFormData[] = Array.from({ length: 15 }, (_, i) => {
  const poolIdx = i % 3; 
  const poolName = `Pool ${poolIdx + 1}`;
  const startOffset = i * 7; // 1 week apart
  const duration = 14 + (i % 4) * 7; // 2-5 weeks
  return {
    name: `Project ${i + 1}`,
    sponsor: `Sponsor ${String.fromCharCode(65 + (i % 5))}`,
    pool: poolName,
    startDate: addDays(today, startOffset),
    targetDate: addDays(today, startOffset + duration),
    estimatedHours: 40 + (i % 5) * 10,
    progress: (i * 7) % 100,
    status: ['Not Started', 'Development', 'UAT', 'Complete'][i % 4],
    weeklyAllocation: 10 + (i % 5) * 15,
    notes: `Demo project ${i + 1} notes`,
    lastModified: new Date().toISOString()
  };
});

function App() {
  const [projects, setProjects] = useState<ProjectFormData[]>([]);
  const [pools, setPools] = useState<PoolData[]>([]);
  const [selectedProjectIndex, setSelectedProjectIndex] = useState<number | null>(null);
  const [selectedPoolIndex, setSelectedPoolIndex] = useState<number | null>(null);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState<number | null>(null);
  const [selectedWeekStart, setSelectedWeekStart] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('projects');
  const [showGantt, setShowGantt] = useState(true);
  const [projectVisibility, setProjectVisibility] = useState<{ [name: string]: boolean }>({});
  const [showProjectForm, setShowProjectForm] = useState(false);
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

  // Calculate weekStarts for the Gantt chart
  const dateRange = getDateRange(projects);
  const weekStarts = getAllWeekStarts(dateRange.min, dateRange.max);

  // Load data from localStorage on component mount
  useEffect(() => {
    const savedPools = localStorage.getItem('gantt-pools');
    const savedProjects = localStorage.getItem('gantt-projects');

    if (savedPools) {
      const parsedPools = JSON.parse(savedPools);
      if (Array.isArray(parsedPools) && parsedPools.length > 0) {
        setPools(parsedPools);
      } else {
        setPools(defaultPools);
        localStorage.setItem('gantt-pools', JSON.stringify(defaultPools));
      }
    } else {
      setPools(defaultPools);
      localStorage.setItem('gantt-pools', JSON.stringify(defaultPools));
    }

    if (savedProjects) {
      const parsedProjects = JSON.parse(savedProjects);
      if (Array.isArray(parsedProjects) && parsedProjects.length > 0) {
        setProjects(parsedProjects);
      } else {
        setProjects(defaultProjects);
        localStorage.setItem('gantt-projects', JSON.stringify(defaultProjects));
      }
    } else {
      setProjects(defaultProjects);
      localStorage.setItem('gantt-projects', JSON.stringify(defaultProjects));
    }
  }, []);

  // Save data to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('gantt-pools', JSON.stringify(pools));
  }, [pools]);

  useEffect(() => {
    localStorage.setItem('gantt-projects', JSON.stringify(projects));
  }, [projects]);

  // Update visibility state when projects change
  useEffect(() => {
    setProjectVisibility((prev) => {
      const newVis: { [name: string]: boolean } = { ...prev };
      projects.forEach((p) => {
        if (!(p.name in newVis)) newVis[p.name] = true;
      });
      // Remove deleted projects
      Object.keys(newVis).forEach((name) => {
        if (!projects.find((p) => p.name === name)) delete newVis[name];
      });
      return newVis;
    });
  }, [projects]);

  const handleSaveProject = (data: ProjectFormData) => {
    const projectWithTimestamp = {
      ...data,
      lastModified: new Date().toISOString()
    };
    
    if (selectedProjectIndex !== null) {
      setProjects((prev) => prev.map((p, i) => (i === selectedProjectIndex ? projectWithTimestamp : p)));
    } else {
      setProjects((prev) => [...prev, projectWithTimestamp]);
    }
    setSelectedProjectIndex(null);
    setShowProjectForm(false);
  };

  const handleCancelProject = () => {
    setSelectedProjectIndex(null);
    setShowProjectForm(false);
  };

  const handleSavePool = (data: PoolData) => {
    const poolWithTimestamp = {
      ...data,
      lastModified: new Date().toISOString()
    };
    
    if (selectedPoolIndex !== null) {
      setPools((prev) => prev.map((p, i) => (i === selectedPoolIndex ? poolWithTimestamp : p)));
    } else {
      setPools((prev) => [...prev, poolWithTimestamp]);
    }
    setSelectedPoolIndex(null);
  };

  const handleSelectProject = (idx: number) => {
    setSelectedProjectIndex(idx);
    setActiveTab('projects');
    setShowProjectForm(true);
  };

  const handleSelectPool = (idx: number) => {
    setSelectedPoolIndex(idx);
    setActiveTab('pools');
  };

  const handleNewProject = () => {
    setSelectedProjectIndex(null);
    setActiveTab('projects');
    setShowProjectForm(true);
  };

  const handleNewPool = () => {
    setSelectedPoolIndex(null);
    setActiveTab('pools');
  };

  const toggleAllProjectsOff = () => {
    setProjectVisibility({});
  };

  const toggleAllProjectsOn = () => {
    const allVisible: { [name: string]: boolean } = {};
    projects.forEach(project => {
      allVisible[project.name] = true;
    });
    setProjectVisibility(allVisible);
  };

  const handleFiltersChange = (newFilters: typeof filters) => {
    setFilters(newFilters);
  };

  const handleBulkUpdateSave = (updatedProjects: ProjectFormData[]) => {
    const projectsWithTimestamps = updatedProjects.map(project => ({
      ...project,
      lastModified: new Date().toISOString()
    }));
    setProjects(projectsWithTimestamps);
    setActiveTab('projects');
  };

  const handleBulkUpdateCancel = () => {
    setActiveTab('projects');
  };

  const handleBulkUpdateNewProject = () => {
    setSelectedProjectIndex(null);
    setActiveTab('projects');
    setShowProjectForm(true);
  };

  const handleBulkUpdateEditProject = (project: ProjectFormData) => {
    const projectIndex = projects.findIndex(p => p.name === project.name);
    if (projectIndex !== -1) {
      setSelectedProjectIndex(projectIndex);
      setActiveTab('projects');
      setShowProjectForm(true);
    }
  };

  const handleImport = (importedData: { projects: ProjectFormData[]; pools: PoolData[] }) => {
    setProjects(importedData.projects);
    setPools(importedData.pools);
  };

  const handleWeekSelect = (weekIndex: number | null, weekStart: Date | null) => {
    setSelectedWeekIndex(weekIndex);
    setSelectedWeekStart(weekStart);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh', maxWidth: '1200px', minWidth: '1200px', margin: '0 auto' }}>
      {/* Help Link */}
      <div style={{ 
        position: 'fixed', 
        top: '1rem', 
        right: '1rem', 
        zIndex: 1000 
      }}>
        <a 
          href="https://github.com/rbaconsulting/my-gantt/blob/main/USER_GUIDE.md" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{
            padding: '0.5rem 1rem',
            fontSize: '14px',
            borderRadius: '4px',
            border: '1px solid #6b7280',
            background: 'white',
            color: '#6b7280',
            textDecoration: 'none',
            cursor: 'pointer',
            boxShadow: '0 1px 4px #0001',
          }}
          title="Open User Guide"
        >
          📖 Help
        </a>
      </div>
      <button
        onClick={() => setShowGantt((prev) => !prev)}
        style={{
          margin: '2rem auto 0',
          padding: '0.75rem 1.5rem',
          fontSize: 16,
          borderRadius: 6,
          border: '1px solid #4F8EF7',
          background: '#4F8EF7',
          color: 'white',
          cursor: 'pointer',
          boxShadow: '0 1px 4px #0001',
        }}
      >
        {showGantt ? 'Hide Gantt Chart' : 'Show Gantt Chart'}
      </button>
      {showGantt && (
        <div style={{ textAlign: 'center' }}>
          <FilterPanel 
            projects={projects} 
            pools={pools} 
            onFiltersChange={handleFiltersChange} 
          />
          <ErrorBoundary>
            <GanttChart 
              projects={projects.filter(p => projectVisibility[p.name])} 
              pools={pools} 
              filters={filters}
              onWeekSelect={handleWeekSelect}
            />
          </ErrorBoundary>
        </div>
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', flex: 1 }}>
        <div style={{ minWidth: 220, borderRight: '1px solid #eee', padding: '2rem 1rem 2rem 2rem' }}>
          <div style={{ marginBottom: '2rem' }}>
            <button 
              onClick={() => setActiveTab('projects')} 
              style={{ 
                padding: '0.75rem 1.5rem',
                fontSize: 16,
                borderRadius: 6,
                border: '1px solid #4F8EF7',
                background: activeTab === 'projects' ? '#4F8EF7' : 'white',
                color: activeTab === 'projects' ? 'white' : '#4F8EF7',
                cursor: 'pointer',
                boxShadow: '0 1px 4px #0001',
                marginRight: '8px'
              }}
            >
              Projects
            </button>
            <button 
              onClick={() => setActiveTab('pools')} 
              style={{ 
                padding: '0.75rem 1.5rem',
                fontSize: 16,
                borderRadius: 6,
                border: '1px solid #4F8EF7',
                background: activeTab === 'pools' ? '#4F8EF7' : 'white',
                color: activeTab === 'pools' ? 'white' : '#4F8EF7',
                cursor: 'pointer',
                boxShadow: '0 1px 4px #0001',
                marginRight: '8px'
              }}
            >
              Pools
            </button>
            <button 
              onClick={() => setActiveTab('bulk-update')} 
              style={{ 
                padding: '0.75rem 1.5rem',
                fontSize: 16,
                borderRadius: 6,
                border: '1px solid #4F8EF7',
                background: activeTab === 'bulk-update' ? '#4F8EF7' : 'white',
                color: activeTab === 'bulk-update' ? 'white' : '#4F8EF7',
                cursor: 'pointer',
                boxShadow: '0 1px 4px #0001',
                marginRight: '8px'
              }}
            >
              Bulk Update
            </button>
            <button 
              onClick={() => setActiveTab('export')} 
              style={{ 
                padding: '0.75rem 1.5rem',
                fontSize: 16,
                borderRadius: 6,
                border: '1px solid #4F8EF7',
                background: activeTab === 'export' ? '#4F8EF7' : 'white',
                color: activeTab === 'export' ? 'white' : '#4F8EF7',
                cursor: 'pointer',
                boxShadow: '0 1px 4px #0001'
              }}
            >
              Export
            </button>
          </div>

          {activeTab === 'projects' && (
            <>
              <h3>Projects</h3>
              <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                <button 
                  onClick={toggleAllProjectsOff}
                  style={{ 
                    padding: '0.5rem 1rem',
                    fontSize: 14,
                    borderRadius: 4,
                    border: '1px solid #dc2626',
                    background: 'white',
                    color: '#dc2626',
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px #0001',
                  }}
                >
                  Hide All Projects
                </button>
                <button 
                  onClick={toggleAllProjectsOn}
                  style={{ 
                    padding: '0.5rem 1rem',
                    fontSize: 14,
                    borderRadius: 4,
                    border: '1px solid #4F8EF7',
                    background: 'white',
                    color: '#4F8EF7',
                    cursor: 'pointer',
                    boxShadow: '0 1px 2px #0001',
                  }}
                >
                  Show All Projects
                </button>
              </div>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {projects
                  .slice()
                  .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
                  .map((proj) => {
                    const originalIdx = projects.findIndex(p => p.name === proj.name);
                    const isVisible = !!projectVisibility[proj.name];
                    return (
                      <li key={proj.name} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                        <button
                          style={{
                            background: originalIdx === selectedProjectIndex ? '#e0e7ff' : 'transparent',
                            border: 'none',
                            textAlign: 'left',
                            flex: 1,
                            padding: '6px 8px',
                            cursor: 'pointer',
                            borderRadius: 4,
                            fontWeight: originalIdx === selectedProjectIndex ? 'bold' : 'normal',
                            color: originalIdx === selectedProjectIndex ? 'black' : 'inherit',
                          }}
                          onClick={() => handleSelectProject(originalIdx)}
                        >
                          {proj.name || '(Untitled)'}
                        </button>
                        <button
                          onClick={() => setProjectVisibility((vis) => ({ ...vis, [proj.name]: !vis[proj.name] }))}
                          style={{ 
                            padding: '4px 8px',
                            fontSize: 12,
                            borderRadius: 4,
                            border: '1px solid #4F8EF7',
                            background: isVisible ? '#4F8EF7' : 'white',
                            color: isVisible ? 'white' : '#4F8EF7',
                            cursor: 'pointer',
                            boxShadow: '0 1px 2px #0001',
                            minWidth: 50,
                          }}
                          title={isVisible ? 'Hide from chart' : 'Show on chart'}
                        >
                          {isVisible ? 'ON' : 'OFF'}
                        </button>
                        <button
                          onClick={() => {
                            setProjects((prev) => prev.filter((_, i) => i !== originalIdx));
                            setSelectedProjectIndex(null);
                          }}
                          style={{ color: '#b91c1c', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}
                          title="Delete project"
                        >
                          ×
                        </button>
                      </li>
                    );
                  })}
              </ul>
            </>
          )}

          {activeTab === 'pools' && (
            <>
              <h3>Pools</h3>
              <button onClick={handleNewPool} style={{ marginBottom: 12 }}>+ New Pool</button>
              <ul style={{ listStyle: 'none', padding: 0 }}>
                {pools.map((pool, idx) => (
                  <li key={idx}>
                    <button
                      style={{
                        background: idx === selectedPoolIndex ? '#e0e7ff' : 'transparent',
                        border: 'none',
                        textAlign: 'left',
                        width: '100%',
                        padding: '6px 8px',
                        cursor: 'pointer',
                        borderRadius: 4,
                        fontWeight: idx === selectedPoolIndex ? 'bold' : 'normal',
                        color: idx === selectedPoolIndex ? 'black' : 'inherit',
                      }}
                      onClick={() => handleSelectPool(idx)}
                    >
                      {pool.name} ({pool.weeklyHours}h)
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        
        <div style={{ flex: 1 }}>
          {/* Form Container with consistent dimensions */}
          <div style={{ 
            minHeight: '600px', 
            width: '100%', 
            padding: '2rem',
            display: 'flex',
            justifyContent: 'center'
          }}>
            {activeTab === 'projects' && (
              showProjectForm ? (
                <ProjectForm
                  key={selectedProjectIndex ?? 'new'}
                  initialData={selectedProjectIndex !== null ? projects[selectedProjectIndex] : undefined}
                  onSave={handleSaveProject}
                  onCancel={handleCancelProject}
                  pools={pools}
                  projects={projects}
                />
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <h2>Project Management</h2>
                  <p style={{ color: '#666', marginBottom: '2rem' }}>
                    Select a project from the sidebar to edit, or create a new project.
                  </p>
                  <button 
                    onClick={handleNewProject}
                    style={{
                      padding: '0.75rem 1.5rem',
                      fontSize: 16,
                      borderRadius: 6,
                      border: '1px solid #4F8EF7',
                      background: '#4F8EF7',
                      color: 'white',
                      cursor: 'pointer',
                      boxShadow: '0 1px 4px #0001',
                    }}
                  >
                    + New Project
                  </button>
                </div>
              )
            )}
            {activeTab === 'pools' && (
              <PoolForm
                key={selectedPoolIndex ?? 'new'}
                initialData={selectedPoolIndex !== null ? pools[selectedPoolIndex] : undefined}
                onSave={handleSavePool}
              />
            )}
            {activeTab === 'bulk-update' && (
              <BulkUpdateForm
                projects={projects}
                pools={pools}
                selectedWeekIndex={selectedWeekIndex}
                selectedWeekStart={selectedWeekStart}
                weekStarts={weekStarts}
                onSave={handleBulkUpdateSave}
                onCancel={handleBulkUpdateCancel}
                onNewProject={handleBulkUpdateNewProject}
                onEditProject={handleBulkUpdateEditProject}
                onWeekSelect={handleWeekSelect}
              />
            )}
            {activeTab === 'export' && (
              <ExportPanel
                projects={projects}
                pools={pools}
                filters={filters}
                onImport={handleImport}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
