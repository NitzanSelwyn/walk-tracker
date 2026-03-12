import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const follow = mutation({
  args: { followingId: v.id("users") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    if (userId === args.followingId) throw new Error("Cannot follow yourself");

    const existing = await ctx.db
      .query("follows")
      .withIndex("by_pair", (q) =>
        q.eq("followerId", userId).eq("followingId", args.followingId)
      )
      .unique();

    if (existing) return existing._id;

    return await ctx.db.insert("follows", {
      followerId: userId,
      followingId: args.followingId,
    });
  },
});

export const unfollow = mutation({
  args: { followingId: v.id("users") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const existing = await ctx.db
      .query("follows")
      .withIndex("by_pair", (q) =>
        q.eq("followerId", userId).eq("followingId", args.followingId)
      )
      .unique();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

export const isFollowing = query({
  args: { followingId: v.id("users") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return false;

    const existing = await ctx.db
      .query("follows")
      .withIndex("by_pair", (q) =>
        q.eq("followerId", userId).eq("followingId", args.followingId)
      )
      .unique();

    return !!existing;
  },
});

export const getFollowing = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const targetId = args.userId ?? (await getAuthUserId(ctx));
    if (!targetId) return [];

    const follows = await ctx.db
      .query("follows")
      .withIndex("by_followerId", (q) => q.eq("followerId", targetId))
      .collect();

    const users = await Promise.all(
      follows.map(async (f) => {
        const user = await ctx.db.get(f.followingId);
        const profile = user
          ? await ctx.db
              .query("userProfiles")
              .withIndex("by_userId", (q) => q.eq("userId", f.followingId))
              .unique()
          : null;
        return user ? { ...user, profile } : null;
      })
    );

    return users.filter(Boolean);
  },
});

export const getFollowers = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const targetId = args.userId ?? (await getAuthUserId(ctx));
    if (!targetId) return [];

    const follows = await ctx.db
      .query("follows")
      .withIndex("by_followingId", (q) => q.eq("followingId", targetId))
      .collect();

    const users = await Promise.all(
      follows.map(async (f) => {
        const user = await ctx.db.get(f.followerId);
        const profile = user
          ? await ctx.db
              .query("userProfiles")
              .withIndex("by_userId", (q) => q.eq("userId", f.followerId))
              .unique()
          : null;
        return user ? { ...user, profile } : null;
      })
    );

    return users.filter(Boolean);
  },
});

export const getFollowerCount = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const followers = await ctx.db
      .query("follows")
      .withIndex("by_followingId", (q) => q.eq("followingId", args.userId))
      .collect();
    return followers.length;
  },
});

export const getFollowingCount = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const following = await ctx.db
      .query("follows")
      .withIndex("by_followerId", (q) => q.eq("followerId", args.userId))
      .collect();
    return following.length;
  },
});
