import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

// ローカルDynamoDB設定
const dynamodb = DynamoDBDocumentClient.from(new DynamoDBClient({
  region: 'ap-northeast-1',
  endpoint: 'http://localhost:8000',  // DynamoDB Local endpoint
  credentials: {
    accessKeyId: 'dummy',
    secretAccessKey: 'dummy'
  }
}));

async function setupTestData() {
  try {
    // テストデータをスクリプト内で定義
    const testData = {
      teamId: 'test_team_id',
      botToken: 'xoxb-test-bot-token',
      appId: 'test_app_id',
      installedAt: '2024-01-01T00:00:00.000Z'
    };

    // DynamoDBに投入
    const params = {
      TableName: 'slack-mcp-app-slack-installations', // SAMのスタック名に合わせて調整
      Item: testData
    };

    await dynamodb.send(new PutCommand(params));
    console.log('✅ テストデータを正常に投入しました:', testData.teamId);
  } catch (error) {
    console.error('❌ テストデータの投入に失敗しました:', error);
  }
}

setupTestData(); 