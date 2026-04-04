# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Contains a Tanzania-themed sports betting platform (BetTZ).

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind CSS
- **Auth**: JWT via bcryptjs + jsonwebtoken

## BetTZ App Features

- **Languages**: English & Swahili toggle (stored in localStorage as `bettz_lang`)
- **Auth**: JWT-based, stored in localStorage as `bettz_token`
- **Sports**: NBC Premier League Tanzania + International matches
- **Currency**: TZS (Tanzanian Shillings)
- **Deposit methods**: M-Pesa, TigoPesa, HaloPesa, Airtel Money
- **Theme**: Dark forest green + gold (Tanzania flag colors)

## Admin Access

- Phone: `0700000001`
- Password: `admin123`
- Admin panel at `/admin` (visible after login)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

## Architecture

- `artifacts/api-server/` — Express 5 backend (auth, events, bets, deposits, admin routes)
- `artifacts/bettingapp/` — React + Vite frontend
- `lib/db/` — Drizzle ORM schema (users, events, bets, transactions tables)
- `lib/api-spec/` — OpenAPI contract
- `lib/api-client-react/` — Generated React Query hooks
- `lib/api-zod/` — Generated Zod validation schemas

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
