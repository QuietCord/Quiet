# Quiet — fork de Vencord

Quiet es un fork personal basado en [Vencord](https://github.com/Vendicated/Vencord) (GPL-3.0). El código interno sigue usando el global `Vencord`, rutas `vencord://`, claves `Vencord_*` en almacenamiento, etc., para poder **fusionar upstream** con pocos conflictos.

## Branding

Edita un solo archivo para la identidad y servicios:

- `src/shared/brand.ts` — nombre visible (`CLIENT_NAME`), URL de tu API (`CLOUD_API_URL`), badges, docs.

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

## Badges de donante

Si `BADGES_JSON_URL` está vacío, no se cargan badges externos de Vencord. Sirve el mismo JSON que `badges.vencord.dev/badges.json` en tu servidor y pon la URL en `brand.ts`.

## Build e inject

Igual que Vencord: `pnpm install`, `pnpm build`, `pnpm inject`. El instalador oficial de Vencord apunta a otro repo; para Quiet usa build local o publica releases en `hyusband/Quiet`.

## Licencia

Mantén avisos de copyright GPL en archivos que modifiques. Quiet no elimina la atribución a Vencord/Vendicated.
