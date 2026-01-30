// src/helpers/weather.js
// Open-Meteo (FREE, no key) + US-friendly geocoding + retries + 10-min cache
// Adds better daily "desc" using weather_code + rain chance from daily precip probability

// -------------------- Simple in-memory cache --------------------
const CACHE = new Map(); // key -> { expiresAt, value }
const TTL_MS = 10 * 60 * 1000; // 10 minutes

function cacheGet(key) {
  const hit = CACHE.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expiresAt) {
    CACHE.delete(key);
    return null;
  }
  return hit.value;
}

function cacheSet(key, value) {
  CACHE.set(key, { expiresAt: Date.now() + TTL_MS, value });
}

// -------------------- Network helpers --------------------
async function fetchJson(url, { timeoutMs = 8000, retries = 2 } = {}) {
  let lastErr;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(url, { signal: controller.signal });
      clearTimeout(t);

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status} calling Open-Meteo. ${text?.slice(0, 200) || ""}`);
      }

      return await res.json();
    } catch (err) {
      clearTimeout(t);
      lastErr = err;
      await new Promise((r) => setTimeout(r, 300 * (attempt + 1)));
    }
  }

  throw lastErr;
}

// -------------------- Formatting helpers --------------------
function normalizePlace(input) {
  return input
    .trim()
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s+/g, " ");
}

function cToF(c) {
  return (c * 9) / 5 + 32;
}

function kmhToMph(kmh) {
  return kmh * 0.621371;
}

function formatDayLabel(dateYYYYMMDD) {
  return new Date(dateYYYYMMDD + "T00:00:00Z").toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

// -------------------- US parsing helpers --------------------
const US_STATE = {
  AL:"Alabama", AK:"Alaska", AZ:"Arizona", AR:"Arkansas", CA:"California", CO:"Colorado",
  CT:"Connecticut", DE:"Delaware", FL:"Florida", GA:"Georgia", HI:"Hawaii", ID:"Idaho",
  IL:"Illinois", IN:"Indiana", IA:"Iowa", KS:"Kansas", KY:"Kentucky", LA:"Louisiana",
  ME:"Maine", MD:"Maryland", MA:"Massachusetts", MI:"Michigan", MN:"Minnesota",
  MS:"Mississippi", MO:"Missouri", MT:"Montana", NE:"Nebraska", NV:"Nevada",
  NH:"New Hampshire", NJ:"New Jersey", NM:"New Mexico", NY:"New York",
  NC:"North Carolina", ND:"North Dakota", OH:"Ohio", OK:"Oklahoma", OR:"Oregon",
  PA:"Pennsylvania", RI:"Rhode Island", SC:"South Carolina", SD:"South Dakota",
  TN:"Tennessee", TX:"Texas", UT:"Utah", VT:"Vermont", VA:"Virginia", WA:"Washington",
  WV:"West Virginia", WI:"Wisconsin", WY:"Wyoming", DC:"District of Columbia",
};

function parsePlaceParts(input) {
  const parts = normalizePlace(input).split(",").map((p) => p.trim()).filter(Boolean);
  return {
    city: parts[0] ?? "",
    regionOrState: parts[1] ?? "",
    country: parts[2] ?? "",
  };
}

function isTwoLetterCode(s) {
  return /^[A-Za-z]{2}$/.test(s);
}

// -------------------- Weather code -> description --------------------
// Open-Meteo weather codes: https://open-meteo.com/en/docs
function weatherCodeToDesc(code) {
  if (code == null) return "forecast";
  const c = Number(code);

  if (c === 0) return "clear sky";
  if (c === 1) return "mainly clear";
  if (c === 2) return "partly cloudy";
  if (c === 3) return "overcast";
  if (c === 45 || c === 48) return "fog";
  if (c === 51 || c === 53 || c === 55) return "drizzle";
  if (c === 56 || c === 57) return "freezing drizzle";
  if (c === 61 || c === 63 || c === 65) return "rain";
  if (c === 66 || c === 67) return "freezing rain";
  if (c === 71 || c === 73 || c === 75) return "snow";
  if (c === 77) return "snow grains";
  if (c === 80 || c === 81 || c === 82) return "rain showers";
  if (c === 85 || c === 86) return "snow showers";
  if (c === 95) return "thunderstorm";
  if (c === 96 || c === 99) return "thunderstorm w/ hail";

  return "mixed";
}

// -------------------- Forecast summarization --------------------
function summarizeNextDays(daily, days = 7) {
  const times = daily?.time ?? [];
  const mins = daily?.temperature_2m_min ?? [];
  const maxs = daily?.temperature_2m_max ?? [];
  const pops = daily?.precipitation_probability_max ?? [];
  const wcodes = daily?.weather_code ?? [];

  const count = Math.min(days, times.length, mins.length, maxs.length);
  const out = [];

  for (let i = 0; i < count; i++) {
    const date = times[i];
    const label = formatDayLabel(date);

    const minF = cToF(mins[i]);
    const maxF = cToF(maxs[i]);

    const popPct = Array.isArray(pops) && pops[i] != null ? pops[i] : 0;
    const pop = popPct / 100;

    const code = Array.isArray(wcodes) ? wcodes[i] : null;
    const desc = weatherCodeToDesc(code);

    out.push({
      label,
      min: minF,
      max: maxF,
      desc,
      pop,
    });
  }

  return out;
}

// -------------------- Geocoding (Open-Meteo) --------------------
async function geocodePlace(place) {
  const normalized = normalizePlace(place);
  const { city, regionOrState, country } = parsePlaceParts(normalized);

  if (!city || city.length < 2) {
    return { ok: false, message: `Type a real place name (ex: "Seattle" or "Seattle, WA").` };
  }

  let countryCode = "";
  let stateFull = "";

  if (country && isTwoLetterCode(country)) {
    countryCode = country.toUpperCase();
  }

  if (!countryCode && regionOrState && isTwoLetterCode(regionOrState)) {
    const st = regionOrState.toUpperCase();
    if (US_STATE[st]) {
      countryCode = "US";
      stateFull = US_STATE[st];
    }
  }

  const url =
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}` +
    `&count=10&language=en&format=json` +
    (countryCode ? `&countryCode=${encodeURIComponent(countryCode)}` : "");

  const data = await fetchJson(url);
  let results = data?.results ?? [];

  if (!Array.isArray(results) || results.length === 0) {
    return {
      ok: false,
      message: `Couldn't find **${place}**. Try adding a country like "Seattle, US" or "Paris, FR".`,
    };
  }

  // Dedupe by lat/lon
  results = results.filter(
    (r, i, arr) =>
      i === arr.findIndex((x) => x.latitude === r.latitude && x.longitude === r.longitude)
  );

  if (stateFull) {
    const filtered = results.filter(
      (r) => (r.admin1 ?? "").toLowerCase() === stateFull.toLowerCase()
    );
    if (filtered.length) results = filtered;
  }

  if (!stateFull && regionOrState && regionOrState.length > 2) {
    const filtered = results.filter((r) =>
      (r.admin1 ?? "").toLowerCase().includes(regionOrState.toLowerCase())
    );
    if (filtered.length) results = filtered;
  }

  results.sort((a, b) => (b.population ?? 0) - (a.population ?? 0));
  const chosen = results[0];

  const location =
    `${chosen.name}${chosen.admin1 ? `, ${chosen.admin1}` : ""}, ` +
    `${chosen.country} (${chosen.country_code})`;

  return {
    ok: true,
    latitude: chosen.latitude,
    longitude: chosen.longitude,
    location,
    timezone: chosen.timezone ?? "auto",
  };
}

