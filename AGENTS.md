# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.

# AGENTS.md

## Project

This is a wedding seating chart MVP built with Next.js and PostgreSQL.

The goal is to create a simple SeatPlan-style editor where users can create rectangular tables, specify seat counts, auto-render seats, move tables around a canvas, and save/load layouts.

## Working Style

Work in small phases.

Do not implement multiple phases at once unless explicitly instructed.

Before making changes:

1. Inspect the relevant files.
2. Explain the intended change briefly.
3. Make the smallest useful implementation.
4. Run relevant checks.
5. Update `PROGRESS.md`.

After each phase, stop and summarize:

- What changed
- Files modified
- Commands run
- How to test
- Known issues
- Next recommended phase

## Tech Stack

Use the existing repo conventions first.

Preferred stack:

- Next.js App Router
- TypeScript
- Tailwind CSS
- PostgreSQL
- Prisma, unless the repo already uses Drizzle
- Zod for validation
- Zustand for editor state
- Custom pointer events for dragging

Avoid adding heavy canvas or diagramming libraries unless explicitly approved.

## Product Scope

MVP includes:

- Create/open seating plan
- Add rectangular table
- Edit table label
- Edit table seat count
- Auto-size rectangular table based on seat count
- Auto-render numbered seats
- Drag table around a canvas
- Rotate table in 90-degree increments
- Delete table
- Save/load layout from PostgreSQL

Out of scope for MVP:

- Guest assignment
- Round tables
- Auth
- Collaboration
- Zoom/pan
- Collision detection
- Print/export
- Mobile-first optimization
- Payment
- Email
- AI

## Data Model Rules

Do not persist individual seats in the MVP.

Seats are derived from `seatCount`.

Tables should store:

```ts
type SeatingTable = {
  id: string;
  planId?: string;
  label: string;
  type: "rectangle";
  x: number;
  y: number;
  rotation: number;
  seatCount: number;
};
```

A seating plan should store:

```ts
type SeatingPlan = {
  id: string;
  name: string;
  width: number;
  height: number;
  tables: SeatingTable[];
};
```

## Rectangular Table Rules

Rectangular tables automatically expand horizontally as seat count increases.

For odd seat counts:

- Top side gets one extra seat.
- Bottom side gets the remaining seats.

Examples:

- 6 seats = 3 top, 3 bottom
- 7 seats = 4 top, 3 bottom
- 8 seats = 4 top, 4 bottom
- 9 seats = 5 top, 4 bottom

Keep table height fixed for the MVP.

Use pure helper functions for layout logic:

```ts
getRectangleTableDimensions(seatCount);
getSeatPositions(seatCount, tableWidth, tableHeight);
```

## Persistence Rules

For the MVP, save the full layout at once.

On save:

1. Validate the payload with Zod.
2. Update the seating plan.
3. Delete existing tables for that plan.
4. Recreate tables from the submitted layout.

Do not overengineer granular table mutations yet.

## UI Rules

Editor layout:

- Top toolbar
- Sidebar for selected table settings
- Main canvas with grid background

Canvas tables:

- Use absolute positioning.
- Selected table should have a visible outline.
- Tables should be draggable.
- Seats should be numbered.
- Seat rendering should be derived from `seatCount`.

## Validation Rules

Use Zod for API payload validation.

Initial constraints:

- `seatCount`: integer, minimum 1, maximum 50
- `type`: only `"rectangle"`
- `width` / `height`: reasonable positive canvas dimensions
- `x` / `y` / `rotation`: integers

Invalid API payloads should return useful errors.

## Post-MVP Roadmap (Guest Assignment)

After MVP completion, use these additional phases to add guest management and seat assignment.

### Phase 10 - Guest Data Model

Goal:

Add guest and assignment entities to support seat mapping.

Tasks:

- Add `Guest` model scoped to `SeatingPlan`.
- Add `SeatAssignment` model linking guest to table seat (`tableId` + `seatNumber`).
- Enforce one guest per seat and one seat per guest per plan with DB constraints.
- Keep seat geometry derived from table `seatCount` (do not persist seat geometry).

### Phase 11 - Guest & Assignment API

Goal:

Expose CRUD and assignment APIs.

Tasks:

- Add guest CRUD endpoints.
- Add assign / unassign endpoints.
- Validate payloads with Zod.
- Return clear conflict errors for duplicate/invalid assignments.

### Phase 12 - Guest List UI

Goal:

Manage guests in editor UI.

Tasks:

- Add guest panel with search/filter.
- Add unseated guest list.
- Show basic guest metadata (name, notes/group/tags as needed).

### Phase 13 - Seat Assignment UX

Goal:

Assign guests to seats directly in editor.

Tasks:

- Make seats interactive targets.
- Add click-to-assign flow first.
- Add unassign and swap interactions.
- Optionally add drag-guest-to-seat after click flow is stable.

### Phase 14 - Assignment Validation & States

Goal:

Improve reliability and clarity of assignment interactions.

Tasks:

- Distinct seat states: empty, occupied, conflict.
- Guard invalid actions with actionable errors.
- Keep assignment rules consistent between UI and API.

### Phase 15 - Persistence Integration for Assignments

Goal:

Load/save assignments with plans.

Tasks:

- Hydrate guests + assignments when opening a plan.
- Save assignment operations with robust error handling.
- Preserve editor responsiveness during save/load transitions.

### Phase 16 - Assignment Polish

Goal:

Make guest assignment practical for real event planning.

Tasks:

- Add keyboard shortcuts for assignment workflow.
- Add CSV guest import/export.
- Add occupancy/unseated summary indicators.

## Code Quality

Keep components small.

Prefer simple, readable implementation over clever abstractions.

Do not introduce generic table-type architecture before it is needed.

Avoid storing derived state.

Avoid duplicated seat-positioning logic.

Keep layout math in pure utility functions.

## Commands

Use the package manager already present in the repo.

Check `package.json` before running commands.

Common commands may include:

```bash
pnpm lint
pnpm typecheck
pnpm build
pnpm prisma validate
pnpm prisma migrate dev
```

Do not assume all commands exist. Inspect the repo first.

## Progress Tracking

Maintain `PROGRESS.md`.

At the end of every phase, update:

- Current phase
- Completed work
- Files changed
- Commands run
- Known issues
- Next recommended step

## Phase Workflow

Before starting any phase:

1. Read `AGENTS.md`.
2. Read `PROGRESS.md` if it exists.
3. Inspect the repo state.
4. Confirm the current phase.
5. Implement only the requested phase.

After finishing a phase:

1. Run the relevant checks.
2. Update `PROGRESS.md`.
3. Summarize the completed work.
4. Stop.

Do not proceed to the next phase until explicitly instructed.
