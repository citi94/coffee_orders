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
- `activeOrders`: Filters all orders to only today's orders using useMemo
- `visibleOrders`: Further filters to exclude completed orders
- Order completion is client-side only via localStorage (persists across reloads)
- Daily order numbering pre-calculated with useMemo for O(n) performance

**Timestamp Handling**:
- All order times are in ISO format from Zettle API
- Server-side respects SHOP_TIMEZONE (configurable in get-orders.js, default: America/New_York)
- Display shows 24-hour time format (HH:MM)
- Aging calculations compare current time to order timestamp every 5 seconds

**Audio System**:
- Requires user interaction (browser autoplay policy)
- AudioContext initialized on "Enable Sound" button click
- Three-tone notification: E5 (659.25Hz) → G5 (783.99Hz) → C6 (1046.50Hz)
- Square wave oscillator for maximum volume
- Gain levels: 0.9-1.0 (near maximum)
- Automatically closes AudioContext on component unmount

**Debug Mode**:
- Activated by holding version number for 2 seconds or Ctrl+Shift+D
- Tracks all API calls with response times and error history
- Shows live order statistics and system state
- Can simulate orders for testing without affecting production data
- Export functionality creates timestamped JSON debug dump

**Grid Layout**:
- Responsive grid with auto-fill columns (minmax 280px, 1fr)
- Mobile: Single column layout
- Desktop: Multi-column grid with equal-height cards

**Error Handling**:
- All API calls wrapped in try-catch with proper error logging
- Failed requests tracked in debug stats
- User-friendly error messages displayed in UI
- Technical errors logged to console for debugging

## Deployment

Deployed on Netlify with automatic deployments from git repository.

```bash
# Manual deployment (if needed)
netlify deploy --prod
```

The build command is `npm install` and functions are in `netlify/functions`.

## Version History
Current version: 2.5.0 (displayed in header)

### Recent Updates (v2.5.0 - Production Hardening)
**Critical Bug Fixes:**
- Fixed OAuth/API error handling with comprehensive status checks and validation
- Fixed race condition in polling mechanism using loadingRef to prevent simultaneous requests
- Fixed order completion bug - now only updates localStorage after successful API response
- Fixed AudioContext memory leak with proper cleanup on unmount
- Fixed timezone issues for midnight transitions (configurable SHOP_TIMEZONE in get-orders.js)
- Added localStorage error handling for quota exceeded scenarios
- Optimized order number calculation from O(n²) to O(n) using useMemo

**Audio System Overhaul:**
- Completely redesigned notification sound system
- Three-tone ascending pattern (E5→G5→C6) using square wave for maximum volume
- Proper browser autoplay policy compliance with user interaction requirement
- AudioContext state management with suspend/resume handling
- Enable Sound button for initialization
- Maximum gain (0.9-1.0) optimized for noisy coffee shop environment

**Comprehensive Debug Mode:**
- Matrix-style terminal UI with fixed panel (bottom-right)
- Testing tools: simulate orders, test sound, force refresh, clear all
- Live monitoring: API response times, fetch counts, error tracking
- Order analytics: total/active/visible/completed statistics
- System info: AudioContext state, loading status, localStorage size
- Error history with timestamps (last 10 errors)
- Export debug log as JSON file
- Long-press activation (2 seconds on version number) or Ctrl+Shift+D
- Persists across sessions via localStorage

**Data Validation:**
- Validates all purchase objects have required fields (purchaseUUID, products array)
- Filters out malformed orders from Zettle API
- Handles empty product arrays gracefully
- Proper error logging with console output

### v2.4.0
- Updated to React 18 with new createRoot API
- Kept Tailwind CSS at 2.2.19 for compatibility
- Updated Node.js to v20 for Netlify Functions
- Removed e-ink display specific styling
- Updated build configuration for modern Netlify image (Ubuntu Noble 24.04)
