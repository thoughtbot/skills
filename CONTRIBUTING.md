# Contributing

This guide explains how to contribute an agent component (a skill, command,
hook, agent, workflow, or other item packaged in a plugin) to thoughtbot's
marketplaces: deciding where it should live, adding it, and announcing it.

## Where should your component live?

Agent components are the items packaged in an agent plugin and include
skills, commands, hooks, agents, workflows, styles, themes, monitors,
executables, configuration files, markdown files, and more.

- **When a component pertains to a client**, place it in the client's project
  files or follow the client's processes and directives.
- **When a component contains non-public proprietary information or
  intellectual property pertaining to thoughtbot**, place it in a plugin in
  the private thoughtbot/skills-internal marketplace, not here.
- **When a component is scoped to something general**, and not to a specific
  domain, place it in the general plugin: [`plugins/general`](plugins/general)
  in this repository.
- **When a component is scoped to a particular domain**, place it in a
  domain-scoped plugin such as rails-development, react-development, design,
  consulting, or sales. In this repository those live under `plugins/`, for
  example `plugins/rails-development` and `plugins/react-development`.
- **When adding a group of skills that constitute their own domain**, add it
  as its own plugin within the public or private marketplace repository. Give
  the plugin a name that meaningfully communicates the intent and scope of
  the cohesive set of components.
- **When a group of skills makes sense to publish in their own repository**,
  create or update the separate GitHub repository under the thoughtbot org.
  Separate repositories should contain a plugin manifest
  (`.claude-plugin/plugin.json`) but not a marketplace manifest
  (`marketplace.json`), and need a plugin entry in the appropriate
  marketplace manifest.

## Adding your component

Once you know where the component lives:

1. Add it to the chosen plugin: a folder under `plugins/` in this repository,
   or the plugin's own repository.
2. Check whether it needs to be added to that plugin's
   `.claude-plugin/plugin.json` manifest. Manifests can point either to
   entire directories or to specific skills.
3. If you created a new plugin, whether in this repository or a separate one,
   add an entry for it to
   [`.claude-plugin/marketplace.json`](.claude-plugin/marketplace.json):

```json
{
  "name": "rails-dev",
  "source": {
    "source": "github",
    "repo": "thoughtbot/rails-dev-plugin"
  },
  "description": "Rails development toolkit",
  "version": "1.0.0",
  "category": "development",
  "keywords": ["rails", "ruby", "backend"]
}
```

Internal-only plugins should be listed in the private
thoughtbot/skills-internal marketplace instead.

## Branching strategy

The marketplace repositories follow the git flow branching strategy:

- Place in-development components on the `develop` branch.
- When components are ready for release, merge them into `main` via a release
  pull request.

## Announcing

- Announce new skills in Hub or on the thoughtbot blog.
- Announce significant updates to existing skills the same way.
- Check that [skills.sh/thoughtbot](https://www.skills.sh/thoughtbot)
  reflects the change; it updates automatically the first time someone
  installs a skill with the skills CLI.
