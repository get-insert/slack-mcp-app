#!/usr/bin/env node

import { createSlackApp } from './slack-handler.js';

async function main() {
  const app = createSlackApp();

  const port = process.env.MCP_CLIENT_PORT ? parseInt(process.env.MCP_CLIENT_PORT) : (process.env.PORT ? parseInt(process.env.PORT) : 3000);
  await app.start(port);

  console.log(`⚡️ Slack MCP Client is running on port ${port}!`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error) => {
    console.error('Failed to start Slack MCP Client:', error);
    process.exit(1);
  });
}
