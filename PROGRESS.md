# Seating Chart MVP Progress

## Current Phase

Phase 27 - Inspector sheet made non-modal for canvas interactivity (completed)

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
- Phase 23 - Layout shell refactor (navbar + non-card containers)
- Phase 24 - Incremental desktop editor redesign (selection + inspector + UI modernization)
- Phase 25 - Stabilization pass (callback wiring + seat action surface lock)
- Phase 26 - Inspector migrated to shadcn Sheet
- Phase 27 - Inspector sheet made non-modal for canvas interactivity

## Completed Work

- Refactored seating editor page handlers to stable `useCallback` wiring to remove hook dependency lint issues.
- Consolidated assignment/unassignment helper usage so keyboard and inspector guest actions share stable helpers.
- Kept behavior unchanged while reducing render churn risk:
  - save flow unchanged
  - guest CRUD/import/export unchanged
  - seat assign/unassign/swap unchanged
- Finalized seat interaction surface for this phase:
  - seat assignment remains popover-primary
  - inspector seat section is summary/read-only and links back to table
  - removed duplicate inspector seat assignment action button
- Verified selection transitions remain intact:
  - guest -> opens inspector
  - table -> opens inspector
  - seat -> opens inspector + opens seat popover
  - empty canvas -> clears selection + closes inspector
- Migrated inspector rendering from in-tree `absolute` aside to portal-based shadcn `Sheet` to prevent page/canvas overflow side effects.
- Added reusable `Sheet` primitive under `src/components/ui/sheet.tsx` (Radix Dialog based).
- Updated inspector sheet to non-modal mode (`modal={false}`) and removed overlay rendering for this panel (`showOverlay={false}`) so canvas interactions and seat popovers stay accessible while inspector is open.

- Consolidated selection into a single Zustand union:
  - guest selection
  - table selection
  - seat selection (`tableId + seatNumber`)
  - clear selection
- Refactored editor interactions to use unified selection across page, guest list, and canvas.
- Added right-side slide-in Inspector panel with contextual sections:
  - guest details/actions (save/delete/unassign)
  - table settings (label/seat count/rotate/delete)
  - seat summary (table/seat assignment context)
- Kept existing seat assignment popover as the single interactive seat action surface for this pass to avoid competing controls.
- Removed floating in-canvas table editor and moved table editing into Inspector.
- Modernized header into editor-style layout with:
  - plan name input
  - save/status/summary badges
  - nav tabs (`Plan`, `Guests`, `Tables`, `Settings`)
  - `Add Object` dropdown (rectangle enabled; round/buffet/dance floor as coming soon)
- Redesigned guest sidebar for discovery and quick selection:
  - avatar initials
  - assignment badges and table/seat metadata
  - filters: all/unseated/assigned
  - preserved add/search/import/export behavior
- Reworked canvas controls:
  - compact floating zoom/reset controls
  - legend moved to button-triggered popover (hidden by default)
- Added shadcn-style UI foundation:
  - `components.json`
  - shared `cn` utility
  - reusable UI primitives for button/input/badge/avatar/separator/scroll-area/popover/dropdown-menu
- Preserved API contracts, Prisma schema, save behavior, guest CSV behavior, and assignment flow.

- Refactored the header card into a horizontal navbar style with:
  - inline status + occupancy metadata
  - right-aligned primary actions (`Save`, `Add Table`)
- Changed page shell from stacked card blocks to workspace layout:
  - top navbar
  - split editor region
  - left guest panel (desktop) and bottom guest section (mobile)
- Removed card framing from major containers:
  - guest panel now acts as a sidebar panel with divider borders
  - canvas no longer wrapped in a rounded card container
- Preserved existing light theme, typography, and color palette while changing structural layout.
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

- `components.json`
- `src/lib/utils.ts`
- `src/components/ui/button.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/badge.tsx`
- `src/components/ui/avatar.tsx`
- `src/components/ui/separator.tsx`
- `src/components/ui/scroll-area.tsx`
- `src/components/ui/popover.tsx`
- `src/components/ui/dropdown-menu.tsx`
- `src/components/ui/sheet.tsx`
- `src/features/seating-editor/components/InspectorPanel.tsx`
- `src/components/ui/sheet.tsx`
- `src/features/seating-editor/components/InspectorPanel.tsx`
- `src/features/seating-editor/store/seating-editor-store.ts`
- `src/app/seating-plans/[planId]/page.tsx`
- `src/features/seating-editor/components/InspectorPanel.tsx`
- `src/features/seating-editor/components/SeatingToolbar.tsx`
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

- `corepack pnpm add @radix-ui/react-avatar @radix-ui/react-dropdown-menu @radix-ui/react-popover @radix-ui/react-scroll-area @radix-ui/react-separator class-variance-authority clsx tailwind-merge` (pass)
- `corepack pnpm lint` (pass)
- `corepack pnpm typecheck` (pass)
- `corepack pnpm lint` (pass)
- `corepack pnpm typecheck` (pass)
- `corepack pnpm build` (pass)
- `corepack pnpm typecheck` (pass)
- `corepack pnpm lint` (pass)
- `corepack pnpm build` (pass)
- `corepack pnpm add @radix-ui/react-dialog` (pass)
- `corepack pnpm typecheck` (pass)
- `corepack pnpm lint` (pass)
- `corepack pnpm build` (pass)
- `corepack pnpm typecheck` (pass)
- `corepack pnpm lint` (pass)
- `corepack pnpm build` (pass)

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
8. Click a guest, table, and seat and verify inspector opens with contextual content.
9. Verify seat assignment actions happen via seat popover only.
10. Click empty canvas and verify selection clears and inspector closes.
11. Verify `Add Object` creates rectangular tables and shows disabled coming-soon options.
12. With inspector open on seat selection, verify the seat popover remains visible and clickable above the canvas (no blocking overlay).

## Known Issues

- Drag guest-to-seat interaction is not implemented yet (click/picker flow is primary).
- Mobile behavior depends on browser UI chrome; `dvh` improves this but exact visible height can still vary slightly across devices.
- None from this phase-specific stabilization pass.

## Next Recommended Step

Next recommended follow-up:

- Optional UX phase: move seat assignment fully into inspector (or keep popover long-term), but maintain a single action surface.
- Improve CSV parser robustness for quoted commas/newlines.
