import fs from "node:fs/promises";
import path from "node:path";

export async function deleteSavedTrip(userId, tripId) {
  const userDir = path.join(process.cwd(), "data", "trips", userId);

  let entries;
  try {
    entries = await fs.readdir(userDir, { withFileTypes: true });
  } catch (err) {
    if (err.code === "ENOENT") {
      return {
        ok: false,
        message: "You do not have any saved trips yet.",
      };
    }
    throw err;
  }

  const matchingFiles = entries
    .filter((entry) => entry.isFile() && entry.name.startsWith(tripId))
    .map((entry) => entry.name)
    .filter((name) => name.endsWith(".json") || name.endsWith(".txt"));

  if (!matchingFiles.length) {
    return {
      ok: false,
      message: `No saved trip found for trip ID \`${tripId}\`.`,
    };
  }

  await Promise.all(
    matchingFiles.map((fileName) =>
      fs.unlink(path.join(userDir, fileName))
    )
  );

  return {
    ok: true,
    tripId,
    deletedFiles: matchingFiles,
  };
}
