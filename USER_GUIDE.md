# Gantt Chart App – User Guide

## What is This Tool?
This is a web-based Gantt chart and resource management tool for tracking projects, resource pools, and allocations over time. It runs entirely in your browser and saves your data locally.

---

## Getting Started

### Accessing the App
- Visit: [https://rbaconsulting.github.io/my-gannt/](https://rbaconsulting.github.io/my-gannt/)
- No login or signup required. All data is stored in your browser.

---

## Main Features

### 1. Project Management
- **Add Project:** Click "+" New Project" in the Projects tab. Fill in details and save.
- **Edit Project:** Click a project name in the sidebar, then edit and save.
- **Delete Project:** Click the "×" next to a project in the sidebar.
- **Show/Hide Project:** Toggle ON/OFF to show or hide a project in the Gantt chart.

### 2. Pool Management
- **Add Pool:** Click "+" New Pool" in the Pools tab. Fill in details and save.
- **Edit Pool:** Click a pool name in the sidebar, then edit and save.

### 3. Gantt Chart
- **View Timeline:** All projects are shown as bars, color-coded by pool and status.
- **Legends:** See color keys for status and pools above the chart.
- **Tooltips:** Hover over a bar for project details.
- **Over-allocation Warnings:** If a pool is over-allocated in the current week, a warning appears.

### 4. Filtering
- Use the Filter Panel above the chart to filter by:
  - Status
  - Pool
  - Date range
  - Progress
  - Search (by name, sponsor, or notes)

### 5. Bulk Update
- Go to the "Bulk Update" tab.
- Select a pool to see all concurrent projects for the current week.
- Adjust allocations or toggle project activity.
- Click "Distribute Evenly" to split allocation among active projects.
- Save changes when done.

### 6. Export & Import
- **Export Filtered Data:** Download current filtered projects as JSON or CSV.
- **Export Full Backup:** Download all data as JSON.
- **Import Data:** Paste JSON data and click "Import Data."
  - Review the conflict summary.
  - Click "Confirm Import" to apply changes.
  - Use "Revert to Previous State" to undo the import if needed.

---

## Persistence & Data Safety
- All changes are saved automatically in your browser's localStorage.
- Data is private to your device/browser.
- Use Export/Import to back up or transfer data.

---

## Tips for New Users
- **Start by defining your resource pools** (e.g., teams, departments).
- **Add projects** and assign them to pools.
- **Use the Gantt chart** to visualize timelines and allocations.
- **Check for over-allocation** warnings to avoid resource conflicts.
- **Regularly export a backup** for safekeeping.

---

## Troubleshooting
- **Data missing after refresh?** Check if your browser is in private/incognito mode (localStorage may not persist).
- **App not loading?** Try a hard refresh (Ctrl+Shift+R or Cmd+Shift+R).
- **Import not working?** Ensure your JSON is valid and matches the expected format.

---

## Advanced
- **Deploy your own copy:** Fork the repo, update the Vite `base` config, and enable GitHub Pages.
- **Customize pools, statuses, and colors** in the source code for your organization's needs.

---

## Support
- For issues or feature requests, open an issue on [GitHub](https://github.com/rbaconsulting/my-gannt). 