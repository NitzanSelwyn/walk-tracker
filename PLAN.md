# Walk Tracker Map - Implementation Plan

## Context

Build a collaborative web app where users upload GPX files to track which roads/streets they've walked. The app shows personal coverage percentage within a selected area (city/region/country), and lets users follow others to see their progress. The project is greenfield (empty directory).

**Priority order:** Personal tracking > Social/follow system > Community map

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite + TypeScript + Tailwind CSS v4 |
| Maps | React-Leaflet + Leaflet (free, OSM tiles) |
| GPX parsing | `@mapbox/togeojson` (GPX → GeoJSON) |
| Geometry | `@turf/turf` (distance, intersections, buffers) |
| Backend + DB | Convex (real-time DB, auth, file storage, serverless functions) |
| Auth | Convex Auth (Google OAuth only) |
| i18n | `i18next` + `react-i18next` (English + Hebrew with RTL support) |
| Road data | Overpass API (OpenStreetMap) |

## Project Structure

```
walk-tracker-map/
├── convex/
│   ├── schema.ts          # Full DB schema
│   ├── auth.ts            # Convex Auth config (Google + GitHub)
│   ├── http.ts            # HTTP routes (OAuth callbacks)
│   ├── users.ts           # User profile queries/mutations
│   ├── routes.ts          # GPX route CRUD + file upload
│   ├── areas.ts           # Area selection queries/mutations
│   ├── roadNetwork.ts     # Overpass API action + caching
│   ├── coverage.ts        # Coverage calculation (Turf.js)
│   ├── follows.ts         # Follow/unfollow system
│   ├── activities.ts      # Activity feed
│   └── leaderboard.ts     # Leaderboard queries
├── src/
│   ├── main.tsx           # Entry point with providers
│   ├── App.tsx            # Router setup
│   ├── index.css          # Tailwind import
│   ├── pages/
│   │   ├── HomePage.tsx
│   │   ├── MapPage.tsx
│   │   ├── LoginPage.tsx
│   │   ├── ProfilePage.tsx
│   │   ├── CoveragePage.tsx
│   │   ├── FeedPage.tsx
│   │   ├── LeaderboardPage.tsx
│   │   └── CommunityPage.tsx
│   ├── components/
│   │   ├── layout/        # Header, Sidebar, Layout
│   │   ├── auth/          # SignInForm, UserMenu
│   │   ├── map/           # MapContainer, RouteLayer, RoadNetworkLayer, AreaSelector
│   │   ├── gpx/           # GpxUploader, GpxPreview, RouteList
│   │   ├── coverage/      # CoverageStats, ProgressBar, AreaPicker
│   │   ├── social/        # FollowButton, UserCard, ActivityItem, CompareView
│   │   └── ui/            # Button, Card, Modal, Spinner, DropZone
│   ├── hooks/
│   │   ├── useGpxParser.ts
│   │   ├── useMapBounds.ts
│   │   ├── useCoverage.ts
│   │   └── useFileUpload.ts
│   ├── i18n/
│   │   ├── index.ts       # i18next configuration
│   │   ├── en.json        # English translations
│   │   └── he.json        # Hebrew translations
│   ├── lib/
│   │   ├── gpx.ts         # GPX parsing utilities
│   │   ├── geo.ts         # Turf.js geometry helpers
│   │   ├── overpass.ts    # Overpass query builder
│   │   └── constants.ts
│   └── types/
│       ├── route.ts
│       ├── area.ts
│       └── user.ts
└── public/
```

---

## Phase 1: Project Setup & Foundation ✅ COMPLETE

### Steps

1. **Scaffold project** — `npm create vite@latest . -- --template react-ts`

2. **Install dependencies:**
   ```
   react-router-dom, tailwindcss, @tailwindcss/vite,
   convex, @convex-dev/auth, @auth/core,
   leaflet, react-leaflet, @types/leaflet,
   @mapbox/togeojson, @turf/turf,
   i18next, react-i18next, i18next-browser-languagedetector
   ```

3. **Configure Tailwind v4** — Add `@tailwindcss/vite` plugin to `vite.config.ts`, add `@import "tailwindcss"` to `index.css` (no `tailwind.config.js` needed in v4)

4. **Initialize Convex** — `npx convex dev` + `npx @convex-dev/auth`

5. **Define initial schema** (`convex/schema.ts`) — `userProfiles` table extending auth users

6. **Set up auth** (`convex/auth.ts`, `convex/http.ts`) — Google OAuth only

7. **Entry point** (`src/main.tsx`) — Wrap app in `ConvexAuthProvider` + `BrowserRouter`

8. **Routing** (`src/App.tsx`) — Use `Authenticated`/`Unauthenticated` from Convex, routes for Home, Map, Profile

