---
name: quiet-project
description: >-
  Maps the Quiet workspace (Vencord fork): layout, brand.ts, build targets,
  plugin system, webpack patching, and conventions. Use when editing code in
  c:/Projects/Quiet, rebranding Quiet, cloud API config, plugins, webpack finds,
  desktop main process, or browser extension builds.
---

# Quiet (Vencord fork)

**Quiet** is a personal fork of Vencord. User-facing name is **Quiet**; internal APIs stay `Vencord` for easier upstream merges.

## Fork config

Edit `src/shared/brand.ts` (API URL, badges, docs). Read [FORK.md](../../../FORK.md) for merge workflow and backend setup.

## Stack and tooling

- **Package manager**: `pnpm` only (`packageManager` in package.json). **Node** >= 22.
- **Build**: esbuild (`scripts/build/`). TypeScript strict, path aliases in `tsconfig.json`.
- **Lint**: ESLint flat config (`eslint.config.mjs`) — GPL header required on `src/**`, double quotes, `simple-import-sort`, path aliases enforced.

## Commands (common)

| Script | Purpose |
|--------|---------|
| `pnpm dev` / `pnpm watch` | Desktop inject build, watch |
| `pnpm build` | Desktop production build |
| `pnpm buildWeb` / `pnpm watchWeb` | Browser extension / web |
| `pnpm inject` / `pnpm uninject` | Install/uninstall into Discord |
| `pnpm test` | buildStandalone + tsc + lint + plugin JSON |
| `pnpm generatePluginJson` | Plugin list for site/docs |

## Directory map

```
src/
  Vencord.ts          # Entry: imports ~plugins, bootstraps PluginManager + settings
  api/                # Extension APIs (ContextMenu, Commands, Settings, Styles, …)
  components/         # Shared settings UI (FormSwitch, plugin tabs, …)
  plugins/            # Built-in plugins (+ _api, _core)
  userplugins/        # Optional local plugins (gitignored pattern; created by user)
  webpack/            # Module lookup + patchWebpack (Discord bundle patching)
  main/               # Electron main process (updater, CSP, IPC)
  utils/              # definePlugin, types, Logger, patches helpers
  shared/             # Small shared utilities (debounce, IPC events)
packages/
  discord-types/      # Discord internal type stubs (@vencord/discord-types)
  vencord-types/      # Generated public types
browser/              # Extension SW, content scripts, manifest
scripts/              # Build, installer, plugin list generator
```

## Path aliases (imports)

Use these, not relative deep paths:

- `@api/*`, `@components/*`, `@utils/*`, `@plugins/*`, `@main/*`, `@debug/*`, `@shared/*`
- `@webpack`, `@webpack/common` — re-exports of Discord webpack modules (stores, Menu, React, …)
- `@vencord/discord-types` — Discord typings

## Plugin system

Plugins are **not** manually registered. Esbuild plugin `globPlugins` resolves virtual module `~plugins` at build time (`scripts/build/common.mjs`):

1. Scans `src/plugins/_api`, `src/plugins/_core`, `src/plugins`, `src/userplugins`
2. Skips folders/files starting with `_` or `.`, and `index.ts` at plugin root
3. Each plugin folder/file becomes one default export from `definePlugin({ … })`

**Plugin name** comes from the `name` field inside `definePlugin`, not the folder name.

### Platform-specific plugins

Suffix the folder or file with a target before extension, e.g. `foo.desktop/index.ts`, `bar.web.tsx`:

| Suffix | Meaning |
|--------|---------|
| `.web` | Web build only (excluded from discordDesktop) |
| `.browser` | Browser extension build |
| `.discordDesktop` | Stock Discord desktop inject |
| `.desktop` | Non-web desktop |
| `.vesktop` | Vesktop-only |
| `.dev` | Dev-only (`IS_DEV`) |

Logic: `scripts/utils.mjs` → `getPluginTarget`.

### Minimal plugin shape

```tsx
import { Devs } from "@utils/constants";
import definePlugin from "@utils/types";

export default definePlugin({
    name: "MyPlugin",
    description: "…",
    authors: [Devs.Ven],
    tags: ["Utility"],
    patches: [{ find: "…", replacement: { match: /…/, replace: "…" } }],
    start() {},
});
```

### Plugin capabilities (see `PluginDef` in `src/utils/types.ts`)

- `patches` — webpack source patches (registered via PluginManager → `patchWebpack`)
- `settings` — `definePluginSettings` from `@api/Settings`
- `contextMenus`, `commands`, `flux`, `chatBarButton`, `messagePopoverButton`
- `renderMessageAccessory`, `renderMessageDecoration`, message send/edit listeners
- `dependencies`, `required`, `enabledByDefault`, `requiresRestart`, `startAt`

Runtime: `src/api/PluginManager.ts` enables/disables plugins, applies patches, wires APIs.

## Webpack patching

1. Plugins declare `patches` with `find` (string/RegExp matched against module factory source) and `replacement`(s).
2. `PluginManager.addPatch` canonicalizes and pushes to `patches` in `src/webpack/patchWebpack.ts`.
3. Discord’s webpack `require` is proxied; matching modules get string replacements before eval.

For **reading** Discord modules (not patching), use `@webpack` exports: `findByProps`, `findModule`, `findStore`, etc., and `@webpack/common` for stable facades (`ChannelStore`, `Menu`, `React`, …).

**Build number** gating: patch/replacement fields `fromBuild` / `toBuild`. `getBuildNumber()` in patchWebpack.

## Settings and UI

- Global Vencord settings: `src/api/Settings.ts`, persisted; cloud sync in `src/api/SettingsSync/`.
- Plugin settings pages: auto-generated from `definePluginSettings` unless `settingsAboutComponent` is set.
- Settings UI entry: `@components/settings` (tabs for plugins, themes, updater, Vencord).

## Desktop vs web

- **Renderer/inject**: `src/Vencord.ts` + plugins (same codebase, different `globPlugins` kind).
- **Main process**: `src/main/index.ts` — updater, CSP, native IPC; not for typical plugin UI work.
- **Browser**: `browser/` + `buildWeb.mjs`; `VencordNativeStub.ts` shims native APIs.

## Conventions when changing code

1. Match existing file header (GPL / SPDX) and import order (eslint).
2. Prefer `@webpack/common` over new raw webpack finds when a export already exists.
3. Keep plugin folders self-contained: `index.tsx`, optional `settings.ts`, `styles.css`, README.
4. Patches break when Discord updates — prefer unique `find` strings; use reporter builds for validation (`buildReporter`).
5. Do not edit generated `~plugins`; add a folder under `src/plugins` or `src/userplugins`.
6. `_api` plugins are dependencies for other plugins; `_core` is internal core behavior.

## Packages

- **`@vencord/discord-types`**: maintain/store typings under `packages/discord-types`.
- **`packages/vencord-types`**: output of `pnpm generateTypes` for external consumers.

## Additional detail

See [reference.md](reference.md) for API module index, webpack workflow, and `_api` plugin roles.
