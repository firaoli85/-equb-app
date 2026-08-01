# EQUB GROUND TRUTH

**The single source of truth for the Equb platform.**
Read this first, every session, before touching anything.

| | |
|---|---|
| **Owner** | Firaoli ("Oli") Seboka — sole organizer and admin |
| **Status** | Rebuild era — Phase 1 (Brain established) |
| **Live cycle** | Cycle 1, 20 weeks, started May 17 2026, 25 members — **DATA IS SACRED, MUST SURVIVE THE REBUILD** |
| **Horizon** | 2–3+ more years of cycles. Build for the long run, not for one cycle. |
| **Last updated** | July 2026 |

---

## 0. WHY THIS DOCUMENT EXISTS

The first build grew as a pile of features with no organizing brain. Decisions lived in
chat history, nothing was written down, the data model accumulated scars, and the app
hardcoded one specific cycle. The result worked but could not be driven — only pushed.

This document ends that. Every principle, every decision, and every open question lives
here. It is law. If code and this document disagree, this document is right and the code
is wrong.

**Working doctrine:** bold on architecture, careful on data. We rebuild the structure
without mercy. We do not lose a single recorded payment, payout, or member.

---

## 1. WHAT THIS IS

**Not** "an app for my Equb." **A configurable Equb platform** that runs any Equb cycle,
for years, for this organizer.

An Equb is an Ethiopian rotating savings group. Members contribute a fixed amount every
week. Each week, one member receives the collected pot. Over the full cycle, everyone
receives exactly once. It runs on trust, and the organizer carries the risk.

**The organizer's real job is not collecting money. It is managing risk and trust.**
The software exists to support that judgment, not to replace it.

---

## 2. CORE PRINCIPLES (LAW)

### 2.1 ORGANIZER DISCRETION IS A FEATURE, NOT A HACK

The organizer decides who receives the payout each week. This is legitimate, standard
Equb practice, and it is the reason six years have run without loss.

**The risk curve — the actual logic behind the discretion:**

| Cycle stage | Risk if an unproven member wins | Organizer behavior |
|---|---|---|
| **Early weeks** | HIGH — they take the full pot and still owe 15+ weeks. If their finances break, the group absorbs it. | Steer toward trusted, proven, financially stable members. |
| **Around halfway** | FALLING — they have already proven months of reliability and owe fewer weeks. | Steering relaxes. |
| **Late weeks** | LOW — they owe only a few weeks and are deeply invested. | **No steering. Whoever the wheel picks, wins.** |

This is risk management, not favoritism. The tool must make it effortless and invisible.

**Requirements that follow:**
- Admin can set which member(s) the wheel will select, ahead of a draw.
- The wheel animation must look completely genuine to everyone watching.
- **SCREEN-SHARE SAFETY IS NON-NEGOTIABLE.** Draws happen live on Zoom with the
  organizer screen-sharing. Any control, list, or indicator revealing the selection must
  be hidden by default and only revealed by deliberate action (never on by accident).
- Selection logic and data must live server-side. It must never reach the browser where
  a member could inspect it.

### 2.2 PEOPLE ARE PERMANENT — PARTICIPATION IS PER-CYCLE

Members are real people the organizer knows. They are not rows belonging to one cycle.

| Permanent (the person, forever, editable but persistent) | Per-cycle (chosen fresh each cycle) |
|---|---|
| Amharic name | Weekly contribution amount |
| English name (first / last) | Lucky / wheel number |
| Phone number | Whether they are in this cycle at all |
| Contact details, history across cycles | Their payout week / draw outcome |

**The Member Directory** persists across all cycles. Starting a new cycle means picking
people from the directory — *"Add Tizita to this cycle?"* — never re-typing anyone. A
person may sit out cycles 1–3 and join cycle 4; the directory remembers them.

A member's contribution changes between cycles because their income changes. That is
normal and expected.

### 2.3 EVERYTHING CONFIGURABLE — NOTHING HARDCODED

Starting a new cycle asks the organizer:
- Start date
- Number of weeks (10, 20, anything — weeks and dates generate automatically)
- Which people from the directory join
- Each participant's own weekly contribution (they are **not** all equal)

Member count is independent of week count. Fee rules, contribution tiers, and cycle
length are configuration, not code. No hardcoded start date. No hardcoded 20 weeks. No
hardcoded contribution tiers.

### 2.4 MID-CYCLE JOINS MUST NOT BREAK ANYTHING

A friend joining in week 5 is normal. The system must handle partial participation
cleanly — their obligations, their standing, and the pot math all adjust correctly.

### 2.5 THE ORGANIZER'S FINANCIAL COMMAND CENTER

The organizer lives in this on weekends. The primary admin surface is **the money**, not
the wheel. It must answer, at a glance:

- What has come in this week / this cycle?
- Who has paid, who owes, who is late, who is deferred?
- Who has been paid out, and how much?
- **The cash position:** money collected vs money disbursed, and the difference.

