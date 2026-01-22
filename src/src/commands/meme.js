import { SlashCommandBuilder } from "discord.js";
import { getMeme } from "../helpers/meme.js";

export default {
  data: new SlashCommandBuilder()
    .setName("meme")
    .setDescription("Get a meme"),

  async execute(interaction) {
    const meme = await getMeme();

    await interaction.reply({
      content: "Here’s a meme for you :) :)",
      embeds: [meme],
    });
  },
};