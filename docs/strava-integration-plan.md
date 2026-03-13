# Strava Integration — Work Plan

## Overview

Add automatic route import from Strava via their REST API v3. Users connect their Strava account once, and new walk/run activities are automatically synced as routes in Walk Tracker Map. This feature is **gated to premium and admin users only**.

---

## Prerequisites

### 1. Register a Strava API Application

- Go to https://www.strava.com/settings/api
- Create an application with:
  - **App Name:** Walk Tracker Map
  - **Website:** `https://prestigious-porpoise-870.eu-west-1.convex.site`
  - **Authorization Callback Domain:** `prestigious-porpoise-870.eu-west-1.convex.site`
- Save the **Client ID** and **Client Secret**

### 2. Set Convex Environment Variables

```bash
npx convex env set STRAVA_CLIENT_ID <your_client_id>
npx convex env set STRAVA_CLIENT_SECRET <your_client_secret>
```

---

## Phase 1 — Database Schema

### File: `convex/schema.ts`

Add two new tables:

```typescript
stravaConnections: defineTable({
  userId: v.id("users"),
  stravaAthleteId: v.number(),       // Strava's athlete ID
  accessToken: v.string(),            // Current access token
  refreshToken: v.string(),           // For token renewal
  tokenExpiresAt: v.number(),         // Unix timestamp (seconds)
  scope: v.string(),                  // Granted scopes (e.g. "activity:read_all")
  athleteFirstName: v.optional(v.string()),
  athleteLastName: v.optional(v.string()),
  connectedAt: v.number(),            // When user connected
  lastSyncAt: v.optional(v.number()), // Last successful sync timestamp
})
  .index("by_userId", ["userId"])
  .index("by_stravaAthleteId", ["stravaAthleteId"]),

stravaImports: defineTable({
  userId: v.id("users"),
  stravaActivityId: v.number(),       // Strava's activity ID
  routeId: v.id("routes"),            // Created route in our system
  activityName: v.string(),
  activityType: v.string(),           // "Walk", "Run", "Ride", etc.
  distanceKm: v.number(),
  startedAt: v.number(),
  importedAt: v.number(),
})
  .index("by_userId", ["userId"])
  .index("by_stravaActivityId", ["stravaActivityId"]),
```

### File: `convex/errorCodes.ts`

Add new error codes:

```typescript
STRAVA_NOT_CONNECTED = "STRAVA_NOT_CONNECTED",
STRAVA_TOKEN_EXPIRED = "STRAVA_TOKEN_EXPIRED",
STRAVA_API_ERROR = "STRAVA_API_ERROR",
STRAVA_ALREADY_CONNECTED = "STRAVA_ALREADY_CONNECTED",
STRAVA_ACTIVITY_ALREADY_IMPORTED = "STRAVA_ACTIVITY_ALREADY_IMPORTED",
PREMIUM_REQUIRED = "PREMIUM_REQUIRED",
```

---

## Phase 2 — Premium Gate Helper

### File: `convex/premiumHelpers.ts`

Create a reusable helper for premium/admin gating:

```typescript
import { QueryCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

export async function requirePremiumOrAdmin(
  ctx: QueryCtx,
  userId: Id<"users">
): Promise<void> {
  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_userId", (q) => q.eq("userId", userId))
    .unique();

  const role = profile?.role ?? "regular";
  if (role !== "premium" && role !== "admin") {
    throwAppError(ErrorCode.PREMIUM_REQUIRED);
  }
}
```

This uses the existing `role` field on `userProfiles` which already supports `"regular" | "premium" | "admin"`.

---

## Phase 3 — OAuth Flow (Backend)

The Strava OAuth flow uses the **Authorization Code** grant. Since our frontend is an SPA and we need server-side token exchange, we use Convex HTTP actions for the callback.

### Flow Diagram

