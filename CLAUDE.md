# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a coffee shop order display system for Middle Street Coffee. It's a single-page application that displays orders from Zettle (iZettle) POS system in real-time on a barista-facing display. The system features visual order aging indicators to help baristas prioritize older orders.

## Architecture

### Frontend (index.html)
- **Single HTML file** containing embedded React 18 application (loaded via CDN)
- **No build step** - runs directly in the browser using Babel standalone for JSX transformation
- Uses Tailwind CSS 2.2.19 (CDN) for styling with extensive custom CSS for the display experience
- All state management is client-side using React hooks and localStorage

### Backend (Netlify Functions)
- **get-orders.js**: Fetches today's orders from Zettle API using OAuth JWT bearer token authentication
  - Retrieves access token from Zettle OAuth endpoint
  - Fetches purchases starting from midnight of current day
  - Formats orders with items, quantities, variants, and comments
  - Returns orders sorted by timestamp (most recent first)

- **mark-complete.js**: Accepts order completion events (currently a no-op that just returns success)

- **get-completed-orders.js**: Placeholder endpoint for completed orders tracking

### Order Display Features
- **Order aging visualization**: Orders gradually get a brown overlay that darkens over time
  - 0-5 minutes: Light brown overlay (opacity 0 → 0.7)
  - 5-10 minutes: Darkening brown with transition to dark theme text
  - 10+ minutes: Full dark brown background with white text and red timestamp
- **New order highlight**: Green tint for orders less than 2 minutes old
- **Audio notification**: Plays a tone when new orders arrive
- **Daily order numbering**: Sequential numbering (1, 2, 3...) that resets at midnight
- **Completion tracking**: Uses localStorage to track completed orders (persists across page reloads)
- **Undo functionality**: Can undo the last completed order
- **Connection warnings**: Alerts if no updates received for 60+ seconds

### State Management
- Completed orders stored in localStorage as a Set of order IDs
- Orders auto-refresh every 5 seconds via polling
- Only displays orders from the current day
- Client-side filtering hides completed orders without removing them from the data

## Development

### Local Development
```bash
# Install dependencies
npm install

# Run development server (Netlify Dev)
netlify dev
```

The dev server runs on port 8888 by default.

### Environment Variables
Required in Netlify environment:
- `ZETTLE_CLIENT_ID`: OAuth client ID for Zettle API
- `ZETTLE_CLIENT_SECRET`: JWT assertion for Zettle API authentication

### Testing Changes
- Frontend changes: Edit index.html directly, refresh browser
- Function changes: Modify files in netlify/functions/, Netlify Dev will auto-reload
- No build process required for frontend changes

### Key Implementation Details

**Order Filtering Logic**:
- `activeOrders` (line 506-514 in index.html): Filters all orders to only today's orders
- `visibleOrders` (line 634): Further filters to exclude completed orders
- Order completion is client-side only via localStorage

**Timestamp Handling**:
- All order times are in ISO format from Zettle API
- Display shows 24-hour time format (HH:MM)
- Aging calculations compare current time to order timestamp every 5 seconds

**Grid Layout**:
- Responsive grid with auto-fill columns (minmax 280px, 1fr)
- Mobile: Single column layout
- Desktop: Multi-column grid with equal-height cards

## Deployment

Deployed on Netlify with automatic deployments from git repository.

```bash
# Manual deployment (if needed)
netlify deploy --prod
```

The build command is `npm install` and functions are in `netlify/functions`.

## Version History
Current version: 2.4.0 (displayed in header)

### Recent Updates (v2.4.0)
- Updated to React 18 with new createRoot API
- Kept Tailwind CSS at 2.2.19 for compatibility
- Updated Node.js to v20 for Netlify Functions
- Removed e-ink display specific styling
- Updated build configuration for modern Netlify image
