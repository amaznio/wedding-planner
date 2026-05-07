# Seating Chart MVP Progress

## Current Phase

Phase 91 - Canvas utility group-color mode + legend swatches (completed)

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
- Phase 28 - Reusable seat layout modes for rectangular tables
- Phase 29 - Save feedback visibility
- Phase 30 - Drag-commit autosave gating
- Phase 31 - Mobile fullscreen planner shell
- Phase 32 - Desktop guest-to-seat drag-and-drop
- Phase 33 - Desktop drag preview polish
- Phase 34 - Desktop seat-to-seat drag-and-drop
- Phase 35 - Optional guest seating relationships
- Phase 36 - Linked guest move-together
- Phase 37 - Guest editing moved from Inspector to guest panel/drawer
- Phase 38 - Linked guest drag landing indicators
- Phase 39 - Optimistic guest seat assignment updates
- Phase 40 - Polish localization foundation + UI coverage audit
- Phase 41 - Seat interaction surface cleanup (mobile drawer + desktop inspector)
- Phase 42 - Relationship label localization in seat/guest UI
- Phase 43 - Seat popover seated-status badge
- Phase 44 - Seat popover badge alignment polish
- Phase 45 - Seat popover metadata column layout
- Phase 46 - Seat popover hierarchy and rhythm polish
- Phase 47 - Seat popover row density tightening
- Phase 48 - Seat popover single-row two-column structure
- Phase 49 - Seat popover guest filtering + unseated-default priority
- Phase 50 - Seat popover click propagation fix
- Phase 51 - Compact seat surface + mobile drawer variant
- Phase 52 - Top-row current assignment indicator
- Phase 53 - Current assignment label emphasis tweak
- Phase 54 - Selected-assigned-row visual refinement
- Phase 55 - Seat surface typography hierarchy tuning
- Phase 56 - Boldness balance refinement for seat list
- Phase 57 - Desktop guest click no longer opens right inspector
- Phase 58 - Rotate button icon in inspector
- Phase 59 - Compact guest row link action and status placement
- Phase 60 - Link mode and guest details made mutually exclusive
- Phase 61 - Guest click exits link mode and opens guest details
- Phase 62 - Single relationship per guest + pair-link UX enforcement
- Phase 63 - Larger link options checkboxes + explanatory tooltips
- Phase 64 - Standardize tooltips to shadcn/Radix Tooltip
- Phase 65 - Switch relationship option checkboxes to shadcn Checkbox
- Phase 66 - Checkbox tooltip delay + label-only trigger
- Phase 67 - Canvas drag performance optimization
- Phase 68 - Import trigger hotfix
- Phase 69 - Plus-one domain foundation
- Phase 70 - Bulk CSV import + duplicate review + auto-link
- Phase 71 - Guest-level plus-one controls
- Phase 72 - Bulk import transaction timeout fix
- Phase 73 - Import loading-state UX polish
- Phase 74 - Import review checkboxes switched to shadcn
- Phase 75 - Overflow + seat popover interaction fixes
- Phase 76 - Guest details relocation to inspector/dedicated mobile drawer
- Phase 77 - Link action UX cleanup
- Phase 78 - Inspector visual hierarchy and action-priority redesign
- Phase 79 - Inspector divider layout + singular relationship wording
- Phase 80 - Contextual linking CTA visibility in inspector
- Phase 81 - Unassign placement + plus-one eligibility guard
- Phase 82 - Delete action moved to isolated danger zone
- Phase 83 - Confirmation modal for destructive actions
- Phase 84 - Safer delete placement + mobile back navigation
- Phase 85 - Inspector header action-row cleanup
- Phase 86 - Mobile back button style refinement
- Phase 87 - Mobile back clears guest selection
- Phase 88 - Mobile move-tables toggle compact icon state
- Phase 89 - Plan-scoped guest groups data model + API foundation
- Phase 90 - Group management + guest tagging UX
- Phase 91 - Canvas utility group-color mode + legend swatches


## Completed Work

- Implemented Phase 91 canvas utility group-color mode + legend swatches:
  - added `showGroupColors` utility toggle in desktop canvas controls and wired mobile utilities toggle in `More` sheet
  - seat bubbles now color by assigned guest group when mode is enabled
  - preserved seat state priority order:
    - conflict
    - drop target
    - linked preview
    - selected seat
    - selected guest seat
    - group color
    - default occupied
  - extended desktop/mobile legend content with:
    - group-colors mode status (`On`/`Off`)
    - active group swatches currently represented on seated guests

- Implemented Phase 90 group management + guest tagging UX:
  - added compact Groups manager in `GuestPanel`:
    - create group (auto palette color)
    - inline recolor
    - rename (prompt flow)
    - delete with confirmation prompt
  - group delete behavior now keeps guests and clears their group assignment
  - replaced guest group free-text editing in inspector with:
    - existing-group selector
    - clear/no-group option
    - inline quick-create group and auto-select for the guest
  - guest search and CSV export now use resolved group names from related group records

- Implemented Phase 89 guest group data model + migration + API foundation:
  - added Prisma `SeatingGuestGroup` model (plan-scoped `name`, `nameNormalized`, `color`)
  - replaced `Guest.group` string with relational `Guest.groupId` (`onDelete: SetNull`)
  - added DB uniqueness on `(planId, nameNormalized)` for case-insensitive duplicate prevention
  - created migration `20260507134721_add_guest_groups` with backfill:
    - normalized legacy `Guest.group` values per plan
    - deterministic palette assignment by first-seen order
    - guest `groupId` mapping to created group rows
    - legacy `Guest.group` column removal
  - added groups API endpoints:
    - `GET /api/seating-plans/:planId/groups`
    - `POST /api/seating-plans/:planId/groups`
    - `PATCH /api/seating-plans/:planId/groups/:groupId`
    - `DELETE /api/seating-plans/:planId/groups/:groupId`
  - updated guest API contracts to `groupId` + resolved `group` object and enforced plan ownership checks for guest-group assignment
  - duplicate group names now return `409` conflict

- Implemented Phase 88 mobile move-tables toggle compact icon state:
  - updated the mobile canvas drag toggle from full sentence text to compact icon + short state label (`Wł.` / `Wył.`)
  - preserved existing color indicators:
    - enabled: emerald filled button
    - disabled: neutral outline/white button
  - added explicit `aria-label` and `title` with full localized text (`Przesuwanie stołów: ...`) for accessibility
  - desktop canvas controls remain unchanged

