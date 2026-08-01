# EQUB GROUND TRUTH

**The single source of truth for the platform.**
Read this first, every session, before touching anything.

| | |
|---|---|
| **Owner** | Firaoli ("Oli") Seboka — sole organizer and admin |
| **Status** | Rebuild era — Phase 1 (Brain established) |
| **Live cycle** | Cycle 1, 20 weeks planned, started May 17 2026, 25 members — **DATA IS SACRED, MUST SURVIVE THE REBUILD** |
| **Horizon** | 2–3+ more years. Build for the long run, not for one cycle. |
| **Version** | v3 — August 2026 |

---

## 0. WHY THIS DOCUMENT EXISTS

The first build grew as a pile of features with no organizing brain. Decisions lived in
chat history, nothing was written down, the data model accumulated scars, and the app
hardcoded one specific cycle. It worked, but it could only be pushed — never driven.

This document ends that. Every principle and decision lives here. It is law. If code and
this document disagree, **this document is right and the code is wrong.**

**Working doctrine:** bold on architecture, careful on data. We rebuild the structure
without mercy. We do not lose a single recorded payment, payout, or member.

---

## 1. WHAT THIS IS

**This is a financial platform for the organizer. Equb is its first module — not the
whole product.**

An Equb is an Ethiopian rotating savings group: members contribute weekly, one member
receives the pot each week, everyone receives exactly once per cycle. It runs on trust,
and the organizer carries the risk.

**The organizer's real job is not collecting money. It is managing risk, trust, and the
financial position of the group.** The software exists to support that judgment and
present the truth clearly — not to replace the judgment.

Architecture must therefore be **modular**: Equb is one module. Other financial modules
may follow. Nothing may be built assuming Equb is the only thing here.

### 1.1 THIS IS ALSO THE TEST GROUND FOR NEXO ACCESS

Equb is deliberately the **proving ground and research method** for the larger Nexo
Access platform — in particular the two apps coming there (member app and driver app).

- What works here gets **promoted** to Nexo.
- What fails here is **avoided** there.

That makes this serious R&D, not a hobby project. Every pattern, tool, and design
decision is evaluated twice: does it serve Equb, and would it survive being carried into
Nexo? Cost is not the deciding factor — proven value is.

---

## 2. CORE PRINCIPLES (LAW)

### 2.1 THE PRESENTATION LAYER — "WHERE AM I, RIGHT NOW"

The organizer logs in and the complete state of his financial world is **in front of
him**, without hunting, clicking, or searching. Not a chatbot — a display that answers
everything at a glance:

- Where are we? Which cycle, which week, how far along
- What was supposed to be collected? What actually came in?
- What has gone out? To whom? How much?
- What is outstanding — who owes, who is late, who is deferred?
- **The cash position:** collected vs disbursed, and the gap between them

**The defining example:** *"We are in week 7, but only 5 people have been paid out. The
group is holding 2 weeks' worth of money that has not gone out yet."* The system must
show that surplus explicitly and continuously, without being asked.

This presentation layer is the primary admin surface. **The wheel is a tool inside the
platform — it is not the dashboard.**

### 2.2 ORGANIZER DISCRETION IS A FEATURE, NOT A HACK

The organizer decides who receives the payout each week. This is legitimate, standard
Equb practice, and it is why six years have run without loss.

**The risk curve — the actual logic:**

| Cycle stage | Risk if an unproven member wins | Organizer behavior |
|---|---|---|
| **Early weeks** | HIGH — they take the full pot and still owe most of the cycle. If their finances break, the group absorbs it. | Steer toward trusted, proven, financially stable members. |
| **Around halfway** | FALLING — months of proven reliability, fewer weeks owed. | Steering relaxes. |
| **Late weeks** | LOW — they owe only a few weeks and are deeply invested. | **No steering. Whoever the wheel picks, wins.** |

Risk management, not favoritism. The tool must make it effortless and invisible.

### 2.3 WINNER SELECTION IS A PLANNING TOOL, AND THE PLAN IS LOCKED

Selecting who wins is **not a switch — it is planning**. When the organizer designates
numbers, the system must offer real configuration:

- **Together or separate** — do these numbers win in the SAME week, or different weeks?
- **Which week** — assign each selection to a specific week, planning several weeks ahead.

Once configured, **the plan is locked and protected from the system's own automation:**

- Auto-arrange and reshuffle must **never separate** numbers the organizer grouped together.
- Auto-arrange and reshuffle must **never re-pair** a number that is committed to a week.
- Committed numbers are treated exactly like already-drawn numbers: excluded from the
  shuffle pool, their slot frozen.

**The principle underneath:** the Brain must know **intent**, not only **state**. The
system already knows what *has happened* (drawn numbers). It must equally know what is
*intended to happen* (committed selections) and defend that intent.

