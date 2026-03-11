
// src/helpers/rentalCars.js


export async function getRentalCars(lat, lon) {
  const url = `https://api.geoapify.com/v2/places?categories=rental.car&filter=circle:${lon},${lat},10000&limit=20&apiKey=${process.env.GEOAPIFY_KEY}`;

  const res = await fetch(url);
  if (!res.ok) return null;

  const data = await res.json();
  if (!data.features || data.features.length === 0) return [];

  // Only include features that have 'rental.car' category
  return data.features
    .filter(f => f.properties.categories.includes("rental.car"))
    .map(f => ({
      name: f.properties.name,
      address:
       f.properties.address_line1 +
        (f.properties.address_line2 ? ", " + f.properties.address_line2 : ""),
      
        lat: f.properties.lat,
      lon: f.properties.lon,
    }));
}