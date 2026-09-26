# QuietCord GUI Installer

Cross-platform **Windows-first** Electron installer for embedding Quiet into **Discord PTB only**.

## Dev (from repo root)

```powershell
pnpm build
pnpm installer:dev
```

Requires Discord PTB installed under `%LOCALAPPDATA%\DiscordPTB`.

## Release portable `.exe`

```powershell
pnpm build
pnpm installer:pack
```

Output: `dist-installer/QuietCord Installer *.exe` (portable). The pack step bundles `dist/patcher.js`, `preload.js`, `renderer.js`, and `renderer.css` inside the installer — no separate clone needed for end users.

## Screens

1. **PTB missing** — link to [Discord PTB download](https://discord.com/download#ptb-experiment).
2. **Status** — per `app-*` folder verify (PATCHED / vanilla / partial).
3. **Install / Update / Uninstall** — same logic as `pnpm inject:ptb` and `pnpm restore:ptb`.
4. **Reinstall bundle** — same as `pnpm sync:ptb` when disk is PATCHED but Hub/plugins need a fresh renderer bundle (Ctrl+R after).
5. **Done** — open PTB, Quiet Hub, Cloud privacy link.

## CLI parity

| GUI | Script |
|-----|--------|
| Install / Update | `pnpm inject:ptb` |
| Reinstall bundle | `pnpm sync:ptb` |
| Uninstall | `pnpm restore:ptb` |
| Refresh status | `pnpm verify:ptb` |

Shared implementation: `scripts/ptbInstallApi.mjs`.

## Forking Vencord/Installer (Go)

This Electron app reuses Quiet’s **embedded PTB** path (`installEmbeddedPtb`) instead of the upstream Vencord CLI download. A future `QuietCord/Installer` release channel can ship this EXE plus optional Go CLI for power users.
