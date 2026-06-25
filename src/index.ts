#!/usr/bin/env node
import { loadConfig } from './config.js';
import { setLogLevel, logger } from './utils/logger.js';
import { createServer, startStdioServer } from './server.js';
import type { SessionTracker } from './context/session-tracker.js';
import type { OrbitNestClient } from './sdk/orbitnest.client.js';

let _tracker: SessionTracker | null = null;
let _client: OrbitNestClient | null = null;

// ── Graceful shutdown: auto-write session digest on SIGTERM / SIGINT ─────────
// Fires when the MCP host (Claude Desktop, CLI, etc.) terminates the process.
// If the AI wrote decisions/tasks/events but never called orbitnest_sync_memory,
// this writes an auto-generated digest so nothing is silently lost.
async function autoSyncOnExit(signal: string) {
  if (!_tracker || !_client) return;
  const pid = _tracker.getProjectId();
  if (!pid || _tracker.pendingCount() === 0) return;
  try {
    logger.info(`[${signal}] Auto-syncing ${_tracker.pendingCount()} unsynced session writes…`);
    await _client.setProjectProfile(pid, { digest: _tracker.autoDigest() });
    logger.info(`[${signal}] Session digest written to project memory.`);
  } catch (err) {
    logger.warn(`[${signal}] Auto-sync failed — changes may be lost`, { err: String(err) });
  }
}

process.on('SIGTERM', async () => { await autoSyncOnExit('SIGTERM'); process.exit(0); });
process.on('SIGINT',  async () => { await autoSyncOnExit('SIGINT');  process.exit(0); });

async function main(): Promise<void> {
  try {
    const config = loadConfig();
    setLogLevel(config.logLevel);

    logger.info('Starting OrbitNest MCP Server...', {
      version: config.serverVersion,
      apiUrl: config.apiUrl,
    });

    const { server, tracker, apiClient } = await createServer(config);
    _tracker = tracker;
    _client = apiClient;

    await startStdioServer(server);
  } catch (error) {
    logger.error('Failed to start MCP server', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

main();
