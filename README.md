# StealthMark SDK

[![CI](https://github.com/Gastonchevarria/stealthmark-sdk/actions/workflows/ci.yml/badge.svg)](https://github.com/Gastonchevarria/stealthmark-sdk/actions/workflows/ci.yml)
[![License: Apache-2.0](https://img.shields.io/badge/license-Apache--2.0-blue.svg)](./LICENSE)
[![Node.js >=20](https://img.shields.io/badge/node-%3E%3D20-339933.svg)](https://nodejs.org)
[![TypeScript strict](https://img.shields.io/badge/TypeScript-strict-3178c6.svg)](./packages/core/tsconfig.json)

Open-source (Apache-2.0) SDK that lets a website tell which requests come from AI agents that identify themselves, serve them a structured agent manifest or leave the page untouched, and meter that traffic.
It ships as framework-agnostic core logic plus adapters for Next.js, Express and Fastify, and a CLI that scaffolds a starter middleware file and checks a site for a StealthMark agent manifest.
The hosted dashboard and billing at [stealthmark.io](https://stealthmark.io) are optional and are not part of this repository.

> Detects only agents that identify themselves. It does not detect stealth bots and is not a security control.

## How a request is handled

```text
incoming request
 |
 +- /.well-known/agent.json, /.well-known/ai-plugin.json or /api/agent-manifest
 |    -> 200 agent manifest, for any caller
 |
 +- no agent signal (browsers and every client that does not identify itself)
 |    -> your app answers normally, plus the x-stealthmark-shield and
 |       x-stealthmark-agent-policy headers; not metered
 |
 +- agent signal: Accept: application/agent+json, x-stealthmark-agent header
    or a known AI User-Agent. Always metered, then by agentPolicy:
      +- Accept: application/agent+json   -> 200 agent manifest (any policy)
      +- observe (default)                -> your app answers normally, tagged
      |                                      x-stealthmark-agent-detected
      +- manifest                         -> 200 agent manifest (Next.js: every path;
      |                                      Express/Fastify: "/" only, other paths
      |                                      answer normally like observe)
      +- block                            -> 403 JSON {"error":"agent_blocked"}
```

- "Metered" means the event is queued. It leaves your server only when an API key is configured, in batches in the background, and can be dropped. The 403 is metered as `agent_blocked` and manifest hits as `agent_manifest`.
- Detection runs on every request and inspects the request headers and path. That is cheap but not free: the SDK adds a small per-request cost on all traffic, and no latency figure is published here.
- Next.js: `withStealthMark` adds the headers to the response of your own middleware. The minimal `stealthmark()` returns nothing for requests it passes through, so it adds no headers to them.

## Packages

| Package | Path | What it is |
| :--- | :--- | :--- |
| `@stealthmark/core` | [`packages/core`](./packages/core) | Framework-agnostic engine: agent detection, manifest generation, usage metering |
| `@stealthmark/next` | [`packages/next`](./packages/next) | Next.js middleware (`withStealthMark`, `stealthmark`) |
| `@stealthmark/express` | [`packages/express`](./packages/express) | Express and Fastify middleware |
| `@stealthmark/cli` | [`packages/cli`](./packages/cli) | `stealthmark init` writes a starter middleware file, `stealthmark verify <url>` checks a live site |

Requires Node.js 20 or newer.

## Status

v0.1.0. **The packages are not published to npm yet**, so `npm install @stealthmark/...` does not work today. Install from source:

```bash
git clone https://github.com/Gastonchevarria/stealthmark-sdk.git
cd stealthmark-sdk
npm install
npm run build
```

To use the packages in another project, pack them into tarballs and install the tarballs (`@stealthmark/next`, `@stealthmark/express` and `@stealthmark/cli` all depend on `@stealthmark/core`, so install core together with the adapter you need):

```bash
npm pack -w @stealthmark/core -w @stealthmark/next -w @stealthmark/express -w @stealthmark/cli
# in your project (core is required by next, express and cli):
npm install /path/to/stealthmark-core-0.1.0.tgz /path/to/stealthmark-next-0.1.0.tgz
# for Express or Fastify, install the express tarball instead of the next one:
# npm install /path/to/stealthmark-core-0.1.0.tgz /path/to/stealthmark-express-0.1.0.tgz
```

`npx @stealthmark/cli` and `npm install -g @stealthmark/cli` work only after the first npm release. Until then, run the CLI from a built clone with `node /path/to/stealthmark-sdk/packages/cli/dist/bin.js <command>`.

Development commands, all run from the repository root:

```bash
npm run build      # builds core first, then next, express and cli
npm run typecheck
npm test
```

## Next.js quick start

```typescript
// middleware.ts
import { NextResponse } from 'next/server';
import { withStealthMark } from '@stealthmark/next';

export default withStealthMark(() => NextResponse.next(), {
  siteName: 'My SaaS',
  agentPolicy: 'observe', // default: your pages answer normally, agent requests are tagged and metered
  apiKey: process.env.STEALTHMARK_API_KEY, // optional: without a key nothing is sent anywhere
  capabilities: [
    { id: 'search', endpoint: '/api/search', method: 'GET' },
  ],
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
```

In `observe` mode the site responds exactly as before. Requests identified as coming from an agent get an `x-stealthmark-agent-detected` response header and, if an API key is set, are reported as usage events. `/.well-known/agent.json` and requests with `Accept: application/agent+json` always receive the manifest. Other policies are `manifest` (Next.js: detected agents get the manifest on every path; Express and Fastify: only on `/`) and `block` (agents get a 403).

The manifest is StealthMark's own format. It is not an A2A Agent Card, an MCP server manifest or an adopted standard.

## CLI

Both commands are non-interactive: there are no prompts. From a clone, replace `stealthmark` below with `node /path/to/stealthmark-sdk/packages/cli/dist/bin.js`; after the first npm release, `npx @stealthmark/cli` does the same.

`stealthmark init [--name <siteName>] [--force]` writes one starter file in the current directory and prints the remaining steps. It does not install packages or touch any other file.

- Framework: Next.js, Express or Fastify, read from the `dependencies` and `devDependencies` of `package.json` (first match in that order), or from a `next.config.*` file. Nothing detected: nothing is written and the exit code is 1.
- File: Next.js gets `middleware.ts` (`src/middleware.ts` if a `src/` directory exists) using the minimal `stealthmark()` middleware; Express and Fastify get `stealthmark.middleware.ts`.
- `capabilities`: for Next.js, the `app/api/**/route.ts` handlers it finds; for Express and Fastify an empty list that you fill in.
- `--name` sets `siteName` (default: the `name` in `package.json`, else `My App`). `--force` overwrites an existing file; without it, an existing file is left alone and the exit code is 1.

`stealthmark verify <url>` checks that a live site serves a StealthMark manifest on `/.well-known/agent.json`, answers `Accept: application/agent+json` on `/`, and sends the `x-stealthmark-shield` header. The URL is required. See [`packages/cli`](./packages/cli) for details.

## What it detects, and what it does not

It detects agents that **identify themselves**, through any of:

- `Accept: application/agent+json`
- the `x-stealthmark-agent` request header
- a known AI crawler or agent token in the `User-Agent` (for example GPTBot, ClaudeBot, PerplexityBot, Bytespider)

All of these are self-declared: a human or a script can send them and be counted.

It does **not** detect stealth bots. A scraper or agent that sends a browser User-Agent, rotates identities, runs a headless browser or hides behind residential proxies looks like a human to this SDK. Treat the numbers it produces as a count of self-identified agent traffic, not as a complete count of automated traffic. It is also not a security control: do not rely on it to keep anyone out, and note that `hitl` and `pricing` on a capability are advisory metadata published in the manifest that the SDK never enforces.

## Data sent to StealthMark Cloud

Only when an API key is configured (`apiKey` option or `STEALTHMARK_API_KEY`). Without a key the SDK makes no network calls. Requests not identified as agents are never reported.

- Usage events (`POST /v1/usage/ingest`, sent with `Authorization: Bearer <apiKey>`): event type, agent identifier, request path, method, host and timestamp. When no better identifier exists, the agent identifier is the request's `User-Agent`. Set `reportUsage: false` to turn this off. Events are reported best-effort and can be dropped.

The default host is https://stealthmark-api-cifepjj5ca-uc.a.run.app, the StealthMark hosted API. Override it with `usageEndpoint` or `STEALTHMARK_USAGE_ENDPOINT`.

## Links

- Website: https://stealthmark.io
- Documentation: https://stealthmark.io/docs
- Security reports: see [SECURITY.md](./SECURITY.md)
- Maintainers: release steps in [RELEASING.md](./RELEASING.md)

## License

Apache-2.0, see [LICENSE](./LICENSE) and [NOTICE](./NOTICE).