9. **Layout components** — Header with nav links + UserMenu, Layout wrapper

10. **Auth UI** — LoginPage with "Sign in with Google" button, UserMenu dropdown with sign-out

11. **i18n setup** — Configure `i18next` with `react-i18next`:
    - Create `src/i18n/` directory with `en.json` and `he.json` translation files
    - Auto-detect browser language via `i18next-browser-languagedetector`
    - Language toggle button in Header
    - Set `dir="rtl"` on `<html>` when Hebrew is active
    - Tailwind RTL support using `rtl:` variant classes

### Deliverable
User can sign in with Google, see a dashboard skeleton, navigate between pages in English or Hebrew, sign out.

---

## Phase 2: Core Map & GPX Upload (MVP)

### Steps

1. **Map component** (`src/components/map/MapContainer.tsx`)
   - React-Leaflet with OSM tiles
   - Fix Leaflet default icon paths for Vite bundler
   - Full-height responsive layout

2. **GPX parsing utilities** (`src/lib/gpx.ts`)
   - Use `@mapbox/togeojson` to convert GPX XML → GeoJSON
   - Use `@turf/turf` to calculate distance (km) and bounding box
   - Extract timestamps from GPX track properties

3. **GPX upload flow:**
   - `GpxUploader` component — drag-and-drop zone + file picker (accepts `.gpx`)
   - `useGpxParser` hook — reads file, parses to GeoJSON, extracts metadata
   - `GpxPreview` — shows parsed route on map before confirming save
   - `useFileUpload` hook — 3-step Convex upload: `generateUploadUrl` → `POST` file → `saveRoute` mutation

4. **Route backend** (`convex/routes.ts`)
   - `generateUploadUrl` — get signed URL for GPX file storage
   - `saveRoute` — stores route with GeoJSON (stringified), distance, bounding box, random color
   - `getUserRoutes` — query user's routes
   - `deleteRoute` / `renameRoute` — route management mutations

5. **Route display** (`src/components/map/RouteLayer.tsx`)
   - Render routes as colored GeoJSON polylines on map
   - Use unique `key` prop to force re-render on data change (React-Leaflet caveat)

6. **Route list sidebar** (`src/components/gpx/RouteList.tsx`)
   - Color swatch, name, distance, date for each route
   - Click to zoom/pan map to route
   - Inline rename, delete with confirmation
   - Toggle visibility on map

7. **MapPage assembly** — Collapsible sidebar (upload + route list) + full map

### Database tables used
- `routes` — indexes: `by_userId`, `by_userId_startedAt`

### Deliverable
User can upload GPX files, see routes on the map with colors, manage routes (rename/delete), data persists in Convex.

---

## Phase 3: Personal Coverage Tracking

This is the hardest and most valuable phase.

### Steps

1. **Area selection** (`src/components/coverage/AreaPicker.tsx`)
   - Searchable dropdown of pre-defined cities/regions
   - Each city has a stored bounding box in `areas` table
   - Seed a few cities to start (Tel Aviv, Jerusalem, etc.)
   - Show selected area as a rectangle overlay on map

2. **Overpass API integration** (`convex/roadNetwork.ts`)
   - Convex **action** (not mutation) that calls Overpass API server-side
   - Overpass QL query fetches all walkable roads (`highway` types: residential, footway, path, pedestrian, etc.) within bounding box
   - Convert OSM JSON → GeoJSON LineStrings (build node lookup map, resolve way nodes to coordinates)
   - Cache result in `roadNetworks` table (30-day TTL)
   - Handle rate limits, loading states, area size limits

3. **Coverage calculation** (`convex/coverage.ts`)
   - Runs as Convex action with `"use node"` (for Turf.js)
   - Algorithm (buffer-based, MVP approach):
     1. For each user route, create 20m buffer polygon via `turf.buffer`
     2. For each road in the network, check `turf.booleanIntersects` with any route buffer
     3. Sum covered road lengths → coverage % = covered / total * 100
   - Store result in `userCoverage` table (materialized/cached)
   - Auto-recalculate after new route upload via `ctx.scheduler.runAfter`

4. **Coverage visualization** (`src/components/map/RoadNetworkLayer.tsx`)
   - Covered roads: green, weight 3, opacity 0.9
   - Uncovered roads: gray, weight 1, opacity 0.3
   - For 10K+ roads: use Leaflet's `L.geoJSON` directly via `useMap` hook (not individual React components) for performance

5. **Coverage dashboard** (`src/components/coverage/CoverageStats.tsx`)
   - Large coverage % number, animated progress bar
   - Covered distance / total distance in km
   - Roads covered / total roads count
   - "Recalculate" button

6. **CoveragePage** — Area picker + map with coverage overlay + stats panel

