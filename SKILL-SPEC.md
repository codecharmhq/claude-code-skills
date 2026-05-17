# SKILL.md Writing Spec

## YAML Frontmatter
```yaml
---
name: kebab-case-name
description: Use when [trigger conditions] or when asked to [user phrases]
---
```
- `description` MUST start with "Use when"
- Describe triggering conditions ONLY, never summarize the workflow
- Max 150 characters

## Six Required Sections (200-400 words total)

### Overview
One sentence. What problem does this solve?

### When to Use
- 2-4 positive triggers (when to activate)
- 1-3 **Don't use when** anti-triggers (boundaries)

### Core Workflow
3 steps. Each step:
- Has a **bold lead sentence** stating the action
- Followed by 1-2 concrete, executable sentences
- Must contain specific tool names, command patterns, or decision criteria

### Quick Reference
| Scenario | Action |
A 3-5 row lookup table. Scenario = real situation, Action = concrete step.

### Common Mistakes
| Mistake | Fix |
3-4 rows. Each mistake is a real error developers make. Each fix is actionable.

### Red Flags
- 3-4 warning signs as bullet points
- Final line: **bold sentence summarizing what all red flags mean**

## Quality Standards
1. **Opinionated** — say "use X" not "consider X". Concrete actions, not vague advice.
2. **Deep** — assumes the reader already knows the basics. Teaches patterns, not syntax.
3. **Self-contained** — works independently, no cross-skill dependencies.
4. **Composable** — can combine with other skills for complex workflows.
5. **Battle-tested** — patterns from real production teams, not textbook examples.

## Anti-Patterns (REJECT)
- Explaining basic syntax or concepts (AI can generate that)
- Generic advice like "write clean code" or "think about performance"
- SaaS connector wrappers (just calling an API with a prompt)
- Tutorial-style step-by-step beginner guides
- "You should consider..." — weak, unopinionated language
