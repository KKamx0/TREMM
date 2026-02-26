import { SlashCommandBuilder } from "discord.js";
import { getTopRestaurants } from "../helpers/restaurants.js";

export default {
  data: new SlashCommandBuilder()
    .setName("restaurants")
    .setDescription("Find Top Restaurants in a Location")
    .addStringOption((opt) =>
      opt
        .setName("location")
        .setDescription("City or Place Name to Search Restaurants in (e.g. Seattle, Paris)")
        .setRequired(true)
    ),

  async execute(interaction) {
    await interaction.deferReply();

    const location = interaction.options.getString("location")?.trim();
    if (!location) return interaction.editReply("Invalid Location Provided. Please Enter a City or Place Name.");

    try {
      const result = await getTopRestaurants({ location });
      if (!result.ok) return interaction.editReply(result.message);

      const lines = [`**Top Restaurants in ${location}**`];

      result.restaurants.forEach((r, index) => {
        lines.push(
          "",
          `**${index + 1}. ${r.name}**`,
          `Category: ${r.category}`,
          `Address: ${r.address}`,
          r.description ? `Description: ${r.description}` : null,
          `View on Google: <${r.url}>`
          ""
        );
      });

      await interaction.editReply(lines.filter(Boolean).join("\n"));
    } catch (err) {
      console.error("restaurants command error:", err);
      await interaction.editReply("Something Went Wrong With Getting Restaurants.");
    }
  },
};
