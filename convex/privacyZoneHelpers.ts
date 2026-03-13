import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const getUserZones = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("privacyZones")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const getUserProfile = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();
  },
});

export const getUserRoutes = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("routes")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .collect();
  },
});

export const getRoute = internalQuery({
  args: { routeId: v.id("routes") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.routeId);
  },
});

export const updateRouteClipping = internalMutation({
  args: {
    routeId: v.id("routes"),
    publicGeojson: v.optional(v.string()),
    publicBoundingBox: v.optional(
      v.object({
        minLat: v.number(),
        maxLat: v.number(),
        minLng: v.number(),
        maxLng: v.number(),
      }),
    ),
    isHiddenByZone: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.routeId, {
      publicGeojson: args.publicGeojson,
      publicBoundingBox: args.publicBoundingBox,
      isHiddenByZone: args.isHiddenByZone,
    });
  },
});
