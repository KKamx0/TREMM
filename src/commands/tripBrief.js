import { SlashCommandBuilder, AttachmentBuilder } from "discord.js";
import { getTripBrief } from "../helpers/tripBrief.js";
import { buildTripMessages } from "../helpers/tripmessage.js";
import { saveTripPlan } from "../helpers/saveTripPlan.js";

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

export default {
  data: new SlashCommandBuilder()
    .setName("tripbrief")
    .setDescription("Plan a trip: weather + hotels + flights + restaurants + activities")
    .addStringOption((opt) =>
      opt
        .setName("destination")
        .setDescription('Example: "Paris, FR" or "Los Angeles, CA"')
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("depart").setDescription("YYYY-MM-DD").setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName("return").setDescription("YYYY-MM-DD").setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt.setName("adults").setDescription("Number of adults (default 1)")
    )
    .addStringOption((opt) =>
      opt
        .setName("origin")
        .setDescription("Origin airport IATA (optional). Example: SEA")
    )
    .addBooleanOption((opt) =>
      opt
        .setName("save")
        .setDescription("Save this trip brief as TXT + JSON")
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply();

      const destination = interaction.options
        .getString("destination", true)
        .trim();
      const departDate = interaction.options.getString("depart", true);
      const returnDate = interaction.options.getString("return", true);
      const adults = interaction.options.getInteger("adults") ?? 1;
      const originAirport =
        interaction.options.getString("origin")?.trim()?.toUpperCase();
      const shouldSave = interaction.options.getBoolean("save") ?? false;

      const brief = await getTripBrief({
        destination,
        departDate,
        returnDate,
        adults,
        originAirport,
      });

      if (!brief.ok) {
        return interaction.editReply(`❌ ${brief.message}`);
      }

      const messages = buildTripMessages(brief);

      if (!messages.length) {
        return interaction.editReply(
          "❌ Trip brief was generated, but no messages were returned."
        );
      }

      let saveResult = null;
      let saveFailed = false;

      if (shouldSave) {
        try {
          saveResult = await saveTripPlan({
            userId: interaction.user.id,
            destination,
            departDate,
            returnDate,
            adults,
            originAirport: brief.resolved?.originAirport ?? originAirport ?? "SEA",
            messages,
            brief,
          });
        } catch (err) {
          saveFailed = true;
          console.error("saveTripPlan failed:", err);
        }
      }

      const firstChunks = chunk(messages[0]);

      if (!firstChunks.length) {
        return interaction.editReply(
          "❌ Trip brief was generated, but the response was empty."
        );
      }

      await interaction.editReply({ content: firstChunks[0] });

      for (let i = 1; i < firstChunks.length; i++) {
        await interaction.followUp({ content: firstChunks[i] });
      }

      for (let i = 1; i < messages.length; i++) {
        const chunks = chunk(messages[i]);
        for (const c of chunks) {
          await interaction.followUp({ content: c });
        }
      }

      if (saveResult) {
        await interaction.followUp({
          content: `💾 Trip saved successfully.\nTrip ID: \`${saveResult.tripId}\``,
          files: [
            new AttachmentBuilder(saveResult.txtPath, {
              name: saveResult.fileName,
            }),
          ],
        });
      } else if (shouldSave && saveFailed) {
        await interaction.followUp({
          content: "⚠️ Trip was generated, but saving the file failed.",
        });
      }
    } catch (err) {
      console.error("tripbrief execute failed:", err);

      if (interaction.deferred || interaction.replied) {
        await interaction.followUp({
          content: "❌ Something went wrong while generating the trip brief.",
        }).catch(() => {});
      } else {
        await interaction.reply({
          content: "❌ Something went wrong while generating the trip brief.",
        }).catch(() => {});
      }
    }
  },
};
