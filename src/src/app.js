import { Client, GatewayIntentBits, Partials, Collection } from "discord.js";
import { loadEvents } from "./helpers";
import path from "path";
import { loadCommands } from "./helpers/loadCommands";



const TOKEN = process.env.TOKEN;

const { Guilds, GuildMembers, GuildMessages, MessageContent } =
  GatewayIntentBits;
const { User, Message, GuildMember, ThreadMember } = Partials;

const client = new Client({
  intents: [Guilds, GuildMembers, GuildMessages, MessageContent],
  partials: [User, Message, GuildMember, ThreadMember],
});

client.events = new Collection();

loadEvents(client, path.join(__dirname, "events"));

client.commands = new Collection();
loadCommands(client, path.join(__dirname, "commands"));


client.login(TOKEN);
