/**
 * A small gazetteer so the app can say "12 km apart" instead of just
 * "different city". Unknown cities fall back to region comparison.
 */
export interface City {
  name: string
  region: string
  lat: number
  lon: number
}

export const CITIES: City[] = [
  { name: 'Brooklyn, NY', region: 'New York', lat: 40.6782, lon: -73.9442 },
  { name: 'Manhattan, NY', region: 'New York', lat: 40.7831, lon: -73.9712 },
  { name: 'Queens, NY', region: 'New York', lat: 40.7282, lon: -73.7949 },
  { name: 'Jersey City, NJ', region: 'New Jersey', lat: 40.7178, lon: -74.0431 },
  { name: 'Hoboken, NJ', region: 'New Jersey', lat: 40.744, lon: -74.0324 },
  { name: 'Philadelphia, PA', region: 'Pennsylvania', lat: 39.9526, lon: -75.1652 },
  { name: 'Boston, MA', region: 'Massachusetts', lat: 42.3601, lon: -71.0589 },
  { name: 'Providence, RI', region: 'Rhode Island', lat: 41.824, lon: -71.4128 },
  { name: 'New Haven, CT', region: 'Connecticut', lat: 41.3083, lon: -72.9279 },
  { name: 'Washington, DC', region: 'District of Columbia', lat: 38.9072, lon: -77.0369 },
  { name: 'Baltimore, MD', region: 'Maryland', lat: 39.2904, lon: -76.6122 },
  { name: 'Chicago, IL', region: 'Illinois', lat: 41.8781, lon: -87.6298 },
  { name: 'Austin, TX', region: 'Texas', lat: 30.2672, lon: -97.7431 },
  { name: 'Miami, FL', region: 'Florida', lat: 25.7617, lon: -80.1918 },
  { name: 'Atlanta, GA', region: 'Georgia', lat: 33.749, lon: -84.388 },
  { name: 'Denver, CO', region: 'Colorado', lat: 39.7392, lon: -104.9903 },
  { name: 'Seattle, WA', region: 'Washington', lat: 47.6062, lon: -122.3321 },
  { name: 'Portland, OR', region: 'Oregon', lat: 45.5152, lon: -122.6784 },
  { name: 'San Francisco, CA', region: 'California', lat: 37.7749, lon: -122.4194 },
  { name: 'Oakland, CA', region: 'California', lat: 37.8044, lon: -122.2712 },
  { name: 'Los Angeles, CA', region: 'California', lat: 34.0522, lon: -118.2437 },
  { name: 'San Diego, CA', region: 'California', lat: 32.7157, lon: -117.1611 },
  { name: 'Phoenix, AZ', region: 'Arizona', lat: 33.4484, lon: -112.074 },
  { name: 'Nashville, TN', region: 'Tennessee', lat: 36.1627, lon: -86.7816 },
  { name: 'Toronto, ON', region: 'Ontario', lat: 43.6532, lon: -79.3832 },
  { name: 'Montreal, QC', region: 'Quebec', lat: 45.5019, lon: -73.5674 },
  { name: 'London, UK', region: 'England', lat: 51.5074, lon: -0.1278 },
  { name: 'Dublin, IE', region: 'Leinster', lat: 53.3498, lon: -6.2603 },
  { name: 'Rome, IT', region: 'Lazio', lat: 41.9028, lon: 12.4964 },
  { name: 'Naples, IT', region: 'Campania', lat: 40.8518, lon: 14.2681 },
  { name: 'Milan, IT', region: 'Lombardy', lat: 45.4642, lon: 9.19 },
  { name: 'Barcelona, ES', region: 'Catalonia', lat: 41.3851, lon: 2.1734 },
  { name: 'Mexico City, MX', region: 'CDMX', lat: 19.4326, lon: -99.1332 },
  { name: 'Manila, PH', region: 'Metro Manila', lat: 14.5995, lon: 120.9842 },
  { name: 'Lagos, NG', region: 'Lagos', lat: 6.5244, lon: 3.3792 },
  { name: 'Mumbai, IN', region: 'Maharashtra', lat: 19.076, lon: 72.8777 },
  { name: 'Seoul, KR', region: 'Seoul', lat: 37.5665, lon: 126.978 },
  { name: 'Sydney, AU', region: 'New South Wales', lat: -33.8688, lon: 151.2093 },
]

const byName = new Map(CITIES.map((c) => [c.name.toLowerCase(), c]))

export function findCity(name: string): City | undefined {
  return byName.get(name.trim().toLowerCase())
}

/** Great-circle distance in kilometres. */
export function distanceKm(a: City, b: City): number {
  const R = 6371
  const toRad = (d: number) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return Math.round(2 * R * Math.asin(Math.sqrt(h)))
}

/** Distance between two place names, or null when either is off the map. */
export function distanceBetween(a: string, b: string): number | null {
  const ca = findCity(a)
  const cb = findCity(b)
  if (!ca || !cb) return null
  return distanceKm(ca, cb)
}
