import { DynamoDBClient, CreateTableCommand, DescribeTableCommand } from '@aws-sdk/client-dynamodb';

const dynamodb = new DynamoDBClient({
  region: 'ap-northeast-1',
  endpoint: 'http://localhost:8000',
  credentials: {
    accessKeyId: 'dummy',
    secretAccessKey: 'dummy'
  }
});

const tableName = 'slack-mcp-app-slack-installations';

async function createTable() {
  try {
    // テーブルが既に存在するかチェック
    try {
      await dynamodb.send(new DescribeTableCommand({ TableName: tableName }));
      console.log('✅ テーブルは既に存在します:', tableName);
      return;
    } catch {
      // テーブルが存在しない場合は作成に進む
    }

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
  } catch (error) {
    console.error('❌ テーブル作成に失敗しました:', error);
  }
}

createTable(); 