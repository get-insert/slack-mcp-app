import { z } from 'zod';

//
// Basic schemas
//

export const ChannelSchema = z
  .object({
    conversation_host_id: z.string().optional(),
    created: z.number().optional(),
    id: z.string().optional(),
    is_archived: z.boolean().optional(),
    name: z.string().optional(),
    name_normalized: z.string().optional(),
    num_members: z.number().optional(),
    purpose: z
      .object({
        creator: z.string().optional(),
        last_set: z.number().optional(),
        value: z.string().optional(),
      })
      .optional(),
    shared_team_ids: z.array(z.string()).optional(),
    topic: z
      .object({
        creator: z.string().optional(),
        last_set: z.number().optional(),
        value: z.string().optional(),
      })
      .optional(),
    updated: z.number().optional(),
  })
  .strip();

const ReactionSchema = z
  .object({
    count: z.number().optional(),
    name: z.string().optional(),
    url: z.string().optional(),
    users: z.array(z.string()).optional(),
  })
  .strip();

const ConversationsHistoryMessageSchema = z
  .object({
    reactions: z.array(ReactionSchema).optional(),
    reply_count: z.number().optional(),
    reply_users: z.array(z.string()).optional(),
    reply_users_count: z.number().optional(),
    subtype: z.string().optional(),
    text: z.string().optional(),
    thread_ts: z.string().optional(),
    ts: z.string().optional(),
    type: z.string().optional(),
    user: z.string().optional(),
  })
  .strip();

const MemberSchema = z
  .object({
    deleted: z.boolean().optional(),
    id: z.string().optional(),
    is_admin: z.boolean().optional(),
    is_app_user: z.boolean().optional(),
    is_bot: z.boolean().optional(),
    is_connector_bot: z.boolean().optional(),
    is_email_confirmed: z.boolean().optional(),
    is_invited_user: z.boolean().optional(),
    is_owner: z.boolean().optional(),
    is_primary_owner: z.boolean().optional(),
    is_restricted: z.boolean().optional(),
    is_ultra_restricted: z.boolean().optional(),
    is_workflow_bot: z.boolean().optional(),
    name: z.string().optional(),
    real_name: z.string().optional(),
    team_id: z.string().optional(),
    updated: z.number().optional(),
  })
  .strip();

const ProfileSchema = z
  .object({
    display_name: z.string().optional(),
    display_name_normalized: z.string().optional(),
    email: z.string().email().optional(),
    first_name: z.string().optional(),
    last_name: z.string().optional(),
    phone: z.string().optional(),
    real_name: z.string().optional(),
    real_name_normalized: z.string().optional(),
    title: z.string().optional(),
  })
  .strip();

const SearchMessageSchema = z
  .object({
    channel: z
      .object({
        id: z.string().optional(),
        name: z.string().optional(),
      })
      .optional(),
    permalink: z.string().url().optional(),
    text: z.string().optional(),
    ts: z.string().optional(),
    type: z.string().optional(),
    user: z.string().optional(),
  })
  .strip();

//
// Request schemas
//

export const AddReactionRequestSchema = z.object({
  channel_id: z
    .string()
    .describe('The ID of the channel containing the message'),
  reaction: z.string().describe('The name of the emoji reaction (without ::)'),
  timestamp: z
    .string()
    .regex(/^\d{10}\.\d{6}$/, {
      message: "Timestamp must be in the format '1234567890.123456'",
    })
    .describe(
      "The timestamp of the message to react to in the format '1234567890.123456'"
    ),
});

