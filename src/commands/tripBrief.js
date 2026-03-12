// src/commands/tripBrief.js
import {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  AttachmentBuilder,
} from "discord.js";

import { getTripBrief } from "../helpers/tripBrief.js";
import { buildTripMessages } from "../helpers/tripmessage.js";
import { saveTripPlan } from "../helpers/saveTripPlan.js";

function chunk(text, max = 1900) {
  const lines = String(text ?? "").split("\n");
  const out = [];
  let cur = "";
  for (const line of lines) {
    if ((cur + line + "\n").length > max) {
      out.push(cur.trimEnd());
      cur = "";
    }
    cur += line + "\n";
  }
  if (cur.trim()) out.push(cur.trimEnd());

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
    ),

  async execute(interaction) {
    // Defer ASAP (ONLY ONCE)
    try {
      await interaction.deferReply();
    } catch (e) {
      console.error("tripbrief deferReply failed:", e);
      return;
    }

    const destination = interaction.options.getString("destination", true).trim();
    const departDate = interaction.options.getString("depart", true);
    const returnDate = interaction.options.getString("return", true);
    const adults = interaction.options.getInteger("adults") ?? 1;
    const originAirport = interaction.options.getString("origin")?.trim();

    const brief = await getTripBrief({
      destination,
      departDate,
      returnDate,
      adults,
      originAirport,
    });
    
    if (!brief.ok) return interaction.editReply(`❌ ${brief.message}`);

    const messages = buildTripMessages(brief); // array of strings

    // --- PREPARE WATCHLIST BUTTONS ---
    const hotelsArray = brief.sections.hotels?.data?.hotels;
    const hotelRows = [];

    if (hotelsArray && Array.isArray(hotelsArray)) {
      let currentRow = new ActionRowBuilder();
      
      hotelsArray.slice(0, 5).forEach((hotel, index) => {
        const safeName = encodeURIComponent(hotel.name.substring(0, 50));
        currentRow.addComponents(
          new ButtonBuilder()
            .setCustomId(`watchlist_${safeName}`)
            .setLabel(`⭐ Save #${index + 1}`)
            .setStyle(ButtonStyle.Primary)
        );

        if (currentRow.components.length === 5) {
          hotelRows.push(currentRow);
          currentRow = new ActionRowBuilder();
        }
      });
      if (currentRow.components.length > 0) hotelRows.push(currentRow);
    }

    // First message (Summary)
    const firstChunks = chunk(messages[0]);
    await interaction.editReply({ content: firstChunks[0] });

    for (let i = 1; i < firstChunks.length; i++) {
      await interaction.followUp({ content: firstChunks[i] });
    }

    // Remaining sections (Weather, Restaurants, Activities, Hotels, Flights)
    for (let i = 1; i < messages.length; i++) {
      const chunks = chunk(messages[i]);
      
      for (let j = 0; j < chunks.length; j++) {
        const payload = { content: chunks[j] };

        // INDEX 4 IS THE HOTELS SECTION! 
        // If we are printing the final chunk of the Hotels section, attach the buttons right here.
        if (i === 4 && j === chunks.length - 1 && hotelRows.length > 0) {
          payload.components = hotelRows;
        }

        await interaction.followUp(payload);
      
    }
  },
};
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
