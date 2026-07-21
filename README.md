# pi-agent-launcher

Pi extension + Claude Code plugin — jalankan Pi agent dengan persona dari file profile (`.md` + YAML frontmatter).

Dua fungsi dalam satu repo:

| Komponen | Buat | Fungsi |
|----------|------|--------|
| **Pi extension** (`index.ts`) | Pi agent | `/agent` command + `--agent` flag + profile loader |
| **Claude Code plugin** (root) | Claude Code | `/pi` command — spawn Pi buat context discovery |

---

## 1. Install Pi extension

### Cara gampang (auto)

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

### Cara manual

```bash
mkdir -p ~/.pi/agent/extensions/pi-agent-launcher
cp index.ts ~/.pi/agent/extensions/pi-agent-launcher/index.ts
mkdir -p ~/.pi/agent/profiles
cp profiles/*.md ~/.pi/agent/profiles/
```

### Verifikasi

```bash
pi --agent discover -p "test" --no-session
# Harus keluar output streaming + hasil discovery
```

---

## 2. Install Claude Code plugin

Di Claude Code:

```
/plugin marketplace add https://github.com/martin-1103/pi-agent-launcher
/plugin install pi@pi-agent-launcher
```

> Note: Claude Code akan detect `.claude-plugin/plugin.json` dari root repo.

Atau install dari path lokal:

```
/plugin install /path/to/pi-agent-launcher
```

### Verifikasi

```
/pi "cari auth middleware"
```

---

## Pakai

### Dari Pi langsung

```bash
pi --agent discover "cari file apa aja"    # CLI flag
/agent discover                             # di tengah session
/agent reset                                # balik default
```

### Dari Claude Code

```
/pi "cari auth middleware di project ini"
/pi --profile discover "cari race condition"
/pi --model deepseek/deepseek-v4-pro "cari semua tempat panggil SendEmail"
```

---

## Profile bawaan

### `discover` — Context discovery
- Model: `deepseek/deepseek-v4-flash`
- Tools: `read, bash`
- Fungsi: Cari file & baris relevan, return `file:line` citations

### `dev` — General developer
- Model: (default)
- Tools: `read, write, edit, bash`
- Fungsi: Coding + debugging asisten

---

## Bikin profile sendiri

Bikin file `.md` di:

- `~/.pi/agent/profiles/` — global
- `.pi/profiles/` — project-local

```markdown
---
name: my-profile
description: Deskripsi singkat
tools: read,bash
model: deepseek/deepseek-v4-flash
---

System prompt — persona agent yang bakal dipakai.
```
