# Privacy Zones — Work Plan

## Problem

When users upload walking routes, the GPS tracks reveal where they live — most walks start and end at home. Anyone viewing a user's public routes (via UserMapPage, community map, or feed) can pinpoint their home address.

### Current Exposure Points

| Surface | What's Exposed | File |
|---------|---------------|------|
| **UserMapPage** | Full route GeoJSON for all public/friend routes | `convex/routes.ts` → `getRoutesByUserId` |
| **Community map** | Full GeoJSON of all public routes in an area | `convex/community.ts` → `getAllPublicRoutes` |
| **Bounding boxes** | Approximate route extents (min/max lat/lng) | `routes.boundingBox` field |
| **Coverage data** | Which specific roads a user has walked | `convex/coverageHelpers.ts` |

---

## Solution: Privacy Zones + Auto-Trim

Two layers of protection:

1. **Privacy Zones** — User-defined areas where route data is clipped before being shown to others. Two shape modes:
   - **Circle** (quick mode) — Click a point, pick a radius. Fast for home/work.
   - **Polygon** (custom mode) — Draw a freeform shape on the map. For irregular areas like a neighborhood block, gated community, or campus.
2. **Auto-Trim** — Default behavior that trims the first and last 200m of every route for users who haven't set up zones yet

### How It Works

```
Owner's view (unchanged):          Other users see:

🏠════════════════════►           ···⬤═══════════════►
Full route, all coordinates       Route starts at zone boundary,
                                  coordinates inside zone removed
```

- **Server-side clipping.** The full route is never sent to other users. Clipping happens on the backend, so even inspecting network requests won't reveal the hidden segments.
- **Pre-computed.** Clipped geometry is computed and stored when routes are uploaded or zones are changed — not on every query. This keeps reads fast.
- **Owner always sees full route.** Privacy zones only affect what others see.

---

## Phase 1 — Schema Changes

### File: `convex/schema.ts`

#### New table: `privacyZones`

Supports two zone shapes via a discriminated union:

```typescript
privacyZones: defineTable({
  userId: v.id("users"),
  label: v.string(),                    // "Home", "Work", custom label
  isActive: v.boolean(),                // Can be temporarily disabled
  createdAt: v.number(),

  // Zone shape — discriminated union
  shape: v.union(
    // Circle: click a point, pick a radius
    v.object({
      type: v.literal("circle"),
      center: v.object({
        lat: v.number(),
        lng: v.number(),
      }),
      radiusMeters: v.number(),         // 200, 500, or 1000
    }),
    // Polygon: draw a custom shape on the map
    v.object({
      type: v.literal("polygon"),
      coordinates: v.array(             // Array of [lat, lng] vertices
        v.object({
          lat: v.number(),
          lng: v.number(),
        })
      ),                                // Min 3 points, auto-closed
    }),
  ),
})
  .index("by_userId", ["userId"]),
```

#### Modify `routes` table — add `publicGeojson` field

```typescript
routes: defineTable({
  // ... existing fields ...
  geojson: v.string(),                           // Full route (owner only)
  publicGeojson: v.optional(v.string()),          // Clipped route (others see this)
  publicBoundingBox: v.optional(v.object({        // Clipped bounding box
    minLat: v.number(),
    maxLat: v.number(),
    minLng: v.number(),
    maxLng: v.number(),
  })),
  isHiddenByZone: v.optional(v.boolean()),        // True if route is entirely within a zone
})
```

#### Modify `userProfiles` table — add auto-trim preference

```typescript
userProfiles: defineTable({
  // ... existing fields ...
  autoTrimMeters: v.optional(v.number()),         // Default: 200. Set to 0 to disable.
  hasPrivacyZones: v.optional(v.boolean()),       // Quick check flag
})
```

### File: `convex/errorCodes.ts`

```typescript
PRIVACY_ZONE_LIMIT = "PRIVACY_ZONE_LIMIT",       // Max 5 zones per user
PRIVACY_ZONE_NOT_FOUND = "PRIVACY_ZONE_NOT_FOUND",
```

---

## Phase 2 — Clipping Engine

### File: `convex/privacyClip.ts` (`"use node"`)

This is the core algorithm. It runs as an internal action since it needs `@turf/turf` (Node.js).

#### `clipRouteGeojson(geojson, zones, autoTrimMeters)`

Input:
- `geojson`: Full route GeoJSON string
- `zones`: Array of zone shapes (circles and/or polygons)
- `autoTrimMeters`: Number of meters to trim from start/end (0 = disabled)

