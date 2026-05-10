# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
# Development
npm run tauri dev        # Run the full desktop app in dev mode (Vite + Rust hot reload)
npm run dev              # Frontend only (Vite on port 1420, no Tauri window)

# Build
npm run tauri build      # Build production desktop app
npm run build            # TypeScript check + Vite frontend build only

# No test suite exists yet
```

## Architecture

S3 Explorer is a Tauri 2 desktop app — a React frontend communicating with a Rust backend over Tauri's IPC bridge. The frontend calls Rust functions via `invoke()` from `@tauri-apps/api/core`.

```
src/          React/TypeScript frontend
src-tauri/    Rust backend (Tauri app + AWS SDK)
```

### Backend (`src-tauri/src/`)

All S3 logic lives in `s3.rs`. It uses `aws-sdk-s3` to interact with AWS (or compatible endpoints like MinIO/LocalStack). The module exposes Tauri commands registered in `lib.rs`:

- `save_credentials` / `get_credentials` / `load_credentials` — persist `StoredCredentials` to disk, encrypted via `tauri-plugin-stronghold` or the app data dir
- `list_buckets` — returns all accessible buckets
- `list_objects(bucket, prefix, delimiter)` — lists objects/prefixes for directory-style navigation
- `download_file(bucket, key, dest)` — streams an S3 object to a local path

`lib.rs` initializes the Tauri app, registers plugins (`dialog`, `opener`), and wires up all Tauri command handlers.

### Frontend (`src/`)

- **`App.tsx`** — top-level state: credentials check on startup, shows `SettingsDialog` if none found, then loads buckets
- **`hooks/useS3.ts`** — thin wrapper around Tauri `invoke()` calls; this is the only place the frontend talks to the backend
- **`components/BucketList.tsx`** — sidebar for selecting a bucket
- **`components/FileBrowser.tsx`** — main panel; breadcrumb path navigation, object listing, per-file download
- **`components/SettingsDialog.tsx`** — credential configuration modal (access key, secret, region, optional custom endpoint)
- **`lib/types.ts`** — shared TypeScript types (`StoredCredentials`, `BucketInfo`, `S3Item`)
- **`components/ui/`** — shadcn/ui primitives (Button, Input, Dialog, Label)

State is managed with React `useState` only — no external state library.

### Path alias

`@/` maps to `src/` (configured in `vite.config.ts` and `tsconfig.json`).

### UI stack

Tailwind CSS 3 + shadcn/ui components + Lucide icons. Add new shadcn components with `npx shadcn@latest add <component>`.
