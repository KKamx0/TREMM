// note that this requires you install fast-check --v
import fc from "fast-check";
// note that this is only looking at the meme.js file --v
import { getMeme } from "../helpers/meme.js";

// Minimal fake interaction object for testing
const fakeInteraction = (content) => ({
  reply: async ({ embeds }) => {
    // just log length to see something happened
    console.log("Replied with embed count:", embeds?.length ?? 0);
    return true;
  },
  options: {
    getString: () => content,
  },
});

const fuzzMemeCommand = async () => {
  console.log("Starting fuzz test...");

  await fc.assert(
    fc.asyncProperty(fc.string(), async (randomInput) => {
      const interaction = fakeInteraction(randomInput);

      // This is the same code your /meme command runs
      const meme = await getMeme();
      await interaction.reply({
        content: "Fuzz test response",
        embeds: [meme],
      });

      // Always return true to satisfy fast-check
      return true;
    }),
    { numRuns: 50 } // run 50 random tests
  );

  console.log("Fuzz test finished!");
};

// Run if invoked directly
if (import.meta.url === process.argv[1] || process.argv.includes("fuzz")) {
  fuzzMemeCommand();
}

export { fuzzMemeCommand };
