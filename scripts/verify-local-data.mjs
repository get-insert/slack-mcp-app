import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand, ScanCommand } from '@aws-sdk/lib-dynamodb';

const dynamodb = new DynamoDBClient({
  region: 'us-east-1',
  endpoint: 'http://localhost:8000',
  credentials: {
    accessKeyId: 'dummy',
    secretAccessKey: 'dummy'
  }
});

const docClient = DynamoDBDocumentClient.from(dynamodb);
const tableName = 'slack-mcp-app-slack-installations';

async function verifyData() {
  try {
    console.log('🔍 DynamoDBローカルのデータを確認中...');
    console.log('テーブル名:', tableName);
    
    // 全データをスキャン
    const scanResult = await docClient.send(new ScanCommand({
      TableName: tableName
    }));
    
    console.log('📊 スキャン結果:');
    console.log('アイテム数:', scanResult.Items?.length || 0);
    
    if (scanResult.Items && scanResult.Items.length > 0) {
      console.log('📋 保存されているデータ:');
      scanResult.Items.forEach((item, index) => {
        console.log(`${index + 1}:`, JSON.stringify(item, null, 2));
      });
    }
    
    // 特定のteamIdでクエリテスト
    console.log('\n🎯 test_team_idでクエリテスト:');
    const queryResult = await docClient.send(new QueryCommand({
      TableName: tableName,
      IndexName: 'teamId-installedAt-index',
      KeyConditionExpression: 'teamId = :teamId',
      ExpressionAttributeValues: {
        ':teamId': 'test_team_id',
      },
      ScanIndexForward: false,
      Limit: 1,
    }));
    
    console.log('クエリ結果のアイテム数:', queryResult.Items?.length || 0);
    if (queryResult.Items && queryResult.Items.length > 0) {
      console.log('見つかったデータ:', JSON.stringify(queryResult.Items[0], null, 2));
    } else {
      console.log('❌ test_team_idのデータが見つかりません');
    }
    
  } catch (error) {
    console.error('❌ データ確認中にエラーが発生しました:', error);
  }
}

verifyData(); 