- Implemented Phase 87 mobile back selection reset:
  - updated mobile inspector back action callback to clear guest selection (`handleSelectGuest(null)`)
  - returning from guest details to guest list now also unselects the previously active guest row
  - behavior is limited to mobile back flow; no desktop selection behavior changes

- Implemented Phase 86 mobile back-button style refinement:
  - changed mobile inspector `Back to guests` action from text-like `ghost` style to `outline` button
  - added left-chevron icon for clearer navigation affordance
  - preserved current behavior and positioning (left action + right overflow menu)

- Implemented Phase 85 inspector header action-row cleanup:
  - kept the mobile inspector top row as actions-only
  - removed any title/close affordance from that row, leaving back-navigation and contextual actions
  - pinned the overflow (`...`) trigger to the far right via layout update (`ml-auto`)
  - no behavior changes to delete confirmation or back-navigation flow

- Implemented Phase 84 navigation and delete-visibility refinement:
  - removed prominent guest delete button from the inspector body
  - moved guest delete into a subtle header overflow menu (`More actions`) on both desktop and mobile inspector views
  - retained delete confirmation modal behavior from Phase 83
  - added mobile inspector back action (`Back to guests`) to return from guest-details drawer to guest-list drawer
  - wired mobile back flow in plan page state: closes inspector drawer and reopens guest list drawer

- Implemented Phase 83 confirmation flow for destructive actions:
  - added reusable modal component: `src/components/ui/confirm-dialog.tsx` (question + confirm + cancel)
  - wired confirmations in inspector for:
    - unassign guest seat
    - remove plus one
    - delete relationship
    - delete guest
    - delete table
  - wired confirmation in seat popover for `Unassign Seat`
  - added localized confirmation copy for EN/PL (`common.confirm`, inspector confirmation prompts, canvas seat-unassign prompt)
  - all destructive actions now require explicit confirm/cancel before execution

- Implemented Phase 82 destructive-action spacing improvement:
  - moved guest `Delete` action out of the main action group into a dedicated bottom `Danger zone` section
  - added clear visual separation via divider and red section label to reduce accidental proximity with `Save Guest`
  - no behavior changes to delete flow; placement and hierarchy only

- Implemented Phase 81 inspector action-logic refinements:
  - moved `Unassign` action next to current seat badge in the guest header for better contextual relevance
  - removed duplicate `Unassign` control from generic actions block
  - disallowed `Add Plus One` when the guest already has a non-`plus_one` relationship
  - preserved existing `Remove Plus One` behavior for linked placeholder plus-ones

- Implemented Phase 80 linking CTA context rule:
  - `Start linking` section now appears only when the selected guest has no relationship
  - when a relationship already exists, the linking CTA is hidden to avoid conflicting/duplicative intent in the same view
  - relationship controls remain available in the relationship section

- Implemented Phase 79 inspector structure refinements based on UX feedback:
  - removed section-level card wrappers in guest inspector mode and replaced section transitions with clean dividers
  - moved link CTA into a dedicated `Linking` section, separate from generic guest actions
  - updated relationship wording to singular for single-relationship UX:
    - EN: `Selected guest relationship`, `No relationship.`
    - PL: `Relacja wybranego gościa`
  - kept relationship row controls and behavior unchanged

- Implemented Phase 78 inspector UI hierarchy and scanability redesign:
  - rebuilt guest inspector into clearly separated cards:
    - guest identity header
    - guest form fields
    - actions block
    - relationships block
  - strengthened action priority and recognition:
    - `Save Guest` promoted to full-width primary action
    - secondary actions (`Start linking`, plus-one, unassign) standardized as full-width outline controls
    - destructive delete isolated at bottom as full-width destructive action
  - improved relationship readability and control clarity:
    - each relationship now renders as a compact card with stronger title hierarchy and metadata grouping
    - relationship type shown as a badge for faster scanning
    - `moveTogether` and `strict` controls now use stateful button styling (`default` when on, `outline` when off)
    - delete relationship action anchored to the right as destructive
  - widened desktop inspector sheet from `340px` to `380px` for better readability of long Polish labels
  - no behavioral/API changes; styling and layout only

- Implemented Phase 75 UX stabilization fixes for large guest volumes:
  - fixed left panel row width pressure by switching the guest row main action to `flex-1 min-w-0` in a `min-w-0` row container
  - isolated seat popover scrolling from canvas wheel zoom/pan by stopping wheel propagation on popover/list containers
  - added `overscroll-contain` to seat popover list to reduce scroll chaining
  - added local seat popover guest search input (name-only, case-insensitive) combined with assigned/unseated/all filters

- Implemented Phase 76 guest-details relocation:
  - removed inline guest details and selected-guest relationship sections from left `GuestPanel` so guest list remains tall and usable
  - expanded right `InspectorPanel` guest mode into the primary editing surface for:
    - guest fields (`name/group/notes`)
    - guest save/delete/unassign
    - plus-one add/remove
    - selected guest relationship management (rename/toggles/delete)
  - desktop now reuses right inspector shell for guest selection (`guest` + `table` modes)
  - mobile guest details now open in a dedicated inspector drawer flow from the guest list; guest mode uses a full-height drawer variant

- Implemented Phase 77 link-action cleanup:
  - removed persistent per-row `Link/Połącz` button from guest rows
  - added `Start linking` action in guest details inspector
  - link source guest is now set from details action, then guest list is used to pick the second guest
  - kept existing relationship create form/controls and single-relationship replacement behavior

- Switched duplicate-row checkboxes in CSV import review to shadcn `Checkbox`:
  - replaced native `<input type="checkbox">` controls with `Checkbox` in the import preview list
  - preserved existing include/exclude behavior and disabled state during import submit

- Improved CSV import loading-state feedback in Guest panel:
  - import submit button now shows spinner + localized `Importing...` label while request is in-flight
  - duplicate include checkboxes are disabled during active import to prevent mid-request state churn
  - added localized progress hint under actions: `Processing {{count}} rows. Please wait.`
  - preserved existing summary and error surfaces

- Fixed bulk guest import failures on larger CSV files (`~200+ rows`) caused by Prisma interactive transaction expiry (`5000ms` default):
  - increased import transaction limits in `POST /api/seating-plans/:planId/guests/import`:
    - `timeout: 30000`
    - `maxWait: 10000`
  - shortened time spent inside the interactive transaction by returning created IDs + summary from the transaction and moving response hydration (`findMany` for guests/relationships) outside transaction scope
  - preserved import semantics and structured summary payload

