// helpers/weather.js
const API_KEY = process.env.OPENWEATHER_KEY;

function assertApiKey() {
  if (!API_KEY) {
    throw new Error("Missing OPENWEATHER_KEY env var. Add it to GitHub Secrets (Codespaces).");
  }
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} calling OpenWeather. ${text?.slice(0, 200) || ""}`);
  }
  return res.json();
}

/** Normalize commas/spaces so "Seattle,WA" and "Seattle,  WA" behave. */
function normalizePlace(input) {
  return input
    .trim()
    .replace(/\s*,\s*/g, ", ")
    .replace(/\s+/g, " ");
}

/** If it looks like "City, ST" (two-letter state), try appending ", US". */
function maybeAppendUS(q) {
  const parts = q.split(",").map((p) => p.trim()).filter(Boolean);
  if (parts.length === 2 && /^[A-Za-z]{2}$/.test(parts[1])) {
    return `${parts[0]}, ${parts[1].toUpperCase()}, US`;
  }
  return q;
}

/** Dedupe exact duplicates OpenWeather sometimes returns (same lat/lon). */
function dedupeGeo(results) {
  return results.filter(
    (g, i, arr) => i === arr.findIndex((x) => x.lat === g.lat && x.lon === g.lon)
  );
}

/** Try to pick the best match when user already included specificity (state/country). */
function pickBestGeoMatch(query, geoResults) {
  const q = query.toLowerCase();

  // Pull possible state/country tokens from the user's query
  const parts = query.split(",").map((p) => p.trim()).filter(Boolean);
  const maybeState = parts.length >= 2 ? parts[1].toLowerCase() : "";
  const maybeCountry = parts.length >= 3 ? parts[2].toLowerCase() : "";

  // Prefer: exact state match if state was provided
  if (maybeState) {
    const stateHit = geoResults.find(
      (g) => (g.state ?? "").toLowerCase() === maybeState
    );
    if (stateHit) return stateHit;
  }

  // Prefer: exact country code match if country was provided (US/FR/etc)
  if (maybeCountry && maybeCountry.length <= 3) {
    const countryHit = geoResults.find(
      (g) => (g.country ?? "").toLowerCase() === maybeCountry
    );
    if (countryHit) return countryHit;
  }

  // Prefer: query includes a full state name like "Texas" / "Washington"
  const stateNameHit = geoResults.find((g) => {
    const state = (g.state ?? "").toLowerCase();
    return state && q.includes(state);
  });
  if (stateNameHit) return stateNameHit;

  // Fallback: first result is usually the most relevant
  return geoResults[0];
}

function dayKeyFromUtcWithOffset(dtSeconds, tzOffsetSeconds) {
  const localMs = (dtSeconds + tzOffsetSeconds) * 1000;
  const d = new Date(localMs);
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function labelFromKey(key) {
  const [y, m, d] = key.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function summarizeForecast(list, tzOffsetSeconds, days = 3) {
  const byDay = new Map();

  for (const item of list) {
    const key = dayKeyFromUtcWithOffset(item.dt, tzOffsetSeconds);

    const min = item.main?.temp_min ?? item.main?.temp ?? null;
    const max = item.main?.temp_max ?? item.main?.temp ?? null;
    if (min == null || max == null) continue;

    if (!byDay.has(key)) {
      byDay.set(key, {
        min,
        max,
        descCounts: new Map(),
        popMax: 0,
      });
    }

    const agg = byDay.get(key);
    agg.min = Math.min(agg.min, min);
    agg.max = Math.max(agg.max, max);

    const desc = item.weather?.[0]?.description ?? "unknown";
    agg.descCounts.set(desc, (agg.descCounts.get(desc) ?? 0) + 1);

    const pop = typeof item.pop === "number" ? item.pop : 0;
    agg.popMax = Math.max(agg.popMax, pop);
  }

  const nowKey = dayKeyFromUtcWithOffset(Math.floor(Date.now() / 1000), tzOffsetSeconds);
  const keys = [...byDay.keys()].sort();
  const futureKeys = keys.filter((k) => k !== nowKey);
  const chosen = (futureKeys.length ? futureKeys : keys).slice(0, days);

  return chosen.map((k) => {
    const agg = byDay.get(k);

    let topDesc = "mixed conditions";
    let topCount = 0;
    for (const [desc, count] of agg.descCounts.entries()) {
      if (count > topCount) {
        topDesc = desc;
        topCount = count;
      }
    }

    return {
      label: labelFromKey(k),
      min: agg.min,
      max: agg.max,
      desc: topDesc,
      pop: agg.popMax,
    };
  });
}

export async function getWeather(place) {
  assertApiKey();

  const normalized = normalizePlace(place);

  // Try a few candidate queries (helps US city/state a lot)
  const candidates = [...new Set([
    normalized,
    maybeAppendUS(normalized),
    `${normalized}, US`,
  ])];

  let geo = null;

  for (const q of candidates) {
    const geoUrl =
      `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(q)}` +
      `&limit=5&appid=${encodeURIComponent(API_KEY)}`;

    const attempt = await fetchJson(geoUrl);
    if (Array.isArray(attempt) && attempt.length > 0) {
      geo = dedupeGeo(attempt);
      break;
    }
  }

  if (!Array.isArray(geo) || geo.length === 0) {
    return {
      ok: false,
      message: `Couldn't find **${place}**. Try "Seattle, WA, US" or "Paris, FR".`,
    };
  }

  // If multiple matches:
  // - If user was specific (has commas / mentions country/state), auto-pick best match.
  // - Otherwise show options.
  if (geo.length > 1) {
    const seemsSpecific =
      normalized.includes(",") ||
      /united states|usa|\bus\b/i.test(normalized);

    if (seemsSpecific) {
      geo = [pickBestGeoMatch(normalized, geo)];
    } else {
      const options = geo
        .slice(0, 3)
        .map((g, i) => `**${i + 1}.** ${g.name}${g.state ? `, ${g.state}` : ""}, ${g.country}`)
        .join("\n");

      return {
        ok: false,
        message:
          `I found multiple matches for **${place}**:\n${options}\n\n` +
          `Try adding state/country (ex: "Houston, TX, US" or "Paris, FR").`,
      };
    }
  }

  const loc = geo[0];
  const locName = `${loc.name}${loc.state ? `, ${loc.state}` : ""}, ${loc.country}`;

  const currentUrl =
    `https://api.openweathermap.org/data/2.5/weather?lat=${loc.lat}&lon=${loc.lon}` +
    `&units=imperial&appid=${encodeURIComponent(API_KEY)}`;

  const cur = await fetchJson(currentUrl);

  const forecastUrl =
    `https://api.openweathermap.org/data/2.5/forecast?lat=${loc.lat}&lon=${loc.lon}` +
    `&units=imperial&appid=${encodeURIComponent(API_KEY)}`;

  const forecast = await fetchJson(forecastUrl);

  const tzOffsetSeconds = cur.timezone ?? 0;

  const current = {
    temp: cur.main?.temp,
    feels: cur.main?.feels_like,
    humidity: cur.main?.humidity,
    wind: cur.wind?.speed,
    desc: cur.weather?.[0]?.description ?? "unknown",
  };

  const nextDays = summarizeForecast(forecast.list ?? [], tzOffsetSeconds, 3);

  return {
    ok: true,
    location: locName,
    current,
    nextDays,
  };
}
