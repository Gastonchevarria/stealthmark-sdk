// ═══════════════════════════════════════════════════════════════════
// @stealthmark/express — Usage metering shared by the Express and Fastify adapters
// ═══════════════════════════════════════════════════════════════════

import { buildEventMetadata, resolveAgentIdentifier, resolveRequestHost } from '@stealthmark/core';
import type { DetectionResult, StealthMarkInstance, UsageEventType } from '@stealthmark/core';

export function isManifestPath(pathOnly: string): boolean {
  return (
    pathOnly === '/.well-known/agent.json' ||
    pathOnly === '/.well-known/ai-plugin.json' ||
    pathOnly === '/api/agent-manifest'
  );
}

function recordEvent(
  sm: StealthMarkInstance,
  eventType: UsageEventType,
  headers: Record<string, string>,
  detection: DetectionResult,
  pathOnly: string,
  method: string | undefined
): void {
  sm.recordAgentEvent({
    event_type: eventType,
    agent_identifier: resolveAgentIdentifier(headers, detection),
    metadata: buildEventMetadata({
      path: pathOnly,
      method: method ?? 'GET',
      host: resolveRequestHost(headers, { trustForwardedHost: sm.trustForwardedHost }),
    }),
  });
}

/**
 * Meters exactly one event for a request identified as an AI agent.
 * Requests that do not identify themselves as agents are never recorded. The event carries the request host so the console can
 * tell sites apart, and the site_id when the instance has one.
 */
export function meterAgentRequest(
  sm: StealthMarkInstance,
  headers: Record<string, string>,
  detection: DetectionResult,
  pathOnly: string,
  method: string | undefined
): void {
  if (!detection.isAgent) return;
  recordEvent(sm, isManifestPath(pathOnly) ? 'agent_manifest' : 'agent_request', headers, detection, pathOnly, method);
}

/** Meters one agent request that the `block` policy answered with 403. */
export function meterBlockedRequest(
  sm: StealthMarkInstance,
  headers: Record<string, string>,
  detection: DetectionResult,
  pathOnly: string,
  method: string | undefined
): void {
  recordEvent(sm, 'agent_blocked', headers, detection, pathOnly, method);
}
