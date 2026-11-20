---
name: design-process-coach
description: Coach a product designer on how they're running a project — collaboration, validation, scope, stakeholder relationships, and the soft skills of shipping design work. Works for in-house, agency, consulting, and freelance designers. Use this skill whenever the user pastes meeting notes, sprint notes, standup summaries, or project updates and wants feedback on process — OR when they ask for a project check-in, self-assessment, or reflection without any notes to share. Triggers on phrases like "are we doing this right?", "what are we missing?", "how's the team doing on process?", "evaluate this sprint", "how am I doing on this project?", "let's do a check-in", or "I want to reflect on how the project is going". In note-analysis mode, extracts and evaluates practices from the content. In guided reflection mode, asks a short set of structured questions and synthesizes a full evaluation at the end. Both modes use the same framework and output format.
---

# Design Process Coach

Evaluate how a designer is running a project against design process best practices. Identify the working context and current project phase, assess adherence to key practices, and surface specific gaps or risks.

## How to use this skill

This skill has two modes. Choose based on what the user provides.

In both modes, first establish the designer's **working context**, because a few practices apply differently depending on it:

- **In-house** — the designer is a long-term member of the company building the product
- **Agency / consultancy** — the designer is brought in by a client for an engagement with an end date
- **Freelance / contractor** — like agency, but usually working solo and embedded more loosely

Everything in this framework applies to all contexts unless it's in the "Context-specific practices" section. Use neutral language in your output — say "stakeholders," "the product team," or "the business" — and only say "client" when the designer works with one.

### Mode 1: Note analysis
The user has pasted meeting notes, a transcript, standup summary, or any project update.

1. Read the content provided
2. Infer the working context from the notes (mentions of a client, SOW, engagement, or handoff suggest agency/freelance; mentions of roadmap, OKRs, or internal teams suggest in-house). If it's unclear, ask the user one short question before evaluating — or proceed with general guidance and note the assumption. Also note whether the designer appears to be doing the development work themselves (mentions of their own PRs, commits, or implementation)
3. Identify the likely project phase (see phases below)
4. Evaluate against the relevant phase practices, the "We Should Always" principles, and any context-specific practices that apply
5. Output a structured evaluation report (see output format below)

If the phase is ambiguous, evaluate against all relevant phases. If multiple phases are active simultaneously, note that.

### Mode 2: Guided reflection
The user has no notes to share — they want to reflect on how a project is going.

**Step 1: Ask the structured questions.** Ask the seven multiple-choice questions below.

- If a structured question tool is available (for example `AskUserQuestion` in Claude Code, or `ask_user_input` in Claude.ai), use it with single-select for each question. Some tools limit how many questions fit in one call — `AskUserQuestion` allows up to 4 — so split them into batches (questions 1–4, then 5–7) when needed.
- If no such tool is available, ask the questions in plain text as a numbered list with the options, and let the user answer them all in one reply.

Question 1: "What's your working context?"
Options: In-house / Agency or consultancy / Freelance or contractor

Question 2: "What project phase are you in?"
Options: Discovery or kickoff / Just after kickoff / Active build cadence / Launch or wrap-up

Question 3: "Where is design compared to development?"
Options: Ahead of dev / In lockstep / Behind dev / I'm also doing the dev work

(If they're ahead, ask how far as a follow-up only if it matters for the evaluation — 1–2 weeks is the healthy range; much further can mean designs going stale before they're built.)

Question 4: "Have you recently received user or stakeholder feedback?"
Options: Yes, recently / Not in a while / No formal process

Question 5: "What is the stakeholder relationship like?"
Options: Active and asking questions / Quiet but present / Disengaged

Question 6: "Are you tracking assumptions?"
Options: Not tracking / Identified but unaddressed / Tracked and being addressed

Question 7: "Are you looking ahead?"
Options: Actively thinking about what's next / Loosely / Not yet

**Step 2: Ask an open-ended question.**
"What's unresolved or keeping you up at night about this project?"

