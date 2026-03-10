import fs from "node:fs/promises";
import path from "node:path";

export async function listSavedTrips(userId) {
  const userDir = path.join(process.cwd(), "data", "trips", userId);

  let entries;
  try {
    entries = await fs.readdir(userDir, { withFileTypes: true });
  } catch (err) {
    if (err.code === "ENOENT") return [];
    throw err;
  }

  const jsonFiles = entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".json"))
    .map((entry) => entry.name);

  const trips = [];

  for (const fileName of jsonFiles) {
    const jsonPath = path.join(userDir, fileName);

    try {
      const raw = await fs.readFile(jsonPath, "utf8");
      const data = JSON.parse(raw);

      trips.push({
        tripId: data.tripId ?? fileName.replace(/\.json$/i, ""),
        destination: data.destination ?? "Unknown destination",
        departDate: data.departDate ?? "N/A",
        returnDate: data.returnDate ?? "N/A",
        adults: data.adults ?? "N/A",
        originAirport: data.originAirport ?? "N/A",
        createdAt: data.createdAt ?? null,
        jsonFileName: fileName,
        txtFileName: fileName.replace(/\.json$/i, ".txt"),
      });
    } catch (err) {
      console.error(`Failed to read saved trip: ${jsonPath}`, err);
    }
  }

  trips.sort((a, b) => {
    const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
    const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
    return bTime - aTime;
  });

  return trips;
}
