# Seating Chart MVP Progress

## Current Phase

Phase 4 - Dragging tables on canvas (completed)

## Completed Phases

- Phase 0 - Project setup audit
- Phase 1 - App setup and dependencies
- Phase 2 - Static seating editor UI
- Phase 3 - Local editor state with Zustand
- Phase 4 - Dragging tables on canvas

## Completed Work

- Re-read `AGENTS.md` and `PROGRESS.md` before starting.
- Implemented custom pointer-event dragging for tables (no external drag library).
- Added table move action to Zustand store:
  - `moveTable(tableId, nextX, nextY)` updates `x`/`y` and marks dirty.
- Wired move action from page -> canvas -> table components.
- Implemented pointer capture drag behavior in `RectTable`:
  - `onPointerDown`: select table, capture pointer, set drag offset.
  - `onPointerMove`: update table position in Zustand during drag.
  - `onPointerUp`/`onPointerCancel`: release/reset drag state.
- Preserved selection behavior while dragging:
  - Table pointer/click handlers stop propagation so canvas background click does not clear selection.

## Files Changed

- `src/app/seating-plans/page.tsx`
- `src/features/seating-editor/components/RectTable.tsx`
- `src/features/seating-editor/components/SeatingCanvas.tsx`
- `src/features/seating-editor/store/seating-editor-store.ts`
- `PROGRESS.md`

## Commands Run

- `Get-Content AGENTS.md`
- `Get-Content PROGRESS.md`
- `Get-Content src/features/seating-editor/store/seating-editor-store.ts`
- `Get-Content src/features/seating-editor/components/RectTable.tsx`
- `Get-Content src/features/seating-editor/components/SeatingCanvas.tsx`
- `corepack pnpm lint` (pass)
- `corepack pnpm typecheck` (pass)
- `corepack pnpm build` (fails in sandbox due font fetch + sandbox file access issue under `.pnpm` for `zustand`)

## Check Results

- Lint: pass.
- TypeScript: pass.
- Build: fail in this sandbox because:
  - `next/font/google` cannot fetch Geist fonts from `fonts.googleapis.com`.
  - Turbopack reports `Access is denied (os error 5)` reading `zustand` package files under `node_modules/.pnpm` in this environment.

## How To Test

1. Run `corepack pnpm dev`.
2. Open `http://localhost:3000/seating-plans`.
3. Click and drag a table around the canvas.
4. Verify:
   - table follows pointer while dragging,
   - `x`/`y` persist in local state until refresh,
   - selection still works,
   - canvas click still clears selection when not clicking a table.

## Known Issues

- Build remains blocked in this sandbox by Google Fonts fetch restrictions.
- Build in this sandbox also reports `Access is denied` when Turbopack reads `zustand` files from `.pnpm`; lint/typecheck do not reproduce it.
- Persistence is still out of scope until Phase 5/6.

## Next Recommended Step

Phase 5 - Database schema and API:

- Add Prisma models and migration for `SeatingPlan`/`SeatingTable`.
- Add API routes for CRUD.
- Add Zod payload validation.
- Implement full-layout `PUT` save strategy.
