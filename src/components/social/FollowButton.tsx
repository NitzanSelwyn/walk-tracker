import { useQuery, useMutation } from "convex/react";
import { useTranslation } from "react-i18next";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { handleMutationError, showSuccessToast } from "../../lib/errorHandling";

interface Props {
  userId: Id<"users">;
}

export default function FollowButton({ userId }: Props) {
  const { t } = useTranslation();
  const isFollowing = useQuery(api.follows.isFollowing, {
    followingId: userId,
  });
  const follow = useMutation(api.follows.follow);
  const unfollow = useMutation(api.follows.unfollow);

  const handleFollow = async () => {
    try {
      await follow({ followingId: userId });
      showSuccessToast(t("success.followed"));
    } catch (err) {
      handleMutationError(err, t);
    }
  };

  const handleUnfollow = async () => {
    try {
      await unfollow({ followingId: userId });
      showSuccessToast(t("success.unfollowed"));
    } catch (err) {
      handleMutationError(err, t);
    }
  };

  if (isFollowing === undefined) return null;

  return isFollowing ? (
    <button
      onClick={handleUnfollow}
      className="rounded-lg border border-gray-300 px-4 py-1.5 text-sm font-medium text-gray-700 transition-colors hover:border-red-300 hover:bg-red-50 hover:text-red-600"
    >
      {t("profile.unfollow")}
    </button>
  ) : (
    <button
      onClick={handleFollow}
      className="rounded-lg bg-emerald-600 px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-700"
    >
      {t("profile.follow")}
    </button>
  );
}
