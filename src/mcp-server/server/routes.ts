import express from 'express';
import { WebClient } from '@slack/web-api';

import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import { TransportManager } from './transport.js';
import { SlackContext } from '../config/slack-client.js';
import { createSlackRouter } from '../interfaces/http/slack.js';
import { SlackOAuthAdapter } from '../infrastructure/adapters/slack-oauth.js';
import { DynamoDBInstallationRepository } from '../infrastructure/repositories/dynamo/installation.js';
import { HandleOAuthUseCase } from '../usecases/handle-oauth-usercase.js';
import { SlackRequestVerifierAdapter } from '../infrastructure/adapters/slack-request-verifier.js';

/**
 * Function to set up Express routes
 */
export function setupRoutes(
  app: express.Application,
  transportManager: TransportManager
): void {
  // Common handler for GET/DELETE requests
  const handleSessionRequest = async (
    req: express.Request,
    res: express.Response
  ) => {
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    if (!sessionId || !transportManager.getTransport(sessionId)) {
      res.status(400).send('Invalid or missing session ID');
      return;
    }

    const transport = transportManager.getTransport(sessionId)!;
    await transport.handleRequest(req, res);
  };

  // GET request handler (server to client notification via SSE)
  app.get('/mcp', handleSessionRequest);

  // DELETE request handler (session termination)
  app.delete('/mcp', handleSessionRequest);

  // POST request handler (client to server communication)
  app.post('/mcp', async (req, res) => {
    const teamId = req.headers['x-team-id'] as string;

    const installationRepo = new DynamoDBInstallationRepository();
    const installation = await installationRepo.findByTeam(teamId);
    if (!installation) {
      console.log('No installation found for team:', teamId);
      res.status(401).json({ error: 'Missing slack_bot_token' });
      return;
    }

    SlackContext.botClient = new WebClient(installation.botToken);
    if (installation.authedUser?.accessToken) {
      SlackContext.userClient = new WebClient(
        installation.authedUser.accessToken
      );
    }

    // Parse request body if it's a Buffer
    let parsedBody = req.body;
    if (Buffer.isBuffer(req.body)) {
      console.log('Request body is Buffer, parsing...');
      parsedBody = JSON.parse(req.body.toString());
    } else if (
      req.body &&
      typeof req.body === 'object' &&
      req.body.type === 'Buffer'
    ) {
      console.log('Request body is Buffer object, converting...');
      const buffer = Buffer.from(req.body.data);
      parsedBody = JSON.parse(buffer.toString());
    }

    // Debug logging
    console.log('Parsed request body:', JSON.stringify(parsedBody));
    console.log('isInitializeRequest result:', isInitializeRequest(parsedBody));
    console.log('parsedBody type:', typeof parsedBody);
    console.log('parsedBody method:', parsedBody?.method);

    // Check for existing session ID
    const sessionId = req.headers['mcp-session-id'] as string | undefined;
    console.log('Session ID from headers:', sessionId);
    if (sessionId && transportManager.getTransport(sessionId)) {
      // Reuse existing transport
      const transport = transportManager.getTransport(sessionId)!;
      await transport.handleRequest(req, res, parsedBody);
    } else if (!sessionId && isInitializeRequest(parsedBody)) {
      // New initialization request
      console.log('Creating new transport for initialize request');
      const transport = await transportManager.createTransport();
      console.log(
        'Transport created, handling request with body:',
        JSON.stringify(parsedBody)
      );
      try {
        await transport.handleRequest(req, res, parsedBody);
        console.log('Transport handleRequest completed successfully');
      } catch (error) {
        console.error('Error in transport.handleRequest:', error);
        throw error;
      }
    } else {
      // Invalid request
      res.status(400).json({
        jsonrpc: '2.0',
        error: {
          code: -32000,
          message: 'Bad Request: No valid session ID provided',
        },
        id: null,
      });
    }
  });

  const oauthPort = new SlackOAuthAdapter(
    process.env.SLACK_CLIENT_ID!,
    process.env.SLACK_CLIENT_SECRET!,
    process.env.SLACK_REDIRECT_URI!
  );
  const installationRepo = new DynamoDBInstallationRepository();
  const oauthUseCase = new HandleOAuthUseCase(oauthPort, installationRepo);
  const verifierAdapter = new SlackRequestVerifierAdapter(
    process.env.SLACK_SIGNING_SECRET!
  );
  app.use('/', createSlackRouter(oauthUseCase, verifierAdapter));
}
