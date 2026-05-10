# S3 Explorer

A lightweight desktop app for browsing and downloading files from AWS S3-compatible storage. Built with Tauri 2, React, and Rust.

## Features

- Browse buckets and navigate folders with breadcrumb navigation
- Download files to your local machine
- Upload files or entire folders (via toolbar buttons or drag-and-drop)
- Rename files and folders inline
- Delete files and folders with confirmation
- Conflict detection on upload — overwrite or skip existing files
- Save credentials locally between sessions
- Compatible with custom endpoints (MinIO, LocalStack, etc.)

## Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://rustup.rs/)
- Tauri system dependencies for your platform — see the [Tauri prerequisites guide](https://v2.tauri.app/start/prerequisites/)

## Development

```bash
npm install
npm run tauri dev
```

## Build

```bash
npm run tauri build
```

Produces a native installer for your platform in `src-tauri/target/release/bundle/`.