Algorithm:

```
1. Parse GeoJSON → extract LineString coordinates

2. AUTO-TRIM (if no zones set, or as additional layer):
   - Walk from the start, accumulating distance until autoTrimMeters reached
   - Remove those coordinates from the beginning
   - Walk from the end, same process
   - If route < 2× autoTrimMeters, mark as fully hidden

3. CONVERT ZONES TO TURF POLYGONS:
   For each zone:
   - If circle → turf.circle([lng, lat], radiusMeters/1000, {units:'kilometers'})
   - If polygon → turf.polygon([coordinates.map(c => [c.lng, c.lat])]])
   Both produce a standard GeoJSON Polygon that turf can work with uniformly.

4. ZONE CLIPPING (for each turf polygon):
   a. Walk through coordinates:
      - For each point, check: turf.booleanPointInPolygon(point, polygon)
      - Track transitions: outside→inside = end current segment
                           inside→outside = start new segment
   b. Collect all "outside" segments

5. Build result:
   - If 0 segments remain → isHiddenByZone = true, publicGeojson = null
   - If 1 segment → LineString
   - If 2+ segments → MultiLineString
   - Recompute publicBoundingBox from remaining coordinates

6. Return { publicGeojson, publicBoundingBox, isHiddenByZone }
```

The key insight is that `turf.booleanPointInPolygon` works identically for circle-derived polygons and user-drawn polygons. The shape type only matters at the conversion step (step 3) — after that, the clipping logic is unified.

#### Edge Cases

| Case | Handling |
|------|----------|
| Route entirely inside a zone | `isHiddenByZone = true`, route hidden from others |
| Route passes through zone mid-path | Split into 2+ segments (MultiLineString) |
| Multiple zones overlap | Clip against each zone sequentially |
| Very short route (< 400m) with auto-trim | Fully hidden |
| Route grazes zone edge | Small gap appears where zone clips the line |
| No zones AND auto-trim = 0 | `publicGeojson = geojson` (no clipping) |

#### Interpolation at Zone Boundary

When a route segment crosses from outside to inside a zone, the exact intersection point should be calculated (not just the nearest recorded coordinate). This prevents revealing the zone's exact boundary position:

```
Recorded points:   A -------- B -------- C
                        (zone boundary crosses here)
                              ↕
Without interpolation: A ──── B           (reveals zone edge is near B)
With interpolation:    A ──── X           (X is the actual intersection)
```

Use `turf.lineIntersect()` or manually interpolate between the last outside point and the first inside point.

---

## Phase 3 — Recomputation Pipeline

When do we need to recompute `publicGeojson`?

| Trigger | Scope | Implementation |
|---------|-------|----------------|
| Route uploaded | Single route | In the `saveRoute` mutation, schedule clipping action |
| Privacy zone created | All user's routes | Schedule bulk recomputation |
| Privacy zone updated (center/radius) | All user's routes | Schedule bulk recomputation |
| Privacy zone deleted | All user's routes | Schedule bulk recomputation |
| Privacy zone toggled (active/inactive) | All user's routes | Schedule bulk recomputation |
| Auto-trim setting changed | All user's routes | Schedule bulk recomputation |

### File: `convex/privacyZones.ts`

#### `recomputePublicRoutes` (internal action)

```typescript
"use node";

export const recomputePublicRoutes = internalAction({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    // 1. Fetch all active zones for user
    const zones = await ctx.runQuery(internal.privacyZones.getActiveZones, { userId });

    // 2. Fetch auto-trim setting
    const profile = await ctx.runQuery(internal.privacyZones.getUserTrimSetting, { userId });
    const autoTrimMeters = zones.length > 0 ? 0 : (profile.autoTrimMeters ?? 200);

    // 3. Fetch all routes for user
    const routes = await ctx.runQuery(internal.privacyZones.getAllUserRoutes, { userId });

    // 4. For each route, clip and update
    for (const route of routes) {
      const result = clipRouteGeojson(route.geojson, zones, autoTrimMeters);
      await ctx.runMutation(internal.privacyZones.updateRoutePublicGeojson, {
        routeId: route._id,
        publicGeojson: result.publicGeojson,
        publicBoundingBox: result.publicBoundingBox,
        isHiddenByZone: result.isHiddenByZone,
      });
    }
  },
});
```

#### On route upload — clip single route

Modify existing `saveRoute` in `convex/routes.ts`:

