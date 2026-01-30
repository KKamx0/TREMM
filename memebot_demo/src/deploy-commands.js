const { REST, Routes } = require("discord.js");
const fs = require("fs");
const path = require("path");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN || !CLIENT_ID || !GUILD_ID) {
  console.error("Missing env vars: TOKEN, CLIENT_ID, GUILD_ID");
  process.exit(1);
}

const commands = [];
const commandsPath = path.join(__dirname, "commands");
const files = fs.readdirSync(commandsPath).filter((f) => f.endsWith(".js"));

for (const file of files) {
  const imported = require(path.join(commandsPath, file));
  const command = imported.default ?? imported;

  if (!command?.data?.toJSON) {
    console.warn(`Skipping ${file}: missing command.data`);
    continue;
  }

  console.log("Loaded command:", command.data.name);
  commands.push(command.data.toJSON());
}

const rest = new REST({ version: "10" }).setToken(TOKEN);

rest
  .put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), // ✅ guild = shows up fast
    { body: commands }
  )
  .then(() => console.log("✅ Guild slash commands registered"))
  .catch((err) => {
    console.error("❌ Failed to register commands:", err);
    process.exit(1);
  });
