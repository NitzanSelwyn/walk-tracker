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

export const getGeojsonUrl = internalQuery({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const storeCachedNetwork = internalMutation({
  args: {
    areaId: v.id("areas"),
    geojsonStorageId: v.id("_storage"),
    totalLengthKm: v.number(),
    roadCount: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("roadNetworks", {
      areaId: args.areaId,
      geojsonStorageId: args.geojsonStorageId,
      totalLengthKm: args.totalLengthKm,
      roadCount: args.roadCount,
      fetchedAt: Date.now(),
    });
  },
});

export const updateCachedNetwork = internalMutation({
  args: {
    networkId: v.id("roadNetworks"),
    geojsonStorageId: v.id("_storage"),
    oldStorageId: v.id("_storage"),
    totalLengthKm: v.number(),
    roadCount: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.storage.delete(args.oldStorageId);
    await ctx.db.patch(args.networkId, {
      geojsonStorageId: args.geojsonStorageId,
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
