#!/usr/bin/env node

// ═══════════════════════════════════════════════════════════════════
// @stealthmark/cli — Binary Executable
// CLI interface for stealthmark init and verify
// ═══════════════════════════════════════════════════════════════════

import { runInit } from './commands/init.js';
import { runVerify } from './commands/verify.js';

const VERSION = '0.1.1';

function printHelp() {
  console.log(`
StealthMark CLI (v${VERSION})
Command-line tool that scaffolds StealthMark middleware and checks a site for a StealthMark agent manifest.

Usage:
  stealthmark <command> [options]

Commands:
  init [options]       Write a starter StealthMark middleware file (Next.js, Express or Fastify)
  verify <url>         Check whether a site serves a StealthMark agent manifest
  --version, -v        Show version
  --help, -h           Show this help message

Options (for init):
  --name <siteName>    Specify site name for the manifest
  --force              Overwrite existing middleware file

Examples:
  stealthmark init
  stealthmark verify https://your-site.example
`);
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command || command === '--help' || command === '-h') {
    printHelp();
    process.exit(0);
  }

  if (command === '--version' || command === '-v') {
    console.log(`v${VERSION}`);
    process.exit(0);
  }

  if (command === 'init') {
    const force = args.includes('--force');
    const nameIdx = args.indexOf('--name');
    const name = nameIdx !== -1 ? args[nameIdx + 1] : undefined;

    console.log('Detecting framework and scanning API routes...');
    const result = runInit({ cwd: process.cwd(), name, force });

    if (result.success) {
      console.log(result.message);
      console.log(`Framework: ${result.framework}`);
      console.log(`Capabilities discovered: ${result.capabilitiesCount}`);
      console.log('\nNext steps:');
      for (const step of result.nextSteps) {
        console.log(`  - ${step}`);
      }
      process.exit(0);
    } else {
      console.error(result.message);
      process.exit(1);
    }
  }

  if (command === 'verify') {
    const targetUrl = args[1];
    if (!targetUrl) {
      console.error('Usage: stealthmark verify <url>');
      process.exit(1);
    }

    console.log(`Checking ${targetUrl} for a StealthMark agent manifest...\n`);

    const report = await runVerify(targetUrl);

    for (const check of report.checks) {
      const icon = check.passed ? 'PASS' : 'FAIL';
      console.log(`${icon}  ${check.name}: ${check.details}`);
    }

    const total = report.checks.length;
    const failed = report.checks.filter((c) => !c.passed).length;

    console.log('\n=======================================================');
    if (report.overallPassed) {
      console.log(`All ${total} checks passed.`);
      process.exit(0);
    } else {
      console.log(`${failed} of ${total} checks failed. See https://stealthmark.io/docs.`);
      process.exit(1);
    }
  }

  console.error(`Unknown command: ${command}`);
  printHelp();
  process.exit(1);
}

main().catch((err: unknown) => {
  console.error('Fatal CLI error:', err instanceof Error ? err.message : err);
  process.exit(1);
});
