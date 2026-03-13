import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { ErrorCode, throwAppError } from "./errorCodes";

const MAX_ZONES_PER_USER = 5;
const ALLOWED_RADII = [200, 500, 1000];

export const getMyZones = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    return await ctx.db
      .query("privacyZones")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const createZone = mutation({
  args: {
    name: v.string(),
    zoneType: v.union(v.literal("circle"), v.literal("polygon")),
    center: v.optional(v.object({ lat: v.number(), lng: v.number() })),
    radiusMeters: v.optional(v.number()),
    vertices: v.optional(v.array(v.object({ lat: v.number(), lng: v.number() }))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throwAppError(ErrorCode.AUTH_NOT_AUTHENTICATED);

    // Check zone limit
    const existing = await ctx.db
      .query("privacyZones")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .collect();

    if (existing.length >= MAX_ZONES_PER_USER) {
      throwAppError(ErrorCode.PRIVACY_ZONE_LIMIT);
    }

    // Validate based on zone type
    if (args.zoneType === "circle") {
      if (!args.center || !args.radiusMeters) {
        throwAppError(ErrorCode.PRIVACY_ZONE_INVALID);
      }
      if (!ALLOWED_RADII.includes(args.radiusMeters)) {
        throwAppError(ErrorCode.PRIVACY_ZONE_INVALID);
      }
    } else {
      if (!args.vertices || args.vertices.length < 3 || args.vertices.length > 20) {
        throwAppError(ErrorCode.PRIVACY_ZONE_INVALID);
      }
    }

    const zoneId = await ctx.db.insert("privacyZones", {
      userId,
      name: args.name,
      zoneType: args.zoneType,
      center: args.center,
      radiusMeters: args.radiusMeters,
      vertices: args.vertices,
      createdAt: Date.now(),
    });

    await ctx.scheduler.runAfter(
      0,
      internal.privacyZoneClipping.recomputeAllUserRoutes,
      { userId },
    );

    return zoneId;
  },
});

export const updateZone = mutation({
  args: {
    zoneId: v.id("privacyZones"),
    name: v.optional(v.string()),
    center: v.optional(v.object({ lat: v.number(), lng: v.number() })),
    radiusMeters: v.optional(v.number()),
    vertices: v.optional(v.array(v.object({ lat: v.number(), lng: v.number() }))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throwAppError(ErrorCode.AUTH_NOT_AUTHENTICATED);

    const zone = await ctx.db.get(args.zoneId);
    if (!zone || zone.userId !== userId) {
      throwAppError(ErrorCode.PRIVACY_ZONE_NOT_FOUND);
    }

    // Validate radius if provided
    if (args.radiusMeters !== undefined && !ALLOWED_RADII.includes(args.radiusMeters)) {
      throwAppError(ErrorCode.PRIVACY_ZONE_INVALID);
    }

    // Validate vertices if provided
    if (args.vertices !== undefined && (args.vertices.length < 3 || args.vertices.length > 20)) {
      throwAppError(ErrorCode.PRIVACY_ZONE_INVALID);
    }

    const updates: Record<string, unknown> = {};
    if (args.name !== undefined) updates.name = args.name;
    if (args.center !== undefined) updates.center = args.center;
    if (args.radiusMeters !== undefined) updates.radiusMeters = args.radiusMeters;
    if (args.vertices !== undefined) updates.vertices = args.vertices;

    await ctx.db.patch(args.zoneId, updates);

    await ctx.scheduler.runAfter(
      0,
      internal.privacyZoneClipping.recomputeAllUserRoutes,
      { userId },
    );
  },
});

export const deleteZone = mutation({
  args: { zoneId: v.id("privacyZones") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throwAppError(ErrorCode.AUTH_NOT_AUTHENTICATED);

    const zone = await ctx.db.get(args.zoneId);
    if (!zone || zone.userId !== userId) {
      throwAppError(ErrorCode.PRIVACY_ZONE_NOT_FOUND);
    }

    await ctx.db.delete(args.zoneId);

    await ctx.scheduler.runAfter(
      0,
      internal.privacyZoneClipping.recomputeAllUserRoutes,
      { userId },
    );
  },
});
