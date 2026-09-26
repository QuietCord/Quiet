# Quiet / Vencord — reference

## Boot sequence (renderer)

1. Discord loads injected bundle → `src/Vencord.ts`
2. Side-effect import `~plugins` loads all plugin modules
3. `initPluginManager()` / `startAllPlugins()` — patches collected, webpack patcher armed
4. `onceReady` (webpack) then gateway-ready flows for settings sync, updater notifications

## Virtual modules

| Module | Role |
|--------|------|
| `~plugins` | Aggregated plugin map + `PluginMeta` + `ExcludedPlugins` |
| `~git-hash` / `~git-remote` | Build metadata |

Types: `src/modules.d.ts`.

## `src/api/` modules (extension surface)

| Module | Use |
|--------|-----|
| `PluginManager` | Enable/disable plugins, patch registration |
| `Settings` / `definePluginSettings` | Plugin and global settings schema |
| `ContextMenu` | Patch nav/context menus (`NavContextMenuPatchCallback`) |
| `Commands` | Slash/context commands |
| `MessageEvents` | Pre-send, pre-edit, click |
| `MessageAccessories` / `MessageDecorations` | Under-message UI |
| `ChatButtons` / `MessagePopover` | Chat bar and hover actions |
| `Badges` | Profile badges |
| `Styles` / `Themes` | CSS injection, theme API |
| `Notifications` | Toasts |
| `DataStore` | IndexedDB wrapper |
| `SettingsSync` | Optional cloud settings |

Many features depend on **`plugins/_api/*`** plugins being enabled as dependencies.

## Webpack cheat sheet

```ts
import { findByPropsLazy, findStoreLazy } from "@webpack";
import { FluxDispatcher, React, Menu, ChannelStore } from "@webpack/common";
```

- **Lazy** variants defer lookup until first access (preferred when order matters).
- Patching is for when exports are not exposed or behavior must change at source level.
- `canonicalizeFind` / `canonicalizeReplacement` in `@utils/patches` normalize plugin patch shapes.

## Plugin folder examples in tree

- Simple: `src/plugins/noTypingAnimation/index.ts`
- With settings + CSS: `src/plugins/translate/`
- Desktop-only native: `src/plugins/fixSpotifyEmbeds.desktop/`
- API plugin: `src/plugins/_api/commands.ts`

## Build kinds (`globPlugins` argument)

- `discordDesktop` — default `pnpm build`
- `web` — extension/userscript
- `vesktop` — Vesktop-specific bundle

Excluded plugins are still listed in `ExcludedPlugins` for the settings UI (“wrong client” messaging).

## Debugging

- `src/debug/` — reporter, tracers (`IS_REPORTER`, `IS_DEV` globals from build)
- `@debug/Tracer` — optional function tracing

## Installer

- `scripts/runInstaller.mjs` — inject path into Discord install
- `src/main/patcher.ts` — low-level patch application on desktop

## License

GPL-3.0-or-later on Vencord sources. Preserve copyright headers on new/edited files.
