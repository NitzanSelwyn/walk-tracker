/* eslint-disable */
/**
 * Generated utilities for the Convex API.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

import type * as users from "../users.js";
import type * as routes from "../routes.js";
import type * as areas from "../areas.js";
import type * as roadNetwork from "../roadNetwork.js";
import type * as roadNetworkHelpers from "../roadNetworkHelpers.js";
import type * as coverage from "../coverage.js";
import type * as coverageHelpers from "../coverageHelpers.js";
import type * as follows from "../follows.js";
import type * as activities from "../activities.js";
import type * as leaderboard from "../leaderboard.js";
import type * as coverageQueries from "../coverageQueries.js";

/**
 * A utility for referencing Convex functions in your app's API.
 */
declare const fullApi: ApiFromModules<{
  users: typeof users;
  routes: typeof routes;
  areas: typeof areas;
  roadNetwork: typeof roadNetwork;
  roadNetworkHelpers: typeof roadNetworkHelpers;
  coverage: typeof coverage;
  coverageHelpers: typeof coverageHelpers;
  follows: typeof follows;
  activities: typeof activities;
  leaderboard: typeof leaderboard;
  coverageQueries: typeof coverageQueries;
}>;
export declare const api: FilterApi<typeof fullApi, FunctionReference<any, "public">>;
export declare const internal: FilterApi<typeof fullApi, FunctionReference<any, "internal">>;
