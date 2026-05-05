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

## Canvas Controls

- Drag table: drag directly on a table
- Pan canvas: drag empty grid area
- Zoom canvas: mouse wheel
- Reset view: click `Reset View` in canvas control badge
- Keyboard:
  - `Delete` / `Backspace`: delete selected table
  - `Escape`: clear selection

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
