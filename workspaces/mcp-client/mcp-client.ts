import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

let sessionId: string | null = null;
let isInitialized = false;

async function initializeMCPSession(): Promise<void> {
  if (isInitialized && sessionId) {
    return;
  }

  const serverUrl = process.env.MCP_SERVER_URL;
  if (!serverUrl) {
    throw new Error('MCP_SERVER_URL environment variable is required');
  }

  const initResponse = await fetch(serverUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {},
        },
        clientInfo: {
          name: 'slack-mcp-client',
          version: '1.0.0',
        },
      },
    }),
  });

  if (!initResponse.ok) {
    throw new Error(
      `HTTP error during initialize! status: ${initResponse.status}`
    );
  }

  const initResult = (await initResponse.json()) as {
    error?: { message: string };
    result?: { sessionId?: string };
  };

  if (initResult.error) {
    throw new Error(`MCP Server initialize error: ${initResult.error.message}`);
  }

  sessionId =
    initResponse.headers.get('mcp-session-id') ||
    initResult.result?.sessionId ||
    `session-${Date.now()}`;

  isInitialized = true;
  console.log(`MCP session initialized with ID: ${sessionId}`);
}

async function callMCPServer(
  method: string,
  params: Record<string, unknown>
): Promise<unknown> {
  await initializeMCPSession();

  const serverUrl = process.env.MCP_SERVER_URL;
  if (!serverUrl) {
    throw new Error('MCP_SERVER_URL environment variable is required');
  }

  const response = await fetch(serverUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'mcp-session-id': sessionId!,
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method,
      params,
    }),
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result = (await response.json()) as {
    error?: { message: string };
    result?: unknown;
  };

  if (result.error) {
    throw new Error(`MCP Server error: ${result.error.message}`);
  }

  return result.result;
}

export async function cleanupMCPSession(): Promise<void> {
  if (!isInitialized || !sessionId) {
    return;
  }

  try {
    const serverUrl = process.env.MCP_SERVER_URL;
    if (serverUrl) {
      await fetch(serverUrl, {
        method: 'DELETE',
        headers: {
          'mcp-session-id': sessionId,
        },
      });
    }
  } catch (error) {
    console.error('Error cleaning up MCP session:', error);
  } finally {
    sessionId = null;
    isInitialized = false;
  }
}

export async function processQuery(query: string): Promise<string> {
  try {
    await initializeMCPSession();

    const toolsResult = (await callMCPServer('tools/list', {})) as {
      tools?: Array<{
        name: string;
        description?: string;
        inputSchema?: Record<string, unknown>;
      }>;
    };
    const tools = toolsResult.tools || [];

    const formattedTools = tools.map(
      (tool: {
        name: string;
        description?: string;
        inputSchema?: Record<string, unknown>;
      }) => ({
        type: 'function' as const,
        function: {
          name: tool.name,
          description: tool.description || '',
          parameters: tool.inputSchema || {},
        },
      })
    );

    console.log(`Processing query: "${query}"`);

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      {
        role: 'user',
        content: `質問: ${query}`,
      },
    ];

    const maxIterations = 5;
    let iteration = 0;

    while (iteration < maxIterations) {
      const response = await openai.chat.completions.create({
        model: process.env.OPENAI_MODEL || 'gpt-4o',
        messages,
        tools: formattedTools.length > 0 ? formattedTools : undefined,
        tool_choice: formattedTools.length > 0 ? 'auto' : undefined,
        max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS || '4096'),
      });

      const choice = response.choices[0];
      if (!choice.message) {
        break;
      }

      messages.push(choice.message);

      if (choice.message.tool_calls && choice.message.tool_calls.length > 0) {
        for (const toolCall of choice.message.tool_calls) {
          try {
            const toolResult = (await callMCPServer('tools/call', {
              name: toolCall.function.name,
              arguments: JSON.parse(toolCall.function.arguments),
            })) as { content?: unknown };

            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: JSON.stringify(toolResult.content || toolResult),
            });
          } catch (error) {
            console.error(
              `Tool call error for ${toolCall.function.name}:`,
              error
            );
            messages.push({
              role: 'tool',
              tool_call_id: toolCall.id,
              content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            });
          }
        }
      } else {
        return (
          choice.message.content || 'すみません、回答を生成できませんでした。'
        );
      }

      iteration++;
    }

    const finalResponse = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4o',
      messages: [
        ...messages,
        {
          role: 'user',
          content: `これまでに収集した情報を基に、質問「${query}」に対する最終的な回答をまとめてください。`,
        },
      ],
      max_tokens: parseInt(process.env.OPENAI_MAX_TOKENS || '4096'),
    });

    return (
      finalResponse.choices[0]?.message?.content ||
      'すみません、回答を生成できませんでした。'
    );
  } catch (error) {
    console.error('Query processing error:', error);
    return 'エラーが発生しました。しばらく時間をおいてから再度お試しください。';
  }
}
