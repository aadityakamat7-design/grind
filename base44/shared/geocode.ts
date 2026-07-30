// Geocodes an address or ZIP code into coordinates + resolved city/state using
// OpenStreetMap's free Nominatim API (no API key required).
// Nominatim rate-limits at ~1 req/sec with no SLA, so results are cached for
// 24 hours and a stale cached value is returned as a fallback on transient
// failures.

type GeocodeResult = {
  lat: number;
  lng: number;
  city: string;
  state: string;
  formatted_address: string;
};

const cache = new Map<string, { value: GeocodeResult; expires: number }>();
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export async function geocodeAddress(query: string): Promise<GeocodeResult> {
  const key = query.trim().toLowerCase();
  const cached = cache.get(key);
  if (cached && cached.expires > Date.now()) {
    return cached.value;
  }

  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=jsonv2&addressdetails=1&limit=1&countrycodes=us`;
  let res: Response;
  try {
    res = await fetch(url, {
      headers: { 'User-Agent': 'GrindApp/1.0 (teen job marketplace address verification)' },
    });
  } catch {
    // Network error — fall back to a stale cached value if available
    if (cached) return cached.value;
    throw new Error('Geocoding service is unavailable right now. Please try again.');
  }

  if (!res.ok) {
    if (cached) return cached.value;
    throw new Error('Geocoding service is unavailable right now. Please try again.');
  }

  const results = await res.json();
  const result = results?.[0];
  if (!result) {
    throw new Error("We couldn't find that address. Please double check it and try again.");
  }

  const addr = result.address || {};
  const city = addr.city || addr.town || addr.village || addr.hamlet || '';
  const state = addr.state ? US_STATE_ABBR[addr.state] || addr.state : '';
  const value: GeocodeResult = {
    lat: parseFloat(result.lat),
    lng: parseFloat(result.lon),
    city,
    state,
    formatted_address: result.display_name,
  };
  cache.set(key, { value, expires: Date.now() + CACHE_TTL_MS });
  return value;
}

const US_STATE_ABBR: Record<string, string> = {
  Alabama: 'AL', Alaska: 'AK', Arizona: 'AZ', Arkansas: 'AR', California: 'CA', Colorado: 'CO',
  Connecticut: 'CT', Delaware: 'DE', Florida: 'FL', Georgia: 'GA', Hawaii: 'HI', Idaho: 'ID',
  Illinois: 'IL', Indiana: 'IN', Iowa: 'IA', Kansas: 'KS', Kentucky: 'KY', Louisiana: 'LA',
  Maine: 'ME', Maryland: 'MD', Massachusetts: 'MA', Michigan: 'MI', Minnesota: 'MN',
  Mississippi: 'MS', Missouri: 'MO', Montana: 'MT', Nebraska: 'NE', Nevada: 'NV',
  'New Hampshire': 'NH', 'New Jersey': 'NJ', 'New Mexico': 'NM', 'New York': 'NY',
  'North Carolina': 'NC', 'North Dakota': 'ND', Ohio: 'OH', Oklahoma: 'OK', Oregon: 'OR',
  Pennsylvania: 'PA', 'Rhode Island': 'RI', 'South Carolina': 'SC', 'South Dakota': 'SD',
  Tennessee: 'TN', Texas: 'TX', Utah: 'UT', Vermont: 'VT', Virginia: 'VA', Washington: 'WA',
  'West Virginia': 'WV', Wisconsin: 'WI', Wyoming: 'WY', 'District of Columbia': 'DC',
};