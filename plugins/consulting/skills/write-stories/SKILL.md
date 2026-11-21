---
name: write-stories
description: Write feature stories, bugs, chores, and epics for an issue tracker (Shortcut, Linear, Jira, GitHub, or markdown) in a product-person voice, with acceptance criteria written as a failure-first manual test script. Use when the user asks to write, draft, plan, or create stories, tickets, issues, bugs, chores, or epics, or to break a plan into stories.
---

# Write Stories

Write tracker items that a product person would write: specific enough to show intent, short enough to leave room for the developer's creativity. The style borrows from Alistair Cockburn's *Writing Effective Use Cases*: titles are the user's goal as a verb phrase, a story sits at "user goal" level (one person, one sitting), and failure handling (Cockburn's "extensions") is written out, not left to chance.

## Workflow

1. Gather what's already known from the conversation. Don't interview for things you can infer.
2. Draft the items in the formats below.
3. **Show the drafts in chat and wait for approval before creating or changing anything in the tracker.** Apply the user's corrections and show again if needed. Skip this only when the user explicitly says to go ahead without approval.
4. If a story looks big, offer to split it and suggest where. Never split on your own; the user decides.
5. Publish (see Publishing).

## Feature story

```
**Title:** <the "I want to …" part of the user story, capitalized>

**User story**
When I am <situation>, as a <role>, I want to <goal>, so that <outcome>.

**Context**
<Minimal, often one line.>

**Acceptance criteria**
1. Sign in with the "<account>" credentials from your team's password manager. This user should already have <precondition>.
2. Go to <page> at `<path>`. You should see <thing>. Click it.
3. <Failure first: do the wrong thing.> You should see <error>.
4. <Next failure.> You should see "<message>".
5. <Do it right.> You'll be redirected to `<path>` and see a flash saying "<message>".
6. <Check the result.>
7. Sign out, then sign in with the "<other account>" credentials from your team's password manager. <Check what they see.>
```

### Title
- The middle of the user story, the "I want to …" part: "Create a new project", "Change my email address".
- No role in the title. The user story says who.

### User story
- Job story plus user story: **When** (the triggering situation), **as a** (role), **I want to** (goal), **so that** (outcome).
- Use the role the person actually has at that moment. A member creates a project and only then becomes its owner.

### Context
- Whatever helps the developer that the user story and acceptance criteria don't already carry: a rule or decision from planning, who's allowed to do it, what an attribute means, a screenshot.
- Keep it minimal, often a single line. Don't pre-answer every question or add "helpful" links. The user prefers that developers ask, so there's a chance to clarify.
- Describe, don't prescribe. Say what an attribute means, not its column name, type, or association. Leave the how to the developer.
- Don't restate the why from the user story or the fields from the acceptance criteria.

### Acceptance criteria
A numbered manual test script that someone can follow click by click. It doubles as the outline of a system/feature spec.
- Step 1 signs in with a named test account from your team's password manager and states any precondition in the same step: "This user should already have …".
- Imperative, second person: "Go to …", "Click …", "Enter …", "You should see …".
- Name concrete paths (`/projects/:id`), links and buttons, and flash and error messages. Quoted copy is a suggestion; developers can reword it.
- Failure first. Submit the empty form and see errors, then invalid combinations, then fill it in correctly and succeed.
- End with a check from another account when visibility matters.
- No length limit. If it gets long, offer a split (workflow step 4).

## Bug

```
**Title:** <what's broken, in the user's words, e.g. "Saving my profile fails when the photo is too large">

**Related story:** <original story, if any>

**Context**
<Minimal: what happened, where, how often.>

**Steps to reproduce**
1. Sign in with the "<account>" credentials from your team's password manager. This user should already have <precondition>.
2. <Steps in the acceptance-criteria style.>
3. <The step where it breaks.> You should see <expected>. Instead you see <actual>.
```

Many bugs are a failure case (extension) the original story never wrote down. The reproduction steps become the fix's acceptance criteria.

## Chore

For technical work with no user-facing behavior.

```
**Title:** <verb-first, e.g. "Import the country list">

**Context**
<Minimal: why it's needed, and which stories it unblocks.>

**Acceptance criteria**
1. <Concrete check steps, e.g. "Run `bin/rails countries:import`. You should see about 250 countries imported.">
```

No user story. Mark it with the tracker's chore type or label. If neither exists, create a `chore` label.

## Epic

A name only, no description. Epics are a tag for grouping stories.

## Publishing

- Use the tracker's own fields for epic, story type, and blockers (Shortcut, Linear, Jira), and use its native "blocks" links. Don't repeat them in the description.
- Only when the tracker lacks those fields (a GitHub issue, a markdown file), add a line at the top of the text: `**Epic:** … · **Type:** … · **Blocked by:** …`.
- The title goes in the tracker's name/title field. The description starts at **User story** (or **Context** for bugs and chores).
- Feature and chore acceptance criteria become the tracker's native checklist (Shortcut tasks, Linear or Jira checklists), one item per step in order, and are left out of the description. When the tracker has no checklist (a GitHub issue, a markdown file), write them in the description as Markdown checkboxes (`- [ ] …`) under **Acceptance criteria**.
- Bug steps to reproduce stay a numbered list in the description.
- Create blockers first so later items can link to them.

## Example

**Title:** Create a new project

**User story**
When I am starting new work, as a member, I want to create a new project, so that my team has a place to track it.

**Context**
Any member can create a project, and every project is visible to the whole team. The creator becomes its first owner.

**Acceptance criteria**
1. Sign in with the "member" credentials from your team's password manager.
2. Go to the projects page at `/projects`. You should see a "New project" link. Click it.
3. You should see a form with fields for name, description, start date and due date.
4. Click "Create project" without filling anything in. You should see an error on the name, start date and due date.
5. Enter a start date after the due date and submit. You should see "Due date must be after start date".
6. Fill in every field correctly and click "Create project".
7. You'll be redirected to the new project's page at `/projects/:id`, which shows the details you entered.
8. You'll see a success flash saying "Project created".
9. Your name should show as the project's owner.
10. Sign out, then sign in with the "member 2" credentials from your team's password manager. Go to `/projects`. You should see the new project listed.
