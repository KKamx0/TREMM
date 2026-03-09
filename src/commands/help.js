import { SlashCommandBuilder } from "discord.js";

export default {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Shows how to use TREMM and explains available commands"),

  async execute(interaction) {
    const helpMessage = `
**TREMM Help Guide**

TREMM is a travel planning Discord bot that helps users plan trips with commands for activities, restaurants, weather, hotels, flights, and trip summaries.

**/trip activities**
Purpose: Find activities and tours for a destination.
Required Input: destination
Minimum Input: A real city or location.
Example: /trip activities destination: Seattle
Restriction: Destination must be specific enough to geocode.

**/restaurants**
Purpose: Find restaurants in a destination.
Required Input: destination
Minimum Input: A real city or location.
Example: /restaurants destination: Los Angeles
Restriction: Destination must be valid and clear.

**/weather**
Purpose: Get weather information for a destination.
Required Input: destination
Minimum Input: A real city or location.
Example: /weather destination: Miami
Restriction: Use a valid destination.

**/hotel**
Purpose: Search for hotels.
Required Input: destination, check-in date, check-out date
Full Detail: Add traveler information if supported.
Example: /hotel destination: Chicago checkin: 2026-03-20 checkout: 2026-03-23
Restriction: Dates must be valid and check-out must be after check-in.

**/flights**
Purpose: Search for flights.
Required Input: origin, destination, departure date
Full Detail: Add return date and traveler count if supported.
Example: /flights origin: SEA destination: LAX departure: 2026-03-20
Restriction: Dates must be valid and formatted correctly.

**/tripbrief**
Purpose: Generate a complete trip summary.
Minimum Input: Destination and enough trip details for the bot to search.
Full Detail: Include destination, dates, and traveler info.
Restriction: More complete inputs give better output.

Tip: Use real destinations and valid date formats for best results.
`;

    await interaction.reply({ content: helpMessage });
  },
};