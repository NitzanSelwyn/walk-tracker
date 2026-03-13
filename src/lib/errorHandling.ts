import { ConvexError } from "convex/values";
import toast from "react-hot-toast";
import type { TFunction } from "i18next";

export function getErrorCode(err: unknown): string | null {
  if (err instanceof ConvexError) {
    const data = err.data as { code?: string };
    return data?.code ?? null;
  }
  return null;
}

export function handleMutationError(
  err: unknown,
  t: TFunction,
  fallbackKey = "common.error",
) {
  const code = getErrorCode(err);
  const message = code ? t(`errors.${code}`) : t(fallbackKey);
  toast.error(message);
}

export function showSuccessToast(message: string) {
  toast.success(message);
}
