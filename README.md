# My Gantt Chart App

A comprehensive Gantt chart application built with React, TypeScript, and Vite. Features project management, pool allocation, filtering, bulk updates, and data export/import capabilities.

## Features

- **Interactive Gantt Chart**: Visual project timeline with D3.js
- **Project Management**: Create, edit, and manage projects with detailed information
- **Pool Management**: Define resource pools with weekly hour allocations
- **Advanced Filtering**: Filter by status, pool, date range, progress, and search
- **Bulk Updates**: Manage concurrent project allocations for the current week
- **Data Export/Import**: Export filtered data, full backups, and CSV reports
- **Local Storage**: Data persists in your browser
- **Responsive Design**: Works on desktop and mobile devices

## Live Demo

Visit the live application: [My Gantt Chart App](https://rbaconsulting.github.io/my-gantt/)

## Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment

This app is configured for GitHub Pages deployment:

1. **Repository created** at https://github.com/rbaconsulting/my-gantt.git
2. **Base URL configured** in `vite.config.ts` to match repository name:
   ```typescript
   base: '/my-gantt/'
   ```
3. **Push your code** to the main branch
4. **Enable GitHub Pages** in your repository settings:
   - Go to Settings → Pages
   - Source: "GitHub Actions"
5. **The app will automatically deploy** when you push changes

## Data Persistence

- All data is stored in your browser's localStorage
- Data persists between sessions and browser restarts
- Export/import functionality allows data backup and sharing
- No server required - completely client-side application

## Browser Compatibility

- Modern browsers with ES2020 support
- Chrome, Firefox, Safari, Edge
- Mobile browsers supported

## License

MIT License - feel free to use and modify as needed.
