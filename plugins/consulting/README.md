# consulting

Skills for consulting and client work. Skills that are scoped to the
consulting domain, such as communication, client success, and process,
live here.

## Installation

Add the marketplace and install the plugin in Claude Code:

```
/plugin marketplace add thoughtbot/skills
/plugin install consulting@skills
```

## Skills

- [**write-stories**](skills/write-stories) — writes feature stories, bugs,
  chores, and epics for an issue tracker in a product-person voice. Acceptance
  criteria are a failure-first manual test script; feature and chore criteria
  publish as the tracker's checklist. Based on Alistair Cockburn's *Writing
  Effective Use Cases*.
- [**story-cart**](skills/story-cart) — a local click-to-story tool for HTML
  prototypes. Inspect or record a prototype (optionally with pictures Claude
  can see), draft stories with `write-stories`, collect them in a cart, refine
  a whole epic at once, and publish to the tracker. Requires Node 18+ and the
  `claude` CLI.

See the repository's [CONTRIBUTING.md](../../CONTRIBUTING.md) for how to add a new skill.
