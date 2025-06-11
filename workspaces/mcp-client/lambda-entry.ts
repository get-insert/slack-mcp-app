import { AwsLambdaReceiver } from '@slack/bolt';
import { createSlackApp } from './slack-handler.js';

const awsLambdaReceiver = new AwsLambdaReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET!,
});

createSlackApp(awsLambdaReceiver);

export const handler = awsLambdaReceiver.toHandler();
