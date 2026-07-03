# Equb App — Project Briefing

> **Purpose:** Complete handoff document for an incoming assistant with no prior context.
> All facts verified against live code and live database as of 2026-07-03.

---

## 1. OVERVIEW

An Ethiopian **Equb** (iqub) is a rotating savings group: N members each contribute a fixed
amount weekly, and each week one member wins the cumulative pot via a lottery spin wheel.
This app manages one Equb cycle for a single admin and ~26 members.

| Item | Value |
|---|---|
| Local path | `C:\Users\firao\Desktop\equb-app` |
| Deployed | Vercel (push to `main` → auto-deploy) |
| Next.js | 16.2.6 (App Router, React 19.2.4) |
| Prisma | 5.22.0 |
| Database | Neon PostgreSQL (serverless) |
| Styling | Tailwind CSS v4 |
| ORM | Prisma Client v5 |
| PDF | pdfkit 0.18.0 |
| Excel export | xlsx 0.18.5 (SheetJS) |
| OTP / WhatsApp | Twilio Verify |
| Firebase | Auth (firebase 12.13.0) — used for OTP alternative path |
| Hosting | Vercel (`push main` → deploy) |

**Users:**
- **One admin** — accesses `/admin/*`. Session is a short-lived HMAC token cookie
  (`equb_session`, 30-min idle timeout). No username/password UI — token is checked via
  `requireAdmin()` server-side in every server action.
- **Members** — access `/m/[token]` via a personal UUID link. Auth is PIN-based
  (4-digit PIN, bcrypt-hashed) or WhatsApp/SMS OTP via Twilio Verify. Member session stored
  in `member_sessions` table.

---

## 2. DATA MODEL

### Member (`members` table)

| Field | Type | Meaning |
|---|---|---|
| `id` | cuid | Primary key |
| `nameAmharic` | String | Amharic name (required, always stored) |
| `nameEnglishFirst` | String | English first name (default `""`) |
| `nameEnglishLast` | String | English last name (default `""`) |
| `displayPreference` | `DisplayPreference` | `AMHARIC` or `ENGLISH` — how the member's portal shows their name |
| `phone` | String? | Phone (US, last-10-digits match used for login) |
| `weeklyAmount` | Int | **Cents** — e.g., $500/week → 50000 |
| `wheelNumber` | Int | Primary lucky number on the spin wheel (unique among active members) |
| `extraWheelNumber` | Int? | Secondary lucky number for members contributing >$1,000/week |
| `isArchived` | Boolean | Soft-delete / replacement flag |
| `archivedAt` / `archivedReason` | DateTime? / String? | Set when a member is replaced |
| `wheelSuspended` | Boolean | Excluded from draws when true (manual or auto after 2 consecutive LATE payments) |
| `token` | String (uuid, unique) | Member's personal URL token — `/m/<token>` |
| `confirmedAt` | DateTime? | When member confirmed the Equb agreement; null = must confirm first |
| `confirmedIp` / `confirmedFingerprint` | String? / Json? | IP + device fingerprint at confirmation |
| `collectionConfirmedAt` / `collectionConfirmedAtExtra` | DateTime? | When member signed their payout receipt (MAIN / EXTRA wheel) |
| `collectionConfirmedIp` / `collectionConfirmedIpExtra` | String? | IP at receipt signature |
| `collectionConfirmedFingerprint` / `collectionConfirmedFingerprintExtra` | Json? | Device at receipt |
| `pin` | String? | bcrypt hash of 4-digit PIN. **`null` means PIN not yet set** (forced setup gate on first login after cycle reset) |
| `pinAttempts` | Int | Failed PIN attempts counter; resets to 0 on success |
| `pinLockedUntil` | DateTime? | Non-null = account locked until this time (after 5 failed PIN attempts, locked 30 min) |
| `payments` | relation | One Payment per week |
| `reviewRequests` | relation | PaymentReviewRequests submitted by this member |
| `sessions` | relation | MemberSession rows (one active per device) |
| `weekPayouts` | relation | WeekPayout rows where this member won |