- Implemented Phase 68 import trigger hotfix:
  - replaced nested `label > Button > input` CSV import trigger with a reliable hidden file input + `ref` + explicit button click flow
  - resolved intermittent file-picker opening failures in Guest panel (desktop and sheet variants)

- Implemented Phase 69 plus-one domain foundation:
  - added explicit plus-one guest metadata to Prisma `Guest` model:
    - `isPlaceholderPlusOne` (default `false`)
    - `plusOneHostGuestId` self-reference (`onDelete: SetNull`)
  - added Prisma migration `20260507131500_add_plus_one_guest_metadata`
  - extended relationship type union/schema/API to include `plus_one`
  - localized plus-one labels and actions in EN/PL dictionaries

- Implemented Phase 70 bulk CSV import with duplicate review and plus-one auto-linking:
  - added shared marker constants and CSV parser helpers:
    - hardcoded marker support for `Osoba Tow.`
    - ordered line parsing, duplicate detection, marker detection
  - added Guest panel import review UI:
    - duplicate rows are unchecked by default
    - user can selectively include duplicate rows before import
  - added bulk import API endpoint:
    - `POST /api/seating-plans/:planId/guests/import`
    - processes rows in order, skips invalid marker placement with warnings
    - auto-creates placeholder plus-one guest + `plus_one` relationship when marker follows a newly created host row
    - skips plus-one creation if host already has a relationship, returns warnings/summary
  - returns structured summary:
    - `created`, `createdPlusOnes`, `skippedDuplicates`, `skippedInvalidMarkers`, `skippedRelationshipConflicts`, `warnings`

- Implemented Phase 71 guest-level plus-one controls:
  - added contextual Guest details action:
    - `Add Plus One` for eligible guests without a plus-one link
    - `Remove Plus One` when a linked placeholder plus one exists
  - added dedicated endpoints:
    - `POST /api/seating-plans/:planId/guests/:guestId/plus-one`
    - `DELETE /api/seating-plans/:planId/guests/:guestId/plus-one`
  - remove flow now deletes only system placeholder plus-one guests and never deletes non-placeholder guests
  - wired new routes into editor state updates (`guests` + `relationships`)

- Optimized canvas drag/pan render performance for large table/seat counts:
  - memoized `RectTable` with a focused prop comparator so pan/zoom view updates do not re-render every table subtree
  - memoized `Seat` with a focused prop comparator so unchanged seats are skipped during parent re-renders
  - stabilized `screenToCanvas` using `viewRef` + `useCallback` so table drag math stays correct with memoized tables
  - routed pointer/wheel view updates through a single `applyView` path to keep `viewRef` and state synchronized

- Refined relationship option tooltip behavior:
  - tooltip now opens only when hovering the text label, not the checkbox control
  - added delayed tooltip appearance (`delayDuration={450}`) for both option tooltips
  - preserved shadcn checkbox usage and existing tooltip content

- Switched relationship option controls from native checkbox inputs to shadcn checkbox:
  - added reusable `Checkbox` primitive at `src/components/ui/checkbox.tsx`
  - replaced `Domyślnie przenoś razem` and `Ścisłe` inputs in `GuestPanel` with shadcn `Checkbox`
  - kept existing tooltip behavior and larger visual sizing

- Standardized tooltip implementation to shadcn/Radix tooltip primitives:
  - added reusable tooltip UI primitive: `src/components/ui/tooltip.tsx`
  - added global `TooltipProvider` in app providers
  - replaced all native `title` tooltips in `src/` with shadcn tooltips

- Converted current tooltip surfaces:
  - seat hover text in `Seat` component now uses `Tooltip`
  - desktop save button hover text in `SeatingToolbar` now uses `Tooltip`
  - relationship option explanations in `GuestPanel` now use `Tooltip` instead of native title

- Added dependency:
  - `@radix-ui/react-tooltip`

- Improved link-options clarity in relationship form:
  - confirmed link options were native checkboxes (not shadcn checkbox component)
  - increased checkbox visual size/tap area (`h-5 w-5`) for both options
  - added localized tooltips (`title`) for:
    - `Domyślnie przenoś razem` / `Move together default`
    - `Ścisłe` / `Strict`

- Enforced single relationship per guest across UI, API, and DB:
  - relationship payload now requires exactly 2 guests (pair-link flow)
  - relationship create endpoint now replaces any existing relationships for selected guests before creating a new one
  - relationship member-replace endpoint now rejects cross-relationship guest conflicts
  - Prisma schema now enforces unique `guestId` in `SeatingRelationshipMember`
  - added migration: `20260507123000_enforce_single_relationship_per_guest`

- Updated link mode UX to match pair-link semantics:
  - max 2 selected guests in link mode (sliding pair selection)
  - link button toggles to `Cancel` state when guest is selected for linking
  - link panel now explains:
    - when only one guest is selected: pick second guest
    - when two are selected: creating will replace existing relationships
  - link panel now shows each selected guest with their current relationship label (or none)

- Added reverse transition from link mode to guest-details mode:
  - when one or more guests are selected for linking, clicking any guest row now clears link selections
  - the click then applies normal guest selection, which reopens guest-specific details panels

- Enforced mutually exclusive lower panels in guest sidebar:
  - entering link mode now clears selected guest (`onSelectGuest(null)`)
  - while link mode is active, guest-specific sections are hidden:
    - `Relacje wybranego gościa`
    - `Szczegóły gościa`
  - clearing link mode restores normal guest-detail visibility on next guest selection

- Compacted guest list row action/status layout:
  - removed separate right-side `Assigned/Unseated` badge from each guest row
  - moved assignment status into the metadata line (`Table • Seat • Assigned`)
  - kept unseated guests on the single `Unseated` metadata line
  - updated `Link` action button to icon + label using `Link2`

- Added an icon to the inspector rotate action button:
  - `RotateCw` icon now appears to the left of `Obróć o 90°`/`Rotate 90°`
  - icon and label spacing aligned via `gap-2`

- Removed desktop guest-selection coupling to the right inspector:
  - desktop inspector now opens only for table selection
  - clicking a guest in the left guest panel keeps focus in the left panel and does not open the right sheet

