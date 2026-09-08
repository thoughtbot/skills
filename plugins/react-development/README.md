# react-development

React/Next.js development toolkit with performance review skills and MCP
server integrations. Migrated from the former `thoughtbot/react-dev-plugin`
repository.

## Installation

Add the marketplace and install the plugin in Claude Code:

```
/plugin marketplace add thoughtbot/skills
/plugin install react-development@skills
```

## Skills

- **design-to-component**: Convert Figma designs into production-ready React
  components. Extracts design specs, variants, tokens, and layout through the
  Figma MCP, then scaffolds typed TypeScript components.
- **onboard**: Deep project onboarding that deploys a team of specialized
  agents to explore a codebase and generate didactic markdown documentation
  with Mermaid diagrams.
- **review-react**: React and Next.js performance optimization guidelines
  from Vercel Engineering, applied when writing, reviewing, or refactoring
  React/Next.js code.

## MCP servers

Installing this plugin also configures these MCP servers (see `.mcp.json`):

- **context7**: up-to-date library documentation
- **figma**: design file access for design-to-component
- **chrome-devtools**: browser inspection and debugging
- **supabase**: Supabase project access

See the repository's [CONTRIBUTING.md](../../CONTRIBUTING.md) for how to add
a skill.
