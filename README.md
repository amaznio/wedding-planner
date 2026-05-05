# Wedding Seating Planner

SeatPlan-style wedding seating editor built with Next.js, TypeScript, Tailwind, Prisma, and PostgreSQL.

## Current Features

- Seating plan list + create flow
- Open plan editor by ID
- Rectangular tables only
- Auto-generated numbered seats from `seatCount`
- Auto-sized rectangular table width from seat count
- Select, edit label, edit seat count, rotate, delete
- Drag tables on canvas
- Save/load layouts from PostgreSQL
- Canvas zoom and pan
- Floating table editor anchored near selected table
- Guest list management (create/edit/delete/search/filter)
- Separated selected-guest edit section in sidebar for clearer workflow
- Seat assignment UX:
  - Click seat to open anchored guest picker
  - See current seat occupant in picker
  - Assign any guest from picker
  - Unassign seat from picker
  - Swap automatically when assigning into an occupied seat
  - Inline assignment feedback (assigned/swapped/already assigned)
  - Conflict error shown in picker and highlighted conflict seat state
  - Seat legend overlay (selected guest / occupied / empty)
- Assignment persistence integrated with plan saves:
  - table updates preserve assignment-linked table IDs
  - removed tables clear related assignments
  - seat-count reductions clear out-of-range assignments
  - guests/assignments refresh after save
- Assignment workflow polish:
  - Keyboard shortcuts: `[` previous guest, `]` next guest, `U` unassign selected guest
  - Occupancy summary in toolbar (`occupied/total seats` + unseated guest count)
  - Guest CSV import/export

## Canvas Controls

- Drag table: drag directly on a table
- Pan canvas: drag empty grid area
- Zoom canvas: mouse wheel
- Reset view: click `Reset View` in canvas control badge
- Keyboard:
  - `Delete` / `Backspace`: delete selected table
  - `Escape`: clear selection
  - `[` / `]`: cycle guest selection
  - `U`: unassign selected guest from their current seat

## Seat Assignment Usage

- Click a seat on any table.
- In the floating seat picker, review the current occupant.
- Click a guest name to assign that guest to the seat.
- Use `Unassign Seat` to clear occupancy.
- If the seat is occupied and the selected guest already has another seat, assignments are swapped.

## Local Setup

1. Install dependencies:

```bash
corepack pnpm install
```

2. Start PostgreSQL (Docker example):

```bash
docker run --name seating-planner-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=seating_planner \
  -p 5432:5432 \
  -d postgres:16
```

3. Configure env (`.env`):

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/seating_planner?schema=public"
```

4. Apply migrations and generate client:

```bash
corepack pnpm prisma migrate dev --name init_seating
corepack pnpm prisma generate
```

5. Run app:

```bash
corepack pnpm dev
```

Open `http://localhost:3000/seating-plans`.

## Quality Checks

```bash
corepack pnpm lint
corepack pnpm typecheck
corepack pnpm build
```
