import fs from "node:fs/promises";
import path from "node:path";

function makeTripId() {
  return `trip_${new Date().toISOString().replace(/[:.]/g, "-")}`;
}

function safeFilePart(value = "") {
  return String(value)
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "")
    .replace(/\s+/g, "_")
    .slice(0, 40) || "trip";
}

function formatTripBriefText({
  tripId,
  userId,
  destination,
  departDate,
  returnDate,
  adults,
  originAirport,
  createdAt,
  messages,
}) {
  const header = [
    "TRIP BRIEF",
    "==========",
    `Trip ID: ${tripId}`,
    `User ID: ${userId}`,
    `Created At: ${createdAt}`,
    `Destination: ${destination}`,
    `Depart: ${departDate}`,
    `Return: ${returnDate}`,
    `Adults: ${adults}`,
    `Origin: ${originAirport || "N/A"}`,
    "",
    "DETAILS",
    "=======",
    "",
  ].join("\n");

  return `${header}${messages.join("\n\n")}\n`;
}

export async function saveTripPlan({
  userId,
  destination,
  departDate,
  returnDate,
  adults,
  originAirport,
  messages,
  brief,
}) {
  const tripId = makeTripId();
  const createdAt = new Date().toISOString();

  const userDir = path.join(process.cwd(), "data", "trips", userId);
  await fs.mkdir(userDir, { recursive: true });

  const safeDestination = safeFilePart(destination);
  const baseName = `${tripId}_${safeDestination}`;

  const txtPath = path.join(userDir, `${baseName}.txt`);
  const jsonPath = path.join(userDir, `${baseName}.json`);

  const textContent = formatTripBriefText({
    tripId,
    userId,
    destination,
    departDate,
    returnDate,
    adults,
    originAirport,
    createdAt,
    messages,
  });

  const jsonContent = {
    tripId,
    userId,
    createdAt,
    destination,
    departDate,
    returnDate,
    adults,
    originAirport: originAirport || null,
    brief,
    messages,
  };

  await Promise.all([
    fs.writeFile(txtPath, textContent, "utf8"),
    fs.writeFile(jsonPath, JSON.stringify(jsonContent, null, 2), "utf8"),
  ]);

  return {
    tripId,
    txtPath,
    jsonPath,
    fileName: `${baseName}.txt`,
  };
}