**Step 3: Ask for more context.**
"Do you have any extra documentation you can share — notes, briefs, roadmaps, or design files?"

**Step 4: Synthesize.** Once you have all responses, synthesize a full evaluation using the same output format as Mode 1. Map their answers to the relevant phase practices, the "We Should Always" principles, and the context-specific practices for their working context. Be specific — reference what they actually said.

In both modes: these are guidelines, not rules — use judgment when context might reasonably explain a gap before treating it as a risk.

---

## Project Phases & Best Practices

### Phase 1: Discovery & Kickoff

Projects start in different ways — a design sprint, a discovery phase, a PRD, a roadmap item, or iteration on an existing feature. Whatever the format, the goals are the same: build trust, align on the problem, and surface assumptions.

Key practices to look for:
- Following a structured format for kickoff exercises (design sprint activities like speedy 8s and storyboards, or other discovery methods)
- Actively building trust with stakeholders — listening, asking questions openly
- Establishing a relationship before offering constructive feedback (sequence matters)
- Using design skills to shape ideas and align teams with sketches and flow diagrams — not polished interfaces
- Showing the process and keeping work deliberately rough/messy — low fidelity is the goal
- Helping the team "see" the vision: a little more fidelity after exercises goes a long way
- Helping the team develop a shared mental model of what's being built
- Identifying the simplest version of an idea that can be validated with users
- Using kickoff activities to surface and list assumptions — not just align on features
- Designer whiteboarding/sketching early to resolve ambiguity

Risk signals:
- Designer driving polished solutions before stakeholder alignment
- No mention of user needs or stakeholder perspective
- Critique offered before rapport is established
- Low stakeholder participation or siloed conversations
- Jumping straight to solutions without agreeing on the problem

---

### Phase 2: Just After Kickoff

Key practices to look for:
- Cataloging everything that *wasn't* resolved during kickoff
- Building a clear backlog of open questions with a plan to get them answered
- Creating user flows or technical diagrams to establish a shared mental model
- Expanding the critical path to surface unknowns not covered at kickoff
- Identifying a high-confidence first epic dev can start immediately (e.g., auth flows)
- Design identifying requirements for the first epic without needing PM
- Continuing to track and surface assumptions
- Running an impact/effort exercise to prioritize features
- Starting user interviews or usability tests on riskiest assumptions

Risk signals:
- No post-kickoff alignment artifact (flow diagram, question list)
- Dev waiting on design to define first tasks
- Assumptions left implicit rather than written down
- No plan to get unanswered questions resolved
- No prioritization of what gets built first

---

### Phase 3: Active Build Cadence

Key practices to look for:
- Designer staying 1–2 weeks ahead of dev
- Designing with implementation in mind — weigh complexity against value, meet with devs to discuss options that reduce build complexity while maintaining UX
- Continuous user testing and validation — not just building
- Willingness to change direction as new information surfaces (moving between discovery and delivery fluidly)
- Documentation calibrated to the team's needs — not too much, not too little; varies by team and org size
- Design files structured for two audiences: dev reference pages + flows for testing/validation
- Active scope management — tradeoffs called out when new ideas surface, no feature added without discussion
- Working in the open — sharing unpolished work early and often
- Establishing regular cadences for updating stakeholders, leadership, and the immediate team
- Maintaining no knowledge silos — everyone understands what's being built and why
- Organizing design files and artifacts regularly ("keeping desk tidy")
- Designing the future — sketching out what comes after the current release or project
- Expanding influence to stakeholders outside the core project team, especially leadership
- Maintaining design vision in code — designer staying close to the build to catch detail drift (typography, spacing, breakpoints, color)
- Holding regular retros that include: celebrating wins, surfacing concerns, asking "Are we building the right product?", and evaluating whether the project is on track
- Stakeholders or product owners reviewing and accepting work on a regular cadence before features are deployed

Risk signals:
- Designer and dev in lockstep or designer is behind
- No mention of user testing or validation

