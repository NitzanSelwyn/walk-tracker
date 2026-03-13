import { internalMutation, query } from "./_generated/server";

export const computePlatformStats = internalMutation({
  args: {},
  handler: async (ctx): Promise<void> => {
    const profiles = await ctx.db.query("userProfiles").collect();

    let totalUsers = profiles.length;
    let totalRoutes = 0;
    let totalDistanceKm = 0;

    for (const profile of profiles) {
      totalRoutes += profile.totalRoutes;
      totalDistanceKm += profile.totalDistanceKm;
    }

    // Upsert: find existing row or insert new one
    const existing = await ctx.db.query("platformStats").first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        totalUsers,
        totalRoutes,
        totalDistanceKm,
        calculatedAt: Date.now(),
      });
    } else {
      await ctx.db.insert("platformStats", {
        totalUsers,
        totalRoutes,
        totalDistanceKm,
        calculatedAt: Date.now(),
      });
    }
  },
});

export const getPlatformStats = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("platformStats").first();
  },
});
