import { Client, GatewayIntentBits, ChannelType, type TextChannel, type Message } from "discord.js";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { MemoryStore } from "../src/core/memory";
import { MeowAgentClient, type AgentResult } from "../src/core/meow-agent";

// Load env
const envPath = join(process.cwd(), ".env");
if (existsSync(envPath)) {
  const content = readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#")) {
      const eqIdx = trimmed.indexOf("=");
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        if (!process.env[key]) process.env[key] = val;
      }
    }
  }
}

const BOT_USER_ID = "1481472813167673437";
const CHANNEL_ID = "1494151213481197578";
const MESSAGE_ID = "1498766531922755634"; // "find high value drugs to do patent research on"

const memory = new MemoryStore(process.cwd());

async function main() {
  const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  });

  client.once("ready", async () => {
    console.log("[dry-run] Bot ready as", client.user?.tag);

    try {
      const channel = await client.channels.fetch(CHANNEL_ID) as TextChannel;
      const message = await channel.messages.fetch(MESSAGE_ID) as Message;

      console.log("[dry-run] Message:", message.content);
      console.log("[dry-run] Author:", message.author.username);
      console.log("[dry-run] Timestamp:", message.timestamp);

      // Simulate what relay does - build prompt and call agent
      const promptText = message.content.replace(/<@\d+>/g, "").trim();
      const userId = message.author.id;
      const username = message.author.username;

      console.log("\n[dry-run] === SIMULATING RELAY PROCESSING ===");
      console.log("[dry-run] Prompt:", promptText);
      console.log("[dry-run] User:", username, userId);

      // Update memory (this was failing)
      memory.updateLastSeen(userId, username);
      memory.incrementInteractions(userId);
      memory.updateSoulRelationship(userId, username, "");
      memory.addMessageToThread(message.channelId, userId, "user", promptText);

      // Build context prompt
      const bondTone = memory.getBondTone(userId);
      const bondStrength = memory.getBondStrength(userId);
      const greeting = memory.getBondGreeting(userId, username);
      const userContext = memory.buildUserContext(userId, username);

      console.log("[dry-run] Bond strength:", Math.round(bondStrength * 100) + "%");
      console.log("[dry-run] Bond tone:", bondTone);

      // Call the agent (dry run - don't post reply)
      const agent = new MeowAgentClient({
        sessionId: `discord-${message.id}`,
      });

      console.log("\n[dry-run] === CALLING AGENT ===");
      const result: AgentResult = await agent.prompt(promptText);

      console.log("[dry-run] Agent result received, length:", result.content?.length || 0);
      console.log("[dry-run] First 500 chars of response:");
      console.log(result.content?.slice(0, 500));

      // Show what would be posted
      console.log("\n[dry-run] === WOULD POST TO DISCORD ===");
      const replyPreview = result.content?.slice(0, 500) || "(empty)";
      console.log(replyPreview + "...");

      console.log("\n[dry-run] === DRY RUN COMPLETE ===");

      client.destroy();
      process.exit(0);
    } catch (err) {
      console.error("[dry-run] Error:", err);
      client.destroy();
      process.exit(1);
    }
  });

  client.login(process.env.DISCORD_TOKEN);
}

main();