
///commands/rentalCars.js

import { SlashCommandBuilder } from "discord.js";
import axios from "axios";
import { geocodePlace } from "../helpers/geocode.js";


export default {
  data: new SlashCommandBuilder()
    .setName("rentalcars")
    .setDescription("Find Nearby Rental Car Places in a City")
    .addStringOption((opt) =>
      opt
        .setName("location")
        .setDescription("City or Place to Search for Rental Cars (e.g., Seattle)")
        .setRequired(true)
    ),


  async execute(interaction) {
    await interaction.deferReply();

    const locationInput = interaction.options.getString("location")?.trim();
    if (!locationInput) {
      return interaction.editReply("Please Provide a Valid Location.");
    }


    // 1) Geocode the location to get lat/lon
    const geo = await geocodePlace(locationInput);
    if (!geo) {
      return interaction.editReply(
        `Could not find "${locationInput}". Try a Real City, like "Seattle, WA".`
      );
    }


    const { lat, lon, displayName } = geo;

    // 2) Query Geoapify Places API for rental cars (correct category is rental.car)
    const API_KEY = process.env.GEOAPIFY_API_KEY;
    if (!API_KEY) {
      return interaction.editReply(
        "Geoapify API key missing. Make sure GEOAPIFY_API_KEY is set in your environment."
      );
    }


    try {
      const params = {
        categories: "rental.car",
        filter: `circle:${lon},${lat},5000`,
        limit: 5,
        apiKey: API_KEY,
      };

      const response = await axios.get("https://api.geoapify.com/v2/places", { params });
      const features = response.data?.features || [];

      if (!features.length) {
        return interaction.editReply(
          `No rental car offices found near **${displayName}**. Try a nearby city or larger metro area.`
        );
      }

      // 3) Format output
      const lines = [`**Rental Cars Near ${displayName}:**`, ""];


      features.forEach((f, i) => {
        const props = f.properties;
        const name = props.name || "Unnamed Rental Car Office";
        const address = props.formatted || "Address not available";
        const mapUrl =
          
        props.url ||
          `https://www.google.com/maps/search/${encodeURIComponent(name + " " + displayName)}`;

        lines.push(
          `**${i + 1}. ${name}**`,
          `Address:  ${address}`,
          `Map:  <${mapUrl}>`,
          ""
        );
      });

      await interaction.editReply(lines.join("\n"));
    } catch (err) {
      console.error("rentalcars command error:", err);
      await interaction.editReply(
        "Something went wrong while fetching rental car locations. Please try again."
      );
    }
  },
};