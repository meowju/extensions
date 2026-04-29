/**
 * help.ts - Simple help for Meow
 */
import { getAllSkills } from "./loader.ts";
import type { Skill, SkillContext, SkillResult } from "./loader.ts";

export const help: Skill = {
  name: "help",
  description: "Show Meow CLI help",
  aliases: ["?"],

  async execute(_args: string, _ctx: SkillContext): Promise<SkillResult> {
    const skills = getAllSkills();

    const lines = [
      "ฅ(^•ﻌ•^)ฅ MEOW - Lean Sovereign Agent",
      "=".repeat(40),
      "",
      "Navigation:",
      "  /exit        - End session",
      "  /clear       - Clear screen",
      "  /sessions    - List saved sessions",
      "  /resume <id> - Resume session",
      "",
      "Agent Control:",
      "  /dangerous   - Auto-approve shell",
      "  /stream      - Toggle streaming",
      "  /plan <task> - Preview plan",
      "  /auto        - Autonomous OODA loop",
      "  /tick        - Continuous mode",
      "",
      "Tasks:",
      "  /tasks       - List pending tasks",
      "  /add <desc>  - Add task",
      "  /done <id>   - Mark done",
      "",
      "Memory:",
      "  /remember <fact>",
      "  /forget <key>",
      "  /facts",
      "",
      "Skills (" + skills.length + " loaded):",
    ];

    for (const s of skills) {
      const alias = s.aliases?.length ? " (/" + s.aliases?.join(", /") + ")" : "";
      lines.push("  /" + s.name + " - " + s.description + alias);
    }

    lines.push("", "Tip: multi-line input with : { or indented continuations");

    return { content: lines.join("\n") };
  },
};
