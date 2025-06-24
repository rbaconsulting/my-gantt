# Gantt Chart App – Requirements

## Core Technologies
- React (with TypeScript)
- Vite (build tool)
- D3.js (for Gantt chart rendering)
- LocalStorage (for persistence)
- GitHub Pages (for deployment)

## Features

### Project & Pool Management
- Add, edit, and delete projects
- Add, edit, and delete pools (resource groups)
- Each project has: name, sponsor, pool, start date, target date, estimated hours, progress, status, weekly allocation, notes, last modified timestamp
- Each pool has: name, weekly hours, description, color, last modified timestamp

### Gantt Chart
- Visualizes all projects as bars on a timeline
- Responsive width and height
- Color-coded by pool and status
- Rotated date labels for readability
- Over-allocation warnings for pools (current week)
- Tooltips with project details
- Legends for status and pools

### Filtering & Bulk Updates
- Filter projects by status, pool, date range, progress, and search
- Bulk update form for concurrent projects in a pool for the current week
- Even distribution of allocation among active projects
- Over-allocation warning in bulk update

### Export/Import
- Export filtered data as JSON or CSV
- Export full backup (all data) as JSON
- Import data with conflict summary (shows what will be added, updated, deleted, or kept)
- Confirm import before applying changes
- Revert to previous state after import (undo import)
- All import/export includes last modified timestamps for conflict resolution

### Persistence
- All data is stored in browser localStorage
- Data persists across sessions and page reloads

### UI/UX
- Responsive layout
- Sidebar for project/pool selection and visibility toggles
- "Show All/Hide All Projects" buttons
- Consistent, modern styling
- Accessible forms and controls

### Other
- TypeScript strict mode, linting, and error handling
- `.gitignore` excludes build, node_modules, and local files
- Favicon support

### Deployment
- GitHub Actions workflow for automatic deployment to GitHub Pages
- Vite config uses correct `base` for subfolder deployment 