import axios from "axios";

const API_KEY = process.env.GEOAPIFY_API_KEY;
const MAX_RETRIES = 2;
const BASE_DELAY = 500;

async function geocodeCity(city) {
  const cityTrimmed = city?.trim();
  if (!cityTrimmed) throw new Error("Invalid Location Provided. Please Enter a City or Place Name.");

  const url = "https://api.geoapify.com/v1/geocode/search";
  const params = { text: cityTrimmed, limit: 1, apiKey: API_KEY };

  const response = await axios.get(url, { params });

  if (!response.data?.features?.length) {
    throw new Error(`Could Not Find Location For: "${cityTrimmed}".`);
  }

  const feature = response.data.features[0];
  const lat = parseFloat(feature.properties.lat);
  const lon = parseFloat(feature.properties.lon);

  if (Number.isNaN(lat) || Number.isNaN(lon)) {
    throw new Error(`Invalid Coordinates Returned For: "${cityTrimmed}".`);
  }

  return { lat, lon };
}

function prettyCategory(categories) {
  const list = Array.isArray(categories) ? categories : categories ? [categories] : [];
  const restaurantCats = list.filter((c) => typeof c === "string" && c.startsWith("catering.restaurant"));
  if (!restaurantCats.length) return "restaurant";

  const best = restaurantCats.find((c) => c.startsWith("catering.restaurant.")) || restaurantCats[0];

  const cleaned = best
    .replace("catering.restaurant.", "")
    .replace("catering.restaurant", "restaurant")
    .replaceAll(".", " ")
    .trim();

  return cleaned || "restaurant";
}

async function fetchPlaceDescription(placeId) {
  if (!placeId) return null;

  const params = { id: placeId, features: "details", apiKey: API_KEY };
  const res = await axios.get("https://api.geoapify.com/v2/place-details", { params });

  const props = res.data?.features?.[0]?.properties;
  const desc = props?.description;

  return typeof desc === "string" && desc.trim() ? desc.trim() : null;
}

export async function getTopRestaurants({ location }) {
  if (!API_KEY) {
    return { ok: false, message: "Error: Geoapify API key missing in .env file." };
  }

  try {
    const { lat, lon } = await geocodeCity(location);

    let lastError;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const params = {
          categories: "catering.restaurant",
          filter: `circle:${lon},${lat},5000`,
          text: "restaurant",
          limit: 5,
          apiKey: API_KEY,
        };

        const response = await axios.get("https://api.geoapify.com/v2/places", { params });

        const features = response.data?.features || [];
        if (!features.length) return { ok: false, message: "No Restaurants Found Nearby. Try a Different Location." };

        const baseRestaurants = features.map((r) => ({
          name: r.properties?.name || "Unnamed Restaurant",
          category: prettyCategory(r.properties?.categories),
          address: r.properties?.formatted || "Address Not Available",
          url:
            r.properties?.url ||
            `https://www.google.com/search?q=${encodeURIComponent((r.properties?.name || "restaurant") + " " + location)}`,
          placeId: r.properties?.place_id || null,
        }));

        const restaurants = await Promise.all(
          baseRestaurants.map(async (r) => {
            try {
              const description = await fetchPlaceDescription(r.placeId);
              return { ...r, description };
            } catch {
              return { ...r, description: null };
            }
          })
        );

        return { ok: true, restaurants };
      } catch (error) {
        lastError = error;
        if (attempt === MAX_RETRIES) break;
        await new Promise((res) => setTimeout(res, BASE_DELAY * (attempt + 1)));
      }
    }

    return {
      ok: false,
      message: lastError?.response?.data?.message || "No Restaurants Found Nearby. Try a Different Location.",
    };
  } catch (err) {
    return { ok: false, message: err.message };
  }
}