```
┌──────────┐       ┌───────────────┐       ┌──────────────┐
│ Frontend  │       │  Strava OAuth │       │ Convex HTTP  │
│           │       │  Server       │       │ Endpoint     │
└─────┬─────┘       └──────┬────────┘       └──────┬───────┘
      │  1. Click                                   │
      │  "Connect Strava"                           │
      │─────────────────────►                       │
      │  2. Redirect to                             │
      │  strava.com/oauth                           │
      │                      │                      │
      │                      │ 3. User authorizes   │
      │                      │                      │
      │                      │ 4. Redirect to       │
      │                      │────────────────────► │
      │                      │   /strava/callback   │
      │                      │   ?code=xxx          │
      │                      │                      │
      │                      │ 5. Exchange code     │
      │                      │◄────────────────────│
      │                      │   for tokens         │
      │                      │────────────────────► │
      │                      │                      │
      │                      │ 6. Store tokens in   │
      │                      │   stravaConnections  │
      │                      │                      │
      │ 7. Redirect back     │                      │
      │  to app with success │◄─────────────────── │
      │◄─────────────────────│                      │
```

### File: `convex/http.ts`

Add three HTTP routes:

#### GET `/strava/authorize`

Initiates the OAuth flow. Generates the Strava authorization URL with:
- `client_id` from env
- `redirect_uri` = `{CONVEX_SITE_URL}/strava/callback`
- `response_type` = `code`
- `scope` = `activity:read_all`
- `state` = JWT or signed token containing the user's Convex `userId` (for security — prevents CSRF and links the callback to the correct user)

Returns a redirect (302) to Strava's authorization page.

#### GET `/strava/callback`

Handles Strava's redirect after user authorizes:

1. Extract `code` and `state` from query params
2. Validate `state` to get the `userId`
3. Exchange `code` for tokens via POST to `https://www.strava.com/oauth/token`:
   ```
   POST https://www.strava.com/oauth/token
   {
     client_id, client_secret, code, grant_type: "authorization_code"
   }
   ```
4. Response contains: `access_token`, `refresh_token`, `expires_at`, `athlete` object
5. Call internal mutation to store the connection in `stravaConnections`
6. Redirect user back to frontend: `{SITE_URL}/settings?strava=connected`

#### POST `/strava/webhook`

Handles Strava webhook events (subscription push):

1. **Validation challenge** (GET): Strava sends `hub.mode`, `hub.challenge`, `hub.verify_token` — respond with the challenge to confirm subscription
2. **Event push** (POST): Receives activity events
   - Filter for `object_type === "activity"` and `aspect_type === "create"`
   - Look up the `stravaAthleteId` → find the `stravaConnections` doc → get `userId`
   - Schedule an internal action to fetch and import the activity

---

## Phase 4 — Token Management

### File: `convex/strava.ts`

#### `refreshStravaToken` (internal action)

Strava access tokens expire every 6 hours. Before any API call:

1. Check if `tokenExpiresAt < now`
2. If expired, POST to `https://www.strava.com/oauth/token`:
   ```
   { client_id, client_secret, refresh_token, grant_type: "refresh_token" }
   ```
3. Update `stravaConnections` with new `accessToken`, `refreshToken`, `tokenExpiresAt`
4. Return the valid access token

#### `getValidToken` (internal action helper)

Wraps the refresh logic — always returns a valid access token:

```typescript
async function getValidToken(ctx, userId): Promise<string> {
  const connection = await ctx.runQuery(internal.strava.getConnection, { userId });
  if (!connection) throw ...;

  if (connection.tokenExpiresAt <= Math.floor(Date.now() / 1000) + 60) {
    // Token expired or expiring within 60s — refresh
    return await refreshAndReturnToken(ctx, connection);
  }
  return connection.accessToken;
}
```

---

## Phase 5 — Activity Sync (Backend)

### File: `convex/stravaSync.ts` (action — `"use node"`)

#### `importStravaActivity` (internal action)

Called by the webhook handler or manual sync. For a single Strava activity:

1. Get valid access token (refresh if needed)
2. Fetch activity details:
   ```
   GET https://www.strava.com/api/v3/activities/{id}
   Authorization: Bearer {token}
   ```