**If the designer is also doing the dev work:** "staying 1–2 weeks ahead of dev" and handoff practices don't apply in the usual way. Look instead for:
- Deliberately separating design thinking from building — exploring options and flows before opening the editor, not designing in code by default
- Validating riskiest ideas with users or stakeholders before investing in implementation
- Keeping lightweight design artifacts (flows, sketches, decision notes) so the reasoning isn't only in the code
- Getting outside critique on both the design and the code, since there's no designer–dev back-and-forth to catch issues

Risk signals for designer-developers: jumping straight to code with no exploration of alternatives; implementation constraints quietly shaping UX decisions without being named as trade-offs; no one else reviewing the design; design decisions living only in the codebase
- Scope changes accepted without tradeoff discussion
- Design files not described as structured or maintained
- Only one person speaks to a topic — knowledge is siloed
- No retro rhythm or team pulse check
- Design decisions not accounting for implementation feasibility
- Design and dev working separately with no mention of shared visibility

---

### Phase 4: Launch & Wrap Up

Key practices to look for:
- Sharing a vision for the product's future — features discussed but not built, roadmap for next steps
- Defining how success will be measured after launch, and planning to check those measures
- Documenting decisions and design structure (design file organization, CSS/design system structure, project summary) so future teammates can pick up the work
- Leaving the team in a better position than at the start
- Giving thoughtful review of both the product and the process
- Celebrating together

Risk signals:
- No forward-looking artifacts or roadmap
- No plan to measure whether the launch achieved its goals
- No documentation plan
- Team moves on to the next project with no retro or reflection

---

## Context-specific practices

Apply these in addition to everything above, based on the designer's working context.

### In-house designers

- **Manufacture fresh eyes.** You're close to the product, so you'll miss things. Use hallway tests, cross-team design critiques, and heuristic reviews to get an outside perspective on purpose.
- **Plan for the long game.** You'll live with the decisions you make, so invest in the design system, documentation, and team rituals that compound over time.
- **Measure after launch.** You can follow a feature after it ships, so close the loop on whether it met its goals and feed that back into the roadmap.
- **Manage up and across.** Build relationships with leadership and partner teams so design has influence beyond the current project.

Risk signals: no outside critique or user input on work the team has been staring at for months; launches treated as the finish line with no follow-up measurement; design debt piling up with no plan to address it

### Agency, consultancy, and freelance designers

- **Use your outside perspective.** Your fresh eyes can spot UX issues the client team missed because they're too close to the product — share them early.
- **Respect domain expertise.** The client knows their business best. Your value is expertise that helps them decide, not being right.
- **Understand why you were hired.** Know what the client needs from this engagement and what success looks like to them, not just the feature list.
- **Plan the handoff from day one.** The client team should know where to go after the engagement ends, and be equipped to continue without you. Back up design files and document the engagement.
- **Polish the deliverables.** Deliverables represent your firm or practice — make documents and artifacts thoughtfully constructed and on-brand.

Risk signals: no reference to why the client brought in outside help; abrupt handoff with no transition; client team not equipped to continue without the designer; designer acting as a pair of hands rather than an advisor

---

## We Should Always (apply across ALL phases and contexts)

These are non-negotiable regardless of phase or context. Evaluate for these in every set of notes.

### Find and communicate your niche on the team
- Identify where your skills bring the most leverage for this specific team and product
- Share how you work best so PMs and devs know when to pull you in
- Adapt your role to fill gaps — don't apply a fixed process to every team

Risk signals: designer role is undefined or purely executional; no mention of how the designer is positioned relative to PM and dev

### Be a good partner
- Use the full flexible skill toolset — not just design
- Help the product team define requirements and map out flows
- Help developers by figuring out the best design-to-code workflow for the team
- Maintain constant communication between design and development — context loss and design drift both stem from this breaking down

Risk signals: designer working in isolation; handoff described as one-directional; no mention of dev or PM collaboration