### Database tables used
- `areas` — index: `by_name`
- `roadNetworks` — index: `by_areaId`
- `userCoverage` — indexes: `by_userId_areaId`, `by_areaId_coveragePercent`

### Key technical decisions
- **GeoJSON as stringified JSON** — Convex validators for deeply nested GeoJSON would be too verbose; 1MB doc limit is sufficient for routes
- **Buffer-based matching (not snap-to-road)** — Simple MVP approach. Future upgrade: Mapbox Map Matching API for HMM-based road snapping
- **Overpass called server-side** — Enables caching for all users, hides query patterns

### Deliverable
User can select a city, see road network loaded on map, see covered (green) vs uncovered (gray) roads, see coverage % with stats dashboard.

---

## Phase 4: Social Features

### Steps

1. **Follow system** (`convex/follows.ts`)
   - `follow` / `unfollow` mutations with duplicate check
   - `getFollowing` / `getFollowers` / `isFollowing` queries
   - `by_pair` index for fast existence checks

2. **Public user profiles** (`src/pages/ProfilePage.tsx`)
   - Avatar, name, bio, total stats
   - Coverage stats per tracked area
   - Their routes on a mini-map (public only)
   - Follow/Unfollow button
   - Follower/following counts

3. **Activity feed** (`convex/activities.ts`)
   - Activities created on: route upload, coverage milestone, area started
   - Feed query: get followed users' IDs, fetch recent activities, filter in-memory
   - (Fan-out-on-read is fine for <1000 users; upgrade to fan-out-on-write later)

4. **Feed page** (`src/pages/FeedPage.tsx`)
   - Cards showing "[User] uploaded Morning Walk (5.2km)", "[User] reached 25% in Tel Aviv!"
   - Mini-map previews, click to navigate

5. **Leaderboard** (`convex/leaderboard.ts`, `src/pages/LeaderboardPage.tsx`)
   - Per-area ranking by coverage %
   - Uses `by_areaId_coveragePercent` index for efficient sorting
   - Current user highlighted

6. **Coverage comparison** (`src/components/social/CompareView.tsx`)
   - Select two users, overlay routes in different colors
   - Side-by-side stats

### Database tables used
- `follows` — indexes: `by_followerId`, `by_followingId`, `by_pair`
- `activities` — indexes: `by_userId`, `by_createdAt`

### Deliverable
User can follow others, see activity feed, view leaderboards, compare coverage with friends.

---

## Phase 5: Community & Polish

### Steps

1. **Community map** — Aggregate all public routes into a heatmap layer (`leaflet.heat`) or color roads by unique walker count

2. **Area/city pages** — Community coverage %, active walker count, top contributors

3. **Notifications** — New `notifications` table, bell icon with unread badge, real-time via Convex `useQuery`

4. **Mobile responsiveness** — Bottom sheet sidebar, full-height map, touch-friendly upload, bottom nav bar

5. **Performance optimization:**
   - `React.lazy()` for code splitting
   - Canvas renderer for Leaflet (`preferCanvas: true`)
   - `turf.simplify` to reduce GeoJSON size before storage
   - Virtual scrolling for long lists

6. **PWA support (optional)** — `vite-plugin-pwa`, offline tile cache, queued uploads

### Deliverable
Polished, mobile-friendly app with community features and good performance.

---

## Full Database Schema

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | Auth (managed by Convex Auth) | email |
| `userProfiles` | Extended profile data | userId, displayName, bio, isPublic, totalDistanceKm, totalRoutes |
| `routes` | Uploaded GPX routes | userId, name, gpxFileId, geojson (string), distanceKm, boundingBox, color, isPublic |
| `areas` | Tracked cities/regions | name, boundingBox, polygon, totalRoadLengthKm |
| `roadNetworks` | Cached Overpass road data | areaId, geojson (string), totalLengthKm, roadCount, fetchedAt |
| `userCoverage` | Calculated coverage per user+area | userId, areaId, coveredLengthKm, totalLengthKm, coveragePercent |
| `follows` | Social graph | followerId, followingId |
| `activities` | Activity feed entries | userId, type, routeId?, areaId?, createdAt |
| `notifications` | User notifications (Phase 5) | userId, type, message, read, createdAt |

---

## Verification Plan

After each phase:

- **Phase 1:** Sign in with Google/GitHub → see dashboard → navigate pages → sign out
- **Phase 2:** Upload a real `.gpx` file → see route on map → rename/delete → refresh page (data persists)
- **Phase 3:** Select a city → see roads load → upload GPX in that area → see coverage % update → green/gray road colors
- **Phase 4:** Create 2 accounts → follow each other → upload routes → see feed updates → check leaderboard
- **Phase 5:** Test on mobile browser → verify community map → check notification bell → test with many routes for performance
