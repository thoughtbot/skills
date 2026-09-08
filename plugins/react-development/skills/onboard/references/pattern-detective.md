# Pattern Detective — Agent Playbook

## Mission

Surface the recurring patterns, conventions, and idioms in the codebase — the "how we do things here" knowledge that takes months to absorb organically. A new developer should be able to write code that fits in naturally after reading this document.

Write: `.claude/onboarding/patterns.md`

## What to Explore

Look for consistency and recurrence across the codebase:

**Structural patterns:**
- Base classes, mixins, or HOCs that others extend
- Factory functions, builder patterns, or constructor conventions
- Repository pattern for data access
- Dependency injection or service locator patterns
- Observer, strategy, command, or other GoF patterns

**Error handling:**
- How errors are created (custom error classes? string codes? HTTP status objects?)
- How errors propagate (throw? return Result<T>? callback? event?)
- How errors are caught and formatted at the boundary (middleware? wrapper?)

**Cross-cutting concerns:**
- Logging: which library, log levels, what context is attached
- Configuration: env vars accessed directly? a config object? injected?
- Validation: where validation lives and how it's expressed
- Authentication: how auth state is accessed in business logic

**React-specific patterns (if React project):**
- **Custom hooks**: grep for `function use[A-Z]` — what concerns do they abstract? (data fetching, auth state, UI state, side effects)
- **Component composition**: how are complex UIs assembled? Prop drilling vs context vs compound components vs render props?
- **Prop patterns**: grep for common prop type shapes — are components controlled or uncontrolled? Are callback props named `on[Event]`? Is there a consistent `children`/render prop pattern?
- **Performance patterns**: grep for `useMemo`, `useCallback`, `React.memo` — used systematically or only in specific hot paths? If absent, note that too (often deliberate).
- **Error boundaries**: are there `ErrorBoundary` components? Where are they placed in the tree?
- **Side effect conventions**: how is `useEffect` used — what triggers effects, how are cleanups handled, are effects abstracted into custom hooks?

**API design:**
- Request/response shape (envelope? raw? camelCase? snake_case?)
- Error response format
- Pagination approach
- Authentication header conventions

**Testing conventions:**
- Test file organization and naming
- Test structure (Arrange-Act-Assert? BDD describe/it?)
- How fixtures and factories are created
- How external dependencies are mocked

Tools to use:
- Read 3-5 representative files per major directory to spot patterns
- Grep for `try {`, `catch`, `logger.`, `throw new`, `Error(` to find error handling
- Grep for `describe(`, `it(`, `test(`, `expect(` to understand test style
- Look at how base classes are used: Grep for `extends `, `implements `
- Find shared utilities by sorting imports by frequency

## Output Template

```markdown
# [Project Name] — Design Patterns & Conventions

## Error Handling

[Describe the pattern, then show a real code example from the codebase.]

```typescript
// Services throw typed error classes
class UserService {
  async findById(id: string) {
    const user = await User.findById(id)
    if (!user) throw new NotFoundError(`User ${id} not found`)
    return user
  }
}

// Controllers catch and format at the boundary
app.use((err, req, res, next) => {
  if (err instanceof NotFoundError) res.status(404).json({ error: err.message })
})
```

Found in: `src/services/`, `src/errors/`, `src/middleware/errorHandler.ts`

---

## Logging

[Pattern description + real example.]

---

## Configuration Access

[Pattern description + real example.]

---

## Repository / Data Access

[How the codebase abstracts database access — pattern + example.]

---

## Custom Hooks

[Only include if React project. Describe what categories of concerns are abstracted into custom hooks, naming conventions, and show a real example.]

```typescript
// Example: auth state abstracted into a hook
function useAuth() {
  const user = useStore(state => state.user)
  const login = useStore(state => state.login)
  return { user, login, isAuthenticated: !!user }
}
```

Found in: `src/hooks/`

---

## Component Patterns

[Only include if React project. Describe how components are composed — controlled/uncontrolled, prop drilling vs context, any compound component patterns. Show a real example from the codebase.]

---

## Performance Conventions

[Only include if React project and the codebase uses memoization. Describe where `useMemo`/`useCallback`/`React.memo` appear and why. If they're absent, note that too — it's often a deliberate choice.]

---

## Testing Conventions

[Test structure with a representative example.]

---

## API Response Shape

```typescript
// Successful responses
{ data: T, meta?: PaginationMeta }

// Error responses
{ error: { code: string, message: string, details?: unknown } }
```

---

## [Other Recurring Pattern]

[...]

---

## Conventions Summary

| Concern | Convention |
|---------|-----------|
| Error handling | Custom typed error classes, thrown from services, formatted by middleware |
| Logging | [library], structured JSON, request ID attached |
| Config | dotenv + config module, never env vars accessed directly |
| Testing | [framework], AAA pattern, factory helpers for fixtures |
| Response format | `{ data, meta }` envelope, snake_case keys |

## Anti-Patterns to Avoid

[If any questionable patterns exist in the codebase that a new developer should know to avoid replicating — be specific and non-judgmental.]
```

## Quality Checklist

- Every pattern is backed by real code from the codebase (not invented)
- Code examples are real or close paraphrases — not made up
- File paths showing where patterns live are accurate
- The summary table covers all major cross-cutting concerns
- Anti-patterns section is only included if genuinely warranted
- If React project: custom hooks are documented with their purpose and return shape
- If React project: component composition pattern is described (prop drilling, context, or compound components)
