# @stealthmark/express

Express and Fastify middleware that detects AI agents that identify themselves, serves an agent manifest at /.well-known/agent.json and meters agent traffic.

> Detects only agents that identify themselves. It does not detect stealth bots and is not a security control.

Part of the [StealthMark](https://stealthmark.io) SDK.

> **Status:** v0.1.0, not published to npm yet. The `npm install` and `npx` commands below will work once it is published; until then build from source as described in the [repository README](https://github.com/Gastonchevarria/stealthmark-sdk#status).

## Installation from source

Until the first npm release, build the repository and install the tarballs (`@stealthmark/express` depends on `@stealthmark/core`):

```bash
# in a clone of the repository
npm install && npm run build
npm pack -w @stealthmark/core -w @stealthmark/express
# in your project
npm install /path/to/stealthmark-core-0.1.0.tgz /path/to/stealthmark-express-0.1.0.tgz
```

## Installation (after the first npm release)

```bash
npm install @stealthmark/express @stealthmark/core
```

Requires Node.js 20 or newer.

## Express Quickstart

```typescript
import express from 'express';
import { stealthmark } from '@stealthmark/express';

const app = express();

// Add the middleware near the top of your middleware stack
app.use(stealthmark({
  siteName: 'My Express API',
  capabilities: [
    { id: 'search', endpoint: '/api/search', method: 'GET' },
    { id: 'checkout', endpoint: '/api/orders', method: 'POST', hitl: true },
  ],
}));

app.get('/api/search', (req, res) => res.json({ results: [] }));

app.listen(3000);
```

`hitl` is advisory metadata for agents. StealthMark does not block, approve or rate-limit anything; enforce approvals in your own handler.

## Fastify Quickstart

```typescript
import Fastify from 'fastify';
import { stealthmarkFastify } from '@stealthmark/express';

const fastify = Fastify();

fastify.addHook('preHandler', stealthmarkFastify({
  siteName: 'My Fastify Service',
}));

fastify.listen({ port: 3000 });
```

## Features

- **Agent detection**: detects agents that identify themselves: known AI crawler tokens in the `User-Agent` (GPTBot, ClaudeBot, PerplexityBot, ...), the `x-stealthmark-agent` header and `Accept: application/agent+json`. All of these are self-declared.
- **Agent manifest**: `/.well-known/agent.json` and any request with `Accept: application/agent+json` get the manifest. The default policy is `observe`: pages answer normally. With `agentPolicy: 'manifest'` detected agents get the manifest on `/` only. The middleware also answers `/.well-known/ai-plugin.json` and `/api/agent-manifest` with the manifest for every visitor, so do not use those paths for your own routes.
- **Next.js route discovery**: `discoverCapabilities()` lists App Router `route.ts` handlers under `app/api`. It does not scan Express or Fastify routes; declare those in `capabilities`. It needs Node (`fs`).
- **Usage metering (optional)**: provide `apiKey` (or `STEALTHMARK_API_KEY`) to report requests from self-identified agents as usage events to the StealthMark hosted API. Without a key the SDK makes no network calls. The default host is https://stealthmark-api-cifepjj5ca-uc.a.run.app; override it with `usageEndpoint` or `STEALTHMARK_USAGE_ENDPOINT`. Events are reported best-effort and can be dropped.
- **Per-site attribution**: every metered event carries `metadata.host` (the `Host` header, lowercased, no port), and the console groups and filters by it with no config. Set `trustForwardedHost: true` to use the first `X-Forwarded-Host` instead, only behind a proxy you control.
- **Optional `siteId`** (or `STEALTHMARK_SITE_ID`): stored on the event as `site_id`. It must be the UUID of a site registered to the same organization, otherwise it is stored as null.

## agentPolicy

`agentPolicy` sets how requests from detected agents are handled on ordinary paths:

- `'observe'` (default): the request passes through to your handlers. The response gets `x-stealthmark-agent-detected` and, when known, `x-stealthmark-agent-id`.
- `'manifest'`: detected agents get the manifest instead of the page, on `/` only. Other paths pass through as in `observe`. (`@stealthmark/next` serves the manifest on every path in this mode.)
- `'block'`: detected agents get a 403 with a JSON body. Manifest paths and `Accept: application/agent+json` requests are still answered with the manifest.

## License

Apache 2.0, see [LICENSE](./LICENSE) and [NOTICE](./NOTICE).
