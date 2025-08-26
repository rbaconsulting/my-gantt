# Feature Requests - Gantt Chart App

This document tracks requested features and enhancements for the Gantt chart application.

## Requested Features

### 1. Clickable Project Names in Gantt Chart
**Status:** Requested  
**Description:** Add the ability to click a project name in the Gantt chart to open its properties/form for editing.  
**Priority:** Medium  
**Implementation Notes:** 
- Would need to add click handlers to project name text elements in GanttChart.tsx
- Should open the project form in edit mode
- Consider visual feedback (hover states, cursor changes)

### 2. Modern Form Design Update
**Status:** Requested  
**Description:** Update the look and feel of all forms (ProjectForm, PoolForm, BulkUpdateForm, etc.) to make them more modern looking and simple/minimalistic.  
**Priority:** Medium  
**Implementation Notes:**
- Current forms use basic styling with borders and backgrounds
- Could benefit from:
  - Cleaner typography
  - Better spacing and layout
  - Modern input styling
  - Subtle shadows and rounded corners
  - Consistent color scheme
  - Better visual hierarchy

## Completed Features

### 1. Configurable Standard Week Hours
**Status:** ✅ Completed  
**Description:** Made the 40-hour work week assumption configurable per pool while maintaining 40 as the default.  
**Implementation Details:**
- Added `standardWeekHours` field to PoolData interface
- Updated PoolForm to include configurable standard week hours input
- Modified allocation calculations to use pool-specific standard week hours
- Updated all date calculations and utilization logic to respect pool configuration
- Maintained backward compatibility with existing pools
**Benefits:** More flexible resource planning for teams with different work schedules (e.g., 35h, 37.5h, 40h weeks)

### 2. Performance Optimizations
**Status:** ✅ Completed  
**Description:** Implemented comprehensive performance optimizations for better scalability with large project portfolios.  
**Implementation Details:**
- **Project Pre-processing**: Added `ProcessedProject` interface to avoid repeated date parsing and status checking
- **Utilization Caching**: Implemented `UtilizationCache` class with 2-minute TTL for repeated calculations
- **Batch Calculations**: Optimized future week warnings with pre-allocated arrays and single-pass processing
- **Memoization**: Used React `useMemo` for expensive project processing operations
- **Pool Project Mapping**: Created efficient lookup maps for projects by pool and week
- **Cache Invalidation**: Automatic cache clearing when projects or pools change
- **Virtual Scrolling**: Implemented virtual scrolling for Gantt chart to handle large numbers of projects efficiently
- **Web Workers**: Moved heavy utilization calculations to background threads using Web Workers
- **Scroll Optimization**: Added scroll event handling with buffer zones for smooth scrolling performance
**Benefits:** Significantly improved performance for large datasets, reduced redundant calculations, better memory management, smooth scrolling with 1000+ projects, non-blocking UI during heavy calculations

---

**Last Updated:** December 2024  
**Document Version:** 1.0 