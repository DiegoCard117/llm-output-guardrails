import type { Booked, Place } from "./types.js";

export const INTERESTS = ["nature", "history", "art", "food"] as const;

export const RESPONSE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["days"],
  properties: {
    days: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["date", "stops"],
        properties: {
          date: { type: "string", pattern: "^\\d{4}-\\d{2}-\\d{2}$" },
          stops: {
            type: "array",
            items: {
              type: "object",
              additionalProperties: false,
              required: ["placeId", "time", "reason"],
              properties: {
                placeId: { type: "string" },
                time: { type: "string", minLength: 5, maxLength: 5, pattern: "^([01]\\d|2[0-3]):[0-5]\\d$" },
                reason: { type: "string" },
              },
            },
          },
        },
      },
    },
  },
} as const;

export const SYSTEM_RULES = `Choose only place IDs from the supplied list.
Use each place at most once across the entire plan.
Never invent places or times: use valid HH:MM times only.
Avoid times already booked on that date.
Keep each day within one area. Return only JSON matching the response schema.`;

type ModelInput = {
  dates: string[];
  pace: "relaxed" | "balanced" | "busy";
  interests: string[];
  places: Place[];
  booked: Map<string, Booked[]>;
};

export function buildModelInput({ dates, pace, interests, places, booked }: ModelInput): string {
  const round = (value: number | null) => value === null ? null : Math.round(value * 1000) / 1000;

  // Explicit fields keep extra server data and user text out of the prompt.
  return JSON.stringify({
    dates,
    pace,
    interests: interests.filter((interest) => INTERESTS.some((allowed) => allowed === interest)),
    places: places.map(({ id, name, kind, lat, lng }) => ({
      id, name, kind, lat: round(lat), lng: round(lng),
    })),
    booked: Object.fromEntries(dates.map((date) => [
      date,
      (booked.get(date) ?? []).map(({ time, lat, lng }) => ({
        time, lat: round(lat), lng: round(lng),
      })),
    ])),
  });
}
