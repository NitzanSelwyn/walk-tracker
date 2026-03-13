import { useQuery, useMutation } from "convex/react";
import { useTranslation } from "react-i18next";
import { useState, useRef, useEffect } from "react";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { handleMutationError, showSuccessToast } from "../../lib/errorHandling";

export default function NotificationBell() {
  const { t } = useTranslation();
  const unreadCount = useQuery(api.notifications.getUnreadCount);
  const notifications = useQuery(api.notifications.getNotifications);
  const markAsRead = useMutation(api.notifications.markAsRead);
  const markAllAsRead = useMutation(api.notifications.markAllAsRead);
  const acceptRequest = useMutation(api.friends.acceptRequest);
  const rejectRequest = useMutation(api.friends.rejectRequest);

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleMarkAllRead = async () => {
    try {
      await markAllAsRead();
    } catch (err) {
      handleMutationError(err, t);
    }
  };

  const handleAccept = async (friendshipId: string, notificationId: Id<"notifications">) => {
    try {
      await acceptRequest({ friendshipId: friendshipId as Id<"friendships"> });
      await markAsRead({ notificationId });
      showSuccessToast(t("success.friendRequestAccepted"));
    } catch (err) {
      handleMutationError(err, t);
    }
  };

  const handleReject = async (friendshipId: string, notificationId: Id<"notifications">) => {
    try {
      await rejectRequest({ friendshipId: friendshipId as Id<"friendships"> });
      await markAsRead({ notificationId });
      showSuccessToast(t("success.friendRequestRejected"));
    } catch (err) {
      handleMutationError(err, t);
    }
  };

  const formatRelativeTime = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "now";
    if (minutes < 60) return `${minutes}m`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    return `${days}d`;
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative rounded-md p-1.5 text-gray-600 hover:bg-gray-100 hover:text-gray-900"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {(unreadCount ?? 0) > 0 && (
          <span className="absolute -end-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {unreadCount! > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute end-0 top-10 z-50 w-80 rounded-lg border border-gray-200 bg-white shadow-lg">
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3">
            <h3 className="text-sm font-semibold text-gray-900">
              {t("notifications.title")}
            </h3>
            {(unreadCount ?? 0) > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-emerald-600 hover:text-emerald-700"
              >
                {t("notifications.markAllRead")}
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {!notifications || notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-gray-500">
                {t("notifications.empty")}
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  className={`border-b border-gray-50 px-4 py-3 ${!n.read ? "bg-emerald-50/50" : ""}`}
                >
                  <div className="flex items-start gap-3">
                    {n.sender?.image ? (
                      <img
                        src={n.sender.image}
                        alt=""
                        className="h-8 w-8 shrink-0 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-medium text-emerald-700">
                        {(n.sender?.profile?.displayName ?? n.sender?.name ?? "?")
                          .charAt(0)
                          .toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-gray-800">{n.message}</p>
                      <p className="mt-0.5 text-xs text-gray-400">
                        {formatRelativeTime(n.createdAt)}
                      </p>
                      {n.type === "friend_request" && !n.read && n.relatedId && (
                        <div className="mt-2 flex gap-2">
                          <button
                            onClick={() => handleAccept(n.relatedId!, n._id)}
                            className="rounded bg-emerald-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-emerald-700"
                          >
                            {t("profile.acceptFriend")}
                          </button>
                          <button
                            onClick={() => handleReject(n.relatedId!, n._id)}
                            className="rounded border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-50"
                          >
                            {t("profile.rejectFriend")}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