3. Fetch activity GPS stream:
   ```
   GET https://www.strava.com/api/v3/activities/{id}/streams?keys=latlng,time,altitude&key_type=time
   Authorization: Bearer {token}
   ```
4. Check if already imported (query `stravaImports` by `stravaActivityId`)
5. Convert stream data to GeoJSON (same format as GPX parser output):
   - Build a `LineString` feature from `latlng` stream
   - Calculate distance using `@turf/turf` (or use Strava's `distance` field)
   - Calculate bounding box
   - Determine `routeType` from Strava's `type` field (`Walk` → `"walk"`, `Run` → `"walk"`, `Ride` → `"bike"`)
6. Store the GeoJSON as a route via `ctx.runMutation(internal.routes.createFromStrava, {...})`
7. Record the import in `stravaImports`

#### `syncRecentActivities` (action — user-triggered or scheduled)

Bulk sync for initial connection or manual refresh:

1. Get valid token
2. Fetch recent activities:
   ```
   GET https://www.strava.com/api/v3/athlete/activities?per_page=30&after={lastSyncAt}
   ```
3. Filter for Walk/Run types (configurable)
4. For each unimported activity, call `importStravaActivity`
5. Update `lastSyncAt` on the connection

### File: `convex/routes.ts`

#### `createFromStrava` (internal mutation)

Similar to existing `saveRoute` but:
- Called internally (no auth check — userId passed directly)
- Sets `isPublic: true` (matches current behavior)
- Generates a color automatically
- Creates the activity feed entry
- Updates profile stats (totalRoutes, totalDistanceKm)
- Does NOT store a GPX file (no `gpxFileId`) — the field is already optional or can be made optional

---

## Phase 6 — Strava Queries & Mutations (User-facing)

### File: `convex/strava.ts`

#### Queries

| Function | Access | Description |
|----------|--------|-------------|
| `getConnection` | Authenticated + premium | Returns Strava connection status (connected, athlete name, last sync) — strips tokens |
| `getImportHistory` | Authenticated + premium | Paginated list of imported activities |

#### Mutations

| Function | Access | Description |
|----------|--------|-------------|
| `disconnect` | Authenticated + premium | Deletes `stravaConnections` doc, optionally revokes token via Strava API |

#### Actions

| Function | Access | Description |
|----------|--------|-------------|
| `startOAuth` | Authenticated + premium | Generates the authorization URL with signed state |
| `syncNow` | Authenticated + premium | Triggers manual sync of recent activities |

All user-facing functions must call `requirePremiumOrAdmin(ctx, userId)` before proceeding.

---

## Phase 7 — Webhook Subscription Setup

Strava requires a one-time webhook subscription creation. This is done manually or via a setup script:

```bash
curl -X POST https://www.strava.com/api/v3/push_subscriptions \
  -F client_id=YOUR_CLIENT_ID \
  -F client_secret=YOUR_CLIENT_SECRET \
  -F callback_url=https://prestigious-porpoise-870.eu-west-1.convex.site/strava/webhook \
  -F verify_token=YOUR_VERIFY_TOKEN
```

The `verify_token` is a secret string we choose — stored as env var `STRAVA_WEBHOOK_VERIFY_TOKEN`. The webhook GET handler must echo back `hub.challenge` when Strava sends a subscription validation request.

### Environment Variables (total)

```bash
npx convex env set STRAVA_CLIENT_ID <value>
npx convex env set STRAVA_CLIENT_SECRET <value>
npx convex env set STRAVA_WEBHOOK_VERIFY_TOKEN <value>   # Any random string we pick
```

---

## Phase 8 — Frontend

### New Route: `/settings`

A settings page (or a tab/section in the profile page) for managing integrations.

### File: `src/pages/SettingsPage.tsx` (or section in ProfilePage)

#### Strava Connection Card

For **premium/admin users**:

```
┌─────────────────────────────────────────────────────┐
│  🔗 Strava Integration                    [Premium] │
│                                                     │
│  ┌─ Not Connected ─────────────────────────────┐    │
│  │                                             │    │
│  │  Connect your Strava account to             │    │
│  │  automatically import your walks.           │    │
│  │                                             │    │
│  │  [Connect Strava]                           │    │
│  └─────────────────────────────────────────────┘    │
│                                                     │
│  ── OR when connected ──                            │
│                                                     │
│  ┌─ Connected ─────────────────────────────────┐    │
│  │  ✓ Connected as John Doe                    │    │
│  │  Last synced: 2 hours ago                   │    │
│  │  23 activities imported                     │    │
│  │                                             │    │
│  │  [Sync Now]           [Disconnect]          │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

For **regular users**:

```
┌─────────────────────────────────────────────────────┐
│  🔗 Strava Integration                              │
│                                                     │
│  Automatically import walks from Strava.            │
│  Available for Premium members.                     │
│                                                     │
│  [Upgrade to Premium]                               │
└─────────────────────────────────────────────────────┘
```

#### Connect Flow (Frontend)

1. User clicks "Connect Strava"
2. Frontend calls a query/action to get the authorization URL
3. `window.location.href = authUrl` — redirect to Strava
4. User authorizes on Strava
5. Strava redirects to our Convex HTTP callback
6. Callback processes tokens, redirects to `{SITE_URL}/settings?strava=connected`
7. Frontend shows success toast and updates UI

#### Disconnect Flow

1. User clicks "Disconnect"
2. Confirmation dialog
3. Call `strava.disconnect` mutation
4. UI updates to "Not Connected" state

### Import History Section

Optional: Show a list of auto-imported activities with links to the original Strava activity.

```
┌─────────────────────────────────────────────────────┐
│  Recent Imports                                     │
│                                                     │
│  🏃 Morning Walk — 3.2 km — 2h ago                 │
│  🏃 Evening Stroll — 1.8 km — Yesterday            │
│  🏃 Park Loop — 5.1 km — 2 days ago                │
│                                                     │
│  Showing 3 of 23 imports                            │
└─────────────────────────────────────────────────────┘
```

---

## Phase 9 — i18n

### Files: `src/i18n/en.json` and `src/i18n/he.json`

Add translation keys under a new `"strava"` section:

```json
{
  "strava": {
    "title": "Strava Integration",
    "premiumBadge": "Premium",
    "connectDesc": "Connect your Strava account to automatically import your walks and runs.",
    "connect": "Connect Strava",
    "connected": "Connected as {{name}}",
    "lastSync": "Last synced: {{time}}",
    "importCount": "{{count}} activities imported",
    "syncNow": "Sync Now",
    "syncing": "Syncing...",
    "disconnect": "Disconnect",
    "disconnectConfirm": "Disconnect Strava? Your imported routes will remain.",
    "premiumRequired": "Automatically import walks from Strava. Available for Premium members.",
    "upgradeCta": "Upgrade to Premium",
    "connectionSuccess": "Strava connected successfully!",
    "connectionError": "Failed to connect Strava. Please try again.",
    "syncSuccess": "{{count}} new activities imported",
    "syncNoNew": "No new activities to import",
    "recentImports": "Recent Imports",
    "importedActivities": "Showing {{shown}} of {{total}} imports"
  }
}
```

Plus corresponding Hebrew translations.

Add new error message translations for `PREMIUM_REQUIRED`, `STRAVA_NOT_CONNECTED`, etc.

---

## Phase 10 — Route Schema Update

The existing `routes` table has `gpxFileId: v.id("_storage")` which is required. For Strava-imported routes, there's no GPX file. Two options:

**Option A (Preferred):** Make `gpxFileId` optional

```typescript
// In schema.ts routes table:
gpxFileId: v.optional(v.id("_storage")),
```

Add a source field to distinguish:

```typescript
source: v.optional(v.union(v.literal("gpx_upload"), v.literal("strava"))),
```

**Option B:** Generate a synthetic GPX from the Strava stream data and store it. More complex, less necessary.

Go with **Option A** — add `source` field, make `gpxFileId` optional. Existing routes default to `source: "gpx_upload"`.

---

## Implementation Order

| Step | Task | Files | Depends On |
|------|------|-------|------------|
| 1 | Add schema tables + make `gpxFileId` optional + add `source` field | `convex/schema.ts` | — |
| 2 | Add error codes | `convex/errorCodes.ts` | — |
| 3 | Add i18n strings | `src/i18n/en.json`, `src/i18n/he.json` | — |
| 4 | Create premium gate helper | `convex/premiumHelpers.ts` | Step 1 |
| 5 | Create HTTP endpoints (authorize, callback, webhook) | `convex/http.ts` | Step 1 |
| 6 | Create token management (refresh, getValidToken) | `convex/strava.ts` | Step 1, 5 |
| 7 | Create activity sync action (import + bulk sync) | `convex/stravaSync.ts` | Step 6 |
| 8 | Create internal route mutation for Strava imports | `convex/routes.ts` | Step 1 |
| 9 | Create user-facing queries/mutations (getConnection, disconnect, syncNow) | `convex/strava.ts` | Step 6, 7 |
| 10 | Add routing for `/settings` page | `src/App.tsx` | — |
| 11 | Build Settings/Strava UI | `src/pages/SettingsPage.tsx` | Step 9, 10 |
| 12 | Handle `?strava=connected` callback param + toast | `src/pages/SettingsPage.tsx` | Step 11 |
| 13 | Register Strava webhook subscription (manual/one-time) | CLI / curl | Step 5 |
| 14 | Set Convex env vars | Convex dashboard | — |
| 15 | End-to-end testing | — | All |

---

## Security Considerations

- **Tokens stored server-side only.** Access tokens and refresh tokens never reach the frontend. Queries that return connection info must strip token fields.
- **OAuth state parameter.** The authorize URL includes a signed `state` token containing the Convex userId + expiry. The callback validates this before storing tokens. This prevents CSRF attacks.
- **Webhook validation.** The webhook endpoint verifies the `verify_token` on subscription validation and checks that events come from known `stravaAthleteId`s.
- **Premium gating.** All Strava endpoints check the user's role before proceeding. The webhook handler also verifies the connected user still has premium access before importing.
- **Rate limiting.** Strava API has rate limits (100 requests/15min, 1000/day). The sync action should respect these — batch imports should be staggered, and errors should be retried with backoff.
- **Token scope.** Request only `activity:read_all` scope (read-only). Never request write scopes.
- **Revocation on disconnect.** When a user disconnects, call Strava's deauthorize endpoint to revoke our access.

---

## Strava API Endpoints Used

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `https://www.strava.com/oauth/authorize` | GET (redirect) | Start OAuth flow |
| `https://www.strava.com/oauth/token` | POST | Exchange code / refresh token |
| `https://www.strava.com/oauth/deauthorize` | POST | Revoke access on disconnect |
| `https://www.strava.com/api/v3/athlete/activities` | GET | List recent activities |
| `https://www.strava.com/api/v3/activities/{id}` | GET | Activity details |
| `https://www.strava.com/api/v3/activities/{id}/streams` | GET | GPS coordinate streams |
| `https://www.strava.com/api/v3/push_subscriptions` | POST | Create webhook subscription |

---

## Open Questions

1. **Premium payments.** There's no payment system yet. For now, premium can be set manually by admins via the database. A future payment integration (Stripe, etc.) is out of scope for this task.
2. **Activity type filtering.** Should we import only Walk/Run, or also Ride/Hike? Suggest defaulting to Walk + Run + Hike, with a future setting to customize.
3. **Historical import limit.** On first connect, how far back should we sync? Suggest last 90 days or last 50 activities, whichever is smaller.
4. **Duplicate detection.** If a user manually uploads a GPX and also has the same activity on Strava, we'd get duplicates. We could check by comparing `startedAt` timestamps within a tolerance, but this adds complexity. Suggest deferring this to a later iteration.
5. **Settings page vs. profile page.** Should Strava settings live on a new `/settings` page or as a section within the existing profile page? A dedicated settings page is cleaner and scales for future integrations.