**Known defect this fixes (verified in code):** `handleReshuffleAll` filters drawn
numbers from the pool but has no awareness of committed selections. It can silently
re-pair a selected number with someone unintended — the exact failure that occurred
twice in practice.

### 2.4 ZOOM SAFETY — THE WHEEL SCREEN IS CLEAN BY DEFAULT

Draws happen live on Zoom with the organizer screen-sharing. The design rule:

- **The winner is configured BEFOREHAND, in settings — a separate place entirely.**
- **On the wheel screen there is nothing but the wheel.** No gear icon, no hidden panel,
  no control to click, nothing that could be mis-clicked or noticed. The organizer opens
  it and spins. That is all that exists there.
- **Configurable visibility:** before screen-sharing, the organizer can set what is
  visible and what is hidden across the app — payment details, member information,
  amounts — so nothing sensitive appears by accident.
- Selection logic and data live server-side and must never reach the browser.

**Rejected design:** a hidden control on the wheel page itself (gear + passphrase). Any
control living on the shared screen is a liability, however well hidden.

### 2.5 PEOPLE ARE PERMANENT — PARTICIPATION IS PER-CYCLE

Members are real people the organizer knows, not rows belonging to one cycle.

| Permanent (the person, forever) | Per-cycle (chosen fresh) |
|---|---|
| Amharic name | Weekly contribution amount |
| English name (first / last) | Lucky / wheel number |
| Phone number | Whether they are in this cycle at all |
| History across all cycles | Their draw outcome and payout |

**The Member Directory** persists across all cycles. Starting a new cycle means picking
people from the directory — *"Add Tizita to this cycle?"* — never re-typing anyone. A
person may sit out cycles 1–3 and join cycle 4; the directory remembers them.

Contribution changes between cycles because income changes. Normal and expected.

### 2.6 EVERYTHING CONFIGURABLE — NOTHING HARDCODED

Starting a new cycle asks: start date, number of weeks, which people from the directory,
and each participant's own contribution (they are **not** equal). Weeks and dates
generate automatically. Member count is independent of week count. Fee rules and
contribution tiers are configuration, not code.

### 2.7 PLANNED LENGTH vs ACTUAL LENGTH — TRACK BOTH

A cycle is *planned* as 20 weeks. Reality may take 22 — someone joins late, a week is
skipped, life happens. The system must:

- **Respect the plan:** 20 weeks was the commitment, and the organizer keeps control of it
- **Track the truth:** if it is actually running longer, show the real week
- **Calculate per member:** for anyone joining at any point, compute what they owe and
  when *they* finish — regardless of when the cycle started
- **Keep the record** of what actually happened, in the archive

Mid-cycle joins must never break the math or anyone else's standing.

### 2.8 PRIVACY BOUNDARY (SETTLED)

**Shared between members** — payment progress, for accountability and the social nature
of an Equb. Members see who is keeping up.

**Never shared between members** — contribution amounts, lucky numbers, payout amounts,
phone numbers, PINs, who won which draw (numbers only, never names).

The social layer stays. Equb is friends doing this together; minimal friendly visibility
is part of the point.

### 2.9 CLEAN DELETE, READABLE ARCHIVE

Ending a cycle means **wipe it clean** to start fresh — not soft-delete, not lingering
state. But **before** wiping, the archive produces a readable record: who paid what, who
was paid out, how much, when — human-readable, not a raw JSON blob. Past cycles remain
viewable.

### 2.10 SAVE FEEDBACK MUST BE UNMISTAKABLE

Every action gives a clear result — obvious confirmation on success, visible reason on
failure. Never leave doubt about whether something saved.

### 2.11 MESSAGING IS STATE-AWARE AND CONFIGURABLE

One **Send** action. The system chooses the right message for each member from their
actual state and fills it with real data:

| Member state | Message content |
|---|---|
| Paid | "You paid week N. You have paid X of Y. Z weeks left." |
| Behind | "You are behind by N weeks." — a record, never a threat |
| Late (window closed) | "Week N was not paid." — documented, no pressure |
| Selected to receive | "You receive this week. Amount, and what remains." |

**All templates are configurable by the organizer** — wording, tone, and the data fields
included. The organizer edits them; they are never hardcoded.

**Delivery:** build on what actually works today (Telegram is live and working). Do not
block the product waiting on WhatsApp/Meta or carrier approval. Additional channels are
added when and if approval arrives.

### 2.14 MONEY IS THE TRUTH — EVERYTHING ELSE IS DERIVED

The system stores **what actually happened**, and calculates everything else. Nothing
that can be computed is ever stored, because stored values drift and computed values
cannot.

**Stored:** the money received (amount, date, method), and `deferred` (a real decision
the organizer made to excuse a week).

