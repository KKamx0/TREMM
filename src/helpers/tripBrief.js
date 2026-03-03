// src/helpers/tripBrief.js
import { safeCall, validateTripInputs, parseIsoDateUtc, daysBetweenUtc } from "./safe.js";
import { resolveIataCityCode, resolveIataAirportCode } from "./iata.js";

// ESM helpers (based on your commands):
import { getTopRestaurants } from "./restaurants.js";
import { getHotelOptions } from "./hotels.js";
import { geocodePlace } from "./geocode.js";
import { getActivitiesByLatLon } from "./amadeus.js";

// CJS helpers (build output is CJS, so plain require is safest)
const { getWeather } = require("./weather.js");
const { getFlightOptions } = require("./flights");

function makeFallbackActivities(destination) {
  return [
    { name: `City highlights tour in ${destination}` },
    { name: `Food tasting / local cuisine in ${destination}` },
    { name: `Top museum or cultural site in ${destination}` },
    { name: `Nature walk or scenic viewpoint in ${destination}` },
    { name: `Popular neighborhood exploration in ${destination}` },
  ];
}

export async function getTripBrief({
  destination,
  departDate,
  returnDate,
  adults = 1,
  originAirport, // optional; if missing we’ll try DEFAULT_ORIGIN_IATA
}) {
  const v = validateTripInputs({ destination, departDate, returnDate, adults });
  if (!v.ok) return { ok: false, message: v.message };

  const dep = parseIsoDateUtc(departDate);
  const ret = parseIsoDateUtc(returnDate);
  const tripLenDays = daysBetweenUtc(dep, ret);

  let origin = (originAirport || process.env.DEFAULT_ORIGIN_IATA || "SEA").toUpperCase();
  if (origin === "LA") origin = "LAX";

  // Resolve codes for hotels/flights (best effort)
  const [cityCode, destAirport] = await Promise.all([
    resolveIataCityCode(destination),
    resolveIataAirportCode(destination),
  ]);

  // --- tasks (each isolated) ---
  const weatherTask = () => getWeather(destination);

  const restaurantsTask = () => getTopRestaurants({ location: destination });

  const activitiesTask = async () => {
    const geo = await geocodePlace(destination);
    if (!geo) {
      // match your /trip command behavior: tell user to be more specific :contentReference[oaicite:6]{index=6}
      return {
        ok: false,
        message: `Couldn’t find "${destination}". Try "City, Country".`,
      };
    }

    let activities = [];
    let source = "Amadeus (sandbox)";

    try {
      activities = await getActivitiesByLatLon(geo.lat, geo.lon);
    } catch {
      activities = [];
    }

    if (!activities.length) {
      source = "Fallback suggestions (limited sandbox coverage)";
      activities = makeFallbackActivities(destination);
    }

    return { ok: true, source, activities };
  };

  const hotelsTask = async () => {
    if (!cityCode) {
      return {
        ok: false,
        message:
          "Hotel lookup needs an IATA city code (like PAR/NYC/LON). I couldn’t auto-resolve it for this destination.",
      };
    }

    return getHotelOptions({
      cityCode,
      checkIn: departDate,
      checkOut: returnDate,
      adults,
    });
  };

  const flightsRoundTripTask = async () => {
    if (!origin) {
      return {
        ok: false,
        message:
          "Flights need an origin airport IATA code (example: SEA). Set DEFAULT_ORIGIN_IATA in env or pass originAirport.",
      };
    }
    if (!destAirport) {
      return {
        ok: false,
        message:
          "Flights need a destination airport IATA code (example: LAX). I couldn’t auto-resolve it for this destination.",
      };
    }

    // Your /flights command is one-way :contentReference[oaicite:7]{index=7}, so do 2 one-ways.
    const [outbound, inbound] = await Promise.all([
      getFlightOptions({ origin, destination: destAirport, departureDate: departDate, adults }),
      getFlightOptions({ origin: destAirport, destination: origin, departureDate: returnDate, adults }),
    ]);

    return { ok: true, origin, destAirport, outbound, inbound };
  };

  // Run in parallel, but never crash the whole plan
  const [weather, restaurants, activities, hotels, flights] = await Promise.all([
    safeCall("weather", weatherTask, { timeoutMs: 10_000, retries: 1 }),
    safeCall("restaurants", restaurantsTask, { timeoutMs: 12_000, retries: 1 }),
    safeCall("activities", activitiesTask, { timeoutMs: 12_000, retries: 1 }),
    safeCall("hotels", hotelsTask, { timeoutMs: 14_000, retries: 2 }),
    safeCall("flights", flightsRoundTripTask, { timeoutMs: 16_000, retries: 1 }),
  ]);

  return {
    ok: true,
    destination: destination.trim(),
    dates: { departDate, returnDate, tripLenDays },
    adults,
    resolved: { cityCode, originAirport: origin, destAirport },
    sections: { weather, restaurants, activities, hotels, flights },
  };
}
