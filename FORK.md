# Quiet — fork de Vencord

**Org:** [QuietCord](https://github.com/QuietCord) · Client: [QuietCord/Quiet](https://github.com/QuietCord/Quiet) · API: [QuietCord/Backend](https://github.com/QuietCord/Backend)

Quiet es un fork personal basado en [Vencord](https://github.com/Vendicated/Vencord) (GPL-3.0). El código interno sigue usando el global `Vencord`, rutas `vencord://`, claves `Vencord_*` en almacenamiento, etc., para poder **fusionar upstream** con pocos conflictos.

## Branding

Edita `src/shared/brand.ts` — nombre, repo, API, etc.

**Logo:** pixel-art gato en caja en `assets/brand/logo.png` y `favicon.ico`. Se embebe en el bundle vía `src/shared/brandAssets.ts` y aparece en Ajustes → Quiet y en el botón del toolbox.

La UI de Ajustes de Discord lee `CLIENT_NAME`; no renombres carpetas `vencord_*` en el layout de settings salvo que quieras pelear con cada merge de upstream.

## Sincronizar con Vencord upstream

```bash
git remote add upstream https://github.com/Vendicated/Vencord.git
git fetch upstream
git merge upstream/main
# Resolver conflictos; conservar brand.ts y cambios propios de Quiet
```

Tras cada merge, revisa que `src/shared/brand.ts` siga intacto y vuelve a probar `pnpm test`.

## Tu propia API (cloud sync)

El cliente espera una API compatible con [Vencord Backend](https://github.com/Vencord/Backend) (AGPL):

- `GET /v1/oauth/settings` → `{ clientId, redirectUri }`
- OAuth callback que devuelve `{ secret }` (JSON)
- Endpoints de settings sync que usa `src/api/SettingsSync/cloudSync.ts`

Pasos recomendados:

1. Haz fork o despliega Vencord/Backend con tu dominio.
2. Pon la URL base en `CLOUD_API_URL` en `brand.ts` (con barra final).
3. En desktop, la primera conexión puede pedir permiso CSP para tu dominio (`checkCloudUrlCsp` en `cloudSetup.tsx`).
4. Opcional: añade tu dominio en `src/main/csp/index.ts` si sirves imágenes/CSS desde ahí.

## Badges

**QuietCord supporters (money):** add Discord user IDs to [`docs/quiet-donors.json`](docs/quiet-donors.json). They get the cat-in-box supporter badge on profile and the gold card in Quiet Settings. Independent of plugin authors in `Devs` / `constants.ts`.

**Optional upstream mirror:** set `BADGES_JSON_URL` in `brand.ts` to a JSON in the same shape as `badges.vencord.dev/badges.json` for legacy upstream donor icons.

## Build e inject

Igual que Vencord: `pnpm install`, `pnpm build`.

**pnpm sin instalación global (Bun):** `bun install -g pnpm` o usa siempre `bunx pnpm@11.9.0` (coincide con `packageManager` del repo). Ejemplo: `bunx pnpm@11.9.0 install`.

**Desarrollo presencia + plugins en PTB:**

```bash
bunx pnpm@11.9.0 dev:ptb    # watch + auto sync:ptb
bunx pnpm@11.9.0 start:ptb  # abre PTB (QUIET_DEV=1)
```

Tras cambios en `patcher.js`, reinicia PTB; con solo `renderer` basta **Ctrl+R**.

**API cloud:** ver `services/quiet-backend/README.md`.

**Discord PTB (recomendado para Quiet):** solo `%LOCALAPPDATA%\\DiscordPTB` y `DiscordPTB.exe`. No uses scripts que maten `Discord.exe` ni parches en `%LOCALAPPDATA%\\Discord`.

```bash
pnpm build
pnpm inject:ptb
```

Eso copia `dist/` dentro de `DiscordPTB/.../resources/_vencord/` (sin depender de `%AppData%\\Vencord` ni rutas externas que Discord a veces ignora).

Luego **cierra solo Discord PTB** (`DiscordPTB.exe`, bandeja incluida). **No cierres Discord stable** (`Discord.exe`); Quiet no lo toca.

Opcional: `QUIET_QUIT_PTB=1 pnpm inject:ptb` cierra **solo** `DiscordPTB.exe` antes de parchear.

`pnpm inject` / `pnpm uninject` pasan `--branch ptb` al instalador oficial. Preferir `inject:ptb` (embed local en `_vencord`).

Si Discord PTB **no arranca** tras `inject:ptb`: `pnpm restore:ptb` (vuelve al Discord vanilla).

### Desarrollo sin reiniciar PTB a cada cambio

`inject:ptb` reparcha `app.asar` y, si usas `QUIET_QUIT_PTB=1`, mata el cliente. Eso **no debería cerrar sesión** (el token queda en disco), pero te saca de llamadas y reinicia todo.

Flujo recomendado:

1. **Una vez:** `pnpm inject:ptb` (PTB cerrado desde la bandeja; **no** hace falta `QUIET_QUIT_PTB=1` si ya lo cerraste tú).
2. **Día a día:** terminal con `pnpm watch`; tras cada build, `pnpm sync:ptb` (solo copia `dist/` → `_vencord`, **sin** matar Discord).
3. En PTB: **Ctrl+R** para recargar el renderer con el bundle nuevo.

Vuelve a `inject:ptb` solo si cambias preload/main (`patcher.js` en el stub) o reinstalas PTB. Para plugins y UI, `sync:ptb` + Ctrl+R alcanza.

Si ves pantalla de **login** de verdad (no solo cierre del app), suele ser otra causa (cuenta, caché corrupto, otro cliente); prueba no usar `taskkill /F` en bucle y evita `restore:ptb` salvo emergencia.

**Dev overlay inteligente:** con el repo en `QUIET_DEV_REPO_PATH` (`brand.ts`, p. ej. `C:/Projects/Quiet`) o `QUIET_REPO_PATH`, Quiet lee la rama git vía main process y puede activar solo la tarjeta dev en tu perfil. Forzar con `QUIET_DEV=1` al lanzar PTB (variable de entorno del proceso Discord).

## Quiet Presence (Rich Presence público)

Plugin **QuietPresence** — escribe la actividad con el mismo mecanismo interno que Discord (`LOCAL_ACTIVITY_UPDATE`; no hay una API “más directa” solo por estar inyectados). Los servidores de Discord siguen validando `application_id` e imágenes.

**Modo sin portal (por defecto):** deja Application ID vacío → actividad de texto (“Playing Quiet”, detalles, botón). Sin logo en la tarjeta.

**Modo con logo (una vez por el fork):** pon `QUIET_RPC_APP_ID` en `brand.ts` tras crear la app y subir `logo.png` como clave `quiet`, **o** pega tu App ID en ajustes.

1. Activa **QuietPresence** y **Compartir mi actividad** en Discord.
2. Desactiva **CustomRPC** si los dos están a la vez.

Solo el cliente donde inyectaste Quiet (p. ej. PTB) publica esa actividad. Si también tienes stable abierto, el puerto RPC local puede pelearse — usa un solo cliente para la presencia que quieres mostrar.

## Licencia

Mantén avisos de copyright GPL en archivos que modifiques. Quiet no elimina la atribución a Vencord/Vendicated.
