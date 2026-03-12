import { internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

export const getCachedNetwork = internalQuery({
  args: { areaId: v.id("areas") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("roadNetworks")
      .withIndex("by_areaId", (q) => q.eq("areaId", args.areaId))
      .unique();
  },
});

export const storeCachedNetwork = internalMutation({
  args: {
    areaId: v.id("areas"),
    geojson: v.string(),
    totalLengthKm: v.number(),
    roadCount: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("roadNetworks", {
      areaId: args.areaId,
      geojson: args.geojson,
      totalLengthKm: args.totalLengthKm,
      roadCount: args.roadCount,
      fetchedAt: Date.now(),
    });
  },
});

export const updateCachedNetwork = internalMutation({
  args: {
    networkId: v.id("roadNetworks"),
    geojson: v.string(),
    totalLengthKm: v.number(),
    roadCount: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.networkId, {
      geojson: args.geojson,
      totalLengthKm: args.totalLengthKm,
      roadCount: args.roadCount,
      fetchedAt: Date.now(),
    });
  },
});

export const updateAreaRoadLength = internalMutation({
  args: { areaId: v.id("areas"), totalRoadLengthKm: v.number() },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.areaId, {
      totalRoadLengthKm: args.totalRoadLengthKm,
    });
  },
});
