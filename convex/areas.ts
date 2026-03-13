import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const list = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("areas").collect();
  },
});

export const get = query({
  args: { areaId: v.id("areas") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.areaId);
  },
});

export const seed = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("areas").first();
    if (existing) return "Already seeded";

    const cities = [
      {
        name: "Tel Aviv",
        nameHe: "תל אביב",
        boundingBox: { minLat: 32.03, maxLat: 32.15, minLng: 34.74, maxLng: 34.82 },
      },
      {
        name: "Jerusalem",
        nameHe: "ירושלים",
        boundingBox: { minLat: 31.74, maxLat: 31.80, minLng: 35.19, maxLng: 35.25 },
      },
      {
        name: "Haifa",
        nameHe: "חיפה",
        boundingBox: { minLat: 32.77, maxLat: 32.83, minLng: 34.95, maxLng: 35.02 },
      },
      {
        name: "Beer Sheva",
        nameHe: "באר שבע",
        boundingBox: { minLat: 31.22, maxLat: 31.28, minLng: 34.76, maxLng: 34.82 },
      },
      {
        name: "Ramat Gan",
        nameHe: "רמת גן",
        boundingBox: { minLat: 32.06, maxLat: 32.10, minLng: 34.80, maxLng: 34.84 },
      },
      {
        name: "Herzliya",
        nameHe: "הרצליה",
        boundingBox: { minLat: 32.15, maxLat: 32.18, minLng: 34.77, maxLng: 34.81 },
      },
      {
        name: "Petah Tikva",
        nameHe: "פתח תקווה",
        boundingBox: { minLat: 32.07, maxLat: 32.12, minLng: 34.85, maxLng: 34.92 },
      },
      {
        name: "Bnei Brak",
        nameHe: "בני ברק",
        boundingBox: { minLat: 32.07, maxLat: 32.10, minLng: 34.82, maxLng: 34.86 },
      },
      {
        name: "Givatayim",
        nameHe: "גבעתיים",
        boundingBox: { minLat: 32.06, maxLat: 32.08, minLng: 34.80, maxLng: 34.82 },
      },
    ];

    for (const city of cities) {
      await ctx.db.insert("areas", city);
    }

    return "Seeded " + cities.length + " areas";
  },
});

export const addMissing = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("areas").collect();
    const existingNames = new Set(existing.map((a) => a.name));

    const allCities = [
      {
        name: "Petah Tikva",
        nameHe: "פתח תקווה",
        boundingBox: { minLat: 32.07, maxLat: 32.12, minLng: 34.85, maxLng: 34.92 },
      },
      {
        name: "Bnei Brak",
        nameHe: "בני ברק",
        boundingBox: { minLat: 32.07, maxLat: 32.10, minLng: 34.82, maxLng: 34.86 },
      },
      {
        name: "Givatayim",
        nameHe: "גבעתיים",
        boundingBox: { minLat: 32.06, maxLat: 32.08, minLng: 34.80, maxLng: 34.82 },
      },
    ];

    let added = 0;
    for (const city of allCities) {
      if (!existingNames.has(city.name)) {
        await ctx.db.insert("areas", city);
        added++;
      }
    }

    return added > 0 ? `Added ${added} new areas` : "No new areas to add";
  },
});