- Refined bold usage to improve hierarchy clarity:
  - top `Current` line reduced from semibold to medium weight
  - non-selected candidate names reduced to medium
  - selected/current candidate name remains semibold
  - metadata unchanged (still secondary/tertiary)

- Tuned seat surface typography hierarchy to prioritize current occupant:
  - top `Current` line promoted to dominant size/weight (`text-lg` mobile, `text-base` desktop)
  - candidate guest names kept secondary (`text-base` mobile, slightly smaller desktop)
  - relationship and assignment metadata demoted with smaller/muted text
  - spacing above filter row slightly increased for clearer hierarchy separation

- Refined selected assigned-guest row styling in seat surface:
  - removed inset selection ring
  - added subtle left accent border for selected/current row
  - applied lighter selected background tint
  - kept hover state distinct but less visually heavy

- Increased visual emphasis for top-row current assignment label:
  - changed to semibold weight and slightly darker text color for faster scanning
  - no behavior changes

- Added current seat assignment summary back in compact form:
  - top row now shows `Current: {guestName}` or unassigned state on the left
  - close `X` remains on the same row at right
  - applies to both desktop popover and mobile drawer (shared content block)

- Implemented compact seat assignment surface with viewport-specific rendering:
  - desktop/tablet keeps anchored seat popover
  - mobile now uses bottom drawer to prevent overflow/cropping
  - both variants share one content block and the same assignment/filter logic

- Simplified and compacted seat surface chrome:
  - removed top seat title and current-occupant context lines
  - replaced text close control with icon-only `X` button
  - tightened chip/row/button typography and paddings for denser scanning

- Improved filter default behavior:
  - still defaults to `Unseated`
  - now auto-falls back to `All` on open when there are no unseated guests

- Fixed seat popover premature close on internal clicks:
  - popover container now stops `click` propagation in addition to `pointerdown`
  - clicking inside popover content no longer triggers canvas click handler that closes popover
  - seat assignment and controls behavior unchanged

- Added basic guest filtering inside seat popover list:
  - filter chips: `Unseated`, `Assigned`, `All`
  - localized labels reused from existing guest panel i18n keys
  - empty state message shown when no guests match active filter

- Prioritized unassigned guests by default:
  - opening a seat popover now defaults to `Unseated` filter
  - `All` filter sorts unseated guests first, then assigned guests
  - both groups are then sorted by guest name

- Refactored seat popover guest row into a single flex row container with two columns:
  - left column: guest name + relationship hint stacked with minimal internal gap
  - right column: status badge + assignment text stacked with minimal internal gap
  - `justify-between` now controls column spacing in one parent container
  - removed separate relationship block container that previously increased row height

- Tightened seat popover row density to remove excess vertical whitespace:
  - reduced row vertical padding (`py-3` -> `py-2`)
  - reduced gap before relationship hint (`mt-1.5` -> `mt-0.5`)
  - tightened relationship line typography (`text-[11px]`, `leading-tight`)
  - preserved layout structure and assignment behavior

- Implemented seat popover hierarchy-focused visual polish (no behavior changes):
  - promoted guest name to primary emphasis (`text-base`, semibold)
  - kept right metadata as a vertical column (`status badge` above `table • seat`)
  - demoted relationship hint to tertiary muted text for reduced visual competition
  - normalized row rhythm with comfortable padding and subtle row separators
  - softened hover/current-row emphasis to stay distinct without overpowering content hierarchy

- Updated seat popover right-side metadata to a vertical column:
  - badge shown above assignment text (`Table • Seat`)
  - right side now scans top-to-bottom instead of inline left-to-right
  - keeps compact badge sizing from prior phase

- Polished seat popover guest row status layout:
  - moved assigned/unseated badge from next to guest name to the right-side metadata area
  - aligned badge directly near `Table • Seat` label for faster glance scanning
  - reduced badge size (`text-[9px]`, tighter padding) to keep row visual weight balanced

- Added clear seated-status badges to guest rows in the seat popover list:
  - `Assigned` badge for guests with an assignment
  - `Unseated` badge for guests without an assignment
  - reused existing localized labels (`guestPanel.assigned`, `guestPanel.unseated`)
  - used existing badge variants for quick visual scanning

- Localized relationship labels in assignment surfaces:
  - translated relationship type labels in seat popover hints (`couple`, `family`, `group`, `custom`)
  - translated preferred seating labels in seat popover hints (`adjacent`, `nearby`, `same-table`, `none`)
  - translated preferred seating labels in selected-guest relationship cards
  - removed remaining raw enum value rendering for those labels in UI

- Updated seat interaction surfaces:
  - mobile seat taps no longer open the bottom inspector drawer
  - desktop inspector no longer opens for seat selections
  - seat selection still works for in-canvas seat popover assignment flow

- Improved seat popover UI readability:
  - wider responsive popover container
  - stronger title/current-assignment hierarchy
  - cleaner guest row layout with better spacing and wrapping behavior
  - more prominent unassign action button

- Added app-wide client localization foundation for English and Polish:
  - new locale contract (`en`/`pl`) with `localStorage` persistence
  - new `I18nProvider` + `useI18n()` (`locale`, `setLocale`, `t`)
  - JSON dictionaries under `src/i18n/messages/en.json` and `src/i18n/messages/pl.json`
  - root app now wrapped in i18n provider

- Added language pickers with requested placement:
  - desktop: top-right toolbar language selector (shadcn `Select`)
  - mobile: language selector inside left-side navigation sheet

- Updated desktop toolbar layout:
  - save button moved to the left cluster near plan title
  - right side reserved for language picker

- Localized user-facing UI copy across requested surfaces:
  - home page
  - seating plans list page
  - seating plan editor page + toasts/loading/empty/error text
  - `SeatingToolbar`, `GuestPanel`, `SeatingCanvas`, `InspectorPanel`, `RectTable`, `Seat`
  - API/internal backend error payload strings kept unchanged

- Added shadcn/UI support and audit tooling:
  - installed shadcn `Select` component
  - added `i18n:audit` script to enforce:
    - key parity between `en.json` and `pl.json`
    - hardcoded user-facing text detection in targeted UI files (with allowlist)

- Added optimistic client-side seat assignment updates to remove drag/drop latency:
  - seat changes now render immediately for unassign, assign, swap, and linked group move flows
  - assignment API calls now run after optimistic UI update
  - on request failure, guest assignment state is rolled back to the pre-action snapshot
  - successful responses still reconcile assignment IDs from server payloads

