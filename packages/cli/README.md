# @stealthmark/cli

Command-line tool that scaffolds StealthMark middleware and checks a site for a StealthMark agent manifest.

> Detects only agents that identify themselves. It does not detect stealth bots and is not a security control.

Part of the [StealthMark](https://stealthmark.io) SDK.

> **Status:** v0.1.0, not published to npm yet. The `npm install` and `npx` commands below will work once it is published; until then build from source as described in the [repository README](https://github.com/Gastonchevarria/stealthmark-sdk#status).

## Usage from source

Until the first npm release, run the CLI from a built clone of the repository:

```bash
# in a clone of the repository
npm install && npm run build

# then, in your project
node /path/to/stealthmark-sdk/packages/cli/dist/bin.js init
node /path/to/stealthmark-sdk/packages/cli/dist/bin.js verify https://your-site.example
```

## Installation (after the first npm release)

Run directly without installing via `npx`:

```bash
npx @stealthmark/cli init
```

Or install globally:

```bash
npm install -g @stealthmark/cli
stealthmark init
```

Requires Node.js 20 or newer.

## Commands

### `stealthmark init`
Detects Next.js or Express/Fastify and writes a starter middleware file. For Next.js App Router projects it lists `app/api/**/route.ts` handlers as capabilities; for Express and Fastify it writes `capabilities: []` and you declare them yourself. It never invents capabilities, pricing or human-approval flags. If no Next.js, Express or Fastify project is detected it writes nothing and exits with an error.

| Detected | File written | Next step |
| :--- | :--- | :--- |
| Next.js | `middleware.ts` (or `src/middleware.ts`) | Install `@stealthmark/next`, restart the dev server, open `/.well-known/agent.json` |
| Express | `stealthmark.middleware.ts`, exports `stealthmarkMiddleware` | Install `@stealthmark/express`, add `app.use(stealthmarkMiddleware)` before your routes |
| Fastify | `stealthmark.middleware.ts`, exports `stealthmarkHook` | Install `@stealthmark/express`, add `fastify.addHook('preHandler', stealthmarkHook)` |

```bash
# In your Next.js, Express or Fastify project root:
npx @stealthmark/cli init

# Specify a custom display name:
npx @stealthmark/cli init --name "My SaaS API"

# Overwrite existing middleware file:
npx @stealthmark/cli init --force
```

### `stealthmark verify https://your-site.example`
Checks whether a site serves a StealthMark agent manifest. Three checks: `/.well-known/agent.json` returns 200 JSON with `name`, `protocol` and a `capabilities` array; `/` answers `Accept: application/agent+json` with content type `application/agent+json`; the response carries the `x-stealthmark-shield` marker header. It does not validate the schema and does not prove that agents are detected or metered. A site that serves its own manifest without StealthMark fails the third check. The URL is required.

```bash
npx @stealthmark/cli verify https://your-site.example
```

Output:
```
Checking https://your-site.example for a StealthMark agent manifest...

PASS  Manifest at /.well-known/agent.json: HTTP 200, manifest for "Your Site" with 3 capabilities
PASS  Manifest via Accept: application/agent+json: HTTP 200, Content-Type: application/agent+json; charset=utf-8
PASS  x-stealthmark-shield header: x-stealthmark-shield: ACTIVE

=======================================================
All 3 checks passed.
```

The command exits with code 0 when all checks pass and 1 otherwise.

## License

Apache 2.0, see [LICENSE](./LICENSE) and [NOTICE](./NOTICE).
