// Haversine Distance Engine for Erode CEO Office Exam Duty Allotment System

export interface LatLng {
  lat: number;
  lng: number;
}

const EARTH_RADIUS_KM = 6371; // Earth's mean radius in kilometers

/**
 * Calculates geodesic distance between two points in kilometers using Haversine formula.
 */
export function calculateDistanceKm(point1: LatLng, point2: LatLng): number {
  if (
    point1.lat === undefined ||
    point1.lng === undefined ||
    point2.lat === undefined ||
    point2.lng === undefined ||
    isNaN(point1.lat) ||
    isNaN(point1.lng) ||
    isNaN(point2.lat) ||
    isNaN(point2.lng)
  ) {
    return 9999; // Return large distance if coordinates are missing/invalid
  }

  const toRad = (angle: number) => (angle * Math.PI) / 180;

  const dLat = toRad(point2.lat - point1.lat);
  const dLng = toRad(point2.lng - point1.lng);

  const lat1Rad = toRad(point1.lat);
  const lat2Rad = toRad(point2.lat);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.sin(dLng / 2) * Math.sin(dLng / 2) * Math.cos(lat1Rad) * Math.cos(lat2Rad);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = EARTH_RADIUS_KM * c;
  // Round to 2 decimal places
  return Math.round(distance * 100) / 100;
}

/**
 * Checks if a teacher is within maximum distance (default 10 km) of an examination centre.
 * Evaluates both:
 * 1. School coordinate to Centre coordinate
 * 2. Home coordinate to Centre coordinate (if home coordinate is available)
 * Returns the minimum of the two and whether it satisfies the <= maxDistanceKm threshold.
 */
export function evaluateTeacherCentreDistance(
  teacherSchoolCoords: LatLng,
  centreCoords: LatLng,
  teacherHomeCoords?: LatLng | null,
  maxDistanceKm: number = 10
): { minDistanceKm: number; isWithinDistance: boolean; fromHome: boolean } {
  const schoolDist = calculateDistanceKm(teacherSchoolCoords, centreCoords);
  let homeDist = Infinity;
  let fromHome = false;

  if (
    teacherHomeCoords &&
    teacherHomeCoords.lat !== undefined &&
    teacherHomeCoords.lng !== undefined &&
    !isNaN(teacherHomeCoords.lat) &&
    !isNaN(teacherHomeCoords.lng)
  ) {
    homeDist = calculateDistanceKm(teacherHomeCoords, centreCoords);
  }

  let minDistanceKm = schoolDist;
  if (homeDist < schoolDist) {
    minDistanceKm = homeDist;
    fromHome = true;
  }

  return {
    minDistanceKm,
    isWithinDistance: minDistanceKm <= maxDistanceKm,
    fromHome
  };
}
