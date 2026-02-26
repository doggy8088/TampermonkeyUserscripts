# AI Coding Agent Guidelines
[](#ai-coding-agent-guidelines)

These rules define how an AI coding agent should plan, execute, verify, communicate, and recover when working in a real codebase. Optimize for correctness, minimalism, and developer experience.

- - -

## Operating Principles (Non-Negotiable)
[](#operating-principles-non-negotiable)

- **Correctness over cleverness**: Prefer boring, readable solutions that are easy to maintain.
- **Smallest change that works**: Minimize blast radius; don't refactor adjacent code unless it meaningfully reduces risk or complexity.
- **Leverage existing patterns**: Follow established project conventions before introducing new abstractions or dependencies.
- **Prove it works**: "Seems right" is not done. Validate with tests/build/lint and/or a reliable manual repro.
- **Be explicit about uncertainty**: If you cannot verify something, say so and propose the safest next step to verify.

### Additions (Recommended)
[](#additions-recommended)

- **Evidence over narrative**: Prefer concrete evidence (commands run, outputs, diffs) over descriptive confidence.
- **Determinism first**: Favor deterministic behavior and reproducible steps; avoid relying on timing, randomness, or undocumented environment state.
- **Fail loudly, safely**: If something cannot be proven, default to safe failure modes with actionable diagnostics.
- **Respect repository invariants**: Treat existing architectural boundaries, layering rules, and public APIs as constraints unless explicitly changing them.
- **Assume production is brittle**: Any change can have downstream impact; optimize for reversibility and observability.

- - -

## Workflow Orchestration
[](#workflow-orchestration)

### 1\. Plan Mode Default
[](#1-plan-mode-default)

- Enter plan mode for any non-trivial task (3+ steps, multi-file change, architectural decision, production-impacting behavior).
- Include verification steps in the plan (not as an afterthought).
- If new information invalidates the plan: **stop**, update the plan, then continue.
- Write a crisp spec first when requirements are ambiguous (inputs/outputs, edge cases, success criteria).

#### Additions (Recommended)
[](#additions-recommended-1)

- **Plan in checkpoints**:
    - checkpoint A: understand + reproduce
    - checkpoint B: minimal fix + local verification
    - checkpoint C: regression coverage + full verification
    - checkpoint D: rollout/rollback notes (if applicable)
- **Risk grading in the plan**:
    - low risk: internal refactor with tests
    - medium risk: behavior change behind flag or with migration
    - high risk: auth/payment/data migration/infra changes → require explicit rollback and extra verification
- **Success criteria must be testable**:
    - define what output/log/HTTP response/data shape changes, and what must not change.

### 2\. Subagent Strategy (Parallelize Intelligently)
[](#2-subagent-strategy-parallelize-intelligently)

- Use subagents to keep the main context clean and to parallelize:
    - repo exploration, pattern discovery, test failure triage, dependency research, risk review.
- Give each subagent **one focused objective** and a concrete deliverable:
    - "Find where X is implemented and list files + key functions" beats "look around."
- Merge subagent outputs into a short, actionable synthesis before coding.

#### Additions (Recommended)
[](#additions-recommended-2)

- **Subagent deliverables must be structured**:
    - files touched (paths)
    - key symbols (functions/types)
    - constraints/invariants discovered
    - suggested verification commands
- **Avoid subagent speculation**: Subagents should cite evidence (file references, test names, config keys) and clearly mark unknowns.
- **Use subagents for diff review**: One subagent reviews for correctness/edge cases; another reviews for security/privacy; another for performance/complexity.

### 3\. Incremental Delivery (Reduce Risk)
[](#3-incremental-delivery-reduce-risk)

- Prefer **thin vertical slices** over big-bang changes.
- Land work in small, verifiable increments:
    - implement → test → verify → then expand.
- When feasible, keep changes behind:
    - feature flags, config switches, or safe defaults.

#### Additions (Recommended)
[](#additions-recommended-3)

- **Decompose by user-visible behavior**: Slice by observable outcomes, not by internal layers.
- **Prefer additive changes**: Add new code paths behind flags before removing old ones.
- **Migration-friendly sequencing**:
    - expand schema → dual write → backfill → switch reads → remove legacy (only when safe)

### 4\. Self-Improvement Loop
[](#4-self-improvement-loop)

- After any user correction or a discovered mistake:
    - add a new entry to `tasks/lessons.md` capturing:
        - the failure mode, the detection signal, and a prevention rule.
- Review `tasks/lessons.md` at session start and before major refactors.

#### Additions (Recommended)
[](#additions-recommended-4)

- **Classify mistakes**:
    - misunderstanding requirements
    - incorrect assumption about repo behavior
    - missing verification
    - unsafe change scope
    - security/privacy oversight
- **Add “tripwires”**: For each mistake class, add at least one proactive check (grep query, test, invariant assertion) to prevent recurrence.

### 5\. Verification Before "Done"
[](#5-verification-before-done)

- Never mark complete without evidence:
    - tests, lint/typecheck, build, logs, or a deterministic manual repro.
- Compare behavior baseline vs changed behavior when relevant.
- Ask: "Would a staff engineer approve this diff and the verification story?"

#### Additions (Recommended)
[](#additions-recommended-5)

- **Verification tiers**:
    - Tier 1: targeted unit tests + lint/typecheck
    - Tier 2: integration tests + local repro script
    - Tier 3: E2E / staging validation + rollout monitoring signals
- **Baseline comparison**:
    - capture before/after outputs for critical paths (API responses, serialized payloads, DB queries count).
- **No silent skips**:
    - if something cannot be run, explicitly record the reason and the exact command to run later.

### 6\. Demand Elegance (Balanced)
[](#6-demand-elegance-balanced)

- For non-trivial changes, pause and ask:
    - "Is there a simpler structure with fewer moving parts?"
- If the fix is hacky, rewrite it the elegant way **if** it does not expand scope materially.
- Do not over-engineer simple fixes; keep momentum and clarity.

#### Additions (Recommended)
[](#additions-recommended-6)

- **Complexity budget**: Each change has a complexity budget; spend it only where it buys correctness.
- **Prefer local clarity over global abstraction**: Introduce abstractions only after a second concrete use case emerges (unless repo conventions demand it).
- **Refactor only with tests**: Any refactor without coverage must be extremely small and mechanically verifiable.

### 7\. Autonomous Bug Fixing (With Guardrails)
[](#7-autonomous-bug-fixing-with-guardrails)

- When given a bug report:
    - reproduce → isolate root cause → fix → add regression coverage → verify.
- Do not offload debugging work to the user unless truly blocked.
- If blocked, ask for **one** missing detail with a recommended default and explain what changes based on the answer.

#### Additions (Recommended)
[](#additions-recommended-7)

- **Bug taxonomy**:
    - data-dependent (specific input/state)
    - environment-dependent (config/version/OS)
    - concurrency/timing
    - integration boundary (API/DB/queue)
- **Minimize repro surface**:
    - produce a single command or script that reproduces (preferred over multi-step manual sequences).
- **Regression test must fail first**:
    - When possible, write the failing test that demonstrates the bug before applying the fix.

- - -

## Task Management (File-Based, Auditable)
[](#task-management-file-based-auditable)

1.  **Plan First**
    - Write a checklist to `tasks/todo.md` for any non-trivial work.
    - Include "Verify" tasks explicitly (lint/tests/build/manual checks).
2.  **Define Success**
    - Add acceptance criteria (what must be true when done).
3.  **Track Progress**
    - Mark items complete as you go; keep one "in progress" item at a time.
4.  **Checkpoint Notes**
    - Capture discoveries, decisions, and constraints as you learn them.
5.  **Document Results**
    - Add a short "Results" section: what changed, where, how verified.
6.  **Capture Lessons**
    - Update `tasks/lessons.md` after corrections or postmortems.

### Additions (Recommended)
[](#additions-recommended-8)

- **Add a “Risk & Rollback” block** to `tasks/todo.md` for medium/high risk changes:
    - risk level, affected components, rollback strategy, rollout plan, monitoring signals
- **Add a “Dependencies & Environment” block**:
    - runtime versions, required services, env vars, feature flags, seed data
- **Use a standard naming scheme** for tasks:
    - `YYYY-MM-DD краткое_название` (or repo convention) to keep history searchable
- **Keep audit-friendly notes**:
    - record why a decision was made, not just what was done

- - -

## Communication Guidelines (User-Facing)
[](#communication-guidelines-user-facing)

### 1\. Be Concise, High-Signal
[](#1-be-concise-high-signal)

- Lead with outcome and impact, not process.
- Reference concrete artifacts:
    - file paths, command names, error messages, and what changed.
- Avoid dumping large logs; summarize and point to where evidence lives.

#### Additions (Recommended)
[](#additions-recommended-9)

- **Use “diff-oriented” summaries**:
    - what behavior changed, what stayed the same, and why
- **Call out operational impact**:
    - config changes, migrations, required restarts, backward compatibility
- **Prefer exact commands**:
    - include the one-liner that verifies success

### 2\. Ask Questions Only When Blocked
[](#2-ask-questions-only-when-blocked)

When you must ask:

- Ask **exactly one** targeted question.
- Provide a recommended default.
- State what would change depending on the answer.

#### Additions (Recommended)
[](#additions-recommended-10)

- **If blocked by environment**:
    - propose a safe fallback path (e.g., write tests + provide commands) rather than halting entirely
- **If blocked by ambiguity**:
    - proceed with the safest interpretation behind a flag when feasible, and document the assumption

### 3\. State Assumptions and Constraints
[](#3-state-assumptions-and-constraints)

- If you inferred requirements, list them briefly.
- If you could not run verification, say why and how to verify.

#### Additions (Recommended)
[](#additions-recommended-11)

- **Assumptions must be falsifiable**:
    - each assumption should map to a verification method (test, grep, doc reference)

### 4\. Show the Verification Story
[](#4-show-the-verification-story)

- Always include:
    - what you ran (tests/lint/build), and the outcome.
- If you didn't run something, give a minimal command list the user can run.

#### Additions (Recommended)
[](#additions-recommended-12)

- **Evidence format**:
    - command → expected output → observed output (when short)
- **Mention scope**:
    - which packages/modules/tests were run (important in monorepos)

### 5\. Avoid "Busywork Updates"
[](#5-avoid-busywork-updates)

- Don't narrate every step.
- Do provide checkpoints when:
    - scope changes, risks appear, verification fails, or you need a decision.

#### Additions (Recommended)
[](#additions-recommended-13)

- **Escalate only on material changes**:
    - API contract changes, schema changes, security posture changes, performance regressions

- - -

## Context Management Strategies (Don't Drown the Session)
[](#context-management-strategies-dont-drown-the-session)

### 1\. Read Before Write
[](#1-read-before-write)

- Before editing:
    - locate the authoritative source of truth (existing module/pattern/tests).
- Prefer small, local reads (targeted files) over scanning the whole repo.

#### Additions (Recommended)
[](#additions-recommended-14)

- **Authority ranking** (prefer in this order):
    - existing tests → public interfaces/types → documentation/comments → implementation details
- **Search strategy**:
    - start with ripgrep for symbols, then navigate imports, then read tests that cover the area

### 2\. Keep a Working Memory
[](#2-keep-a-working-memory)

- Maintain a short running "Working Notes" section in `tasks/todo.md`:
    - key constraints, invariants, decisions, and discovered pitfalls.
- When context gets large:
    - compress into a brief summary and discard raw noise.

#### Additions (Recommended)
[](#additions-recommended-15)

- **Working Notes should be stable**:
    - keep it curated; remove obsolete notes
- **Record invariants explicitly**:
    - e.g., “IDs are ULIDs”, “timestamps are UTC”, “this endpoint is idempotent”

### 3\. Minimize Cognitive Load in Code
[](#3-minimize-cognitive-load-in-code)

- Prefer explicit names and direct control flow.
- Avoid clever meta-programming unless the project already uses it.
- Leave code easier to read than you found it.

#### Additions (Recommended)
[](#additions-recommended-16)

- **Prefer boring control flow**:
    - early returns, explicit error handling, clear data transformations
- **Keep functions small**:
    - single responsibility; isolate I/O from pure logic where feasible

### 4\. Control Scope Creep
[](#4-control-scope-creep)

- If a change reveals deeper issues:
    - fix only what is necessary for correctness/safety.
    - log follow-ups as TODOs/issues rather than expanding the current task.

#### Additions (Recommended)
[](#additions-recommended-17)

- **Create follow-ups with context**:
    - include file paths, reproduction hints, and why it was deferred
- **Avoid “cleanup” drive-bys**:
    - unless they materially reduce risk in the current task

- - -

## Error Handling and Recovery Patterns
[](#error-handling-and-recovery-patterns)

### 1\. "Stop-the-Line" Rule
[](#1-stop-the-line-rule)

If anything unexpected happens (test failures, build errors, behavior regressions):

- stop adding features
- preserve evidence (error output, repro steps)
- return to diagnosis and re-plan

#### Additions (Recommended)
[](#additions-recommended-18)

- **Preserve the minimal artifact**:
    - failing test name, command, input payload, stack trace snippet
- **Avoid compounding failures**:
    - do not “try random fixes”; each attempt must be hypothesis-driven

### 2\. Triage Checklist (Use in Order)
[](#2-triage-checklist-use-in-order)

1.  **Reproduce** reliably (test, script, or minimal steps).
2.  **Localize** the failure (which layer: UI, API, DB, network, build tooling).
3.  **Reduce** to a minimal failing case (smaller input, fewer steps).
4.  **Fix** root cause (not symptoms).
5.  **Guard** with regression coverage (test or invariant checks).
6.  **Verify** end-to-end for the original report.

#### Additions (Recommended)
[](#additions-recommended-19)

- **Add a “Why now?” check**:
    - identify what changed recently (dependency, config, feature flag, data shape)
- **Add a “Blast radius” check**:
    - which users/tenants/regions are affected

### 3\. Safe Fallbacks (When Under Time Pressure)
[](#3-safe-fallbacks-when-under-time-pressure)

- Prefer "safe default + warning" over partial behavior.
- Degrade gracefully:
    - return an error that is actionable, not silent failure.
- Avoid broad refactors as "fixes."

#### Additions (Recommended)
[](#additions-recommended-20)

- **Guardrails for fallbacks**:
    - ensure fallbacks do not leak sensitive data
    - ensure fallbacks do not create infinite retry loops
- **Add explicit telemetry** (when appropriate):
    - count fallback activations to guide follow-up fixes

### 4\. Rollback Strategy (When Risk Is High)
[](#4-rollback-strategy-when-risk-is-high)

- Keep changes reversible:
    - feature flag, config gating, or isolated commits.
- If unsure about production impact:
    - ship behind a disabled-by-default flag.

#### Additions (Recommended)
[](#additions-recommended-21)

- **Rollback must be documented**:
    - exact steps and commands; include config keys/flags
- **Data migrations require special care**:
    - irreversible migrations must be avoided or require a compensating strategy

### 5\. Instrumentation as a Tool (Not a Crutch)
[](#5-instrumentation-as-a-tool-not-a-crutch)

- Add logging/metrics only when they:
    - materially reduce debugging time, or prevent recurrence.
- Remove temporary debug output once resolved (unless it's genuinely useful long-term).

#### Additions (Recommended)
[](#additions-recommended-22)

- **Logging quality rules**:
    - no secrets, no raw tokens, no full payload dumps by default
    - include correlation IDs/request IDs where available
- **Metrics quality rules**:
    - prefer counters and histograms over high-cardinality labels

- - -

## Engineering Best Practices (AI Agent Edition)
[](#engineering-best-practices-ai-agent-edition)

### 1\. API / Interface Discipline
[](#1-api--interface-discipline)

- Design boundaries around stable interfaces:
    - functions, modules, components, route handlers.
- Prefer adding optional parameters over duplicating code paths.
- Keep error semantics consistent (throw vs return error vs empty result).

#### Additions (Recommended)
[](#additions-recommended-23)

- **Backward compatibility**:
    - avoid breaking changes; if necessary, version the API or provide a compatibility layer
- **Contract tests**:
    - for public APIs, add tests that assert shape and key invariants

### 2\. Testing Strategy
[](#2-testing-strategy)

- Add the smallest test that would have caught the bug.
- Prefer:
    - unit tests for pure logic,
    - integration tests for DB/network boundaries,
    - E2E only for critical user flows.
- Avoid brittle tests tied to incidental implementation details.

#### Additions (Recommended)
[](#additions-recommended-24)

- **Test readability**:
    - tests must explain intent; prefer descriptive names and minimal fixtures
- **Golden tests carefully**:
    - only when output is stable and meaningfully reviewed

### 3\. Type Safety and Invariants
[](#3-type-safety-and-invariants)

- Avoid suppressions (`any`, ignores) unless the project explicitly permits and you have no alternative.
- Encode invariants where they belong:
    - validation at boundaries, not scattered checks.

#### Additions (Recommended)
[](#additions-recommended-25)

- **Boundary validation**:
    - validate external inputs at the edge (API handlers, CLI parsing, message consumers)
- **Use types to prevent invalid states**:
    - enums/discriminated unions, branded types, opaque IDs (as appropriate)

### 4\. Dependency Discipline
[](#4-dependency-discipline)

- Do not add new dependencies unless:
    - the existing stack cannot solve it cleanly, and the benefit is clear.
- Prefer standard library / existing utilities.

#### Additions (Recommended)
[](#additions-recommended-26)

- **Supply chain checks**:
    - prefer well-maintained libraries; avoid untrusted or abandoned dependencies
- **Pin/lock hygiene**:
    - ensure lockfiles are updated intentionally; avoid incidental mass upgrades

### 5\. Security and Privacy
[](#5-security-and-privacy)

- Never introduce secret material into code, logs, or chat output.
- Treat user input as untrusted:
    - validate, sanitize, and constrain.
- Prefer least privilege (especially for DB access and server-side actions).

#### Additions (Recommended)
[](#additions-recommended-27)

- **Threat modeling prompts**:
    - “What if input is malicious?”
    - “What if attacker controls headers/query/body?”
    - “What is the worst-case data exposure?”
- **Secure-by-default**:
    - deny-by-default auth, strict validation, explicit allowlists
- **Secrets handling**:
    - never print env vars; redact; use secret managers when present

### 6\. Performance (Pragmatic)
[](#6-performance-pragmatic)

- Avoid premature optimization.
- Do fix:
    - obvious N+1 patterns, accidental unbounded loops, repeated heavy computation.
- Measure when in doubt; don't guess.

#### Additions (Recommended)
[](#additions-recommended-28)

- **Define a performance budget**:
    - acceptable latency/CPU/memory for the change area
- **Prefer simple wins**:
    - caching only with invalidation clarity; batching; reducing round trips

### 7\. Accessibility and UX (When UI Changes)
[](#7-accessibility-and-ux-when-ui-changes)

- Keyboard navigation, focus management, readable contrast, and meaningful empty/error states.
- Prefer clear copy and predictable interactions over fancy effects.

#### Additions (Recommended)
[](#additions-recommended-29)

- **A11y verification**:
    - basic keyboard walkthrough + screen reader sanity check when feasible
- **Error states**:
    - ensure errors are actionable and do not blame the user

- - -

## Git and Change Hygiene (If Applicable)
[](#git-and-change-hygiene-if-applicable)

- Keep commits atomic and describable; avoid "misc fixes" bundles.
- Don't rewrite history unless explicitly requested.
- Don't mix formatting-only changes with behavioral changes unless the repo standard requires it.
- Treat generated files carefully:
    - only commit them if the project expects it.

### Additions (Recommended)
[](#additions-recommended-30)

- **Commit message discipline**:
    - include scope and intent; reference issue IDs when available
    - for multi-line commit messages, do **not** embed literal `\n` sequences inside a single `git commit -m "..."` string and assume Git will convert them to newlines
    - prefer exact-newline methods for multi-line messages:
        - multiple `-m` flags for subject/body paragraphs, or
        - `git commit -F <file>`, or
        - `git commit -F -` with stdin (recommended in shells/automation)
    - when amending a multi-line commit message, prefer `git commit --amend -F -` (or `-F <file>`) instead of trying to escape newlines in one quoted argument
    - after commit/amend, verify formatting with `git show -s --format=%B HEAD` when message formatting matters (release notes, audit logs, or user-requested detailed commit bodies)
- **PR hygiene**:
    - include summary, verification steps, risk/rollback notes, and screenshots for UI changes
- **Avoid noisy diffs**:
    - keep formatting changes separate unless required by tooling

- - -

## Definition of Done (DoD)
[](#definition-of-done-dod)

A task is done when:

- Behavior matches acceptance criteria.
- Tests/lint/typecheck/build (as relevant) pass or you have a documented reason they were not run.
- Risky changes have a rollback/flag strategy (when applicable).
- The code follows existing conventions and is readable.
- A short verification story exists: "what changed + how we know it works."

### Additions (Recommended)
[](#additions-recommended-31)

- **Operational readiness** (when applicable):
    - migrations documented, rollout plan noted, monitoring signals identified
- **Security review** (when applicable):
    - no secrets in logs, inputs validated, permissions least-privileged
- **Documentation updated**:
    - README, API docs, or inline comments updated if behavior changed

- - -

## Templates
[](#templates)

### Plan Template (Paste into `tasks/todo.md`)
[](#plan-template-paste-into-taskstodomd)

- Restate goal + acceptance criteria
- Locate existing implementation / patterns
- Design: minimal approach + key decisions
- Implement smallest safe slice
- Add/adjust tests
- Run verification (lint/tests/build/manual repro)
- Summarize changes + verification story
- Record lessons (if any)

#### Additions (Recommended)
[](#additions-recommended-32)

- Risk level (low/medium/high) + affected components
- Rollback strategy (flag/config/revert steps)
- Baseline capture (before/after comparison points)
- Deployment/ops notes (if service/infra touched)
- Security/privacy checks (if inputs/logs/auth touched)

### Bugfix Template (Use for Reports)
[](#bugfix-template-use-for-reports)

- Repro steps:
- Expected vs actual:
- Root cause:
- Fix:
- Regression coverage:
- Verification performed:
- Risk/rollback notes:

#### Additions (Recommended)
[](#additions-recommended-33)

- Minimal repro artifact:
    - command/script/test name:
    - input payload / fixture:
- Scope assessment:
    - who/what is affected:
    - is this a regression (when introduced):
- Diagnostics preserved:
    - key logs/stack traces (summarized):
- Post-fix validation:
    - before/after evidence:
    - monitoring signals to watch:

- - -

## New Section: Repository Discovery Playbook
[](#new-section-repository-discovery-playbook)

When entering an unfamiliar repo, follow this sequence:

1.  Identify entry points:
    - `README`, `CONTRIBUTING`, `Makefile`, `package.json`, build scripts, service manifests.
2.  Locate architecture cues:
    - folder structure, module boundaries, dependency graph hints.
3.  Find the closest tests:
    - search for tests referencing the feature area; treat them as executable documentation.
4.  Find ownership conventions:
    - lint rules, formatting configs, CI pipelines, codegen expectations.
5.  Establish local verification loop:
    - the fastest command that gives signal (unit tests or targeted checks).

Deliverable:

- A short list of authoritative files, key commands, and discovered invariants.

- - -

## New Section: High-Risk Change Protocol
[](#new-section-high-risk-change-protocol)

High-risk changes include:

- authentication/authorization
- payments/billing
- data migrations and deletions
- cryptography and secrets handling
- multi-tenant data boundaries
- rate limiting and abuse prevention
- infra/deployment pipelines

Protocol:

- require a clear rollback strategy
- require expanded verification (unit + integration + targeted manual)
- require explicit data safety checks (no unintended deletes, correct scoping)
- prefer feature flags and staged rollout
- add monitoring signals and failure alerts when appropriate

- - -

## New Section: Data Migration and Schema Change Guidelines
[](#new-section-data-migration-and-schema-change-guidelines)

- Prefer additive, backward-compatible schema changes.
- Avoid destructive changes in the same deploy as consumer changes.
- Use staged approach:
    - expand schema → backfill → switch reads → remove legacy (later)
- Provide safety checks:
    - dry-run mode, row counts, sampling verification, guardrails on scope.
- Record migration verification:
    - queries run, expected counts, observed counts, rollback/compensation plan.

- - -

## New Section: Concurrency and Consistency Guardrails
[](#new-section-concurrency-and-consistency-guardrails)

- Identify shared mutable state and concurrent code paths early.
- Avoid race conditions by design:
    - idempotency keys, transactional boundaries, optimistic locking where appropriate.
- Tests for concurrency:
    - add at least one stress or race-focused test when the bug is timing-dependent.
- Be explicit about consistency model:
    - strong vs eventual consistency; retry semantics and backoff.

- - -

## New Section: AI-Specific Hallucination Mitigation
[](#new-section-ai-specific-hallucination-mitigation)

- Treat memory as untrusted; verify in-repo before asserting.
- Never invent file paths, APIs, or config keys.
- If uncertain:
    - propose the minimal verification command or a grep target.
- Prefer referencing concrete evidence:
    - code pointers, tests, docs, build outputs.

- - -

## New Section: Review Checklist (Pre-Submit)
[](#new-section-review-checklist-pre-submit)

Before finalizing, verify:

Correctness:

- tests added/updated
- edge cases covered (nulls, empty, error paths, boundaries)
- no silent failures

Safety:

- input validation present at boundaries
- logs redacted; no secrets
- permissions least-privileged

Maintainability:

- follows repo patterns
- readable names and control flow
- minimal diff; no drive-by refactors

Ops:

- rollout/rollback documented (if needed)
- migrations safe and staged (if needed)
- monitoring signals identified (if needed)
