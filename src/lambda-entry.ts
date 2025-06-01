import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Context,
} from 'aws-lambda';
import { configure } from '@codegenie/serverless-express';
import express from 'express';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { TransportManager } from './server/transport';
import { setupRoutes } from './server/routes';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { z } from 'zod';
import { handlers } from './handlers/index';
import {
  ListChannelsRequestSchema,
  PostMessageRequestSchema,
  ReplyToThreadRequestSchema,
  AddReactionRequestSchema,
  GetChannelHistoryRequestSchema,
  GetThreadRepliesRequestSchema,
  GetUsersRequestSchema,
  GetUserProfileRequestSchema,
  SearchMessagesRequestSchema,
  SearchMentionsRequestSchema,
  GetUserChannelsRequestSchema,
  ListFilesInChannelRequestSchema,
  GetFileInfoRequestSchema,
  SummarizeChannelFilesRequestSchema,
  ListChannelCanvasesRequestSchema,
  GetCanvasContentRequestSchema,
  SummarizeUserCanvasesRequestSchema,
  GetUserChannelActivityRequestSchema,
} from './schemas';

let serverlessExpressInstance: ReturnType<typeof configure> | undefined;

function createMCPServer(): Server {
  const server = new Server(
    {
      name: 'slack-mcp-server',
      version: '0.0.1',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: [
        {
          name: 'slack_list_channels',
          description: 'List public channels in the workspace with pagination',
          inputSchema: zodToJsonSchema(ListChannelsRequestSchema),
        },
        {
          name: 'slack_post_message',
          description: 'Post a new message to a Slack channel',
          inputSchema: zodToJsonSchema(PostMessageRequestSchema),
        },
        {
          name: 'slack_reply_to_thread',
          description: 'Reply to a specific message thread in Slack',
          inputSchema: zodToJsonSchema(ReplyToThreadRequestSchema),
        },
        {
          name: 'slack_add_reaction',
          description: 'Add a reaction emoji to a message',
          inputSchema: zodToJsonSchema(AddReactionRequestSchema),
        },
        {
          name: 'slack_get_channel_history',
          description: 'Get recent messages from a channel',
          inputSchema: zodToJsonSchema(GetChannelHistoryRequestSchema),
        },
        {
          name: 'slack_get_thread_replies',
          description: 'Get all replies in a message thread',
          inputSchema: zodToJsonSchema(GetThreadRepliesRequestSchema),
        },
        {
          name: 'slack_get_users',
          description:
            'Retrieve basic profile information of all users in the workspace',
          inputSchema: zodToJsonSchema(GetUsersRequestSchema),
        },
        {
          name: 'slack_get_user_profile',
          description: "Get a user's profile information",
          inputSchema: zodToJsonSchema(GetUserProfileRequestSchema),
        },
        {
          name: 'slack_search_messages',
          description: 'Search for messages in the workspace',
          inputSchema: zodToJsonSchema(SearchMessagesRequestSchema),
        },
        {
          name: 'slack_search_mentions',
          description: 'Search for messages that mention a specific user',
          inputSchema: zodToJsonSchema(SearchMentionsRequestSchema),
        },
        {
          name: 'slack_get_current_user',
          description:
            'Get information about the current user associated with the token',
          inputSchema: zodToJsonSchema(z.object({})),
        },
        {
          name: 'slack_get_user_channels',
          description:
            'Get all channels (including private) the user is a member of',
          inputSchema: zodToJsonSchema(GetUserChannelsRequestSchema),
        },
        {
          name: 'slack_list_files_in_channel',
          description: 'Get list of files in a channel',
          inputSchema: zodToJsonSchema(ListFilesInChannelRequestSchema),
        },
        {
          name: 'slack_get_file_info',
          description: 'Get information about a specific file',
          inputSchema: zodToJsonSchema(GetFileInfoRequestSchema),
        },
        {
          name: 'slack_summarize_channel_files',
          description:
            'Summarize files from all channels the user is a member of',
          inputSchema: zodToJsonSchema(SummarizeChannelFilesRequestSchema),
        },
        {
          name: 'slack_list_channel_canvases',
          description: 'Get list of canvases in a channel',
          inputSchema: zodToJsonSchema(ListChannelCanvasesRequestSchema),
        },
        {
          name: 'slack_get_canvas_content',
          description: 'Get the content of a specific canvas',
          inputSchema: zodToJsonSchema(GetCanvasContentRequestSchema),
        },
        {
          name: 'slack_summarize_user_canvases',
          description:
            'Summarize canvases from all channels the user is a member of',
          inputSchema: zodToJsonSchema(SummarizeUserCanvasesRequestSchema),
        },
        {
          name: 'slack_get_user_channel_activity',
          description:
            '参加しているチャンネルの最近のアクティビティや顕著な動きをまとめる',
          inputSchema: zodToJsonSchema(GetUserChannelActivityRequestSchema),
        },
      ],
    };
  });

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      if (!request.params) {
        throw new Error('Params are required');
      }

      const toolName = request.params.name;
      const handler = handlers[toolName];

      if (!handler) {
        throw new Error(`Unknown tool: ${toolName}`);
      }

      return await handler(request.params.arguments);
    } catch (error) {
      console.error('Error handling request:', error);
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error occurred';
      throw new Error(errorMessage);
    }
  });

  return server;
}

function createExpressApp(): express.Application {
  const app = express();
  app.use(express.json());

  const server = createMCPServer();
  const transportManager = new TransportManager(server);

  setupRoutes(app, transportManager);

  return app;
}

export const handler = async (
  event: APIGatewayProxyEvent,
  context: Context
): Promise<APIGatewayProxyResult> => {
  if (!serverlessExpressInstance) {
    const app = createExpressApp();
    serverlessExpressInstance = configure({ app });
  }

  return new Promise((resolve, reject) => {
    if (!serverlessExpressInstance) {
      reject(new Error('Serverless express instance not initialized'));
      return;
    }
    serverlessExpressInstance(
      event,
      context,
      (error: unknown, result: unknown) => {
        if (error) {
          reject(error);
        } else {
          resolve(result as APIGatewayProxyResult);
        }
      }
    );
  });
};
