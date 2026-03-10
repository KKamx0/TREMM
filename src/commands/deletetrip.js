import { SlashCommandBuilder } from "discord.js";
import { deleteSavedTrip } from "../helpers/deleteSavedTrip.js";

export default {
  data: new SlashCommandBuilder()
    .setName("deletetrip")
    .setDescription("Delete one of your saved trip briefs by trip ID")
    .addStringOption((opt) =>
      opt
        .setName("tripid")
        .setDescription("The trip ID to delete")
        .setRequired(true)
    ),

  async execute(interaction) {
    try {
      await interaction.deferReply({ ephemeral: true });

      const tripId = interaction.options.getString("tripid", true).trim();

      const result = await deleteSavedTrip(interaction.user.id, tripId);

      if (!result.ok) {
        return interaction.editReply(`⚠️ ${result.message}`);
      }

      const deletedList = result.deletedFiles
        .map((name) => `• \`${name}\``)
        .join("\n");

      await interaction.editReply(
        `🗑️ Deleted saved trip \`${result.tripId}\`.\n\nDeleted files:\n${deletedList}`
      );
    } catch (err) {
      console.error("deletetrip execute failed:", err);

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply(
          "❌ Something went wrong while deleting the saved trip."
        ).catch(() => {});
      } else {
        await interaction.reply({
          content: "❌ Something went wrong while deleting the saved trip.",
          ephemeral: true,
        }).catch(() => {});
      }
    }
  },
};
