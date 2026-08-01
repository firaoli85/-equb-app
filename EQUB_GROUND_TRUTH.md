# EQUB GROUND TRUTH

**The single source of truth for the platform.**
Read this first, every session, before touching anything.

| | |
|---|---|
| **Owner** | Firaoli ("Oli") Seboka — sole organizer and admin |
| **Status** | Rebuild era — Phase 1 (Brain established) |
| **Live cycle** | Cycle 1, 20 weeks planned, started May 17 2026, 25 members — **DATA IS SACRED, MUST SURVIVE THE REBUILD** |
| **Horizon** | 2–3+ more years. Build for the long run, not for one cycle. |
| **Version** | v2 — July 2026 |

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

### 2.3 ZOOM SAFETY — THE WHEEL SCREEN IS CLEAN BY DEFAULT

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

### 2.4 PEOPLE ARE PERMANENT — PARTICIPATION IS PER-CYCLE

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

### 2.5 EVERYTHING CONFIGURABLE — NOTHING HARDCODED

Starting a new cycle asks: start date, number of weeks, which people from the directory,
and each participant's own contribution (they are **not** equal). Weeks and dates
generate automatically. Member count is independent of week count. Fee rules and
contribution tiers are configuration, not code.

### 2.6 PLANNED LENGTH vs ACTUAL LENGTH — TRACK BOTH

A cycle is *planned* as 20 weeks. Reality may take 22 — someone joins late, a week is
skipped, life happens. The system must:

- **Respect the plan:** 20 weeks was the commitment, and the organizer keeps control of it
- **Track the truth:** if it is actually running longer, show the real week
- **Calculate per member:** for anyone joining at any point, compute what they owe and
  when *they* finish — regardless of when the cycle started
- **Keep the record** of what actually happened, in the archive

Mid-cycle joins must never break the math or anyone else's standing.

### 2.7 PRIVACY BOUNDARY (SETTLED)

**Shared between members** — payment progress, for accountability and the social nature
of an Equb. Members see who is keeping up.

**Never shared between members** — contribution amounts, lucky numbers, payout amounts,
phone numbers, PINs, who won which draw (numbers only, never names).

The social layer stays. Equb is friends doing this together; minimal friendly visibility
is part of the point.

### 2.8 CLEAN DELETE, READABLE ARCHIVE

Ending a cycle means **wipe it clean** to start fresh — not soft-delete, not lingering
state. But **before** wiping, the archive produces a readable record: who paid what, who
was paid out, how much, when — human-readable, not a raw JSON blob. Past cycles remain
viewable.

### 2.9 SAVE FEEDBACK MUST BE UNMISTAKABLE

Every action gives a clear result — obvious confirmation on success, visible reason on
failure. Never leave doubt about whether something saved.

### 2.10 BUILD PROPERLY, AND TEACH

No shortcuts. Real research before technology decisions, tradeoffs explained so the
organizer learns *why*, not just *what*. Every significant decision gets its own
discussion and is recorded here.

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
| D-9 | Database technology (relational vs document — Postgres / MongoDB / DynamoDB) | **OPEN — own discussion, research required** |
| D-10 | Hosting and infrastructure (Vercel+Neon vs AWS) | **OPEN — own discussion** |
| D-11 | Notification / messaging system (Google-based sending working; Twilio & Meta approval painful) | **OPEN — own discussion** |
| D-12 | Financial command center design | **OPEN — next to design** |

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
- Wheel page carries a hidden control (violates 2.3)
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
| **5** | Zoom-safe settings: pre-configured winner + visibility controls | Pending |
| **6** | Tests on money logic | Pending |
| **7** | Repo hygiene + notification system | Pending (needs D-11) |

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