**Derived — never stored:**

| Derived value | How |
|---|---|
| Weeks credited | total money paid ÷ current weekly amount |
| Weeks behind | weeks elapsed in their window − weeks credited |
| Status (paid / partial / not paid) | from the amount against the weekly amount |
| Late | unpaid **and** the payment window has closed — from the calendar, not a flag |
| Current week | cycle start date + today — never hardcoded, never stored |
| Finish week | their start week + weeks committed |
| Fee | 2% of gross ($100 per $5,000) |
| Payout | (weekly amount × their weeks) − fee |

**Why this matters — it removes every special case:**

- **Rate change mid-cycle:** someone paid 6 weeks at $250 ($1,500) and moves to $500 →
  $1,500 ÷ $500 = 3 weeks credited → they are now 3 weeks behind. Automatic.
- **Uneven amounts:** $450/week and $1,000 arrives → 2 full weeks ($900) + $100 partial
  on the third. Pure arithmetic.
- **No "mark late" job:** a week becomes late when its window passes. Nothing to run,
  nothing to forget.

### 2.15 PAYMENT ALLOCATION — OLDEST DEBT FIRST, THEN FORWARD

Money is never assigned to a week by hand. The organizer enters the amount received;
the system allocates it and **shows the allocation before it is committed**:

1. **Oldest unpaid weeks first**, waterfalling forward.
2. Once caught up, the **current week**.
3. Any surplus rolls into **future weeks** (paying ahead is normal and expected).
4. A leftover too small for a full week is recorded as **partial** on the next week.

Rationale from practice: a member four weeks behind who sends money is paying down the
oldest debt — never the current week. The old grid forced the organizer to decide the
week manually, which is both slow and error-prone.

**The grid stays.** It is genuinely good at showing everyone at once and spotting
patterns (streaks of red, people paid ahead). Its failure was being the *recording*
tool as well. Two jobs, two tools: the grid is the map, payment entry is the action.

### 2.16 REMOVED BY REAL-WORLD EVIDENCE

- **Request Review** — built, shipped, used by nobody. Members contact the organizer
  directly. Removed.
- **"Unpaid" vs "Late" as separate stored statuses** — collapsed. Late is derived.

Rule: features with no real use are liabilities. Remove them.

### 2.17 BUILD INCREMENTALLY, EXCEPT BELOW THE LINE

Fix issues as they surface; do not try to perfect everything at once. **The exception:**
structural decisions — the data model and the money principles — must be right before
building, because everything sits on them and they are expensive to change later.
Everything above that line (screens, polish, features) is fixed as it comes up.

### 2.12 BUILD PROPERLY, AND TEACH

No shortcuts. Real research before technology decisions, tradeoffs explained so the
organizer learns *why*, not just *what*. Every significant decision gets its own
discussion and is recorded here.

### 2.13 DESIGN REFERENCE — MOBBIN MCP IS THE SANCTIONED SOURCE

Design direction is sourced from **real, shipped products** — not invented from scratch
and not guessed at from vague preference.

**Mobbin MCP** (official, ~600k real app screens) is the sanctioned tool. It connects
directly to Claude so references are pulled with the context of the actual codebase,
rather than pasted screenshots.

Connect in **both** places when the design phase begins:
- **Claude Code** — `claude mcp add mobbin --scope user --transport http https://api.mobbin.com/mcp`,
  then `/mcp` → select mobbin → Authenticate. This is the higher-value one: it can read
  the real codebase and design tokens while pulling references.
- **Claude Desktop / Web** — Customize → Connectors → Add → Browse connectors → Mobbin.
  Used for design discussion and choosing direction before implementation.

Requires a paid Mobbin plan. **Workflow:** design direction is chosen in discussion here,
then Claude Code implements it. Connect at the design phase, not before.

---

## 3. DECISIONS RECORD

