// helpers/meme.js
import { EmbedBuilder } from "discord.js";

const MEME_URL = process.env.MEME_URL || "";

export const getMeme = async () => {
  return new EmbedBuilder().setImage(MEME_URL);
};
