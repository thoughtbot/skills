# Structure Guide — Agent Playbook

## Mission

Help a new developer navigate the filesystem — where things live, why they're organized that way, and how to find what they need without asking someone.

Write: `.claude/onboarding/structure.md`

## What to Explore

- Directory tree from the project root (up to 3-4 levels deep)
- README sections about project structure if present
- File naming patterns across multiple directories
- Config, test, build output, and script directories
- Key individual files (entry points, important configs)

Look for:
- Naming conventions: how files and directories are named (`camelCase`, `kebab-case`, `snake_case`, `PascalCase`)
- Whether code is organized by layer (routes/, services/, models/) or by feature (users/, posts/, billing/)
- Where tests live and how they mirror source code
- Any generated or build output directories to be aware of

Tools to use:
- Bash `find . -maxdepth 4 -not -path '*/node_modules/*' -not -path '*/.git/*'` or equivalent for the tree
- Read a few representative files per directory to confirm purpose

## Output Template

```markdown
# [Project Name] — Directory Structure

## Project Root

```
project-root/
├── src/                    # Application source code
│   ├── routes/             # Express route handlers
│   ├── services/           # Business logic layer
│   ├── models/             # Data models / DB schemas
│   └── utils/              # Shared utility functions
├── tests/                  # Test files (mirrors src/ structure)
├── config/                 # Environment configuration
├── scripts/                # Build and maintenance scripts
├── .github/                # CI/CD workflows
├── package.json            # Dependencies and npm scripts
└── .env.example            # Required environment variables
```

## Key Directories

### `src/routes/`

[What lives here, how files are named, how routes are structured.]

### `src/services/`

[What lives here, naming convention, how a service is organized.]

### `tests/`

[How tests are organized, how they mirror source, naming conventions.]

[... one section per major directory ...]

## Naming Conventions

| Concern | Convention | Example |
|---------|-----------|---------|
| Route files | `<resource>.routes.ts` | `users.routes.ts` |
| Service files | `<domain>Service.ts` | `authService.ts` |
| Test files | `<target>.test.ts` | `authService.test.ts` |
| Constants | `UPPER_SNAKE_CASE` | `MAX_RETRIES` |

## Where to Find...

| If you need to... | Look in |
|-------------------|---------|
| Add a new API endpoint | `src/routes/` |
| Add business logic | `src/services/` |
| Change the DB schema | `src/models/` |
| Add a utility function | `src/utils/` |
| Change environment config | `config/` + `.env.example` |
| Add a test | `tests/<mirror-of-source>/` |
| Run build / deploy scripts | `scripts/` or `Makefile` |

## Important Files

| File | Purpose |
|------|---------|
| `src/index.ts` | Application entry point |
| `config/database.ts` | DB connection setup |
| `.env.example` | Required environment variables |
| `package.json` | Available npm scripts |
```

## Quality Checklist

- The directory tree is accurate (matches the actual filesystem)
- Every major directory has a clear, accurate description
- The "Where to Find" table covers the most common developer tasks
- Naming conventions are derived from actual file names found in the codebase (not guessed)
