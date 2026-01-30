// commands/weather.js
import { SlashCommandBuilder } from "discord.js";
import { getWeather } from "../helpers/weather.js";

export default {
  data: new SlashCommandBuilder()
    .setName("weather")
    .setDescription("Get current weather + short forecast for a place")
    .addStringOption((opt) =>
      opt
        .setName("place")
        .setDescription('Example: "Seattle, WA" or "Paris, FR"')
        .setRequired(true)
    ),

  async execute(interaction) {
    const place = interaction.options.getString("place", true);

    // avoids the "interaction failed" timeout while we fetch
    await interaction.deferReply();

    try {
      const result = await getWeather(place);

      if (!result.ok) {
        return interaction.editReply(result.message);
      }

      const { location, current, nextDays } = result;

      const lines = [
        `**Weather for ${location}**`,
        `${Math.round(current.temp)}°F (feels like ${Math.round(current.feels)}°F) — **${current.desc}**`,
        `Humidity: **${current.humidity}%** • Wind: **${Math.round(current.wind ?? 0)} mph**`,
        "",
        `**Next days**`,
        ...nextDays.map(d => {
          const popPct = Math.round((d.pop ?? 0) * 100);
          const popText = popPct > 0 ? ` • Rain chance: **${popPct}%**` : "";
          return `• **${d.label}:** ${Math.round(d.min)}°F–${Math.round(d.max)}°F — ${d.desc}${popText}`;
        }),
      ];

      return interaction.editReply(lines.join("\n"));
    } catch (err) {
      console.error(err);
      return interaction.editReply("Something went wrong fetching weather. Double-check your `OPENWEATHER_KEY` and try again.");
    }
  },
};
