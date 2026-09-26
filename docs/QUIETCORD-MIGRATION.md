# QuietCord org migration

Org: **https://github.com/QuietCord**

## Repos

| Repo | Local path | Upstream |
|------|------------|----------|
| [QuietCord/Quiet](https://github.com/QuietCord/Quiet) | `C:\Projects\Quiet` | `Vendicated/Vencord` |
| [QuietCord/Backend](https://github.com/QuietCord/Backend) | `C:\Projects\QuietCord-Backend` | `Vencord/Backend` |

The org currently has **no public repos** until you push (see below).

The client repo is **QuietCord/Quiet** (transfer from a personal fork is done when `origin` points here).

## One-time publish (Backend only if needed)

```powershell
winget install GitHub.cli
gh auth login
cd C:\Projects\Quiet
powershell -ExecutionPolicy Bypass -File scripts\publishQuietCord.ps1
```

Or manually:

1. Create **QuietCord/Backend** on GitHub (empty), then:
   ```powershell
   cd C:\Projects\QuietCord-Backend
   git push -u origin main
   ```
2. **QuietCord/Quiet** — client; `git remote set-url origin https://github.com/QuietCord/Quiet.git`
3. ~~Transfer hyusband/Quiet~~ (done if you moved the repo in GitHub Settings)

## After Backend is live

1. Copy `.env.example` → `.env` in `QuietCord-Backend`, fill Discord OAuth + peppers.
2. `docker compose up -d` (see upstream README).
3. Set `CLOUD_API_URL` in `src/shared/brand.ts` to your HTTPS API base.
4. Rebuild client: `bun x pnpm@11.9.0 build` → `sync:ptb`.

## Brand constants

All client links use `src/shared/brand.ts` (`FORK_REPO`, `BACKEND_REPO`, `GITHUB_ORG`).
