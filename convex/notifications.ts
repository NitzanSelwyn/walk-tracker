import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { ErrorCode, throwAppError } from "./errorCodes";

export async function createNotification(
  ctx: MutationCtx,
  args: {
    userId: Id<"users">;
    type: string;
    message: string;
    relatedId?: string;
    senderId?: Id<"users">;
  },
) {
  return await ctx.db.insert("notifications", {
    userId: args.userId,
    type: args.type,
    message: args.message,
    read: false,
    relatedId: args.relatedId,
    senderId: args.senderId,
    createdAt: Date.now(),
  });
}

export const getNotifications = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .order("desc")
      .take(50);

    const enriched = await Promise.all(
      notifications.map(async (n) => {
        let sender = null;
        if (n.senderId) {
          const user = await ctx.db.get(n.senderId);
          const profile = user
            ? await ctx.db
                .query("userProfiles")
                .withIndex("by_userId", (q) => q.eq("userId", n.senderId!))
                .unique()
            : null;
          sender = user ? { ...user, profile } : null;
        }
        return { ...n, sender };
      }),
    );

    return enriched;
  },
});

export const getUnreadCount = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return 0;

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_userId_read", (q) => q.eq("userId", userId).eq("read", false))
      .collect();

    return unread.length;
  },
});

export const markAsRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throwAppError(ErrorCode.AUTH_NOT_AUTHENTICATED);

    const notification = await ctx.db.get(args.notificationId);
    if (!notification || notification.userId !== userId) return;

    await ctx.db.patch(args.notificationId, { read: true });
  },
});

export const markAllAsRead = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throwAppError(ErrorCode.AUTH_NOT_AUTHENTICATED);

    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_userId_read", (q) => q.eq("userId", userId).eq("read", false))
      .collect();

    for (const n of unread) {
      await ctx.db.patch(n._id, { read: true });
    }
  },
});
