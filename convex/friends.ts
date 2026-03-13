import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ErrorCode, throwAppError } from "./errorCodes";
import { getFriendship } from "./friendHelpers";
import { createNotification } from "./notifications";

export const sendRequest = mutation({
  args: { receiverId: v.id("users") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throwAppError(ErrorCode.AUTH_NOT_AUTHENTICATED);
    if (userId === args.receiverId) throwAppError(ErrorCode.VALIDATION_SELF_FRIEND);

    const existing = await getFriendship(ctx, userId, args.receiverId);

    if (existing) {
      if (existing.status === "accepted") throwAppError(ErrorCode.FRIENDSHIP_ALREADY_EXISTS);
      if (existing.status === "pending") return existing._id;

      // Rejected → flip back to pending (re-send)
      if (existing.status === "rejected") {
        await ctx.db.patch(existing._id, {
          requesterId: userId,
          receiverId: args.receiverId,
          status: "pending",
          updatedAt: Date.now(),
        });

        const senderProfile = await ctx.db
          .query("userProfiles")
          .withIndex("by_userId", (q) => q.eq("userId", userId))
          .unique();

        await createNotification(ctx, {
          userId: args.receiverId,
          type: "friend_request",
          message: `${senderProfile?.displayName ?? "Someone"} sent you a friend request`,
          relatedId: existing._id,
          senderId: userId,
        });

        return existing._id;
      }
    }

    const now = Date.now();
    const friendshipId = await ctx.db.insert("friendships", {
      requesterId: userId,
      receiverId: args.receiverId,
      status: "pending",
      createdAt: now,
      updatedAt: now,
    });

    const senderProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    await createNotification(ctx, {
      userId: args.receiverId,
      type: "friend_request",
      message: `${senderProfile?.displayName ?? "Someone"} sent you a friend request`,
      relatedId: friendshipId,
      senderId: userId,
    });

    return friendshipId;
  },
});

export const acceptRequest = mutation({
  args: { friendshipId: v.id("friendships") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throwAppError(ErrorCode.AUTH_NOT_AUTHENTICATED);

    const friendship = await ctx.db.get(args.friendshipId);
    if (!friendship) throwAppError(ErrorCode.NOT_FOUND_FRIENDSHIP);
    if (friendship.receiverId !== userId) throwAppError(ErrorCode.FRIENDSHIP_NOT_RECEIVER);
    if (friendship.status !== "pending") throwAppError(ErrorCode.FRIENDSHIP_NOT_PENDING);

    await ctx.db.patch(args.friendshipId, {
      status: "accepted",
      updatedAt: Date.now(),
    });

    const accepterProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_userId", (q) => q.eq("userId", userId))
      .unique();

    await createNotification(ctx, {
      userId: friendship.requesterId,
      type: "friend_accepted",
      message: `${accepterProfile?.displayName ?? "Someone"} accepted your friend request`,
      senderId: userId,
    });
  },
});

export const rejectRequest = mutation({
  args: { friendshipId: v.id("friendships") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throwAppError(ErrorCode.AUTH_NOT_AUTHENTICATED);

    const friendship = await ctx.db.get(args.friendshipId);
    if (!friendship) throwAppError(ErrorCode.NOT_FOUND_FRIENDSHIP);
    if (friendship.receiverId !== userId) throwAppError(ErrorCode.FRIENDSHIP_NOT_RECEIVER);
    if (friendship.status !== "pending") throwAppError(ErrorCode.FRIENDSHIP_NOT_PENDING);

    await ctx.db.patch(args.friendshipId, {
      status: "rejected",
      updatedAt: Date.now(),
    });
  },
});

export const unfriend = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) throwAppError(ErrorCode.AUTH_NOT_AUTHENTICATED);

    const friendship = await getFriendship(ctx, currentUserId, args.userId);
    if (friendship) {
      await ctx.db.delete(friendship._id);
    }
  },
});

export const getFriendshipStatus = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) return { status: "none" as const };

    const friendship = await getFriendship(ctx, currentUserId, args.userId);
    if (!friendship || friendship.status === "rejected") {
      return { status: "none" as const };
    }

    if (friendship.status === "accepted") {
      return { status: "accepted" as const, friendshipId: friendship._id };
    }

    // Pending — determine direction
    if (friendship.requesterId === currentUserId) {
      return { status: "pending_sent" as const, friendshipId: friendship._id };
    }
    return { status: "pending_received" as const, friendshipId: friendship._id };
  },
});

export const getFriends = query({
  args: { userId: v.optional(v.id("users")) },
  handler: async (ctx, args) => {
    const targetId = args.userId ?? (await getAuthUserId(ctx));
    if (!targetId) return [];

    const asRequester = await ctx.db
      .query("friendships")
      .withIndex("by_requesterId_status", (q) =>
        q.eq("requesterId", targetId).eq("status", "accepted"),
      )
      .collect();

    const asReceiver = await ctx.db
      .query("friendships")
      .withIndex("by_receiverId_status", (q) =>
        q.eq("receiverId", targetId).eq("status", "accepted"),
      )
      .collect();

    const friendIds = [
      ...asRequester.map((f) => f.receiverId),
      ...asReceiver.map((f) => f.requesterId),
    ];

    const friends = await Promise.all(
      friendIds.map(async (id) => {
        const user = await ctx.db.get(id);
        const profile = user
          ? await ctx.db
              .query("userProfiles")
              .withIndex("by_userId", (q) => q.eq("userId", id))
              .unique()
          : null;
        return user ? { ...user, profile } : null;
      }),
    );

    return friends.filter(Boolean);
  },
});

export const getFriendCount = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const asRequester = await ctx.db
      .query("friendships")
      .withIndex("by_requesterId_status", (q) =>
        q.eq("requesterId", args.userId).eq("status", "accepted"),
      )
      .collect();

    const asReceiver = await ctx.db
      .query("friendships")
      .withIndex("by_receiverId_status", (q) =>
        q.eq("receiverId", args.userId).eq("status", "accepted"),
      )
      .collect();

    return asRequester.length + asReceiver.length;
  },
});