| # | Decision | Status |
|---|---|---|
| D-1 | Rebuild as a configurable multi-cycle **platform**, Equb as first module | **SETTLED** |
| D-2 | Existing live data migrates intact — never destroyed | **SETTLED** |
| D-3 | Member Directory: identity permanent, participation per-cycle | **SETTLED** |
| D-4 | Organizer discretion is a first-class feature | **SETTLED** |
| D-5 | Zoom safety: winner configured beforehand in settings; wheel screen clean, no controls | **SETTLED** |
| D-6 | Configurable visibility controls for screen-sharing | **SETTLED (concept) — design pending** |
| D-7 | Planned vs actual cycle length both tracked | **SETTLED** |
| D-8 | Privacy boundary: progress shared; amounts, numbers, payouts private | **SETTLED** |
| D-9 | Winner selection is a planning tool (together/separate + which week); plan locked against reshuffle | **SETTLED** |
| D-10 | Messaging is state-aware with organizer-configurable templates; build on Telegram now, don't wait for Meta | **SETTLED** |
| D-11 | Equb is the test ground for Nexo Access (member + driver apps) | **SETTLED** |
| D-12 | Mobbin MCP is the sanctioned design-reference source; connect at design phase | **SETTLED** |
| D-13 | **Database: relational Postgres via hosted supabase.com (free tier), separate project from Nexo. Auth + RLS included. Idle-gap handled by a keep-alive scheduler + automated gap backups.** Reasoning: data is deeply relational; money needs ACID; queries must stay ad-hoc; scale irrelevant at 45 people; Supabase auth/RLS is the learning that transfers to Nexo; hosted (not self-hosted) because Equb must never share the PHI/BAA server and there is no value in operating a second server. | **SETTLED** |
| D-14 | Hosting and infrastructure (Vercel+Neon vs AWS) | **OPEN — own discussion** |
| D-15 | Financial command center design | **DESIGNED — approved** |
| D-16 | Money is truth; weeks credited, behind-count, status and late are all derived | **SETTLED** |
| D-17 | Payment allocation: oldest debt first, then current, then forward; partial = leftover; allocation previewed before commit | **SETTLED** |
| D-18 | Grid kept as the overview map; payment entry is a separate action with unmistakable save feedback | **SETTLED** |
| D-19 | Remove Request Review (unused). Collapse unpaid/late into one derived status. | **SETTLED** |
| D-20 | Mid-cycle joins cannot start before the cycle start date; organizer enters weeks committed, system calculates the finish week | **SETTLED** |
| D-21 | Member profile: edit weeks committed and contribution mid-cycle; all figures recalculate automatically | **SETTLED (concept) — design pending** |

**Flexibility rule (Oli, Aug 2026):** rules are judged by their *reasons*, not applied blindly.
Nexo's "open source first" doctrine exists for PHI, BAA, MCO review, and scale — none of
which apply here. Equb is low-risk, closed, max ~45 people, and **learning is the real
product**. Be professional and rigorous; do not be rigid.

**Rule:** nothing OPEN gets decided in passing. Each gets a real discussion with
researched options and tradeoffs, then is recorded here as SETTLED.

---

## 4. CURRENT STATE

**Live:** https://equb-app-hazel.vercel.app · Repo: github.com/firaoli85/-equb-app (public)
**Stack today:** Next.js 16, React 19, Prisma, Neon Postgres, Vercel, Tailwind
**Cycle 1:** 20 weeks planned from May 17 2026, 25 members, past week 7, several draws done

**Good — preserve:**
- Security foundation: server-side sessions, bcrypt PINs, cross-member isolation, OTP
  rate limiting, bank-standard idle/absolute timeouts
- Member portal design system (calm/premium, mobile-first, motion complete)
- `WeekPayout` as payout truth · correct core money math

**Broken or missing — drives the rebuild:**
- No configurability — start date, week count, tiers hardcoded
- No Member Directory — people trapped inside one cycle
- No planned-vs-actual tracking; mid-cycle joins not properly modeled
- Data model scars — duplicate/legacy columns and tables from incremental patching
- **No presentation layer** — admin dashboard is the wheel, not the financial picture
- Wheel page carries a hidden control (violates 2.4)
- Reshuffle has no awareness of committed winner selections (violates 2.3) — verified in
  `handleReshuffleAll`, which filters drawn numbers but not committed ones
- Zero tests on money logic
- Repo hygiene — committed skill libraries, dev logs, screenshot scripts

---

## 5. THE REBUILD PLAN

One part at a time. Each part ends with this document updated.

| Part | What | State |
|---|---|---|
| **1** | **The Brain** — this document | **DONE** |
| **2** | Presentation layer / Financial Command Center | Next to design |
| **3** | Data model rebuild — cycles, Member Directory, planned-vs-actual, retire scars | Pending (needs D-9) |
| **4** | Configurable cycle creation | Pending |
| **5** | Winner planning + Zoom-safe settings: together/separate, week assignment, locked plan, visibility controls | Pending |
| **6** | Tests on money logic | Pending |
| **7** | Repo hygiene + state-aware messaging system | Pending |

---

## 6. HOW WE WORK

- **Design in plain English first.** Discuss and agree before any code.
- **One part at a time.** No batching.
- **Claude writes the prompts and SQL; Oli runs them** in Claude Code / the DB console.
- **Oli runs git himself** — git commands are standalone copy-paste terminal blocks,
  never inside a Claude Code prompt.
- **Verify against live data before and after.** Counts prove changes; claims do not.
- **Decisions get recorded here**, not left in chat history.
- **Push back when the reasoning is wrong.** Honesty over agreement.