**The defining example:** *"We are in week 7, but only 5 people have been paid out. The
group is holding 2 weeks' worth of money that has not gone out yet."* The system must
show that surplus/deficit explicitly and continuously.

### 2.6 PRIVACY BOUNDARY (SETTLED)

**Shared between members** — payment progress, for accountability and the social nature
of an Equb. Members see who is keeping up.

**Never shared between members** — contribution amounts, lucky numbers, payout amounts,
phone numbers, PINs, who won which draw (numbers only, never names).

The social layer stays. Equb is friends doing this together; minimal friendly visibility
is part of the point.

### 2.7 CLEAN DELETE, READABLE ARCHIVE

Ending a cycle means **wipe it clean** to start fresh — not soft-delete, not lingering
state. But **before** wiping, the archive must produce a readable record: who paid what,
who was paid out, how much, when — human-readable, not a raw JSON blob.

### 2.8 SAVE FEEDBACK MUST BE UNMISTAKABLE

When the organizer marks a payment or takes any action, the result must be obvious —
clear confirmation on success, visible reason on failure. Never leave doubt about whether
something saved.

### 2.9 BUILD PROPERLY, AND TEACH

No shortcuts. Real research before technology decisions, with tradeoffs explained so the
organizer learns *why*, not just *what*. Every significant decision gets its own
discussion and is recorded here.

---

## 3. DECISIONS RECORD

| # | Decision | Status |
|---|---|---|
| D-1 | Rebuild as a configurable multi-cycle platform, not a single hardcoded cycle | **SETTLED** |
| D-2 | Existing live data (25 members, payments, payouts) migrates intact — never destroyed | **SETTLED** |
| D-3 | Member Directory: identity permanent, participation per-cycle | **SETTLED** |
| D-4 | Organizer discretion is a first-class feature with screen-share safety | **SETTLED** |
| D-5 | Privacy boundary: progress shared; amounts, numbers, payouts private | **SETTLED** |
| D-6 | Database technology (relational vs document — Postgres / MongoDB / DynamoDB) | **OPEN — own discussion, research required** |
| D-7 | Hosting and infrastructure (current Vercel+Neon vs AWS, which is available) | **OPEN — own discussion** |
| D-8 | Notification / messaging system (Google-based sending already working; Twilio & Meta approval painful) | **OPEN — own discussion** |
| D-9 | Financial command center design | **OPEN — next part to design** |

**Rule:** nothing in the OPEN list gets decided in passing. Each gets a real discussion
with researched options and tradeoffs, then is recorded here as SETTLED.

---

## 4. CURRENT STATE (as of the rebuild starting)

**Live:** https://equb-app-hazel.vercel.app · Repo: github.com/firaoli85/-equb-app (public)
**Stack today:** Next.js 16, React 19, Prisma, Neon Postgres, Vercel, Tailwind
**Cycle 1:** 20 weeks from May 17 2026, 25 members, ~week 7+, several draws completed

**What is genuinely good and should be preserved:**
- Security foundation: server-side sessions, bcrypt PINs, cross-member isolation,
  OTP rate limiting, bank-standard idle/absolute timeouts
- Member portal design system (calm/premium, mobile-first, motion pass complete)
- `WeekPayout` table as payout truth
- Correct core money math

**What is broken or missing (drives the rebuild):**
- No configurability — start date, week count, tiers all hardcoded
- No Member Directory — people are trapped inside one cycle
- Data model scars — duplicate/legacy columns and tables from incremental patching
- No financial command center — the admin dashboard is the wheel, not the money
- Zero tests on money logic
- Repo hygiene — committed skill libraries, dev logs, screenshot scripts

---

## 5. THE REBUILD PLAN

Parts are discussed and executed **one at a time**. Each part ends with this document
updated.

| Part | What | State |
|---|---|---|
| **1** | **The Brain** — this document | **DONE** |
| **2** | Financial Command Center — the money at a glance | Next to design |
| **3** | Data model rebuild — cycles, Member Directory, retire legacy scars | Pending (needs D-6) |
| **4** | Configurable cycles — creation wizard, any weeks, any contributions | Pending |
| **5** | Tests on money logic | Pending |
| **6** | Repo hygiene + notification system | Pending (needs D-8) |

---

## 6. HOW WE WORK

- **Design in plain English first.** Discuss and agree before any code.
- **One part at a time.** No batching.
- **Claude writes the prompts and SQL; Oli runs them** in Claude Code / the DB console.
- **Oli runs git himself** — git commands are always standalone copy-paste terminal
  blocks, never inside a Claude Code prompt.
- **Verify against live data before and after.** Counts prove changes; claims do not.
- **Decisions get recorded here**, not left in chat history.
- **Push back when the reasoning is wrong.** Honesty over agreement.
