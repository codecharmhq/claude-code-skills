---
name: writing-readme
description: Use when creating or updating README files, setting up new repositories, or when project documentation is poor.
---

# Writing README

## Overview
The README is your project's homepage — it must answer "what is this, why should I use it, and how do I start?" in under 30 seconds.

## When to Use
- Creating a new repository from scratch
- Existing README is empty, a template placeholder, or has not been updated in over a year
- Users frequently ask the same setup or usage questions in issues
- Open-sourcing a private project for the first time

**Don't use when:**
- The project is a personal dotfiles repo or scratchpad

## Core Workflow

### Step 1: Hook Them (Top Fold)
Write project name, one-line description, and key badges (build status, coverage, version, license, downloads). Place a screenshot, GIF demo, or code snippet below the badges. This fold must answer "what does it do" visually.

### Step 2: Guide New Users
Quick start: install command, minimal working example, expected output. Then: full installation, configuration options, common usage patterns. Link to advanced docs elsewhere — don't dump everything in the README.

### Step 3: Guide Contributors
Add contributing guidelines, development setup (clone, install deps, run tests), code style, and PR process. Link to separate CONTRIBUTING.md if this section grows past 5 lines. End with license and acknowledgments.

## Quick Reference

| Scenario | Action |
|----------|--------|
| No README yet | Write title + description + install + usage + license — ship first, polish later |
| README is outdated | Diff against current CLI flags and config, update everything |
| Users ask "how do I X" | Add X to usage examples section |
| No screenshots | Record a terminal GIF with asciinema or similar |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| No quick-start example | Add a copy-pasteable snippet that works on first try |
| Walls of text with no headings | Break into sections; add a table of contents for long READMEs |
| No license file | Add a license; without one, nobody can legally use your code |

## Red Flags
- README says "coming soon" in any section that has been there more than a month
- Installation instructions assume OS or tools without saying so
- No indication of project status (active, maintained, archival)

**All of these mean:** address each red flag before publishing or promoting the repo.
