import fs from "fs";
import path from "path";

export const loadCommands = (client, commandsPath) => {
  const files = fs.readdirSync(commandsPath).filter(f => f.endsWith(".js"));

  for (const file of files) {
    const imported = require(path.join(commandsPath, file));
    const command = imported.default ?? imported;

    if (!command?.data?.name) {
      console.warn(`[WARN] Command ${file} is missing "data.name"`);
      continue;
    }

    client.commands.set(command.data.name, command);
  }
};