- Added relationship-aware drag hover indicators on seats:
  - primary drop target remains highlighted for dragged guest
  - linked guest predicted landing seats now highlight simultaneously during drag
  - preview uses existing grouped move planner and relationship defaults (`moveTogetherDefault`)
  - linked indicators are preview-only and clear on drag leave/end/drop

- Refactored guest editing UX to use a single surface in guest list:
  - guest edit form/actions (`name`, `group`, `notes`, save/delete/unassign) moved into `GuestPanel`
  - works for desktop sidebar and mobile guest drawer
  - guest selection on mobile now keeps guest drawer open for inline editing

- Simplified inspector role:
  - guest section is now read-only summary only
  - table/seat inspector behavior remains unchanged
  - removed guest mutation controls from inspector to avoid split editing surfaces

- Updated editor wiring:
  - `GuestPanel` now receives selected guest + guest form state + guest mutation handlers
  - inspector call sites no longer pass guest edit handlers/form props

- Added linked guest move-together orchestration (advisory relationships now drive grouped movement when enabled by relationship defaults):
  - auto-detects move-together mode from initiator relationships with `moveTogetherDefault=true`
  - builds deterministic grouped seat plans (no multi-hop expansion) from direct initiator-linked relationships
  - enforces all-or-nothing group moves (no partial placement)
  - blocks grouped moves when destination seats are occupied by unrelated guests (no implicit outsider swap)

- Added shared group move planner utility:
  - strict preference handling for `adjacent`, `same-table`, `nearby`, and `none`
  - deterministic ordering and seat allocation
  - structured planner errors for UI feedback

- Added atomic batch-move assignment API:
  - `POST /api/seating-plans/:planId/assignments/batch-move`
  - validates payload shape, duplicate guests/seats, table seat ranges, and plan ownership
  - validates strict relationships included in context and blocks on strict violations
  - executes in one DB transaction (`deleteMany` moved guests, `createMany` new assignments), rollback on conflict

- Integrated grouped move flow into seat assignment + drag/drop:
  - grouped path used automatically when move-together defaults apply
  - existing single-guest assign/swap/unassign behavior preserved when grouped path is not active
  - grouped success feedback now reports moved guest count

- Added seat popover preview hints for grouped moves:
  - guest rows show relationship hints plus `group move: N` when move-together defaults would trigger grouped assignment

- Added optional guest seating relationships end-to-end (advisory-only behavior):
  - new relationship domain with plan-scoped records + membership join rows
  - no changes to atomic seating assignment model (`one guest per seat`)
  - no forced pairing, no double seats, no mandatory linking

- Added relationship persistence to PostgreSQL/Prisma:
  - `SeatingRelationship` model (`type`, `name`, `preferredSeating`, `moveTogetherDefault`, `strict`)
  - `SeatingRelationshipMember` join model with unique `(relationshipId, guestId)`
  - cascading cleanup on guest/relationship deletion
  - created and applied Prisma migration

- Added relationship API routes:
  - `GET/POST /api/seating-plans/:planId/relationships`
  - `PATCH/DELETE /api/seating-plans/:planId/relationships/:relationshipId`
  - `PUT /api/seating-plans/:planId/relationships/:relationshipId/members`
  - Zod validation for create/update/replace-members payloads
  - cross-plan guest validation and duplicate guest-id rejection

- Extended editor frontend with relationship state + UI:
  - load relationships alongside guests
  - relationship badges in guest list
  - create relationship flow from selected guests (`Link` multi-select + metadata controls)
  - per-selected-guest relationship actions (rename, toggle move-together, toggle strict, delete)

- Added advisory seat hints in seat assignment popover:
  - guests now display relationship labels and preferred seating hints
  - hints are informational only (no blocking or auto-placement)

- Added desktop seat-to-seat drag-and-drop:
  - occupied seats are now draggable as guest drag sources on desktop
  - dropping onto any seat reuses existing assignment logic (move/swap/replace)
  - drag hover highlighting and drop behavior now work for both guest-list drag and seat drag
  - mobile behavior remains unchanged

- Replaced browser default guest drag ghost with a custom compact drag preview (desktop):
  - initials avatar + guest name pill
  - cleaner visual while dragging guests onto seats
  - no changes to drop/assignment behavior

- Added desktop-only guest-to-seat drag-and-drop:
  - guests in desktop guest panel are now draggable
  - seats on canvas now accept drops with hover feedback
  - drop assignment reuses existing `handleSeatAssign` behavior (assign/swap/replace)
  - on successful drop, dropped guest is selected and highlighted
- Preserved mobile behavior (no guest DnD in mobile guest drawer).

- Added mobile-only fullscreen planner composition (`h-dvh`, `overflow-hidden`) with a dedicated mobile branch and preserved desktop branch.
- Removed guest panel from mobile page flow by moving guest management into a bottom sheet using `GuestPanel` `variant="sheet"` (shared CRUD/search/filter/import/export logic).
- Added mobile bottom action bar (`Plan`, `Guests`, `Tables`, `More`) to keep canvas primary.
- Added mobile tables/add-object sheet:
  - rectangular table enabled
  - round/buffet/dance-floor/custom disabled (coming soon)
- Added mobile more sheet with secondary actions (open selection details, clear selection).
- Added mobile inspector path as bottom sheet; desktop inspector remains right-side.
- Hid floating `Add Object` button on mobile and offset canvas controls above mobile bottom bar.

- Added drag-aware autosave gating so table movement no longer triggers saves mid-drag.
- Wired table drag state from canvas to editor page:
  - drag start pauses autosave timer
  - drag move updates remain local/dirty but do not trigger save requests
  - drag end resumes autosave scheduling with the existing 1s debounce
- Added guard in autosave execution path to defer auto saves while table drag is active.
- Preserved manual save behavior and existing assignment immediate-write behavior.

- Added visible save feedback for plan persistence:
  - success toast on manual save and autosave
  - destructive toast on save failure
- Added persistent header metadata for save recency:
  - `Last saved HH:MM:SS` badge shown after successful save
- Kept existing autosave flow and assignment persistence behavior unchanged.

- Added reusable per-table seat layout modes for rectangle tables:
  - `balanced`
  - `top-only`
  - `bottom-only`
- Persisted seat layout to DB:
  - added `seatLayout` column on `SeatingTable` with default `"balanced"`
  - created and applied Prisma migration
