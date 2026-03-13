import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";
import { areFriends } from "./friendHelpers";

export const getFeed = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Get followed user IDs
    const follows = await ctx.db
      .query("follows")
      .withIndex("by_followerId", (q) => q.eq("followerId", userId))
      .collect();

    const followingIds = new Set(follows.map((f) => f.followingId));
    // Include own activities
    followingIds.add(userId);

    // Get recent activities (last 200, then filter)
    const activities = await ctx.db
      .query("activities")
      .withIndex("by_createdAt")
      .order("desc")
      .take(200);

    // Filter to followed users, then exclude private users (except self)
    const filtered = [];
    for (const a of activities) {
      if (!followingIds.has(a.userId)) continue;

      // Own activities always visible
      if (a.userId !== userId) {
        const profile = await ctx.db
          .query("userProfiles")
          .withIndex("by_userId", (q) => q.eq("userId", a.userId))
          .unique();
        // Skip private profiles unless viewer is friends with the author
        if (profile && !profile.isPublic) {
          const isFriend = await areFriends(ctx, userId, a.userId);
          if (!isFriend) continue;
        }
      }

      filtered.push(a);
      if (filtered.length >= 50) break;
    }

    // Enrich with user data
    const enriched = await Promise.all(
      filtered.map(async (activity) => {
        const user = await ctx.db.get(activity.userId);
        const profile = user
          ? await ctx.db
              .query("userProfiles")
              .withIndex("by_userId", (q) => q.eq("userId", activity.userId))
              .unique()
          : null;

        let route = null;
        if (activity.routeId) {
          route = await ctx.db.get(activity.routeId);
        }

        let area = null;
        if (activity.areaId) {
          area = await ctx.db.get(activity.areaId);
        }

        return {
          ...activity,
          user: user ? { ...user, profile } : null,
          route,
          area,
        };
      })
    );

    return enriched;
  },
});
