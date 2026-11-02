type Point = { lat: number; lng: number };

export function distanceKm(a: Point, b: Point): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latDelta = radians(b.lat - a.lat);
  const lngDelta = radians(b.lng - a.lng);
  const h = Math.sin(latDelta / 2) ** 2
    + Math.cos(radians(a.lat)) * Math.cos(radians(b.lat))
    * Math.sin(lngDelta / 2) ** 2;

  // Clamp floating-point drift near antipodal points.
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
}
