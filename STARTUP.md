# Shopify App Startup Guide (`price-d`)

This document explains how to run this Shopify app locally on Windows.

## 1) Prerequisites

- Node.js `20.19+` (or `22.12+`)
- npm (comes with Node.js)
- Shopify CLI installed globally
- A Shopify Partner account
- A development store for testing

Install Shopify CLI (if not installed):

```powershell
npm install -g @shopify/cli @shopify/app
```

Verify:

```powershell
shopify version
node -v
npm -v
```

## 2) Install dependencies

From project root:

```powershell
npm install
```

## 3) Login to Shopify

```powershell
shopify auth login
```

Complete browser login to your Partner account.

## 4) Start local development

```powershell
npm run dev
```

This runs `shopify app dev`, which:

- starts your app server
- creates a tunnel URL
- syncs app config
- provides install/open links

When the CLI is running:

- press `P` in terminal to open the app preview URL
- install app on your dev store if prompted

## 5) Database notes (Prisma + SQLite)

This app uses SQLite at `prisma/dev.sqlite`.

Migrations are already in the repo. If needed:

```powershell
npm run setup
```

`setup` runs:

- `prisma generate`
- `prisma migrate deploy`

## 6) Useful commands

- `npm run dev` - local Shopify development
- `npm run build` - production build
- `npm run start` - serve built app
- `npm run lint` - run ESLint
- `npm run typecheck` - TypeScript checks
- `npm run deploy` - deploy app config/code with Shopify CLI

## 7) Common issues

### `The table main.Session does not exist`

Run:

```powershell
npm run setup
```

### Prisma Windows engine error (`query_engine-windows.dll.node`)

Set this environment variable before running:

```powershell
$env:PRISMA_CLIENT_ENGINE_TYPE="binary"
npm run dev
```

### App URL/redirect mismatch after restarting

`shopify app dev` may produce a new tunnel URL. If install/auth breaks:

- stop dev server
- run `npm run dev` again
- open fresh CLI-provided install URL

## 8) First-time install flow (quick checklist)

1. `npm install`
2. `shopify auth login`
3. `npm run dev`
4. Open install link from CLI
5. Approve scopes
6. Open embedded app in your dev store

