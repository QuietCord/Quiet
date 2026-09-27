# QuietCord product roadmap

Quiet is **not** a generic Vencord skin. It is a **performance- and attention-first Discord client** with its own plugins, cloud, and telemetry story. Upstream Vencord is a merge source for infra (`VencordNative`, webpack patcher), not the product identity.

## What we already ship (differentiators)

| Area | Quiet-only |
|------|------------|
| **QuietPerformance** | Stage 4 adaptive controller (guild workload class, AUTO/ON/OFF features, memory pressure, sampling tiers), Stage 5 deep profiler, benchmark V2, patch health, **QuietRecovery panel** (Safe Mode + re-baseline), lite Chromium / CDN policy in main |
| **QuietFocus** | Minimal UI session + timed DMs/@mentions scope (separate from perf CSS) |
| **QuietSplitView** | Resizable side chat + swap-to-main |
| **QuietTranslator** | Manual translate accessory, per-guild targets, send-time translate |
| **Cloud Tier 3** | Anonymous perf telemetry opt-in, 3-way settings merge + conflict UI, release webhooks |

## Principles for new work

1. **Measure before patch** — every optimization should expose health in patch registry or Quiet profiler.
2. **User control** — AUTO vs ON vs OFF; never silent behavior changes on upgrades.
3. **Opt-in cloud** — aggregate telemetry only with explicit toggles; no message content.
4. **Compose, don’t fork** — new features as `Quiet*` plugins + shared `@shared/quiet*` helpers, not renames of upstream plugins.

## Near-term invention backlog (prioritized)

### Performance & stability

- **QuietSchedule** — time-of-day profiles (Focus + Performance preset + CDN policy) with optional calendar import.
- ~~**QuietRecovery**~~ — **shipped in Performance settings**: Safe Mode, Run QuietRecovery, re-baseline/compare Stage 4 benchmark V2, patch list + copy report.
- ~~**Patch health dashboard**~~ — **shipped** in QuietRecovery panel + Hub summary; optional: anonymous snapshot button when cloud opt-in.
- **Flux budget guard** — cap dispatch rate per event family when controller is in MEMORY PRESSURE (extend Stage 4).

### Attention & layout

- **Focus + Split synergy** — opening split auto-pauses Focus promos; closing split restores prior Focus session.
- **QuietLurk** — read-only channel mode: no typing indicator, no read ack batching option, minimal presence surface (pairs with NoTrack patterns).
- **Channel density presets** — per-guild “compact / cozy / full” stored in cloud namespace `plugins.QuietLayout`.

### Cloud & community (without becoming “another sync mod”)

- **Aggregated patch health** (backend) — opt-in telemetry already posts broken patch IDs; public dashboard by Discord build (no user ids).
- **Preset marketplace (private)** — share Performance preset JSON via signed cloud links (not public store yet).
- **PTB release channel** — hooks + `buildChannel: ptb-dev` in telemetry to compare PTB vs stable perf.

### Platform

- **Quiet Hub** — settings tab + toolbox: Focus, Performance controller, Split, Cloud status and quick actions. Deep links to each `Quiet*` plugin.
- **Rebrand pass** — settings copy and notifications say Quiet first; upstream plugin names only in “compatibility” footnotes.

## Research notes (2026)

- Discord client cost is dominated by **layout thrash**, **Flux fanout**, **media decode**, and **helper processes** — QuietPerformance already targets all four; next wins are **scheduled degradation** and **build-aware patch CI**.
- Multi-device pain is **settings collisions**, not raw sync — merge API + conflict modal is the right direction; next step is **namespace auto-sync** (only changed plugins since last ETag).
- Competitors (Vencord, Equicord, etc.) rarely ship **closed-loop** perf (measure → decide → verify). That loop is Quiet’s moat — extend it to Focus and layout.

## Memory for agents

Octavio wants QuietCord treated as a **unique product** with continued invention in the perf/attention space. Prefer new `Quiet*` plugins and docs in this file over upstream feature parity.
