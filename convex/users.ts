import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const user = await ctx.db.get(userId);
    if (!user) return null;

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    return { ...user, profile };
  },
});

export const ensureProfile = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (existing) return existing._id;

    const user = await ctx.db.get(userId);
    const displayName = user?.name ?? user?.email ?? "User";

    return await ctx.db.insert("userProfiles", {
      userId,
      displayName,
      isPublic: true,
      totalDistanceKm: 0,
      totalRoutes: 0,
    });
  },
});

export const updateProfile = mutation({
  args: {
    displayName: v.optional(v.string()),
    bio: v.optional(v.string()),
    isPublic: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    if (!profile) throw new Error("Profile not found");

    const updates: Record<string, unknown> = {};
    if (args.displayName !== undefined) updates.displayName = args.displayName;
    if (args.bio !== undefined) updates.bio = args.bio;
    if (args.isPublic !== undefined) updates.isPublic = args.isPublic;

    await ctx.db.patch(profile._id, updates);

    // Cascade privacy setting to all user routes
    if (args.isPublic !== undefined) {
      const routes = await ctx.db
        .query("routes")
        .withIndex("by_userId", (q) => q.eq("userId", userId))
        .collect();

      for (const route of routes) {
        await ctx.db.patch(route._id, { isPublic: args.isPublic });
      }
    }
  },
});

export const getProfile = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const viewerId = await getAuthUserId(ctx);

    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", args.userId))
      .unique();

    // If profile is private and viewer is not the owner, check follow status
    if (profile && !profile.isPublic && viewerId !== args.userId) {
      let isFollower = false;
      if (viewerId) {
        const follow = await ctx.db
          .query("follows")
          .withIndex("by_pair", (q) =>
            q.eq("followerId", viewerId).eq("followingId", args.userId),
          )
          .unique();
        isFollower = !!follow;
      }

      if (!isFollower) {
        return {
          ...user,
          profile: {
            ...profile,
            totalRoutes: 0,
            totalDistanceKm: 0,
          },
          isLimited: true as const,
        };
      }
    }

    return { ...user, profile, isLimited: false as const };
  },
});