export const GetChannelHistoryRequestSchema = z.object({
  channel_id: z.string().describe('The ID of the channel'),
  cursor: z
    .string()
    .optional()
    .describe('Pagination cursor for next page of results'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(1000) // Align with Slack API's default limit
    .optional()
    .default(100) // The reference repository uses 10, but aligning with list_channels etc., set to 100
    .describe('Number of messages to retrieve (default 100)'),
});

export const GetThreadRepliesRequestSchema = z.object({
  channel_id: z
    .string()
    .describe('The ID of the channel containing the thread'),
  thread_ts: z
    .string()
    .regex(/^\d{10}\.\d{6}$/, {
      message: "Timestamp must be in the format '1234567890.123456'",
    })
    .describe(
      "The timestamp of the parent message in the format '1234567890.123456'. Timestamps in the format without the period can be converted by adding the period such that 6 numbers come after it."
    ),
  cursor: z
    .string()
    .optional()
    .describe('Pagination cursor for next page of results'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .optional()
    .default(100)
    .describe('Number of replies to retrieve (default 100)'),
});

export const GetUsersRequestSchema = z.object({
  cursor: z
    .string()
    .optional()
    .describe('Pagination cursor for next page of results'),
  limit: z
    .number()
    .int()
    .min(1)
    .optional()
    .default(100)
    .describe('Maximum number of users to return (default 100)'),
});

export const GetUserProfileRequestSchema = z.object({
  user_id: z.string().describe('The ID of the user'),
});

export const PostMessageRequestSchema = z.object({
  channel_id: z.string().describe('The ID of the channel to post to'),
  text: z.string().describe('The message text to post'),
});

export const ReplyToThreadRequestSchema = z.object({
  channel_id: z
    .string()
    .describe('The ID of the channel containing the thread'),
  text: z.string().describe('The reply text'),
  thread_ts: z
    .string()
    .regex(/^\d{10}\.\d{6}$/, {
      message: "Timestamp must be in the format '1234567890.123456'",
    })
    .describe(
      "The timestamp of the parent message in the format '1234567890.123456'. Timestamps in the format without the period can be converted by adding the period such that 6 numbers come after it."
    ),
});

export const SearchMessagesRequestSchema = z.object({
  query: z.string().optional().default('').describe('Basic search query'),

  in_channel: z
    .string()
    .optional()
    .describe('Search within a specific channel (channel name or ID)'),
  in_group: z
    .string()
    .optional()
    .describe('Search within a specific private group (group name or ID)'),
  in_dm: z
    .string()
    .optional()
    .describe('Search within a specific direct message (user ID)'),
  from_user: z
    .string()
    .optional()
    .describe('Search for messages from a specific user (username or ID)'),
  from_bot: z
    .string()
    .optional()
    .describe('Search for messages from a specific bot (bot name)'),

  highlight: z
    .boolean()
    .optional()
    .default(false)
    .describe('Enable highlighting of search results'),
  sort: z
    .enum(['score', 'timestamp'])
    .optional()
    .default('score')
    .describe('Search result sort method (score or timestamp)'),
  sort_dir: z
    .enum(['asc', 'desc'])
    .optional()
    .default('desc')
    .describe('Sort direction (ascending or descending)'),

  count: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(20)
    .describe('Number of results per page (max 100)'),
  page: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(1)
    .describe('Page number of results (max 100)'),
});

export const SearchMentionsRequestSchema = z.object({
  user_id: z.string().describe('ID of the user to search for mentions'),
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .default(20)
    .describe('Maximum number of messages to retrieve (default 20)'),
  after: z
    .string()
    .optional()
    .describe('Search for mentions after this date (YYYY-MM-DD format)'),
  before: z
    .string()
    .optional()
    .describe('Search for mentions before this date (YYYY-MM-DD format)'),
});

const SearchPaginationSchema = z.object({
  first: z.number().optional(),
  last: z.number().optional(),
  page: z.number().optional(),
  page_count: z.number().optional(),
  per_page: z.number().optional(),
  total_count: z.number().optional(),
});

//
// Response schemas
//

const BaseResponseSchema = z
  .object({
    error: z.string().optional(),
    ok: z.boolean().optional(),
    response_metadata: z
      .object({
        next_cursor: z.string().optional(),
      })
      .optional(),
  })
  .strip();

export const ConversationsHistoryResponseSchema = BaseResponseSchema.extend({
  messages: z.array(ConversationsHistoryMessageSchema).optional(),
});

export const ConversationsRepliesResponseSchema = BaseResponseSchema.extend({
  messages: z.array(ConversationsHistoryMessageSchema).optional(),
});

export const GetUsersResponseSchema = BaseResponseSchema.extend({
  members: z.array(MemberSchema).optional(),
});

export const GetUserProfileResponseSchema = BaseResponseSchema.extend({
  profile: ProfileSchema.optional(),
});

export const SearchMessagesResponseSchema = BaseResponseSchema.extend({
  messages: z
    .object({
      matches: z.array(SearchMessageSchema).optional(),
      pagination: SearchPaginationSchema.optional(),
    })
    .optional(),
});

export const GetCurrentUserResponseSchema = BaseResponseSchema.extend({
  user_id: z.string().optional(),
  user: z.string().optional(),
  team_id: z.string().optional(),
  team: z.string().optional(),
  url: z.string().optional(),
});

// Canvas related schemas
export const GetUserChannelsRequestSchema = z.object({
  limit: z.number().optional().default(100),
  cursor: z.string().optional(),
});

export const GetUserChannelsResponseSchema = z.object({
  ok: z.boolean(),
  channels: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      is_private: z.boolean(),
      is_member: z.boolean().optional(),
      num_members: z.number().optional(),
    })
  ),
  response_metadata: z
    .object({
      next_cursor: z.string().optional(),
    })
    .optional(),
});

