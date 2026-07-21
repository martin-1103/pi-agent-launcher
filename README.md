# pi-agent-launcher

Pi extension — jalankan Pi agent dengan persona dari file profile (`.md` + YAML frontmatter).

## Install

### Cara 1: Copy manual

```bash
mkdir -p ~/.pi/agent/extensions/pi-agent-launcher
cp index.ts ~/.pi/agent/extensions/pi-agent-launcher/index.ts
mkdir -p ~/.pi/agent/profiles
cp profiles/dev.md ~/.pi/agent/profiles/dev.md
```

### Cara 2: Pi package (dari git)

Tambahin ke `~/.pi/agent/settings.json`:

```json
{
  "packages": ["git:github.com/martin-1103/pi-agent-launcher"]
}
```

Lalu:

```bash
pi install
```

## Pakai

```bash
pi --agent dev          # via CLI flag
/agent dev              # di tengah session
/agent reset            # balik ke default
```

## Bikin profile sendiri

Tinggal bikin file `.md` di:

- `~/.pi/agent/profiles/` — global (semua project)
- `.pi/profiles/` — project-local (override global)

Format:

```markdown
---
name: my-role
description: Deskripsi singkat
tools: read,write,edit,bash
model: anthropic/claude-sonnet-4
skills: skill-a, skill-b
---

System prompt — ini yang bakal dikirim ke LLM sebagai persona agent.
```
