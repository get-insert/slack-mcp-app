import { DynamoDBClient, CreateTableCommand, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand } from '@aws-sdk/lib-dynamodb';

const dynamodb = new DynamoDBClient({
  region: 'ap-northeast-1',
  endpoint: 'http://localhost:8000',
  credentials: {
    accessKeyId: 'dummy',
    secretAccessKey: 'dummy'
  }
});

const docClient = DynamoDBDocumentClient.from(dynamodb);
const tableName = 'slack-mcp-app-slack-installations';

async function createTable() {
  try {
    await dynamodb.send(new DescribeTableCommand({ TableName: tableName }));
    console.log('✅ テーブルは既に存在します:', tableName);
    return true;
  } catch {
    // テーブルが存在しない場合は作成
    console.log('📝 テーブルを作成中...');
  }

  try {
    const createTableParams = {
      TableName: tableName,
      BillingMode: 'PAY_PER_REQUEST',
      AttributeDefinitions: [
        {
          AttributeName: 'teamId',
          AttributeType: 'S'
        },
        {
          AttributeName: 'installedAt',
          AttributeType: 'S'
        }
      ],
      KeySchema: [
        {
          AttributeName: 'teamId',
          KeyType: 'HASH'
        }
      ],
      GlobalSecondaryIndexes: [
        {
          IndexName: 'teamId-installedAt-index',
          KeySchema: [
            {
              AttributeName: 'teamId',
              KeyType: 'HASH'
            },
            {
              AttributeName: 'installedAt',
              KeyType: 'RANGE'
            }
          ],
          Projection: {
            ProjectionType: 'ALL'
          }
        }
      ]
    };

    await dynamodb.send(new CreateTableCommand(createTableParams));
    console.log('✅ テーブルを作成しました:', tableName);
    
    // テーブル作成後、少し待つ
    await new Promise(resolve => setTimeout(resolve, 2000));
    return true;
  } catch (error) {
    console.error('❌ テーブル作成に失敗しました:', error);
    return false;
  }
}

async function insertTestData() {
  try {
    // テストデータをスクリプト内で定義
    const testData = {
      teamId: 'test_team_id',
      botToken: 'xoxb-test-bot-token',
      appId: 'test_app_id',
      installedAt: '2024-01-01T00:00:00.000Z'
    };

    const params = {
      TableName: tableName,
      Item: testData
    };

    await docClient.send(new PutCommand(params));
    console.log('✅ テストデータを投入しました:', testData.teamId);
  } catch (error) {
    console.error('❌ テストデータの投入に失敗しました:', error);
  }
}

async function setupLocalEnvironment() {
  console.log('🚀 ローカル開発環境をセットアップ中...');
  
  const tableCreated = await createTable();
  if (tableCreated) {
    await insertTestData();
    console.log('🎉 セットアップが完了しました！');
  }
}

setupLocalEnvironment(); 