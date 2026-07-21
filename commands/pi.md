---
description: Spawn Pi agent untuk context discovery — cari file, symbol, atau logic di codebase
argument-hint: "[--profile <name>] [--model <provider/id>] <prompt>"
allowed-tools: Agent
---

Invoke the `pi-discover` subagent via the `Agent` tool, forwarding the user's request as the prompt.

Pi akan grep, read, dan return file:line citations. Read-only, tidak pernah edit file.

Raw user request:
$ARGUMENTS

## Execution

- Forward `--profile` dan `--model` flag verbatim ke subagent
- Default profile: `discover`
- Subagent akan menjalankan Pi companion script dan return hasilnya
- Return output Pi apa adanya, jangan modifikasi
