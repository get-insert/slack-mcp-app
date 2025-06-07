import { SlackContext } from '../config/slack-client.js';
import {
  ListChannelCanvasesRequestSchema,
  GetCanvasContentRequestSchema,
  SummarizeUserCanvasesRequestSchema,
} from '../schemas.js';
import { filterCanvasFiles } from '../utils/canvas.js';

/**
 * Handler for retrieving canvas list in a channel
 */
export async function listChannelCanvasesHandler(args: unknown) {
  const parsedArgs = ListChannelCanvasesRequestSchema.parse(args);

  try {
    try {
      const canvasResponse = await SlackContext.userClient.apiCall(
        'conversations.canvases.list',
        {
          channel_id: parsedArgs.channel_id,
          limit: parsedArgs.limit || 100,
          cursor: parsedArgs.cursor,
        }
      );

      if (canvasResponse.ok) {
        return {
          content: [{ type: 'text', text: JSON.stringify(canvasResponse) }],
        };
      }
    } catch (apiError) {
      console.warn('conversations.canvases.list not available:', apiError);
    }

    // Fallback to files.list API
    const filesResponse = await SlackContext.userClient.files.list({
      channel: parsedArgs.channel_id,
      types: 'all',
      count: parsedArgs.limit || 100,
      page: parsedArgs.cursor ? parseInt(parsedArgs.cursor) : 1,
    });

    if (!filesResponse.ok) {
      throw new Error(`Failed to get channel files: ${filesResponse.error}`);
    }

    if (!filesResponse.files || filesResponse.files.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              ok: true,
              message: 'No files found in channel',
              files: [],
            }),
          },
        ],
      };
    }

    const canvasFiles = filterCanvasFiles(filesResponse.files);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            ok: true,
            files: canvasFiles,
            total: canvasFiles.length,
          }),
        },
      ],
    };
  } catch (error) {
    console.error('Error getting canvases:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to get canvases: ${errorMessage}`);
  }
}

/**
 * Handler for retrieving canvas content with enhanced access attempts
 */
export async function getCanvasContentHandler(args: unknown) {
  const parsedArgs = GetCanvasContentRequestSchema.parse(args);

  try {
    console.log(`Getting enhanced info for canvas ID: ${parsedArgs.canvas_id}`);

    // Get basic information for specific canvas
    const response = await SlackContext.userClient.files.info({
      file: parsedArgs.canvas_id,
    });

    if (!response.ok) {
      throw new Error(`Failed to get canvas info: ${response.error}`);
    }

    const file = response.file;
    if (!file) {
      throw new Error('Canvas file information not found');
    }

    const downloadAttempt = {
      attempted: false,
      success: false,
      content: null as string | null,
      contentType: null as string | null,
      error: null as string | null,
      downloadUrl: null as string | null,
    };

    if (file.url_private_download) {
      downloadAttempt.attempted = true;
      downloadAttempt.downloadUrl = file.url_private_download;

      try {
        console.log(
          `Attempting Canvas content download from: ${file.url_private_download}`
        );

        const downloadResponse = await fetch(file.url_private_download, {
          headers: {
            Authorization: `Bearer ${SlackContext.userClient.token}`,
            'User-Agent': 'slack-mcp-server/1.0',
          },
        });

        if (downloadResponse.ok) {
          const contentType =
            downloadResponse.headers.get('content-type') || 'unknown';
          downloadAttempt.contentType = contentType;

          console.log(`Download successful. Content-Type: ${contentType}`);

          const content = await downloadResponse.text();
          downloadAttempt.content = content;
          downloadAttempt.success = true;

          console.log(
            `Canvas content retrieved successfully. Length: ${content.length} characters`
          );
        } else {
          downloadAttempt.error = `HTTP ${downloadResponse.status}: ${downloadResponse.statusText}`;
          console.warn(`Canvas download failed: ${downloadAttempt.error}`);
        }
      } catch (downloadError) {
        downloadAttempt.error =
          downloadError instanceof Error
            ? downloadError.message
            : 'Unknown download error';
        console.error('Canvas download error:', downloadError);
      }
    } else {
      console.log('No url_private_download available for this Canvas');
    }

    // Return Canvas information with download attempt
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            ok: true,
            canvas: {
              id: file.id,
              title: file.title || file.name || 'Untitled Canvas',
              type: file.filetype || '',
              created_at: file.created || 0,
              updated_at: file.updated || file.timestamp || 0,
              created_by: file.user || '',
              url: file.url_private || '',
              permalink: file.permalink || '',
              mimetype: file.mimetype || '',
              size: file.size || 0,
              is_editable: file.editable || false,
            },
            content_retrieval: {
              download_attempt: downloadAttempt,
              summary: downloadAttempt.success
                ? 'Canvas content successfully retrieved via file download'
                : 'Canvas content cannot be retrieved - file download failed',
            },
          }),
        },
      ],
    };
  } catch (error) {
    console.error('Error getting canvas info:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to get canvas info: ${errorMessage}`);
  }
}

/**
 * Handler for summarizing user canvases
 */
export async function summarizeUserCanvasesHandler(args: unknown) {
  const parsedArgs = SummarizeUserCanvasesRequestSchema.parse(args);

  try {
    // 1. Get all channels the user is participating in
    const channelsResponse = await SlackContext.userClient.users.conversations({
      types: parsedArgs.include_private
        ? 'public_channel,private_channel'
        : 'public_channel',
      exclude_archived: true,
      limit: 200, // Get maximum number
    });

    if (!channelsResponse.ok) {
      throw new Error(`Failed to get user channels: ${channelsResponse.error}`);
    }

    if (!channelsResponse.channels || channelsResponse.channels.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              ok: true,
              message: 'No channels found',
              channel_summaries: [],
            }),
          },
        ],
      };
    }

    const channelSummaries = [];

    // 2. Get canvas information from each channel and compile information
    for (const channel of channelsResponse.channels) {
      try {
        // Get file list in channel
        const filesResponse = await SlackContext.userClient.files.list({
          channel: channel.id,
          types: 'all', // Get all types
          count: parsedArgs.max_canvases_per_channel || 20,
        });

        if (
          !filesResponse.ok ||
          !filesResponse.files ||
          filesResponse.files.length === 0
        ) {
          continue; // Skip this channel
        }

        const canvasFiles = filterCanvasFiles(filesResponse.files);

        if (canvasFiles.length === 0) {
          continue; // Skip if no canvases
        }

        // Collect basic canvas information only (don't retrieve content)
        const canvases = canvasFiles.map((canvas) => ({
          id: canvas.id,
          title: canvas.title || canvas.name || 'Untitled Canvas',
          created: canvas.created || canvas.timestamp || 0,
          updated: canvas.updated || canvas.timestamp || canvas.created || 0,
          user_id: canvas.user || '',
          permalink: canvas.permalink || '',
          url: canvas.url_private || '',
        }));

        if (canvases.length > 0) {
          channelSummaries.push({
            channel_name: channel.name,
            channel_id: channel.id,
            is_private: channel.is_private,
            canvases: canvases,
          });
        }
      } catch (error) {
        console.error(`Error processing channel ${channel.id}:`, error);
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify({
            ok: true,
            channel_summaries: channelSummaries,
          }),
        },
      ],
    };
  } catch (error) {
    console.error('Error summarizing canvases:', error);
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to summarize canvases: ${errorMessage}`);
  }
}