```typescript
// After inserting the route...
const routeId = await ctx.db.insert("routes", { ... });

// Schedule clipping (runs async, doesn't block the mutation)
await ctx.scheduler.runAfter(0, internal.privacyZones.clipSingleRoute, {
  routeId,
  userId,
});
```

---

## Phase 4 — Query Changes (Serve Clipped Data)

This is the critical security layer. Every query that returns route data to non-owners must return `publicGeojson` instead of `geojson`.

### File: `convex/routes.ts`

#### `getRoutesByUserId` — modify return logic

```typescript
// Current: returns route.geojson to everyone
// New: return route.geojson to owner, route.publicGeojson to others

const isOwner = viewerId === targetUserId;

const mappedRoutes = routes.map((route) => {
  if (isOwner) return route;  // Owner sees everything

  // Skip routes entirely hidden by zones
  if (route.isHiddenByZone) return null;

  return {
    ...route,
    geojson: route.publicGeojson ?? route.geojson,  // Fallback for routes not yet clipped
    boundingBox: route.publicBoundingBox ?? route.boundingBox,
  };
}).filter(Boolean);
```

### File: `convex/community.ts`

#### `getAllPublicRoutes` — same treatment

```typescript
// When collecting public routes for the community map:
const publicRoute = {
  ...route,
  geojson: route.publicGeojson ?? route.geojson,
  boundingBox: route.publicBoundingBox ?? route.boundingBox,
};

// Skip if fully hidden
if (route.isHiddenByZone) continue;
```

### Bounding Box Filtering

The community map uses bounding boxes to filter routes by area. Update this to use `publicBoundingBox` when checking overlap, so hidden routes don't appear as results.

---

## Phase 5 — Privacy Zone CRUD (Backend)

### File: `convex/privacyZones.ts`

#### Queries

| Function | Args | Returns | Notes |
|----------|------|---------|-------|
| `getMyZones` | — | `PrivacyZone[]` | Authenticated user's zones |

#### Mutations

| Function | Args | Returns | Notes |
|----------|------|---------|-------|
| `createCircleZone` | `{ label, center, radiusMeters }` | `Id<"privacyZones">` | Max 5 zones. Schedules recompute. |
| `createPolygonZone` | `{ label, coordinates }` | `Id<"privacyZones">` | Max 5 zones. Schedules recompute. |
| `updateZone` | `{ zoneId, label?, shape?, isActive? }` | — | Schedules recompute if geometry changed. |
| `deleteZone` | `{ zoneId }` | — | Schedules recompute. |

#### Validation

**Common:**
- `label` max length: 30 characters
- Max 5 zones per user (query count before insert)
- User must own the zone to update/delete

**Circle zones:**
- `radiusMeters` must be one of: `200`, `500`, `1000` (enforced by validator)
- Center must be valid lat/lng (-90 to 90, -180 to 180)

