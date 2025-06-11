import { App, Receiver } from '@slack/bolt';
import { processQuery, cleanupMCPSession } from './mcp-client.js';

export function createSlackApp(receiver?: Receiver) {
  const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    receiver,
  });

  app.event('app_mention', async ({ event, say }) => {
    try {
      const query = event.text.replace(/<@[^>]+>/g, '').trim();

      if (!query) {
        await say('こんにちは！何かお手伝いできることはありますか？');
        return;
      }

      const response = await processQuery(query);
      await say(response);
    } catch (error) {
      console.error('Error processing app_mention:', error);
      await say('申し訳ございません。エラーが発生しました。');
    } finally {
      await cleanupMCPSession();
    }
  });

  app.message(async ({ message, say }) => {
    try {
      if (message.subtype || !('text' in message)) {
        return;
      }

      const query = message.text;
      if (!query || query.length < 3) {
        return;
      }

      const response = await processQuery(query);
      await say(response);
    } catch (error) {
      console.error('Error processing message:', error);
      await say('申し訳ございません。エラーが発生しました。');
    } finally {
      await cleanupMCPSession();
    }
  });

  return app;
}
