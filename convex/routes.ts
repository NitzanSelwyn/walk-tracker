import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
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
    startedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const routeId = await ctx.db.insert("routes", {
      userId,
      name: args.name,
      gpxFileId: args.gpxFileId,
      geojson: args.geojson,
      distanceKm: args.distanceKm,
      boundingBox: args.boundingBox,
      color: args.color,
      isPublic: true,
      startedAt: args.startedAt,
    });

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
    return await ctx.db
      .query("routes")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const deleteRoute = mutation({
  args: { routeId: v.id("routes") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const route = await ctx.db.get(args.routeId);
    if (!route || route.userId !== userId) throw new Error("Not found");

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

    await ctx.storage.delete(route.gpxFileId);
    await ctx.db.delete(args.routeId);
  },
});

export const renameRoute = mutation({
  args: { routeId: v.id("routes"), name: v.string() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const route = await ctx.db.get(args.routeId);
    if (!route || route.userId !== userId) throw new Error("Not found");

    await ctx.db.patch(args.routeId, { name: args.name });
  },
});
