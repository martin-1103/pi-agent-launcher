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

### Pattern 1: Context discovery (default)

```bash
# Pi langsung
pi --agent discover "cari auth middleware"

# Claude Code
/pi "cari auth middleware di project ini"
```

Pi bakal grep, read, lalu return daftar `file:line` yang relevan.

### Pattern 2: Discovery dengan model custom

```bash
# Pi langsung — override model via --model
pi --agent discover --model deepseek/deepseek-v4-pro "cari race condition"

# Claude Code
/pi --model deepseek/deepseek-v4-pro "cari semua tempat yang panggil SendEmail"
```

### Pattern 3: Ganti profile

```bash
# Pi langsung
pi --agent dev "fix bug di auth.go"

# Claude Code
/pi --profile dev "fix bug di auth.go"
/pi --profile dev --model deepseek/deepseek-v4-pro "refactor user service"
```

### Pattern 4: Di tengah session (Pi)

```
/agent discover        # switch ke discover
/agent dev             # switch ke dev
/agent reset           # balik default
```

---

## Profile bawaan

### `discover` — Context discovery

| Setting | Value |
|---------|-------|
| Model | `deepseek/deepseek-v4-pro:off` |
| Tools | `read, bash` |
| Context | 1M tokens |

**Cocok buat:** nyari file, grep symbol, mapping codebase. Pro thinking untuk akurasi tinggi.

### `dev` — General developer

| Setting | Value |
|---------|-------|
| Model | (default provider) |
| Tools | `read, write, edit, bash` |

**Cocok buat:** coding, debugging, refactor.

---

## Model yang tersedia

Cek model yang ada:

```bash
pi --list-models
```

Contoh output:
```
provider  model                context  max-out  thinking
deepseek  deepseek-v4-flash    1M       384K     yes
deepseek  deepseek-v4-pro      1M       384K     yes
vibe      gpt-5.4              128K     16.4K    no
```

Gunakan format `provider/model-id`:

```bash
pi --agent discover --model deepseek/deepseek-v4-pro "..."
pi --agent dev --model deepseek/deepseek-v4-pro "..."
```

---

## Bikin profile sendiri

Bikin file `.md` di:

- `~/.pi/agent/profiles/` — global
- `.pi/profiles/` — project-local

Contoh profile security audit:

```markdown
---
name: audit
description: Security audit — cari vulnerability
tools: read,bash
model: deepseek/deepseek-v4-pro
---

Kamu security auditor. Untuk setiap temuan:
- Severity: critical/high/medium/low
- Lokasi: file:line
- Deskripsi singkat vulnerability
- Fix: 1 baris rekomendasi

Jangan edit file. Report only.
```

Langsung bisa dipakai:

```bash
pi --agent audit "audit auth module"
/pi --profile audit "audit auth module"
```