- Extended table schema/types/API payload support for `seatLayout`.
- Updated pure geometry logic to derive seat positions by layout mode while preserving seat numbering and identity.
- Updated table dimension logic so top-only/bottom-only width scales with all seats on one side.
- Added inspector control for selected table to switch seat layout modes.
- Preserved assignment model and behavior:
  - no seat IDs added
  - no assignment schema changes
  - changing seat layout repositions seats only (no unassign side effects)
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

- `prisma/schema.prisma`
- `prisma/migrations/20260507134721_add_guest_groups/migration.sql`
- `src/features/seating-editor/lib/guest-groups.ts`
- `src/features/seating-editor/schemas/guest-group.schema.ts`
- `src/features/seating-editor/schemas/guest-assignment.schema.ts`
- `src/app/api/seating-plans/[planId]/groups/route.ts`
- `src/app/api/seating-plans/[planId]/groups/[groupId]/route.ts`
- `src/app/api/seating-plans/[planId]/guests/route.ts`
- `src/app/api/seating-plans/[planId]/guests/[guestId]/route.ts`
- `src/app/api/seating-plans/[planId]/guests/import/route.ts`
- `src/app/api/seating-plans/[planId]/guests/[guestId]/plus-one/route.ts`
- `src/app/seating-plans/[planId]/page.tsx`
- `src/features/seating-editor/components/GuestPanel.tsx`
- `src/features/seating-editor/components/InspectorPanel.tsx`
- `src/features/seating-editor/components/SeatingCanvas.tsx`
- `src/features/seating-editor/components/RectTable.tsx`
- `src/features/seating-editor/components/Seat.tsx`
- `src/i18n/messages/en.json`
- `src/i18n/messages/pl.json`
- `PROGRESS.md`

- `src/features/seating-editor/components/SeatingCanvas.tsx`
- `PROGRESS.md`

- `src/app/seating-plans/[planId]/page.tsx`
- `PROGRESS.md`

- `src/features/seating-editor/components/InspectorPanel.tsx`
- `PROGRESS.md`

- `src/features/seating-editor/components/InspectorPanel.tsx`
- `PROGRESS.md`

- `src/features/seating-editor/components/InspectorPanel.tsx`
- `src/app/seating-plans/[planId]/page.tsx`
- `src/i18n/messages/en.json`
- `src/i18n/messages/pl.json`
- `PROGRESS.md`

- `src/components/ui/confirm-dialog.tsx`
- `src/features/seating-editor/components/InspectorPanel.tsx`
- `src/features/seating-editor/components/SeatingCanvas.tsx`
- `src/i18n/messages/en.json`
- `src/i18n/messages/pl.json`
- `PROGRESS.md`

- `src/features/seating-editor/components/InspectorPanel.tsx`
- `src/i18n/messages/en.json`
- `src/i18n/messages/pl.json`
- `PROGRESS.md`

- `src/features/seating-editor/components/InspectorPanel.tsx`
- `PROGRESS.md`

- `src/features/seating-editor/components/InspectorPanel.tsx`
- `PROGRESS.md`

- `src/features/seating-editor/components/InspectorPanel.tsx`
- `src/i18n/messages/en.json`
- `src/i18n/messages/pl.json`
- `PROGRESS.md`

- `src/features/seating-editor/components/InspectorPanel.tsx`
- `PROGRESS.md`

- `src/features/seating-editor/components/GuestPanel.tsx`
- `src/features/seating-editor/components/SeatingCanvas.tsx`
- `src/features/seating-editor/components/InspectorPanel.tsx`
- `src/app/seating-plans/[planId]/page.tsx`
- `src/i18n/messages/en.json`
- `src/i18n/messages/pl.json`
- `PROGRESS.md`

- `src/features/seating-editor/components/GuestPanel.tsx`
- `src/i18n/messages/en.json`
- `src/i18n/messages/pl.json`
- `PROGRESS.md`
- `src/features/seating-editor/constants/plus-one.ts`
- `src/features/seating-editor/lib/guest-import.ts`
- `src/features/seating-editor/components/GuestPanel.tsx`
- `src/features/seating-editor/components/SeatingCanvas.tsx`
- `src/features/seating-editor/schemas/guest-assignment.schema.ts`
- `src/features/seating-editor/schemas/relationship.schema.ts`
- `src/features/seating-editor/types/relationship.types.ts`
- `src/app/api/seating-plans/[planId]/guests/import/route.ts`
- `src/app/api/seating-plans/[planId]/guests/[guestId]/plus-one/route.ts`
- `src/app/seating-plans/[planId]/page.tsx`
- `prisma/schema.prisma`
- `prisma/migrations/20260507131500_add_plus_one_guest_metadata/migration.sql`
- `src/i18n/messages/en.json`
- `src/i18n/messages/pl.json`
- `PROGRESS.md`
- `src/components/ui/checkbox.tsx`
- `src/features/seating-editor/components/GuestPanel.tsx`
- `pnpm-lock.yaml`
- `src/components/ui/tooltip.tsx`
- `src/components/providers/AppProviders.tsx`
- `src/features/seating-editor/components/SeatingToolbar.tsx`
- `src/features/seating-editor/components/Seat.tsx`
- `src/features/seating-editor/components/GuestPanel.tsx`
- `pnpm-lock.yaml`
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
- `src/components/ui/select.tsx`
- `src/i18n/config.ts`
- `src/i18n/messages.ts`
- `src/i18n/provider.tsx`
- `src/i18n/messages/en.json`
- `src/i18n/messages/pl.json`
- `src/components/providers/AppProviders.tsx`
- `scripts/i18n-audit.mjs`
- `prisma/schema.prisma`
- `prisma/migrations/20260506200056_add_seat_layout/migration.sql`
- `src/features/seating-editor/types/seating-plan.types.ts`
- `src/features/seating-editor/schemas/seating-plan.schema.ts`
- `src/features/seating-editor/lib/seat-positioning.ts`
- `src/features/seating-editor/lib/table-dimensions.ts`
- `src/features/seating-editor/store/seating-editor-store.ts`
- `src/features/seating-editor/components/RectTable.tsx`
- `src/app/api/seating-plans/[planId]/route.ts`
- `src/app/seating-plans/[planId]/page.tsx`
- `src/components/ui/sheet.tsx`
- `src/features/seating-editor/components/InspectorPanel.tsx`
- `src/features/seating-editor/store/seating-editor-store.ts`
- `src/app/seating-plans/[planId]/page.tsx`
- `src/features/seating-editor/components/InspectorPanel.tsx`
- `src/features/seating-editor/components/SeatingToolbar.tsx`
- `src/features/seating-editor/components/SeatingCanvas.tsx`
- `src/features/seating-editor/components/RectTable.tsx`
- `src/features/seating-editor/components/Seat.tsx`
- `src/app/seating-plans/[planId]/page.tsx`
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
- `src/app/seating-plans/[planId]/page.tsx`
- `src/features/seating-editor/components/SeatingToolbar.tsx`
- `prisma/migrations/20260507000030_add_seating_relationships/migration.sql`
- `src/features/seating-editor/schemas/relationship.schema.ts`
- `src/features/seating-editor/types/relationship.types.ts`
- `src/app/api/seating-plans/[planId]/relationships/route.ts`
- `src/app/api/seating-plans/[planId]/relationships/[relationshipId]/route.ts`
- `src/app/api/seating-plans/[planId]/relationships/[relationshipId]/members/route.ts`
- `src/features/seating-editor/lib/group-move.ts`
- `src/app/api/seating-plans/[planId]/assignments/batch-move/route.ts`
- `src/features/seating-editor/schemas/guest-assignment.schema.ts`
- `src/features/seating-editor/components/InspectorPanel.tsx`

