import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { ErrorCode, throwAppError } from "./errorCodes";
import { areFriends } from "./friendHelpers";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throwAppError(ErrorCode.AUTH_NOT_AUTHENTICATED);
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveRoute = mutation({
  args: {
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
    startedAt: v.optional(v.number()),
    avgSpeedKmh: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throwAppError(ErrorCode.AUTH_NOT_AUTHENTICATED);

    const routeId = await ctx.db.insert("routes", {
      userId,
      name: args.name,
      gpxFileId: args.gpxFileId,
      geojson: args.geojson,
      distanceKm: args.distanceKm,
      boundingBox: args.boundingBox,
      color: args.color,
      routeType: args.routeType,
      isPublic: true,
      startedAt: args.startedAt,
      avgSpeedKmh: args.avgSpeedKmh,
    });

    // Schedule privacy zone clipping
    await ctx.scheduler.runAfter(
      0,
      internal.privacyZoneClipping.clipSingleRoute,
      { routeId, userId },
    );

    // Update profile stats
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (profile) {
      await ctx.db.patch(profile._id, {
        totalRoutes: profile.totalRoutes + 1,
        totalDistanceKm: profile.totalDistanceKm + args.distanceKm,
      });
    }

    // Create activity
    await ctx.db.insert("activities", {
      userId,
      type: "route_upload",
      routeId,
      createdAt: Date.now(),
    });

    return routeId;
  },
});

export const getUserRoutes = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("routes")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const getRoutesByUserId = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const viewerId = await getAuthUserId(ctx);
    const isOwner = viewerId === args.userId;

    // Owner sees all routes
    if (isOwner) {
      return await ctx.db
        .query("routes")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .collect();
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    // Public map → return ALL routes (clipped for privacy)
    if (profile?.isMapPublic) {
      const routes = await ctx.db
        .query("routes")
        .withIndex("by_userId", (q) => q.eq("userId", args.userId))
        .collect();
      return routes
        .filter((r) => !r.isHiddenByZone)
        .map((r) => ({
          ...r,
          geojson: r.publicGeojson ?? r.geojson,
          boundingBox: r.publicBoundingBox ?? r.boundingBox,
        }));
    }

    // Private profile → only friends can see routes
    if (profile && !profile.isPublic) {
      const isFriend = viewerId ? await areFriends(ctx, viewerId, args.userId) : false;
      if (!isFriend) return [];
    }

    const routes = await ctx.db
      .query("routes")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();

    return routes
      .filter((r) => r.isPublic && !r.isHiddenByZone)
      .map((r) => ({
        ...r,
        geojson: r.publicGeojson ?? r.geojson,
        boundingBox: r.publicBoundingBox ?? r.boundingBox,
      }));
  },
});

export const deleteRoute = mutation({
  args: { routeId: v.id("routes") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throwAppError(ErrorCode.AUTH_NOT_AUTHENTICATED);

    const route = await ctx.db.get(args.routeId);
    if (!route || route.userId !== userId) throwAppError(ErrorCode.NOT_FOUND_ROUTE);

    // Update profile stats
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (profile) {
      await ctx.db.patch(profile._id, {
        totalRoutes: Math.max(0, profile.totalRoutes - 1),
        totalDistanceKm: Math.max(0, profile.totalDistanceKm - route.distanceKm),
      });
    }

    // Delete associated activities
    const activities = await ctx.db
      .query("activities")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
    for (const activity of activities) {
      if (activity.routeId === args.routeId) {
        await ctx.db.delete(activity._id);
      }
    }

    await ctx.storage.delete(route.gpxFileId);
    await ctx.db.delete(args.routeId);
  },
});

export const renameRoute = mutation({
  args: { routeId: v.id("routes"), name: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throwAppError(ErrorCode.AUTH_NOT_AUTHENTICATED);

    const route = await ctx.db.get(args.routeId);
    if (!route || route.userId !== userId) throwAppError(ErrorCode.NOT_FOUND_ROUTE);

    await ctx.db.patch(args.routeId, { name: args.name });
  },
});

export const updateRouteColor = mutation({
  args: { routeId: v.id("routes"), color: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throwAppError(ErrorCode.AUTH_NOT_AUTHENTICATED);

    const route = await ctx.db.get(args.routeId);
    if (!route || route.userId !== userId) throwAppError(ErrorCode.NOT_FOUND_ROUTE);

    await ctx.db.patch(args.routeId, { color: args.color });
  },
});