export const ListFilesInChannelRequestSchema = z.object({
  channel_id: z.string(),
  limit: z.number().optional().default(10),
  cursor: z.string().optional(),
  types: z.string().optional(),
});

export const FileInfoSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  title: z.string().optional(),
  mimetype: z.string().optional(),
  filetype: z.string().optional(),
  size: z.number().optional(),
  url_private: z.string().optional(),
  preview: z.string().optional(),
  created: z.number().optional(),
  timestamp: z.number().optional(),
  user: z.string().optional(),
  editable: z.boolean().optional(),
});

export const ListFilesResponseSchema = z.object({
  ok: z.boolean(),
  files: z.array(FileInfoSchema),
  paging: z
    .object({
      count: z.number(),
      total: z.number(),
      page: z.number(),
      pages: z.number(),
    })
    .optional(),
});

export const GetFileInfoRequestSchema = z.object({
  file_id: z.string(),
});

export const SummarizeChannelFilesRequestSchema = z.object({
  max_files_per_channel: z.number().optional().default(5),
  include_private: z.boolean().optional().default(true),
  file_types: z.string().optional().default(''),
});

// Canvas schemas
export const ListChannelCanvasesRequestSchema = z.object({
  channel_id: z.string(),
  limit: z.number().optional().default(10),
  cursor: z.string().optional(),
});

export const CanvasBlockSchema = z.object({
  type: z.string(),
  block_id: z.string().optional(),
  text: z
    .object({
      type: z.string(),
      text: z.string(),
      verbatim: z.boolean().optional(),
    })
    .optional(),
  elements: z.array(z.unknown()).optional(),
});

export const CanvasInfoSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  date_created: z.number().optional(),
  date_updated: z.number().optional(),
  date_deleted: z.number().optional(),
  channel_id: z.string().optional(),
  user_id: z.string().optional(),
});

export const GetCanvasContentRequestSchema = z.object({
  canvas_id: z.string(),
});

export const CanvasResponseSchema = z.object({
  ok: z.boolean(),
  canvas: z
    .object({
      id: z.string(),
      title: z.string().optional(),
      blocks: z.array(CanvasBlockSchema).optional(),
      date_created: z.number().optional(),
      date_updated: z.number().optional(),
      channel_id: z.string().optional(),
      user_id: z.string().optional(),
    })
    .optional(),
  canvases: z.array(CanvasInfoSchema).optional(),
});

export const SummarizeUserCanvasesRequestSchema = z.object({
  max_canvases_per_channel: z.number().optional().default(5),
  include_private: z.boolean().optional().default(true),
});

// User channel activity schemas
export const GetUserChannelActivityRequestSchema = z.object({
  days: z
    .number()
    .optional()
    .default(1)
    .describe('Number of days to retrieve (default 1)'),
  max_channels: z
    .number()
    .optional()
    .default(5)
    .describe('Maximum number of channels to retrieve (default 5)'),
  max_messages_per_channel: z
    .number()
    .optional()
    .default(10)
    .describe(
      'Maximum number of messages to retrieve per channel (default 10)'
    ),
  include_private: z
    .boolean()
    .optional()
    .default(true)
    .describe('Whether to include private channels (default true)'),
});

export const MessageActivitySchema = z.object({
  channel_id: z.string(),
  channel_name: z.string(),
  messages: z.array(
    z.object({
      text: z.string(),
      user: z.string().optional(),
      ts: z.string(),
      reply_count: z.number().optional(),
      reaction_count: z.number().optional(),
      has_mention: z.boolean().optional(),
      permalink: z.string().optional(),
    })
  ),
});

export const GetUserChannelActivityResponseSchema = z.object({
  ok: z.boolean(),
  date: z.string(),
  channels_summary: z.array(MessageActivitySchema),
});
