import { distanceKm } from "./geo.js";
import type { Booked, Place, Plan } from "./types.js";

type ModelDay = { date: string; stops: { placeId: string; time: string; reason: string }[] };

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readDays(raw: unknown): ModelDay[] | undefined {
  // 1. Reject malformed roots; skip malformed days and stops, copying only known fields.
  try {
    if (!isObject(raw) || !Array.isArray(raw.days)) return undefined;
    const days: ModelDay[] = [];
    for (const day of raw.days) {
      if (!isObject(day)) continue;
      const { date, stops: rawStops } = day;
      if (typeof date !== "string" || !Array.isArray(rawStops)) continue;
      const stops: ModelDay["stops"] = [];
      for (const stop of rawStops) {
        if (!isObject(stop)) continue;
        const { placeId, time, reason } = stop;
        if (typeof placeId !== "string" || typeof time !== "string" || typeof reason !== "string") continue;
        stops.push({ placeId, time, reason });
      }
      days.push({ date, stops });
    }
    return days;
  } catch {
    // Even hostile getters or proxies in unknown input must not escape.
    return undefined;
  }
}

export function cleanPlan(
  raw: unknown,
  places: Place[],
  dates: string[],
  booked: Map<string, Booked[]>,
  maxKm = 3,
): Plan {
  const days = readDays(raw);
  if (!days) return [];
  const allowedDates = new Set(dates);
  const placesById = new Map(places.map((place) => [place.id, place]));
  const usedPlaces = new Set<string>();
  const stopsByDate = new Map<string, Plan[number]["stops"]>();

  for (const day of days) {
    // 2. The server decides which dates can be suggested.
    if (!allowedDates.has(day.date)) continue;
    const stops = stopsByDate.get(day.date) ?? [];
    const occupied = new Set((booked.get(day.date) ?? []).map(({ time }) => time));
    for (const stop of day.stops) {
      const place = placesById.get(stop.placeId);
      // 3. Unknown IDs cannot supply invented server data.
      if (!place) continue;
      // 4. Keep the first eligible occurrence across the entire plan.
      if (usedPlaces.has(place.id)) continue;
      // 5. A string alone does not make a valid clock time.
      if (stop.time.length !== 5 || !/^([01]\d|2[0-3]):[0-5]\d$/.test(stop.time)) continue;
      // 6. Existing bookings take precedence over suggestions.
      if (occupied.has(stop.time)) continue;
      usedPlaces.add(place.id);
      // 8. Bound display text; render this string with textContent, never innerHTML.
      stops.push({ place, time: stop.time, reason: stop.reason.slice(0, 200) });
    }
    stopsByDate.set(day.date, stops);
  }

  const plan: Plan = [];
  for (const [date, stops] of stopsByDate) {
    const points = [
      ...stops.map(({ place }) => ({ lat: place.lat, lng: place.lng })),
      ...(booked.get(date) ?? []).flatMap(({ lat, lng }) =>
        lat !== null && lng !== null ? [{ lat, lng }] : []),
    ];
    let nearby = stops;
    // 7. A medoid resists outliers; fewer than three points give too little evidence.
    if (points.length >= 3) {
      let center = points[0];
      let bestSum = Infinity;
      for (const candidate of points) {
        const sum = points.reduce((total, point) => total + distanceKm(candidate, point), 0);
        if (sum < bestSum) {
          center = candidate;
          bestSum = sum;
        }
      }
      nearby = stops.filter(({ place }) => distanceKm(center, place) <= maxKm);
    }
    // 9. Stable presentation uses chronological order and omits empty days.
    if (nearby.length) plan.push({ date, stops: nearby.sort((a, b) => a.time.localeCompare(b.time)) });
  }
  return plan.sort((a, b) => a.date.localeCompare(b.date));
}

export function toRecords(plan: Plan) {
  return plan.flatMap(({ date, stops }) => stops.map(({ place, time }) => ({
    date,
    time,
    placeId: place.id,
    name: place.name,
    address: place.address,
    lat: place.lat,
    lng: place.lng,
  })));
}