async function fetchForecast(lat, lon, timezone = "auto") {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code` +
    `&daily=temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code` +
    `&forecast_days=16&timezone=${encodeURIComponent(timezone)}`;

  return fetchJson(url);
}

// -------------------- Public API --------------------
async function getWeather(place) {
  const cacheKey = normalizePlace(place).toLowerCase();
  const cached = cacheGet(cacheKey);
  if (cached) return cached;

  const geo = await geocodePlace(place);

  if (!geo.ok) {
    cacheSet(cacheKey, geo);
    return geo;
  }

  const data = await fetchForecast(geo.latitude, geo.longitude, geo.timezone);

  const currentC = data?.current?.temperature_2m ?? null;
  const humidity = data?.current?.relative_humidity_2m ?? null;
  const windKmh = data?.current?.wind_speed_10m ?? null;
  const curCode = data?.current?.weather_code ?? null;

  const daily = data?.daily;
  if (!daily?.time?.length) {
    const fail = { ok: false, message: `Forecast unavailable for **${place}** right now.` };
    cacheSet(cacheKey, fail);
    return fail;
  }

  const result = {
    ok: true,
    location: geo.location,
    current: {
      temp: currentC != null ? cToF(currentC) : null,
      feels: currentC != null ? cToF(currentC) : null, // Open-Meteo doesn't provide "feels like" in this simple endpoint
      humidity,
      wind: windKmh != null ? kmhToMph(windKmh) : null,
      desc: weatherCodeToDesc(curCode),
    },
    nextDays: summarizeNextDays(daily, 7),
  };

  cacheSet(cacheKey, result);
  return result;
}

module.exports = { getWeather };