### Be the voice of the user
- You cannot always get direct feedback from users — use experience and best judgment to advocate for the end user
- Bring a perspective the team doesn't have — question assumptions everyone has stopped noticing
- When user testing is cut for budget or timeline reasons, run a heuristic review and share findings proactively
- Design for flows and edge cases, not individual screens — consider what could go wrong at every stage

Risk signals: no one on the team mentioned user needs; design decisions made without any user perspective; no mention of edge cases or unhappy paths

### Improve the system, not just the feature
- Help teams communicate between product, design, and dev
- Evaluate and improve accessibility — and stay current on evolving accessibility requirements
- Level up the team's skillsets
- Start or contribute to a component library or design system
- Leave the team in a better place than when you started, with artifacts structured for whoever works on this next
- Deliver thoughtfully constructed documents and artifacts

Risk signals: work is purely execution with no mention of improving team process, accessibility, or leaving artifacts behind

### Build trust through judgment, not just execution
- Push back thoughtfully when something's wrong — frame it as trade-offs and costs, not opinion
- Ship quickly and scope honestly; trust gets earned before it gets extended into direction
- Stakeholders own the business decisions — your value is expertise that helps them decide well, not being right

Risk signals: disagreement framed as "I think" rather than trade-offs; scope commitments made without surfacing constraints; conflicts resolved with no artifact stakeholders can point back to later

### Engage broadly, not through one point of contact
- Spread engagement across the team rather than routing everything through one person
- Over-communicate, especially in shared or public channels — visible proactivity is a small way of leading
- Show up to meetings and updates with a plan, not just a status

Risk signals: one person answers every question; important reasoning happens in DMs the rest of the team can't see; updates with no plan attached

### Tie work to business outcomes
- Understand why this project exists and what success looks like to the business, not just the feature list
- Report progress in terms of business metrics where possible, not only what shipped
- Check in with stakeholders on how they feel about the work, separate from whether it's on schedule
- Be honest about speed/quality trade-offs — AI tooling shifts this calculus, so name where it does

Risk signals: updates describe output with no mention of business impact; no reference to why the project matters to the business; speed/quality trade-offs made silently

### Practice continuous validation and derisking
- Assumptions are surfaced and tracked throughout all phases
- Riskiest ideas are tested with users before building
- No mention of validation = a red flag at any phase
- Understand which assumptions carry the most risk and get answers before the cost of being wrong becomes too high

### Think about your value in terms of:
- **Adding clarity** — user flows, diagrams, shared mental models, decision tracking
- **Reducing risk** — surfacing unknowns, calling out scope creep, testing assumptions
- **Envisioning the future** — designing between tomorrow and next year, not just the current sprint
- **Using intuition to inform product decisions** — not just executing what's asked

### Move fluidly between discovery and delivery
- Building software is not linear — when the team hits a new unknown mid-sprint, shift back into discovery mode rather than waiting for a formal kickoff
- Use design thinking to quickly resolve ambiguity: sketch options, facilitate a quick exercise, run a short user interview
- T-shaped skills mean broad context (business, UX, technical, visual) applied to specific problems — watch for designers operating in only one dimension

Risk signals: designer described only as an executor; no mention of forward-looking work or product influence; designer unable or unwilling to shift modes when new information surfaces

---

## Output Format

Structure your evaluation as follows. Be specific — reference actual content from the notes when calling something out.

```
## Context and phase
[Name the working context and phase(s), and briefly explain how you determined them. Note any assumptions.]

## What's going well
[2–4 specific practices being followed, with evidence from the notes]

## Gaps or risks
[2–4 specific practices missing or at risk, with a brief explanation of why it matters]

## Highest priority action
[One concrete thing the designer should do next, based on the gaps identified]

## Questions to investigate
[1–3 things not mentioned in the notes that are worth checking on]
```

Keep the tone direct and collegial — this is a peer check-in, not a performance review. Focus on how the designer can improve. Avoid generic feedback. If the notes don't give enough information to evaluate a practice, say so rather than assuming. Remember these are guidelines, not rules — flag when context might reasonably explain a gap before treating it as a risk.

Flag when context may be missing.
