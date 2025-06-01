import dotenv from 'dotenv';

// Load environment variables (only in non-Lambda environments)
if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
  dotenv.config();
}

if (!process.env.SLACK_CLIENT_ID) {
  console.error(
    'SLACK_CLIENT_ID is not set. Please set it in your environment or .env file.'
  );
  if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
    process.exit(1);
  }
}

if (!process.env.SLACK_CLIENT_SECRET) {
  console.error(
    'SLACK_CLIENT_SECRET is not set. Please set it in your environment or .env file.'
  );
  if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
    process.exit(1);
  }
}

if (!process.env.SLACK_SIGNING_SECRET) {
  console.error(
    'SLACK_SIGNING_SECRET is not set. Please set it in your environment or .env file.'
  );
  if (!process.env.AWS_LAMBDA_FUNCTION_NAME) {
    process.exit(1);
  }
}

export const SLACK_CLIENT_ID = process.env.SLACK_CLIENT_ID;
export const SLACK_CLIENT_SECRET = process.env.SLACK_CLIENT_SECRET;
export const SLACK_SIGNING_SECRET = process.env.SLACK_SIGNING_SECRET;
export const DOMAIN = process.env.DOMAIN || 'http://localhost:3000';
export const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;
export const MODE = process.env.MODE;
