import { ConvexError } from "convex/values";

export const ErrorCode = {
  AUTH_NOT_AUTHENTICATED: "AUTH_NOT_AUTHENTICATED",
  NOT_FOUND_ROUTE: "NOT_FOUND_ROUTE",
  NOT_FOUND_PROFILE: "NOT_FOUND_PROFILE",
  NOT_FOUND_AREA: "NOT_FOUND_AREA",
  NOT_FOUND_ROAD_NETWORK: "NOT_FOUND_ROAD_NETWORK",
  VALIDATION_SELF_FOLLOW: "VALIDATION_SELF_FOLLOW",
  AUTH_NOT_ADMIN: "AUTH_NOT_ADMIN",
  EXTERNAL_OVERPASS_API: "EXTERNAL_OVERPASS_API",
} as const;

export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

export function throwAppError(code: ErrorCodeType): never {
  throw new ConvexError({ code });
}
