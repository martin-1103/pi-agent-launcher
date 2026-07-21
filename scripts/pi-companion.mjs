#!/usr/bin/env node

/**
 * pi-companion.mjs — Spawn Pi agent for context discovery.
 *
 * Usage:
 *   node pi-companion.mjs [--profile <name>] [--model <provider/id>] [--parallel <n>] <prompt>
 *
 * Spawns: pi --agent <profile> --mode json "<prompt>" --no-session --approve
 * Streams real-time progress to stderr, final result to stdout.
 */

import { spawn } from "node:child_process";
import * as path from "node:path";
import { createInterface } from "node:readline";

// ━━ Parse args ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const args = process.argv.slice(2);
let profile = "discover";
let model = null;
let parallel = 1;
const promptParts = [];

let i = 0;
while (i < args.length) {
  if (args[i] === "--profile" && args[i + 1]) {
    profile = args[i + 1];
    i += 2;
  } else if (args[i] === "--model" && args[i + 1]) {
    model = args[i + 1];
    i += 2;
  } else if (args[i] === "--parallel" && args[i + 1]) {
    parallel = Math.min(parseInt(args[i + 1], 10) || 1, 5);
    i += 2;
  } else {
    promptParts.push(args[i]);
    i += 1;
  }
}

const prompt = promptParts.join(" ").trim();
if (!prompt) {
  console.log("❌ pi-companion: butuh prompt. Usage: pi-companion [flags] <prompt>");
  process.exit(1);
}

// ━━ Build pi args ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function buildPiArgs(promptText) {
  const piArgs = ["--agent", profile, "--mode", "json", promptText, "--no-session", "--approve"];
  if (model) {
    piArgs.unshift("--model", model);
  }
  return piArgs;
}

// ━━ Run single discovery ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

async function runDiscovery(label, promptText) {
  return new Promise((resolve, reject) => {
    const piArgs = buildPiArgs(promptText);
    const child = spawn("pi", piArgs, {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, PI_SKIP_VERSION_CHECK: "1" },
    });

    let output = "";
    let errors = [];
    let settled = false;
    let aborted = false;

    const timer = setTimeout(() => {
      aborted = true;
      child.kill("SIGTERM");
      resolve(`${label}[TIMEOUT 60s]`);
    }, 60_000);

    const rl = createInterface({ input: child.stdout });

    rl.on("line", (line) => {
      line = line.trim();
      if (!line) return;

      try {
        const e = JSON.parse(line);
        const t = e.type;

        if (t === "message_update") {
          const ae = e.assistantMessageEvent;
          if (ae?.type === "text_delta") {
            process.stderr.write(ae.delta || "");
          }
        } else if (t === "tool_execution_start") {
          const cmd = (e.args?.command || e.toolName || "").slice(0, 50);
          process.stderr.write(`\n  ⚙ ${e.toolName}: ${cmd}`);
        } else if (t === "tool_execution_end") {
          process.stderr.write(e.isError ? " ❌" : " ✓");
        } else if (t === "agent_settled") {
          settled = true;
          process.stderr.write(`\n  ✅ ${label}selesai\n`);
        } else if (t === "message_end" && e.message?.role === "assistant") {
          const text = e.message?.content
            ?.filter((c) => c.type === "text")
            .map((c) => c.text)
            .join("\n") || "";
          if (text) output = text;
        }
      } catch {
        // skip non-JSON lines (stderr noise)
      }
    });

    child.stderr.on("data", (d) => {
      errors.push(d.toString());
    });

    child.on("close", (code) => {
      clearTimeout(timer);
      if (aborted) return;

      if (settled && output) {
        resolve(`${label}${output}`);
      } else if (output) {
        resolve(`${label}${output}`);
      } else {
        const errSummary = errors.join("").slice(0, 200);
        resolve(`${label}❌ Pi exited code=${code}. ${errSummary}`);
      }
    });

    child.on("error", (err) => {
      clearTimeout(timer);
      resolve(`${label}❌ Gagal spawn pi: ${err.message}`);
    });
  });
}

// ━━ Main ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

if (parallel > 1) {
  // Split prompt into sub-queries (simple split by "dan" / ";")
  const subPrompts = prompt
    .split(/\s+dan\s+|\s*;\s*/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (subPrompts.length < 2) {
    // Can't split meaningfully, run single
    const result = await runDiscovery("", prompt);
    console.log(result);
  } else {
    process.stderr.write(`⚡ Parallel discovery ×${Math.min(subPrompts.length, parallel)}\n`);
    const results = await Promise.all(
      subPrompts.slice(0, parallel).map((p, idx) => runDiscovery(`[${idx + 1}] `, p))
    );
    console.log(results.join("\n\n"));
  }
} else {
  process.stderr.write(`🔍 Pi discover [${profile}]${model ? ` (${model})` : ""}\n`);
  const result = await runDiscovery("", prompt);
  console.log(result);
}