**Two-wheel rule:** Any member contributing >$1,000/week (`weeklyAmount > 100_000`) gets
both a `wheelNumber` (covers first $1,000) and an `extraWheelNumber` (covers the remainder).
These are independent slots on the wheel.

---

### Week (`weeks` table)

| Field | Type | Meaning |
|---|---|---|
| `id` | cuid | PK |
| `weekNumber` | Int (unique) | 1–20 |
| `date` | DateTime | Saturday date of this week's draw |
| `isSkipped` | Boolean | Week skipped (no draw; admin can toggle) |
| `notes` | String? | Admin notes for this week |
| `winnerWheelNumber` | Int? | **Compat field** — the first number in `winnerNumbers`; null = not yet drawn |
| `winnerNumbers` | Int[] | **Source of truth** — all lucky numbers drawn this week (usually 1, can be 2+ on catch-up draws) |
| `payoutStatus` | `PayoutStatus?` | `PENDING` or `COLLECTED`; null = not drawn |
| `payoutMethod` | `CollectionMethod?` | Deprecated on `Week` — use `WeekPayout.method` instead |
| `payoutNotes` | String? | Free text |

---

### Payment (`payments` table)

One row per member × week (created at cycle start or when member joins).

| Field | Type | Meaning |
|---|---|---|
| `status` | `PaymentStatus` | `PENDING`, `PAID`, `LATE`, `DEFERRED`, `PARTIAL` |
| `method` | `PaymentMethod?` | `CASH`, `ZELLE`, `OTHER` |
| `paidAt` | DateTime? | Set when status→PAID |
| `paidAmount` | Int? | **Cents** — set only when `status=PARTIAL`; null otherwise |
| `notes` | String? | Admin free text |

**PARTIAL** status means the member paid some amount but not the full weekly contribution.
`paidAmount` records what was received. A partial does **not** trigger auto-suspension.

---

### PaymentReviewRequest (`payment_review_requests` table)

Members can dispute or claim a payment correction from their portal. Admin approves/rejects.

| Field | Type | Meaning |
|---|---|---|
| `claimedStatus` | String | What the member claims: `CASH`, `ZELLE`, `WON`, `DOUBLE`, `OTHER`, `SKIP` |
| `claimedDate` | DateTime | When they claim it happened |
| `status` | `ReviewStatus` | `PENDING`, `APPROVED`, `REJECTED` |
| `adminNote` | String? | Admin's note on the decision |

On approval: `SKIP` → payment set to `DEFERRED`; all others → payment set to `PAID`.

---

### WheelSlot (`wheel_slots` table)

Each row is one **slot** on the spin wheel.

| Field | Type | Meaning |
|---|---|---|
| `position` | Int (unique) | Wheel position (logical ordering on wheel; NOT 1–20 sequential — positions are arbitrary integers assigned at slot creation and preserved across reshuffles) |
| `numbers` | Int[] | Lucky numbers grouped in this slot |

A slot with multiple numbers means those members share one "draw" — if the slot wins,
all members in it receive their payout that week.

---

### WheelConfig (`wheel_config` table)

Singleton row (`id = 1`).

| Field | Type | Meaning |
|---|---|---|
| `priorityNumbers` | Int[] | Lucky numbers the wheel will bias toward when spinning. **Never exposed to the browser.** Read server-side only after WHEEL_KEY passphrase unlock. |

---

### WeekPayout (`week_payouts` table)

One row per lucky number drawn in a week (source of truth for collection tracking).

| Field | Type | Meaning |
|---|---|---|
| `weekId` | String | FK → Week |
| `memberId` | String? | FK → Member (nullable; `onDelete: SetNull`) |
| `number` | Int | The lucky number that won |
| `wheelType` | `WheelType` | `MAIN` or `EXTRA` |
| `amount` | Decimal? | Net payout in dollars (computed at draw time: `gross - fee`) |
| `status` | `PayoutStatus` | `PENDING` or `COLLECTED` |
| `method` | `PayoutMethod?` | `CASH`, `ZELLE`, `BOTH`, `CASHAPP`, `VENMO`, `BANK`, `OTHER` |
| `notes` | String? | Admin note |
| `collectedAt` | DateTime? | Set when status → COLLECTED |
| `signedAt` | DateTime? | Set when the winning member signs their collection receipt via portal |