## Commands Run

- `corepack pnpm prisma:validate` (pass)
- `corepack pnpm prisma migrate dev --name add_guest_groups --create-only` (pass)
- `corepack pnpm prisma migrate dev` (pass; applied `20260507134721_add_guest_groups`)
- `corepack pnpm prisma generate` (pass)
- `corepack pnpm typecheck` (pass)
- `corepack pnpm lint` (pass with existing warnings)
- `corepack pnpm i18n:audit` (pass)

- `corepack pnpm typecheck` (pass; phase 88 compact mobile move-tables toggle)
- `corepack pnpm lint` (pass with existing warnings)

- `corepack pnpm typecheck` (pass; phase 87 mobile back now clears selected guest)
- `corepack pnpm lint` (pass with existing warnings)

- `corepack pnpm typecheck` (pass; phase 86 mobile back button icon/style tweak)
- `corepack pnpm lint` (pass with existing warnings)

- `corepack pnpm typecheck` (pass; phase 85 inspector header action-row cleanup)
- `corepack pnpm lint` (pass with existing warnings)
- `corepack pnpm i18n:audit` (pass)

- `corepack pnpm typecheck` (pass; phase 84 delete moved to overflow menu + mobile back-to-list action)
- `corepack pnpm lint` (pass with existing warnings)
- `corepack pnpm i18n:audit` (pass)

- `corepack pnpm typecheck` (pass; phase 83 destructive-action confirmation modal wiring)
- `corepack pnpm lint` (pass with existing warnings)
- `corepack pnpm i18n:audit` (initial fail from i18n hardcoded-text parser on TS union in `InspectorPanel`; refactored type and pass)

- `corepack pnpm typecheck` (pass; phase 82 delete action moved to isolated danger zone)
- `corepack pnpm lint` (pass with existing warnings)
- `corepack pnpm i18n:audit` (pass)

- `corepack pnpm typecheck` (pass; phase 81 unassign placement + plus-one eligibility guard)
- `corepack pnpm lint` (pass with existing warnings)
- `corepack pnpm i18n:audit` (pass)

- `corepack pnpm typecheck` (pass; phase 80 contextual linking CTA visibility)
- `corepack pnpm lint` (pass with existing warnings)
- `corepack pnpm i18n:audit` (pass)

- `corepack pnpm typecheck` (pass; phase 79 divider-based inspector sections + link section relocation)
- `corepack pnpm lint` (pass with existing warnings)
- `corepack pnpm i18n:audit` (pass)

- `corepack pnpm typecheck` (pass; phase 78 inspector visual hierarchy and action-priority redesign)
- `corepack pnpm lint` (pass with existing warnings)
- `corepack pnpm i18n:audit` (pass)

- `corepack pnpm typecheck` (pass; phase 75 seat popover + overflow changes)
- `corepack pnpm lint` (initial fail: missing `Input` import in `SeatingCanvas`; fixed, then pass with existing warnings)
- `corepack pnpm i18n:audit` (pass)
- `corepack pnpm typecheck` (pass; phases 76/77 guest-details relocation + link action refactor)
- `corepack pnpm lint` (initial fail: `react-hooks/set-state-in-effect` in `GuestPanel`; fixed, then pass with existing warnings)
- `corepack pnpm i18n:audit` (pass)

