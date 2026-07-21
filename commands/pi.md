---
description: Spawn Pi agent untuk context discovery — cari file, symbol, atau logic di codebase
argument-hint: "[--profile <name>] [--model <provider/id>] [--parallel <n>] <prompt>"
allowed-tools: Bash
---

Jalankan Pi agent via companion script untuk mencari file/line yang relevan di codebase.

**Gunakan ini ketika kamu butuh:**
- Mencari di mana suatu logic/function diimplementasikan
- Menemukan semua file yang terkait suatu fitur
- Eksplorasi codebase cepat sebelum mulai edit

**Jangan gunakan untuk:**
- Implementasi/edit kode (ini discovery-only)
- Task yang kamu bisa selesaikan sendiri dengan 1-2 grep

## Flags

| Flag | Default | Description |
|------|---------|-------------|
| `--profile` | `discover` | Pi agent profile dari `~/.pi/agent/profiles/` |
| `--model` | (profile default) | Override model: `provider/model-id` |
| `--parallel` | `1` | Jumlah parallel spawn (maks 5) |

## Contoh

```
/pi "cari auth middleware di project ini"
/pi --profile deep "cari race condition di user service"
/pi --model deepseek/deepseek-v4-pro "cari semua tempat yang panggil SendEmail"
```

## Eksekusi

**PENTING:** Hanya jalankan `node` companion script di bawah. Jangan baca file sendiri, jangan grep sendiri — delegasikan ke Pi.

```bash
node "${CLAUDE_PLUGIN_ROOT}/scripts/pi-companion.mjs" \
  --profile discover \
  "$ARGUMENTS"
```

Preserve semua flag dari user (`--profile`, `--model`, `--parallel`). Forward verbatim.

Kalau companion gagal, return output error apa adanya. Jangan fallback ke manual search.