Unique constraint: `(weekId, number)` — prevents the same lucky number being drawn twice in the same week.

---

### Other models

- **EqubArchive** — JSON snapshot of a completed cycle (members, weeks, payments). Not touched by cycle reset.
- **MemberSession** — active browser sessions for member portal. One per device; rotated on new-device login.
- **AuditLog** — append-only log of all admin and system actions.

---

### Enums

| Enum | Values |
|---|---|
| `PaymentStatus` | `PENDING`, `PAID`, `LATE`, `DEFERRED`, `PARTIAL` |
| `PaymentMethod` | `CASH`, `ZELLE`, `OTHER` |
| `PayoutStatus` | `PENDING`, `COLLECTED` |
| `CollectionMethod` | `CASH`, `ZELLE`, `BOTH` (deprecated on Week; use WeekPayout.method) |
| `PayoutMethod` | `CASH`, `ZELLE`, `BOTH`, `CASHAPP`, `VENMO`, `BANK`, `OTHER` |
| `WheelType` | `MAIN`, `EXTRA` |
| `ReviewStatus` | `PENDING`, `APPROVED`, `REJECTED` |
| `DisplayPreference` | `AMHARIC`, `ENGLISH` |

---

## 3. THE WHEEL SYSTEM

### How Slots Work

The **wheel** is divided into **slots**. Each slot holds 1 or more lucky numbers. When the
wheel spins, it lands on a slot, not a number — the entire slot wins.

A slot is **eligible** only when **all** of its lucky numbers are undrawn (no WeekPayout
row exists for any of those numbers). If any number in a slot has been drawn in a prior
week, the slot is **locked** — it cannot spin again, cannot be dragged or reshuffled, and
is displayed with a "won" amber badge on the admin Wheel Setup page.

Slot positions are arbitrary integers (not 1–20). They are preserved across saves; new
slots get the next available integer from a local ref counter.

---

### The Server-Side Spin: `pickWheelWinner` (`src/actions/collection.ts`)

When the admin clicks Spin on the Dashboard:

1. Server action `pickWheelWinner(weekId)` is called.
2. Reads all slots, wheel config (priority numbers), members, and all weeks with winners.
3. Builds `drawnNumbers` from `winnerNumbers` across all weeks (falls back to
   `winnerWheelNumber` for legacy rows).
4. Computes `eligibleSlots` = slots where **every** number is undrawn.
5. Checks if any eligible slot contains a priority number. If yes, restricts the pool to
   those slots only.
6. Picks a random slot from the pool.
7. Returns `{ slotPosition, numbers }` to the client — **the priority numbers themselves
   are never sent; only the final picked slot numbers are returned.**
8. The client's `SpinWheel` component animates to the result.
9. Admin confirms → `recordWheelWinner(weekId, numbers)` is called.

`recordWheelWinner` atomically:
- Sets `Week.winnerWheelNumber = numbers[0]`, `Week.winnerNumbers = numbers`, `payoutStatus = PENDING`
- Creates one `WeekPayout` row per number (via upsert — idempotent)
- Computes net payout: `gross - fee` where gross = `weeklyAmount * 20`, fee = `(weeklyAmount * 20 / 500_000) * 10_000`
- Writes audit log

**Catch-up draws:** `addWinnerToWeek(weekId, numbers)` adds additional winners to an
existing week (e.g., when a week was skipped and multiple draws happen later). Numbers
already drawn anywhere are skipped individually; the rest are merged into `winnerNumbers`.

**Correcting a draw:**
- `removeWinner(weekPayoutId)` deletes the WeekPayout and scrubs the number from the week.
  Blocked if signed or already collected.
- `moveWinner(weekPayoutId, targetWeekId)` relocates a WeekPayout to a different week.
  Blocked if signed or already collected.

---

### The Hidden Priority List

