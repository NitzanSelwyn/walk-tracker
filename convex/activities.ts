import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";

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

    // Get recent activities (last 50)
    const activities = await ctx.db
      .query("activities")
      .withIndex("by_createdAt")
      .order("desc")
      .take(200);

    // Filter to followed users
    const filtered = activities
      .filter((a) => followingIds.has(a.userId))
      .slice(0, 50);

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
