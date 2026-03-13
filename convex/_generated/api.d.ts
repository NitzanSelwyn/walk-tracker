/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as activities from "../activities.js";
import type * as areas from "../areas.js";
import type * as auth from "../auth.js";
import type * as community from "../community.js";
import type * as coverage from "../coverage.js";
import type * as coverageCron from "../coverageCron.js";
import type * as coverageCronHelpers from "../coverageCronHelpers.js";
import type * as coverageHelpers from "../coverageHelpers.js";
import type * as coverageQueries from "../coverageQueries.js";
import type * as crons from "../crons.js";
import type * as errorCodes from "../errorCodes.js";
import type * as follows from "../follows.js";
import type * as friendHelpers from "../friendHelpers.js";
import type * as friends from "../friends.js";
import type * as http from "../http.js";
import type * as leaderboard from "../leaderboard.js";
import type * as notifications from "../notifications.js";
import type * as platformStatsCron from "../platformStatsCron.js";
import type * as privacyZoneClipping from "../privacyZoneClipping.js";
import type * as privacyZoneHelpers from "../privacyZoneHelpers.js";
import type * as privacyZones from "../privacyZones.js";
import type * as roadNetwork from "../roadNetwork.js";
import type * as roadNetworkHelpers from "../roadNetworkHelpers.js";
import type * as routes from "../routes.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  activities: typeof activities;
  areas: typeof areas;
  auth: typeof auth;
  community: typeof community;
  coverage: typeof coverage;
  coverageCron: typeof coverageCron;
  coverageCronHelpers: typeof coverageCronHelpers;
  coverageHelpers: typeof coverageHelpers;
  coverageQueries: typeof coverageQueries;
  crons: typeof crons;
  errorCodes: typeof errorCodes;
  follows: typeof follows;
  friendHelpers: typeof friendHelpers;
  friends: typeof friends;
  http: typeof http;
  leaderboard: typeof leaderboard;
  notifications: typeof notifications;
  platformStatsCron: typeof platformStatsCron;
  privacyZoneClipping: typeof privacyZoneClipping;
  privacyZoneHelpers: typeof privacyZoneHelpers;
  privacyZones: typeof privacyZones;
  roadNetwork: typeof roadNetwork;
  roadNetworkHelpers: typeof roadNetworkHelpers;
  routes: typeof routes;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
