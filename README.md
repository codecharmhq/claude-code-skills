# Claude Code Skills — Professional Workflow Collection

A curated collection of **20 professional Claude Code skills** that turn Claude into a senior software engineer. Each skill is a self-contained workflow that lives in your project's `.claude/skills/` directory.

## Why These Skills?

Claude Code is powerful out of the box, but it shines when you give it **specialized workflows**. These skills capture battle-tested engineering practices — code review, CI/CD debugging, security auditing, refactoring — and turn them into repeatable, reliable processes.

> **92% of GitHub Skills are shallow SaaS connectors.** These are deep engineering workflows built for developers who ship production code.

## Skills Catalog

### Git & Collaboration
| Skill | Description |
|-------|-------------|
| [writing-conventional-commits](./writing-conventional-commits/SKILL.md) | Structured commit messages that enable automated changelogs |
| [creating-pull-requests](./creating-pull-requests/SKILL.md) | PR creation with clear descriptions, linked issues, and review guidance |
| [resolving-merge-conflicts](./resolving-merge-conflicts/SKILL.md) | Systematic conflict resolution with minimal regression risk |
| [git-clean-history](./git-clean-history/SKILL.md) | Interactive rebase, squash, and history grooming |
| [code-review-workflow](./code-review-workflow/SKILL.md) | Structured code review from context to constructive feedback |

### CI/CD & Release Engineering
| Skill | Description |
|-------|-------------|
| [debugging-github-actions](./debugging-github-actions/SKILL.md) | Diagnose CI failures systematically |
| [semantic-versioning](./semantic-versioning/SKILL.md) | Automated version bumping based on commit conventions |
| [generating-changelogs](./generating-changelogs/SKILL.md) | Human-readable changelogs from git history |
| [release-checklist](./release-checklist/SKILL.md) | Pre-release verification checklist |
| [dependency-audit](./dependency-audit/SKILL.md) | Vulnerability scanning and dependency health checks |

### Code Quality
| Skill | Description |
|-------|-------------|
| [safe-refactoring](./safe-refactoring/SKILL.md) | Refactor with confidence using characterization tests |
| [reducing-technical-debt](./reducing-technical-debt/SKILL.md) | Identify, prioritize, and pay down tech debt |
| [error-handling-patterns](./error-handling-patterns/SKILL.md) | Consistent error handling across the stack |
| [logging-standards](./logging-standards/SKILL.md) | Structured logging that enables observability |
| [writing-tests](./writing-tests/SKILL.md) | Test-first workflow with the testing trophy approach |

### Project & Documentation
| Skill | Description |
|-------|-------------|
| [writing-api-documentation](./writing-api-documentation/SKILL.md) | OpenAPI/Swagger docs with examples |
| [issue-triage](./issue-triage/SKILL.md) | Prioritize and categorize incoming issues |
| [writing-readme](./writing-readme/SKILL.md) | README that sells your project |
| [performance-profiling](./performance-profiling/SKILL.md) | Find and fix performance bottlenecks |
| [security-review](./security-review/SKILL.md) | OWASP Top 10 security checklist |

## Quick Start

```bash
# Clone into your project's skills directory
git clone https://github.com/CodeCharmHQ/claude-code-skills.git .claude/skills

# Or copy individual skills
cp -r .claude/skills/code-review-workflow .claude/skills/
```

Each skill activates automatically when Claude Code detects the relevant context (e.g., reviewing a PR, debugging CI, auditing dependencies).

## Skill Structure

Every skill follows the same pattern:

```
skill-name/
  SKILL.md          # The skill definition
```

Each SKILL.md contains:
- **YAML frontmatter** — name + trigger description (when to activate)
- **Overview** — one sentence on what this skill does
- **When to Use** — explicit triggers and anti-triggers
- **Core Workflow** — 3-step systematic process
- **Quick Reference** — scenario → action lookup table
- **Common Mistakes** — what goes wrong and how to fix it
- **Red Flags** — warning signs that demand attention

## Design Principles

1. **Token-efficient** — 200-400 words per skill, no fluff
2. **Opinionated** — concrete actions, not vague advice
3. **Self-contained** — each skill works independently
4. **Composable** — combine skills for complex workflows
5. **Battle-tested** — patterns from production engineering teams

## Contributing

Found a gap? Open an issue or PR. High-priority skill requests:
- Language-specific workflows (Go, Rust, Python)
- Framework patterns (React, Next.js, Django)
- DevOps practices (Docker, K8s, Terraform)
- Enterprise workflows (compliance, incident response)

## License

MIT — use freely in personal and commercial projects.

---

**[CodeCharmHQ](https://github.com/CodeCharmHQ)** — Production-grade AI agent workflows.
