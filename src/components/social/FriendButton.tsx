import { useQuery, useMutation } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { handleMutationError, showSuccessToast } from "../../lib/errorHandling";

interface Props {
  userId: Id<"users">;
}

export default function FriendButton({ userId }: Props) {
  const { t } = useTranslation();
  const friendshipStatus = useQuery(api.friends.getFriendshipStatus, {
    userId,
  });
  const sendRequest = useMutation(api.friends.sendRequest);
  const acceptRequest = useMutation(api.friends.acceptRequest);
  const rejectRequest = useMutation(api.friends.rejectRequest);
  const unfriend = useMutation(api.friends.unfriend);

  if (friendshipStatus === undefined) return null;

  const handleSendRequest = async () => {
    try {
      await sendRequest({ receiverId: userId });
      showSuccessToast(t("success.friendRequestSent"));
    } catch (err) {
      handleMutationError(err, t);
    }
  };

  const handleAccept = async () => {
    if (!friendshipStatus.friendshipId) return;
    try {
      await acceptRequest({ friendshipId: friendshipStatus.friendshipId });
      showSuccessToast(t("success.friendRequestAccepted"));
    } catch (err) {
      handleMutationError(err, t);
    }
  };

  const handleReject = async () => {
    if (!friendshipStatus.friendshipId) return;
    try {
      await rejectRequest({ friendshipId: friendshipStatus.friendshipId });
      showSuccessToast(t("success.friendRequestRejected"));
    } catch (err) {
      handleMutationError(err, t);
    }
  };

  const handleUnfriend = async () => {
    try {
      await unfriend({ userId });
      showSuccessToast(t("success.unfriended"));
    } catch (err) {
      handleMutationError(err, t);
    }
  };

  switch (friendshipStatus.status) {
    case "none":
      return (
        <button
          onClick={handleSendRequest}
          className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
        >
          {t("profile.addFriend")}
        </button>
      );

    case "pending_sent":
      return (
        <span className="rounded-lg border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-500">
          {t("profile.requestSent")}
        </span>
      );

    case "pending_received":
      return (
        <div className="flex items-center gap-2">
          <button
            onClick={handleAccept}
            className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
          >
            {t("profile.acceptFriend")}
          </button>
          <button
            onClick={handleReject}
            className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-500 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600"
          >
            {t("profile.rejectFriend")}
          </button>
        </div>
      );

    case "accepted":
      return (
        <button
          onClick={handleUnfriend}
          className="group rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-1.5 text-sm font-medium text-emerald-700 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600"
        >
          <span className="group-hover:hidden">{t("profile.friends")}</span>
          <span className="hidden group-hover:inline">{t("profile.unfriend")}</span>
        </button>
      );
  }
}
