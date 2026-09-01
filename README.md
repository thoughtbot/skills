# skills

thoughtbot's public marketplace of agent skills and Claude Code plugins.

This repository aggregates and distributes thoughtbot's publicly available
agent skills and plugins. It publishes a marketplace manifest pointing to the
plugins below, and hosts the **general** plugin, a catch-all for skills that
don't need a domain-specific plugin.

Our skills are also published at
[skills.sh/thoughtbot](https://www.skills.sh/thoughtbot).

## Available Plugins

| Plugin                                                                                       | Description                                                                                                                                                                       | Category    |
| -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------- |
| [**general**](plugins/general)                                                               | Catch-all plugin for thoughtbot skills that don't need a domain-specific plugin                                                                                                   | development |
| [**rails-development**](plugins/rails-development)                                           | Skills for Ruby on Rails development                                                                                                                                              | development |
| [**react-development**](plugins/react-development)                                           | Skills for React and Next.js development                                                                                                                                          | development |
| [**rails-audit-thoughtbot**](https://github.com/thoughtbot/rails-audit-thoughtbot)           | Comprehensive code audits of Ruby on Rails applications based on thoughtbot best practices, covering testing, security, code design, Rails conventions, and database optimization | development |
| [**atomic-commits**](https://github.com/thoughtbot/atomic-commits-plugin)                    | Guides agents to commit early and often in atomic increments, separate feature/refactor/cleanup work, and keep PRs around ~200 lines                                              | workflow    |
| [**generate-postman-collection**](https://github.com/thoughtbot/generate-postman-collection) | Automatically generates or updates Postman API collections by analyzing Rails application routes, controllers, and test specs                                                     | development |
| [**rails-consultant**](https://github.com/thoughtbot/rails-consultant)                       | A collection of skills for Rails development and consulting with an emphasis on learning, communication, and client success                                                       | workflows   |

## Installation

There are two ways to use these plugins: subscribing to the marketplace in
Claude Code, or copying individual skills with the skills CLI.

### Claude Code marketplace

Adding the marketplace works like a subscription: installed plugins receive
updates as new versions are released.

Add the marketplace:

```
/plugin marketplace add thoughtbot/skills
```

Install a plugin:

```
/plugin install general@skills
```

To set up a whole team, add this to your project's `.claude/settings.json`
and commit it. Teammates are automatically prompted to add the marketplace
and enable the listed plugins when they open the project:

```json
{
  "extraKnownMarketplaces": {
    "skills": {
      "source": {
        "source": "github",
        "repo": "thoughtbot/skills"
      }
    }
  },
  "enabledPlugins": {
    "general@skills": true
  }
}
```

### skills CLI

The [skills CLI](https://skills.sh) copies a skill into your project, giving
you a local copy you can modify freely:

```
npx skills add thoughtbot/skills
```

Browse our published skills at
[skills.sh/thoughtbot](https://www.skills.sh/thoughtbot).

## Contributing

Want to add a new skill or plugin, or update an existing one? See
[CONTRIBUTING.md](CONTRIBUTING.md) for guidance on where components should
live, how to add them to the marketplace, and how to announce them.

## License

Copyright © 2026 thoughtbot. It is free
software, and may be redistributed under the terms specified in the
[LICENSE] file.

[LICENSE]: LICENSE

<!-- START /templates/footer.md -->
## About thoughtbot

![thoughtbot](https://thoughtbot.com/thoughtbot-logo-for-readmes.svg)

This repo is maintained and funded by thoughtbot, inc.
The names and logos for thoughtbot are trademarks of thoughtbot, inc.

We love open source software!
See [our other projects][community].
We are [available for hire][hire].

[community]: https://thoughtbot.com/community?utm_source=github
[hire]: https://thoughtbot.com/hire-us?utm_source=github

<!-- END /templates/footer.md -->
