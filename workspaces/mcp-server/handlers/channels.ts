import { SlackContext } from '../config/slack-client.js';
import {
  GetUserChannelsRequestSchema,
  GetUserChannelsResponseSchema,
} from '../schemas.js';

/**
 * Handler for retrieving list of channels the user has joined
 */
export async function getUserChannelsHandler(args: unknown) {
  const parsedArgs = GetUserChannelsRequestSchema.parse(args);

  const response = await SlackContext.userClient.users.conversations({
    types: 'public_channel,private_channel',
    exclude_archived: true,
    limit: parsedArgs.limit,
    cursor: parsedArgs.cursor,
  });

  if (!response.ok) {
    throw new Error(`Failed to get user channels: ${response.error}`);
  }

  const parsed = GetUserChannelsResponseSchema.parse(response);
  return {
    content: [{ type: 'text', text: JSON.stringify(parsed) }],
  };
}
