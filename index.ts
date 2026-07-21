/**
 * pi-agent-launcher — Jalankan Pi dengan persona dari file profile (.md)
 *
 * Usage:
 *   pi --agent dev                 # dari CLI
 *   /agent dev                     # di tengah session
 *   /agent reset                   # balikin ke default
 *
 * Profile files:
 *   .pi/profiles/                  # project-local
 *   ~/.pi/agent/profiles/          # global
 *
 * Format: Markdown + YAML frontmatter
 *   ---
 *   name: dev
 *   description: General developer
 *   tools: read,write,edit,bash
 *   model: anthropic/claude-sonnet-4
 *   skills: pipeline-monitor
 *   ---
 *   System prompt body...
 *
 * Install:
 *   1. Copy index.ts ke ~/.pi/agent/extensions/pi-agent-launcher/index.ts
 *   2. Copy profile .md ke ~/.pi/agent/profiles/ atau .pi/profiles/
 *
 *   Atau via git + settings.json:
 *     "packages": ["git:github.com/martin-1103/pi-agent-launcher"]
 */

import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

// ━━ Types ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface Profile {
  name: string;
  description?: string;
  tools?: string[];
  model?: string;
  skills?: string[];
  systemPrompt: string;
}

// ━━ State ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let currentProfile: Profile | null = null;
let profileDirs: string[] = [];

// ━━ Helpers ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function parseFrontmatter(text: string): { meta: Record<string, string>; body: string } {
  const match = text.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { meta: {}, body: text };

  const meta: Record<string, string> = {};
  const lines = match[1].split("\n");
  for (const line of lines) {
    const kv = line.match(/^(\w[\w-]*)\s*:\s*(.*)$/);
    if (kv) meta[kv[1]] = kv[2].trim();
  }

  return { meta, body: match[2].trim() };
}

function findProfile(name: string): Profile | null {
  const fileName = name.endsWith(".md") ? name : `${name}.md`;

  for (const dir of profileDirs) {
    const filePath = path.join(dir, fileName);
    try {
      const content = fs.readFileSync(filePath, "utf8");
      const { meta, body } = parseFrontmatter(content);

      return {
        name: meta.name || name,
        description: meta.description,
        tools: meta.tools ? meta.tools.split(",").map((t) => t.trim()).filter(Boolean) : undefined,
        model: meta.model || undefined,
        skills: meta.skills ? meta.skills.split(",").map((s) => s.trim()).filter(Boolean) : undefined,
        systemPrompt: body,
      };
    } catch (_) {
      // File not found in this dir, try next
    }
  }

  return null;
}

function resolveProfileDirs(cwd: string): string[] {
  const dirs: string[] = [];
  dirs.push(path.join(os.homedir(), ".pi", "agent", "profiles"));
  dirs.push(path.join(cwd, ".pi", "profiles"));
  return dirs.filter((d) => {
    try { return fs.statSync(d).isDirectory(); } catch { return false; }
  });
}

// ━━ Extension ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function (pi: ExtensionAPI) {
  // ━━ Register --agent CLI flag ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  pi.registerFlag("agent", {
    description: "Run Pi with a profile from .pi/profiles/ or ~/.pi/agent/profiles/",
    type: "string",
    default: undefined,
  });

  // ━━ Register /agent command ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  pi.registerCommand("agent", {
    description: "Switch agent profile. /agent <name> atau /agent reset",
    async handler(args, ctx) {
      const name = args._?.[0];

      if (!name || name === "reset") {
        currentProfile = null;
        ctx.ui.notify("🔄 Balik ke default Pi agent", "info");
        return "Balik ke default Pi agent.";
      }

      const profile = findProfile(name);
      if (!profile) {
        const avail = listProfiles().join(", ");
        return `Profile "${name}" gak ditemukan. Available: ${avail || "(belum ada)"}`;
      }

      currentProfile = profile;
      applyProfile(pi, profile);
      ctx.ui.notify(`🤖 Agent: ${profile.name}`, "info");
      return `✅ Loaded: ${profile.name}\n${profile.description || ""}\nSystem prompt: ${profile.systemPrompt.slice(0, 100)}...`;
    },
  });

  // ━━ session_start: resolve dirs + load --agent profile ━━━━━━━━━━
  pi.on("session_start", async (event, ctx) => {
    const cwd = ctx.sessionManager?.getCwd?.() || process.cwd();
    profileDirs = resolveProfileDirs(cwd);

    if (event.reason === "startup" || event.reason === "new") {
      const agentFlag = pi.getFlag("agent") as string | undefined;
      if (agentFlag) {
        const profile = findProfile(agentFlag);
        if (profile) {
          currentProfile = profile;
          applyProfile(pi, profile);
          ctx.ui.notify(`🤖 --agent ${profile.name}`, "info");
        } else {
          const avail = listProfiles().join(", ");
          ctx.ui.notify(`⚠️  Profile "${agentFlag}" gak ditemukan. Available: ${avail || "(belum ada)"}`, "warn");
        }
      }
    }
  });

  // ━━ before_agent_start: inject system prompt ━━━━━━━━━━━━━━━━━━━
  pi.on("before_agent_start", async (event) => {
    if (!currentProfile) return;

    return {
      systemPrompt: currentProfile.systemPrompt,
    };
  });
}

// ━━ Apply profile settings ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function applyProfile(pi: ExtensionAPI, profile: Profile) {
  try {
    if (profile.model) pi.setModel(profile.model);
  } catch (_) {}
  try {
    if (profile.tools) pi.setActiveTools(profile.tools);
  } catch (_) {}
}

function listProfiles(): string[] {
  const names: string[] = [];
  for (const dir of profileDirs) {
    try {
      for (const f of fs.readdirSync(dir)) {
        if (f.endsWith(".md")) names.push(f.replace(".md", ""));
      }
    } catch (_) {}
  }
  return [...new Set(names)];
}
