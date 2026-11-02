export type Place = {
  id: string;
  name: string;
  kind: "sight" | "meal";
  lat: number;
  lng: number;
  address: string;
};

export type Booked = { time: string; lat: number | null; lng: number | null };

export type Plan = {
  date: string;
  stops: { place: Place; time: string; reason: string }[];
}[];
