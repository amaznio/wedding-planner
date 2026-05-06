# Seating Chart MVP Progress

## Current Phase

Phase 22 - Mobile zoom-out range adjustment (completed)

## Completed Phases

- Phase 0 - Project setup audit
- Phase 1 - App setup and dependencies
- Phase 2 - Static seating editor UI
- Phase 3 - Local editor state with Zustand
- Phase 4 - Dragging tables on canvas
- Phase 5 - Database schema and API
- Phase 6 - Connect editor to persistence
- Phase 7 - Basic MVP polish
- Phase 8 - Canvas zoom and pan
- Phase 9 - Grid snapping for table alignment
- Phase 10 - Guest data model
- Phase 11 - Guest & assignment API
- Phase 12 - Guest list UI
- Phase 13 - Seat assignment UX
- Phase 14 - Assignment validation & states
- Phase 15 - Persistence integration for assignments
- Phase 16 - Assignment polish
- Phase 17 - Mobile canvas expansion hotfix
- Phase 18 - Mobile canvas flex-fill hotfix
- Phase 19 - Mobile canvas priority layout hotfix
- Phase 20 - Mobile canvas height-reference hotfix
- Phase 21 - Table editor click propagation fix
- Phase 22 - Mobile zoom-out range adjustment

## Completed Work

- Increased mobile zoom-out range in canvas interactions by lowering mobile minimum zoom scale from `0.5` to `0.25`.
- Kept desktop minimum zoom unchanged at `0.5` to preserve existing behavior.
- Fixed floating table editor closing when clicking inside inputs/buttons.
- Stopped `click` event propagation on the floating editor container so canvas deselection handler is not triggered during edits.
- Fixed collapsed mobile canvas by giving the canvas wrapper an explicit mobile height (`h-[56dvh]`) instead of only `min-height`.
- Kept desktop behavior unchanged by restoring flexible sizing at `lg` breakpoint (`lg:h-auto lg:flex-1`).
- Prioritized canvas rendering area on mobile by ordering canvas before guest panel in the stack.
- Added explicit mobile canvas minimum height (`56dvh`) so the canvas always remains usable.
- Constrained guest panel height on mobile with internal scrolling to prevent it from collapsing canvas space.
- Replaced fixed mobile canvas minimum-height wrapper with flex-fill behavior (`flex-1 min-h-0`) in the plan editor layout.
- Updated `SeatingCanvas` root container to a true flex child (`flex-1 min-h-0`) so it expands to all available space.
- Added `min-h-0` to the viewport container and reduced mobile canvas padding for better edge utilization.
- Adjusted seating editor page layout to better fill viewport on mobile breakpoints.
- Switched main editor container to dynamic viewport sizing (`dvh`) and responsive page padding.
- Increased mobile canvas wrapper minimum height with `dvh` so canvas expands predictably on small screens.
- Added assignment workflow keyboard shortcuts:
  - `[` selects previous guest
  - `]` selects next guest
  - `U` unassigns currently selected guest
- Added occupancy summary indicators in toolbar:
  - occupied seats / total seats
  - unseated guest count
- Added guest CSV tools in sidebar:
  - import guests from CSV (`name,group,notes`)
  - export current guest list to CSV
- Updated plan save API to sync tables by ID instead of deleting all tables.
- Preserved assignment continuity for unchanged tables during plan saves.
- Removed assignments automatically when:
  - a table is deleted from the plan
  - seat count is reduced below existing assigned seat numbers
- Returned updated plan payload from save and rehydrated client plan state after save.
- Refreshed guests/assignments after save to keep UI and DB state aligned.
- Updated local table ID generation to stable unique IDs for safer persistence/upsert behavior.
- Updated docs for recent UX additions:
  - seat legend overlay
  - separated selected-guest edit section
  - anchored seat picker behavior
- Replaced direct seat-click assignment with anchored seat picker popover.
- Seat picker now shows:
  - seat number
  - current assigned guest (or unassigned)
  - guest list for assignment
  - unassign action
- Updated seat click flow:
  - click seat -> open picker
  - choose guest -> assign (and swap if seat is occupied)
  - unassign seat from picker
- Preserved existing floating table editor anchored to selected table.
- Kept guest panel on the left and preserved full-height canvas layout.
- Anchored floating table editor to selected table position inside the canvas viewport.
- Added interactive seat targets on tables.
- Added click-to-assign flow:
  - select guest, then click an empty seat to assign.
- Added unassign flow:
  - click selected guest's current seat to unassign.
  - with no selected guest, click an occupied seat to unassign occupant.
- Added swap flow:
  - select guest, then click a seat occupied by another guest to swap positions.
- Added visual seat occupancy states:
  - empty seats
  - occupied seats
  - selected guest's seat highlighted.
- Added conflict seat state styling (red highlight) on assignment failures.
- Added inline seat-picker error feedback for assignment/unassignment failures.
- Added inline success/info feedback badges for assignment outcomes:
  - assigned
  - swapped
  - already assigned
  - already unassigned
- Wired assignment UX to existing API endpoints:
  - `POST /api/seating-plans/:planId/assignments`
  - `DELETE /api/seating-plans/:planId/assignments/:assignmentId`

## Files Changed

- `src/features/seating-editor/components/GuestPanel.tsx`
- `src/features/seating-editor/components/SeatingCanvas.tsx`
- `src/app/seating-plans/[planId]/page.tsx`
- `src/features/seating-editor/components/SeatingToolbar.tsx`
- `src/features/seating-editor/components/GuestPanel.tsx`
- `src/app/seating-plans/[planId]/page.tsx`
- `README.md`
- `PROGRESS.md`
- `src/app/api/seating-plans/[planId]/route.ts`
- `src/features/seating-editor/store/seating-editor-store.ts`
- `src/features/seating-editor/components/Seat.tsx`
- `src/features/seating-editor/components/RectTable.tsx`
- `src/features/seating-editor/components/SeatingCanvas.tsx`

## Commands Run

- `corepack pnpm lint` (pass)
- `corepack pnpm typecheck` (pass)
- `corepack pnpm lint` (pass)
- `corepack pnpm typecheck` (pass)

## Check Results

- Lint: pass.
- TypeScript: pass.
- Build: pass.

## How To Test

1. Run `corepack pnpm dev`.
2. Open a plan editor (`/seating-plans/{id}`).
3. Add at least two guests and assign them to seats.
4. Use keyboard:
  - `]` to select next guest
  - `[` to select previous guest
  - `U` to unassign selected guest
5. Verify toolbar shows occupancy (`occupied/total`) and unseated guest count.
6. Export guests to CSV and import the CSV back.
7. Save and refresh; verify assignments still persist.

## Known Issues

- Drag guest-to-seat interaction is not implemented yet (click/picker flow is primary).
- Mobile behavior depends on browser UI chrome; `dvh` improves this but exact visible height can still vary slightly across devices.

## Next Recommended Step

Post-MVP optional enhancements:

- Drag guest-to-seat assignment flow.
- Better CSV validation (quoted commas/newlines).
- Bulk assignment management and advanced filters.
