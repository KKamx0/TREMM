// src/commands/weather.js
const { SlashCommandBuilder } = require("discord.js");
const { getWeather } = require("../helpers/weather.js");

function round(n) {
  return n == null ? null : Math.round(n);
}

function pct01ToPct(pop01) {
  const p = Math.round((pop01 ?? 0) * 100);
  return Number.isFinite(p) ? p : 0;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("weather")
    .setDescription("Get current weather + 7-day forecast for a place (short-term)")
    .addStringOption((opt) =>
      opt
        .setName("place")
        .setDescription('Example: "Seattle, WA" or "Paris, FR"')
        .setRequired(true)
    ),

  async execute(interaction) {
    const place = interaction.options.getString("place", true);
    await interaction.deferReply();

    try {
      const result = await getWeather(place);

      if (!result.ok) return interaction.editReply(result.message);

      const { location, current, nextDays } = result;
      const days = (nextDays ?? []).slice(0, 7);

      // Week summary
      const mins = days.map((d) => d.min).filter((v) => Number.isFinite(v));
      const maxs = days.map((d) => d.max).filter((v) => Number.isFinite(v));
      const weekMin = mins.length ? Math.min(...mins) : null;
      const weekMax = maxs.length ? Math.max(...maxs) : null;
      const peakRainPct = days.length ? Math.max(...days.map((d) => pct01ToPct(d.pop))) : 0;

      const summaryLine =
        weekMin != null && weekMax != null
          ? `Next 7 days: **${round(weekMin)}°F–${round(weekMax)}°F** • Peak rain chance: **${peakRainPct}%**`
          : `Next 7 days forecast available`;

      // Current lines
      const tempStr = current?.temp != null ? `${round(current.temp)}°F` : "N/A";
      const feelsStr = current?.feels != null ? `${round(current.feels)}°F` : "N/A";
      const descStr = current?.desc ?? "forecast";

      const humidityText =
        current?.humidity != null ? `Humidity: **${round(current.humidity)}%**` : `Humidity: **N/A**`;
      const windText =
        current?.wind != null ? `Wind: **${round(current.wind)} mph**` : `Wind: **N/A**`;

      const lines = [
        `**Weather for ${location}**`,
        summaryLine,
        `**${tempStr} (feels like ${feelsStr}) — ${descStr}**`,
        `${humidityText} • ${windText}`,
        ``,
        `**Next 7 days**`,
        ...days.map((d) => {
          const popPct = pct01ToPct(d.pop);
          const popText = popPct > 0 ? ` • Rain chance: **${popPct}%**` : "";
          return `• **${d.label}:** ${round(d.min)}°F–${round(d.max)}°F — ${d.desc}${popText}`;
        }),
        ``,
        `_Open-Meteo provides forecasts up to ~16 days (we show 7 here)._`,
      ];

      return interaction.editReply(lines.join("\n"));
    } catch (err) {
      console.error(err);
      return interaction.editReply("Something went wrong fetching weather. Try again in a bit.");
    }
  },
};