**Polygon zones:**
- Minimum 3 vertices (triangle is the simplest valid polygon)
- Maximum 20 vertices (prevent absurdly complex shapes — keeps clipping fast)
- All coordinates must be valid lat/lng
- No self-intersections — validate with `turf.kinks()`: if it returns any kinks, reject with error
- Maximum area limit: ~25 km² (prevent users from hiding an entire city). Validate with `turf.area()`
- Polygon is auto-closed (last point connects back to first — don't require the user to close it)

---

## Phase 6 — Auto-Trim Setting (Backend)

### File: `convex/users.ts`

Add to `updateProfile` mutation:

```typescript
// New optional field:
autoTrimMeters: v.optional(v.number()),  // 0, 100, 200, 500
```

When changed, schedule `recomputePublicRoutes` for the user.

**Default behavior:**
- Users with privacy zones: auto-trim is **disabled** (zones handle it)
- Users without privacy zones: auto-trim defaults to **200m**
- Users can explicitly set auto-trim to 0 to disable it entirely

---

## Phase 7 — Frontend: Privacy Zone Manager

### New dependency: `leaflet-draw`

For polygon drawing on the map. Install:

```bash
npm install leaflet-draw @types/leaflet-draw
```

`leaflet-draw` provides drawing tools (polygon, rectangle, etc.) that integrate natively with Leaflet. It adds a toolbar to the map that lets users click to place polygon vertices, with undo/finish controls.

### File: `src/components/privacy/PrivacyZoneManager.tsx`

This component lives in the Settings page. It lists existing zones and provides creation entry points:

```
┌─────────────────────────────────────────────────────────┐
│  Privacy Zones                                          │
│                                                         │
│  Hide the start and end of your routes near             │
│  sensitive locations like home or work.                  │
│                                                         │
│  ┌─ Home ───────────────── Circle ─────────────────┐    │
│  │  📍 32.0853, 34.7818        Radius: 500m       │    │
│  │  [Edit on Map]              [Delete]            │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  ┌─ Neighborhood ──────── Polygon (8 vertices) ───┐    │
│  │  📐 Custom shape                                │    │
│  │  [Edit on Map]              [Delete]            │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  [+ Add Privacy Zone]   (2/5 zones used)                │
│                                                         │
│  ── Auto-Trim ──                                        │
│  Trim route start/end when no zones are set: [200m ▾]   │
└─────────────────────────────────────────────────────────┘
```

When "Add Privacy Zone" is clicked, a shape picker appears:

```
┌─────────────────────────────────────────────────────────┐
│  Choose zone shape                                      │
│                                                         │
│  ┌──────────────────┐    ┌──────────────────┐           │
│  │                  │    │                  │           │
│  │     ┌─────┐      │    │    ╱‾‾‾‾╲       │           │
│  │     │  .  │      │    │   ╱      ╲      │           │
│  │     │     │      │    │  ╱        ╲     │           │
│  │     └─────┘      │    │  ╲________╱     │           │
│  │                  │    │                  │           │
│  │  ● Circle        │    │  ▲ Custom Shape  │           │
│  │  Quick & simple  │    │  Draw any area   │           │
│  └──────────────────┘    └──────────────────┘           │
└─────────────────────────────────────────────────────────┘
```

### File: `src/components/privacy/PrivacyZoneMap.tsx`

A modal map editor that handles both circle and polygon creation/editing.

#### Circle Mode

- Click on map to place the zone center
- Draggable marker for adjustment
- Circle overlay updates in real-time with selected radius
- Radius selector: 200m / 500m / 1km

```
┌─────────────────────────────────────────────────────────┐
│  Place your privacy zone (circle)            [× Close]  │
│  ┌─────────────────────────────────────────────────┐    │
│  │                                                 │    │
│  │              ┌───────────┐                      │    │
│  │              │   . . .   │                      │    │
│  │              │  . 📍  .  │  ← Draggable marker  │    │
│  │              │   . . .   │  ← Circle radius     │    │
│  │              └───────────┘                      │    │
│  │                                                 │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  Label: [Home_________]    Radius: (○200m ●500m ○1km)   │
│                                                         │
│  [Cancel]                                  [Save Zone]  │
└─────────────────────────────────────────────────────────┘
```

#### Polygon Mode

- Uses `leaflet-draw`'s polygon tool
- User clicks to place vertices, double-click or click first point to close
- Toolbar provides: finish, delete last point, cancel
- After drawing, vertices are draggable for fine-tuning
- Validation feedback: red outline if self-intersecting or too large

```
┌─────────────────────────────────────────────────────────┐
│  Draw your privacy zone                      [× Close]  │
│  ┌─────────────────────────────────────────────────┐    │
│  │  Click to place points. Double-click to finish. │    │
│  │                                                 │    │
│  │          ●───────────●                          │    │
│  │         ╱              ╲                         │    │
│  │        ╱                ╲                        │    │
│  │       ●                  ●                       │    │
│  │        ╲              ╱                          │    │
│  │          ●──────────●   ← Drag vertices to edit │    │
│  │                                                 │    │
│  └─────────────────────────────────────────────────┘    │
│                                                         │
│  Label: [Neighborhood___]         8 vertices · 0.3 km²  │
│                                                         │
│  [Cancel]        [Clear & Redraw]          [Save Zone]  │
└─────────────────────────────────────────────────────────┘
```

**Editing existing polygon zones:**
- Load the saved polygon as an editable Leaflet layer
- Vertices are draggable
- User can clear and redraw from scratch if needed

### Map Page: Zone Visualization (Owner Only)

On the user's own MapPage, show privacy zones as semi-transparent overlays so they can see what areas are protected. Render the correct shape for each zone type:

```typescript
// In MapPage.tsx — only for the authenticated owner
{zones?.map((zone) => {
  const style = {
    color: "#6366f1",
    fillColor: "#6366f1",
    fillOpacity: 0.08,
    weight: 1.5,
    dashArray: "6 4",
  };

  if (zone.shape.type === "circle") {
    return (
      <Circle
        key={zone._id}
        center={[zone.shape.center.lat, zone.shape.center.lng]}
        radius={zone.shape.radiusMeters}
        pathOptions={style}
      />
    );
  }

  // Polygon zone
  return (
    <Polygon
      key={zone._id}
      positions={zone.shape.coordinates.map((c) => [c.lat, c.lng])}
      pathOptions={style}
    />
  );
})}
```

---

## Phase 8 — i18n

### Files: `src/i18n/en.json` and `src/i18n/he.json`

```json
{
  "privacy": {
    "title": "Privacy Zones",
    "description": "Hide the start and end of your routes near sensitive locations like home or work.",
    "addZone": "Add Privacy Zone",
    "editZone": "Edit Privacy Zone",
    "deleteZone": "Delete Zone",
    "deleteConfirm": "Delete this privacy zone? Your routes will be recalculated.",
    "zoneCount": "{{count}}/{{max}} zones used",
    "zoneLimitReached": "Maximum {{max}} privacy zones allowed",
    "labelPlaceholder": "e.g. Home, Work, School",
    "labelHome": "Home",
    "labelWork": "Work",
    "saving": "Saving...",
    "recalculating": "Updating route visibility...",
    "editOnMap": "Edit on Map",
    "active": "Active",
    "inactive": "Inactive",

    "chooseShape": "Choose zone shape",
    "shapeCircle": "Circle",
    "shapeCircleDesc": "Quick & simple — click a point, pick a radius",
    "shapePolygon": "Custom Shape",
    "shapePolygonDesc": "Draw any area on the map",

    "circlePlaceTitle": "Place your privacy zone",
    "circleDragToAdjust": "Drag the marker to adjust position",
    "radius": "Radius",
    "radius200": "200m",
    "radius500": "500m",
    "radius1000": "1 km",

    "polygonDrawTitle": "Draw your privacy zone",
    "polygonDrawHint": "Click to place points. Double-click to finish.",
    "polygonVertices": "{{count}} vertices",
    "polygonArea": "{{area}} km²",
    "polygonClearRedraw": "Clear & Redraw",
    "polygonTooFewPoints": "At least 3 points required",
    "polygonSelfIntersecting": "Shape cannot cross itself",
    "polygonTooLarge": "Zone is too large (max 25 km²)",
    "polygonTooManyVertices": "Maximum 20 vertices allowed",

    "autoTrim": "Auto-Trim",
    "autoTrimDesc": "Trim route start and end when no privacy zones are set",
    "autoTrimOff": "Off"
  }
}
```

Plus Hebrew equivalents.

---

## Phase 9 — Settings Page / Integration Point

### Option A: New Settings Page at `/settings`

Create a dedicated settings page with sections:
- Privacy Zones (this feature)
- Strava Integration (from the Strava plan)
- Profile Privacy (move existing isPublic/isMapPublic toggles here)

### Option B: Section in Profile Page

Add a "Privacy" tab or collapsible section in the existing ProfilePage.

**Recommendation:** Go with **Option A** — a `/settings` page. It's cleaner, scales for future features, and keeps the profile page focused on social display. Both this feature and the Strava integration need a settings home.

### File: `src/pages/SettingsPage.tsx`

```
┌──────────────────────────────────────────────────────┐
│  ⚙ Settings                                          │
│                                                      │
│  ┌─ Privacy ────────────────────────────────────┐    │
│  │  Privacy Zones                               │    │
│  │  [PrivacyZoneManager component]              │    │
│  │                                              │    │
│  │  Profile Visibility                          │    │
│  │  [Existing isPublic / isMapPublic toggles]   │    │
│  └──────────────────────────────────────────────┘    │
│                                                      │
│  ┌─ Integrations ──────────────────────────────┐     │
│  │  Strava (Premium)                           │     │
│  │  [Future — from Strava plan]                │     │
│  └─────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────┘
```

### Routing: `src/App.tsx`

Add route: `<Route path="/settings" element={<SettingsPage />} />`

### Navigation: `src/components/layout/Header.tsx`

Add "Settings" link (gear icon) to the header nav.

---

## Implementation Order

| Step | Task | Files | Depends On |
|------|------|-------|------------|
| 1 | Add `privacyZones` table (union schema) + route fields | `convex/schema.ts` | — |
| 2 | Add error codes + i18n strings | `convex/errorCodes.ts`, `src/i18n/*.json` | — |
| 3 | Build clipping engine (handles both circles & polygons) | `convex/privacyClip.ts` | — |
| 4 | Build auto-trim logic | `convex/privacyClip.ts` | Step 3 |
| 5 | Create zone CRUD mutations/queries (both shape types) | `convex/privacyZones.ts` | Step 1 |
| 6 | Build recomputation pipeline (single route + bulk) | `convex/privacyZones.ts` | Steps 3, 5 |
| 7 | Hook into `saveRoute` — clip on upload | `convex/routes.ts` | Step 6 |
| 8 | **Modify `getRoutesByUserId`** — serve `publicGeojson` | `convex/routes.ts` | Step 1 |
| 9 | **Modify `getAllPublicRoutes`** — serve `publicGeojson` | `convex/community.ts` | Step 1 |
| 10 | Install `leaflet-draw` + types | `package.json` | — |
| 11 | Add `/settings` route + page shell | `src/App.tsx`, `src/pages/SettingsPage.tsx` | — |
| 12 | Build PrivacyZoneManager UI (list + shape picker) | `src/components/privacy/PrivacyZoneManager.tsx` | Steps 5, 11 |
| 13 | Build PrivacyZoneMap — circle mode | `src/components/privacy/PrivacyZoneMap.tsx` | Step 12 |
| 14 | Build PrivacyZoneMap — polygon mode (leaflet-draw) | `src/components/privacy/PrivacyZoneMap.tsx` | Steps 10, 13 |
| 15 | Add zone overlays (circle + polygon) to owner's MapPage | `src/pages/MapPage.tsx` | Step 5 |
| 16 | Add auto-trim setting to profile update | `convex/users.ts` | Step 4 |
| 17 | Backfill: run recomputation for all existing users | One-time migration action | Steps 6, 7 |
| 18 | Add settings link to nav header | `src/components/layout/Header.tsx` | Step 11 |

**Critical path:** Steps 1 → 3 → 6 → 7 → 8 → 9 (backend security is the priority)

**Frontend path:** Steps 10 → 11 → 12 → 13 → 14 (circle mode first, polygon second)

---

## Security Considerations

- **Server-side only.** Clipping MUST happen on the backend. The frontend never receives coordinates inside privacy zones. This is non-negotiable — CSS/JS hiding is not security.
- **No zone geometry exposure.** Zone center, radius, and polygon coordinates are never sent to other users. Only the owner can see their zones. The clipping just removes segments — the gap in the route doesn't reveal the exact zone shape.
- **Bounding box sanitization.** `publicBoundingBox` must be recomputed from the clipped geometry only. The original bounding box can reveal route extents inside zones.
- **Polygon validation is security-critical.** Self-intersecting polygons can cause unexpected behavior in `turf.booleanPointInPolygon`. Always validate with `turf.kinks()` before saving. Reject invalid shapes server-side even if the frontend validates too.
- **Coverage data.** Coverage percentages per area are currently public. For phase 1, this is acceptable (area-level granularity is coarse enough). Future: exclude zone-overlapping road segments from public coverage stats.
- **Race conditions.** If a user uploads a route while a zone recomputation is running, the new route might not be clipped. The `saveRoute` hook handles this by scheduling its own clip job.
- **Zone deletion warning.** When deleting a zone, warn the user that previously hidden route segments will become visible to others.
- **Polygon coordinate storage.** Polygon coordinates are stored in the database. Ensure the `getMyZones` query is only accessible to the zone owner — never expose zone geometry in any public-facing query.

---

## Open Questions

1. **Max zones count.** 5 seems reasonable. Should admin users get more?
2. **Default auto-trim for existing users.** When we deploy this, should all existing users get 200m auto-trim applied retroactively? This would change what others currently see. Suggest: yes, with a one-time notification.
3. **Coverage data.** Should coverage stats also be hidden near privacy zones? This adds significant complexity. Suggest: defer to a later iteration.
4. **Settings page.** This feature introduces a `/settings` page. The Strava integration plan also needs one. Should we build the settings page shell first as a shared foundation? Suggest: yes, build the page shell in step 11, then both features add their sections.
5. **leaflet-draw alternatives.** `leaflet-draw` is the most popular option but has some maintenance concerns. Alternatives include `@geoman-io/leaflet-geoman-free` (more actively maintained, richer API) or a custom implementation using Leaflet click handlers. Suggest: start with `leaflet-draw` as it's simpler and well-documented with React-Leaflet; switch to geoman only if we hit issues.
6. **Polygon editing UX.** After saving a polygon zone, should users be able to add/remove individual vertices, or only redraw from scratch? Suggest: allow vertex dragging for fine-tuning (leaflet-draw supports this), plus a "Clear & Redraw" button for starting over.
