#!/usr/bin/env node
import { loadConfig } from './config.js';
import { setLogLevel } from './utils/logger.js';
import { logger } from './utils/logger.js';
import { createServer, startStdioServer } from './server.js';

async function main(): Promise<void> {
  try {
    const config = loadConfig();
    setLogLevel(config.logLevel);

    logger.info('Starting OrbitNest MCP Server...', {
      version: config.serverVersion,
      apiUrl: config.apiUrl,
    });

    const server = await createServer(config);
    await startStdioServer(server);
  } catch (error) {
    logger.error('Failed to start MCP server', {
      error: error instanceof Error ? error.message : String(error),
    });
    process.exit(1);
  }
}

main();
