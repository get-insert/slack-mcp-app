import { DynamoDBClient, DynamoDBClientConfig } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  QueryCommand,
} from '@aws-sdk/lib-dynamodb';
import { IInstallationRepo } from '../../../domain/repositories/installation.js';
import { Installation } from '../../../domain/entities/installation.js';

export class DynamoDBInstallationRepository implements IInstallationRepo {
  private client: DynamoDBDocumentClient;
  private tableName: string;

  constructor(tableName?: string, region?: string) {
    const clientConfig: DynamoDBClientConfig = {
      region: region || 'ap-northeast-1',
    };

    // ローカルDynamoDBエンドポイントが設定されている場合
    if (process.env.DYNAMODB_ENDPOINT) {
      clientConfig.endpoint = process.env.DYNAMODB_ENDPOINT;
      clientConfig.credentials = {
        accessKeyId: 'dummy',
        secretAccessKey: 'dummy',
      };
    }

    const dynamoClient = new DynamoDBClient(clientConfig);
    this.client = DynamoDBDocumentClient.from(dynamoClient, {
      marshallOptions: {
        removeUndefinedValues: true,
      },
    });
    this.tableName =
      tableName || process.env.DYNAMODB_TABLE_NAME || 'slack-installations';
  }

  async save(installation: Installation): Promise<void> {
    try {
      const item = {
        teamId: installation.teamId,
        botToken: installation.botToken,
        botRefreshToken: installation.botRefreshToken,
        botExpiresAt: installation.botExpiresAt?.toISOString(),
        authedUser: installation.authedUser
          ? {
              ...installation.authedUser,
              expiresAt: installation.authedUser.expiresAt?.toISOString(),
            }
          : undefined,
        appId: installation.appId,
        installedAt: installation.installedAt.toISOString(),
        entity_type: 'slack_installation',
      };

      await this.client.send(
        new PutCommand({
          TableName: this.tableName,
          Item: item,
        })
      );
    } catch (error) {
      throw new Error(`Failed to save installation: ${error}`);
    }
  }

  async findByTeam(teamId: string): Promise<Installation | null> {
    try {
      const response = await this.client.send(
        new QueryCommand({
          TableName: this.tableName,
          IndexName: 'teamId-installedAt-index',
          KeyConditionExpression: 'teamId = :teamId',
          ExpressionAttributeValues: {
            ':teamId': teamId,
          },
          ScanIndexForward: false,
          Limit: 1,
        })
      );
      if (!response.Items || response.Items.length === 0) {
        return null;
      }

      const item = response.Items[0];
      return {
        teamId: item.teamId,
        botToken: item.botToken,
        botRefreshToken: item.botRefreshToken,
        botExpiresAt: item.botExpiresAt
          ? new Date(item.botExpiresAt)
          : undefined,
        authedUser: item.authedUser
          ? {
              ...item.authedUser,
              expiresAt: item.authedUser.expiresAt
                ? new Date(item.authedUser.expiresAt)
                : undefined,
            }
          : undefined,
        appId: item.appId,
        installedAt: new Date(item.installedAt),
      };
    } catch (error) {
      throw new Error(`Failed to find installation: ${error}`);
    }
  }
}