- `pnpm typecheck` (pass; shadcn checkbox swap in import review)
- `pnpm i18n:audit` (pass; shadcn checkbox swap in import review)
- `pnpm typecheck` (pass; import loading-state polish)
- `pnpm i18n:audit` (pass; import loading-state polish)
- `pnpm prisma:validate` (pass)
- `pnpm typecheck` (initial fail due stale Prisma client; pass after `prisma generate`)
- `pnpm prisma generate` (pass)
- `pnpm prisma migrate dev --name add-plus-one-guest-metadata` (pass; applied pending relationship + plus-one metadata migrations)
- `pnpm typecheck` (pass)
- `pnpm i18n:audit` (initial fail on hardcoded-text audit in new GuestPanel import row rendering; pass after localization-safe refactor)
- `pnpm i18n:audit` (pass)
- `pnpm lint` (pass with existing warnings)
- `pnpm typecheck` (pass; after bulk import transaction timeout fix)
- `corepack pnpm typecheck` (pass)
- `corepack pnpm lint` (pass with existing warnings)
- `corepack pnpm typecheck` (pass)
- `corepack pnpm add @radix-ui/react-checkbox` (pass)
- `corepack pnpm typecheck` (pass)
- `corepack pnpm lint` (pass with existing warnings)
- `corepack pnpm add @radix-ui/react-tooltip` (pass)
- `corepack pnpm typecheck` (pass)
- `corepack pnpm lint` (pass with existing warnings)
- `corepack pnpm i18n:audit` (pass)
- `corepack pnpm typecheck` (pass)
- `corepack pnpm i18n:audit` (pass)
- `corepack pnpm prisma:validate` (pass)
- `corepack pnpm typecheck` (pass)
- `corepack pnpm i18n:audit` (pass)
- `corepack pnpm lint` (pass with existing warnings)
- `corepack pnpm typecheck` (pass)
- `corepack pnpm typecheck` (pass)
- `corepack pnpm typecheck` (pass)
- `corepack pnpm typecheck` (pass)
- `corepack pnpm typecheck` (pass)
- `corepack pnpm add @radix-ui/react-avatar @radix-ui/react-dropdown-menu @radix-ui/react-popover @radix-ui/react-scroll-area @radix-ui/react-separator class-variance-authority clsx tailwind-merge` (pass)
- `corepack pnpm lint` (pass)
- `corepack pnpm typecheck` (pass)
- `corepack pnpm lint` (pass)
- `corepack pnpm typecheck` (pass)
- `corepack pnpm build` (pass)
- `corepack pnpm typecheck` (pass)
- `corepack pnpm lint` (pass with existing warnings)
- `corepack pnpm typecheck` (pass)
- `corepack pnpm lint` (pass with existing warnings)
- `corepack pnpm typecheck` (pass)
- `corepack pnpm lint` (pass with existing warnings)
- `corepack pnpm typecheck` (pass)
- `corepack pnpm lint` (pass with existing warnings)
- `corepack pnpm typecheck` (pass)
- `corepack pnpm lint` (pass with existing warnings)
- `corepack pnpm typecheck` (pass)
- `corepack pnpm lint` (pass with existing warnings)
- `corepack pnpm typecheck` (pass)
- `corepack pnpm lint` (pass with existing warnings)
- `corepack pnpm typecheck` (pass)
- `corepack pnpm lint` (pass with existing warnings)
- `corepack pnpm typecheck` (pass)
- `corepack pnpm lint` (pass with existing warnings)
- `corepack pnpm typecheck` (pass)
- `corepack pnpm lint` (pass with existing warnings)
- `corepack pnpm typecheck` (pass)
- `corepack pnpm lint` (pass with existing warnings)
- `corepack pnpm typecheck` (pass)
- `corepack pnpm lint` (pass with existing warnings)
- `corepack pnpm typecheck` (pass)
- `corepack pnpm lint` (pass with existing warnings)
- `corepack pnpm typecheck` (pass)
- `corepack pnpm lint` (pass with existing warnings)
- `corepack pnpm typecheck` (pass)
- `corepack pnpm lint` (pass with existing warnings)
- `corepack pnpm typecheck` (pass)
- `corepack pnpm lint` (pass with existing warnings)
- `pnpm dlx shadcn@latest add @shadcn/select` (pass)
- `corepack pnpm add lucide-react` (pass)
- `corepack pnpm typecheck` (pass)
- `corepack pnpm lint` (pass with warnings)
- `corepack pnpm i18n:audit` (pass)
- `corepack pnpm typecheck` (pass)
- `corepack pnpm lint` (pass with warnings)
- `corepack pnpm build` (pass)
- `corepack pnpm typecheck` (pass)
- `corepack pnpm lint` (pass with existing `savePlan` hook dependency warnings)
- `corepack pnpm build` (pass)
- `corepack pnpm typecheck` (pass)
- `corepack pnpm lint` (pass with existing `savePlan` hook dependency warnings)
- `corepack pnpm build` (pass)
- `corepack pnpm typecheck` (pass)
- `corepack pnpm lint` (pass)
- `corepack pnpm build` (pass)
- `corepack pnpm typecheck` (pass)
- `corepack pnpm lint` (pass with existing warnings)
- `corepack pnpm prisma migrate dev --name add-seating-relationships` (pass)
- `corepack pnpm prisma:validate` (pass)
- `corepack pnpm typecheck` (initial fail before Prisma client regeneration; then pass)
- `corepack pnpm lint` (pass with warnings)
- `corepack pnpm build` (initial fail from relationship name typing mismatch; then pass)
- `corepack pnpm typecheck` (pass)
- `corepack pnpm lint` (pass with warnings)
- `corepack pnpm build` (pass)
- `corepack pnpm prisma migrate dev --name add-seat-layout` (pass)
- `corepack pnpm prisma:validate` (pass)
- `corepack pnpm prisma generate` (pass)
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
- `corepack pnpm typecheck` (pass)
- `corepack pnpm lint` (pass with existing warnings)

## Check Results

- Prisma schema validation: pass.
- TypeScript: pass.
- i18n audit: pass.
- Lint: pass with existing warnings.
- Build: not run in this phase set.

## How To Test

1. Run `corepack pnpm dev`.
2. Open a plan editor (`/seating-plans/{id}`).
3. In the guest panel, create at least two groups and verify each gets an auto-assigned color.
4. Rename and recolor a group; verify updates persist in the group list and guest selectors.
5. Delete a group assigned to one or more guests; verify guests remain and become ungrouped.
6. Open guest details in inspector, assign an existing group, then quick-create a new group inline and verify it is auto-selected.
7. Add at least two guests and assign them to seats.
8. Toggle `Group colors` in desktop canvas controls and verify occupied seats are colored by guest group.
9. Confirm seat visual priority still works (`conflict/drop/linked/selected`) when group colors mode is enabled.
10. Open legend and verify active seated group swatches are listed.
11. On mobile viewport, open `More` and toggle group colors; verify canvas seat coloring updates.
12. Verify adjacent move-table toggle and zoom/reset controls still render and work.
13. Use keyboard:
  - `]` to select next guest
  - `[` to select previous guest
  - `U` to unassign selected guest
14. Export guests to CSV and verify exported group names match selected groups.
15. Save and refresh; verify groups, colors, assignments, and canvas mode behavior remain consistent.

## Known Issues

- Existing lint warnings remain:
  - `savePlan` hook dependency warning in `page.tsx` (pre-existing)
  - `SeatingCanvas` `useEffect` dependency warning (still present)
  - unused `totalSeatCount` / `unseatedGuestCount` warnings in `page.tsx` (pre-existing)
- CSV plus-one marker list is currently hardcoded (`Osoba Tow.` only).
- Mobile behavior depends on browser UI chrome; `dvh` improves this but exact visible height can still vary slightly across devices.
- Group rename currently uses prompt dialog UX (functional but basic).

## Next Recommended Step

Next recommended follow-up:

- Add backend tests for group endpoint conflict and ownership validation.
- Replace prompt-based group rename with inline editing UI for smoother UX.
- Add unit tests for seat color-priority logic when group mode is enabled.