`WheelConfig.priorityNumbers` steers which slot the wheel lands on. It is:
- **Stored** in `wheel_config` table, `priorityNumbers` column.
- **Never returned** to any browser in any member-facing query.
- **Accessible on Wheel Setup** only after the admin enters the `WHEEL_KEY` environment
  variable passphrase. The priority editor is fully absent from the DOM until unlocked
  (not CSS-hidden — it's conditionally rendered only after `unlockStage === 'unlocked'`).
- The passphrase is checked server-side in `unlockPriorityNumbers` (action in
  `src/actions/wheel.ts`). The passphrase itself is never sent back to the client.
- `savePriorityNumbers(numbers, passphrase)` re-validates the passphrase server-side
  before writing.

Current priority: `[15]` (Getahun's main number).

---

### Wheel Setup Page (`/admin/wheel`)

Component: `src/components/admin/WheelSetup.tsx`

Features:
- **Drag-and-drop** pairing of lucky numbers into slots. Locked slots (contain a drawn
  number) are not draggable.
- **$1,000 per-slot cap** (`MAIN_WHEEL_CAP_CENTS = 100_000`): the slot total is displayed
  live; slots over the cap are highlighted and block saving.
- **Names toggle**: member names are hidden by default. "Show names" fetches them via
  `getWheelMemberNames()` (server action, returns only Amharic name per number).
- **Unassigned tray**: lucky numbers not in any slot appear here. Drawn numbers are
  excluded from the tray automatically.
- **Auto-arrange**: bin-packs all unassigned (non-drawn) numbers into new slots, first-fit,
  respecting the cap. Numbers exceeding the cap alone are flagged for manual review.
- **Reshuffle all**: pools all undrawn numbers from unlocked slots + unassigned tray,
  Fisher-Yates shuffles, re-packs. Drawn numbers are **explicitly excluded** even from
  unlocked slots (defensive filter).
- **Per-chip remove button (×)**: removes a single number from its slot.
  - Drawn chip removed → number disappears (already won; excluded from tray via `drawnSet`).
  - Undrawn chip removed → number returns to unassigned tray automatically.
  - Works even on locked slots (allows admin to manually split a half-drawn slot).
- **Drawn chip badge**: "won" amber badge on any chip whose number is in `drawnNumbers`.
- **Mismatch banner**: shown when any member's lucky number is missing from all slots.

`saveWheelSlots` server-side validation (`src/actions/wheel.ts`):
1. No duplicate numbers across slots.
2. Locked slots (contain drawn numbers) must be present and unchanged.
3. No unlocked slot may pair a drawn number with an undrawn number.
4. No ghost numbers (in a slot but not belonging to any active member).
5. Warning (not error) if any member number is absent from all slots.

---

### Payout Calculation

Members contributing >$1,000/week split into two wheel entries. The net payout formula:
```
gross  = weeklyAmount × 20
fee    = (gross / 500_000) × 10_000
net    = gross − fee
```
The winning member receives their own net payout (their 20-week total contributions minus
fee), **not** the collective pot.

---

## 4. OTHER FEATURES

### Auth

**Admin:** Session cookie `equb_session` — HMAC-SHA256 token with 30-minute idle timeout.
Validated in `requireAdmin()` (`src/lib/auth.ts`). No username/password in the app —
the cookie is set by a separate login mechanism (not in codebase).

**Members — two login paths:**

1. **PIN login** (`/login`): member enters phone number → looked up by last-10-digits →
   4-digit PIN verified against bcrypt hash. 5 failed attempts → 30-min lockout.
   First login after cycle reset: `pin === null` → forced PIN setup screen.

2. **WhatsApp OTP** (`/login`): sends a 6-digit Twilio Verify code via WhatsApp or SMS.
   Verified server-side. Firebase Auth is also initialized (`src/lib/firebase.ts`) but
   appears to be a secondary/unused path.

Member session: stored in `member_sessions` DB table. Token in `equb_member_session` cookie.
2-hour inactivity timeout, 7-day absolute max. New device fingerprint triggers a notice.

---

### Admin Pages

| Page | Route | What it does |
|---|---|---|
| Dashboard | `/admin` | Spin wheel control (pick winner + confirm), stats, locked member alerts, pending review badge |
| Members | `/admin/members` | Full member list with lucky numbers, amounts, payment standing, CSV export of lucky numbers; edit/add/replace/delete member actions |
| Payments | `/admin/payments` | Week × member grid; click cell to set PENDING / PAID / LATE / DEFERRED / PARTIAL with method and notes |
| Weeks | `/admin/weeks` | 20-week calendar with dates, skip toggles, notes |
| Collection | `/admin/collection` | Per-week payout tracking: mark each WeekPayout as COLLECTED with method; move/remove winners; shows collection PDF links |
| Reviews | `/admin/reviews` | Queue of member-submitted payment disputes; approve or reject with admin note |
| Audit | `/admin/audit` | Full audit log with entity type, action, before/after JSON |
| Archive | `/admin/archive` | Past completed cycles stored as JSON snapshots |
| Wheel Setup | `/admin/wheel` | Slot drag-drop editor, priority number unlock, auto-arrange/reshuffle |
| New Cycle | `/admin/new-cycle` | Four-step guarded wizard: forced xlsx backup export → member carry-over checklist → start date + 20-week preview → type "WIPE" to confirm → atomic reset+rebuild |

---

### Member Portal (`/m/[token]`)

Gate 1: Agreement confirmation (once). Gate 2: PIN setup if `pin === null`.
After gates: shows current payment status, weekly stamps, Equb calendar, payout reveal
(if they've won), collection receipt signing, and payment dispute form.

Sub-pages: `/payments` (full payment history), `/weeks` (week list), `/collections`
(payout receipt + signing), `/documents` (PDF receipt download), `/activity` (peer standing view).

---

### Payment Statuses

- **PENDING** — not yet paid
- **PAID** — fully paid
- **LATE** — overdue; 2 consecutive LATE payments → auto-suspend from wheel
- **DEFERRED** — skip approved by admin (usually from a review request)
- **PARTIAL** — partial payment recorded; `paidAmount` (cents) stores the amount received

---

### Other

- **Telegram reminders**: `/api/cron/telegram` — cron endpoint sends payment reminders
  via Telegram bot.
- **PDF receipts**: `/api/collection-receipt/[token]` — generates pdfkit PDF for collection.
- **CSV export**: `/api/admin/export-lucky-numbers` — CSV of lucky numbers.
- **XLSX export**: `/api/admin/export-cycle` — 4-sheet xlsx (Members, Winners, Payments,
  Weeks) for backup before cycle reset.
- **Unlock member**: `/api/admin/unlock-member` — admin endpoint to manually clear PIN lockout.

---

## 5. KEY FILE MAP

### `src/actions/`

| File | What it does |
|---|---|
| `auth.ts` | `requireAdmin()` — reads and validates admin session cookie |
| `collection.ts` | `pickWheelWinner`, `recordWheelWinner`, `addWinnerToWeek`, `updatePayoutRecord`, `removeWinner`, `moveWinner` — all winner and payout tracking |
| `equb.ts` | `endEqub` (archive snapshot + reset old approach), `deleteArchive` |
| `member-auth.ts` | `memberSignOut` — clears member session |
| `members.ts` | `createMember`, `updateMember`, `deleteMember`, `suspendFromWheel`, `reinstateToWheel`, `updateDisplayPreference`, `confirmAgreement`, `confirmCollectionReceipt`, `replaceMember`, `deleteAllMembers`, `permanentlyDeleteArchivedMember`, `regenerateToken` |
| `new-cycle.ts` | `wipeAllCycleData`, `rebuildNewCycle`, `resetAndRebuildCycle` (atomic wipe+rebuild in single `$transaction`) — used by the New Cycle wizard |
| `otp.ts` | `sendOtp`, `verifyOtp`, `requestOtp` — Twilio Verify WhatsApp/SMS OTP |
| `payments.ts` | `updatePaymentStatus` — sets payment PENDING/PAID/LATE/DEFERRED/PARTIAL; triggers auto-suspend on 2× LATE |
| `peer-view.ts` | `logPeerView` — audit-logs when a member views another member's standing |
| `pin-login.ts` | `lookupPhone`, `verifyMemberPin`, `setInitialPinByPhone` — phone → PIN login flow |
| `pin-setup.ts` | `setInitialPin` — PIN setup via token URL (after cycle reset) |
| `reviews.ts` | `submitReviewRequest`, `approveReview`, `rejectReview` |
| `weeks.ts` | `toggleSkipWeek`, `updateWeekNotes` |
| `wheel.ts` | `unlockPriorityNumbers`, `getWheelMemberNames`, `saveWheelSlots`, `savePriorityNumbers` |

### `src/lib/`

| File | What it does |
|---|---|
| `auth.ts` | `createSessionToken`, `validateSessionToken`, `requireAdmin`, `SESSION_COOKIE` — admin HMAC session |
| `db.ts` | Prisma client singleton |
| `equb.ts` | Business logic constants and helpers: `EQUB_START`, `TOTAL_WEEKS`, `MAIN_WHEEL_CAP_CENTS`, `mainWheelWeekly`, `extraWheelWeekly`, `generateWeekDates`, `calculatePot`, `calculateMemberFee`, `calculateMemberGross`, `calculateNetPayout`, `getAvailableWheelEntries`, `getDisplayName`, `formatCurrency`, `formatDate`, `getCurrentWeekNumber` |
| `fingerprint.ts` | `buildFingerprint` — device fingerprint from UA + screen + language |
| `firebase.ts` | Firebase Auth client init (secondary OTP path) |
| `member-session.ts` | `createMemberSession`, `validateSession`, `deleteMemberSession`, `computeFingerprint`, `setSessionCookies`, `clearSessionCookies` |
| `pdf.ts` | pdfkit helpers for collection receipt PDF |
| `pin.ts` | `hashPin` (bcrypt), `verifyPin` |
| `twilio.ts` | `sendVerification`, `checkVerification` — Twilio Verify REST calls |
| `utils.ts` | General utility helpers |

### `src/components/admin/`

| File | What it does |
|---|---|
| `AdminNav.tsx` | Top nav with links to all admin pages; "New Cycle" link styled amber (danger signal) |
| `DashboardShell.tsx` | Dashboard client shell: spin wheel trigger, week selector, stats, pending reviews badge, locked members panel, Admin/Share toggle |
| `SpinWheel.tsx` | SVG spin wheel animation. Receives eligible slot numbers from server; animates and calls `pickWheelWinner` server action on spin click. Never receives priority numbers. |
| `WheelSetup.tsx` | Drag-drop slot editor. All Fix 1/2/3 for drawn-number safety are in this file. |
| `PaymentGrid.tsx` | Week × member payment grid with inline status update cells |
| `NewCycleWizard.tsx` | Four-step cycle reset wizard (client component) |
| `WinnerControls.tsx` | Per-payout row controls in Collection: move/remove winner buttons |
| `AddWinnerForm.tsx` | Catch-up draw form (add winners to an existing week) |
| `PayoutForm.tsx` | Mark a WeekPayout as COLLECTED with method + notes |
| `PayoutReveal.tsx` | Member-facing payout amount reveal card |
| `EditMemberForm.tsx` | Admin member edit form |
| `MemberActions.tsx` | Admin member list action buttons (edit, suspend, replace, delete, regenerate link) |
| `ReviewActions.tsx` | Admin approve/reject buttons for payment review requests |
| `LockedMembersPanel.tsx` | Dashboard panel listing PIN-locked members with unlock links |
| `ReplaceMemberModal.tsx` | Modal for replacing a member (preserves lucky number, copies payment history) |
| `EndEqubButton.tsx` | Archive + reset button (old single-action path, pre-wizard) |
| `DeleteArchiveButton.tsx` | Delete an archived cycle |
| `DeleteArchivedMemberButton.tsx` | Permanently delete an archived member |
| `DeleteAllMembersButton.tsx` | Wipe all members (development utility) |
| `SkipToggle.tsx` | Toggle a week's skip state |

---

## 6. CURRENT STATE / KNOWN ISSUES

### Drawn weeks (live database, 2026-07-03)

| Week | Date | Drawn Numbers | Notes | Payout Status |
|---|---|---|---|---|
| 1 | 2026-05-17 | [78] — Dawit | MAIN $19,600 | **COLLECTED** (Zelle) |
| 2 | 2026-05-24 | [5] Firaoli + [13] Surashe | MAIN $19,600 + MAIN $4,900 | **COLLECTED** (Zelle) |
| 3 | 2026-05-31 | — | Not drawn | — |
| 4 | 2026-06-07 | [39] Firaoli (EXTRA) | EXTRA $19,600 | **PENDING** (signed 2026-06-22) |
| 5 | 2026-06-14 | [11] Betelehem + [34] Yared | MAIN $12,250 + MAIN $4,900 | **PENDING** |
| 6 | 2026-06-21 | [19] Hana | MAIN $4,900 | PENDING (signed 2026-06-21) |
| 7 | 2026-06-28 | [15] Getahun | MAIN $19,600 | PENDING (signed 2026-07-01) |
| 8–20 | 2026-07-05 → 2026-09-27 | Not drawn | — | — |

**Anomaly — Week 3 skipped draw:** Week 3 (2026-05-31) has `winnerWheelNumber = null` with no
winner, yet Week 4 and later were drawn normally. Week 3 is not marked `isSkipped`. This means
Week 3 appears as "pending draw" indefinitely unless the admin records a winner or marks it
skipped. **No code defect** — the draw simply was not performed or recorded.

**Drawn lucky numbers in total:** 5, 11, 13, 15, 19, 34, 39, 78.

---

### Current Slot Layout (live database, 2026-07-03)

Positions are non-sequential due to prior reshuffles (old wheel had positions 12–188; current
batch starts at 283 after a reshuffle).

| Position | Numbers | Status |
|---|---|---|
| 12 | [5, 13] | **LOCKED** (both drawn — Week 2) |
| 20 | [78] | **LOCKED** (drawn — Week 1) |
| 93 | [11, 34] | **LOCKED** (both drawn — Week 5) |
| 130 | [39] | **LOCKED** (drawn — Week 4) |
| 145 | [10] | Unlocked — Tsion's #10 (freed from the old [19,10] pairing via SQL) |
| 174 | [15] | **LOCKED** (drawn — Week 7) — previously listed as 174 in old numbering |
| 283 | [9] | Unlocked |
| 284 | [7, 3] | Unlocked |
| 285 | [25] | Unlocked |
| 286 | [8] | Unlocked |
| 287 | [2] | Unlocked |
| 288 | [15] | **LOCKED** (drawn — Week 7) |
| 289 | [21, 29] | Unlocked |
| 290 | [12, 24, 30] | Unlocked |
| 291 | [18] | Unlocked |
| 292 | [14, 619] | Unlocked — note: #619 is Arsema's number |
| 293 | [1, 4] | Unlocked |
| 294 | [22] | Unlocked |
| 295 | [16] | Unlocked |
| 296 | [155] | Unlocked — note: #155 is Getahun's extra number |
| 297 | [27] | Unlocked |
| 298 | [10] | Unlocked — duplicate of position 145? (Both hold [10]) |

**⚠ Data oddity — #10 in two slots:** Lucky number 10 (Tsion) appears at position 145 AND
position 298. This is a duplicate and will trigger validation error 1 ("Lucky #10 appears
in both slot 145 and slot 298") when the admin tries to save from Wheel Setup. The admin
must remove #10 from one slot before saving. The current live state was set by direct SQL;
the app UI has not saved since the SQL edits.

**⚠ Data oddity — #15 in two slots:** Lucky number 15 (Getahun) appears at positions 174
and 288. Position 174 slot number shows as 174 in the data. Both are locked. The
locked-slot-unchanged check means this inconsistency is invisible at save time (both
locked slots would pass through unchanged). It does not affect draws since both are locked.

**WheelConfig priority:** `priorityNumbers = [15]` (Getahun). Note: #15 is already drawn
(Week 7), so the priority has no effect until updated.

**Unassigned numbers:** `#10` appears in two slots; `#19` (Hana, drawn Week 6) was manually
stripped from slot 145 via SQL and is no longer in any slot — correctly omitted from the
tray since it's drawn.

---

### Known Issues / TODOs visible in code

1. **Duplicate #10 in slots** (pos 145 and 298): Must be resolved via Wheel Setup UI
   (remove from one slot) before the next save.

2. **Duplicate #15 in slots** (pos 174 and 288): Both locked. No save-time error occurs
   but the duplication is logically inconsistent. Should clean up by removing the empty-ish
   slot.

3. **Week 3 has no winner and is not skipped:** Appears as an indefinitely pending draw.
   Admin should either record a winner or mark it skipped.

4. **Priority `[15]` is stale:** #15 already won; the priority list should be updated to
   the intended next winner's number before the Week 8 draw.

5. **`Week.payoutMethod` deprecated**: The code comment in `collection.ts` notes
   `payoutMethod` on Week is "deprecated fallback — removed in a later cleanup step."
   `WeekPayout.method` is the active field.

6. **Firebase Auth** (`src/lib/firebase.ts`) is initialized but the `/api/auth/firebase-otp`
   route suggests an alternative OTP path. It is unclear if this path is actively used or
   is a backup/legacy flow.

7. **`endEqub` in `src/actions/equb.ts`** is an older single-action cycle-end that does NOT
   wipe wheel slots or WheelConfig — it only resets weeks and members. The newer
   `resetAndRebuildCycle` in `src/actions/new-cycle.ts` (used by the New Cycle wizard) is
   the authoritative reset path.

8. **`session.ts` inline passphrase** — the `sessionPass` in `WheelSetup.tsx` is stored in a
   `useRef` (never serialized to DOM) and cleared on unmount. Correct by design.

---

## 7. CONVENTIONS

### Money
All monetary amounts are stored as **integer cents** in the database (`weeklyAmount`,
`paidAmount`). The only exception is `WeekPayout.amount` which is `Decimal(12,2)` in
**dollars** (computed at draw time and stored that way for display).

Conversion helpers: `formatCurrency(cents)` in `src/lib/equb.ts`.

### Server Actions
All mutations go through `"use server"` actions in `src/actions/`. Every admin action
calls `requireAdmin()` at the top. Every action that touches the DB inside a mutation
also writes to `AuditLog`. Revalidation uses `revalidatePath("/admin")` and the specific
page path.

### Prisma Migrations
Run `npx prisma migrate dev` locally. Migrations live in `prisma/migrations/`. Schema
source of truth is `prisma/schema.prisma`. The Neon DB is the single database.

### Deploy
Push to `main` branch → Vercel auto-builds and deploys. No staging environment.
Environment variables are set in Vercel dashboard.

### Privacy / Security Rules (hard requirements — do not violate)
- **Member names are never shown on the spin wheel** or the Collection table. The wheel
  shows only lucky numbers. Names are on-demand behind "Show names" toggle in Wheel Setup
  only.
- **`priorityNumbers` is never returned to the browser** in any form. The priority editor
  is absent from the DOM (not hidden) until after WHEEL_KEY passphrase unlock.
  `sessionPass` is stored in a `useRef` only.
- **`weeklyAmount`, `wheelNumber`, `extraWheelNumber`, `paidAmount` are never selected in
  member-facing queries.** These fields are guarded at the query level, not just the UI.
- **Drawn lucky numbers cannot have their `wheelNumber` changed** (guard in `updateMember`).
- **Signed payouts (`signedAt` not null) cannot be moved or removed** (guard in
  `removeWinner` / `moveWinner` / `assertNotSignedForIdentityChange`).
- **PIN is bcrypt-hashed** (`hashPin` via bcryptjs). `pin === null` is the canonical signal
  that a member has not yet set a PIN (after cycle reset). The PIN field is never selected
  in any member-facing query that renders data.

### Cycle Reset
The **New Cycle Wizard** (`/admin/new-cycle`) is the authoritative reset path:
1. Admin must download the xlsx backup first (gate).
2. Admin enters member carry-over list with editable rows.
3. Admin sets new start date.
4. Admin types "WIPE" to confirm.
5. `resetAndRebuildCycle` in `src/actions/new-cycle.ts` runs a single `$transaction` that
   wipes all cycle data and rebuilds weeks + members + payments + wheel config atomically.
   All members get `pin = null` so they are forced to set a new PIN on first login.

---

*Generated 2026-07-03 from live codebase and database.*
