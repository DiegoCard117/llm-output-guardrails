import { cleanPlan } from "../src/index.js";
import type { Booked, Place } from "../src/index.js";

// Cloudbank and its coordinates are invented for this example.
const places: Place[] = [
  { id: "garden", name: "Cloud Garden", kind: "sight", lat: 12.12, lng: 34.12, address: "1 Cloud Walk" },
  { id: "museum", name: "Cloud Museum", kind: "sight", lat: 12.121, lng: 34.121, address: "2 Cloud Walk" },
  { id: "cafe", name: "Cloud Cafe", kind: "meal", lat: 12.122, lng: 34.122, address: "3 Cloud Walk" },
  { id: "tower", name: "Distant Tower", kind: "sight", lat: 12.48, lng: 34.12, address: "4 Far Road" },
];
const dates = ["2026-11-10"];
const booked = new Map<string, Booked[]>([
  [dates[0], [{ time: "12:00", lat: 12.12, lng: 34.12 }]],
]);
const raw: unknown = {
  days: [
    { date: dates[0], stops: [
      { placeId: "invented", time: "08:00", reason: "An invented attraction." },
      { placeId: "cafe", time: "25:00", reason: "An impossible time." },
      { placeId: "cafe", time: "12:00", reason: "Conflicts with a booking." },
      { placeId: "tower", time: "15:00", reason: "About 40 km away." },
      { placeId: "museum", time: "11:00", reason: "Explore local exhibits." },
      { placeId: "garden", time: "09:00", reason: "Enjoy a quiet walk.",
        name: "FAKE NAME", address: "FAKE ADDRESS" },
      { placeId: "garden", time: "16:00", reason: "Duplicate place." },
    ] },
    { date: "2030-01-01", stops: [{ placeId: "cafe", time: "10:00", reason: "Wrong date." }] },
  ],
};

console.log("Untrusted model response:", JSON.stringify(raw, null, 2));
const plan = cleanPlan(raw, places, dates, booked);
console.log("Clean suggestion for human confirmation:", JSON.stringify(plan, null, 2));
// A real UI asks for confirmation before calling toRecords and saving anything.
