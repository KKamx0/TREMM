import { SlashCommandBuilder } from "discord.js";
import { listSavedTrips } from "../helpers/listSavedTrips.js";

function chunk(text, max = 1900) {
  const lines = String(text ?? "").split("\n");
  const out = [];
  let cur = "";

  for (const line of lines) {
    const candidate = cur ? `${cur}\n${line}` : line;

    if (candidate.length <= max) {
      cur = candidate;
      continue;
    }

    if (cur) {
      out.push(cur);
      cur = "";
    }

    if (line.length <= max) {
      cur = line;
    } else {
      for (let i = 0; i < line.length; i += max) {
        out.push(line.slice(i, i + max));
      }
    }
  }

  if (cur.trim()) out.push(cur);
  return out;
}

function formatSavedTime(iso) {
  if (!iso) return "Unknown";

  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;

  return d.toLocaleString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default {
  data: new SlashCommandBuilder()
    .setName("savedtrips")
    .setDescription("List your saved trip briefs")
    .addIntegerOption((opt) =>
      opt
        .setName("limit")
        .setDescription("How many saved trips to show (default 10, max 20)")
        .setMinValue(1)
        .setMaxValue(20)
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const limit = interaction.options.getInteger("limit") ?? 10;
      const trips = await listSavedTrips(interaction.user.id);

      if (!trips.length) {
        return interaction.editReply(
          "You do not have any saved trips yet.\nUse `/tripbrief ... save:true` to create one."
        );
      }

      const shown = trips.slice(0, limit);

      const header =
        `💾 **Your Saved Trips**\n` +
        `Showing ${shown.length} of ${trips.length}\n`;

      const body = shown
        .map((trip, i) => {
          return (
            `\n**${i + 1}. ${trip.destination}**\n` +
            `Trip ID: \`${trip.tripId}\`\n` +
            `Dates: ${trip.departDate} → ${trip.returnDate}\n` +
            `Adults: ${trip.adults}\n` +
            `Origin: ${trip.originAirport ?? "N/A"}\n` +
            `Saved: ${formatSavedTime(trip.createdAt)}\n` +
            `Files: \`${trip.txtFileName}\`, \`${trip.jsonFileName}\``
          );
        })
        .join("\n");

      const chunks = chunk(`${header}\n${body}`);

      await interaction.editReply({ content: chunks[0] });

      for (let i = 1; i < chunks.length; i++) {
        await interaction.followUp({
          content: chunks[i],
          ephemeral: true,
        });
      }
    } catch (err) {
      console.error("savedtrips execute failed:", err);

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(
          "❌ Something went wrong while loading your saved trips."
        ).catch(() => {});
      } else {
        await interaction.reply({
          content: "❌ Something went wrong while loading your saved trips.",
          ephemeral: true,
        }).catch(() => {});
      }
    }
  },
};
