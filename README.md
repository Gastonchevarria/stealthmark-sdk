# StealthMark SDK

Open-source (Apache-2.0) SDK that lets a website tell which requests come from AI agents that identify themselves, serve them a structured agent manifest or leave the page untouched, and meter that traffic.
It ships as framework-agnostic core logic plus adapters for Next.js, Express and Fastify, and a CLI that scaffolds a starter middleware file and checks a site for a StealthMark agent manifest.
The hosted dashboard and billing at [stealthmark.io](https://stealthmark.io) are optional and are not part of this repository.

> Detects only agents that identify themselves. It does not detect stealth bots and is not a security control.

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

The CLI can be run from a clone with `node /path/to/stealthmark-sdk/packages/cli/dist/bin.js init`.

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

## License

Apache-2.0, see [LICENSE](./LICENSE) and [NOTICE](./NOTICE).
