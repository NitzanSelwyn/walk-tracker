import { defineSchema, defineTable } from "convex/server";
import { authTables } from "@convex-dev/auth/server";
import { v } from "convex/values";

export default defineSchema({
  ...authTables,

  userProfiles: defineTable({
    userId: v.id("users"),
    displayName: v.string(),
    bio: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    isPublic: v.boolean(),
    totalDistanceKm: v.number(),
    totalRoutes: v.number(),
  }).index("by_userId", ["userId"]),

  routes: defineTable({
    userId: v.id("users"),
    name: v.string(),
    gpxFileId: v.id("_storage"),
    geojson: v.string(),
    distanceKm: v.number(),
    boundingBox: v.object({
      minLat: v.number(),
      maxLat: v.number(),
      minLng: v.number(),
      maxLng: v.number(),
    }),
    color: v.string(),
    routeType: v.optional(v.string()),
    isPublic: v.boolean(),
    startedAt: v.optional(v.number()),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_startedAt", ["userId", "startedAt"]),

  areas: defineTable({
    name: v.string(),
    nameHe: v.optional(v.string()),
    boundingBox: v.object({
      minLat: v.number(),
      maxLat: v.number(),
      minLng: v.number(),
      maxLng: v.number(),
    }),
    totalRoadLengthKm: v.optional(v.number()),
  }).index("by_name", ["name"]),

  roadNetworks: defineTable({
    areaId: v.id("areas"),
    geojson: v.string(),
    totalLengthKm: v.number(),
    roadCount: v.number(),
    fetchedAt: v.number(),
  }).index("by_areaId", ["areaId"]),

  userCoverage: defineTable({
    userId: v.id("users"),
    areaId: v.id("areas"),
    coveredLengthKm: v.number(),
    totalLengthKm: v.number(),
    coveragePercent: v.number(),
    coveredRoadCount: v.number(),
    totalRoadCount: v.number(),
    calculatedAt: v.number(),
  })
    .index("by_userId_areaId", ["userId", "areaId"])
    .index("by_areaId_coveragePercent", ["areaId", "coveragePercent"]),

  follows: defineTable({
    followerId: v.id("users"),
    followingId: v.id("users"),
  })
    .index("by_followerId", ["followerId"])
    .index("by_followingId", ["followingId"])
    .index("by_pair", ["followerId", "followingId"]),

  activities: defineTable({
    userId: v.id("users"),
    type: v.union(
      v.literal("route_upload"),
      v.literal("coverage_milestone"),
      v.literal("area_started")
    ),
    routeId: v.optional(v.id("routes")),
    areaId: v.optional(v.id("areas")),
    metadata: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_createdAt", ["createdAt"]),

  areaCoverageStats: defineTable({
    areaId: v.id("areas"),
    walkerCount: v.number(),
    communityCoveragePercent: v.number(),
    totalCoveredKm: v.number(),
    totalRoadKm: v.number(),
    topContributors: v.array(
      v.object({
        userId: v.id("users"),
        coveragePercent: v.number(),
        coveredKm: v.number(),
        displayName: v.string(),
        image: v.union(v.string(), v.null()),
      })
    ),
    calculatedAt: v.number(),
  }).index("by_areaId", ["areaId"]),

  notifications: defineTable({
    userId: v.id("users"),
    type: v.string(),
    message: v.string(),
    read: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_userId", ["userId"])
    .index("by_userId_read", ["userId", "read"]),
});
