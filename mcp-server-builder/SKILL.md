---
name: mcp-server-builder
description: Use when building MCP (Model Context Protocol) servers, adding tools/resources/prompts to Claude, or debugging MCP server connection and tool discovery issues
---

# MCP Server Builder

## Overview
MCP turns Claude from a chatbot into a platform. A well-built MCP server gives Claude access to your database, APIs, files, and business logic — but a poorly built one produces silent failures, missing tools, and connection errors with zero diagnostic output. This skill patterns the server architecture, not the specific tools.

## When to Use
- Building a new MCP server to extend Claude with custom tools or resources
- Adding tools to an existing MCP server and need the right patterns
- Claude reports "No tools found" or tools appear but fail at runtime
- MCP server connects successfully but individual tools return errors

**Don't use when:** writing a simple CLI script — MCP is for persistent, stateful tool servers. Don't use for one-off API calls — a bash script is simpler.

## Core Workflow

**Step 1: Define tools by user intent, not by internal API.** Each tool should map to one thing the user asks Claude to do. Tool name = verb_noun (`search_docs`, `create_issue`, `get_deploy_status`). Don't wrap your entire REST API — pick the 5-10 actions users actually need. **GOOD:** `search_customers(query: string)` — one clear intent. **BAD:** `http_request(method, url, body, headers)` — you just made Claude a curl wrapper.

**Step 2: Validate inputs aggressively, return errors with context.** Every tool parameter needs JSON Schema validation. Required fields, enum constraints, min/max on numbers. Error messages must tell the LLM what went wrong AND how to fix it. `"Customer not found"` is useless. `"No customer with email 'j@x.com'. Did you mean 'john@x.com'? Search with domain filter: search_customers(domain='x.com')"` lets Claude self-correct.

**Step 3: Keep server startup under 500ms, handle transport silently.** Cold-start your server outside Claude first. Slow startup = timeout in Claude's connection loop. Use `stdio` transport for local servers (zero config), `streamable-http` for remote. Log errors to stderr (Claude ignores it), send structured results to stdout. Never `console.log` debug output to stdout — it corrupts the JSON-RPC stream.

## Quick Reference

| Scenario | Pattern |
|----------|---------|
| New tool returns "Tool not found" | Check `tools/list` response — is tool registered with `server.tool()` or just defined? |
| Tool parameter doesn't validate | JSON Schema `required` array must list the param; `type: "string"` not `type: "String"` |
| Server connects but tools hang | Check for blocking I/O in tool handler — use async, set 30s timeout |
| Multiple tools share setup logic | Extract to a helper, not a base class; MCP tools are functions, not objects |

## Common Mistakes

| Mistake | Fix |
|---------|-----|
| One tool that does everything via `action` param | Split into discrete tools; Claude routes better with named tools |
| Returning raw API responses as tool output | Shape the output: only fields the LLM needs, human-readable keys |
| No input validation — assumes LLM sends correct params | JSON Schema on every param; LLMs hallucinate parameters too |
| 50 tools in one server | Split into focused servers by domain; Claude loads what's relevant |

## GOOD/BAD Patterns

**GOOD:**
```typescript
// One tool, one clear intent, validated input, shaped output
server.tool(
  "search_customers",
  "Search customer database by name, email, or company",
  {
    query: z.string().min(2).max(100).describe("Search term — matches name, email, or company"),
    limit: z.number().int().min(1).max(50).default(10).describe("Max results to return"),
  },
  async ({ query, limit }) => {
    const results = await db.customers.findMany({
      where: {
        OR: [
          { name: { contains: query } },
          { email: { contains: query } },
          { company: { contains: query } },
        ],
      },
      take: limit,
    });
    return {
      content: [{
        type: "text",
        text: JSON.stringify(results.map(c => ({
          id: c.id,
          name: c.name,
          email: c.email,
          company: c.company || "—",
        }))),
      }],
    };
  }
);
```

**BAD:**
```typescript
// God tool — Claude can't route to specific actions, parameter soup
server.tool(
  "api",
  "Do API stuff",
  { action: z.string(), body: z.any() },
  async ({ action, body }) => {
    const res = await fetch(`https://api.internal/${action}`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    return { content: [{ type: "text", text: await res.text() }] };
  }
);
```

---

**GOOD:**
```typescript
// Structured error tells Claude what happened and how to fix it
if (!customer) {
  return {
    isError: true,
    content: [{
      type: "text",
      text: `No customer found with email '${email}'. Try searching by domain: search_customers(domain="example.com")`,
    }],
  };
}
```

**BAD:**
```typescript
// Silent failure — Claude gets no signal and hallucinates the result
if (!customer) {
  return { content: [{ type: "text", text: "Not found" }] };
}
```

### Anti-Patterns — MCP Server Failures
- `server.tool("do_thing", "does a thing", {}, handler)` — no Zod validation on params; LLMs will send garbage
- `console.log("Tool called with:", params)` in tool handler — stdout is the MCP transport; use `console.error()` for debug
- Returning 50KB of raw JSON as tool output — Claude's context is precious; trim to essential fields
- Starting a PostgreSQL pool in every tool call — initialize connections at server startup, not per-invocation
- Hardcoding API keys in the server source — use `process.env` or a config file; MCP servers get committed to git

## Red Flags
- Tool discovery lists 0 tools but server process is running — transport mismatch or `tools/list` handler broken
- Every tool call returns "Internal error" — unhandled exception in handler; wrap in try/catch with structured error output
- Server works locally but fails in Claude Desktop — path resolution (use absolute paths), or Node/Python version mismatch
- Tools return stale data after 1 hour — connection pool timed out; add keepalive or reconnect logic

**An MCP server is an API that an LLM calls. Build it with the same rigor — validate inputs, return structured errors, and keep the interface surface small and intentional.**


---
