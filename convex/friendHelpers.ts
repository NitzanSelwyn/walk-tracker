import type { QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

export async function areFriends(
  ctx: QueryCtx,
  userA: Id<"users">,
  userB: Id<"users">,
): Promise<boolean> {
  const friendship = await getFriendship(ctx, userA, userB);
  return friendship?.status === "accepted";
}

export async function getFriendship(
  ctx: QueryCtx,
  userA: Id<"users">,
  userB: Id<"users">,
) {
  // Check A→B direction
  const ab = await ctx.db
    .query("friendships")
    .withIndex("by_pair", (q) => q.eq("requesterId", userA).eq("receiverId", userB))
    .unique();
  if (ab) return ab;

  // Check B→A direction
  const ba = await ctx.db
    .query("friendships")
    .withIndex("by_pair", (q) => q.eq("requesterId", userB).eq("receiverId", userA))
    .unique();
  return ba;
}
